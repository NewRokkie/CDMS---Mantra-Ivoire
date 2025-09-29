/**
 * Stack Service - Dynamic stack management for all yards
 * Handles CRUD operations for yard stacks with validation
 */

import { Stack, StackFormData, StackValidation } from '../types/stack';
import { Yard, YardSection, YardStack } from '../types/yard';
import { dbService } from './database/DatabaseService';

export interface DatabaseStack {
  id: string;
  stack_number: number;
  yard_id: string;
  section_id: string;
  rows: number;
  max_tiers: number;
  capacity: number;
  current_occupancy: number;
  position_x: number;
  position_y: number;
  position_z: number;
  width: number;
  length: number;
  container_size: '20ft' | '40ft' | 'both';
  is_special_stack: boolean;
  is_active: boolean;
  assigned_client_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export class StackService {

  /**
   * Get all stacks for a yard
   */
  async getStacksForYard(yardId: string): Promise<Stack[]> {
    try {
      const dbStacks = await dbService.select<DatabaseStack>(
        'yard_stacks',
        '*',
        { yard_id: yardId, is_active: true },
        'stack_number ASC'
      );

      return dbStacks.map(stack => this.mapDatabaseStackToStack(stack));
    } catch (error) {
      console.error('Failed to get stacks for yard:', error);
      return [];
    }
  }

  /**
   * Get stacks for a specific section
   */
  async getStacksForSection(sectionId: string): Promise<Stack[]> {
    try {
      const dbStacks = await dbService.select<DatabaseStack>(
        'yard_stacks',
        '*',
        { section_id: sectionId, is_active: true },
        'stack_number ASC'
      );

      return dbStacks.map(stack => this.mapDatabaseStackToStack(stack));
    } catch (error) {
      console.error('Failed to get stacks for section:', error);
      return [];
    }
  }

  /**
   * Get stack by ID
   */
  async getStackById(stackId: string): Promise<Stack | null> {
    try {
      const dbStack = await dbService.selectOne<DatabaseStack>(
        'yard_stacks',
        '*',
        { id: stackId }
      );

      return dbStack ? this.mapDatabaseStackToStack(dbStack) : null;
    } catch (error) {
      console.error('Failed to get stack by ID:', error);
      return null;
    }
  }

  /**
   * Create new stack
   */
  async createStack(yardId: string, stackData: StackFormData, createdBy: string): Promise<Stack | null> {
    try {
      // Validate stack data
      const validation = await this.validateStackData(yardId, stackData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Calculate capacity
      const capacity = stackData.rows * stackData.maxTiers;

      const newStack = await dbService.insert<DatabaseStack>('yard_stacks', {
        stack_number: stackData.stackNumber,
        yard_id: yardId,
        section_id: stackData.sectionId,
        rows: stackData.rows,
        max_tiers: stackData.maxTiers,
        capacity,
        current_occupancy: 0,
        position_x: stackData.positionX,
        position_y: stackData.positionY,
        position_z: stackData.positionZ,
        width: stackData.width,
        length: stackData.length,
        container_size: stackData.containerSize,
        is_special_stack: stackData.isSpecialStack,
        is_active: true,
        assigned_client_code: stackData.assignedClientCode,
        notes: stackData.notes,
        created_by: createdBy,
      });

      if (newStack) {
        console.log(`✅ Created stack ${newStack.stack_number} in yard ${yardId}`);
        return this.mapDatabaseStackToStack(newStack);
      }

      return null;
    } catch (error) {
      console.error('Failed to create stack:', error);
      throw error;
    }
  }

  /**
   * Update stack
   */
  async updateStack(stackId: string, updates: Partial<StackFormData>, updatedBy: string): Promise<Stack | null> {
    try {
      const updateData: Partial<DatabaseStack> = {};

      if (updates.stackNumber !== undefined) updateData.stack_number = updates.stackNumber;
      if (updates.sectionId) updateData.section_id = updates.sectionId;
      if (updates.rows !== undefined) updateData.rows = updates.rows;
      if (updates.maxTiers !== undefined) updateData.max_tiers = updates.maxTiers;
      if (updates.positionX !== undefined) updateData.position_x = updates.positionX;
      if (updates.positionY !== undefined) updateData.position_y = updates.positionY;
      if (updates.positionZ !== undefined) updateData.position_z = updates.positionZ;
      if (updates.width !== undefined) updateData.width = updates.width;
      if (updates.length !== undefined) updateData.length = updates.length;
      if (updates.containerSize) updateData.container_size = updates.containerSize;
      if (updates.isSpecialStack !== undefined) updateData.is_special_stack = updates.isSpecialStack;
      if (updates.assignedClientCode !== undefined) updateData.assigned_client_code = updates.assignedClientCode;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      // Recalculate capacity if rows or tiers changed
      if (updates.rows !== undefined || updates.maxTiers !== undefined) {
        const currentStack = await this.getStackById(stackId);
        if (currentStack) {
          const newRows = updates.rows !== undefined ? updates.rows : currentStack.rows;
          const newTiers = updates.maxTiers !== undefined ? updates.maxTiers : currentStack.maxTiers;
          updateData.capacity = newRows * newTiers;
        }
      }

      updateData.updated_by = updatedBy;

      await dbService.update('yard_stacks', updateData, { id: stackId });

      console.log(`✅ Updated stack ${stackId}`);
      return this.getStackById(stackId);
    } catch (error) {
      console.error('Failed to update stack:', error);
      throw error;
    }
  }

  /**
   * Delete stack (soft delete)
   */
  async deleteStack(stackId: string, deletedBy: string): Promise<boolean> {
    try {
      const stack = await this.getStackById(stackId);
      if (!stack) {
        throw new Error('Stack not found');
      }

      // Check if stack has containers
      if (stack.currentOccupancy > 0) {
        throw new Error('Cannot delete stack with containers. Please move all containers first.');
      }

      // Soft delete
      await dbService.update('yard_stacks', {
        is_active: false,
        updated_by: deletedBy,
      }, { id: stackId });

      console.log(`✅ Deleted stack ${stack.stackNumber} (${stackId})`);
      return true;
    } catch (error) {
      console.error('Failed to delete stack:', error);
      throw error;
    }
  }

  /**
   * Validate stack data before creation/update
   */
  async validateStackData(yardId: string, stackData: StackFormData, excludeStackId?: string): Promise<StackValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if stack number already exists in yard
      const existingStacks = await dbService.select<DatabaseStack>(
        'yard_stacks',
        'id, stack_number',
        { yard_id: yardId, stack_number: stackData.stackNumber, is_active: true }
      );

      const duplicateStack = existingStacks.find(s => s.id !== excludeStackId);
      if (duplicateStack) {
        errors.push(`Stack number ${stackData.stackNumber} already exists in this yard`);
      }

      // Validate stack number
      if (stackData.stackNumber <= 0) {
        errors.push('Stack number must be greater than 0');
      }

      // Validate dimensions
      if (stackData.rows <= 0 || stackData.rows > 10) {
        errors.push('Rows must be between 1 and 10');
      }

      if (stackData.maxTiers <= 0 || stackData.maxTiers > 8) {
        errors.push('Max tiers must be between 1 and 8');
      }

      if (stackData.width <= 0 || stackData.length <= 0) {
        errors.push('Width and length must be greater than 0');
      }

      // Validate section exists
      const sectionExists = await dbService.exists('yard_sections', {
        id: stackData.sectionId,
        yard_id: yardId,
        is_active: true
      });

      if (!sectionExists) {
        errors.push('Selected section does not exist or is inactive');
      }

      // Check for position conflicts
      const conflictingStacks = await dbService.query<DatabaseStack>(`
        SELECT id, stack_number FROM yard_stacks
        WHERE yard_id = $1 
        AND is_active = true
        AND id != $2
        AND (
          (position_x BETWEEN $3 AND $4 AND position_y BETWEEN $5 AND $6) OR
          (position_x + width BETWEEN $3 AND $4 AND position_y + length BETWEEN $5 AND $6)
        )
      `, [
        yardId,
        excludeStackId || '',
        stackData.positionX,
        stackData.positionX + stackData.width,
        stackData.positionY,
        stackData.positionY + stackData.length
      ]);

      if (conflictingStacks.rows.length > 0) {
        const conflictNumbers = conflictingStacks.rows.map(s => s.stack_number).join(', ');
        errors.push(`Position conflicts with existing stacks: ${conflictNumbers}`);
      }

      // Warnings for best practices
      if (stackData.rows > 6) {
        warnings.push('High row count may impact accessibility');
      }

      if (stackData.maxTiers > 5) {
        warnings.push('High tier count may impact safety and accessibility');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Failed to validate stack data:', error);
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: [],
      };
    }
  }

