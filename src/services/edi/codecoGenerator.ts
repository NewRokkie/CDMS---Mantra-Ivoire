/**
 * CODECO (Container Discharge/Loading Order) Message Generator
 * Based on UN/EDIFACT D.95B specification matching client reference format
 * Reference format: UNB+UNOA:1+MANTRA+ONEY+260205:1428+MANTRA0205'
 */

export interface CodecoMessageData {
  // Header Information - REQUIRED for client format
  sender: string;           // Company name (e.g., MANTRA)
  receiver: string;         // Client Name (e.g., ONEY, PIL, etc...)
  companyCode: string;      // Company Code (MANTRA)
  plant: string;            // Yard/Depot Code (e.g., DEPOT-01)
  customer: string;         // Client Name (e.g., ONEY, PIL, etc...)
  
  // Container Information - REQUIRED
  containerNumber: string;  // TRHU6875483
  containerSize: string;    // 40 (for 40ft)
  containerType: string;    // EM (Empty)
  
  // Transport Information
  transportCompany: string;
  vehicleNumber: string;
  
  // Operation Information
  operationType: 'GATE_IN' | 'GATE_OUT';
  operationDate: string;    // 20260205
  operationTime: string;    // 0302
  
  // Reference Information
  bookingReference?: string;     // ABJG00064400
  equipmentReference?: string;   // Equipment Reference(EQR Ref No)
  
  // Location Information
  locationCode: string;     // CIABJ
  locationDetails: string;  // CIABJ32:STO:ZZZ
  
  // Operator Information
  operatorName: string;
  operatorId: string;
  yardId: string;
  
  // Additional fields for backward compatibility
  weighbridgeId?: string;
  weighbridgeIdSno?: string;
  transporter?: string;
  design?: string;
  type?: string;
  color?: string;
  cleanType?: string;
  status?: string;
  deviceNumber?: string;
  createdDate?: string;
  createdTime?: string;
  createdBy?: string;
  changedDate?: string;
  changedTime?: string;
  changedBy?: string;
  gateInDate?: string;
  gateInTime?: string;
  damageReported?: boolean;
  damageType?: string;
  damageDescription?: string;
  damageAssessedBy?: string;
  damageAssessedAt?: string;
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
   * Generate complete CODECO message matching client reference format
   */
  public generateFromSAPData(data: CodecoMessageData): string {
    this.segments = [];

    // Build message structure according to client reference format
    this.addInterchangeHeader(data);
    this.addMessageHeader();
    this.addBeginningOfMessage(data);
    this.addFreeText();
    this.addTransportDetails();
    this.addNameAndAddress(data);
    this.addEquipmentDetails(data);
    this.addReferences(data);
    this.addDateTimePeriod(data);
    this.addLocationDetails(data);
    this.addControlCount();
    this.addMessageTrailer();
    this.addInterchangeTrailer();

    return this.formatMessage();
  }

  /**
   * UNB - Interchange Header
   * Format: UNB+UNOA:1+MANTRA+ClientName+260205:1428+MANTRA0205'
   */
  private addInterchangeHeader(data: CodecoMessageData): void {
    const timestamp = new Date();
    const date = this.formatDate(timestamp, 'YYMMDD');
    const time = this.formatTime(timestamp, 'HHMM');
    
    this.segments.push({
      tag: 'UNB',
      elements: [
        'UNOA:1',                    // Syntax identifier and version (UNOA:1 for ASCII)
        data.sender || data.companyCode,  // Sender identification (Depot Code - MANTRA)
        data.receiver,                    // Recipient identification (Client Name)
        `${date}:${time}`,           // Date and time of preparation
        this.interchangeRef          // Interchange control reference (MANTRA0205)
      ]
    });
  }

  /**
   * UNH - Message Header
   * Format: UNH+COD02051428+CODECO:D:95B:UN:ITG14'
   */
  private addMessageHeader(): void {
    this.segments.push({
      tag: 'UNH',
      elements: [
        this.messageRefNumber,       // Message reference number (COD02051428)
        'CODECO:D:95B:UN:ITG14'     // Message identifier (CODECO, version D.95B)
      ]
    });
  }

