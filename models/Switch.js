import mongoose from 'mongoose';

const switchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  type: {
    type: String,
    enum: ['trading', 'notification', 'auto_trade', 'risk_management', 'custom'],
    default: 'custom',
    index: true
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  conditions: {
    type: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'greater_than', 'less_than', 'contains', 'not_equals']
      },
      value: mongoose.Schema.Types.Mixed
    }],
    default: []
  },
  actions: {
    type: [{
      action: String,
      parameters: mongoose.Schema.Types.Mixed
    }],
    default: []
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: String,
    endTime: String,
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  lastTriggered: {
    type: Date,
    default: null
  },
  triggerCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // New field to prevent auto-disable
  preventAutoDisable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance (using inline index definitions)
switchSchema.index({ tags: 1 });
switchSchema.index({ createdAt: -1 });

// Virtual for switch status - modified to respect preventAutoDisable
switchSchema.virtual('status').get(function() {
  if (!this.isEnabled) return 'disabled';
  
  // If preventAutoDisable is true, always return active when enabled
  if (this.preventAutoDisable) {
    return 'active';
  }
  
  // Only check schedule if auto-disable is allowed
  if (this.schedule.enabled) {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (!this.schedule.daysOfWeek.includes(currentDay)) return 'scheduled_off';
    if (this.schedule.startTime && this.schedule.endTime) {
      if (currentTime < this.schedule.startTime || currentTime > this.schedule.endTime) {
        return 'scheduled_off';
      }
    }
  }
  return 'active';
});

// Method to check if switch should be active - modified to prevent auto-disable
switchSchema.methods.isActive = function() {
  if (!this.isEnabled) return false;
  
  // If preventAutoDisable is true, always return true when enabled
  if (this.preventAutoDisable) {
    return true;
  }
  
  // Only check schedule if auto-disable is allowed
  if (this.schedule.enabled) {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (!this.schedule.daysOfWeek.includes(currentDay)) return false;
    if (this.schedule.startTime && this.schedule.endTime) {
      if (currentTime < this.schedule.startTime || currentTime > this.schedule.endTime) {
        return false;
      }
    }
  }
  return true;
};

// Method to trigger the switch
switchSchema.methods.trigger = function() {
  this.lastTriggered = new Date();
  this.triggerCount += 1;
  return this.save();
};

// Method to enable switch (prevents auto-disable)
switchSchema.methods.enable = function() {
  this.isEnabled = true;
  this.preventAutoDisable = true;
  return this.save();
};

// Method to disable switch (manual disable only)
switchSchema.methods.disable = function() {
  this.isEnabled = false;
  return this.save();
};

// Static method to find active switches
switchSchema.statics.findActive = function() {
  return this.find({ isEnabled: true });
};

// Static method to find switches by type
switchSchema.statics.findByType = function(type) {
  return this.find({ type, isEnabled: true });
};

// Pre-save middleware to validate conditions
switchSchema.pre('save', function(next) {
  if (this.schedule.enabled) {
    if (!this.schedule.daysOfWeek || this.schedule.daysOfWeek.length === 0) {
      return next(new Error('Schedule days must be specified when schedule is enabled'));
    }
  }
  next();
});

const Switch = mongoose.model('Switch', switchSchema);

export default Switch; 