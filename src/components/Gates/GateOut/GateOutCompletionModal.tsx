import React, { useState } from 'react';
import { X, Save, Loader, Package, CheckCircle, AlertTriangle, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { PendingGateOut, ContainerInput } from './types';
import { validateContainerNumber, formatContainerForDisplay, getStatusBadge } from './utils';
import { DatePicker } from '../../Common/DatePicker';
import { TimePicker } from '../../Common/TimePicker';
import { useAuth } from '../../../hooks/useAuth';

// Mock container data to check container sizes
const mockContainerData = [
  { number: 'MSKU1234567', size: '40ft', type: 'dry', client: 'Maersk Line' },
  { number: 'TCLU9876543', size: '20ft', type: 'reefer', client: 'MSC' },
  { number: 'GESU4567891', size: '40ft', type: 'dry', client: 'CMA CGM' },
  { number: 'SHIP1112228', size: '20ft', type: 'dry', client: 'Shipping Solutions Inc' },
  { number: 'SHIP3334449', size: '40ft', type: 'reefer', client: 'Shipping Solutions Inc' },
  { number: 'MAEU5556664', size: '40ft', type: 'reefer', client: 'Maersk Line' },
  { number: 'CMDU7890125', size: '40ft', type: 'dry', client: 'CMA CGM' },
  { number: 'HLCU3456789', size: '20ft', type: 'dry', client: 'Hapag-Lloyd' },
  { number: 'SNFW2940740', size: '40ft', type: 'reefer', client: 'Shipping Network' },
  { number: 'MAEU7778881', size: '20ft', type: 'tank', client: 'Maersk Line' },
  { number: 'MSCU9990002', size: '40ft', type: 'flat_rack', client: 'MSC Mediterranean Shipping' },
  { number: 'CMDU1113335', size: '20ft', type: 'open_top', client: 'CMA CGM' }
];

// Helper function to get container size from container number
const getContainerSize = (containerNumber: string): '20ft' | '40ft' | null => {
  const container = mockContainerData.find(c => c.number === containerNumber);
  return container ? container.size as '20ft' | '40ft' : null;
};

interface GateOutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: PendingGateOut | null;
  onComplete: (operation: PendingGateOut, containerNumbers: string[]) => void;
  isProcessing: boolean;
}

