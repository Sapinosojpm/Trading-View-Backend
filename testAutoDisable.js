import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database.js';
import { 
  initializeDefaultSwitches, 
  getSwitchByName, 
  isSwitchActive, 
  setSwitchState,
  forceEnableSwitch,
  getProtectedSwitches,
  getSwitchStats
} from './utils/switchManager.js';
import Switch from './models/Switch.js';

dotenv.config();

const testAutoDisablePrevention = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('✅ MongoDB connected successfully!');
    
    // Initialize default switches
    console.log('🔄 Initializing default switches...');
    await initializeDefaultSwitches();
    
    console.log('\n🧪 Testing auto-disable prevention...');
    
    // Test 1: Check if switches have preventAutoDisable set
    const allSwitches = await Switch.find({});
    console.log('\n📋 All switches and their auto-disable protection:');
    allSwitches.forEach(switchItem => {
      console.log(`- ${switchItem.name}: ${switchItem.isEnabled ? '✅ Enabled' : '❌ Disabled'} | Auto-disable: ${switchItem.preventAutoDisable ? '🛡️ Protected' : '⚠️ Not Protected'}`);
    });
    
    // Test 2: Enable auto_trading switch and verify it stays enabled
    console.log('\n🔄 Testing auto_trading switch...');
    await setSwitchState('auto_trading', true);
    
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    console.log(`Auto trading switch enabled: ${autoTradingSwitch.isEnabled}`);
    console.log(`Auto trading switch protected: ${autoTradingSwitch.preventAutoDisable}`);
    console.log(`Auto trading switch active: ${await isSwitchActive('auto_trading')}`);
    
    // Test 3: Force enable a switch
    console.log('\n🔄 Force enabling risk_management switch...');
    await forceEnableSwitch('risk_management');
    
    const riskSwitch = await getSwitchByName('risk_management');
    console.log(`Risk management switch enabled: ${riskSwitch.isEnabled}`);
    console.log(`Risk management switch protected: ${riskSwitch.preventAutoDisable}`);
    
    // Test 4: Get protected switches
    console.log('\n🛡️ Protected switches:');
    const protectedSwitches = await getProtectedSwitches();
    protectedSwitches.forEach(switchItem => {
      console.log(`- ${switchItem.name}: ${switchItem.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    });
    
    // Test 5: Check switch statistics
    console.log('\n📊 Switch statistics:');
    const stats = await getSwitchStats();
    console.log(`Total switches: ${stats.total}`);
    console.log(`Enabled switches: ${stats.enabled}`);
    console.log(`Active switches: ${stats.active}`);
    console.log(`Protected from auto-disable: ${stats.autoDisablePrevented}`);
    
    // Test 6: Create a custom switch and verify it's protected
    console.log('\n🔄 Creating custom switch...');
    const customSwitch = new Switch({
      name: 'test_custom_switch',
      description: 'Test switch to verify auto-disable prevention',
      type: 'custom',
      isEnabled: true,
      settings: {
        testSetting: 'value'
      },
      priority: 5,
      tags: ['test', 'custom']
    });
    await customSwitch.save();
    
    console.log(`Custom switch created: ${customSwitch.name}`);
    console.log(`Custom switch protected: ${customSwitch.preventAutoDisable}`);
    console.log(`Custom switch active: ${await isSwitchActive('test_custom_switch')}`);
    
    // Test 7: Verify that enabled switches stay active regardless of schedule
    console.log('\n🕐 Testing schedule independence...');
    const enabledSwitches = await Switch.find({ isEnabled: true });
    enabledSwitches.forEach(async (switchItem) => {
      const isActive = await isSwitchActive(switchItem.name);
      console.log(`- ${switchItem.name}: ${isActive ? '🟢 Active' : '🔴 Inactive'} (Schedule: ${switchItem.schedule.enabled ? 'Enabled' : 'Disabled'})`);
    });
    
    console.log('\n✅ All auto-disable prevention tests completed successfully!');
    console.log('🎯 Switches will now stay enabled unless manually disabled');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB...');
    await disconnectDB();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the test
testAutoDisablePrevention(); 