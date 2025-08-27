import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, FileText, X, Calendar, Package, User, AlertTriangle } from 'lucide-react';
import { ReleaseOrder } from '../../types';

interface ReleaseOrderSearchFieldProps {
  releaseOrders: ReleaseOrder[];
  selectedOrderId: string;
  onOrderSelect: (orderId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  canViewAllData?: boolean;
}

export const ReleaseOrderSearchField: React.FC<ReleaseOrderSearchFieldProps> = ({
  releaseOrders,
  selectedOrderId,
  onOrderSelect,
  placeholder = "Search release orders...",
  required = false,
  disabled = false,
  canViewAllData = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOrder = releaseOrders.find(order => order.id === selectedOrderId);

  // Filter and validate release orders
  const getValidReleaseOrders = () => {
    return releaseOrders.filter(order => {
      // Only show validated orders that are ready for gate out
      const isValidStatus = order.status === 'validated';
      const hasReadyContainers = order.containers.some(c => c.status === 'ready');
      return isValidStatus && hasReadyContainers;
    });
  };

  const validOrders = getValidReleaseOrders();

  // Filter orders based on search term
  const filteredOrders = validOrders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.containers.some(c => c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOrders.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOrders.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOrders[highlightedIndex]) {
          handleOrderSelect(filteredOrders[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleOrderSelect = (order: ReleaseOrder) => {
    onOrderSelect(order.id);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    setIsFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setHighlightedIndex(-1);
    
    if (!isOpen && value) {
      setIsOpen(true);
    }
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

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOrderSelect('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const displayValue = selectedOrder 
    ? `${selectedOrder.bookingNumber || selectedOrder.id} - ${selectedOrder.clientName}`
    : searchTerm;

  const getStatusColor = (status: ReleaseOrder['status']) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Main Input Container */}
      <div className={`
        relative group transition-all duration-300 ease-in-out
        ${isFocused || isOpen ? 'transform scale-[1.01]' : ''}
      `}>
        {/* Input Field */}
        <div className={`
          relative flex items-center bg-white border-2 rounded-xl transition-all duration-300
          ${isFocused || isOpen 
            ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10' 
            : selectedOrder 
            ? 'border-green-400 shadow-md shadow-green-400/10' 
            : 'border-gray-200 hover:border-gray-300 shadow-sm'
          }
          ${disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'hover:shadow-md'}
        `}>
          
          {/* Search Icon */}
          <div className={`
            absolute left-4 transition-all duration-300 z-10
            ${isFocused || isOpen ? 'text-blue-500 scale-110' : 'text-gray-400'}
          `}>
            <Search className="h-5 w-5" />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`
            w-full pl-12 pr-20 py-4 bg-transparent text-gray-900 placeholder-gray-400
              focus:outline-none transition-all duration-300
              ${disabled ? 'cursor-not-allowed text-gray-500' : ''}
              text-sm md:text-base font-medium
            `}
            autoComplete="off"
          />

          {/* Right Side Icons */}
          <div className="absolute right-4 flex items-center space-x-2">
            {/* Clear Button */}
            {selectedOrder && !disabled && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 group"
                title="Clear selection"
              >
                <X className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Dropdown Arrow */}
            <div className={`
              transition-all duration-300 
              ${isFocused || isOpen ? 'text-blue-500 rotate-180' : 'text-gray-400'}
              ${disabled ? 'text-gray-300' : ''}
            `}>
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>

          {/* Selected Order Indicator */}
          {selectedOrder && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg animate-bounce-in">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Focus Ring Animation */}
        {(isFocused || isOpen) && (
          <div className="absolute inset-0 rounded-xl border-2 border-blue-500 animate-pulse opacity-20 pointer-events-none" />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`
          absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl
          max-h-80 overflow-hidden animate-slide-in-up
        `}>
          {/* Validation Warning */}
          {validOrders.length < releaseOrders.length && (
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-yellow-800">
                  Only showing validated orders ready for gate out
                </span>
              </div>
            </div>
          )}

          {filteredOrders.length > 0 ? (
            <>
              {/* Search Results Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {filteredOrders.length} Release Order{filteredOrders.length !== 1 ? 's' : ''} Available
                  </span>
                  {searchTerm && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      "{searchTerm}"
                    </span>
                  )}
                </div>
              </div>

              {/* Release Orders List */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {filteredOrders.map((order, index) => {
                  const readyContainers = order.containers.filter(c => c.status === 'ready').length;
                  
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => handleOrderSelect(order)}
                      className={`
                        w-full text-left p-4 transition-all duration-200 group border-l-4
                        ${index === highlightedIndex 
                          ? 'bg-blue-50 border-blue-500' 
                          : selectedOrderId === order.id 
                          ? 'bg-green-50 border-green-500' 
                          : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Order Header */}
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className={`
                              h-4 w-4 transition-colors duration-200
                              ${index === highlightedIndex 
                                ? 'text-blue-600' 
                                : selectedOrderId === order.id 
                                ? 'text-green-600' 
                                : 'text-gray-500 group-hover:text-gray-700'
                              }
                            `} />
                            <span className={`
                              font-bold text-sm transition-colors duration-200
                              ${index === highlightedIndex 
                                ? 'text-blue-900' 
                                : selectedOrderId === order.id 
                                ? 'text-green-900' 
                                : 'text-gray-900'
                              }
                            `}>
                              {order.id}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>

                          {/* Order Details */}
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {canViewAllData ? order.clientName : 'Your Company'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Package className="h-3 w-3" />
                                <span>{readyContainers}/{order.containers.length} ready</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created {formatDate(order.createdAt)}</span>
                              {order.estimatedReleaseDate && (
                                <span className="text-blue-600">
                                  • Est. {formatDate(order.estimatedReleaseDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedOrderId === order.id && (
                          <div className="flex-shrink-0 ml-3">
                            <div className="bg-green-500 text-white rounded-full p-1 animate-scale-in">
                              <Check className="h-3 w-3" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-8 px-4">
              <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {searchTerm ? 'No matching release orders' : 'No release orders available'}
              </h3>
              <p className="text-xs text-gray-500">
                {searchTerm 
                  ? `No results for "${searchTerm}". Try a different search term.`
                  : 'No validated release orders are ready for gate out.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};