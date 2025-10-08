import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Building, X } from 'lucide-react';

interface Client {
  id: string;
  code: string;
  name: string;
}

interface ClientSearchFieldProps {
  clients: Client[];
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export const ClientSearchField: React.FC<ClientSearchFieldProps> = ({
  clients,
  selectedClientId,
  onClientSelect,
  placeholder = "Search client by name or code...",
  required = false,
  disabled = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find(client => client.id === selectedClientId);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(searchTerm.toLowerCase())
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
          prev < filteredClients.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredClients.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredClients[highlightedIndex]) {
          handleClientSelect(filteredClients[highlightedIndex]);
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

  const handleClientSelect = (client: Client) => {
    onClientSelect(client.id);
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
    // Delay to allow for dropdown clicks
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 150);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClientSelect('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const displayValue = selectedClient
    ? `${selectedClient.code} - ${selectedClient.name}`
    : searchTerm;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Main Input Container */}
      <div className={`
        relative group transition-all duration-300 ease-in-out
        ${isFocused || isOpen ? 'transform scale-[1.02]' : ''}
      `}>
        {/* Input Field */}
        <div className={`
          relative flex items-center bg-white border-2 rounded-xl transition-all duration-300
          ${isFocused || isOpen
            ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10'
            : selectedClient
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
            <Search className={compact ? "h-4 w-4" : "h-5 w-5"} />
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
            w-full ${compact ? 'pl-10 pr-16 py-2 text-sm' : 'pl-12 pr-20 py-4 text-sm md:text-base'} bg-transparent text-gray-900 placeholder-gray-400
              focus:outline-none transition-all duration-300
              ${disabled ? 'cursor-not-allowed text-gray-500' : ''}
              font-medium
            `}
            autoComplete="off"
          />

          {/* Right Side Icons */}
          <div className="absolute right-4 flex items-center space-x-2">
            {/* Clear Button */}
            {selectedClient && !disabled && (
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
          max-h-64 overflow-hidden animate-slide-in-up
          ${filteredClients.length > 0 ? '' : 'py-4'}
        `}>
          {filteredClients.length > 0 ? (
            <>
              {/* Search Results Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {filteredClients.length} Client{filteredClients.length !== 1 ? 's' : ''} Found
                  </span>
                  {searchTerm && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      "{searchTerm}"
                    </span>
                  )}
                </div>
              </div>

              {/* Client List */}
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                {filteredClients.map((client, index) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client)}
                    className={`
                      w-full text-left ${compact ? 'px-3 py-2' : 'px-4 py-4'} transition-all duration-200 group
                      ${index === highlightedIndex
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }
                      ${selectedClientId === client.id
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : ''
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Client Icon */}
                      <div className={`
                        p-2 rounded-lg transition-all duration-200
                        ${index === highlightedIndex || selectedClientId === client.id
                          ? 'bg-white shadow-md'
                          : 'bg-gray-100 group-hover:bg-white group-hover:shadow-sm'
                        }
                      `}>
                        <Building className={`
                          h-4 w-4 transition-colors duration-200
                          ${index === highlightedIndex
                            ? 'text-blue-600'
                            : selectedClientId === client.id
                            ? 'text-green-600'
                            : 'text-gray-500 group-hover:text-gray-700'
                          }
                        `} />
                      </div>

                      {/* Client Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`
                            font-bold text-sm transition-colors duration-200
                            ${index === highlightedIndex
                              ? 'text-blue-900'
                              : selectedClientId === client.id
                              ? 'text-green-900'
                              : 'text-gray-900'
                            }
                          `}>
                            {client.code}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className={`
                            text-sm truncate transition-colors duration-200
                            ${index === highlightedIndex
                              ? 'text-blue-700'
                              : selectedClientId === client.id
                              ? 'text-green-700'
                              : 'text-gray-600'
                            }
                          `}>
                            {client.name}
                          </span>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {selectedClientId === client.id && (
                        <div className="flex-shrink-0">
                          <div className="bg-green-500 text-white rounded-full p-1 animate-scale-in">
                            <Check className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-8 px-4">
              <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No clients found</h3>
              <p className="text-xs text-gray-500">
                {searchTerm
                  ? `No results for "${searchTerm}". Try a different search term.`
                  : 'No clients available to select from.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
