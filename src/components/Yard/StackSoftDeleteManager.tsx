/**
 * Stack Soft Delete Manager Component
 * 
 * Provides UI for managing stack lifecycle with soft delete:
 * - View active and inactive stacks
 * - Soft delete stacks
 * - Reactivate soft-deleted stacks
 * - Smart stack recreation with location recovery
 * - Permanent deletion (admin only)
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../UI/card';
import { Button } from '../UI/button';
import { Badge } from '../UI/badge';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import StackSoftDeleteService, { StackStatusSummary } from '../../services/api/stackSoftDeleteService';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';

interface StackSoftDeleteManagerProps {
  yardId?: string;
  onStackChange?: () => void;
}

export const StackSoftDeleteManager: React.FC<StackSoftDeleteManagerProps> = ({
  yardId,
  onStackChange
}) => {
  const [stacks, setStacks] = useState<StackStatusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'soft-delete' | 'reactivate' | 'permanent-delete';
    stack: StackStatusSummary;
  } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadStacks();
  }, [yardId]);

  const loadStacks = async () => {
    setLoading(true);
    try {
      const result = await StackSoftDeleteService.getStackStatusSummary(yardId);
      if (result.success && result.data) {
        setStacks(result.data);
      } else {
        toast.error(result.message || 'Failed to load stacks');
      }
    } catch (error) {
      console.error('Error loading stacks:', error);
      toast.error('An error occurred while loading stacks');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (stack: StackStatusSummary) => {
    if (stack.occupied_locations > 0) {
      toast.error(`Cannot delete Stack S${stack.stack_number} - it has ${stack.occupied_locations} occupied locations`);
      return;
    }

    setConfirmAction({ type: 'soft-delete', stack });
    setShowConfirmDialog(true);
  };

  const handleReactivate = async (stack: StackStatusSummary) => {
    setConfirmAction({ type: 'reactivate', stack });
    setShowConfirmDialog(true);
  };

  const handlePermanentDelete = async (stack: StackStatusSummary) => {
    if (stack.is_active) {
      toast.error('Cannot permanently delete an active stack. Soft delete it first.');
      return;
    }

    if (stack.occupied_locations > 0) {
      toast.error(`Cannot permanently delete Stack S${stack.stack_number} - it has ${stack.occupied_locations} occupied locations`);
      return;
    }

    setConfirmAction({ type: 'permanent-delete', stack });
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    const { type, stack } = confirmAction;
    let result;

    try {
      switch (type) {
        case 'soft-delete':
          result = await StackSoftDeleteService.softDeleteStack(stack.id, user?.email);
          break;
        case 'reactivate':
          result = await StackSoftDeleteService.reactivateStack(stack.id, user?.email);
          break;
        case 'permanent-delete':
          result = await StackSoftDeleteService.permanentlyDeleteInactiveStack(stack.id, user?.email);
          break;
      }

      if (result?.success) {
        toast.success(result.message);
        await loadStacks();
        onStackChange?.();
      } else {
        toast.error(result?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('An error occurred while executing the action');
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const filteredStacks = stacks.filter(stack => {
    switch (filter) {
      case 'active':
        return stack.is_active;
      case 'inactive':
        return !stack.is_active;
      default:
        return true;
    }
  });

  const getStatusBadge = (stack: StackStatusSummary) => {
    if (!stack.is_active) {
      return <Badge variant="warning">Inactive</Badge>;
    }
    if (stack.occupied_locations > 0) {
      return <Badge variant="default">Active ({stack.occupied_locations} occupied)</Badge>;
    }
    return <Badge variant="info">Active (Empty)</Badge>;
  };

  const getActionButtons = (stack: StackStatusSummary) => {
    const isAdmin = user?.role === 'admin';
    const isSupervisor = user?.role === 'supervisor';
    const canManage = isAdmin || isSupervisor;

    if (!canManage) return null;

    return (
      <div className="flex gap-2">
        {stack.is_active ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSoftDelete(stack)}
            disabled={stack.occupied_locations > 0}
          >
            Soft Delete
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReactivate(stack)}
            >
              Reactivate
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handlePermanentDelete(stack)}
                disabled={stack.occupied_locations > 0}
              >
                Permanent Delete
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Loading stacks...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Stack Management</h2>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({stacks.length})
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Active ({stacks.filter(s => s.is_active).length})
            </Button>
            <Button
              variant={filter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('inactive')}
            >
              Inactive ({stacks.filter(s => !s.is_active).length})
            </Button>
          </div>
        </div>
      </div>

      {/* Stack List */}
      <div className="grid gap-4">
        {filteredStacks.map((stack) => (
          <Card key={stack.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">
                    Stack S{stack.stack_number.toString().padStart(2, '0')}
                  </h3>
                  {getStatusBadge(stack)}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Yard: {stack.yard_id}</div>
                  <div>Section: {stack.section_name}</div>
                  <div>
                    Locations: {stack.active_locations}/{stack.total_locations} active
                    {stack.occupied_locations > 0 && (
                      <span className="ml-2 text-orange-600">
                        ({stack.occupied_locations} occupied)
                      </span>
                    )}
                  </div>
                  <div>Capacity: {stack.current_occupancy}/{stack.capacity}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {getActionButtons(stack)}
                <div className="text-xs text-gray-500">
                  Updated: {new Date(stack.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredStacks.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            No {filter !== 'all' ? filter : ''} stacks found
            {yardId && ` in yard ${yardId}`}
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={executeConfirmedAction}
        title={
          confirmAction?.type === 'soft-delete' ? 'Soft Delete Stack' :
          confirmAction?.type === 'reactivate' ? 'Reactivate Stack' :
          'Permanently Delete Stack'
        }
        message={
          confirmAction?.type === 'soft-delete' 
            ? `Are you sure you want to soft delete Stack S${confirmAction.stack.stack_number}? This will deactivate the stack and all its locations, but preserve all data for potential recovery.`
            : confirmAction?.type === 'reactivate'
            ? `Are you sure you want to reactivate Stack S${confirmAction.stack.stack_number}? This will reactivate the stack and all its existing locations.`
            : `Are you sure you want to PERMANENTLY delete Stack S${confirmAction?.stack.stack_number}? This action cannot be undone and will remove all stack and location data.`
        }
        confirmText={
          confirmAction?.type === 'permanent-delete' ? 'Permanently Delete' : 'Confirm'
        }
        type={confirmAction?.type === 'permanent-delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default StackSoftDeleteManager;