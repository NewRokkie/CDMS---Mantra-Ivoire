import React from 'react';
import { Yard } from '../../../../types';
import { GlassCard } from './GlassCard';
import { StackCapacityCalculator } from '../../../../utils/stackCapacityCalculator';

interface Props {
  depot: Yard;
}

export const StructureTab: React.FC<Props> = ({ depot }) => {
  const totalStacks = depot.sections.reduce((acc, s) => acc + s.stacks.length, 0);
  // Calculate effective capacity using the new logic
  const allStacks = depot.sections.flatMap(section => section.stacks);
  const totalCapacity = StackCapacityCalculator.calculateTotalEffectiveCapacity(allStacks);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      <GlassCard>
        <div className="text-3xl font-bold text-blue-600 animate-count">{depot.sections.length}</div>
        <div className="text-sm text-gray-600 mt-1">Sections</div>
      </GlassCard>
      <GlassCard>
        <div className="text-3xl font-bold text-green-600 animate-count">{totalStacks}</div>
        <div className="text-sm text-gray-600 mt-1">Stacks</div>
      </GlassCard>
      <GlassCard>
        <div className="text-3xl font-bold text-purple-600 animate-count">{totalCapacity}</div>
        <div className="text-sm text-gray-600 mt-1">Stack Capacity</div>
      </GlassCard>
    </div>
  );
};
