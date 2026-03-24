/**
 * EDI Notification Service
 * Handles in-app notifications for EDI transmission failures and events.
 * Respects per-client notification preferences stored in edi_client_settings.
 */
import { supabase } from '../api/supabaseClient';
import { EDITransmissionLog } from './ediTransmissionService';

export type NotificationChannel = 'in-app';

export interface EDINotificationPrefs {
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  channels: NotificationChannel[];
}

const DEFAULT_PREFS: EDINotificationPrefs = {
  notifyOnFailure: true,
  notifyOnSuccess: false,
  channels: ['in-app'],
};

class EDINotificationServiceImpl {
  /**
   * Get notification preferences for a client (from edi_client_settings.notes JSON field
   * or a dedicated column if available). Falls back to defaults.
   */
  async getPrefs(clientCode: string): Promise<EDINotificationPrefs> {
    try {
      const { data, error } = await supabase
        .from('edi_client_settings')
        .select('notification_prefs')
        .eq('client_code', clientCode)
        .maybeSingle();

      if (error || !data?.notification_prefs) return DEFAULT_PREFS;

      return { ...DEFAULT_PREFS, ...data.notification_prefs };
    } catch {
      return DEFAULT_PREFS;
    }
  }

  /**
   * Save notification preferences for a client.
   */
  async savePrefs(clientCode: string, prefs: Partial<EDINotificationPrefs>): Promise<void> {
    try {
      const current = await this.getPrefs(clientCode);
      const merged = { ...current, ...prefs };

      await supabase
        .from('edi_client_settings')
        .update({ notification_prefs: merged })
        .eq('client_code', clientCode);
    } catch (error) {
      console.error('EDINotificationService: failed to save prefs', error);
    }
  }

  /**
   * Notify on transmission failure.
   * Inserts a record into edi_notifications so the UI can poll/display it.
   */
  async notifyOnFailure(log: EDITransmissionLog): Promise<void> {
    try {
      const prefs = await this.getPrefs(log.partnerCode);
      if (!prefs.notifyOnFailure) return;

      await supabase.from('edi_notifications').insert({
        type: 'failure',
        client_code: log.partnerCode,
        container_number: log.containerNumber,
        operation: log.operation,
        transmission_log_id: log.id,
        message: `EDI transmission failed for ${log.containerNumber} (${log.operation.replace('_', ' ')})${log.errorMessage ? `: ${log.errorMessage}` : ''}`,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Non-blocking — log but don't throw
      console.error('EDINotificationService: failed to insert failure notification', error);
    }
  }

  /**
   * Notify on transmission success (only if opted in).
   */
  async notifyOnSuccess(log: EDITransmissionLog): Promise<void> {
    try {
      const prefs = await this.getPrefs(log.partnerCode);
      if (!prefs.notifyOnSuccess) return;

      await supabase.from('edi_notifications').insert({
        type: 'success',
        client_code: log.partnerCode,
        container_number: log.containerNumber,
        operation: log.operation,
        transmission_log_id: log.id,
        message: `EDI transmitted successfully for ${log.containerNumber} (${log.operation.replace('_', ' ')})`,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('EDINotificationService: failed to insert success notification', error);
    }
  }

  /**
   * Get unread notifications (for the notification bell / overview panel).
   */
  async getUnread(limit = 20): Promise<Array<{
    id: string;
    type: 'failure' | 'success';
    clientCode: string;
    containerNumber: string;
    operation: string;
    message: string;
    transmissionLogId: string;
    createdAt: Date;
  }>> {
    try {
      const { data, error } = await supabase
        .from('edi_notifications')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(n => ({
        id: n.id,
        type: n.type,
        clientCode: n.client_code,
        containerNumber: n.container_number,
        operation: n.operation,
        message: n.message,
        transmissionLogId: n.transmission_log_id,
        createdAt: new Date(n.created_at),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Mark notifications as read.
   */
  async markRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      await supabase
        .from('edi_notifications')
        .update({ read: true })
        .in('id', ids);
    } catch (error) {
      console.error('EDINotificationService: failed to mark read', error);
    }
  }
}

export const ediNotificationService = new EDINotificationServiceImpl();
