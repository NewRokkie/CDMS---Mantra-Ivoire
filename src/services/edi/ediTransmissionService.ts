/**
 * Service for managing EDI transmissions from database
 */
import { supabase } from '../api/supabaseClient';
import { sftpIntegrationService } from './sftpIntegrationService';

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
  configId: string;
  uploadedToSftp: boolean;
  errorMessage?: string;
  acknowledgmentReceived?: Date;
  createdAt: Date;
  updatedAt: Date;
  containerId?: string;
  clientId?: string;
  gateInOperationId?: string;
  gateOutOperationId?: string;
}

class EDITransmissionServiceImpl {
  /**
   * Get transmission history from database
   */
  async getTransmissionHistory(containerNumber?: string): Promise<EDITransmissionLog[]> {
    try {
      let query = supabase
        .from('edi_transmission_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (containerNumber) {
        query = query.eq('container_number', containerNumber);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        containerNumber: log.container_number,
        operation: log.operation as 'GATE_IN' | 'GATE_OUT',
        status: log.status as 'pending' | 'success' | 'failed' | 'retrying',
        attempts: log.attempts || 0,
        lastAttempt: new Date(log.last_attempt),
        fileName: log.file_name,
        fileSize: log.file_size || 0,
        partnerCode: log.partner_code,
        configId: log.config_id,
        uploadedToSftp: log.uploaded_to_sftp || false,
        errorMessage: log.error_message,
        acknowledgmentReceived: log.acknowledgment_received ? new Date(log.acknowledgment_received) : undefined,
        createdAt: new Date(log.created_at),
        updatedAt: new Date(log.updated_at),
        containerId: log.container_id,
        clientId: log.client_id,
        gateInOperationId: log.gate_in_operation_id,
        gateOutOperationId: log.gate_out_operation_id
      }));
    } catch (error) {
      console.error('Error fetching transmission history:', error);
      return [];
    }
  }

  /**
   * Get failed transmissions for a container
   */
  async getFailedTransmissions(containerNumber: string): Promise<EDITransmissionLog[]> {
    try {
      const { data, error } = await supabase
        .from('edi_transmission_logs')
        .select('*')
        .eq('container_number', containerNumber)
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        containerNumber: log.container_number,
        operation: log.operation as 'GATE_IN' | 'GATE_OUT',
        status: log.status as 'pending' | 'success' | 'failed' | 'retrying',
        attempts: log.attempts || 0,
        lastAttempt: new Date(log.last_attempt),
        fileName: log.file_name,
        fileSize: log.file_size || 0,
        partnerCode: log.partner_code,
        configId: log.config_id,
        uploadedToSftp: log.uploaded_to_sftp || false,
        errorMessage: log.error_message,
        acknowledgmentReceived: log.acknowledgment_received ? new Date(log.acknowledgment_received) : undefined,
        createdAt: new Date(log.created_at),
        updatedAt: new Date(log.updated_at),
        containerId: log.container_id,
        clientId: log.client_id,
        gateInOperationId: log.gate_in_operation_id,
        gateOutOperationId: log.gate_out_operation_id
      }));
    } catch (error) {
      console.error('Error fetching failed transmissions:', error);
      return [];
    }
  }

  /**
   * Retry a failed EDI transmission
   */
  async retryTransmission(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the transmission log
      const { data: log, error: logError } = await supabase
        .from('edi_transmission_logs')
        .select('*, gate_in_operations(*), gate_out_operations(*)')
        .eq('id', logId)
        .single();

      if (logError || !log) {
        throw new Error('Transmission log not found');
      }

      if (log.status !== 'failed') {
        throw new Error('Can only retry failed transmissions');
      }

      // Update status to retrying
      await supabase
        .from('edi_transmission_logs')
        .update({
          status: 'retrying',
          last_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      // Get operation data
      let gateInData;
      if (log.operation === 'GATE_IN' && log.gate_in_operations) {
        const op = log.gate_in_operations;
        gateInData = {
          containerNumber: op.container_number,
          containerSize: op.container_size,
          containerType: op.container_type || 'dry',
          clientCode: op.client_code,
          clientName: op.client_name,
          transportCompany: op.transport_company || 'Unknown',
          truckNumber: op.truck_number || 'Unknown',
          arrivalDate: op.truck_arrival_date || new Date().toISOString().split('T')[0],
          arrivalTime: op.truck_arrival_time || new Date().toTimeString().slice(0, 5),
          assignedLocation: op.assigned_location || 'Unknown',
          yardId: op.yard_id || 'unknown',
          operatorName: 'System',
          operatorId: 'system',
          damageReported: false,
          equipmentReference: op.equipment_reference
        };
      } else if (log.operation === 'GATE_OUT' && log.gate_out_operations) {
        const op = log.gate_out_operations;
        gateInData = {
          containerNumber: op.booking_number,
          containerSize: '40ft', // Default
          containerType: 'dry',
          clientCode: op.client_code,
          clientName: op.client_name,
          transportCompany: op.transport_company || 'Unknown',
          truckNumber: op.truck_number || 'Unknown',
          arrivalDate: new Date().toISOString().split('T')[0],
          arrivalTime: new Date().toTimeString().slice(0, 5),
          assignedLocation: 'GATE_OUT',
          yardId: op.yard_id || 'unknown',
          operatorName: 'System',
          operatorId: 'system',
          damageReported: false
        };
      } else {
        throw new Error('Operation data not found');
      }

      // Retry transmission using SFTP integration service
      const result = await sftpIntegrationService.processGateInWithSFTP(gateInData);

      if (result.transmitted) {
        // Update log as successful
        await supabase
          .from('edi_transmission_logs')
          .update({
            status: 'success',
            uploaded_to_sftp: true,
            error_message: null,
            attempts: (log.attempts || 0) + 1,
            last_attempt: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', logId);

        // Update gate operation
        if (log.gate_in_operation_id) {
          await supabase
            .from('gate_in_operations')
            .update({
              edi_transmitted: true,
              edi_transmission_date: new Date().toISOString(),
              edi_error_message: null
            })
            .eq('id', log.gate_in_operation_id);
        }

        return { success: true };
      } else {
        // Update log as failed again
        const errorMsg = result.error || 'Retry failed - no error details';
        await supabase
          .from('edi_transmission_logs')
          .update({
            status: 'failed',
            error_message: errorMsg,
            attempts: (log.attempts || 0) + 1,
            last_attempt: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', logId);

        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('Error retrying transmission:', error);
      
      // Update log as failed
      await supabase
        .from('edi_transmission_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Regenerate and transmit EDI for a container
   */
  async regenerateEDI(containerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get container with gate in operation
      const { data: container, error: containerError } = await supabase
        .from('containers')
        .select(`
          *,
          gate_in_operations(*)
        `)
        .eq('id', containerId)
        .single();

      if (containerError || !container) {
        throw new Error('Container not found');
      }

      const gateInOp = container.gate_in_operations?.[0];
      if (!gateInOp) {
        throw new Error('No gate in operation found for this container');
      }

      // Prepare gate in data
      const gateInData = {
        containerNumber: container.number,
        containerSize: container.size,
        containerType: container.type || 'dry',
        clientCode: container.client_code,
        clientName: container.client_name,
        transportCompany: gateInOp.transport_company || 'Unknown',
        truckNumber: gateInOp.truck_number || 'Unknown',
        arrivalDate: gateInOp.truck_arrival_date || new Date().toISOString().split('T')[0],
        arrivalTime: gateInOp.truck_arrival_time || new Date().toTimeString().slice(0, 5),
        assignedLocation: container.location || 'Unknown',
        yardId: container.yard_id || 'unknown',
        operatorName: 'System',
        operatorId: 'system',
        damageReported: false,
        equipmentReference: gateInOp.equipment_reference
      };

      // Process with SFTP integration
      const result = await sftpIntegrationService.processGateInWithSFTP(gateInData);

      if (result.transmitted) {
        // Update gate in operation
        await supabase
          .from('gate_in_operations')
          .update({
            edi_transmitted: true,
            edi_transmission_date: new Date().toISOString(),
            edi_error_message: null
          })
          .eq('id', gateInOp.id);

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error regenerating EDI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get EDI statistics
   */
  async getStatistics(): Promise<{
    totalTransmissions: number;
    successfulTransmissions: number;
    failedTransmissions: number;
    pendingTransmissions: number;
    successRate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('edi_transmission_logs')
        .select('status');

      if (error) throw error;

      const total = data?.length || 0;
      const successful = data?.filter(log => log.status === 'success').length || 0;
      const failed = data?.filter(log => log.status === 'failed').length || 0;
      const pending = data?.filter(log => log.status === 'pending' || log.status === 'retrying').length || 0;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      return {
        totalTransmissions: total,
        successfulTransmissions: successful,
        failedTransmissions: failed,
        pendingTransmissions: pending,
        successRate
      };
    } catch (error) {
      console.error('Error fetching EDI statistics:', error);
      return {
        totalTransmissions: 0,
        successfulTransmissions: 0,
        failedTransmissions: 0,
        pendingTransmissions: 0,
        successRate: 0
      };
    }
  }
}

export const ediTransmissionService = new EDITransmissionServiceImpl();
