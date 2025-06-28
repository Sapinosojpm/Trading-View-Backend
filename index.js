import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDB } from './config/database.js';
import okxRoutes from './routes/okxRoutes.js';
import switchRoutes from './routes/switchRoutes.js';
import { websocketManager } from './websocket.js';
import runAutoTrade, { enableAutoTrading, disableAutoTrading, getAutoTradingStatus } from './autoTrade/tradeBot.js';
import { initializeDefaultSwitches } from './utils/switchManager.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Connect to MongoDB
connectDB().then(() => {
  // Initialize default switches after database connection
  initializeDefaultSwitches();
});

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // React dev server
    'https://trading-view-frontend.vercel.app', // Vercel production
    'https://trading-view-frontend-git-main.vercel.app', // Vercel preview deployments
    'https://trading-view-frontend-*.vercel.app' // Vercel branch deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Initialize WebSocket
websocketManager.initialize(server);

// Routes
app.use('/api/okx', okxRoutes);
app.use('/api/switches', switchRoutes);

// Legacy balance endpoint (for backward compatibility)
app.get('/api/balance', async (req, res) => {
  try {
    const { getBalance } = await import('./okxBot.js');
    const balance = await getBalance();
    res.json(balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json({
    connected: true,
    clientCount: websocketManager.getConnectedClients(),
    streams: {
      price: websocketManager.priceInterval !== null,
      balance: websocketManager.balanceInterval !== null
    }
  });
});

// Auto-trade control endpoints
app.get('/api/autotrade/status', async (req, res) => {
  try {
    const enabled = await getAutoTradingStatus();
    res.json({
      enabled,
      strategy: 'candle-based',
      interval: '60 seconds',
      lastRun: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting auto-trade status:', error);
    res.status(500).json({
      enabled: false,
      error: 'Failed to get auto-trade status'
    });
  }
});

app.post('/api/autotrade/enable', async (req, res) => {
  try {
    await enableAutoTrading();
    res.json({
      success: true,
      message: 'Auto-trading enabled',
      enabled: true
    });
  } catch (error) {
    console.error('Error enabling auto-trading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable auto-trading'
    });
  }
});

app.post('/api/autotrade/disable', async (req, res) => {
  try {
    await disableAutoTrading();
    res.json({
      success: true,
      message: 'Auto-trading disabled',
      enabled: false
    });
  } catch (error) {
    console.error('Error disabling auto-trading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable auto-trading'
    });
  }
});

app.post('/api/autotrade/toggle', async (req, res) => {
  console.log('🔄 /api/autotrade/toggle endpoint called');
  console.log('📊 Request body:', req.body);
  console.log('📊 Request headers:', req.headers);
  
  try {
    console.log('🔍 Getting current auto-trading status...');
    const currentStatus = await getAutoTradingStatus();
    console.log('📊 Current auto-trading status:', currentStatus);
    
    if (currentStatus) {
      console.log('🔴 Disabling auto-trading...');
      await disableAutoTrading();
      
      const newStatus = await getAutoTradingStatus();
      console.log('📊 New auto-trading status after disable:', newStatus);
      
      const response = {
        success: true,
        message: 'Auto-trading disabled',
        enabled: false
      };
      console.log('✅ Sending response:', response);
      res.json(response);
    } else {
      console.log('🟢 Enabling auto-trading...');
      await enableAutoTrading();
      
      const newStatus = await getAutoTradingStatus();
      console.log('📊 New auto-trading status after enable:', newStatus);
      
      const response = {
        success: true,
        message: 'Auto-trading enabled',
        enabled: true
      };
      console.log('✅ Sending response:', response);
      res.json(response);
    }
  } catch (error) {
    console.error('💥 Error toggling auto-trading:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    const errorResponse = {
      success: false,
      error: 'Failed to toggle auto-trading',
      details: error.message
    };
    console.log('❌ Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const autoTradeEnabled = await getAutoTradingStatus();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      websocket: {
        connected: true,
        clientCount: websocketManager.getConnectedClients()
      },
      autotrade: {
        enabled: autoTradeEnabled,
        strategy: 'candle-based'
      }
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Debug endpoint to check auto-trading switch state
app.get('/api/autotrade/debug', async (req, res) => {
  console.log('🔍 /api/autotrade/debug endpoint called');
  
  try {
    const { getSwitchByName } = await import('./utils/switchManager.js');
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      switchExists: !!autoTradingSwitch,
      switchData: autoTradingSwitch ? {
        name: autoTradingSwitch.name,
        isEnabled: autoTradingSwitch.isEnabled,
        preventAutoDisable: autoTradingSwitch.preventAutoDisable,
        isActive: autoTradingSwitch.isActive(),
        type: autoTradingSwitch.type,
        settings: autoTradingSwitch.settings,
        createdAt: autoTradingSwitch.createdAt,
        updatedAt: autoTradingSwitch.updatedAt
      } : null,
      autoTradeStatus: await getAutoTradingStatus(),
      localState: {
        AUTO_TRADE_ENABLED: false // This will be updated by the function
      }
    };
    
    console.log('📊 Debug info:', debugInfo);
    res.json(debugInfo);
  } catch (error) {
    console.error('💥 Error in debug endpoint:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🤖 Auto-trading enabled with candle-based strategy`);
});

// Start auto-trading every 60 seconds
console.log('🤖 Starting auto-trading bot...');
setInterval(async () => {
  try {
    await runAutoTrade();
  } catch (error) {
    console.error('❌ Auto-trade error:', error);
  }
}, 60 * 1000); // Run every 60 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  websocketManager.stopDataStreams();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export { websocketManager };
