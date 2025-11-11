import { clientPoolService } from './api';
import { ClientPool } from '../types/clientPool';
import { logger } from '../utils/logger';

export interface StackRecommendation {
  stackId: string;
  stackNumber: number;
  clientPoolId?: string;
  priority: number;
  reason: string;
  isExclusive: boolean;
}

class ClientPoolRecommendations {
  async getRecommendedStacksForClient(
    clientId: string,
    yardId: string,
    containerSize: '20ft' | '40ft'
  ): Promise<StackRecommendation[]> {
    try {
      const clientPools = await clientPoolService.getByClientId(clientId, yardId);

      const recommendations: StackRecommendation[] = [];

      for (const pool of clientPools) {
        if (!pool.isActive) continue;

        const utilizationRate = (pool.currentOccupancy / pool.maxCapacity) * 100;

        if (utilizationRate >= 95) continue;

        for (const stackId of pool.assignedStacks) {
          const stackNumber = parseInt(stackId.split('-').pop() || '0');

          const assignments = await clientPoolService.getStackAssignments(pool.id);
          const stackAssignment = assignments.find(a => a.stackId === stackId);

          const priorityScore = this.calculatePriorityScore(
            pool.priority,
            utilizationRate,
            stackAssignment?.isExclusive || false
          );

          recommendations.push({
            stackId,
            stackNumber,
            clientPoolId: pool.id,
            priority: priorityScore,
            reason: this.getRecommendationReason(pool, utilizationRate, stackAssignment?.isExclusive),
            isExclusive: stackAssignment?.isExclusive || false
          });
        }
      }

      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('Error getting stack recommendations:', 'clientPoolRecommendations.ts', error);
      return [];
    }
  }

  private calculatePriorityScore(
    poolPriority: 'high' | 'medium' | 'low',
    utilizationRate: number,
    isExclusive: boolean
  ): number {
    let score = 0;

    if (poolPriority === 'high') score += 100;
    else if (poolPriority === 'medium') score += 50;
    else score += 25;

    if (isExclusive) score += 50;

    if (utilizationRate < 50) score += 30;
    else if (utilizationRate < 75) score += 20;
    else score += 10;

    return score;
  }

  private getRecommendationReason(
    pool: ClientPool,
    utilizationRate: number,
    isExclusive?: boolean
  ): string {
    const reasons: string[] = [];

    if (isExclusive) {
      reasons.push('Exclusive stack for this client');
    }

    if (pool.priority === 'high') {
      reasons.push('High priority client');
    }

    if (utilizationRate < 50) {
      reasons.push('Low utilization - plenty of space');
    } else if (utilizationRate < 75) {
      reasons.push('Moderate utilization');
    } else {
      reasons.push('High utilization - limited space');
    }

    return reasons.join(', ');
  }

  async updatePoolOccupancy(clientId: string, yardId: string): Promise<void> {
    try {
      const pools = await clientPoolService.getByClientId(clientId, yardId);

      for (const pool of pools) {
        let totalContainers = 0;

        await clientPoolService.updateOccupancy(pool.id, totalContainers);
      }
    } catch (error) {
      logger.error('Error updating pool occupancy:', 'clientPoolRecommendations.ts', error);
    }
  }
}

export const clientPoolRecommendations = new ClientPoolRecommendations();
