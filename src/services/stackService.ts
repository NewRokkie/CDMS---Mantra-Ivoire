import { YardStack, YardSection } from '../types/yard';

export interface StackFormData {
  stackNumber: number;
  sectionId: string;
  rows: number;
  maxTiers: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number;
    length: number;
  };
  isOddStack?: boolean;
}

export interface StackValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Stack Service - Manages stack operations for all yards
 */
export class StackService {
  private stacks: Map<string, YardStack[]> = new Map(); // yardId -> stacks

  constructor() {
    this.initializeDefaultStacks();
  }

  /**
   * Initialize default stacks for existing yards
   */
  private initializeDefaultStacks(): void {
    // Initialize Tantarelli depot stacks
    this.stacks.set('depot-tantarelli', this.createTantarelliStacks());
    
    // Initialize other depot stacks
    this.stacks.set('depot-vridi', this.createStandardStacks('depot-vridi', 1, 40, 4, 5));
    this.stacks.set('depot-san-pedro', this.createStandardStacks('depot-san-pedro', 1, 30, 3, 4));
  }

  /**
   * Get all stacks for a specific yard
   */
  getStacksForYard(yardId: string): YardStack[] {
    return this.stacks.get(yardId) || [];
  }

  /**
   * Create a new stack
   */
  createStack(yardId: string, sectionId: string, stackData: StackFormData, userName?: string): YardStack {
    const validation = this.validateStack(yardId, stackData);
    if (!validation.isValid) {
      throw new Error(`Stack validation failed: ${validation.errors.join(', ')}`);
    }

    const newStack: YardStack = {
      id: `stack-${yardId}-${stackData.stackNumber}`,
      stackNumber: stackData.stackNumber,
      sectionId: stackData.sectionId,
      rows: stackData.rows,
      maxTiers: stackData.maxTiers,
      currentOccupancy: 0,
      capacity: stackData.rows * stackData.maxTiers,
      position: stackData.position,
      dimensions: stackData.dimensions,
      containerPositions: [],
      isOddStack: stackData.isOddStack || false
    };

    // Add to yard stacks
    const yardStacks = this.stacks.get(yardId) || [];
    yardStacks.push(newStack);
    this.stacks.set(yardId, yardStacks);

    console.log(`Created stack ${stackData.stackNumber} in yard ${yardId} by ${userName || 'System'}`);
    return newStack;
  }

