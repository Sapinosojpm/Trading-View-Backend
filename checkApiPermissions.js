import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.OKX_API_KEY;
const API_SECRET = process.env.OKX_API_SECRET;
const API_PASSPHRASE = process.env.OKX_API_PASSPHRASE;
const OKX_BASE_URL = 'https://www.okx.com';

function sign(timestamp, method, requestPath, body = '') {
  const preHash = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', API_SECRET).update(preHash).digest('base64');
}

async function checkApiPermissions() {
  try {
    console.log('🔍 Checking API Key Permissions...\n');
    
    // 1. Check account balance (basic permission test)
    console.log('1️⃣ Testing balance access...');
    const timestamp = new Date().toISOString();
    const balanceRes = await axios({
      method: 'GET',
      url: OKX_BASE_URL + '/api/v5/account/balance',
      headers: {
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': sign(timestamp, 'GET', '/api/v5/account/balance'),
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': API_PASSPHRASE,
        'Content-Type': 'application/json',
      },
    });
    
    if (balanceRes.data.code === '0') {
      console.log('✅ Balance access: OK');
      const details = balanceRes.data.data[0]?.details || [];
      const usdt = details.find(item => item.ccy === 'USDT');
      console.log(`💰 Available USDT: $${parseFloat(usdt?.availBal || 0).toFixed(2)}`);
    } else {
      console.log('❌ Balance access failed:', balanceRes.data.msg);
    }
    
    // 2. Check account configuration
    console.log('\n2️⃣ Checking account configuration...');
    const configRes = await axios({
      method: 'GET',
      url: OKX_BASE_URL + '/api/v5/account/config',
      headers: {
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': sign(timestamp, 'GET', '/api/v5/account/config'),
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': API_PASSPHRASE,
        'Content-Type': 'application/json',
      },
    });
    
    if (configRes.data.code === '0') {
      console.log('✅ Account config access: OK');
      console.log('Account config:', JSON.stringify(configRes.data.data[0], null, 2));
    } else {
      console.log('❌ Account config failed:', configRes.data.msg);
    }
    
    // 3. Test different order formats
    console.log('\n3️⃣ Testing different order formats...');
    
    const orderFormats = [
      // Format 1: Basic market order
      {
        instId: 'SOL-USDT',
        tdMode: 'cash',
        side: 'buy',
        ordType: 'market',
        sz: '0.05'
      },
      // Format 2: Market order with tgtCcy
      {
        instId: 'SOL-USDT',
        tdMode: 'cash',
        side: 'buy',
        ordType: 'market',
        tgtCcy: 'base_ccy',
        sz: '0.05'
      },
      // Format 3: Market order with quote currency
      {
        instId: 'SOL-USDT',
        tdMode: 'cash',
        side: 'buy',
        ordType: 'market',
        tgtCcy: 'quote_ccy',
        sz: '7'
      },
      // Format 4: Limit order instead of market
      {
        instId: 'SOL-USDT',
        tdMode: 'cash',
        side: 'buy',
        ordType: 'limit',
        sz: '0.05',
        px: '142.00'
      }
    ];
    
    for (let i = 0; i < orderFormats.length; i++) {
      const format = orderFormats[i];
      console.log(`\n📦 Testing format ${i + 1}: ${format.ordType} order`);
      console.log('Order params:', JSON.stringify(format, null, 2));
      
      const orderTimestamp = new Date().toISOString();
      const orderBody = JSON.stringify(format);
      
      try {
        const orderRes = await axios({
          method: 'POST',
          url: OKX_BASE_URL + '/api/v5/trade/order',
          data: orderBody,
          headers: {
            'OK-ACCESS-KEY': API_KEY,
            'OK-ACCESS-SIGN': sign(orderTimestamp, 'POST', '/api/v5/trade/order', orderBody),
            'OK-ACCESS-TIMESTAMP': orderTimestamp,
            'OK-ACCESS-PASSPHRASE': API_PASSPHRASE,
            'Content-Type': 'application/json',
          },
        });
        
        if (orderRes.data.code === '0') {
          console.log(`✅ Format ${i + 1} SUCCESS! Order ID: ${orderRes.data.data[0]?.ordId}`);
          break;
        } else {
          console.log(`❌ Format ${i + 1} failed: ${orderRes.data.msg}`);
          console.log(`   Details: ${orderRes.data.data?.[0]?.sMsg || 'N/A'}`);
        }
      } catch (error) {
        console.log(`❌ Format ${i + 1} error: ${error.response?.data?.msg || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ API check failed:', error.message);
  }
}

checkApiPermissions(); 