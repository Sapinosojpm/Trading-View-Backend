import express from 'express';
import { 
  getBalanceController, 
  getPriceController, 
  getMarketDataController, 
  executeTradeController,
  getPriceMovementAnalysis,
  getPriceAlerts
} from '../controllers/okxController.js';

const router = express.Router();

// OKX Balance
router.get('/balance', getBalanceController);

// OKX Price for SOL
router.get('/price', getPriceController);

// OKX Market Data
router.get('/market-data', getMarketDataController);

// OKX Execute Trade
router.post('/trade', executeTradeController);

// Price Movement Analysis
router.get('/price-movement', getPriceMovementAnalysis);

// Price Alerts Configuration
router.get('/price-alerts', getPriceAlerts);

export default router;
