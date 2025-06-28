import { getBalance, placeOrder, getMarketPrice, getCandleDirection } from '../okxBot.js';
import { websocketManager } from '../index.js';
import { getSwitchByName, isSwitchActive } from '../utils/switchManager.js';

// Global auto-trading state (fallback)
let AUTO_TRADE_ENABLED = false; // Default to false, will be updated from MongoDB
const MIN_USDT_TO_TRADE = 5; // Minimum USDT to start trading
const MIN_SOL_TO_TRADE = 0.001; // OKX minimum order size for SOL
const MIN_ORDER_VALUE_USDT = 0.14; // OKX minimum order value for SOL
const MAX_TRADE_PERCENTAGE = 1; // Use max 100% of available balance
const PROFIT_TAKE_PERCENTAGE = 0.05; // Take profit at 5% gain
const STOP_LOSS_PERCENTAGE = 0.03; // Stop loss at 3% loss

let lastAction = null;
let lastTradePrice = null;
let consecutiveTrades = 0;
const MAX_CONSECUTIVE_TRADES = 3; // Prevent overtrading

// Function to send log to frontend via WebSocket
const sendLog = (message, type = 'info') => {
  websocketManager.broadcast({
    type: 'trading_log',
    data: {
      message,
      type,
      timestamp: new Date().toISOString()
    }
  });
};

