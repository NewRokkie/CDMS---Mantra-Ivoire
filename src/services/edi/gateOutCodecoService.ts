/**
 * Service spécialisé pour la génération EDI CODECO pour les opérations Gate Out
 * Intègre les données de Gate Out avec les informations de booking
 */

import { CodecoGenerator, CodecoMessageData } from './codecoGenerator';
import { ediManagementService, EDITransmissionLog as EdiServiceTransmissionLog } from './ediManagement';
import { EDITransmissionLog } from '../../types/edi';
import { logger } from '../../utils/logger';

interface GateOutCodecoData {
  // Container Information - REQUIRED: Container Number
  containerNumbers: string[];
  containerSizes: ('20ft' | '40ft')[];
  containerTypes: string[];
  
  // Booking Information - REQUIRED: Booking Number
  bookingNumber: string;
  bookingType: 'IMPORT' | 'EXPORT';
  bookingReferenceId: string;
  
  // Client Information
  clientCode: string;
  clientName: string;
  
  // Transport Information
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  
  // Gate Out Operation Details - REQUIRED: Date et Heure sortie
  gateOutDate: string;
  gateOutTime: string;
  operatorName: string;
  operatorId: string;
  yardId: string;
  createdAt: Date;
  completedAt?: Date;
  
  // Location Information
  fromLocation?: string;
  
  // Additional Information
  notes?: string;
}

interface GateOutCodecoResult {
  success: boolean;
  ediMessages?: string[];
  fileNames?: string[];
  transmissionLogs?: EdiServiceTransmissionLog[];
  error?: string;
  userMessage?: string;
}

class GateOutCodecoService {
  /**
   * Génère des messages EDI CODECO pour une opération Gate Out
   * Un message par conteneur
   */
  async generateCodecoForGateOut(
    gateOutData: GateOutCodecoData,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): Promise<GateOutCodecoResult> {
    try {
      logger.info('Generating CODECO for Gate Out', 'GateOutCodecoService', {
        containerCount: gateOutData.containerNumbers.length,
        bookingNumber: gateOutData.bookingNumber,
        clientCode: gateOutData.clientCode
      });

      const ediMessages: string[] = [];
      const fileNames: string[] = [];

      // Generate one CODECO message per container
      for (let i = 0; i < gateOutData.containerNumbers.length; i++) {
        const containerNumber = gateOutData.containerNumbers[i];
        const containerSize = gateOutData.containerSizes[i] || '20ft';
        const containerType = gateOutData.containerTypes[i] || 'dry';

        // Convert Gate Out data to CODECO message data format for this container
        const codecoData = this.mapGateOutToCodecoData(
          gateOutData,
          containerNumber,
          containerSize,
          containerType,
          yardInfo
        );

        // Generate EDI CODECO message
        const generator = new CodecoGenerator();
        const ediMessage = generator.generateFromSAPData(codecoData);

        // Generate filename: CODECO_{SenderCode}{GateInDate}{GateInTime}_{containerNumber}_{operation}.edi
        const gateDateStr = gateOutData.gateOutDate?.replace(/-/g, '') ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const gateDate = gateDateStr.length === 6 ? '20' + gateDateStr : gateDateStr.slice(0, 8);
        const gateTime = (gateOutData.gateOutTime?.replace(/:/g, '') ?? '').padEnd(6, '0').slice(0, 6);
        const senderCode = (yardInfo.companyCode || '').trim();
        const senderDateTime = `${senderCode}${gateDate}${gateTime}`;
        const fileName = `CODECO_${senderDateTime}_${containerNumber}_GATE_OUT.edi`;

        ediMessages.push(ediMessage);
        fileNames.push(fileName);

        logger.info('CODECO message generated for container', 'GateOutCodecoService', {
          containerNumber,
          fileName,
          messageLength: ediMessage.length
        });
      }

      return {
        success: true,
        ediMessages,
        fileNames,
        userMessage: `EDI CODECO generated for ${gateOutData.containerNumbers.length} container(s) in booking ${gateOutData.bookingNumber}`
      };

    } catch (error) {
      logger.error('Failed to generate CODECO for Gate Out', 'GateOutCodecoService', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: `Failed to generate EDI CODECO for booking ${gateOutData.bookingNumber}`
      };
    }
  }

