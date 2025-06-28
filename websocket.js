import { WebSocketServer } from 'ws';
import { getMarketPrice, getBalance } from './okxBot.js';
import axios from 'axios';

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.priceInterval = null;
    this.balanceInterval = null;
    this.isRunning = false;
    this.priceHistory = [];
    this.maxPriceHistory = 100;
    this.priceAlerts = [];
    this.alertThreshold = 5; // 5% change
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket client connected');
      this.clients.add(ws);
      
      // Send initial data
      this.sendInitialData(ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
        
        // Stop streams if no clients
        if (this.clients.size === 0) {
          this.stopDataStreams();
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
    
    console.log('🚀 WebSocket server initialized');
  }

  async sendInitialData(ws) {
    try {
      // Send current price
      const price = await getMarketPrice('SOL-USDT');
      ws.send(JSON.stringify({
        type: 'price_update',
        data: { symbol: 'SOL-USDT', price: price },
        timestamp: new Date().toISOString()
      }));
      
      // Send current balance
      const balance = await getBalance();
      ws.send(JSON.stringify({
        type: 'balance_update',
        data: balance,
        timestamp: new Date().toISOString()
      }));
      
      // Send price movement analysis
      const movementAnalysis = await this.getPriceMovementAnalysis();
      if (movementAnalysis) {
        ws.send(JSON.stringify({
          type: 'movement_analysis',
          data: movementAnalysis,
          timestamp: new Date().toISOString()
        }));
      }
      
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'subscribe_price':
        console.log('📊 Client subscribed to price updates');
        this.startPriceStream();
        break;
        
      case 'subscribe_balance':
        console.log('💰 Client subscribed to balance updates');
        this.startBalanceStream();
        break;
        
      case 'subscribe_movement':
        console.log('📈 Client subscribed to movement analysis');
        this.startMovementStream();
        break;
        
      case 'set_alert_threshold':
        this.alertThreshold = data.threshold || 5;
        console.log(`🔔 Alert threshold set to ${this.alertThreshold}%`);
        break;
        
      case 'unsubscribe_price':
        console.log('📊 Client unsubscribed from price updates');
        break;
        
      case 'unsubscribe_balance':
        console.log('💰 Client unsubscribed from balance updates');
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  startPriceStream() {
    if (this.priceInterval) return;
    
    this.priceInterval = setInterval(async () => {
      try {
        const price = await getMarketPrice('SOL-USDT');
        const timestamp = new Date().toISOString();
        
        // Add to price history
        this.priceHistory.push({ price, timestamp });
        if (this.priceHistory.length > this.maxPriceHistory) {
          this.priceHistory.shift();
        }
        
        // Check for significant price movements
        this.checkPriceAlerts(price, timestamp);
        
        this.broadcast({
          type: 'price_update',
          data: { 
            symbol: 'SOL-USDT', 
            price: price,
            timestamp: timestamp
          }
        });
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    }, 2000); // Update every 2 seconds
    
    console.log('📊 Price stream started');
  }

  startBalanceStream() {
    if (this.balanceInterval) return;
    
    this.balanceInterval = setInterval(async () => {
      try {
        const balance = await getBalance();
        this.broadcast({
          type: 'balance_update',
          data: balance,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }, 10000); // Update every 10 seconds
    
    console.log('💰 Balance stream started');
  }

  startMovementStream() {
    // Movement analysis is sent with price updates
    console.log('📈 Movement analysis stream started');
  }

  async getPriceMovementAnalysis() {
    try {
      const response = await axios.get('http://localhost:4000/api/okx/price-movement?timeframe=1m&limit=50');
      return response.data;
    } catch (error) {
      console.error('Error fetching movement analysis:', error);
      return null;
    }
  }

  checkPriceAlerts(currentPrice, timestamp) {
    if (this.priceHistory.length < 2) return;
    
    const previousPrice = this.priceHistory[this.priceHistory.length - 2].price;
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    if (Math.abs(priceChange) >= this.alertThreshold) {
      const alert = {
        id: Date.now(),
        type: priceChange > 0 ? 'bullish' : 'bearish',
        percentage: priceChange,
        price: currentPrice,
        timestamp: timestamp,
        message: `${priceChange > 0 ? '📈' : '📉'} ${Math.abs(priceChange).toFixed(2)}% ${priceChange > 0 ? 'increase' : 'decrease'} detected`
      };
      
      this.priceAlerts.push(alert);
      if (this.priceAlerts.length > 10) {
        this.priceAlerts.shift();
      }
      
      // Broadcast alert
      this.broadcast({
        type: 'price_alert',
        data: alert,
        timestamp: timestamp
      });
      
      console.log(`🔔 Price alert: ${alert.message}`);
    }
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }

  broadcastOrderUpdate(orderData) {
    this.broadcast({
      type: 'order_update',
      data: orderData,
      timestamp: new Date().toISOString()
    });
  }

  stopDataStreams() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
      this.priceInterval = null;
      console.log('📊 Price stream stopped');
    }
    
    if (this.balanceInterval) {
      clearInterval(this.balanceInterval);
      this.balanceInterval = null;
      console.log('💰 Balance stream stopped');
    }
  }

  getConnectedClients() {
    return this.clients.size;
  }

  getPriceHistory() {
    return this.priceHistory;
  }

  getPriceAlerts() {
    return this.priceAlerts;
  }
}

export const websocketManager = new WebSocketManager(); 