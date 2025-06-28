const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4000');

ws.on('open', () => {
  console.log('🔌 WebSocket connected!');
  
  // Subscribe to data streams
  ws.send(JSON.stringify({ type: 'subscribe_price' }));
  ws.send(JSON.stringify({ type: 'subscribe_balance' }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log(`📨 Received: ${message.type}`);
    
    switch (message.type) {
      case 'price_update':
        console.log(`💰 SOL Price: $${message.data.price}`);
        break;
        
      case 'balance_update':
        const details = message.data?.data?.[0]?.details || [];
        const sol = details.find(item => item.ccy === 'SOL');
        const usdt = details.find(item => item.ccy === 'USDT');
        console.log(`💼 Balance - SOL: ${sol?.availBal || 0}, USDT: ${usdt?.availBal || 0}`);
        break;
        
      case 'order_update':
        console.log(`📋 Order: ${message.data.side} ${message.data.amount} SOL`);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('🔌 WebSocket disconnected');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the connection alive for 30 seconds
setTimeout(() => {
  console.log('🛑 Closing WebSocket connection...');
  ws.close();
  process.exit(0);
}, 30000); 