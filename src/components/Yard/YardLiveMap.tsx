import React, { useState, useMemo } from 'react';
import { Search, MapPin, Package, AlertCircle, X } from 'lucide-react';
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

  const stackContainers = useMemo(() => {
    if (!selectedStack) return [];
    return filteredContainers.filter(c => {
      const match = c.location.match(/Stack S(\d+)/);
      return match && parseInt(match[1]) === selectedStack.stackNumber;
    });
  }, [selectedStack, filteredContainers]);

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

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search container..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Zones</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
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

          <div className="flex gap-2 ml-auto">
            <div className="bg-blue-50 rounded-lg px-4 py-2 text-center min-w-[100px]">
              <div className="text-xs text-blue-600 font-medium">Total</div>
              <div className="text-xl font-bold text-blue-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg px-4 py-2 text-center min-w-[100px]">
              <div className="text-xs text-green-600 font-medium">In Depot</div>
              <div className="text-xl font-bold text-green-900">{stats.inDepot}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {stacksData.map(({ stack, section, slots }) => {
              const occupancyPercent = (stack.currentOccupancy / stack.capacity) * 100;

              return (
                <div
                  key={stack.id}
                  className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden cursor-pointer"
                  onClick={() => handleStackClick(stack)}
                >
                  <div
                    className="px-3 py-2 border-b"
                    style={{ backgroundColor: `${section.color}15`, borderColor: section.color }}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <span className="font-bold text-lg">S{stack.stackNumber.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          occupancyPercent > 80 ? 'bg-red-500' :
                          occupancyPercent > 50 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-center text-gray-600 mt-1">
                      {occupancyPercent.toFixed(0)}%
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${stack.rows}, minmax(0, 1fr))` }}>
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
                          title={slot.container ? `${slot.container.number} - R${slot.row} T${slot.tier}` : `Empty - R${slot.row} T${slot.tier}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Zone Statistics</h2>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-4">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedZone === zone.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{zone.name}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                </div>
                <div className="text-sm text-gray-600 mb-2">
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
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex items-center text-orange-800 mb-2">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="font-semibold text-sm">Maintenance Required</span>
                </div>
                <p className="text-sm text-orange-700">
                  {stats.maintenance} container{stats.maintenance > 1 ? 's' : ''} in maintenance
                </p>
              </div>
            )}

            {stats.damaged > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="font-semibold text-sm">Damaged Containers</span>
                </div>
                <p className="text-sm text-red-700">
                  {stats.damaged} damaged container{stats.damaged > 1 ? 's' : ''} require attention
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContainer(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
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
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Stack S{selectedStack.stackNumber.toString().padStart(2, '0')} Details</h3>
              <button
                onClick={() => setSelectedStack(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200">
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
                  <label className="text-xs font-medium text-gray-500 uppercase">Occupancy</label>
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
            </div>

            <div className="flex-1 overflow-auto p-6">
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
                        const match = container.location.match(/Row (\d+)-Tier (\d+)/);
                        const position = match ? `R${match[1]} T${match[2]}` : '-';

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

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
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
