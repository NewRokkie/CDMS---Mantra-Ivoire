import React, { useState, useEffect } from 'react';
import { YardStack } from '../../../types/yard';
import { stackService, yardsService } from '../../../services/api';
import StackSoftDeleteService from '../../../services/api/stackSoftDeleteService';
import { useAuth } from '../../../hooks/useAuth';
import { useYard } from '../../../hooks/useYard';
import { useLanguage } from '../../../hooks/useLanguage';
import { clientPoolService } from '../../../services/api';
import { StackManagementHeader } from './StackManagementHeader';
import { StackManagementFilters } from './StackManagementFilters';
import { StackConfigurationTable } from './StackConfigurationTable';
import { StackFormModal } from './StackFormModal';
import { StackConfigurationHelpDialog } from './StackConfigurationHelpDialog';
import { StackSummaryCards } from './StackSummaryCards';
import { StackSummaryCardsSkeleton } from './StackSummaryCardsSkeleton';
import { StackClientAssignmentModal } from './StackClientAssignmentModal';
import { handleError } from '../../../services/errorHandling';
import { StackCreationSuccess } from './StackCreationSuccess';
import { StackTableSkeleton } from './StackTableSkeleton';
import { LoadingSpinner } from '../../Common';
import { useToast } from '../../../hooks/useToast';
import { useConfirm } from '../../../hooks/useConfirm';

