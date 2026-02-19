import { ClientPool, StackAssignment, ClientPoolStats, ContainerAssignmentRequest, StackAvailabilityResult } from '../types/clientPool';
import { Yard, YardStack, Container } from '../types';
import { yardsService } from './api/yardsService';
import { locationManagementService } from './api/locationManagementService';

/**
 * Client Pool Service
 * Manages customer-specific stack assignments and container placement logic
 */
export class ClientPoolService {
  private clientPools: Map<string, ClientPool> = new Map();
  private stackAssignments: Map<string, StackAssignment[]> = new Map(); // stackId -> assignments
  private clientStackMap: Map<string, string[]> = new Map(); // clientCode -> stackIds

  constructor() {
    this.initializeDefaultPools();
  }

  /**
   * Initialize default client pools with realistic assignments
   */
  private initializeDefaultPools(): void {
    const defaultPools: ClientPool[] = [
      {
        id: 'pool-maeu',
        clientId: '1',
        clientCode: 'MAEU',
        clientName: 'Maersk Line',
        assignedStacks: ['stack-1', 'stack-3', 'stack-5', 'stack-61', 'stack-63'],
        maxCapacity: 150,
        currentOccupancy: 89,
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2025-01-11'),
        createdBy: 'System',
        updatedBy: 'System',
        priority: 'high',
        contractStartDate: new Date('2024-01-01'),
        contractEndDate: new Date('2025-12-31'),
        notes: 'Premium client with dedicated high-capacity stacks'
      },
      {
        id: 'pool-mscu',
        clientId: '2',
        clientCode: 'MSCU',
        clientName: 'MSC Mediterranean Shipping',
        assignedStacks: ['stack-7', 'stack-9', 'stack-11', 'stack-65', 'stack-67'],
        maxCapacity: 140,
        currentOccupancy: 76,
        isActive: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2025-01-10'),
        createdBy: 'System',
        updatedBy: 'System',
        priority: 'high',
        contractStartDate: new Date('2024-02-01'),
        contractEndDate: new Date('2025-12-31'),
        notes: 'High-volume client requiring reefer-capable stacks'
      },
      {
        id: 'pool-cmdu',
        clientId: '3',
        clientCode: 'CMDU',
        clientName: 'CMA CGM',
        assignedStacks: ['stack-13', 'stack-15', 'stack-33', 'stack-35'],
        maxCapacity: 100,
        currentOccupancy: 45,
        isActive: true,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2025-01-08'),
        createdBy: 'System',
        updatedBy: 'System',
        priority: 'medium',
        contractStartDate: new Date('2024-03-01'),
        contractEndDate: new Date('2025-12-31'),
        notes: 'Standard client with mixed container requirements'
      },
      {
        id: 'pool-ship001',
        clientId: '4',
        clientCode: 'SHIP001',
        clientName: 'Shipping Solutions Inc',
        assignedStacks: ['stack-17', 'stack-19', 'stack-37'],
        maxCapacity: 75,
        currentOccupancy: 32,
        isActive: true,
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2025-01-09'),
        createdBy: 'System',
        updatedBy: 'System',
        priority: 'medium',
        contractStartDate: new Date('2024-04-01'),
        contractEndDate: new Date('2025-12-31'),
        notes: 'Growing client with expanding container volume'
      }
    ];

    // Initialize pools and mappings
    defaultPools.forEach(pool => {
      this.clientPools.set(pool.clientCode, pool);
      this.clientStackMap.set(pool.clientCode, pool.assignedStacks);

      // Create stack assignments
      pool.assignedStacks.forEach(stackId => {
        const assignment: StackAssignment = {
          id: `assign-${pool.clientCode}-${stackId}`,
          stackId,
          stackNumber: this.extractStackNumber(stackId),
          clientPoolId: pool.id,
          clientCode: pool.clientCode,
          assignedAt: pool.createdAt,
          assignedBy: 'System',
          isExclusive: true,
          priority: pool.priority === 'high' ? 3 : pool.priority === 'medium' ? 2 : 1,
          notes: `Assigned to ${pool.clientName} under contract`
        };

        if (!this.stackAssignments.has(stackId)) {
          this.stackAssignments.set(stackId, []);
        }
        this.stackAssignments.get(stackId)!.push(assignment);
      });
    });
  }

