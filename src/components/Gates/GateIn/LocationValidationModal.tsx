import React, { useState } from 'react';
import { X, Save, Loader, Package, MapPin, Calendar, Clock, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { DatePicker } from '../../Common/DatePicker';
import { TimePicker } from '../../Common/TimePicker';
import { useAuth } from '../../../hooks/useAuth';

interface LocationData {
  id: string;
  name: string;
  capacity: number;
  available: number;
  section: string;
}

interface LocationValidationOperation {
  id: string;
  date: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerQuantity: number;
  status: 'FULL' | 'EMPTY';
  isDamaged: boolean;
  bookingReference?: string;
  clientCode: string;
  clientName: string;
  truckNumber: string;
  driverName: string;
  transportCompany: string;
  operationStatus: 'pending' | 'completed';
}

interface LocationValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: LocationValidationOperation | null;
  onComplete: (operation: LocationValidationOperation, locationData: any) => void;
  isProcessing: boolean;
  mockLocations: {
    '20ft': LocationData[];
    '40ft': LocationData[];
    damage: LocationData[];
  };
}

export const LocationValidationModal: React.FC<LocationValidationModalProps> = ({
  isOpen,
  onClose,
  operation,
  onComplete,
  isProcessing,
  mockLocations
}) => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [truckDepartureDate, setTruckDepartureDate] = useState('');
  const [truckDepartureTime, setTruckDepartureTime] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [error, setError] = useState<string>('');

  const { user } = useAuth();
  const canManageTimeTracking = user?.role === 'admin';

  // Auto-assign damage stack for damaged containers
  React.useEffect(() => {
    if (operation?.isDamaged) {
      setSelectedLocation('DMG-VIRTUAL');
    }
  }, [operation?.isDamaged]);

  // Reset form when modal opens/closes or operation changes
  React.useEffect(() => {
    if (!isOpen || !operation) {
      setSelectedLocation('');
      // Set default system date and time
      const now = new Date();
      setTruckDepartureDate(now.toISOString().split('T')[0]);
      setTruckDepartureTime(now.toTimeString().slice(0, 5));
      setSearchLocation('');
      setError('');
    } else if (isOpen && operation) {
      // Initialize with current system date/time when opening
      const now = new Date();
      setTruckDepartureDate(now.toISOString().split('T')[0]);
      setTruckDepartureTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen, operation]);

  if (!isOpen || !operation) return null;

  const availableLocations = operation.isDamaged
    ? mockLocations.damage
    : mockLocations[operation.containerSize as '20ft' | '40ft'] || [];

  const filteredLocations = availableLocations.filter((loc: LocationData) =>
    loc.name.toLowerCase().includes(searchLocation.toLowerCase())
  );

  const handleComplete = () => {
    setError('');

    if (!selectedLocation) {
      setError('Please select a location for the container.');
      return;
    }

    const locationData = {
      assignedLocation: selectedLocation,
      truckDepartureDate: truckDepartureDate || new Date().toISOString().split('T')[0],
      truckDepartureTime: truckDepartureTime || new Date().toTimeString().slice(0, 5)
    };

    onComplete(operation, locationData);
  };

  const isFormValid = selectedLocation;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-in-up mx-2 sm:mx-0">

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Location & Validation</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Assign location for operation {operation.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6">

            {/* Operation Summary */}
            <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Package className="h-5 w-5" />
                </div>
                <h4 className="text-base sm:text-lg font-semibold text-blue-900">Operation Details</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Container:</span>
                  <div className="font-bold text-gray-900 text-sm sm:text-base break-all">{operation.containerNumber}</div>
                  {operation.secondContainerNumber && (
                    <div className="font-bold text-gray-900 text-sm sm:text-base break-all">{operation.secondContainerNumber}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Size & Quantity:</span>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {operation.containerSize} • Qty: {operation.containerQuantity}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Client:</span>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {operation.clientCode} - {operation.clientName}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Status:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {operation.status}
                    </span>
                    {operation.isDamaged && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Damaged
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-1 lg:col-span-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Driver:</span>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{operation.driverName}</div>
                </div>
                <div className="space-y-1 sm:col-span-1 lg:col-span-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Truck:</span>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{operation.truckNumber}</div>
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <span className="text-xs sm:text-sm text-blue-700 font-medium">Transport Company:</span>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{operation.transportCompany}</div>
                </div>
                {operation.bookingReference && (
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs sm:text-sm text-blue-700 font-medium">Booking Reference:</span>
                    <div className="font-medium text-gray-900 text-sm sm:text-base break-all">{operation.bookingReference}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Assignment */}
            <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-600 text-white rounded-lg">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-green-900">
                    {operation.isDamaged ? 'Auto-Assigned to Damage Stack' : 'Stack Selection'}
                  </h4>
                  <p className="text-xs sm:text-sm text-green-700">
                    {operation.isDamaged
                      ? 'Container automatically assigned for inspection'
                      : 'Choose the best available stack location'
                    }
                  </p>
                </div>
              </div>

              {!operation.isDamaged && (
                <div className="mb-3 sm:mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search stacks..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="form-input pl-10 w-full py-3 sm:py-2"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-48 sm:max-h-64 overflow-y-auto scrollbar-thin">
                {filteredLocations.map((location: LocationData) => (
                  <div
                    key={location.id}
                    onClick={() => !operation.isDamaged && setSelectedLocation(location.id)}
                    className={`p-3 sm:p-4 border rounded-lg transition-all duration-200 touch-target ${
                      selectedLocation === location.id
                        ? 'border-green-500 bg-green-100 shadow-md'
                        : operation.isDamaged
                        ? 'border-red-200 bg-red-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 text-sm sm:text-base">{location.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600">{location.section}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-medium text-gray-900">
                          {location.available}/{location.capacity}
                        </div>
                        <div className="text-xs text-gray-500">Available</div>
                      </div>
                    </div>

                    {selectedLocation === location.id && (
                      <div className="mt-2 flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs sm:text-sm font-medium">Selected</span>
                      </div>
                    )}

                    {operation.isDamaged && location.id === 'DMG-VIRTUAL' && (
                      <div className="mt-2 text-xs sm:text-sm text-red-600 font-medium">
                        Auto-assigned for damaged container inspection
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredLocations.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm sm:text-base">No locations found</p>
                  <p className="text-xs">Try adjusting your search criteria</p>
                </div>
              )}
            </div>

            {/* Time Tracking - Only for Admin Users */}
            {canManageTimeTracking ? (
              <div className="bg-orange-50 rounded-xl p-4 sm:p-6 border border-orange-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-orange-600 text-white rounded-lg">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900">Manual Time Tracking</h4>
                    <p className="text-sm text-orange-700">Optional: Record truck departure time (Admin only) - Defaults to current system time</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-800 mb-2">
                      Truck Departure Date
                    </label>
                    <DatePicker
                      value={truckDepartureDate}
                      onChange={setTruckDepartureDate}
                      placeholder="Current system date"
                      required={false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-800 mb-2">
                      Truck Departure Time
                    </label>
                    <TimePicker
                      value={truckDepartureTime}
                      onChange={setTruckDepartureTime}
                      placeholder="Current system time"
                      required={false}
                      includeSeconds={true}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Error Display */}
            {error && (
              <div className="flex items-start p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Form Validation Summary */}
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
              <h5 className="text-sm sm:text-base font-medium text-gray-900 mb-3">Validation Summary</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center space-x-2">
                  {selectedLocation ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-gray-300 rounded-full"></div>
                  )}
                  <span className={selectedLocation ? 'text-green-700 font-medium' : 'text-gray-600'}>
                    Location Selected
                  </span>
                </div>
                {canManageTimeTracking && (
                  <div className="flex items-center space-x-2">
                    {truckDepartureDate && truckDepartureTime ? (
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span className={truckDepartureDate && truckDepartureTime ? 'text-blue-700 font-medium' : 'text-gray-600'}>
                      Departure Time Set
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
              {isFormValid ? (
                <span className="text-green-600 font-medium">✓ Ready</span>
              ) : (
                <span>Select location</span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onClose}
                className="btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm"
              >
                <span className="sm:hidden">✕</span>
                <span className="hidden sm:inline">Cancel</span>
              </button>
              <button
                onClick={handleComplete}
                disabled={isProcessing || !isFormValid}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-2 sm:px-6 sm:py-2 text-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="sm:hidden">Complete</span>
                    <span className="hidden sm:inline">Complete Operation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
