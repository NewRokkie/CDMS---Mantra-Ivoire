import { Builder } from 'xml2js';
import { format } from 'date-fns';
import { Container } from '../types';

export interface SapCodecoReportData {
  container: Container;
  operationType: 'GATE_IN' | 'GATE_OUT';
  transporter: string;
  vehicleNumber: string;
  clientCode: string;
  userName: string;
  containerLoadStatus: 'FULL' | 'EMPTY';
}

export interface SapCodecoReportXml {
  'n0:SAP_CODECO_REPORT_MT': {
    $: {
      'xmlns:n0': string;
      'xmlns:prx': string;
      'xmlns:soap-env': string;
    };
    Records: {
      Header: {
        Company_Code: string;
        Plant: string;
        Customer: string;
      };
      Item: {
        Weighbridge_ID: string;
        Transporter: string;
        Container_Number: string;
        Container_Size: string;
        Design: string;
        Type: string;
        Color: string;
        Status: string;
        Vehicle_Number: string;
        Created_Date: string;
        Created_Time: string;
        Created_By: string;
        Changed_Date: string;
        Changed_Time: string;
        Changed_By: string;
      };
    };
  };
}

/**
 * SAP XML Generator for CODECO Reports
 * Generates XML in SAP_CODECO_REPORT_MT format for EDI transmission
 */
export class SapXmlGenerator {
  
  /**
   * Map container type to SAP design code
   */
  private static getDesignCode(containerType: Container['type']): string {
    const designMapping = {
      'dry': '003',        // Standard dry container
      'reefer': '004',     // Refrigerated container
      'tank': '005',       // Tank container
      'flat_rack': '006',  // Flat rack container
      'open_top': '007'    // Open top container
    };
    
    return designMapping[containerType] || '003'; // Default to dry container
  }

  /**
   * Map container load status to SAP type code
   */
  private static getTypeCode(loadStatus: 'FULL' | 'EMPTY'): string {
    return loadStatus === 'FULL' ? '01' : '02';
  }

  /**
   * Map operation type to SAP status code
   */
  private static getStatusCode(operationType: 'GATE_IN' | 'GATE_OUT'): string {
    return operationType === 'GATE_IN' ? '01' : '02';
  }

  /**
   * Map container size to SAP format
   */
  private static getContainerSize(size: Container['size']): string {
    return size === '20ft' ? '20' : '40';
  }

  /**
   * Generate unique weighbridge ID for the operation
   */
  private static generateWeighbridgeId(
    operationType: 'GATE_IN' | 'GATE_OUT',
    containerNumber: string
  ): string {
    const prefix = operationType === 'GATE_IN' ? '244191' : '244192';
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const containerSuffix = containerNumber.slice(-3); // Last 3 chars of container number
    
    return `${prefix}${timestamp}${containerSuffix}`;
  }

  /**
   * Format date to SAP format (YYYYMMDD)
   */
  private static formatSapDate(date: Date): string {
    return format(date, 'yyyyMMdd');
  }

  /**
   * Format time to SAP format (HHMMSS)
   */
  private static formatSapTime(date: Date): string {
    return format(date, 'HHmmss');
  }

