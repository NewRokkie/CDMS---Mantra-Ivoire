import React, { useState } from 'react';
import { YardCanvas2D5 } from './YardCanvas2D5';
import { YardSearchPanel } from './YardSearchPanel';
import { Yard, Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { clientPoolService } from '../../services/clientPoolService';

// Mock containers with specific positions in the Tantarelli yard
const mockContainers: Container[] = [
  // Stack S1 containers
  {
    id: 'c1',
    number: 'MSKU-123456-7',
    type: 'standard',
    size: '40ft',
    status: 'in_depot',
    location: 'Stack S1-Row 1-Tier 1',
    client: 'Maersk Line',
    clientCode: 'MAEU',
    gateInDate: new Date('2025-01-10T08:30:00')
  },
  {
    id: 'c2',
    number: 'TCLU-987654-3',
    type: 'reefer',
    size: '20ft',
    status: 'in_depot',
    location: 'Stack S3-Row 2-Tier 1',
    client: 'MSC',
    clientCode: 'MSCU',
    gateInDate: new Date('2025-01-09T14:15:00')
  },
  {
    id: 'c3',
    number: 'GESU-456789-1',
    type: 'standard',
    size: '40ft',
    status: 'in_depot',
    location: 'Stack S5-Row 1-Tier 2',
    client: 'CMA CGM',
    clientCode: 'CMDU',
    gateInDate: new Date('2025-01-08T16:45:00')
  },
  {
    id: 'c4',
    number: 'SHIP-111222-8',
    type: 'standard',
    size: '20ft',
    status: 'in_depot',
    location: 'Stack S33-Row 3-Tier 1',
    client: 'Shipping Solutions Inc',
    clientCode: 'SHIP001',
    gateInDate: new Date('2025-01-11T09:15:00')
  },
  {
    id: 'c5',
    number: 'MAEU-555666-4',
    type: 'reefer',
    size: '40ft',
    status: 'in_depot',
    location: 'Stack S61-Row 2-Tier 3',
    client: 'Maersk Line',
    clientCode: 'MAEU',
    gateInDate: new Date('2025-01-07T11:20:00')
  },
  {
    id: 'c6',
    number: 'CMDU-789012-5',
    type: 'standard',
    size: '40ft',
    status: 'in_depot',
    location: 'Stack S65-Row 4-Tier 1',
    client: 'CMA CGM',
    clientCode: 'CMDU',
    gateInDate: new Date('2025-01-06T13:30:00')
  },
  {
    id: 'c7',
    number: 'HLCU-345678-9',
    type: 'standard',
    size: '20ft',
    status: 'in_depot',
    location: 'Stack S101-Row 1-Tier 1',
    client: 'Hapag-Lloyd',
    clientCode: 'HLCU',
    gateInDate: new Date('2025-01-05T15:45:00')
  },
  {
    id: 'c8',
    number: 'SNFW-2940740',
    type: 'reefer',
    size: '40ft',
    status: 'in_depot',
    location: 'Stack S67-Row 3-Tier 2',
    client: 'Shipping Network',
    clientCode: 'SNFW',
    gateInDate: new Date('2025-01-04T10:15:00')
  }
];

// Create the Tantarelli yard structure based on the hand-drawn layout
const createTantarelliYard = (): Yard => {
  return {
    id: 'depot-tantarelli',
    name: 'Depot Tantarelli',
    description: 'Main container depot with specialized odd-numbered stack layout',
    location: 'Tantarelli Port Complex',
    isActive: true,
    totalCapacity: 2500,
    currentOccupancy: 1847,
    sections: [], // We'll handle sections in the canvas component
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    layout: 'tantarelli'
  };
};

export const YardManagement: React.FC = () => {
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { getClientFilter } = useAuth();
  const { currentYard } = useYard();

  const clientFilter = getClientFilter();

  // Filter containers based on user permissions
  const getFilteredContainers = () => {
    let containers = mockContainers;
    
    // Filter by current yard first
    if (currentYard) {
      containers = containers.filter(container => {
        // Check if container belongs to current yard
        if (currentYard.id === 'depot-tantarelli') {
          return container.location.includes('Stack S') && 
                 /Stack S(1|3|5|7|9|11|13|15|17|19|21|23|25|27|29|31|33|35|37|39|41|43|45|47|49|51|53|55|61|63|65|67|69|71|73|75|77|79|81|83|85|87|89|91|93|95|97|99|101|103)/.test(container.location);
        }
        return container.location.includes(currentYard.code) || container.location.includes(currentYard.name);
      });
    }
    
    if (clientFilter) {
      // Use client pool service to filter containers
      const clientStacks = clientPoolService.getClientStacks(clientFilter);
      containers = containers.filter(container => {
        // Check if container is in client's assigned stacks
        const containerStackMatch = container.location.match(/Stack S(\d+)/);
        if (containerStackMatch) {
          const stackNumber = parseInt(containerStackMatch[1]);
          const stackId = `stack-${stackNumber}`;
          return clientStacks.includes(stackId);
        }
        
        // Fallback to original filtering
        return container.clientCode === clientFilter || 
               container.client.toLowerCase().includes(clientFilter.toLowerCase());
      });
    }
    
    return containers;
  };

  const filteredContainers = getFilteredContainers();

  // Use current yard or fallback to Tantarelli for demo
  const yard = currentYard || createTantarelliYard();

  const handleContainerSearch = (containerNumber: string) => {
    setIsSearching(true);
    setSearchQuery(containerNumber);
    
    // Find the container
    const container = filteredContainers.find(c => 
      c.number.toLowerCase().includes(containerNumber.toLowerCase())
    );
    
    if (container) {
      setSelectedContainer(container);
    } else {
      setSelectedContainer(null);
    }
    
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedContainer(null);
    setIsSearching(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Yard Management</h2>
            <p className="text-gray-600">
              Real-time container location and yard visualization
              {currentYard && (
                <span className="ml-2 text-blue-600 font-medium">
                  • {currentYard.name} ({currentYard.code})
                </span>
              )}
            </p>
          </div>
          {currentYard && (
            <div className="text-right text-sm text-gray-600">
              <div>Occupancy: {currentYard.currentOccupancy}/{currentYard.totalCapacity}</div>
              <div className="text-xs">
                {((currentYard.currentOccupancy / currentYard.totalCapacity) * 100).toFixed(1)}% utilized
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Full Height */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Search Panel - Fixed Width */}
        <div className="w-80 flex-shrink-0">
          <YardSearchPanel
            containers={filteredContainers}
            selectedContainer={selectedContainer}
            searchQuery={searchQuery}
            isSearching={isSearching}
            onContainerSearch={handleContainerSearch}
            onClearSearch={handleClearSearch}
            onContainerSelect={setSelectedContainer}
          />
        </div>

        {/* Canvas Area - Takes Remaining Space */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="h-full">
            <YardCanvas2D5
              yard={yard}
              containers={filteredContainers}
              selectedContainer={selectedContainer}
              onContainerSelect={setSelectedContainer}
            />
          </div>
        </div>
      </div>
    </div>
  );
};