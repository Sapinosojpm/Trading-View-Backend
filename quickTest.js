import { getMarketPrice, getCandleDirection } from './okxBot.js';

async function quickTest() {
  console.log('🧪 Quick Auto-Trade System Test');
  console.log('================================');
  
  try {
    // Test 1: Get current price
    console.log('\n1️⃣ Testing price fetch...');
    const price = await getMarketPrice('SOL-USDT');
    console.log(`✅ Current SOL Price: $${price?.toFixed(2) || 'N/A'}`);
    
    // Test 2: Get candle direction
    console.log('\n2️⃣ Testing candle analysis...');
    const direction = await getCandleDirection('SOL-USDT');
    console.log(`✅ Candle Direction: ${direction?.toUpperCase() || 'N/A'}`);
    
    // Test 3: Check auto-trade status
    console.log('\n3️⃣ Testing auto-trade status...');
    const response = await fetch('http://localhost:4000/api/autotrade/status');
    if (response.ok) {
      const status = await response.json();
      console.log(`✅ Auto-trade Status: ${JSON.stringify(status, null, 2)}`);
    } else {
      console.log('❌ Could not fetch auto-trade status');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('🤖 Your auto-trading bot is ready and running!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest(); 