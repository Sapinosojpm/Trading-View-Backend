import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.OKX_API_KEY;
const API_SECRET = process.env.OKX_API_SECRET;
const API_PASSPHRASE = process.env.OKX_API_PASSPHRASE;
const OKX_BASE_URL = 'https://www.okx.com';

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
 * Fetch account balance from OKX
 */
export async function getBalance() {
  if (!hasApiCredentials) {
    console.error('🚨 Cannot fetch balance: OKX API credentials not configured');
    return null;
  }

  const timestamp = new Date().toISOString();
  const method = 'GET';
  const path = '/api/v5/account/balance';
  const signature = sign(timestamp, method, path);

  try {
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
    });
    return res.data;
  } catch (err) {
    console.error('🚨 Error fetching balance:', err.message);
    return null;
  }
}

/**
 * Get current market price of given instrument (defaults to SOL-USDT)
 * This is a public endpoint and doesn't require API credentials
 */
export async function getMarketPrice(instId = 'SOL-USDT') {
  try {
    const res = await axios.get(`${OKX_BASE_URL}/api/v5/market/ticker`, {
      params: { instId },
    });
    return parseFloat(res.data.data[0].last);
  } catch (err) {
    console.error('🚨 Error fetching market price:', err.message);
    return null;
  }
}

/**
 * Fetch recent candle data for technical analysis
 * @param {string} instId - Trading pair (e.g., "SOL-USDT")
 * @param {number} limit - Number of candles to fetch (max 300)
 * @param {string} bar - Timeframe (1m, 5m, 15m, 1H, 4H, 1D)
 * @returns {Array} Array of candle objects with OHLC data
 */
export async function getRecentCandles(instId = 'SOL-USDT', limit = 100, bar = '1m') {
  try {
    const res = await axios.get(`${OKX_BASE_URL}/api/v5/market/candles`, {
      params: { 
        instId, 
        bar, 
        limit: Math.min(limit, 300) // OKX max is 300
      },
    });

    // Transform OKX candle data to our format
    // OKX format: [timestamp, open, high, low, close, volume, currency_volume]
    const candles = res.data.data.map(candle => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));

    // Reverse to get chronological order (oldest first)
    return candles.reverse();
  } catch (err) {
    console.error('🚨 Error fetching recent candles:', err.message);
    return null;
  }
}

/**
 * Place a market order on OKX
 * @param {string} side - "buy" or "sell"
 * @param {string} size - Size of order (e.g., "0.5")
 * @param {string} instId - Trading pair (e.g., "SOL-USDT")
 */
export async function placeOrder(side = 'buy', size = '0.1', instId = 'SOL-USDT') {
  if (!hasApiCredentials) {
    console.error('🚨 Cannot place order: OKX API credentials not configured');
    return null;
  }

  const timestamp = new Date().toISOString();
  const method = 'POST';
  const path = '/api/v5/trade/order';
  
  // Use the correct order format that works with OKX
  const orderBody = {
    instId,
    tdMode: 'cash',
    side,
    ordType: 'market',
    tgtCcy: 'base_ccy', // This is the key fix - specify base currency
    sz: size,
  };
  
  const body = JSON.stringify(orderBody);
  const signature = sign(timestamp, method, path, body);

  try {
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
    });

    return res.data;
  } catch (err) {
    console.error('🚨 Order error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Determine candle direction (bullish, bearish, or neutral)
 */
export async function getCandleDirection(instId = 'SOL-USDT', bar = '1m') {
  try {
    const res = await axios.get(`${OKX_BASE_URL}/api/v5/market/candles`, {
      params: { instId, bar, limit: 1 },
    });

    const [latest] = res.data.data;
    const [ts, open, high, low, close] = latest.map(parseFloat);

    console.log(`🕯️ Candle - Open: ${open}, Close: ${close}`);

    if (close > open) return 'bullish';
    if (close < open) return 'bearish';
    return 'neutral';
  } catch (err) {
    console.error('🚨 Error fetching candle:', err.message);
    return null;
  }
}
