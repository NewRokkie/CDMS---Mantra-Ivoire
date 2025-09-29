import { Yard, YardContext, YardOperationLog, YardStats, YardStack } from '../types/yard';
import { Container } from '../types';
import { stackService } from './stackService';

/**
 * Yard Service - Manages multiple independent yards
 */
export class YardService {
  private yards: Map<string, Yard> = new Map();
  private currentYardId: string | null = null;
  private operationLogs: YardOperationLog[] = [];

  constructor() {
    this.initializeDefaultYards();
  }

  /**
   * Initialize default yards for the system
   */
  private initializeDefaultYards(): void {
    const defaultYards: Yard[] = [
      {
        id: 'depot-tantarelli',
        name: 'Depot Tantarelli',
        code: 'DEPOT-01',
        description: 'Main container depot with specialized odd-numbered stack layout',
        location: 'Tantarelli Port Complex',
        isActive: true,
        totalCapacity: 2500,
        currentOccupancy: 1847,
        sections: this.createDefaultSections('depot-tantarelli'),
        sections: this.createTantarelliSections(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        createdBy: 'System',
        updatedBy: 'System',
        layout: 'tantarelli',
        timezone: 'Africa/Abidjan',
        contactInfo: {
          manager: 'Jean-Baptiste Kouassi',
          phone: '+225 XX XX XX XX XX',
          email: 'manager.tantarelli@depot.ci'
        },
        address: {
          street: 'Zone Portuaire de Tantarelli',
          city: 'Abidjan',
          state: 'Lagunes',
          zipCode: '01 BP 1234',
          country: 'Côte d\'Ivoire'
        }
      },
      {
        id: 'depot-vridi',
        name: 'Depot Vridi',
        code: 'DEPOT-02',
        description: 'Secondary container depot with standard grid layout',
        location: 'Port Autonome d\'Abidjan - Vridi',
        isActive: true,
        totalCapacity: 1800,
        currentOccupancy: 1245,
        sections: this.createDefaultSections('depot-vridi'),
        sections: this.createVridiSections(),
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
        createdBy: 'System',
        updatedBy: 'System',
        layout: 'standard',
        timezone: 'Africa/Abidjan',
        contactInfo: {
          manager: 'Marie Adjoua',
          phone: '+225 YY YY YY YY YY',
          email: 'manager.vridi@depot.ci'
        },
        address: {
          street: 'Boulevard de Vridi',
          city: 'Abidjan',
          state: 'Lagunes',
          zipCode: '08 BP 5678',
          country: 'Côte d\'Ivoire'
        }
      },
      {
        id: 'depot-san-pedro',
        name: 'Depot San Pedro',
        code: 'DEPOT-03',
        description: 'Coastal container depot with specialized handling',
        location: 'Port Autonome de San Pedro',
        isActive: true,
        totalCapacity: 1200,
        currentOccupancy: 890,
        sections: this.createDefaultSections('depot-san-pedro'),
        sections: this.createSanPedroSections(),
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date(),
        createdBy: 'System',
        updatedBy: 'System',
        layout: 'standard',
        timezone: 'Africa/Abidjan',
        contactInfo: {
          manager: 'Pierre Kouadio',
          phone: '+225 ZZ ZZ ZZ ZZ ZZ',
          email: 'manager.sanpedro@depot.ci'
        },
        address: {
          street: 'Zone Portuaire San Pedro',
          city: 'San Pedro',
          state: 'Bas-Sassandra',
          zipCode: '10 BP 3456',
          country: 'Côte d\'Ivoire'
        }
      }
    ];

    defaultYards.forEach(yard => {
      this.yards.set(yard.id, yard);
    });

    this.initializeStacksForYards(defaultYards);

    // Set default yard
    this.currentYardId = 'depot-tantarelli';

    console.log('Yard Service initialized with', defaultYards.length, 'yards');
  }

  /**
   * Create Tantarelli yard sections (existing layout)
   */
  private createTantarelliSections() {
    // Return the existing Tantarelli layout
    return [
      {
        id: 'section-top',
        name: 'Top Section',
        yardId: 'depot-tantarelli',
        stacks: this.createTantarelliTopStacks(),
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 400, length: 120 },
        color: '#3b82f6'
      },
      {
        id: 'section-center',
        name: 'Center Section',
        yardId: 'depot-tantarelli',
        stacks: this.createTantarelliCenterStacks(),
        position: { x: 0, y: 140, z: 0 },
        dimensions: { width: 400, length: 100 },
        color: '#f59e0b'
      },
      {
        id: 'section-bottom',
        name: 'Bottom Section',
        yardId: 'depot-tantarelli',
        stacks: this.createTantarelliBottomStacks(),
        position: { x: 0, y: 260, z: 0 },
        dimensions: { width: 400, length: 140 },
        color: '#10b981'
      }
    ];
  }

