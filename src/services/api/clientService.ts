import { supabase } from './supabaseClient';
import { Client } from '../../types';

export class ClientService {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data.map(this.mapToClient);
  }

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToClient(data) : null;
  }

  async getByCode(code: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToClient(data) : null;
  }

  async create(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        code: client.code,
        name: client.name,
        contact_person: client.contactPerson,
        email: client.email,
        phone: client.phone,
        address: client.address,
        free_days_allowed: client.freeDaysAllowed || 3,
        daily_storage_rate: client.dailyStorageRate || 45.00,
        currency: client.currency || 'USD',
        auto_edi: client.autoEDI || false,
        active: client.active !== false
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToClient(data);
  }

  async update(id: string, updates: Partial<Client>): Promise<Client> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.code) updateData.code = updates.code;
    if (updates.name) updateData.name = updates.name;
    if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.freeDaysAllowed !== undefined) updateData.free_days_allowed = updates.freeDaysAllowed;
    if (updates.dailyStorageRate !== undefined) updateData.daily_storage_rate = updates.dailyStorageRate;
    if (updates.currency) updateData.currency = updates.currency;
    if (updates.autoEDI !== undefined) updateData.auto_edi = updates.autoEDI;
    if (updates.active !== undefined) updateData.active = updates.active;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToClient(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapToClient(data: any): Client {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      contactPerson: data.contact_person,
      email: data.email,
      phone: data.phone,
      address: data.address,
      freeDaysAllowed: data.free_days_allowed,
      dailyStorageRate: data.daily_storage_rate,
      currency: data.currency,
      autoEDI: data.auto_edi,
      active: data.active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const clientService = new ClientService();
