import React, { useState, useEffect } from 'react';
import { Loader, Users, Package, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { ClientPool } from '../../../types/clientPool';
import { clientPoolService } from '../../../services/api';
import { YardStack } from '../../../types/yard';
import { FormModal } from '../../Common/Modal/FormModal';
import { handleError } from '../../../services/errorHandling';

interface StackClientAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (stackId: string, clientPoolId: string | null, clientCode: string | null) => void;
  selectedStack: YardStack | null;
  yardId: string;
  isLoading?: boolean;
}

export const StackClientAssignmentModal: React.FC<StackClientAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  selectedStack,
  yardId,
  isLoading = false
}) => {
  const [clientPools, setClientPools] = useState<ClientPool[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && yardId) {
      loadClientPools();
    }
  }, [isOpen, yardId]);

  useEffect(() => {
    if (selectedStack && clientPools.length > 0) {
      // Find the client pool that has this stack assigned
      const assignedPool = clientPools.find(pool =>
        pool.assignedStacks.includes(selectedStack.id)
      );
      setSelectedPoolId(assignedPool?.id || null);
    }
  }, [selectedStack, clientPools]);

  const loadClientPools = async () => {
    try {
      setLoading(true);
      const pools = await clientPoolService.getAll(yardId);
      setClientPools(pools.filter(pool => pool.isActive));
    } catch (error) {
      handleError(error, 'StackClientAssignmentModal.loadClientPools');
    } finally {
      setLoading(false);
    }
  };

  const filteredPools = clientPools.filter(pool =>
    pool.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pool.clientCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedStack) {
      throw new Error('No stack selected');
    }

    const selectedPool = clientPools.find(pool => pool.id === selectedPoolId);
    onAssign(selectedStack.id, selectedPoolId, selectedPool?.clientCode || null);
  };

  const getPoolUtilization = (pool: ClientPool) => {
    return pool.maxCapacity > 0 ? (pool.currentOccupancy / pool.maxCapacity) * 100 : 0;
  };

  const isStackAssignedToPool = (pool: ClientPool, stackId: string) => {
    return pool.assignedStacks.includes(stackId);
  };

  if (!isOpen || !selectedStack) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleAssign}
      title="Assign Stack to Client Pool"
      subtitle={`Stack ${selectedStack.stackNumber.toString().padStart(2, '0')} • ${selectedStack.sectionName || 'Main Section'}`}
      icon={Users}
      size="lg"
      submitLabel="Assign Stack"
      isSubmitting={isLoading}
    >
      <div className="depot-step-spacing">

        {/* Current Assignment Status */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-blue-500" />
            Current Assignment
          </h4>
          <div className="flex items-center space-x-3">
            {selectedStack.assignedClientCode ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  Assigned to: {selectedStack.assignedClientCode}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-900">
                  Not assigned to any client pool
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="depot-section">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Client Pools
          </label>
          <input
            type="text"
            placeholder="Search by client name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="depot-input"
          />
        </div>

        {/* Client Pools List */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Users className="depot-section-icon text-green-500" />
            Available Client Pools ({filteredPools.length})
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading client pools...</span>
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No client pools match your search.' : 'No active client pools available.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Unassign Option */}
              <button
                type="button"
                onClick={() => setSelectedPoolId(null)}
                className={`w-full p-4 border-2 rounded-xl transition-all duration-200 text-left ${
                  selectedPoolId === null
                    ? 'border-red-500 bg-red-50 shadow-lg shadow-red-500/20'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <X className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Unassign from Client Pool</div>
                      <div className="text-sm text-gray-600">Remove stack from any client assignment</div>
                    </div>
                  </div>
                  {selectedPoolId === null && (
                    <div className="bg-red-500 text-white rounded-full p-1">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </button>

              {/* Client Pool Options */}
              {filteredPools.map((pool) => {
                const utilization = getPoolUtilization(pool);
                const isAssigned = isStackAssignedToPool(pool, selectedStack.id);
                const isSelected = selectedPoolId === pool.id;

                return (
                  <button
                    key={pool.id}
                    type="button"
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={`w-full p-4 border-2 rounded-xl transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{pool.clientName}</span>
                            <span className="text-sm text-gray-500">({pool.clientCode})</span>
                            {isAssigned && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Currently Assigned
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {pool.assignedStacks.length} stacks • Priority: {pool.priority}
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Utilization</span>
                                <span>{utilization.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    utilization >= 90 ? 'bg-red-500' :
                                    utilization >= 75 ? 'bg-orange-500' :
                                    utilization >= 25 ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-blue-500 text-white rounded-full p-1">
                          <CheckCircle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
};
