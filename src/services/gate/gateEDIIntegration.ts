/**
 * Service d'intégration EDI pour les opérations Gate In/Gate Out
 * Combine les opérations Gate existantes avec la transmission EDI
 */

import { ediManagementService } from '../edi/ediManagement';
import { EDIContainerData, EDITransmissionLog } from '../../types/edi';
import { Container } from '../../types';
import { eventBus } from '../eventBus';

interface GateInData {
  containerNumber: string;
  clientCode: string;
  size: '20' | '40';
  type: string;
  condition: string;
  sealNumber?: string;
  vehicleNumber: string;
  driverName: string;
  driverLicense: string;
  transporterName: string;
  operatorId: string;
  operatorName: string;
  yardId: string;
}

interface GateOutData {
  bookingReferenceId: string;
  containerIds: string[];
  vehicleNumber: string;
  driverName: string;
  driverLicense: string;
  transporterName: string;
  operatorId: string;
  operatorName: string;
  yardId: string;
}

interface GateEDIResult {
  gateSuccess: boolean;
  ediSuccess: boolean;
  containerId?: string;
  ediLog?: EDITransmissionLog;
  error?: string;
  userMessage?: string;
}

class GateEDIIntegrationService {
  /**
   * Traite une opération Gate In avec transmission EDI automatique
   */
  async processGateInWithEDI(
    data: GateInData,
    gateService: any // Type du service Gate existant
  ): Promise<GateEDIResult> {
    let gateResult: any;
    let ediLog: EDITransmissionLog | undefined;

    try {
      // 1. Effectuer l'opération Gate In normale
      console.log(`Processing Gate In for container ${data.containerNumber}...`);
      gateResult = await gateService.processGateIn(data);

      if (!gateResult.success) {
        return {
          gateSuccess: false,
          ediSuccess: false,
          error: gateResult.error,
          userMessage: gateResult.userMessage,
        };
      }

      console.log(`Gate In successful for container ${data.containerNumber}, starting EDI transmission...`);

      // 2. Préparer les données EDI
      const ediData = this.mapGateInDataToEDI(data);

      // 3. Transmettre l'EDI
      try {
        ediLog = await ediManagementService.processGateIn(ediData);
        
        // Émettre un événement de succès EDI
        eventBus.emitSync('EDI_GATE_IN_SUCCESS', {
          containerNumber: data.containerNumber,
          containerId: gateResult.containerId,
          ediLogId: ediLog.id,
          uploadedToSftp: ediLog.uploadedToSftp,
        });

        console.log(`EDI transmission successful for container ${data.containerNumber}`);

        return {
          gateSuccess: true,
          ediSuccess: ediLog.status === 'success',
          containerId: gateResult.containerId,
          ediLog,
        };

      } catch (ediError) {
        // L'opération Gate In a réussi mais l'EDI a échoué
        console.error(`EDI transmission failed for container ${data.containerNumber}:`, ediError);
        
        // Émettre un événement d'échec EDI
        eventBus.emitSync('EDI_GATE_IN_FAILED', {
          containerNumber: data.containerNumber,
          containerId: gateResult.containerId,
          error: ediError instanceof Error ? ediError.message : 'Unknown EDI error',
        });

        return {
          gateSuccess: true,
          ediSuccess: false,
          containerId: gateResult.containerId,
          error: `Gate In successful but EDI failed: ${ediError instanceof Error ? ediError.message : 'Unknown error'}`,
          userMessage: 'Container processed successfully, but EDI transmission failed. Please retry EDI transmission manually.',
        };
      }

    } catch (error) {
      console.error(`Gate In with EDI failed for container ${data.containerNumber}:`, error);
      
      return {
        gateSuccess: false,
        ediSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: 'Failed to process Gate In operation',
      };
    }
  }

