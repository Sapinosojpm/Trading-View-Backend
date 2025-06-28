import { getBalance, getMarketPrice, placeOrder } from '../okxBot.js';
import axios from 'axios';
import { websocketManager } from '../index.js';

const OKX_BASE_URL = 'https://www.okx.com';

export const getBalanceController = async (req, res) => {
  try {
    const balanceData = await getBalance();
    
    if (!balanceData || !balanceData.data) {
      // Return mock data if API credentials are not configured
      return res.json({
        total: 0,
        available: 0,
        frozen: 0,
        SOL: {
          total: 0,
          available: 0,
          frozen: 0
        },
        USDT: {
          total: 0,
          available: 0,
          frozen: 0
        },
        message: 'API credentials not configured - showing zero balances'
      });
    }

    // Extract SOL and USDT balances from OKX data
    const balances = balanceData.data[0]?.details || [];
    const solBalance = balances.find(b => b.ccy === 'SOL') || { availBal: '0', frozenBal: '0', bal: '0' };
    const usdtBalance = balances.find(b => b.ccy === 'USDT') || { availBal: '0', frozenBal: '0', bal: '0' };

    res.json({
      total: parseFloat(solBalance.bal) + parseFloat(usdtBalance.bal),
      available: parseFloat(solBalance.availBal) + parseFloat(usdtBalance.availBal),
      frozen: parseFloat(solBalance.frozenBal) + parseFloat(usdtBalance.frozenBal),
      SOL: {
        total: parseFloat(solBalance.bal),
        available: parseFloat(solBalance.availBal),
        frozen: parseFloat(solBalance.frozenBal)
      },
      USDT: {
        total: parseFloat(usdtBalance.bal),
        available: parseFloat(usdtBalance.availBal),
        frozen: parseFloat(usdtBalance.frozenBal)
      }
    });
  } catch (error) {
    console.error('Error fetching OKX balance:', error);
    res.status(500).json({ error: 'Failed to fetch OKX balance', message: error.message });
  }
};

export const getPriceController = async (req, res) => {
  try {
    const solPrice = await getMarketPrice('SOL-USDT');
    
    if (solPrice === null) {
      return res.status(500).json({ error: 'Failed to fetch SOL price from OKX' });
    }

    // Get additional market data
    const marketData = await axios.get(`${OKX_BASE_URL}/api/v5/market/ticker`, {
      params: { instId: 'SOL-USDT' }
    });

    const tickerData = marketData.data.data[0];
    
    res.json({
      symbol: 'SOL/USDT',
      price: solPrice,
      change: tickerData.change24h,
      changePercent: tickerData.changeRate24h,
      volume24h: tickerData.vol24h,
      high24h: parseFloat(tickerData.high24h),
      low24h: parseFloat(tickerData.low24h),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching SOL price from OKX:', error);
    res.status(500).json({ error: 'Failed to fetch SOL price', message: error.message });
  }
};

export const getMarketDataController = async (req, res) => {
  try {
    // Get SOL market data from OKX
    const [solUsdt, solUsdc] = await Promise.all([
      axios.get(`${OKX_BASE_URL}/api/v5/market/ticker`, { params: { instId: 'SOL-USDT' } }),
      axios.get(`${OKX_BASE_URL}/api/v5/market/ticker`, { params: { instId: 'SOL-USDC' } })
    ]);

    const marketData = {
      pairs: [
        {
          symbol: 'SOL/USDT',
          price: parseFloat(solUsdt.data.data[0].last),
          change: solUsdt.data.data[0].change24h,
          volume: solUsdt.data.data[0].vol24h
        },
        {
          symbol: 'SOL/USDC',
          price: parseFloat(solUsdc.data.data[0].last),
          change: solUsdc.data.data[0].change24h,
          volume: solUsdc.data.data[0].vol24h
        }
      ],
      stats: {
        marketCap: 'N/A', // Would need additional API call
        volume24h: solUsdt.data.data[0].vol24h,
        circulatingSupply: 'N/A',
        totalSupply: 'N/A'
      }
    };

    res.json(marketData);
  } catch (error) {
    console.error('Error fetching SOL market data from OKX:', error);
    res.status(500).json({ error: 'Failed to fetch SOL market data', message: error.message });
  }
};

export const executeTradeController = async (req, res) => {
  try {
    const { symbol, side, amount, price, orderType } = req.body;

    if (!symbol || !side || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['symbol', 'side', 'amount']
      });
    }

    // Convert symbol format (SOL/USDT -> SOL-USDT)
    const okxSymbol = symbol.replace('/', '-');
    
    // Use OKX API to place the order
    const orderResult = await placeOrder(side, amount.toString(), okxSymbol);
    
    if (!orderResult) {
      return res.status(400).json({
        error: 'Failed to place order on OKX',
        details: 'API credentials not configured or order failed'
      });
    }

    if (orderResult.code !== '0') {
      return res.status(400).json({
        error: 'Failed to place order on OKX',
        details: orderResult?.msg || 'Unknown error'
      });
    }

    const trade = {
      id: orderResult.data[0]?.ordId || `SOL_${Date.now()}`,
      symbol,
      side,
      amount: parseFloat(amount),
      price: price ? parseFloat(price) : 0,
      orderType: orderType || 'market',
      status: 'executed',
      timestamp: new Date().toISOString(),
      fee: 0.1, // OKX fee
      total: parseFloat(amount) * (price ? parseFloat(price) : 0),
      okxResponse: orderResult
    };

    res.json({
      success: true,
      message: `SOL ${side.toUpperCase()} order executed on OKX`,
      trade
    });
  } catch (error) {
    console.error('Error executing SOL trade on OKX:', error);
    res.status(500).json({ error: 'Failed to execute SOL trade', message: error.message });
  }
};

