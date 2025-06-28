import axios from 'axios';

const OKX_BASE_URL = 'https://www.okx.com';

async function checkMinOrderRequirements() {
  try {
    console.log('🔍 Checking SOL/USDT minimum order requirements on OKX...\n');
    
    // Get instrument information
    const response = await axios.get(`${OKX_BASE_URL}/api/v5/public/instruments`, {
      params: { 
        instType: 'SPOT',
        instId: 'SOL-USDT'
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const instrument = response.data.data[0];
      
      console.log('📊 SOL/USDT Trading Requirements:');
      console.log('================================');
      console.log(`Minimum Order Size: ${instrument.minSz} SOL`);
      console.log(`Minimum Order Value: ${instrument.minSz} SOL × Current Price`);
      console.log(`Tick Size: ${instrument.tickSz}`);
      console.log(`Lot Size: ${instrument.lotSz}`);
      console.log(`Contract Value: ${instrument.ctVal}`);
      console.log(`Contract Multiplier: ${instrument.ctMult}`);
      console.log(`Contract Value Currency: ${instrument.ctValCcy}`);
      console.log(`Category: ${instrument.category}`);
      console.log(`State: ${instrument.state}`);
      
      // Get current price to calculate minimum order value
      const priceResponse = await axios.get(`${OKX_BASE_URL}/api/v5/market/ticker`, {
        params: { instId: 'SOL-USDT' }
      });
      
      if (priceResponse.data && priceResponse.data.data && priceResponse.data.data.length > 0) {
        const currentPrice = parseFloat(priceResponse.data.data[0].last);
        const minOrderValue = parseFloat(instrument.minSz) * currentPrice;
        
        console.log(`\n💰 Current SOL Price: $${currentPrice.toFixed(2)}`);
        console.log(`💵 Minimum Order Value: $${minOrderValue.toFixed(2)} USDT`);
        console.log(`📈 With your $7.13 USDT, you can buy: ${(7.13 / currentPrice).toFixed(4)} SOL`);
        
        if (minOrderValue > 7.13) {
          console.log(`\n❌ Your $7.13 is insufficient for minimum order ($${minOrderValue.toFixed(2)})`);
          console.log(`💡 You need at least $${(minOrderValue + 1).toFixed(2)} USDT to place orders`);
        } else {
          console.log(`\n✅ Your $7.13 should be sufficient for minimum orders`);
        }
      }
    } else {
      console.log('❌ Could not fetch instrument information');
    }
    
  } catch (error) {
    console.error('❌ Error checking minimum order requirements:', error.message);
  }
}

// Run the check
checkMinOrderRequirements(); 