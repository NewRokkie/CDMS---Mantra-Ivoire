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
  compact?: boolean;
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
  maxDate,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLButtonElement>(null);

  // Get current date for restrictions
  const today = new Date();
  const currentDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
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
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
    // Check if this is an end date or departure field (allow future dates)
    const isEndDateField = placeholder?.toLowerCase().includes('end date') ||
                           label?.toLowerCase().includes('end date') ||
                           placeholder?.toLowerCase().includes('departure') ||
                           label?.toLowerCase().includes('departure');
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const isMonthNavigationDisabled = (direction: 'prev' | 'next'): boolean => {
    // Check if this is an end date or departure field
    const isEndDateField = placeholder?.toLowerCase().includes('end date') ||
                           label?.toLowerCase().includes('end date') ||
                           placeholder?.toLowerCase().includes('departure') ||
                           label?.toLowerCase().includes('departure');

    // For end date fields, allow unlimited future navigation
    if (isEndDateField) {
      return false;
    }

    // For regular fields, only restrict future navigation
    if (direction === 'next') {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const nextMonthDate = new Date(nextYear, nextMonth, 1);
      return nextMonthDate > currentDateOnly;
    }

    return false;
  };

  const isToday = (date: Date): boolean => {
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
    // Clear the selected date completely
    const today = new Date();
    setSelectedDate(null);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setShowYearSelector(false);
    setIsFocused(false);
    onChange('');
  };

  const handleSave = () => {
    if (selectedDate) {
      onChange(formatDateValue(selectedDate));
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current date context and close
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setShowYearSelector(false);
    setIsFocused(false);
    setIsOpen(false);
  };

  const handleBackdropClick = () => {
    // Reset to current date context when clicking outside
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setShowYearSelector(false);
    setIsFocused(false);
    setIsOpen(false);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      // When opening, always reset to current date context and main view
      const today = new Date();
      setCurrentMonth(today.getMonth());
      setCurrentYear(today.getFullYear());
      setShowYearSelector(false);

      // Set selected date based on current value
      if (value) {
        const existingDate = new Date(value);
        setSelectedDate(existingDate);
        setCurrentMonth(existingDate.getMonth());
        setCurrentYear(existingDate.getFullYear());
      } else {
        setSelectedDate(null);
      }

      setIsFocused(true);
      setIsOpen(true);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next' && isMonthNavigationDisabled('next')) return;

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
    // Adjust first day to start with Monday (0 = Monday, 6 = Sunday)
    const firstDayRaw = getFirstDayOfMonth(currentMonth, currentYear);
    const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
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

  const handleCurrentDate = () => {
    setSelectedDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    onChange(formatDateValue(today));
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
          onClick={handleInputClick}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between ${compact ? 'h-10 px-3' : 'h-12 px-4 sm:py-3'} bg-white border-2 rounded-xl
            transition-all duration-300 text-left
            ${isOpen
              ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10'
              : selectedDate
              ? 'border-green-400 shadow-md shadow-green-400/10'
              : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
            touch-target
          `}
        >
          <div className="flex items-center space-x-3">
            <Calendar className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} transition-colors duration-300 ${
              isOpen ? 'text-blue-500' : selectedDate ? 'text-green-500' : 'text-gray-400'
            }`} />
            <span className={`transition-colors duration-300 ${compact ? 'text-sm' : 'text-base sm:text-sm'} ${
              selectedDate ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}>
              {displayValue || placeholder}
            </span>
          </div>

        </button>

        {/* Clear button (absolute, outside main button) */}
        {selectedDate && !disabled && (
          <div className={`absolute ${compact ? 'right-2' : 'right-3'} top-1/2 transform -translate-y-1/2 z-10`}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(e); }}
              className={`${compact ? 'p-1 m-2' : 'p-2'}  text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200`}
              title="Clear date"
            >
              <X className={`${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </button>
          </div>
        )}
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-[9998] animate-fade-in"
            onClick={handleBackdropClick}
          />

          {/* Centered Calendar Overlay */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-fade-scale-in">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-80 overflow-hidden">
              {/* Calendar Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowYearSelector(!showYearSelector)}
                    className="px-3 py-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="font-semibold text-gray-900">
                      {MONTHS[currentMonth]} {currentYear}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateMonth('next')}
                    disabled={isMonthNavigationDisabled('next')}
                    className={`p-2 rounded-lg transition-colors ${
                      isMonthNavigationDisabled('next')
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCurrentDate}
                  className="text-blue-600 hover:text-blue-800 font-medium px-3 py-1 hover:bg-blue-50 rounded-md transition-colors text-sm"
                >
                  Today
                </button>
              </div>

              {/* Calendar Content */}
              <div className="p-4 max-h-80 overflow-y-auto">
                {showYearSelector ? (
                  /* Year Selector */
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 text-center">Select Year</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {(() => {
                        const isEndDateField = placeholder?.toLowerCase().includes('end date') ||
                                               label?.toLowerCase().includes('end date');
                        const startYear = today.getFullYear() - 20;
                        const endYear = isEndDateField ? today.getFullYear() + 10 : today.getFullYear();
                        const yearRange = endYear - startYear + 1;

                        return Array.from({ length: yearRange }, (_, i) => startYear + i);
                      })().map(year => {
                        const isCurrentYear = year === today.getFullYear();
                        const isSelectedYear = year === currentYear;
                        const isEndDateField = placeholder?.toLowerCase().includes('end date') ||
                                               label?.toLowerCase().includes('end date');
                        const isFutureYear = !isEndDateField && year > today.getFullYear();

                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              if (isFutureYear) return;
                              setCurrentYear(year);
                              setShowYearSelector(false);
                            }}
                            disabled={isFutureYear}
                            className={`p-2 text-sm rounded-lg transition-all duration-200 ${
                              isSelectedYear
                                ? 'bg-blue-600 text-white shadow-md'
                                : isCurrentYear
                                ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
                                : isFutureYear
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Calendar Grid */
                  <div className="space-y-3">
                    {/* Days of Week Header - Starting with Monday */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendarDays()}
                    </div>
                  </div>
                )}
              </div>



              {/* Calendar Footer - Inside Picker */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!selectedDate}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
