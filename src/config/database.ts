/**
 * Database Configuration for CDMS PostgreSQL Connection
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number; // Maximum number of clients in the pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Default database configuration
export const defaultDatabaseConfig: DatabaseConfig = {
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
  database: import.meta.env.VITE_DB_NAME || 'cdms_db',
  user: import.meta.env.VITE_DB_USER || 'postgres',
  password: import.meta.env.VITE_DB_PASSWORD || 'postgres',
  ssl: import.meta.env.VITE_DB_SSL === 'true',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Database error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public detail?: string,
    public hint?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, code?: string, detail?: string) {
    super(message, code, detail);
    this.name = 'QueryError';
  }
}

// Database connection status
export interface DatabaseStatus {
  isConnected: boolean;
  host: string;
  database: string;
  lastChecked: Date;
  error?: string;
}

// Query result type
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  duration?: number;
}

// Transaction options
export interface TransactionOptions {
  isolation?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readonly?: boolean;
}
