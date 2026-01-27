/**
 * CODECO (Container Discharge/Loading Order) Message Generator
 * Based on UN/EDIFACT D.96A specification
 * Reference: https://service.unece.org/trade/untdid/d00b/trmd/codeco_c.htm
 */

export interface CodecoMessageData {
  // Header Information
  sender: string;
  receiver: string;
  companyCode: string;
  plant: string;
  customer: string;
  
  // Container Information
  weighbridgeId: string;
  weighbridgeIdSno: string;
  transporter: string;
  containerNumber: string;
  containerSize: string;
  design: string;
  type: string;
  color?: string;
  cleanType: string;
  status: string;
  deviceNumber?: string;
  vehicleNumber: string;
  
  // Dates and Times
  createdDate: string;
  createdTime: string;
  createdBy: string;
  changedDate?: string;
  changedTime?: string;
  changedBy?: string;
  
  // Additional
  numOfEntries?: string;
}

export interface CodecoSegment {
  tag: string;
  elements: string[];
}

export class CodecoGenerator {
  private segments: CodecoSegment[] = [];
  private messageRefNumber: string;
  private interchangeRef: string;

  constructor() {
    const timestamp = new Date();
    this.messageRefNumber = this.generateMessageRef();
    this.interchangeRef = this.generateInterchangeRef(timestamp);
  }

  /**
   * Generate complete CODECO message from SAP XML data
   */
  public generateFromSAPData(data: CodecoMessageData): string {
    this.segments = [];

    // Build message structure according to CODECO specification
    this.addInterchangeHeader(data);
    this.addMessageHeader();
    this.addBeginningOfMessage(data);
    this.addDateTimePeriod(data);
    this.addNameAndAddress(data);
    this.addReferences(data);
    this.addTransportDetails(data);
    this.addEquipmentDetails(data);
    this.addEquipmentDates(data);
    this.addMeasurements(data);
    this.addDimensions(data);
    this.addFreeText(data);
    this.addMessageTrailer();
    this.addInterchangeTrailer();

    return this.formatMessage();
  }

  /**
   * UNB - Interchange Header
   * Mandatory, max 1 occurrence
   */
  private addInterchangeHeader(data: CodecoMessageData): void {
    const timestamp = new Date();
    const date = this.formatDate(timestamp, 'YYMMDD');
    const time = this.formatTime(timestamp, 'HHMM');
    
    this.segments.push({
      tag: 'UNB',
      elements: [
        'UNOC:3',                    // Syntax identifier and version
        `${data.sender}:ZZ`,         // Sender identification
        `${data.receiver}:ZZ`,       // Recipient identification
        `${date}:${time}`,           // Date and time of preparation
        this.interchangeRef,         // Interchange control reference
        '',                          // Recipient's reference/password
        'CODECO',                    // Application reference
        '',                          // Priority code
        '',                          // Acknowledgement request
        '',                          // Interchange agreement identifier
        ''                           // Test indicator
      ]
    });
  }

  /**
   * UNH - Message Header
   * Mandatory, max 1 occurrence
   */
  private addMessageHeader(): void {
    this.segments.push({
      tag: 'UNH',
      elements: [
        this.messageRefNumber,       // Message reference number
        'CODECO:D:96A:UN:EANCOM'    // Message identifier (CODECO, version D.96A)
      ]
    });
  }

  /**
   * BGM - Beginning of Message
   * Mandatory, max 1 occurrence
   * Code 393 = Container movement report
   */
  private addBeginningOfMessage(data: CodecoMessageData): void {
    this.segments.push({
      tag: 'BGM',
      elements: [
        '393',                       // Document name code (393 = Container movement report)
        data.weighbridgeId,          // Document number
        '9',                         // Message function code (9 = Original)
        ''                           // Response type code
      ]
    });
  }

