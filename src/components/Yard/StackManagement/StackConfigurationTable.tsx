import React from 'react';
import { Settings, Shield } from 'lucide-react';

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

interface StackConfigurationTableProps {
  configurations: StackConfiguration[];
  canAssign40Feet: (stackNumber: number) => boolean;
  getAdjacentStackNumber: (stackNumber: number) => number | null;
  onContainerSizeChange: (stackId: string, newSize: '20feet' | '40feet') => void;
}

export const StackConfigurationTable: React.FC<StackConfigurationTableProps> = ({
  configurations,
  canAssign40Feet,
  getAdjacentStackNumber,
  onContainerSizeChange
}) => {
  return (
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
            {configurations.map((config) => {
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
                        onClick={() => onContainerSizeChange(config.stackId, '20feet')}
                        disabled={config.containerSize === '20feet'}
                        className={`relative px-4 py-1 text-sm rounded-full transition-all duration-200 ${
                          config.containerSize === '20feet'
                            ? 'bg-white text-gray-800 shadow-sm font-medium'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        20ft
                        {config.containerSize === '20feet' && (
                          <span className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-5 bg-blue-500"></span>
                        )}
                      </button>
                        <button
                          onClick={() => onContainerSizeChange(config.stackId, '40feet')}
                          disabled={config.containerSize === '40feet' || config.isSpecialStack || !can40Feet}
                          className={`relative px-4 py-1 text-sm rounded-full transition-all duration-200 ${
                            config.containerSize === '40feet'
                              ? 'bg-white text-gray-800 shadow-sm font-medium'
                              : config.isSpecialStack || !can40Feet
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-800'
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
                          40ft
                          {config.containerSize === '40feet' && (
                            <span className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-5 bg-orange-500"></span>
                          )}
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {configurations.length === 0 && (
        <div className="text-center py-12">
          <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stacks found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </div>
      )}
    </div>
  );
};