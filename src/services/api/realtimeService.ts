import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

type ChangeCallback<T = any> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
}) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private channelRefs: Map<string, number> = new Map();

  subscribeToTable<T = any>(
    tableName: string,
    callback: ChangeCallback<T>,
    filter?: string
  ): () => void {
    const channelName = filter
      ? `${tableName}:${filter}`
      : tableName;

    // Increment reference count for this channel
    const currentRefs = this.channelRefs.get(channelName) || 0;
    this.channelRefs.set(channelName, currentRefs + 1);

    // If already subscribed, just return the unsubscribe function
    if (this.channels.has(channelName)) {
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
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  unsubscribe(channelName: string): void {
    const currentRefs = this.channelRefs.get(channelName) || 0;
    const newRefs = currentRefs - 1;
    this.channelRefs.set(channelName, newRefs);

    // Only actually unsubscribe when reference count reaches 0
    if (newRefs <= 0) {
      const channel = this.channels.get(channelName);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelName);
      }
      this.channelRefs.delete(channelName);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.channelRefs.clear();
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

  subscribeToBookingReferences(callback: ChangeCallback): () => void {
    return this.subscribeToTable('booking_references', callback);
  }

  subscribeToClients(callback: ChangeCallback): () => void {
    return this.subscribeToTable('clients', callback);
  }

  subscribeToLocations(yardId: string, callback: ChangeCallback): () => void {
    return this.subscribeToTable('locations', callback, `yard_id=eq.${yardId}`);
  }
}

export const realtimeService = new RealtimeService();
