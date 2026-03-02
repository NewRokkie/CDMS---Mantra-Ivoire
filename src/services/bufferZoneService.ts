import { supabase } from './api/supabaseClient';
import { YardStack } from '../types/yard';
import { handleError } from './errorHandling';
import { logger } from '../utils/logger';

export interface BufferZoneEntry {
  id: string;
  containerId: string;
  containerNumber?: string;
  containerSize?: string;
  containerType?: string;
  gateInOperationId: string | null;
  bufferStackId: string | null;
  bufferStackNumber?: number;
  bufferStackName?: string;
  yardId: string;
  damageType: string | null;
  damageDescription: string | null;
  damageAssessment: any | null;
  status: 'in_buffer' | 'released';
  releasedAt: Date | null;
  releasedBy: string | null;
  releaseNotes: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface AssignToBufferZoneParams {
  containerId: string;
  gateInOperationId: string;
  bufferStackId: string;
  yardId: string;
  damageType: string;
  damageDescription?: string;
  damageAssessment?: any;
  createdBy: string;
}

export interface ReleaseFromBufferZoneParams {
  containerId: string;
  newLocation: string;
  newStackId: string;
  releaseNotes: string;
  releasedBy: string;
}

/**
 * Service de gestion des zones tampons.
 * 
 * Les zones tampons sont maintenant gérées dans la table container_buffer_zones.
 * Les stacks tampons (is_buffer_zone = true) sont créés MANUELLEMENT dans Stack Management.
 * Ce service ne crée PLUS de stacks automatiquement.
 */
export class BufferZoneService {

  /**
   * Récupère les stacks configurés comme zones tampons dans Stack Management.
   * Ces stacks ont is_buffer_zone = true et ont été créés manuellement par un admin.
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
   * Assigne un conteneur à une zone tampon.
   * Crée une entrée dans container_buffer_zones et met à jour le statut du conteneur.
   * NE CRÉE PAS de stacks automatiquement.
   */
  async assignContainerToBufferZone(params: AssignToBufferZoneParams): Promise<BufferZoneEntry> {
    try {
      // Vérifier que le stack tampon existe et est valide
      const { data: bufferStack, error: stackError } = await supabase
        .from('stacks')
        .select('id, stack_number, section_name, is_buffer_zone, current_occupancy, capacity')
        .eq('id', params.bufferStackId)
        .eq('is_buffer_zone', true)
        .single();

      if (stackError || !bufferStack) {
        throw new Error('Stack tampon introuvable ou non valide. Veuillez configurer un stack tampon dans Stack Management.');
      }

      // Vérifier la capacité
      if (bufferStack.current_occupancy >= bufferStack.capacity) {
        throw new Error(`Le stack tampon "${bufferStack.section_name}" est plein (${bufferStack.current_occupancy}/${bufferStack.capacity}).`);
      }

      // Créer l'entrée dans container_buffer_zones
      const { data: entry, error: insertError } = await supabase
        .from('container_buffer_zones')
        .insert({
          container_id: params.containerId,
          gate_in_operation_id: params.gateInOperationId,
          buffer_stack_id: params.bufferStackId,
          yard_id: params.yardId,
          damage_type: params.damageType,
          damage_description: params.damageDescription || null,
          damage_assessment: params.damageAssessment || null,
          status: 'in_buffer',
          created_by: params.createdBy,
        })
        .select()
        .single();

      if (insertError || !entry) {
        throw new Error(`Impossible de créer l'entrée zone tampon: ${insertError?.message}`);
      }

      // Mettre à jour le conteneur
      const { error: containerError } = await supabase
        .from('containers')
        .update({
          status: 'in_buffer',
          location: `BUF-S${String(bufferStack.stack_number).padStart(4, '0')}`,
          buffer_zone_id: entry.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.containerId);

      if (containerError) {
        logger.error('BufferZone: Impossible de mettre à jour le conteneur', 'BufferZoneService', containerError);
      }

      // Incrémenter l'occupancy du stack tampon
      await supabase
        .from('stacks')
        .update({ current_occupancy: bufferStack.current_occupancy + 1 })
        .eq('id', params.bufferStackId);

      logger.info(
        `Conteneur ${params.containerId} assigné au stack tampon ${bufferStack.stack_number}`,
        'BufferZoneService'
      );

      return this.mapToBufferZoneEntry(entry);
    } catch (error) {
      handleError(error, 'BufferZoneService.assignContainerToBufferZone');
      throw error;
    }
  }

  /**
   * Libère un conteneur de la zone tampon et le réassigne à un emplacement physique.
   * Met à jour le statut del'entrée buffer, du conteneur, et NE transmet PAS l'EDI.
   */
  async releaseContainerFromBufferZone(params: ReleaseFromBufferZoneParams): Promise<void> {
    try {
      // 1. Trouver l'entrée active dans container_buffer_zones
      const { data: entry, error: findError } = await supabase
        .from('container_buffer_zones')
        .select('id, buffer_stack_id')
        .eq('container_id', params.containerId)
        .eq('status', 'in_buffer')
        .single();

      if (findError || !entry) {
        throw new Error('Entrée de zone tampon active introuvable pour ce conteneur.');
      }

      // 2. Marquer l'entrée buffer comme libérée
      const { error: updateEntryError } = await supabase
        .from('container_buffer_zones')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          released_by: params.releasedBy,
          release_notes: params.releaseNotes,
        })
        .eq('id', entry.id);

      if (updateEntryError) {
        throw new Error(`Impossible de libérer la zone tampon: ${updateEntryError.message}`);
      }

      // 3. Mettre à jour le conteneur vers son nouvel emplacement
      const { error: containerError } = await supabase
        .from('containers')
        .update({
          status: 'in_depot',
          location: params.newLocation,
          buffer_zone_id: null,
          damage_reported: false,  // Marquer le dommage comme résolu
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.containerId);

      if (containerError) {
        throw new Error(`Impossible de mettre à jour le conteneur: ${containerError.message}`);
      }

      // 4. Décrémenter l'occupancy du stack tampon
      if (entry.buffer_stack_id) {
        const { data: bufferStack } = await supabase
          .from('stacks')
          .select('current_occupancy')
          .eq('id', entry.buffer_stack_id)
          .single();

        if (bufferStack && bufferStack.current_occupancy > 0) {
          await supabase
            .from('stacks')
            .update({ current_occupancy: bufferStack.current_occupancy - 1 })
            .eq('id', entry.buffer_stack_id);
        }
      }

      logger.info(
        `Conteneur ${params.containerId} libéré de la zone tampon → ${params.newLocation}`,
        'BufferZoneService'
      );
    } catch (error) {
      handleError(error, 'BufferZoneService.releaseContainerFromBufferZone');
      throw error;
    }
  }

