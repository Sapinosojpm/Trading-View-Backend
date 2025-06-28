import Switch from '../models/Switch.js';

// Get all switches
export const getAllSwitches = async (req, res) => {
  try {
    const { type, enabled, tag, limit = 5000, page = 1 } = req.query;
    
    let query = {};
    
    if (type) query.type = type;
    if (enabled !== undefined) query.isEnabled = enabled === 'true';
    if (tag) query.tags = tag;
    
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { priority: -1, createdAt: -1 }
    };
    
    const switches = await Switch.find(query, null, options);
    const total = await Switch.countDocuments(query);
    
    res.json({
      success: true,
      data: switches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching switches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch switches'
    });
  }
};

// Get switch by ID
export const getSwitchById = async (req, res) => {
  try {
    const switchItem = await Switch.findById(req.params.id);
    
    if (!switchItem) {
      return res.status(404).json({
        success: false,
        error: 'Switch not found'
      });
    }
    
    res.json({
      success: true,
      data: switchItem
    });
  } catch (error) {
    console.error('Error fetching switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch switch'
    });
  }
};

// Create new switch
export const createSwitch = async (req, res) => {
  try {
    const switchData = {
      ...req.body,
      preventAutoDisable: true, // Always prevent auto-disable for new switches
      createdBy: req.body.createdBy || 'system'
    };
    
    const newSwitch = new Switch(switchData);
    await newSwitch.save();
    
    res.status(201).json({
      success: true,
      data: newSwitch,
      message: 'Switch created successfully (auto-disable prevented)'
    });
  } catch (error) {
    console.error('Error creating switch:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Switch with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create switch'
    });
  }
};

// Update switch
export const updateSwitch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      preventAutoDisable: true // Ensure auto-disable prevention is maintained
    };
    
    const switchItem = await Switch.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!switchItem) {
      return res.status(404).json({
        success: false,
        error: 'Switch not found'
      });
    }
    
    res.json({
      success: true,
      data: switchItem,
      message: 'Switch updated successfully (auto-disable prevented)'
    });
  } catch (error) {
    console.error('Error updating switch:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Switch with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update switch'
    });
  }
};

// Delete switch
export const deleteSwitch = async (req, res) => {
  try {
    const switchItem = await Switch.findByIdAndDelete(req.params.id);
    
    if (!switchItem) {
      return res.status(404).json({
        success: false,
        error: 'Switch not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Switch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete switch'
    });
  }
};

// Toggle switch (manual control only)
export const toggleSwitch = async (req, res) => {
  try {
    const switchItem = await Switch.findById(req.params.id);
    
    if (!switchItem) {
      return res.status(404).json({
        success: false,
        error: 'Switch not found'
      });
    }
    
    if (switchItem.isEnabled) {
      await switchItem.disable();
    } else {
      await switchItem.enable();
    }
    
    res.json({
      success: true,
      data: switchItem,
      message: `Switch ${switchItem.isEnabled ? 'enabled' : 'disabled'} (manual control only)`
    });
  } catch (error) {
    console.error('Error toggling switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle switch'
    });
  }
};

// Force enable switch (ensures it stays enabled)
export const forceEnableSwitch = async (req, res) => {
  try {
    const switchItem = await Switch.findById(req.params.id);
    
    if (!switchItem) {
      return res.status(404).json({
        success: false,
        error: 'Switch not found'
      });
    }
    
    switchItem.isEnabled = true;
    switchItem.preventAutoDisable = true;
    await switchItem.save();
    
    res.json({
      success: true,
      data: switchItem,
      message: 'Switch force enabled (will not auto-disable)'
    });
  } catch (error) {
    console.error('Error force enabling switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force enable switch'
    });
  }
};

// Trigger switch
export const triggerSwitch = async (req, res) => {
  try {
    const switchItem = await Switch.findById(req.params.id);
    
    if (!switchItem) {
      return res.status(404).json({
        success: false,
        error: 'Switch not found'
      });
    }
    
    if (!switchItem.isEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Switch is disabled'
      });
    }
    
    await switchItem.trigger();
    
    res.json({
      success: true,
      data: switchItem,
      message: 'Switch triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger switch'
    });
  }
};

// Get active switches
export const getActiveSwitches = async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = { isEnabled: true };
    if (type) query.type = type;
    
    const switches = await Switch.find(query).sort({ priority: -1 });
    
    // Filter switches that are actually active (respects preventAutoDisable)
    const activeSwitches = switches.filter(switchItem => switchItem.isActive());
    
    res.json({
      success: true,
      data: activeSwitches,
      count: activeSwitches.length
    });
  } catch (error) {
    console.error('Error fetching active switches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active switches'
    });
  }
};

// Get protected switches (those that won't auto-disable)
export const getProtectedSwitches = async (req, res) => {
  try {
    const switches = await Switch.find({ preventAutoDisable: true }).sort({ priority: -1 });
    
    res.json({
      success: true,
      data: switches,
      count: switches.length,
      message: 'Switches protected from auto-disable'
    });
  } catch (error) {
    console.error('Error fetching protected switches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protected switches'
    });
  }
};

// Bulk operations
export const bulkUpdateSwitches = async (req, res) => {
  try {
    const { switches } = req.body;
    
    if (!Array.isArray(switches)) {
      return res.status(400).json({
        success: false,
        error: 'Switches must be an array'
      });
    }
    
    const results = [];
    
    for (const switchData of switches) {
      try {
        const { id, ...updateData } = switchData;
        const switchItem = await Switch.findByIdAndUpdate(
          id,
          { ...updateData, preventAutoDisable: true },
          { new: true, runValidators: true }
        );
        
        if (switchItem) {
          results.push({ id, success: true, data: switchItem });
        } else {
          results.push({ id, success: false, error: 'Switch not found' });
        }
      } catch (error) {
        results.push({ id: switchData.id, success: false, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      message: 'Bulk update completed (auto-disable prevented for all switches)'
    });
  } catch (error) {
    console.error('Error bulk updating switches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update switches'
    });
  }
}; 