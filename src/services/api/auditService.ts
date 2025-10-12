import { supabase } from './supabaseClient';
import { AuditLogEntry } from '../../types/operations';

export interface CreateAuditLogData {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changes: any;
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(data: CreateAuditLogData): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        changes: data.changes,
        user_id: data.userId,
        user_name: data.userName,
        ip_address: data.ipAddress,
        user_agent: data.userAgent
      });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async getLogs(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    dateRange?: [Date, Date];
  }): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.dateRange) {
      query = query
        .gte('timestamp', filters.dateRange[0].toISOString())
        .lte('timestamp', filters.dateRange[1].toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data.map(this.mapToAuditLog);
  }

  private mapToAuditLog(data: any): AuditLogEntry {
    return {
      id: data.id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      action: data.action,
      changes: data.changes,
      userId: data.user_id,
      userName: data.user_name,
      timestamp: new Date(data.timestamp),
      ipAddress: data.ip_address,
      userAgent: data.user_agent
    };
  }
}

export const auditService = new AuditService();
