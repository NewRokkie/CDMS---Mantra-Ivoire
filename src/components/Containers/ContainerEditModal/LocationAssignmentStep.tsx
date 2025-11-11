import React, { useState, useEffect } from 'react';
import { MapPin, Search, Check, ChevronDown, Loader, AlertTriangle } from 'lucide-react';
import { ContainerFormData } from '../ContainerEditModal';
import { useYard } from '../../../hooks/useYard';
import { locationManagementService, stackService } from '../../../services/api';
import { handleError } from '../../../services/errorHandling';

interface LocationAssignmentStepProps {
  formData: ContainerFormData;
  updateFormData: (updates: Partial<ContainerFormData>) => void;
  containerStatus?: string; // Current container status to check restrictions
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
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentYard } = useYard();
  
  // Check if location assignment is restricted for this container
  const isLocationRestricted = containerStatus === 'gate_in';

  // Fetch locations from database
  useEffect(() => {
    async function loadLocations() {
      if (!currentYard) {
        setLocations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all individual locations for the current yard
        const dbLocations = await locationManagementService.getAll({
          yardId: currentYard.id,
          isActive: true
        });

        // Transform locations to LocationOption format
        // Each location represents a specific Row×Height position
        // ONLY show available locations (not occupied)
        // Filter by container size: 40ft -> virtual stacks (even numbers), 20ft -> physical stacks (odd numbers or special)
        const locationOptions: LocationOption[] = dbLocations
          .filter(loc => {
            // Must be active
            if (!loc.isActive) return false;
            
            // Must be available (not occupied)
            // Check both the available flag and isOccupied flag for safety
            if (loc.isOccupied) return false;
            if (loc.available === false) return false;
            
            // If there's a container assigned, it's not available
            if (loc.containerId) return false;
            
            // Filter by container size
            const stackNumber = parseInt(loc.locationId.match(/S(\d+)/)?.[1] || '0');
            const isVirtualStack = loc.isVirtual === true;
            const isEvenStack = stackNumber % 2 === 0;
            const isOddStack = stackNumber % 2 === 1;
            
            // For 40ft containers: only show virtual stacks (even numbered: S04, S08, S12, etc.)
            if (formData.size === '40ft') {
              return isVirtualStack && isEvenStack;
            }
            
            // For 20ft containers: only show physical stacks (odd numbered: S01, S03, S05, etc.)
            if (formData.size === '20ft') {
              return !isVirtualStack && isOddStack;
            }
            
            // If size is not set yet, show all available locations
            return true;
          })
          .map(loc => ({
            id: loc.id,
            name: loc.locationId, // e.g., S01R1H1, S04R2H3
            section: `Stack S${loc.locationId.match(/S(\d+)/)?.[1] || ''}`,
            type: loc.isVirtual ? '40ft' : '20ft',
            capacity: 1, // Each location holds exactly 1 container
            occupied: 0, // All filtered locations are available (occupied = 0)
            stackId: loc.stackId,
            yardId: currentYard.id
          }));

        // Sort by location ID
        locationOptions.sort((a, b) => a.name.localeCompare(b.name));

        setLocations(locationOptions);
      } catch (error) {
        handleError(error, 'LocationAssignmentStep.loadLocations');
        setLocations([]);
      } finally {
        setLoading(false);
      }
    }

    loadLocations();
  }, [currentYard]);

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

  // Show restriction message for gate_in containers
  if (isLocationRestricted) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-semibold text-red-900">Location Assignment Restricted</h4>
              <p className="text-sm text-red-700 mt-1">
                Containers with "Gate In" status can only be assigned a location through the Gate In process.
                Please use the Gate In module to assign a location to this container.
              </p>
            </div>
          </div>
        </div>
        
        {formData.location && (
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-900">Current Location (Read-Only)</h4>
                <p className="text-lg font-mono text-blue-800 mt-2">{formData.location}</p>
                <p className="text-xs text-blue-600 mt-1">
                  This location was assigned during the Gate In process and cannot be changed here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentYard) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-semibold text-yellow-900">No Yard Selected</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please select a yard from the yard selector to assign a location to this container.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <h4 className="font-semibold text-green-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Location Assignment
          {loading && <Loader className="h-4 w-4 ml-2 animate-spin text-green-600" />}
        </h4>

        <div>
          <label className="block text-sm font-medium text-green-800 mb-2">
            Current Location * {currentYard && <span className="text-xs text-gray-500">({currentYard.name})</span>}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className={`w-full flex items-center justify-between p-4 bg-white border-2 rounded-xl transition-all duration-300 ${
                isLocationDropdownOpen
                  ? 'border-green-500 shadow-lg shadow-green-500/20 ring-4 ring-green-500/10'
                  : formData.location
                  ? 'border-green-400 shadow-md shadow-green-400/10'
                  : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-3">
                <MapPin className={`h-5 w-5 ${formData.location ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  {formData.location ? (
                    <>
                      <div className="font-medium text-gray-900">{formData.location}</div>
                      {selectedLocation && (
                        <div className="text-xs text-gray-500">
                          {selectedLocation.section} • {getLocationIcon(selectedLocation.type)} {selectedLocation.type}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500">Select location...</div>
                  )}
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                isLocationDropdownOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Location Dropdown */}
            {isLocationDropdownOpen && (
              <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                      <p className="text-sm">No locations found</p>
                      {locationSearch && (
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
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
                        className={`w-full text-left p-4 transition-all duration-200 group border-b border-gray-100 last:border-b-0 ${
                          isSelected
                            ? 'bg-green-50 border-l-4 border-green-500'
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={`p-2 rounded-lg transition-all duration-200 ${
                              isSelected
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600'
                            }`}>
                              <span className="text-lg">{getLocationIcon(location.type)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{location.name}</div>
                              <div className="text-sm text-gray-600">{location.section}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
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
                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
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

        {selectedLocation && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Location Details</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium text-gray-900 capitalize">{selectedLocation.type}</span>
              </div>
              <div>
                <span className="text-gray-600">Section:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedLocation.section}</span>
              </div>
              <div>
                <span className="text-gray-600">Capacity:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedLocation.capacity} containers</span>
              </div>
              <div>
                <span className="text-gray-600">Available:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedLocation.capacity - selectedLocation.occupied} spaces</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-medium text-green-900 mb-1">Location Assignment</h5>
            <p className="text-xs text-green-700">
              Select the physical location where this container is currently stored. 
              The system will track occupancy and help optimize yard space utilization.
            </p>
            {formData.size && (
              <div className="mt-2 p-2 bg-white rounded border border-green-300">
                <p className="text-xs font-medium text-green-800">
                  {formData.size === '40ft' ? (
                    <>
                      <span className="font-semibold">40ft Container:</span> Showing virtual stacks only (S04, S08, S12, S16, S20, S24, S28, etc.)
                    </>
                  ) : formData.size === '20ft' ? (
                    <>
                      <span className="font-semibold">20ft Container:</span> Showing physical stacks only (S01, S03, S05, S07, S09, S11, etc.)
                    </>
                  ) : (
                    <>Container size: {formData.size}</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