  /**
   * Génère et transmet automatiquement des EDI CODECO pour Gate Out
   */
  async generateAndTransmitCodeco(
    gateOutData: GateOutCodecoData,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): Promise<GateOutCodecoResult> {
    try {
      // Generate CODECO messages
      const codecoResult = await this.generateCodecoForGateOut(gateOutData, yardInfo);
      
      if (!codecoResult.success || !codecoResult.ediMessages || !codecoResult.fileNames) {
        return codecoResult;
      }

      const transmissionLogs: EdiServiceTransmissionLog[] = [];

      // Transmit each container's CODECO
      for (let i = 0; i < gateOutData.containerNumbers.length; i++) {
        const containerNumber = gateOutData.containerNumbers[i];
        const containerSize = gateOutData.containerSizes[i] || '20ft';
        const containerType = gateOutData.containerTypes[i] || 'dry';

        try {
          // Prepare EDI container data for transmission
          const ediContainerData = {
            containerNumber,
            size: containerSize,
            type: containerType as 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top',
            clientName: gateOutData.clientName,
            clientCode: gateOutData.clientCode,
            transporter: gateOutData.transportCompany,
            vehicleNumber: gateOutData.vehicleNumber,
            userName: gateOutData.operatorName,
            containerLoadStatus: 'FULL' as const, // Assume containers are full when leaving
            status: 'GATE_OUT' as const,
            timestamp: gateOutData.completedAt || gateOutData.createdAt,
            location: gateOutData.fromLocation,
            yardId: gateOutData.yardId
          };

          // Transmit via EDI management service
          const transmissionLog = await ediManagementService.processGateOut(ediContainerData);
          
          if (transmissionLog) {
            transmissionLogs.push(transmissionLog);

            logger.info('CODECO transmitted for container', 'GateOutCodecoService', {
              containerNumber,
              transmissionId: transmissionLog.id,
              uploadedToSftp: transmissionLog.uploadedToSftp
            });
          } else {
            logger.warn('EDI transmission returned null for container', 'GateOutCodecoService', {
              containerNumber
            });
          }

        } catch (transmissionError) {
          logger.error(`Failed to transmit CODECO for container ${containerNumber}`, 'GateOutCodecoService', transmissionError);
          // Continue with other containers even if one fails
        }
      }

      return {
        success: true,
        ediMessages: codecoResult.ediMessages,
        fileNames: codecoResult.fileNames,
        transmissionLogs,
        userMessage: `EDI CODECO generated and transmitted for ${gateOutData.containerNumbers.length} container(s) in booking ${gateOutData.bookingNumber}`
      };

    } catch (error) {
      logger.error('Failed to generate and transmit CODECO for Gate Out', 'GateOutCodecoService', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: `Failed to generate and transmit EDI CODECO for booking ${gateOutData.bookingNumber}`
      };
    }
  }

  /**
   * Mappe les données Gate Out vers le format CODECO client pour un conteneur spécifique
   */
  private mapGateOutToCodecoData(
    gateOutData: GateOutCodecoData,
    containerNumber: string,
    containerSize: '20ft' | '40ft',
    containerType: string,
    yardInfo: { companyCode: string; plant: string; customer?: string }
  ): CodecoMessageData {
    const now = new Date();
    const formatDate = (date: Date): string => {
      return date.toISOString().slice(0, 10).replace(/-/g, '');
    };
    const formatTime = (date: Date): string => {
      return date.toTimeString().slice(0, 5).replace(/:/g, '');
    };

    // Extract operation date and time
    const operationDate = gateOutData.completedAt || gateOutData.createdAt;

    return {
      // Header Information - REQUIRED for client format
      sender: yardInfo.companyCode || 'MANTRA',         // Company name
      receiver: gateOutData.clientName,                 // Client Name
      companyCode: yardInfo.companyCode || 'MANTRA',    // Company Code
      customer: gateOutData.clientName,                 // Client Name
      
      // Container Information - REQUIRED
      containerNumber: containerNumber,
      containerSize: containerSize.replace('ft', ''),
      containerType: 'FL', // Assume full for gate out
      
      // Transport Information
      transportCompany: gateOutData.transportCompany,
      vehicleNumber: gateOutData.vehicleNumber,
      
      // Operation Information
      operationType: 'GATE_OUT',
      operationDate: formatDate(operationDate).slice(2), // YYMMDD format
      operationTime: formatTime(operationDate) + '02', // HHMM + seconds
      
      // Reference Information
      bookingReference: gateOutData.bookingNumber, // Booking number for Gate Out
      equipmentReference: undefined, // Equipment reference not used for Gate Out
      
      // Location Information
      locationCode: 'CIABJ', // Default location code
      locationDetails: 'CIABJ32:STO:ZZZ', // Default location details
      
      // Operator Information
      operatorName: gateOutData.operatorName,
      operatorId: gateOutData.operatorId,
      yardId: gateOutData.yardId,

      // Damage Information (optional)
      damageReported: false,
      damageAssessedBy: gateOutData.operatorName,
      damageAssessedAt: formatDate(now) + formatTime(now) + '00'
    };
  }

