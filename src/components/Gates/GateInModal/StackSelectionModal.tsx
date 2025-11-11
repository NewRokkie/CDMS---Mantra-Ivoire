import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { YardStack } from '../../../types/yard';

import { clientPoolService } from '../../../services/clientPoolService';
import { yardsService } from '../../../services/api/yardsService';
import { containerService } from '../../../services/api/containerService';
import { StandardModal } from '../../Common/Modal/StandardModal';
import { handleError } from '../../../services/errorHandling';

export interface StackLocation {
  id: string;
  formattedId: string; // S01R1H1 format
  stackNumber: number;
  row: number;
  height: number;
  isAvailable: boolean;
  section: string;
  containerSize: '20ft' | '40ft';
  currentOccupancy: number;
  capacity: number;
}

export interface StackSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onStackSelect: (stackId: string, formattedLocation: string) => void;
  containerSize: '20ft' | '40ft';
  containerQuantity: 1 | 2;
  yardId: string;
  selectedStackId?: string;
  clientCode?: string; // Add client code for pool filtering
}

export const StackSelectionModal: React.FC<StackSelectionModalProps> = ({
  isVisible,
  onClose,
  onStackSelect,
  containerSize,
  containerQuantity,
  yardId,
  selectedStackId,
  clientCode
}) => {
  const [stacks, setStacks] = useState<StackLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedHeight, setSelectedHeight] = useState<number | null>(null);

  // Load available stacks
  useEffect(() => {
    if (isVisible && yardId) {
      loadAvailableStacks();
    }
  }, [isVisible, yardId, containerSize, clientCode]);

  const loadAvailableStacks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const yard = yardsService.getYardById(yardId);
      if (!yard) {
        throw new Error('Yard not found');
      }

      // Get all containers to check occupancy
      const allContainers = await containerService.getAll();
      const yardContainers = yardsService.getYardContainers(yardId, allContainers);
      
      // Get available stacks based on client pool assignments
      let availableStackResults = [];
      
      if (clientCode) {
        // Check if client has a pool configuration
        const clientPool = clientPoolService.getClientPool(clientCode);
        
        if (clientPool && clientPool.isActive) {
          // Client has an active pool - get their assigned stacks only
          availableStackResults = clientPoolService.getAvailableStacksForClientInYard(
            clientCode,
            containerSize,
            yardId,
            yardContainers
          );
        } else {
          // Client doesn't have a pool configuration - show unassigned stacks
          const unassignedStacks = clientPoolService.getUnassignedStacks(yard);
          availableStackResults = unassignedStacks
            .filter(stack => isStackCompatible(stack, containerSize))
            .map(stack => {
              const stackContainers = yardContainers.filter((c: any) => {
                const match = c.location.match(/S(\d+)-R\d+-H\d+/);
                return match && parseInt(match[1]) === stack.stackNumber;
              });
              const currentOccupancy = stackContainers.length;
              const availableSlots = stack.capacity - currentOccupancy;
              
              const section = yard.sections.find(s => s.id === stack.sectionId);
              
              return {
                stackId: stack.id,
                stackNumber: stack.stackNumber,
                sectionName: section?.name || 'Unknown',
                availableSlots,
                totalCapacity: stack.capacity,
                isRecommended: availableSlots > 0,
                distance: 0
              };
            })
            .filter(result => result.availableSlots > 0);
        }
      } else {
        // No client code provided - show unassigned stacks
        const unassignedStacks = clientPoolService.getUnassignedStacks(yard);
        availableStackResults = unassignedStacks
          .filter(stack => isStackCompatible(stack, containerSize))
          .map(stack => {
            const stackContainers = yardContainers.filter((c: any) => {
              const match = c.location.match(/S(\d+)-R\d+-H\d+/);
              return match && parseInt(match[1]) === stack.stackNumber;
            });
            const currentOccupancy = stackContainers.length;
            const availableSlots = stack.capacity - currentOccupancy;
            
            const section = yard.sections.find(s => s.id === stack.sectionId);
            
            return {
              stackId: stack.id,
              stackNumber: stack.stackNumber,
              sectionName: section?.name || 'Unknown',
              availableSlots,
              totalCapacity: stack.capacity,
              isRecommended: availableSlots > 0,
              distance: 0
            };
          })
          .filter(result => result.availableSlots > 0);
      }

      // Convert to StackLocation format and handle virtual stacks for 40ft
      const stackLocations = await Promise.all(
        availableStackResults.map(async (result) => {
          const stack = yard.sections
            .flatMap(section => section.stacks)
            .find(s => s.id === result.stackId);
          
          if (!stack) return [];
          
          // For 40ft containers, create virtual stack locations
          if (containerSize === '40ft') {
            return getVirtualStackPositions(stack, result);
          } else {
            return getAvailablePositions(stack, result);
          }
        })
      );
      
      // Flatten and filter the results
      const allLocations = stackLocations.flat().filter(location => 
        location.isAvailable
      );
      
      setStacks(allLocations);
    } catch (err) {
      handleError(err, 'StackSelectionModal.loadAvailableStacks');
      setError('Failed to load available stack locations');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if stack is valid for 40ft containers
  // 40ft containers can ONLY be placed on VIRTUAL (even-numbered) stacks
  // that represent paired odd stacks (e.g., S04 = S03+S05, S24 = S23+S25)
  const isValidFortyFootStack = (stackNumber: number): boolean => {
    const specialStacks = [1, 31, 101, 103];
    if (specialStacks.includes(stackNumber)) return false;

    const validPairs = [
      [3, 5], [7, 9], [11, 13], [15, 17], [19, 21], [23, 25], [27, 29],
      [33, 35], [37, 39], [41, 43], [45, 47], [49, 51], [53, 55],
      [61, 63], [65, 67], [69, 71], [73, 75], [77, 79], [81, 83],
      [85, 87], [89, 91], [93, 95], [97, 99]
    ];

    return validPairs.some(pair => pair.includes(stackNumber));
  };

  // Helper function to check if a stack number is a valid VIRTUAL stack for 40ft
  // Virtual stacks are even numbers between paired odd stacks (e.g., 4, 8, 12, 24, 28)
  const isVirtualFortyFootStack = (stackNumber: number): boolean => {
    // Virtual stacks are always even numbers
    if (stackNumber % 2 !== 0) return false;

    // Check if this even number is between a valid pair
    const validVirtualStacks = [
      4, 8, 12, 16, 20, 24, 28,  // Zone A
      34, 38, 42, 46, 50, 54,     // Zone B
      62, 66, 70, 74, 78, 82,     // Zone C
      86, 90, 94, 98              // Zone D
    ];

    return validVirtualStacks.includes(stackNumber);
  };

  // Get virtual stack positions for 40ft containers
  const getVirtualStackPositions = async (stack: YardStack, result: any): Promise<StackLocation[]> => {
    const positions: StackLocation[] = [];
    
    if (!isValidFortyFootStack(stack.stackNumber)) {
      return positions;
    }

    // Calculate virtual stack number (like in YardLiveMap)
    const getAdjacentStackNumber = (stackNumber: number): number | null => {
      const validPairs = [
        [3, 5], [7, 9], [11, 13], [15, 17], [19, 21], [23, 25], [27, 29],
        [33, 35], [37, 39], [41, 43], [45, 47], [49, 51], [53, 55],
        [61, 63], [65, 67], [69, 71], [73, 75], [77, 79], [81, 83],
        [85, 87], [89, 91], [93, 95], [97, 99]
      ];

      for (const pair of validPairs) {
        if (pair.includes(stackNumber)) {
          return pair.find(num => num !== stackNumber) || null;
        }
      }
      return null;
    };

    const pairedStackNumber = getAdjacentStackNumber(stack.stackNumber);
    if (!pairedStackNumber) return positions;

    // Virtual stack number is the lower stack number + 1
    const virtualStackNumber = Math.min(stack.stackNumber, pairedStackNumber) + 1;
    
    // For each row and height combination, create a virtual position
    for (let row = 1; row <= stack.rows; row++) {
      for (let height = 1; height <= stack.maxTiers; height++) {
        const formattedId = formatStackLocation(virtualStackNumber, row, height);
        const isAvailable = result.availableSlots > 0; // Use the availability from client pool service
        
        positions.push({
          id: `${stack.id}-virtual-R${row}H${height}`,
          formattedId,
          stackNumber: virtualStackNumber,
          row,
          height,
          isAvailable,
          section: stack.sectionName || 'Main',
          containerSize: '40ft',
          currentOccupancy: result.totalCapacity - result.availableSlots,
          capacity: result.totalCapacity
        });
      }
    }
    
    return positions;
  };

  // Generate available positions for a stack
  const getAvailablePositions = async (stack: YardStack, result: any): Promise<StackLocation[]> => {
    const positions: StackLocation[] = [];
    
    // For each row and height combination, create a position if available
    for (let row = 1; row <= stack.rows; row++) {
      for (let height = 1; height <= stack.maxTiers; height++) {
        const formattedId = formatStackLocation(stack.stackNumber, row, height);
        const isAvailable = result.availableSlots > 0; // Use the availability from client pool service
        
        positions.push({
          id: `${stack.id}-R${row}H${height}`,
          formattedId,
          stackNumber: stack.stackNumber,
          row,
          height,
          isAvailable,
          section: stack.sectionName || 'Main',
          containerSize: stack.containerSize === '20ft' ? '20ft' : '40ft',
          currentOccupancy: result.totalCapacity - result.availableSlots,
          capacity: result.totalCapacity
        });
      }
    }
    
    return positions;
  };

  // Format stack location as S##R#H# pattern
  const formatStackLocation = (stackNumber: number, row: number, height: number): string => {
    return `S${String(stackNumber).padStart(2, '0')}R${row}H${height}`;
  };



  // Check if stack is compatible with container requirements
  const isStackCompatible = (stack: YardStack, reqSize: '20ft' | '40ft'): boolean => {
    // For 20ft containers, any stack can accommodate
    if (reqSize === '20ft') return true;

    // For 40ft containers, ONLY physical odd stacks that are part of valid pairs
    // These will be converted to virtual stacks in getVirtualStackPositions
    if (reqSize === '40ft') {
      return isValidFortyFootStack(stack.stackNumber);
    }
    
    return true;
  };

  // Validate stack format (S##R#H# pattern)
  const validateStackFormat = (formattedId: string): boolean => {
    const stackPattern = /^S\d{2}R\d+H\d+$/;
    return stackPattern.test(formattedId);
  };

  // Filter stacks based on search and filters
  const filteredStacks = useMemo(() => {
    let filtered = stacks.filter(stack => stack.isAvailable);
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(stack => 
        stack.formattedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stack.section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Row filter
    if (selectedRow !== null) {
      filtered = filtered.filter(stack => stack.row === selectedRow);
    }
    
    // Height filter
    if (selectedHeight !== null) {
      filtered = filtered.filter(stack => stack.height === selectedHeight);
    }
    
    return filtered.sort((a, b) => {
      // Sort by stack number, then row, then height
      if (a.stackNumber !== b.stackNumber) {
        return a.stackNumber - b.stackNumber;
      }
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.height - b.height;
    });
  }, [stacks, searchTerm, selectedRow, selectedHeight]);

  // Get unique values for filters
  const availableRows = useMemo(() => {
    return [...new Set(stacks.map(s => s.row))].sort((a, b) => a - b);
  }, [stacks]);

  const availableHeights = useMemo(() => {
    return [...new Set(stacks.map(s => s.height))].sort((a, b) => a - b);
  }, [stacks]);

  const getSubtitleText = (): string => {
    if (!clientCode) {
      return ' (Unassigned stacks)';
    }
    
    const clientPool = clientPoolService.getClientPool(clientCode);
    if (clientPool && clientPool.isActive) {
      return ` (Client: ${clientCode} - Pool assigned stacks)`;
    } else {
      return ` (Client: ${clientCode} - No pool config, showing unassigned stacks)`;
    }
  };

  const handleStackSelect = (stack: StackLocation) => {
    if (!validateStackFormat(stack.formattedId)) {
      setError('Invalid stack format');
      return;
    }
    
    // Additional validation for 40ft containers
    if (containerSize === '40ft') {
      // Extract stack number from formatted ID (e.g., "S24R1H1" -> 24)
      const stackNumberMatch = stack.formattedId.match(/^S(\d+)/);
      if (stackNumberMatch) {
        const stackNum = parseInt(stackNumberMatch[1]);
        
        // 40ft containers MUST be placed on virtual (even) stacks only
        if (!isVirtualFortyFootStack(stackNum)) {
          setError(`Invalid stack for 40ft container. Stack ${stackNum} is not a valid virtual stack. 40ft containers can only be placed on virtual stacks like S04, S08, S12, S24, S28, etc.`);
          return;
        }
      }
    }
    
    onStackSelect(stack.id, stack.formattedId);
    onClose();
  };

  return (
    <StandardModal
      isOpen={isVisible}
      onClose={onClose}
      title="Select Stack Location"
      subtitle={`Choose an available stack position for ${containerSize} container${containerQuantity === 2 ? 's (double)' : ''}${getSubtitleText()}`}
      icon={MapPin}
      size="xl"
    >
      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 -mx-6 -mt-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by stack ID or section..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Row Filter */}
          <div className="sm:w-32">
            <select
              value={selectedRow || ''}
              onChange={(e) => setSelectedRow(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Rows</option>
              {availableRows.map(row => (
                <option key={row} value={row}>Row {row}</option>
              ))}
            </select>
          </div>
          
          {/* Height Filter */}
          <div className="sm:w-32">
            <select
              value={selectedHeight || ''}
              onChange={(e) => setSelectedHeight(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Heights</option>
              {availableHeights.map(height => (
                <option key={height} value={height}>Height {height}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading available stacks...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Results Summary */}
            <div className="mb-4 space-y-1">
              <div className="text-sm text-gray-600">
                Showing {filteredStacks.length} available positions
                {searchTerm && ` matching "${searchTerm}"`}
              </div>
              {clientCode && (
                <div className="text-xs text-blue-600">
                  {(() => {
                    const clientPool = clientPoolService.getClientPool(clientCode);
                    if (clientPool && clientPool.isActive) {
                      return `📋 Showing stacks assigned to ${clientCode} pool`;
                    } else {
                      return `🔓 No pool configured for ${clientCode} - showing all unassigned stacks`;
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Stack Grid */}
            {filteredStacks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStacks.map((stack) => (
                  <div
                    key={stack.id}
                    onClick={() => handleStackSelect(stack)}
                    className={`
                      p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md
                      ${selectedStackId === stack.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-lg text-gray-900">
                        {stack.formattedId}
                      </span>
                      {selectedStackId === stack.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Section: {stack.section}</div>
                      <div>Size: {stack.containerSize}</div>
                      <div>
                        Occupancy: {stack.currentOccupancy}/{stack.capacity}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center text-xs text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Positions</h3>
                <p className="text-gray-600">
                  No stack positions match your criteria. Try adjusting your filters or search terms.
                </p>
              </div>
            )}
          </>
        )}

      </div>
    </StandardModal>
  );
};