  /**
   * DTM - Date/Time/Period
   * Conditional, max 9 occurrences
   */
  private addDateTimePeriod(data: CodecoMessageData): void {
    // Document date/time (137)
    const docDateTime = `${data.createdDate}${data.createdTime}`;
    this.segments.push({
      tag: 'DTM',
      elements: [
        `137:${docDateTime}:204`     // 137 = Document date/time, 204 = CCYYMMDDHHMMSS
      ]
    });

    // Message date/time (current)
    const now = new Date();
    const msgDateTime = this.formatDateTime(now, 'CCYYMMDDHHMMSS');
    this.segments.push({
      tag: 'DTM',
      elements: [
        `137:${msgDateTime}:204`
      ]
    });
  }

  /**
   * NAD - Name and Address
   * Conditional, max 9 occurrences
   * Party qualifier codes: CA=Carrier, TO=Terminal operator, FR=Freight forwarder, SH=Shipper
   */
  private addNameAndAddress(data: CodecoMessageData): void {
    // Terminal Operator (Yard/Plant)
    this.segments.push({
      tag: 'NAD',
      elements: [
        'TO',                        // Party qualifier (TO = Terminal operator)
        `${data.plant}:160:ZZZ`,    // Party identification (160 = Carrier code)
        '',                          // Name and address
        '',                          // Party name
        '',                          // Street
        '',                          // City name
        '',                          // Country subdivision
        '',                          // Postal code
        ''                           // Country code
      ]
    });

    // Freight Forwarder/Transporter
    if (data.transporter) {
      this.segments.push({
        tag: 'NAD',
        elements: [
          'FR',                      // Party qualifier (FR = Freight forwarder)
          `${data.transporter}:172:ZZZ`, // Party identification
          '',
          data.transporter           // Party name
        ]
      });
    }

    // Shipper/Customer
    this.segments.push({
      tag: 'NAD',
      elements: [
        'SH',                        // Party qualifier (SH = Shipper)
        `${data.customer}:160:ZZZ`, // Party identification
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
    });

    // Carrier (Company)
    this.segments.push({
      tag: 'NAD',
      elements: [
        'CA',                        // Party qualifier (CA = Carrier)
        `${data.companyCode}:172:ZZZ`, // Party identification
        '',
        data.companyCode             // Party name
      ]
    });
  }

  /**
   * RFF - Reference
   * Conditional, max 9 occurrences
   */
  private addReferences(data: CodecoMessageData): void {
    // Weighbridge reference
    this.segments.push({
      tag: 'RFF',
      elements: [
        `AAO:${data.weighbridgeId}` // AAO = Delivery order number
      ]
    });

    // Weighbridge sequence number
    if (data.weighbridgeIdSno) {
      this.segments.push({
        tag: 'RFF',
        elements: [
          `ABO:${data.weighbridgeIdSno}` // ABO = Proforma invoice number (used for sequence)
        ]
      });
    }

    // Device number
    if (data.deviceNumber) {
      this.segments.push({
        tag: 'RFF',
        elements: [
          `AES:${data.deviceNumber}` // AES = Serial number
        ]
      });
    }

    // Created by reference
    this.segments.push({
      tag: 'RFF',
      elements: [
        `AHP:${data.createdBy}`      // AHP = Responsible person
      ]
    });
  }

  /**
   * TDT - Details of Transport
   * Conditional, max 9 occurrences
   */
  private addTransportDetails(data: CodecoMessageData): void {
    if (data.vehicleNumber) {
      this.segments.push({
        tag: 'TDT',
        elements: [
          '20',                      // Transport stage qualifier (20 = Main carriage)
          '',                        // Conveyance reference number
          '3',                       // Mode of transport (3 = Road transport)
          '',                        // Transport means
          '',                        // Carrier
          '',                        // Transit direction
          '',                        // Excess transportation information
          '',                        // Transport identification
          data.vehicleNumber         // Transport means identification
        ]
      });
    }
  }

  /**
   * EQD - Equipment Details
   * Mandatory in equipment group, max 9999 occurrences
   */
  private addEquipmentDetails(data: CodecoMessageData): void {
    // Determine ISO container type code based on size and type
    const isoCode = this.getISOContainerCode(data.containerSize, data.type);
    
    // Full/Empty indicator: 4=Empty, 5=Full
    const fullEmptyIndicator = data.status === '01' ? '4' : '5';
    
    this.segments.push({
      tag: 'EQD',
      elements: [
        'CN',                        // Equipment qualifier (CN = Container)
        data.containerNumber,        // Equipment identification number
        `${isoCode}:102:5`,         // Equipment size and type (102 = Size and type, 5 = ISO code)
        '',                          // Equipment supplier
        fullEmptyIndicator,          // Equipment status (4=Empty, 5=Full)
        fullEmptyIndicator           // Full/empty indicator
      ]
    });
  }

  /**
   * MEA - Measurements
   * Conditional, max 9 occurrences per equipment
   */
  private addMeasurements(data: CodecoMessageData): void {
    // Container size as measurement
    const sizeInFeet = parseInt(data.containerSize);
    
    // Add tare weight (typical for container size)
    const tareWeight = sizeInFeet === 20 ? '2300' : '3900'; // kg
    this.segments.push({
      tag: 'MEA',
      elements: [
        'AAE',                       // Measurement purpose (AAE = Measurement)
        'T',                         // Measurement dimension (T = Tare weight)
        `KGM:${tareWeight}`         // Measure unit and value (KGM = Kilogram)
      ]
    });
  }

  /**
   * DIM - Dimensions
   * Conditional, max 9 occurrences per equipment
   */
  private addDimensions(data: CodecoMessageData): void {
    const size = parseInt(data.containerSize);
    
    // Standard container dimensions
    const length = size === 20 ? '6058' : '12192'; // mm
    const width = '2438';  // mm (standard)
    const height = '2591'; // mm (standard)
    
    this.segments.push({
      tag: 'DIM',
      elements: [
        '5',                         // Dimension qualifier (5 = External dimensions)
        `${length}:${width}:${height}` // Dimensions (length:width:height in mm)
      ]
    });
  }

  /**
   * DTM - Equipment Date/Time
   * Conditional, max 9 occurrences per equipment
   */
  private addEquipmentDates(data: CodecoMessageData): void {
    // Equipment positioning date/time (7 = Effective date)
    const eqDateTime = `${data.createdDate}${data.createdTime}`;
    this.segments.push({
      tag: 'DTM',
      elements: [
        `7:${eqDateTime}:204`        // 7 = Effective date/time
      ]
    });

    // Last change date/time if available
    if (data.changedDate && data.changedTime) {
      const changeDateTime = `${data.changedDate}${data.changedTime}`;
      this.segments.push({
        tag: 'DTM',
        elements: [
          `182:${changeDateTime}:204` // 182 = Revised date/time
        ]
      });
    }
  }

  /**
   * FTX - Free Text
   * Conditional, max 9 occurrences
   */
  private addFreeText(data: CodecoMessageData): void {
    // Add container attributes as free text
    const attributes: string[] = [];
    
    if (data.design) attributes.push(`Design:${data.design}`);
    if (data.cleanType) attributes.push(`CleanType:${data.cleanType}`);
    if (data.color) attributes.push(`Color:${data.color}`);
    if (data.numOfEntries) attributes.push(`Entries:${data.numOfEntries}`);
    
    if (attributes.length > 0) {
      this.segments.push({
        tag: 'FTX',
        elements: [
          'AAI',                     // Text subject qualifier (AAI = General information)
          '',                        // Text function
          '',                        // Text reference
          '',                        // Text literal
          attributes.join('; ')      // Free text
        ]
      });
    }

    // Add changed by information if available
    if (data.changedBy) {
      this.segments.push({
        tag: 'FTX',
        elements: [
          'AAI',
          '',
          '',
          '',
          `Modified by: ${data.changedBy}`
        ]
      });
    }
  }

  /**
   * UNT - Message Trailer
   * Mandatory, max 1 occurrence
   */
  private addMessageTrailer(): void {
    // Count all segments between UNH and UNT (inclusive)
    const segmentCount = this.segments.length - 1 + 2; // Exclude UNB, include UNH and UNT
    
    this.segments.push({
      tag: 'UNT',
      elements: [
        segmentCount.toString(),     // Number of segments in message
        this.messageRefNumber        // Message reference number (same as UNH)
      ]
    });
  }

  /**
   * UNZ - Interchange Trailer
   * Mandatory, max 1 occurrence
   */
  private addInterchangeTrailer(): void {
    this.segments.push({
      tag: 'UNZ',
      elements: [
        '1',                         // Interchange control count (number of messages)
        this.interchangeRef          // Interchange control reference (same as UNB)
      ]
    });
  }

  /**
   * Format the complete message
   */
  private formatMessage(): string {
    return this.segments
      .map(segment => {
        const elements = segment.elements.filter(e => e !== undefined);
        return `${segment.tag}+${elements.join('+')}'`;
      })
      .join('\n');
  }

  /**
   * Helper: Get ISO container code
   */
  private getISOContainerCode(size: string, type: string): string {
    const sizeCode = size === '20' ? '22' : '45';
    
    // Type mapping (simplified)
    const typeMap: Record<string, string> = {
      '01': 'G1', // General purpose
      '02': 'G1', // General purpose
      '03': 'R1', // Reefer
      '04': 'U1', // Open top
      '05': 'P1', // Flat rack
    };
    
    const typeCode = typeMap[type] || 'G1';
    return `${sizeCode}${typeCode}`;
  }

  /**
   * Helper: Generate message reference number
   */
  private generateMessageRef(): string {
    return Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  }

  /**
   * Helper: Generate interchange reference
   */
  private generateInterchangeRef(timestamp: Date): string {
    return this.formatDateTime(timestamp, 'CCYYMMDDHHMMSS');
  }

  /**
   * Helper: Format date
   */
  private formatDate(date: Date, format: 'YYMMDD' | 'CCYYMMDD'): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    if (format === 'YYMMDD') {
      return `${year.toString().slice(-2)}${month}${day}`;
    }
    return `${year}${month}${day}`;
  }

