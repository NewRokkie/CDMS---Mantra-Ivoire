import { supabase } from './supabaseClient';
import { User } from '../../types';

export class UserService {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data.map(this.mapToUser);
  }

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToUser(data) : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToUser(data) : null;
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: user.role,
        yard_ids: user.yardIds || [],
        module_access: user.moduleAccess || {},
        active: user.active !== false
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToUser(data);
  }

  async update(id: string, updates: Partial<User> & { last_login?: string }): Promise<User> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;
    if (updates.yardIds !== undefined) updateData.yard_ids = updates.yardIds;
    if (updates.moduleAccess !== undefined) updateData.module_access = updates.moduleAccess;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.lastLogin !== undefined) updateData.last_login = updates.lastLogin?.toISOString();
    if ((updates as any).last_login !== undefined) updateData.last_login = (updates as any).last_login;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToUser(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      yardIds: data.yard_ids || [],
      moduleAccess: data.module_access || {},
      active: data.active,
      lastLogin: data.last_login ? new Date(data.last_login) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const userService = new UserService();
