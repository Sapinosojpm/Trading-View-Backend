// Backtesting Module for Trading Strategy Validation
// Tests strategies against historical data to measure performance

import { generateTradingSignal, calculateDynamicLevels } from './technicalAnalysis.js';

/**
 * Simple backtesting engine
 * @param {Array} historicalData - Array of candle data
 * @param {Object} config - Backtesting configuration
 * @returns {Object} Backtest results
 */
export const runBacktest = (historicalData, config = {}) => {
  const {
    initialBalance = 1000,
    maxPositions = 3,
    minSignalConfidence = 60,
    positionSize = 0.3,
    enableStopLoss = true,
    enableTakeProfit = true
  } = config;

  let balance = initialBalance;
  let positions = [];
  let trades = [];
  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let maxDrawdown = 0;
  let peakBalance = initialBalance;

  // Process each candle
  for (let i = 50; i < historicalData.length; i++) {
    const currentCandle = historicalData[i];
    const candleData = historicalData.slice(0, i + 1);
    
    // Generate signal
    const signal = generateTradingSignal(candleData);
    
    // Check existing positions for stop loss/take profit
    if (enableStopLoss || enableTakeProfit) {
      positions = positions.filter(position => {
        let shouldClose = false;
        let closeReason = '';
        
        if (enableStopLoss) {
          if (position.direction === 'buy' && currentCandle.close <= position.stopLoss) {
            shouldClose = true;
            closeReason = 'Stop Loss';
          } else if (position.direction === 'sell' && currentCandle.close >= position.stopLoss) {
            shouldClose = true;
            closeReason = 'Stop Loss';
          }
        }
        
        if (enableTakeProfit && !shouldClose) {
          if (position.direction === 'buy' && currentCandle.close >= position.takeProfit) {
            shouldClose = true;
            closeReason = 'Take Profit';
          } else if (position.direction === 'sell' && currentCandle.close <= position.takeProfit) {
            shouldClose = true;
            closeReason = 'Take Profit';
          }
        }
        
        if (shouldClose) {
          // Calculate P&L
          const pnl = position.direction === 'buy' 
            ? (currentCandle.close - position.entryPrice) * position.size
            : (position.entryPrice - currentCandle.close) * position.size;
          
          balance += pnl;
          
          // Update trade statistics
          totalTrades++;
          if (pnl > 0) {
            winningTrades++;
          } else {
            losingTrades++;
          }
          
          trades.push({
            entryTime: position.entryTime,
            exitTime: new Date(currentCandle.timestamp),
            direction: position.direction,
            entryPrice: position.entryPrice,
            exitPrice: currentCandle.close,
            size: position.size,
            pnl: pnl,
            reason: closeReason
          });
          
          return false; // Remove position
        }
        
        return true; // Keep position
      });
    }
    
    // Check for new trade signals
    if (signal.confidence >= minSignalConfidence && 
        signal.signal !== 'neutral' && 
        positions.length < maxPositions) {
      
      const tradeSize = balance * positionSize;
      const positionSize = tradeSize / currentCandle.close;
      
      // Calculate dynamic levels
      const levels = calculateDynamicLevels(
        currentCandle.close,
        signal.indicators.atr,
        signal.signal
      );
      
      // Add new position
      positions.push({
        direction: signal.signal,
        entryPrice: currentCandle.close,
        size: positionSize,
        stopLoss: levels.stopLoss,
        takeProfit: levels.takeProfit,
        entryTime: new Date(currentCandle.timestamp),
        signal: signal
      });
      
      balance -= tradeSize;
    }
    
    // Update peak balance and drawdown
    const currentTotalValue = balance + positions.reduce((sum, pos) => {
      return sum + (pos.size * currentCandle.close);
    }, 0);
    
    if (currentTotalValue > peakBalance) {
      peakBalance = currentTotalValue;
    } else {
      const drawdown = (peakBalance - currentTotalValue) / peakBalance * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  // Close any remaining positions at the last price
  const finalPrice = historicalData[historicalData.length - 1].close;
  positions.forEach(position => {
    const pnl = position.direction === 'buy' 
      ? (finalPrice - position.entryPrice) * position.size
      : (position.entryPrice - finalPrice) * position.size;
    
    balance += pnl;
    totalTrades++;
    
    if (pnl > 0) {
      winningTrades++;
    } else {
      losingTrades++;
    }
    
    trades.push({
      entryTime: position.entryTime,
      exitTime: new Date(historicalData[historicalData.length - 1].timestamp),
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice: finalPrice,
      size: position.size,
      pnl: pnl,
      reason: 'End of backtest'
    });
  });
  
  // Calculate final statistics
  const finalBalance = balance;
  const totalReturn = ((finalBalance - initialBalance) / initialBalance) * 100;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgWin = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / Math.max(winningTrades, 1);
  const avgLoss = trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0) / Math.max(losingTrades, 1);
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
  
  return {
    initialBalance,
    finalBalance,
    totalReturn: totalReturn.toFixed(2),
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: winRate.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    trades: trades,
    config: config
  };
};

/**
 * Compare multiple strategies
 * @param {Array} historicalData - Historical candle data
 * @param {Array} strategies - Array of strategy configurations
 * @returns {Object} Comparison results
 */
export const compareStrategies = (historicalData, strategies) => {
  const results = {};
  
  strategies.forEach((strategy, index) => {
    const result = runBacktest(historicalData, strategy);
    results[`strategy_${index + 1}`] = {
      name: strategy.name || `Strategy ${index + 1}`,
      ...result
    };
  });
  
  return results;
};

/**
 * Optimize strategy parameters
 * @param {Array} historicalData - Historical candle data
 * @param {Object} paramRanges - Parameter ranges to test
 * @returns {Object} Best parameters and results
 */
export const optimizeParameters = (historicalData, paramRanges) => {
  const {
    minSignalConfidence = [50, 60, 70, 80],
    positionSize = [0.2, 0.3, 0.4, 0.5],
    maxPositions = [1, 2, 3, 4]
  } = paramRanges;
  
  let bestResult = null;
  let bestParams = null;
  
  // Test all parameter combinations
  for (const confidence of minSignalConfidence) {
    for (const size of positionSize) {
      for (const positions of maxPositions) {
        const config = {
          minSignalConfidence: confidence,
          positionSize: size,
          maxPositions: positions
        };
        
        const result = runBacktest(historicalData, config);
        
        // Use total return as optimization metric
        if (!bestResult || parseFloat(result.totalReturn) > parseFloat(bestResult.totalReturn)) {
          bestResult = result;
          bestParams = config;
        }
      }
    }
  }
  
  return {
    bestParams,
    bestResult,
    paramRanges
  };
}; 