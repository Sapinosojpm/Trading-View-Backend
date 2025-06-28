import { getBalance, placeOrder, getMarketPrice } from '../okxBot.js';
import { websocketManager } from '../index.js';
import { getSwitchByName } from '../utils/switchManager.js';
import { 
  generateTradingSignal, 
  calculateDynamicLevels, 
  analyzeTradingTime 
} from '../utils/technicalAnalysis.js';

// Enhanced trading configuration
const TRADING_CONFIG = {
  // Risk Management
  MIN_USDT_TO_TRADE: 5,
  MIN_SOL_TO_TRADE: 0.001,
  MIN_ORDER_VALUE_USDT: 0.14,
  MAX_TRADE_PERCENTAGE: 0.4, // Only use 40% of available balance (DCA style)
  MAX_CONSECUTIVE_TRADES: 3,
  
  // Dynamic levels (will be calculated based on ATR)
  BASE_STOP_LOSS_ATR_MULTIPLIER: 2,
  BASE_TAKE_PROFIT_ATR_MULTIPLIER: 3,
  
  // Signal quality thresholds
  MIN_SIGNAL_CONFIDENCE: 60, // Only trade if signal confidence >= 60%
  MIN_RSI_OVERSOLD: 30,
  MAX_RSI_OVERBOUGHT: 70,
  
  // Position sizing
  INITIAL_POSITION_SIZE: 0.3, // 30% of available balance
  SCALE_IN_SIZE: 0.2, // 20% for additional positions
  MAX_POSITIONS: 3, // Maximum number of positions
  
  // Time filters
  ENABLE_TIME_FILTERS: true,
  TRADING_HOURS: {
    start: 2, // UTC
    end: 22   // UTC
  }
};

// Trading state
let tradingState = {
  lastAction: null,
  lastTradePrice: null,
  consecutiveTrades: 0,
  activePositions: [],
  totalInvested: 0,
  totalProfit: 0,
  tradesToday: 0,
  lastTradeDate: null
};

// Function to send enhanced logs
const sendLog = (message, type = 'info', data = {}) => {
  websocketManager.broadcast({
    type: 'trading_log',
    data: {
      message,
      type,
      timestamp: new Date().toISOString(),
      ...data
    }
  });
};

// Get auto-trading status from MongoDB
const getAutoTradingStatusFromDB = async () => {
  try {
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    return autoTradingSwitch ? (autoTradingSwitch.isEnabled && autoTradingSwitch.isActive()) : false;
  } catch (error) {
    console.error('Error getting auto-trading status:', error);
    return false;
  }
};

// Enhanced position management
class PositionManager {
  constructor() {
    this.positions = [];
  }

  addPosition(entryPrice, size, direction, stopLoss, takeProfit) {
    const position = {
      id: Date.now(),
      entryPrice,
      size,
      direction,
      stopLoss,
      takeProfit,
      entryTime: new Date(),
      status: 'open'
    };
    
    this.positions.push(position);
    return position;
  }

  closePosition(positionId, exitPrice, reason) {
    const position = this.positions.find(p => p.id === positionId && p.status === 'open');
    if (position) {
      position.exitPrice = exitPrice;
      position.exitTime = new Date();
      position.status = 'closed';
      position.pnl = position.direction === 'buy' 
        ? (exitPrice - position.entryPrice) * position.size
        : (position.entryPrice - exitPrice) * position.size;
      position.reason = reason;
      
      return position;
    }
    return null;
  }

  getOpenPositions() {
    return this.positions.filter(p => p.status === 'open');
  }

  getTotalInvested() {
    return this.positions
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + (p.entryPrice * p.size), 0);
  }
}

const positionManager = new PositionManager();

// Enhanced risk management
const calculatePositionSize = (availableBalance, signalConfidence, currentPrice) => {
  // Base position size
  let baseSize = availableBalance * TRADING_CONFIG.INITIAL_POSITION_SIZE;
  
  // Adjust based on signal confidence
  const confidenceMultiplier = signalConfidence / 100;
  baseSize *= confidenceMultiplier;
  
  // Ensure minimum order requirements
  const minOrderValue = TRADING_CONFIG.MIN_ORDER_VALUE_USDT;
  const minSize = minOrderValue / currentPrice;
  
  return Math.max(baseSize / currentPrice, minSize);
};

// Check if we should scale into existing position
const shouldScaleIn = (signal, currentPrice, openPositions) => {
  if (openPositions.length === 0) return false;
  if (openPositions.length >= TRADING_CONFIG.MAX_POSITIONS) return false;
  
  const lastPosition = openPositions[openPositions.length - 1];
  
  // Only scale in if we have a strong signal in the same direction
  if (signal.signal !== lastPosition.direction) return false;
  
  // Check if price has moved favorably for scaling
  if (lastPosition.direction === 'buy') {
    return currentPrice < lastPosition.entryPrice * 0.98; // 2% lower
  } else {
    return currentPrice > lastPosition.entryPrice * 1.02; // 2% higher
  }
};

