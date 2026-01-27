/**
 * Service EDI utilisant les données réelles de la base de données
 */

import { supabase, Database } from '../api/supabaseClient';

export type Client = Database['public']['Tables']['clients']['Row'];
export type Container = Database['public']['Tables']['containers']['Row'];
export type GateInOperation = Database['public']['Tables']['gate_in_operations']['Row'];
export type GateOutOperation = Database['public']['Tables']['gate_out_operations']['Row'];

export interface EDIServerConfiguration {
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
  assignedClientCodes: string[]; // Codes clients assignés
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EDITransmissionRecord {
  id: string;
  operationType: 'GATE_IN' | 'GATE_OUT';
  operationId: string;
  containerNumber: string;
  clientCode: string;
  clientName: string;
  serverConfigId: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt: Date;
  uploadedToSftp: boolean;
  errorMessage?: string;
  acknowledgmentReceived?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class EDIDatabaseService {
  
  /**
   * Récupère tous les clients avec leurs paramètres EDI
   */
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching clients:', error);
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère un client par code ou nom
   */
  async getClientByCodeOrName(clientCode?: string, clientName?: string): Promise<Client | null> {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('active', true);

    if (clientCode) {
      query = query.eq('code', clientCode.toUpperCase());
    } else if (clientName) {
      query = query.ilike('name', `%${clientName}%`);
    } else {
      return null;
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching client:', error);
      throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Met à jour le statut EDI d'un client
   */
  async updateClientEdiStatus(clientId: string, autoEdi: boolean): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ 
        auto_edi: autoEdi,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client EDI status:', error);
      throw new Error(`Failed to update client EDI status: ${error.message}`);
    }
  }

  /**
   * Récupère les conteneurs avec leurs informations client
   */
  async getContainers(limit = 100): Promise<(Container & { client?: Client })[]> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching containers:', error);
      throw new Error(`Failed to fetch containers: ${error.message}`);
    }

    return (data || []).map(container => ({
      ...container,
      client: container.clients as Client
    }));
  }

