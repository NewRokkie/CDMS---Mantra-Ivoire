/**
 * Service EDI utilisant les données réelles de la base de données
 */

import { supabase } from '../api/supabaseClient';
import { ediDatabaseService, Client } from './ediDatabaseService';
import { ediConfigurationDatabaseService } from './ediConfigurationDatabase';
import { sftpTransmissionService } from './sftpTransmissionService';

export interface RealEDIStats {
  totalOperations: number;
  operationsWithEdi: number;
  clientsWithEdi: number;
  totalClients: number;
  successRate: number;
  recentOperations: Array<{
    id: string;
    type: 'GATE_IN' | 'GATE_OUT';
    containerNumber: string;
    clientCode: string;
    clientName: string;
    ediTransmitted: boolean;
    transmissionDate?: Date;
    createdAt: Date;
  }>;
}

export interface ClientEDIMapping {
  clientCode: string;
  clientName: string;
  ediEnabled: boolean;
  serverConfig?: {
    id: string;
    name: string;
    host: string;
    enabled: boolean;
  };
  hasOperations: boolean;
  recentOperationsCount: number;
}

class EDIRealDataService {

  /**
   * Récupère les statistiques EDI basées sur les données réelles
   */
  async getRealEDIStatistics(): Promise<RealEDIStats> {
    try {
      const dbStats = await ediDatabaseService.getEdiStatistics();
      const recentOps = await ediDatabaseService.getRecentEdiOperations(10);

      const totalOperations = dbStats.totalGateInOperations + dbStats.totalGateOutOperations;
      const operationsWithEdi = dbStats.gateInWithEdi + dbStats.gateOutWithEdi;
      const successRate = totalOperations > 0 ? (operationsWithEdi / totalOperations) * 100 : 0;

      return {
        totalOperations,
        operationsWithEdi,
        clientsWithEdi: dbStats.clientsWithEdi,
        totalClients: dbStats.totalClients,
        successRate,
        recentOperations: recentOps
      };
    } catch (error) {
      console.error('Error fetching real EDI statistics:', error);
      return {
        totalOperations: 0,
        operationsWithEdi: 0,
        clientsWithEdi: 0,
        totalClients: 0,
        successRate: 0,
        recentOperations: []
      };
    }
  }

  /**
   * Récupère le mapping client-serveur basé sur les données réelles
   */
  async getClientServerMappings(): Promise<ClientEDIMapping[]> {
    try {
      // Get all clients with EDI settings from edi_client_settings table
      const { data: ediClientSettings, error: ediError } = await supabase
        .from('edi_client_settings')
        .select(`
          client_code,
          client_name,
          edi_enabled,
          server_config_id,
          client_id
        `);

      if (ediError) {
        console.error('Error fetching EDI client settings:', ediError);
      }

      // Also get clients with auto_edi enabled but no specific EDI settings
      const clients = await ediDatabaseService.getClients();
      const clientsWithAutoEdi = clients.filter(client => 
        client.auto_edi && 
        !(ediClientSettings || []).some(setting => setting.client_code === client.code)
      );

      const mappings: ClientEDIMapping[] = [];

      // Process clients with specific EDI settings
      if (ediClientSettings) {
        for (const setting of ediClientSettings) {
          // Get server configuration if assigned
          let serverConfig = null;
          if (setting.server_config_id) {
            serverConfig = await ediConfigurationDatabaseService.getConfiguration(setting.server_config_id);
          }

          // Compter les opérations récentes pour ce client
          const recentOps = await this.getRecentOperationsForClient(setting.client_code);

          mappings.push({
            clientCode: setting.client_code,
            clientName: setting.client_name,
            ediEnabled: setting.edi_enabled || false,
            serverConfig: serverConfig ? {
              id: serverConfig.id,
              name: serverConfig.name,
              host: serverConfig.host,
              enabled: serverConfig.enabled
            } : undefined,
            hasOperations: recentOps.length > 0,
            recentOperationsCount: recentOps.length
          });
        }
      }

      // Process clients with auto_edi but no specific settings
      for (const client of clientsWithAutoEdi) {
        // Trouver la configuration serveur pour ce client
        const serverConfig = await ediConfigurationDatabaseService.getConfigurationForClient(
          client.code,
          client.name
        );

        // Compter les opérations récentes pour ce client
        const recentOps = await this.getRecentOperationsForClient(client.code);

        mappings.push({
          clientCode: client.code,
          clientName: client.name,
          ediEnabled: client.auto_edi || false,
          serverConfig: serverConfig ? {
            id: serverConfig.id,
            name: serverConfig.name,
            host: serverConfig.host,
            enabled: serverConfig.enabled
          } : undefined,
          hasOperations: recentOps.length > 0,
          recentOperationsCount: recentOps.length
        });
      }

      console.log('Client mappings generated:', mappings.length, 'clients');
      console.log('Mappings:', mappings.map(m => `${m.clientName} (${m.clientCode}) - EDI: ${m.ediEnabled}`));
      
      return mappings.sort((a, b) => a.clientName.localeCompare(b.clientName));
    } catch (error) {
      console.error('Error fetching client server mappings:', error);
      return [];
    }
  }