  /**
   * Traite une opération Gate Out avec transmission EDI automatique
   */
  async processGateOutWithEDI(
    data: GateOutData,
    gateService: any,
    containerService: any
  ): Promise<GateEDIResult> {
    let gateResult: any;
    const ediLogs: EDITransmissionLog[] = [];

    try {
      // 1. Effectuer l'opération Gate Out normale
      console.log(`Processing Gate Out for ${data.containerIds.length} containers...`);
      gateResult = await gateService.processGateOut(data);

      if (!gateResult.success) {
        return {
          gateSuccess: false,
          ediSuccess: false,
          error: gateResult.error,
        };
      }

      console.log(`Gate Out successful, starting EDI transmissions...`);

      // 2. Transmettre l'EDI pour chaque conteneur
      let allEdiSuccess = true;
      const ediErrors: string[] = [];

      for (const containerId of data.containerIds) {
        try {
          // Récupérer les détails du conteneur
          const container = await containerService.getById(containerId);
          if (!container) {
            ediErrors.push(`Container ${containerId} not found`);
            allEdiSuccess = false;
            continue;
          }

          // Préparer les données EDI
          const ediData = this.mapGateOutDataToEDI(data, container);

          // Transmettre l'EDI
          const ediLog = await ediManagementService.processGateOut(ediData);
          ediLogs.push(ediLog);

          if (ediLog.status !== 'success') {
            allEdiSuccess = false;
            ediErrors.push(`EDI failed for container ${container.number}: ${ediLog.errorMessage}`);
          } else {
            // Émettre un événement de succès EDI
            eventBus.emitSync('EDI_GATE_OUT_SUCCESS', {
              containerNumber: container.number,
              containerId: container.id,
              ediLogId: ediLog.id,
              uploadedToSftp: ediLog.uploadedToSftp,
            });
          }

        } catch (ediError) {
          allEdiSuccess = false;
          const errorMsg = ediError instanceof Error ? ediError.message : 'Unknown EDI error';
          ediErrors.push(`EDI transmission failed for container ${containerId}: ${errorMsg}`);
          
          // Émettre un événement d'échec EDI
          eventBus.emitSync('EDI_GATE_OUT_FAILED', {
            containerId,
            error: errorMsg,
          });
        }
      }

      console.log(`Gate Out EDI processing completed. Success: ${allEdiSuccess}`);

      return {
        gateSuccess: true,
        ediSuccess: allEdiSuccess,
        ediLog: ediLogs[0], // Retourner le premier log pour compatibilité
        error: ediErrors.length > 0 ? ediErrors.join('; ') : undefined,
        userMessage: allEdiSuccess 
          ? undefined 
          : 'Gate Out successful but some EDI transmissions failed. Please check EDI Management for details.',
      };

    } catch (error) {
      console.error(`Gate Out with EDI failed:`, error);
      
      return {
        gateSuccess: false,
        ediSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: 'Failed to process Gate Out operation',
      };
    }
  }

  /**
   * Mappe les données Gate In vers le format EDI
   */
  private mapGateInDataToEDI(data: GateInData): Omit<EDIContainerData, 'status'> {
    return {
      yardId: data.yardId,
      client: data.clientCode,
      weighbridgeId: `WB${data.yardId}001`, // Format générique
      weighbridgeIdSno: '00001',
      transporter: data.transporterName,
      containerNumber: data.containerNumber,
      containerSize: data.size,
      vehicleNumber: data.vehicleNumber,
      createdBy: data.operatorName,
      // Enhanced fields for Gate In
      gateInDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      gateInTime: new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
      damageReported: false, // Will be updated during damage assessment
      damageType: undefined,
      damageDescription: undefined,
      damageAssessedBy: data.operatorName
    };
  }

  /**
   * Mappe les données Gate Out vers le format EDI
   */
  private mapGateOutDataToEDI(data: GateOutData, container: Container): Omit<EDIContainerData, 'status'> {
    return {
      yardId: data.yardId,
      client: container.clientCode || 'UNKNOWN',
      weighbridgeId: `WB${data.yardId}001`, // Format générique
      weighbridgeIdSno: '00001',
      transporter: data.transporterName,
      containerNumber: container.number,
      containerSize: container.size as '20' | '40',
      vehicleNumber: data.vehicleNumber,
      createdBy: data.operatorName,
    };
  }

  /**
   * Retry manuel d'une transmission EDI échouée
   */
  async retryEDITransmission(logId: string): Promise<EDITransmissionLog> {
    try {
      console.log(`Retrying EDI transmission for log ${logId}...`);
      const result = await ediManagementService.retryTransmission(logId);
      
      if (result.status === 'success') {
        eventBus.emitSync('EDI_RETRY_SUCCESS', {
          logId,
          containerNumber: result.containerNumber,
          operation: result.operation,
        });
      }
      
      return result;
    } catch (error) {
      console.error(`EDI retry failed for log ${logId}:`, error);
      throw error;
    }
  }

  /**
   * Obtient l'historique EDI pour un conteneur
   */
  getContainerEDIHistory(containerNumber: string): EDITransmissionLog[] {
    return ediManagementService.getTransmissionHistory(containerNumber);
  }

  /**
   * Vérifie si l'EDI est activé et fonctionnel
   */
  async isEDIEnabled(): Promise<boolean> {
    try {
      const status = await ediManagementService.getSystemStatus();
      return status.apiHealthy;
    } catch {
      return false;
    }
  }
}

// Instance singleton
export const gateEDIIntegrationService = new GateEDIIntegrationService();
export default GateEDIIntegrationService;