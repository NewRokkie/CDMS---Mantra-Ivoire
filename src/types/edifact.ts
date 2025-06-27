export interface CODECOMessage {
  messageHeader: {
    messageType: 'CODECO';
    version: string;
    release: string;
    controllingAgency: string;
    messageReferenceNumber: string;
    documentDate: Date;
    documentTime: string;
  };
  beginningOfMessage: {
    documentNameCode: string; // '9' for Container discharge/loading report
    documentNumber: string;
    messageFunction: string; // '9' for Original, '5' for Replace
  };
  dateTimePeriod: {
    qualifier: string; // '132' for Arrival date/time, '133' for Departure date/time
    dateTime: Date;
    formatQualifier: string; // '203' for CCYYMMDD:HHMM
  };
  transportDetails: {
    transportStageQualifier: string; // '20' for Main-carriage transport
    conveyanceReferenceNumber: string; // Vessel/Vehicle reference
    modeOfTransport: string; // '1' for Maritime, '3' for Road
  };
  locationDetails: {
    locationQualifier: string; // '5' for Place of loading, '11' for Place of discharge
    locationIdentification: string; // UN/LOCODE
    locationName?: string;
  };
  equipmentDetails: EquipmentDetail[];
}

export interface EquipmentDetail {
  equipmentQualifier: string; // 'CN' for Container
  equipmentIdentification: string; // Container number
  equipmentSizeAndType: {
    sizeTypeCode: string; // ISO 6346 size/type code
    codeListQualifier: string; // '6' for ISO 6346
  };
  statusOfEquipment: {
    equipmentStatusCode: string; // '1' for Continental, '2' for Export, '3' for Import
    fullEmptyIndicator: string; // '4' for Empty, '5' for Full
  };
  measurements?: {
    measurementUnitQualifier: string; // 'WT' for Weight
    measurementValue: number;
    measurementUnitCode: string; // 'KGM' for Kilograms
  };
  damageDetails?: DamageDetail[];
  sealNumbers?: string[];
  temperatureSettings?: {
    temperatureTypeQualifier: string; // '2' for Transport temperature
    temperatureValue: number;
    temperatureUnitCode: string; // 'CEL' for Celsius
  };
}

export interface DamageDetail {
  damageDetailsQualifier: string; // 'DAM' for Damage
  damageCode: string;
  damageLocation: string;
  damageType: string;
  damageExtent: string;
}

export interface EDITransmissionConfig {
  sftpHost: string;
  sftpPort: number;
  sftpUsername: string;
  sftpPassword?: string;
  sftpPrivateKey?: string;
  remotePath: string;
  fileNamePattern: string; // e.g., 'CODECO_{timestamp}_{reference}.edi'
  partnerCode: string;
  senderCode: string;
  testMode: boolean;
}

export interface EDITransmissionLog {
  id: string;
  messageType: 'CODECO';
  operation: 'GATE_IN' | 'GATE_OUT';
  containerNumber: string;
  fileName: string;
  transmissionDate: Date;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'ACKNOWLEDGED';
  errorMessage?: string;
  partnerCode: string;
  retryCount: number;
  acknowledgmentReceived?: Date;
}