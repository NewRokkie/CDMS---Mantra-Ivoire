/**
 * Supabase Services - Cloud database services using Supabase
 * Provides unified interface for Supabase operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Container } from '../../types';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

// Initialize Supabase client
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Base Supabase Service
class SupabaseService {
  protected client: SupabaseClient;

  constructor() {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check your environment variables.');
    }
    this.client = supabase;
  }

  async testConnection() {
    try {
      const { data, error } = await this.client.from('users').select('count').limit(1);
      if (error) throw error;
      return { success: true, message: 'Supabase connection successful', data };
    } catch (error) {
      return { success: false, message: `Supabase connection failed: ${error}`, error };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.testConnection();
      return result.success;
    } catch {
      return false;
    }
  }
}

// User Supabase Service
class UserSupabaseService extends SupabaseService {
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Get user profile from users table
        const { data: profile, error: profileError } = await this.client
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        return profile as User;
      }

      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as User[];
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  async createUser(userData: any): Promise<User | null> {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await this.client.auth.signUp({
        email: userData.email,
        password: userData.password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user profile
        const { data, error } = await this.client
          .from('users')
          .insert([{
            id: authData.user.id,
            email: userData.email,
            name: userData.name,
            role: userData.role || 'user',
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return data as User;
      }

      return null;
    } catch (error) {
      console.error('Create user error:', error);
      return null;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Update user error:', error);
      return null;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }
}

// Container Supabase Service
class ContainerSupabaseService extends SupabaseService {
  async getAllContainers(filters?: any): Promise<Container[]> {
    try {
      let query = this.client.from('containers').select('*');

      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.size) {
          query = query.eq('size', filters.size);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Container[];
    } catch (error) {
      console.error('Get all containers error:', error);
      return [];
    }
  }

  async getContainerByNumber(containerNumber: string): Promise<Container | null> {
    try {
      const { data, error } = await this.client
        .from('containers')
        .select('*')
        .eq('container_number', containerNumber)
        .single();

      if (error) throw error;
      return data as Container;
    } catch (error) {
      console.error('Get container by number error:', error);
      return null;
    }
  }

  async getContainerById(containerId: string): Promise<Container | null> {
    try {
      const { data, error } = await this.client
        .from('containers')
        .select('*')
        .eq('id', containerId)
        .single();

      if (error) throw error;
      return data as Container;
    } catch (error) {
      console.error('Get container by ID error:', error);
      return null;
    }
  }

  async createContainer(containerData: any): Promise<Container | null> {
    try {
      const { data, error } = await this.client
        .from('containers')
        .insert([{
          ...containerData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Container;
    } catch (error) {
      console.error('Create container error:', error);
      return null;
    }
  }

  async updateContainer(containerId: string, updates: Partial<Container>): Promise<Container | null> {
    try {
      const { data, error } = await this.client
        .from('containers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', containerId)
        .select()
        .single();

      if (error) throw error;
      return data as Container;
    } catch (error) {
      console.error('Update container error:', error);
      return null;
    }
  }

  async deleteContainer(containerId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('containers')
        .delete()
        .eq('id', containerId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete container error:', error);
      return false;
    }
  }

  async processGateIn(containerNumber: string, containerData: any, performedBy?: string): Promise<Container | null> {
    try {
      // Update container status to 'in_yard'
      const { data, error } = await this.client
        .from('containers')
        .update({
          status: 'in_yard',
          gate_in_date: new Date().toISOString(),
          gate_in_by: performedBy,
          ...containerData,
          updated_at: new Date().toISOString()
        })
        .eq('container_number', containerNumber)
        .select()
        .single();

      if (error) throw error;
      return data as Container;
    } catch (error) {
      console.error('Process gate in error:', error);
      return null;
    }
  }

  async processGateOut(containerNumber: string, gateOutData: any, performedBy?: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('containers')
        .update({
          status: 'gate_out',
          gate_out_date: new Date().toISOString(),
          gate_out_by: performedBy,
          ...gateOutData,
          updated_at: new Date().toISOString()
        })
        .eq('container_number', containerNumber);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Process gate out error:', error);
      return false;
    }
  }

  async searchContainers(searchTerm: string): Promise<Container[]> {
    try {
      const { data, error } = await this.client
        .from('containers')
        .select('*')
        .or(`container_number.ilike.%${searchTerm}%,client_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Container[];
    } catch (error) {
      console.error('Search containers error:', error);
      return [];
    }
  }
}

// Service instances
export const supabaseService = new SupabaseService();
export const userSupabaseService = new UserSupabaseService();
export const containerSupabaseService = new ContainerSupabaseService();

// Export types and services
export interface SupabaseServices {
  supabaseService: SupabaseService;
  userSupabaseService: UserSupabaseService;
  containerSupabaseService: ContainerSupabaseService;
}

export const SupabaseServices: SupabaseServices = {
  supabaseService,
  userSupabaseService,
  containerSupabaseService
};

export default SupabaseServices;