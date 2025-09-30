import React, { useState, useEffect } from 'react';
import { Search, MapPin, Package, Filter, Home, ZoomIn, ZoomOut, Eye, X, Grid3X3, Building, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { Container } from '../../types';
import { YardGrid } from './YardGrid';
import { ContainerTooltip } from './ContainerTooltip';
import { YardStats } from './YardStats';
import { ContainerSearchPanel } from './ContainerSearchPanel';

// Enhanced mock container data with proper positioning
const mockContainers: Container[] = [
  // Top Section - Stack S01 to S31
  { id: 'c1', number: 'MSKU1234567', type: 'standard', size: '40ft', status: 'in_depot', location: 'Stack S01-Row 1-Tier 1', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2025-01-10T08:30:00'), createdBy: 'System' },
  { id: 'c2', number: 'TCLU9876543', type: 'reefer', size: '20ft', status: 'in_depot', location: 'Stack S03-Row 2-Tier 1', client: 'MSC', clientCode: 'MSCU', gateInDate: new Date('2025-01-09T14:15:00'), createdBy: 'System' },
  { id: 'c3', number: 'GESU4567891', type: 'hi_cube', size: '40ft', status: 'in_depot', location: 'Stack S05-Row 1-Tier 2', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2025-01-08T16:45:00'), createdBy: 'System', damage: ['Corner damage'] },
  { id: 'c4', number: 'SHIP1112228', type: 'standard', size: '20ft', status: 'in_depot', location: 'Stack S07-Row 3-Tier 1', client: 'Shipping Solutions Inc', clientCode: 'SHIP001', gateInDate: new Date('2025-01-11T09:15:00'), createdBy: 'System' },
  { id: 'c5', number: 'MAEU5556664', type: 'reefer', size: '40ft', status: 'maintenance', location: 'Stack S09-Row 2-Tier 3', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2025-01-07T11:20:00'), createdBy: 'System' },
  { id: 'c6', number: 'CMDU7890125', type: 'hard_top', size: '40ft', status: 'in_depot', location: 'Stack S11-Row 4-Tier 1', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2025-01-06T13:30:00'), createdBy: 'System' },
  { id: 'c7', number: 'HLCU3456789', type: 'ventilated', size: '20ft', status: 'in_depot', location: 'Stack S31-Row 1-Tier 1', client: 'Hapag-Lloyd', clientCode: 'HLCU', gateInDate: new Date('2025-01-05T15:45:00'), createdBy: 'System' },
  
  // Center Section - Stack S33 to S55
  { id: 'c8', number: 'SNFW2940740', type: 'reefer', size: '40ft', status: 'in_depot', location: 'Stack S33-Row 3-Tier 2', client: 'Shipping Network', clientCode: 'SNFW', gateInDate: new Date('2025-01-04T10:15:00'), createdBy: 'System' },
  { id: 'c9', number: 'MAEU7778881', type: 'tank', size: '20ft', status: 'cleaning', location: 'Stack S35-Row 2-Tier 1', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2025-01-03T09:00:00'), createdBy: 'System' },
  { id: 'c10', number: 'MSCU9990002', type: 'flat_rack', size: '40ft', status: 'in_depot', location: 'Stack S37-Row 1-Tier 1', client: 'MSC Mediterranean Shipping', clientCode: 'MSCU', gateInDate: new Date('2025-01-02T14:30:00'), createdBy: 'System' },
  { id: 'c11', number: 'CMDU1113335', type: 'open_top', size: '20ft', status: 'in_depot', location: 'Stack S39-Row 2-Tier 1', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2025-01-01T16:00:00'), createdBy: 'System' },
  
  // Bottom Section - Stack S61 to S103
  { id: 'c12', number: 'SHIP4445556', type: 'standard', size: '20ft', status: 'in_depot', location: 'Stack S61-Row 1-Tier 2', client: 'Shipping Solutions Inc', clientCode: 'SHIP001', gateInDate: new Date('2024-12-30T11:45:00'), createdBy: 'System' },
  { id: 'c13', number: 'HLCU6667778', type: 'reefer', size: '40ft', status: 'maintenance', location: 'Stack S63-Row 2-Tier 3', client: 'Hapag-Lloyd', clientCode: 'HLCU', gateInDate: new Date('2024-12-29T08:20:00'), createdBy: 'System', damage: ['Cooling system failure'] },
  { id: 'c14', number: 'MAEU8889990', type: 'hi_cube', size: '20ft', status: 'in_depot', location: 'Stack S65-Row 4-Tier 1', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2024-12-28T13:15:00'), createdBy: 'System' },
  { id: 'c15', number: 'GESU1234567', type: 'standard', size: '40ft', status: 'in_depot', location: 'Stack S67-Row 3-Tier 2', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2024-12-27T10:30:00'), createdBy: 'System' },
  { id: 'c16', number: 'TCLU5678901', type: 'tank', size: '20ft', status: 'in_depot', location: 'Stack S101-Row 1-Tier 1', client: 'MSC', clientCode: 'MSCU', gateInDate: new Date('2024-12-26T14:45:00'), createdBy: 'System' },
  { id: 'c17', number: 'SHIP9876543', type: 'ventilated', size: '40ft', status: 'in_depot', location: 'Stack S103-Row 2-Tier 1', client: 'Shipping Solutions Inc', clientCode: 'SHIP001', gateInDate: new Date('2024-12-25T16:20:00'), createdBy: 'System' }
];

export const YardManagement: React.FC = () => {
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredContainer, setHoveredContainer] = useState<Container | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  
  const { user, getClientFilter } = useAuth();
  const { currentYard } = useYard();

  const clientFilter = getClientFilter();

  // Filter containers based on user permissions and current yard
  const getFilteredContainers = () => {
    let containers = mockContainers;
    
    // Filter by current yard
    if (currentYard) {
      containers = containers.filter(container => {
        if (currentYard.id === 'depot-tantarelli') {
          return container.location.includes('Stack S') &&
                 /Stack S(1|3|5|7|9|11|13|15|17|19|21|23|25|27|29|31|33|35|37|39|41|43|45|47|49|51|53|55|61|63|65|67|69|71|73|75|77|79|81|83|85|87|89|91|93|95|97|99|101|103)/.test(container.location);
        }
        return container.location.includes(currentYard.code) || container.location.includes(currentYard.name);
      });
    }
    
    // Apply client filter for client users
    if (clientFilter) {
      containers = containers.filter(container => 
        container.clientCode === clientFilter || 
        container.client.toLowerCase().includes(clientFilter.toLowerCase())
      );
    }
    
    return containers;
  };

  const filteredContainers = getFilteredContainers();

  // Calculate yard statistics
  const yardStats = {
    totalContainers: filteredContainers.length,
    inDepot: filteredContainers.filter(c => c.status === 'in_depot').length,
    maintenance: filteredContainers.filter(c => c.status === 'maintenance').length,
    damaged: filteredContainers.filter(c => c.damage && c.damage.length > 0).length,
    occupancyRate: currentYard ? (currentYard.currentOccupancy / currentYard.totalCapacity) * 100 : 0,
    totalStacks: currentYard ? currentYard.sections.reduce((sum, section) => sum + section.stacks.length, 0) : 0
  };

  const handleContainerSearch = (containerNumber: string) => {
    setIsSearching(true);
    setSearchQuery(containerNumber);
    
    setTimeout(() => {
      const container = filteredContainers.find(c => 
        c.number.toLowerCase().includes(containerNumber.toLowerCase())
      );
      
      if (container) {
        setSelectedContainer(container);
      } else {
        setSelectedContainer(null);
      }
      setIsSearching(false);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedContainer(null);
    setIsSearching(false);
  };

  const handleContainerSelect = (container: Container | null) => {
    setSelectedContainer(container);
  };

  const handleContainerHover = (container: Container | null) => {
    setHoveredContainer(container);
  };

  if (!currentYard) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Yard Selected</h3>
        <p className="text-gray-600">Please select a yard to view the management interface.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Yard Management</h2>
            <p className="text-gray-600">
              Real-time container visualization and management
              <span className="ml-2 text-blue-600 font-medium">
                • {currentYard.name} ({currentYard.code})
              </span>
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  viewMode === 'overview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  viewMode === 'detailed'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Detailed</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <YardStats stats={yardStats} currentYard={currentYard} />

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Search Panel */}
        <div className="w-80 flex-shrink-0">
          <ContainerSearchPanel
            containers={filteredContainers}
            selectedContainer={selectedContainer}
            searchQuery={searchQuery}
            isSearching={isSearching}
            onContainerSearch={handleContainerSearch}
            onClearSearch={handleClearSearch}
            onContainerSelect={handleContainerSelect}
          />
        </div>

        {/* Yard Grid */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <YardGrid
            yard={currentYard}
            containers={filteredContainers}
            selectedContainer={selectedContainer}
            hoveredContainer={hoveredContainer}
            onContainerSelect={handleContainerSelect}
            onContainerHover={handleContainerHover}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Container Tooltip */}
      <ContainerTooltip container={hoveredContainer} />
    </div>
  );
};