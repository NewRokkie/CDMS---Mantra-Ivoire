import { supabase } from './supabaseClient';
import { Yard, YardContext, YardOperationLog, YardStats } from '../../types/yard';
import { Container } from '../../types';
import { stackService } from './stackService';

/**
 * Yards Service - Gestion principale des yards avec intégration StackService
 * Utilise Supabase pour la persistance et délègue la gestion des stacks à StackService
 */

export class YardsService {
  private yards: Map<string, Yard> = new Map();
  private currentYardId: string | null = null;
  private operationLogs: YardOperationLog[] = [];

  constructor() {
    console.log('Yards Service initialized - using Supabase for persistence');
  }

  // ===== DATABASE OPERATIONS =====

  async initialize(): Promise<void> {
    try {
      await this.getAll();
      console.log('Yards Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Yards Service:', error);
    }
  }

  async getAll(): Promise<Yard[]> {
    try {
      console.log('YardsService: Fetching all yards from Supabase');
      const { data, error } = await supabase
        .from('yards')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('YardsService: Supabase query result:', { data, error });

      if (error) {
        console.error('Error fetching yards:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.warn('No yards found in database');
        return [];
      }

      // Charger les stacks pour chaque yard
      const yardsWithStacks = await Promise.all(
        data.map(async (yardData) => {
          const yard = this.mapToYard(yardData);
          await this.loadStacksForYard(yard);
          return yard;
        })
      );

      // Mettre à jour le cache mémoire
      yardsWithStacks.forEach(yard => {
        this.yards.set(yard.id, yard);
      });

      console.log('YardsService: Successfully loaded and processed yards:', yardsWithStacks.length);
      return yardsWithStacks;
    } catch (error) {
      console.error('Error in getAll:', error);
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
        console.error('Error fetching yard:', error);
        return null;
      }

      if (!data) return null;

      const yard = this.mapToYard(data);
      await this.loadStacksForYard(yard);

      // Mettre à jour le cache
      this.yards.set(id, yard);

      return yard;
    } catch (error) {
      console.error('Error in getById:', error);
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
        console.error('Error creating yard:', error);
        throw error;
      }

      const newYard = this.mapToYard(data);
      newYard.sections = this.generateDefaultSections(newYard) as any[];

      // Mettre à jour le cache
      this.yards.set(newYard.id, newYard);

      this.logOperation('yard_create', undefined, userId, {
        yardId: newYard.id,
        yardName: newYard.name
      });

      return newYard;
    } catch (error) {
      console.error('Error in create:', error);
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
        console.error('Error updating yard:', error);
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
      console.error('Error in update:', error);
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
        console.error('Error deleting yard:', error);
        throw error;
      }

      // Supprimer du cache
      this.yards.delete(id);

      this.logOperation('yard_delete', undefined, userId, {
        yardId: id,
        yardName: yard.name
      });

      console.log(`Deleted yard ${id} (${yard.name}) by ${userId}`);
      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  // ===== STACK MANAGEMENT =====

  private async loadStacksForYard(yard: Yard): Promise<void> {
    try {
      const stacks = await stackService.getByYardId(yard.id);

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

      // Recalculer la capacité totale et l'occupation
      yard.totalCapacity = stacks.reduce((sum, stack) => sum + stack.capacity, 0);
      yard.currentOccupancy = stacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0);

    } catch (error) {
      console.error(`Error loading stacks for yard ${yard.id}:`, error);
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
      console.warn('Cannot log operation: No current yard selected');
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

  async getYardStats(yardId: string): Promise<YardStats | null> {
    const yard = await this.getById(yardId);
    if (!yard) return null;

    // Calculer les statistiques basées sur les stacks réels
    const stacks = await stackService.getByYardId(yardId);
    const totalCapacity = stacks.reduce((sum, stack) => sum + stack.capacity, 0);
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

  getNextStackNumber(yardId: string, sectionId: string): number {
    console.log('YardsService: Getting next stack number for yard', yardId, 'section', sectionId);
    const yard = this.yards.get(yardId);
    if (!yard) {
      console.warn('YardsService: Yard not found', yardId);
      return 1;
    }

    const section = yard.sections.find(s => s.id === sectionId);
    if (!section) {
      console.warn('YardsService: Section not found', sectionId);
      return 1;
    }

    const existingStacks = section.stacks || [];
    console.log('YardsService: Existing stacks in section', existingStacks.length);

    if (yard.layout === 'tantarelli') {
      // Tantarelli layout uses only odd numbers
      const existingOddNumbers = existingStacks
        .map(stack => stack.stackNumber)
        .filter(num => num % 2 === 1)
        .sort((a, b) => a - b);

      console.log('YardsService: Existing odd stack numbers', existingOddNumbers);

      // Find the next available odd number
      for (let i = 1; i <= 103; i += 2) {
        if (!existingOddNumbers.includes(i)) {
          console.log('YardsService: Next available odd number', i);
          return i;
        }
      }
    } else {
      // Yirima layout uses sequential numbers
      const existingNumbers = existingStacks
        .map(stack => stack.stackNumber)
        .sort((a, b) => a - b);

      console.log('YardsService: Existing stack numbers', existingNumbers);

      // Find the next available number
      for (let i = 1; i <= 100; i++) {
        if (!existingNumbers.includes(i)) {
          console.log('YardsService: Next available number', i);
          return i;
        }
      }
    }

    console.log('YardsService: No available numbers found, returning max + 1');
    const maxNumber = Math.max(...existingStacks.map(s => s.stackNumber));
    return maxNumber + 1;
  }

  private generateDefaultSections(yard: Yard): any[] {
    switch (yard.layout) {
      case 'tantarelli':
        return [
          {
            id: 'section-top',
            name: 'Zone A',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 0, z: 0 },
            dimensions: { width: 400, length: 120 },
            color: '#3b82f6'
          },
          {
            id: 'section-center',
            name: 'Zone B',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 140, z: 0 },
            dimensions: { width: 400, length: 100 },
            color: '#f59e0b'
          },
          {
            id: 'section-bottom',
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
            id: 'section-a',
            name: 'Zone A',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 0, z: 0 },
            dimensions: { width: 300, length: 200 },
            color: '#3b82f6'
          },
          {
            id: 'section-b',
            name: 'Zone B',
            yardId: yard.id,
            stacks: [],
            position: { x: 0, y: 200, z: 0 },
            dimensions: { width: 300, length: 200 },
            color: '#f59e0b'
          },
          {
            id: 'section-c',
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
      createdBy: data.created_by,
      updatedBy: data.updated_by,
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
