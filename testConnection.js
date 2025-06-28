import dotenv from 'dotenv';
import { connectDB, isDBConnected } from './config/database.js';
import Switch from './models/Switch.js';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    await connectDB();
    console.log('✅ Connection successful!');
    
    // Check connection state
    const mongoose = await import('mongoose');
    console.log('📊 Connection state:', mongoose.connection.readyState);
    console.log('📊 Is connected:', isDBConnected());
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    // Check auto_trading switch
    console.log('\n🔍 Checking auto_trading switch...');
    const autoTradingSwitch = await Switch.findOne({ name: 'auto_trading' });
    
    if (autoTradingSwitch) {
      console.log('✅ Auto_trading switch found:');
      console.log('- isEnabled:', autoTradingSwitch.isEnabled);
      console.log('- preventAutoDisable:', autoTradingSwitch.preventAutoDisable);
      console.log('- isActive():', autoTradingSwitch.isActive());
    } else {
      console.log('❌ Auto_trading switch not found');
    }
    
    // Check all switches
    console.log('\n📋 All switches:');
    const allSwitches = await Switch.find({});
    allSwitches.forEach(switchItem => {
      console.log(`- ${switchItem.name}: enabled=${switchItem.isEnabled}, active=${switchItem.isActive()}`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testConnection(); 