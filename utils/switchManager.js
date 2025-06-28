import Switch from '../models/Switch.js';
import { isDBConnected } from '../config/database.js';

// Default switches for trading bot - updated to prevent auto-disable
const DEFAULT_SWITCHES = [
  {
    name: 'auto_trading',
    description: 'Enable/disable automatic trading',
    type: 'auto_trade',
    isEnabled: true, // Changed to true by default
    preventAutoDisable: true,
    settings: {
      strategy: 'candle-based',
      interval: 60,
      maxTrades: 5
    },
    priority: 1,
    tags: ['trading', 'automation']
  },
  {
    name: 'risk_management',
    description: 'Risk management controls',
    type: 'risk_management',
    isEnabled: true,
    preventAutoDisable: true,
    settings: {
      maxLoss: 0.02,
      stopLoss: true,
      takeProfit: true
    },
    priority: 2,
    tags: ['risk', 'safety']
  },
  {
    name: 'notifications',
    description: 'Trading notifications',
    type: 'notification',
    isEnabled: true,
    preventAutoDisable: true,
    settings: {
      email: false,
      webhook: false,
      console: true
    },
    priority: 3,
    tags: ['notifications', 'alerts']
  },
  {
    name: 'market_hours',
    description: 'Trading during market hours only (manual control)',
    type: 'trading',
    isEnabled: false,
    preventAutoDisable: true, // Changed to true to prevent auto-disable
    schedule: {
      enabled: false, // Disabled schedule to prevent auto-disable
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    priority: 4,
    tags: ['schedule', 'market_hours']
  }
];

// Initialize default switches
export const initializeDefaultSwitches = async () => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, skipping switch initialization');
      return;
    }

    for (const switchData of DEFAULT_SWITCHES) {
      const existingSwitch = await Switch.findOne({ name: switchData.name });
      
      if (!existingSwitch) {
        const newSwitch = new Switch(switchData);
        await newSwitch.save();
        console.log(`✅ Created default switch: ${switchData.name}`);
      } else {
        // Update existing switches to ensure they have all required fields
        console.log(`🔄 Updating existing switch: ${switchData.name}`);
        
        // Update all fields to match the default configuration
        existingSwitch.description = switchData.description;
        existingSwitch.type = switchData.type;
        existingSwitch.preventAutoDisable = switchData.preventAutoDisable;
        existingSwitch.settings = { ...existingSwitch.settings, ...switchData.settings };
        existingSwitch.priority = switchData.priority;
        existingSwitch.tags = switchData.tags;
        
        // For auto_trading switch, ensure it's enabled by default
        if (switchData.name === 'auto_trading') {
          existingSwitch.isEnabled = true;
          console.log(`✅ Auto-trading switch enabled by default`);
        }
        
        await existingSwitch.save();
        console.log(`✅ Updated switch to prevent auto-disable: ${switchData.name}`);
      }
    }
    
    console.log('✅ Default switches initialized with auto-disable prevention');
  } catch (error) {
    console.error('❌ Error initializing default switches:', error);
  }
};

// Get switch by name
export const getSwitchByName = async (name) => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot get switch');
      return null;
    }

    return await Switch.findOne({ name });
  } catch (error) {
    console.error(`Error getting switch ${name}:`, error);
    return null;
  }
};

// Check if switch is active (respects preventAutoDisable)
export const isSwitchActive = async (name) => {
  try {
    const switchItem = await getSwitchByName(name);
    return switchItem ? switchItem.isActive() : false;
  } catch (error) {
    console.error(`Error checking switch ${name}:`, error);
    return false;
  }
};

// Enable switch (prevents auto-disable)
export const setSwitchState = async (name, enabled) => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot set switch state');
      return false;
    }

    const switchItem = await getSwitchByName(name);
    if (switchItem) {
      if (enabled) {
        await switchItem.enable(); // Uses the new enable method
      } else {
        await switchItem.disable(); // Uses the new disable method
      }
      console.log(`✅ Switch ${name} ${enabled ? 'enabled' : 'disabled'} (manual control)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error setting switch ${name}:`, error);
    return false;
  }
};

// Force enable switch (ensures it stays enabled)
export const forceEnableSwitch = async (name) => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot force enable switch');
      return false;
    }

    const switchItem = await getSwitchByName(name);
    if (switchItem) {
      switchItem.isEnabled = true;
      switchItem.preventAutoDisable = true;
      await switchItem.save();
      console.log(`✅ Switch ${name} force enabled (will not auto-disable)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error force enabling switch ${name}:`, error);
    return false;
  }
};

// Update switch settings
export const updateSwitchSettings = async (name, settings) => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot update switch settings');
      return false;
    }

    const switchItem = await getSwitchByName(name);
    if (switchItem) {
      switchItem.settings = { ...switchItem.settings, ...settings };
      // Ensure preventAutoDisable stays true
      switchItem.preventAutoDisable = true;
      await switchItem.save();
      console.log(`✅ Updated settings for switch ${name} (auto-disable prevented)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating switch ${name}:`, error);
    return false;
  }
};

// Get all active switches (respects preventAutoDisable)
export const getActiveSwitches = async () => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot get active switches');
      return [];
    }

    const switches = await Switch.find({ isEnabled: true });
    return switches.filter(switchItem => switchItem.isActive());
  } catch (error) {
    console.error('Error getting active switches:', error);
    return [];
  }
};

// Create custom switch (prevents auto-disable by default)
export const createCustomSwitch = async (switchData) => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot create custom switch');
      throw new Error('Database not connected');
    }

    const newSwitch = new Switch({
      ...switchData,
      preventAutoDisable: true, // Always prevent auto-disable for custom switches
      createdBy: 'system'
    });
    await newSwitch.save();
    console.log(`✅ Created custom switch: ${switchData.name} (auto-disable prevented)`);
    return newSwitch;
  } catch (error) {
    console.error('Error creating custom switch:', error);
    throw error;
  }
};

// Delete switch
export const deleteSwitchByName = async (name) => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot delete switch');
      return false;
    }

    const result = await Switch.findOneAndDelete({ name });
    if (result) {
      console.log(`✅ Deleted switch: ${name}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting switch ${name}:`, error);
    return false;
  }
};

// Get switch statistics
export const getSwitchStats = async () => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot get switch stats');
      return null;
    }

    const total = await Switch.countDocuments();
    const enabled = await Switch.countDocuments({ isEnabled: true });
    const active = (await getActiveSwitches()).length;
    const autoDisablePrevented = await Switch.countDocuments({ preventAutoDisable: true });
    
    const typeStats = await Switch.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          enabled: {
            $sum: { $cond: ['$isEnabled', 1, 0] }
          },
          autoDisablePrevented: {
            $sum: { $cond: ['$preventAutoDisable', 1, 0] }
          }
        }
      }
    ]);
    
    return {
      total,
      enabled,
      active,
      autoDisablePrevented,
      byType: typeStats
    };
  } catch (error) {
    console.error('Error getting switch stats:', error);
    return null;
  }
};

// Get switches that are protected from auto-disable
export const getProtectedSwitches = async () => {
  try {
    // Ensure database is connected
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected, cannot get protected switches');
      return [];
    }

    return await Switch.find({ preventAutoDisable: true });
  } catch (error) {
    console.error('Error getting protected switches:', error);
    return [];
  }
}; 