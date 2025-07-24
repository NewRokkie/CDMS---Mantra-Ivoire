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
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) : 0);
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) : 0);
  const [seconds, setSeconds] = useState(value && includeSeconds ? parseInt(value.split(':')[2] || '0') : 0);
  const [isFocused, setIsFocused] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const minutesScrollRef = useRef<HTMLDivElement>(null);
  const secondsScrollRef = useRef<HTMLDivElement>(null);

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

  // Scroll to selected value when picker opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToValue(hoursScrollRef, hours, 24);
        scrollToValue(minutesScrollRef, minutes, 60);
        if (includeSeconds) {
          scrollToValue(secondsScrollRef, seconds, 60);
        }
      }, 100);
    }
  }, [isOpen, hours, minutes, seconds, includeSeconds]);

  const scrollToValue = (ref: React.RefObject<HTMLDivElement>, value: number, max: number) => {
    if (ref.current) {
      const itemHeight = 48; // Height of each time item
      const containerHeight = ref.current.clientHeight;
      const scrollTop = (value * itemHeight) - (containerHeight / 2) + (itemHeight / 2);
      ref.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  };

  const formatTime = (h: number, m: number, s?: number): string => {
    const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return includeSeconds ? `${timeString}:${s?.toString().padStart(2, '0')}` : timeString;
  };

  const formatDisplayTime = (h: number, m: number, s?: number): string => {
    return formatTime(h, m, s);
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

  // FIX: Clear functionality - only clears value, doesn't open picker
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHours(0);
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
    
    // Scroll to current time
    setTimeout(() => {
      scrollToValue(hoursScrollRef, currentHours, 24);
      scrollToValue(minutesScrollRef, currentMinutes, 60);
      if (includeSeconds) {
        scrollToValue(secondsScrollRef, currentSeconds, 60);
      }
    }, 100);
  };

  const displayValue = value ? formatDisplayTime(hours, minutes, includeSeconds ? seconds : undefined) : '';

  // Generate time arrays
  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);
  const secondsArray = Array.from({ length: 60 }, (_, i) => i);

  // Responsive: Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const TimeColumn: React.FC<{
    title: string;
    values: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
  }> = ({ title, values, selectedValue, onValueChange, scrollRef }) => {
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      const itemHeight = 48;
      const scrollTop = container.scrollTop;
      const centerIndex = Math.round(scrollTop / itemHeight);
      const newValue = values[centerIndex];
      
      if (newValue !== undefined && newValue !== selectedValue) {
        onValueChange(newValue);
      }
    };

    return (
      <div className="flex-1 flex flex-col items-center">
        <div className="text-sm font-medium text-gray-600 mb-3">{title}</div>
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-48 overflow-y-auto scrollbar-none relative"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {/* Padding items for proper centering */}
          <div className="h-24"></div>
          
          {values.map((val) => (
            <div
              key={val}
              className={`h-12 flex items-center justify-center text-2xl font-bold transition-all duration-300 cursor-pointer ${
                val === selectedValue
                  ? 'text-gray-900 scale-110'
                  : 'text-gray-300 hover:text-gray-500'
              }`}
              style={{ scrollSnapAlign: 'center' }}
              onClick={() => {
                onValueChange(val);
                scrollToValue(scrollRef, val, values.length);
              }}
            >
              {val.toString().padStart(2, '0')}
            </div>
          ))}
          
          {/* Padding items for proper centering */}
          <div className="h-24"></div>
          
          {/* Center indicator line */}
          <div className="absolute top-1/2 left-0 right-0 h-12 border-t border-b border-gray-200 pointer-events-none transform -translate-y-1/2 bg-gray-50 bg-opacity-50"></div>
        </div>
      </div>
    );
  };

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
                    onClick={handleCurrentTime}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
                  >
                    Current time
                  </button>
                </div>

                {/* Time Selection */}
                <div className="px-6 py-6">
                  <div className={`flex ${includeSeconds ? 'space-x-4' : 'space-x-8'}`}>
                    <TimeColumn
                      title="Hours"
                      values={hoursArray}
                      selectedValue={hours}
                      onValueChange={setHours}
                      scrollRef={hoursScrollRef}
                    />
                    <TimeColumn
                      title="Minutes"
                      values={minutesArray}
                      selectedValue={minutes}
                      onValueChange={setMinutes}
                      scrollRef={minutesScrollRef}
                    />
                    {includeSeconds && (
                      <TimeColumn
                        title="Seconds"
                        values={secondsArray}
                        selectedValue={seconds}
                        onValueChange={setSeconds}
                        scrollRef={secondsScrollRef}
                      />
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
                    className="px-8 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Save
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Desktop: Dropdown */
            <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 w-96 animate-slide-in-up">
              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Select time</h3>
                <button
                  onClick={handleCurrentTime}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Current time
                </button>
              </div>

              {/* Time Selection */}
              <div className={`flex ${includeSeconds ? 'space-x-6' : 'space-x-8'} mb-8`}>
                <TimeColumn
                  title="Hours"
                  values={hoursArray}
                  selectedValue={hours}
                  onValueChange={setHours}
                  scrollRef={hoursScrollRef}
                />
                <TimeColumn
                  title="Minutes"
                  values={minutesArray}
                  selectedValue={minutes}
                  onValueChange={setMinutes}
                  scrollRef={minutesScrollRef}
                />
                {includeSeconds && (
                  <TimeColumn
                    title="Seconds"
                    values={secondsArray}
                    selectedValue={seconds}
                    onValueChange={setSeconds}
                    scrollRef={secondsScrollRef}
                  />
                )}
              </div>

              {/* Selected Time Display */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center bg-gray-50 rounded-3xl px-8 py-4 border-2 border-gray-200">
                  <span className="text-4xl font-bold text-gray-900 tracking-wider">
                    {formatDisplayTime(hours, minutes, includeSeconds ? seconds : undefined)}
                  </span>
                </div>
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
                  className="px-8 py-3 bg-gray-900 text-white font-medium rounded-2xl hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
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