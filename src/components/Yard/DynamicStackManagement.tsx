import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Grid3X3, 
  AlertTriangle, 
  Building,
  MapPin,
  Settings,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { YardStack, YardSection } from '../../types/yard';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { stackService, StackFormData, StackValidationResult } from '../../services/stackService';
import { StackFormModal } from './StackManagement/StackFormModal';
import { BulkStackCreationModal } from './StackManagement/BulkStackCreationModal';
import { StackDetailModal } from './StackManagement/StackDetailModal';
import { StackListView } from './StackManagement/StackListView';

export const DynamicStackManagement: React.FC = () => {
  const [stacks, setStacks] = useState<YardStack[]>([]);
  const [sections, setSections] = useState<YardSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [showStackForm, setShowStackForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<StackValidationResult | undefined>();
  
  const { user } = useAuth();
  const { currentYard } = useYard();

  const canManageStacks = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    if (currentYard) {
      loadStacksAndSections();
    }
  }, [currentYard]);

  const loadStacksAndSections = () => {
    if (!currentYard) return;

    // Load stacks from service
    const yardStacks = stackService.getStacksForYard(currentYard.id);
    setStacks(yardStacks);

    // Update sections with current stacks
    const updatedSections = stackService.updateYardSections(currentYard.id, currentYard.sections);
    setSections(updatedSections);
  };

  const handleCreateStack = async (stackData: StackFormData) => {
    if (!currentYard || !canManageStacks) return;

    setIsLoading(true);
    try {
      // Validate stack
      const validationResult = stackService.validateStack(currentYard.id, stackData);
      setValidation(validationResult);

      if (!validationResult.isValid) {
        setIsLoading(false);
        return; // Keep modal open to show validation errors
      }

      // Create stack
      const newStack = stackService.createStack(
        currentYard.id,
        stackData.sectionId,
        stackData,
        user?.name
      );

      // Refresh data
      loadStacksAndSections();
      
      // Close modal and reset
      setShowStackForm(false);
      setSelectedStack(null);
      setValidation(undefined);
      
      alert(`Stack ${newStack.stackNumber} created successfully!`);
    } catch (error) {
      alert(`Error creating stack: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStack = async (stackData: StackFormData) => {
    if (!currentYard || !selectedStack || !canManageStacks) return;

    setIsLoading(true);
    try {
      // Validate stack
      const validationResult = stackService.validateStack(currentYard.id, stackData, selectedStack.id);
      setValidation(validationResult);

      if (!validationResult.isValid) {
        setIsLoading(false);
        return; // Keep modal open to show validation errors
      }

      // Update stack
      const updatedStack = stackService.updateStack(
        currentYard.id,
        selectedStack.id,
        stackData,
        user?.name
      );

      if (updatedStack) {
        // Refresh data
        loadStacksAndSections();
        
        // Close modal and reset
        setShowStackForm(false);
        setSelectedStack(null);
        setValidation(undefined);
        
        alert(`Stack ${updatedStack.stackNumber} updated successfully!`);
      } else {
        alert('Error updating stack: Stack not found');
      }
    } catch (error) {
      alert(`Error updating stack: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStack = async (stack: YardStack) => {
    if (!currentYard || !canManageStacks) return;

    if (stack.currentOccupancy > 0) {
      alert('Cannot delete stack with containers. Please move all containers first.');
      return;
    }

    if (confirm(`Are you sure you want to delete Stack ${stack.stackNumber}? This action cannot be undone.`)) {
      try {
        const success = stackService.deleteStack(currentYard.id, stack.id, user?.name);
        if (success) {
          loadStacksAndSections();
          alert(`Stack ${stack.stackNumber} deleted successfully!`);
        } else {
          alert('Error deleting stack: Stack not found');
        }
      } catch (error) {
        alert(`Error deleting stack: ${error}`);
      }
    }
  };

  const handleBulkCreate = async (stacksData: StackFormData[]) => {
    if (!currentYard || !canManageStacks) return;

    setIsLoading(true);
    try {
      const createdStacks = stackService.bulkCreateStacks(
        currentYard.id,
        stacksData[0]?.sectionId || '',
        stacksData,
        user?.name
      );

      loadStacksAndSections();
      setShowBulkForm(false);
      
      alert(`Successfully created ${createdStacks.length} stacks!`);
    } catch (error) {
      alert(`Error creating stacks: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStack = (stack: YardStack) => {
    setSelectedStack(stack);
    setValidation(undefined);
    setShowStackForm(true);
  };

  const handleViewStack = (stack: YardStack) => {
    setSelectedStack(stack);
    setShowDetailModal(true);
  };

  const handleFormSubmit = (stackData: StackFormData) => {
    if (selectedStack) {
      handleUpdateStack(stackData);
    } else {
      handleCreateStack(stackData);
    }
  };

  if (!canManageStacks) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage stacks.</p>
      </div>
    );
  }

  if (!currentYard) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Yard Selected</h3>
        <p className="text-gray-600">Please select a yard to manage stacks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dynamic Stack Management</h2>
          <p className="text-gray-600">
            Create, edit, and manage stacks for {currentYard.name} ({currentYard.code})
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm text-gray-600">
            <div>{stacks.length} stacks</div>
            <div className="text-xs">
              {stacks.reduce((sum, s) => sum + s.capacity, 0)} total capacity
            </div>
          </div>
        </div>
      </div>

      {/* Stack List View */}
      <StackListView
        stacks={stacks}
        sections={sections}
        searchTerm={searchTerm}
        sectionFilter={sectionFilter}
        onSearchChange={setSearchTerm}
        onSectionFilterChange={setSectionFilter}
        onCreateStack={() => {
          setSelectedStack(null);
          setValidation(undefined);
          setShowStackForm(true);
        }}
        onEditStack={handleEditStack}
        onDeleteStack={handleDeleteStack}
        onViewStack={handleViewStack}
        onBulkCreate={() => setShowBulkForm(true)}
      />

      {/* Stack Form Modal */}
      {showStackForm && (
        <StackFormModal
          isOpen={showStackForm}
          onClose={() => {
            setShowStackForm(false);
            setSelectedStack(null);
            setValidation(undefined);
          }}
          onSubmit={handleFormSubmit}
          selectedStack={selectedStack}
          sections={sections}
          yardId={currentYard.id}
          isLoading={isLoading}
          validation={validation}
        />
      )}

      {/* Bulk Creation Modal */}
      {showBulkForm && (
        <BulkStackCreationModal
          isOpen={showBulkForm}
          onClose={() => setShowBulkForm(false)}
          onSubmit={handleBulkCreate}
          sections={sections}
          isLoading={isLoading}
        />
      )}

      {/* Stack Detail Modal */}
      {showDetailModal && (
        <StackDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStack(null);
          }}
          stack={selectedStack}
          sections={sections}
        />
      )}
    </div>
  );
};