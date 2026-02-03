import { supabase } from './supabaseClient';
import { Yard, YardContext, YardOperationLog, YardStats } from '../../types/yard';
import { Container } from '../../types';
import { stackService } from './stackService';
import { locationManagementService } from './locationManagementService';
import { StackCapacityCalculator } from '../../utils/stackCapacityCalculator';

/**
 * Yards Service - Gestion principale des yards avec intégration StackService
 * Utilise Supabase pour la persistance et délègue la gestion des stacks à StackService
 * 
 * Requirements Addressed:
 * - 5.5: Yard statistics reflect accurate location-based occupancy data
 */

export class YardsService {
  private yards: Map<string, Yard> = new Map();
  private currentYardId: string | null = null;
  private operationLogs: YardOperationLog[] = [];

  constructor() {
    // Service initialized
  }

  // ===== DATABASE OPERATIONS =====

  async initialize(): Promise<void> {
    try {
      await this.getAll();
    } catch (error) {
      // Silent fail
    }
  }

  async getAll(): Promise<Yard[]> {
    try {
      const { data, error } = await supabase
        .from('yards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching yards:', error);
        throw new Error(`Failed to fetch yards: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('No yards found in database');
        return [];
      }

      // Charger les stacks pour chaque yard et récupérer les noms d'utilisateurs
      const yardsWithStacks = await Promise.all(
        data.map(async (yardData) => {
          const yard = this.mapToYard(yardData);

          // Récupérer les noms des utilisateurs séparément
          if (yard.createdBy && yard.createdBy !== 'Unknown') {
            try {
              const { data: createdUser } = await supabase
                .from('users')
                .select('name')
                .eq('id', yard.createdBy)
                .maybeSingle();
              if (createdUser) {
                yard.createdBy = createdUser.name;
              }
            } catch (error) {
              // Silent fail
            }
          }

          if (yard.updatedBy && yard.updatedBy !== 'Unknown') {
            try {
              const { data: updatedUser } = await supabase
                .from('users')
                .select('name')
                .eq('id', yard.updatedBy)
                .maybeSingle();
              if (updatedUser) {
                yard.updatedBy = updatedUser.name;
              }
            } catch (error) {
              // Silent fail
            }
          }

          await this.loadStacksForYard(yard);
          return yard;
        })
      );

      // Mettre à jour le cache mémoire
      yardsWithStacks.forEach(yard => {
        this.yards.set(yard.id, yard);
      });

      return yardsWithStacks;
    } catch (error) {
      return [];
    }
  }

  async getById(id: string): Promise<Yard | null> {
    try {
      // Vérifier d'abord le cache
      const cachedYard = this.yards.get(id);
      if (cachedYard) {
        return cachedYard;
      }

      const { data, error } = await supabase
        .from('yards')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return null;
      }

      if (!data) return null;

      const yard = this.mapToYard(data);

      // Récupérer les noms des utilisateurs séparément
      if (yard.createdBy && yard.createdBy !== 'Unknown') {
        try {
          const { data: createdUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', yard.createdBy)
            .maybeSingle();
          if (createdUser) {
            yard.createdBy = createdUser.name;
          }
        } catch (error) {
          // Silently handle user fetch failure
        }
      }

      if (yard.updatedBy && yard.updatedBy !== 'Unknown') {
        try {
          const { data: updatedUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', yard.updatedBy)
            .maybeSingle();
          if (updatedUser) {
            yard.updatedBy = updatedUser.name;
          }
        } catch (error) {
          // Silently handle user fetch failure
        }
      }

      await this.loadStacksForYard(yard);

      // Mettre à jour le cache
      this.yards.set(id, yard);

      return yard;
    } catch (error) {
      return null;
    }
  }

  async create(yardData: Partial<Yard>, userId: string): Promise<Yard> {
    try {
      const { data, error } = await supabase
        .from('yards')
        .insert({
          name: yardData.name,
          code: yardData.code,
          location: yardData.location,
          description: yardData.description,
          layout: yardData.layout || 'yirima',
          is_active: yardData.isActive !== false,
          current_occupancy: 0,
          timezone: yardData.timezone || 'Africa/Abidjan',
          contact_info: yardData.contactInfo,
          address: yardData.address,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newYard = this.mapToYard(data);
      
      // Generate default sections
      const defaultSections = this.generateDefaultSections(newYard);
      newYard.sections = defaultSections as any[];

      // Insert sections into database
      try {
        const sectionsToInsert = defaultSections.map(section => ({
          id: section.id,
          yard_id: newYard.id,
          name: section.name,
          position_x: section.position.x,
          position_y: section.position.y,
          position_z: section.position.z,
          width: section.dimensions.width,
          length: section.dimensions.length,
          color: section.color,
          is_active: true
        }));

        const { error: sectionsError } = await supabase
          .from('sections')
          .insert(sectionsToInsert);

        if (sectionsError) {
          // Don't fail yard creation if sections fail
        }
      } catch (sectionError) {
        // Continue with yard creation even if sections fail
      }

      // Mettre à jour le cache
      this.yards.set(newYard.id, newYard);

      this.logOperation('yard_create', undefined, userId, {
        yardId: newYard.id,
        yardName: newYard.name
      });

      return newYard;
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updates: Partial<Yard>, userId: string): Promise<Yard> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.layout !== undefined) updateData.layout = updates.layout;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
      if (updates.contactInfo !== undefined) updateData.contact_info = updates.contactInfo;
      if (updates.address !== undefined) updateData.address = updates.address;

      const { data, error } = await supabase
        .from('yards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedYard = this.mapToYard(data);

      // Recharger les stacks
      await this.loadStacksForYard(updatedYard);

      // Mettre à jour le cache
      this.yards.set(id, updatedYard);

      this.logOperation('yard_update', undefined, userId, {
        yardId: id,
        updates: Object.keys(updates)
      });

      return updatedYard;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<boolean> {
    try {
      const yard = await this.getById(id);
      if (!yard) {
        throw new Error('Yard not found');
      }

      // Vérifier s'il y a des conteneurs
      if (yard.currentOccupancy > 0) {
        throw new Error('Cannot delete yard with containers. Please move all containers first.');
      }

      // Empêcher la suppression du yard courant
      if (this.currentYardId === id) {
        throw new Error('Cannot delete the currently selected yard');
      }

      const { error } = await supabase
        .from('yards')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Supprimer du cache
      this.yards.delete(id);

      this.logOperation('yard_delete', undefined, userId, {
        yardId: id,
        yardName: yard.name
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  // ===== STACK MANAGEMENT =====

  /**
   * Load stacks for a yard and calculate occupancy using location-based data
   * Requirements: 5.5 - Use location-based occupancy data for accurate statistics
   */
  private async loadStacksForYard(yard: Yard): Promise<void> {
    try {
      // Load sections from database
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('yard_id', yard.id)
        .eq('is_active', true);

      if (sectionsError) {
        // Fallback to generated sections
        yard.sections = this.generateDefaultSections(yard) as any[];
      } else if (sectionsData && sectionsData.length > 0) {
        // Map database sections to yard sections
        yard.sections = sectionsData.map(section => ({
          id: section.id,
          name: section.name,
          yardId: section.yard_id,
          stacks: [],
          position: {
            x: parseFloat(section.position_x) || 0,
            y: parseFloat(section.position_y) || 0,
            z: parseFloat(section.position_z) || 0
          },
          dimensions: {
            width: parseFloat(section.width) || 300,
            length: parseFloat(section.length) || 200
          },
          color: section.color || '#3b82f6'
        }));
      } else {
        // No sections in database, generate defaults
        yard.sections = this.generateDefaultSections(yard) as any[];
      }

      // Skip occupancy sync during initial load for better performance
      const stacks = await stackService.getByYardId(yard.id, true);

      // Grouper les stacks par section
      const stacksBySection = new Map<string, any[]>();

      stacks.forEach(stack => {
        const sectionId = stack.sectionId || 'default-section';
        if (!stacksBySection.has(sectionId)) {
          stacksBySection.set(sectionId, []);
        }
        stacksBySection.get(sectionId)!.push(stack);
      });

      // Mettre à jour les sections du yard avec leurs stacks
      yard.sections.forEach(section => {
        const sectionStacks = stacksBySection.get(section.id) || [];
        section.stacks = sectionStacks;
      });

      // Use location-based occupancy data for accurate statistics
      // Requirements: 5.5 - Yard statistics reflect accurate location-based occupancy data
      try {
        const availabilitySummary = await locationManagementService.getAvailabilitySummary(yard.id);
        yard.totalCapacity = availabilitySummary.totalLocations;
        yard.currentOccupancy = availabilitySummary.occupiedLocations;
      } catch (locationError) {
        // Fallback to stack-based calculation
        // Use effective capacity calculation that handles 40ft pairing logic
        yard.totalCapacity = StackCapacityCalculator.calculateTotalEffectiveCapacity(stacks);
        yard.currentOccupancy = stacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0);
      }

    } catch (error) {
      // Silently handle stack loading errors
    }
  }


  // ===== STATE MANAGEMENT =====

  getAvailableYards(): Yard[] {
    return Array.from(this.yards.values()).filter(yard => yard.isActive);
  }

  getCurrentYard(): Yard | null {
    return this.currentYardId ? this.yards.get(this.currentYardId) || null : null;
  }

  setCurrentYard(yardId: string, userName?: string): boolean {
    const yard = this.yards.get(yardId);
    if (yard && yard.isActive) {
      const previousYardId = this.currentYardId;
      this.currentYardId = yardId;

      const effectiveUserName = userName || 'System';
      this.logOperation('yard_switch', undefined, effectiveUserName, {
        previousYard: previousYardId,
        newYard: yardId
      });

      return true;
    }
    return false;
  }

  getYardById(yardId: string): Yard | null {
    return this.yards.get(yardId) || null;
  }

  getYardByCode(yardCode: string): Yard | null {
    return Array.from(this.yards.values()).find(yard => yard.code === yardCode) || null;
  }

  validateYardAccess(yardId: string, userId: string, userYardAssignments: string[]): boolean {
    return userYardAssignments.includes(yardId) || userYardAssignments.includes('all');
  }

  getAccessibleYards(userYardAssignments: string[]): Yard[] {
    if (userYardAssignments.includes('all')) {
      return this.getAvailableYards();
    }

    return this.getAvailableYards().filter(yard =>
      userYardAssignments.includes(yard.id)
    );
  }

  // ===== OPERATION LOGGING =====

  logOperation(
    operationType: YardOperationLog['operationType'],
    containerNumber: string | undefined,
    userName: string,
    details: Record<string, any> = {}
  ): void {
    const currentYard = this.getCurrentYard();
    if (!currentYard) {
      return;
    }

    const log: YardOperationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      yardId: currentYard.id,
      yardCode: currentYard.code,
      operationType,
      containerNumber,
      userId: 'system', // À remplacer par l'ID utilisateur réel
      userName,
      timestamp: new Date(),
      details,
      status: 'success'
    };

    this.operationLogs.push(log);
  }

  getYardOperationLogs(yardId: string, limit: number = 100): YardOperationLog[] {
    return this.operationLogs
      .filter(log => log.yardId === yardId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // ===== STATISTICS & REPORTING =====

  /**
   * Get yard statistics using location-based occupancy data
   * Requirements: 5.5 - Yard statistics reflect accurate location-based occupancy data
   */
  async getYardStats(yardId: string): Promise<YardStats | null> {
    const yard = await this.getById(yardId);
    if (!yard) return null;

    try {
      // Use LocationManagementService for accurate occupancy calculations
      // Requirements: 5.5 - Integrate with location management for occupancy data
      const availabilitySummary = await locationManagementService.getAvailabilitySummary(yardId);
      
      const occupancyRate = availabilitySummary.occupancyRate;
      const totalContainers = availabilitySummary.occupiedLocations;

      return {
        yardId: yard.id,
        yardCode: yard.code,
        totalContainers,
        containersIn: Math.floor(totalContainers * 0.7),
        containersOut: Math.floor(totalContainers * 0.3),
        occupancyRate,
        pendingOperations: Math.floor(Math.random() * 10) + 2,
        lastUpdated: new Date()
      };
    } catch (error) {
      // Fallback to stack-based calculation if location service fails
      const stacks = await stackService.getByYardId(yardId);
      // Use effective capacity calculation that handles 40ft pairing logic
      const totalCapacity = StackCapacityCalculator.calculateTotalEffectiveCapacity(stacks);
      const currentOccupancy = stacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0);
      const occupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;

      return {
        yardId: yard.id,
        yardCode: yard.code,
        totalContainers: currentOccupancy,
        containersIn: Math.floor(currentOccupancy * 0.7),
        containersOut: Math.floor(currentOccupancy * 0.3),
        occupancyRate,
        pendingOperations: Math.floor(Math.random() * 10) + 2,
        lastUpdated: new Date()
      };
    }
  }

  getYardContext(): YardContext {
    return {
      currentYard: this.getCurrentYard(),
      availableYards: this.getAvailableYards(),
      isLoading: false,
      error: null
    };
  }

  // ===== CONTAINER MANAGEMENT =====

  validateContainerOperation(containerNumber: string, operation: string): { isValid: boolean; message?: string } {
    const currentYard = this.getCurrentYard();
    if (!currentYard) {
      return { isValid: false, message: 'No yard selected' };
    }

    if (!currentYard.isActive) {
      return { isValid: false, message: 'Current yard is not active' };
    }

    return { isValid: true };
  }

  getYardContainers(yardId: string, allContainers: Container[]): Container[] {
    return allContainers.filter(container =>
      this.isContainerInYard(container, yardId)
    );
  }

  isContainerInYard(container: Container, yardId: string): boolean {
    const yard = this.yards.get(yardId);
    if (!yard) return false;

    // Utiliser la logique de localisation existante
    if (yard.code === 'DEPOT-01' || yard.name.toLowerCase().includes('tantarelli')) {
      return /S(1|3|5|7|9|11|13|15|17|19|21|23|25|27|29|31|33|35|37|39|41|43|45|47|49|51|53|55|61|63|65|67|69|71|73|75|77|79|81|83|85|87|89|91|93|95|97|99|101|103)-R\d+-H\d+/.test(container.location);
    }

    return /S\d+-R\d+-H\d+/.test(container.location) &&
            (container.location.includes(yard.code) || container.location.includes(yard.name));
  }

  // ===== UTILITY METHODS =====

  /**
   * Get the appropriate section ID for a stack number based on yard layout
   * For Tantarelli: Zone A (1-31), Zone B (33-55), Zone C (61-103)
   * For Yirima: Zone A (1-33), Zone B (34-66), Zone C (67-100)
   */
  getSectionIdForStackNumber(yardId: string, stackNumber: number): string | null {
    const yard = this.yards.get(yardId);
    if (!yard) return null;

    if (yard.layout === 'tantarelli') {
      if (stackNumber >= 1 && stackNumber <= 31) return 'zone-a';
      if (stackNumber >= 33 && stackNumber <= 55) return 'zone-b';
      if (stackNumber >= 61 && stackNumber <= 103) return 'zone-c';
    } else {
      // Yirima layout
      if (stackNumber >= 1 && stackNumber <= 31) return 'zone-a';
      if (stackNumber >= 33 && stackNumber <= 55) return 'zone-b';
      if (stackNumber >= 61 && stackNumber <= 103) return 'zone-c';
    }
    return null;
  }

  getNextStackNumber(yardId: string, sectionId: string): number {
    const yard = this.yards.get(yardId);
    if (!yard) {
      return 1;
    }

    const section = yard.sections.find(s => s.id === sectionId);
    if (!section) {
      return 1;
    }

    const existingStacks = section.stacks || [];

    if (yard.layout === 'tantarelli') {
      // Tantarelli layout uses only odd numbers
      const existingOddNumbers = existingStacks
        .map(stack => stack.stackNumber)
        .filter(num => num % 2 === 1)
        .sort((a, b) => a - b);

      // Find the next available odd number
      for (let i = 1; i <= 103; i += 2) {
        if (!existingOddNumbers.includes(i)) {
          return i;
        }
      }
    } else {
      // Yirima layout uses sequential numbers
      const existingNumbers = existingStacks
        .map(stack => stack.stackNumber)
        .sort((a, b) => a - b);

      // Find the next available number
      for (let i = 1; i <= 100; i++) {
        if (!existingNumbers.includes(i)) {
          return i;
        }
      }
    }

    const maxNumber = Math.max(...existingStacks.map(s => s.stackNumber));
    return maxNumber + 1;
  }

  private generateDefaultSections(yard: Yard): any[] {
    switch (yard.layout) {
      case 'tantarelli':
        return [
          {
            id: 'zone-a',
            name: 'Zone A',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 0, z: 0 },
            dimensions: { width: 400, length: 120 },
            color: '#3b82f6'
          },
          {
            id: 'zone-b',
            name: 'Zone B',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 140, z: 0 },
            dimensions: { width: 400, length: 100 },
            color: '#f59e0b'
          },
          {
            id: 'zone-c',
            name: 'Zone C',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 260, z: 0 },
            dimensions: { width: 400, length: 140 },
            color: '#10b981'
          }
        ];

      case 'yirima':
      default:
        return [
          {
            id: 'zone-a',
            name: 'Zone A',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 0, z: 0 },
            dimensions: { width: 300, length: 200 },
            color: '#3b82f6'
          },
          {
            id: 'zone-b',
            name: 'Zone B',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 200, z: 0 },
            dimensions: { width: 300, length: 200 },
            color: '#f59e0b'
          },
          {
            id: 'zone-c',
            name: 'Zone C',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 400, z: 0 },
            dimensions: { width: 300, length: 200 },
            color: '#10b981'
          }
        ];
    }
  }

  private mapToYard(data: any): Yard {
    const yard: Yard = {
      id: data.id,
      name: data.name,
      code: data.code,
      location: data.location,
      description: data.description || '',
      layout: data.layout || 'yirima',
      isActive: data.is_active !== false,
      totalCapacity: 0, // Will be calculated from stacks
      currentOccupancy: 0, // Will be calculated from stacks
      sections: [], // Will be set to default sections
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by || 'Unknown',
      updatedBy: data.updated_by || 'Unknown',
      timezone: data.timezone || 'Africa/Abidjan',
      contactInfo: data.contact_info || {
        manager: 'Unknown',
        phone: 'N/A',
        email: 'N/A'
      },
      address: data.address || {
        street: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        zipCode: 'Unknown',
        country: 'Unknown'
      }
    };
    yard.sections = this.generateDefaultSections(yard);
    return yard;
  }

  async refreshYardData(yardId: string): Promise<void> {
    const yard = await this.getById(yardId);
    if (yard) {
      await this.loadStacksForYard(yard);
      this.yards.set(yardId, yard);
    }
  }

  clearCache(): void {
    this.yards.clear();
    this.currentYardId = null;
  }
}

export const yardsService = new YardsService();