export const StackManagement: React.FC = () => {
  const { t } = useLanguage();
  const [stacks, setStacks] = useState<YardStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [showStackForm, setShowStackForm] = useState(false);
  const [showClientAssignment, setShowClientAssignment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [createdStackNumber, setCreatedStackNumber] = useState<number>(0);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [formRefreshKey, setFormRefreshKey] = useState(0);

  const { user } = useAuth();
  const { currentYard, refreshYards } = useYard();
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (currentYard?.id) {
      loadStacks();
    }
  }, [currentYard]);

  const loadStacks = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      if (!currentYard?.id) {
        setStacks([]);
        return;
      }
      
      // Use the new method that includes container stats
      const data = await stackService.getByYardIdWithStats(currentYard.id, false);
      setStacks(data || []);
      
      // Show success message for manual refresh
      if (showRefreshIndicator) {
        toast.success(t('stack.refreshed'));
      }
    } catch (error) {
      handleError(error, 'StackManagement.loadStacks');
      // Set empty array to prevent infinite loading
      setStacks([]);
      toast.error(t('common.error') + ': ' + (error as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    await loadStacks(true);
  };

  // Show help dialog
  const handleShowHelp = () => {
    setShowHelpDialog(true);
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
    // Get stack info for better messaging
    const stack = stacks.find(s => s.id === stackId);
    const stackNumber = stack?.stackNumber || 'Unknown';
    
    confirm({
      title: t('stack.delete.title'),
      message: t('stack.delete.confirm').replace('{number}', String(stackNumber).padStart(2, '0')),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const result = await StackSoftDeleteService.softDeleteStack(stackId, user?.email);
          
          if (result.success) {
            // Remove from local state to update UI immediately
            setStacks(prev => prev.filter(s => s.id !== stackId));
            toast.success(t('stack.delete.success').replace('{number}', String(stackNumber).padStart(2, '0')));
          } else {
            toast.error(result.message || t('stack.delete.error'));
          }
        } catch (error) {
          handleError(error, 'StackManagement.handleDeleteStack');
          toast.error(t('common.error') + ': ' + (error as Error).message);
        }
      }
    });
  };

  const handleSaveStack = async (stackData: Partial<YardStack>) => {
    try {
      if (selectedStack) {
        const updated = await stackService.update(selectedStack.id, stackData, user?.id || '');
        setStacks(prev => prev.map(s => s.id === updated.id ? updated : s));
        toast.success(t('stack.update.success'));
      } else {
        const newStack = await stackService.create({
          ...stackData,
          yardId: currentYard?.id
        }, user?.id || '');
        
        // Add the new stack to the list immediately for better UX
        setStacks(prev => [...prev, newStack]);
        
        // Show success notification
        setCreatedStackNumber(newStack.stackNumber);
        setShowSuccessNotification(true);
        
        toast.success(t('stack.create.success'));
        
        // Refresh the yardsService cache to update stack suggestions
        if (currentYard?.id) {
          await yardsService.refreshYardData(currentYard.id);
          // Also refresh the yard context to get updated yard data
          await refreshYards();
          // Force form to refresh with new data when reopened
          setFormRefreshKey(prev => prev + 1);
        }
        
        // Refresh the list in the background to get updated stats
        setTimeout(() => {
          loadStacks(false);
        }, 500);
      }
      setShowStackForm(false);
      setSelectedStack(null);
    } catch (error) {
      handleError(error, 'StackManagement.handleSaveStack');
      toast.error(t('common.error') + ': ' + (error as Error).message);
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
        toast.success(t('stack.sizeUpdate.successMulti').replace('{count}', updatedStacks.length.toString()).replace('{size}', newSize));
      } else {
        toast.success(t('stack.sizeUpdate.success').replace('{size}', newSize));
      }
    } catch (error) {
      handleError(error, 'StackManagement.handleContainerSizeChange');
      
      // Reload stacks to revert any optimistic UI updates
      await loadStacks();
      
      // Show user-friendly error message
      const errorMessage = (error as any)?.message || String(error);
      if (errorMessage.includes('OCCUPIED_VIRTUAL_LOCATIONS')) {
        toast.error(t('stack.sizeUpdate.errorOccupied'));
      } else {
        toast.error(t('common.error') + ': ' + errorMessage);
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
      toast.success(clientCode ? t('stack.assign.success').replace('{client}', clientCode) : t('stack.unassigned.success'));
    } catch (error) {
      handleError(error, 'StackManagement.handleClientAssignment');
      toast.error(t('common.error') + ': ' + (error as Error).message);
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
      <div className="space-y-6">
        <StackManagementHeader
          onCreateStack={() => {}}
          hasChanges={false}
          onSave={() => {}}
          onReset={() => {}}
          onRefresh={() => {}}
          onShowHelp={() => {}}
          isRefreshing={false}
        />

        <StackManagementFilters
          searchTerm=""
          onSearchChange={() => {}}
          statusFilter="all"
          onStatusFilterChange={() => {}}
          sectionFilter="all"
          onSectionFilterChange={() => {}}
          sections={[]}
        />

        <StackSummaryCardsSkeleton />

        <div className="w-full">
          <StackTableSkeleton rows={8} />
        </div>
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
        onRefresh={handleRefresh}
        onShowHelp={handleShowHelp}
        isRefreshing={refreshing}
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

      <StackSummaryCards stacks={stacks} />

      <div className="w-full">
        <StackConfigurationTable
          stacks={filteredStacks}
          onEditStack={handleEditStack}
          onDeleteStack={handleDeleteStack}
          onContainerSizeChange={handleContainerSizeChange}
          onAssignClient={handleAssignClient}
          isRefreshing={refreshing}
        />
      </div>

      {showStackForm && currentYard && currentYard.sections && currentYard.sections.length > 0 && (
        <StackFormModal
          key={`stack-form-${formRefreshKey}`}
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
                message={t('stack.loadingConfig')}
              />
              <button
                onClick={() => setShowStackForm(false)}
                className="mt-4 btn-secondary"
              >
                {t('common.cancel')}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Help Dialog */}
      <StackConfigurationHelpDialog
        isOpen={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
      />

      {/* Success Notification */}
      <StackCreationSuccess
        show={showSuccessNotification}
        stackNumber={createdStackNumber}
        onClose={() => setShowSuccessNotification(false)}
      />
    </div>
  );
};
