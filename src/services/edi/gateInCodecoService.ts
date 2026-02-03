/**
 * Service spécialisé pour la génération EDI CODECO pour les opérations Gate In
 * Intègre les données de Gate In avec l'évaluation des dommages
 */

import { CodecoGenerator, parseGateInOperation, CodecoMessageData } from './codecoGenerator';
import { ediManagementService } from './ediManagement';
import { EDITransmissionLog } from '../../types/edi';
import { logger } from '../../utils/logger';

interface GateInCodecoData {
  // Container Information
  containerNumber: string;
  containerSize: '20ft' | '40ft';
  containerType: string;
  containerQuantity: 1 | 2;
  secondContainerNumber?: string;
  
  // Client Information
  clientCode: string;
  clientName: string;
  
  // Transport Information
  transportCompany: string;
  driverName: string;
  truckNumber: string;
  truckArrivalDate: string;
  truckArrivalTime: string;
  
  // Gate In Operation Details
  operatorName: string;
  operatorId: string;
  yardId: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // Container Status
  status: 'FULL' | 'EMPTY';
  classification: 'divers' | 'alimentaire';
  
  // Equipment Reference for EDI transmission
  equipmentReference?: string;
  
  // Damage Assessment (completed during assignment stage)
  damageAssessment?: {
    hasDamage: boolean;
    damageType?: string;
    damageDescription?: string;
    assessedBy: string;
    assessedAt: Date;
  };
  
  // Location Assignment
  assignedLocation?: string;
}

interface GateInCodecoResult {
  success: boolean;
  ediMessage?: string;
  fileName?: string;
  transmissionLog?: EDITransmissionLog;
  error?: string;
  userMessage?: string;
}

class GateInCodecoService {
  /**
   * Génère un message EDI CODECO pour une opération Gate In
   */
  async generateCodecoForGateIn(
    gateInData: GateInCodecoData,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): Promise<GateInCodecoResult> {
    try {
      logger.info('Generating CODECO for Gate In', 'GateInCodecoService', {
        containerNumber: gateInData.containerNumber,
        clientCode: gateInData.clientCode,
        hasDamage: gateInData.damageAssessment?.hasDamage || false
      });

      // Convert Gate In data to CODECO message data format
      const codecoData = this.mapGateInToCodecoData(gateInData, yardInfo);

      // Generate EDI CODECO message
      const generator = new CodecoGenerator();
      const ediMessage = generator.generateFromSAPData(codecoData);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const fileName = `CODECO_GATE_IN_${gateInData.containerNumber}_${timestamp}.edi`;

      logger.info('CODECO message generated successfully', 'GateInCodecoService', {
        containerNumber: gateInData.containerNumber,
        fileName,
        messageLength: ediMessage.length
      });

      return {
        success: true,
        ediMessage,
        fileName,
        userMessage: `EDI CODECO generated for container ${gateInData.containerNumber}`
      };

    } catch (error) {
      logger.error('Failed to generate CODECO for Gate In', 'GateInCodecoService', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: `Failed to generate EDI CODECO for container ${gateInData.containerNumber}`
      };
    }
  }

  /**
   * Génère et transmet automatiquement un EDI CODECO pour Gate In
   */
  async generateAndTransmitCodeco(
    gateInData: GateInCodecoData,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): Promise<GateInCodecoResult> {
    try {
      // Generate CODECO message
      const codecoResult = await this.generateCodecoForGateIn(gateInData, yardInfo);
      
      if (!codecoResult.success || !codecoResult.ediMessage || !codecoResult.fileName) {
        return codecoResult;
      }

      // Prepare EDI container data for transmission
      const ediContainerData = {
        containerNumber: gateInData.containerNumber,
        size: gateInData.containerSize,
        type: gateInData.containerType as 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top',
        clientName: gateInData.clientName,
        clientCode: gateInData.clientCode,
        transporter: gateInData.transportCompany,
        vehicleNumber: gateInData.truckNumber,
        userName: gateInData.operatorName,
        containerLoadStatus: gateInData.status,
        status: 'GATE_IN' as const,
        timestamp: gateInData.createdAt,
        location: gateInData.assignedLocation,
        yardId: gateInData.yardId
      };

      // Transmit via EDI management service
      const transmissionLog = await ediManagementService.processGateIn(ediContainerData);

      logger.info('CODECO transmitted successfully', 'GateInCodecoService', {
        containerNumber: gateInData.containerNumber,
        transmissionId: transmissionLog.id,
        uploadedToSftp: transmissionLog.uploadedToSftp
      });

      return {
        success: true,
        ediMessage: codecoResult.ediMessage,
        fileName: codecoResult.fileName,
        transmissionLog,
        userMessage: `EDI CODECO generated and transmitted for container ${gateInData.containerNumber}`
      };

    } catch (error) {
      logger.error('Failed to generate and transmit CODECO', 'GateInCodecoService', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: `Failed to generate and transmit EDI CODECO for container ${gateInData.containerNumber}`
      };
    }
  }