  /**
   * BGM - Beginning of Message
   * Format: BGM+36+TRHU687548302051428+9'
   */
  private addBeginningOfMessage(data: CodecoMessageData): void {
    const docNumber = `${data.containerNumber}${this.formatDate(new Date(), 'DDMMYYHHMM')}`;
    
    this.segments.push({
      tag: 'BGM',
      elements: [
        '36',                        // Document name code (36 = Container movement report)
        docNumber,                   // Document number (TRHU687548302051428)
        '9'                          // Message function code (9 = Original)
      ]
    });
  }

  /**
   * FTX - Free Text
   * Format: FTX+AAI+++text' (optional additional segments)
   */
  private addFreeText(): void {
    // General information - REQUIRED
    this.segments.push({
      tag: 'FTX',
      elements: [
        'AAI'                        // Text subject qualifier (AAI = General information)
      ]
    });

    // OPTIONAL: Operator information (commented out to match client format)
    // Uncomment if needed for internal tracking
    // if (data.operatorName) {
    //   this.segments.push({
    //     tag: 'FTX',
    //     elements: [
    //       'AAI',                     // Text subject qualifier
    //       '',
    //       '',
    //       `Created by: ${data.operatorName}` // Operator name
    //     ]
    //   });
    // }

    // OPTIONAL: Damage assessment information (commented out to match client format)
    // Uncomment if needed for damage reporting
    // if (data.damageReported) {
    //   const damageText = data.damageDescription 
    //     ? `Damage: ${data.damageType || 'GENERAL'} - ${data.damageDescription}`
    //     : `Damage: ${data.damageType || 'GENERAL'}`;
    //   
    //   this.segments.push({
    //     tag: 'FTX',
    //     elements: [
    //       'AAI',                     // Text subject qualifier
    //       '',
    //       '',
    //       damageText                 // Damage information
    //     ]
    //   });
    // }
  }

  /**
   * TDT - Details of Transport
   * Format: TDT+1++3+31'
   */
  private addTransportDetails(): void {
    this.segments.push({
      tag: 'TDT',
      elements: [
        '1',                         // Transport stage qualifier (1 = Pre-carriage)
        '',                          // Conveyance reference number (empty)
        '3',                         // Mode of transport (3 = Road transport)
        '31'                         // Transport means (31 = Truck)
      ]
    });
  }

  /**
   * NAD - Name and Address segments
   * Format: NAD+MS+MANTRA', NAD+CF+DEPOT-01:160:20', NAD+CR+ONEY' (optional)
   */
  private addNameAndAddress(data: CodecoMessageData): void {
    // Message sender (MS) - Company Code
    this.segments.push({
      tag: 'NAD',
      elements: [
        'MS',                        // Party qualifier (MS = Message sender)
        data.sender || data.companyCode  // Party identification (Company Code - MANTRA)
      ]
    });

    // Consignee/Freight forwarder (CF) - Yard/Depot Code
    this.segments.push({
      tag: 'NAD',
      elements: [
        'CF',                        // Party qualifier (CF = Consignee/Freight forwarder)
        `${data.plant}:160:20`       // Party identification (Yard/Depot Code:160:20)
      ]
    });

    // Carrier (CR) - Client Name (OPTIONAL - not in standard client format)
    // Uncomment if needed for specific clients
    // this.segments.push({
    //   tag: 'NAD',
    //   elements: [
    //     'CR',                        // Party qualifier (CR = Carrier)
    //     data.customer                // Party identification (Client Name)
    //   ]
    // });
  }

  /**
   * EQD - Equipment Details
   * Format: EQD+CN+TRHU6875483+40EM:102:5+++4'
   */
  private addEquipmentDetails(data: CodecoMessageData): void {
    // Determine container type code
    const sizeType = `${data.containerSize}${data.containerType || 'EM'}`;
    
    this.segments.push({
      tag: 'EQD',
      elements: [
        'CN',                        // Equipment qualifier (CN = Container)
        data.containerNumber,        // Equipment identification number (TRHU6875483)
        `${sizeType}:102:5`,        // Equipment size and type (40EM:102:5)
        '',                          // Equipment supplier (empty)
        '',                          // Equipment status (empty)
        '4'                          // Equipment status code (4 = Empty)
      ]
    });
  }

