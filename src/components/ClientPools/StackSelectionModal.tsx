import React, { useState, useEffect } from 'react';
import { X, Search, Check, Grid3X3, Package, Loader, AlertTriangle } from 'lucide-react';
import { stackService } from '../../services/api';
import { handleError } from '../../services/errorHandling';
import { StackCapacityCalculator } from '../../utils/stackCapacityCalculator';

interface Stack {
  id: string;
  stackNumber: number;
  sectionId: string;
  sectionName: string;
  rows: number;
  maxTiers: number;
  containerSize: '20ft' | '40ft';
  isSpecialStack: boolean;
  isVirtual: boolean;
  currentOccupancy: number;
  maxCapacity: number;
}

interface StackSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedStackIds: string[]) => void;
  yardId: string;
  availableStacks?: Stack[]; // Optional: provide stacks directly instead of fetching
  initialSelectedStacks?: string[];
  excludeStackIds?: string[]; // Stacks already assigned to other pools
  title?: string;
  subtitle?: string;
}

export const StackSelectionModal: React.FC<StackSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  yardId,
  availableStacks: providedStacks,
  initialSelectedStacks = [],
  excludeStackIds = [],
  title = 'Select Stacks',
  subtitle = 'Choose stacks to assign to this client pool'
}) => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStackIds, setSelectedStackIds] = useState<Set<string>>(new Set(initialSelectedStacks));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSize, setFilterSize] = useState<'all' | '20ft' | '40ft'>('all');

  useEffect(() => {
    if (isOpen) {
      if (providedStacks) {
        // Use provided stacks directly
        const filteredStacks = providedStacks.filter(stack => !excludeStackIds.includes(stack.id));
        setStacks(filteredStacks);
        setLoading(false);
      } else {
        // Fetch stacks from API
        loadStacks();
      }
      setSelectedStackIds(new Set(initialSelectedStacks));
    }
  }, [isOpen, yardId, initialSelectedStacks, providedStacks, excludeStackIds]);

  const loadStacks = async () => {
    try {
      setLoading(true);
      const allStacks = await stackService.getAll(yardId);
      
      // Transform to our Stack interface and filter out excluded stacks and virtual stacks
      const transformedStacks: Stack[] = allStacks
        .filter(stack => {
          // Filter out excluded stacks
          if (excludeStackIds.includes(stack.id)) return false;
          
          // Filter out virtual stacks (even stack numbers)
          // Virtual stacks are automatically handled when physical stacks are assigned
          if (stack.stackNumber % 2 === 0) return false;
          
          return true;
        })
        .map(stack => ({
          id: stack.id,
          stackNumber: stack.stackNumber,
          sectionId: stack.sectionId || '',
          sectionName: stack.sectionName || 'Unknown Section',
          rows: stack.rows || 6,
          maxTiers: stack.maxTiers || 4,
          containerSize: stack.containerSize || '20ft',
          isSpecialStack: stack.isSpecialStack || false,
          isVirtual: false, // All remaining stacks are physical
          currentOccupancy: stack.currentOccupancy || 0,
          maxCapacity: stack.capacity || (stack.rows || 6) * (stack.maxTiers || 4) // Use real capacity from database
        }));

      setStacks(transformedStacks);
    } catch (error) {
      handleError(error, 'StackSelectionModal.loadStacks');
    } finally {
      setLoading(false);
    }
  };

  const handleStackToggle = (stackId: string) => {
    setSelectedStackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stackId)) {
        newSet.delete(stackId);
      } else {
        newSet.add(stackId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStackIds.size === filteredStacks.length) {
      setSelectedStackIds(new Set());
    } else {
      setSelectedStackIds(new Set(filteredStacks.map(s => s.id)));
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    const sectionStacks = filteredStacks.filter(s => s.sectionId === sectionId);
    const allSelected = sectionStacks.every(s => selectedStackIds.has(s.id));
    
    setSelectedStackIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        sectionStacks.forEach(s => newSet.delete(s.id));
      } else {
        sectionStacks.forEach(s => newSet.add(s.id));
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedStackIds));
    onClose();
  };

  // Filter stacks
  const filteredStacks = stacks.filter(stack => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      stack.stackNumber.toString().includes(searchTerm) ||
      `s${stack.stackNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stack.sectionName.toLowerCase().includes(searchTerm.toLowerCase());

    // Size filter
    const matchesSize = filterSize === 'all' || stack.containerSize === filterSize;

    return matchesSearch && matchesSize;
  });

  // Group by section
  const sections = Array.from(new Set(filteredStacks.map(s => s.sectionId)))
    .map(sectionId => ({
      id: sectionId,
      name: filteredStacks.find(s => s.sectionId === sectionId)?.sectionName || 'Unknown',
      stacks: filteredStacks.filter(s => s.sectionId === sectionId)
    }));

  // Calculate total capacity using effective capacity logic
  const selectedStacks = Array.from(selectedStackIds).map(stackId => stacks.find(s => s.id === stackId)).filter(Boolean);
  const totalCapacity = StackCapacityCalculator.calculateTotalEffectiveCapacity(selectedStacks.map(stack => ({
    ...stack,
    capacity: stack.maxCapacity,
    containerSize: stack.containerSize,
    isVirtual: stack.isVirtual
  })));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#A0C800] to-[#8bb400] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Grid3X3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-sm text-white/90">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by stack number or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800]"
                />
              </div>
            </div>

            {/* Size Filter */}
            <div className="flex gap-2">
              {(['all', '20ft', '40ft'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFilterSize(size)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                    filterSize === size
                      ? 'bg-[#A0C800] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-[#A0C800] hover:text-[#A0C800]'
                  }`}
                >
                  {size === 'all' ? 'All Sizes' : size}
                </button>
              ))}
            </div>

            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:border-[#A0C800] hover:text-[#A0C800] transition-colors"
            >
              {selectedStackIds.size === filteredStacks.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Selection Summary */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#A0C800]"></div>
                <span className="text-gray-700">
                  <span className="font-semibold">{selectedStackIds.size}</span> stacks selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  Total capacity: <span className="font-semibold">{totalCapacity}</span> containers
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredStacks.length} available stacks
            </div>
          </div>
        </div>

        {/* Stack Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-[#A0C800]" />
              <span className="ml-3 text-gray-600">Loading stacks...</span>
            </div>
          ) : filteredStacks.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stacks Available</h3>
              <p className="text-gray-600">
                {searchTerm || filterSize !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All stacks are currently assigned to other pools'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.id} className="space-y-4">
                  {/* Section Header */}
                  <div className="flex items-center justify-between sticky top-0 bg-white py-2 z-10">
                    <div className="flex items-center space-x-3">
                      <Grid3X3 className="h-5 w-5 text-[#A0C800]" />
                      <h4 className="text-lg font-semibold text-gray-900">{section.name}</h4>
                      <span className="text-sm text-[#A0C800] bg-[#A0C800]/10 px-3 py-1 rounded-full font-medium">
                        {section.stacks.filter(s => selectedStackIds.has(s.id)).length}/{section.stacks.length} selected
                      </span>
                    </div>
                    <button
                      onClick={() => handleSectionToggle(section.id)}
                      className="text-sm font-medium text-[#A0C800] hover:text-[#8bb400] px-3 py-1.5 hover:bg-[#A0C800]/10 rounded-md transition-colors"
                    >
                      {section.stacks.every(s => selectedStackIds.has(s.id)) ? 'Deselect Section' : 'Select Section'}
                    </button>
                  </div>

                  {/* Stack Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-3">
                    {section.stacks.map((stack) => {
                      const isSelected = selectedStackIds.has(stack.id);
                      const occupancyPercent = (stack.currentOccupancy / stack.maxCapacity) * 100;

                      return (
                        <button
                          key={stack.id}
                          type="button"
                          onClick={() => handleStackToggle(stack.id)}
                          className={`relative group w-full aspect-square rounded-lg border-2 transition-all transform hover:scale-105 ${
                            isSelected
                              ? 'border-[#A0C800] bg-[#A0C800]/10 shadow-lg shadow-[#A0C800]/20'
                              : 'border-gray-200 bg-white hover:border-[#A0C800] hover:bg-[#A0C800]/5 shadow-sm hover:shadow-md'
                          }`}
                          title={`Stack ${stack.stackNumber} - ${stack.containerSize}\n${stack.rows} Rows × ${stack.maxTiers} Tiers\nCapacity: ${stack.maxCapacity} containers\nOccupancy: ${stack.currentOccupancy}/${stack.maxCapacity} (${occupancyPercent.toFixed(0)}%)`}
                        >
                          {/* Stack Number */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className={`font-bold text-lg ${
                              isSelected ? 'text-[#A0C800]' : 'text-gray-700 group-hover:text-[#A0C800]'
                            }`}>
                              {stack.stackNumber.toString().padStart(2, '0')}
                            </div>
                            <div className={`text-xs mt-0.5 ${
                              isSelected ? 'text-[#A0C800]' : 'text-gray-500 group-hover:text-[#A0C800]'
                            }`}>
                              {stack.containerSize}
                            </div>
                          </div>

                          {/* Occupancy Indicator */}
                          {stack.currentOccupancy > 0 && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    occupancyPercent >= 90 ? 'bg-red-500' :
                                    occupancyPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${occupancyPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 bg-[#A0C800] text-white rounded-full p-1 shadow-md">
                              <Check className="h-3 w-3" />
                            </div>
                          )}

                          {/* Special Stack Badge */}
                          {stack.isSpecialStack && (
                            <div className="absolute -top-1 -left-1 bg-orange-500 text-white rounded-full p-1 shadow-md" title="Special Stack">
                              <AlertTriangle className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedStackIds.size > 0 ? (
                <span>
                  Selected <span className="font-semibold text-[#A0C800]">{selectedStackIds.size}</span> stacks with total capacity of <span className="font-semibold text-[#A0C800]">{totalCapacity}</span> containers
                </span>
              ) : (
                <span>No stacks selected</span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedStackIds.size === 0}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Confirm Selection</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
