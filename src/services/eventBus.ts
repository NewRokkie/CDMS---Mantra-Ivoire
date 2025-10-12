import { Container, ReleaseOrder } from '../types';
import { GateInOperation, GateOutOperation } from '../types/operations';

export type EventType =
  | 'CONTAINER_ADDED'
  | 'CONTAINER_UPDATED'
  | 'CONTAINER_DELETED'
  | 'GATE_IN_STARTED'
  | 'GATE_IN_COMPLETED'
  | 'GATE_IN_FAILED'
  | 'GATE_OUT_STARTED'
  | 'GATE_OUT_COMPLETED'
  | 'GATE_OUT_FAILED'
  | 'RELEASE_ORDER_CREATED'
  | 'RELEASE_ORDER_UPDATED'
  | 'RELEASE_ORDER_COMPLETED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'YARD_POSITION_ASSIGNED'
  | 'EDI_TRANSMISSION_REQUESTED'
  | 'EDI_TRANSMISSION_COMPLETED'
  | 'EDI_TRANSMISSION_FAILED';

export interface EventPayload {
  CONTAINER_ADDED: { container: Container; operation: GateInOperation };
  CONTAINER_UPDATED: { containerId: string; before: Partial<Container>; after: Partial<Container> };
  CONTAINER_DELETED: { containerId: string; container: Container };
  GATE_IN_STARTED: { containerNumber: string; clientCode: string; operatorId: string };
  GATE_IN_COMPLETED: { container: Container; operation: GateInOperation };
  GATE_IN_FAILED: { containerNumber: string; error: string };
  GATE_OUT_STARTED: { releaseOrderId: string; containerIds: string[]; operatorId: string };
  GATE_OUT_COMPLETED: { containers: Container[]; operation: GateOutOperation; releaseOrder: ReleaseOrder };
  GATE_OUT_FAILED: { releaseOrderId: string; error: string };
  RELEASE_ORDER_CREATED: { releaseOrder: ReleaseOrder };
  RELEASE_ORDER_UPDATED: { releaseOrderId: string; before: Partial<ReleaseOrder>; after: Partial<ReleaseOrder> };
  RELEASE_ORDER_COMPLETED: { releaseOrder: ReleaseOrder };
  CLIENT_CREATED: { clientId: string; clientCode: string };
  CLIENT_UPDATED: { clientId: string; clientCode: string };
  YARD_POSITION_ASSIGNED: { containerId: string; location: string; yardId: string };
  EDI_TRANSMISSION_REQUESTED: { entityId: string; entityType: string; messageType: string };
  EDI_TRANSMISSION_COMPLETED: { entityId: string; transmissionId: string };
  EDI_TRANSMISSION_FAILED: { entityId: string; error: string };
}

type EventHandler<T extends EventType> = (payload: EventPayload[T]) => void | Promise<void>;

class EventBus {
  private listeners: Map<EventType, Set<EventHandler<any>>> = new Map();
  private eventHistory: Array<{ type: EventType; payload: any; timestamp: Date }> = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event
   */
  on<T extends EventType>(eventType: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<T extends EventType>(eventType: T, handler: EventHandler<T>): void {
    const wrappedHandler = async (payload: EventPayload[T]) => {
      await handler(payload);
      this.off(eventType, wrappedHandler);
    };
    this.on(eventType, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends EventType>(eventType: T, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<T extends EventType>(eventType: T, payload: EventPayload[T]): Promise<void> {
    // Add to history
    this.addToHistory(eventType, payload);

    // Get handlers for this event
    const handlers = this.listeners.get(eventType);
    if (!handlers || handlers.size === 0) {
      console.log(`[EventBus] No listeners for event: ${eventType}`);
      return;
    }

    console.log(`[EventBus] Emitting ${eventType} to ${handlers.size} listeners`);

    // Execute all handlers (in parallel for performance)
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${eventType}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Emit event synchronously (fire and forget)
   */
  emitSync<T extends EventType>(eventType: T, payload: EventPayload[T]): void {
    this.emit(eventType, payload).catch((error) => {
      console.error(`[EventBus] Error emitting ${eventType}:`, error);
    });
  }

  /**
   * Get event history
   */
  getHistory(eventType?: EventType): Array<{ type: EventType; payload: any; timestamp: Date }> {
    if (eventType) {
      return this.eventHistory.filter(e => e.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count for an event
   */
  listenerCount(eventType: EventType): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  private addToHistory(type: EventType, payload: any): void {
    this.eventHistory.push({
      type,
      payload,
      timestamp: new Date()
    });

    // Keep history size limited
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Export for testing
export { EventBus };
