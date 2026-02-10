/**
 * SFTP Transmission Service
 * 
 * Handles EDI file transmission to customer SFTP servers via Vercel API endpoints.
 * Provides a clean interface for transmitting EDI files with proper error handling.
 */

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remoteDir?: string;
}

export interface TransmitEDIRequest {
  ediContent: string;
  ediFilename: string;
  sftpConfig: SFTPConfig;
}

export interface TransmitEDIResponse {
  status: 'success' | 'error';
  message: string;
  filename?: string;
  remotePath?: string;
  error?: string;
}

export interface GenerateAndTransmitRequest {
  // Header Information
  sender: string;
  receiver: string;
  companyCode: string;
  customer: string;
  
  // Container Information
  containerNumber: string;
  containerSize: string;
  containerType: string;
  
  // Transport Information
  transportCompany: string;
  vehicleNumber: string;
  
  // Operation Information
  operationType: 'GATE_IN' | 'GATE_OUT';
  operationDate: string;
  operationTime: string;
  
  // Reference Information
  bookingReference?: string;
  equipmentReference?: string;
  
  // Location Information
  locationCode: string;
  locationDetails: string;
  
  // Operator Information
  operatorName: string;
  operatorId: string;
  yardId: string;
  
  // Damage Information (Optional)
  damageReported?: boolean;
  damageType?: string;
  damageDescription?: string;
  damageAssessedBy?: string;
  damageAssessedAt?: string;

  // SFTP Configuration
  sftpConfig: SFTPConfig;
}

export interface GenerateAndTransmitResponse {
  status: 'success' | 'error';
  message: string;
  stage?: 'validation' | 'generation' | 'transmission';
  edi_file?: string;
  edi_content?: string;
  uploaded_to_sftp?: boolean;
  remote_path?: string;
  error?: string;
}

class SFTPTransmissionService {
  private readonly baseUrl: string;

  constructor() {
    // Use relative URLs for Vercel API routes
    this.baseUrl = '/api/edi';
  }

  /**
   * Transmit an existing EDI file to SFTP server
   */
  async transmitEDI(request: TransmitEDIRequest): Promise<TransmitEDIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transmit-sftp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('SFTP transmission error:', error);
      throw error;
    }
  }

  /**
   * Generate EDI CODECO and transmit to SFTP server in one operation
   */
  async generateAndTransmit(request: GenerateAndTransmitRequest): Promise<GenerateAndTransmitResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-and-transmit-codeco`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      // 207 Multi-Status means partial success (generated but not transmitted)
      if (!response.ok && response.status !== 207) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Generate and transmit error:', error);
      throw error;
    }
  }

  /**
   * Test SFTP connection without transmitting files
   */
  async testConnection(sftpConfig: SFTPConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Create a minimal test file
      const testRequest: TransmitEDIRequest = {
        ediContent: 'TEST',
        ediFilename: `test_connection_${Date.now()}.txt`,
        sftpConfig,
      };

      const result = await this.transmitEDI(testRequest);
      
      return {
        success: result.status === 'success',
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}

// Export singleton instance
export const sftpTransmissionService = new SFTPTransmissionService();
