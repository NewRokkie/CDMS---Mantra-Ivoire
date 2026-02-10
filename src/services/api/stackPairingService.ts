import { logger } from '../../utils/logger';
import { supabase } from './supabaseClient';
import { virtualLocationCalculatorService } from './virtualLocationCalculatorService';

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

  /**
   * Ensure virtual locations exist for a stack pairing
   * Requirements: 3.3 - Automatic virtual location generation for stack pairings
   * 
   * @param pairing - Stack pairing to ensure virtual locations for
   * @param rows - Number of rows
   * @param tiers - Number of tiers
   */
  async ensureVirtualLocations(
    pairing: StackPairing,
    rows: number,
    tiers: number
  ): Promise<void> {
    try {
      if (!pairing.firstStackId || !pairing.secondStackId) {
        logger.warn('Stack pairing missing stack IDs, cannot create virtual locations', 'stackPairingService.ts');
        return;
      }

      // Check if virtual locations already exist
      const existingPair = await virtualLocationCalculatorService.getVirtualStackPairByStacks(
        pairing.yardId,
        pairing.firstStackId,
        pairing.secondStackId
      );

      if (!existingPair) {
        // Create virtual locations
        await virtualLocationCalculatorService.createVirtualLocations({
          yardId: pairing.yardId,
          stack1Id: pairing.firstStackId,
          stack2Id: pairing.secondStackId,
          stack1Number: pairing.firstStackNumber,
          stack2Number: pairing.secondStackNumber,
          rows,
          tiers
        });
        logger.info('Information', 'stackPairingService.ts', `✅ Created virtual locations for pairing S${String(pairing.firstStackNumber).padStart(2, '0')} + S${String(pairing.secondStackNumber).padStart(2, '0')}`);
      }
    } catch (error) {
      logger.error('Failed to ensure virtual locations:', 'stackPairingService.ts', error)
    }
  }

  /**
   * Sync all virtual locations for a yard
   * Requirements: 3.3 - Ensure all pairings have virtual locations
   * 
   * @param yardId - Yard ID
   * @param defaultRows - Default number of rows (if not specified per stack)
   * @param defaultTiers - Default number of tiers (if not specified per stack)
   */
  async syncAllVirtualLocations(
    yardId: string,
    defaultRows: number = 6,
    defaultTiers: number = 4
  ): Promise<void> {
    try {
      const pairings = await this.getAll(yardId);
      logger.info('Information', 'stackPairingService.ts', `🔄 Syncing virtual locations for ${pairings.length} pairings in yard ${yardId}`)

      for (const pairing of pairings) {
        await this.ensureVirtualLocations(pairing, defaultRows, defaultTiers);
      }
      logger.info('Information', 'stackPairingService.ts', `✅ Completed virtual location sync for yard ${yardId}`)
    } catch (error) {
      logger.error('Failed to sync virtual locations:', 'stackPairingService.ts', error)
      throw error;
    }
  }
}

export const stackPairingService = new StackPairingService();
