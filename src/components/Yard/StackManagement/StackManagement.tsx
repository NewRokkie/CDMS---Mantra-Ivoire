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

  // Refresh the current yard sections when the component mounts or currentYard changes
  useEffect(() => {
    const refreshCurrentYardSections = async () => {
      if (currentYard?.id) {
        console.log('DEBUG: Refreshing current yard sections');
        await refreshYards();
      }
    };
    refreshCurrentYardSections();
  }, [currentYard?.id, refreshYards]);

  const loadStacks = async () => {
    try {
      setLoading(true);
      console.log('Loading stacks for yard:', currentYard?.id, 'currentYard:', currentYard);
      if (!currentYard?.id) {
        console.log('No current yard selected, skipping stack load');
        setStacks([]);
        return;
      }
      const data = await stackService.getAll(currentYard.id);
      console.log('Loaded stacks:', data.length, 'stacks for yard:', currentYard.id);
      console.log('Stack data:', data);
      setStacks(data || []);
    } catch (error) {
      console.error('Error loading stacks:', error);
      // Set empty array to prevent infinite loading
      setStacks([]);
      alert('Error loading stacks: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStack = async () => {
    console.log('DEBUG: handleCreateStack called, currentYard:', currentYard);
    console.log('DEBUG: currentYard sections:', currentYard?.sections);

    // Ensure current yard has sections loaded
    if (currentYard && (!currentYard.sections || currentYard.sections.length === 0)) {
      console.log('DEBUG: Refreshing yards to load sections');
      await refreshYards();

      // Wait a bit for the refresh to complete
      setTimeout(() => {
        console.log('DEBUG: After refresh, currentYard sections:', currentYard?.sections);
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
      console.error('Error deleting stack:', error);
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
      console.error('Error saving stack:', error);
      alert('Error saving stack: ' + (error as Error).message);
    }
  };

  const handleContainerSizeChange = async (
    stackId: string,
    yardId: string,
    stackNumber: number,
    newSize: '20feet' | '40feet'
  ) => {
    try {
      const updatedStacks = await stackService.updateContainerSize(
        stackId,
        yardId,
        stackNumber,
        newSize,
        user?.id || ''
      );

      setStacks(prev => prev.map(stack => {
        const updated = updatedStacks.find(u => u.id === stack.id);
        return updated || stack;
      }));

      if (updatedStacks.length > 1) {
        alert(`Successfully updated ${updatedStacks.length} stacks to ${newSize}!`);
      } else {
        alert(`Stack updated to ${newSize} successfully!`);
      }
    } catch (error) {
      console.error('Error updating container size:', error);
      alert('Error updating container size: ' + (error as Error).message);
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
      console.error('Error assigning client to stack:', error);
      alert('Error assigning client to stack: ' + (error as Error).message);
    }
  };

  const filteredStacks = stacks.filter(stack => {
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

  const sections = Array.from(new Set(stacks.map(s => s.sectionName || 'Main Section')));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading stacks...</div>
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Yard Sections...</h3>
              <p className="text-gray-600">Please wait while we load the yard configuration.</p>
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

      {/* Debug: Show current yard info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs rounded z-50 max-w-xs">
          <div>Current Yard: {currentYard?.name || 'None'}</div>
          <div>ID: {currentYard?.id || 'None'}</div>
          <div>Sections: {currentYard?.sections?.length || 0}</div>
          <div>Layout: {currentYard?.layout || 'None'}</div>
          <div>Show Form: {showStackForm ? 'true' : 'false'}</div>
          <div>Can Show Modal: {(showStackForm && currentYard) ? 'true' : 'false'}</div>
          {currentYard?.sections && currentYard.sections.length > 0 && (
            <div className="mt-1 border-t border-gray-600 pt-1">
              <div>Sections:</div>
              {currentYard.sections.map((s, i) => (
                <div key={i} className="ml-2">• {s.name}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