  /**
   * Get next available stack number for yard
   */
  async getNextStackNumber(yardId: string): Promise<number> {
    try {
      const result = await dbService.queryOne(`
        SELECT COALESCE(MAX(stack_number), 0) + 1 as next_number
        FROM yard_stacks
        WHERE yard_id = $1 AND is_active = true
      `, [yardId]);

      return result?.next_number || 1;
    } catch (error) {
      console.error('Failed to get next stack number:', error);
      return 1;
    }
  }

  /**
   * Get optimal position for new stack
   */
  async getOptimalPosition(yardId: string, sectionId: string): Promise<{ x: number; y: number; z: number }> {
    try {
      // Get existing stacks in section to find optimal position
      const existingStacks = await dbService.select<DatabaseStack>(
        'yard_stacks',
        'position_x, position_y, position_z, width, length',
        { yard_id: yardId, section_id: sectionId, is_active: true },
        'position_x ASC, position_y ASC'
      );

      if (existingStacks.length === 0) {
        // First stack in section - start at origin with padding
        return { x: 50, y: 50, z: 0 };
      }

      // Find next available position
      const lastStack = existingStacks[existingStacks.length - 1];
      return {
        x: lastStack.position_x + lastStack.width + 20, // 20 unit spacing
        y: lastStack.position_y,
        z: 0
      };
    } catch (error) {
      console.error('Failed to get optimal position:', error);
      return { x: 50, y: 50, z: 0 };
    }
  }