  /**
   * Create Vridi yard sections (standard grid layout)
   */
  private createVridiSections() {
    return [
      {
        id: 'vridi-section-a',
        name: 'Section A',
        yardId: 'depot-vridi',
        stacks: this.createStandardStacks('vridi-section-a', 1, 20, 4, 5),
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 300, length: 100 },
        color: '#3b82f6'
      },
      {
        id: 'vridi-section-b',
        name: 'Section B',
        yardId: 'depot-vridi',
        stacks: this.createStandardStacks('vridi-section-b', 21, 40, 5, 5),
        position: { x: 0, y: 120, z: 0 },
        dimensions: { width: 300, length: 100 },
        color: '#10b981'
      }
    ];
  }

  /**
   * Create San Pedro yard sections (standard grid layout)
   */
  private createSanPedroSections() {
    return [
      {
        id: 'sanpedro-section-a',
        name: 'Section A',
        yardId: 'depot-san-pedro',
        stacks: this.createStandardStacks('sanpedro-section-a', 1, 15, 4, 4),
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 250, length: 80 },
        color: '#3b82f6'
      },
      {
        id: 'sanpedro-section-b',
        name: 'Section B',
        yardId: 'depot-san-pedro',
        stacks: this.createStandardStacks('sanpedro-section-b', 16, 30, 3, 4),
        position: { x: 0, y: 100, z: 0 },
        dimensions: { width: 250, length: 60 },
        color: '#10b981'
      }
    ];
  }

  /**
   * Helper methods for creating stacks
   */
  private createTantarelliTopStacks(): YardStack[] {
    const stacks: YardStack[] = [];
    const stackNumbers = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];

    stackNumbers.forEach((num, index) => {
      stacks.push({
        id: `stack-${num}`,
        stackNumber: num,
        sectionId: 'section-top',
        rows: num === 1 ? 4 : num === 31 ? 7 : 5,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * 25),
        capacity: (num === 1 ? 4 : num === 31 ? 7 : 5) * 5,
        position: { x: index * 25, y: 20, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      });
    });

    return stacks;
  }

  private createTantarelliCenterStacks(): YardStack[] {
    const stacks: YardStack[] = [];
    const stackNumbers = [33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55];

    stackNumbers.forEach((num, index) => {
      stacks.push({
        id: `stack-${num}`,
        stackNumber: num,
        sectionId: 'section-center',
        rows: index < 4 ? 5 : 4,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * 25),
        capacity: (index < 4 ? 5 : 4) * 5,
        position: { x: index * 25, y: 160, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      });
    });

    return stacks;
  }

  private createTantarelliBottomStacks(): YardStack[] {
    const stacks: YardStack[] = [];
    const stackNumbers = [61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101, 103];

    stackNumbers.forEach((num, index) => {
      const rows = index < 6 ? 6 : index < 18 ? 4 : (num === 101 ? 1 : 2);
      stacks.push({
        id: `stack-${num}`,
        stackNumber: num,
        sectionId: 'section-bottom',
        rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * 30),
        capacity: rows * 5,
        position: { x: index * 20, y: 280, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      });
    });

    return stacks;
  }

  private createStandardStacks(sectionId: string, startNum: number, endNum: number, rows: number, tiers: number): YardStack[] {
    const stacks: YardStack[] = [];

    for (let i = startNum; i <= endNum; i++) {
      stacks.push({
        id: `${sectionId}-stack-${i}`,
        stackNumber: i,
        sectionId,
        rows,
        maxTiers: tiers,
        currentOccupancy: Math.floor(Math.random() * (rows * tiers)),
        capacity: rows * tiers,
        position: { x: (i - startNum) * 15, y: 20, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: false
      });
    }

    return stacks;
  }

  /**
   * Get all available yards
   */
  getAvailableYards(): Yard[] {
    return Array.from(this.yards.values()).filter(yard => yard.isActive);
  }

  /**
   * Get current yard
   */
  getCurrentYard(): Yard | null {
    return this.currentYardId ? this.yards.get(this.currentYardId) || null : null;
  }

  /**
   * Set current yard
   */
  setCurrentYard(yardId: string, userName?: string): boolean {
    const yard = this.yards.get(yardId);
    if (yard && yard.isActive) {
      this.currentYardId = yardId;
      const effectiveUserName = userName || 'System';
      this.logOperation('yard_switch', undefined, effectiveUserName, { previousYard: this.currentYardId, newYard: yardId });
      return true;
    }
    return false;
  }

  /**
   * Get yard by ID
   */
  getYardById(yardId: string): Yard | null {
    // Get yard with updated stacks
    return this.getYardWithStacks(yardId);
  }

  /**
   * Get yard by code
   */
  getYardByCode(yardCode: string): Yard | null {
    return Array.from(this.yards.values()).find(yard => yard.code === yardCode) || null;
  }

  /**
   * Validate yard access for user
   */
  validateYardAccess(yardId: string, userId: string, userYardAssignments: string[]): boolean {
    // Check if user has access to this yard
    return userYardAssignments.includes(yardId) || userYardAssignments.includes('all');
  }

  /**
   * Get yards accessible by user
   */
  getAccessibleYards(userYardAssignments: string[]): Yard[] {
    if (userYardAssignments.includes('all')) {
      return this.getAvailableYards();
    }

    const allYards = Array.from(this.yards.values());

    return allYards.filter(yard =>
      yard.isActive && userYardAssignments.includes(yard.id)
    );
  }

  /**
   * Log yard operation
   */
  logOperation(
    operationType: YardOperationLog['operationType'],
    containerNumber: string | undefined,
    userName: string,
    details: Record<string, any> = {}
  ): void {
    const currentYard = this.getCurrentYard();
    if (!currentYard) {
      console.warn('Cannot log operation: No current yard selected');
      return;
    }

    const log: YardOperationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      yardId: currentYard.id,
      yardCode: currentYard.code,
      operationType,
      containerNumber,
      userId: 'system', // TODO: Replace with actual user ID from auth context
      userName,
      timestamp: new Date(),
      details,
      status: 'success'
    };

    this.operationLogs.push(log);
  }

  /**
   * Get operation logs for a yard
   */
  getYardOperationLogs(yardId: string, limit: number = 100): YardOperationLog[] {
    return this.operationLogs
      .filter(log => log.yardId === yardId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get yard statistics
   */
  getYardStats(yardId: string): YardStats | null {
    const yard = this.yards.get(yardId);
    if (!yard) return null;

    // In a real implementation, these would be calculated from actual data
    return {
      yardId: yard.id,
      yardCode: yard.code,
      totalContainers: yard.currentOccupancy,
      containersIn: Math.floor(yard.currentOccupancy * 0.7),
      containersOut: Math.floor(yard.currentOccupancy * 0.3),
      occupancyRate: (yard.currentOccupancy / yard.totalCapacity) * 100,
      pendingOperations: Math.floor(Math.random() * 10) + 2,
      lastUpdated: new Date()
    };
  }

  /**
   * Create new yard
   */
  createYard(yardData: Omit<Yard, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userName?: string): Yard {
    const effectiveUserName = userName || 'System';
    const yard: Yard = {
      ...yardData,
      id: `yard-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: effectiveUserName,
      updatedBy: effectiveUserName
    };

    this.yards.set(yard.id, yard);
    console.log(`Created new yard ${yard.name} by ${effectiveUserName}`);
    return yard;
  }

  /**
   * Update yard
   */
  updateYard(yardId: string, updates: Partial<Yard>, userName?: string): Yard | null {
    const yard = this.yards.get(yardId);

    if (!yard) return null;

    const effectiveUserName = userName || 'System';
    const updatedYard = {
      ...yard,
      ...updates,
      updatedAt: new Date(),
      updatedBy: effectiveUserName
    };

    this.yards.set(yardId, updatedYard);
    console.log(`Updated yard ${yardId} by ${effectiveUserName}`);
    return updatedYard;
  }

  /**
   * Delete yard
   */
  deleteYard(yardId: string, userName?: string): boolean {
    const yard = this.yards.get(yardId);
    if (!yard) return false;

    const effectiveUserName = userName || 'System';
    
    // Prevent deletion of the current yard
    if (this.currentYardId === yardId) {
      throw new Error('Cannot delete the currently selected yard');
    }

    // Check if yard has containers (in a real implementation)
    if (yard.currentOccupancy > 0) {
      throw new Error('Cannot delete yard with containers. Please move all containers first.');
    }

    this.yards.delete(yardId);
    
    // Log deletion
    this.logOperation('yard_delete', undefined, effectiveUserName, {
      deletedYardId: yardId,
      deletedYardName: yard.name,
      deletedYardCode: yard.code
    });

    console.log(`Deleted yard ${yardId} (${yard.name}) by ${effectiveUserName}`);
    return true;
  }

  /**
  updateYardSections(yardId: string): YardSection[] {
    const yard = this.yards.get(yardId);
    if (!yard) return [];

    // Get current stacks from stack service
    const { stackService } = require('./stackService');
    return stackService.updateYardSections(yardId, yard.sections);
  }

  /**
   * Get yard context for UI
   */
  getYardContext(): YardContext {
    return {
      currentYard: this.getCurrentYard(),
      availableYards: this.getAvailableYards(),
      isLoading: false,
      error: null
    };
  }

  /**
   * Validate container operation in current yard
   */
  validateContainerOperation(containerNumber: string, operation: string): { isValid: boolean; message?: string } {
    const currentYard = this.getCurrentYard();
    if (!currentYard) {
      return { isValid: false, message: 'No yard selected' };
    }

    if (!currentYard.isActive) {
      return { isValid: false, message: 'Current yard is not active' };
    }

    // Add more validation logic as needed
    return { isValid: true };
  }

  /**
   * Get containers for current yard
   */
  getYardContainers(yardId: string, allContainers: Container[]): Container[] {
    // Filter containers that belong to this yard
    // This would typically be done via database query in production
    return allContainers.filter(container => {
      // For now, we'll use location patterns to determine yard association
      // In production, containers would have explicit yardId fields
      return this.isContainerInYard(container, yardId);
    });
  }

  /**
   * Check if container belongs to specific yard
   */
  isContainerInYard(container: Container, yardId: string): boolean {
    const yard = this.yards.get(yardId);
    if (!yard) return false;

    // For Tantarelli yard, check for specific stack patterns
    if (yardId === 'depot-tantarelli') {
      return container.location.includes('Stack S') &&
             /Stack S(1|3|5|7|9|11|13|15|17|19|21|23|25|27|29|31|33|35|37|39|41|43|45|47|49|51|53|55|61|63|65|67|69|71|73|75|77|79|81|83|85|87|89|91|93|95|97|99|101|103)/.test(container.location);
    }

    // For Vridi yard, check for standard stack patterns
    if (yardId === 'depot-vridi') {
      return container.location.includes('Stack') &&
             (/vridi-section-a|vridi-section-b/.test(container.location) ||
              container.location.includes(yard.code) || container.location.includes(yard.name));
    }

    // For San Pedro yard, check for standard stack patterns
    if (yardId === 'depot-san-pedro') {
      return container.location.includes('Stack') &&
             (/sanpedro-section-a|sanpedro-section-b/.test(container.location) ||
              container.location.includes(yard.code) || container.location.includes(yard.name));
    }

    // For other yards, use different patterns or explicit yard references
    return container.location.includes(yard.code) || container.location.includes(yard.name);
  }
}

// Singleton instance
export const yardService = new YardService();
