/**
 * Types pour le système EDI
 */

export interface EDIContainerData {
  containerNumber: string;
  size: '20ft' | '40ft' | '45ft';
  type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  clientName: string;
  clientCode?: string;
  transporter: string;
  vehicleNumber: string;
  userName: string;
  containerLoadStatus: 'FULL' | 'EMPTY';
  status: 'GATE_IN' | 'GATE_OUT';
  timestamp: Date;
  location?: string;
  yardId?: string;
}

export interface EDITransmissionLog {
  id: string;
  containerNumber: string;
  operation: 'GATE_IN' | 'GATE_OUT';
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt: Date;
  fileName: string;
  fileSize: number;
  partnerCode: string;
  clientCode: string;
  serverId: string;
  uploadedToSftp: boolean;
  errorMessage?: string;
  transmissionDate: Date;
  acknowledgmentReceived?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EDIStats {
  totalTransmissions: number;
  successfulTransmissions: number;
  failedTransmissions: number;
  pendingTransmissions: number;
  successRate: number;
  serversConfigured: number;
  clientsWithEdi: number;
  averageProcessingTime: number;
  lastTransmissionDate?: Date;
}

export interface EDIServerConfig {
  id: string;
  name: string;
  type: 'FTP' | 'SFTP';
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
  enabled: boolean;
  testMode: boolean;
  timeout: number;
  retryAttempts: number;
  partnerCode: string;
  senderCode: string;
  fileNamePattern: string;
  assignedClients: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EDIClientConfig {
  id: string;
  clientCode: string;
  clientName: string;
  enableGateIn: boolean;
  enableGateOut: boolean;
  serverId: string;
  customSettings: {
    partnerCode?: string;
    senderCode?: string;
    fileNamePattern?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStatus {
  apiHealthy: boolean;
  apiInfo?: {
    name: string;
    version: string;
    status: string;
    docs: string;
  };
  stats: EDIStats;
  lastTransmissions: EDITransmissionLog[];
}