import express from 'express';
import {
  getAllSwitches,
  getSwitchById,
  createSwitch,
  updateSwitch,
  deleteSwitch,
  toggleSwitch,
  triggerSwitch,
  getActiveSwitches,
  getProtectedSwitches,
  forceEnableSwitch,
  bulkUpdateSwitches
} from '../controllers/switchController.js';

const router = express.Router();

// GET /api/switches - Get all switches with filtering and pagination
router.get('/', getAllSwitches);

// GET /api/switches/active - Get active switches
router.get('/active', getActiveSwitches);

// GET /api/switches/protected - Get switches protected from auto-disable
router.get('/protected', getProtectedSwitches);

// GET /api/switches/:id - Get switch by ID
router.get('/:id', getSwitchById);

// POST /api/switches - Create new switch
router.post('/', createSwitch);

// PUT /api/switches/:id - Update switch
router.put('/:id', updateSwitch);

// PATCH /api/switches/:id - Partial update switch
router.patch('/:id', updateSwitch);

// DELETE /api/switches/:id - Delete switch
router.delete('/:id', deleteSwitch);

// POST /api/switches/:id/toggle - Toggle switch on/off (manual control)
router.post('/:id/toggle', toggleSwitch);

// POST /api/switches/:id/force-enable - Force enable switch (prevents auto-disable)
router.post('/:id/force-enable', forceEnableSwitch);

// POST /api/switches/:id/trigger - Trigger switch
router.post('/:id/trigger', triggerSwitch);

// POST /api/switches/bulk - Bulk update switches
router.post('/bulk', bulkUpdateSwitches);

export default router; 