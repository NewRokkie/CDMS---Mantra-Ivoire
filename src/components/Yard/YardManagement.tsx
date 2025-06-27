import React, { useState } from 'react';
import { YardHeader } from './YardHeader';
import { YardStatistics } from './YardStatistics';
import { YardSectionCards } from './YardSectionCards';
import { YardStackList } from './YardStackList';
import { YardViewContainer } from './YardViewContainer';
import { YardStackDetails } from './YardStackDetails';
import { Yard, YardSection, YardStack, YardPosition } from '../../types';
import { useAuth } from '../../hooks/useAuth';

// Mock data for Depot Tantarelli based on the screenshot
const createDepotTantarelli = (): Yard => {
  const sections: YardSection[] = [];
  const allStacks: YardStack[] = [];
  
  // Top Section (Blue) - Stack 01 to 31
  const topSection: YardSection = {
    id: 'section-top',
    name: 'Top Section',
    yardId: 'depot-tantarelli',
    stacks: [],
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 400, length: 120 },
    color: '#3b82f6' // Blue
  };

  // Create top section stacks
  const topStacks = [
    { stackNumber: 1, rows: 4, x: 20, y: 20 },
    { stackNumber: 3, rows: 5, x: 50, y: 20 },
    { stackNumber: 5, rows: 5, x: 80, y: 20 },
    { stackNumber: 7, rows: 5, x: 110, y: 20 },
    { stackNumber: 9, rows: 5, x: 140, y: 20 },
    { stackNumber: 11, rows: 5, x: 170, y: 20 },
    { stackNumber: 13, rows: 5, x: 200, y: 20 },
    { stackNumber: 15, rows: 5, x: 230, y: 20 },
    { stackNumber: 17, rows: 5, x: 260, y: 20 },
    { stackNumber: 19, rows: 5, x: 290, y: 20 },
    { stackNumber: 21, rows: 5, x: 320, y: 20 },
    { stackNumber: 23, rows: 5, x: 350, y: 20 },
    { stackNumber: 25, rows: 5, x: 20, y: 60 },
    { stackNumber: 27, rows: 5, x: 50, y: 60 },
    { stackNumber: 29, rows: 5, x: 80, y: 60 },
    { stackNumber: 31, rows: 7, x: 110, y: 60 }
  ];

  topStacks.forEach(stack => {
    const yardStack: YardStack = {
      id: `stack-${stack.stackNumber}`,
      stackNumber: stack.stackNumber,
      sectionId: topSection.id,
      rows: stack.rows,
      maxTiers: 5,
      currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
      capacity: stack.rows * 5,
      position: { x: stack.x, y: stack.y, z: 0 },
      dimensions: { width: 12, length: 6 },
      containerPositions: [],
      isOddStack: true
    };
    yardStack.capacity = yardStack.rows * yardStack.maxTiers;
    allStacks.push(yardStack);
  });

  topSection.stacks = allStacks.filter(s => s.sectionId === topSection.id);

  // Center Section (Orange) - Stack 33 to 55
  const centerSection: YardSection = {
    id: 'section-center',
    name: 'Center Section',
    yardId: 'depot-tantarelli',
    stacks: [],
    position: { x: 0, y: 140, z: 0 },
    dimensions: { width: 400, length: 100 },
    color: '#f59e0b' // Orange
  };

  const centerStacks = [
    { stackNumber: 33, rows: 5, x: 20, y: 160 },
    { stackNumber: 35, rows: 5, x: 50, y: 160 },
    { stackNumber: 37, rows: 5, x: 80, y: 160 },
    { stackNumber: 39, rows: 5, x: 110, y: 160 },
    { stackNumber: 41, rows: 4, x: 140, y: 160 },
    { stackNumber: 43, rows: 4, x: 170, y: 160 },
    { stackNumber: 45, rows: 4, x: 200, y: 160 },
    { stackNumber: 47, rows: 4, x: 230, y: 160 },
    { stackNumber: 49, rows: 4, x: 260, y: 160 },
    { stackNumber: 51, rows: 4, x: 290, y: 160 },
    { stackNumber: 53, rows: 4, x: 320, y: 160 },
    { stackNumber: 55, rows: 4, x: 350, y: 160 }
  ];

  centerStacks.forEach(stack => {
    const yardStack: YardStack = {
      id: `stack-${stack.stackNumber}`,
      stackNumber: stack.stackNumber,
      sectionId: centerSection.id,
      rows: stack.rows,
      maxTiers: 5,
      currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
      capacity: stack.rows * 5,
      position: { x: stack.x, y: stack.y, z: 0 },
      dimensions: { width: 12, length: 6 },
      containerPositions: [],
      isOddStack: true
    };
    yardStack.capacity = yardStack.rows * yardStack.maxTiers;
    allStacks.push(yardStack);
  });

  centerSection.stacks = allStacks.filter(s => s.sectionId === centerSection.id);

  // Bottom Section (Green) - Stack 61 to 103
  const bottomSection: YardSection = {
    id: 'section-bottom',
    name: 'Bottom Section',
    yardId: 'depot-tantarelli',
    stacks: [],
    position: { x: 0, y: 260, z: 0 },
    dimensions: { width: 400, length: 140 },
    color: '#10b981' // Green
  };

  const bottomStacks = [
    // High capacity stacks (6 rows)
    { stackNumber: 61, rows: 6, x: 20, y: 280 },
    { stackNumber: 63, rows: 6, x: 50, y: 280 },
    { stackNumber: 65, rows: 6, x: 80, y: 280 },
    { stackNumber: 67, rows: 6, x: 110, y: 280 },
    { stackNumber: 69, rows: 6, x: 140, y: 280 },
    { stackNumber: 71, rows: 6, x: 170, y: 280 },
    // Standard stacks (4 rows)
    { stackNumber: 73, rows: 4, x: 200, y: 280 },
    { stackNumber: 75, rows: 4, x: 230, y: 280 },
    { stackNumber: 77, rows: 4, x: 260, y: 280 },
    { stackNumber: 79, rows: 4, x: 290, y: 280 },
    { stackNumber: 81, rows: 4, x: 320, y: 280 },
    { stackNumber: 83, rows: 4, x: 350, y: 280 },
    { stackNumber: 85, rows: 4, x: 20, y: 320 },
    { stackNumber: 87, rows: 4, x: 50, y: 320 },
    { stackNumber: 89, rows: 4, x: 80, y: 320 },
    { stackNumber: 91, rows: 4, x: 110, y: 320 },
    { stackNumber: 93, rows: 4, x: 140, y: 320 },
    { stackNumber: 95, rows: 4, x: 170, y: 320 },
    { stackNumber: 97, rows: 4, x: 200, y: 320 },
    { stackNumber: 99, rows: 4, x: 230, y: 320 },
    // Special stacks
    { stackNumber: 101, rows: 1, x: 260, y: 320 },
    { stackNumber: 103, rows: 2, x: 290, y: 320 }
  ];

  bottomStacks.forEach(stack => {
    const yardStack: YardStack = {
      id: `stack-${stack.stackNumber}`,
      stackNumber: stack.stackNumber,
      sectionId: bottomSection.id,
      rows: stack.rows,
      maxTiers: 5,
      currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
      capacity: stack.rows * 5,
      position: { x: stack.x, y: stack.y, z: 0 },
      dimensions: { width: 12, length: 6 },
      containerPositions: [],
      isOddStack: true
    };
    yardStack.capacity = yardStack.rows * yardStack.maxTiers;
    allStacks.push(yardStack);
  });

  bottomSection.stacks = allStacks.filter(s => s.sectionId === bottomSection.id);

  sections.push(topSection, centerSection, bottomSection);

  return {
    id: 'depot-tantarelli',
    name: 'Depot Tantarelli',
    description: 'Main container depot with specialized odd-numbered stack layout',
    location: 'Tantarelli Port Complex',
    isActive: true,
    totalCapacity: allStacks.reduce((sum, stack) => sum + stack.capacity, 0),
    currentOccupancy: allStacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0),
    sections,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    layout: 'tantarelli'
  };
};

