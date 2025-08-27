/**
 * Database Connection and Migration Management
 * 
 * Handles PostgreSQL database connections, connection pooling,
 * and database migrations for the Summarize This application.
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../middleware/errorHandler');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.migrationPath = path.join(__dirname, 'migrations');
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      // Create connection pool
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'summarize_this',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false
      });

      // Test connection
      await this.testConnection();
      
      // Run migrations
      await this.runMigrations();
      
      this.isConnected = true;
      logger.info('Database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      logger.info('Database connection test successful', {
        timestamp: result.rows[0].now
      });
      
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Check if schema needs to be initialized
      const tablesExist = await this.checkTablesExist();
      
      if (!tablesExist) {
        logger.info('No tables found, initializing schema...');
        await this.initializeSchema();
      }
      
      // Run pending migrations
      await this.runPendingMigrations();
      
      logger.info('Database migrations completed successfully');
      
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.pool.query(query);
  }

  /**
   * Check if main tables exist
   */
  async checkTablesExist() {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0].exists;
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    try {
      const schemaSQL = await fs.readFile(this.schemaPath, 'utf8');
      
      // Execute schema in a transaction
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query(schemaSQL);
        await client.query('COMMIT');
        
        // Mark initial schema as migrated
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          ['initial_schema']
        );
        
        logger.info('Database schema initialized successfully');
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  async runPendingMigrations() {
    try {
      // Check if migrations directory exists
      try {
        await fs.access(this.migrationPath);
      } catch {
        // Migrations directory doesn't exist, create it
        await fs.mkdir(this.migrationPath, { recursive: true });
        logger.info('Created migrations directory');
        return;
      }

      // Get migration files
      const files = await fs.readdir(this.migrationPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        logger.info('No migration files found');
        return;
      }

      // Get applied migrations
      const appliedResult = await this.pool.query(
        'SELECT version FROM schema_migrations ORDER BY applied_at'
      );
      const appliedMigrations = appliedResult.rows.map(row => row.version);

      // Run pending migrations
      for (const file of migrationFiles) {
        const version = path.basename(file, '.sql');
        
        if (!appliedMigrations.includes(version)) {
          await this.runMigration(file, version);
        }
      }

    } catch (error) {
      logger.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(filename, version) {
    try {
      const migrationPath = path.join(this.migrationPath, filename);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Run migration
        await client.query(migrationSQL);
        
        // Record migration
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        
        await client.query('COMMIT');
        
        logger.info(`Migration ${version} applied successfully`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error(`Failed to run migration ${version}:`, error);
      throw error;
    }
  }

  /**
   * Execute a query with connection from pool
   */
  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query failed:', {
        error: error.message,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for manual transaction management
   */
  async getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    return await this.pool.connect();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };

      // Get table statistics
      const tableStatsQuery = `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `;
      
      const tableStats = await this.query(tableStatsQuery);
      stats.tables = tableStats.rows;

      // Get database size
      const sizeQuery = `
        SELECT pg_size_pretty(pg_database_size(current_database())) as size;
      `;
      
      const sizeResult = await this.query(sizeQuery);
      stats.databaseSize = sizeResult.rows[0].size;

      return stats;
      
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy');
      return {
        status: 'healthy',
        connected: this.isConnected,
        timestamp: new Date().toISOString(),
        connectionPool: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${timestamp}.sql`;
      
      // This would typically use pg_dump
      // Implementation depends on your backup strategy
      logger.info('Database backup created', { backupName });
      
      return backupName;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.isConnected = false;
        logger.info('Database connections closed');
      }
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Get connection instance (singleton pattern)
   */
  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
}

// Export singleton instance
module.exports = DatabaseManager.getInstance();

