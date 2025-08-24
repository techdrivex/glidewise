exports.up = function(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email', 255).notNullable().unique();
      table.string('passwordHash', 255).notNullable();
      table.string('firstName', 100);
      table.string('lastName', 100);
      table.string('role', 20).defaultTo('user');
      table.boolean('isActive').defaultTo(true);
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('email');
      table.index('role');
    })
    
    .createTable('vehicles', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable();
      table.string('make', 100);
      table.string('model', 100);
      table.string('year', 4);
      table.string('vin', 17);
      table.string('fuelType', 50);
      table.decimal('fuelCapacity', 8, 2);
      table.decimal('cityMPG', 5, 1);
      table.decimal('highwayMPG', 5, 1);
      table.boolean('isDefault').defaultTo(false);
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index('userId');
      table.index('vin');
    })
    
    .createTable('trips', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable();
      table.integer('vehicleId').unsigned();
      table.timestamp('startTime').notNullable();
      table.timestamp('endTime');
      table.decimal('distance', 10, 3); // in kilometers
      table.decimal('fuelConsumed', 8, 3); // in liters
      table.decimal('efficiency', 8, 2); // L/100km
      table.integer('ecoScore'); // 0-100
      table.string('status', 20).defaultTo('active'); // active, completed, cancelled
      table.json('metadata'); // Additional trip data
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('vehicleId').references('id').inTable('vehicles').onDelete('SET NULL');
      
      // Indexes
      table.index('userId');
      table.index('vehicleId');
      table.index('startTime');
      table.index('status');
      table.index(['userId', 'startTime']);
    })
    
    .createTable('trip_routes', (table) => {
      table.increments('id').primary();
      table.integer('tripId').unsigned().notNullable();
      table.integer('sequence').notNullable(); // Order of points
      table.decimal('lat', 10, 8).notNullable(); // Latitude
      table.decimal('lng', 11, 8).notNullable(); // Longitude
      table.decimal('altitude', 8, 2); // Altitude in meters
      table.decimal('speed', 6, 2); // Speed in km/h
      table.decimal('heading', 5, 2); // Heading in degrees
      table.decimal('accuracy', 6, 2); // GPS accuracy in meters
      table.timestamp('timestamp').notNullable();
      
      // Foreign keys
      table.foreign('tripId').references('id').inTable('trips').onDelete('CASCADE');
      
      // Indexes
      table.index('tripId');
      table.index(['tripId', 'sequence']);
      table.index('timestamp');
    })
    
    .createTable('trip_events', (table) => {
      table.increments('id').primary();
      table.integer('tripId').unsigned().notNullable();
      table.string('type', 50).notNullable(); // acceleration, braking, shifting, regeneration
      table.string('severity', 20).notNullable(); // low, medium, high
      table.decimal('lat', 10, 8);
      table.decimal('lng', 11, 8);
      table.timestamp('timestamp').notNullable();
      table.json('data'); // Additional event data
      
      // Foreign keys
      table.foreign('tripId').references('id').inTable('trips').onDelete('CASCADE');
      
      // Indexes
      table.index('tripId');
      table.index('type');
      table.index('severity');
      table.index('timestamp');
    })
    
    .createTable('obd_data', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable();
      table.integer('tripId').unsigned();
      table.decimal('engineRPM', 8, 2);
      table.decimal('vehicleSpeed', 6, 2); // km/h
      table.decimal('engineLoad', 5, 2); // percentage
      table.decimal('throttlePosition', 5, 2); // percentage
      table.decimal('fuelLevel', 5, 2); // percentage
      table.decimal('engineTemp', 5, 2); // Celsius
      table.decimal('batteryVoltage', 5, 2); // Volts
      table.decimal('fuelConsumption', 8, 3); // L/100km
      table.json('rawData'); // Raw OBD response data
      table.timestamp('timestamp').notNullable();
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('tripId').references('id').inTable('trips').onDelete('SET NULL');
      
      // Indexes
      table.index('userId');
      table.index('tripId');
      table.index('timestamp');
      table.index(['userId', 'timestamp']);
    })
    
    .createTable('coaching_tips', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable();
      table.string('type', 50).notNullable(); // acceleration, braking, shifting, regeneration, general
      table.string('message', 500).notNullable();
      table.string('priority', 20).notNullable(); // low, medium, high
      table.boolean('isRead').defaultTo(false);
      table.boolean('isApplied').defaultTo(false);
      table.integer('tripId').unsigned(); // Associated trip
      table.json('context'); // Context data for the tip
      table.timestamp('timestamp').notNullable();
      table.timestamp('readAt');
      table.timestamp('appliedAt');
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('tripId').references('id').inTable('trips').onDelete('SET NULL');
      
      // Indexes
      table.index('userId');
      table.index('type');
      table.index('priority');
      table.index('isRead');
      table.index('timestamp');
    })
    
    .createTable('user_preferences', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable().unique();
      table.boolean('ecoMode').defaultTo(true);
      table.boolean('hapticFeedback').defaultTo(true);
      table.boolean('voicePrompts').defaultTo(false);
      table.boolean('autoStartTrips').defaultTo(true);
      table.string('units', 10).defaultTo('metric'); // metric, imperial
      table.json('notifications'); // Notification preferences
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index('userId');
    })
    
    .createTable('ai_models', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('version', 20).notNullable();
      table.string('type', 50).notNullable(); // driving_behavior, fuel_efficiency, route_optimization
      table.text('description');
      table.string('filePath', 500); // Path to model file
      table.json('metadata'); // Model metadata
      table.boolean('isActive').defaultTo(true);
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('name');
      table.index('type');
      table.index('isActive');
    })
    
    .createTable('model_predictions', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable();
      table.integer('modelId').unsigned().notNullable();
      table.integer('tripId').unsigned();
      table.json('inputData').notNullable(); // Input data for prediction
      table.json('outputData').notNullable(); // Prediction results
      table.decimal('confidence', 5, 4); // Prediction confidence (0-1)
      table.timestamp('timestamp').notNullable();
      
      // Foreign keys
      table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('modelId').references('id').inTable('ai_models').onDelete('CASCADE');
      table.foreign('tripId').references('id').inTable('trips').onDelete('SET NULL');
      
      // Indexes
      table.index('userId');
      table.index('modelId');
      table.index('tripId');
      table.index('timestamp');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('model_predictions')
    .dropTableIfExists('ai_models')
    .dropTableIfExists('user_preferences')
    .dropTableIfExists('coaching_tips')
    .dropTableIfExists('obd_data')
    .dropTableIfExists('trip_events')
    .dropTableIfExists('trip_routes')
    .dropTableIfExists('trips')
    .dropTableIfExists('vehicles')
    .dropTableIfExists('users');
};
