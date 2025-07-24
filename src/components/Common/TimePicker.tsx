import React, { useState, useRef, useEffect } from 'react';
import { Clock, X, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  includeSeconds?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  required = false,
  disabled = false,
  label,
  className = "",
  includeSeconds = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) : 9);
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) : 0);
  const [seconds, setSeconds] = useState(value && includeSeconds ? parseInt(value.split(':')[2] || '0') : 0);
  const [isFocused, setIsFocused] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      setHours(parseInt(parts[0]));
      setMinutes(parseInt(parts[1]));
      if (includeSeconds && parts[2]) {
        setSeconds(parseInt(parts[2]));
      }
    }
  }, [value, includeSeconds]);

  const formatTime = (h: number, m: number, s?: number): string => {
    const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return includeSeconds ? `${timeString}:${s?.toString().padStart(2, '0')}` : timeString;
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsFocused(true);
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    // Delay to allow for dropdown clicks
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 150);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHours(9);
    setMinutes(0);
    setSeconds(0);
    onChange('');
    // Don't open the picker when clearing
  };

  const handleSave = () => {
    onChange(formatTime(hours, minutes, includeSeconds ? seconds : undefined));
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleCancel = () => {
    // Reset to original values
    if (value) {
      const parts = value.split(':');
      setHours(parseInt(parts[0]));
      setMinutes(parseInt(parts[1]));
      if (includeSeconds && parts[2]) {
        setSeconds(parseInt(parts[2]));
      }
    } else {
      setHours(9);
      setMinutes(0);
      setSeconds(0);
    }
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleCurrentTime = () => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    setHours(currentHours);
    setMinutes(currentMinutes);
    if (includeSeconds) {
      setSeconds(currentSeconds);
    }
  };

  const adjustHours = (direction: 'up' | 'down') => {
    setHours(prev => {
      if (direction === 'up') {
        return prev === 23 ? 0 : prev + 1;
      } else {
        return prev === 0 ? 23 : prev - 1;
      }
    });
  };

  const adjustMinutes = (direction: 'up' | 'down') => {
    setMinutes(prev => {
      if (direction === 'up') {
        return prev === 59 ? 0 : prev + 1;
      } else {
        return prev === 0 ? 59 : prev - 1;
      }
    });
  };

  const adjustSeconds = (direction: 'up' | 'down') => {
    setSeconds(prev => {
      if (direction === 'up') {
        return prev === 59 ? 0 : prev + 1;
      } else {
        return prev === 0 ? 59 : prev - 1;
      }
    });
  };

  const displayValue = value ? formatTime(hours, minutes, includeSeconds ? seconds : undefined) : '';

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input Field */}
      <div className={`
        relative group transition-all duration-300 ease-in-out
        ${isFocused || isOpen ? 'transform scale-[1.01]' : ''}
      `}>
        <button
          ref={inputRef}
          type="button"
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl
            transition-all duration-300 text-left
            ${isOpen || isFocused
              ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10'
              : value
              ? 'border-green-400 shadow-md shadow-green-400/10'
              : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center space-x-3">
            <Clock className={`h-5 w-5 transition-colors duration-300 ${
              isOpen || isFocused ? 'text-blue-500' : value ? 'text-green-500' : 'text-gray-400'
            }`} />
            <span className={`transition-colors duration-300 font-medium ${
              value ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {displayValue || placeholder}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 group z-10"
                title="Clear time"
              >
                <X className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </button>

        {/* Selected Time Indicator */}
        {value && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg animate-bounce-in">
            <Clock className="h-3 w-3" />
          </div>
        )}

        {/* Focus Ring Animation */}
        {(isFocused || isOpen) && (
          <div className="absolute inset-0 rounded-xl border-2 border-blue-500 animate-pulse opacity-20 pointer-events-none" />
        )}
      </div>

      {/* Time Picker Dropdown - Responsive Design */}
      {isOpen && (
        <>
          {/* Mobile: Bottom Sheet */}
          {isMobile ? (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in" />
              
              {/* Bottom Sheet */}
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slide-in-up max-h-[80vh] overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                </div>
                
                {/* Header */}
                <div className="text-center px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">Select time</h3>
                  <button
                    type="button"
                    onClick={handleCurrentTime}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2 px-3 py-1 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Current time
                  </button>
                </div>

                {/* Time Selection */}
                <div className="px-6 py-6">
                  <div className={`flex justify-center ${includeSeconds ? 'space-x-8' : 'space-x-12'}`}>
                    {/* Hours Column */}
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-500 mb-4">Hours</span>
                      <div className="flex flex-col items-center space-y-2">
                        <button
                          type="button"
                          onClick={() => adjustHours('up')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronUp className="h-5 w-5" />
                        </button>
                        <div className="text-4xl font-bold text-gray-900 w-16 text-center py-2">
                          {hours.toString().padStart(2, '0')}
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustHours('down')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="flex items-center">
                      <span className="text-4xl font-bold text-gray-400">:</span>
                    </div>

                    {/* Minutes Column */}
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-500 mb-4">Minutes</span>
                      <div className="flex flex-col items-center space-y-2">
                        <button
                          type="button"
                          onClick={() => adjustMinutes('up')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronUp className="h-5 w-5" />
                        </button>
                        <div className="text-4xl font-bold text-gray-900 w-16 text-center py-2">
                          {minutes.toString().padStart(2, '0')}
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustMinutes('down')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Seconds Column (if enabled) */}
                    {includeSeconds && (
                      <>
                        <div className="flex items-center">
                          <span className="text-4xl font-bold text-gray-400">:</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-gray-500 mb-4">Seconds</span>
                          <div className="flex flex-col items-center space-y-2">
                            <button
                              type="button"
                              onClick={() => adjustSeconds('up')}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ChevronUp className="h-5 w-5" />
                            </button>
                            <div className="text-4xl font-bold text-gray-900 w-16 text-center py-2">
                              {seconds.toString().padStart(2, '0')}
                            </div>
                            <button
                              type="button"
                              onClick={() => adjustSeconds('down')}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ChevronDown className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-xl hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-8 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Save
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Desktop: Dropdown */
            <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-80 animate-slide-in-up">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Select time</h3>
                <button
                  type="button"
                  onClick={handleCurrentTime}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Current time
                </button>
              </div>

              {/* Time Selection */}
              <div className={`flex justify-center items-center ${includeSeconds ? 'space-x-6' : 'space-x-8'} mb-6`}>
                {/* Hours Column */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-500 mb-3">Hours</span>
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      type="button"
                      onClick={() => adjustHours('up')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <div className="text-3xl font-bold text-gray-900 w-12 text-center py-2 bg-gray-50 rounded-lg">
                      {hours.toString().padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustHours('down')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="flex items-center pt-8">
                  <span className="text-3xl font-bold text-gray-400">:</span>
                </div>

                {/* Minutes Column */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-500 mb-3">Minutes</span>
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      type="button"
                      onClick={() => adjustMinutes('up')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <div className="text-3xl font-bold text-gray-900 w-12 text-center py-2 bg-gray-50 rounded-lg">
                      {minutes.toString().padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustMinutes('down')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Seconds Column (if enabled) */}
                {includeSeconds && (
                  <>
                    <div className="flex items-center pt-8">
                      <span className="text-3xl font-bold text-gray-400">:</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-500 mb-3">Seconds</span>
                      <div className="flex flex-col items-center space-y-2">
                        <button
                          type="button"
                          onClick={() => adjustSeconds('up')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <div className="text-3xl font-bold text-gray-900 w-12 text-center py-2 bg-gray-50 rounded-lg">
                          {seconds.toString().padStart(2, '0')}
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustSeconds('down')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};