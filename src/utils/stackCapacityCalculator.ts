import { YardStack } from '../types/yard';

/**
 * Calculate effective capacity for stacks considering 40ft pairings
 * 
 * Logic:
 * - 20ft stacks: Use individual capacity
 * - 40ft paired stacks: Use capacity of one stack only (not sum of both)
 * - Virtual stacks: Not counted (they represent the pairing)
 */

export interface StackCapacityInfo {
  stackId: string;
  stackNumber: number;
  containerSize: '20ft' | '40ft';
  individualCapacity: number;
  effectiveCapacity: number;
  isPaired: boolean;
  pairedWith?: number;
  isVirtual: boolean;
}

export class StackCapacityCalculator {
  /**
   * Calculate effective capacity for a list of stacks
   * Handles 40ft pairing logic where paired stacks share capacity
   */
  static calculateEffectiveCapacities(stacks: YardStack[]): StackCapacityInfo[] {
    const result: StackCapacityInfo[] = [];
    const processedPairs = new Set<string>();

    for (const stack of stacks) {
      // Skip virtual stacks - they don't contribute to capacity
      if (stack.isVirtual) {
        result.push({
          stackId: stack.id,
          stackNumber: stack.stackNumber,
          containerSize: stack.containerSize || '20ft',
          individualCapacity: stack.capacity,
          effectiveCapacity: 0, // Virtual stacks don't count
          isPaired: false,
          isVirtual: true
        });
        continue;
      }

      const stackInfo: StackCapacityInfo = {
        stackId: stack.id,
        stackNumber: stack.stackNumber,
        containerSize: stack.containerSize || '20ft',
        individualCapacity: stack.capacity,
        effectiveCapacity: stack.capacity,
        isPaired: false,
        isVirtual: false
      };

      // Handle 40ft stacks - they might be paired
      if (stack.containerSize === '40ft') {
        const pairedStackNumber = this.getAdjacentStackNumber(stack.stackNumber);
        
        if (pairedStackNumber) {
          const pairedStack = stacks.find(s => s.stackNumber === pairedStackNumber && s.containerSize === '40ft');
          
          if (pairedStack) {
            const pairKey = `${Math.min(stack.stackNumber, pairedStackNumber)}-${Math.max(stack.stackNumber, pairedStackNumber)}`;
            
            if (!processedPairs.has(pairKey)) {
              // First stack of the pair - use its capacity
              stackInfo.isPaired = true;
              stackInfo.pairedWith = pairedStackNumber;
              stackInfo.effectiveCapacity = stack.capacity; // Use capacity of one stack only
              processedPairs.add(pairKey);
            } else {
              // Second stack of the pair - capacity is 0 (already counted in first stack)
              stackInfo.isPaired = true;
              stackInfo.pairedWith = pairedStackNumber;
              stackInfo.effectiveCapacity = 0;
            }
          }
        }
      }

      result.push(stackInfo);
    }

    return result;
  }

  /**
   * Calculate total effective capacity for a list of stacks
   */
  static calculateTotalEffectiveCapacity(stacks: YardStack[]): number {
    const capacityInfos = this.calculateEffectiveCapacities(stacks);
    return capacityInfos.reduce((sum, info) => sum + info.effectiveCapacity, 0);
  }

  /**
   * Get adjacent stack number for pairing logic
   */
  private static getAdjacentStackNumber(stackNumber: number): number | null {
    const SPECIAL_STACKS = [1, 31, 101, 103];
    if (SPECIAL_STACKS.includes(stackNumber)) return null;

    const isValidPairStack = (num: number): boolean => {
      if (num >= 3 && num <= 29) {
        const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 33 && num <= 55) {
        const validFirstNumbers = [33, 37, 41, 45, 49, 53];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 61 && num <= 99) {
        const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      }
      return false;
    };

    if (!isValidPairStack(stackNumber)) return null;

    let partnerNumber: number;

    if (stackNumber >= 3 && stackNumber <= 29) {
      const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 33 && stackNumber <= 55) {
      const validFirstNumbers = [33, 37, 41, 45, 49, 53];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 61 && stackNumber <= 99) {
      const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else {
      return null;
    }

    return partnerNumber;
  }

  /**
   * Get capacity breakdown for debugging
   */
  static getCapacityBreakdown(stacks: YardStack[]): {
    totalEffective: number;
    totalIndividual: number;
    breakdown: StackCapacityInfo[];
  } {
    const breakdown = this.calculateEffectiveCapacities(stacks);
    const totalEffective = breakdown.reduce((sum, info) => sum + info.effectiveCapacity, 0);
    const totalIndividual = breakdown.reduce((sum, info) => sum + info.individualCapacity, 0);

    return {
      totalEffective,
      totalIndividual,
      breakdown
    };
  }
}