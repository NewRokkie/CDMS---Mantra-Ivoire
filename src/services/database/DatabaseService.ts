/**
 * Database Service - API Client for PostgreSQL Backend
 * Provides a centralized database interface for all CDMS modules
 * Communicates with backend API that handles PostgreSQL connections
 */

import {
  DatabaseError,
  ConnectionError,
  QueryError,
  QueryResult,
  DatabaseStatus
} from '../../config/database';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rowCount?: number;
  duration?: number;
}

export class DatabaseService {
  protected baseUrl: string;
  protected isInitialized = false;
  protected lastConnectionCheck: Date | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  /**
   * Initialize database service - check API connectivity
   */
  async initialize(): Promise<void> {
    try {
      await this.testConnection();
      this.isInitialized = true;
      console.log('✅ Database API service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      throw new ConnectionError(`Failed to connect to API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<DatabaseStatus> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const duration = Date.now() - start;

      this.lastConnectionCheck = new Date();

      console.log(`✅ Database API connection test successful (${duration}ms)`);

      return {
        isConnected: true,
        host: this.baseUrl,
        database: 'cdms_db',
        lastChecked: this.lastConnectionCheck,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      console.error('❌ Database API connection test failed:', errorMessage);

      return {
        isConnected: false,
        host: this.baseUrl,
        database: 'cdms_db',
        lastChecked: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Execute a SQL query via API
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
        },
        body: JSON.stringify({ query: text, params }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new QueryError(errorData.error || `HTTP ${response.status}`, response.status.toString());
      }

      const result: ApiResponse<T[]> = await response.json();
      const duration = Date.now() - start;

      if (!result.success) {
        throw new QueryError(result.error || 'Query execution failed');
      }

      return {
        rows: result.data || [],
        rowCount: result.rowCount || 0,
        command: 'SELECT', // API would provide this
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - start;
      console.error(`❌ Query failed (${duration}ms):`, {
        query: text,
        params,
        error: error.message,
      });

      if (error instanceof QueryError) {
        throw error;
      }

      throw new QueryError(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Execute query with a single row result
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction<T>(operations: Array<{ query: string; params?: any[] }>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ operations }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Transaction failed' }));
      throw new QueryError(errorData.error || `Transaction failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new QueryError(result.error || 'Transaction execution failed');
    }

    return result.data as T;
  }

  /**
   * Insert a single record
   */
  async insert<T = any>(
    table: string,
    data: Record<string, any>,
    returning = '*'
  ): Promise<T | null> {
    const dataWithUser = this.addUserContext(data);

    const response = await fetch(`${this.baseUrl}/tables/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ data: dataWithUser, returning }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Insert failed' }));
      throw new QueryError(errorData.error || `Insert failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();
    return result.success ? result.data || null : null;
  }

  /**
   * Update records
   */
  async update<T = any>(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
    returning = '*'
  ): Promise<T[]> {
    const dataWithUser = this.addUserContext(data);

    const response = await fetch(`${this.baseUrl}/tables/${table}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ data: dataWithUser, where, returning }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Update failed' }));
      throw new QueryError(errorData.error || `Update failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<T[]> = await response.json();
    return result.success ? result.data || [] : [];
  }

  /**
   * Delete records
   */
  async delete<T = any>(
    table: string,
    where: Record<string, any>,
    returning = '*'
  ): Promise<T[]> {
    const response = await fetch(`${this.baseUrl}/tables/${table}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ where, returning }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new QueryError(errorData.error || `Delete failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<T[]> = await response.json();
    return result.success ? result.data || [] : [];
  }

  /**
   * Select records with optional conditions
   */
  async select<T = any>(
    table: string,
    columns = '*',
    where?: Record<string, any>,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    const queryParams = new URLSearchParams();

    if (columns !== '*') queryParams.set('columns', columns);
    if (where) queryParams.set('where', JSON.stringify(where));
    if (orderBy) queryParams.set('orderBy', orderBy);
    if (limit) queryParams.set('limit', limit.toString());
    if (offset) queryParams.set('offset', offset.toString());

    const response = await fetch(`${this.baseUrl}/tables/${table}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Select failed' }));
      throw new QueryError(errorData.error || `Select failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<T[]> = await response.json();
    return result.success ? result.data || [] : [];
  }

  /**
   * Select a single record
   */
  async selectOne<T = any>(
    table: string,
    columns = '*',
    where: Record<string, any>
  ): Promise<T | null> {
    const results = await this.select<T>(table, columns, where, undefined, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Check if record exists
   */
  async exists(table: string, where: Record<string, any>): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/tables/${table}/exists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ where }),
    });

    if (!response.ok) {
      throw new QueryError(`Exists check failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<boolean> = await response.json();
    return result.success ? result.data || false : false;
  }

  /**
   * Get count of records
   */
  async count(table: string, where?: Record<string, any>): Promise<number> {
    const response = await fetch(`${this.baseUrl}/tables/${table}/count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ where }),
    });

    if (!response.ok) {
      throw new QueryError(`Count failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<number> = await response.json();
    return result.success ? result.data || 0 : 0;
  }

  /**
   * Execute a custom view query
   */
  async queryView<T = any>(viewName: string, where?: Record<string, any>): Promise<T[]> {
    return this.select<T>(viewName, '*', where);
  }

  /**
   * Execute a stored procedure
   */
  async callProcedure<T = any>(
    procedureName: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    const response = await fetch(`${this.baseUrl}/procedures/${procedureName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
      body: JSON.stringify({ params }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Procedure call failed' }));
      throw new QueryError(errorData.error || `Procedure call failed: HTTP ${response.status}`);
    }

    const result: ApiResponse<T[]> = await response.json();

    return {
      rows: result.data || [],
      rowCount: result.rowCount || 0,
      command: 'SELECT',
      duration: result.duration,
    };
  }

  /**
   * Get connection status
   */
  getStatus(): DatabaseStatus {
    return {
      isConnected: this.isInitialized,
      host: this.baseUrl,
      database: 'cdms_db',
      lastChecked: this.lastConnectionCheck || new Date(),
    };
  }

  /**
   * Health check - verify API is responding
   */
  async healthCheck(): Promise<boolean> {
    try {
      const status = await this.testConnection();
      return status.isConnected;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalTables: number;
    totalViews: number;
    totalIndexes: number;
    databaseSize: string;
  }> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
      },
    });

    if (!response.ok) {
      throw new QueryError(`Stats request failed: HTTP ${response.status}`);
    }

    const result: ApiResponse = await response.json();
    return result.data || {
      totalTables: 0,
      totalViews: 0,
      totalIndexes: 0,
      databaseSize: '0 bytes',
    };
  }

  /**
   * Generic API request helper
   */
  protected async apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('depot_token')}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new QueryError(errorData.error || `Request failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get current user info from token
   */
  protected getCurrentUserId(): string | null {
    const token = localStorage.getItem('depot_token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Add user context to data operations
   */
  protected addUserContext(data: Record<string, any>): Record<string, any> {
    const userId = this.getCurrentUserId();
    return {
      ...data,
      updated_by: userId,
      ...(data.created_by === undefined && { created_by: userId }),
    };
  }
}

// For development: Mock API responses when backend is not available
export class MockDatabaseService extends DatabaseService {
  private mockData: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize with empty collections that match our schema
    this.mockData.set('users', [
      {
        id: 'admin-001',
        email: 'admin@depot.com',
        password_hash: '$2b$10$demo.hash.for.demo123', // demo123
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'supervisor-001',
        email: 'supervisor@depot.com',
        password_hash: '$2b$10$demo.hash.for.demo123', // demo123
        first_name: 'Operations',
        last_name: 'Supervisor',
        role: 'supervisor',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'operator-001',
        email: 'operator@depot.com',
        password_hash: '$2b$10$demo.hash.for.demo123', // demo123
        first_name: 'Gate',
        last_name: 'Operator',
        role: 'operator',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'client-001',
        email: 'client2@maersk.com',
        password_hash: '$2b$10$demo.hash.for.demo123', // demo123
        first_name: 'Client',
        last_name: 'Portal User',
        role: 'client',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);
    this.mockData.set('yards', []);
    this.mockData.set('clients', []);
    this.mockData.set('containers', []);
    this.mockData.set('client_pools', []);
    this.mockData.set('release_orders', []);
    this.mockData.set('booking_references', []);
    this.mockData.set('gate_in_operations', []);
    this.mockData.set('gate_out_operations', []);
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('🧪 Mock Database Service initialized for development');
  }

  async testConnection(): Promise<DatabaseStatus> {
    return {
      isConnected: true,
      host: 'mock://localhost',
      database: 'cdms_db_mock',
      lastChecked: new Date(),
    };
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    // Simple mock implementation
    console.log('🧪 Mock query:', text, params);

    return {
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      duration: Math.random() * 50,
    };
  }

  async select<T = any>(
    table: string,
    columns = '*',
    where?: Record<string, any>
  ): Promise<T[]> {
    const data = this.mockData.get(table) || [];

    if (!where || Object.keys(where).length === 0) {
      return data as T[];
    }

    // Simple filtering for mock data
    return data.filter((item: any) => {
      return Object.entries(where).every(([key, value]) => item[key] === value);
    }) as T[];
  }

  async insert<T = any>(
    table: string,
    data: Record<string, any>
  ): Promise<T | null> {
    const collection = this.mockData.get(table) || [];
    const newRecord = {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    collection.push(newRecord);
    this.mockData.set(table, collection);

    console.log(`🧪 Mock insert into ${table}:`, newRecord);
    return newRecord as T;
  }

  async update<T = any>(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<T[]> {
    const collection = this.mockData.get(table) || [];
    const updated: T[] = [];

    for (let i = 0; i < collection.length; i++) {
      const item = collection[i];
      const matches = Object.entries(where).every(([key, value]) => item[key] === value);

      if (matches) {
        collection[i] = {
          ...item,
          ...data,
          updated_at: new Date().toISOString(),
        };
        updated.push(collection[i] as T);
      }
    }

    this.mockData.set(table, collection);
    console.log(`🧪 Mock update in ${table}:`, updated);
    return updated;
  }

  async delete<T = any>(
    table: string,
    where: Record<string, any>
  ): Promise<T[]> {
    const collection = this.mockData.get(table) || [];
    const deleted: T[] = [];

    const remaining = collection.filter((item: any) => {
      const matches = Object.entries(where).every(([key, value]) => item[key] === value);
      if (matches) {
        deleted.push(item as T);
      }
      return !matches;
    });

    this.mockData.set(table, remaining);
    console.log(`🧪 Mock delete from ${table}:`, deleted);
    return deleted;
  }
}

// Use mock service in development when backend is not available
const isDevelopment = import.meta.env.DEV;
const useMockService = isDevelopment && !import.meta.env.VITE_API_BASE_URL;

export const dbService = useMockService ? new MockDatabaseService() : new DatabaseService();

// Initialize service
dbService.initialize().catch(error => {
  console.error('Failed to initialize database service:', error);
});
