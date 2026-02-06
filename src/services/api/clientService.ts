import { supabase } from './supabaseClient';
import { Client } from '../../types';

export class ClientService {
  // Test method to debug RLS and table issues
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Test basic select
      const { data: selectData, error: selectError } = await supabase
        .from('clients')
        .select('id, name, code')
        .limit(1);

      if (selectError) {
        return {
          success: false,
          message: `Select test failed: ${selectError.message}`,
          details: selectError
        };
      }

      // Test insert with minimal data
      const testClient = {
        code: `TEST_${Date.now()}`,
        name: 'Test Client',
        email: 'test@example.com',
        phone: '+225 00 00 00 00',
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '00000',
          country: 'Côte d\'Ivoire'
        },
        contact_person: {
          name: 'Test Contact',
          email: 'contact@example.com',
          phone: '+225 00 00 00 01',
          position: 'Test Position'
        },
        active: true
      };

      const { data: insertData, error: insertError } = await supabase
        .from('clients')
        .insert(testClient)
        .select();

      if (insertError) {
        return {
          success: false,
          message: `Insert test failed: ${insertError.message}`,
          details: insertError
        };
      }

      // Clean up test data
      if (insertData && insertData.length > 0) {
        await supabase
          .from('clients')
          .delete()
          .eq('id', insertData[0].id);
      }

      return {
        success: true,
        message: 'All tests passed',
        details: {
          selectCount: selectData?.length || 0,
          insertSuccess: !!insertData && insertData.length > 0
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Test failed with exception: ${(error as Error).message}`,
        details: error
      };
    }
  }

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
    // Ensure address is properly structured
    const structuredAddress = this.ensureAddressStructure(client.address);
    const structuredBillingAddress = client.billingAddress 
      ? this.ensureAddressStructure(client.billingAddress)
      : null;

    const insertData = {
      code: client.code,
      name: client.name,
      contact_person: client.contactPerson,
      email: client.email,
      phone: client.phone,
      address: structuredAddress,
      billing_address: structuredBillingAddress,
      tax_id: client.taxId,
      credit_limit: client.creditLimit !== undefined ? client.creditLimit : 0,
      payment_terms: client.paymentTerms !== undefined ? client.paymentTerms : 30,
      free_days_allowed: client.freeDaysAllowed !== undefined ? client.freeDaysAllowed : 3,
      daily_storage_rate: client.dailyStorageRate !== undefined ? client.dailyStorageRate : 45000, // Updated for FCFA
      currency: client.currency || 'FCFA', // Updated default currency
      auto_edi: client.autoEDI || false,
      active: client.isActive !== false,
      notes: client.notes,
      created_by: client.createdBy || 'System',
      updated_by: client.updatedBy || 'System'
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Client create error:', error);
      throw new Error(`Failed to create client: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned after creating client. This might be due to RLS policies.');
    }

    if (data.length > 1) {
      console.warn('Multiple rows returned when creating client, using first one');
    }

    return this.mapToClient(data[0]);
  }

  async update(id: string, updates: Partial<Client>): Promise<Client> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: updates.updatedBy || 'System'
    };

    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = this.ensureAddressStructure(updates.address);
    if (updates.billingAddress !== undefined) updateData.billing_address = updates.billingAddress ? this.ensureAddressStructure(updates.billingAddress) : null;
    if (updates.taxId !== undefined) updateData.tax_id = updates.taxId;
    if (updates.creditLimit !== undefined) updateData.credit_limit = updates.creditLimit;
    if (updates.paymentTerms !== undefined) updateData.payment_terms = updates.paymentTerms;
    if (updates.freeDaysAllowed !== undefined) updateData.free_days_allowed = updates.freeDaysAllowed;
    if (updates.dailyStorageRate !== undefined) updateData.daily_storage_rate = updates.dailyStorageRate;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.autoEDI !== undefined) updateData.auto_edi = updates.autoEDI;
    if (updates.isActive !== undefined) updateData.active = updates.isActive;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Client update error:', error);
      throw new Error(`Failed to update client: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned after updating client. Client may not exist or RLS policies may be blocking access.');
    }

    if (data.length > 1) {
      console.warn('Multiple rows returned when updating client, using first one');
    }
    
    return this.mapToClient(data[0]);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private ensureAddressStructure(address: any): any {
    if (!address) {
      return {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Côte d\'Ivoire'
      };
    }

    // If it's already a proper object, ensure all fields exist
    if (typeof address === 'object' && address !== null) {
      return {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        country: address.country || 'Côte d\'Ivoire'
      };
    }

    // If it's a string, try to parse it
    if (typeof address === 'string') {
      try {
        const parsed = JSON.parse(address);
        return this.ensureAddressStructure(parsed);
      } catch (error) {
        // If parsing fails, treat it as street address
        return {
          street: address,
          city: '',
          state: '',
          zipCode: '',
          country: 'Côte d\'Ivoire'
        };
      }
    }

    // Fallback to default structure
    return {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Côte d\'Ivoire'
    };
  }

  private mapToClient(data: any): Client {
    const defaultAddress = {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Côte d\'Ivoire'
    };

    const defaultContactPerson = {
      name: '',
      email: '',
      phone: '',
      position: ''
    };

    // Handle contact person data - it might be stored as JSON or individual fields
    let contactPerson = defaultContactPerson;
    if (typeof data.contact_person === 'object' && data.contact_person !== null) {
      contactPerson = {
        name: data.contact_person.name || '',
        email: data.contact_person.email || data.email || '',
        phone: data.contact_person.phone || data.phone || '',
        position: data.contact_person.position || ''
      };
    } else if (typeof data.contact_person === 'string') {
      // If it's a string, it might be the name only
      contactPerson = {
        name: data.contact_person,
        email: data.email || '',
        phone: data.phone || '',
        position: ''
      };
    }

    // Handle address data - it might be stored as JSON string or object
    let address = defaultAddress;
    if (typeof data.address === 'object' && data.address !== null) {
      // Check if we have the malformed nested JSON structure
      const streetValue = data.address.street;
      if (typeof streetValue === 'string' && streetValue.startsWith('{') && streetValue.endsWith('}')) {
        try {
          // Parse the nested JSON from the street field
          const nestedAddress = JSON.parse(streetValue);
          address = {
            street: nestedAddress.street || '',
            city: nestedAddress.city || '',
            state: nestedAddress.state || '',
            zipCode: nestedAddress.zipCode || '',
            country: nestedAddress.country || 'Côte d\'Ivoire'
          };
        } catch (error) {
          // If parsing fails, use the malformed data as is
          address = {
            street: streetValue,
            city: data.address.city || '',
            state: data.address.state || '',
            zipCode: data.address.zipCode || '',
            country: data.address.country || 'Côte d\'Ivoire'
          };
        }
      } else {
        // Normal address structure
        address = {
          street: data.address.street || '',
          city: data.address.city || '',
          state: data.address.state || '',
          zipCode: data.address.zipCode || '',
          country: data.address.country || 'Côte d\'Ivoire'
        };
      }
    } else if (typeof data.address === 'string' && data.address.trim() !== '') {
      try {
        const parsedAddress = JSON.parse(data.address);
        address = this.ensureAddressStructure(parsedAddress);
      } catch (error) {
        // If parsing fails, treat it as just the street address
        address = {
          street: data.address,
          city: '',
          state: '',
          zipCode: '',
          country: 'Côte d\'Ivoire'
        };
      }
    }

    // Handle billing address data with the same logic
    let billingAddress = undefined;
    if (typeof data.billing_address === 'object' && data.billing_address !== null) {
      const streetValue = data.billing_address.street;
      if (typeof streetValue === 'string' && streetValue.startsWith('{') && streetValue.endsWith('}')) {
        try {
          const nestedAddress = JSON.parse(streetValue);
          billingAddress = {
            street: nestedAddress.street || '',
            city: nestedAddress.city || '',
            state: nestedAddress.state || '',
            zipCode: nestedAddress.zipCode || '',
            country: nestedAddress.country || 'Côte d\'Ivoire'
          };
        } catch (error) {
          billingAddress = {
            street: streetValue,
            city: data.billing_address.city || '',
            state: data.billing_address.state || '',
            zipCode: data.billing_address.zipCode || '',
            country: data.billing_address.country || 'Côte d\'Ivoire'
          };
        }
      } else {
        billingAddress = {
          street: data.billing_address.street || '',
          city: data.billing_address.city || '',
          state: data.billing_address.state || '',
          zipCode: data.billing_address.zipCode || '',
          country: data.billing_address.country || 'Côte d\'Ivoire'
        };
      }
    } else if (typeof data.billing_address === 'string' && data.billing_address.trim() !== '') {
      try {
        const parsedBillingAddress = JSON.parse(data.billing_address);
        billingAddress = this.ensureAddressStructure(parsedBillingAddress);
      } catch (error) {
        billingAddress = {
          street: data.billing_address,
          city: '',
          state: '',
          zipCode: '',
          country: 'Côte d\'Ivoire'
        };
      }
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      contactPerson: contactPerson,
      email: data.email,
      phone: data.phone,
      address: address,
      billingAddress: billingAddress,
      taxId: data.tax_id,
      creditLimit: data.credit_limit !== undefined && data.credit_limit !== null ? data.credit_limit : 0,
      paymentTerms: data.payment_terms !== undefined && data.payment_terms !== null ? data.payment_terms : 30,
      freeDaysAllowed: data.free_days_allowed !== undefined && data.free_days_allowed !== null ? data.free_days_allowed : 3,
      dailyStorageRate: data.daily_storage_rate !== undefined && data.daily_storage_rate !== null ? data.daily_storage_rate : 45000, // Updated for FCFA
      currency: data.currency || 'FCFA', // Updated default currency
      autoEDI: data.auto_edi || false,
      isActive: data.active !== false,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by || 'System',
      updatedBy: data.updated_by || 'System'
    };
  }
}

export const clientService = new ClientService();