  /**
   * Extract stack number from stack ID (e.g., 'stack-1' -> 1)
   */
  private extractStackNumber(stackId: string): number {
    const match = stackId.match(/stack-(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get all client pools
   */
  getClientPools(): ClientPool[] {
    return Array.from(this.clientPools.values());
  }

  /**
   * Get client pool by client code
   */
  getClientPool(clientCode: string): ClientPool | null {
    return this.clientPools.get(clientCode) || null;
  }

  /**
   * Get stacks assigned to a specific client
   */
  getClientStacks(clientCode: string): string[] {
    return this.clientStackMap.get(clientCode) || [];
  }

  /**
   * Check if a stack is assigned to a specific client
   */
  isStackAssignedToClient(stackId: string, clientCode: string): boolean {
    const clientStacks = this.getClientStacks(clientCode);
    return clientStacks.includes(stackId);
  }

  /**
   * Get available stacks for a client based on container requirements
   */
  getAvailableStacksForClient(
    clientCode: string,
    containerSize: '20ft' | '40ft',
    yard: Yard,
    containers: Container[],
    yardId?: string
  ): StackAvailabilityResult[] {
    // Use current yard if not specified
    const targetYard = yardId ? yardsService.getYardById(yardId) : yard;
    if (!targetYard) {
      return [];
    }

    const clientStacks = this.getClientStacks(clientCode);
    const availableStacks: StackAvailabilityResult[] = [];

    // Get all stacks from target yard
    const allStacks = targetYard.sections.flatMap(section => section.stacks);

    clientStacks.forEach(stackId => {
      const stack = allStacks.find(s => s.id === stackId);
      if (!stack) return;

      // Calculate current occupancy for this stack in the specific yard
      const stackContainers = containers.filter(c => {
        const isInStack = c.location.includes(`Stack S${stack.stackNumber}`);
        const isInYard = yardsService.isContainerInYard ? yardsService.isContainerInYard(c, targetYard.id) : true;
        return isInStack && isInYard;
      });
      const currentOccupancy = stackContainers.length;
      const availableSlots = stack.capacity - currentOccupancy;

      // Check if stack can accommodate the container size
      const canAccommodateSize = this.canStackAccommodateSize(stack, containerSize);

      if (availableSlots > 0 && canAccommodateSize) {
        const section = targetYard.sections.find(s => s.id === stack.sectionId);

        availableStacks.push({
          stackId: stack.id,
          stackNumber: stack.stackNumber,
          sectionName: section?.name || 'Unknown',
          availableSlots,
          totalCapacity: stack.capacity,
          isRecommended: this.isStackRecommended(stack, containerSize, currentOccupancy),
          distance: this.calculateStackDistance(stack, containerSize)
        });
      }
    });

    // Sort by recommendation, then by available slots, then by distance
    return availableStacks.sort((a, b) => {
      if (a.isRecommended !== b.isRecommended) {
        return a.isRecommended ? -1 : 1;
      }
      if (a.availableSlots !== b.availableSlots) {
        return b.availableSlots - a.availableSlots;
      }
      return (a.distance || 0) - (b.distance || 0);
    });
  }

  /**
   * Get available stacks for a client in a specific yard
   */
  getAvailableStacksForClientInYard(
    clientCode: string,
    containerSize: '20ft' | '40ft',
    yardId: string,
    containers: Container[]
  ): StackAvailabilityResult[] {
    const yard = yardsService.getYardById(yardId);
    if (!yard) {
      return [];
    }

    return this.getAvailableStacksForClient(clientCode, containerSize, yard, containers, yardId);
  }

  /**
   * Get client pools for a specific yard
   */
  getClientPoolsForYard(yardId: string): ClientPool[] {
    // Filter client pools that have stacks in the specified yard
    return Array.from(this.clientPools.values()).filter(pool => {
      // Check if any of the pool's assigned stacks belong to this yard
      return pool.assignedStacks.some(stackId => {
        // In a real implementation, you'd check the stack's yard association
        // For now, we'll use a simple pattern matching
        return this.isStackInYard(stackId, yardId);
      });
    });
  }

  /**
   * Check if a stack belongs to a specific yard
   */
  private isStackInYard(stackId: string, yardId: string): boolean {
    const yard = yardsService.getYardById(yardId);
    if (!yard) return false;

    // Check if stack exists in any section of this yard
    return yard.sections.some(section =>
      section.stacks.some(stack => stack.id === stackId)
    );
  }

  /**
   * Check if a stack can accommodate a specific container size
   */
  private canStackAccommodateSize(stack: YardStack, containerSize: '20ft' | '40ft'): boolean {
    // For 20ft containers, any stack can accommodate
    if (containerSize === '20ft') return true;

    // For 40ft containers, check if stack supports 40ft or is part of a valid pair
    // This logic should match your existing stack configuration rules
    const stackNumber = stack.stackNumber;

    // Special stacks (1, 31, 101, 103) can only handle 20ft
    const specialStacks = [1, 31, 101, 103];
    if (specialStacks.includes(stackNumber)) return false;

    // Check if stack is part of a valid 40ft pair
    return this.isValidFortyFootStack(stackNumber);
  }

  /**
   * Check if a stack number is valid for 40ft containers
   */
  private isValidFortyFootStack(stackNumber: number): boolean {
    // Valid pairs for 40ft: 03+05, 07+09, 11+13, etc.
    const validPairs = [
      [3, 5],
      [7, 9],
      [11, 13],
      [15, 17],
      [19, 21],
      [23, 25],
      [27, 29],
      [33, 35],
      [37, 39],
      [41, 43],
      [45, 47],
      [49, 51],
      [53, 55],
      [61, 63],
      [65, 67],
      [69, 71],
      [73, 75],
      [77, 79],
      [81, 83],
      [85, 87],
      [89, 91],
      [93, 95],
      [97, 99]
    ];

    return validPairs.some(pair => pair.includes(stackNumber));
  }

  /**
   * Determine if a stack is recommended for a container
   */
  private isStackRecommended(stack: YardStack, containerSize: '20ft' | '40ft', currentOccupancy: number): boolean {
    // Recommend stacks that are not too full but not empty (for efficiency)
    const occupancyRate = currentOccupancy / stack.capacity;

    // Prefer stacks with 20-80% occupancy for better space utilization
    if (occupancyRate >= 0.2 && occupancyRate <= 0.8) return true;

    // For 40ft containers, prefer larger stacks
    if (containerSize === '40ft' && stack.capacity >= 25) return true;

    return false;
  }

  /**
   * Calculate distance/priority score for stack selection
   */
  private calculateStackDistance(stack: YardStack, containerSize: '20ft' | '40ft'): number {
    // Simple distance calculation based on stack position
    // Lower numbers = closer/better
    const baseDistance = Math.abs(stack.position.x) + Math.abs(stack.position.y);

    // Prefer stacks closer to gates (lower coordinates)
    return baseDistance / 100;
  }

  /**
   * Assign a container to the best available stack for a client
   */
  async assignContainerToClientStack(
    request: ContainerAssignmentRequest,
    yard: Yard,
    containers: Container[],
    userName?: string
  ): Promise<StackAvailabilityResult | null> {
    try {
      // Validate client has access
      const clientPool = this.getClientPool(request.clientCode);
      if (!clientPool || !clientPool.isActive) {
        throw new Error(`No active client pool found for ${request.clientCode}`);
      }

      // Validate yard context
      const currentYard = yardsService.getCurrentYard();
      if (!currentYard) {
        throw new Error('No yard selected for container assignment');
      }

      // Get available stacks for this client
      const availableStacks = this.getAvailableStacksForClient(
        request.clientCode,
        request.containerSize,
        currentYard,
        containers,
        currentYard.id
      );

      if (availableStacks.length === 0) {
        return null;
      }

      // Select the best stack (first in sorted list)
      const selectedStack = availableStacks[0];

      // Update client pool occupancy
      this.updateClientPoolOccupancy(request.clientCode, 1, userName);

      // Log operation using yardsService
      yardsService.logOperation('container_assign', request.containerNumber, userName || 'System', {
        clientCode: request.clientCode,
        stackId: selectedStack.stackId,
        yardId: currentYard.id,
        yardCode: currentYard.code,
        from: 'unassigned',
        to: selectedStack.stackId,
        userName: userName
      });

      return selectedStack;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update client pool occupancy
   */
  private updateClientPoolOccupancy(clientCode: string, change: number, userName?: string): void {
    const pool = this.clientPools.get(clientCode);
    if (pool) {
      pool.currentOccupancy = Math.max(0, pool.currentOccupancy + change);
      pool.updatedAt = new Date();
      if (userName) {
        pool.updatedBy = userName;
      }
      this.clientPools.set(clientCode, pool);
    }
  }

  /**
   * Assign a stack to a client pool
   * Requirements: 6.2 - Update location access permissions when client pool assignments change
   */
  async assignStackToClient(
    stackId: string,
    stackNumber: number,
    clientCode: string,
    assignedBy: string,
    isExclusive: boolean = true,
    priority: number = 2,
    userName?: string
  ): Promise<StackAssignment> {
    const clientPool = this.getClientPool(clientCode);
    if (!clientPool) {
      throw new Error(`Client pool not found for ${clientCode}`);
    }

    const effectiveUserName = assignedBy || userName || 'System';
    const assignment: StackAssignment = {
      id: `assign-${clientCode}-${stackId}-${Date.now()}`,
      stackId,
      stackNumber,
      clientPoolId: clientPool.id,
      clientCode,
      assignedAt: new Date(),
      assignedBy: effectiveUserName,
      isExclusive,
      priority,
      notes: `Assigned to ${clientPool.clientName}`
    };

    // Add to stack assignments
    if (!this.stackAssignments.has(stackId)) {
      this.stackAssignments.set(stackId, []);
    }
    this.stackAssignments.get(stackId)!.push(assignment);

    // Update client pool
    if (!clientPool.assignedStacks.includes(stackId)) {
      clientPool.assignedStacks.push(stackId);
      clientPool.updatedAt = new Date();
      clientPool.updatedBy = effectiveUserName;
      this.clientPools.set(clientCode, clientPool);
    }

    // Update client stack mapping
    const clientStacks = this.clientStackMap.get(clientCode) || [];
    if (!clientStacks.includes(stackId)) {
      clientStacks.push(stackId);
      this.clientStackMap.set(clientCode, clientStacks);
    }

    // Update location access permissions in the location management system
    // Requirements: 6.2 - Ensure location access permissions are updated when client pool assignments change
    try {
      await this.updateLocationAccessForStack(stackId, clientPool.id);
    } catch (error) {
      // Continue with assignment even if location update fails
    }

    // Log operation
    yardsService.logOperation('stack_assignment', undefined, effectiveUserName, {
      stackId,
      clientCode,
      isExclusive
    });

    return assignment;
  }

  /**
   * Remove stack assignment from client
   * Requirements: 6.2 - Update location access permissions when client pool assignments change
   */
  async removeStackFromClient(stackId: string, clientCode: string, userName?: string): Promise<boolean> {
    const effectiveUserName = userName || 'System';
    try {
      // Remove from stack assignments
      const assignments = this.stackAssignments.get(stackId) || [];
      const filteredAssignments = assignments.filter(a => a.clientCode !== clientCode);
      this.stackAssignments.set(stackId, filteredAssignments);

      // Update client pool
      const clientPool = this.clientPools.get(clientCode);
      if (clientPool) {
        clientPool.assignedStacks = clientPool.assignedStacks.filter(id => id !== stackId);
        clientPool.updatedAt = new Date();
        clientPool.updatedBy = effectiveUserName;
        this.clientPools.set(clientCode, clientPool);
      }

      // Update client stack mapping
      const clientStacks = this.clientStackMap.get(clientCode) || [];
      this.clientStackMap.set(clientCode, clientStacks.filter(id => id !== stackId));

      // Clear location access permissions in the location management system
      // Requirements: 6.2 - Ensure location access permissions are updated when client pool assignments change
      try {
        await this.clearLocationAccessForStack(stackId);
      } catch (error) {
        // Continue with removal even if location update fails
      }

      // Log operation
      yardsService.logOperation('stack_assignment', undefined, effectiveUserName, {
        stackId,
        clientCode,
        action: 'remove'
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stack assignments for a specific stack
   */
  getStackAssignments(stackId: string): StackAssignment[] {
    return this.stackAssignments.get(stackId) || [];
  }

  /**
   * Get all stack assignments for a client
   */
  getClientStackAssignments(clientCode: string): StackAssignment[] {
    const assignments: StackAssignment[] = [];
    this.stackAssignments.forEach((stackAssignments) => {
      stackAssignments.forEach((assignment) => {
        if (assignment.clientCode === clientCode) {
          assignments.push(assignment);
        }
      });
    });
    return assignments;
  }

  /**
   * Validate container assignment request
   */
  validateContainerAssignment(
    request: ContainerAssignmentRequest,
    targetStackId: string
  ): { isValid: boolean; reason?: string } {
    // Check if client has access to the target stack
    if (!this.isStackAssignedToClient(targetStackId, request.clientCode)) {
      return {
        isValid: false,
        reason: `Stack not assigned to client ${request.clientCode}`
      };
    }

    // Check if stack can accommodate container size
    const assignments = this.getStackAssignments(targetStackId);
    if (assignments.length === 0) {
      return {
        isValid: false,
        reason: 'Stack has no valid assignments'
      };
    }

    return { isValid: true };
  }

  /**
   * Get client pool statistics
   */
  getClientPoolStats(): ClientPoolStats {
    const pools = Array.from(this.clientPools.values());
    const totalAssignedStacks = Array.from(this.stackAssignments.keys()).length;

    return {
      totalPools: pools.length,
      activeClients: pools.filter(p => p.isActive).length,
      totalAssignedStacks,
      averageOccupancy: pools.length > 0
        ? pools.reduce((sum, p) => sum + (p.currentOccupancy / p.maxCapacity), 0) / pools.length * 100
        : 0,
      unassignedStacks: 0 // Would need total stack count to calculate
    };
  }

  /**
   * Create a new client pool
   * Requirements: 6.2 - Update location access permissions when creating client pools
   */
  async createClientPool(
    clientId: string,
    clientCode: string,
    clientName: string,
    assignedStacks: string[],
    maxCapacity: number,
    priority: 'high' | 'medium' | 'low',
    contractStartDate: Date,
    contractEndDate?: Date,
    notes?: string,
    userName?: string
  ): Promise<ClientPool> {
    const effectiveUserName = userName || 'System';
    const currentYard = yardsService.getCurrentYard();

    const pool: ClientPool = {
      id: `pool-${clientCode.toLowerCase()}`,
      clientId,
      clientCode,
      clientName,
      assignedStacks,
      maxCapacity,
      currentOccupancy: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: effectiveUserName,
      updatedBy: effectiveUserName,
      priority,
      contractStartDate,
      contractEndDate,
      notes
    };

    this.clientPools.set(clientCode, pool);
    this.clientStackMap.set(clientCode, assignedStacks);

    // Create stack assignments for each assigned stack
    for (const stackId of assignedStacks) {
      const stackNumber = this.extractStackNumber(stackId);
      await this.assignStackToClient(stackId, stackNumber, clientCode, effectiveUserName, true, 2, effectiveUserName);
    }

    // Log creation
    yardsService.logOperation('client_pool_create', undefined, effectiveUserName, {
      clientCode,
      yardId: currentYard?.id,
      yardCode: currentYard?.code,
      maxCapacity,
      assignedStacksCount: assignedStacks.length
    });

    return pool;
  }

  /**
   * Update client pool configuration
   * Requirements: 6.2 - Update location access permissions when client pool configuration changes
   */
  async updateClientPool(clientCode: string, updates: Partial<ClientPool>, userName?: string): Promise<ClientPool | null> {
    const pool = this.clientPools.get(clientCode);
    if (!pool) return null;

    const effectiveUserName = userName || 'System';
    const updatedPool = {
      ...pool,
      ...updates,
      updatedAt: new Date(),
      updatedBy: effectiveUserName
    };

    this.clientPools.set(clientCode, updatedPool);

    // Update stack mapping and location permissions if stacks changed
    // Requirements: 6.2 - Ensure location access permissions are updated when client pool assignments change
    if (updates.assignedStacks) {
      const oldStacks = pool.assignedStacks;
      const newStacks = updates.assignedStacks;
      
      // Find stacks that were removed
      const removedStacks = oldStacks.filter(stackId => !newStacks.includes(stackId));
      
      // Find stacks that were added
      const addedStacks = newStacks.filter(stackId => !oldStacks.includes(stackId));
      
      // Clear location access for removed stacks
      for (const stackId of removedStacks) {
        try {
          await this.clearLocationAccessForStack(stackId);
        } catch (error) {
          // Continue with other stacks
        }
      }
      
      // Update location access for added stacks
      for (const stackId of addedStacks) {
        try {
          await this.updateLocationAccessForStack(stackId, pool.id);
        } catch (error) {
          // Continue with other stacks
        }
      }
      
      this.clientStackMap.set(clientCode, updates.assignedStacks);
    }

    // Log update
    yardsService.logOperation('client_pool_update', undefined, effectiveUserName, {
      clientCode,
      updates: Object.keys(updates)
    });

    return updatedPool;
  }

  /**
   * Get unassigned stacks (stacks not assigned to any client)
   */
  getUnassignedStacks(yard: Yard): YardStack[] {
    const allStacks = yard.sections.flatMap(section => section.stacks);
    const assignedStackIds = new Set(Array.from(this.stackAssignments.keys()));

    return allStacks.filter(stack => !assignedStackIds.has(stack.id));
  }

  /**
   * Find optimal stack for container placement
   */
  findOptimalStackForContainer(
    request: ContainerAssignmentRequest,
    yard: Yard,
    containers: Container[]
  ): StackAvailabilityResult | null {
    const availableStacks = this.getAvailableStacksForClient(
      request.clientCode,
      request.containerSize,
      yard,
      containers
    );
    if (availableStacks.length === 0) return null;

    // Apply additional filtering based on requirements
    let filteredStacks = availableStacks;

    // Filter by preferred section if specified
    if (request.preferredSection) {
      const sectionFiltered = filteredStacks.filter(s =>
        s.sectionName.toLowerCase().includes(request.preferredSection!.toLowerCase())
      );
      if (sectionFiltered.length > 0) {
        filteredStacks = sectionFiltered;
      }
    }

    // Handle special requirements
    if (request.requiresSpecialHandling) {
      // Prefer stacks with lower occupancy for special handling
      filteredStacks = filteredStacks.filter(s => s.availableSlots >= s.totalCapacity * 0.5);
    }

    return filteredStacks[0] || null;
  }

  /**
   * Get client pool utilization report
   */
  getClientPoolUtilization(): Array<{
    clientCode: string;
    clientName: string;
    assignedStacks: number;
    occupancyRate: number;
    availableCapacity: number;
    status: 'optimal' | 'high' | 'critical' | 'underutilized';
  }> {
    return Array.from(this.clientPools.values()).map(pool => {
      const occupancyRate = (pool.currentOccupancy / pool.maxCapacity) * 100;
      const availableCapacity = pool.maxCapacity - pool.currentOccupancy;

      let status: 'optimal' | 'high' | 'critical' | 'underutilized';
      if (occupancyRate >= 90) status = 'critical';
      else if (occupancyRate >= 75) status = 'high';
      else if (occupancyRate >= 25) status = 'optimal';
      else status = 'underutilized';

      return {
        clientCode: pool.clientCode,
        clientName: pool.clientName,
        assignedStacks: pool.assignedStacks.length,
        occupancyRate,
        availableCapacity,
        status
      };
    });
  }

  /**
   * Bulk assign stacks to client
   * Requirements: 6.2 - Update location access permissions for bulk assignments
   */
  async bulkAssignStacksToClient(
    stackIds: string[],
    clientCode: string,
    assignedBy: string,
    userName?: string
  ): Promise<StackAssignment[]> {
    const effectiveUserName = assignedBy || userName || 'System';
    const currentYard = yardsService.getCurrentYard();

    const assignments: StackAssignment[] = [];
    for (const stackId of stackIds) {
      try {
        const stackNumber = this.extractStackNumber(stackId);
        const assignment = await this.assignStackToClient(
          stackId,
          stackNumber,
          clientCode,
          effectiveUserName,
          true,
          2,
          effectiveUserName
        );
        assignments.push(assignment);
      } catch (error) {
        // Continue with other stacks
      }
    }

    // Log bulk assignment
    yardsService.logOperation('stack_bulk_assign', undefined, effectiveUserName, {
      clientCode,
      yardId: currentYard?.id,
      yardCode: currentYard?.code,
      stackCount: assignments.length,
      action: 'bulk'
    });

    return assignments;
  }

  /**
   * Release container from client pool (when container leaves)
   */
  releaseContainerFromPool(containerNumber: string, clientCode: string, userName?: string): void {
    const effectiveUserName = userName || 'System';
    const currentYard = yardsService.getCurrentYard();

    try {
      this.updateClientPoolOccupancy(clientCode, -1, effectiveUserName);
      // Log release
      yardsService.logOperation('container_release', containerNumber, effectiveUserName, {
        clientCode,
        yardId: currentYard?.id,
        yardCode: currentYard?.code,
        action: 'release'
      });
    } catch (error) {
      // Silent fail
    }
  }

  getClientPoolDashboard() {
    const pools = this.getClientPools();
    const stats = this.getClientPoolStats();
    const utilization = this.getClientPoolUtilization();

    return {
      pools,
      stats,
      utilization,
      summary: {
        totalClients: pools.length,
        activeClients: pools.filter(p => p.isActive).length,
        totalCapacity: pools.reduce((sum, p) => sum + p.maxCapacity, 0),
        totalOccupancy: pools.reduce((sum, p) => sum + p.currentOccupancy, 0),
        averageUtilization: stats.averageOccupancy
      }
    };
  }

  // ============================================================================
  // LOCATION MANAGEMENT SYSTEM INTEGRATION
  // Requirements: 6.2, 6.4, 6.5 - Integration with new location management system
  // ============================================================================

  /**
   * Update location access permissions for a stack when assigned to a client pool
   * Requirements: 6.2 - Ensure location access permissions are updated when client pool assignments change
   * Optimized: single bulk DB update instead of N+1 queries
   */
  private async updateLocationAccessForStack(stackId: string, clientPoolId: string): Promise<void> {
    try {
      await locationManagementService.updateClientPoolForStack(stackId, clientPoolId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear location access permissions for a stack when removed from a client pool
   * Requirements: 6.2 - Ensure location access permissions are updated when client pool assignments change
   * Optimized: single bulk DB update instead of N+1 queries
   */
  private async clearLocationAccessForStack(stackId: string): Promise<void> {
    try {
      await locationManagementService.updateClientPoolForStack(stackId, null);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available locations for a client using the location management system
   * Requirements: 6.4 - Handle location access for clients with no pool configuration
   */
  async getAvailableLocationsForClient(
    clientCode: string,
    yardId: string,
    containerSize?: '20ft' | '40ft',
    limit?: number
  ): Promise<any[]> {
    try {
      const clientPool = this.getClientPool(clientCode);
      
      // Requirements: 6.4 - When client has no pool configuration, show all unassigned locations
      const clientPoolId = clientPool?.id || null;
      
      // Use location management service to get available locations with proper access control
      const locations = await locationManagementService.getAvailableLocationsWithPoolAccess(
        yardId,
        clientPoolId,
        containerSize,
        limit
      );
      
      return locations;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a client has access to a specific location
   * Requirements: 6.2, 6.4, 6.5 - Validate client pool access to locations
   */
  async hasLocationAccess(
    clientCode: string,
    locationId: string
  ): Promise<boolean> {
    try {
      const clientPool = this.getClientPool(clientCode);
      
      // Requirements: 6.4 - Clients with no pool can access unassigned locations
      const clientPoolId = clientPool?.id || null;
      
      // Use location management service to validate access
      const hasAccess = await locationManagementService.hasClientPoolAccess(
        locationId,
        clientPoolId
      );
      
      return hasAccess;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get location availability count for a client
   * Requirements: 6.2, 6.4 - Count available locations based on client pool access
   */
  async getAvailableLocationCount(
    clientCode: string,
    yardId: string,
    containerSize?: '20ft' | '40ft'
  ): Promise<number> {
    try {
      const clientPool = this.getClientPool(clientCode);
      
      // Requirements: 6.4 - Handle clients with no pool configuration
      const clientPoolId = clientPool?.id || null;
      
      // Use location management service to count available locations
      const count = await locationManagementService.getAvailableLocationsCountWithPoolAccess(
        yardId,
        clientPoolId,
        containerSize
      );
      
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Sync all existing client pool assignments with location management system
   * This method should be called during initialization or migration to ensure
   * all location access permissions are properly set
   * Requirements: 6.2 - Ensure location access permissions are updated
   */
  async syncClientPoolLocations(): Promise<void> {
    try {
      // Iterate through all client pools
      for (const [clientCode, clientPool] of this.clientPools.entries()) {
        // For each assigned stack, update location permissions
        for (const stackId of clientPool.assignedStacks) {
          try {
            await this.updateLocationAccessForStack(stackId, clientPool.id);
          } catch (error) {
            // Continue with other stacks
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
}

// Singleton instance
export const clientPoolService = new ClientPoolService();
