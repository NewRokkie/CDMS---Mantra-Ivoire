import { supabase } from './api/supabaseClient';
import { YardStack } from '../types/yard';
import { handleError } from './errorHandling';
import { logger } from '../utils/logger';

/**
 * Service de gestion des zones tampons pour conteneurs endommagés
 * 
 * Les zones tampons sont des stacks virtuels qui n'existent pas physiquement
 * mais permettent de stocker temporairement les conteneurs endommagés
 * en attendant leur traitement ou réparation.
 */
export class BufferZoneService {
  private readonly BUFFER_ZONE_PREFIX = 'BUFFER';

  /**
   * Obtient ou crée un stack tampon pour un conteneur endommagé
   * @param yardId - ID du dépôt
   * @param containerSize - Taille du conteneur (20ft ou 40ft)
   * @param damageType - Type de dommage
   * @returns Stack tampon assigné
   */
  async getOrCreateBufferStack(
    yardId: string, 
    containerSize: '20ft' | '40ft',
    damageType: string
  ): Promise<YardStack> {
    try {
      // Chercher un stack tampon existant avec de la capacité
      const existingBuffer = await this.findAvailableBufferStack(yardId, containerSize, damageType);
      
      if (existingBuffer) {
        logger.info('Information', 'BufferZoneService', `Stack tampon existant trouvé: ${existingBuffer.stackNumber}`);
        return existingBuffer;
      }

      // Créer un nouveau stack tampon
      const newBuffer = await this.createBufferStack(yardId, containerSize, damageType);
      logger.info('Information', 'BufferZoneService', `Nouveau stack tampon créé: ${newBuffer.stackNumber}`);
      return newBuffer;
    } catch (error) {
      handleError(error, 'BufferZoneService.getOrCreateBufferStack');
      throw error;
    }
  }

  /**
   * Cherche un stack tampon disponible
   */
  private async findAvailableBufferStack(
    yardId: string, 
    containerSize: '20ft' | '40ft',
    _damageType: string
  ): Promise<YardStack | null> {
    const { data, error } = await supabase
      .from('stacks')
      .select('*')
      .eq('yard_id', yardId)
      .eq('container_size', containerSize)
      .eq('is_active', true)
      .eq('is_buffer_zone', true)
      .lt('current_occupancy', 'capacity')
      .order('current_occupancy', { ascending: true })
      .limit(1);

    if (error) {
      handleError(error, 'BufferZoneService.findAvailableBufferStack');
      return null;
    }

    return data && data.length > 0 ? this.mapToStack(data[0]) : null;
  }

  /**
   * Crée un nouveau stack tampon
   */
  private async createBufferStack(
    yardId: string, 
    containerSize: '20ft' | '40ft',
    damageType: string
  ): Promise<YardStack> {
    // Générer un numéro de stack unique pour la zone tampon
    const stackNumber = await this.generateBufferStackNumber(yardId);
    
    // Nom de section descriptif
    const sectionName = `${this.BUFFER_ZONE_PREFIX} - ${damageType.toUpperCase()} - ${containerSize}`;
    
    // Capacité par défaut pour les zones tampons
    const capacity = containerSize === '40ft' ? 20 : 40; // Moins de capacité pour les zones tampons
    
    const { data, error } = await supabase
      .from('stacks')
      .insert({
        yard_id: yardId,
        stack_number: stackNumber,
        section_id: `buffer-${damageType}`,
        section_name: sectionName,
        rows: containerSize === '40ft' ? 4 : 6, // Moins de rangées pour les zones tampons
        max_tiers: containerSize === '40ft' ? 5 : 7, // Hauteur adaptée
        capacity: capacity,
        current_occupancy: 0,
        position_x: -1000, // Position virtuelle (hors plan physique)
        position_y: -1000,
        position_z: 0,
        width: containerSize === '40ft' ? 2.5 : 2.5,
        length: containerSize === '40ft' ? 12 : 6,
        is_active: true,
        is_odd_stack: false,
        is_special_stack: true, // Marquer comme stack spécial
        is_buffer_zone: true, // Nouveau champ pour identifier les zones tampons
        buffer_zone_type: 'damage',
        damage_types_supported: JSON.stringify([damageType]),
        container_size: containerSize,
        assigned_client_code: null, // Pas de client assigné pour les zones tampons
        notes: `Zone tampon automatique pour conteneurs endommagés - Type: ${damageType}`,
        created_by: 'system-buffer-zone'
      })
      .select()
      .single();

    if (error) {
      handleError(error, 'BufferZoneService.createBufferStack');
      throw new Error(`Impossible de créer le stack tampon: ${error.message}`);
    }

    return this.mapToStack(data);
  }

  /**
   * Génère un numéro de stack unique pour les zones tampons
   */
  private async generateBufferStackNumber(yardId: string): Promise<number> {
    // Les stacks tampons utilisent des numéros à partir de 9000
    const BUFFER_START = 9000;
    
    const { data, error } = await supabase
      .from('stacks')
      .select('stack_number')
      .eq('yard_id', yardId)
      .gte('stack_number', BUFFER_START)
      .order('stack_number', { ascending: false })
      .limit(1);

    if (error) {
      handleError(error, 'BufferZoneService.generateBufferStackNumber');
      return BUFFER_START; // Commencer au début si erreur
    }

    const lastNumber = data && data.length > 0 ? data[0].stack_number : BUFFER_START - 1;
    return lastNumber + 1;
  }

