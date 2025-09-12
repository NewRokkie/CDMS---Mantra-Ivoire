import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Building,
  Save,
  Loader,
  Check,
  UserPlus
} from 'lucide-react';
import { Yard, User } from '../../types';

interface DepotAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  depot: Yard | null;
  onAssign: (userIds: string[]) => void;
  isLoading?: boolean;
}

interface UserWithAssignment extends User {
  isAssigned: boolean;
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
  const [isSaving, setIsSaving] = useState(false);

  // Mock users data - in a real app, this would come from a user service
  const mockUsers: User[] = [
    {
      id: 'user-1',
      name: 'Jean-Baptiste Kouassi',
      email: 'jb.kouassi@depot.ci',
      role: 'operator',
      company: 'Depot Management',
      phone: '+225 01 02 03 04 05',
      department: 'Operations',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-01-01'),
      createdBy: 'System',
      moduleAccess: {
        dashboard: true,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: false,
        edi: false,
        yard: true,
        clients: false,
        users: false,
        moduleAccess: false,
        reports: false
      },
      yardAssignments: ['depot-tantarelli']
    },
    {
      id: 'user-2',
      name: 'Marie Adjoua',
      email: 'm.adjoua@depot.ci',
      role: 'operator',
      company: 'Depot Management',
      phone: '+225 01 02 03 04 06',
      department: 'Operations',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-02-01'),
      createdBy: 'System',
      moduleAccess: {
        dashboard: true,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: false,
        edi: false,
        yard: true,
        clients: false,
        users: false,
        moduleAccess: false,
        reports: false
      },
      yardAssignments: ['depot-vridi']
    },
    {
      id: 'user-3',
      name: 'Pierre Kouadio',
      email: 'p.kouadio@depot.ci',
      role: 'supervisor',
      company: 'Depot Management',
      phone: '+225 01 02 03 04 07',
      department: 'Management',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-01-15'),
      createdBy: 'System',
      moduleAccess: {
        dashboard: true,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true,
        edi: true,
        yard: true,
        clients: true,
        users: false,
        moduleAccess: false,
        reports: true
      },
      yardAssignments: ['depot-tantarelli', 'depot-vridi', 'depot-san-pedro']
    },
    {
      id: 'user-4',
      name: 'Sophie Traore',
      email: 's.traore@depot.ci',
      role: 'operator',
      company: 'Depot Management',
      phone: '+225 01 02 03 04 08',
      department: 'Operations',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-03-01'),
      createdBy: 'System',
      moduleAccess: {
        dashboard: true,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: false,
        edi: false,
        yard: true,
        clients: false,
        users: false,
        moduleAccess: false,
        reports: false
      },
      yardAssignments: []
    },
    {
      id: 'user-5',
      name: 'Ahmed Diallo',
      email: 'a.diallo@depot.ci',
      role: 'admin',
      company: 'Depot Management',
      phone: '+225 01 02 03 04 09',
      department: 'Administration',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date('2024-01-01'),
      createdBy: 'System',
      moduleAccess: {
        dashboard: true,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true,
        edi: true,
        yard: true,
        clients: true,
        users: true,
        moduleAccess: true,
        reports: true
      },
      yardAssignments: ['all']
    }
  ];

  useEffect(() => {
    if (isOpen && depot) {
      // Load users and their current assignments
      const usersWithAssignments = mockUsers.map((user) => ({
        ...user,
        isAssigned:
          user.yardAssignments.includes(depot.id) || user.yardAssignments.includes('all')
      }));

      setUsers(usersWithAssignments);
      setSelectedUserIds(
        usersWithAssignments.filter((u) => u.isAssigned).map((u) => u.id)
      );
    }
    setSearchTerm('');
  }, [isOpen, depot]);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onAssign(selectedUserIds);
      onClose();
    } catch (error) {
      console.error('Error assigning depot to users:', error);
    } finally {
      setIsSaving(false);
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

  if (!isOpen || !depot) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Depot to Users</h2>
              <p className="text-sm text-gray-600">
                {depot.name} ({depot.code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getRoleBadge(user.role)}
                      <span className="text-xs text-gray-500">
                        {user.department}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {user.isAssigned && (
                    <span className="text-xs text-green-600 font-medium flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Currently assigned
                    </span>
                  )}
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {selectedUserIds.includes(user.id)
                        ? 'Assigned'
                        : 'Assign'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : "No users available."}
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Assignment Summary
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedUserIds.length} user
                  {selectedUserIds.length !== 1 ? 's' : ''} will be assigned to{' '}
                  {depot.name}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {selectedUserIds.length}
                </div>
                <div className="text-sm text-gray-500">Selected</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Assignments</span>
          </button>
        </div>
      </div>
    </div>
  );
};
