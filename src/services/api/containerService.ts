import { supabase } from './supabaseClient';
import { Container } from '../../types';

export class ContainerService {
  async getAll(): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(this.mapToContainer) : [];
  }

  async getById(id: string): Promise<Container | null> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey(name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToContainer(data) : null;
  }

  async getByClientCode(clientCode: string): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('client_code', clientCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToContainer);
  }

  async getByYardId(yardId: string): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('yard_id', yardId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToContainer);
  }

  async getByStatus(status: Container['status']): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false});

    if (error) throw error;
    return data.map(this.mapToContainer);
  }

  async create(container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container> {
    const { data, error } = await supabase
      .from('containers')
      .insert({
        number: container.number,
        type: container.type,
        size: container.size,
        status: container.status,
        location: container.location,
        yard_id: container.yardId,
        client_id: container.clientId,
        client_code: container.clientCode,
        gate_in_date: container.gateInDate?.toISOString(),
        gate_out_date: container.gateOutDate?.toISOString(),
        weight: container.weight,
        damage: container.damage || [],
        booking_reference: container.bookingReference,
        seal_number: container.sealNumber,
        temperature_setting: container.temperatureSetting,
        created_by: container.createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToContainer(data);
  }

  async update(id: string, updates: Partial<Container>): Promise<Container> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.number) updateData.number = updates.number;
    if (updates.type) updateData.type = updates.type;
    if (updates.size) updateData.size = updates.size;
    if (updates.status) updateData.status = updates.status;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.yardId !== undefined) updateData.yard_id = updates.yardId;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.clientCode !== undefined) updateData.client_code = updates.clientCode;
    if (updates.gateInDate !== undefined) updateData.gate_in_date = updates.gateInDate?.toISOString();
    if (updates.gateOutDate !== undefined) updateData.gate_out_date = updates.gateOutDate?.toISOString();
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.damage !== undefined) updateData.damage = updates.damage;
    if (updates.bookingReference !== undefined) updateData.booking_reference = updates.bookingReference;
    if (updates.sealNumber !== undefined) updateData.seal_number = updates.sealNumber;
    if (updates.temperatureSetting !== undefined) updateData.temperature_setting = updates.temperatureSetting;
    if (updates.updatedBy) updateData.updated_by = updates.updatedBy;

    const { data, error } = await supabase
      .from('containers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToContainer(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('containers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapToContainer(data: any): Container {
    return {
      id: data.id,
      number: data.number,
      type: data.type,
      size: data.size,
      status: data.status,
      location: data.location,
      yardId: data.yard_id,
      clientId: data.client_id,
      client: data.clients?.name || '',
      clientCode: data.client_code,
      gateInDate: data.gate_in_date ? new Date(data.gate_in_date) : undefined,
      gateOutDate: data.gate_out_date ? new Date(data.gate_out_date) : undefined,
      weight: data.weight,
      damage: data.damage || [],
      bookingReference: data.booking_reference,
      sealNumber: data.seal_number,
      temperatureSetting: data.temperature_setting,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      placedAt: data.gate_in_date ? new Date(data.gate_in_date) : undefined
    };
  }
}

export const containerService = new ContainerService();
