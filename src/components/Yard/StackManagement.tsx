import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Search, 
  Filter, 
  Save, 
  RotateCcw,
  Shield,
  Package
} from 'lucide-react';
import { Yard, YardStack } from '../../types';
import { useAuth } from '../../hooks/useAuth';

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
  yard: Yard;
  onConfigurationChange: (configurations: StackConfiguration[]) => void;
}

export const StackManagement: React.FC<StackManagementProps> = ({
  yard,
  onConfigurationChange
}) => {
  const { user } = useAuth();
  const [configurations, setConfigurations] = useState<StackConfiguration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [hasChanges, setHasChanges] = useState(false);

  const canManageStacks = user?.role === 'admin' || user?.role === 'supervisor';

  // Special stacks that are locked to 20feet only
  const SPECIAL_STACKS = [1, 31, 101, 103];

  useEffect(() => {
    initializeConfigurations();
  }, [yard]);

  const initializeConfigurations = () => {
    const allStacks = yard.sections.flatMap(section => section.stacks);
    const stackConfigs: StackConfiguration[] = [];

    // Initialize stack configurations
    allStacks.forEach(stack => {
      const isSpecial = SPECIAL_STACKS.includes(stack.stackNumber);
      
      stackConfigs.push({
        stackId: stack.id,
        stackNumber: stack.stackNumber,
        sectionId: stack.sectionId,
        sectionName: yard.sections.find(s => s.id === stack.sectionId)?.name || 'Unknown',
        containerSize: '20feet', // Default to 20feet
        isSpecialStack: isSpecial,
        lastModified: new Date(),
        modifiedBy: user?.name || 'System'
      });
    });

    setConfigurations(stackConfigs.sort((a, b) => a.stackNumber - b.stackNumber));
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stack Management</h2>
          <p className="text-gray-600">Configure container size assignments for all stacks</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <>
              <button
                onClick={handleResetChanges}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleSaveChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search stacks or sections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sections</option>
              {yard.sections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>
          
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Advanced Filter</span>
          </button>
        </div>
      </div>

      {/* Stack Configuration Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Stack Configuration</h3>
          <p className="text-sm text-gray-600">Configure container size assignments for each stack (paired stacks will be updated together)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stack
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredConfigurations().map((config) => {
                const can40Feet = canAssign40Feet(config.stackNumber);
                const adjacentStack = getAdjacentStackNumber(config.stackNumber);
                const adjacentConfig = adjacentStack ? configurations.find(c => c.stackNumber === adjacentStack) : null;
                
                return (
                  <tr key={config.stackId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            Stack {config.stackNumber.toString().padStart(2, '0')}
                          </span>
                          {config.isSpecialStack && (
                            <Shield className="h-4 w-4 text-purple-600" title="Special Stack" />
                          )}
                          {!config.isSpecialStack && adjacentStack && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              Pair: {adjacentStack.toString().padStart(2, '0')}
                              {adjacentConfig && (
                                <span className={`ml-1 ${adjacentConfig.containerSize === config.containerSize ? 'text-green-600' : 'text-orange-600'}`}>
                                  ({adjacentConfig.containerSize === config.containerSize ? '✓' : '⚠'})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        config.isSpecialStack 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {config.isSpecialStack ? 'Special' : 'Regular'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-lg ${
                        config.containerSize === '20feet'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {config.containerSize}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleContainerSizeChange(config.stackId, '20feet')}
                          disabled={config.containerSize === '20feet'}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            config.containerSize === '20feet'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Set as 20feet
                        </button>
                        <button
                          onClick={() => handleContainerSizeChange(config.stackId, '40feet')}
                          disabled={config.containerSize === '40feet' || config.isSpecialStack || !can40Feet}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            config.containerSize === '40feet' || config.isSpecialStack || !can40Feet
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-orange-600 text-white hover:bg-orange-700'
                          }`}
                          title={
                            config.isSpecialStack 
                              ? 'Special stacks cannot be set to 40feet' 
                              : !can40Feet 
                              ? 'No adjacent regular stack available for 40feet assignment'
                              : adjacentStack
                              ? `Will also update Stack ${adjacentStack.toString().padStart(2, '0')}`
                              : ''
                          }
                        >
                          Set as 40feet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {getFilteredConfigurations().length === 0 && (
          <div className="text-center py-12">
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stacks found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
          </div>
        )}
      </div>

      {/* Configuration Rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Configuration Rules</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>Special Stacks (01, 31, 101, 103):</strong> Can only be set to 20feet containers.</div>
              <div><strong>Regular Stacks:</strong> Can be set to either 20feet or 40feet containers.</div>
              <div><strong>40feet Assignment:</strong> Only available for regular stacks that have an adjacent regular stack to form valid pairs.</div>
              <div><strong>Paired Updates:</strong> When changing a regular stack to 40feet, its adjacent pair will automatically be updated to match.</div>
              <div><strong>Valid Pairs:</strong> 03+05, 07+09, 11+13, 15+17, 19+21, 23+25, 27+29, 33+35, 37+39, 41+43, 45+47, 49+51, 53+55, 61+63, 65+67, 69+71, 73+75, 77+79, 81+83, 85+87, 89+91, 93+95, 97+99</div>
              <div><strong>Non-Adjacent Stacks:</strong> Cannot be assigned 40feet containers as they lack valid pairing partners.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stack Pairing Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Package className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 mb-2">Valid Stack Pairs for 40feet Containers</h4>
            <div className="text-sm text-green-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {getFilteredConfigurations()
                  .filter(config => !config.isSpecialStack && canAssign40Feet(config.stackNumber))
                  .reduce((pairs: string[], config) => {
                    const adjacent = getAdjacentStackNumber(config.stackNumber);
                    if (adjacent) {
                      const pairStr = `${Math.min(config.stackNumber, adjacent).toString().padStart(2, '0')}+${Math.max(config.stackNumber, adjacent).toString().padStart(2, '0')}`;
                      if (!pairs.includes(pairStr)) {
                        pairs.push(pairStr);
                      }
                    }
                    return pairs;
                  }, [])
                  .sort()
                  .map(pair => {
                    const [stack1, stack2] = pair.split('+').map(Number);
                    const config1 = configurations.find(c => c.stackNumber === stack1);
                    const config2 = configurations.find(c => c.stackNumber === stack2);
                    const bothSame = config1?.containerSize === config2?.containerSize;
                    const both40feet = config1?.containerSize === '40feet' && config2?.containerSize === '40feet';
                    
                    return (
                      <div 
                        key={pair} 
                        className={`px-2 py-1 rounded text-center font-mono text-xs ${
                          both40feet 
                            ? 'bg-orange-200 text-orange-800 font-bold' 
                            : bothSame 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        title={
                          both40feet 
                            ? 'Both stacks configured for 40feet' 
                            : bothSame 
                            ? 'Both stacks have matching configuration' 
                            : 'Stacks have different configurations'
                        }
                      >
                        {pair}
                        {!bothSame && <span className="ml-1">⚠</span>}
                        {both40feet && <span className="ml-1">🔶</span>}
                      </div>
                    );
                  })
                }
              </div>
              <div className="mt-2 text-xs">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <span>Matching 20feet</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-orange-200 rounded"></div>
                    <span>Matching 40feet</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                    <span>Mismatched</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};