// Enhanced trading logic
const executeTrade = async (signal, currentPrice, availableBalance, availableSOL) => {
  const openPositions = positionManager.getOpenPositions();
  
  // Check if we should scale in
  if (shouldScaleIn(signal, currentPrice, openPositions)) {
    return await executeScaleIn(signal, currentPrice, availableBalance);
  }
  
  // Check if we should open new position
  if (openPositions.length < TRADING_CONFIG.MAX_POSITIONS) {
    return await executeNewPosition(signal, currentPrice, availableBalance, availableSOL);
  }
  
  return { success: false, reason: 'Maximum positions reached' };
};

const executeNewPosition = async (signal, currentPrice, availableBalance, availableSOL) => {
  const positionSize = calculatePositionSize(availableBalance, signal.confidence, currentPrice);
  const orderValue = positionSize * currentPrice;
  
  if (orderValue < TRADING_CONFIG.MIN_ORDER_VALUE_USDT) {
    return { success: false, reason: 'Order value below minimum' };
  }
  
  // Calculate dynamic levels
  const levels = calculateDynamicLevels(
    currentPrice, 
    signal.indicators.atr, 
    signal.signal
  );
  
  // Execute order
  const orderSize = positionSize.toFixed(6);
  const orderRes = await placeOrder(signal.signal, orderSize, 'SOL-USDT');
  
  if (orderRes?.code === '0') {
    // Add position to manager
    const position = positionManager.addPosition(
      currentPrice,
      positionSize,
      signal.signal,
      levels.stopLoss,
      levels.takeProfit
    );
    
    sendLog(`✅ New ${signal.signal.toUpperCase()} position opened`, 'info', {
      size: orderSize,
      price: currentPrice.toFixed(2),
      stopLoss: levels.stopLoss.toFixed(2),
      takeProfit: levels.takeProfit.toFixed(2),
      confidence: signal.confidence.toFixed(1)
    });
    
    tradingState.lastAction = signal.signal;
    tradingState.lastTradePrice = currentPrice;
    tradingState.consecutiveTrades++;
    
    return { success: true, position };
  } else {
    sendLog(`❌ ${signal.signal.toUpperCase()} order failed: ${orderRes?.msg || 'Unknown error'}`, 'error');
    return { success: false, reason: orderRes?.msg || 'Order failed' };
  }
};

const executeScaleIn = async (signal, currentPrice, availableBalance) => {
  const scaleInSize = calculatePositionSize(availableBalance, signal.confidence, currentPrice) * 0.5;
  const orderValue = scaleInSize * currentPrice;
  
  if (orderValue < TRADING_CONFIG.MIN_ORDER_VALUE_USDT) {
    return { success: false, reason: 'Scale-in order value below minimum' };
  }
  
  const orderSize = scaleInSize.toFixed(6);
  const orderRes = await placeOrder(signal.signal, orderSize, 'SOL-USDT');
  
  if (orderRes?.code === '0') {
    sendLog(`📈 Scale-in ${signal.signal.toUpperCase()} executed`, 'info', {
      size: orderSize,
      price: currentPrice.toFixed(2),
      confidence: signal.confidence.toFixed(1)
    });
    
    return { success: true };
  } else {
    sendLog(`❌ Scale-in order failed: ${orderRes?.msg || 'Unknown error'}`, 'error');
    return { success: false, reason: orderRes?.msg || 'Scale-in failed' };
  }
};

// Check and manage existing positions
const managePositions = async (currentPrice) => {
  const openPositions = positionManager.getOpenPositions();
  
  for (const position of openPositions) {
    let shouldClose = false;
    let closeReason = '';
    
    // Check stop loss
    if (position.direction === 'buy' && currentPrice <= position.stopLoss) {
      shouldClose = true;
      closeReason = 'Stop Loss';
    } else if (position.direction === 'sell' && currentPrice >= position.stopLoss) {
      shouldClose = true;
      closeReason = 'Stop Loss';
    }
    
    // Check take profit
    if (position.direction === 'buy' && currentPrice >= position.takeProfit) {
      shouldClose = true;
      closeReason = 'Take Profit';
    } else if (position.direction === 'sell' && currentPrice <= position.takeProfit) {
      shouldClose = true;
      closeReason = 'Take Profit';
    }
    
    if (shouldClose) {
      const orderRes = await placeOrder(
        position.direction === 'buy' ? 'sell' : 'buy',
        position.size.toFixed(6),
        'SOL-USDT'
      );
      
      if (orderRes?.code === '0') {
        const closedPosition = positionManager.closePosition(position.id, currentPrice, closeReason);
        if (closedPosition) {
          const pnlPercent = (closedPosition.pnl / (position.entryPrice * position.size)) * 100;
          sendLog(`🎯 Position closed: ${closeReason}`, closedPosition.pnl > 0 ? 'profit' : 'loss', {
            pnl: closedPosition.pnl.toFixed(2),
            pnlPercent: pnlPercent.toFixed(2),
            duration: Math.round((closedPosition.exitTime - closedPosition.entryTime) / 1000 / 60) + 'min'
          });
        }
      }
    }
  }
};

