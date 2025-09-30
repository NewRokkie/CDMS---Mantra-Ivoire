import React, { useState, useMemo } from 'react';
import { Search, MapPin, Package, AlertCircle, Filter, X } from 'lucide-react';
import { Container } from '../../types';
import { Yard, YardStack } from '../../types/yard';
import { useAuth } from '../../hooks/useAuth';

interface YardLiveMapProps {
  yard: Yard | null;
  containers: Container[];
}

interface StackSlot {
  stackNumber: number;
  row: number;
  tier: number;
  container: Container | null;
  status: 'empty' | 'occupied' | 'priority' | 'damaged';
}

export const YardLiveMap: React.FC<YardLiveMapProps> = ({ yard, containers }) => {
  const { user, canViewAllData } = useAuth();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const zones = useMemo(() => {
    if (!yard) return [];
    return yard.sections.map(section => {
      const stacks = section.stacks;
      const totalCapacity = stacks.reduce((sum, s) => sum + s.capacity, 0);
      const occupied = stacks.reduce((sum, s) => sum + s.currentOccupancy, 0);
      return {
        id: section.id,
        name: section.name,
        color: section.color || '#3b82f6',
        capacity: totalCapacity,
        occupied,
        percentage: totalCapacity > 0 ? (occupied / totalCapacity) * 100 : 0
      };
    });
  }, [yard]);

  const filteredContainers = useMemo(() => {
    let filtered = containers;

    if (!canViewAllData() && user?.clientCode) {
      filtered = filtered.filter(c => c.clientCode === user.clientCode);
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.client.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
          const match = c.location.match(/Stack S(\d+)/);
          return match && stackNumbers.includes(parseInt(match[1]));
        });
      }
    }

    return filtered;
  }, [containers, searchTerm, filterStatus, selectedZone, canViewAllData, user, yard]);

  const stats = useMemo(() => {
    const total = filteredContainers.length;
    const inDepot = filteredContainers.filter(c => c.status === 'in_depot').length;
    const maintenance = filteredContainers.filter(c => c.status === 'maintenance').length;
    const damaged = filteredContainers.filter(c => c.damage && c.damage.length > 0).length;
    const occupancyRate = yard ? ((yard.currentOccupancy / yard.totalCapacity) * 100) : 0;

    return { total, inDepot, maintenance, damaged, occupancyRate };
  }, [filteredContainers, yard]);

  const stacksData = useMemo(() => {
    if (!yard) return [];

    const allStacks: { stack: YardStack; section: any; slots: StackSlot[] }[] = [];

    yard.sections.forEach(section => {
      section.stacks.forEach(stack => {
        const slots: StackSlot[] = [];

        for (let tier = stack.maxTiers; tier >= 1; tier--) {
          for (let row = 1; row <= stack.rows; row++) {
            const container = filteredContainers.find(c => {
              const match = c.location.match(/Stack S(\d+)-Row (\d+)-Tier (\d+)/);
              return match &&
                parseInt(match[1]) === stack.stackNumber &&
                parseInt(match[2]) === row &&
                parseInt(match[3]) === tier;
            });

            let status: StackSlot['status'] = 'empty';
            if (container) {
              if (container.damage && container.damage.length > 0) status = 'damaged';
              else if (container.status === 'maintenance') status = 'priority';
              else status = 'occupied';
            }

            slots.push({ stackNumber: stack.stackNumber, row, tier, container: container || null, status });
          }
        }

        allStacks.push({ stack, section, slots });
      });
    });

    return allStacks.sort((a, b) => a.stack.stackNumber - b.stack.stackNumber);
  }, [yard, filteredContainers]);

  const handleSlotClick = (slot: StackSlot) => {
    if (slot.container) {
      setSelectedContainer(slot.container);
      setSelectedStack(null);
    }
  };

  const handleStackClick = (stack: YardStack) => {
    setSelectedStack(stack);
    setSelectedContainer(null);
  };

  const getSlotColor = (status: StackSlot['status'], isSelected: boolean) => {
    if (isSelected) return 'bg-yellow-400 border-yellow-600';
    switch (status) {
      case 'empty': return 'bg-gray-200 border-gray-300';
      case 'occupied': return 'bg-blue-500 border-blue-600';
      case 'priority': return 'bg-orange-500 border-orange-600';
      case 'damaged': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-200 border-gray-300';
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
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-blue-600" />
              {yard.name} - Live Map
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {yard.code} • Capacity: {yard.currentOccupancy}/{yard.totalCapacity} ({stats.occupancyRate.toFixed(1)}%)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex items-center gap-1 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-3 bg-gray-200 rounded mr-1" />
                <span>Empty</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-3 bg-orange-500 rounded mr-1" />
                <span>Priority</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-3 bg-red-500 rounded mr-1" />
                <span>Damaged</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search container..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="in_depot">In Depot</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
            <option value="damaged">Damaged</option>
          </select>

          <div className="col-span-1 md:col-span-3 lg:col-span-2 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg px-3 py-2">
              <div className="text-xs text-blue-600 font-medium">Total</div>
              <div className="text-lg font-bold text-blue-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2">
              <div className="text-xs text-green-600 font-medium">In Depot</div>
              <div className="text-lg font-bold text-green-900">{stats.inDepot}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4">
            {stacksData.map(({ stack, section, slots }) => {
              const occupancyPercent = (stack.currentOccupancy / stack.capacity) * 100;

              return (
                <div
                  key={stack.id}
                  className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden cursor-pointer"
                  onClick={() => handleStackClick(stack)}
                >
                  <div
                    className="px-2 md:px-3 py-2 border-b"
                    style={{ backgroundColor: `${section.color}15`, borderColor: section.color }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs md:text-sm">S{stack.stackNumber.toString().padStart(2, '0')}</span>
                      <span className="text-xs text-gray-600">{stack.currentOccupancy}/{stack.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          occupancyPercent > 80 ? 'bg-red-500' :
                          occupancyPercent > 50 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-1 md:p-2">
                    <div className="grid gap-0.5 md:gap-1" style={{ gridTemplateColumns: `repeat(${stack.rows}, minmax(0, 1fr))` }}>
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className={`aspect-square rounded border-2 transition-all cursor-pointer hover:scale-110 ${
                            getSlotColor(slot.status, selectedContainer?.id === slot.container?.id)
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSlotClick(slot);
                          }}
                          title={slot.container ? `${slot.container.number} - Row ${slot.row} Tier ${slot.tier}` : `Empty - Row ${slot.row} Tier ${slot.tier}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-bold text-gray-900">Zone Statistics</h2>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all ${
                  selectedZone === zone.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm md:text-base text-gray-900">{zone.name}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                </div>
                <div className="text-xs md:text-sm text-gray-600 mb-2">
                  {zone.occupied} / {zone.capacity} containers
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${zone.percentage}%`,
                      backgroundColor: zone.color
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {zone.percentage.toFixed(1)}% occupied
                </div>
              </button>
            ))}

            {stats.maintenance > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 md:p-4">
                <div className="flex items-center text-orange-800 mb-2">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="font-semibold text-sm">Maintenance Required</span>
                </div>
                <p className="text-xs md:text-sm text-orange-700">
                  {stats.maintenance} container{stats.maintenance > 1 ? 's' : ''} in maintenance
                </p>
              </div>
            )}

            {stats.damaged > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 md:p-4">
                <div className="flex items-center text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="font-semibold text-sm">Damaged Containers</span>
                </div>
                <p className="text-xs md:text-sm text-red-700">
                  {stats.damaged} damaged container{stats.damaged > 1 ? 's' : ''} require attention
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContainer(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
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

            <div className="space-y-4">
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

            <button
              onClick={() => setSelectedContainer(null)}
              className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedStack && !selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStack(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Stack S{selectedStack.stackNumber.toString().padStart(2, '0')}</h3>
              <button
                onClick={() => setSelectedStack(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Rows</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStack.rows}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Max Tiers</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStack.maxTiers}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Capacity</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedStack.currentOccupancy} / {selectedStack.capacity} containers
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="h-3 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${(selectedStack.currentOccupancy / selectedStack.capacity) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((selectedStack.currentOccupancy / selectedStack.capacity) * 100).toFixed(1)}% occupied
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedStack(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
