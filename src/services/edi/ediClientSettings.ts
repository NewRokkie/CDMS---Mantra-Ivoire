/**
 * Service de gestion des paramètres EDI par client
 */

export interface EDIClientSettings {
  id: string;
  clientName: string;
  clientCode?: string;
  ediEnabled: boolean; // Le client reçoit-il des EDI ?
  gateInEdi: boolean;  // EDI pour Gate In
  gateOutEdi: boolean; // EDI pour Gate Out
  priority: 'high' | 'normal' | 'low'; // Priorité de transmission
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EDIClientSettingsService {
  getClientSettings(clientName: string, clientCode?: string): EDIClientSettings | null;
  createClientSettings(settings: Omit<EDIClientSettings, 'id' | 'createdAt' | 'updatedAt'>): EDIClientSettings;
  updateClientSettings(id: string, settings: Partial<EDIClientSettings>): EDIClientSettings;
  deleteClientSettings(id: string): boolean;
  getAllClientSettings(): EDIClientSettings[];
  isEdiEnabledForClient(clientName: string, clientCode?: string, operation?: 'GATE_IN' | 'GATE_OUT'): boolean;
  getEdiEnabledClients(): EDIClientSettings[];
}

class EDIClientSettingsServiceImpl implements EDIClientSettingsService {
  private clientSettings: Map<string, EDIClientSettings> = new Map();
  private readonly STORAGE_KEY = 'edi_client_settings';

  constructor() {
    this.loadClientSettings();
    this.initializeDefaultSettings();
  }

  private loadClientSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        settings.forEach((setting: EDIClientSettings) => {
          // Convert date strings back to Date objects
          setting.createdAt = new Date(setting.createdAt);
          setting.updatedAt = new Date(setting.updatedAt);
          this.clientSettings.set(setting.id, setting);
        });
      }
    } catch (error) {
      console.error('Failed to load EDI client settings:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const settings = Array.from(this.clientSettings.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save EDI client settings:', error);
    }
  }

  private initializeDefaultSettings(): void {
    // Ne plus initialiser de données de test
    // Les paramètres EDI seront basés sur les données réelles de la base de données
    console.log('EDI Client Settings initialized - using real database data');
  }

  getClientSettings(clientName: string, clientCode?: string): EDIClientSettings | null {
    const normalizedClientName = clientName.toUpperCase().trim();
    const normalizedClientCode = clientCode?.toUpperCase().trim();

    // Recherche par correspondance exacte
    for (const setting of this.clientSettings.values()) {
      const settingName = setting.clientName.toUpperCase().trim();
      const settingCode = setting.clientCode?.toUpperCase().trim();

      // Correspondance exacte par nom
      if (settingName === normalizedClientName) {
        return setting;
      }

      // Correspondance exacte par code
      if (normalizedClientCode && settingCode === normalizedClientCode) {
        return setting;
      }

      // Correspondance partielle par nom
      if (settingName.includes(normalizedClientName) || normalizedClientName.includes(settingName)) {
        return setting;
      }
    }

    return null;
  }

  createClientSettings(settings: Omit<EDIClientSettings, 'id' | 'createdAt' | 'updatedAt'>): EDIClientSettings {
    const id = this.generateId();
    const now = new Date();
    const newSettings: EDIClientSettings = {
      ...settings,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.clientSettings.set(id, newSettings);
    this.saveToStorage();
    return newSettings;
  }

  updateClientSettings(id: string, updates: Partial<EDIClientSettings>): EDIClientSettings {
    const existing = this.clientSettings.get(id);
    if (!existing) {
      throw new Error(`Client settings with id ${id} not found`);
    }

    const updated: EDIClientSettings = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date()
    };

    this.clientSettings.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  deleteClientSettings(id: string): boolean {
    const deleted = this.clientSettings.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  getAllClientSettings(): EDIClientSettings[] {
    return Array.from(this.clientSettings.values());
  }

  isEdiEnabledForClient(clientName: string, clientCode?: string, operation?: 'GATE_IN' | 'GATE_OUT'): boolean {
    // D'abord vérifier les paramètres locaux
    const settings = this.getClientSettings(clientName, clientCode);
    
    if (settings) {
      if (!settings.ediEnabled) {
        return false;
      }

      if (operation === 'GATE_IN') {
        return settings.gateInEdi;
      }

      if (operation === 'GATE_OUT') {
        return settings.gateOutEdi;
      }

      // Si aucune opération spécifiée, retourner true si au moins une opération est activée
      return settings.gateInEdi || settings.gateOutEdi;
    }

    // Si pas de paramètres locaux, vérifier dans la base de données
    // Cette vérification sera faite de manière asynchrone dans les services appelants
    return false;
  }

  getEdiEnabledClients(): EDIClientSettings[] {
    return Array.from(this.clientSettings.values()).filter(setting => setting.ediEnabled);
  }

  // Méthodes utilitaires
  private generateId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Validation
  validateClientSettings(settings: Partial<EDIClientSettings>): string[] {
    const errors: string[] = [];

    if (!settings.clientName?.trim()) {
      errors.push('Client name is required');
    }

    if (typeof settings.ediEnabled !== 'boolean') {
      errors.push('EDI enabled must be a boolean value');
    }

    if (typeof settings.gateInEdi !== 'boolean') {
      errors.push('Gate In EDI must be a boolean value');
    }

    if (typeof settings.gateOutEdi !== 'boolean') {
      errors.push('Gate Out EDI must be a boolean value');
    }

    if (settings.priority && !['high', 'normal', 'low'].includes(settings.priority)) {
      errors.push('Priority must be high, normal, or low');
    }

    return errors;
  }

  // Méthodes de recherche et filtrage
  searchClients(query: string): EDIClientSettings[] {
    const normalizedQuery = query.toUpperCase().trim();
    return Array.from(this.clientSettings.values()).filter(setting =>
      setting.clientName.toUpperCase().includes(normalizedQuery) ||
      (setting.clientCode && setting.clientCode.toUpperCase().includes(normalizedQuery))
    );
  }

  getClientsByEdiStatus(ediEnabled: boolean): EDIClientSettings[] {
    return Array.from(this.clientSettings.values()).filter(setting => setting.ediEnabled === ediEnabled);
  }

  getClientsByOperation(operation: 'GATE_IN' | 'GATE_OUT'): EDIClientSettings[] {
    return Array.from(this.clientSettings.values()).filter(setting => {
      if (operation === 'GATE_IN') return setting.gateInEdi;
      if (operation === 'GATE_OUT') return setting.gateOutEdi;
      return false;
    });
  }

  // Export/Import
  exportClientSettings(): string {
    const settings = this.getAllClientSettings();
    return JSON.stringify(settings, null, 2);
  }

  importClientSettings(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const settings = JSON.parse(jsonData) as EDIClientSettings[];
      const errors: string[] = [];
      let imported = 0;

      for (const setting of settings) {
        try {
          const validationErrors = this.validateClientSettings(setting);
          if (validationErrors.length > 0) {
            errors.push(`Client "${setting.clientName}": ${validationErrors.join(', ')}`);
            continue;
          }

          // Remove id to force new ID generation
          const { id, createdAt, updatedAt, ...settingData } = setting;
          this.createClientSettings(settingData);
          imported++;
        } catch (error) {
          errors.push(`Client "${setting.clientName}": ${error}`);
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
}

export const ediClientSettingsService = new EDIClientSettingsServiceImpl();