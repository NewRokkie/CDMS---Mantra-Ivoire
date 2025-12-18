/**
 * Database-backed EDI Configuration Service
 * Replaces localStorage with Supabase database operations
 */

import { supabase } from '../api/supabaseClient';
import { EDIServerConfig } from './ediConfiguration';

export class EDIConfigurationDatabaseService {
  
  /**
   * Get all EDI server configurations from database
   */
  async getConfigurations(): Promise<EDIServerConfig[]> {
    try {
      const { data, error } = await supabase
        .from('edi_server_configurations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching EDI configurations:', error);
        return [];
      }

      return (data || []).map(this.mapDatabaseToConfig);
    } catch (error) {
      console.error('Error in getConfigurations:', error);
      return [];
    }
  }

  /**
   * Get a specific EDI server configuration by ID
   */
  async getConfiguration(id: string): Promise<EDIServerConfig | null> {
    try {
      const { data, error } = await supabase
        .from('edi_server_configurations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching EDI configuration:', error);
        return null;
      }

      return data ? this.mapDatabaseToConfig(data) : null;
    } catch (error) {
      console.error('Error in getConfiguration:', error);
      return null;
    }
  }

  /**
   * Save a new EDI server configuration
   */
  async saveConfiguration(config: Omit<EDIServerConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<EDIServerConfig> {
    try {
      const dbConfig = this.mapConfigToDatabase(config);
      
      const { data, error } = await supabase
        .from('edi_server_configurations')
        .insert([dbConfig])
        .select()
        .single();

      if (error) {
        console.error('Error saving EDI configuration:', error);
        throw new Error(`Failed to save configuration: ${error.message}`);
      }

      return this.mapDatabaseToConfig(data);
    } catch (error) {
      console.error('Error in saveConfiguration:', error);
      throw error;
    }
  }

  /**
   * Update an existing EDI server configuration
   */
  async updateConfiguration(id: string, updates: Partial<EDIServerConfig>): Promise<EDIServerConfig> {
    try {
      const dbUpdates = this.mapConfigToDatabase(updates);
      delete dbUpdates.id; // Don't update ID
      delete dbUpdates.created_at; // Don't update creation date
      
      const { data, error } = await supabase
        .from('edi_server_configurations')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating EDI configuration:', error);
        throw new Error(`Failed to update configuration: ${error.message}`);
      }

      return this.mapDatabaseToConfig(data);
    } catch (error) {
      console.error('Error in updateConfiguration:', error);
      throw error;
    }
  }

  /**
   * Delete an EDI server configuration
   */
  async deleteConfiguration(id: string): Promise<boolean> {
    try {
      // Don't allow deletion of default configuration
      if (id === '00000000-0000-0000-0000-000000000001') {
        throw new Error('Cannot delete default configuration');
      }

      const { error } = await supabase
        .from('edi_server_configurations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting EDI configuration:', error);
        throw new Error(`Failed to delete configuration: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteConfiguration:', error);
      throw error;
    }
  }

  /**
   * Get the default EDI server configuration
   */
  async getDefaultConfiguration(): Promise<EDIServerConfig | null> {
    try {
      const { data, error } = await supabase
        .from('edi_server_configurations')
        .select('*')
        .eq('is_default', true)
        .eq('enabled', true)
        .single();

      if (error) {
        console.error('Error fetching default EDI configuration:', error);
        return null;
      }

      return data ? this.mapDatabaseToConfig(data) : null;
    } catch (error) {
      console.error('Error in getDefaultConfiguration:', error);
      return null;
    }
  }

  /**
   * Get configuration for a specific client
   */
  async getConfigurationForClient(clientCode: string, clientName?: string): Promise<EDIServerConfig | null> {
    try {
      // First try to find a configuration with this client assigned
      const { data: assignedConfigs, error: assignedError } = await supabase
        .from('edi_server_configurations')
        .select('*')
        .eq('enabled', true);

      if (assignedError) {
        console.error('Error fetching assigned configurations:', assignedError);
        return null;
      }

      // Check if any configuration has this client assigned
      for (const config of assignedConfigs || []) {
        const assignedClients = config.assigned_clients as string[] || [];
        const normalizedAssigned = assignedClients.map(c => c.toUpperCase().trim());
        
        if (normalizedAssigned.includes(clientCode.toUpperCase().trim()) ||
            (clientName && normalizedAssigned.includes(clientName.toUpperCase().trim()))) {
          return this.mapDatabaseToConfig(config);
        }
      }

      // If no specific assignment found, return default configuration
      return await this.getDefaultConfiguration();
    } catch (error) {
      console.error('Error in getConfigurationForClient:', error);
      return null;
    }
  }

  /**
   * Test connection to an EDI server
   */
  async testConnection(config: EDIServerConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate connection test (same as original implementation)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Basic validation
      if (!config.host || !config.username) {
        return {
          success: false,
          message: 'Host and username are required'
        };
      }

      if (config.port < 1 || config.port > 65535) {
        return {
          success: false,
          message: 'Invalid port number'
        };
      }

      // Simulate different test results based on configuration
      if (config.host.includes('test') || config.testMode) {
        return {
          success: true,
          message: 'Test connection successful (test mode)'
        };
      }

      if (config.host === 'edi.example.com') {
        return {
          success: false,
          message: 'Connection failed: Host not reachable'
        };
      }

      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error}`
      };
    }
  }

  /**
   * Validate configuration data
   */
  validateConfiguration(config: Partial<EDIServerConfig>): string[] {
    const errors: string[] = [];

    if (!config.name?.trim()) {
      errors.push('Name is required');
    }

    if (!config.host?.trim()) {
      errors.push('Host is required');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Valid port number (1-65535) is required');
    }

    if (!config.username?.trim()) {
      errors.push('Username is required');
    }

    if (!config.remotePath?.trim()) {
      errors.push('Remote path is required');
    }

    if (!config.partnerCode?.trim()) {
      errors.push('Partner code is required');
    }

    if (!config.senderCode?.trim()) {
      errors.push('Sender code is required');
    }

    if (!config.fileNamePattern?.trim()) {
      errors.push('File name pattern is required');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push('Timeout must be between 1000ms and 300000ms');
    }

    if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      errors.push('Retry attempts must be between 0 and 10');
    }

    return errors;
  }

  /**
   * Map database row to EDIServerConfig
   */
  private mapDatabaseToConfig(dbRow: any): EDIServerConfig {
    return {
      id: dbRow.id,
      name: dbRow.name,
      type: dbRow.type as 'FTP' | 'SFTP',
      host: dbRow.host,
      port: dbRow.port,
      username: dbRow.username,
      password: dbRow.password || '',
      remotePath: dbRow.remote_path,
      enabled: dbRow.enabled,
      testMode: dbRow.test_mode,
      timeout: dbRow.timeout,
      retryAttempts: dbRow.retry_attempts,
      partnerCode: dbRow.partner_code,
      senderCode: dbRow.sender_code,
      fileNamePattern: dbRow.file_name_pattern,
      assignedClients: Array.isArray(dbRow.assigned_clients) ? dbRow.assigned_clients : [],
      isDefault: dbRow.is_default,
      createdAt: new Date(dbRow.created_at),
      updatedAt: new Date(dbRow.updated_at)
    };
  }

  /**
   * Map EDIServerConfig to database row
   */
  private mapConfigToDatabase(config: Partial<EDIServerConfig>): any {
    const dbRow: any = {};

    if (config.id !== undefined) dbRow.id = config.id;
    if (config.name !== undefined) dbRow.name = config.name;
    if (config.type !== undefined) dbRow.type = config.type;
    if (config.host !== undefined) dbRow.host = config.host;
    if (config.port !== undefined) dbRow.port = config.port;
    if (config.username !== undefined) dbRow.username = config.username;
    if (config.password !== undefined) dbRow.password = config.password;
    if (config.remotePath !== undefined) dbRow.remote_path = config.remotePath;
    if (config.enabled !== undefined) dbRow.enabled = config.enabled;
    if (config.testMode !== undefined) dbRow.test_mode = config.testMode;
    if (config.timeout !== undefined) dbRow.timeout = config.timeout;
    if (config.retryAttempts !== undefined) dbRow.retry_attempts = config.retryAttempts;
    if (config.partnerCode !== undefined) dbRow.partner_code = config.partnerCode;
    if (config.senderCode !== undefined) dbRow.sender_code = config.senderCode;
    if (config.fileNamePattern !== undefined) dbRow.file_name_pattern = config.fileNamePattern;
    if (config.assignedClients !== undefined) dbRow.assigned_clients = config.assignedClients;
    if (config.isDefault !== undefined) dbRow.is_default = config.isDefault;

    return dbRow;
  }

  /**
   * Export configurations to JSON
   */
  async exportConfigurations(): Promise<string> {
    const configs = await this.getConfigurations();
    return JSON.stringify(configs, null, 2);
  }

  /**
   * Import configurations from JSON
   */
  async importConfigurations(jsonData: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
    try {
      const configs = JSON.parse(jsonData) as EDIServerConfig[];
      const errors: string[] = [];
      let imported = 0;

      for (const config of configs) {
        try {
          const validationErrors = this.validateConfiguration(config);
          if (validationErrors.length > 0) {
            errors.push(`Config "${config.name}": ${validationErrors.join(', ')}`);
            continue;
          }

          // Remove id to force new ID generation
          const { id, createdAt, updatedAt, ...configData } = config;
          await this.saveConfiguration(configData);
          imported++;
        } catch (error) {
          errors.push(`Config "${config.name}": ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        imported,
        errors
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [`Invalid JSON format: ${error}`]
      };
    }
  }

  /**
   * Get available clients for assignment
   */
  async getAvailableClients(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('name')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching available clients:', error);
        return [];
      }

      return (data || []).map(client => client.name);
    } catch (error) {
      console.error('Error in getAvailableClients:', error);
      return [];
    }
  }

  /**
   * Search clients by name or code
   */
  async searchClients(query: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('name, code')
        .eq('active', true)
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .order('name')
        .limit(20);

      if (error) {
        console.error('Error searching clients:', error);
        return [];
      }

      return (data || []).map(client => client.name);
    } catch (error) {
      console.error('Error in searchClients:', error);
      return [];
    }
  }

  /**
   * Diagnose configurations for debugging
   */
  async diagnoseConfigurations(): Promise<{
    total: number;
    enabled: number;
    withClients: number;
    withoutClients: number;
    invalidClients: number;
    details: Array<{
      id: string;
      name: string;
      enabled: boolean;
      clientsCount: number;
      hasValidClients: boolean;
      issues: string[];
    }>;
  }> {
    try {
      const configs = await this.getConfigurations();
      const details: Array<{
        id: string;
        name: string;
        enabled: boolean;
        clientsCount: number;
        hasValidClients: boolean;
        issues: string[];
      }> = [];

      let total = 0;
      let enabled = 0;
      let withClients = 0;
      let withoutClients = 0;
      let invalidClients = 0;

      for (const config of configs) {
        total++;
        
        const issues: string[] = [];
        let hasValidClients = true;
        let clientsCount = 0;

        if (config.enabled) {
          enabled++;
        }

        // Vérifier assignedClients
        if (!config.assignedClients) {
          issues.push('assignedClients is undefined/null');
          hasValidClients = false;
          invalidClients++;
        } else if (!Array.isArray(config.assignedClients)) {
          issues.push('assignedClients is not an array');
          hasValidClients = false;
          invalidClients++;
        } else {
          clientsCount = config.assignedClients.length;
          if (clientsCount > 0) {
            withClients++;
          } else {
            withoutClients++;
          }
        }

        details.push({
          id: config.id,
          name: config.name,
          enabled: config.enabled,
          clientsCount,
          hasValidClients,
          issues
        });
      }

      return {
        total,
        enabled,
        withClients,
        withoutClients,
        invalidClients,
        details
      };
    } catch (error) {
      console.error('Error diagnosing configurations:', error);
      return {
        total: 0,
        enabled: 0,
        withClients: 0,
        withoutClients: 0,
        invalidClients: 0,
        details: []
      };
    }
  }

  /**
   * Reset configurations (delete all non-default configurations)
   */
  async resetConfigurations(): Promise<void> {
    try {
      // Get all configurations except default
      const { data, error } = await supabase
        .from('edi_server_configurations')
        .select('id')
        .neq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        throw new Error(`Failed to fetch configurations: ${error.message}`);
      }

      // Delete all non-default configurations
      if (data && data.length > 0) {
        const { error: deleteError } = await supabase
          .from('edi_server_configurations')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000001');

        if (deleteError) {
          throw new Error(`Failed to delete configurations: ${deleteError.message}`);
        }
      }

      // Reset default configuration to original state
      const { error: updateError } = await supabase
        .from('edi_server_configurations')
        .update({
          name: 'Local EDI Server',
          type: 'FTP',
          host: '10.80.22.118',
          port: 21,
          username: 'habib.sayegh',
          password: 'root',
          remote_path: '/ftp_output',
          enabled: true,
          test_mode: true,
          timeout: 30000,
          retry_attempts: 3,
          partner_code: 'LOCAL',
          sender_code: 'HABIBSAY',
          file_name_pattern: 'CODECO_{timestamp}_{container}_{operation}.edi',
          assigned_clients: [],
          is_default: true
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (updateError) {
        throw new Error(`Failed to reset default configuration: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error resetting configurations:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const ediConfigurationDatabaseService = new EDIConfigurationDatabaseService();