  /**
   * RFF - Reference segments
   * Format: RFF+BN:ABJG00064400', RFF+BN:EQR-2025-001234' (only for ONEY)
   */
  private addReferences(data: CodecoMessageData): void {
    // Booking reference
    if (data.bookingReference) {
      this.segments.push({
        tag: 'RFF',
        elements: [
          `BN:${data.bookingReference}`  // BN = Booking reference
        ]
      });
    }

    // Equipment reference - only for ONEY client
    if (data.equipmentReference && data.customer && data.customer.toUpperCase().includes('ONEY')) {
      this.segments.push({
        tag: 'RFF',
        elements: [
          `BN:${data.equipmentReference}`  // BN = Equipment reference (only for ONEY)
        ]
      });
    }
  }

  /**
   * DTM - Date/Time/Period
   * Format: DTM+203:202602050302:203'
   */
  private addDateTimePeriod(data: CodecoMessageData): void {
    // Format: YYMMDDHHMMSS (202602050302)
    const operationDateTime = `20${data.operationDate}${data.operationTime.slice(0, 4)}`; // Remove seconds for this format
    
    this.segments.push({
      tag: 'DTM',
      elements: [
        `203:${operationDateTime}:203`  // 203 = Transport date/time (203:202602050302:203)
      ]
    });
  }

  /**
   * LOC - Location Details
   * Format: LOC+165+CIABJ:139:6+CIABJ31:STO:ZZZ' (PIL) or CIABJ32:STO:ZZZ' (ONEY)
   */
  private addLocationDetails(data: CodecoMessageData): void {
    // Determine location details based on client name
    let locationDetails = data.locationDetails;
    
    // If not explicitly set, determine based on customer (client name)
    if (!locationDetails || locationDetails === 'CIABJ32:STO:ZZZ') {
      if (data.customer && data.customer.toUpperCase().includes('PIL')) {
        locationDetails = 'CIABJ31:STO:ZZZ'; // PIL client
      } else if (data.customer && data.customer.toUpperCase().includes('ONEY')) {
        locationDetails = 'CIABJ32:STO:ZZZ'; // ONEY client
      } else {
        locationDetails = data.locationDetails || 'CIABJ32:STO:ZZZ'; // Default
      }
    }
    
    this.segments.push({
      tag: 'LOC',
      elements: [
        '165',                       // Location qualifier (165 = Place of positioning)
        `${data.locationCode}:139:6`, // Location identification (CIABJ:139:6)
        locationDetails              // Location details (CIABJ31 for PIL, CIABJ32 for ONEY)
      ]
    });
  }

  /**
   * CNT - Control Count
   * Format: CNT+16:1'
   */
  private addControlCount(): void {
    this.segments.push({
      tag: 'CNT',
      elements: [
        '16:1'                       // Control count (16:1 = Equipment count: 1)
      ]
    });
  }

  /**
   * UNT - Message Trailer
   * Format: UNT+12+COD02051428'
   */
  private addMessageTrailer(): void {
    // Count all segments between UNH and UNT (inclusive of UNT)
    // Segments after UNB: all segments - 1 (UNB) + 1 (UNT itself)
    const segmentCount = this.segments.length - 1 + 1; // Exclude UNB, include UNT
    
    this.segments.push({
      tag: 'UNT',
      elements: [
        segmentCount.toString(),     // Number of segments in message
        this.messageRefNumber        // Message reference number
      ]
    });
  }

  /**
   * UNZ - Interchange Trailer
   * Format: UNZ+1+MANTRA0205'
   */
  private addInterchangeTrailer(): void {
    this.segments.push({
      tag: 'UNZ',
      elements: [
        '1',                         // Interchange control count (1)
        this.interchangeRef          // Interchange control reference (MANTRA0205)
      ]
    });
  }

