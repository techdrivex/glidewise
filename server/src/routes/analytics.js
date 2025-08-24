const express = require('express');
const { asyncHandler, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');
const DatabaseService = require('../services/DatabaseService');

const router = express.Router();

// Get comprehensive driving analytics
router.get('/overview', asyncHandler(async (req, res) => {
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
    
    // Get trip analytics
    const tripAnalytics = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalTrips'),
        knex.raw('SUM(distance) as totalDistance'),
        knex.raw('SUM(fuelConsumed) as totalFuel'),
        knex.raw('AVG(ecoScore) as avgEcoScore'),
        knex.raw('AVG(efficiency) as avgEfficiency'),
        knex.raw('MIN(ecoScore) as bestEcoScore'),
        knex.raw('MAX(ecoScore) as worstEcoScore'),
        knex.raw('AVG(EXTRACT(EPOCH FROM (endTime - startTime))/3600) as avgDuration')
      )
      .first();
    
    // Get OBD analytics
    const obdAnalytics = await knex('obd_data')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalRecords'),
        knex.raw('AVG(engineRPM) as avgEngineRPM'),
        knex.raw('AVG(vehicleSpeed) as avgVehicleSpeed'),
        knex.raw('AVG(engineLoad) as avgEngineLoad'),
        knex.raw('AVG(throttlePosition) as avgThrottlePosition')
      )
      .first();
    
    // Get coaching analytics
    const coachingAnalytics = await knex('coaching_tips')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalTips'),
        knex.raw('SUM(CASE WHEN isRead THEN 1 ELSE 0 END) as readTips'),
        knex.raw('SUM(CASE WHEN isApplied THEN 1 ELSE 0 END) as appliedTips')
      )
      .first();
    
    // Calculate fuel savings
    const baselineEfficiency = 8.5; // L/100km baseline
    const actualEfficiency = parseFloat(tripAnalytics.avgEfficiency) || baselineEfficiency;
    const fuelSavings = ((baselineEfficiency - actualEfficiency) / baselineEfficiency) * 100;
    
    // Calculate cost savings (assuming $1.50/L fuel)
    const fuelPrice = 1.50;
    const totalFuelCost = parseFloat(tripAnalytics.totalFuel) * fuelPrice;
    const potentialCost = parseFloat(tripAnalytics.totalDistance) * (baselineEfficiency / 100) * fuelPrice;
    const costSavings = potentialCost - totalFuelCost;
    
    const overview = {
      timeRange,
      summary: {
        trips: {
          total: parseInt(tripAnalytics.totalTrips) || 0,
          distance: parseFloat(tripAnalytics.totalDistance) || 0,
          fuel: parseFloat(tripAnalytics.totalFuel) || 0,
          avgDuration: parseFloat(tripAnalytics.avgDuration) || 0
        },
        performance: {
          avgEcoScore: Math.round(parseFloat(tripAnalytics.avgEcoScore) || 0),
          avgEfficiency: parseFloat(tripAnalytics.avgEfficiency) || 0,
          bestEcoScore: parseInt(tripAnalytics.bestEcoScore) || 0,
          worstEcoScore: parseInt(tripAnalytics.worstEcoScore) || 0
        },
        savings: {
          fuelEfficiency: Math.max(0, fuelSavings),
          costSavings: Math.max(0, costSavings),
          fuelPrice
        },
        coaching: {
          total: parseInt(coachingAnalytics.totalTips) || 0,
          read: parseInt(coachingAnalytics.readTips) || 0,
          applied: parseInt(coachingAnalytics.appliedTips) || 0,
          readRate: coachingAnalytics.totalTips > 0 ? 
            (parseInt(coachingAnalytics.readTips) / parseInt(coachingAnalytics.totalTips)) * 100 : 0
        }
      }
    };
    
    sendSuccessResponse(res, overview, 'Analytics overview retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get driving trends over time
router.get('/trends', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { metric = 'ecoScore', timeRange = '30d', interval = '1d' } = req.query;
  
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
    
    let trends;
    
    if (metric === 'ecoScore' || metric === 'efficiency' || metric === 'distance' || metric === 'fuelConsumed') {
      // Get trip-based trends
      trends = await knex('trips')
        .where('userId', userId)
        .where('startTime', '>=', dateFilter)
        .whereNotNull(metric)
        .orderBy('startTime', 'asc')
        .select('startTime', metric);
    } else {
      // Get OBD-based trends
      trends = await knex('obd_data')
        .where('userId', userId)
        .where('timestamp', '>=', dateFilter)
        .whereNotNull(metric)
        .orderBy('timestamp', 'asc')
        .select('timestamp as startTime', metric);
    }
    
    // Group data by intervals
    const groupedData = groupTrendsByInterval(trends, interval, metric);
    
    // Calculate trend direction
    const trendDirection = calculateTrendDirection(groupedData);
    
    sendSuccessResponse(res, {
      metric,
      timeRange,
      interval,
      trendDirection,
      data: groupedData
    }, 'Trends retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching trends:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get performance comparison
router.get('/comparison', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { compareWith = 'previous_period', timeRange = '30d' } = req.query;
  
  try {
    const knex = DatabaseService.getKnex();
    
    const now = new Date();
    let currentPeriodStart, previousPeriodStart;
    
    switch (timeRange) {
      case '7d':
        currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        currentPeriodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      default:
        currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    }
    
    // Get current period stats
    const currentStats = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', currentPeriodStart)
      .select(
        knex.raw('COUNT(*) as totalTrips'),
        knex.raw('SUM(distance) as totalDistance'),
        knex.raw('SUM(fuelConsumed) as totalFuel'),
        knex.raw('AVG(ecoScore) as avgEcoScore'),
        knex.raw('AVG(efficiency) as avgEfficiency')
      )
      .first();
    
    // Get previous period stats
    const previousStats = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', previousPeriodStart)
      .where('startTime', '<', currentPeriodStart)
      .select(
        knex.raw('COUNT(*) as totalTrips'),
        knex.raw('SUM(distance) as totalDistance'),
        knex.raw('SUM(fuelConsumed) as totalFuel'),
        knex.raw('AVG(ecoScore) as avgEcoScore'),
        knex.raw('AVG(efficiency) as avgEfficiency')
      )
      .first();
    
    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };
    
    const comparison = {
      timeRange,
      currentPeriod: {
        start: currentPeriodStart,
        end: now,
        stats: {
          totalTrips: parseInt(currentStats.totalTrips) || 0,
          totalDistance: parseFloat(currentStats.totalDistance) || 0,
          totalFuel: parseFloat(currentStats.totalFuel) || 0,
          avgEcoScore: Math.round(parseFloat(currentStats.avgEcoScore) || 0),
          avgEfficiency: parseFloat(currentStats.avgEfficiency) || 0
        }
      },
      previousPeriod: {
        start: previousPeriodStart,
        end: currentPeriodStart,
        stats: {
          totalTrips: parseInt(previousStats.totalTrips) || 0,
          totalDistance: parseFloat(previousStats.totalDistance) || 0,
          totalFuel: parseFloat(previousStats.totalFuel) || 0,
          avgEcoScore: Math.round(parseFloat(previousStats.avgEcoScore) || 0),
          avgEfficiency: parseFloat(previousStats.avgEfficiency) || 0
        }
      },
      changes: {
        totalTrips: calculateChange(
          parseInt(currentStats.totalTrips) || 0,
          parseInt(previousStats.totalTrips) || 0
        ),
        totalDistance: calculateChange(
          parseFloat(currentStats.totalDistance) || 0,
          parseFloat(previousStats.totalDistance) || 0
        ),
        totalFuel: calculateChange(
          parseFloat(currentStats.totalFuel) || 0,
          parseFloat(previousStats.totalFuel) || 0
        ),
        avgEcoScore: calculateChange(
          parseFloat(currentStats.avgEcoScore) || 0,
          parseFloat(previousStats.avgEcoScore) || 0
        ),
        avgEfficiency: calculateChange(
          parseFloat(currentStats.avgEfficiency) || 0,
          parseFloat(previousStats.avgEfficiency) || 0
        )
      }
    };
    
    sendSuccessResponse(res, comparison, 'Performance comparison retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching performance comparison:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get driving insights and recommendations
router.get('/insights', asyncHandler(async (req, res) => {
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
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get recent trips for analysis
    const recentTrips = await knex('trips')
      .where('userId', userId)
      .where('startTime', '>=', dateFilter)
      .orderBy('startTime', 'desc')
      .limit(20)
      .select('*');
    
    // Get recent OBD data for analysis
    const recentOBD = await knex('obd_data')
      .where('userId', userId)
      .where('timestamp', '>=', dateFilter)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .select('*');
    
    // Generate insights
    const insights = generateInsights(recentTrips, recentOBD);
    
    sendSuccessResponse(res, {
      timeRange,
      insights
    }, 'Insights generated successfully');
    
  } catch (error) {
    console.error('Error generating insights:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Helper functions
function groupTrendsByInterval(data, interval, metric) {
  if (interval === 'raw') {
    return data.map(point => ({
      timestamp: point.startTime,
      value: point[metric]
    }));
  }
  
  const grouped = {};
  data.forEach(point => {
    const date = new Date(point.startTime);
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
      case '1w':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10) + 'T00:00:00.000Z';
        break;
      default:
        key = date.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(point[metric]);
  });
  
  return Object.entries(grouped).map(([timestamp, values]) => ({
    timestamp,
    value: values.reduce((sum, val) => sum + val, 0) / values.length,
    count: values.length
  }));
}

function calculateTrendDirection(data) {
  if (data.length < 2) return 'stable';
  
  const recentValues = data.slice(-5).map(d => d.value);
  const olderValues = data.slice(0, Math.min(5, data.length - 5)).map(d => d.value);
  
  if (recentValues.length === 0 || olderValues.length === 0) return 'stable';
  
  const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  const olderAvg = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

function generateInsights(trips, obdData) {
  const insights = [];
  
  // Analyze eco score trends
  if (trips.length > 0) {
    const ecoScores = trips.map(t => t.ecoScore).filter(s => s !== null);
    if (ecoScores.length > 0) {
      const avgEcoScore = ecoScores.reduce((sum, score) => sum + score, 0) / ecoScores.length;
      
      if (avgEcoScore < 60) {
        insights.push({
          type: 'warning',
          title: 'Low Eco Score',
          message: 'Your average eco score is below 60. Focus on smooth acceleration and braking to improve.',
          priority: 'high'
        });
      } else if (avgEcoScore > 80) {
        insights.push({
          type: 'success',
          title: 'Excellent Driving',
          message: 'Great job! Your eco score is consistently high. Keep up the good driving habits.',
          priority: 'low'
        });
      }
    }
  }
  
  // Analyze efficiency trends
  if (trips.length > 0) {
    const efficiencies = trips.map(t => t.efficiency).filter(e => e !== null);
    if (efficiencies.length > 0) {
      const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
      
      if (avgEfficiency > 10) {
        insights.push({
          type: 'warning',
          title: 'High Fuel Consumption',
          message: 'Your fuel efficiency is above 10 L/100km. Consider adjusting your driving style.',
          priority: 'medium'
        });
      }
    }
  }
  
  // Analyze OBD data patterns
  if (obdData.length > 0) {
    const highRPMCount = obdData.filter(d => d.engineRPM && d.engineRPM > 3000).length;
    const highRPMPercentage = (highRPMCount / obdData.length) * 100;
    
    if (highRPMPercentage > 30) {
      insights.push({
        type: 'tip',
        title: 'High RPM Driving',
        message: 'You\'re frequently driving at high RPM. Shift to higher gears earlier to improve efficiency.',
        priority: 'medium'
      });
    }
    
    const aggressiveThrottleCount = obdData.filter(d => d.throttlePosition && d.throttlePosition > 80).length;
    const aggressiveThrottlePercentage = (aggressiveThrottleCount / obdData.length) * 100;
    
    if (aggressiveThrottlePercentage > 20) {
      insights.push({
        type: 'tip',
        title: 'Aggressive Acceleration',
        message: 'Gentle acceleration can improve fuel efficiency by up to 20%.',
        priority: 'medium'
      });
    }
  }
  
  // Add general insights if none specific
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      title: 'Good Progress',
      message: 'Your driving patterns look good. Continue monitoring for further improvements.',
      priority: 'low'
    });
  }
  
  return insights;
}

module.exports = router;
