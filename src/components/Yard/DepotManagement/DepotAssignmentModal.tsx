import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  Check,
  UserPlus,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Yard, User } from '../../../types';
import { useYard } from '../../../hooks/useYard';
import { userService } from '../../../services/api/userService';
import { FormModal } from '../../Common/Modal/FormModal';

interface DepotAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  depot: Yard | null;
  onAssign: (userIds: string[]) => void;
  isLoading?: boolean;
}

interface UserWithAssignment extends User {
  isAssigned: boolean;
  yardIds?: string[];
}

export const DepotAssignmentModal: React.FC<DepotAssignmentModalProps> = ({
  isOpen,
  onClose,
  depot,
  onAssign,
  isLoading = false
}) => {
  const [users, setUsers] = useState<UserWithAssignment[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { availableYards } = useYard();

  useEffect(() => {
    if (isOpen && depot) {
      loadUsers();
    }
    setSearchTerm('');
    setValidationErrors([]);
  }, [isOpen, depot]);

  useEffect(() => {
    // Validate selection
    if (selectedUserIds.length === 0) {
      setValidationErrors(['At least one user must be selected']);
    } else {
      setValidationErrors([]);
    }
  }, [selectedUserIds]);

  const loadUsers = async () => {
    if (!depot) return;

    try {
      setIsLoadingUsers(true);
      const allUsers = await userService.getAll();

      const usersWithAssignments = allUsers.map((user) => ({
        ...user,
        isAssigned:
          (user.yardIds && (user.yardIds.includes(depot.id) || user.yardIds.includes('all'))) || false,
        yardIds: user.yardIds || []
      }));

      setUsers(usersWithAssignments);
      setSelectedUserIds(
        usersWithAssignments.filter((u) => u.isAssigned).map((u) => u.id)
      );
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      setSelectedUserIds([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleSubmit = async () => {
    if (!depot || selectedUserIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Update each user's yard assignments
      const updatePromises = selectedUserIds.map(async (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        // Add depot to user's yard assignments if not already assigned
        const currentYardIds = user.yardIds || [];
        if (!currentYardIds.includes(depot.id)) {
          const updatedYardIds = [...currentYardIds, depot.id];
          await userService.update(userId, { yardIds: updatedYardIds } as any);
        }
      });

      // Remove depot from users who are no longer selected
      const removePromises = users
        .filter(user => !selectedUserIds.includes(user.id) && user.yardIds?.includes(depot.id))
        .map(async (user) => {
          const updatedYardIds = user.yardIds?.filter(id => id !== depot.id) || [];
          await userService.update(user.id, { yardIds: updatedYardIds } as any);
        });

      await Promise.all([...updatePromises, ...removePromises]);
      await onAssign(selectedUserIds);
    } catch (error) {
      console.error('Error assigning depot to users:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: User['role']) => {
    const config = {
      admin: {
        color: 'bg-red-100 text-red-800',
        label: 'Admin'
      },
      supervisor: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Supervisor'
      },
      operator: {
        color: 'bg-green-100 text-green-800',
        label: 'Operator'
      },
      client: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Client'
      }
    };

    const { color, label } = (
      config[role] || config['operator']
    ) as { color: string; label: string };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${color}`}
      >
        {label}
      </span>
    );
  };

  if (!depot) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Assign Users to Depot"
      subtitle={`${depot.name} (${depot.code})`}
      icon={UserPlus}
      size="lg"
      submitLabel="Assign Users"
      isSubmitting={isSubmitting}
      validationErrors={validationErrors}
      autoSave={true}
      onAutoSave={() => {
        // Auto-save logic could be implemented here if needed
      }}
    >
      {/* Search Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Search Users
        </h4>
        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* User Assignments Section */}
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600 text-white rounded-xl">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-900">User Assignments</h4>
              <p className="text-sm text-green-700">
                Select which users can access this depot ({selectedUserIds.length} selected)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelectAllUsers}
            className="text-sm font-medium text-green-600 hover:text-green-800 px-3 py-2 hover:bg-green-100 rounded-lg transition-colors"
          >
            {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {isLoadingUsers ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 mx-auto mb-2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No users found</p>
            <p className="text-xs">
              {searchTerm
                ? "Try adjusting your search criteria."
                : "No users available for assignment"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);

              return (
                <div
                  key={user.id}
                  onClick={() => handleUserToggle(user.id)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-green-500 bg-green-100 shadow-md'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg transition-all duration-200 ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Building className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{user.name}</span>
                          {getRoleBadge(user.role)}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                          <Mail className="h-3 w-3" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                          <Phone className="h-3 w-3" />
                          <span>{user.phone}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{user.department}</div>

                        {/* Current Yard Assignments */}
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500">Current assignments:</div>
                          <div className="flex flex-wrap gap-1">
                            {user.yardIds?.includes('all') ? (
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                                All Depots
                              </span>
                            ) : user.yardIds && user.yardIds.length > 0 ? (
                              user.yardIds.slice(0, 2).map(yardId => {
                                const yard = availableYards.find(y => y.id === yardId);
                                return (
                                  <span key={yardId} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                                    {yard?.code || yardId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-gray-400 italic">No assignments</span>
                            )}
                            {user.yardIds && user.yardIds.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{user.yardIds.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="bg-green-500 text-white rounded-full p-1 animate-scale-in">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FormModal>
  );
};
