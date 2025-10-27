import { supabase } from './supabaseClient';
import { eventBus } from '../eventBus';
import { BookingReference } from '../../types';

export class BookingReferenceService {
  async getAll(): Promise<BookingReference[]> {
    const { data, error } = await supabase
      .from('booking_references')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToBookingReference);
  }

  async getById(id: string): Promise<BookingReference | null> {
    const { data, error} = await supabase
      .from('booking_references')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToBookingReference(data) : null;
  }

  async getByClientCode(clientCode: string): Promise<BookingReference[]> {
    const { data, error } = await supabase
      .from('booking_references')
      .select('*')
      .eq('client_code', clientCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToBookingReference);
  }

  async getByStatus(status: BookingReference['status']): Promise<BookingReference[]> {
    const { data, error } = await supabase
      .from('booking_references')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToBookingReference);
  }

  async create(order: Omit<BookingReference, 'id' | 'createdAt' | 'completedAt'>): Promise<BookingReference> {
    const { data, error } = await supabase
      .from('booking_references')
      .insert({
        booking_number: order.bookingNumber,
        client_id: order.clientId,
        client_code: order.clientCode,
        client_name: order.clientName,
        booking_type: order.bookingType,
        container_quantities: order.containerQuantities,
        total_containers: order.totalContainers,
        remaining_containers: order.remainingContainers,
        max_quantity_threshold: order.maxQuantityThreshold,
        requires_detailed_breakdown: order.requiresDetailedBreakdown,
        status: order.status,
        notes: order.notes,
        created_by: order.createdBy
      })
      .select()
      .single();

    if (error) throw error;
    const bookingReference = this.mapToBookingReference(data);

    // Emit BOOKING_REFERENCE_CREATED event
    eventBus.emitSync('BOOKING_REFERENCE_CREATED', { bookingReference });

    return bookingReference;
  }

  async update(id: string, updates: Partial<BookingReference>): Promise<BookingReference> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.bookingNumber) updateData.booking_number = updates.bookingNumber;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.clientCode) updateData.client_code = updates.clientCode;
    if (updates.clientName) updateData.client_name = updates.clientName;
    if (updates.bookingType) updateData.booking_type = updates.bookingType;
    if (updates.containerQuantities) updateData.container_quantities = updates.containerQuantities;
    if (updates.totalContainers !== undefined) updateData.total_containers = updates.totalContainers;
    if (updates.remainingContainers !== undefined) updateData.remaining_containers = updates.remainingContainers;
    if (updates.maxQuantityThreshold !== undefined) updateData.max_quantity_threshold = updates.maxQuantityThreshold;
    if (updates.requiresDetailedBreakdown !== undefined) updateData.requires_detailed_breakdown = updates.requiresDetailedBreakdown;
    if (updates.status) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt?.toISOString();

    const { data, error } = await supabase
      .from('booking_references')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToBookingReference(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('booking_references')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapToBookingReference(data: any): BookingReference {
    return {
      containers: data.containers || [],
      remainingContainers: data.remaining_containers,
      id: data.id,
      bookingNumber: data.booking_number,
      clientId: data.client_id,
      clientCode: data.client_code,
      clientName: data.client_name,
      bookingType: data.booking_type,
      containerQuantities: data.container_quantities,
      totalContainers: data.total_containers,
      maxQuantityThreshold: data.max_quantity_threshold,
      requiresDetailedBreakdown: data.requires_detailed_breakdown,
      status: data.status,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      notes: data.notes
    };
  }
}

export const bookingReferenceService = new BookingReferenceService();