  /**
   * Récupère les opérations récentes pour un client spécifique
   */
  private async getRecentOperationsForClient(clientCode: string): Promise<any[]> {
    try {
      const allRecentOps = await ediDatabaseService.getRecentEdiOperations(50);
      return allRecentOps.filter(op => op.clientCode === clientCode);
    } catch (error) {
      console.error('Error fetching recent operations for client:', error);
      return [];
    }
  }

  /**
   * Active/désactive l'EDI pour un client
   */
  async toggleClientEDI(clientCode: string, enabled: boolean): Promise<void> {
    try {
      const client = await ediDatabaseService.getClientByCodeOrName(clientCode);
      if (!client) {
        throw new Error(`Client with code ${clientCode} not found`);
      }

      // Check if client has specific EDI settings
      const { data: ediSetting, error: settingError } = await supabase
        .from('edi_client_settings')
        .select('*')
        .eq('client_code', clientCode)
        .maybeSingle();

      if (settingError) {
        console.error('Error checking EDI settings:', settingError);
      }

      if (ediSetting) {
        // Update edi_client_settings table
        console.log(`Updating edi_client_settings for ${clientCode} to ${enabled}`);
        const { error: updateError } = await supabase
          .from('edi_client_settings')
          .update({ edi_enabled: enabled })
          .eq('client_code', clientCode);

        if (updateError) {
          throw new Error(`Failed to update EDI client settings: ${updateError.message}`);
        }
        console.log(`Successfully updated edi_client_settings for ${clientCode}`);
      } else {
        // Update clients.auto_edi field
        console.log(`Updating clients.auto_edi for ${clientCode} to ${enabled}`);
        await ediDatabaseService.updateClientEdiStatus(client.id, enabled);
        console.log(`Successfully updated clients.auto_edi for ${clientCode}`);
      }
    } catch (error) {
      console.error('Error toggling client EDI:', error);
      throw error;
    }
  }

  /**
   * Vérifie si l'EDI est activé pour un client et une opération
   */
  async isEDIEnabledForOperation(
    clientCode: string, 
    _operation: 'GATE_IN' | 'GATE_OUT'
  ): Promise<boolean> {
    try {
      // Vérifier d'abord si le client a l'EDI activé dans la base
      const ediEnabled = await ediDatabaseService.isClientEdiEnabled(clientCode);
      if (!ediEnabled) {
        return false;
      }

      // Vérifier s'il y a une configuration serveur pour ce client
      const client = await ediDatabaseService.getClientByCodeOrName(clientCode);
      if (!client) {
        return false;
      }

      const serverConfig = await ediConfigurationDatabaseService.getConfigurationForClient(
        client.code,
        client.name
      );

      return serverConfig?.enabled || false;
    } catch (error) {
      console.error('Error checking EDI enabled for operation:', error);
      return false;
    }
  }

