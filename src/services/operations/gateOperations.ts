/**
 * Service pour les opérations de portail (Gate In/Out) avec intégration EDI non-bloquante
 */

import { ediManagementService, EDIContainerData } from '../edi/ediManagement';
import { ediClientSettingsService } from '../edi/ediClientSettings';
import { ediConfigurationDatabaseService } from '../edi/ediConfigurationDatabase';

export interface GateOperationData {
  containerNumber: string;
  clientName: string;
  clientCode?: string;
  size: '20ft' | '40ft' | '45ft';
  type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  transporter: string;
  vehicleNumber: string;
  userName: string;
  containerLoadStatus: 'FULL' | 'EMPTY';
  location?: string;
  yardId?: string;
  timestamp?: Date;
}

export interface GateOperationResult {
  success: boolean;
  operationId: string;
  message: string;
  ediProcessing?: {
    enabled: boolean;
    logId?: string;
    status: 'initiated' | 'skipped' | 'error';
    reason?: string;
  };
  errors?: string[];
}

class GateOperationsService {
  
  /**
   * Traite une opération Gate In avec EDI optionnel en arrière-plan
   */
  async processGateIn(data: GateOperationData): Promise<GateOperationResult> {
    const operationId = this.generateOperationId('GI');
    
    try {
      // 1. OPÉRATION PRINCIPALE (ne doit jamais échouer à cause de l'EDI)
      const mainOperationResult = await this.executeMainGateInOperation(data, operationId);
      
      if (!mainOperationResult.success) {
        return {
          success: false,
          operationId,
          message: 'Gate In operation failed',
          errors: mainOperationResult.errors
        };
      }

      // 2. EDI EN ARRIÈRE-PLAN (non-bloquant)
      const ediResult = this.initiateEDIProcessing(data, 'GATE_IN');

      return {
        success: true,
        operationId,
        message: `Gate In completed successfully for container ${data.containerNumber}`,
        ediProcessing: ediResult
      };

    } catch (error) {
      console.error('Gate In operation error:', error);
      return {
        success: false,
        operationId,
        message: 'Gate In operation failed due to system error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Traite une opération Gate Out avec EDI optionnel en arrière-plan
   */
  async processGateOut(data: GateOperationData): Promise<GateOperationResult> {
    const operationId = this.generateOperationId('GO');
    
    try {
      // 1. OPÉRATION PRINCIPALE (ne doit jamais échouer à cause de l'EDI)
      const mainOperationResult = await this.executeMainGateOutOperation(data, operationId);
      
      if (!mainOperationResult.success) {
        return {
          success: false,
          operationId,
          message: 'Gate Out operation failed',
          errors: mainOperationResult.errors
        };
      }

      // 2. EDI EN ARRIÈRE-PLAN (non-bloquant)
      const ediResult = this.initiateEDIProcessing(data, 'GATE_OUT');

      return {
        success: true,
        operationId,
        message: `Gate Out completed successfully for container ${data.containerNumber}`,
        ediProcessing: ediResult
      };

    } catch (error) {
      console.error('Gate Out operation error:', error);
      return {
        success: false,
        operationId,
        message: 'Gate Out operation failed due to system error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Exécute l'opération principale Gate In (base de données, validation, etc.)
   */
  private async executeMainGateInOperation(data: GateOperationData, operationId: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Simulation de l'opération principale
      console.log(`Executing Gate In operation ${operationId} for container ${data.containerNumber}`);
      
      // Validation des données
      const validationErrors = this.validateGateOperationData(data);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }

      // Simulation des opérations base de données
      await this.simulateDatabaseOperation('gate_in', data);
      
      // Simulation de la mise à jour du statut du conteneur
      await this.simulateContainerStatusUpdate(data.containerNumber, 'gate_in');
      
      // Simulation de l'enregistrement de l'opération
      await this.simulateOperationLogging(operationId, 'GATE_IN', data);

      console.log(`Gate In operation ${operationId} completed successfully`);
      return { success: true };

    } catch (error) {
      console.error(`Gate In operation ${operationId} failed:`, error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Database operation failed'] 
      };
    }
  }

  /**
   * Exécute l'opération principale Gate Out (base de données, validation, etc.)
   */
  private async executeMainGateOutOperation(data: GateOperationData, operationId: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Simulation de l'opération principale
      console.log(`Executing Gate Out operation ${operationId} for container ${data.containerNumber}`);
      
      // Validation des données
      const validationErrors = this.validateGateOperationData(data);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }

      // Simulation des opérations base de données
      await this.simulateDatabaseOperation('gate_out', data);
      
      // Simulation de la mise à jour du statut du conteneur
      await this.simulateContainerStatusUpdate(data.containerNumber, 'gate_out');
      
      // Simulation de l'enregistrement de l'opération
      await this.simulateOperationLogging(operationId, 'GATE_OUT', data);

      console.log(`Gate Out operation ${operationId} completed successfully`);
      return { success: true };

    } catch (error) {
      console.error(`Gate Out operation ${operationId} failed:`, error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Database operation failed'] 
      };
    }
  }

  /**
   * Initie le traitement EDI en arrière-plan (non-bloquant)
   */
  private initiateEDIProcessing(data: GateOperationData, operation: 'GATE_IN' | 'GATE_OUT'): {
    enabled: boolean;
    logId?: string;
    status: 'initiated' | 'skipped' | 'error';
    reason?: string;
  } {
    try {
      // Vérifier si l'EDI est activé pour ce client
      const ediEnabled = ediClientSettingsService.isEdiEnabledForClient(
        data.clientName,
        data.clientCode,
        operation
      );

      if (!ediEnabled) {
        console.log(`EDI skipped for client ${data.clientName} - operation ${operation} (EDI disabled)`);
        return {
          enabled: false,
          status: 'skipped',
          reason: 'EDI disabled for this client and operation'
        };
      }

      // Préparer les données EDI
      const ediData: EDIContainerData = {
        containerNumber: data.containerNumber,
        size: data.size,
        type: data.type,
        clientName: data.clientName,
        clientCode: data.clientCode,
        transporter: data.transporter,
        vehicleNumber: data.vehicleNumber,
        userName: data.userName,
        containerLoadStatus: data.containerLoadStatus,
        status: operation,
        timestamp: data.timestamp || new Date(),
        location: data.location,
        yardId: data.yardId
      };

      // Initier le traitement EDI (synchrone, non-bloquant)
      const ediResult = ediManagementService.processGateInSync(ediData);

      if (ediResult.shouldProcessEdi) {
        console.log(`EDI processing initiated for container ${data.containerNumber} - Log ID: ${ediResult.logId}`);
        return {
          enabled: true,
          logId: ediResult.logId,
          status: 'initiated',
          reason: 'EDI transmission started in background'
        };
      } else {
        return {
          enabled: false,
          status: 'skipped',
          reason: 'No EDI server configuration found or server disabled'
        };
      }

    } catch (error) {
      console.error('EDI processing initialization error:', error);
      return {
        enabled: false,
        status: 'error',
        reason: `EDI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validation des données d'opération
   */
  private validateGateOperationData(data: GateOperationData): string[] {
    const errors: string[] = [];

    if (!data.containerNumber?.trim()) {
      errors.push('Container number is required');
    } else if (!/^[A-Z]{4}[0-9]{7}$/.test(data.containerNumber)) {
      errors.push('Container number must be in format ABCD1234567');
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

    if (!['20ft', '40ft', '45ft'].includes(data.size)) {
      errors.push('Invalid container size');
    }

    if (!['dry', 'reefer', 'tank', 'flat_rack', 'open_top'].includes(data.type)) {
      errors.push('Invalid container type');
    }

    if (!['FULL', 'EMPTY'].includes(data.containerLoadStatus)) {
      errors.push('Invalid container load status');
    }

    return errors;
  }

  /**
   * Simulations des opérations base de données
   */
  private async simulateDatabaseOperation(operation: string, data: GateOperationData): Promise<void> {
    // Simulation d'une opération base de données
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    console.log(`Database ${operation} operation completed for ${data.containerNumber}`);
  }

  private async simulateContainerStatusUpdate(containerNumber: string, status: string): Promise<void> {
    // Simulation de mise à jour du statut
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    console.log(`Container ${containerNumber} status updated to ${status}`);
  }

  private async simulateOperationLogging(operationId: string, operation: string, data: GateOperationData): Promise<void> {
    // Simulation d'enregistrement de l'opération
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
    console.log(`Operation ${operationId} (${operation}) logged for container ${data.containerNumber}`);
  }

  /**
   * Génération d'ID d'opération unique
   */
  private generateOperationId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Méthodes utilitaires pour le monitoring
   */
  async getEDIStatusForClient(clientName: string, clientCode?: string): Promise<{
    ediEnabled: boolean;
    gateInEdi: boolean;
    gateOutEdi: boolean;
    serverConfigured: boolean;
  }> {
    const clientSettings = ediClientSettingsService.getClientSettings(clientName, clientCode);
    const serverConfig = await ediConfigurationDatabaseService.getConfigurationForClient(clientCode, clientName);

    return {
      ediEnabled: clientSettings?.ediEnabled || false,
      gateInEdi: clientSettings?.gateInEdi || false,
      gateOutEdi: clientSettings?.gateOutEdi || false,
      serverConfigured: serverConfig?.enabled || false
    };
  }

  /**
   * Test d'une opération complète (pour debugging)
   */
  async testGateOperation(data: GateOperationData, operation: 'GATE_IN' | 'GATE_OUT'): Promise<{
    mainOperation: { success: boolean; duration: number };
    ediProcessing: { enabled: boolean; status: string; reason?: string };
  }> {
    const startTime = Date.now();
    
    const result = operation === 'GATE_IN' 
      ? await this.processGateIn(data)
      : await this.processGateOut(data);
    
    const duration = Date.now() - startTime;

    return {
      mainOperation: {
        success: result.success,
        duration
      },
      ediProcessing: result.ediProcessing || {
        enabled: false,
        status: 'not_attempted'
      }
    };
  }
}

export const gateOperationsService = new GateOperationsService();