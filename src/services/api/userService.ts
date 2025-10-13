import { supabase } from './supabaseClient';
import { User, ModuleAccess } from '../../types';

export class UserService {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_module_access!fk_user_module_access_user (
          module_permissions
        )
      `)
      .order('name', { ascending: true });

    if (error) throw error;
    return data.map(this.mapToUser);
  }

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_module_access!fk_user_module_access_user (
          module_permissions
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToUser(data) : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_module_access!fk_user_module_access_user (
          module_permissions
        )
      `)
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
        active: user.isActive !== false
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
    if (updates.isActive !== undefined) updateData.active = updates.isActive;
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
    let moduleAccess: ModuleAccess = data.module_access || {};

    if (data.user_module_access && Array.isArray(data.user_module_access) && data.user_module_access.length > 0) {
      moduleAccess = data.user_module_access[0].module_permissions || {};
    } else if (data.user_module_access && !Array.isArray(data.user_module_access) && data.user_module_access.module_permissions) {
      moduleAccess = data.user_module_access.module_permissions || {};
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      yardIds: data.yard_ids || [],
      moduleAccess: moduleAccess,
      isActive: data.active,
      lastLogin: data.last_login ? new Date(data.last_login) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: 'System'
    };
  }
}

export const userService = new UserService();
