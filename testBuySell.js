import { placeOrder, getMarketPrice, getBalance } from './okxBot.js';

async function testBuySell() {
  try {
    console.log('🔄 Testing SOL Buy and Sell Operations...\n');
    
    // Get current market data
    const currentPrice = await getMarketPrice('SOL-USDT');
    console.log(`💰 Current SOL Price: $${currentPrice?.toFixed(2) || 'N/A'}`);
    
    // Get current balance
    const balanceData = await getBalance();
    const details = balanceData?.data?.[0]?.details || [];
    const usdt = details.find((item) => item.ccy === 'USDT');
    const sol = details.find((item) => item.ccy === 'SOL');
    
    const availableUSDT = parseFloat(usdt?.availBal || 0);
    const availableSOL = parseFloat(sol?.availBal || 0);
    
    console.log(`💼 Current Balance:`);
    console.log(`   USDT: $${availableUSDT.toFixed(2)}`);
    console.log(`   SOL: ${availableSOL.toFixed(4)}`);
    
    // Test 1: Buy SOL if we have enough USDT
    if (availableUSDT >= 1) {
      console.log('\n🟢 TEST 1: Buying SOL');
      console.log('=====================');
      
      const buyAmount = Math.min(availableUSDT * 0.8, 5); // Use 80% of USDT or max $5
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
      
      // Wait a moment for order to process
      console.log('\n⏳ Waiting 3 seconds for order to process...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check updated balance
      const newBalanceData = await getBalance();
      const newDetails = newBalanceData?.data?.[0]?.details || [];
      const newUsdt = newDetails.find((item) => item.ccy === 'USDT');
      const newSol = newDetails.find((item) => item.ccy === 'SOL');
      
      const newAvailableUSDT = parseFloat(newUsdt?.availBal || 0);
      const newAvailableSOL = parseFloat(newSol?.availBal || 0);
      
      console.log(`\n💼 Updated Balance:`);
      console.log(`   USDT: $${newAvailableUSDT.toFixed(2)} (${newAvailableUSDT > availableUSDT ? '+' : ''}${(newAvailableUSDT - availableUSDT).toFixed(2)})`);
      console.log(`   SOL: ${newAvailableSOL.toFixed(4)} (${newAvailableSOL > availableSOL ? '+' : ''}${(newAvailableSOL - availableSOL).toFixed(4)})`);
    } else {
      console.log('\n⚠️  Insufficient USDT for buying. Need at least $1 USDT.');
    }
    
    // Test 2: Sell SOL if we have enough SOL
    const updatedBalanceData = await getBalance();
    const updatedDetails = updatedBalanceData?.data?.[0]?.details || [];
    const updatedSol = updatedDetails.find((item) => item.ccy === 'SOL');
    const updatedAvailableSOL = parseFloat(updatedSol?.availBal || 0);
    
    if (updatedAvailableSOL >= 0.001) {
      console.log('\n🔴 TEST 2: Selling SOL');
      console.log('=====================');
      
      const sellAmount = Math.min(updatedAvailableSOL * 0.5, 0.01); // Sell 50% or max 0.01 SOL
      const solToSell = sellAmount.toFixed(4);
      const expectedUsdt = sellAmount * currentPrice;
      
      console.log(`📦 Attempting to sell ${solToSell} SOL (~$${expectedUsdt.toFixed(2)} USDT)`);
      
      const sellResult = await placeOrder('sell', solToSell, 'SOL-USDT');
      
      if (sellResult?.code === '0') {
        console.log(`✅ SELL SUCCESS! Order ID: ${sellResult.data[0]?.ordId}`);
        console.log(`   Sold: ${solToSell} SOL`);
        console.log(`   Expected: ~$${expectedUsdt.toFixed(2)} USDT`);
      } else {
        console.log(`❌ SELL FAILED: ${sellResult?.data?.[0]?.sMsg || sellResult?.msg || 'Unknown error'}`);
      }
      
      // Wait a moment for order to process
      console.log('\n⏳ Waiting 3 seconds for order to process...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Final balance check
      const finalBalanceData = await getBalance();
      const finalDetails = finalBalanceData?.data?.[0]?.details || [];
      const finalUsdt = finalDetails.find((item) => item.ccy === 'USDT');
      const finalSol = finalDetails.find((item) => item.ccy === 'SOL');
      
      const finalAvailableUSDT = parseFloat(finalUsdt?.availBal || 0);
      const finalAvailableSOL = parseFloat(finalSol?.availBal || 0);
      
      console.log(`\n💼 Final Balance:`);
      console.log(`   USDT: $${finalAvailableUSDT.toFixed(2)}`);
      console.log(`   SOL: ${finalAvailableSOL.toFixed(4)}`);
      
    } else {
      console.log('\n⚠️  Insufficient SOL for selling. Need at least 0.001 SOL.');
    }
    
    console.log('\n🎯 Buy/Sell Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBuySell(); 