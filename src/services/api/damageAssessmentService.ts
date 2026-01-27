import { supabase } from './supabaseClient';
import { auditService } from './auditService';
import { eventBus } from '../eventBus';

export interface DamageAssessmentData {
  hasDamage: boolean;
  damageType?: string;
  damageDescription?: string;
  assessmentStage: 'assignment' | 'inspection';
  assessedBy: string;
  assessedAt: Date;
}

export interface DamageAssessmentResult {
  success: boolean;
  error?: string;
  assessmentId?: string;
}

export class DamageAssessmentService {
  /**
   * Record damage assessment for a gate in operation during assignment stage
   */
  async recordGateInDamageAssessment(
    gateInOperationId: string,
    assessment: DamageAssessmentData,
    operatorId: string,
    operatorName: string
  ): Promise<DamageAssessmentResult> {
    try {
      // Update the gate in operation with damage assessment
      const { data: updatedOperation, error: updateError } = await supabase
        .from('gate_in_operations')
        .update({
          damage_reported: assessment.hasDamage,
          damage_description: assessment.damageDescription,
          damage_type: assessment.damageType,
          damage_assessment_stage: assessment.assessmentStage,
          damage_assessed_by: assessment.assessedBy,
          damage_assessed_at: assessment.assessedAt.toISOString()
        })
        .eq('id', gateInOperationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Also update the associated container if it exists
      if (updatedOperation.container_id) {
        await this.updateContainerDamageAssessment(
          updatedOperation.container_id,
          assessment
        );
      }

      // Create audit log
      await auditService.log({
        entityType: 'gate_in_operation',
        entityId: gateInOperationId,
        action: 'update',
        changes: {
          damage_assessment: {
            oldValue: null,
            newValue: assessment
          }
        },
        userId: operatorId,
        userName: operatorName
      });

      // Emit damage assessment event
      await eventBus.emit('DAMAGE_ASSESSMENT_RECORDED', {
        operationId: gateInOperationId,
        containerId: updatedOperation.container_id,
        assessment,
        assessedBy: operatorName
      });

      return { success: true, assessmentId: gateInOperationId };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to record damage assessment' };
    }
  }

  /**
   * Update container damage assessment information
   */
  async updateContainerDamageAssessment(
    containerId: string,
    assessment: DamageAssessmentData
  ): Promise<void> {
    const damageArray = assessment.hasDamage && assessment.damageDescription 
      ? [assessment.damageDescription] 
      : [];

    const { error } = await supabase
      .from('containers')
      .update({
        damage: damageArray,
        damage_assessment_stage: assessment.assessmentStage,
        damage_assessed_by: assessment.assessedBy,
        damage_assessed_at: assessment.assessedAt.toISOString(),
        damage_type: assessment.damageType
      })
      .eq('id', containerId);

    if (error) throw error;
  }

  /**
   * Get damage assessment history for a container
   */
  async getDamageAssessmentHistory(containerId: string): Promise<DamageAssessmentData[]> {
    const { data: gateInOps, error: gateInError } = await supabase
      .from('gate_in_operations')
      .select('*')
      .eq('container_id', containerId)
      .not('damage_assessment_stage', 'is', null)
      .order('damage_assessed_at', { ascending: false });

    if (gateInError) throw gateInError;

    return (gateInOps || []).map(op => ({
      hasDamage: op.damage_reported || false,
      damageType: op.damage_type,
      damageDescription: op.damage_description,
      assessmentStage: op.damage_assessment_stage as 'assignment' | 'inspection',
      assessedBy: op.damage_assessed_by || 'Unknown',
      assessedAt: new Date(op.damage_assessed_at || op.created_at)
    }));
  }

  /**
   * Get damage statistics by assessment stage
   */
  async getDamageStatsByStage(yardId?: string, dateRange?: { start: Date; end: Date }) {
    let query = supabase
      .from('gate_in_operations')
      .select('damage_assessment_stage, damage_reported, created_at')
      .eq('damage_reported', true);

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      byStage: {
        assignment: 0,
        inspection: 0
      }
    };

    data?.forEach(record => {
      if (record.damage_assessment_stage === 'assignment') {
        stats.byStage.assignment++;
      } else if (record.damage_assessment_stage === 'inspection') {
        stats.byStage.inspection++;
      }
    });

    return stats;
  }

  /**
   * Get containers requiring damage assessment
   */
  async getContainersRequiringAssessment(yardId?: string): Promise<any[]> {
    let query = supabase
      .from('gate_in_operations')
      .select(`
        id,
        container_id,
        container_number,
        client_code,
        client_name,
        created_at,
        damage_assessment_stage,
        damage_assessed_at
      `)
      .eq('status', 'pending')
      .is('damage_assessed_at', null);

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Bulk update damage assessments for multiple operations
   */
  async bulkUpdateDamageAssessments(
    updates: Array<{
      operationId: string;
      assessment: DamageAssessmentData;
    }>,
    operatorId: string,
    operatorName: string
  ): Promise<{ success: boolean; processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    for (const update of updates) {
      try {
        const result = await this.recordGateInDamageAssessment(
          update.operationId,
          update.assessment,
          operatorId,
          operatorName
        );

        if (result.success) {
          processed++;
        } else {
          errors.push(`Operation ${update.operationId}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`Operation ${update.operationId}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors
    };
  }
}

export const damageAssessmentService = new DamageAssessmentService();