  /**
   * Bulk create stacks for a section
   */
  async bulkCreateStacks(
    yardId: string,
    sectionId: string,
    stackConfigs: Array<{
      stackNumber: number;
      rows: number;
      maxTiers: number;
      position: { x: number; y: number; z: number };
      dimensions: { width: number; length: number };
      containerSize: '20ft' | '40ft' | 'both';
      isSpecialStack?: boolean;
    }>,
    createdBy: string
  ): Promise<Stack[]> {
    try {
      const createdStacks: Stack[] = [];

      for (const config of stackConfigs) {
        const stackData: StackFormData = {
          stackNumber: config.stackNumber,
          sectionId,
          rows: config.rows,
          maxTiers: config.maxTiers,
          positionX: config.position.x,
          positionY: config.position.y,
          positionZ: config.position.z,
          width: config.dimensions.width,
          length: config.dimensions.length,
          containerSize: config.containerSize,
          isSpecialStack: config.isSpecialStack || false,
          notes: `Auto-generated stack for ${sectionId}`,
        };

        try {
          const newStack = await this.createStack(yardId, stackData, createdBy);
          if (newStack) {
            createdStacks.push(newStack);
          }
        } catch (error) {
          console.warn(`Failed to create stack ${config.stackNumber}:`, error);
        }
      }

      console.log(`✅ Bulk created ${createdStacks.length} stacks for section ${sectionId}`);
      return createdStacks;
    } catch (error) {
      console.error('Failed to bulk create stacks:', error);
      return [];
    }
  }

