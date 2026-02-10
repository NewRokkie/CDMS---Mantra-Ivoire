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

      const serverConfig = clientSettings.server_config as any;
      
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

      const serverConfig = clientSettings?.server_config as any;

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

      // Get SFTP configuration
      const sftpConfig = await this.getSFTPConfigForClient(gateInData.clientCode);
      
      if (!sftpConfig) {
        console.log(`No SFTP configuration found for client ${gateInData.clientCode}`);
        return { 
          success: true, 
          transmitted: false,
          error: 'No SFTP configuration found'
        };
      }

      // Get EDI codes
      const ediCodes = await this.getEDICodesForClient(gateInData.clientCode);

      // Prepare data for Vercel API endpoint
      const transmissionRequest: GateOperationData = {
        sender: ediCodes.sender,
        receiver: ediCodes.receiver,
        companyCode: ediCodes.companyCode,
        customer: gateInData.clientCode,
        containerNumber: gateInData.containerNumber,
        containerSize: gateInData.containerSize,
        containerType: gateInData.containerType,
        transportCompany: gateInData.transportCompany,
        vehicleNumber: gateInData.truckNumber,
        operationType: 'GATE_IN',
        operationDate: gateInData.arrivalDate,
        operationTime: gateInData.arrivalTime,
        locationCode: gateInData.yardId,
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

      // Call Vercel API endpoint to generate and transmit
      const result = await sftpTransmissionService.generateAndTransmit({
        ...transmissionRequest,
        sftpConfig,
      });

      // Log transmission to database
      await this.logTransmission({
        clientCode: gateInData.clientCode,
        containerNumber: gateInData.containerNumber,
        operationType: 'GATE_IN',
        status: result.uploaded_to_sftp ? 'success' : 'failed',
        ediFilename: result.edi_file,
        ediContent: result.edi_content,
        remotePath: result.remote_path,
        errorMessage: result.error,
      });

      return {
        success: true,
        transmitted: result.uploaded_to_sftp || false,
        remotePath: result.remote_path,
        error: result.error,
      };

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

      // Get SFTP configuration
      const sftpConfig = await this.getSFTPConfigForClient(gateOutData.clientCode);
      
      if (!sftpConfig) {
        console.log(`No SFTP configuration found for client ${gateOutData.clientCode}`);
        return { 
          success: true, 
          transmitted: false,
          error: 'No SFTP configuration found'
        };
      }

      // Get EDI codes
      const ediCodes = await this.getEDICodesForClient(gateOutData.clientCode);

      // Process first container (can be extended for multiple containers)
      const containerNumber = gateOutData.containerNumbers[0];

      // Prepare data for Vercel API endpoint
      const transmissionRequest: GateOperationData = {
        sender: ediCodes.sender,
        receiver: ediCodes.receiver,
        companyCode: ediCodes.companyCode,
        customer: gateOutData.clientCode,
        containerNumber: containerNumber,
        containerSize: gateOutData.containerSize,
        containerType: gateOutData.containerType,
        transportCompany: gateOutData.transportCompany,
        vehicleNumber: gateOutData.truckNumber,
        operationType: 'GATE_OUT',
        operationDate: gateOutData.gateOutDate,
        operationTime: gateOutData.gateOutTime,
        locationCode: gateOutData.yardId,
        locationDetails: 'Gate Out',
        operatorName: gateOutData.operatorName,
        operatorId: gateOutData.operatorId,
        yardId: gateOutData.yardId,
        bookingReference: gateOutData.bookingNumber,
      };

      // Call Vercel API endpoint to generate and transmit
      const result = await sftpTransmissionService.generateAndTransmit({
        ...transmissionRequest,
        sftpConfig,
      });

      // Log transmission to database
      await this.logTransmission({
        clientCode: gateOutData.clientCode,
        containerNumber: containerNumber,
        operationType: 'GATE_OUT',
        status: result.uploaded_to_sftp ? 'success' : 'failed',
        ediFilename: result.edi_file,
        ediContent: result.edi_content,
        remotePath: result.remote_path,
        errorMessage: result.error,
      });

      return {
        success: true,
        transmitted: result.uploaded_to_sftp || false,
        remotePath: result.remote_path,
        error: result.error,
      };

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
   * Log EDI transmission to database
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