  /**
   * Format the complete message
   */
  private formatMessage(): string {
    return this.segments
      .map(segment => {
        // Keep empty elements to maintain exact client format
        return `${segment.tag}+${segment.elements.join('+')}'`;
      })
      .join('');
  }

  /**
   * Helper: Generate message reference number
   * Format: COD + DDMMYYHHMM (COD02051428)
   */
  private generateMessageRef(): string {
    const now = new Date();
    const dd = now.getDate().toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yy = now.getFullYear().toString().slice(-2);
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    
    return `COD${dd}${mm}${yy}${hh}${min}`;
  }

  /**
   * Helper: Generate interchange reference
   * Format: SENDER + MMDD (MANTRA0205)
   */
  private generateInterchangeRef(timestamp: Date): string {
    const mm = (timestamp.getMonth() + 1).toString().padStart(2, '0');
    const dd = timestamp.getDate().toString().padStart(2, '0');
    
    return `MANTRA${mm}${dd}`;
  }

  /**
   * Helper: Format date
   */
  private formatDate(date: Date, format: 'YYMMDD' | 'CCYYMMDD' | 'DDMMYYHHMM'): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (format === 'YYMMDD') {
      return `${year.toString().slice(-2)}${month}${day}`;
    } else if (format === 'CCYYMMDD') {
      return `${year}${month}${day}`;
    } else if (format === 'DDMMYYHHMM') {
      return `${day}${month}${year.toString().slice(-2)}${hours}${minutes}`;
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
}

/**
 * Parse SAP XML to CodecoMessageData (updated for client reference format)
 */
export function parseSAPXML(xmlContent: string): CodecoMessageData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const getText = (tagName: string): string => {
    const element = xmlDoc.querySelector(tagName);
    return element?.textContent?.trim() || '';
  };

  const now = new Date();
  const formatDate = (date: Date): string => {
    return date.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
  };
  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5).replace(/:/g, '') + '02'; // HHMM + seconds
  };

  return {
    // Header Information - REQUIRED for client format
    sender: getText('Company_Code') || 'MANTRA',        // Company name
    receiver: getText('Customer') || 'CLIENT',          // Client Name
    companyCode: getText('Company_Code') || 'MANTRA',   // Company Code
    plant: getText('Plant') || 'DEPOT',                 // Yard/Depot Code
    customer: getText('Customer') || 'CLIENT',          // Client Name
    
    // Container Information - REQUIRED
    containerNumber: getText('Container_Number'),
    containerSize: getText('Container_Size'),
    containerType: getText('Status') === '04' ? 'EM' : 'FL', // EM = Empty, FL = Full
    
    // Transport Information
    transportCompany: getText('Transporter'),
    vehicleNumber: getText('Vehicle_Number'),
    
    // Operation Information
    operationType: getText('Type') === '02' ? 'GATE_OUT' : 'GATE_IN',
    operationDate: formatDate(now),
    operationTime: formatTime(now),
    
    // Reference Information
    bookingReference: getText('Booking_Number') || '-',
    equipmentReference: 'EQR Ref No',
    
    // Location Information
    locationCode: 'CIABJ',
    locationDetails: 'CIABJ32:STO:ZZZ',
    
    // Operator Information
    operatorName: getText('Created_By') || 'SYSTEM',
    operatorId: 'SYS001',
    yardId: 'YARD01',
    
    // Backward compatibility fields
    weighbridgeId: getText('Weighbridge_ID'),
    weighbridgeIdSno: getText('Weighbridge_ID_SNO'),
    transporter: getText('Transporter'),
    design: getText('Design'),
    type: getText('Type'),
    color: getText('Color'),
    cleanType: getText('Clean_Type'),
    status: getText('Status'),
    deviceNumber: getText('Device_Number'),
    createdDate: getText('Created_Date'),
    createdTime: getText('Created_Time'),
    createdBy: getText('Created_By'),
    changedDate: getText('Changed_Date'),
    changedTime: getText('Changed_Time'),
    changedBy: getText('Changed_By'),
    numOfEntries: getText('Num_Of_Entries'),
    gateInDate: getText('Gate_In_Date'),
    gateInTime: getText('Gate_In_Time'),
    damageReported: getText('Damage_Reported') === 'true' || getText('Damage_Reported') === '1',
    damageType: getText('Damage_Type'),
    damageDescription: getText('Damage_Description'),
    damageAssessedBy: getText('Damage_Assessed_By'),
    damageAssessedAt: getText('Damage_Assessed_At')
  };
}

