/**
 * SFTP Integration Service
 * 
 * Integrates the existing EDI Management system with the new Vercel SFTP transmission endpoints.
 * Links edi_server_configurations and edi_client_settings to enable automatic SFTP transmission.
 */

import { supabase } from '../api/supabaseClient';
import { sftpTransmissionService, type SFTPConfig } from './sftpTransmissionService';

export interface EDIClientSettings {
  id: string;
  client_id: string;
  client_code: string;
  client_name: string;
  edi_enabled: boolean;
  enable_gate_in: boolean;
  enable_gate_out: boolean;
  server_config_id: string | null;
  priority: 'high' | 'normal' | 'low';
  notes?: string;
}

export interface GateOperationData {
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
}

class SFTPIntegrationService {
  
  /**
   * Check if a client has EDI enabled and should use SFTP transmission
   */
  async isClientEDIEnabled(clientCode: string, operationType: 'GATE_IN' | 'GATE_OUT'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('edi_client_settings')
        .select('edi_enabled, enable_gate_in, enable_gate_out')
        .eq('client_code', clientCode)
        .eq('edi_enabled', true)
        .single();

      if (error || !data) {
        return false;
      }

      if (operationType === 'GATE_IN') {
        return data.enable_gate_in;
      } else {
        return data.enable_gate_out;
      }
    } catch (error) {
      console.error('Error checking client EDI status:', error);
      return false;
    }
  }

  /**
   * Get SFTP configuration for a client
   * Combines edi_client_settings with edi_server_configurations
   */
  async getSFTPConfigForClient(clientCode: string): Promise<SFTPConfig | null> {
    try {
      // Get client settings with server configuration
      const { data: clientSettings, error: clientError } = await supabase
        .from('edi_client_settings')
        .select(`
          *,
          server_config:edi_server_configurations(*)
        `)
        .eq('client_code', clientCode)
        .eq('edi_enabled', true)
        .single();

      if (clientError || !clientSettings) {
        console.log(`No EDI settings found for client: ${clientCode}`);
        return null;
      }

      interface ServerConfig {
        host: string;
        port: number;
        username: string;
        password: string;
        remote_path: string;
        enabled: boolean;
      }

      const serverConfig = clientSettings.server_config as unknown as ServerConfig | null;
      
      if (!serverConfig || !serverConfig.enabled) {
        console.log(`No enabled server configuration for client: ${clientCode}`);
        return null;
      }

      // Map server configuration to SFTP config
      return {
        host: serverConfig.host,
        port: serverConfig.port,
        username: serverConfig.username,
        password: serverConfig.password,
        remoteDir: serverConfig.remote_path || '/',
      };
    } catch (error) {
      console.error('Error getting SFTP config for client:', error);
      return null;
    }
  }

  /**
   * Get EDI sender/receiver codes from environment or server config
   */
  async getEDICodesForClient(clientCode: string): Promise<{
    sender: string;
    receiver: string;
    companyCode: string;
  }> {
    try {
      // Try to get from server configuration
      const { data: clientSettings } = await supabase
        .from('edi_client_settings')
        .select(`
          server_config:edi_server_configurations(sender_code, partner_code)
        `)
        .eq('client_code', clientCode)
        .single();

      interface ServerConfig {
        sender_code: string;
        partner_code: string;
      }

      const serverConfig = clientSettings?.server_config as unknown as ServerConfig | null;

      return {
        sender: serverConfig?.sender_code || import.meta.env.VITE_EDI_SENDER_CODE || 'CIABJ31',
        receiver: serverConfig?.partner_code || import.meta.env.VITE_EDI_RECEIVER_CODE || '4191',
        companyCode: import.meta.env.VITE_EDI_COMPANY_CODE || 'CIABJ31',
      };
    } catch (error) {
      console.error('Error getting EDI codes:', error);
      return {
        sender: import.meta.env.VITE_EDI_SENDER_CODE || 'CIABJ31',
        receiver: import.meta.env.VITE_EDI_RECEIVER_CODE || '4191',
        companyCode: import.meta.env.VITE_EDI_COMPANY_CODE || 'CIABJ31',
      };
    }
  }

  /**
   * Process Gate In operation with automatic SFTP transmission
   * This is the main integration point called from Gate In workflow
   */
  async processGateInWithSFTP(gateInData: {
    containerNumber: string;
    containerSize: string;
    containerType: string;
    clientCode: string;
    clientName: string;
    transportCompany: string;
    truckNumber: string;
    arrivalDate: string;
    arrivalTime: string;
    assignedLocation: string;
    yardId: string;
    operatorName: string;
    operatorId: string;
    damageReported?: boolean;
    damageType?: string;
    damageDescription?: string;
    damageAssessedBy?: string;
    damageAssessedAt?: string;
    equipmentReference?: string;
  }): Promise<{
    success: boolean;
    transmitted: boolean;
    remotePath?: string;
    error?: string;
  }> {
    try {
      // Check if client has EDI enabled for Gate In
      const ediEnabled = await this.isClientEDIEnabled(gateInData.clientCode, 'GATE_IN');
      
      if (!ediEnabled) {
        console.log(`EDI not enabled for client ${gateInData.clientCode} - Gate In`);
        return { success: true, transmitted: false };
      }

      // Get EDI codes (includes partner_code which is used as customer in EDI)
      const ediCodes = await this.getEDICodesForClient(gateInData.clientCode);

      // Format dates and times for EDI
      const arrivalDate = new Date(gateInData.arrivalDate);
      const operationDate = arrivalDate.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
      const operationTime = gateInData.arrivalTime.replace(/:/g, '') + '00'; // HHMMSS

      // Prepare data for Vercel API endpoint
      // Use partner_code (receiver) as customer for EDI message and filename
      const transmissionRequest: GateOperationData = {
        sender: ediCodes.sender,
        receiver: ediCodes.receiver,
        companyCode: ediCodes.companyCode,
        customer: ediCodes.receiver,  // Use partner_code (ONEY) instead of client_code (1088663)
        containerNumber: gateInData.containerNumber,
        containerSize: gateInData.containerSize,
        containerType: gateInData.containerType,
        transportCompany: gateInData.transportCompany,
        vehicleNumber: gateInData.truckNumber,
        operationType: 'GATE_IN',
        operationDate: operationDate,  // YYMMDD format
        operationTime: operationTime,  // HHMMSS format
        locationCode: 'CIABJ',  // Use proper location code, not UUID
        locationDetails: gateInData.assignedLocation,
        operatorName: gateInData.operatorName,
        operatorId: gateInData.operatorId,
        yardId: gateInData.yardId,
        damageReported: gateInData.damageReported,
        damageType: gateInData.damageType,
        damageDescription: gateInData.damageDescription,
        damageAssessedBy: gateInData.damageAssessedBy,
        damageAssessedAt: gateInData.damageAssessedAt,
        equipmentReference: gateInData.equipmentReference,
      };

      console.log('Transmission request data:', {
        customer: transmissionRequest.customer,  // Should be ONEY
        receiver: ediCodes.receiver,  // Should be ONEY
        clientCode: gateInData.clientCode,  // Will be 1088663
        clientName: gateInData.clientName,  // Will be ONE LINE
        containerNumber: transmissionRequest.containerNumber,
        operationDate: operationDate,  // Should be YYMMDD
        operationTime: operationTime,  // Should be HHMMSS
        locationCode: transmissionRequest.locationCode  // Should be CIABJ
      });

      // Generate EDI CODECO content first (without transmission)
      const generateResult = await sftpTransmissionService.generateCodeco(transmissionRequest);

      if (!generateResult.success || !generateResult.ediContent || !generateResult.ediFile) {
        throw new Error(generateResult.error || 'Failed to generate EDI content');
      }

      // Create transmission log first
      const logId = await this.createTransmissionLog({
        clientCode: gateInData.clientCode,
        containerNumber: gateInData.containerNumber,
        operationType: 'GATE_IN',
        ediFilename: generateResult.ediFile,
        ediContent: generateResult.ediContent,
      });

      try {
        // Validate all required fields before sending
        if (!generateResult.ediFile) {
          throw new Error('EDI filename is missing');
        }
        if (!generateResult.ediContent) {
          throw new Error('EDI content is missing');
        }
        if (!gateInData.clientName) {
          throw new Error('Client name is missing');
        }
        if (!gateInData.clientCode) {
          throw new Error('Client code is missing');
        }
        if (!gateInData.containerNumber) {
          throw new Error('Container number is missing');
        }

        // Send EDI using the new unified API with database-backed configuration
        const sendResult = await sftpTransmissionService.sendEDI({
          fileName: generateResult.ediFile,
          fileContent: generateResult.ediContent,
          clientName: gateInData.clientName,
          clientCode: gateInData.clientCode,
          containerNumber: gateInData.containerNumber,
          operation: 'GATE_IN',
          transmissionLogId: logId
        });

        // Update transmission log with final status
        await this.updateTransmissionLog(logId, {
          status: sendResult.success ? 'success' : 'failed',
          uploadedToSftp: sendResult.success,
          remotePath: sendResult.details?.remotePath,
          errorMessage: sendResult.error,
        });

        return {
          success: true,
          transmitted: sendResult.success,
          remotePath: sendResult.details?.remotePath,
          error: sendResult.error,
        };
      } catch (sendError) {
        // Update log as failed if send throws an error
        await this.updateTransmissionLog(logId, {
          status: 'failed',
          uploadedToSftp: false,
          errorMessage: sendError instanceof Error ? sendError.message : 'Unknown error during transmission',
        });
        
        throw sendError;
      }

    } catch (error) {
      console.error('Error processing Gate In with SFTP:', error);
      return {
        success: false,
        transmitted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process Gate Out operation with automatic SFTP transmission
   */
  async processGateOutWithSFTP(gateOutData: {
    containerNumbers: string[];
    containerSize: string;
    containerType: string;
    clientCode: string;
    clientName: string;
    transportCompany: string;
    truckNumber: string;
    gateOutDate: string;
    gateOutTime: string;
    yardId: string;
    operatorName: string;
    operatorId: string;
    bookingNumber?: string;
  }): Promise<{
    success: boolean;
    transmitted: boolean;
    remotePath?: string;
    error?: string;
  }> {
    try {
      // Check if client has EDI enabled for Gate Out
      const ediEnabled = await this.isClientEDIEnabled(gateOutData.clientCode, 'GATE_OUT');
      
      if (!ediEnabled) {
        console.log(`EDI not enabled for client ${gateOutData.clientCode} - Gate Out`);
        return { success: true, transmitted: false };
      }

      // Get EDI codes (includes partner_code which is used as customer in EDI)
      const ediCodes = await this.getEDICodesForClient(gateOutData.clientCode);

      // Process first container (can be extended for multiple containers)
      const containerNumber = gateOutData.containerNumbers[0];

      // Format dates and times for EDI
      const gateOutDate = new Date(gateOutData.gateOutDate);
      const operationDate = gateOutDate.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
      const operationTime = gateOutData.gateOutTime.replace(/:/g, '') + '00'; // HHMMSS

      // Prepare data for Vercel API endpoint
      // Use partner_code (receiver) as customer for EDI message and filename
      const transmissionRequest: GateOperationData = {
        sender: ediCodes.sender,
        receiver: ediCodes.receiver,
        companyCode: ediCodes.companyCode,
        customer: ediCodes.receiver,  // Use partner_code (ONEY) instead of client_code (1088663)
        containerNumber: containerNumber,
        containerSize: gateOutData.containerSize,
        containerType: gateOutData.containerType,
        transportCompany: gateOutData.transportCompany,
        vehicleNumber: gateOutData.truckNumber,
        operationType: 'GATE_OUT',
        operationDate: operationDate,  // YYMMDD format
        operationTime: operationTime,  // HHMMSS format
        locationCode: 'CIABJ',  // Use proper location code, not UUID
        locationDetails: 'Gate Out',
        operatorName: gateOutData.operatorName,
        operatorId: gateOutData.operatorId,
        yardId: gateOutData.yardId,
        bookingReference: gateOutData.bookingNumber,
      };

      // Generate EDI CODECO content first (without transmission)
      const generateResult = await sftpTransmissionService.generateCodeco(transmissionRequest);

      if (!generateResult.success || !generateResult.ediContent || !generateResult.ediFile) {
        throw new Error(generateResult.error || 'Failed to generate EDI content');
      }

      // Create transmission log first
      const logId = await this.createTransmissionLog({
        clientCode: gateOutData.clientCode,
        containerNumber: containerNumber,
        operationType: 'GATE_OUT',
        ediFilename: generateResult.ediFile,
        ediContent: generateResult.ediContent,
      });

      try {
        // Send EDI using the new unified API with database-backed configuration
        const sendResult = await sftpTransmissionService.sendEDI({
          fileName: generateResult.ediFile,
          fileContent: generateResult.ediContent,
          clientName: gateOutData.clientName,
          clientCode: gateOutData.clientCode,
          containerNumber: containerNumber,
          operation: 'GATE_OUT',
          transmissionLogId: logId
        });

        // Update transmission log with final status
        await this.updateTransmissionLog(logId, {
          status: sendResult.success ? 'success' : 'failed',
          uploadedToSftp: sendResult.success,
          remotePath: sendResult.details?.remotePath,
          errorMessage: sendResult.error,
        });

        return {
          success: true,
          transmitted: sendResult.success,
          remotePath: sendResult.details?.remotePath,
          error: sendResult.error,
        };
      } catch (sendError) {
        // Update log as failed if send throws an error
        await this.updateTransmissionLog(logId, {
          status: 'failed',
          uploadedToSftp: false,
          errorMessage: sendError instanceof Error ? sendError.message : 'Unknown error during transmission',
        });
        
        throw sendError;
      }

    } catch (error) {
      console.error('Error processing Gate Out with SFTP:', error);
      return {
        success: false,
        transmitted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create transmission log in database
   */
  private async createTransmissionLog(data: {
    clientCode: string;
    containerNumber: string;
    operationType: 'GATE_IN' | 'GATE_OUT';
    ediFilename: string;
    ediContent: string;
  }): Promise<string> {
    try {
      // Get client ID
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('code', data.clientCode)
        .single();

      if (!client) {
        throw new Error(`Client not found: ${data.clientCode}`);
      }

      // Get server config ID
      const { data: clientSettings } = await supabase
        .from('edi_client_settings')
        .select('server_config_id, server_config:edi_server_configurations(partner_code)')
        .eq('client_code', data.clientCode)
        .single();

      const serverConfig = clientSettings?.server_config as unknown as { partner_code: string } | null;

      // Insert transmission log
      const { data: log, error } = await supabase
        .from('edi_transmission_logs')
        .insert({
          client_id: client.id,
          container_number: data.containerNumber,
          operation: data.operationType,
          status: 'pending',
          file_name: data.ediFilename,
          file_content: data.ediContent,
          file_size: data.ediContent.length,
          config_id: clientSettings?.server_config_id,
          partner_code: serverConfig?.partner_code || 'UNKNOWN',
          uploaded_to_sftp: false,
          attempts: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating transmission log:', error);
        throw error;
      }

      return log.id;
    } catch (error) {
      console.error('Error in createTransmissionLog:', error);
      throw error;
    }
  }

  /**
   * Update transmission log in database
   */
  private async updateTransmissionLog(
    logId: string,
    data: {
      status: 'success' | 'failed';
      uploadedToSftp: boolean;
      remotePath?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('edi_transmission_logs')
        .update({
          status: data.status,
          uploaded_to_sftp: data.uploadedToSftp,
          remote_path: data.remotePath,
          error_message: data.errorMessage,
          last_attempt: new Date().toISOString(),
          acknowledgment_received: data.status === 'success' ? new Date().toISOString() : null,
        })
        .eq('id', logId);

      if (error) {
        console.error('Error updating transmission log:', error);
      }
    } catch (error) {
      console.error('Error in updateTransmissionLog:', error);
    }
  }

  /**
   * Log EDI transmission to database
   * @deprecated Use createTransmissionLog and updateTransmissionLog instead
   */
  private async logTransmission(data: {
    clientCode: string;
    containerNumber: string;
    operationType: 'GATE_IN' | 'GATE_OUT';
    status: 'success' | 'failed';
    ediFilename?: string;
    ediContent?: string;
    remotePath?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      // Get client ID
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('code', data.clientCode)
        .single();

      if (!client) {
        console.error(`Client not found: ${data.clientCode}`);
        return;
      }

      // Get server config ID
      const { data: clientSettings } = await supabase
        .from('edi_client_settings')
        .select('server_config_id')
        .eq('client_code', data.clientCode)
        .single();

      // Insert transmission log
      const { error } = await supabase
        .from('edi_transmission_logs')
        .insert({
          client_id: client.id,
          container_number: data.containerNumber,
          operation_type: data.operationType,
          status: data.status,
          file_name: data.ediFilename,
          file_content: data.ediContent,
          remote_path: data.remotePath,
          config_id: clientSettings?.server_config_id,
          uploaded_to_sftp: data.status === 'success',
          error_message: data.errorMessage,
          transmitted_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error logging transmission:', error);
      }
    } catch (error) {
      console.error('Error in logTransmission:', error);
    }
  }

  /**
   * Test SFTP connection for a client
   */
  async testClientSFTPConnection(clientCode: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const sftpConfig = await this.getSFTPConfigForClient(clientCode);
      
      if (!sftpConfig) {
        return {
          success: false,
          message: 'No SFTP configuration found for this client',
        };
      }

      return await sftpTransmissionService.testConnection(sftpConfig);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}

// Export singleton instance
export const sftpIntegrationService = new SFTPIntegrationService();
