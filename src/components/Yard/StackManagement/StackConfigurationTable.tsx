import React from 'react';
import { Settings, Shield, CreditCard as Edit, Trash2 } from 'lucide-react';
import { YardStack } from '../../../types/yard';
import { stackService } from '../../../services/api';

interface StackConfigurationTableProps {
  stacks: YardStack[];
  onEditStack: (stack: YardStack) => void;
  onDeleteStack: (stackId: string) => void;
  onContainerSizeChange?: (stackId: string, yardId: string, stackNumber: number, newSize: '20feet' | '40feet') => void;
}

export const StackConfigurationTable: React.FC<StackConfigurationTableProps> = ({
  stacks,
  onEditStack,
  onDeleteStack,
  onContainerSizeChange
}) => {
  const getAdjacentStackNumber = (stackNumber: number): number | null => {
    return stackService.getAdjacentStackNumber(stackNumber);
  };

  const canAssign40Feet = (stackNumber: number, isSpecialStack: boolean): boolean => {
    return stackService.canAssign40Feet(stackNumber, isSpecialStack);
  };

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
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Container Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stacks.map((stack) => {
              const isSpecialStack = stack.isOddStack || false;
              const can40Feet = canAssign40Feet(stack.stackNumber, isSpecialStack);
              const adjacentStack = getAdjacentStackNumber(stack.stackNumber);
              const adjacentConfig = adjacentStack ? stacks.find(s => s.stackNumber === adjacentStack) : null;

              return (
                <tr key={stack.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          Stack {stack.stackNumber.toString().padStart(2, '0')}
                        </span>
                        {isSpecialStack && (
                          <Shield className="h-4 w-4 text-purple-600" title="Special Stack" />
                        )}
                        {!isSpecialStack && adjacentStack && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Pair: {adjacentStack.toString().padStart(2, '0')}
                            {adjacentConfig && (
                              <span className={`ml-1 ${adjacentConfig.containerSize === stack.containerSize ? 'text-green-600' : 'text-orange-600'}`}>
                                ({adjacentConfig.containerSize === stack.containerSize ? '✓' : '⚠'})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{stack.sectionName || 'Main Section'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-lg ${
                      stack.containerSize === '20feet'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {stack.containerSize || '20feet'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stack.assignedClientCode ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          {stack.assignedClientCode}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {stack.currentOccupancy}/{stack.capacity}
                      <span className="text-xs text-gray-500 ml-2">
                        ({stack.capacity > 0 ? Math.round((stack.currentOccupancy / stack.capacity) * 100) : 0}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {onContainerSizeChange && (
                      <div className="relative inline-flex items-center bg-gray-200 rounded-full p-1">
                        <button
                          onClick={() => onContainerSizeChange(stack.id, stack.yardId || '', stack.stackNumber, '20feet')}
                          disabled={stack.containerSize === '20feet'}
                          className={`relative px-4 py-1 text-sm rounded-full transition-all duration-200 ${
                            stack.containerSize === '20feet'
                              ? 'bg-white text-gray-800 shadow-sm font-medium'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                          }`}
                        >
                          20ft
                          {stack.containerSize === '20feet' && (
                            <span className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-5 bg-blue-500"></span>
                          )}
                        </button>
                        <button
                          onClick={() => onContainerSizeChange(stack.id, stack.yardId || '', stack.stackNumber, '40feet')}
                          disabled={stack.containerSize === '40feet' || isSpecialStack || !can40Feet}
                          className={`relative px-4 py-1 text-sm rounded-full transition-all duration-200 ${
                            stack.containerSize === '40feet'
                              ? 'bg-white text-gray-800 shadow-sm font-medium'
                              : isSpecialStack || !can40Feet
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                          }`}
                          title={
                            isSpecialStack
                              ? 'Special stacks cannot be configured for 40ft'
                              : adjacentStack
                              ? `Will also update Stack ${adjacentStack.toString().padStart(2, '0')}`
                              : ''
                          }
                        >
                          40ft
                          {stack.containerSize === '40feet' && (
                            <span className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-5 bg-orange-500"></span>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEditStack(stack)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit Stack"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteStack(stack.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete Stack"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stacks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No stacks found. Create your first stack to get started.
          </div>
        )}
      </div>
    </div>
  );
};
