/**
 * Service spécialisé pour la génération EDI CODECO pour les opérations Gate In
 * Intègre les données de Gate In avec l'évaluation des dommages
 */

import { CodecoGenerator, CodecoMessageData } from './codecoGenerator';
import { ediManagementService, EDITransmissionLog } from './ediManagement';
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

      // Generate filename: CODECO_{SenderCode}{GateInDate}{GateInTime}_{containerNumber}_{operation}.edi
      const gateDateStr = gateInData.truckArrivalDate?.replace(/-/g, '') ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const gateDate = gateDateStr.length === 6 ? '20' + gateDateStr : gateDateStr.slice(0, 8);
      const gateTime = (gateInData.truckArrivalTime?.replace(/:/g, '') ?? '').padEnd(6, '0').slice(0, 6);
      const senderCode = (yardInfo.companyCode || '').trim();
      const senderDateTime = `${senderCode}${gateDate}${gateTime}`;
      const fileName = `CODECO_${senderDateTime}_${gateInData.containerNumber}_GATE_IN.edi`;

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

      if (!transmissionLog) {
        return {
          success: false,
          error: 'Failed to create transmission log',
          userMessage: `Failed to transmit EDI CODECO for container ${gateInData.containerNumber}`
        };
      }

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
   * Mappe les données Gate In vers le format CODECO client
   */
  private mapGateInToCodecoData(
    gateInData: GateInCodecoData,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): CodecoMessageData {
    const now = new Date();
    const formatDate = (date: Date): string => {
      return date.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
    };
    const formatTime = (date: Date): string => {
      return date.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    };

    // Extract operation date and time
    const operationDate = gateInData.truckArrivalDate ? 
      new Date(gateInData.truckArrivalDate + 'T' + (gateInData.truckArrivalTime || '00:00')) : 
      gateInData.createdAt;

    return {
      // Header Information - REQUIRED for client format
      sender: yardInfo.companyCode || 'MANTRA',         // Company name
      receiver: gateInData.clientName,                  // Client Name
      companyCode: yardInfo.companyCode || 'MANTRA',    // Company Code
      customer: gateInData.clientName,                  // Client Name
      
      // Container Information - REQUIRED
      containerNumber: gateInData.containerNumber,
      containerSize: gateInData.containerSize.replace('ft', ''),
      containerType: gateInData.status === 'EMPTY' ? 'EM' : 'FL', // EM = Empty, FL = Full
      
      // Transport Information
      transportCompany: gateInData.transportCompany,
      vehicleNumber: gateInData.truckNumber,
      
      // Operation Information
      operationType: 'GATE_IN',
      operationDate: formatDate(operationDate), // YYMMDD format
      operationTime: formatTime(operationDate), // HHMMSS format
      
      // Reference Information
      bookingReference: undefined, // No booking reference for Gate In
      equipmentReference: gateInData.equipmentReference, // Equipment reference from Gate In
      
      // Location Information
      locationCode: 'CIABJ', // Default location code
      locationDetails: 'CIABJ32:STO:ZZZ', // Default location details
      
      // Operator Information
      operatorName: gateInData.operatorName,
      operatorId: gateInData.operatorId,
      yardId: gateInData.yardId,
      
      // Damage Information (Optional)
      damageReported: gateInData.damageAssessment?.hasDamage || false,
      damageType: gateInData.damageAssessment?.damageType || (gateInData.damageAssessment?.hasDamage ? 'GENERAL' : undefined),
      damageDescription: gateInData.damageAssessment?.damageDescription,
      damageAssessedBy: gateInData.damageAssessment?.assessedBy || gateInData.operatorName,
      damageAssessedAt: gateInData.damageAssessment?.assessedAt ? 
        formatDate(gateInData.damageAssessment.assessedAt) + formatTime(gateInData.damageAssessment.assessedAt) : 
        (gateInData.damageAssessment?.hasDamage ? formatDate(now) + formatTime(now) : undefined)
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