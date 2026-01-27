/**
 * Service de gestion EDI principal
 */
import { ediConfigurationDatabaseService } from './ediConfigurationDatabase';
import { EDIServerConfig } from './ediConfiguration';
import { ediClientSettingsService } from './ediClientSettings';
import { ediRealDataService } from './ediRealDataService';
import { EDIService } from '../edifact/ediService';

export interface EDIContainerData {
  containerNumber: string;
  size: '20ft' | '40ft' | '45ft';
  type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  clientName: string;
  clientCode?: string;
  transporter: string;
  vehicleNumber: string;
  userName: string;
  containerLoadStatus: 'FULL' | 'EMPTY';
  status: 'GATE_IN' | 'GATE_OUT';
  timestamp: Date;
  location?: string;
  yardId?: string;
}

export interface EDITransmissionLog {
  id: string;
  containerNumber: string;
  operation: 'GATE_IN' | 'GATE_OUT';
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt: Date;
  fileName: string;
  fileSize: number;
  partnerCode: string;
  configId: string;
  uploadedToSftp: boolean;
  errorMessage?: string;
  acknowledgmentReceived?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EDIStats {
  totalTransmissions: number;
  successfulTransmissions: number;
  failedTransmissions: number;
  pendingTransmissions: number;
  successRate: number;
  averageProcessingTime: number;
  lastTransmissionDate?: Date;
}

export interface SystemStatus {
  apiHealthy: boolean;
  apiInfo?: {
    name: string;
    version: string;
    status: string;
    docs: string;
  };
  stats: EDIStats;
  lastTransmissions: EDITransmissionLog[];
}

class EDIManagementServiceImpl {
  private transmissionLogs: Map<string, EDITransmissionLog> = new Map();
  private ediService: EDIService;
  private readonly STORAGE_KEY = 'edi_transmission_logs';

  constructor() {
    this.ediService = new EDIService();
    this.loadTransmissionLogs();
  }

