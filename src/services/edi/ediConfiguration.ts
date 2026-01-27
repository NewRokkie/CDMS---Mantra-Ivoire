/**
 * Service de configuration EDI pour la gestion des serveurs FTP/SFTP
 */

export interface EDIServerConfig {
  id: string;
  name: string;
  type: 'FTP' | 'SFTP';
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
  enabled: boolean;
  testMode: boolean;
  timeout: number;
  retryAttempts: number;
  partnerCode: string;
  senderCode: string;
  fileNamePattern: string;
  assignedClients: string[]; // Liste des codes clients assignés à ce serveur
  isDefault: boolean; // Serveur par défaut si aucun client spécifique trouvé
  createdAt: Date;
  updatedAt: Date;
}

export interface EDIConfigurationService {
  getConfigurations(): EDIServerConfig[];
  getConfiguration(id: string): EDIServerConfig | null;
  saveConfiguration(config: Omit<EDIServerConfig, 'id' | 'createdAt' | 'updatedAt'>): EDIServerConfig;
  updateConfiguration(id: string, config: Partial<EDIServerConfig>): EDIServerConfig;
  deleteConfiguration(id: string): boolean;
  testConnection(config: EDIServerConfig): Promise<{ success: boolean; message: string }>;
  getDefaultConfiguration(): EDIServerConfig;
}

class EDIConfigurationServiceImpl implements EDIConfigurationService {
  private configurations: Map<string, EDIServerConfig> = new Map();
  private readonly STORAGE_KEY = 'edi_configurations';

  constructor() {
    this.loadConfigurations();
    this.initializeDefaultConfiguration();
  }

