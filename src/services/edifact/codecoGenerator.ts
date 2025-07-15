import { format } from 'date-fns';
import { CODECOMessage, EquipmentDetail, Container } from '../../types';

export class CODECOGenerator {
  private static segmentTerminator = "'";
  private static elementSeparator = '+';
  private static componentSeparator = ':';
  private static releaseCharacter = '?';

  static generateFromContainer(
    container: Container,
    operation: 'GATE_IN' | 'GATE_OUT',
    messageRef: string,
    partnerCode: string
  ): string {
    const now = new Date();
    const dateStr = format(now, 'yyMMdd');
    const timeStr = format(now, 'HHmm');
    
    const message: CODECOMessage = {
      messageHeader: {
        messageType: 'CODECO',
        version: 'D',
        release: '95B',
        controllingAgency: 'UN',
        messageReferenceNumber: messageRef,
        documentDate: now,
        documentTime: timeStr
      },
      beginningOfMessage: {
        documentNameCode: '9',
        documentNumber: `${operation}_${container.number}_${dateStr}`,
        messageFunction: '9'
      },
      dateTimePeriod: {
        qualifier: operation === 'GATE_IN' ? '132' : '133',
        dateTime: operation === 'GATE_IN' ? container.gateInDate! : container.gateOutDate!,
        formatQualifier: '203'
      },
      transportDetails: {
        transportStageQualifier: '20',
        conveyanceReferenceNumber: 'DEPOT001',
        modeOfTransport: '3' // Road transport
      },
      locationDetails: {
        locationQualifier: operation === 'GATE_IN' ? '11' : '5',
        locationIdentification: 'USNYC', // Example UN/LOCODE
        locationName: 'Container Depot'
      },
      equipmentDetails: [this.createEquipmentDetail(container, operation)]
    };

    return this.generateEDIFACT(message, partnerCode);
  }

  private static createEquipmentDetail(container: Container, operation: 'GATE_IN' | 'GATE_OUT'): EquipmentDetail {
    const sizeTypeMap: { [key: string]: string } = {
      '20ft': '22G1', // 20ft General Purpose
      '40ft': '42G1', // 40ft General Purpose
    };

    const detail: EquipmentDetail = {
      equipmentQualifier: 'CN',
      equipmentIdentification: container.number,
      equipmentSizeAndType: {
        sizeTypeCode: sizeTypeMap[container.size] || '42G1',
        codeListQualifier: '6'
      },
      statusOfEquipment: {
        equipmentStatusCode: operation === 'GATE_IN' ? '3' : '2', // Import/Export
        fullEmptyIndicator: '5' // Assume full, should be determined from actual data
      }
    };

    // Add damage details if present
    if (container.damage && container.damage.length > 0) {
      detail.damageDetails = container.damage.map((damage, index) => ({
        damageDetailsQualifier: 'DAM',
        damageCode: 'GEN', // General damage code
        damageLocation: 'ALL',
        damageType: 'SCR', // Scratch
        damageExtent: 'MIN' // Minor
      }));
    }

    return detail;
  }

