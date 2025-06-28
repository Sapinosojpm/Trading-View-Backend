import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import Switch from './models/Switch.js';

dotenv.config();

const checkSwitchStatus = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('✅ MongoDB connected successfully!');
    
    // Check the auto_trading switch
    console.log('🔍 Checking auto_trading switch status...');
    const autoTradingSwitch = await Switch.findOne({ name: 'auto_trading' });
    
    if (autoTradingSwitch) {
      console.log('📊 Auto_trading switch found:');
      console.log('- Name:', autoTradingSwitch.name);
      console.log('- isEnabled:', autoTradingSwitch.isEnabled);
      console.log('- preventAutoDisable:', autoTradingSwitch.preventAutoDisable);
      console.log('- Type:', autoTradingSwitch.type);
      console.log('- isActive():', autoTradingSwitch.isActive());
      console.log('- Status virtual:', autoTradingSwitch.status);
      console.log('- Settings:', autoTradingSwitch.settings);
      console.log('- Created:', autoTradingSwitch.createdAt);
      console.log('- Updated:', autoTradingSwitch.updatedAt);
      
      // Test the auto-trading status function
      console.log('\n🧪 Testing auto-trading status function...');
      const { getAutoTradingStatus } = await import('./autoTrade/tradeBot.js');
      const status = await getAutoTradingStatus();
      console.log('📊 Auto-trading status from function:', status);
      
    } else {
      console.log('❌ Auto_trading switch not found!');
    }
    
    // Check all switches
    console.log('\n📋 All switches in database:');
    const allSwitches = await Switch.find({});
    allSwitches.forEach(switchItem => {
      console.log(`- ${switchItem.name}: enabled=${switchItem.isEnabled}, active=${switchItem.isActive()}, preventAutoDisable=${switchItem.preventAutoDisable}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking switch status:', error);
  }
};

// Run the check
checkSwitchStatus(); 