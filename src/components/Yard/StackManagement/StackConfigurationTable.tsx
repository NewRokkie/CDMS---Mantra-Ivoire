import React from 'react';
import { Settings, Shield, Trash2, Users, RefreshCw } from 'lucide-react';
import { YardStack } from '../../../types/yard';
import { stackService } from '../../../services/api';
import { useLanguage } from '../../../hooks/useLanguage';

interface StackConfigurationTableProps {
  stacks: YardStack[];
  onEditStack: (stack: YardStack) => void;
  onDeleteStack: (stackId: string) => void;
  onContainerSizeChange?: (stackId: string, yardId: string, stackNumber: number, newSize: '20ft' | '40ft') => void;
  onAssignClient?: (stack: YardStack) => void;
  isRefreshing?: boolean;
}

export const StackConfigurationTable: React.FC<StackConfigurationTableProps> = ({
  stacks = [],
  onEditStack,
  onDeleteStack,
  onContainerSizeChange,
  onAssignClient,
  isRefreshing = false
}) => {
  const { t } = useLanguage();

  const getAdjacentStackNumber = (stackNumber: number): number | null => {
    return stackService.getAdjacentStackNumber(stackNumber);
  };

  const canAssign40ft = (stack: YardStack): boolean => {
    return stackService.canAssign40ft(stack);
  };

  if (!stacks || stacks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('stack.configuration')}</h3>
          <p className="text-sm text-gray-600">{t('stack.configuration.desc')}</p>
        </div>
        <div className="text-center py-12 text-gray-500">
          {t('stack.noStacks')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{t('stack.configuration')}</h3>
        <p className="text-sm text-gray-600">{t('stack.configuration.desc')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.stack')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.section')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.containerSize')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.assignedClient')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.capacity')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.actions')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('stack.table.manage')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stacks.map((stack) => {
              const isSpecialStack = stack.isSpecialStack || false;
              const can40ft = canAssign40ft(stack);
              const adjacentStack = !isSpecialStack ? getAdjacentStackNumber(stack.stackNumber) : null;
              const adjacentConfig = adjacentStack ? stacks.find(s => s.stackNumber === adjacentStack) : null;
              const adjacentIsSpecial = adjacentConfig?.isSpecialStack || false;
              
              return (
                <tr key={stack.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {t('stack.table.stack')} {stack.stackNumber.toString().padStart(2, '0')}
                        </span>
                        {isSpecialStack && (
                          <Shield className="h-4 w-4 text-purple-600" />
                        )}
                        {!isSpecialStack && adjacentStack && !adjacentIsSpecial && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {t('stack.table.pair')}: {adjacentStack.toString().padStart(2, '0')}
                            {adjacentConfig && (
                              <span className={`ml-1 ${adjacentConfig.containerSize === stack.containerSize ? 'text-green-600' : 'text-orange-600'}`}>
                                ({adjacentConfig.containerSize === stack.containerSize ? '✓' : '⚠'})
                              </span>
                            )}
                          </span>
                        )}
                        {!isSpecialStack && adjacentStack && adjacentIsSpecial && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded" title={t('stack.table.specialNo40')}>
                            {t('stack.table.noPair')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{stack.sectionName || 'Zone A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-lg ${
                      stack.containerSize === '40ft'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {stack.containerSize || '20ft'}
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
                      <span className="text-sm text-gray-400">{t('stack.unassigned')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900 font-medium">
                        {stack.currentOccupancy}/{stack.capacity}
                        <span className="text-xs text-gray-500 ml-2">
                          ({stack.capacity > 0 ? Math.round((stack.currentOccupancy / stack.capacity) * 100) : 0}%)
                        </span>
                      </div>
                      {stack.containerStats && (
                        <div className="flex flex-wrap gap-1 text-xs">
                          {stack.containerStats.size20ft > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              20ft: {stack.containerStats.size20ft}
                            </span>
                          )}
                          {stack.containerStats.size40ft > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                              40ft: {stack.containerStats.size40ft}
                            </span>
                          )}
                          {stack.containerStats.damaged > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                              {t('common.damaged')}: {stack.containerStats.damaged}
                            </span>
                          )}
                          {stack.containerStats.maintenance > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                              Maint: {stack.containerStats.maintenance}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {onContainerSizeChange && (
                      <div className="relative inline-flex items-center bg-gray-200 rounded-full p-1">
                        <button
                          onClick={() => onContainerSizeChange(stack.id, stack.yardId || '', stack.stackNumber, '20ft')}
                          disabled={stack.containerSize === '20ft'}
                          className={`relative px-4 py-1 text-sm rounded-full transition-all duration-200 ${
                            stack.containerSize === '20ft'
                              ? 'bg-blue-200 text-blue-800 shadow-sm shadow-blue-500/50 font-medium'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                          }`}
                        >
                          20ft
                          {stack.containerSize === '20ft' && (
                            <span className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-5 bg-blue-500"></span>
                          )}
                        </button>
                        <button
                          onClick={() => onContainerSizeChange(stack.id, stack.yardId || '', stack.stackNumber, '40ft')}
                          disabled={stack.containerSize === '40ft' || isSpecialStack || !can40ft}
                          className={`relative px-4 py-1 text-sm rounded-full transition-all duration-200 ${
                            stack.containerSize === '40ft'
                              ? 'bg-orange-200 text-orange-800 shadow-sm shadow-orange-500/50 font-medium'
                              : isSpecialStack || !can40ft
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                          }`}
                          title={
                            isSpecialStack
                              ? t('stack.table.specialNo40')
                              : adjacentStack
                              ? t('stack.table.updatePair').replace('{number}', adjacentStack.toString().padStart(2, '0'))
                              : ''
                          }
                        >
                          40ft
                          {stack.containerSize === '40ft' && (
                            <span className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-5 bg-orange-500"></span>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {onAssignClient && (
                        <button
                          onClick={() => onAssignClient(stack)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title={t('stack.assigned')}
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditStack(stack)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title={t('stack.edit')}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteStack(stack.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title={t('stack.delete')}
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
      </div>
      
      {/* Refreshing Overlay */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="flex items-center space-x-3 text-blue-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">{t('stack.refreshing')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