  private static generateEDIFACT(message: CODECOMessage, partnerCode: string): string {
    const segments: string[] = [];
    
    // UNA Service String Advice
    segments.push(`UNA${this.componentSeparator}${this.elementSeparator}.${this.releaseCharacter} `);
    
    // UNB Interchange Header
    const dateTime = format(message.messageHeader.documentDate, 'yyMMdd') + 
                    format(message.messageHeader.documentDate, 'HHmm');
    segments.push(
      `UNB${this.elementSeparator}UNOC${this.componentSeparator}3${this.elementSeparator}` +
      `DEPOT${this.componentSeparator}01${this.elementSeparator}${partnerCode}${this.componentSeparator}01${this.elementSeparator}` +
      `${dateTime}${this.elementSeparator}${message.messageHeader.messageReferenceNumber}${this.segmentTerminator}`
    );
    
    // UNH Message Header
    segments.push(
      `UNH${this.elementSeparator}${message.messageHeader.messageReferenceNumber}${this.elementSeparator}` +
      `${message.messageHeader.messageType}${this.componentSeparator}${message.messageHeader.version}${this.componentSeparator}` +
      `${message.messageHeader.release}${this.componentSeparator}${message.messageHeader.controllingAgency}${this.segmentTerminator}`
    );
    
    // BGM Beginning of Message
    segments.push(
      `BGM${this.elementSeparator}${message.beginningOfMessage.documentNameCode}${this.elementSeparator}` +
      `${message.beginningOfMessage.documentNumber}${this.elementSeparator}${message.beginningOfMessage.messageFunction}${this.segmentTerminator}`
    );
    
    // DTM Date/Time/Period
    const operationDateTime = format(message.dateTimePeriod.dateTime, 'yyyyMMddHHmm');
    segments.push(
      `DTM${this.elementSeparator}${message.dateTimePeriod.qualifier}${this.componentSeparator}` +
      `${operationDateTime}${this.componentSeparator}${message.dateTimePeriod.formatQualifier}${this.segmentTerminator}`
    );
    
    // TDT Transport Information
    segments.push(
      `TDT${this.elementSeparator}${message.transportDetails.transportStageQualifier}${this.elementSeparator}` +
      `${message.transportDetails.conveyanceReferenceNumber}${this.elementSeparator}${this.elementSeparator}` +
      `${message.transportDetails.modeOfTransport}${this.segmentTerminator}`
    );
    
    // LOC Place/Location Identification
    segments.push(
      `LOC${this.elementSeparator}${message.locationDetails.locationQualifier}${this.elementSeparator}` +
      `${message.locationDetails.locationIdentification}${this.componentSeparator}${this.componentSeparator}${this.componentSeparator}` +
      `${message.locationDetails.locationName || ''}${this.segmentTerminator}`
    );
    
    // Equipment Details Loop
    message.equipmentDetails.forEach(equipment => {
      // EQD Equipment Details
      segments.push(
        `EQD${this.elementSeparator}${equipment.equipmentQualifier}${this.elementSeparator}` +
        `${equipment.equipmentIdentification}${this.elementSeparator}` +
        `${equipment.equipmentSizeAndType.sizeTypeCode}${this.componentSeparator}${this.componentSeparator}` +
        `${equipment.equipmentSizeAndType.codeListQualifier}${this.segmentTerminator}`
      );
      
      // EQA Equipment Status
      segments.push(
        `EQA${this.elementSeparator}${equipment.statusOfEquipment.equipmentStatusCode}${this.elementSeparator}` +
        `${equipment.statusOfEquipment.fullEmptyIndicator}${this.segmentTerminator}`
      );
      
      // MEA Measurements (if present)
      if (equipment.measurements) {
        segments.push(
          `MEA${this.elementSeparator}${equipment.measurements.measurementUnitQualifier}${this.elementSeparator}` +
          `${this.elementSeparator}${equipment.measurements.measurementUnitCode}${this.componentSeparator}` +
          `${equipment.measurements.measurementValue}${this.segmentTerminator}`
        );
      }
      
      // DAM Damage (if present)
      if (equipment.damageDetails) {
        equipment.damageDetails.forEach(damage => {
          segments.push(
            `DAM${this.elementSeparator}${damage.damageDetailsQualifier}${this.elementSeparator}` +
            `${damage.damageCode}${this.componentSeparator}${damage.damageLocation}${this.componentSeparator}` +
            `${damage.damageType}${this.componentSeparator}${damage.damageExtent}${this.segmentTerminator}`
          );
        });
      }
      
      // SEL Seal Number (if present)
      if (equipment.sealNumbers && equipment.sealNumbers.length > 0) {
        equipment.sealNumbers.forEach(seal => {
          segments.push(`SEL${this.elementSeparator}${seal}${this.segmentTerminator}`);
        });
      }
      
      // TMP Temperature (if present)
      if (equipment.temperatureSettings) {
        segments.push(
          `TMP${this.elementSeparator}${equipment.temperatureSettings.temperatureTypeQualifier}${this.elementSeparator}` +
          `${equipment.temperatureSettings.temperatureValue}${this.componentSeparator}` +
          `${equipment.temperatureSettings.temperatureUnitCode}${this.segmentTerminator}`
        );
      }
    });
    
    // UNT Message Trailer
    const segmentCount = segments.length + 1; // +1 for UNT itself
    segments.push(
      `UNT${this.elementSeparator}${segmentCount}${this.elementSeparator}` +
      `${message.messageHeader.messageReferenceNumber}${this.segmentTerminator}`
    );
    
    // UNZ Interchange Trailer
    segments.push(
      `UNZ${this.elementSeparator}1${this.elementSeparator}${message.messageHeader.messageReferenceNumber}${this.segmentTerminator}`
    );
    
    return segments.join('');
  }

  static parseFromJSON(jsonData: string): CODECOMessage {
    try {
      const data = JSON.parse(jsonData);
      return this.validateAndMapCODECO(data);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error}`);
    }
  }

  static parseFromXML(xmlData: string): Promise<CODECOMessage> {
    return new Promise((resolve, reject) => {
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser();
      
      parser.parseString(xmlData, (err: any, result: any) => {
        if (err) {
          reject(new Error(`Failed to parse XML: ${err}`));
        } else {
          try {
            const codeco = this.validateAndMapCODECO(result);
            resolve(codeco);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  private static validateAndMapCODECO(data: any): CODECOMessage {
    // Implement validation and mapping logic here
    // This is a simplified version - in production, you'd want comprehensive validation
    
    if (!data.container || !data.operation) {
      throw new Error('Invalid CODECO data: missing required fields');
    }
    
    // Map the data to CODECOMessage structure
    // This would be more complex in a real implementation
    return data as CODECOMessage;
  }
}