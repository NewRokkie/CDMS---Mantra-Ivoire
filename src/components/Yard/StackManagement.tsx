import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Yard } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { StackManagementHeader } from './StackManagement/StackManagementHeader';
import { StackManagementFilters } from './StackManagement/StackManagementFilters';
import { StackConfigurationTable } from './StackManagement/StackConfigurationTable';
import { StackConfigurationRules } from './StackManagement/StackConfigurationRules';
import { StackPairingInfo } from './StackManagement/StackPairingInfo';
import { yardService } from '../../services/yardService';

interface StackConfiguration {
  stackId: string;
  stackNumber: number;
  sectionId: string;
  sectionName: string;
  containerSize: '20feet' | '40feet';
  isSpecialStack: boolean;
  lastModified: Date;
  modifiedBy: string;
}

interface StackManagementProps {
  yard?: Yard;
  onConfigurationChange: (configurations: StackConfiguration[]) => void;
}

export const StackManagement: React.FC<StackManagementProps> = ({
  yard: propYard,
  onConfigurationChange
}) => {
  const { user } = useAuth();
  const { currentYard, availableYards } = useYard();
  const [configurations, setConfigurations] = useState<StackConfiguration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const canManageStacks = user?.role === 'admin' || user?.role === 'supervisor';
  
  // Use current yard from context, fallback to prop yard
  const activeYard = currentYard || propYard;

  // Special stacks that are locked to 20feet only
  const SPECIAL_STACKS = [1, 31, 101, 103];

  useEffect(() => {
    if (activeYard) {
      initializeConfigurations();
    } else {
      setError('No yard selected for stack management');
      setIsLoading(false);
    }
  }, [activeYard, user]);

  const initializeConfigurations = () => {
    if (!activeYard) {
      setError('No active yard available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const allStacks = activeYard.sections.flatMap(section => section.stacks);
      
      if (allStacks.length === 0) {
        setError(`No stacks found in ${activeYard.name}`);
        setIsLoading(false);
        return;
      }

      const stackConfigs: StackConfiguration[] = [];

      // Initialize stack configurations
      allStacks.forEach(stack => {
        const isSpecial = SPECIAL_STACKS.includes(stack.stackNumber);
        
        stackConfigs.push({
          stackId: stack.id,
          stackNumber: stack.stackNumber,
          sectionId: stack.sectionId,
          sectionName: activeYard.sections.find(s => s.id === stack.sectionId)?.name || 'Unknown',
          containerSize: '20feet', // Default to 20feet
          isSpecialStack: isSpecial,
          lastModified: new Date(),
          modifiedBy: user?.name || 'System'
        });
      });

      setConfigurations(stackConfigs.sort((a, b) => a.stackNumber - b.stackNumber));
      console.log(`Loaded ${stackConfigs.length} stack configurations for ${activeYard.name}`);
    } catch (error) {
      console.error('Error initializing stack configurations:', error);
      setError(`Failed to load stack configurations: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredConfigurations = () => {
    let filtered = configurations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(config =>
        config.stackNumber.toString().includes(searchTerm) ||
        config.sectionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply section filter
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(config => config.sectionId === sectionFilter);
    }

    return filtered.sort((a, b) => a.stackNumber - b.stackNumber);
  };

  // Get the correct adjacent stack number based on the new pairing logic
  const getAdjacentStackNumber = (stackNumber: number): number | null => {
    if (SPECIAL_STACKS.includes(stackNumber)) return null;

    // For odd-numbered stacks, find the correct pair:
    // 03+05, 07+09, 11+13, 15+17, 19+21, 23+25, 27+29, etc.
    
    // Check if this stack is part of a valid pair
    const isValidPairStack = (num: number): boolean => {
      // Starting from 3, every pair is (n, n+2) where n is odd and n >= 3
      // Valid first numbers: 3, 7, 11, 15, 19, 23, 27, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99
      // Pattern: starts at 3, then increments by 4 (3, 7, 11, 15, ...) until we reach section boundaries
      
      // For each section, determine the valid pairs
      if (num >= 3 && num <= 29) {
        // Top section: 03+05, 07+09, 11+13, 15+17, 19+21, 23+25, 27+29
        const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 33 && num <= 55) {
        // Center section: 33+35, 37+39, 41+43, 45+47, 49+51, 53+55
        const validFirstNumbers = [33, 37, 41, 45, 49, 53];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 61 && num <= 99) {
        // Bottom section: 61+63, 65+67, 69+71, 73+75, 77+79, 81+83, 85+87, 89+91, 93+95, 97+99
        const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      }
      
      return false;
    };

    if (!isValidPairStack(stackNumber)) return null;

    // Find the partner stack
    let partnerNumber: number;
    
    // Check if this is the first or second number in the pair
    if (stackNumber >= 3 && stackNumber <= 29) {
      // Top section pairs
      const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2; // First number, partner is +2
      } else {
        partnerNumber = stackNumber - 2; // Second number, partner is -2
      }
    } else if (stackNumber >= 33 && stackNumber <= 55) {
      // Center section pairs
      const validFirstNumbers = [33, 37, 41, 45, 49, 53];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 61 && stackNumber <= 99) {
      // Bottom section pairs
      const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else {
      return null;
    }

    // Verify the partner exists in our configurations
    const partnerConfig = configurations.find(c => c.stackNumber === partnerNumber);
    return partnerConfig && !partnerConfig.isSpecialStack ? partnerNumber : null;
  };

  // Check if a stack can be assigned 40feet containers
  const canAssign40Feet = (stackNumber: number): boolean => {
    const config = configurations.find(c => c.stackNumber === stackNumber);
    if (!config || config.isSpecialStack) return false;

    // Check if there's a valid adjacent stack to form a pair
    return getAdjacentStackNumber(stackNumber) !== null;
  };

  const handleContainerSizeChange = (stackId: string, newSize: '20feet' | '40feet') => {
    if (!canManageStacks) return;

    const config = configurations.find(c => c.stackId === stackId);
    if (!config) return;

    // Prevent modification of special stacks to 40feet
    if (config.isSpecialStack && newSize === '40feet') {
      alert('Special stacks can only be set to 20feet containers.');
      return;
    }

    // Validate 40feet assignment for regular stacks
    if (newSize === '40feet' && !config.isSpecialStack) {
      if (!canAssign40Feet(config.stackNumber)) {
        alert(`Stack ${config.stackNumber.toString().padStart(2, '0')} cannot be assigned 40feet containers. No valid adjacent regular stack found for slot formation.`);
        return;
      }
    }

    // Get the adjacent stack for pairing
    const adjacentStackNumber = getAdjacentStackNumber(config.stackNumber);
    
    setConfigurations(prev => prev.map(c => {
      // Update the selected stack
      if (c.stackId === stackId) {
        return {
          ...c,
          containerSize: newSize,
          lastModified: new Date(),
          modifiedBy: user?.name || 'System'
        };
      }
      
      // Update the adjacent stack if it exists and this is a regular stack
      if (!config.isSpecialStack && adjacentStackNumber && c.stackNumber === adjacentStackNumber) {
        return {
          ...c,
          containerSize: newSize, // Set the same size for the pair
          lastModified: new Date(),
          modifiedBy: user?.name || 'System'
        };
      }
      
      return c;
    }));

    setHasChanges(true);

    // Show confirmation message for paired updates
    if (!config.isSpecialStack && adjacentStackNumber) {
      const pairMessage = `Stacks ${Math.min(config.stackNumber, adjacentStackNumber).toString().padStart(2, '0')}+${Math.max(config.stackNumber, adjacentStackNumber).toString().padStart(2, '0')} have been configured for ${newSize} containers.`;
      setTimeout(() => alert(pairMessage), 100);
    }
  };

  const handleSaveChanges = () => {
    if (!canManageStacks) return;
    
    if (!activeYard) {
      alert('No yard selected for saving configurations');
      return;
    }

    // Log the configuration change
    yardService.logOperation('stack_configuration_update', undefined, user?.name || 'System', {
      yardId: activeYard.id,
      yardCode: activeYard.code,
      configurationsCount: configurations.length,
      modifiedBy: user?.name || 'System'
    });

    onConfigurationChange(configurations);
    setHasChanges(false);
    alert(`Stack configurations saved successfully for ${activeYard.name}!`);
  };

  const handleResetChanges = () => {
    initializeConfigurations();
    setHasChanges(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading stack configurations...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setError('');
            initializeConfigurations();
          }}
          className="btn-primary"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // No yard selected
  if (!activeYard) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Yard Selected</h3>
        <p className="text-gray-600 mb-4">Please select a yard to manage stack configurations.</p>
        {availableYards.length > 0 && (
          <div className="text-sm text-gray-500">
            Available yards: {availableYards.map(y => y.name).join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Access control
  if (!canManageStacks) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage stack configurations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Yard Context Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">Stack Configuration for {activeYard.name}</h3>
            <p className="text-sm text-blue-700">Managing {configurations.length} stacks in {activeYard.code}</p>
          </div>
        </div>
      </div>

      <StackManagementHeader
        hasChanges={hasChanges}
        onSave={handleSaveChanges}
        onReset={handleResetChanges}
      />

      <StackManagementFilters
        searchTerm={searchTerm}
        sectionFilter={sectionFilter}
        sections={activeYard.sections}
        onSearchChange={setSearchTerm}
        onSectionFilterChange={setSectionFilter}
      />

      <StackConfigurationTable
        configurations={getFilteredConfigurations()}
        canAssign40Feet={canAssign40Feet}
        getAdjacentStackNumber={getAdjacentStackNumber}
        onContainerSizeChange={handleContainerSizeChange}
      />

      <StackConfigurationRules />

      <StackPairingInfo
        configurations={getFilteredConfigurations()}
        canAssign40Feet={canAssign40Feet}
        getAdjacentStackNumber={getAdjacentStackNumber}
      />
    </div>
  );
};