// Get current SOL price
export const getSolanaPrice = async (req, res) => {
  try {
    const price = await getMarketPrice('SOL-USDT');
    res.json({ price, symbol: 'SOL-USDT' });
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
};

// Get account balance
export const getAccountBalance = async (req, res) => {
  try {
    const balance = await getBalance();
    res.json(balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
};

// Place a trade order
export const placeTradeOrder = async (req, res) => {
  try {
    const { side, amount, symbol = 'SOL-USDT' } = req.body;
    
    if (!side || !amount) {
      return res.status(400).json({ error: 'Side and amount are required' });
    }
    
    const result = await placeOrder(side, amount, symbol);
    
    if (result?.code === '0') {
      // Broadcast order update via WebSocket
      websocketManager.broadcastOrderUpdate({
        orderId: result.data[0]?.ordId,
        side,
        amount,
        symbol,
        status: 'placed',
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        orderId: result.data[0]?.ordId,
        message: `${side.toUpperCase()} order placed successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result?.data?.[0]?.sMsg || result?.msg || 'Order placement failed'
      });
    }
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
};

// Get price movement analysis
export const getPriceMovementAnalysis = async (req, res) => {
  try {
    const { timeframe = '1m', limit = 100 } = req.query;
    
    // Get historical candles for analysis
    const candlesResponse = await axios.get(`${OKX_BASE_URL}/api/v5/market/candles`, {
      params: { 
        instId: 'SOL-USDT', 
        bar: timeframe,
        limit: parseInt(limit)
      }
    });

    if (!candlesResponse.data.data || candlesResponse.data.data.length === 0) {
      return res.status(404).json({ error: 'No price data available' });
    }

    const candles = candlesResponse.data.data.map(candle => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));

    // Calculate movement analysis
    const analysis = calculateMovementAnalysis(candles);
    
    res.json({
      timeframe,
      dataPoints: candles.length,
      analysis,
      recentCandles: candles.slice(-10), // Last 10 candles
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing price movement:', error);
    res.status(500).json({ error: 'Failed to analyze price movement', message: error.message });
  }
};

// Get price alerts configuration
export const getPriceAlerts = async (req, res) => {
  try {
    // This would typically come from a database
    // For now, return default configuration
    res.json({
      alerts: [
        { id: 1, type: 'percentage', value: 5, enabled: true, description: '5% price change' },
        { id: 2, type: 'percentage', value: 10, enabled: true, description: '10% price change' },
        { id: 3, type: 'volatility', value: 2, enabled: false, description: 'High volatility alert' }
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    res.status(500).json({ error: 'Failed to fetch price alerts' });
  }
};

// Calculate movement analysis from candle data
const calculateMovementAnalysis = (candles) => {
  if (candles.length < 2) return {};

  const prices = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  
  // Calculate basic statistics
  const currentPrice = prices[prices.length - 1];
  const previousPrice = prices[prices.length - 2];
  const priceChange = currentPrice - previousPrice;
  const percentageChange = (priceChange / previousPrice) * 100;
  
  // Calculate volatility (standard deviation)
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const volatility = Math.sqrt(variance);
  
  // Calculate trend
  const recentPrices = prices.slice(-10);
  const olderPrices = prices.slice(-20, -10);
  const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
  const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
  const trendStrength = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  let trend = 'neutral';
  if (trendStrength > 2) trend = 'bullish';
  else if (trendStrength < -2) trend = 'bearish';
  
  // Calculate volume analysis
  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;
  
  // Calculate price range
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const priceRange = maxHigh - minLow;
  
  return {
    currentPrice: currentPrice.toFixed(2),
    priceChange: priceChange.toFixed(2),
    percentageChange: percentageChange.toFixed(2),
    volatility: volatility.toFixed(2),
    trend,
    trendStrength: trendStrength.toFixed(2),
    volumeRatio: volumeRatio.toFixed(2),
    priceRange: priceRange.toFixed(2),
    maxHigh: maxHigh.toFixed(2),
    minLow: minLow.toFixed(2),
    avgVolume: avgVolume.toFixed(2),
    currentVolume: currentVolume.toFixed(2)
  };
};
