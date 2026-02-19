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

export interface SendEDIRequest {
  fileName: string;
  fileContent: string;
  clientName: string;
  clientCode?: string;
  containerNumber: string;
  operation: 'GATE_IN' | 'GATE_OUT';
  transmissionLogId?: string;
}

export interface SendEDIResponse {
  success: boolean;
  message: string;
  details?: {
    fileName: string;
    server: string;
    host: string;
    remotePath: string;
    containerNumber: string;
    operation: string;
    attempt: number;
    testMode: boolean;
    configId: string;
  };
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
   * Generate EDI CODECO content only (without transmission)
   * Uses the Python EDI API for generation
   */
  async generateCodeco(request: Omit<GenerateAndTransmitRequest, 'sftpConfig'>): Promise<{
    success: boolean;
    ediFile?: string;
    ediContent?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-codeco-python`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: request.sender,
          receiver: request.receiver,
          company_code: request.companyCode,
          customer: request.customer,
          container_number: request.containerNumber,
          container_size: request.containerSize,
          container_type: request.containerType,
          transport_company: request.transportCompany,
          vehicle_number: request.vehicleNumber,
          operation_type: request.operationType,
          operation_date: request.operationDate,
          operation_time: request.operationTime,
          booking_reference: request.bookingReference,
          equipment_reference: request.equipmentReference,
          location_code: request.locationCode,
          location_details: request.locationDetails,
          operator_name: request.operatorName,
          operator_id: request.operatorId,
          yard_id: request.yardId,
          damage_reported: request.damageReported,
          damage_type: request.damageType,
          damage_description: request.damageDescription,
          damage_assessed_by: request.damageAssessedBy,
          damage_assessed_at: request.damageAssessedAt
        }),
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        // Non-JSON response (likely an error page)
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: data.success,
        ediFile: data.edi_file,
        ediContent: data.edi_content,
        error: data.error
      };
    } catch (error) {
      console.error('CODECO generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during CODECO generation'
      };
    }
  }

  /**
   * Send EDI file using the new unified API endpoint
   * This method uses the database-backed configuration system
   */
  async sendEDI(request: SendEDIRequest): Promise<SendEDIResponse> {
    try {
      console.log('Sending EDI request:', {
        fileName: request.fileName,
        fileContentLength: request.fileContent?.length,
        clientName: request.clientName,
        clientCode: request.clientCode,
        containerNumber: request.containerNumber,
        operation: request.operation,
        transmissionLogId: request.transmissionLogId
      });

      const response = await fetch(`${this.baseUrl}/send-edi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Send EDI failed:', data);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('EDI send error:', error);
      throw error;
    }
  }

  /**
   * Transmit an existing EDI file to SFTP server
   * @deprecated Use sendEDI instead for database-backed configuration
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

      // Try to parse as JSON, but handle non-JSON responses
      let data: GenerateAndTransmitResponse;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Non-JSON response (likely an error page or text)
        const text = await response.text();
        data = {
          status: 'error',
          message: text.substring(0, 200), // Truncate long error messages
          error: `Server returned non-JSON response: ${text.substring(0, 100)}...`
        };
      }

      // 207 Multi-Status means partial success (generated but not transmitted)
      if (!response.ok && response.status !== 207) {
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
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