  /**
   * Generate default Tantarelli layout
   */
  async generateTantarelliLayout(yardId: string, createdBy: string): Promise<boolean> {
    try {
      // Get yard sections
      const sections = await dbService.select<any>(
        'yard_sections',
        '*',
        { yard_id: yardId, is_active: true }
      );

      if (sections.length === 0) {
        throw new Error('No sections found in yard. Please create sections first.');
      }

      // Define Tantarelli stack configurations
      const stackConfigs = [
        // Top Section (S1 to S31)
        { stackNumber: 1, rows: 4, maxTiers: 5, x: 50, y: 50, width: 80, length: 60, isSpecial: true },
        { stackNumber: 3, rows: 5, maxTiers: 5, x: 150, y: 50, width: 100, length: 60 },
        { stackNumber: 5, rows: 5, maxTiers: 5, x: 270, y: 50, width: 100, length: 60 },
        { stackNumber: 7, rows: 5, maxTiers: 5, x: 390, y: 50, width: 100, length: 60 },
        { stackNumber: 9, rows: 5, maxTiers: 5, x: 510, y: 50, width: 100, length: 60 },
        { stackNumber: 11, rows: 5, maxTiers: 5, x: 630, y: 50, width: 100, length: 60 },
        { stackNumber: 13, rows: 5, maxTiers: 5, x: 750, y: 50, width: 100, length: 60 },
        { stackNumber: 15, rows: 5, maxTiers: 5, x: 870, y: 50, width: 100, length: 60 },
        { stackNumber: 17, rows: 5, maxTiers: 5, x: 990, y: 50, width: 100, length: 60 },
        { stackNumber: 19, rows: 5, maxTiers: 5, x: 1110, y: 50, width: 100, length: 60 },
        { stackNumber: 21, rows: 5, maxTiers: 5, x: 1230, y: 50, width: 100, length: 60 },
        { stackNumber: 23, rows: 5, maxTiers: 5, x: 1350, y: 50, width: 100, length: 60 },
        { stackNumber: 25, rows: 5, maxTiers: 5, x: 150, y: 130, width: 100, length: 60 },
        { stackNumber: 27, rows: 5, maxTiers: 5, x: 270, y: 130, width: 100, length: 60 },
        { stackNumber: 29, rows: 5, maxTiers: 5, x: 390, y: 130, width: 100, length: 60 },
        { stackNumber: 31, rows: 7, maxTiers: 5, x: 510, y: 130, width: 140, length: 60, isSpecial: true },

        // Center Section (S33 to S55)
        { stackNumber: 33, rows: 5, maxTiers: 5, x: 200, y: 250, width: 100, length: 60 },
        { stackNumber: 35, rows: 5, maxTiers: 5, x: 320, y: 250, width: 100, length: 60 },
        { stackNumber: 37, rows: 5, maxTiers: 5, x: 440, y: 250, width: 100, length: 60 },
        { stackNumber: 39, rows: 5, maxTiers: 5, x: 560, y: 250, width: 100, length: 60 },
        { stackNumber: 41, rows: 4, maxTiers: 5, x: 720, y: 250, width: 80, length: 60 },
        { stackNumber: 43, rows: 4, maxTiers: 5, x: 820, y: 250, width: 80, length: 60 },
        { stackNumber: 45, rows: 4, maxTiers: 5, x: 920, y: 250, width: 80, length: 60 },
        { stackNumber: 47, rows: 4, maxTiers: 5, x: 1020, y: 250, width: 80, length: 60 },
        { stackNumber: 49, rows: 4, maxTiers: 5, x: 1120, y: 250, width: 80, length: 60 },
        { stackNumber: 51, rows: 4, maxTiers: 5, x: 1220, y: 250, width: 80, length: 60 },
        { stackNumber: 53, rows: 4, maxTiers: 5, x: 1350, y: 250, width: 80, length: 60 },
        { stackNumber: 55, rows: 4, maxTiers: 5, x: 1450, y: 250, width: 80, length: 60 },

        // Bottom Section (S61 to S103)
        { stackNumber: 61, rows: 6, maxTiers: 5, x: 50, y: 370, width: 120, length: 60 },
        { stackNumber: 63, rows: 6, maxTiers: 5, x: 190, y: 370, width: 120, length: 60 },
        { stackNumber: 65, rows: 6, maxTiers: 5, x: 330, y: 370, width: 120, length: 60 },
        { stackNumber: 67, rows: 6, maxTiers: 5, x: 470, y: 370, width: 120, length: 60 },
        { stackNumber: 69, rows: 6, maxTiers: 5, x: 610, y: 370, width: 120, length: 60 },
        { stackNumber: 71, rows: 6, maxTiers: 5, x: 750, y: 370, width: 120, length: 60 },
        { stackNumber: 73, rows: 4, maxTiers: 5, x: 890, y: 370, width: 80, length: 60 },
        { stackNumber: 75, rows: 4, maxTiers: 5, x: 990, y: 370, width: 80, length: 60 },
        { stackNumber: 77, rows: 4, maxTiers: 5, x: 50, y: 450, width: 80, length: 60 },
        { stackNumber: 79, rows: 4, maxTiers: 5, x: 150, y: 450, width: 80, length: 60 },
        { stackNumber: 81, rows: 4, maxTiers: 5, x: 250, y: 450, width: 80, length: 60 },
        { stackNumber: 83, rows: 4, maxTiers: 5, x: 350, y: 450, width: 80, length: 60 },
        { stackNumber: 85, rows: 4, maxTiers: 5, x: 450, y: 450, width: 80, length: 60 },
        { stackNumber: 87, rows: 4, maxTiers: 5, x: 550, y: 450, width: 80, length: 60 },
        { stackNumber: 89, rows: 4, maxTiers: 5, x: 650, y: 450, width: 80, length: 60 },
        { stackNumber: 91, rows: 4, maxTiers: 5, x: 750, y: 450, width: 80, length: 60 },
        { stackNumber: 93, rows: 4, maxTiers: 5, x: 850, y: 450, width: 80, length: 60 },
        { stackNumber: 95, rows: 4, maxTiers: 5, x: 950, y: 450, width: 80, length: 60 },
        { stackNumber: 97, rows: 4, maxTiers: 5, x: 1050, y: 450, width: 80, length: 60 },
        { stackNumber: 99, rows: 4, maxTiers: 5, x: 1150, y: 450, width: 80, length: 60 },
        { stackNumber: 101, rows: 1, maxTiers: 5, x: 1300, y: 450, width: 20, length: 60, isSpecial: true },
        { stackNumber: 103, rows: 2, maxTiers: 5, x: 1340, y: 450, width: 40, length: 60, isSpecial: true },
      ];

      // Create stacks for each section
      for (const section of sections) {
        const sectionStacks = stackConfigs.filter(config => {
          if (section.name.toLowerCase().includes('top')) {
            return config.stackNumber <= 31;
          } else if (section.name.toLowerCase().includes('center') || section.name.toLowerCase().includes('middle')) {
            return config.stackNumber >= 33 && config.stackNumber <= 55;
          } else if (section.name.toLowerCase().includes('bottom')) {
            return config.stackNumber >= 61;
          }
          return false;
        });

        for (const config of sectionStacks) {
          const stackData: StackFormData = {
            stackNumber: config.stackNumber,
            sectionId: section.id,
            rows: config.rows,
            maxTiers: config.maxTiers,
            positionX: config.x,
            positionY: config.y,
            positionZ: 0,
            width: config.width,
            length: config.length,
            containerSize: 'both',
            isSpecialStack: config.isSpecial || false,
            notes: `Tantarelli layout stack - ${config.rows}R x ${config.maxTiers}T`,
          };

          await this.createStack(yardId, stackData, createdBy);
        }
      }

      console.log(`✅ Generated Tantarelli layout for yard ${yardId}`);
      return true;
    } catch (error) {
      console.error('Failed to generate Tantarelli layout:', error);
      return false;
    }
  }

