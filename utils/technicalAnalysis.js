// Technical Analysis Utilities for Trading Bot
// Provides RSI, Moving Averages, and other indicators for better trading decisions

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array} prices - Array of price values
 * @param {number} period - Period for SMA calculation
 * @returns {Array} Array of SMA values
 */
export const calculateSMA = (prices, period) => {
  if (prices.length < period) return [];
  
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {Array} prices - Array of price values
 * @param {number} period - Period for EMA calculation
 * @returns {Array} Array of EMA values
 */
export const calculateEMA = (prices, period) => {
  if (prices.length < period) return [];
  
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);
  
  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    const newEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(newEMA);
  }
  
  return ema;
};

/**
 * Calculate Relative Strength Index (RSI)
 * @param {Array} prices - Array of price values
 * @param {number} period - Period for RSI calculation (default: 14)
 * @returns {Array} Array of RSI values
 */
export const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) return [];
  
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const rsi = [];
  
  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calculate first RSI
  const rs = avgGain / avgLoss;
  const firstRSI = 100 - (100 / (1 + rs));
  rsi.push(firstRSI);
  
  // Calculate subsequent RSI values
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    const rs = avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);
  }
  
  return rsi;
};

/**
 * Calculate Average True Range (ATR) for volatility measurement
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of close prices
 * @param {number} period - Period for ATR calculation (default: 14)
 * @returns {Array} Array of ATR values
 */
export const calculateATR = (highs, lows, closes, period = 14) => {
  if (highs.length < period + 1) return [];
  
  const trueRanges = [];
  
  // Calculate True Range
  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    
    const trueRange = Math.max(highLow, highClose, lowClose);
    trueRanges.push(trueRange);
  }
  
  const atr = [];
  
  // Calculate initial ATR (SMA of first period TRs)
  let avgTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atr.push(avgTR);
  
  // Calculate subsequent ATR values
  for (let i = period; i < trueRanges.length; i++) {
    avgTR = (avgTR * (period - 1) + trueRanges[i]) / period;
    atr.push(avgTR);
  }
  
  return atr;
};

/**
 * Generate trading signals based on multiple indicators
 * @param {Object} candleData - Candle data with OHLC values
 * @returns {Object} Trading signal with confidence level
 */
export const generateTradingSignal = (candleData) => {
  if (!candleData || candleData.length < 50) {
    return { signal: 'neutral', confidence: 0, reason: 'Insufficient data' };
  }
  
  const closes = candleData.map(c => parseFloat(c.close));
  const highs = candleData.map(c => parseFloat(c.high));
  const lows = candleData.map(c => parseFloat(c.low));
  
  // Calculate indicators
  const rsi = calculateRSI(closes, 14);
  const ema5 = calculateEMA(closes, 5);
  const ema20 = calculateEMA(closes, 20);
  const atr = calculateATR(highs, lows, closes, 14);
  
  if (rsi.length === 0 || ema5.length === 0 || ema20.length === 0 || atr.length === 0) {
    return { signal: 'neutral', confidence: 0, reason: 'Indicators not ready' };
  }
  
  const currentRSI = rsi[rsi.length - 1];
  const currentEMA5 = ema5[ema5.length - 1];
  const currentEMA20 = ema20[ema20.length - 1];
  const currentATR = atr[atr.length - 1];
  const currentPrice = closes[closes.length - 1];
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalSignals = 0;
  
  // RSI signals
  if (currentRSI < 30) {
    bullishSignals++;
    totalSignals++;
  } else if (currentRSI > 70) {
    bearishSignals++;
    totalSignals++;
  }
  
  // Moving Average crossover
  if (currentEMA5 > currentEMA20) {
    bullishSignals++;
    totalSignals++;
  } else if (currentEMA5 < currentEMA20) {
    bearishSignals++;
    totalSignals++;
  }
  
  // Price vs EMA20
  if (currentPrice > currentEMA20) {
    bullishSignals++;
    totalSignals++;
  } else if (currentPrice < currentEMA20) {
    bearishSignals++;
    totalSignals++;
  }
  
  // Calculate confidence
  const confidence = totalSignals > 0 ? Math.max(bullishSignals, bearishSignals) / totalSignals : 0;
  
  // Determine signal
  let signal = 'neutral';
  let reason = '';
  
  if (confidence >= 0.6) { // At least 60% of signals agree
    if (bullishSignals > bearishSignals) {
      signal = 'bullish';
      reason = `RSI: ${currentRSI.toFixed(1)}, EMA5 > EMA20: ${currentEMA5 > currentEMA20}, Price > EMA20: ${currentPrice > currentEMA20}`;
    } else if (bearishSignals > bullishSignals) {
      signal = 'bearish';
      reason = `RSI: ${currentRSI.toFixed(1)}, EMA5 < EMA20: ${currentEMA5 < currentEMA20}, Price < EMA20: ${currentPrice < currentEMA20}`;
    }
  }
  
  return {
    signal,
    confidence: confidence * 100, // Convert to percentage
    reason,
    indicators: {
      rsi: currentRSI,
      ema5: currentEMA5,
      ema20: currentEMA20,
      atr: currentATR,
      price: currentPrice
    }
  };
};

/**
 * Calculate dynamic stop loss and take profit based on ATR
 * @param {number} entryPrice - Entry price
 * @param {number} atr - Current ATR value
 * @param {string} direction - 'buy' or 'sell'
 * @returns {Object} Stop loss and take profit levels
 */
export const calculateDynamicLevels = (entryPrice, atr, direction) => {
  const atrMultiplier = 2; // 2x ATR for stop loss, 3x ATR for take profit
  
  if (direction === 'buy') {
    return {
      stopLoss: entryPrice - (atr * atrMultiplier),
      takeProfit: entryPrice + (atr * (atrMultiplier + 1))
    };
  } else {
    return {
      stopLoss: entryPrice + (atr * atrMultiplier),
      takeProfit: entryPrice - (atr * (atrMultiplier + 1))
    };
  }
};

/**
 * Check if current time is suitable for trading (avoid high volatility periods)
 * @returns {Object} Trading time analysis
 */
export const analyzeTradingTime = () => {
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  
  // Avoid trading during major market events (simplified)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isLowLiquidity = hour < 2 || hour > 22; // UTC hours
  
  return {
    isGoodTime: !isWeekend && !isLowLiquidity,
    reason: isWeekend ? 'Weekend' : isLowLiquidity ? 'Low liquidity hours' : 'Good trading time'
  };
}; 