/**
 * Parse Gate In Operation data to CodecoMessageData
 * This function converts Gate In operation data to the client reference format
 */
export function parseGateInOperation(
  operation: any,
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
  const operationDate = operation.gateInDate ? 
    new Date(operation.gateInDate) : 
    (operation.truckArrivalDate ? 
      new Date(operation.truckArrivalDate + 'T' + (operation.truckArrivalTime || '00:00')) : 
      now);

  return {
    // Header Information - REQUIRED for client format
    sender: yardInfo.companyCode || 'MANTRA',           // Company name
    receiver: operation.clientName || 'CLIENT',         // Client Name
    companyCode: yardInfo.companyCode || 'MANTRA',      // Company Code
    plant: yardInfo.plant || 'DEPOT',                   // Yard/Depot Code
    customer: operation.clientName || 'CLIENT',         // Client Name
    
    // Container Information - REQUIRED
    containerNumber: operation.containerNumber,
    containerSize: operation.containerSize?.replace('ft', '') || '40',
    containerType: operation.fullEmpty === 'EMPTY' ? 'EM' : 'FL', // EM = Empty, FL = Full
    
    // Transport Information
    transportCompany: operation.transportCompany || 'UNKNOWN',
    vehicleNumber: operation.truckNumber || operation.vehicleNumber || 'UNKNOWN',
    
    // Operation Information
    operationType: 'GATE_IN',
    operationDate: formatDate(operationDate).slice(2), // YYMMDD format (260205)
    operationTime: formatTime(operationDate) + '02', // HHMM + seconds (0302)
    
    // Reference Information
    bookingReference: operation.bookingReference || operation.bookingNumber, // Booking reference for FULL containers or Gate Out
    equipmentReference: operation.equipmentReference, // Use actual equipment reference from Gate In
    
    // Location Information
    locationCode: 'CIABJ', // Default location code
    locationDetails: 'CIABJ32:STO:ZZZ', // Default location details
    
    // Operator Information
    operatorName: operation.operatorName || 'SYSTEM',
    operatorId: operation.operatorId || 'SYS001',
    yardId: operation.yardId || 'YARD01',
    
    // Backward compatibility fields
    weighbridgeId: `WB${operation.id || now.getTime()}`,
    weighbridgeIdSno: '00001',
    transporter: operation.transportCompany,
    design: '001',
    type: operation.containerType === 'reefer' ? '03' : '01',
    color: '#000000',
    cleanType: operation.classification === 'alimentaire' ? '002' : '001',
    status: operation.status === 'FULL' || operation.fullEmpty === 'FULL' ? '05' : '04',
    deviceNumber: operation.deviceNumber || `DEV${now.getTime()}`,
    createdDate: formatDate(operation.createdAt ? new Date(operation.createdAt) : now),
    createdTime: formatTime(operation.createdAt ? new Date(operation.createdAt) : now) + '00',
    createdBy: operation.operatorName || operation.createdBy || 'SYSTEM',
    changedDate: operation.updatedAt ? formatDate(new Date(operation.updatedAt)) : undefined,
    changedTime: operation.updatedAt ? formatTime(new Date(operation.updatedAt)) + '00' : undefined,
    changedBy: operation.updatedBy || undefined,
    numOfEntries: operation.containerQuantity?.toString() || '1',
    gateInDate: operation.gateInDate ? formatDate(new Date(operation.gateInDate)) : 
                operation.truckArrivalDate ? operation.truckArrivalDate.replace(/-/g, '') :
                formatDate(now),
    gateInTime: operation.gateInTime ? operation.gateInTime.replace(/:/g, '') + '00' :
                operation.truckArrivalTime ? operation.truckArrivalTime.replace(/:/g, '') + '00' :
                formatTime(now) + '00',
    damageReported: operation.damageAssessment?.hasDamage || operation.damageReported || false,
    damageType: operation.damageAssessment?.damageType || (operation.damageReported ? 'GENERAL' : undefined),
    damageDescription: operation.damageAssessment?.damageDescription || operation.damageDescription,
    damageAssessedBy: operation.damageAssessment?.assessedBy || operation.operatorName,
    damageAssessedAt: operation.damageAssessment?.assessedAt ? 
      formatDate(new Date(operation.damageAssessment.assessedAt)) + formatTime(new Date(operation.damageAssessment.assessedAt)) + '00' : 
      (operation.damageReported ? formatDate(now) + formatTime(now) + '00' : undefined)
  };
}

