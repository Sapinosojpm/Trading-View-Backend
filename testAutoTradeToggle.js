import { enableAutoTrading, disableAutoTrading, getAutoTradingStatus } from './autoTrade/tradeBot.js';

console.log('🧪 Testing Auto-Trading Toggle Functionality\n');

// Test 1: Check initial status
console.log('1️⃣ Initial auto-trading status:', getAutoTradingStatus() ? '🟢 ENABLED' : '🔴 DISABLED');

// Test 2: Disable auto-trading
console.log('\n2️⃣ Disabling auto-trading...');
disableAutoTrading();
console.log('   Status after disable:', getAutoTradingStatus() ? '🟢 ENABLED' : '🔴 DISABLED');

// Test 3: Enable auto-trading
console.log('\n3️⃣ Enabling auto-trading...');
enableAutoTrading();
console.log('   Status after enable:', getAutoTradingStatus() ? '🟢 ENABLED' : '🔴 DISABLED');

// Test 4: Disable again
console.log('\n4️⃣ Disabling auto-trading again...');
disableAutoTrading();
console.log('   Status after second disable:', getAutoTradingStatus() ? '🟢 ENABLED' : '🔴 DISABLED');

console.log('\n✅ Auto-trading toggle functionality test completed!');
console.log('\n📝 You can now:');
console.log('   • Use the toggle switch in the frontend Dashboard or Trading Logs');
console.log('   • Call the API endpoints:');
console.log('     - GET /api/autotrade/status');
console.log('     - POST /api/autotrade/enable');
console.log('     - POST /api/autotrade/disable');
console.log('     - POST /api/autotrade/toggle'); 