  /**
   * Helper: Format time
   */
  private formatTime(date: Date, format: 'HHMM' | 'HHMMSS'): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    if (format === 'HHMM') {
      return `${hours}${minutes}`;
    }
    return `${hours}${minutes}${seconds}`;
  }

  /**
   * Helper: Format date and time
   */
  private formatDateTime(date: Date, format: 'CCYYMMDDHHMMSS'): string {
    return this.formatDate(date, 'CCYYMMDD') + this.formatTime(date, 'HHMMSS');
  }
}

/**
 * Parse SAP XML to CodecoMessageData
 */
export function parseSAPXML(xmlContent: string): CodecoMessageData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const getText = (tagName: string): string => {
    const element = xmlDoc.querySelector(tagName);
    return element?.textContent?.trim() || '';
  };

  return {
    sender: getText('Company_Code') || 'SENDER',
    receiver: getText('Plant') || 'RECEIVER',
    companyCode: getText('Company_Code'),
    plant: getText('Plant'),
    customer: getText('Customer'),
    weighbridgeId: getText('Weighbridge_ID'),
    weighbridgeIdSno: getText('Weighbridge_ID_SNO'),
    transporter: getText('Transporter'),
    containerNumber: getText('Container_Number'),
    containerSize: getText('Container_Size'),
    design: getText('Design'),
    type: getText('Type'),
    color: getText('Color'),
    cleanType: getText('Clean_Type'),
    status: getText('Status'),
    deviceNumber: getText('Device_Number'),
    vehicleNumber: getText('Vehicle_Number'),
    createdDate: getText('Created_Date'),
    createdTime: getText('Created_Time'),
    createdBy: getText('Created_By'),
    changedDate: getText('Changed_Date'),
    changedTime: getText('Changed_Time'),
    changedBy: getText('Changed_By'),
    numOfEntries: getText('Num_Of_Entries')
  };
}