  private loadConfigurations(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const configs = JSON.parse(stored);
        configs.forEach((config: EDIServerConfig) => {
          // Convert date strings back to Date objects
          config.createdAt = new Date(config.createdAt);
          config.updatedAt = new Date(config.updatedAt);
          
          // Migration: Ensure assignedClients and isDefault exist
          if (!config.assignedClients) {
            config.assignedClients = [];
          }
          if (typeof config.isDefault !== 'boolean') {
            config.isDefault = config.id === 'default';
          }
          
          this.configurations.set(config.id, config);
        });
      }
    } catch (error) {
      console.error('Failed to load EDI configurations:', error);
    }
  }

  private saveConfigurations(): void {
    try {
      const configs = Array.from(this.configurations.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save EDI configurations:', error);
    }
  }

  private initializeDefaultConfiguration(): void {
    if (this.configurations.size === 0) {
      // Configuration par défaut uniquement
      const defaultConfig: EDIServerConfig = {
        id: 'default',
        name: 'Default EDI Server',
        type: 'SFTP',
        host: 'edi.depot.local',
        port: 22,
        username: 'depot_user',
        password: '',
        remotePath: '/incoming/codeco',
        enabled: true,
        testMode: true,
        timeout: 30000,
        retryAttempts: 3,
        partnerCode: 'DEPOT',
        senderCode: 'DEPOT001',
        fileNamePattern: 'CODECO_{timestamp}_{container}_{operation}.edi',
        assignedClients: [],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.configurations.set(defaultConfig.id, defaultConfig);
      this.saveConfigurations();
    }
  }

  getConfigurations(): EDIServerConfig[] {
    return Array.from(this.configurations.values());
  }

  getConfiguration(id: string): EDIServerConfig | null {
    return this.configurations.get(id) || null;
  }

  saveConfiguration(config: Omit<EDIServerConfig, 'id' | 'createdAt' | 'updatedAt'>): EDIServerConfig {
    const id = this.generateId();
    const now = new Date();
    const newConfig: EDIServerConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.configurations.set(id, newConfig);
    this.saveConfigurations();
    return newConfig;
  }

  updateConfiguration(id: string, updates: Partial<EDIServerConfig>): EDIServerConfig {
    const existing = this.configurations.get(id);
    if (!existing) {
      throw new Error(`Configuration with id ${id} not found`);
    }

    const updated: EDIServerConfig = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

    this.configurations.set(id, updated);
    this.saveConfigurations();
    return updated;
  }

  deleteConfiguration(id: string): boolean {
    if (id === 'default') {
      throw new Error('Cannot delete default configuration');
    }

    const deleted = this.configurations.delete(id);
    if (deleted) {
      this.saveConfigurations();
    }
    return deleted;
  }

  async testConnection(config: EDIServerConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate connection test
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
      if (config.testMode) {
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

  getDefaultConfiguration(): EDIServerConfig {
    const defaultConfig = this.configurations.get('default');
    if (!defaultConfig) {
      throw new Error('Default configuration not found');
    }
    return defaultConfig;
  }

  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Validation methods
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

    if (config.assignedClients && !Array.isArray(config.assignedClients)) {
      errors.push('Assigned clients must be an array');
    }

    if (typeof config.isDefault !== 'boolean') {
      errors.push('isDefault must be a boolean value');
    }

    return errors;
  }

  // Méthode de nettoyage pour forcer la réinitialisation
  resetConfigurations(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.configurations.clear();
    this.initializeDefaultConfiguration();
  }

  // Méthode de diagnostic pour debugging
  diagnoseConfigurations(): {
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
  } {
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

    for (const config of this.configurations.values()) {
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

      // Vérifier isDefault
      if (typeof config.isDefault !== 'boolean') {
        issues.push('isDefault is not a boolean');
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
  }

  // Export/Import functionality
  exportConfigurations(): string {
    const configs = this.getConfigurations();
    return JSON.stringify(configs, null, 2);
  }

  importConfigurations(jsonData: string): { success: boolean; imported: number; errors: string[] } {
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
          this.saveConfiguration(configData);
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

  // Méthodes pour la gestion des clients
  getConfigurationForClient(clientName: string, clientCode?: string): EDIServerConfig | null {
    // Normaliser les noms de clients pour la recherche
    const normalizedClientName = clientName.toUpperCase().trim();
    const normalizedClientCode = clientCode?.toUpperCase().trim();

    // Chercher une configuration avec ce client assigné
    for (const config of this.configurations.values()) {
      if (!config.enabled) continue;

      // Vérifier que assignedClients existe et est un tableau
      if (!config.assignedClients || !Array.isArray(config.assignedClients)) {
        continue;
      }

      const assignedClients = config.assignedClients.map(c => c.toUpperCase().trim());
      
      // Vérifier par nom de client
      if (assignedClients.includes(normalizedClientName)) {
        return config;
      }

      // Vérifier par code client si disponible
      if (normalizedClientCode && assignedClients.includes(normalizedClientCode)) {
        return config;
      }

      // Vérifier les correspondances partielles pour les noms longs
      if (assignedClients.some(assigned => 
        normalizedClientName.includes(assigned) || assigned.includes(normalizedClientName)
      )) {
        return config;
      }
    }

    // Retourner la configuration par défaut si aucune correspondance
    return this.getDefaultConfiguration();
  }

  assignClientToConfiguration(configId: string, clientName: string): boolean {
    const config = this.configurations.get(configId);
    if (!config) return false;

    const normalizedClient = clientName.toUpperCase().trim();
    
    // Vérifier si le client n'est pas déjà assigné
    if (!config.assignedClients.map(c => c.toUpperCase()).includes(normalizedClient)) {
      config.assignedClients.push(clientName);
      config.updatedAt = new Date();
      this.saveConfigurations();
    }

    return true;
  }

  removeClientFromConfiguration(configId: string, clientName: string): boolean {
    const config = this.configurations.get(configId);
    if (!config) return false;

    const normalizedClient = clientName.toUpperCase().trim();
    const index = config.assignedClients.findIndex(c => c.toUpperCase() === normalizedClient);
    
    if (index !== -1) {
      config.assignedClients.splice(index, 1);
      config.updatedAt = new Date();
      this.saveConfigurations();
      return true;
    }

    return false;
  }

  getClientsForConfiguration(configId: string): string[] {
    const config = this.configurations.get(configId);
    return config ? [...config.assignedClients] : [];
  }

  getAllAssignedClients(): { [configId: string]: string[] } {
    const result: { [configId: string]: string[] } = {};
    
    for (const [id, config] of this.configurations.entries()) {
      if (config.assignedClients && Array.isArray(config.assignedClients) && config.assignedClients.length > 0) {
        result[id] = [...config.assignedClients];
      }
    }

    return result;
  }

  // Méthodes utilitaires pour les clients - maintenant utilise les données réelles
  async getAvailableClients(): Promise<string[]> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { ediDatabaseService } = await import('./ediDatabaseService');
      const clients = await ediDatabaseService.getClients();
      return clients.map(client => client.name);
    } catch (error) {
      console.error('Error fetching available clients:', error);
      return [];
    }
  }

  async searchClients(query: string): Promise<string[]> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { ediDatabaseService } = await import('./ediDatabaseService');
      const clients = await ediDatabaseService.searchClients(query);
      return clients.map(client => client.name);
    } catch (error) {
      console.error('Error searching clients:', error);
      return [];
    }
  }
}

export const ediConfigurationService = new EDIConfigurationServiceImpl();