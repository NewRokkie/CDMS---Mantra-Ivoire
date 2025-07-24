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
  const [isFocused, setIsFocused] = useState(false);
  
  // Parse initial time values from the value prop
  const parseTimeValue = (timeString: string) => {
    if (!timeString) return { hours: 9, minutes: 0, seconds: 0 };
    
    const parts = timeString.split(':');
    return {
      hours: parseInt(parts[0]) || 0,
      minutes: parseInt(parts[1]) || 0,
      seconds: includeSeconds ? (parseInt(parts[2]) || 0) : 0
    };
  };

  const initialTime = parseTimeValue(value);
  const [hours, setHours] = useState(initialTime.hours);
  const [minutes, setMinutes] = useState(initialTime.minutes);
  const [seconds, setSeconds] = useState(initialTime.seconds);
  
  const inputRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    const newTime = parseTimeValue(value);
    setHours(newTime.hours);
    setMinutes(newTime.minutes);
    setSeconds(newTime.seconds);
  }, [value, includeSeconds]);

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close overlay
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const formatTime = (h: number, m: number, s?: number): string => {
    const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return includeSeconds ? `${timeString}:${s?.toString().padStart(2, '0')}` : timeString;
  };

  const formatDisplayTime = (h: number, m: number, s?: number): string => {
    const timeString = formatTime(h, m, s);
    return timeString;
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsFocused(true);
      setIsOpen(true);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Clear the time value without opening the picker
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    onChange('');
    // Ensure picker doesn't open
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

  const handleSave = () => {
    const timeValue = formatTime(hours, minutes, includeSeconds ? seconds : undefined);
    onChange(timeValue);
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleCancel = () => {
    // Reset to original values from props
    const originalTime = parseTimeValue(value);
    setHours(originalTime.hours);
    setMinutes(originalTime.minutes);
    setSeconds(originalTime.seconds);
    setIsOpen(false);
    setIsFocused(false);
  };

  // Time adjustment functions with proper bounds checking
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

  const displayValue = value ? formatDisplayTime(hours, minutes, includeSeconds ? seconds : undefined) : '';

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input Field - No wrapper divs to avoid modal deformation */}
      <button
        ref={inputRef}
        type="button"
        onClick={handleInputClick}
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
        
        {/* Clear button - Fixed to not open picker */}
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
      </button>

      {/* Selected Time Indicator */}
      {value && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg animate-bounce-in">
          <Clock className="h-3 w-3" />
        </div>
      )}

      {/* Time Picker Overlay - Uses fixed positioning to center in viewport */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-[9998] animate-fade-in"
            onClick={handleCancel}
          />
          
          {/* Centered Time Picker Overlay */}
          <div
            ref={overlayRef}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-fade-scale-in"
            style={{ 
              maxWidth: '280px', 
              maxHeight: '320px',
              minWidth: '280px'
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              {/* Header */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Select time</h3>
                <button
                  type="button"
                  onClick={handleCurrentTime}
                  className="text-blue-600 hover:text-blue-800 font-medium px-3 py-1 hover:bg-blue-50 rounded-md transition-colors text-sm"
                >
                  Current time
                </button>
              </div>

              {/* Time Selection Interface */}
              <div className={`flex justify-center items-center ${includeSeconds ? 'space-x-4' : 'space-x-6'} mb-4`}>
                
                {/* Hours Column */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</span>
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      type="button"
                      onClick={() => adjustHours('up')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    
                    <div className="bg-gray-100 rounded-xl px-4 py-3 min-w-[60px] text-center">
                      <span className="text-2xl font-bold text-gray-900">
                        {hours.toString().padStart(2, '0')}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => adjustHours('down')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="flex items-center pt-6">
                  <span className="text-2xl font-bold text-gray-400">:</span>
                </div>

                {/* Minutes Column */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Minutes</span>
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      type="button"
                      onClick={() => adjustMinutes('up')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    
                    <div className="bg-gray-100 rounded-xl px-4 py-3 min-w-[60px] text-center">
                      <span className="text-2xl font-bold text-gray-900">
                        {minutes.toString().padStart(2, '0')}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => adjustMinutes('down')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Seconds Column - Only shown when includeSeconds is true */}
                {includeSeconds && (
                  <>
                    <div className="flex items-center pt-6">
                      <span className="text-2xl font-bold text-gray-400">:</span>
                    </div>
                    
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Seconds</span>
                      <div className="flex flex-col items-center space-y-2">
                        <button
                          type="button"
                          onClick={() => adjustSeconds('up')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        
                        <div className="bg-gray-100 rounded-xl px-4 py-3 min-w-[60px] text-center">
                          <span className="text-2xl font-bold text-gray-900">
                            {seconds.toString().padStart(2, '0')}
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => adjustSeconds('down')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};