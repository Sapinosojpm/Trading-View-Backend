import { testAutoTrade } from './autoTrade/tradeBot.js';

console.log('🧪 Testing Auto-Trading Strategy');
console.log('================================');

// Test the auto-trade strategy
testAutoTrade()
  .then(() => {
    console.log('✅ Auto-trade test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Auto-trade test failed:', error);
    process.exit(1);
  }); 