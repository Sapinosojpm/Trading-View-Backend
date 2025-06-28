import { placeOrder, getMarketPrice, getBalance } from './okxBot.js';

async function testOrder() {
  try {
    console.log('🧪 Testing SOL order placement...\n');
    
    // Get current price
    const currentPrice = await getMarketPrice('SOL-USDT');
    console.log(`💰 Current SOL Price: $${currentPrice?.toFixed(2) || 'N/A'}`);
    
    // Get balance
    const balanceData = await getBalance();
    const details = balanceData?.data?.[0]?.details || [];
    const usdt = details.find((item) => item.ccy === 'USDT');
    const availableUSDT = parseFloat(usdt?.availBal || 0);
    console.log(`💼 Available USDT: $${availableUSDT.toFixed(2)}`);
    
    if (availableUSDT < 1) {
      console.log('❌ Insufficient USDT for testing');
      return;
    }
    
    // Try different order sizes
    const testSizes = [
      '0.001',  // Minimum size from API
      '0.01',   // 10x minimum
      '0.05',   // 50x minimum (about $7.12)
      '0.1'     // 100x minimum
    ];
    
    for (const size of testSizes) {
      const orderValue = parseFloat(size) * currentPrice;
      console.log(`\n📦 Testing order: ${size} SOL = $${orderValue.toFixed(2)} USDT`);
      
      const result = await placeOrder('buy', size, 'SOL-USDT');
      
      if (result?.code === '0') {
        console.log(`✅ SUCCESS! Order placed for ${size} SOL`);
        console.log(`Order ID: ${result.data?.[0]?.ordId || 'N/A'}`);
        break;
      } else {
        console.log(`❌ Failed: ${result?.data?.[0]?.sMsg || result?.msg || 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOrder(); 