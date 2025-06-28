// Test script for Enhanced Trading Bot
// Demonstrates the new features: RSI, Moving Averages, Dynamic Stop-Loss, and Backtesting

import { getRecentCandles } from './okxBot.js';
import { generateTradingSignal, calculateDynamicLevels } from './utils/technicalAnalysis.js';
import { runBacktest, compareStrategies, optimizeParameters } from './utils/backtest.js';
import { getTradingStats } from './autoTrade/enhancedTradeBot.js';

console.log('🚀 Testing Enhanced Trading Bot Features...\n');

// Test 1: Fetch recent candle data
console.log('📊 Test 1: Fetching recent candle data...');
const testCandles = async () => {
  try {
    const candles = await getRecentCandles('SOL-USDT', 100, '1m');
    if (candles && candles.length > 0) {
      console.log(`✅ Fetched ${candles.length} candles`);
      console.log(`📈 Latest price: $${candles[candles.length - 1].close}`);
      return candles;
    } else {
      console.log('❌ No candle data received');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching candles:', error.message);
    return null;
  }
};

// Test 2: Generate trading signal
console.log('\n📊 Test 2: Generating trading signal...');
const testSignal = (candles) => {
  if (!candles || candles.length < 50) {
    console.log('❌ Insufficient data for signal generation');
    return null;
  }
  
  const signal = generateTradingSignal(candles);
  console.log(`✅ Signal: ${signal.signal.toUpperCase()}`);
  console.log(`📊 Confidence: ${signal.confidence.toFixed(1)}%`);
  console.log(`📈 RSI: ${signal.indicators.rsi.toFixed(1)}`);
  console.log(`📊 EMA5: ${signal.indicators.ema5.toFixed(2)}`);
  console.log(`📊 EMA20: ${signal.indicators.ema20.toFixed(2)}`);
  console.log(`📊 ATR: ${signal.indicators.atr.toFixed(4)}`);
  console.log(`💡 Reason: ${signal.reason}`);
  
  return signal;
};

// Test 3: Calculate dynamic levels
console.log('\n📊 Test 3: Calculating dynamic stop-loss and take-profit...');
const testDynamicLevels = (signal) => {
  if (!signal || signal.signal === 'neutral') {
    console.log('❌ No valid signal for level calculation');
    return null;
  }
  
  const levels = calculateDynamicLevels(
    signal.indicators.price,
    signal.indicators.atr,
    signal.signal
  );
  
  console.log(`✅ Entry Price: $${signal.indicators.price.toFixed(2)}`);
  console.log(`🛑 Stop Loss: $${levels.stopLoss.toFixed(2)}`);
  console.log(`🎯 Take Profit: $${levels.takeProfit.toFixed(2)}`);
  console.log(`📊 Risk/Reward: ${((levels.takeProfit - signal.indicators.price) / (signal.indicators.price - levels.stopLoss)).toFixed(2)}:1`);
  
  return levels;
};

// Test 4: Run backtest
console.log('\n📊 Test 4: Running backtest...');
const testBacktest = (candles) => {
  if (!candles || candles.length < 100) {
    console.log('❌ Insufficient data for backtest');
    return null;
  }
  
  const config = {
    initialBalance: 1000,
    maxPositions: 3,
    minSignalConfidence: 60,
    positionSize: 0.3,
    enableStopLoss: true,
    enableTakeProfit: true
  };
  
  console.log('🔄 Running backtest with config:', config);
  const result = runBacktest(candles, config);
  
  console.log('\n📊 Backtest Results:');
  console.log(`💰 Initial Balance: $${result.initialBalance}`);
  console.log(`💰 Final Balance: $${result.finalBalance.toFixed(2)}`);
  console.log(`📈 Total Return: ${result.totalReturn}%`);
  console.log(`📊 Total Trades: ${result.totalTrades}`);
  console.log(`✅ Winning Trades: ${result.winningTrades}`);
  console.log(`❌ Losing Trades: ${result.losingTrades}`);
  console.log(`🎯 Win Rate: ${result.winRate}%`);
  console.log(`📉 Max Drawdown: ${result.maxDrawdown}%`);
  console.log(`💰 Average Win: $${result.avgWin}`);
  console.log(`💰 Average Loss: $${result.avgLoss}`);
  console.log(`📊 Profit Factor: ${result.profitFactor}`);
  
  return result;
};

// Test 5: Compare strategies
console.log('\n📊 Test 5: Comparing different strategies...');
const testStrategyComparison = (candles) => {
  if (!candles || candles.length < 100) {
    console.log('❌ Insufficient data for strategy comparison');
    return null;
  }
  
  const strategies = [
    {
      name: 'Conservative',
      initialBalance: 1000,
      maxPositions: 2,
      minSignalConfidence: 70,
      positionSize: 0.2,
      enableStopLoss: true,
      enableTakeProfit: true
    },
    {
      name: 'Balanced',
      initialBalance: 1000,
      maxPositions: 3,
      minSignalConfidence: 60,
      positionSize: 0.3,
      enableStopLoss: true,
      enableTakeProfit: true
    },
    {
      name: 'Aggressive',
      initialBalance: 1000,
      maxPositions: 4,
      minSignalConfidence: 50,
      positionSize: 0.4,
      enableStopLoss: true,
      enableTakeProfit: true
    }
  ];
  
  console.log('🔄 Comparing strategies...');
  const results = compareStrategies(candles, strategies);
  
  console.log('\n📊 Strategy Comparison Results:');
  Object.keys(results).forEach(key => {
    const strategy = results[key];
    console.log(`\n${strategy.name}:`);
    console.log(`  📈 Return: ${strategy.totalReturn}%`);
    console.log(`  🎯 Win Rate: ${strategy.winRate}%`);
    console.log(`  📊 Total Trades: ${strategy.totalTrades}`);
    console.log(`  📉 Max Drawdown: ${strategy.maxDrawdown}%`);
    console.log(`  📊 Profit Factor: ${strategy.profitFactor}`);
  });
  
  return results;
};

// Test 6: Parameter optimization
console.log('\n📊 Test 6: Optimizing parameters...');
const testOptimization = (candles) => {
  if (!candles || candles.length < 100) {
    console.log('❌ Insufficient data for optimization');
    return null;
  }
  
  const paramRanges = {
    minSignalConfidence: [50, 60, 70],
    positionSize: [0.2, 0.3, 0.4],
    maxPositions: [2, 3, 4]
  };
  
  console.log('🔄 Optimizing parameters...');
  const optimization = optimizeParameters(candles, paramRanges);
  
  console.log('\n📊 Optimization Results:');
  console.log('🎯 Best Parameters:', optimization.bestParams);
  console.log(`📈 Best Return: ${optimization.bestResult.totalReturn}%`);
  console.log(`🎯 Best Win Rate: ${optimization.bestResult.winRate}%`);
  console.log(`📊 Best Profit Factor: ${optimization.bestResult.profitFactor}`);
  
  return optimization;
};

// Test 7: Get trading stats
console.log('\n📊 Test 7: Getting trading statistics...');
const testTradingStats = () => {
  try {
    const stats = getTradingStats();
    console.log('📊 Current Trading Statistics:');
    console.log(`📈 Open Positions: ${stats.openPositions}`);
    console.log(`💰 Total Invested: $${stats.totalInvested.toFixed(2)}`);
    console.log(`📊 Total P&L: $${stats.totalPnl}`);
    console.log(`🎯 Win Rate: ${stats.winRate}%`);
    console.log(`📊 Total Trades: ${stats.totalTrades}`);
  } catch (error) {
    console.log('ℹ️ No active trading session - stats not available');
  }
};

// Main test function
const runAllTests = async () => {
  console.log('🧪 Starting Enhanced Trading Bot Tests...\n');
  
  // Test 1: Fetch candles
  const candles = await testCandles();
  if (!candles) {
    console.log('❌ Cannot proceed without candle data');
    return;
  }
  
  // Test 2: Generate signal
  const signal = testSignal(candles);
  
  // Test 3: Dynamic levels
  if (signal) {
    testDynamicLevels(signal);
  }
  
  // Test 4: Backtest
  testBacktest(candles);
  
  // Test 5: Strategy comparison
  testStrategyComparison(candles);
  
  // Test 6: Parameter optimization
  testOptimization(candles);
  
  // Test 7: Trading stats
  testTradingStats();
  
  console.log('\n✅ All tests completed!');
  console.log('\n🎯 Key Improvements Implemented:');
  console.log('✅ RSI for oversold/overbought detection');
  console.log('✅ Moving Average crossovers (EMA5 vs EMA20)');
  console.log('✅ Dynamic stop-loss and take-profit based on ATR');
  console.log('✅ Position sizing based on signal confidence');
  console.log('✅ Multiple position management (DCA style)');
  console.log('✅ Time-based trading filters');
  console.log('✅ Comprehensive backtesting engine');
  console.log('✅ Strategy comparison and optimization');
  console.log('✅ Enhanced risk management');
  
  console.log('\n🚀 Your trading bot is now much smarter!');
  console.log('💡 Remember: Start with small amounts and monitor performance.');
  console.log('📊 Use the backtesting results to fine-tune parameters.');
};

// Run tests
runAllTests().catch(console.error); 