// Mock data for second yard
const createStandardYard = (): Yard => {
  const sections: YardSection[] = [];
  const allStacks: YardStack[] = [];
  
  const standardSection: YardSection = {
    id: 'section-standard',
    name: 'Standard Section',
    yardId: 'depot-standard',
    stacks: [],
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 300, length: 200 },
    color: '#6b7280' // Gray
  };

  // Create standard grid layout
  for (let row = 1; row <= 10; row++) {
    for (let bay = 1; bay <= 8; bay++) {
      const stackNumber = (row - 1) * 8 + bay;
      const yardStack: YardStack = {
        id: `stack-std-${stackNumber}`,
        stackNumber,
        sectionId: standardSection.id,
        rows: 4,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * 20),
        capacity: 20,
        position: { x: bay * 30, y: row * 20, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: false
      };
      allStacks.push(yardStack);
    }
  }

  standardSection.stacks = allStacks;
  sections.push(standardSection);

  return {
    id: 'depot-standard',
    name: 'Standard Depot',
    description: 'Secondary depot with standard grid layout',
    location: 'Standard Port Area',
    isActive: true,
    totalCapacity: allStacks.reduce((sum, stack) => sum + stack.capacity, 0),
    currentOccupancy: allStacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0),
    sections,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    layout: 'standard'
  };
};

// Mock yards
const mockYards = [
  createDepotTantarelli(),
  createStandardYard()
];

// Mock positions with containers
const mockYardPositions: YardPosition[] = [];

export const YardManagement: React.FC = () => {
  const [selectedYard, setSelectedYard] = useState<Yard>(mockYards[0]);
  const [selectedSection, setSelectedSection] = useState<YardSection | null>(null);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'grid'>('3d');
  const { getClientFilter } = useAuth();

  const clientFilter = getClientFilter();

  const handleYardChange = (yardId: string) => {
    const yard = mockYards.find(y => y.id === yardId);
    if (yard) {
      setSelectedYard(yard);
      setSelectedSection(null);
      setSelectedStack(null);
    }
  };

  return (
    <div className="space-y-6">
      <YardHeader
        selectedYard={selectedYard}
        yards={mockYards}
        viewMode={viewMode}
        onYardChange={handleYardChange}
        onViewModeChange={setViewMode}
      />

      <YardStatistics yard={selectedYard} />

      <YardSectionCards
        yard={selectedYard}
        selectedSection={selectedSection}
        onSectionSelect={setSelectedSection}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stack List */}
        <div className="lg:col-span-1">
          <YardStackList
            yard={selectedYard}
            selectedSection={selectedSection}
            selectedStack={selectedStack}
            onStackSelect={setSelectedStack}
          />
        </div>

        {/* Yard View */}
        <div className="lg:col-span-3">
          <YardViewContainer
            yard={selectedYard}
            selectedSection={selectedSection}
            selectedStack={selectedStack}
            positions={mockYardPositions}
            viewMode={viewMode}
            onSectionSelect={setSelectedSection}
            onStackSelect={setSelectedStack}
            clientFilter={clientFilter}
          />
        </div>
      </div>

      {/* Selected Stack Details */}
      {selectedStack && (
        <YardStackDetails
          yard={selectedYard}
          selectedStack={selectedStack}
          onClose={() => setSelectedStack(null)}
        />
      )}
    </div>
  );
};