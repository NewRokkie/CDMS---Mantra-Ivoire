import { supabase } from './supabaseClient';
import { eventBus } from '../eventBus';
import { ReleaseOrder } from '../../types';

export class ReleaseService {
  async getAll(): Promise<ReleaseOrder[]> {
    const { data, error } = await supabase
      .from('release_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToReleaseOrder);
  }

  async getById(id: string): Promise<ReleaseOrder | null> {
    const { data, error} = await supabase
      .from('release_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToReleaseOrder(data) : null;
  }

  async getByClientCode(clientCode: string): Promise<ReleaseOrder[]> {
    const { data, error } = await supabase
      .from('release_orders')
      .select('*')
      .eq('client_code', clientCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToReleaseOrder);
  }

  async getByStatus(status: ReleaseOrder['status']): Promise<ReleaseOrder[]> {
    const { data, error } = await supabase
      .from('release_orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToReleaseOrder);
  }

  async create(order: Omit<ReleaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReleaseOrder> {
    const { data, error } = await supabase
      .from('release_orders')
      .insert({
        booking_number: order.bookingNumber,
        client_id: order.clientId,
        client_code: order.clientCode,
        client_name: order.clientName,
        booking_type: order.bookingType,
        total_containers: order.totalContainers,
        remaining_containers: order.remainingContainers,
        status: order.status,
        valid_from: order.validFrom?.toISOString(),
        valid_until: order.validUntil?.toISOString(),
        notes: order.notes,
        created_by: order.createdBy
      })
      .select()
      .single();

    if (error) throw error;
    const releaseOrder = this.mapToReleaseOrder(data);

    // Emit RELEASE_ORDER_CREATED event
    eventBus.emitSync('RELEASE_ORDER_CREATED', { releaseOrder });

    return releaseOrder;
  }

  async update(id: string, updates: Partial<ReleaseOrder>): Promise<ReleaseOrder> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.bookingNumber) updateData.booking_number = updates.bookingNumber;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.clientCode) updateData.client_code = updates.clientCode;
    if (updates.clientName) updateData.client_name = updates.clientName;
    if (updates.bookingType) updateData.booking_type = updates.bookingType;
    if (updates.totalContainers !== undefined) updateData.total_containers = updates.totalContainers;
    if (updates.remainingContainers !== undefined) updateData.remaining_containers = updates.remainingContainers;
    if (updates.status) updateData.status = updates.status;
    if (updates.validFrom !== undefined) updateData.valid_from = updates.validFrom?.toISOString();
    if (updates.validUntil !== undefined) updateData.valid_until = updates.validUntil?.toISOString();
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('release_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToReleaseOrder(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('release_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapToReleaseOrder(data: any): ReleaseOrder {
    return {
      id: data.id,
      bookingNumber: data.booking_number,
      clientId: data.client_id,
      clientCode: data.client_code,
      clientName: data.client_name,
      bookingType: data.booking_type,
      totalContainers: data.total_containers,
      remainingContainers: data.remaining_containers,
      status: data.status,
      validFrom: data.valid_from ? new Date(data.valid_from) : undefined,
      validUntil: data.valid_until ? new Date(data.valid_until) : undefined,
      notes: data.notes,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const releaseService = new ReleaseService();
