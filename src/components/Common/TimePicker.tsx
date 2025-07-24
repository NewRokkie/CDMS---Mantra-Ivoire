import React, { useState, useRef, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  required = false,
  disabled = false,
  label,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) : 12);
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) : 0);
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
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  const formatTime = (h: number, m: number): string => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (h: number, m: number): string => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleTimeSelect = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    onChange(formatTime(newHours, newMinutes));
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 150);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHours(12);
    setMinutes(0);
    onChange('');
  };

  const handleSave = () => {
    onChange(formatTime(hours, minutes));
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleCurrentTime = () => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    setHours(currentHours);
    setMinutes(currentMinutes);
  };

  const displayValue = value ? formatDisplayTime(hours, minutes) : '';

  // Generate hour and minute options
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute intervals

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
          onClick={() => !disabled && setIsOpen(!isOpen)}
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
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                title="Clear time"
              >
                <X className="h-4 w-4" />
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

      {/* Time Picker Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 w-80 animate-slide-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Select time</h3>
          </div>

          {/* Time Selection Grid */}
          <div className="space-y-8">
            {/* Hours Grid */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-4 text-center">Hours</h4>
              <div className="grid grid-cols-6 gap-3">
                {hourOptions.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setHours(hour)}
                    className={`
                      w-12 h-12 rounded-2xl text-lg font-bold transition-all duration-200
                      ${hours === hour
                        ? 'bg-gray-900 text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                      }
                    `}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Grid */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-4 text-center">Minutes</h4>
              <div className="grid grid-cols-6 gap-3">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => setMinutes(minute)}
                    className={`
                      w-12 h-12 rounded-2xl text-lg font-bold transition-all duration-200
                      ${minutes === minute
                        ? 'bg-gray-900 text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                      }
                    `}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Time Display */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center bg-gray-50 rounded-3xl px-8 py-4 border-2 border-gray-200">
                <span className="text-4xl font-bold text-gray-900 tracking-wider">
                  {formatDisplayTime(hours, minutes)}
                </span>
              </div>
            </div>

            {/* Current Time Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleCurrentTime}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Current Time
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className="px-8 py-3 bg-gray-900 text-white font-medium rounded-2xl hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};