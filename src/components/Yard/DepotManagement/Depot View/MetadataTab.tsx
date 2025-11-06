import React from 'react';
import { Yard } from '../../../../types';
import { GlassCard } from './GlassCard';

interface Props {
  depot: Yard;
}

export const MetadataTab: React.FC<Props> = ({ depot }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <GlassCard>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Timestamps</h3>
      <DataRow label="Created" value={`${depot.createdAt.toLocaleDateString()} by ${depot.createdBy}`} />
      <DataRow
        label="Updated"
        value={`${depot.updatedAt.toLocaleDateString()} by ${depot.updatedBy || depot.createdBy}`}
      />
    </GlassCard>
    <GlassCard>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Settings</h3>
      <DataRow label="Timezone" value={depot.timezone || 'UTC'} />
    </GlassCard>
  </div>
);

const DataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-200 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-700">{value}</span>
  </div>
);
