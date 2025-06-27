import React, { useState } from 'react';
import { YardCanvas2D5 } from './YardCanvas2D5';
import { YardSearchPanel } from './YardSearchPanel';
import { Yard, Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';

// Mock containers with specific positions in the Tantarelli yard
const mockContainers: Container[] = [
  // Stack S1 containers
  {
    id: 'c1',
    number: 'MSKU-123456-7',
    type: 'dry',
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
    type: 'dry',
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
    type: 'dry',
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
    type: 'dry',
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
    type: 'dry',
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

  const yard = createTantarelliYard();
  const clientFilter = getClientFilter();

  // Filter containers based on user permissions
  const getFilteredContainers = () => {
    let containers = mockContainers;
    
    if (clientFilter) {
      containers = containers.filter(container => 
        container.clientCode === clientFilter || 
        container.client.toLowerCase().includes(clientFilter.toLowerCase())
      );
    }
    
    return containers;
  };

  const filteredContainers = getFilteredContainers();

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
    <div className="fixed inset-0 bg-gray-900 flex">
      {/* Search Panel - Fixed on the left */}
      <div className="w-80 bg-white shadow-lg z-10 flex flex-col">
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

      {/* 2.5D Yard Canvas - Takes remaining space */}
      <div className="flex-1">
        <YardCanvas2D5
          yard={yard}
          containers={filteredContainers}
          selectedContainer={selectedContainer}
          onContainerSelect={setSelectedContainer}
        />
      </div>
    </div>
  );
};