  /**
   * Obtient tous les stacks tampons d'un dépôt
   */
  async getBufferStacks(yardId: string): Promise<YardStack[]> {
    const { data, error } = await supabase
      .from('stacks')
      .select('*')
      .eq('yard_id', yardId)
      .eq('is_active', true)
      .eq('is_buffer_zone', true)
      .order('stack_number', { ascending: true });

    if (error) {
      handleError(error, 'BufferZoneService.getBufferStacks');
      return [];
    }

    return (data || []).map(item => this.mapToStack(item));
  }

  /**
   * Vérifie si un stack est une zone tampon
   */
  isBufferStack(stack: YardStack): boolean {
    // Vérifier d'abord le champ is_buffer_zone s'il existe
    if ('isBufferZone' in stack && typeof stack.isBufferZone === 'boolean') {
      return stack.isBufferZone;
    }
    
    // Fallback vers la vérification du nom de section
    return stack.sectionName?.startsWith(this.BUFFER_ZONE_PREFIX) || 
           stack.stackNumber >= 9000 || 
           false;
  }

  /**
   * Obtient les statistiques des zones tampons
   */
  async getBufferZoneStats(yardId: string): Promise<{
    totalBufferStacks: number;
    totalCapacity: number;
    currentOccupancy: number;
    availableSpaces: number;
    utilizationRate: number;
  }> {
    try {
      // Utiliser la fonction SQL optimisée
      const { data, error } = await supabase
        .rpc('get_buffer_zone_stats', { p_yard_id: yardId });

      if (error) {
        handleError(error, 'BufferZoneService.getBufferZoneStats.rpc');
        // Fallback vers la méthode manuelle
        return this.getBufferZoneStatsManual(yardId);
      }

      if (data && data.length > 0) {
        const stats = data[0];
        return {
          totalBufferStacks: stats.total_buffer_stacks || 0,
          totalCapacity: stats.total_capacity || 0,
          currentOccupancy: stats.current_occupancy || 0,
          availableSpaces: stats.available_spaces || 0,
          utilizationRate: parseFloat(stats.utilization_rate) || 0
        };
      }

      return {
        totalBufferStacks: 0,
        totalCapacity: 0,
        currentOccupancy: 0,
        availableSpaces: 0,
        utilizationRate: 0
      };
    } catch (error) {
      handleError(error, 'BufferZoneService.getBufferZoneStats');
      return this.getBufferZoneStatsManual(yardId);
    }
  }

  /**
   * Méthode de fallback pour calculer les statistiques manuellement
   */
  private async getBufferZoneStatsManual(yardId: string): Promise<{
    totalBufferStacks: number;
    totalCapacity: number;
    currentOccupancy: number;
    availableSpaces: number;
    utilizationRate: number;
  }> {
    const bufferStacks = await this.getBufferStacks(yardId);
    
    const totalCapacity = bufferStacks.reduce((sum, stack) => sum + stack.capacity, 0);
    const currentOccupancy = bufferStacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0);
    const availableSpaces = totalCapacity - currentOccupancy;
    const utilizationRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;

    return {
      totalBufferStacks: bufferStacks.length,
      totalCapacity,
      currentOccupancy,
      availableSpaces,
      utilizationRate: Math.round(utilizationRate * 100) / 100
    };
  }

  /**
   * Nettoie les stacks tampons vides (optionnel)
   */
  async cleanupEmptyBufferStacks(yardId: string): Promise<number> {
    const { data, error } = await supabase
      .from('stacks')
      .delete()
      .eq('yard_id', yardId)
      .eq('current_occupancy', 0)
      .eq('is_active', true)
      .eq('is_buffer_zone', true)
      .select();

    if (error) {
      handleError(error, 'BufferZoneService.cleanupEmptyBufferStacks');
      return 0;
    }

    const deletedCount = data?.length || 0;
    if (deletedCount > 0) {
      logger.info('Information', 'BufferZoneService', `${deletedCount} stacks tampons vides supprimés`);
    }

    return deletedCount;
  }

  /**
   * Mappe les données de la base vers l'objet YardStack
   */
  private mapToStack(data: any): YardStack {
    // Parse damage_types_supported if it exists
    let damageTypesSupported: string[] | undefined;
    if (data.damage_types_supported) {
      try {
        damageTypesSupported = typeof data.damage_types_supported === 'string' 
          ? JSON.parse(data.damage_types_supported)
          : data.damage_types_supported;
      } catch (error) {
        handleError(error, 'BufferZoneService.mapToStack.parseDamageTypes');
        damageTypesSupported = undefined;
      }
    }

    return {
      id: data.id,
      yardId: data.yard_id,
      stackNumber: data.stack_number,
      sectionId: data.section_id,
      sectionName: data.section_name,
      rows: data.rows,
      maxTiers: data.max_tiers,
      currentOccupancy: data.current_occupancy,
      capacity: data.capacity,
      position: {
        x: parseFloat(data.position_x) || 0,
        y: parseFloat(data.position_y) || 0,
        z: parseFloat(data.position_z) || 0
      },
      dimensions: {
        width: parseFloat(data.width) || 2.5,
        length: parseFloat(data.length) || 12
      },
      containerPositions: [],
      isOddStack: data.is_odd_stack,
      isSpecialStack: data.is_special_stack || false,
      isVirtual: false,
      isActive: data.is_active,
      containerSize: data.container_size || '20ft',
      assignedClientCode: data.assigned_client_code,
      notes: data.notes,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      // Buffer Zone fields
      isBufferZone: data.is_buffer_zone || false,
      bufferZoneType: data.buffer_zone_type as 'damage' | 'maintenance' | 'quarantine' | 'inspection' | undefined,
      damageTypesSupported: damageTypesSupported
    };
  }
}

export const bufferZoneService = new BufferZoneService();