  /**
   * Clone stacks from one yard to another
   */
  async cloneStacksFromYard(sourceYardId: string, targetYardId: string, createdBy: string): Promise<boolean> {
    try {
      const sourceStacks = await this.getStacksForYard(sourceYardId);
      
      if (sourceStacks.length === 0) {
        throw new Error('Source yard has no stacks to clone');
      }

      // Get target yard sections
      const targetSections = await dbService.select<any>(
        'yard_sections',
        '*',
        { yard_id: targetYardId, is_active: true }
      );

      if (targetSections.length === 0) {
        throw new Error('Target yard has no sections. Please create sections first.');
      }

      // Map source sections to target sections (by name or order)
      const sectionMapping = new Map<string, string>();
      sourceStacks.forEach(stack => {
        const sourceSection = stack.sectionId;
        const targetSection = targetSections.find(s => s.name === sourceSection) || targetSections[0];
        sectionMapping.set(sourceSection, targetSection.id);
      });

      // Clone each stack
      for (const sourceStack of sourceStacks) {
        const targetSectionId = sectionMapping.get(sourceStack.sectionId);
        if (!targetSectionId) continue;

        const stackData: StackFormData = {
          stackNumber: sourceStack.stackNumber,
          sectionId: targetSectionId,
          rows: sourceStack.rows,
          maxTiers: sourceStack.maxTiers,
          positionX: sourceStack.position.x,
          positionY: sourceStack.position.y,
          positionZ: sourceStack.position.z,
          width: sourceStack.dimensions.width,
          length: sourceStack.dimensions.length,
          containerSize: sourceStack.containerSize,
          isSpecialStack: sourceStack.isSpecialStack,
          notes: `Cloned from ${sourceYardId} - ${sourceStack.notes || ''}`,
        };

        try {
          await this.createStack(targetYardId, stackData, createdBy);
        } catch (error) {
          console.warn(`Failed to clone stack ${sourceStack.stackNumber}:`, error);
        }
      }

      console.log(`✅ Cloned stacks from ${sourceYardId} to ${targetYardId}`);
      return true;
    } catch (error) {
      console.error('Failed to clone stacks:', error);
      throw error;
    }
  }

