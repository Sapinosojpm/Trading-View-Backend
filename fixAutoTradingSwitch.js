import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database.js';
import Switch from './models/Switch.js';

dotenv.config();

const fixAutoTradingSwitch = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('✅ MongoDB connected successfully!');
    
    // Find the existing auto_trading switch
    console.log('🔍 Looking for auto_trading switch...');
    let autoTradingSwitch = await Switch.findOne({ name: 'auto_trading' });
    
    if (autoTradingSwitch) {
      console.log('📊 Found existing auto_trading switch:');
      console.log('- Name:', autoTradingSwitch.name);
      console.log('- isEnabled:', autoTradingSwitch.isEnabled);
      console.log('- preventAutoDisable:', autoTradingSwitch.preventAutoDisable);
      console.log('- Type:', autoTradingSwitch.type);
      
      // Update the switch to ensure it has all required fields and is enabled
      console.log('🔄 Updating auto_trading switch...');
      
      autoTradingSwitch.isEnabled = true;
      autoTradingSwitch.preventAutoDisable = true;
      autoTradingSwitch.type = 'auto_trade';
      autoTradingSwitch.settings = {
        strategy: 'candle-based',
        interval: 900,
        maxTrades: 5
      };
      autoTradingSwitch.priority = 1;
      autoTradingSwitch.tags = ['trading', 'automation'];
      autoTradingSwitch.description = 'Enable/disable automatic trading';
      
      await autoTradingSwitch.save();
      
      console.log('✅ Auto_trading switch updated successfully!');
      
      // Verify the update
      const updatedSwitch = await Switch.findOne({ name: 'auto_trading' });
      console.log('📊 Updated switch details:');
      console.log('- isEnabled:', updatedSwitch.isEnabled);
      console.log('- preventAutoDisable:', updatedSwitch.preventAutoDisable);
      console.log('- isActive():', updatedSwitch.isActive());
      console.log('- Settings:', updatedSwitch.settings);
      
    } else {
      console.log('⚠️ Auto_trading switch not found, creating new one...');
      
      const newSwitch = new Switch({
        name: 'auto_trading',
        description: 'Enable/disable automatic trading',
        type: 'auto_trade',
        isEnabled: true,
        preventAutoDisable: true,
        settings: {
          strategy: 'candle-based',
          interval: 900,
          maxTrades: 5
        },
        priority: 1,
        tags: ['trading', 'automation'],
        createdBy: 'system'
      });
      
      await newSwitch.save();
      console.log('✅ New auto_trading switch created successfully!');
    }
    
    // Test the auto-trading status
    console.log('\n🧪 Testing auto-trading status...');
    const { getAutoTradingStatus } = await import('./autoTrade/tradeBot.js');
    const status = await getAutoTradingStatus();
    console.log('📊 Auto-trading status:', status);
    
    // Test the switch directly
    const testSwitch = await Switch.findOne({ name: 'auto_trading' });
    console.log('📊 Direct switch test:');
    console.log('- isEnabled:', testSwitch.isEnabled);
    console.log('- preventAutoDisable:', testSwitch.preventAutoDisable);
    console.log('- isActive():', testSwitch.isActive());
    console.log('- Status virtual:', testSwitch.status);
    
    console.log('\n✅ Auto-trading switch fix completed successfully!');
    console.log('🎯 The switch should now be enabled and working properly');
    
  } catch (error) {
    console.error('❌ Error fixing auto-trading switch:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB...');
    await disconnectDB();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the fix
fixAutoTradingSwitch(); 