  /**
   * Récupère un conteneur par numéro
   */
  async getContainerByNumber(containerNumber: string): Promise<(Container & { client?: Client }) | null> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey (*)
      `)
      .eq('number', containerNumber.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching container:', error);
      throw new Error(`Failed to fetch container: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      client: data.clients as Client
    };
  }

  /**
   * Récupère les opérations Gate In récentes
   */
  async getGateInOperations(limit = 50): Promise<GateInOperation[]> {
    const { data, error } = await supabase
      .from('gate_in_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching gate in operations:', error);
      throw new Error(`Failed to fetch gate in operations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère les opérations Gate Out récentes
   */
  async getGateOutOperations(limit = 50): Promise<GateOutOperation[]> {
    const { data, error } = await supabase
      .from('gate_out_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching gate out operations:', error);
      throw new Error(`Failed to fetch gate out operations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Met à jour le statut EDI d'une opération Gate In
   */
  async updateGateInEdiStatus(
    operationId: string, 
    ediTransmitted: boolean, 
    transmissionDate?: Date
  ): Promise<void> {
    const updateData: any = { 
      edi_transmitted: ediTransmitted 
    };

    if (transmissionDate) {
      updateData.edi_transmission_date = transmissionDate.toISOString();
    }

    const { error } = await supabase
      .from('gate_in_operations')
      .update(updateData)
      .eq('id', operationId);

    if (error) {
      console.error('Error updating gate in EDI status:', error);
      throw new Error(`Failed to update gate in EDI status: ${error.message}`);
    }
  }

  /**
   * Met à jour le statut EDI d'une opération Gate Out
   */
  async updateGateOutEdiStatus(
    operationId: string, 
    ediTransmitted: boolean, 
    transmissionDate?: Date
  ): Promise<void> {
    const updateData: any = { 
      edi_transmitted: ediTransmitted 
    };

    if (transmissionDate) {
      updateData.edi_transmission_date = transmissionDate.toISOString();
    }

    const { error } = await supabase
      .from('gate_out_operations')
      .update(updateData)
      .eq('id', operationId);

    if (error) {
      console.error('Error updating gate out EDI status:', error);
      throw new Error(`Failed to update gate out EDI status: ${error.message}`);
    }
  }

  /**
   * Récupère les statistiques EDI
   */
  async getEdiStatistics(): Promise<{
    totalGateInOperations: number;
    gateInWithEdi: number;
    totalGateOutOperations: number;
    gateOutWithEdi: number;
    clientsWithEdi: number;
    totalClients: number;
  }> {
    try {
      // Statistiques Gate In
      const { count: totalGateIn } = await supabase
        .from('gate_in_operations')
        .select('*', { count: 'exact', head: true });

      const { count: gateInWithEdi } = await supabase
        .from('gate_in_operations')
        .select('*', { count: 'exact', head: true })
        .eq('edi_transmitted', true);

      // Statistiques Gate Out
      const { count: totalGateOut } = await supabase
        .from('gate_out_operations')
        .select('*', { count: 'exact', head: true });

      const { count: gateOutWithEdi } = await supabase
        .from('gate_out_operations')
        .select('*', { count: 'exact', head: true })
        .eq('edi_transmitted', true);

      // Statistiques Clients
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      const { count: clientsWithEdi } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .eq('auto_edi', true);

      return {
        totalGateInOperations: totalGateIn || 0,
        gateInWithEdi: gateInWithEdi || 0,
        totalGateOutOperations: totalGateOut || 0,
        gateOutWithEdi: gateOutWithEdi || 0,
        clientsWithEdi: clientsWithEdi || 0,
        totalClients: totalClients || 0
      };
    } catch (error) {
      console.error('Error fetching EDI statistics:', error);
      return {
        totalGateInOperations: 0,
        gateInWithEdi: 0,
        totalGateOutOperations: 0,
        gateOutWithEdi: 0,
        clientsWithEdi: 0,
        totalClients: 0
      };
    }
  }

  /**
   * Récupère les opérations récentes avec transmission EDI
   */
  async getRecentEdiOperations(limit = 20): Promise<Array<{
    id: string;
    type: 'GATE_IN' | 'GATE_OUT';
    containerNumber: string;
    clientCode: string;
    clientName: string;
    ediTransmitted: boolean;
    transmissionDate?: Date;
    createdAt: Date;
  }>> {
    try {
      // Récupérer les opérations Gate In
      const { data: gateInOps } = await supabase
        .from('gate_in_operations')
        .select('id, container_number, client_code, client_name, edi_transmitted, edi_transmission_date, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.ceil(limit / 2));

      // Récupérer les opérations Gate Out
      const { data: gateOutOps } = await supabase
        .from('gate_out_operations')
        .select('id, booking_number, client_code, client_name, edi_transmitted, edi_transmission_date, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.ceil(limit / 2));

      const operations: Array<{
        id: string;
        type: 'GATE_IN' | 'GATE_OUT';
        containerNumber: string;
        clientCode: string;
        clientName: string;
        ediTransmitted: boolean;
        transmissionDate?: Date;
        createdAt: Date;
      }> = [];

      // Ajouter les opérations Gate In
      (gateInOps || []).forEach(op => {
        operations.push({
          id: op.id,
          type: 'GATE_IN',
          containerNumber: op.container_number,
          clientCode: op.client_code,
          clientName: op.client_name,
          ediTransmitted: op.edi_transmitted,
          transmissionDate: op.edi_transmission_date ? new Date(op.edi_transmission_date) : undefined,
          createdAt: new Date(op.created_at)
        });
      });

      // Ajouter les opérations Gate Out
      (gateOutOps || []).forEach(op => {
        operations.push({
          id: op.id,
          type: 'GATE_OUT',
          containerNumber: op.booking_number, // Utiliser booking_number comme référence
          clientCode: op.client_code,
          clientName: op.client_name,
          ediTransmitted: op.edi_transmitted,
          transmissionDate: op.edi_transmission_date ? new Date(op.edi_transmission_date) : undefined,
          createdAt: new Date(op.created_at)
        });
      });

      // Trier par date de création (plus récent en premier)
      return operations
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent EDI operations:', error);
      return [];
    }
  }

  /**
   * Recherche des clients par nom ou code
   */
  async searchClients(query: string): Promise<Client[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('active', true)
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .order('name')
      .limit(10);

    if (error) {
      console.error('Error searching clients:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Récupère les codes clients uniques
   */
  async getUniqueClientCodes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('code')
      .eq('active', true)
      .order('code');

    if (error) {
      console.error('Error fetching client codes:', error);
      return [];
    }

    return (data || []).map(client => client.code).filter(Boolean);
  }

  /**
   * Vérifie si un client a l'EDI activé
   */
  async isClientEdiEnabled(clientCode: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('clients')
      .select('auto_edi')
      .eq('code', clientCode.toUpperCase())
      .eq('active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return data.auto_edi || false;
  }

  /**
   * Récupère les clients avec EDI activé
   */
  async getEdiEnabledClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('active', true)
      .eq('auto_edi', true)
      .order('name');

    if (error) {
      console.error('Error fetching EDI enabled clients:', error);
      return [];
    }

    return data || [];
  }
}

export const ediDatabaseService = new EDIDatabaseService();