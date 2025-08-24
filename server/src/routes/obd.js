const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');
const DatabaseService = require('../services/DatabaseService');

const router = express.Router();

// Validation rules
const obdDataValidation = [
  body('engineRPM').optional().isFloat({ min: 0 }).withMessage('Engine RPM must be positive'),
  body('vehicleSpeed').optional().isFloat({ min: 0 }).withMessage('Vehicle speed must be positive'),
  body('engineLoad').optional().isFloat({ min: 0, max: 100 }).withMessage('Engine load must be between 0 and 100'),
  body('throttlePosition').optional().isFloat({ min: 0, max: 100 }).withMessage('Throttle position must be between 0 and 100'),
  body('fuelLevel').optional().isFloat({ min: 0, max: 100 }).withMessage('Fuel level must be between 0 and 100'),
  body('engineTemp').optional().isFloat({ min: -40, max: 150 }).withMessage('Engine temperature must be between -40 and 150'),
  body('batteryVoltage').optional().isFloat({ min: 0, max: 20 }).withMessage('Battery voltage must be between 0 and 20'),
  body('fuelConsumption').optional().isFloat({ min: 0 }).withMessage('Fuel consumption must be positive'),
  body('tripId').optional().isInt({ min: 1 }).withMessage('Trip ID must be a positive integer'),
  body('rawData').optional().isObject().withMessage('Raw data must be an object')
];