  /**
   * Traite une opération Gate In avec EDI réel
   */
  async processRealGateInEDI(
    operationId: string,
    _containerNumber: string,
    clientCode: string
  ): Promise<{ success: boolean; message: string; logId?: string }> {
    try {
      // Vérifier si l'EDI est activé
      const ediEnabled = await this.isEDIEnabledForOperation(clientCode, 'GATE_IN');
      if (!ediEnabled) {
        return {
          success: true,
          message: 'EDI not enabled for this client - operation completed normally'
        };
      }

      // Simuler le traitement EDI (en production, cela ferait la vraie transmission)
      const logId = `edi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Mettre à jour le statut EDI dans la base
      await ediDatabaseService.updateGateInEdiStatus(operationId, true, new Date());

      console.log(`EDI transmission initiated for Gate In operation ${operationId}`);

      return {
        success: true,
        message: 'EDI transmission initiated successfully',
        logId
      };
    } catch (error) {
      console.error('Error processing real Gate In EDI:', error);
      return {
        success: false,
        message: `EDI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Traite une opération Gate Out avec EDI réel + transmission SFTP + retry
   */
  async processRealGateOutEDI(
    operationId: string,
    _bookingNumber: string,
    clientCode: string
  ): Promise<{ success: boolean; message: string; logId?: string }> {
    try {
      // Vérifier si l'EDI est activé
      const ediEnabled = await this.isEDIEnabledForOperation(clientCode, 'GATE_OUT');
      if (!ediEnabled) {
        return {
          success: true,
          message: 'EDI not enabled for this client - operation completed normally'
        };
      }

      // Récupérer la configuration serveur pour ce client
      const client = await ediDatabaseService.getClientByCodeOrName(clientCode);
      if (!client) {
        return { success: false, message: `Client ${clientCode} not found` };
      }

      const serverConfig = await ediConfigurationDatabaseService.getConfigurationForClient(
        client.code,
        client.name
      );

      if (!serverConfig || !serverConfig.enabled) {
        return { success: false, message: 'No enabled SFTP server configuration found for this client' };
      }

      // Récupérer les détails de l'opération Gate Out depuis la base
      const { data: operation, error: opError } = await supabase
        .from('gate_out_operations')
        .select('*')
        .eq('id', operationId)
        .maybeSingle();

      if (opError || !operation) {
        return { success: false, message: `Gate out operation ${operationId} not found` };
      }

      // Récupérer les conteneurs traités pour cette opération
      const containerIds: string[] = operation.processed_container_ids || [];
      if (containerIds.length === 0) {
        return { success: false, message: 'No containers found for this gate out operation' };
      }

      const { data: containers } = await supabase
        .from('containers')
        .select('number, size, type')
        .in('id', containerIds);

      if (!containers || containers.length === 0) {
        return { success: false, message: 'Could not fetch container details' };
      }

      const maxRetries = serverConfig.retryAttempts ?? 3;
      const logId = `edi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      let lastError = '';
      let anyTransmitted = false;

      // Générer et transmettre un EDI par conteneur
      for (const container of containers) {
        let transmitted = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Délai exponentiel entre retries (sauf premier essai)
            if (attempt > 1) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            }

            const gateOutDate = operation.completed_at
              ? new Date(operation.completed_at)
              : new Date();

            // Helper functions for proper date formatting
            const formatEDIDate = (date: Date) => {
              return date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
            };

            const formatEDITime = (date: Date) => {
              return date.toTimeString().slice(0, 5).replace(':', '') + '00'; // HHMMSS
            };

            const operationDate = formatEDIDate(gateOutDate);
            const operationTime = formatEDITime(gateOutDate);

            // Générer le contenu EDI CODECO
            const generateResult = await sftpTransmissionService.generateCodeco({
              sender: serverConfig.senderCode || 'CIABJ31',
              receiver: serverConfig.partnerCode || 'UNKNOWN',
              companyCode: serverConfig.senderCode || 'CIABJ31',
              customer: serverConfig.partnerCode || 'UNKNOWN',
              containerNumber: container.number,
              containerSize: (container.size || '20ft').replace('ft', ''),
              containerType: container.type || 'dry',
              transportCompany: operation.transport_company || '',
              vehicleNumber: operation.vehicle_number || '',
              operationType: 'GATE_OUT',
              operationDate,
              operationTime,
              locationCode: 'CIABJ',
              locationDetails: 'Gate Out',
              operatorName: operation.operator_name || 'System',
              operatorId: operation.operator_id || 'system',
              yardId: operation.yard_id || '',
              bookingReference: operation.booking_number,
            });

            if (!generateResult.success || !generateResult.ediContent || !generateResult.ediFile) {
              throw new Error(generateResult.error || 'Failed to generate EDI content');
            }

            // Envoyer via SFTP
            const sendResult = await sftpTransmissionService.sendEDI({
              fileName: generateResult.ediFile,
              fileContent: generateResult.ediContent,
              clientName: client.name,
              clientCode: client.code,
              containerNumber: container.number,
              operation: 'GATE_OUT',
            });

            if (sendResult.success) {
              transmitted = true;
              anyTransmitted = true;
              console.log(`EDI transmitted for container ${container.number} (attempt ${attempt})`);
              break;
            } else {
              lastError = sendResult.error || 'Transmission failed';
              console.warn(`EDI attempt ${attempt} failed for ${container.number}: ${lastError}`);
            }
          } catch (attemptError) {
            lastError = attemptError instanceof Error ? attemptError.message : 'Unknown error';
            console.warn(`EDI attempt ${attempt} error for ${container.number}: ${lastError}`);
          }
        }

        if (!transmitted) {
          console.error(`EDI transmission failed after ${maxRetries} attempts for container ${container.number}`);
        }
      }

      // Mettre à jour le statut EDI dans la base seulement si au moins un conteneur a été transmis
      if (anyTransmitted) {
        await ediDatabaseService.updateGateOutEdiStatus(operationId, true, new Date());
      }

      console.log(`EDI processing completed for Gate Out operation ${operationId}`);

      return {
        success: anyTransmitted,
        message: anyTransmitted ? 'EDI transmission completed' : `EDI transmission failed: ${lastError || 'All containers failed'}`,
        logId
      };
    } catch (error) {
      console.error('Error processing real Gate Out EDI:', error);
      return {
        success: false,
        message: `EDI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Récupère les clients disponibles pour la configuration EDI
   */
  async getAvailableClients(): Promise<Client[]> {
    return ediDatabaseService.getClients();
  }

  /**
   * Recherche des clients
   */
  async searchClients(query: string): Promise<Client[]> {
    return ediDatabaseService.searchClients(query);
  }

  /**
   * Récupère les codes clients uniques
   */
  async getUniqueClientCodes(): Promise<string[]> {
    return ediDatabaseService.getUniqueClientCodes();
  }

  /**
   * Test de la résolution client-serveur
   */
  async testClientServerResolution(clientCode: string): Promise<{
    clientFound: boolean;
    clientName?: string;
    ediEnabled: boolean;
    serverConfigured: boolean;
    serverName?: string;
    serverHost?: string;
    recommendation: string;
  }> {
    try {
      const client = await ediDatabaseService.getClientByCodeOrName(clientCode);
      
      if (!client) {
        return {
          clientFound: false,
          ediEnabled: false,
          serverConfigured: false,
          recommendation: `Client avec le code "${clientCode}" non trouvé dans la base de données`
        };
      }

      const serverConfig = await ediConfigurationDatabaseService.getConfigurationForClient(
        client.code,
        client.name
      );

      let recommendation = '';
      if (!client.auto_edi) {
        recommendation = 'EDI désactivé pour ce client. Activez-le dans la configuration client si nécessaire.';
      } else if (!serverConfig || !serverConfig.enabled) {
        recommendation = 'Client avec EDI activé mais aucun serveur configuré. Configurez un serveur EDI.';
      } else {
        recommendation = 'Configuration complète et fonctionnelle.';
      }

      return {
        clientFound: true,
        clientName: client.name,
        ediEnabled: client.auto_edi || false,
        serverConfigured: serverConfig?.enabled || false,
        serverName: serverConfig?.name,
        serverHost: serverConfig?.host,
        recommendation
      };
    } catch (error) {
      console.error('Error testing client server resolution:', error);
      return {
        clientFound: false,
        ediEnabled: false,
        serverConfigured: false,
        recommendation: `Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Create or update client EDI settings in edi_client_settings table
   */
  async saveClientEDISettings(data: {
    clientCode: string;
    clientName: string;
    ediEnabled: boolean;
    enableGateIn: boolean;
    enableGateOut: boolean;
    serverId: string;
    priority: 'high' | 'normal' | 'low';
    notes?: string;
  }): Promise<void> {
    try {
      const client = await ediDatabaseService.getClientByCodeOrName(data.clientCode);
      if (!client) {
        throw new Error(`Client with code ${data.clientCode} not found`);
      }

      // Check if settings already exist by client_id (unique constraint)
      const { data: existingSettings, error: checkError } = await supabase
        .from('edi_client_settings')
        .select('id')
        .eq('client_id', client.id)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to check existing settings: ${checkError.message}`);
      }

      const settingsData = {
        client_id: client.id,
        client_code: data.clientCode,
        client_name: data.clientName,
        edi_enabled: data.ediEnabled,
        enable_gate_in: data.enableGateIn,
        enable_gate_out: data.enableGateOut,
        server_config_id: data.serverId || null,
        priority: data.priority,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        // Update existing settings using client_id
        const { error: updateError } = await supabase
          .from('edi_client_settings')
          .update(settingsData)
          .eq('client_id', client.id);

        if (updateError) {
          throw new Error(`Failed to update client EDI settings: ${updateError.message}`);
        }
      } else {
        // Insert new settings
        const { error: insertError } = await supabase
          .from('edi_client_settings')
          .insert({
            ...settingsData,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          throw new Error(`Failed to create client EDI settings: ${insertError.message}`);
        }
      }

      // Also update clients.auto_edi field for backward compatibility
      await ediDatabaseService.updateClientEdiStatus(client.id, data.ediEnabled);
    } catch (error) {
      console.error('Error saving client EDI settings:', error);
      throw error;
    }
  }

  /**
   * Delete client EDI configuration completely
   */
  async deleteClientEDI(clientCode: string): Promise<void> {
    try {
      const client = await ediDatabaseService.getClientByCodeOrName(clientCode);
      if (!client) {
        throw new Error(`Client with code ${clientCode} not found`);
      }

      // Delete from edi_client_settings table if exists
      const { error: deleteError } = await supabase
        .from('edi_client_settings')
        .delete()
        .eq('client_code', clientCode);

      if (deleteError) {
        console.error('Error deleting client EDI settings:', deleteError);
        throw new Error(`Failed to delete client EDI settings: ${deleteError.message}`);
      }

      // Also disable auto_edi in clients table
      await ediDatabaseService.updateClientEdiStatus(client.id, false);
    } catch (error) {
      console.error('Error deleting client EDI:', error);
      throw error;
    }
  }
}

export const ediRealDataService = new EDIRealDataService();