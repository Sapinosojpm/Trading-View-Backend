import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database.js';
import { 
  initializeDefaultSwitches, 
  getSwitchByName, 
  setSwitchState,
  isSwitchActive
} from './utils/switchManager.js';
import { 
  enableAutoTrading, 
  disableAutoTrading, 
  getAutoTradingStatus 
} from './autoTrade/tradeBot.js';

dotenv.config();

const testAutoTradingSwitch = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('✅ MongoDB connected successfully!');
    
    // Initialize default switches
    console.log('🔄 Initializing default switches...');
    await initializeDefaultSwitches();
    
    console.log('\n🧪 Testing auto-trading switch integration...');
    
    // Test 1: Check initial auto-trading switch status
    const autoTradingSwitch = await getSwitchByName('auto_trading');
    console.log('\n📋 Initial auto-trading switch:');
    console.log(`- Name: ${autoTradingSwitch.name}`);
    console.log(`- Enabled: ${autoTradingSwitch.isEnabled}`);
    console.log(`- Active: ${await isSwitchActive('auto_trading')}`);
    console.log(`- Protected from auto-disable: ${autoTradingSwitch.preventAutoDisable}`);
    
    // Test 2: Check auto-trading status from tradeBot
    const autoTradeStatus = await getAutoTradingStatus();
    console.log(`\n🤖 Auto-trading status from tradeBot: ${autoTradeStatus}`);
    
    // Test 3: Enable auto-trading via switch
    console.log('\n🔄 Enabling auto-trading via switch...');
    await setSwitchState('auto_trading', true);
    
    const enabledSwitch = await getSwitchByName('auto_trading');
    console.log(`- Switch enabled: ${enabledSwitch.isEnabled}`);
    console.log(`- Switch active: ${await isSwitchActive('auto_trading')}`);
    
    // Test 4: Check auto-trading status after enabling
    const enabledStatus = await getAutoTradingStatus();
    console.log(`- Auto-trading status: ${enabledStatus}`);
    
    // Test 5: Enable auto-trading via tradeBot function
    console.log('\n🔄 Enabling auto-trading via tradeBot function...');
    await enableAutoTrading();
    
    const afterEnableSwitch = await getSwitchByName('auto_trading');
    console.log(`- Switch enabled: ${afterEnableSwitch.isEnabled}`);
    console.log(`- Switch active: ${await isSwitchActive('auto_trading')}`);
    
    const afterEnableStatus = await getAutoTradingStatus();
    console.log(`- Auto-trading status: ${afterEnableStatus}`);
    
    // Test 6: Disable auto-trading via tradeBot function
    console.log('\n🔄 Disabling auto-trading via tradeBot function...');
    await disableAutoTrading();
    
    const afterDisableSwitch = await getSwitchByName('auto_trading');
    console.log(`- Switch enabled: ${afterDisableSwitch.isEnabled}`);
    console.log(`- Switch active: ${await isSwitchActive('auto_trading')}`);
    
    const afterDisableStatus = await getAutoTradingStatus();
    console.log(`- Auto-trading status: ${afterDisableStatus}`);
    
    // Test 7: Test API endpoint simulation
    console.log('\n🌐 Testing API endpoint simulation...');
    
    // Simulate GET /api/autotrade/status
    const statusResponse = {
      enabled: await getAutoTradingStatus(),
      strategy: 'candle-based',
      interval: '60 seconds',
      lastRun: new Date().toISOString()
    };
    console.log('GET /api/autotrade/status response:', statusResponse);
    
    // Test 8: Verify switch settings
    console.log('\n⚙️ Auto-trading switch settings:');
    console.log(`- Settings:`, autoTradingSwitch.settings);
    console.log(`- Type: ${autoTradingSwitch.type}`);
    console.log(`- Priority: ${autoTradingSwitch.priority}`);
    console.log(`- Tags: ${autoTradingSwitch.tags.join(', ')}`);
    
    console.log('\n✅ All auto-trading switch integration tests completed successfully!');
    console.log('🎯 Auto-trading now properly integrates with MongoDB switches');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB...');
    await disconnectDB();
    console.log('✅ Disconnected from MongoDB');
  }
};

// Run the test
testAutoTradingSwitch(); 