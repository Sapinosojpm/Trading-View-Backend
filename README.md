# Trading Bot Server

This is the backend server for the SOL trading bot that connects to the OKX exchange.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a `.env` file in the server directory:**
   ```bash
   # OKX API Credentials
   # Get these from your OKX account settings
   OKX_API_KEY=your_okx_api_key_here
   OKX_API_SECRET=your_okx_api_secret_here
   OKX_API_PASSPHRASE=your_okx_api_passphrase_here

   # Server Configuration
   PORT=4000
   ```

3. **Get OKX API Credentials:**
   - Log into your OKX account
   - Go to Account Settings > API Management
   - Create a new API key with trading permissions
   - Copy the API Key, Secret Key, and Passphrase

4. **Start the server:**
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/okx/balance` - Get account balance (requires API credentials)
- `GET /api/okx/price` - Get SOL price (public endpoint)
- `GET /api/okx/market` - Get market data (public endpoint)
- `POST /api/okx/trade` - Execute trade (requires API credentials)
- `GET /api/health` - Health check

## Features

- **Real-time SOL price data** from OKX (no credentials needed)
- **Account balance tracking** (requires API credentials)
- **Real trading execution** (requires API credentials)
- **Auto-refresh every 30 seconds**
- **CORS enabled** for frontend connection

## Notes

- Price and market data endpoints work without API credentials
- Balance and trading endpoints require valid OKX API credentials
- If credentials are missing, balance will show zero and trades will fail gracefully 