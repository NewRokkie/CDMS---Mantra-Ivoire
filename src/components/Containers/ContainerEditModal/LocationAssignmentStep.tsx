import React, { useState, useEffect } from 'react';
import { MapPin, Search, Check, ChevronDown, Loader, AlertTriangle, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContainerFormData } from '../ContainerEditModal';
import { useYard } from '../../../hooks/useYard';
import { yardsService } from '../../../services/api';
import { handleError } from '../../../services/errorHandling';

interface LocationAssignmentStepProps {
  formData: ContainerFormData;
  updateFormData: (updates: Partial<ContainerFormData>) => void;
  containerStatus?: string;
}

interface LocationOption {
  id: string;
  name: string;
  section: string;
  type: string;
  capacity: number;
  occupied: number;
  stackId?: string;
  yardId?: string;
}

export const LocationAssignmentStep: React.FC<LocationAssignmentStepProps> = ({
  formData,
  updateFormData,
  containerStatus
}) => {
  const { t } = useTranslation();
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasClientPool, setHasClientPool] = useState(false);
  const [clientPoolStacks, setClientPoolStacks] = useState<string[]>([]);
  const [otherClientsStacks, setOtherClientsStacks] = useState<Set<string>>(new Set());
  const { currentYard } = useYard();

  const isLocationRestricted = containerStatus === 'gate_in';

  useEffect(() => {
    async function loadLocations() {
      if (!currentYard) {
        setLocations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { clientPoolService } = await import('../../../services/api/clientPoolService');
        let poolStacks: string[] = [];
        let hasPool = false;
        let otherStacks: Set<string> = new Set();

        if (formData.clientCode) {
          try {
            const clientPools = await clientPoolService.getAll(currentYard.id);

            const clientPool = clientPools.find(pool =>
              pool.clientCode === formData.clientCode && pool.isActive
            );

            if (clientPool && clientPool.assignedStacks.length > 0) {
              poolStacks = clientPool.assignedStacks;
              hasPool = true;
            }

            clientPools.forEach(pool => {
              if (pool.clientCode !== formData.clientCode && pool.isActive) {
                pool.assignedStacks.forEach(stackId => otherStacks.add(stackId));
              }
            });
          } catch (poolError) {
            console.warn('Could not load client pools:', poolError);
          }
        }

        setHasClientPool(hasPool);
        setClientPoolStacks(poolStacks);
        setOtherClientsStacks(otherStacks);

        const yard = yardsService.getYardById(currentYard.id);
        if (!yard) {
          throw new Error('Yard not found');
        }

        const { containerService } = await import('../../../services/api/containerService');
        const allContainers = await containerService.getAll();

        const yardContainers = allContainers.filter((c: any) => c.yardId === currentYard.id);

        let allStacks = yard.sections.flatMap(section => section.stacks);

        if (formData.size === '40ft') {
          allStacks = allStacks.filter(stack => stack.isVirtual === true);
        } else if (formData.size === '20ft') {
          allStacks = allStacks.filter(stack => !stack.isVirtual);
        }

        const allLocationOptions: LocationOption[] = [];

        for (const stack of allStacks) {
          if (hasPool && poolStacks.length > 0) {
            if (!poolStacks.includes(stack.id)) {
              continue;
            }
          } else if (formData.clientCode && otherStacks.has(stack.id)) {
            continue;
          }

          const stackContainers = yardContainers.filter((c: any) => {
            const match = c.location.match(/S0*(\d+)[-]?R\d+[-]?H\d+/);
            return match && parseInt(match[1]) === stack.stackNumber;
          });

          const occupiedPositions = new Set(
            stackContainers.map((c: any) => {
              const normalized = c.location.replace(/-/g, '').replace(/S(\d)R/, 'S0$1R');
              return normalized;
            })
          );

          for (let row = 1; row <= stack.rows; row++) {
            let maxTiersForRow = stack.maxTiers;

            if (stack.rowTierConfig && stack.rowTierConfig.length > 0) {
              const rowConfig = stack.rowTierConfig.find(config => config.row === row);
              if (rowConfig) {
                maxTiersForRow = rowConfig.maxTiers;
              }
            }

            for (let tier = 1; tier <= maxTiersForRow; tier++) {
              const locationId = `S${String(stack.stackNumber).padStart(2, '0')}R${row}H${tier}`;

              const isOccupied = occupiedPositions.has(locationId);

              if (!isOccupied || locationId === formData.location) {
                const section = yard.sections.find(s => s.id === stack.sectionId);

                allLocationOptions.push({
                  id: `${stack.id}-R${row}H${tier}`,
                  name: locationId,
                  section: section?.name || `Stack S${String(stack.stackNumber).padStart(2, '0')}`,
                  type: stack.isVirtual ? '40ft' : '20ft',
                  capacity: 1,
                  occupied: isOccupied ? 1 : 0,
                  stackId: stack.id,
                  yardId: currentYard.id
                });
              }
            }
          }
        }

        allLocationOptions.sort((a, b) => a.name.localeCompare(b.name));

        setLocations(allLocationOptions);
      } catch (error) {
        handleError(error, 'LocationAssignmentStep.loadLocations');
        setLocations([]);
      } finally {
        setLoading(false);
      }
    }

    loadLocations();
  }, [currentYard, formData.location, formData.locationId, formData.clientCode, formData.size]);

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    location.section.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const selectedLocation = locations.find(loc => loc.name === formData.location);

  const handleLocationSelect = (location: LocationOption) => {
    updateFormData({
      location: location.name,
      locationId: location.id,
      yardId: location.yardId
    });
    setIsLocationDropdownOpen(false);
    setLocationSearch('');
  };

  const getOccupancyColor = (occupied: number, capacity: number) => {
    const percentage = (occupied / capacity) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'storage': return '📦';
      case 'stack': return '🏗️';
      case 'workshop': return '🔧';
      case 'gate': return '🚪';
      default: return '📍';
    }
  };

  if (isLocationRestricted) {
    return (
      <div className="depot-step-spacing">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-lg">Location Assignment Restricted</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
                Containers with "Gate In" status can only be assigned a location through the Gate In process.
                Please use the Gate In module to assign a location to this container.
              </p>
            </div>
          </div>
        </div>

        {formData.location && (
          <div className="depot-section border-l-4 border-l-blue-500">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Current Location</h4>
                <p className="text-xs text-gray-500">Read-only</p>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-2xl font-mono text-blue-800 dark:text-blue-300">{formData.location}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                This location was assigned during the Gate In process and cannot be changed here.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentYard) {
    return (
      <div className="depot-step-spacing">
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center flex-shrink-0">
              <Warehouse className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 text-lg">No Yard Selected</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                Please select a yard from the yard selector to assign a location to this container.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="depot-step-spacing">
      {/* Main Location Selection Section */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
            <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-lg">Location Assignment</span>
              {loading && <Loader className="h-5 w-5 animate-spin text-green-600" />}
            </div>
            <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              {currentYard && `Current Yard: ${currentYard.name}`}
            </p>
          </div>
        </h4>

        <div className="space-y-4">
          <label className="label">
            Select Location <span className="text-red-500">*</span>
          </label>

          {/* Location Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-2 rounded-xl transition-all duration-300 ${
                isLocationDropdownOpen
                  ? 'border-green-500 shadow-lg shadow-green-500/20 ring-4 ring-green-500/10'
                  : formData.location
                  ? 'border-green-400 shadow-md shadow-green-400/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  formData.location ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <MapPin className={`h-5 w-5 ${formData.location ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                </div>
                <div className="text-left">
                  {formData.location ? (
                    <>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 font-mono text-lg">{formData.location}</div>
                      {selectedLocation && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                          <span>{selectedLocation.section}</span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span>{getLocationIcon(selectedLocation.type)} {selectedLocation.type}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">Select a location...</div>
                  )}
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                isLocationDropdownOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Location Dropdown */}
            {isLocationDropdownOpen && (
              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Location list */}
                <div className="max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading locations...</span>
                    </div>
                  ) : filteredLocations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">{t('common.noResults', 'No results found')}</p>
                      {locationSearch && (
                        <p className="text-xs text-gray-400 mt-1">{t('common.tryAdjustingSearch', 'Try adjusting your search')}</p>
                      )}
                    </div>
                  ) : (
                    filteredLocations.map((location) => {
                      const isSelected = formData.location === location.name;
                      const occupancyPercentage = (location.occupied / location.capacity) * 100;

                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => handleLocationSelect(location)}
                          className={`w-full text-left p-4 transition-all duration-200 group border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                            isSelected
                              ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                isSelected
                                  ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-green-100 dark:group-hover:bg-green-800 group-hover:text-green-600 dark:group-hover:text-green-400'
                              }`}>
                                <span className="text-lg">{getLocationIcon(location.type)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate font-mono">{location.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{location.section}</div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${
                                        occupancyPercentage >= 90 ? 'bg-red-500' :
                                        occupancyPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${occupancyPercentage}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium ${getOccupancyColor(location.occupied, location.capacity)}`}>
                                    {location.occupied}/{location.capacity}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0 ml-2">
                                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Location Details */}
        {selectedLocation && (
          <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <Check className="h-4 w-4 mr-2 text-green-600" />
              Location Details
            </h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Type</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{selectedLocation.type}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Section</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{selectedLocation.section}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Capacity</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{selectedLocation.capacity} containers</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Available</span>
                <span className="font-medium text-green-600 dark:text-green-400">{selectedLocation.capacity - selectedLocation.occupied} spaces</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-5">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Yard Location</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Select the physical location where this container is stored. The system tracks occupancy and optimizes yard space.
              </p>
            </div>
          </div>
        </div>

        {formData.size && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                <Warehouse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Stack Filter</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.size === '40ft' ? (
                    <><span className="font-semibold text-blue-600">40ft Container:</span> Showing virtual stacks only</>
                  ) : (
                    <><span className="font-semibold text-blue-600">20ft Container:</span> Showing physical stacks only</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Pool Info */}
      {hasClientPool && clientPoolStacks.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
              <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h5 className="font-semibold text-blue-900 dark:text-blue-100">Client Pool Active</h5>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Showing locations from your assigned stacks only ({clientPoolStacks.length} stacks)
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasClientPool && formData.clientCode && otherClientsStacks.size > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-800 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h5 className="font-semibold text-orange-900 dark:text-orange-100">No Pool Configured</h5>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Showing all unassigned stacks (stacks assigned to other clients are hidden)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
