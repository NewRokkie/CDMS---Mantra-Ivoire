import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ZoomIn, ZoomOut, RotateCcw, MapPin, Package, TrendingUp, AlertTriangle, Eye, Grid3x3 as Grid3X3, Layers, Map as MapIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { useLanguage } from '../../hooks/useLanguage';
import { YardGrid } from './YardGrid';
import { YardStats } from './YardStats';
import { ContainerSearchPanel } from './ContainerSearchPanel';
import { YardZoneSelector } from './YardZoneSelector';
import { YardLegend } from './YardLegend';
import { YardControlPanel } from './YardControlPanel';
import { Container } from '../../types';
import { yardService } from '../../services/yardService';
import { clientPoolService } from '../../services/clientPoolService';

// Enhanced mock container data with precise positioning
const generateMockContainers = (): Container[] => {
  const containers: Container[] = [];
  const containerNumbers = [
    'MSKU1234567', 'TCLU9876543', 'GESU4567891', 'SHIP1112228', 'SHIP3334449',
    'MAEU5556664', 'CMDU7890125', 'HLCU3456789', 'SNFW2940740', 'MAEU7778881',
    'MSCU9990002', 'CMDU1113335', 'SHIP4445556', 'HLCU6667778', 'MSKU8889990',
    'TCLU1112223', 'GESU3334445', 'MAEU5556667', 'CMDU7778889', 'SHIP9990001',
    'HLCU2223334', 'SNFW4445556', 'MSCU6667778', 'MSKU8889991', 'TCLU1112224'
  ];

  const containerTypes: Container['type'][] = ['standard', 'reefer', 'tank', 'flat_rack', 'open_top'];
  const containerSizes: Container['size'][] = ['20ft', '40ft'];
  const containerStatuses: Container['status'][] = ['in_depot', 'maintenance', 'cleaning'];
  const clients = ['Maersk Line', 'MSC Mediterranean Shipping', 'CMA CGM', 'Shipping Solutions Inc', 'Hapag-Lloyd'];
  const clientCodes = ['MAEU', 'MSCU', 'CMDU', 'SHIP001', 'HLCU'];

  // Generate containers with specific stack positions
  const stackNumbers = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101, 103];

  containerNumbers.forEach((number, index) => {
    const stackNumber = stackNumbers[index % stackNumbers.length];
    const row = Math.floor(Math.random() * 4) + 1; // 1-4 rows
    const tier = Math.floor(Math.random() * 3) + 1; // 1-3 tiers
    const clientIndex = index % clients.length;
    
    containers.push({
      id: `container-${index + 1}`,
      number: number,
      type: containerTypes[Math.floor(Math.random() * containerTypes.length)],
      size: containerSizes[Math.floor(Math.random() * containerSizes.length)],
      status: containerStatuses[Math.floor(Math.random() * containerStatuses.length)],
      location: `Stack S${stackNumber.toString().padStart(2, '0')}-Row ${row}-Tier ${tier}`,
      gateInDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      client: clients[clientIndex],
      clientCode: clientCodes[clientIndex],
      clientId: `client-${clientIndex + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'System',
      updatedBy: 'System',
      damage: Math.random() > 0.8 ? ['Minor scratches'] : undefined,
      yardPosition: {
        id: `pos-${index + 1}`,
        yardId: 'depot-tantarelli',
        sectionId: stackNumber <= 31 ? 'section-top' : stackNumber <= 55 ? 'section-center' : 'section-bottom',
        stackId: `stack-${stackNumber}`,
        row: row,
        bay: 1,
        tier: tier,
        position: { x: stackNumber * 15, y: row * 10, z: tier * 3 },
        isOccupied: true,
        containerId: `container-${index + 1}`,
        containerNumber: number,
        containerSize: containerSizes[Math.floor(Math.random() * containerSizes.length)],
        clientCode: clientCodes[clientIndex],
        placedAt: new Date()
      }
    });
  });

  return containers;
};

export const YardManagement: React.FC = () => {
  const { user, canViewAllData, getClientFilter } = useAuth();
  const { currentYard } = useYard();
  const { t } = useLanguage();
  
  // State management
  const [containers] = useState<Container[]>(generateMockContainers());
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_depot' | 'maintenance' | 'cleaning' | 'damaged'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLegend, setShowLegend] = useState(true);

  // Filter containers based on user permissions and filters
  const filteredContainers = useMemo(() => {
    let filtered = containers;

    // Apply user permission filter
    const userClientFilter = getClientFilter();
    if (userClientFilter) {
      filtered = filtered.filter(container => 
        container.clientCode === userClientFilter ||
        container.client === user?.company
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(container =>
        container.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'damaged') {
        filtered = filtered.filter(container => container.damage && container.damage.length > 0);
      } else {
        filtered = filtered.filter(container => container.status === statusFilter);
      }
    }

    // Apply client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(container => container.clientCode === clientFilter);
    }

    // Apply zone filter (based on stack sections)
    if (selectedZone !== 'all') {
      filtered = filtered.filter(container => {
        const stackMatch = container.location.match(/Stack S(\d+)/);
        if (stackMatch) {
          const stackNumber = parseInt(stackMatch[1]);
          switch (selectedZone) {
            case 'top': return stackNumber <= 31;
            case 'center': return stackNumber > 31 && stackNumber <= 55;
            case 'bottom': return stackNumber > 55;
            default: return true;
          }
        }
        return true;
      });
    }

    return filtered;
  }, [containers, searchTerm, statusFilter, clientFilter, selectedZone, getClientFilter, user?.company]);

  // Calculate yard statistics
  const yardStats = useMemo(() => {
    const totalContainers = filteredContainers.length;
    const inDepot = filteredContainers.filter(c => c.status === 'in_depot').length;
    const maintenance = filteredContainers.filter(c => c.status === 'maintenance').length;
    const cleaning = filteredContainers.filter(c => c.status === 'cleaning').length;
    const damaged = filteredContainers.filter(c => c.damage && c.damage.length > 0).length;
    const totalCapacity = currentYard?.totalCapacity || 2500;
    const occupancyRate = (totalContainers / totalCapacity) * 100;
    const totalStacks = currentYard?.sections.reduce((sum, section) => sum + section.stacks.length, 0) || 0;

    return {
      totalContainers,
      inDepot,
      maintenance,
      cleaning,
      damaged,
      occupancyRate,
      totalStacks
    };
  }, [filteredContainers, currentYard]);

  // Get unique clients for filter
  const uniqueClients = useMemo(() => {
    const clients = containers.map(c => ({ code: c.clientCode, name: c.client }));
    const uniqueMap = new Map();
    clients.forEach(client => uniqueMap.set(client.code, client));
    return Array.from(uniqueMap.values());
  }, [containers]);

  // Handle container selection
  const handleContainerSelect = (container: Container | null) => {
    setSelectedContainer(container);
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Auto-focus on first result if searching
    if (term && filteredContainers.length > 0) {
      setSelectedContainer(filteredContainers[0]);
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setSelectedContainer(null);
    setSearchTerm('');
  };

  // Show client notice for restricted users
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <MapIcon className="h-6 w-6 mr-3 text-blue-600" />
              {t('yard.title')}
            </h1>
            {currentYard && (
              <p className="text-sm text-gray-600 mt-1">
                {currentYard.name} ({currentYard.code}) • {currentYard.location}
              </p>
            )}
            {showClientNotice && (
              <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  You are viewing containers for <strong>{user?.company}</strong> only.
                </p>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-4">
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
                <Layers className="h-4 w-4" />
                <span>Detailed</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Search and Filters */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search Panel */}
          <div className="p-6 border-b border-gray-200">
            <ContainerSearchPanel
              containers={filteredContainers}
              searchTerm={searchTerm}
              onSearch={handleSearch}
              selectedContainer={selectedContainer}
              onContainerSelect={handleContainerSelect}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              clientFilter={clientFilter}
              onClientFilterChange={setClientFilter}
              uniqueClients={uniqueClients}
              canViewAllData={canViewAllData()}
            />
          </div>

          {/* Zone Selector */}
          <div className="p-6 border-b border-gray-200">
            <YardZoneSelector
              selectedZone={selectedZone}
              onZoneChange={setSelectedZone}
              containers={filteredContainers}
            />
          </div>

          {/* Yard Statistics */}
          <div className="flex-1 p-6 overflow-y-auto">
            <YardStats
              stats={yardStats}
              currentYard={currentYard}
            />
          </div>
        </div>

        {/* Main Yard View */}
        <div className="flex-1 flex flex-col">
          {/* Control Panel */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <YardControlPanel
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              showLegend={showLegend}
              onToggleLegend={() => setShowLegend(!showLegend)}
              selectedContainer={selectedContainer}
              totalContainers={filteredContainers.length}
            />
          </div>

          {/* Yard Grid */}
          <div className="flex-1 relative bg-gray-100">
            <YardGrid
              yard={currentYard}
              containers={filteredContainers}
              selectedContainer={selectedContainer}
              onContainerSelect={handleContainerSelect}
              zoomLevel={zoomLevel}
              viewMode={viewMode}
              selectedZone={selectedZone}
            />

            {/* Legend Overlay */}
            {showLegend && (
              <div className="absolute top-4 right-4 z-10">
                <YardLegend />
              </div>
            )}

            {/* Selected Container Info Overlay */}
            {selectedContainer && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{selectedContainer.number}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedContainer.client} • {selectedContainer.type} • {selectedContainer.size}
                        </p>
                        <p className="text-xs text-gray-500">{selectedContainer.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        selectedContainer.status === 'in_depot' ? 'bg-green-100 text-green-800' :
                        selectedContainer.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                        selectedContainer.status === 'cleaning' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedContainer.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {selectedContainer.damage && selectedContainer.damage.length > 0 && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          DAMAGED
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedContainer(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};