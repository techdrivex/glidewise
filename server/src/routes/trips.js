const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');
const DatabaseService = require('../services/DatabaseService');

const router = express.Router();

// Validation rules
const tripValidation = [
  body('startTime').isISO8601().withMessage('Start time must be a valid ISO date'),
  body('distance').isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
  body('fuelConsumed').isFloat({ min: 0 }).withMessage('Fuel consumed must be a positive number'),
  body('ecoScore').isInt({ min: 0, max: 100 }).withMessage('Eco score must be between 0 and 100'),
  body('route').isArray().withMessage('Route must be an array'),
  body('route.*.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('route.*.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('route.*.timestamp').isISO8601().withMessage('Route timestamp must be a valid ISO date')
];

const tripUpdateValidation = [
  body('distance').optional().isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
  body('fuelConsumed').optional().isFloat({ min: 0 }).withMessage('Fuel consumed must be a positive number'),
  body('ecoScore').optional().isInt({ min: 0, max: 100 }).withMessage('Eco score must be between 0 and 100'),
  body('route').optional().isArray().withMessage('Route must be an array')
];

// Get all trips for a user
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, sortBy = 'startTime', sortOrder = 'desc' } = req.query;
  
  const offset = (page - 1) * limit;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Get total count
    const [{ count }] = await knex('trips')
      .where('userId', userId)
      .count('* as count');
    
    // Get trips with pagination
    const trips = await knex('trips')
      .where('userId', userId)
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);
    
    // Get route data for each trip
    const tripsWithRoutes = await Promise.all(
      trips.map(async (trip) => {
        const route = await knex('trip_routes')
          .where('tripId', trip.id)
          .orderBy('sequence')
          .select('lat', 'lng', 'timestamp');
        
        const events = await knex('trip_events')
          .where('tripId', trip.id)
          .orderBy('timestamp')
          .select('type', 'severity', 'timestamp', 'lat', 'lng');
        
        return {
          ...trip,
          route,
          events
        };
      })
    );
    
    const totalPages = Math.ceil(count / limit);
    
    sendSuccessResponse(res, {
      trips: tripsWithRoutes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTrips: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Trips retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching trips:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get a specific trip by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const tripId = req.params.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const trip = await knex('trips')
      .where({ id: tripId, userId })
      .first();
    
    if (!trip) {
      return sendErrorResponse(res, { message: 'Trip not found' }, 404);
    }
    
    // Get route data
    const route = await knex('trip_routes')
      .where('tripId', tripId)
      .orderBy('sequence')
      .select('lat', 'lng', 'timestamp');
    
    // Get events
    const events = await knex('trip_events')
      .where('tripId', tripId)
      .orderBy('timestamp')
      .select('type', 'severity', 'timestamp', 'lat', 'lng');
    
    const tripWithDetails = {
      ...trip,
      route,
      events
    };
    
    sendSuccessResponse(res, tripWithDetails, 'Trip retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching trip:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Create a new trip
router.post('/', tripValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const tripData = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Start transaction
    const result = await knex.transaction(async (trx) => {
      // Insert trip
      const [tripId] = await trx('trips').insert({
        userId,
        startTime: tripData.startTime,
        endTime: tripData.endTime,
        distance: tripData.distance,
        fuelConsumed: tripData.fuelConsumed,
        efficiency: tripData.efficiency || 0,
        ecoScore: tripData.ecoScore,
        status: tripData.endTime ? 'completed' : 'active'
      });
      
      // Insert route points
      if (tripData.route && tripData.route.length > 0) {
        const routeData = tripData.route.map((point, index) => ({
          tripId,
          sequence: index,
          lat: point.lat,
          lng: point.lng,
          timestamp: point.timestamp
        }));
        
        await trx('trip_routes').insert(routeData);
      }
      
      // Insert events
      if (tripData.events && tripData.events.length > 0) {
        const eventData = tripData.events.map(event => ({
          tripId,
          type: event.type,
          severity: event.severity,
          timestamp: event.timestamp,
          lat: event.lat,
          lng: event.lng
        }));
        
        await trx('trip_events').insert(eventData);
      }
      
      return tripId;
    });
    
    // Fetch the created trip with all details
    const createdTrip = await knex('trips')
      .where('id', result)
      .first();
    
    sendSuccessResponse(res, { tripId: result, trip: createdTrip }, 'Trip created successfully', 201);
    
  } catch (error) {
    console.error('Error creating trip:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Update a trip
router.put('/:id', tripUpdateValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { 
      message: 'Validation failed',
      details: errors.array()
    }, 400);
  }
  
  const userId = req.user.id;
  const tripId = req.params.id;
  const updateData = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if trip exists and belongs to user
    const existingTrip = await knex('trips')
      .where({ id: tripId, userId })
      .first();
    
    if (!existingTrip) {
      return sendErrorResponse(res, { message: 'Trip not found' }, 404);
    }
    
    // Start transaction
    await knex.transaction(async (trx) => {
      // Update trip
      const tripUpdates = {};
      if (updateData.endTime !== undefined) tripUpdates.endTime = updateData.endTime;
      if (updateData.distance !== undefined) tripUpdates.distance = updateData.distance;
      if (updateData.fuelConsumed !== undefined) tripUpdates.fuelConsumed = updateData.fuelConsumed;
      if (updateData.efficiency !== undefined) tripUpdates.efficiency = updateData.efficiency;
      if (updateData.ecoScore !== undefined) tripUpdates.ecoScore = updateData.ecoScore;
      if (updateData.endTime) tripUpdates.status = 'completed';
      
      if (Object.keys(tripUpdates).length > 0) {
        await trx('trips')
          .where('id', tripId)
          .update(tripUpdates);
      }
      
      // Update route if provided
      if (updateData.route && updateData.route.length > 0) {
        // Delete existing route
        await trx('trip_routes')
          .where('tripId', tripId)
          .del();
        
        // Insert new route
        const routeData = updateData.route.map((point, index) => ({
          tripId,
          sequence: index,
          lat: point.lat,
          lng: point.lng,
          timestamp: point.timestamp
        }));
        
        await trx('trip_routes').insert(routeData);
      }
    });
    
    sendSuccessResponse(res, { message: 'Trip updated successfully' });
    
  } catch (error) {
    console.error('Error updating trip:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Delete a trip
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const tripId = req.params.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if trip exists and belongs to user
    const existingTrip = await knex('trips')
      .where({ id: tripId, userId })
      .first();
    
    if (!existingTrip) {
      return sendErrorResponse(res, { message: 'Trip not found' }, 404);
    }
    
    // Start transaction
    await knex.transaction(async (trx) => {
      // Delete related data first
      await trx('trip_routes').where('tripId', tripId).del();
      await trx('trip_events').where('tripId', tripId).del();
      
      // Delete trip
      await trx('trips').where('id', tripId).del();
    });
    
    sendSuccessResponse(res, { message: 'Trip deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting trip:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get trip statistics
router.get('/stats/summary', asyncHandler(async (req, res) => {
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
    
    const stats = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalTrips'),
        knex.raw('SUM(distance) as totalDistance'),
        knex.raw('SUM(fuelConsumed) as totalFuel'),
        knex.raw('AVG(ecoScore) as avgEcoScore'),
        knex.raw('AVG(efficiency) as avgEfficiency'),
        knex.raw('MIN(ecoScore) as bestEcoScore'),
        knex.raw('MAX(ecoScore) as worstEcoScore')
      )
      .first();
    
    // Get recent trips for trend analysis
    const recentTrips = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', dateFilter)
      .orderBy('startTime', 'desc')
      .limit(10)
      .select('startTime', 'ecoScore', 'efficiency');
    
    const response = {
      summary: {
        totalTrips: parseInt(stats.totalTrips) || 0,
        totalDistance: parseFloat(stats.totalDistance) || 0,
        totalFuel: parseFloat(stats.totalFuel) || 0,
        avgEcoScore: Math.round(parseFloat(stats.avgEcoScore) || 0),
        avgEfficiency: parseFloat(stats.avgEfficiency) || 0,
        bestEcoScore: parseInt(stats.bestEcoScore) || 0,
        worstEcoScore: parseInt(stats.worstEcoScore) || 0
      },
      trends: {
        recentTrips: recentTrips.length,
        timeRange
      }
    };
    
    sendSuccessResponse(res, response, 'Trip statistics retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching trip statistics:', error);
    sendErrorResponse(res, error, 500);
  }
}));

module.exports = router;