// Main enhanced trading function
const runEnhancedAutoTrade = async () => {
  const isEnabled = await getAutoTradingStatusFromDB();
  if (!isEnabled) {
    tradingState.lastAction = null;
    return;
  }

  try {
    sendLog('🤖 === ENHANCED AUTO-TRADE CYCLE START ===', 'info');
    
    // Check trading time
    if (TRADING_CONFIG.ENABLE_TIME_FILTERS) {
      const timeAnalysis = analyzeTradingTime();
      if (!timeAnalysis.isGoodTime) {
        sendLog(`⏰ Trading paused: ${timeAnalysis.reason}`, 'info');
        return;
      }
    }
    
    // Get current market data
    const currentPrice = await getMarketPrice('SOL-USDT');
    if (!currentPrice) {
      sendLog('❌ Could not fetch current price', 'error');
      return;
    }
    
    // Get balance
    const balanceData = await getBalance();
    const details = balanceData?.data?.[0]?.details || [];
    const usdt = details.find((item) => item.ccy === 'USDT');
    const sol = details.find((item) => item.ccy === 'SOL');
    const availableUSDT = parseFloat(usdt?.availBal || 0);
    const availableSOL = parseFloat(sol?.availBal || 0);
    
    sendLog(`💰 Balance - USDT: $${availableUSDT.toFixed(2)} | SOL: ${availableSOL.toFixed(4)}`, 'balance');
    
    // Get recent candle data for technical analysis
    // Note: You'll need to implement getRecentCandles in okxBot.js
    const recentCandles = await getRecentCandles('SOL-USDT', 50);
    if (!recentCandles || recentCandles.length < 50) {
      sendLog('❌ Insufficient candle data for analysis', 'error');
      return;
    }
    
    // Generate enhanced trading signal
    const signal = generateTradingSignal(recentCandles);
    sendLog(`📊 Signal Analysis: ${signal.signal.toUpperCase()} (${signal.confidence.toFixed(1)}% confidence)`, 'info', {
      rsi: signal.indicators.rsi.toFixed(1),
      ema5: signal.indicators.ema5.toFixed(2),
      ema20: signal.indicators.ema20.toFixed(2),
      atr: signal.indicators.atr.toFixed(4)
    });
    
    // Manage existing positions first
    await managePositions(currentPrice);
    
    // Check if signal is strong enough
    if (signal.confidence < TRADING_CONFIG.MIN_SIGNAL_CONFIDENCE) {
      sendLog(`⚠️ Signal confidence (${signal.confidence.toFixed(1)}%) below threshold (${TRADING_CONFIG.MIN_SIGNAL_CONFIDENCE}%)`, 'info');
      return;
    }
    
    // Prevent overtrading
    if (tradingState.consecutiveTrades >= TRADING_CONFIG.MAX_CONSECUTIVE_TRADES) {
      sendLog(`⚠️ Max consecutive trades reached (${TRADING_CONFIG.MAX_CONSECUTIVE_TRADES})`, 'info');
      return;
    }
    
    // Execute trading logic
    if (signal.signal !== 'neutral') {
      const tradeResult = await executeTrade(signal, currentPrice, availableUSDT, availableSOL);
      
      if (!tradeResult.success) {
        sendLog(`❌ Trade execution failed: ${tradeResult.reason}`, 'error');
      }
    } else {
      sendLog('⚪ Neutral signal - no action taken', 'info');
      tradingState.consecutiveTrades = 0; // Reset on neutral
    }
    
    sendLog('🤖 === ENHANCED AUTO-TRADE CYCLE END ===', 'info');
    
  } catch (error) {
    console.error('❌ Enhanced auto-trade error:', error);
    sendLog(`❌ Enhanced auto-trade error: ${error.message}`, 'error');
  }
};

// Export functions
export const enableEnhancedAutoTrading = async () => {
  try {
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    if (autoTradingSwitch) {
      await autoTradingSwitch.enable();
      sendLog('🟢 Enhanced auto-trading ENABLED', 'info');
    }
  } catch (error) {
    console.error('Error enabling enhanced auto-trading:', error);
  }
};

export const disableEnhancedAutoTrading = async () => {
  try {
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    if (autoTradingSwitch) {
      await autoTradingSwitch.disable();
      sendLog('🔴 Enhanced auto-trading DISABLED', 'info');
    }
  } catch (error) {
    console.error('Error disabling enhanced auto-trading:', error);
  }
};

export const getEnhancedAutoTradingStatus = async () => {
  return await getAutoTradingStatusFromDB();
};

export const getTradingStats = () => {
  const openPositions = positionManager.getOpenPositions();
  const closedPositions = positionManager.positions.filter(p => p.status === 'closed');
  
  const totalPnl = closedPositions.reduce((sum, p) => sum + p.pnl, 0);
  const winRate = closedPositions.length > 0 
    ? (closedPositions.filter(p => p.pnl > 0).length / closedPositions.length) * 100 
    : 0;
  
  return {
    openPositions: openPositions.length,
    totalInvested: positionManager.getTotalInvested(),
    totalPnl: totalPnl.toFixed(2),
    winRate: winRate.toFixed(1),
    totalTrades: closedPositions.length
  };
};

export default runEnhancedAutoTrade; 