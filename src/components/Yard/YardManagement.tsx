import React, { useState } from 'react';
import { Grid3X3, Eye, RotateCcw, ZoomIn, ZoomOut, Move3D, MapPin, Package, AlertTriangle, Building } from 'lucide-react';
import { YardView3D } from './YardView3D';
import { YardGridView } from './YardGridView';
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
  const { user, getClientFilter } = useAuth();

  const clientFilter = getClientFilter();

  const getOccupancyPercentage = (stack: YardStack) => {
    const occupancy = clientFilter 
      ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
      : stack.currentOccupancy;
    return Math.round((occupancy / stack.capacity) * 100);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getSectionStats = (section: YardSection) => {
    const totalCapacity = section.stacks.reduce((sum, stack) => sum + stack.capacity, 0);
    const currentOccupancy = clientFilter
      ? section.stacks.reduce((sum, stack) => 
          sum + stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length, 0)
      : section.stacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0);
    
    return {
      totalCapacity,
      currentOccupancy,
      utilization: totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0,
      stackCount: section.stacks.length
    };
  };

  const getYardStats = (yard: Yard) => {
    const totalCapacity = yard.sections.reduce((sum, section) => 
      sum + section.stacks.reduce((stackSum, stack) => stackSum + stack.capacity, 0), 0);
    
    const currentOccupancy = clientFilter
      ? yard.sections.reduce((sum, section) => 
          sum + section.stacks.reduce((stackSum, stack) => 
            stackSum + stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length, 0), 0)
      : yard.sections.reduce((sum, section) => 
          sum + section.stacks.reduce((stackSum, stack) => stackSum + stack.currentOccupancy, 0), 0);
    
    return {
      totalCapacity,
      currentOccupancy,
      utilization: totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0,
      sectionCount: yard.sections.length,
      stackCount: yard.sections.reduce((sum, section) => sum + section.stacks.length, 0)
    };
  };

  const yardStats = getYardStats(selectedYard);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Yard Management</h2>
          <p className="text-gray-600">Monitor and manage container yard operations</p>
          {clientFilter && (
            <div className="flex items-center mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                Viewing containers for <strong>{user?.company}</strong> only
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Yard Selector */}
          <select
            value={selectedYard.id}
            onChange={(e) => {
              const yard = mockYards.find(y => y.id === e.target.value);
              if (yard) {
                setSelectedYard(yard);
                setSelectedSection(null);
                setSelectedStack(null);
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {mockYards.map(yard => (
              <option key={yard.id} value={yard.id}>
                {yard.name}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === '3d'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Move3D className="h-4 w-4 mr-1 inline" />
              3D View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4 mr-1 inline" />
              Grid View
            </button>
          </div>
        </div>
      </div>

      {/* Yard Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                {clientFilter ? 'Your Containers' : 'Total Containers'}
              </p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.currentOccupancy.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Capacity</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.totalCapacity.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Grid3X3 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Stacks</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.stackCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <MapPin className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Sections</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.sectionCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="text-lg">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Utilization</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.utilization}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {selectedYard.sections.map((section) => {
          const stats = getSectionStats(section);
          return (
            <div
              key={section.id}
              onClick={() => setSelectedSection(selectedSection?.id === section.id ? null : section)}
              className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedSection?.id === section.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{section.name}</h3>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stacks:</span>
                  <span className="font-medium">{stats.stackCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{stats.totalCapacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {clientFilter ? 'Your Containers:' : 'Occupied:'}
                  </span>
                  <span className="font-medium">{stats.currentOccupancy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilization:</span>
                  <span className={`font-medium ${getOccupancyColor(stats.utilization).split(' ')[0]}`}>
                    {stats.utilization}%
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      stats.utilization >= 90
                        ? 'bg-red-500'
                        : stats.utilization >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${stats.utilization}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stack List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedSection ? `${selectedSection.name} Stacks` : 'All Stacks'}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedYard.layout === 'tantarelli' ? 'Odd-numbered stacks only' : 'Standard grid layout'}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-primary">
              {(selectedSection ? selectedSection.stacks : selectedYard.sections.flatMap(s => s.stacks))
                .sort((a, b) => a.stackNumber - b.stackNumber)
                .map((stack) => {
                  const occupancyPercentage = getOccupancyPercentage(stack);
                  const isSelected = selectedStack?.id === stack.id;
                  
                  return (
                    <div
                      key={stack.id}
                      onClick={() => setSelectedStack(isSelected ? null : stack)}
                      className={`p-3 border-b border-gray-100 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            Stack {stack.stackNumber.toString().padStart(2, '0')}
                            {selectedYard.layout === 'tantarelli' && stack.isOddStack && ' ●'}
                          </span>
                          {selectedYard.layout === 'tantarelli' && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {stack.stackNumber === 1 ? 'ENTRY' :
                               stack.stackNumber === 31 ? 'END' :
                               stack.stackNumber >= 61 && stack.stackNumber <= 71 ? 'HIGH' :
                               stack.stackNumber === 101 ? 'SINGLE' :
                               stack.stackNumber === 103 ? 'DOUBLE' :
                               `${stack.rows}R`}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOccupancyColor(occupancyPercentage)}`}>
                          {occupancyPercentage}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span>{stack.capacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            {clientFilter ? 'Your containers:' : 'Occupied:'}
                          </span>
                          <span>
                            {clientFilter 
                              ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
                              : stack.currentOccupancy
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rows:</span>
                          <span>{stack.rows}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              occupancyPercentage >= 90
                                ? 'bg-red-500'
                                : occupancyPercentage >= 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${occupancyPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Yard View */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewMode === '3d' ? '3D Yard View' : 'Grid Layout'} - {selectedYard.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedYard.description} • Layout: {selectedYard.layout === 'tantarelli' ? 'Tantarelli (Odd Stacks)' : 'Standard Grid'}
                </p>
              </div>
            </div>
            <div className="relative">
              {viewMode === '3d' ? (
                <YardView3D
                  yard={selectedYard}
                  selectedSection={selectedSection}
                  selectedStack={selectedStack}
                  positions={mockYardPositions}
                  onSectionSelect={setSelectedSection}
                  onStackSelect={setSelectedStack}
                  clientFilter={clientFilter}
                />
              ) : (
                <YardGridView
                  yard={selectedYard}
                  selectedSection={selectedSection}
                  selectedStack={selectedStack}
                  positions={mockYardPositions}
                  onSectionSelect={setSelectedSection}
                  onStackSelect={setSelectedStack}
                  clientFilter={clientFilter}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Stack Details */}
      {selectedStack && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Stack {selectedStack.stackNumber.toString().padStart(2, '0')} Details
              {selectedYard.layout === 'tantarelli' && selectedStack.isOddStack && ' ●'}
            </h3>
            <button
              onClick={() => setSelectedStack(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Stack Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stack Number:</span>
                  <span className="font-medium">{selectedStack.stackNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rows:</span>
                  <span className="font-medium">{selectedStack.rows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Tiers:</span>
                  <span className="font-medium">{selectedStack.maxTiers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{selectedStack.capacity} containers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {clientFilter ? 'Your containers:' : 'Current Occupancy:'}
                  </span>
                  <span className="font-medium">
                    {clientFilter 
                      ? selectedStack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
                      : selectedStack.currentOccupancy
                    } containers
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Space:</span>
                  <span className="font-medium">
                    {selectedStack.capacity - (clientFilter 
                      ? selectedStack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
                      : selectedStack.currentOccupancy
                    )} containers
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilization:</span>
                  <span className="font-medium">{getOccupancyPercentage(selectedStack)}%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Physical Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Width:</span>
                  <span className="font-medium">{selectedStack.dimensions.width}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Length:</span>
                  <span className="font-medium">{selectedStack.dimensions.length}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Height:</span>
                  <span className="font-medium">{selectedStack.maxTiers * 2.6}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Area:</span>
                  <span className="font-medium">
                    {(selectedStack.dimensions.width * selectedStack.dimensions.length)}m²
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Location</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Section:</span>
                  <span className="font-medium">
                    {selectedYard.sections.find(s => s.id === selectedStack.sectionId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">X Position:</span>
                  <span className="font-medium">{selectedStack.position.x}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Y Position:</span>
                  <span className="font-medium">{selectedStack.position.y}m</span>
                </div>
                {selectedYard.layout === 'tantarelli' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {selectedStack.stackNumber === 1 ? 'Entry Stack' :
                       selectedStack.stackNumber === 31 ? 'End Stack' :
                       selectedStack.stackNumber >= 61 && selectedStack.stackNumber <= 71 ? 'High Capacity' :
                       selectedStack.stackNumber === 101 ? 'Single Row' :
                       selectedStack.stackNumber === 103 ? 'Double Row' :
                       'Standard'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Special Features</h4>
              <div className="space-y-2 text-sm">
                {selectedYard.layout === 'tantarelli' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-gray-600">Odd-numbered stack</span>
                    </div>
                    {selectedStack.stackNumber >= 61 && selectedStack.stackNumber <= 71 && (
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                        <span className="text-gray-600">High capacity zone</span>
                      </div>
                    )}
                    {(selectedStack.stackNumber === 1 || selectedStack.stackNumber === 31) && (
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span className="text-gray-600">Terminal stack</span>
                      </div>
                    )}
                    {(selectedStack.stackNumber === 101 || selectedStack.stackNumber === 103) && (
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        <span className="text-gray-600">Special configuration</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};