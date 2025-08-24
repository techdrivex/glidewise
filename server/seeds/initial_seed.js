const DatabaseService = require('../src/services/DatabaseService');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    const knex = DatabaseService.getKnex();
    
    // Check if data already exists
    const existingUsers = await knex('users').count('* as count').first();
    if (parseInt(existingUsers.count) > 0) {
      console.log('Database already contains data, skipping seed...');
      return;
    }
    
    console.log('Seeding users...');
    
    // Create sample users
    const users = [
      {
        email: 'demo@glidewise.com',
        password: await bcrypt.hash('demo123', 10),
        firstName: 'Demo',
        lastName: 'User',
        phone: '+1234567890',
        isActive: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'admin@glidewise.com',
        password: await bcrypt.hash('admin123', 10),
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567891',
        isActive: true,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const [demoUserId, adminUserId] = await knex('users').insert(users);
    
    console.log('Seeding vehicles...');
    
    // Create sample vehicles
    const vehicles = [
      {
        userId: demoUserId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vin: '1HGBH41JXMN109186',
        fuelType: 'gasoline',
        engineSize: '2.5L',
        transmission: 'automatic',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        vin: '2T1BURHE0JC123456',
        fuelType: 'gasoline',
        engineSize: '2.0L',
        transmission: 'automatic',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const [vehicle1Id, vehicle2Id] = await knex('vehicles').insert(vehicles);
    
    console.log('Seeding trips...');
    
    // Create sample trips
    const trips = [
      {
        userId: demoUserId,
        vehicleId: vehicle1Id,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        distance: 45.2,
        fuelConsumed: 3.8,
        ecoScore: 78,
        efficiency: 8.4,
        startLocation: 'Home',
        endLocation: 'Work',
        notes: 'Morning commute',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        vehicleId: vehicle1Id,
        startTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        endTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        distance: 32.1,
        fuelConsumed: 2.9,
        ecoScore: 82,
        efficiency: 9.0,
        startLocation: 'Work',
        endLocation: 'Grocery Store',
        notes: 'Errand run',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        vehicleId: vehicle1Id,
        startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        distance: 67.8,
        fuelConsumed: 5.2,
        ecoScore: 75,
        efficiency: 7.7,
        startLocation: 'Home',
        endLocation: 'Airport',
        notes: 'Airport pickup',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        vehicleId: vehicle2Id,
        startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        endTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour later
        distance: 28.5,
        fuelConsumed: 2.4,
        ecoScore: 85,
        efficiency: 8.4,
        startLocation: 'Home',
        endLocation: 'Gym',
        notes: 'Evening workout',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        vehicleId: vehicle1Id,
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000), // 2.5 hours later
        distance: 52.3,
        fuelConsumed: 4.1,
        ecoScore: 79,
        efficiency: 7.8,
        startLocation: 'Work',
        endLocation: 'Home',
        notes: 'Evening commute',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const tripIds = await knex('trips').insert(trips);
    
    console.log('Seeding trip routes...');
    
    // Create sample trip routes
    const tripRoutes = [];
    trips.forEach((trip, index) => {
      const routePoints = generateRoutePoints(
        trip.startLocation,
        trip.endLocation,
        trip.distance,
        10 + Math.floor(Math.random() * 20) // 10-30 points
      );
      
      routePoints.forEach((point, pointIndex) => {
        tripRoutes.push({
          tripId: tripIds[index],
          latitude: point.lat,
          longitude: point.lng,
          timestamp: new Date(trip.startTime.getTime() + (pointIndex * (trip.endTime.getTime() - trip.startTime.getTime()) / routePoints.length)),
          speed: point.speed,
          altitude: point.altitude,
          sequence: pointIndex,
          createdAt: new Date()
        });
      });
    });
    
    await knex('trip_routes').insert(tripRoutes);
    
    console.log('Seeding trip events...');
    
    // Create sample trip events
    const tripEvents = [];
    trips.forEach((trip, index) => {
      const events = generateTripEvents(trip.ecoScore);
      events.forEach(event => {
        tripEvents.push({
          tripId: tripIds[index],
          type: event.type,
          timestamp: new Date(trip.startTime.getTime() + Math.random() * (trip.endTime.getTime() - trip.startTime.getTime())),
          description: event.description,
          severity: event.severity,
          location: event.location,
          metadata: JSON.stringify(event.metadata),
          createdAt: new Date()
        });
      });
    });
    
    await knex('trip_events').insert(tripEvents);
    
    console.log('Seeding OBD data...');
    
    // Create sample OBD data
    const obdData = [];
    trips.forEach((trip, index) => {
      const obdRecords = generateOBDData(trip.distance, trip.ecoScore);
      obdRecords.forEach((record, recordIndex) => {
        obdData.push({
          userId: demoUserId,
          tripId: tripIds[index],
          timestamp: new Date(trip.startTime.getTime() + (recordIndex * (trip.endTime.getTime() - trip.startTime.getTime()) / obdRecords.length)),
          engineRPM: record.rpm,
          vehicleSpeed: record.speed,
          engineLoad: record.load,
          throttlePosition: record.throttle,
          fuelLevel: record.fuelLevel,
          engineTemp: record.temp,
          batteryVoltage: record.battery,
          createdAt: new Date()
        });
      });
    });
    
    await knex('obd_data').insert(obdData);
    
    console.log('Seeding coaching tips...');
    
    // Create sample coaching tips
    const coachingTips = [
      {
        userId: demoUserId,
        type: 'acceleration',
        title: 'Smooth Acceleration',
        description: 'Try to accelerate smoothly from a stop. Aggressive acceleration can reduce fuel efficiency by up to 20%.',
        content: 'When starting from a stop, gradually press the accelerator pedal instead of flooring it. This allows the engine to work more efficiently and reduces fuel consumption.',
        priority: 'medium',
        isRead: false,
        isApplied: false,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        type: 'braking',
        title: 'Anticipate Traffic',
        description: 'Look ahead and anticipate traffic flow to avoid unnecessary braking and acceleration.',
        content: 'By looking ahead and anticipating traffic conditions, you can maintain a more consistent speed and reduce the need for sudden braking and acceleration.',
        priority: 'high',
        isRead: true,
        isApplied: true,
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        type: 'shifting',
        title: 'Optimal Gear Selection',
        description: 'Shift to higher gears earlier to keep engine RPM in the optimal range.',
        content: 'Modern engines are most efficient at lower RPMs. Shift to higher gears as soon as possible while maintaining smooth acceleration.',
        priority: 'medium',
        isRead: false,
        isApplied: false,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        type: 'regeneration',
        title: 'Use Engine Braking',
        description: 'Take advantage of engine braking when descending hills to save fuel.',
        content: 'Instead of using the brakes on downhill sections, let the engine slow the vehicle naturally. This can save fuel and reduce brake wear.',
        priority: 'low',
        isRead: true,
        isApplied: false,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        type: 'general',
        title: 'Maintain Proper Tire Pressure',
        description: 'Check and maintain proper tire pressure regularly for optimal fuel efficiency.',
        content: 'Underinflated tires can reduce fuel efficiency by up to 3%. Check your tire pressure monthly and before long trips.',
        priority: 'medium',
        isRead: false,
        isApplied: false,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await knex('coaching_tips').insert(coachingTips);
    
    console.log('Seeding user preferences...');
    
    // Create sample user preferences
    const userPreferences = [
      {
        userId: demoUserId,
        key: 'eco_mode',
        value: 'true',
        description: 'Enable eco-driving mode',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        key: 'haptic_feedback',
        value: 'true',
        description: 'Enable haptic feedback for driving tips',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        key: 'voice_prompts',
        value: 'false',
        description: 'Enable voice prompts for coaching tips',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        key: 'auto_start_trips',
        value: 'true',
        description: 'Automatically start tracking trips',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        key: 'fuel_unit',
        value: 'L',
        description: 'Preferred fuel unit (L for liters, gal for gallons)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        key: 'distance_unit',
        value: 'km',
        description: 'Preferred distance unit (km for kilometers, mi for miles)',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await knex('user_preferences').insert(userPreferences);
    
    console.log('Seeding AI models...');
    
    // Create sample AI models
    const aiModels = [
      {
        userId: demoUserId,
        name: 'Eco Score Predictor',
        type: 'eco_score',
        description: 'Predicts eco-driving score based on driving behavior patterns',
        status: 'trained',
        version: '1.0.0',
        accuracy: 0.87,
        trainingDataSize: 1250,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        name: 'Fuel Efficiency Analyzer',
        type: 'fuel_efficiency',
        description: 'Analyzes fuel consumption patterns and provides optimization suggestions',
        status: 'deployed',
        version: '1.2.0',
        accuracy: 0.92,
        trainingDataSize: 2100,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        userId: demoUserId,
        name: 'Driving Behavior Classifier',
        type: 'driving_behavior',
        description: 'Classifies driving behavior into eco-friendly categories',
        status: 'training',
        version: '0.9.0',
        accuracy: 0.78,
        trainingDataSize: 800,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
    ];
    
    const aiModelIds = await knex('ai_models').insert(aiModels);
    
    console.log('Seeding model predictions...');
    
    // Create sample model predictions
    const modelPredictions = [];
    aiModels.forEach((model, index) => {
      const predictions = generateModelPredictions(model.type, model.accuracy);
      predictions.forEach(prediction => {
        modelPredictions.push({
          modelId: aiModelIds[index],
          inputData: JSON.stringify(prediction.input),
          prediction: JSON.stringify(prediction.output),
          accuracy: prediction.accuracy,
          confidence: prediction.confidence,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        });
      });
    });
    
    await knex('model_predictions').insert(modelPredictions);
    
    console.log('Database seeding completed successfully!');
    console.log(`Created:`);
    console.log(`- ${users.length} users`);
    console.log(`- ${vehicles.length} vehicles`);
    console.log(`- ${trips.length} trips`);
    console.log(`- ${tripRoutes.length} route points`);
    console.log(`- ${tripEvents.length} trip events`);
    console.log(`- ${obdData.length} OBD records`);
    console.log(`- ${coachingTips.length} coaching tips`);
    console.log(`- ${userPreferences.length} user preferences`);
    console.log(`- ${aiModels.length} AI models`);
    console.log(`- ${modelPredictions.length} model predictions`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Helper functions to generate realistic sample data
function generateRoutePoints(startLocation, endLocation, distance, pointCount) {
  const points = [];
  const startLat = 37.7749 + (Math.random() - 0.5) * 0.1; // San Francisco area
  const startLng = -122.4194 + (Math.random() - 0.5) * 0.1;
  const endLat = startLat + (Math.random() - 0.5) * 0.05;
  const endLng = startLng + (Math.random() - 0.5) * 0.05;
  
  for (let i = 0; i < pointCount; i++) {
    const progress = i / (pointCount - 1);
    const lat = startLat + (endLat - startLat) * progress + (Math.random() - 0.5) * 0.001;
    const lng = startLng + (endLng - startLng) * progress + (Math.random() - 0.5) * 0.001;
    
    points.push({
      lat,
      lng,
      speed: 30 + Math.random() * 50, // 30-80 km/h
      altitude: 10 + Math.random() * 100 // 10-110m
    });
  }
  
  return points;
}

function generateTripEvents(ecoScore) {
  const events = [];
  const eventTypes = ['hard_braking', 'rapid_acceleration', 'high_speed', 'idling', 'eco_driving'];
  
  // Generate 2-5 events per trip
  const eventCount = 2 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < eventCount; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low';
    
    let description, metadata;
    switch (type) {
      case 'hard_braking':
        description = 'Sudden braking detected';
        metadata = { deceleration: 8 + Math.random() * 4 }; // 8-12 m/s²
        break;
      case 'rapid_acceleration':
        description = 'Aggressive acceleration detected';
        metadata = { acceleration: 6 + Math.random() * 4 }; // 6-10 m/s²
        break;
      case 'high_speed':
        description = 'Exceeded speed limit';
        metadata = { speed: 80 + Math.random() * 30, limit: 60 }; // 80-110 km/h
        break;
      case 'idling':
        description = 'Extended idling detected';
        metadata = { duration: 60 + Math.random() * 300 }; // 1-6 minutes
        break;
      case 'eco_driving':
        description = 'Eco-friendly driving behavior';
        metadata = { score: 85 + Math.random() * 15 }; // 85-100
        break;
    }
    
    events.push({
      type,
      description,
      severity,
      location: 'Route point',
      metadata
    });
  }
  
  return events;
}

function generateOBDData(distance, ecoScore) {
  const records = [];
  const recordCount = Math.floor(distance / 2) + 10; // Roughly 1 record per 2km + 10
  
  for (let i = 0; i < recordCount; i++) {
    const progress = i / (recordCount - 1);
    
    // Adjust values based on eco score
    const ecoMultiplier = ecoScore / 100;
    
    records.push({
      rpm: 1500 + Math.random() * 2000 * ecoMultiplier, // 1500-3500 RPM
      speed: 20 + Math.random() * 60 * ecoMultiplier, // 20-80 km/h
      load: 20 + Math.random() * 40 * ecoMultiplier, // 20-60%
      throttle: 15 + Math.random() * 35 * ecoMultiplier, // 15-50%
      fuelLevel: 20 + Math.random() * 60, // 20-80%
      temp: 85 + Math.random() * 15, // 85-100°C
      battery: 12.5 + Math.random() * 1.5 // 12.5-14V
    });
  }
  
  return records;
}

function generateModelPredictions(modelType, accuracy) {
  const predictions = [];
  const predictionCount = 10 + Math.floor(Math.random() * 20); // 10-30 predictions
  
  for (let i = 0; i < predictionCount; i++) {
    let input, output;
    
    switch (modelType) {
      case 'eco_score':
        input = {
          speed: 30 + Math.random() * 50,
          acceleration: Math.random() * 5,
          braking: Math.random() * 3,
          rpm: 1500 + Math.random() * 2000
        };
        output = {
          ecoScore: Math.floor(60 + Math.random() * 40 * accuracy),
          confidence: 0.7 + Math.random() * 0.3
        };
        break;
      case 'fuel_efficiency':
        input = {
          distance: 10 + Math.random() * 50,
          fuelConsumed: 0.5 + Math.random() * 3,
          avgSpeed: 30 + Math.random() * 40,
          stops: Math.floor(Math.random() * 10)
        };
        output = {
          efficiency: 5 + Math.random() * 8,
          savings: Math.random() * 2,
          recommendations: ['Reduce idling', 'Smooth acceleration']
        };
        break;
      case 'driving_behavior':
        input = {
          throttlePosition: Math.random() * 100,
          brakePressure: Math.random() * 100,
          steeringAngle: Math.random() * 30,
          speedVariation: Math.random() * 20
        };
        output = {
          behavior: Math.random() > 0.5 ? 'eco_friendly' : 'aggressive',
          riskScore: Math.random() * 100,
          improvementAreas: ['Acceleration', 'Braking']
        };
        break;
      default:
        input = { data: Math.random() };
        output = { result: Math.random() };
    }
    
    predictions.push({
      input,
      output,
      accuracy: accuracy * (0.8 + Math.random() * 0.4), // ±20% variation
      confidence: 0.6 + Math.random() * 0.4 // 0.6-1.0
    });
  }
  
  return predictions;
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
