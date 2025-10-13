import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

type ChangeCallback<T = any> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
}) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToTable<T = any>(
    tableName: string,
    callback: ChangeCallback<T>,
    filter?: string
  ): () => void {
    const channelName = filter
      ? `${tableName}:${filter}`
      : tableName;

    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: filter
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to ${tableName} changes`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to ${tableName}`);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`🔌 Unsubscribed from ${channelName}`);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
      console.log(`🔌 Unsubscribed from ${name}`);
    });
    this.channels.clear();
  }

  subscribeToStacks(yardId: string, callback: ChangeCallback): () => void {
    return this.subscribeToTable('stacks', callback, `yard_id=eq.${yardId}`);
  }

  subscribeToContainers(callback: ChangeCallback): () => void {
    return this.subscribeToTable('containers', callback);
  }

  subscribeToGateInOperations(yardId: string, callback: ChangeCallback): () => void {
    return this.subscribeToTable('gate_in_operations', callback, `yard_id=eq.${yardId}`);
  }

  subscribeToGateOutOperations(yardId: string, callback: ChangeCallback): () => void {
    return this.subscribeToTable('gate_out_operations', callback, `yard_id=eq.${yardId}`);
  }

  subscribeToReleaseOrders(callback: ChangeCallback): () => void {
    return this.subscribeToTable('release_orders', callback);
  }

  subscribeToClients(callback: ChangeCallback): () => void {
    return this.subscribeToTable('clients', callback);
  }
}

export const realtimeService = new RealtimeService();
