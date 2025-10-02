import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Building, AlertTriangle, Loader } from 'lucide-react';
import { useYard } from '../../hooks/useYard';
import { useAuth } from '../../hooks/useAuth';

export const YardSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { currentYard, availableYards, setCurrentYard, error } = useYard();
  const { user } = useAuth();

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

  const handleYardChange = async (yardId: string) => {
    if (yardId === currentYard?.id || isChanging) return;

    setIsChanging(true);
    try {
      const success = await setCurrentYard(yardId);
      if (success) {
        setIsOpen(false);
        // Show success feedback
        const selectedYard = availableYards.find(y => y.id === yardId);
        if (selectedYard) {
          // You could add a toast notification here
          console.log(`Switched to ${selectedYard.name}`);
        }
      } else {
        alert('Failed to switch yard. Please try again.');
      }
    } catch (error) {
      alert(`Error switching yard: ${error}`);
    } finally {
      setIsChanging(false);
    }
  };

  // Don't show selector if user has access to only one yard
  if (availableYards.length <= 1) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
        <MapPin className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {currentYard?.name || 'No Yard Selected'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Yard Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className={`
          flex items-center space-x-2 px-2.5 lg:px-4 py-2 bg-white border-2 rounded-xl
          transition-all duration-300 max-w-[140px] lg:min-w-[200px] lg:max-w-none
          ${isOpen
            ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10'
            : currentYard
            ? 'border-green-400 shadow-md shadow-green-400/10'
            : 'border-gray-200 hover:border-gray-300 shadow-sm'
          }
          ${isChanging ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
        `}
      >
        <div className="flex items-center space-x-1.5 lg:space-x-2 min-w-0 flex-1">
          {isChanging ? (
            <Loader className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-blue-500 animate-spin flex-shrink-0" />
          ) : (
            <MapPin className={`h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0 ${currentYard ? 'text-green-500' : 'text-gray-400'}`} />
          )}
          <div className="text-left min-w-0 flex-1">
            {currentYard ? (
              <>
                <div className="font-semibold text-gray-900 text-xs lg:text-sm truncate">{currentYard.name}</div>
                <div className="text-[10px] lg:text-xs text-gray-500 truncate hidden lg:block">{currentYard.code}</div>
              </>
            ) : (
              <div className="text-gray-500 text-xs lg:text-sm truncate">Select...</div>
            )}
          </div>
        </div>

        <ChevronDown className={`h-3.5 w-3.5 lg:h-4 lg:w-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 z-50">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          {error}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute w-full lg:w-[400px] top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-in-up">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Available Yards
              </span>
              <span className="text-xs text-gray-500">
                {availableYards.length} yard{availableYards.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Yard List */}
          <div className="max-h-48 lg:max-h-64 overflow-y-auto">
            {availableYards.map((yard) => {
              const isSelected = currentYard?.id === yard.id;
              const occupancyRate = (yard.currentOccupancy / yard.totalCapacity) * 100;
              
              return (
                <button
                  key={yard.id}
                  onClick={() => handleYardChange(yard.id)}
                  disabled={isChanging}
                  className={`
                    w-full text-left p-3 lg:p-4 transition-all duration-200 group
                    ${isSelected 
                      ? 'bg-green-50 border-l-4 border-green-500' 
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }
                    ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                      <div className={`
                        p-1.5 lg:p-2 rounded-lg transition-all duration-200 flex-shrink-0
                        ${isSelected 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }
                      `}>
                        <Building className="h-3 w-3 lg:h-4 lg:w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`
                            font-medium text-sm truncate
                            ${isSelected ? 'text-green-900' : 'text-gray-900'}
                          `}>
                            {yard.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate lg:hidden">
                          {yard.code}
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="bg-green-500 text-white rounded-full p-1 animate-scale-in">
                          <Check className="h-2 w-2 lg:h-3 lg:w-3" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};