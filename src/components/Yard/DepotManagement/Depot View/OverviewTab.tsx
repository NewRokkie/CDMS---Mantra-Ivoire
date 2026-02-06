import React from 'react';
import { Yard } from '../../../../types';
import { GlassCard } from './GlassCard';
import { Badge } from './Badge';
import { RadialGauge } from './RadialGauge';
import { clsx } from 'clsx';
import { StackCapacityCalculator } from '../../../../utils/stackCapacityCalculator';

interface Props {
  depot: Yard;
}

export const OverviewTab: React.FC<Props> = ({ depot }) => {
  // Calculate effective capacity using the new logic
  const allStacks = depot.sections.flatMap(section => section.stacks);
  const effectiveCapacity = StackCapacityCalculator.calculateTotalEffectiveCapacity(allStacks);
  const rate = effectiveCapacity ? (depot.currentOccupancy / effectiveCapacity) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <GlassCard className="border-blue-200 bg-white shadow-sm">
        <h3 className="card-title text-blue-700">Basic Info</h3>
        <DataRow label="Name" value={depot.name} />
        <DataRow label="Code" value={depot.code} />
        <DataRow label="Description" value={depot.description} />
        <DataRow label="Layout" value={<Badge>{depot.layout}</Badge>} />
      </GlassCard>

      <GlassCard className="border-green-200 bg-white shadow-sm">
        <h3 className="card-title text-green-700">Capacity</h3>
        <RadialGauge value={rate} />
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <Counter label="Total" value={effectiveCapacity} color="text-blue-600" />
          <Counter label="Occupied" value={depot.currentOccupancy} color="text-green-600" />
        </div>
      </GlassCard>

      <GlassCard className="md:col-span-2">
        <h3 className="card-title">Location Preview</h3>
        <LocationMock address={depot.address} />
      </GlassCard>
    </div>
  );
};

const DataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-200 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-700">{value}</span>
  </div>
);

const Counter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className={clsx('text-3xl font-bold animate-count', color)}>{value.toLocaleString()}</div>
    <div className="text-xs text-gray-600 mt-1">{label}</div>
  </div>
);

const LocationMock: React.FC<{ address?: any }> = ({ address }) => (
  <div className="relative h-40 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg text-xs shadow-sm">
      📍 {address?.city || 'Unknown'}, {address?.country || 'N/A'}
    </div>
    <div className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-blue-500/20 blur-xl" />
    <div className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
  </div>
);
