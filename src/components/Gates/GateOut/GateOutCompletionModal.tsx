import React, { useState } from 'react';
import { X, Save, Loader, Package, CheckCircle, AlertTriangle, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { PendingGateOut, ContainerInput } from './types';
import { validateContainerNumber, formatContainerForDisplay, getStatusBadge } from './utils';
import { DatePicker } from '../../Common/DatePicker';
import { TimePicker } from '../../Common/TimePicker';

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
  const [containerInputs, setContainerInputs] = useState<ContainerInput[]>([
    { containerNumber: '', confirmContainerNumber: '', isValid: false, validationMessage: '' }
  ]);
  const [gateOutDate, setGateOutDate] = useState('');
  const [gateOutTime, setGateOutTime] = useState('');
  const [inConfirmation, setInConfirmation] = useState(false)
  const [error, setError] = useState<string>('');

  // Reset form when modal closes or operation changes
  const resetForm = () => {
    setContainerInputs([
      { containerNumber: '', confirmContainerNumber: '', isValid: false, validationMessage: '' }
    ]);
    setGateOutDate('');
    setGateOutTime('');
    setInConfirmation(false);
    setError('');
  };

  // Reset form when modal opens with new operation or closes
  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Reset form when operation changes
  React.useEffect(() => {
    if (operation) {
      resetForm();
    }
  }, [operation?.id]);

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
        
        return newInputs;
      });
    }
  };

  const addContainerField = () => {
    if (containerInputs.length < operation.remainingContainers) {
      setContainerInputs(prev => [
        ...prev,
        { containerNumber: '', confirmContainerNumber: '', isValid: false, validationMessage: '' }
      ]);
    }
  };

  const removeContainerField = (index: number) => {
    if (containerInputs.length > 1) {
      setContainerInputs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    setError('');
    
    if (!gateOutDate || !gateOutTime) {
      setError('Please select both gate out date and time.');
      return;
    }
    
    if (!gateOutDate || !gateOutTime) {
      setError('Please select both gate out date and time.');
      return;
    }
    
    const validContainers = containerInputs.filter(input => input.isValid);
    
    if (validContainers.length === 0) {
      setError('Please enter at least one valid container number.');
      return;
    }
    
    if (validContainers.length > operation.remainingContainers) {
      setError(`Cannot process more than ${operation.remainingContainers} containers.`);
      return;
    }
    
    const containerNumbers = validContainers.map(input => input.containerNumber);
    onComplete(operation, containerNumbers);
  };

  const areAllContainerNumbersValid = (): boolean => {
    return containerInputs.length > 0 && 
           containerInputs.every(input => input.isValid) &&
           containerInputs.length <= operation.remainingContainers;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Complete Gate Out</h3>
                <p className="text-sm text-gray-600">
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            
            {/* Operation Summary */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Operation Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Booking:</span>
                  <div className="font-medium">{operation.bookingNumber || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Client:</span>
                  <div className="font-medium">{operation.clientName || 'Unknown Client'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Driver:</span>
                  <div className="font-medium">{operation.driverName || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Vehicle:</span>
                  <div className="font-medium">{operation.vehicleNumber || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Container Number Inputs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Container Numbers</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {containerInputs.filter(input => input.isValid).length}/{operation.remainingContainers} containers
                  </span>
                  {containerInputs.length < operation.remainingContainers && (
                    <button
                      type="button"
                      onClick={addContainerField}
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {containerInputs.map((input, index) => (
                <div key={index} className="space-y-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Container {index + 1}</h5>
                    {containerInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContainerField(index)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className={`form-input w-full pr-20 ${
                            input.containerNumber && !validateContainerNumber(input.containerNumber).isValid
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                              : input.containerNumber && validateContainerNumber(input.containerNumber).isValid
                              ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                              : ''
                          }`}
                          placeholder="e.g., MSKU1234567"
                          maxLength={11}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          {input.containerNumber && (
                            <>
                              {validateContainerNumber(input.containerNumber).isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              <span className={`text-xs font-medium ${
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Container Number *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          onFocus={()=> setInConfirmation(true)}
                          required
                          value={input.confirmContainerNumber}
                          onChange={(e) => handleConfirmContainerNumberChange(index, e.target.value)}
                          className={`form-input w-full pr-10 ${
                            input.confirmContainerNumber && input.containerNumber !== input.confirmContainerNumber
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                              : input.confirmContainerNumber && input.containerNumber === input.confirmContainerNumber && validateContainerNumber(input.containerNumber).isValid
                              ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                              : ''
                          }`}
                          placeholder="Confirm container number"
                          maxLength={11}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {input.confirmContainerNumber && (
                            input.containerNumber === input.confirmContainerNumber && validateContainerNumber(input.containerNumber).isValid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {input.isValid && (
                    <div className="flex items-center p-2 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">
                        Container {formatContainerForDisplay(input.containerNumber)} validated
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Gate Out Date & Time */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-600 text-white rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold text-purple-900">Gate Out Date & Time</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Gate Out Date *
                  </label>
                  <DatePicker
                    value={gateOutDate}
                    onChange={setGateOutDate}
                    placeholder="Date"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Gate Out Time *
                  </label>
                  <TimePicker
                    value={gateOutTime}
                    onChange={setGateOutTime}
                    placeholder="Time"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {containerInputs.filter(input => input.isValid).length} of {operation.remainingContainers} containers ready
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !areAllContainerNumbersValid() || !gateOutDate || !gateOutTime}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Complete Gate Out</span>
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