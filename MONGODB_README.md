# MongoDB Integration & Switch Management

This document describes the MongoDB integration and switch management system for the trading bot.

## 🗄️ Database Setup

### MongoDB Connection

The application connects to MongoDB using the connection string:
```
mongodb+srv://admin:<db_password>@b496-zuitt.yhnby.mongodb.net/
```

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://admin:<your_actual_password>@b496-zuitt.yhnby.mongodb.net/trading_bot

# Server Configuration
PORT=4000

# OKX API Configuration
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase
```

**Important**: Replace `<your_actual_password>` with your actual MongoDB password.

## 🔧 Switch Model

The Switch model provides a flexible way to manage various trading bot features and settings.

### Switch Schema

```javascript
{
  name: String,           // Unique switch name
  description: String,    // Switch description
  isEnabled: Boolean,     // Whether switch is enabled
  type: String,          // Switch type (trading, notification, auto_trade, risk_management, custom)
  settings: Object,      // Switch-specific settings
  conditions: Array,     // Conditions for switch activation
  actions: Array,        // Actions to perform when triggered
  schedule: Object,      // Scheduling configuration
  priority: Number,      // Priority level (1-10)
  lastTriggered: Date,   // Last trigger timestamp
  triggerCount: Number,  // Number of times triggered
  createdBy: String,     // Creator identifier
  tags: Array,          // Tags for categorization
  metadata: Object      // Additional metadata
}
```

### Switch Types

1. **trading** - Trading-related switches
2. **notification** - Notification switches
3. **auto_trade** - Auto-trading switches
4. **risk_management** - Risk management switches
5. **custom** - Custom switches

## 🚀 Default Switches

The system automatically creates these default switches:

### 1. Auto Trading Switch
- **Name**: `auto_trading`
- **Type**: `auto_trade`
- **Description**: Enable/disable automatic trading
- **Settings**: Strategy, interval, max trades

### 2. Risk Management Switch
- **Name**: `risk_management`
- **Type**: `risk_management`
- **Description**: Risk management controls
- **Settings**: Max loss, stop loss, take profit

### 3. Notifications Switch
- **Name**: `notifications`
- **Type**: `notification`
- **Description**: Trading notifications
- **Settings**: Email, webhook, console notifications

### 4. Market Hours Switch
- **Name**: `market_hours`
- **Type**: `trading`
- **Description**: Trading during market hours only
- **Schedule**: 9 AM - 5 PM, weekdays

## 📡 API Endpoints

### Switch Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/switches` | Get all switches (with filtering) |
| GET | `/api/switches/active` | Get active switches |
| GET | `/api/switches/:id` | Get switch by ID |
| POST | `/api/switches` | Create new switch |
| PUT | `/api/switches/:id` | Update switch |
| PATCH | `/api/switches/:id` | Partial update switch |
| DELETE | `/api/switches/:id` | Delete switch |
| POST | `/api/switches/:id/toggle` | Toggle switch on/off |
| POST | `/api/switches/:id/trigger` | Trigger switch |
| POST | `/api/switches/bulk` | Bulk update switches |

### Query Parameters

- `type` - Filter by switch type
- `enabled` - Filter by enabled status
- `tag` - Filter by tag
- `limit` - Number of results (default: 50)
- `page` - Page number (default: 1)

## 🛠️ Usage Examples

### Creating a Switch

```javascript
const newSwitch = {
  name: 'custom_trading_rule',
  description: 'Custom trading rule for specific conditions',
  type: 'trading',
  isEnabled: true,
  settings: {
    minVolume: 1000,
    maxSpread: 0.001
  },
  conditions: [
    {
      field: 'price',
      operator: 'greater_than',
      value: 50000
    }
  ],
  priority: 5,
  tags: ['custom', 'trading']
};
```

### Checking Switch Status

```javascript
import { isSwitchActive } from './utils/switchManager.js';

const isAutoTradingActive = await isSwitchActive('auto_trading');
console.log('Auto trading active:', isAutoTradingActive);
```

### Updating Switch Settings

```javascript
import { updateSwitchSettings } from './utils/switchManager.js';

await updateSwitchSettings('auto_trading', {
  interval: 30,
  maxTrades: 10
});
```

## 🧪 Testing

Run the MongoDB test script to verify the setup:

```bash
cd server
node testMongoDB.js
```

This will:
1. Connect to MongoDB
2. Initialize default switches
3. Test switch operations
4. Display all switches and their status

## 📊 Switch Statistics

Get switch statistics using the utility function:

```javascript
import { getSwitchStats } from './utils/switchManager.js';

const stats = await getSwitchStats();
console.log('Switch statistics:', stats);
```

Returns:
```javascript
{
  total: 4,
  enabled: 2,
  active: 1,
  byType: [
    { _id: 'auto_trade', count: 1, enabled: 1 },
    { _id: 'risk_management', count: 1, enabled: 1 },
    // ...
  ]
}
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit your `.env` file to version control
2. **Database Access**: Use strong passwords and restrict database access
3. **API Security**: Implement authentication for switch management endpoints
4. **Validation**: All switch data is validated before saving

## 🚨 Troubleshooting

### Connection Issues

1. Check your MongoDB connection string
2. Verify your database password
3. Ensure network connectivity
4. Check MongoDB Atlas IP whitelist

### Switch Issues

1. Verify switch names are unique
2. Check switch validation rules
3. Review schedule configuration
4. Monitor switch logs

## 📝 Next Steps

1. Set up your `.env` file with the correct MongoDB password
2. Run the test script to verify the setup
3. Start the server to initialize default switches
4. Use the API endpoints to manage switches
5. Integrate switches with your trading logic 