  /**
   * Generate SAP CODECO Report XML
   */
  static async generateSapCodecoReportXml(data: SapCodecoReportData): Promise<string> {
    const {
      container,
      operationType,
      transporter,
      vehicleNumber,
      clientCode,
      userName,
      containerLoadStatus
    } = data;

    const now = new Date();
    const weighbridgeId = this.generateWeighbridgeId(operationType, container.number);

    // Construct the XML object structure
    const xmlObject: SapCodecoReportXml = {
      'n0:SAP_CODECO_REPORT_MT': {
        $: {
          'xmlns:n0': 'urn:olam.com:IVC:EDIFACT:ONE',
          'xmlns:prx': 'urn:sap.com:proxy:GRP:/1SAI/TASC3DF160D1FCBB8D1B039:740',
          'xmlns:soap-env': 'http://schemas.xmlsoap.org/soap/envelope/'
        },
        Records: {
          Header: {
            Company_Code: 'CI14', // Hardcoded as per requirements
            Plant: '4191',        // Hardcoded as per requirements
            Customer: clientCode  // Client code as customer
          },
          Item: {
            Weighbridge_ID: weighbridgeId,
            Transporter: transporter,
            Container_Number: container.number,
            Container_Size: this.getContainerSize(container.size),
            Design: this.getDesignCode(container.type),
            Type: this.getTypeCode(containerLoadStatus),
            Color: '#312682', // Hardcoded as per sample
            Status: this.getStatusCode(operationType),
            Vehicle_Number: vehicleNumber,
            Created_Date: this.formatSapDate(container.createdAt || now),
            Created_Time: this.formatSapTime(container.createdAt || now),
            Created_By: container.createdBy || userName,
            Changed_Date: this.formatSapDate(container.updatedAt || now),
            Changed_Time: this.formatSapTime(container.updatedAt || now),
            Changed_By: container.updatedBy || userName
          }
        }
      }
    };

    // Build XML string using xml2js Builder
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { 
        pretty: true, 
        indent: '    ', 
        newline: '\n' 
      },
      headless: false
    });

    try {
      const xmlString = builder.buildObject(xmlObject);
      return xmlString;
    } catch (error) {
      throw new Error(`Failed to generate SAP CODECO XML: ${error}`);
    }
  }

  /**
   * Generate SAP CODECO Report XML from Gate In operation
   */
  static async generateFromGateIn(
    container: Container,
    transporter: string,
    vehicleNumber: string,
    userName: string,
    containerLoadStatus: 'FULL' | 'EMPTY' = 'FULL'
  ): Promise<string> {
    const data: SapCodecoReportData = {
      container,
      operationType: 'GATE_IN',
      transporter,
      vehicleNumber,
      clientCode: container.clientCode || container.client,
      userName,
      containerLoadStatus
    };

    return this.generateSapCodecoReportXml(data);
  }

  /**
   * Generate SAP CODECO Report XML from Gate Out operation
   */
  static async generateFromGateOut(
    container: Container,
    transporter: string,
    vehicleNumber: string,
    userName: string,
    containerLoadStatus: 'FULL' | 'EMPTY' = 'FULL'
  ): Promise<string> {
    const data: SapCodecoReportData = {
      container,
      operationType: 'GATE_OUT',
      transporter,
      vehicleNumber,
      clientCode: container.clientCode || container.client,
      userName,
      containerLoadStatus
    };

    return this.generateSapCodecoReportXml(data);
  }

  /**
   * Validate SAP XML structure
   */
  static validateSapXml(xmlString: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation checks
    if (!xmlString.includes('SAP_CODECO_REPORT_MT')) {
      errors.push('Missing SAP_CODECO_REPORT_MT root element');
    }

    if (!xmlString.includes('<Records>')) {
      errors.push('Missing Records element');
    }

    if (!xmlString.includes('<Header>')) {
      errors.push('Missing Header element');
    }

    if (!xmlString.includes('<Item>')) {
      errors.push('Missing Item element');
    }

    // Check for required fields
    const requiredFields = [
      'Company_Code',
      'Plant',
      'Customer',
      'Weighbridge_ID',
      'Container_Number',
      'Container_Size',
      'Design',
      'Type',
      'Status',
      'Vehicle_Number'
    ];

    requiredFields.forEach(field => {
      if (!xmlString.includes(`<${field}>`)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get container type description for logging
   */
  static getContainerTypeDescription(containerType: Container['type']): string {
    const descriptions = {
      'dry': 'Standard Dry Container',
      'reefer': 'Refrigerated Container',
      'tank': 'Tank Container',
      'flat_rack': 'Flat Rack Container',
      'open_top': 'Open Top Container'
    };
    
    return descriptions[containerType] || 'Unknown Container Type';
  }

  /**
   * Get operation description for logging
   */
  static getOperationDescription(operationType: 'GATE_IN' | 'GATE_OUT'): string {
    return operationType === 'GATE_IN' 
      ? 'Container Entry (Gate In)' 
      : 'Container Exit (Gate Out)';
  }
}