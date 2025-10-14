import { supabase } from './supabaseClient';

export interface StackPairing {
  id: string;
  yardId: string;
  firstStackNumber: number;
  secondStackNumber: number;
  virtualStackNumber: number;
  firstStackId?: string;
  secondStackId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class StackPairingService {
  async getAll(yardId?: string): Promise<StackPairing[]> {
    let query = supabase
      .from('stack_pairings')
      .select('*')
      .eq('is_active', true)
      .order('virtual_stack_number', { ascending: true });

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      yardId: p.yard_id,
      firstStackNumber: p.first_stack_number,
      secondStackNumber: p.second_stack_number,
      virtualStackNumber: p.virtual_stack_number,
      firstStackId: p.first_stack_id,
      secondStackId: p.second_stack_id,
      isActive: p.is_active,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at)
    }));
  }

  async getByStackNumber(stackNumber: number, yardId: string): Promise<StackPairing | null> {
    const { data, error } = await supabase
      .from('stack_pairings')
      .select('*')
      .eq('yard_id', yardId)
      .eq('is_active', true)
      .or(`first_stack_number.eq.${stackNumber},second_stack_number.eq.${stackNumber}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      yardId: data.yard_id,
      firstStackNumber: data.first_stack_number,
      secondStackNumber: data.second_stack_number,
      virtualStackNumber: data.virtual_stack_number,
      firstStackId: data.first_stack_id,
      secondStackId: data.second_stack_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Get the virtual stack number for a given physical stack
   * Returns the virtual stack number if paired, otherwise returns the original stack number
   */
  async getVirtualStackNumber(stackNumber: number, yardId: string): Promise<number> {
    const pairing = await this.getByStackNumber(stackNumber, yardId);
    return pairing ? pairing.virtualStackNumber : stackNumber;
  }

  /**
   * Check if a stack is part of a pairing
   */
  async isStackPaired(stackNumber: number, yardId: string): Promise<boolean> {
    const pairing = await this.getByStackNumber(stackNumber, yardId);
    return pairing !== null;
  }

  /**
   * Get all stacks that are part of a pairing configuration
   */
  async getPairedStackNumbers(yardId: string): Promise<number[]> {
    const pairings = await this.getAll(yardId);
    const stackNumbers = new Set<number>();

    pairings.forEach(p => {
      stackNumbers.add(p.firstStackNumber);
      stackNumbers.add(p.secondStackNumber);
    });

    return Array.from(stackNumbers);
  }

  /**
   * Get pairing map: physical stack number → virtual stack number
   */
  async getPairingMap(yardId: string): Promise<Map<number, number>> {
    const pairings = await this.getAll(yardId);
    const map = new Map<number, number>();

    pairings.forEach(p => {
      map.set(p.firstStackNumber, p.virtualStackNumber);
      map.set(p.secondStackNumber, p.virtualStackNumber);
    });

    return map;
  }
}

export const stackPairingService = new StackPairingService();