  /**
   * Récupère tous les conteneurs actifs en zone tampon pour un yard.
   */
  async getActiveBufferZoneEntries(yardId: string): Promise<BufferZoneEntry[]> {
    const { data, error } = await supabase
      .from('container_buffer_zones')
      .select(`
        *,
        containers!container_id (number, type, size, full_empty, client_code),
        stacks (stack_number, section_name)
      `)
      .eq('yard_id', yardId)
      .eq('status', 'in_buffer')
      .order('created_at', { ascending: false });

    if (error) {
      handleError(error, 'BufferZoneService.getActiveBufferZoneEntries');
      return [];
    }

    return (data || []).map(item => ({
      ...this.mapToBufferZoneEntry(item),
      containerNumber: item.containers?.number,
      containerSize: item.containers?.size,
      containerType: item.containers?.type,
      bufferStackNumber: item.stacks?.stack_number,
      bufferStackName: item.stacks?.section_name,
    }));
  }

  /**
   * Récupère les statistiques des zones tampons (basées sur container_buffer_zones).
   */
  async getBufferZoneStats(yardId: string): Promise<{
    totalBufferStacks: number;
    totalCapacity: number;
    currentOccupancy: number;
    availableSpaces: number;
    utilizationRate: number;
  }> {
    // Stats des stacks tampon configurés
    const bufferStacks = await this.getBufferStacks(yardId);
    const totalCapacity = bufferStacks.reduce((s, st) => s + st.capacity, 0);
    const currentOccupancy = bufferStacks.reduce((s, st) => s + st.currentOccupancy, 0);
    const availableSpaces = totalCapacity - currentOccupancy;
    const utilizationRate = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 10000) / 100 : 0;

    return {
      totalBufferStacks: bufferStacks.length,
      totalCapacity,
      currentOccupancy,
      availableSpaces,
      utilizationRate,
    };
  }

  /**
   * Vérifie si un stack est une zone tampon.
   */
  isBufferStack(stack: YardStack): boolean {
    if ('isBufferZone' in stack && typeof stack.isBufferZone === 'boolean') {
      return stack.isBufferZone;
    }
    return stack.stackNumber >= 9000 || stack.sectionName?.toUpperCase().includes('BUFFER') || false;
  }

  /**
   * Mappe les données Supabase vers l'objet BufferZoneEntry.
   */
  private mapToBufferZoneEntry(data: any): BufferZoneEntry {
    return {
      id: data.id,
      containerId: data.container_id,
      gateInOperationId: data.gate_in_operation_id,
      bufferStackId: data.buffer_stack_id,
      yardId: data.yard_id,
      damageType: data.damage_type,
      damageDescription: data.damage_description,
      damageAssessment: data.damage_assessment,
      status: data.status,
      releasedAt: data.released_at ? new Date(data.released_at) : null,
      releasedBy: data.released_by,
      releaseNotes: data.release_notes,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by,
    };
  }

  /**
   * Mappe les données de la base vers l'objet YardStack.
   */
  private mapToStack(data: any): YardStack {
    let damageTypesSupported: string[] | undefined;
    if (data.damage_types_supported) {
      try {
        damageTypesSupported = typeof data.damage_types_supported === 'string'
          ? JSON.parse(data.damage_types_supported)
          : data.damage_types_supported;
      } catch { /* ignore */ }
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
        z: parseFloat(data.position_z) || 0,
      },
      dimensions: {
        width: parseFloat(data.width) || 2.5,
        length: parseFloat(data.length) || 12,
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
      isBufferZone: data.is_buffer_zone || false,
      bufferZoneType: data.buffer_zone_type as 'damage' | 'maintenance' | 'quarantine' | 'inspection' | undefined,
      damageTypesSupported,
    };
  }
}

export const bufferZoneService = new BufferZoneService();