  /**
   * Get stack statistics for yard
   */
  async getStackStatistics(yardId: string): Promise<{
    totalStacks: number;
    activeStacks: number;
    totalCapacity: number;
    currentOccupancy: number;
    utilizationRate: number;
    stacksBySize: Record<string, number>;
    stacksBySection: Record<string, number>;
  }> {
    try {
      const stats = await dbService.queryOne(`
        SELECT
          COUNT(*) as total_stacks,
          COUNT(*) FILTER (WHERE is_active = true) as active_stacks,
          COALESCE(SUM(capacity), 0) as total_capacity,
          COALESCE(SUM(current_occupancy), 0) as current_occupancy,
          COUNT(*) FILTER (WHERE container_size = '20ft') as stacks_20ft,
          COUNT(*) FILTER (WHERE container_size = '40ft') as stacks_40ft,
          COUNT(*) FILTER (WHERE container_size = 'both') as stacks_both
        FROM yard_stacks
        WHERE yard_id = $1
      `, [yardId]);

      const sectionStats = await dbService.query(`
        SELECT 
          ys.name as section_name,
          COUNT(st.id) as stack_count
        FROM yard_sections ys
        LEFT JOIN yard_stacks st ON ys.id = st.section_id AND st.is_active = true
        WHERE ys.yard_id = $1 AND ys.is_active = true
        GROUP BY ys.id, ys.name
        ORDER BY ys.name
      `, [yardId]);

      const stacksBySection: Record<string, number> = {};
      sectionStats.rows.forEach(row => {
        stacksBySection[row.section_name] = parseInt(row.stack_count) || 0;
      });

      const totalCapacity = parseInt(stats?.total_capacity) || 0;
      const currentOccupancy = parseInt(stats?.current_occupancy) || 0;
      const utilizationRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;

      return {
        totalStacks: parseInt(stats?.total_stacks) || 0,
        activeStacks: parseInt(stats?.active_stacks) || 0,
        totalCapacity,
        currentOccupancy,
        utilizationRate,
        stacksBySize: {
          '20ft': parseInt(stats?.stacks_20ft) || 0,
          '40ft': parseInt(stats?.stacks_40ft) || 0,
          'both': parseInt(stats?.stacks_both) || 0,
        },
        stacksBySection,
      };
    } catch (error) {
      console.error('Failed to get stack statistics:', error);
      return {
        totalStacks: 0,
        activeStacks: 0,
        totalCapacity: 0,
        currentOccupancy: 0,
        utilizationRate: 0,
        stacksBySize: { '20ft': 0, '40ft': 0, 'both': 0 },
        stacksBySection: {},
      };
    }
  }

  /**
   * Map database stack to application stack interface
   */
  private mapDatabaseStackToStack(dbStack: DatabaseStack): Stack {
    return {
      id: dbStack.id,
      stackNumber: dbStack.stack_number,
      yardId: dbStack.yard_id,
      sectionId: dbStack.section_id,
      rows: dbStack.rows,
      maxTiers: dbStack.max_tiers,
      capacity: dbStack.capacity,
      currentOccupancy: dbStack.current_occupancy,
      position: {
        x: dbStack.position_x,
        y: dbStack.position_y,
        z: dbStack.position_z,
      },
      dimensions: {
        width: dbStack.width,
        length: dbStack.length,
      },
      containerSize: dbStack.container_size,
      isSpecialStack: dbStack.is_special_stack,
      isActive: dbStack.is_active,
      assignedClientCode: dbStack.assigned_client_code,
      notes: dbStack.notes,
      createdAt: new Date(dbStack.created_at),
      updatedAt: new Date(dbStack.updated_at),
      createdBy: dbStack.created_by,
      updatedBy: dbStack.updated_by,
    };
  }
}

// Singleton instance
export const stackService = new StackService();