  /**
   * Valide les données Gate Out pour la génération CODECO
   */
  validateGateOutData(gateOutData: GateOutCodecoData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!gateOutData.containerNumbers || gateOutData.containerNumbers.length === 0) {
      errors.push('At least one container number is required');
    }
    
    if (!gateOutData.bookingNumber) {
      errors.push('Booking number is required for Gate Out EDI');
    }
    
    if (!gateOutData.clientCode) {
      errors.push('Client code is required');
    }
    
    if (!gateOutData.transportCompany) {
      errors.push('Transport company is required');
    }
    
    if (!gateOutData.vehicleNumber) {
      errors.push('Vehicle number is required');
    }
    
    if (!gateOutData.gateOutDate) {
      errors.push('Gate out date is required for Gate Out EDI');
    }
    
    if (!gateOutData.gateOutTime) {
      errors.push('Gate out time is required for Gate Out EDI');
    }
    
    if (!gateOutData.operatorName) {
      errors.push('Operator name is required');
    }

    // Container number format validation
    if (gateOutData.containerNumbers) {
      gateOutData.containerNumbers.forEach((containerNumber, index) => {
        if (containerNumber && !/^[A-Z]{4}[0-9]{7}$/.test(containerNumber)) {
          errors.push(`Container number ${index + 1} must be in format ABCD1234567`);
        }
      });
    }

    // Array length consistency validation
    if (gateOutData.containerNumbers && gateOutData.containerSizes) {
      if (gateOutData.containerNumbers.length !== gateOutData.containerSizes.length) {
        errors.push('Container numbers and sizes arrays must have the same length');
      }
    }

    if (gateOutData.containerNumbers && gateOutData.containerTypes) {
      if (gateOutData.containerNumbers.length !== gateOutData.containerTypes.length) {
        errors.push('Container numbers and types arrays must have the same length');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Crée les données Gate Out CODECO à partir d'une opération Gate Out et de conteneurs
   */
  createGateOutCodecoDataFromOperation(
    gateOutOperation: any,
    containers: any[],
    booking: any,
    yardId: string,
    operatorName: string,
    operatorId: string
  ): GateOutCodecoData {
    const now = new Date();
    
    return {
      // Container Information - REQUIRED: Container Number
      containerNumbers: containers.map(c => c.number),
      containerSizes: containers.map(c => c.size || '20ft'),
      containerTypes: containers.map(c => c.type || 'dry'),
      
      // Booking Information - REQUIRED: Booking Number
      bookingNumber: booking.bookingNumber,
      bookingType: booking.bookingType || 'EXPORT',
      bookingReferenceId: booking.id,
      
      // Client Information
      clientCode: booking.clientCode || gateOutOperation.clientCode,
      clientName: booking.clientName || gateOutOperation.clientName,
      
      // Transport Information
      transportCompany: gateOutOperation.transportCompany,
      driverName: gateOutOperation.driverName,
      vehicleNumber: gateOutOperation.vehicleNumber || gateOutOperation.truckNumber,
      
      // Gate Out Operation Details - REQUIRED: Date et Heure sortie
      gateOutDate: gateOutOperation.completedAt 
        ? new Date(gateOutOperation.completedAt).toISOString().split('T')[0]
        : now.toISOString().split('T')[0],
      gateOutTime: gateOutOperation.completedAt 
        ? new Date(gateOutOperation.completedAt).toTimeString().slice(0, 5)
        : now.toTimeString().slice(0, 5),
      operatorName,
      operatorId,
      yardId,
      createdAt: gateOutOperation.createdAt ? new Date(gateOutOperation.createdAt) : now,
      completedAt: gateOutOperation.completedAt ? new Date(gateOutOperation.completedAt) : now,
      
      // Location Information
      fromLocation: containers[0]?.location || 'DEPOT',
      
      // Additional Information
      notes: gateOutOperation.notes
    };
  }
}

// Export singleton instance
export const gateOutCodecoService = new GateOutCodecoService();
export default GateOutCodecoService;