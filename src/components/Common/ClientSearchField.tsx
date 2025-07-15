import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Building } from 'lucide-react';

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
}

export const ClientSearchField: React.FC<ClientSearchFieldProps> = ({
  clients,
  selectedClientId,
  onClientSelect,
  placeholder = "Search client...",
  required = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
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
        inputRef.current?.blur();
        break;
    }
  };

  const handleClientSelect = (client: Client) => {
    onClientSelect(client.id);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
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
    setIsOpen(true);
  };

  const displayValue = selectedClient 
    ? `${selectedClient.code} - ${selectedClient.name}`
    : searchTerm;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`form-input w-full pl-10 pr-10 ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : ''
          }`}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredClients.length > 0 ? (
            <ul className="py-1">
              {filteredClients.map((client, index) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => handleClientSelect(client)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      index === highlightedIndex ? 'bg-blue-50' : ''
                    } ${
                      selectedClientId === client.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{client.code}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-700 truncate">{client.name}</span>
                        </div>
                      </div>
                      {selectedClientId === client.id && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500">
              <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No clients found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your search terms
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};