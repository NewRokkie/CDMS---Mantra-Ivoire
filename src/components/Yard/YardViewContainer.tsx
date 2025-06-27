import React from 'react';
import { YardView3D } from './YardView3D';
import { YardGridView } from './YardGridView';
import { Yard, YardSection, YardStack, YardPosition } from '../../types';

interface YardViewContainerProps {
  yard: Yard;
  selectedSection: YardSection | null;
  selectedStack: YardStack | null;
  positions: YardPosition[];
  viewMode: '3d' | 'grid';
  onSectionSelect: (section: YardSection | null) => void;
  onStackSelect: (stack: YardStack | null) => void;
  clientFilter?: string | null;
}

export const YardViewContainer: React.FC<YardViewContainerProps> = ({
  yard,
  selectedSection,
  selectedStack,
  positions,
  viewMode,
  onSectionSelect,
  onStackSelect,
  clientFilter
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === '3d' ? '3D Yard View' : 'Grid Layout'} - {yard.name}
          </h3>
          <p className="text-sm text-gray-600">
            {yard.description} • Layout: {yard.layout === 'tantarelli' ? 'Tantarelli (Odd Stacks)' : 'Standard Grid'}
          </p>
        </div>
      </div>
      <div className="relative">
        {viewMode === '3d' ? (
          <YardView3D
            yard={yard}
            selectedSection={selectedSection}
            selectedStack={selectedStack}
            positions={positions}
            onSectionSelect={onSectionSelect}
            onStackSelect={onStackSelect}
            clientFilter={clientFilter}
          />
        ) : (
          <YardGridView
            yard={yard}
            selectedSection={selectedSection}
            selectedStack={selectedStack}
            positions={positions}
            onSectionSelect={onSectionSelect}
            onStackSelect={onStackSelect}
            clientFilter={clientFilter}
          />
        )}
      </div>
    </div>
  );
};