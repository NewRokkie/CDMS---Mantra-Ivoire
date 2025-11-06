import { stackService } from '../../../services/api/stackService';
import { YardStack } from '../../../types/yard';
import { 
  filterCompatibleStacks, 
  checkStackAvailability, 
  formatStackId,
  parseStackId 
} from './stackValidation';

export interface StackPosition {
  id: string;
  formattedId: string;
  stackNumber: number;
  row: number;
  height: number;
  isAvailable: boolean;
  section: string;
  containerSize: '20ft' | '40ft';
  currentOccupancy: number;
  capacity: number;
  stack: YardStack;
}

/**
 * Gets all available stack positions for container assignment
 */
export const getAvailableStackPositions = async (
  yardId: string,
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2,
  clientCode?: string
): Promise<StackPosition[]> => {
  try {
    // Get all stacks for the yard
    const allStacks = await stackService.getByYardId(yardId);
    
    // Filter compatible stacks
    const compatibleStacks = filterCompatibleStacks(
      allStacks,
      containerSize,
      containerQuantity,
      clientCode
    );
    
    // Generate positions for each compatible stack
    const positions: StackPosition[] = [];
    
    for (const stack of compatibleStacks) {
      const stackPositions = generateStackPositions(stack, containerSize, containerQuantity);
      positions.push(...stackPositions);
    }
    
    // Sort positions by stack number, then row, then height
    return positions.sort((a, b) => {
      if (a.stackNumber !== b.stackNumber) {
        return a.stackNumber - b.stackNumber;
      }
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.height - b.height;
    });
    
  } catch (error) {
    console.error('Error getting available stack positions:', error);
    throw new Error('Failed to load available stack positions');
  }
};

/**
 * Generates all possible positions for a stack
 */
const generateStackPositions = (
  stack: YardStack,
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2
): StackPosition[] => {
  const positions: StackPosition[] = [];
  
  // Generate positions for each row and height combination
  for (let row = 1; row <= stack.rows; row++) {
    for (let height = 1; height <= stack.maxTiers; height++) {
      const availability = checkStackAvailability(
        stack,
        row,
        height,
        containerSize,
        containerQuantity
      );
      
      // Only include positions that could potentially be available
      // (we'll do real-time availability checking later)
      if (availability.isAvailable || stack.currentOccupancy < stack.capacity) {
        const formattedId = formatStackId(stack.stackNumber, row, height);
        
        positions.push({
          id: `${stack.id}-R${row}H${height}`,
          formattedId,
          stackNumber: stack.stackNumber,
          row,
          height,
          isAvailable: availability.isAvailable,
          section: stack.sectionName || 'Main',
          containerSize: stack.containerSize === '20feet' ? '20ft' : '40ft',
          currentOccupancy: stack.currentOccupancy,
          capacity: stack.capacity,
          stack
        });
      }
    }
  }
  
  return positions;
};

/**
 * Checks real-time availability of a specific stack position
 */
export const checkPositionAvailability = async (
  stackId: string,
  formattedPosition: string,
  containerSize: '20ft' | '40ft',
  containerQuantity: 1 | 2
): Promise<{ isAvailable: boolean; reason?: string }> => {
  try {
    // Parse the position
    const parsed = parseStackId(formattedPosition);
    if (!parsed) {
      return { isAvailable: false, reason: 'Invalid position format' };
    }
    
    // Get current stack data
    const stack = await stackService.getById(stackId);
    if (!stack) {
      return { isAvailable: false, reason: 'Stack not found' };
    }
    
    // Check availability
    const availability = checkStackAvailability(
      stack,
      parsed.row,
      parsed.height,
      containerSize,
      containerQuantity
    );
    
    return {
      isAvailable: availability.isAvailable,
      reason: availability.reason
    };
    
  } catch (error) {
    console.error('Error checking position availability:', error);
    return { isAvailable: false, reason: 'Failed to check availability' };
  }
};

/**
 * Reserves a stack position (placeholder for future implementation)
 */
export const reserveStackPosition = async (
  stackId: string,
  formattedPosition: string,
  containerNumber: string,
  reservationDuration: number = 300000 // 5 minutes default
): Promise<{ success: boolean; reservationId?: string; error?: string }> => {
  // This would implement position reservation logic
  // For now, we'll just return success
  console.log('Reserving position:', formattedPosition, 'for container:', containerNumber);
  
  return {
    success: true,
    reservationId: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

/**
 * Releases a stack position reservation
 */
export const releaseStackReservation = async (
  reservationId: string
): Promise<{ success: boolean; error?: string }> => {
  // This would implement reservation release logic
  console.log('Releasing reservation:', reservationId);
  
  return { success: true };
};

/**
 * Gets stack statistics for display
 */
export const getStackStatistics = async (yardId: string): Promise<{
  totalStacks: number;
  availableStacks: number;
  occupancyRate: number;
  stacksBySize: { '20ft': number; '40ft': number };
}> => {
  try {
    const stacks = await stackService.getByYardId(yardId);
    
    const totalStacks = stacks.length;
    const availableStacks = stacks.filter(s => s.currentOccupancy < s.capacity).length;
    const totalCapacity = stacks.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = stacks.reduce((sum, s) => sum + s.currentOccupancy, 0);
    const occupancyRate = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;
    
    const stacksBySize = {
      '20ft': stacks.filter(s => s.containerSize === '20feet').length,
      '40ft': stacks.filter(s => s.containerSize === '40feet').length
    };
    
    return {
      totalStacks,
      availableStacks,
      occupancyRate,
      stacksBySize
    };
    
  } catch (error) {
    console.error('Error getting stack statistics:', error);
    throw new Error('Failed to load stack statistics');
  }
};