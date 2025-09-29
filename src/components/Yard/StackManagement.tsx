import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Plus, CreditCard as Edit, Trash2 } from 'lucide-react';
import { Yard } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { StackManagementHeader } from './StackManagement/StackManagementHeader';
import { StackManagementFilters } from './StackManagement/StackManagementFilters';
import { StackConfigurationTable } from './StackManagement/StackConfigurationTable';
import { StackConfigurationRules } from './StackManagement/StackConfigurationRules';
import { StackPairingInfo } from './StackManagement/StackPairingInfo';
import { StackFormModal } from './StackManagement/StackFormModal';
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
  const [showStackForm, setShowStackForm] = useState(false);
  const [selectedStack, setSelectedStack] = useState<StackConfiguration | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

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

    onConfigurationChange(configurations);
    setHasChanges(false);
    alert('Stack configurations saved successfully!');
  };

  const handleResetChanges = () => {
    initializeConfigurations();
    setHasChanges(false);
  };

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