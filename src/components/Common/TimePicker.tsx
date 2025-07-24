import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, X } from 'lucide-react';

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

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    const clampedHours = Math.max(0, Math.min(23, newHours));
    const clampedMinutes = Math.max(0, Math.min(59, newMinutes));
    
    setHours(clampedHours);
    setMinutes(clampedMinutes);
    onChange(formatTime(clampedHours, clampedMinutes));
  };

  const handleHourChange = (delta: number) => {
    const newHours = (hours + delta + 24) % 24;
    handleTimeChange(newHours, minutes);
  };

  const handleMinuteChange = (delta: number) => {
    const newMinutes = (minutes + delta + 60) % 60;
    handleTimeChange(hours, newMinutes);
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

  const handleQuickTime = (h: number, m: number) => {
    handleTimeChange(h, m);
    setIsOpen(false);
    setIsFocused(false);
  };

  const displayValue = value ? formatDisplayTime(hours, minutes) : '';

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
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-80 animate-slide-in-up">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Select Time</h3>
            <p className="text-sm text-gray-500">24-hour format</p>
          </div>

          {/* Time Display */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl px-8 py-4 border-2 border-blue-200">
              <span className="text-4xl font-bold text-gray-900 tracking-wider">
                {formatDisplayTime(hours, minutes)}
              </span>
            </div>
          </div>

          {/* Time Controls */}
          <div className="flex items-center justify-center space-x-8 mb-8">
            {/* Hours Control */}
            <div className="flex flex-col items-center space-y-3">
              <button
                type="button"
                onClick={() => handleHourChange(1)}
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 group"
              >
                <ChevronUp className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
              </button>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {hours.toString().padStart(2, '0')}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500 mt-2 block">Hours</span>
              </div>
              
              <button
                type="button"
                onClick={() => handleHourChange(-1)}
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 group"
              >
                <ChevronDown className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
              </button>
            </div>

            {/* Separator */}
            <div className="text-3xl font-bold text-gray-400">:</div>

            {/* Minutes Control */}
            <div className="flex flex-col items-center space-y-3">
              <button
                type="button"
                onClick={() => handleMinuteChange(5)}
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 group"
              >
                <ChevronUp className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
              </button>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {minutes.toString().padStart(2, '0')}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500 mt-2 block">Minutes</span>
              </div>
              
              <button
                type="button"
                onClick={() => handleMinuteChange(-5)}
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 group"
              >
                <ChevronDown className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
              </button>
            </div>
          </div>

          {/* Quick Time Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: '09:00', h: 9, m: 0 },
              { label: '12:00', h: 12, m: 0 },
              { label: '15:00', h: 15, m: 0 },
              { label: '18:00', h: 18, m: 0 },
              { label: 'Now', h: new Date().getHours(), m: new Date().getMinutes() },
              { label: '23:59', h: 23, m: 59 }
            ].map((time) => (
              <button
                key={time.label}
                type="button"
                onClick={() => handleQuickTime(time.h, time.m)}
                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-105"
              >
                {time.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                handleTimeChange(now.getHours(), now.getMinutes());
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Current Time
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsFocused(false);
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};