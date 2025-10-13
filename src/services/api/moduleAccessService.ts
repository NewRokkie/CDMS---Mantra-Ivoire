import { supabase } from './supabaseClient';
import { ModuleAccess } from '../../types';
import { toDate } from '../../utils/dateHelpers';

interface UserModuleAccess {
  id: string;
  userId: string;
  modulePermissions: ModuleAccess;
  updatedAt: Date;
  updatedBy: string;
}

class ModuleAccessService {
  async getUserModuleAccess(userId: string): Promise<ModuleAccess | null> {
    const { data, error } = await supabase
      .from('user_module_access')
      .select('module_permissions')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data.module_permissions as ModuleAccess;
  }

  async setUserModuleAccess(
    userId: string,
    permissions: ModuleAccess,
    updatedBy: string
  ): Promise<UserModuleAccess> {
    const { data: existing } = await supabase
      .from('user_module_access')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('user_module_access')
        .update({
          module_permissions: permissions,
          updated_by: updatedBy
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        modulePermissions: data.module_permissions as ModuleAccess,
        updatedAt: toDate(data.updated_at),
        updatedBy: data.updated_by
      };
    } else {
      const { data, error } = await supabase
        .from('user_module_access')
        .insert({
          user_id: userId,
          module_permissions: permissions,
          updated_by: updatedBy
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        modulePermissions: data.module_permissions as ModuleAccess,
        updatedAt: toDate(data.updated_at),
        updatedBy: data.updated_by
      };
    }
  }

  async getAllUserModuleAccess(): Promise<UserModuleAccess[]> {
    const { data, error } = await supabase
      .from('user_module_access')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      modulePermissions: record.module_permissions as ModuleAccess,
      updatedAt: toDate(record.updated_at),
      updatedBy: record.updated_by
    }));
  }

  async deleteUserModuleAccess(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_module_access')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async batchUpdateModuleAccess(
    updates: Array<{ userId: string; permissions: ModuleAccess }>,
    updatedBy: string
  ): Promise<void> {
    const promises = updates.map(update =>
      this.setUserModuleAccess(update.userId, update.permissions, updatedBy)
    );

    await Promise.all(promises);
  }
}

export const moduleAccessService = new ModuleAccessService();