  /**
   * Génère un EDI CODECO avec évaluation des dommages
   */
  async generateCodecoWithDamageAssessment(
    gateInData: GateInCodecoData,
    damageAssessment: {
      hasDamage: boolean;
      damageType?: string;
      damageDescription?: string;
      assessedBy: string;
      assessedAt: Date;
    },
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): Promise<GateInCodecoResult> {
    try {
      // Update gate in data with damage assessment
      const enhancedGateInData = {
        ...gateInData,
        damageAssessment
      };

      logger.info('Generating CODECO with damage assessment', 'GateInCodecoService', {
        containerNumber: gateInData.containerNumber,
        hasDamage: damageAssessment.hasDamage,
        damageType: damageAssessment.damageType
      });

      // Generate CODECO with damage information
      return await this.generateAndTransmitCodeco(enhancedGateInData, yardInfo);

    } catch (error) {
      logger.error('Failed to generate CODECO with damage assessment', 'GateInCodecoService', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: `Failed to generate EDI CODECO with damage assessment for container ${gateInData.containerNumber}`
      };
    }
  }

  /**
   * Mappe les données Gate In vers le format CODECO
   */
  private mapGateInToCodecoData(
    gateInData: GateInCodecoData,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): CodecoMessageData {
    const now = new Date();
    const formatDate = (date: Date): string => {
      return date.toISOString().slice(0, 10).replace(/-/g, '');
    };
    const formatTime = (date: Date): string => {
      return date.toTimeString().slice(0, 8).replace(/:/g, '');
    };
    const formatDateTime = (date: Date): string => {
      return formatDate(date) + formatTime(date);
    };

    // Extract damage assessment information
    const damageAssessment = gateInData.damageAssessment;
    const hasDamage = damageAssessment?.hasDamage || false;

    return {
      sender: yardInfo.companyCode || 'DEPOT',
      receiver: yardInfo.plant || 'SYSTEM',
      companyCode: yardInfo.companyCode || 'DEPOT',
      plant: yardInfo.plant || 'SYSTEM',
      customer: yardInfo.customer || gateInData.clientCode,
      weighbridgeId: `WB${gateInData.yardId}${Date.now().toString().slice(-6)}`,
      weighbridgeIdSno: '00001',
      transporter: gateInData.transportCompany,
      containerNumber: gateInData.containerNumber,
      containerSize: gateInData.containerSize.replace('ft', ''),
      design: '001', // Default design
      type: gateInData.containerType === 'reefer' ? '03' : '01', // 01 = General purpose, 03 = Reefer
      color: '#000000', // Default color
      cleanType: gateInData.classification === 'alimentaire' ? '002' : '001', // 002 = Food grade, 001 = Standard
      status: gateInData.status === 'FULL' ? '05' : '04', // 05 = Full, 04 = Empty
      deviceNumber: `DEV${Date.now().toString().slice(-8)}`,
      vehicleNumber: gateInData.truckNumber,
      createdDate: formatDate(gateInData.createdAt),
      createdTime: formatTime(gateInData.createdAt),
      createdBy: gateInData.operatorName,
      changedDate: gateInData.updatedAt ? formatDate(gateInData.updatedAt) : undefined,
      changedTime: gateInData.updatedAt ? formatTime(gateInData.updatedAt) : undefined,
      changedBy: gateInData.updatedAt ? gateInData.operatorName : undefined,
      numOfEntries: gateInData.containerQuantity.toString(),
      
      // Gate In specific fields - REQUIRED: Date et Heure d'entrée
      gateInDate: gateInData.truckArrivalDate.replace(/-/g, ''),
      gateInTime: gateInData.truckArrivalTime.replace(/:/g, '') + '00', // Add seconds if not present
      
      // Equipment Reference for client identification
      equipmentReference: gateInData.equipmentReference,
      
      // Damage assessment fields - REQUIRED: Damaged or Not
      damageReported: hasDamage,
      damageType: damageAssessment?.damageType || (hasDamage ? 'GENERAL' : undefined),
      damageDescription: damageAssessment?.damageDescription,
      damageAssessedBy: damageAssessment?.assessedBy || gateInData.operatorName,
      damageAssessedAt: damageAssessment?.assessedAt ? formatDateTime(damageAssessment.assessedAt) : 
                        (hasDamage ? formatDateTime(now) : undefined)
    };
  }

  /**
   * Valide les données Gate In pour la génération CODECO
   */
  validateGateInData(gateInData: GateInCodecoData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!gateInData.containerNumber) {
      errors.push('Container number is required');
    }
    
    if (!gateInData.clientCode) {
      errors.push('Client code is required');
    }
    
    if (!gateInData.transportCompany) {
      errors.push('Transport company is required');
    }
    
    if (!gateInData.truckNumber) {
      errors.push('Truck number is required');
    }
    
    if (!gateInData.truckArrivalDate) {
      errors.push('Truck arrival date is required for Gate In EDI');
    }
    
    if (!gateInData.truckArrivalTime) {
      errors.push('Truck arrival time is required for Gate In EDI');
    }
    
    if (!gateInData.operatorName) {
      errors.push('Operator name is required');
    }

    // Container number format validation
    if (gateInData.containerNumber && !/^[A-Z]{4}[0-9]{7}$/.test(gateInData.containerNumber)) {
      errors.push('Container number must be in format ABCD1234567');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const gateInCodecoService = new GateInCodecoService();
export default GateInCodecoService;