// Store OBD data
router.post('/data', obdDataValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const obdData = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Insert OBD data
    const [obdId] = await knex('obd_data').insert({
      userId,
      tripId: obdData.tripId || null,
      engineRPM: obdData.engineRPM || null,
      vehicleSpeed: obdData.vehicleSpeed || null,
      engineLoad: obdData.engineLoad || null,
      throttlePosition: obdData.throttlePosition || null,
      fuelLevel: obdData.fuelLevel || null,
      engineTemp: obdData.engineTemp || null,
      batteryVoltage: obdData.batteryVoltage || null,
      fuelConsumption: obdData.fuelConsumption || null,
      rawData: obdData.rawData ? JSON.stringify(obdData.rawData) : null,
      timestamp: new Date()
    });
    
    sendSuccessResponse(res, { 
      obdId,
      message: 'OBD data stored successfully' 
    }, 'OBD data stored successfully', 201);
    
  } catch (error) {
    console.error('Error storing OBD data:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get OBD data for a user
router.get('/data', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 100, 
    tripId, 
    startDate, 
    endDate,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = req.query;
  
  const offset = (page - 1) * limit;
  
  try {
    const knex = DatabaseService.getKnex();
    
    let query = knex('obd_data').where('userId', userId);
    
    // Filter by trip ID if provided
    if (tripId) {
      query = query.where('tripId', tripId);
    }
    
    // Filter by date range if provided
    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }
    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }
    
    // Get total count
    const [{ count }] = await query.clone().count('* as count');
    
    // Get data with pagination and sorting
    const obdData = await query
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .select('*');
    
    // Parse raw data JSON
    const parsedData = obdData.map(record => ({
      ...record,
      rawData: record.rawData ? JSON.parse(record.rawData) : null
    }));
    
    const totalPages = Math.ceil(count / limit);
    
    sendSuccessResponse(res, {
      data: parsedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'OBD data retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching OBD data:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get OBD data for a specific trip
router.get('/data/trip/:tripId', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const tripId = req.params.tripId;
  const { sortBy = 'timestamp', sortOrder = 'asc' } = req.query;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Verify trip belongs to user
    const trip = await knex('trips')
      .where({ id: tripId, userId })
      .first();
    
    if (!trip) {
      return sendErrorResponse(res, { 
        message: 'Trip not found' 
      }, 404);
    }
    
    // Get OBD data for the trip
    const obdData = await knex('obd_data')
      .where({ tripId, userId })
      .orderBy(sortBy, sortOrder)
      .select('*');
    
    // Parse raw data JSON
    const parsedData = obdData.map(record => ({
      ...record,
      rawData: record.rawData ? JSON.parse(record.rawData) : null
    }));
    
    sendSuccessResponse(res, parsedData, 'Trip OBD data retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching trip OBD data:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get OBD data statistics
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
    
    const stats = await knex('obd_data')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalRecords'),
        knex.raw('AVG(engineRPM) as avgEngineRPM'),
        knex.raw('MAX(engineRPM) as maxEngineRPM'),
        knex.raw('AVG(vehicleSpeed) as avgVehicleSpeed'),
        knex.raw('MAX(vehicleSpeed) as maxVehicleSpeed'),
        knex.raw('AVG(engineLoad) as avgEngineLoad'),
        knex.raw('MAX(engineLoad) as maxEngineLoad'),
        knex.raw('AVG(throttlePosition) as avgThrottlePosition'),
        knex.raw('MAX(throttlePosition) as maxThrottlePosition'),
        knex.raw('AVG(fuelLevel) as avgFuelLevel'),
        knex.raw('MIN(fuelLevel) as minFuelLevel'),
        knex.raw('AVG(engineTemp) as avgEngineTemp'),
        knex.raw('MAX(engineTemp) as maxEngineTemp'),
        knex.raw('AVG(batteryVoltage) as avgBatteryVoltage'),
        knex.raw('MIN(batteryVoltage) as minBatteryVoltage'),
        knex.raw('AVG(fuelConsumption) as avgFuelConsumption'),
        knex.raw('MIN(fuelConsumption) as minFuelConsumption')
      )
      .first();
    
    const response = {
      timeRange,
      summary: {
        totalRecords: parseInt(stats.totalRecords) || 0,
        engineRPM: {
          average: parseFloat(stats.avgEngineRPM) || 0,
          maximum: parseFloat(stats.maxEngineRPM) || 0
        },
        vehicleSpeed: {
          average: parseFloat(stats.avgVehicleSpeed) || 0,
          maximum: parseFloat(stats.maxVehicleSpeed) || 0
        },
        engineLoad: {
          average: parseFloat(stats.avgEngineLoad) || 0,
          maximum: parseFloat(stats.maxEngineLoad) || 0
        },
        throttlePosition: {
          average: parseFloat(stats.avgThrottlePosition) || 0,
          maximum: parseFloat(stats.maxThrottlePosition) || 0
        },
        fuelLevel: {
          average: parseFloat(stats.avgFuelLevel) || 0,
          minimum: parseFloat(stats.minFuelLevel) || 0
        },
        engineTemp: {
          average: parseFloat(stats.avgEngineTemp) || 0,
          maximum: parseFloat(stats.maxEngineTemp) || 0
        },
        batteryVoltage: {
          average: parseFloat(stats.avgBatteryVoltage) || 0,
          minimum: parseFloat(stats.minBatteryVoltage) || 0
        },
        fuelConsumption: {
          average: parseFloat(stats.avgFuelConsumption) || 0,
          minimum: parseFloat(stats.minFuelConsumption) || 0
        }
      }
    };
    
    sendSuccessResponse(res, response, 'OBD statistics retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching OBD statistics:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get real-time OBD data (latest record)
router.get('/data/latest', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const latestData = await knex('obd_data')
      .where('userId', userId)
      .orderBy('timestamp', 'desc')
      .first();
    
    if (!latestData) {
      return sendErrorResponse(res, { 
        message: 'No OBD data found' 
      }, 404);
    }
    
    // Parse raw data JSON
    const parsedData = {
      ...latestData,
      rawData: latestData.rawData ? JSON.parse(latestData.rawData) : null
    };
    
    sendSuccessResponse(res, parsedData, 'Latest OBD data retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching latest OBD data:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get OBD data trends over time
router.get('/trends', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { metric = 'engineRPM', timeRange = '24h', interval = '1h' } = req.query;
  
  try {
    const knex = DatabaseService.getKnex();
    
    let dateFilter;
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        dateFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        dateFilter = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Get data points for the specified metric
    const trends = await knex('obd_data')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .whereNotNull(metric)
      .orderBy('timestamp', 'asc')
      .select('timestamp', metric);
    
    // Group data by intervals if needed
    const groupedData = groupDataByInterval(trends, interval, metric);
    
    sendSuccessResponse(res, {
      metric,
      timeRange,
      interval,
      data: groupedData
    }, 'OBD trends retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching OBD trends:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Helper function to group data by time intervals
function groupDataByInterval(data, interval, metric) {
  if (interval === 'raw') {
    return data.map(point => ({
      timestamp: point.timestamp,
      value: point[metric]
    }));
  }
  
  // Group by hour, day, etc.
  const grouped = {};
  data.forEach(point => {
    const date = new Date(point.timestamp);
    let key;
    
    switch (interval) {
      case '1h':
        key = date.toISOString().slice(0, 13) + ':00:00.000Z';
        break;
      case '6h':
        const hour = Math.floor(date.getHours() / 6) * 6;
        key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).toISOString();
        break;
      case '1d':
        key = date.toISOString().slice(0, 10) + 'T00:00:00.000Z';
        break;
      default:
        key = date.toISOString().slice(0, 13) + ':00:00.000Z';
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(point[metric]);
  });
  
  // Calculate averages for each interval
  return Object.entries(grouped).map(([timestamp, values]) => ({
    timestamp,
    value: values.reduce((sum, val) => sum + val, 0) / values.length,
    count: values.length
  }));
}

// Delete OBD data (for cleanup purposes)
router.delete('/data', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { olderThan } = req.query;
  
  if (!olderThan) {
    return sendErrorResponse(res, { 
      message: 'olderThan parameter is required' 
    }, 400);
  }
  
  try {
    const knex = DatabaseService.getKnex();
    
    let dateFilter;
    const now = new Date();
    
    // Parse olderThan parameter (e.g., "30d", "6m", "1y")
    const match = olderThan.match(/^(\d+)([dmy])$/);
    if (!match) {
      return sendErrorResponse(res, { 
        message: 'Invalid olderThan format. Use format like "30d", "6m", "1y"' 
      }, 400);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'd':
        dateFilter = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
        break;
      case 'm':
        dateFilter = new Date(now.getFullYear(), now.getMonth() - value, now.getDate());
        break;
      case 'y':
        dateFilter = new Date(now.getFullYear() - value, now.getMonth(), now.getDate());
        break;
      default:
        return sendErrorResponse(res, { 
          message: 'Invalid time unit. Use d (days), m (months), or y (years)' 
        }, 400);
    }
    
    // Delete old OBD data
    const deletedCount = await knex('obd_data')
      .where('userId', userId)
      .where('timestamp', '<', dateFilter)
      .del();
    
    sendSuccessResponse(res, { 
      deletedCount,
      message: `Deleted ${deletedCount} OBD data records older than ${olderThan}` 
    });
    
  } catch (error) {
    console.error('Error deleting OBD data:', error);
    sendErrorResponse(res, error, 500);
  }
}));

module.exports = router;
