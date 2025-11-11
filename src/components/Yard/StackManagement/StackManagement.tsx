import React, { useState, useEffect } from 'react';
import { YardStack } from '../../../types/yard';
import { stackService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useYard } from '../../../hooks/useYard';
import { clientPoolService } from '../../../services/api';
import { StackManagementHeader } from './StackManagementHeader';
import { StackManagementFilters } from './StackManagementFilters';
import { StackConfigurationTable } from './StackConfigurationTable';
import { StackFormModal } from './StackFormModal';
import { StackConfigurationRules } from './StackConfigurationRules';
import { StackPairingInfo } from './StackPairingInfo';
import { StackClientAssignmentModal } from './StackClientAssignmentModal';
import { handleError } from '../../../services/errorHandling';
import { LoadingSpinner } from '../../Common';

export const StackManagement: React.FC = () => {
  const [stacks, setStacks] = useState<YardStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [showStackForm, setShowStackForm] = useState(false);
  const [showClientAssignment, setShowClientAssignment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const { user } = useAuth();
  const { currentYard, refreshYards } = useYard();

  useEffect(() => {
    if (currentYard?.id) {
      loadStacks();
    }
  }, [currentYard]);

  const loadStacks = async () => {
    try {
      setLoading(true);
      if (!currentYard?.id) {
        setStacks([]);
        return;
      }
      const data = await stackService.getAll(currentYard.id);
      setStacks(data || []);
    } catch (error) {
      handleError(error, 'StackManagement.loadStacks');
      // Set empty array to prevent infinite loading
      setStacks([]);
      alert('Error loading stacks: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStack = async () => {
    // Ensure current yard has sections loaded
    if (currentYard && (!currentYard.sections || currentYard.sections.length === 0)) {
      await refreshYards();

      // Wait a bit for the refresh to complete
      setTimeout(() => {
        setSelectedStack(null);
        setShowStackForm(true);
      }, 100);
    } else {
      setSelectedStack(null);
      setShowStackForm(true);
    }
  };

  const handleEditStack = (stack: YardStack) => {
    setSelectedStack(stack);
    setShowStackForm(true);
  };

  const handleAssignClient = (stack: YardStack) => {
    setSelectedStack(stack);
    setShowClientAssignment(true);
  };

  const handleDeleteStack = async (stackId: string) => {
    if (!confirm('Are you sure you want to delete this stack?')) {
      return;
    }

    try {
      await stackService.delete(stackId);
      // Remove from local state to update UI immediately
      setStacks(prev => prev.filter(s => s.id !== stackId));
      alert('Stack deleted successfully!');
    } catch (error) {
      handleError(error, 'StackManagement.handleDeleteStack');
      alert('Error deleting stack: ' + (error as Error).message);
    }
  };

  const handleSaveStack = async (stackData: Partial<YardStack>) => {
    try {
      if (selectedStack) {
        const updated = await stackService.update(selectedStack.id, stackData, user?.id || '');
        setStacks(prev => prev.map(s => s.id === updated.id ? updated : s));
        alert('Stack updated successfully!');
      } else {
        const newStack = await stackService.create({
          ...stackData,
          yardId: currentYard?.id
        }, user?.id || '');
        setStacks(prev => [...prev, newStack]);
        alert('Stack created successfully!');
      }
      setShowStackForm(false);
      setSelectedStack(null);
    } catch (error) {
      handleError(error, 'StackManagement.handleSaveStack');
      alert('Error saving stack: ' + (error as Error).message);
    }
  };

  const handleContainerSizeChange = async (
    stackId: string,
    yardId: string,
    stackNumber: number,
    newSize: '20ft' | '40ft'
  ) => {
    try {
      const updatedStacks = await stackService.updateContainerSize(
        stackId,
        yardId,
        stackNumber,
        newSize,
        user?.id || ''
      );

      // Reload all stacks to ensure consistency
      await loadStacks();

      if (updatedStacks.length > 1) {
        alert(`Successfully updated ${updatedStacks.length} stacks to ${newSize}!`);
      } else {
        alert(`Stack updated to ${newSize} successfully!`);
      }
    } catch (error) {
      handleError(error, 'StackManagement.handleContainerSizeChange');
      
      // Reload stacks to revert any optimistic UI updates
      await loadStacks();
      
      // Show user-friendly error message
      const errorMessage = (error as any)?.message || String(error);
      if (errorMessage.includes('OCCUPIED_VIRTUAL_LOCATIONS')) {
        alert('Cannot change stack size: Virtual stack locations are occupied. Please relocate all containers from the paired stacks first.');
      } else {
        alert('Error updating container size: ' + errorMessage);
      }
    }
  };

  const handleClientAssignment = async (
    stackId: string,
    clientPoolId: string | null,
    clientCode: string | null
  ) => {
    try {
      // Update the stack's assigned client code
      await stackService.update(stackId, {
        assignedClientCode: clientCode || undefined
      }, user?.id || '');

      // Update local state
      setStacks(prev => prev.map(stack =>
        stack.id === stackId
          ? { ...stack, assignedClientCode: clientCode || undefined }
          : stack
      ));

      // If assigning to a client pool, update the client pool's assigned stacks
      if (clientPoolId && clientCode) {
        // Add stack to client pool if not already assigned
        const clientPools = await clientPoolService.getAll(currentYard?.id);
        const targetPool = clientPools.find(pool => pool.id === clientPoolId);

        if (targetPool && !targetPool.assignedStacks.includes(stackId)) {
          const updatedAssignedStacks = [...targetPool.assignedStacks, stackId];
          await clientPoolService.update(clientPoolId, {
            assignedStacks: updatedAssignedStacks
          }, user?.id || '');
        }
      } else if (!clientPoolId && !clientCode) {
        // If unassigning, remove from all client pools
        const clientPools = await clientPoolService.getAll(currentYard?.id);
        for (const pool of clientPools) {
          if (pool.assignedStacks.includes(stackId)) {
            const updatedAssignedStacks = pool.assignedStacks.filter(id => id !== stackId);
            await clientPoolService.update(pool.id, {
              assignedStacks: updatedAssignedStacks
            }, user?.id || '');
          }
        }
      }

      setShowClientAssignment(false);
      setSelectedStack(null);
      alert(clientCode ? `Stack assigned to client ${clientCode} successfully!` : 'Stack unassigned from client pool successfully!');
    } catch (error) {
      handleError(error, 'StackManagement.handleClientAssignment');
      alert('Error assigning client to stack: ' + (error as Error).message);
    }
  };

  const filteredStacks = stacks.filter(stack => {
    // Exclude virtual stacks - they are generated automatically and not managed directly
    const isVirtualStack = (stack as any).isVirtual === true;
    if (isVirtualStack) {
      return false;
    }

    const matchesSearch = stack.stackNumber.toString().includes(searchTerm) ||
                         (stack.sectionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (stack.assignedClientCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && stack.isActive) ||
                         (statusFilter === 'inactive' && !stack.isActive);

    const matchesSection = sectionFilter === 'all' ||
                          (stack.sectionName || '').toLowerCase() === sectionFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSection;
  });

  // Only show sections from physical stacks (exclude virtual stacks)
  const sections = Array.from(new Set(
    stacks
      .filter(s => !(s as any).isVirtual) // Exclude virtual stacks
      .map(s => s.sectionName || '-')
  ));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner 
          fullScreen={false}
          size='sm'
          message="Loading Stacks..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StackManagementHeader
        onCreateStack={handleCreateStack}
        hasChanges={false}
        onSave={() => {}}
        onReset={() => {}}
      />

      <StackManagementFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sectionFilter={sectionFilter}
        onSectionFilterChange={setSectionFilter}
        sections={sections}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StackConfigurationTable
            stacks={filteredStacks}
            onEditStack={handleEditStack}
            onDeleteStack={handleDeleteStack}
            onContainerSizeChange={handleContainerSizeChange}
            onAssignClient={handleAssignClient}
          />
        </div>

        <div className="space-y-6">
          <StackConfigurationRules />
          <StackPairingInfo stacks={stacks} />
        </div>
      </div>

      {showStackForm && currentYard && currentYard.sections && currentYard.sections.length > 0 && (
        <StackFormModal
          isOpen={showStackForm}
          onClose={() => {
            setShowStackForm(false);
            setSelectedStack(null);
          }}
          selectedStack={selectedStack}
          onSubmit={handleSaveStack}
          yard={currentYard}
        />
      )}

      {showClientAssignment && currentYard && (
        <StackClientAssignmentModal
          isOpen={showClientAssignment}
          onClose={() => {
            setShowClientAssignment(false);
            setSelectedStack(null);
          }}
          selectedStack={selectedStack}
          onAssign={handleClientAssignment}
          yardId={currentYard.id}
        />
      )}

      {showStackForm && currentYard && (!currentYard.sections || currentYard.sections.length === 0) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-strong p-6">
            <div className="text-center">
              <LoadingSpinner
                fullScreen={false}
                size='sm'
                message="Please wait while we load the yard configuration."
              />
              <button
                onClick={() => setShowStackForm(false)}
                className="mt-4 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
