const knex = require('knex');
const path = require('path');

class DatabaseService {
  constructor() {
    this.knex = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Create database connection
      this.knex = knex({
        client: process.env.DB_CLIENT || 'sqlite3',
        connection: this.getConnectionConfig(),
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
        migrations: {
          directory: path.join(__dirname, '../migrations'),
          tableName: 'knex_migrations'
        },
        seeds: {
          directory: path.join(__dirname, '../seeds')
        },
        debug: process.env.NODE_ENV === 'development'
      });

      // Test connection
      await this.knex.raw('SELECT 1');
      console.log('Database connection established');

      // Run migrations
      await this.runMigrations();
      console.log('Database migrations completed');

      // Run seeds in development
      if (process.env.NODE_ENV === 'development') {
        await this.runSeeds();
        console.log('Database seeds completed');
      }

      this.isInitialized = true;
      console.log('Database service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  getConnectionConfig() {
    const dbClient = process.env.DB_CLIENT || 'sqlite3';
    
    switch (dbClient) {
      case 'postgresql':
      case 'pg':
        return {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'glidewise',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        };
      
      case 'mysql':
      case 'mysql2':
        return {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 3306,
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'glidewise'
        };
      
      case 'sqlite3':
      default:
        return {
          filename: process.env.DB_FILE || path.join(__dirname, '../../glidewise.db')
        };
    }
  }

  async runMigrations() {
    try {
      const [batchNo, log] = await this.knex.migrate.latest();
      if (log.length === 0) {
        console.log('Database is up to date');
      } else {
        console.log(`Ran ${log.length} migrations`);
        log.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async runSeeds() {
    try {
      const [batchNo, log] = await this.knex.seed.run();
      if (log.length === 0) {
        console.log('No seeds to run');
      } else {
        console.log(`Ran ${log.length} seeds`);
        log.forEach(seed => {
          console.log(`  - ${seed}`);
        });
      }
    } catch (error) {
      console.error('Seeding failed:', error);
      // Don't throw error for seeding failures
      console.log('Continuing without seeds...');
    }
  }

  getKnex() {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }
    return this.knex;
  }

  async close() {
    if (this.knex) {
      try {
        await this.knex.destroy();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }

  // Helper methods for common operations
  async transaction(callback) {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }
    return this.knex.transaction(callback);
  }

  async raw(sql, bindings) {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }
    return this.knex.raw(sql, bindings);
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', message: 'Database not initialized' };
      }
      
      await this.knex.raw('SELECT 1');
      return { status: 'healthy', message: 'Database connection OK' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const dbClient = process.env.DB_CLIENT || 'sqlite3';
      
      if (dbClient === 'sqlite3') {
        // SQLite specific stats
        const tables = await this.knex.raw("SELECT name FROM sqlite_master WHERE type='table'");
        const tableCount = tables.length;
        
        return {
          type: 'sqlite3',
          tableCount,
          connectionStatus: 'connected'
        };
      } else if (dbClient === 'postgresql' || dbClient === 'pg') {
        // PostgreSQL specific stats
        const tableCount = await this.knex.raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'");
        const dbSize = await this.knex.raw("SELECT pg_size_pretty(pg_database_size(current_database()))");
        
        return {
          type: 'postgresql',
          tableCount: parseInt(tableCount.rows[0].count),
          databaseSize: dbSize.rows[0].pg_size_pretty,
          connectionStatus: 'connected'
        };
      } else if (dbClient === 'mysql' || dbClient === 'mysql2') {
        // MySQL specific stats
        const tableCount = await this.knex.raw("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?", [process.env.DB_NAME || 'glidewise']);
        const dbSize = await this.knex.raw("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' FROM information_schema.tables WHERE table_schema = ?", [process.env.DB_NAME || 'glidewise']);
        
        return {
          type: 'mysql',
          tableCount: parseInt(tableCount[0].count),
          databaseSize: `${dbSize[0]['DB Size in MB']} MB`,
          connectionStatus: 'connected'
        };
      }
      
      return { type: 'unknown', connectionStatus: 'connected' };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return { type: 'unknown', connectionStatus: 'error', error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();