  /**
   * Update an existing stack
   */
  updateStack(yardId: string, stackId: string, updates: Partial<StackFormData>, userName?: string): YardStack | null {
    const yardStacks = this.stacks.get(yardId) || [];
    const stackIndex = yardStacks.findIndex(s => s.id === stackId);
    
    if (stackIndex === -1) return null;

    const existingStack = yardStacks[stackIndex];
    
    // Validate updates if stack number is being changed
    if (updates.stackNumber && updates.stackNumber !== existingStack.stackNumber) {
      const validation = this.validateStack(yardId, { ...existingStack, ...updates } as StackFormData, stackId);
      if (!validation.isValid) {
        throw new Error(`Stack validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const updatedStack: YardStack = {
      ...existingStack,
      ...(updates.stackNumber && { stackNumber: updates.stackNumber }),
      ...(updates.sectionId && { sectionId: updates.sectionId }),
      ...(updates.rows && { rows: updates.rows }),
      ...(updates.maxTiers && { maxTiers: updates.maxTiers }),
      ...(updates.position && { position: updates.position }),
      ...(updates.dimensions && { dimensions: updates.dimensions }),
      ...(updates.isOddStack !== undefined && { isOddStack: updates.isOddStack })
    };

    // Recalculate capacity if rows or tiers changed
    if (updates.rows || updates.maxTiers) {
      updatedStack.capacity = updatedStack.rows * updatedStack.maxTiers;
      // Ensure current occupancy doesn't exceed new capacity
      updatedStack.currentOccupancy = Math.min(updatedStack.currentOccupancy, updatedStack.capacity);
    }

    yardStacks[stackIndex] = updatedStack;
    this.stacks.set(yardId, yardStacks);

    console.log(`Updated stack ${stackId} in yard ${yardId} by ${userName || 'System'}`);
    return updatedStack;
  }

  /**
   * Delete a stack
   */
  deleteStack(yardId: string, stackId: string, userName?: string): boolean {
    const yardStacks = this.stacks.get(yardId) || [];
    const stack = yardStacks.find(s => s.id === stackId);
    
    if (!stack) return false;

    // Check if stack has containers
    if (stack.currentOccupancy > 0) {
      throw new Error('Cannot delete stack with containers. Please move all containers first.');
    }

    // Remove stack from yard
    const filteredStacks = yardStacks.filter(s => s.id !== stackId);
    this.stacks.set(yardId, filteredStacks);

    console.log(`Deleted stack ${stack.stackNumber} from yard ${yardId} by ${userName || 'System'}`);
    return true;
  }

  /**
   * Validate stack data
   */
  validateStack(yardId: string, stackData: StackFormData, excludeStackId?: string): StackValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!stackData.stackNumber || stackData.stackNumber <= 0) {
      errors.push('Stack number must be a positive integer');
    }

    if (!stackData.sectionId) {
      errors.push('Section ID is required');
    }

    if (!stackData.rows || stackData.rows <= 0) {
      errors.push('Number of rows must be greater than 0');
    }

    if (!stackData.maxTiers || stackData.maxTiers <= 0) {
      errors.push('Number of tiers must be greater than 0');
    }

    // Check for duplicate stack numbers in the same yard
    const yardStacks = this.stacks.get(yardId) || [];
    const duplicateStack = yardStacks.find(s => 
      s.stackNumber === stackData.stackNumber && 
      s.id !== excludeStackId
    );
    
    if (duplicateStack) {
      errors.push(`Stack number ${stackData.stackNumber} already exists in this yard`);
    }

    // Check reasonable limits
    if (stackData.rows > 10) {
      warnings.push('Stack has more than 10 rows - this may be difficult to manage');
    }

    if (stackData.maxTiers > 6) {
      warnings.push('Stack height exceeds 6 tiers - consider safety regulations');
    }

    // Check position conflicts (simplified - in production you'd check actual overlaps)
    const positionConflict = yardStacks.find(s => 
      s.position.x === stackData.position.x && 
      s.position.y === stackData.position.y &&
      s.id !== excludeStackId
    );
    
    if (positionConflict) {
      errors.push('Another stack already exists at this position');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get stack by ID
   */
  getStackById(yardId: string, stackId: string): YardStack | null {
    const yardStacks = this.stacks.get(yardId) || [];
    return yardStacks.find(s => s.id === stackId) || null;
  }

  /**
   * Get stack by number
   */
  getStackByNumber(yardId: string, stackNumber: number): YardStack | null {
    const yardStacks = this.stacks.get(yardId) || [];
    return yardStacks.find(s => s.stackNumber === stackNumber) || null;
  }

  /**
   * Get available stack numbers for a yard
   */
  getAvailableStackNumbers(yardId: string, maxNumber: number = 200): number[] {
    const yardStacks = this.stacks.get(yardId) || [];
    const usedNumbers = new Set(yardStacks.map(s => s.stackNumber));
    
    const available: number[] = [];
    for (let i = 1; i <= maxNumber; i++) {
      if (!usedNumbers.has(i)) {
        available.push(i);
      }
    }
    
    return available;
  }

  /**
   * Bulk create stacks
   */
  bulkCreateStacks(yardId: string, sectionId: string, stacksData: StackFormData[], userName?: string): YardStack[] {
    const createdStacks: YardStack[] = [];
    const errors: string[] = [];

    stacksData.forEach((stackData, index) => {
      try {
        const stack = this.createStack(yardId, sectionId, stackData, userName);
        createdStacks.push(stack);
      } catch (error) {
        errors.push(`Stack ${index + 1}: ${error}`);
      }
    });

    if (errors.length > 0) {
      console.warn('Some stacks failed to create:', errors);
    }

    console.log(`Bulk created ${createdStacks.length} stacks in yard ${yardId} by ${userName || 'System'}`);
    return createdStacks;
  }

  /**
   * Generate grid layout stacks
   */
  generateGridLayout(
    yardId: string,
    sectionId: string,
    startNumber: number,
    endNumber: number,
    rows: number,
    tiers: number,
    startX: number,
    startY: number,
    spacingX: number,
    spacingY: number,
    stacksPerRow: number,
    userName?: string
  ): YardStack[] {
    const stacksData: StackFormData[] = [];
    
    for (let i = startNumber; i <= endNumber; i++) {
      const index = i - startNumber;
      const row = Math.floor(index / stacksPerRow);
      const col = index % stacksPerRow;
      
      stacksData.push({
        stackNumber: i,
        sectionId,
        rows,
        maxTiers: tiers,
        position: {
          x: startX + (col * spacingX),
          y: startY + (row * spacingY),
          z: 0
        },
        dimensions: {
          width: 12,
          length: 6
        },
        isOddStack: false
      });
    }

    return this.bulkCreateStacks(yardId, sectionId, stacksData, userName);
  }

  /**
   * Create Tantarelli-style stacks (existing layout)
   */
  private createTantarelliStacks(): YardStack[] {
    const stacks: YardStack[] = [];

    // Top Section stacks
    const topStacks = [
      { stackNumber: 1, rows: 4, x: 20, y: 20 },
      { stackNumber: 3, rows: 5, x: 50, y: 20 },
      { stackNumber: 5, rows: 5, x: 80, y: 20 },
      { stackNumber: 7, rows: 5, x: 110, y: 20 },
      { stackNumber: 9, rows: 5, x: 140, y: 20 },
      { stackNumber: 11, rows: 5, x: 170, y: 20 },
      { stackNumber: 13, rows: 5, x: 200, y: 20 },
      { stackNumber: 15, rows: 5, x: 230, y: 20 },
      { stackNumber: 17, rows: 5, x: 260, y: 20 },
      { stackNumber: 19, rows: 5, x: 290, y: 20 },
      { stackNumber: 21, rows: 5, x: 320, y: 20 },
      { stackNumber: 23, rows: 5, x: 350, y: 20 },
      { stackNumber: 25, rows: 5, x: 20, y: 60 },
      { stackNumber: 27, rows: 5, x: 50, y: 60 },
      { stackNumber: 29, rows: 5, x: 80, y: 60 },
      { stackNumber: 31, rows: 7, x: 110, y: 60 }
    ];

    topStacks.forEach((stack) => {
      stacks.push({
        id: `stack-${stack.stackNumber}`,
        stackNumber: stack.stackNumber,
        sectionId: 'section-top',
        rows: stack.rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
        capacity: stack.rows * 5,
        position: { x: stack.x, y: stack.y, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      });
    });

    // Center Section stacks
    const centerStacks = [
      { stackNumber: 33, rows: 5, x: 20, y: 160 },
      { stackNumber: 35, rows: 5, x: 50, y: 160 },
      { stackNumber: 37, rows: 5, x: 80, y: 160 },
      { stackNumber: 39, rows: 5, x: 110, y: 160 },
      { stackNumber: 41, rows: 4, x: 140, y: 160 },
      { stackNumber: 43, rows: 4, x: 170, y: 160 },
      { stackNumber: 45, rows: 4, x: 200, y: 160 },
      { stackNumber: 47, rows: 4, x: 230, y: 160 },
      { stackNumber: 49, rows: 4, x: 260, y: 160 },
      { stackNumber: 51, rows: 4, x: 290, y: 160 },
      { stackNumber: 53, rows: 4, x: 320, y: 160 },
      { stackNumber: 55, rows: 4, x: 350, y: 160 }
    ];

    centerStacks.forEach((stack) => {
      stacks.push({
        id: `stack-${stack.stackNumber}`,
        stackNumber: stack.stackNumber,
        sectionId: 'section-center',
        rows: stack.rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
        capacity: stack.rows * 5,
        position: { x: stack.x, y: stack.y, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      });
    });

    // Bottom Section stacks
    const bottomStacks = [
      { stackNumber: 61, rows: 6, x: 20, y: 280 },
      { stackNumber: 63, rows: 6, x: 50, y: 280 },
      { stackNumber: 65, rows: 6, x: 80, y: 280 },
      { stackNumber: 67, rows: 6, x: 110, y: 280 },
      { stackNumber: 69, rows: 6, x: 140, y: 280 },
      { stackNumber: 71, rows: 6, x: 170, y: 280 },
      { stackNumber: 73, rows: 4, x: 200, y: 280 },
      { stackNumber: 75, rows: 4, x: 230, y: 280 },
      { stackNumber: 77, rows: 4, x: 260, y: 280 },
      { stackNumber: 79, rows: 4, x: 290, y: 280 },
      { stackNumber: 81, rows: 4, x: 320, y: 280 },
      { stackNumber: 83, rows: 4, x: 350, y: 280 },
      { stackNumber: 85, rows: 4, x: 20, y: 320 },
      { stackNumber: 87, rows: 4, x: 50, y: 320 },
      { stackNumber: 89, rows: 4, x: 80, y: 320 },
      { stackNumber: 91, rows: 4, x: 110, y: 320 },
      { stackNumber: 93, rows: 4, x: 140, y: 320 },
      { stackNumber: 95, rows: 4, x: 170, y: 320 },
      { stackNumber: 97, rows: 4, x: 200, y: 320 },
      { stackNumber: 99, rows: 4, x: 230, y: 320 },
      { stackNumber: 101, rows: 1, x: 260, y: 320 },
      { stackNumber: 103, rows: 2, x: 290, y: 320 }
    ];

    bottomStacks.forEach((stack) => {
      stacks.push({
        id: `stack-${stack.stackNumber}`,
        stackNumber: stack.stackNumber,
        sectionId: 'section-bottom',
        rows: stack.rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
        capacity: stack.rows * 5,
        position: { x: stack.x, y: stack.y, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      });
    });

    return stacks;
  }

  /**
   * Create standard grid stacks
   */
  private createStandardStacks(yardId: string, startNum: number, endNum: number, rows: number, tiers: number): YardStack[] {
    const stacks: YardStack[] = [];

    for (let i = startNum; i <= endNum; i++) {
      const index = i - startNum;
      const row = Math.floor(index / 10); // 10 stacks per row
      const col = index % 10;

      stacks.push({
        id: `stack-${yardId}-${i}`,
        stackNumber: i,
        sectionId: `${yardId}-section-${Math.floor(index / 20) + 1}`, // 20 stacks per section
        rows,
        maxTiers: tiers,
        currentOccupancy: Math.floor(Math.random() * (rows * tiers)),
        capacity: rows * tiers,
        position: { x: col * 15, y: row * 20, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: false
      });
    }

    return stacks;
  }

  /**
   * Get stack statistics for a yard
   */
  getYardStackStats(yardId: string) {
    const yardStacks = this.stacks.get(yardId) || [];
    
    return {
      totalStacks: yardStacks.length,
      totalCapacity: yardStacks.reduce((sum, s) => sum + s.capacity, 0),
      totalOccupancy: yardStacks.reduce((sum, s) => sum + s.currentOccupancy, 0),
      averageRows: yardStacks.length > 0 ? yardStacks.reduce((sum, s) => sum + s.rows, 0) / yardStacks.length : 0,
      averageTiers: yardStacks.length > 0 ? yardStacks.reduce((sum, s) => sum + s.maxTiers, 0) / yardStacks.length : 0,
      utilizationRate: yardStacks.length > 0 ? 
        (yardStacks.reduce((sum, s) => sum + s.currentOccupancy, 0) / yardStacks.reduce((sum, s) => sum + s.capacity, 0)) * 100 : 0
    };
  }

  /**
   * Update yard sections with current stacks
   */
  updateYardSections(yardId: string, sections: YardSection[]): YardSection[] {
    const yardStacks = this.stacks.get(yardId) || [];
    
    return sections.map(section => ({
      ...section,
      stacks: yardStacks.filter(stack => stack.sectionId === section.id)
    }));
  }

  /**
   * Create a new section for a yard
   */
  createSection(yardId: string, sectionData: Omit<YardSection, 'id' | 'yardId' | 'stacks'>): YardSection {
    const newSection: YardSection = {
      id: `section-${yardId}-${Date.now()}`,
      yardId,
      stacks: [],
      ...sectionData
    };

    return newSection;
  }

  /**
   * Get next available stack number
   */
  getNextStackNumber(yardId: string): number {
    const yardStacks = this.stacks.get(yardId) || [];
    const maxNumber = Math.max(0, ...yardStacks.map(s => s.stackNumber));
    return maxNumber + 1;
  }

  /**
   * Clone stacks from one yard to another
   */
  cloneStacksToYard(sourceYardId: string, targetYardId: string, userName?: string): YardStack[] {
    const sourceStacks = this.stacks.get(sourceYardId) || [];
    const clonedStacks: YardStack[] = [];

    sourceStacks.forEach(stack => {
      const clonedStack: YardStack = {
        ...stack,
        id: `stack-${targetYardId}-${stack.stackNumber}`,
        sectionId: stack.sectionId.replace(sourceYardId, targetYardId),
        currentOccupancy: 0, // Reset occupancy for new yard
        containerPositions: [] // Reset container positions
      };
      clonedStacks.push(clonedStack);
    });

    this.stacks.set(targetYardId, clonedStacks);
    console.log(`Cloned ${clonedStacks.length} stacks from ${sourceYardId} to ${targetYardId} by ${userName || 'System'}`);
    
    return clonedStacks;
  }
}

// Singleton instance
export const stackService = new StackService();