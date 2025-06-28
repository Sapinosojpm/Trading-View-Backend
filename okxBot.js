import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.OKX_API_KEY;
const API_SECRET = process.env.OKX_API_SECRET;
const API_PASSPHRASE = process.env.OKX_API_PASSPHRASE;
const OKX_BASE_URL = 'https://www.okx.com';

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 2, // OKX allows ~2 requests per second
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  lastRequestTime: 0
};

// Check if API credentials are available
const hasApiCredentials = API_KEY && API_SECRET && API_PASSPHRASE;

if (!hasApiCredentials) {
  console.warn('⚠️  OKX API credentials not found. Please create a .env file with:');
  console.warn('   OKX_API_KEY=your_api_key');
  console.warn('   OKX_API_SECRET=your_api_secret');
  console.warn('   OKX_API_PASSPHRASE=your_passphrase');
  console.warn('   Balance and trading features will not work without credentials.');
}

/**
 * Rate limiting function
 */
const rateLimit = () => {
  const now = Date.now();
  const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
  const minInterval = 1000 / RATE_LIMIT.requestsPerSecond;
  
  if (timeSinceLastRequest < minInterval) {
    const delay = minInterval - timeSinceLastRequest;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  RATE_LIMIT.lastRequestTime = now;
  return Promise.resolve();
};

/**
 * Retry function with exponential backoff
 */
const retryRequest = async (requestFn, maxRetries = RATE_LIMIT.maxRetries) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimit();
      return await requestFn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRateLimitError = error.response?.status === 429 || error.response?.status === 403;
      
      console.warn(`⚠️  Request attempt ${attempt}/${maxRetries} failed:`, {
        status: error.response?.status,
        message: error.message,
        isRateLimit: isRateLimitError
      });
      
      if (isLastAttempt) {
        throw error;
      }
      
      if (isRateLimitError) {
        // Longer delay for rate limit errors
        const delay = RATE_LIMIT.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Shorter delay for other errors
        const delay = RATE_LIMIT.retryDelay;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

/**
 * Generate the OKX API signature
 */
function sign(timestamp, method, requestPath, body = '') {
  if (!API_SECRET) {
    throw new Error('API_SECRET is required for authenticated requests');
  }
  const preHash = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', API_SECRET).update(preHash).digest('base64');
}

/**
 * Fetch account balance from OKX with retry logic
 */
export async function getBalance() {
  if (!hasApiCredentials) {
    console.error('🚨 Cannot fetch balance: OKX API credentials not configured');
    return null;
  }

  return retryRequest(async () => {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const path = '/api/v5/account/balance';
    const signature = sign(timestamp, method, path);

    const res = await axios({
      method,
      url: OKX_BASE_URL + path,
      headers: {
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': API_PASSPHRASE,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
    
    console.log('✅ Balance fetched successfully');
    return res.data;
  });
}

/**
 * Get current market price with retry logic
 * This is a public endpoint and doesn't require API credentials
 */
export async function getMarketPrice(instId = 'SOL-USDT') {
  return retryRequest(async () => {
    const res = await axios.get(`${OKX_BASE_URL}/api/v5/market/ticker`, {
      params: { instId },
      timeout: 10000, // 10 second timeout
    });
    
    const price = parseFloat(res.data.data[0].last);
    console.log(`✅ Market price fetched: $${price.toFixed(2)}`);
    return price;
  });
}

/**
 * Fetch recent candle data with retry logic
 */
export async function getRecentCandles(instId = 'SOL-USDT', limit = 100, bar = '1m') {
  return retryRequest(async () => {
    const res = await axios.get(`${OKX_BASE_URL}/api/v5/market/candles`, {
      params: { 
        instId, 
        bar, 
        limit: Math.min(limit, 300) // OKX max is 300
      },
      timeout: 10000, // 10 second timeout
    });

    // Transform OKX candle data to our format
    const candles = res.data.data.map(candle => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));

    console.log(`✅ Fetched ${candles.length} candles for ${instId}`);
    return candles.reverse(); // Reverse to get chronological order
  });
}

/**
 * Place a market order with retry logic
 */
export async function placeOrder(side = 'buy', size = '0.1', instId = 'SOL-USDT') {
  if (!hasApiCredentials) {
    console.error('🚨 Cannot place order: OKX API credentials not configured');
    return null;
  }

  return retryRequest(async () => {
    const timestamp = new Date().toISOString();
    const method = 'POST';
    const path = '/api/v5/trade/order';
    
    const orderBody = {
      instId,
      tdMode: 'cash',
      side,
      ordType: 'market',
      tgtCcy: 'base_ccy',
      sz: size,
    };
    
    const body = JSON.stringify(orderBody);
    const signature = sign(timestamp, method, path, body);

    const res = await axios({
      method,
      url: OKX_BASE_URL + path,
      data: body,
      headers: {
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': API_PASSPHRASE,
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 second timeout for orders
    });

    console.log(`✅ Order placed successfully: ${side} ${size} ${instId}`);
    return res.data;
  });
}

/**
 * Determine candle direction with retry logic
 */
export async function getCandleDirection(instId = 'SOL-USDT', bar = '1m') {
  return retryRequest(async () => {
    const res = await axios.get(`${OKX_BASE_URL}/api/v5/market/candles`, {
      params: { instId, bar, limit: 1 },
      timeout: 10000,
    });

    const [latest] = res.data.data;
    const [ts, open, high, low, close] = latest.map(parseFloat);

    console.log(`🕯️ Candle - Open: ${open}, Close: ${close}`);

    if (close > open) return 'bullish';
    if (close < open) return 'bearish';
    return 'neutral';
  });
}

/**
 * Test API connectivity
 */
export async function testApiConnection() {
  console.log('🔍 Testing OKX API connection...');
  
  try {
    // Test public endpoint first
    const price = await getMarketPrice('SOL-USDT');
    console.log('✅ Public API working');
    
    if (hasApiCredentials) {
      // Test authenticated endpoint
      const balance = await getBalance();
      console.log('✅ Authenticated API working');
      return { public: true, authenticated: true, price, balance };
    } else {
      console.log('⚠️  No API credentials - authenticated endpoints unavailable');
      return { public: true, authenticated: false, price };
    }
  } catch (error) {
    console.error('❌ API connection test failed:', error.message);
    return { public: false, authenticated: false, error: error.message };
  }
}