// Function to get auto-trading status from MongoDB
const getAutoTradingStatusFromDB = async () => {
  console.log('🔍 getAutoTradingStatusFromDB() called');
  try {
    console.log('🔍 Looking for auto_trading switch...');
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    
    if (autoTradingSwitch) {
      console.log('📊 Found auto_trading switch:', {
        name: autoTradingSwitch.name,
        isEnabled: autoTradingSwitch.isEnabled,
        preventAutoDisable: autoTradingSwitch.preventAutoDisable
      });
      
      const isActive = autoTradingSwitch.isActive();
      console.log('📊 Switch isActive() result:', isActive);
      
      const finalStatus = autoTradingSwitch.isEnabled && isActive;
      console.log('📊 Final status (isEnabled && isActive):', finalStatus);
      
      return finalStatus;
    } else {
      console.log('⚠️ Auto_trading switch not found in MongoDB');
      return false;
    }
  } catch (error) {
    console.error('💥 Error getting auto-trading status from DB:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.log('🔄 Falling back to local state:', AUTO_TRADE_ENABLED);
    return AUTO_TRADE_ENABLED; // Fallback to local state
  }
};

// Auto-trading control functions
export const enableAutoTrading = async () => {
  console.log('🟢 enableAutoTrading() called');
  try {
    console.log('🔍 Looking for auto_trading switch in MongoDB...');
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    
    if (autoTradingSwitch) {
      console.log('📊 Found auto_trading switch:', {
        name: autoTradingSwitch.name,
        isEnabled: autoTradingSwitch.isEnabled,
        preventAutoDisable: autoTradingSwitch.preventAutoDisable
      });
      
      console.log('🔄 Enabling switch via MongoDB...');
      await autoTradingSwitch.enable();
      
      console.log('✅ Switch enabled in MongoDB');
      AUTO_TRADE_ENABLED = true;
      sendLog('🟢 Auto-trading ENABLED via MongoDB switch', 'info');
      console.log('🟢 Auto-trading enabled via MongoDB switch');
    } else {
      console.log('⚠️ Auto_trading switch not found in MongoDB, using fallback');
      // Fallback if switch doesn't exist
      AUTO_TRADE_ENABLED = true;
      sendLog('🟢 Auto-trading ENABLED (fallback mode)', 'info');
      console.log('🟢 Auto-trading enabled (fallback mode)');
    }
  } catch (error) {
    console.error('💥 Error enabling auto-trading:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Fallback
    AUTO_TRADE_ENABLED = true;
    sendLog('🟢 Auto-trading ENABLED (fallback mode)', 'info');
  }
};

export const disableAutoTrading = async () => {
  console.log('🔴 disableAutoTrading() called');
  try {
    console.log('🔍 Looking for auto_trading switch in MongoDB...');
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    
    if (autoTradingSwitch) {
      console.log('📊 Found auto_trading switch:', {
        name: autoTradingSwitch.name,
        isEnabled: autoTradingSwitch.isEnabled,
        preventAutoDisable: autoTradingSwitch.preventAutoDisable
      });
      
      console.log('🔄 Disabling switch via MongoDB...');
      await autoTradingSwitch.disable();
      
      console.log('✅ Switch disabled in MongoDB');
      AUTO_TRADE_ENABLED = false;
      sendLog('🔴 Auto-trading DISABLED via MongoDB switch', 'info');
      console.log('🔴 Auto-trading disabled via MongoDB switch');
    } else {
      console.log('⚠️ Auto_trading switch not found in MongoDB, using fallback');
      // Fallback if switch doesn't exist
      AUTO_TRADE_ENABLED = false;
      sendLog('🔴 Auto-trading DISABLED (fallback mode)', 'info');
      console.log('🔴 Auto-trading disabled (fallback mode)');
    }
  } catch (error) {
    console.error('💥 Error disabling auto-trading:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Fallback
    AUTO_TRADE_ENABLED = false;
    sendLog('🔴 Auto-trading DISABLED (fallback mode)', 'info');
  }
};

export const getAutoTradingStatus = async () => {
  console.log('🔍 getAutoTradingStatus() called');
  try {
    const status = await getAutoTradingStatusFromDB();
    console.log('📊 Auto-trading status from DB:', status);
    return status;
  } catch (error) {
    console.error('💥 Error getting auto-trading status:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.log('🔄 Falling back to local state:', AUTO_TRADE_ENABLED);
    return AUTO_TRADE_ENABLED; // Fallback to local state
  }
};

// Synchronous version for backward compatibility
export const getAutoTradingStatusSync = () => {
  return AUTO_TRADE_ENABLED;
};

const runAutoTrade = async () => {
  // Check MongoDB switch status
  const isEnabled = await getAutoTradingStatusFromDB();
  
  if (!isEnabled) {
    // Update local state to match DB
    AUTO_TRADE_ENABLED = false;
    return;
  }

  // Update local state to match DB
  AUTO_TRADE_ENABLED = true;

  try {
    sendLog('🤖 === AUTO-TRADE CYCLE START ===', 'info');
    
    const direction = await getCandleDirection('SOL-USDT');
    if (!direction) {
      sendLog('❌ Could not determine candle direction', 'error');
      return;
    }

    const currentPrice = await getMarketPrice('SOL-USDT');
    if (!currentPrice) {
      sendLog('❌ Could not fetch current price', 'error');
      return;
    }

    const balanceData = await getBalance();
    const details = balanceData?.data?.[0]?.details || [];

    const usdt = details.find((item) => item.ccy === 'USDT');
    const sol = details.find((item) => item.ccy === 'SOL');

    const availableUSDT = parseFloat(usdt?.availBal || 0);
    const availableSOL = parseFloat(sol?.availBal || 0);

    sendLog(`📊 Candle Analysis: ${direction.toUpperCase()}`, 'info');
    sendLog(`💰 Current SOL Price: $${currentPrice.toFixed(2)}`, 'info');
    sendLog(`💼 Balance - USDT: $${availableUSDT.toFixed(2)} | SOL: ${availableSOL.toFixed(4)}`, 'balance');

    // Check profit/loss if we have a last trade price
    if (lastTradePrice && lastAction === 'buy' && availableSOL > 0) {
      const priceChange = ((currentPrice - lastTradePrice) / lastTradePrice) * 100;
      sendLog(`📈 Price change since last buy: ${priceChange.toFixed(2)}%`, 'info');
      
      // Take profit if we have 5% gain
      if (priceChange >= PROFIT_TAKE_PERCENTAGE) {
        sendLog(`🎯 Taking profit at ${priceChange.toFixed(2)}% gain`, 'profit');
        const sellAmount = availableSOL * 0.5; // Sell 50% for profit taking
        const sellRes = await placeOrder('sell', sellAmount.toFixed(6), 'SOL-USDT');
        
        if (sellRes?.code === '0') {
          sendLog(`✅ Profit taken: ${sellAmount.toFixed(6)} SOL`, 'profit');
          lastAction = 'sell';
          lastTradePrice = currentPrice;
          consecutiveTrades = 0;
          return;
        }
      }
      
      // Stop loss if we have 3% loss
      if (priceChange <= -STOP_LOSS_PERCENTAGE) {
        sendLog(`🛑 Stop loss triggered at ${priceChange.toFixed(2)}% loss`, 'loss');
        const sellRes = await placeOrder('sell', availableSOL.toFixed(6), 'SOL-USDT');
        
        if (sellRes?.code === '0') {
          sendLog(`✅ Stop loss executed: ${availableSOL.toFixed(6)} SOL`, 'loss');
          lastAction = 'sell';
          lastTradePrice = currentPrice;
          consecutiveTrades = 0;
          return;
        }
      }
    }

    // Prevent overtrading
    if (consecutiveTrades >= MAX_CONSECUTIVE_TRADES) {
      sendLog(`⚠️  Max consecutive trades reached (${MAX_CONSECUTIVE_TRADES}). Waiting for better conditions.`, 'info');
      return;
    }

    // Trading logic based on candle direction
    if (direction === 'bullish' && availableUSDT >= MIN_USDT_TO_TRADE && lastAction !== 'buy') {
      // Calculate trade amount (use 80% of available USDT)
      const tradeAmount = Math.min(availableUSDT * MAX_TRADE_PERCENTAGE, availableUSDT);
      const solToBuy = tradeAmount / currentPrice;
      const orderValue = solToBuy * currentPrice;
      
      sendLog(`🟢 BULLISH CANDLE — Attempting to BUY SOL`, 'buy');
      sendLog(`📊 Trade amount: $${tradeAmount.toFixed(2)} USDT`, 'info');
      sendLog(`📊 Expected SOL: ${solToBuy.toFixed(6)} SOL`, 'info');
      
      // Check minimum order requirements
      if (orderValue < MIN_ORDER_VALUE_USDT) {
        sendLog(`❌ Order value ($${orderValue.toFixed(2)}) below minimum ($${MIN_ORDER_VALUE_USDT})`, 'error');
        return;
      }
      
      // Use minimum order size if calculated amount is too small
      const orderSize = Math.max(solToBuy, MIN_SOL_TO_TRADE);
      const size = orderSize.toFixed(6);
      
      sendLog(`📦 Placing BUY order for ${size} SOL`, 'buy');
      const buyRes = await placeOrder('buy', size, 'SOL-USDT');
      
      if (buyRes?.code === '0') {
        sendLog(`✅ BUY order executed: ${size} SOL at $${currentPrice.toFixed(2)}`, 'buy');
        lastAction = 'buy';
        lastTradePrice = currentPrice;
        consecutiveTrades++;
      } else {
        const errorMsg = buyRes?.data?.[0]?.sMsg || buyRes?.msg || 'Unknown error';
        sendLog(`❌ BUY failed: ${errorMsg}`, 'error');
        
        // Try with minimum order size if regular order fails
        if (errorMsg.includes('minimum order')) {
          sendLog(`💡 Trying with minimum order size...`, 'info');
          const minBuyRes = await placeOrder('buy', MIN_SOL_TO_TRADE.toString(), 'SOL-USDT');
          
          if (minBuyRes?.code === '0') {
            sendLog(`✅ Minimum BUY executed: ${MIN_SOL_TO_TRADE} SOL`, 'buy');
            lastAction = 'buy';
            lastTradePrice = currentPrice;
            consecutiveTrades++;
          } else {
            sendLog(`❌ Minimum BUY also failed: ${minBuyRes?.msg || 'Unknown error'}`, 'error');
          }
        }
      }
    }

    if (direction === 'bearish' && availableSOL >= MIN_SOL_TO_TRADE && lastAction !== 'sell') {
      const orderValue = availableSOL * currentPrice;
      
      sendLog(`🔴 BEARISH CANDLE — Attempting to SELL SOL`, 'sell');
      sendLog(`📊 Available SOL: ${availableSOL.toFixed(6)} SOL`, 'info');
      sendLog(`📊 Order value: $${orderValue.toFixed(2)} USDT`, 'info');
      
      // Check minimum order requirements
      if (orderValue < MIN_ORDER_VALUE_USDT) {
        sendLog(`❌ Order value ($${orderValue.toFixed(2)}) below minimum ($${MIN_ORDER_VALUE_USDT})`, 'error');
        return;
      }
      
      const size = availableSOL.toFixed(6);
      sendLog(`📦 Placing SELL order for ${size} SOL`, 'sell');
      const sellRes = await placeOrder('sell', size, 'SOL-USDT');
      
      if (sellRes?.code === '0') {
        sendLog(`✅ SELL order executed: ${size} SOL at $${currentPrice.toFixed(2)}`, 'sell');
        lastAction = 'sell';
        lastTradePrice = currentPrice;
        consecutiveTrades++;
      } else {
        const errorMsg = sellRes?.data?.[0]?.sMsg || sellRes?.msg || 'Unknown error';
        sendLog(`❌ SELL failed: ${errorMsg}`, 'error');
      }
    }

    if (direction === 'neutral') {
      sendLog(`⚪ NEUTRAL CANDLE — No action taken`, 'info');
      consecutiveTrades = 0; // Reset consecutive trades on neutral
    }

    sendLog('🤖 === AUTO-TRADE CYCLE END ===', 'info');
  } catch (error) {
    console.error('❌ Auto-trade error:', error);
    sendLog(`❌ Auto-trade error: ${error.message}`, 'error');
  }
};

// Export for manual testing
export const testAutoTrade = async () => {
  sendLog('🧪 Testing auto-trade strategy...', 'info');
  await runAutoTrade();
};

export default runAutoTrade;
