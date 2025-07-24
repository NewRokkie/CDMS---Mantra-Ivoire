import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  disabled = false,
  label,
  className = "",
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateValue = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    
    if (isDateDisabled(newDate)) return;
    
    setSelectedDate(newDate);
    onChange(formatDateValue(newDate));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange('');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-10 h-10"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isSelected = selectedDate && isSameDate(date, selectedDate);
      const isTodayDate = isToday(date);
      const isDisabled = isDateDisabled(date);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          disabled={isDisabled}
          className={`
            w-10 h-10 rounded-xl text-sm font-medium transition-all duration-200 relative
            ${isSelected
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110 z-10'
              : isDisabled
              ? 'text-gray-300 cursor-not-allowed'
              : isTodayDate
              ? 'bg-blue-50 text-blue-600 border-2 border-blue-200 hover:bg-blue-100'
              : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
            }
            ${!isDisabled && !isSelected ? 'hover:shadow-md' : ''}
          `}
        >
          {day}
          {isTodayDate && !isSelected && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
          )}
        </button>
      );
    }

    return days;
  };

  const displayValue = selectedDate ? formatDate(selectedDate) : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input Field */}
      <div className="relative">
        <button
          ref={inputRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl
            transition-all duration-300 text-left
            ${isOpen
              ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10'
              : selectedDate
              ? 'border-green-400 shadow-md shadow-green-400/10'
              : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center space-x-3">
            <Calendar className={`h-5 w-5 transition-colors duration-300 ${
              isOpen ? 'text-blue-500' : selectedDate ? 'text-green-500' : 'text-gray-400'
            }`} />
            <span className={`transition-colors duration-300 ${
              selectedDate ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}>
              {displayValue || placeholder}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedDate && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                title="Clear date"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </button>

        {/* Selected Date Indicator */}
        {selectedDate && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg animate-bounce-in">
            <Calendar className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Calendar Dropdown */}
    </div>
  );
};