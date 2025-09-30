import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Package, X, TrendingUp, AlertTriangle, Eye } from 'lucide-react';
import { Container } from '../../types';
import { Yard, YardStack } from '../../types/yard';
import { useAuth } from '../../hooks/useAuth';

interface YardLiveMapProps {
  yard: Yard | null;
  containers: Container[];
}

interface ContainerSlot {
  containerId: string;
  containerNumber: string;
  containerSize: '20ft' | '40ft';
  row: number;
  tier: number;
  status: 'occupied' | 'priority' | 'damaged';
}

interface StackVisualization {
  stack: YardStack;
  section: any;
  zoneName: string;
  containerSize: '20ft' | '40ft';
  isSpecialStack: boolean;
  containerSlots: ContainerSlot[];
  currentOccupancy: number;
  capacity: number;
}

export const YardLiveMap: React.FC<YardLiveMapProps> = ({ yard, containers }) => {
  const { user, canViewAllData } = useAuth();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [highlightedContainer, setHighlightedContainer] = useState<string | null>(null);
  const stackRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const zones = useMemo(() => {
    if (!yard) return [];
    return yard.sections.map((section, index) => {
      const stacks = section.stacks;
      const totalCapacity = stacks.reduce((sum, s) => sum + s.capacity, 0);
      const occupied = stacks.reduce((sum, s) => sum + s.currentOccupancy, 0);
      const zoneName = `Zone ${String.fromCharCode(65 + index)}`;
      return {
        id: section.id,
        name: zoneName,
        color: section.color || '#3b82f6',
        capacity: totalCapacity,
        occupied,
        percentage: totalCapacity > 0 ? (occupied / totalCapacity) * 100 : 0
      };
    });
  }, [yard]);

  const getStackConfiguration = (stackNumber: number): { containerSize: '20ft' | '40ft'; isSpecialStack: boolean } => {
    const isOdd = stackNumber % 2 === 1;

    if (stackNumber === 1 || stackNumber === 101 || stackNumber === 103) {
      return { containerSize: '20ft', isSpecialStack: true };
    }

    const storedConfig = localStorage.getItem(`stack-config-${stackNumber}`);
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      return {
        containerSize: config.containerSize === '40feet' ? '40ft' : '20ft',
        isSpecialStack: config.isSpecialStack || false
      };
    }

    return { containerSize: isOdd ? '20ft' : '40ft', isSpecialStack: false };
  };

  const filteredContainers = useMemo(() => {
    let filtered = containers;

    if (!canViewAllData() && user?.clientCode) {
      filtered = filtered.filter(c => c.clientCode === user.clientCode);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'damaged') {
        filtered = filtered.filter(c => c.damage && c.damage.length > 0);
      } else {
        filtered = filtered.filter(c => c.status === filterStatus);
      }
    }

    if (selectedZone !== 'all' && yard) {
      const section = yard.sections.find(s => s.id === selectedZone);
      if (section) {
        const stackNumbers = section.stacks.map(s => s.stackNumber);
        filtered = filtered.filter(c => {
          const match = c.location.match(/S(\d+)-R\d+-H\d+/);
          return match && stackNumbers.includes(parseInt(match[1]));
        });
      }
    }

    return filtered;
  }, [containers, filterStatus, selectedZone, canViewAllData, user, yard]);

  const searchedContainer = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const found = containers.find(c =>
      c.number.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return found || null;
  }, [containers, searchTerm]);

  useEffect(() => {
    if (searchedContainer) {
      setHighlightedContainer(searchedContainer.id);
      const timer = setTimeout(() => {
        setHighlightedContainer(null);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setHighlightedContainer(null);
    }
  }, [searchedContainer]);

  const scrollToContainer = () => {
    if (!searchedContainer) return;

    const match = searchedContainer.location.match(/S(\d+)-R\d+-H\d+/);
    if (match) {
      const stackNumber = parseInt(match[1]);
      const stackElement = stackRefs.current.get(stackNumber);
      if (stackElement) {
        stackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const stats = useMemo(() => {
    const total = containers.length;
    const inDepot = containers.filter(c => c.status === 'in_depot').length;
    const maintenance = containers.filter(c => c.status === 'maintenance').length;
    const damaged = containers.filter(c => c.damage && c.damage.length > 0).length;
    const occupancyRate = yard ? ((yard.currentOccupancy / yard.totalCapacity) * 100) : 0;

    return { total, inDepot, maintenance, damaged, occupancyRate };
  }, [containers, yard]);

  const stacksData = useMemo(() => {
    if (!yard) return [];

    const allStacks: StackVisualization[] = [];

    yard.sections.forEach((section, sectionIndex) => {
      const zoneName = `Zone ${String.fromCharCode(65 + sectionIndex)}`;
      section.stacks.forEach(stack => {
        const config = getStackConfiguration(stack.stackNumber);

        const stackContainers = filteredContainers.filter(c => {
          const match = c.location.match(/S(\d+)-R\d+-H\d+/);
          return match && parseInt(match[1]) === stack.stackNumber;
        });

        const containerSlots: ContainerSlot[] = stackContainers.map(c => {
          const locMatch = c.location.match(/S\d+-R(\d+)-H(\d+)/);
          const row = locMatch ? parseInt(locMatch[1]) : 1;
          const tier = locMatch ? parseInt(locMatch[2]) : 1;

          let status: ContainerSlot['status'] = 'occupied';
          if (c.damage && c.damage.length > 0) status = 'damaged';
          else if (c.status === 'maintenance') status = 'priority';

          return {
            containerId: c.id,
            containerNumber: c.number,
            containerSize: c.size,
            row,
            tier,
            status
          };
        });

        const actualCapacity = config.containerSize === '40ft' && !config.isSpecialStack
          ? Math.floor(stack.rows / 2) * stack.maxTiers
          : stack.rows * stack.maxTiers;

        allStacks.push({
          stack,
          section,
          zoneName,
          containerSize: config.containerSize,
          isSpecialStack: config.isSpecialStack,
          containerSlots,
          currentOccupancy: containerSlots.length,
          capacity: actualCapacity
        });
      });
    });

    return allStacks.sort((a, b) => a.stack.stackNumber - b.stack.stackNumber);
  }, [yard, filteredContainers]);

  const stackContainers = useMemo(() => {
    if (!selectedStack) return [];
    return filteredContainers.filter(c => {
      const match = c.location.match(/S(\d+)-R\d+-H\d+/);
      return match && parseInt(match[1]) === selectedStack.stackNumber;
    });
  }, [selectedStack, filteredContainers]);

  const handleSlotClick = (slot: ContainerSlot) => {
    const container = containers.find(c => c.id === slot.containerId);
    if (container) {
      setSelectedContainer(container);
      setSelectedStack(null);
    }
  };

  const handleStackClick = (stackViz: StackVisualization) => {
    setSelectedStack(stackViz.stack);
    setSelectedContainer(null);
  };

  const getSlotColor = (slot: ContainerSlot, isHighlighted: boolean) => {
    if (isHighlighted) return 'bg-yellow-400 border-yellow-600 animate-pulse';
    if (selectedContainer?.id === slot.containerId) return 'bg-yellow-400 border-yellow-600';

    switch (slot.status) {
      case 'occupied': return 'bg-blue-500 border-blue-600';
      case 'priority': return 'bg-orange-500 border-orange-600';
      case 'damaged': return 'bg-red-500 border-red-600';
      default: return 'bg-blue-500 border-blue-600';
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const renderStackSlots = (stackViz: StackVisualization) => {
    const { stack, containerSize, isSpecialStack, containerSlots } = stackViz;

    if (isSpecialStack || containerSize === '20ft') {
      return (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${stack.rows}, minmax(0, 1fr))` }}>
          {Array.from({ length: stack.maxTiers * stack.rows }).map((_, idx) => {
            const tier = Math.floor(idx / stack.rows) + 1;
            const row = (idx % stack.rows) + 1;
            const slot = containerSlots.find(s => s.row === row && s.tier === tier);
            const isHighlighted = slot && slot.containerId === highlightedContainer;

            return (
              <div
                key={idx}
                className={`aspect-square rounded border-2 transition-all cursor-pointer hover:scale-110 ${
                  slot
                    ? getSlotColor(slot, isHighlighted || false)
                    : 'bg-gray-200 border-gray-300'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (slot) handleSlotClick(slot);
                }}
                title={slot ? `${slot.containerNumber} - ${containerSize}` : `Empty - R${row} H${tier}`}
              />
            );
          })}
        </div>
      );
    } else {
      const positions40ft = Math.floor(stack.rows / 2);
      return (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${positions40ft}, minmax(0, 1fr))` }}>
          {Array.from({ length: stack.maxTiers * positions40ft }).map((_, idx) => {
            const tier = Math.floor(idx / positions40ft) + 1;
            const position = (idx % positions40ft) + 1;
            const baseRow = (position - 1) * 2 + 1;

            const slot = containerSlots.find(s =>
              (s.row === baseRow || s.row === baseRow + 1) && s.tier === tier && s.containerSize === '40ft'
            );
            const isHighlighted = slot && slot.containerId === highlightedContainer;

            return (
              <div
                key={idx}
                className={`aspect-[2/1] rounded border-2 transition-all cursor-pointer hover:scale-105 ${
                  slot
                    ? getSlotColor(slot, isHighlighted || false)
                    : 'bg-gray-200 border-gray-300'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (slot) handleSlotClick(slot);
                }}
                title={slot ? `${slot.containerNumber} - 40ft` : `Empty 40ft - Pos${position} H${tier}`}
              />
            );
          })}
        </div>
      );
    }
  };

  if (!yard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No yard selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <MapPin className="h-6 w-6 mr-3 text-blue-600" />
              {yard.name} - Live Map
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {yard.code} • Capacity: {yard.currentOccupancy}/{yard.totalCapacity} ({stats.occupancyRate.toFixed(1)}%)
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-gray-700">Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded" />
              <span>Empty</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span>Priority</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Damaged</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-4 py-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-600 font-medium uppercase">Total Containers</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</div>
              </div>
              <Package className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-4 py-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-green-600 font-medium uppercase">In Depot</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{stats.inDepot}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg px-4 py-3 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-orange-600 font-medium uppercase">Maintenance</div>
                <div className="text-2xl font-bold text-orange-900 mt-1">{stats.maintenance}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg px-4 py-3 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-600 font-medium uppercase">Damaged</div>
                <div className="text-2xl font-bold text-red-900 mt-1">{stats.damaged}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search container number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchedContainer && (
              <div className="absolute top-full left-0 mt-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 shadow-lg z-10 flex items-center gap-2">
                <div>
                  <p className="text-xs text-green-700 font-medium">Found: {searchedContainer.location}</p>
                  <p className="text-xs text-green-600">{searchedContainer.size} • {searchedContainer.type}</p>
                </div>
                <button
                  onClick={scrollToContainer}
                  className="ml-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  View
                </button>
              </div>
            )}
            {searchTerm && !searchedContainer && (
              <div className="absolute top-full left-0 mt-1 bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700 whitespace-nowrap z-10">
                Container not found
              </div>
            )}
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Zones</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.percentage.toFixed(0)}%)
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="in_depot">In Depot</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {stacksData.map((stackViz) => {
            const occupancyPercent = (stackViz.currentOccupancy / stackViz.capacity) * 100;
            const hasHighlightedContainer = stackViz.containerSlots.some(slot => slot.containerId === highlightedContainer);

            return (
              <div
                key={stackViz.stack.id}
                ref={(el) => {
                  if (el) stackRefs.current.set(stackViz.stack.stackNumber, el);
                }}
                className={`bg-white rounded-lg border-2 transition-all overflow-hidden cursor-pointer ${
                  hasHighlightedContainer
                    ? 'border-yellow-500 shadow-lg ring-2 ring-yellow-300'
                    : 'border-gray-200 hover:border-blue-400'
                }`}
                onClick={() => handleStackClick(stackViz)}
              >
                <div
                  className="px-3 py-2 border-b"
                  style={{ backgroundColor: `${stackViz.section.color}15`, borderColor: stackViz.section.color }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-base">S{stackViz.stack.stackNumber.toString().padStart(2, '0')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      stackViz.containerSize === '40ft' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {stackViz.containerSize}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(occupancyPercent)}`}
                      style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-gray-600 mt-1">
                    {stackViz.currentOccupancy}/{stackViz.capacity} ({occupancyPercent.toFixed(0)}%)
                  </div>
                </div>

                <div className="p-3">
                  {renderStackSlots(stackViz)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContainer(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Container Details</h3>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Container Number</label>
                <p className="font-mono text-lg font-bold text-gray-900 mt-1">{selectedContainer.number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{selectedContainer.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Size</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedContainer.size}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Client</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContainer.client}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Location</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContainer.location}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    selectedContainer.status === 'in_depot' ? 'bg-green-100 text-green-800' :
                    selectedContainer.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                    selectedContainer.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedContainer.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedContainer.damage && selectedContainer.damage.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Damage Report</label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    {selectedContainer.damage.map((d, i) => (
                      <p key={i} className="text-sm text-red-700 flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                        {d}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.gateInDate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Gate In Date</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedContainer.gateInDate).toLocaleDateString()} {new Date(selectedContainer.gateInDate).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedContainer(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStack && !selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStack(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Stack S{selectedStack.stackNumber.toString().padStart(2, '0')} Details</h3>
              <button
                onClick={() => setSelectedStack(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Rows</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStack.rows}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Max Tiers</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStack.maxTiers}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase block mb-2">Occupancy</label>
                  <p className="text-sm text-gray-900 mb-2">
                    {selectedStack.currentOccupancy} / {selectedStack.capacity} containers
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        getProgressBarColor((selectedStack.currentOccupancy / selectedStack.capacity) * 100)
                      }`}
                      style={{ width: `${Math.min((selectedStack.currentOccupancy / selectedStack.capacity) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((selectedStack.currentOccupancy / selectedStack.capacity) * 100).toFixed(1)}% occupied
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 min-h-0">
              <h4 className="font-bold text-gray-900 mb-3">Containers in this Stack ({stackContainers.length})</h4>
              {stackContainers.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Container
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stackContainers.map((container) => {
                        const match = container.location.match(/S\d+-R(\d+)-H(\d+)/);
                        const position = match ? `R${match[1]} H${match[2]}` : '-';

                        return (
                          <tr
                            key={container.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedContainer(container);
                              setSelectedStack(null);
                            }}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-mono text-sm font-medium text-gray-900">
                                {container.number}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {position}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {container.client}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {container.type} • {container.size}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                container.status === 'in_depot' ? 'bg-green-100 text-green-800' :
                                container.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                                container.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {container.status.replace('_', ' ')}
                              </span>
                              {container.damage && container.damage.length > 0 && (
                                <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                  Damaged
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No containers in this stack
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setSelectedStack(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