  private loadTransmissionLogs(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const logs = JSON.parse(stored);
        logs.forEach((log: EDITransmissionLog) => {
          // Convert date strings back to Date objects
          log.lastAttempt = new Date(log.lastAttempt);
          log.createdAt = new Date(log.createdAt);
          log.updatedAt = new Date(log.updatedAt);
          if (log.acknowledgmentReceived) {
            log.acknowledgmentReceived = new Date(log.acknowledgmentReceived);
          }
          this.transmissionLogs.set(log.id, log);
        });
      }
    } catch (error) {
      console.error('Failed to load EDI transmission logs:', error);
    }
  }

  private saveTransmissionLogs(): void {
    try {
      const logs = Array.from(this.transmissionLogs.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save EDI transmission logs:', error);
    }
  }

  async processGateIn(containerData: Omit<EDIContainerData, 'status'>): Promise<EDITransmissionLog | null> {
    const data: EDIContainerData = { ...containerData, status: 'GATE_IN' };
    
    // Utiliser le service de données réelles pour traiter l'EDI
    try {
      const result = await ediRealDataService.processRealGateInEDI(
        `gate_in_${Date.now()}`, // operationId simulé
        containerData.containerNumber,
        containerData.clientCode || containerData.clientName
      );
      
      if (result.success && result.logId) {
        // Créer un log local pour la compatibilité
        const log: EDITransmissionLog = {
          id: result.logId,
          containerNumber: containerData.containerNumber,
          operation: 'GATE_IN',
          status: 'success',
          attempts: 1,
          lastAttempt: new Date(),
          fileName: `CODECO_${Date.now()}_${containerData.containerNumber}_GATE_IN.edi`,
          fileSize: 1024,
          partnerCode: 'DEPOT',
          configId: 'real_data',
          uploadedToSftp: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        this.transmissionLogs.set(log.id, log);
        this.saveTransmissionLogs();
        return log;
      }
    } catch (error) {
      console.error('Error processing real Gate In EDI:', error);
    }
    
    return this.processEDITransmissionAsync(data);
  }

  async processGateOut(containerData: Omit<EDIContainerData, 'status'>): Promise<EDITransmissionLog | null> {
    const data: EDIContainerData = { ...containerData, status: 'GATE_OUT' };
    
    // Utiliser le service de données réelles pour traiter l'EDI
    try {
      const result = await ediRealDataService.processRealGateOutEDI(
        `gate_out_${Date.now()}`, // operationId simulé
        containerData.containerNumber, // bookingNumber
        containerData.clientCode || containerData.clientName
      );
      
      if (result.success && result.logId) {
        // Créer un log local pour la compatibilité
        const log: EDITransmissionLog = {
          id: result.logId,
          containerNumber: containerData.containerNumber,
          operation: 'GATE_OUT',
          status: 'success',
          attempts: 1,
          lastAttempt: new Date(),
          fileName: `CODECO_${Date.now()}_${containerData.containerNumber}_GATE_OUT.edi`,
          fileSize: 1024,
          partnerCode: 'DEPOT',
          configId: 'real_data',
          uploadedToSftp: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        this.transmissionLogs.set(log.id, log);
        this.saveTransmissionLogs();
        return log;
      }
    } catch (error) {
      console.error('Error processing real Gate Out EDI:', error);
    }
    
    return this.processEDITransmissionAsync(data);
  }

  // Méthode synchrone pour les opérations critiques (ne bloque jamais)
  processGateInSync(containerData: Omit<EDIContainerData, 'status'>): { shouldProcessEdi: boolean; logId?: string } {
    const data: EDIContainerData = { ...containerData, status: 'GATE_IN' };
    return this.initializeEDIProcessing(data);
  }

  processGateOutSync(containerData: Omit<EDIContainerData, 'status'>): { shouldProcessEdi: boolean; logId?: string } {
    const data: EDIContainerData = { ...containerData, status: 'GATE_OUT' };
    return this.initializeEDIProcessing(data);
  }

  // Méthode synchrone d'initialisation (ne bloque jamais)
  private initializeEDIProcessing(containerData: EDIContainerData): { shouldProcessEdi: boolean; logId?: string } {
    try {
      // Vérifier si le client a l'EDI activé
      const ediEnabled = ediClientSettingsService.isEdiEnabledForClient(
        containerData.clientName,
        containerData.clientCode,
        containerData.status
      );

      if (!ediEnabled) {
        console.log(`EDI disabled for client ${containerData.clientName} - operation ${containerData.status}`);
        return { shouldProcessEdi: false };
      }

      // Pour les opérations critiques, on initialise le log et on vérifie la config en arrière-plan
      const logId = this.generateLogId();
      
      // Lancer la vérification de configuration en arrière-plan
      this.initializeEDIProcessingAsync(containerData, logId);
      
      return { shouldProcessEdi: true, logId };

    } catch (error) {
      console.error('Error initializing EDI processing:', error);
      return { shouldProcessEdi: false };
    }
  }

  // Méthode asynchrone pour l'initialisation complète
  private async initializeEDIProcessingAsync(containerData: EDIContainerData, logId: string): Promise<void> {
    try {
      // Vérifier la configuration serveur
      const config = await ediConfigurationDatabaseService.getConfigurationForClient(
        containerData.clientCode || '',
        containerData.clientName
      );
      
      if (!config || !config.enabled) {
        console.log(`No enabled EDI server configuration found for client: ${containerData.clientName}`);
        // Marquer le log comme échoué
        const log: EDITransmissionLog = {
          id: logId,
          containerNumber: containerData.containerNumber,
          operation: containerData.status,
          status: 'failed',
          attempts: 1,
          lastAttempt: new Date(),
          fileName: `FAILED_${containerData.containerNumber}_${containerData.status}.edi`,
          fileSize: 0,
          partnerCode: 'UNKNOWN',
          configId: 'unknown',
          uploadedToSftp: false,
          errorMessage: 'No enabled EDI server configuration found',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.transmissionLogs.set(logId, log);
        this.saveTransmissionLogs();
        return;
      }

      // Créer le log initial avec la configuration trouvée
      const log: EDITransmissionLog = {
        id: logId,
        containerNumber: containerData.containerNumber,
        operation: containerData.status,
        status: 'pending',
        attempts: 0,
        lastAttempt: new Date(),
        fileName: this.generateFileName(containerData, config),
        fileSize: 0,
        partnerCode: config.partnerCode,
        configId: config.id,
        uploadedToSftp: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.transmissionLogs.set(logId, log);
      this.saveTransmissionLogs();

      // Lancer le traitement asynchrone en arrière-plan
      this.processEDIInBackground(containerData, config, logId);
    } catch (error) {
      console.error('Error in async EDI initialization:', error);
      // Marquer le log comme échoué
      const log: EDITransmissionLog = {
        id: logId,
        containerNumber: containerData.containerNumber,
        operation: containerData.status,
        status: 'failed',
        attempts: 1,
        lastAttempt: new Date(),
        fileName: `ERROR_${containerData.containerNumber}_${containerData.status}.edi`,
        fileSize: 0,
        partnerCode: 'ERROR',
        configId: 'error',
        uploadedToSftp: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.transmissionLogs.set(logId, log);
      this.saveTransmissionLogs();
    }
  }

  // Méthode asynchrone complète (pour les cas où on veut attendre le résultat)
  private async processEDITransmissionAsync(containerData: EDIContainerData): Promise<EDITransmissionLog | null> {
    const initialization = this.initializeEDIProcessing(containerData);
    
    if (!initialization.shouldProcessEdi || !initialization.logId) {
      return null;
    }

    // Attendre le traitement complet
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const log = this.transmissionLogs.get(initialization.logId!);
        if (log && (log.status === 'success' || log.status === 'failed')) {
          resolve(log);
        } else {
          setTimeout(checkCompletion, 100); // Vérifier toutes les 100ms
        }
      };
      checkCompletion();
    });
  }

  // Traitement EDI en arrière-plan (non-bloquant)
  private async processEDIInBackground(containerData: EDIContainerData, config: EDIServerConfig, logId: string): Promise<void> {
    try {
      // Récupérer le log
      const log = this.transmissionLogs.get(logId);
      if (!log) return;

      // Générer le contenu EDI
      const ediContent = await this.generateEDIContent(containerData, config);
      log.fileSize = new Blob([ediContent]).size;

      // Simuler la transmission
      await this.simulateTransmission(log, ediContent, config);

      log.status = 'success';
      log.uploadedToSftp = true;
      log.updatedAt = new Date();

      // Simuler l'acknowledgment après délai
      setTimeout(() => {
        log.acknowledgmentReceived = new Date();
        this.saveTransmissionLogs();
      }, 2000 + Math.random() * 3000);

      console.log(`EDI transmission successful for container ${containerData.containerNumber}`);

    } catch (error) {
      const log = this.transmissionLogs.get(logId);
      if (log) {
        log.status = 'failed';
        log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.updatedAt = new Date();
        console.error(`EDI transmission failed for container ${containerData.containerNumber}:`, error);
      }
    } finally {
      const log = this.transmissionLogs.get(logId);
      if (log) {
        log.attempts++;
        this.transmissionLogs.set(logId, log);
        this.saveTransmissionLogs();
      }
    }
  }

  // Ancienne méthode maintenue pour compatibilité
  private async processEDITransmission(containerData: EDIContainerData): Promise<EDITransmissionLog> {
    const result = await this.processEDITransmissionAsync(containerData);
    if (!result) {
      throw new Error(`EDI processing not enabled or configured for client: ${containerData.clientName}`);
    }
    return result;
  }

  private async generateEDIContent(containerData: EDIContainerData, config: EDIServerConfig): Promise<string> {
    // Simulate EDI content generation
    const timestamp = new Date().toISOString();
    
    return `UNB+UNOC:3+${config.senderCode}+${config.partnerCode}+${timestamp.replace(/[-:T]/g, '').slice(0, 12)}+${this.generateMessageReference()}'
UNH+1+CODECO:D:95B:UN'
BGM+34+${containerData.containerNumber}+9'
DTM+137:${timestamp.slice(0, 10).replace(/-/g, '')}:102'
NAD+CA+${config.senderCode}'
EQD+CN+${containerData.containerNumber}+${this.getContainerTypeCode(containerData.type, containerData.size)}'
MEA+AAE+G+KGM:${containerData.containerLoadStatus === 'FULL' ? '25000' : '2300'}'
LOC+9+${containerData.location || 'UNKNOWN'}'
DTM+${containerData.status === 'GATE_IN' ? '132' : '133'}:${timestamp.slice(0, 10).replace(/-/g, '')}${timestamp.slice(11, 19).replace(/:/g, '')}:203'
UNT+8+1'
UNZ+1+${this.generateMessageReference()}'`;
  }

  private getContainerTypeCode(type: string, size: string): string {
    const typeMap: { [key: string]: string } = {
      'dry': '22G1',
      'reefer': '22R1',
      'tank': '22T1',
      'flat_rack': '22P1',
      'open_top': '22U1'
    };
    
    const sizePrefix = size === '20ft' ? '22' : size === '40ft' ? '42' : '45';
    return typeMap[type] || '22G1';
  }

  private async simulateTransmission(log: EDITransmissionLog, content: string, config: EDIServerConfig): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate occasional failures
    if (!config.testMode && Math.random() < 0.1) {
      throw new Error('Network timeout during transmission');
    }

    // Simulate SFTP upload
    console.log(`Simulating SFTP upload to ${config.host}:${config.port}${config.remotePath}/${log.fileName}`);
  }

  async retryTransmission(logId: string): Promise<EDITransmissionLog> {
    const log = this.transmissionLogs.get(logId);
    if (!log) {
      throw new Error('Transmission log not found');
    }

    if (log.status !== 'failed') {
      throw new Error('Can only retry failed transmissions');
    }

    const config = await ediConfigurationDatabaseService.getConfiguration(log.configId);
    if (!config) {
      throw new Error('Configuration not found for this transmission');
    }

    log.status = 'retrying';
    log.lastAttempt = new Date();
    log.updatedAt = new Date();
    this.saveTransmissionLogs();

    try {
      // Regenerate container data for retry
      const containerData: EDIContainerData = {
        containerNumber: log.containerNumber,
        size: '40ft', // Default values for retry
        type: 'dry',
        clientName: 'Unknown',
        transporter: 'Unknown',
        vehicleNumber: 'Unknown',
        userName: 'System',
        containerLoadStatus: 'FULL',
        status: log.operation,
        timestamp: new Date()
      };

      const ediContent = await this.generateEDIContent(containerData, config);
      await this.simulateTransmission(log, ediContent, config);

      log.status = 'success';
      log.uploadedToSftp = true;
      log.errorMessage = undefined;
    } catch (error) {
      log.status = 'failed';
      log.errorMessage = error instanceof Error ? error.message : 'Retry failed';
    }

    log.attempts++;
    log.updatedAt = new Date();
    this.transmissionLogs.set(logId, log);
    this.saveTransmissionLogs();

    return log;
  }

  getTransmissionHistory(containerNumber?: string): EDITransmissionLog[] {
    const logs = Array.from(this.transmissionLogs.values());
    
    if (containerNumber) {
      return logs.filter(log => log.containerNumber === containerNumber);
    }
    
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getEDIStatistics(): EDIStats {
    const logs = Array.from(this.transmissionLogs.values());
    const total = logs.length;
    const successful = logs.filter(log => log.status === 'success').length;
    const failed = logs.filter(log => log.status === 'failed').length;
    const pending = logs.filter(log => log.status === 'pending' || log.status === 'retrying').length;
    
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    // Calculate average processing time (mock calculation)
    const averageProcessingTime = logs.length > 0 ? 2.5 : 0; // seconds
    
    const lastTransmissionDate = logs.length > 0 
      ? new Date(Math.max(...logs.map(log => log.createdAt.getTime())))
      : undefined;

    return {
      totalTransmissions: total,
      successfulTransmissions: successful,
      failedTransmissions: failed,
      pendingTransmissions: pending,
      successRate,
      averageProcessingTime,
      lastTransmissionDate
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    // Simulate API health check
    const apiHealthy = Math.random() > 0.1; // 90% uptime simulation
    
    const apiInfo = {
      name: 'EDI CODECO API',
      version: '1.2.0',
      status: apiHealthy ? 'operational' : 'degraded',
      docs: '/api/docs'
    };

    const stats = this.getEDIStatistics();
    const lastTransmissions = this.getTransmissionHistory().slice(0, 10);

    return {
      apiHealthy,
      apiInfo,
      stats,
      lastTransmissions
    };
  }

  validateContainerData(data: Partial<EDIContainerData>): string[] {
    const errors: string[] = [];

    if (!data.containerNumber?.trim()) {
      errors.push('Container number is required');
    } else if (!/^[A-Z]{4}[0-9]{7}$/.test(data.containerNumber)) {
      errors.push('Container number must be in format ABCD1234567');
    }

    if (!data.size) {
      errors.push('Container size is required');
    }

    if (!data.type) {
      errors.push('Container type is required');
    }

    if (!data.clientName?.trim()) {
      errors.push('Client name is required');
    }

    if (!data.transporter?.trim()) {
      errors.push('Transporter is required');
    }

    if (!data.vehicleNumber?.trim()) {
      errors.push('Vehicle number is required');
    }

    if (!data.userName?.trim()) {
      errors.push('User name is required');
    }

    if (!data.containerLoadStatus) {
      errors.push('Container load status is required');
    }

    return errors;
  }

  exportTransmissionLogs(): string {
    const logs = this.getTransmissionHistory();
    const headers = [
      'ID',
      'Container Number',
      'Operation',
      'Status',
      'Attempts',
      'Last Attempt',
      'File Name',
      'File Size (bytes)',
      'Partner Code',
      'Uploaded to SFTP',
      'Error Message',
      'Acknowledgment Received',
      'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.containerNumber,
        log.operation,
        log.status,
        log.attempts,
        log.lastAttempt.toISOString(),
        log.fileName,
        log.fileSize,
        log.partnerCode,
        log.uploadedToSftp ? 'Yes' : 'No',
        log.errorMessage || '',
        log.acknowledgmentReceived?.toISOString() || '',
        log.createdAt.toISOString()
      ].map(field => `"${field}"`).join(','))
    ];

    return csvRows.join('\n');
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateMessageReference(): string {
    return Math.random().toString(36).substring(2, 11).toUpperCase();
  }

  private generateFileName(containerData: EDIContainerData, config: EDIServerConfig): string {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return config.fileNamePattern
      .replace('{timestamp}', timestamp)
      .replace('{container}', containerData.containerNumber)
      .replace('{operation}', containerData.status);
  }

  // Cleanup old logs (keep last 1000 entries)
  cleanupOldLogs(): number {
    const logs = Array.from(this.transmissionLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (logs.length <= 1000) {
      return 0;
    }

    const toRemove = logs.slice(1000);
    toRemove.forEach(log => this.transmissionLogs.delete(log.id));
    this.saveTransmissionLogs();
    
    return toRemove.length;
  }
}

export const ediManagementService = new EDIManagementServiceImpl();