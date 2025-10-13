import React, { useState, useEffect } from 'react';
import { YardStack } from '../../../types/yard';
import { stackService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useYard } from '../../../hooks/useYard';
import { StackManagementHeader } from './StackManagementHeader';
import { StackManagementFilters } from './StackManagementFilters';
import { StackConfigurationTable } from './StackConfigurationTable';
import { StackFormModal } from './StackFormModal';
import { StackConfigurationRules } from './StackConfigurationRules';
import { StackPairingInfo } from './StackPairingInfo';

export const StackManagement: React.FC = () => {
  const [stacks, setStacks] = useState<YardStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [showStackForm, setShowStackForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const { user } = useAuth();
  const { currentYard } = useYard();

  useEffect(() => {
    if (currentYard?.id) {
      loadStacks();
    }
  }, [currentYard]);

  const loadStacks = async () => {
    try {
      setLoading(true);
      const data = await stackService.getAll(currentYard?.id);
      setStacks(data);
    } catch (error) {
      console.error('Error loading stacks:', error);
      alert('Error loading stacks: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStack = () => {
    setSelectedStack(null);
    setShowStackForm(true);
  };

  const handleEditStack = (stack: YardStack) => {
    setSelectedStack(stack);
    setShowStackForm(true);
  };

  const handleDeleteStack = async (stackId: string) => {
    if (!confirm('Are you sure you want to delete this stack?')) {
      return;
    }

    try {
      await stackService.delete(stackId);
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
        totalStacks={stacks.length}
        activeStacks={stacks.filter(s => s.isActive).length}
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
          />
        </div>

        <div className="space-y-6">
          <StackConfigurationRules />
          <StackPairingInfo stacks={stacks} />
        </div>
      </div>

      {showStackForm && (
        <StackFormModal
          isOpen={showStackForm}
          onClose={() => {
            setShowStackForm(false);
            setSelectedStack(null);
          }}
          selectedStack={selectedStack}
          onSubmit={handleSaveStack}
        />
      )}
    </div>
  );
};
