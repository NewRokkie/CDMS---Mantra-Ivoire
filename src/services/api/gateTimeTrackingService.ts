/**
 * Service for tracking time metrics in Gate In/Gate Out operations
 * Provides methods to capture timestamps and calculate durations
 */

import { supabase } from './supabaseClient';

export interface GateInTimeTracking {
  operationId: string;
  damageAssessmentStarted?: Date;
  damageAssessmentCompleted?: Date;
  locationAssignmentStarted?: Date;
  locationAssignmentCompleted?: Date;
  ediProcessingStarted?: Date;
}

export interface GateOutTimeTracking {
  operationId: string;
  containerSelectionStarted?: Date;
  containerSelectionCompleted?: Date;
  ediProcessingStarted?: Date;
}

export interface OperationDurations {
  totalDuration?: number; // minutes
  damageAssessmentDuration?: number; // minutes
  locationAssignmentDuration?: number; // minutes
  ediProcessingDuration?: number; // minutes
  containerSelectionDuration?: number; // minutes (Gate Out only)
}

export interface TimeTrackingMetrics {
  averageTotalDuration: number;
  averageDamageAssessmentDuration: number;
  averageLocationAssignmentDuration: number;
  averageEdiProcessingDuration: number;
  averageContainerSelectionDuration: number; // Gate Out only
  operationCount: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

class GateTimeTrackingService {
  /**
   * Start damage assessment tracking for Gate In operation
   */
  async startDamageAssessment(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_in_operations')
        .update({
          damage_assessment_started: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to start damage assessment tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting damage assessment tracking:', error);
      throw error;
    }
  }

  /**
   * Complete damage assessment tracking for Gate In operation
   */
  async completeDamageAssessment(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_in_operations')
        .update({
          damage_assessment_completed: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to complete damage assessment tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error completing damage assessment tracking:', error);
      throw error;
    }
  }

  /**
   * Start location assignment tracking for Gate In operation
   */
  async startLocationAssignment(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_in_operations')
        .update({
          location_assignment_started: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to start location assignment tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting location assignment tracking:', error);
      throw error;
    }
  }

  /**
   * Complete location assignment tracking for Gate In operation
   */
  async completeLocationAssignment(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_in_operations')
        .update({
          location_assignment_completed: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to complete location assignment tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error completing location assignment tracking:', error);
      throw error;
    }
  }

  /**
   * Start EDI processing tracking for Gate In operation
   */
  async startEdiProcessing(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_in_operations')
        .update({
          edi_processing_started: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to start EDI processing tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting EDI processing tracking:', error);
      throw error;
    }
  }

  /**
   * Start container selection tracking for Gate Out operation
   */
  async startContainerSelection(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_out_operations')
        .update({
          container_selection_started: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to start container selection tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting container selection tracking:', error);
      throw error;
    }
  }

  /**
   * Complete container selection tracking for Gate Out operation
   */
  async completeContainerSelection(operationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('gate_out_operations')
        .update({
          container_selection_completed: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) {
        throw new Error(`Failed to complete container selection tracking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error completing container selection tracking:', error);
      throw error;
    }
  }

  /**
   * Calculate durations for a Gate In operation
   */
  async calculateGateInDurations(operationId: string): Promise<OperationDurations> {
    try {
      const { data, error } = await supabase
        .from('gate_in_operations')
        .select(`
          created_at,
          completed_at,
          damage_assessment_started,
          damage_assessment_completed,
          location_assignment_started,
          location_assignment_completed,
          edi_processing_started,
          edi_transmission_date
        `)
        .eq('id', operationId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch operation data: ${error.message}`);
      }

      const durations: OperationDurations = {};

      // Calculate total duration
      if (data.created_at && data.completed_at) {
        const start = new Date(data.created_at);
        const end = new Date(data.completed_at);
        durations.totalDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Calculate damage assessment duration
      if (data.damage_assessment_started && data.damage_assessment_completed) {
        const start = new Date(data.damage_assessment_started);
        const end = new Date(data.damage_assessment_completed);
        durations.damageAssessmentDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Calculate location assignment duration
      if (data.location_assignment_started && data.location_assignment_completed) {
        const start = new Date(data.location_assignment_started);
        const end = new Date(data.location_assignment_completed);
        durations.locationAssignmentDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Calculate EDI processing duration
      if (data.edi_processing_started && data.edi_transmission_date) {
        const start = new Date(data.edi_processing_started);
        const end = new Date(data.edi_transmission_date);
        durations.ediProcessingDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      return durations;
    } catch (error) {
      console.error('Error calculating Gate In durations:', error);
      throw error;
    }
  }

  /**
   * Calculate durations for a Gate Out operation
   */
  async calculateGateOutDurations(operationId: string): Promise<OperationDurations> {
    try {
      const { data, error } = await supabase
        .from('gate_out_operations')
        .select(`
          created_at,
          completed_at,
          container_selection_started,
          container_selection_completed,
          edi_processing_started,
          edi_transmission_date
        `)
        .eq('id', operationId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch operation data: ${error.message}`);
      }

      const durations: OperationDurations = {};

      // Calculate total duration
      if (data.created_at && data.completed_at) {
        const start = new Date(data.created_at);
        const end = new Date(data.completed_at);
        durations.totalDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Calculate container selection duration
      if (data.container_selection_started && data.container_selection_completed) {
        const start = new Date(data.container_selection_started);
        const end = new Date(data.container_selection_completed);
        durations.containerSelectionDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Calculate EDI processing duration
      if (data.edi_processing_started && data.edi_transmission_date) {
        const start = new Date(data.edi_processing_started);
        const end = new Date(data.edi_transmission_date);
        durations.ediProcessingDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      return durations;
    } catch (error) {
      console.error('Error calculating Gate Out durations:', error);
      throw error;
    }
  }

  /**
   * Get time tracking metrics for Gate In operations
   */
  async getGateInMetrics(yardId: string, startDate: Date, endDate: Date): Promise<TimeTrackingMetrics> {
    try {
      const { data, error } = await supabase
        .from('gate_in_operations')
        .select(`
          created_at,
          completed_at,
          damage_assessment_started,
          damage_assessment_completed,
          location_assignment_started,
          location_assignment_completed,
          edi_processing_started,
          edi_transmission_date
        `)
        .eq('yard_id', yardId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('completed_at', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch Gate In metrics: ${error.message}`);
      }

      const operations = data || [];
      const metrics: TimeTrackingMetrics = {
        averageTotalDuration: 0,
        averageDamageAssessmentDuration: 0,
        averageLocationAssignmentDuration: 0,
        averageEdiProcessingDuration: 0,
        averageContainerSelectionDuration: 0,
        operationCount: operations.length,
        dateRange: { startDate, endDate }
      };

      if (operations.length === 0) {
        return metrics;
      }

      let totalDurations: number[] = [];
      let damageDurations: number[] = [];
      let locationDurations: number[] = [];
      let ediDurations: number[] = [];

      operations.forEach(op => {
        // Total duration
        if (op.created_at && op.completed_at) {
          const duration = Math.round((new Date(op.completed_at).getTime() - new Date(op.created_at).getTime()) / (1000 * 60));
          totalDurations.push(duration);
        }

        // Damage assessment duration
        if (op.damage_assessment_started && op.damage_assessment_completed) {
          const duration = Math.round((new Date(op.damage_assessment_completed).getTime() - new Date(op.damage_assessment_started).getTime()) / (1000 * 60));
          damageDurations.push(duration);
        }

        // Location assignment duration
        if (op.location_assignment_started && op.location_assignment_completed) {
          const duration = Math.round((new Date(op.location_assignment_completed).getTime() - new Date(op.location_assignment_started).getTime()) / (1000 * 60));
          locationDurations.push(duration);
        }

        // EDI processing duration
        if (op.edi_processing_started && op.edi_transmission_date) {
          const duration = Math.round((new Date(op.edi_transmission_date).getTime() - new Date(op.edi_processing_started).getTime()) / (1000 * 60));
          ediDurations.push(duration);
        }
      });

      // Calculate averages
      metrics.averageTotalDuration = totalDurations.length > 0 
        ? Math.round(totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length) 
        : 0;

      metrics.averageDamageAssessmentDuration = damageDurations.length > 0 
        ? Math.round(damageDurations.reduce((a, b) => a + b, 0) / damageDurations.length) 
        : 0;

      metrics.averageLocationAssignmentDuration = locationDurations.length > 0 
        ? Math.round(locationDurations.reduce((a, b) => a + b, 0) / locationDurations.length) 
        : 0;

      metrics.averageEdiProcessingDuration = ediDurations.length > 0 
        ? Math.round(ediDurations.reduce((a, b) => a + b, 0) / ediDurations.length) 
        : 0;

      return metrics;
    } catch (error) {
      console.error('Error getting Gate In metrics:', error);
      throw error;
    }
  }

  /**
   * Get time tracking metrics for Gate Out operations
   */
  async getGateOutMetrics(yardId: string, startDate: Date, endDate: Date): Promise<TimeTrackingMetrics> {
    try {
      const { data, error } = await supabase
        .from('gate_out_operations')
        .select(`
          created_at,
          completed_at,
          container_selection_started,
          container_selection_completed,
          edi_processing_started,
          edi_transmission_date
        `)
        .eq('yard_id', yardId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('completed_at', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch Gate Out metrics: ${error.message}`);
      }

      const operations = data || [];
      const metrics: TimeTrackingMetrics = {
        averageTotalDuration: 0,
        averageDamageAssessmentDuration: 0,
        averageLocationAssignmentDuration: 0,
        averageEdiProcessingDuration: 0,
        averageContainerSelectionDuration: 0,
        operationCount: operations.length,
        dateRange: { startDate, endDate }
      };

      if (operations.length === 0) {
        return metrics;
      }

      let totalDurations: number[] = [];
      let containerSelectionDurations: number[] = [];
      let ediDurations: number[] = [];

      operations.forEach(op => {
        // Total duration
        if (op.created_at && op.completed_at) {
          const duration = Math.round((new Date(op.completed_at).getTime() - new Date(op.created_at).getTime()) / (1000 * 60));
          totalDurations.push(duration);
        }

        // Container selection duration
        if (op.container_selection_started && op.container_selection_completed) {
          const duration = Math.round((new Date(op.container_selection_completed).getTime() - new Date(op.container_selection_started).getTime()) / (1000 * 60));
          containerSelectionDurations.push(duration);
        }

        // EDI processing duration
        if (op.edi_processing_started && op.edi_transmission_date) {
          const duration = Math.round((new Date(op.edi_transmission_date).getTime() - new Date(op.edi_processing_started).getTime()) / (1000 * 60));
          ediDurations.push(duration);
        }
      });

      // Calculate averages
      metrics.averageTotalDuration = totalDurations.length > 0 
        ? Math.round(totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length) 
        : 0;

      metrics.averageContainerSelectionDuration = containerSelectionDurations.length > 0 
        ? Math.round(containerSelectionDurations.reduce((a, b) => a + b, 0) / containerSelectionDurations.length) 
        : 0;

      metrics.averageEdiProcessingDuration = ediDurations.length > 0 
        ? Math.round(ediDurations.reduce((a, b) => a + b, 0) / ediDurations.length) 
        : 0;

      return metrics;
    } catch (error) {
      console.error('Error getting Gate Out metrics:', error);
      throw error;
    }
  }
}

export const gateTimeTrackingService = new GateTimeTrackingService();