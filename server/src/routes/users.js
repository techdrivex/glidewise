const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');
const DatabaseService = require('../services/DatabaseService');

const router = express.Router();

// Get user preferences
router.get('/preferences', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const preferences = await knex('user_preferences')
      .where('userId', userId)
      .first();
    
    if (!preferences) {
      return sendErrorResponse(res, { 
        message: 'User preferences not found' 
      }, 404);
    }
    
    sendSuccessResponse(res, preferences, 'Preferences retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching preferences:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Update user preferences
router.put('/preferences', [
  body('ecoMode').optional().isBoolean().withMessage('Eco mode must be a boolean'),
  body('hapticFeedback').optional().isBoolean().withMessage('Haptic feedback must be a boolean'),
  body('voicePrompts').optional().isBoolean().withMessage('Voice prompts must be a boolean'),
  body('autoStartTrips').optional().isBoolean().withMessage('Auto start trips must be a boolean'),
  body('units').optional().isIn(['metric', 'imperial']).withMessage('Units must be metric or imperial')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const updateData = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if preferences exist
    const existingPreferences = await knex('user_preferences')
      .where('userId', userId)
      .first();
    
    if (existingPreferences) {
      // Update existing preferences
      await knex('user_preferences')
        .where('userId', userId)
        .update({
          ...updateData,
          updatedAt: knex.fn.now()
        });
    } else {
      // Create new preferences
      await knex('user_preferences').insert({
        userId,
        ...updateData
      });
    }
    
    sendSuccessResponse(res, { message: 'Preferences updated successfully' });
    
  } catch (error) {
    console.error('Error updating preferences:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get user vehicles
router.get('/vehicles', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const vehicles = await knex('vehicles')
      .where('userId', userId)
      .orderBy('isDefault', 'desc')
      .orderBy('createdAt', 'desc');
    
    sendSuccessResponse(res, vehicles, 'Vehicles retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Add new vehicle
router.post('/vehicles', [
  body('make').notEmpty().withMessage('Vehicle make is required'),
  body('model').notEmpty().withMessage('Vehicle model is required'),
  body('year').optional().isLength({ min: 4, max: 4 }).withMessage('Year must be 4 digits'),
  body('vin').optional().isLength({ min: 17, max: 17 }).withMessage('VIN must be 17 characters'),
  body('fuelType').optional().isIn(['gasoline', 'diesel', 'hybrid', 'electric', 'other']).withMessage('Invalid fuel type'),
  body('fuelCapacity').optional().isFloat({ min: 0 }).withMessage('Fuel capacity must be positive'),
  body('cityMPG').optional().isFloat({ min: 0 }).withMessage('City MPG must be positive'),
  body('highwayMPG').optional().isFloat({ min: 0 }).withMessage('Highway MPG must be positive')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const vehicleData = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // If this is the first vehicle, make it default
    const existingVehicles = await knex('vehicles')
      .where('userId', userId)
      .count('* as count');
    
    const isFirstVehicle = parseInt(existingVehicles[0].count) === 0;
    
    // If setting as default, unset other defaults
    if (vehicleData.isDefault || isFirstVehicle) {
      await knex('vehicles')
        .where('userId', userId)
        .update({ isDefault: false });
    }
    
    // Create vehicle
    const [vehicleId] = await knex('vehicles').insert({
      userId,
      ...vehicleData,
      isDefault: vehicleData.isDefault || isFirstVehicle
    });
    
    // Fetch created vehicle
    const vehicle = await knex('vehicles')
      .where('id', vehicleId)
      .first();
    
    sendSuccessResponse(res, { vehicle }, 'Vehicle added successfully', 201);
    
  } catch (error) {
    console.error('Error adding vehicle:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Update vehicle
router.put('/vehicles/:id', [
  body('make').optional().notEmpty().withMessage('Vehicle make cannot be empty'),
  body('model').optional().notEmpty().withMessage('Vehicle model cannot be empty'),
  body('year').optional().isLength({ min: 4, max: 4 }).withMessage('Year must be 4 digits'),
  body('vin').optional().isLength({ min: 17, max: 17 }).withMessage('VIN must be 17 characters'),
  body('fuelType').optional().isIn(['gasoline', 'diesel', 'hybrid', 'electric', 'other']).withMessage('Invalid fuel type'),
  body('fuelCapacity').optional().isFloat({ min: 0 }).withMessage('Fuel capacity must be positive'),
  body('cityMPG').optional().isFloat({ min: 0 }).withMessage('City MPG must be positive'),
  body('highwayMPG').optional().isFloat({ min: 0 }).withMessage('Highway MPG must be positive')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const vehicleId = req.params.id;
  const updateData = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if vehicle exists and belongs to user
    const existingVehicle = await knex('vehicles')
      .where({ id: vehicleId, userId })
      .first();
    
    if (!existingVehicle) {
      return sendErrorResponse(res, { 
        message: 'Vehicle not found' 
      }, 404);
    }
    
    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await knex('vehicles')
        .where('userId', userId)
        .update({ isDefault: false });
    }
    
    // Update vehicle
    await knex('vehicles')
      .where('id', vehicleId)
      .update({
        ...updateData,
        updatedAt: knex.fn.now()
      });
    
    sendSuccessResponse(res, { message: 'Vehicle updated successfully' });
    
  } catch (error) {
    console.error('Error updating vehicle:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Delete vehicle
router.delete('/vehicles/:id', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const vehicleId = req.params.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if vehicle exists and belongs to user
    const existingVehicle = await knex('vehicles')
      .where({ id: vehicleId, userId })
      .first();
    
    if (!existingVehicle) {
      return sendErrorResponse(res, { 
        message: 'Vehicle not found' 
      }, 404);
    }
    
    // Check if vehicle is being used in trips
    const tripsUsingVehicle = await knex('trips')
      .where('vehicleId', vehicleId)
      .count('* as count');
    
    if (parseInt(tripsUsingVehicle[0].count) > 0) {
      return sendErrorResponse(res, { 
        message: 'Cannot delete vehicle that has associated trips' 
      }, 400);
    }
    
    // Delete vehicle
    await knex('vehicles')
      .where('id', vehicleId)
      .del();
    
    // If this was the default vehicle, set another as default
    if (existingVehicle.isDefault) {
      const newDefault = await knex('vehicles')
        .where('userId', userId)
        .orderBy('createdAt', 'desc')
        .first();
      
      if (newDefault) {
        await knex('vehicles')
          .where('id', newDefault.id)
          .update({ isDefault: true });
      }
    }
    
    sendSuccessResponse(res, { message: 'Vehicle deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Set default vehicle
router.put('/vehicles/:id/set-default', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const vehicleId = req.params.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if vehicle exists and belongs to user
    const existingVehicle = await knex('vehicles')
      .where({ id: vehicleId, userId })
      .first();
    
    if (!existingVehicle) {
      return sendErrorResponse(res, { 
        message: 'Vehicle not found' 
      }, 404);
    }
    
    // Unset all other defaults
    await knex('vehicles')
      .where('userId', userId)
      .update({ isDefault: false });
    
    // Set this vehicle as default
    await knex('vehicles')
      .where('id', vehicleId)
      .update({ 
        isDefault: true,
        updatedAt: knex.fn.now()
      });
    
    sendSuccessResponse(res, { message: 'Default vehicle updated successfully' });
    
  } catch (error) {
    console.error('Error setting default vehicle:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get user statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { timeRange = '30d' } = req.query;
  
  try {
    const knex = DatabaseService.getKnex();
    
    let dateFilter;
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get trip statistics
    const tripStats = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalTrips'),
        knex.raw('SUM(distance) as totalDistance'),
        knex.raw('SUM(fuelConsumed) as totalFuel'),
        knex.raw('AVG(ecoScore) as avgEcoScore'),
        knex.raw('AVG(efficiency) as avgEfficiency')
      )
      .first();
    
    // Get coaching tips statistics
    const tipStats = await knex('coaching_tips')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalTips'),
        knex.raw('SUM(CASE WHEN isRead THEN 1 ELSE 0 END) as readTips'),
        knex.raw('SUM(CASE WHEN isApplied THEN 1 ELSE 0 END) as appliedTips')
      )
      .first();
    
    // Get OBD data statistics
    const obdStats = await knex('obd_data')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalRecords'),
        knex.raw('AVG(ecoScore) as avgEcoScore'),
        knex.raw('AVG(efficiency) as avgEfficiency')
      )
      .first();
    
    const response = {
      timeRange,
      trips: {
        total: parseInt(tripStats.totalTrips) || 0,
        distance: parseFloat(tripStats.totalDistance) || 0,
        fuel: parseFloat(tripStats.totalFuel) || 0,
        avgEcoScore: Math.round(parseFloat(tripStats.avgEcoScore) || 0),
        avgEfficiency: parseFloat(tripStats.avgEfficiency) || 0
      },
      coaching: {
        total: parseInt(tipStats.totalTips) || 0,
        read: parseInt(tipStats.readTips) || 0,
        applied: parseInt(tipStats.appliedTips) || 0
      },
      obd: {
        totalRecords: parseInt(obdStats.totalRecords) || 0,
        avgEcoScore: Math.round(parseFloat(obdStats.avgEcoScore) || 0),
        avgEfficiency: parseFloat(obdStats.avgEfficiency) || 0
      }
    };
    
    sendSuccessResponse(res, response, 'Statistics retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    sendErrorResponse(res, error, 500);
  }
}));

module.exports = router;
