import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database.js';
import { initializeDefaultSwitches, getSwitchByName, isSwitchActive, setSwitchState } from './utils/switchManager.js';
import Switch from './models/Switch.js';

dotenv.config();

const testMongoDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('✅ MongoDB connected successfully!');
    
    // Initialize default switches
    console.log('🔄 Initializing default switches...');
    await initializeDefaultSwitches();
    
    // Test switch operations
    console.log('\n🧪 Testing switch operations...');
    
    // Get auto_trading switch
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    console.log('Auto trading switch:', autoTradingSwitch ? autoTradingSwitch.name : 'Not found');
    
    // Check if switch is active
    const isActive = await isSwitchActive('auto_trading');
    console.log('Auto trading switch active:', isActive);
    
    // Enable auto trading switch
    console.log('🔄 Enabling auto trading switch...');
    await setSwitchState('auto_trading', true);
    
    // Check again
    const isActiveAfter = await isSwitchActive('auto_trading');
    console.log('Auto trading switch active after enabling:', isActiveAfter);
    
    // Get all switches
    console.log('\n📋 All switches:');
    const allSwitches = await Switch.find({});
    allSwitches.forEach(switchItem => {
      console.log(`- ${switchItem.name}: ${switchItem.isEnabled ? '✅ Enabled' : '❌ Disabled'} (${switchItem.type})`);
    });
    
    // Get active switches
    console.log('\n🟢 Active switches:');
    const activeSwitches = await Switch.find({ isEnabled: true });
    activeSwitches.forEach(switchItem => {
      console.log(`- ${switchItem.name}: ${switchItem.isActive() ? '🟢 Active' : '🟡 Scheduled Off'} (${switchItem.type})`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB...');
    await disconnectDB();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the test
testMongoDB(); 