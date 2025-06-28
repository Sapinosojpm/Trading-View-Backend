import { placeOrder, getMarketPrice, getBalance } from './okxBot.js';

async function testBuy() {
  try {
    console.log('🟢 Testing SOL Buy Operation...\n');
    
    // Get current market data
    const currentPrice = await getMarketPrice('SOL-USDT');
    console.log(`💰 Current SOL Price: $${currentPrice?.toFixed(2) || 'N/A'}`);
    
    // Get current balance
    const balanceData = await getBalance();
    const details = balanceData?.data?.[0]?.details || [];
    const usdt = details.find((item) => item.ccy === 'USDT');
    
    const availableUSDT = parseFloat(usdt?.availBal || 0);
    console.log(`💼 Available USDT: $${availableUSDT.toFixed(2)}`);
    
    if (availableUSDT >= 1) {
      const buyAmount = Math.min(availableUSDT * 0.9, 1.5); // Use 90% or max $1.50
      const solToBuy = (buyAmount / currentPrice).toFixed(4);
      
      console.log(`📦 Attempting to buy ${solToBuy} SOL ($${buyAmount.toFixed(2)} USDT)`);
      
      const buyResult = await placeOrder('buy', solToBuy, 'SOL-USDT');
      
      if (buyResult?.code === '0') {
        console.log(`✅ BUY SUCCESS! Order ID: ${buyResult.data[0]?.ordId}`);
        console.log(`   Bought: ${solToBuy} SOL`);
        console.log(`   Cost: ~$${buyAmount.toFixed(2)} USDT`);
      } else {
        console.log(`❌ BUY FAILED: ${buyResult?.data?.[0]?.sMsg || buyResult?.msg || 'Unknown error'}`);
      }
      
      // Check updated balance
      console.log('\n⏳ Waiting 3 seconds for order to process...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newBalanceData = await getBalance();
      const newDetails = newBalanceData?.data?.[0]?.details || [];
      const newUsdt = newDetails.find((item) => item.ccy === 'USDT');
      const newSol = newDetails.find((item) => item.ccy === 'SOL');
      
      const newAvailableUSDT = parseFloat(newUsdt?.availBal || 0);
      const newAvailableSOL = parseFloat(newSol?.availBal || 0);
      
      console.log(`\n💼 Updated Balance:`);
      console.log(`   USDT: $${newAvailableUSDT.toFixed(2)}`);
      console.log(`   SOL: ${newAvailableSOL.toFixed(4)}`);
      
    } else {
      console.log('⚠️  Insufficient USDT for buying. Need at least $1 USDT.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBuy(); 