/**
 * Parse Gate Out Operation data to CodecoMessageData
 * This function converts Gate Out operation data to the client reference format
 */
export function parseGateOutOperation(
  operation: any,
  container: any,
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
  const operationDate = operation.completedAt ? 
    new Date(operation.completedAt) : 
    now;

  return {
    // Header Information - REQUIRED for client format
    sender: yardInfo.companyCode || 'MANTRA',           // Company name
    receiver: operation.clientName || container.clientName || 'CLIENT', // Client Name
    companyCode: yardInfo.companyCode || 'MANTRA',      // Company Code
    plant: yardInfo.plant || 'DEPOT',                   // Yard/Depot Code
    customer: operation.clientName || container.clientName || 'CLIENT', // Client Name
    
    // Container Information - REQUIRED
    containerNumber: container.number,
    containerSize: container.size?.replace('ft', '') || '40',
    containerType: 'FL', // Assume full for gate out
    
    // Transport Information
    transportCompany: operation.transportCompany || 'UNKNOWN',
    vehicleNumber: operation.vehicleNumber || operation.truckNumber || 'UNKNOWN',
    
    // Operation Information
    operationType: 'GATE_OUT',
    operationDate: formatDate(operationDate).slice(2), // YYMMDD format
    operationTime: formatTime(operationDate) + '02', // HHMM + seconds
    
    // Reference Information
    bookingReference: operation.bookingNumber || '-',
    equipmentReference: operation.equipmentReference || 'EQR Ref No',
    
    // Location Information
    locationCode: 'CIABJ', // Default location code
    locationDetails: 'CIABJ32:STO:ZZZ', // Default location details
    
    // Operator Information
    operatorName: operation.operatorName || 'SYSTEM',
    operatorId: operation.operatorId || 'SYS001',
    yardId: operation.yardId || 'YARD01',
    
    // Backward compatibility fields
    weighbridgeId: operation.bookingNumber || '-',
    weighbridgeIdSno: '00001',
    transporter: operation.transportCompany,
    design: '001',
    type: '02', // Gate Out type
    color: '#000000',
    cleanType: '001',
    status: '06', // Gate Out status
    deviceNumber: `DEV${Date.now().toString().slice(-8)}`,
    createdDate: formatDate(operation.createdAt ? new Date(operation.createdAt) : now),
    createdTime: formatTime(operation.createdAt ? new Date(operation.createdAt) : now) + '00',
    createdBy: operation.operatorName || 'SYSTEM',
    changedDate: operation.completedAt ? formatDate(new Date(operation.completedAt)) : undefined,
    changedTime: operation.completedAt ? formatTime(new Date(operation.completedAt)) + '00' : undefined,
    changedBy: operation.completedAt ? operation.operatorName : undefined,
    numOfEntries: '1',
    gateInDate: formatDate(operationDate), // Use gate out date
    gateInTime: formatTime(operationDate) + '00', // Use gate out time
    damageReported: false, // No damage assessment for gate out
    damageAssessedBy: operation.operatorName,
    damageAssessedAt: formatDate(now) + formatTime(now) + '00'
  };
}