export const GateOutCompletionModal: React.FC<GateOutCompletionModalProps> = ({
  isOpen,
  onClose,
  operation,
  onComplete,
  isProcessing
}) => {
  const { hasModuleAccess } = useAuth();
  const canManageTimeTracking = hasModuleAccess('timeTracking');
  
  const [containerInputs, setContainerInputs] = useState<ContainerInput[]>([
    { containerNumber: '', confirmContainerNumber: '', isValid: false, validationMessage: '' }
  ]);
  const [gateOutDate, setGateOutDate] = useState('');
  const [gateOutTime, setGateOutTime] = useState('');
  const [inConfirmation, setInConfirmation] = useState(false);
  const [error, setError] = useState<string>('');
 const [truckCapacityError, setTruckCapacityError] = useState<string>('');

  // Reset form when modal closes or operation changes
  const resetForm = () => {
    setContainerInputs([
      { containerNumber: '', confirmContainerNumber: '', isValid: false, validationMessage: '' }
    ]);
    // Set default system date and time
    const now = new Date();
    setGateOutDate(now.toISOString().split('T')[0]);
    setGateOutTime(now.toTimeString().slice(0, 5));
    setInConfirmation(false);
    setError('');
   setTruckCapacityError('');
  };

  // Reset form when modal opens with new operation or closes
  React.useEffect(() => {
    if (isOpen && operation) {
      // Initialize with current system date/time when opening
      const now = new Date();
      setGateOutDate(now.toISOString().split('T')[0]);
      setGateOutTime(now.toTimeString().slice(0, 5));
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, operation]);

  // Reset form when operation changes
  React.useEffect(() => {
    if (operation) {
      resetForm();
    }
  }, [operation?.id]);

 // Check truck capacity constraints
 const checkTruckCapacity = (inputs: ContainerInput[]): { isValid: boolean; error?: string } => {
   const validInputs = inputs.filter(input => input.isValid);
   
   if (validInputs.length === 0) return { isValid: true };
   if (validInputs.length === 1) return { isValid: true };
   
   // Check first container size
   const firstContainerSize = getContainerSize(validInputs[0].containerNumber);
   if (!firstContainerSize) return { isValid: true }; // Skip validation if size unknown
   
   // If first container is 40ft, no second container allowed
   if (firstContainerSize === '40ft' && validInputs.length > 1) {
     return { 
       isValid: false, 
       error: 'Truck capacity exceeded: 40ft containers require full truck capacity (1 container max)' 
     };
   }
   
   // If first container is 20ft, check second container
   if (firstContainerSize === '20ft' && validInputs.length === 2) {
     const secondContainerSize = getContainerSize(validInputs[1].containerNumber);
     if (!secondContainerSize) return { isValid: true }; // Skip validation if size unknown
     
     if (secondContainerSize === '40ft') {
       return { 
         isValid: false, 
         error: 'Invalid combination: Cannot load 40ft container after 20ft container' 
       };
     }
   }
   
   return { isValid: true };
 };

 // Check if second field should be enabled
 const shouldEnableSecondField = (): boolean => {
   if (containerInputs.length < 1) return false;
   
   const firstInput = containerInputs[0];
   if (!firstInput.isValid) return false;
   
   const firstContainerSize = getContainerSize(firstInput.containerNumber);
   // Only enable second field if first container is 20ft
   return firstContainerSize === '20ft';
 };

 // Get maximum allowed containers based on first container
 const getMaxContainers = (): number => {
   if (containerInputs.length === 0 || !containerInputs[0].isValid) return 2;
   
   const firstContainerSize = getContainerSize(containerInputs[0].containerNumber);
   return firstContainerSize === '40ft' ? 1 : 2;
 };
  if (!isOpen || !operation) return null;

  const handleContainerNumberChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleanValue.length <= 11) {
      const letters = cleanValue.substring(0, 4);
      const numbers = cleanValue.substring(4, 11);
      const validLetters = letters.replace(/[^A-Za-z]/gi, '').toUpperCase();
      const validNumbers = numbers.replace(/[^0-9]/g, '');
      const validValue = validLetters + validNumbers;
      
      setContainerInputs(prev => {
        const newInputs = [...prev];
        newInputs[index] = {
          ...newInputs[index],
          containerNumber: validValue,
          confirmContainerNumber: '',
          isValid: false,
          validationMessage: ''
        };
        
        const validation = validateContainerNumber(validValue);
        newInputs[index].validationMessage = validation.message || '';
        
       // Check truck capacity after updating
       const capacityCheck = checkTruckCapacity(newInputs);
       setTruckCapacityError(capacityCheck.error || '');
       
        return newInputs;
      });
    }
  };

  const handleConfirmContainerNumberChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleanValue.length <= 11) {
      const letters = cleanValue.substring(0, 4);
      const numbers = cleanValue.substring(4, 11);
      const validLetters = letters.replace(/[^A-Za-z]/gi, '').toUpperCase();
      const validNumbers = numbers.replace(/[^0-9]/g, '');
      const validValue = validLetters + validNumbers;
      
      setContainerInputs(prev => {
        const newInputs = [...prev];
        newInputs[index] = {
          ...newInputs[index],
          confirmContainerNumber: validValue
        };
        
        const validation = validateContainerNumber(newInputs[index].containerNumber);
        const matches = newInputs[index].containerNumber === validValue;
        newInputs[index].isValid = validation.isValid && matches;
        
       // Check truck capacity after updating
       const capacityCheck = checkTruckCapacity(newInputs);
       setTruckCapacityError(capacityCheck.error || '');
       
        return newInputs;
      });
    }
  };

  const addContainerField = () => {
   const maxContainers = getMaxContainers();
   if (containerInputs.length < maxContainers && containerInputs.length < 2) {
      setContainerInputs(prev => [
        ...prev,
        { containerNumber: '', confirmContainerNumber: '', isValid: false, validationMessage: '' }
      ]);
    }
  };

  const removeContainerField = (index: number) => {
    if (containerInputs.length > 1) {
     setContainerInputs(prev => {
       const newInputs = prev.filter((_, i) => i !== index);
       // Check truck capacity after removal
       const capacityCheck = checkTruckCapacity(newInputs);
       setTruckCapacityError(capacityCheck.error || '');
       return newInputs;
     });
    }
  };

  const handleSubmit = () => {
    setError('');
    
   // Check truck capacity constraints
   const capacityCheck = checkTruckCapacity(containerInputs);
   if (!capacityCheck.isValid) {
     setError(capacityCheck.error || 'Truck capacity exceeded');
     return;
   }
    
    const validContainers = containerInputs.filter(input => input.isValid);
    
    if (validContainers.length === 0) {
      setError('Please enter at least one valid container number.');
      return;
    }
    
   if (validContainers.length > 2) {
     setError('Truck capacity exceeded: Maximum 2 containers per truck.');
     return;
   }
    
    // Use current system time if not manually set
    const finalGateOutDate = gateOutDate || new Date().toISOString().split('T')[0];
    const finalGateOutTime = gateOutTime || new Date().toTimeString().slice(0, 5);
    
    const containerNumbers = validContainers.map(input => input.containerNumber);
    onComplete(operation, containerNumbers, { gateOutDate: finalGateOutDate, gateOutTime: finalGateOutTime });
  };

  const areAllContainerNumbersValid = (): boolean => {
   const capacityCheck = checkTruckCapacity(containerInputs);
   return containerInputs.length > 0 && 
          containerInputs.every(input => input.isValid) &&
          capacityCheck.isValid;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-in-up mx-2 sm:mx-0">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Complete Gate Out</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {operation.bookingNumber || operation.id} - {operation.remainingContainers} containers remaining
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6">
            
            {/* Operation Summary */}
            <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 text-sm sm:text-base">Operation Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-blue-700">Booking:</span>
                  <div className="font-medium break-all">{operation.bookingNumber || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Client:</span>
                  <div className="font-medium break-words">{operation.clientName || 'Unknown Client'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Driver:</span>
                  <div className="font-medium break-words">{operation.driverName || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Vehicle:</span>
                  <div className="font-medium break-all">{operation.vehicleNumber || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Container Number Inputs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Container Numbers</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm text-gray-600">
                   {containerInputs.filter(input => input.isValid).length}/{Math.min(getMaxContainers(), 2)} containers
                  </span>
                 {containerInputs.length < 2 && containerInputs.length < getMaxContainers() && shouldEnableSecondField() && (
                    <button
                      type="button"
                      onClick={addContainerField}
                      className="p-2 sm:p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors touch-target"
                     title="Add second 20ft container"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

             {/* Truck Capacity Info */}
             <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
               <div className="flex items-center space-x-2 mb-2">
                 <Package className="h-4 w-4 text-blue-600" />
                 <span className="text-sm font-medium text-blue-900">Truck Capacity Rules</span>
               </div>
               <div className="text-xs text-blue-800 space-y-1">
                 <div>• Maximum 1 container of 40ft per truck</div>
                 <div>• Maximum 2 containers of 20ft per truck</div>
                 <div>• Cannot mix 20ft and 40ft containers in same truck</div>
               </div>
             </div>

             {/* Truck Capacity Error */}
             {truckCapacityError && (
               <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
                 <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                 <p className="text-xs sm:text-sm text-red-800 leading-relaxed">{truckCapacityError}</p>
               </div>
             )}
              {containerInputs.map((input, index) => (
               <div key={index} className={`space-y-3 p-3 sm:p-4 border rounded-lg transition-all duration-200 ${
                 index === 1 && !shouldEnableSecondField() 
                   ? 'border-gray-200 bg-gray-50 opacity-50' 
                   : 'border-gray-200'
               }`}>
                  <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                     <h5 className="font-medium text-gray-900 text-sm sm:text-base">Container {index + 1}</h5>
                     {index === 0 && containerInputs[0].isValid && (
                       <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                         getContainerSize(containerInputs[0].containerNumber) === '40ft' 
                           ? 'bg-orange-100 text-orange-800' 
                           : 'bg-blue-100 text-blue-800'
                       }`}>
                         {getContainerSize(containerInputs[0].containerNumber)}
                       </span>
                     )}
                     {index === 1 && !shouldEnableSecondField() && (
                       <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                         Disabled (40ft truck full)
                       </span>
                     )}
                   </div>
                    {containerInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContainerField(index)}
                        className="p-2 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors touch-target"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Container Number *
                      </label>
                      <div className="relative">
                        <input
                          type={inConfirmation ? 'password' : 'text'}
                          onFocus={()=> setInConfirmation(false)}
                          onFocusOut={()=> setInConfirmation(true)}
                          required
                          value={input.containerNumber}
                          onChange={(e) => handleContainerNumberChange(index, e.target.value)}
                         disabled={index === 1 && !shouldEnableSecondField()}
                          className={`form-input w-full pr-20 ${
                           index === 1 && !shouldEnableSecondField()
                             ? 'bg-gray-100 text-gray-400 cursor-not-allowed py-4 sm:py-3'
                             : 
                            input.containerNumber && !validateContainerNumber(input.containerNumber).isValid
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500 py-4 sm:py-3'
                              : input.containerNumber && validateContainerNumber(input.containerNumber).isValid
                              ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500 py-4 sm:py-3'
                              : 'py-4 sm:py-3'
                          }`}
                         placeholder={index === 0 ? "e.g., MSKU1234567" : "Second container (20ft only)"}
                          maxLength={11}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                         {input.containerNumber && !(index === 1 && !shouldEnableSecondField()) && (
                            <>
                              {validateContainerNumber(input.containerNumber).isValid ? (
                                <CheckCircle className="h-5 w-5 sm:h-4 sm:w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 sm:h-4 sm:w-4 text-red-500" />
                              )}
                              <span className={`hidden sm:inline text-xs font-medium ${
                                validateContainerNumber(input.containerNumber).isValid 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {input.validationMessage}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                     {index === 1 && !shouldEnableSecondField() && (
                       <p className="text-xs text-gray-500 mt-1">
                         Second field disabled: First container is 40ft (truck at full capacity)
                       </p>
                     )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Confirm Container Number *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          onFocus={()=> setInConfirmation(true)}
                          required
                          value={input.confirmContainerNumber}
                          onChange={(e) => handleConfirmContainerNumberChange(index, e.target.value)}
                         disabled={index === 1 && !shouldEnableSecondField()}
                          className={`form-input w-full pr-10 ${
                           index === 1 && !shouldEnableSecondField()
                             ? 'bg-gray-100 text-gray-400 cursor-not-allowed py-4 sm:py-3'
                             :
                            input.confirmContainerNumber && input.containerNumber !== input.confirmContainerNumber
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500 py-4 sm:py-3'
                              : input.confirmContainerNumber && input.containerNumber === input.confirmContainerNumber && validateContainerNumber(input.containerNumber).isValid
                              ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500 py-4 sm:py-3'
                              : 'py-4 sm:py-3'
                          }`}
                          placeholder="Confirm container number"
                          maxLength={11}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                         {input.confirmContainerNumber && !(index === 1 && !shouldEnableSecondField()) && (
                            input.containerNumber === input.confirmContainerNumber && validateContainerNumber(input.containerNumber).isValid ? (
                              <CheckCircle className="h-5 w-5 sm:h-4 sm:w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 sm:h-4 sm:w-4 text-red-500" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {input.isValid && (
                    <div className="flex items-center p-2 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-green-800 break-all">
                       Container {formatContainerForDisplay(input.containerNumber)} validated 
                       ({getContainerSize(input.containerNumber) || 'Unknown size'})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Gate Out Date & Time */}
            {canManageTimeTracking && (
              <div className="bg-purple-50 rounded-xl p-4 sm:p-6 border border-purple-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900">Gate Out Date & Time</h4>
                    <p className="text-sm text-purple-700">Manual time tracking (Admin only) - Defaults to current system time</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Gate Out Date
                    </label>
                    <DatePicker
                      value={gateOutDate}
                      onChange={setGateOutDate}
                      placeholder="Current system date"
                      required={false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Gate Out Time
                    </label>
                    <TimePicker
                      value={gateOutTime}
                      onChange={setGateOutTime}
                      placeholder="Current system time"
                      required={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-start p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-red-800 leading-relaxed">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm text-gray-600">
             {containerInputs.filter(input => input.isValid).length} of {Math.min(getMaxContainers(), 2)} containers ready
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary px-4 py-3 sm:px-6 sm:py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !areAllContainerNumbersValid()}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 px-4 py-3 sm:px-6 sm:py-2"
              >
                {isProcessing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">Complete Gate Out</span>
                    <span className="sm:hidden">Complete</span>
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