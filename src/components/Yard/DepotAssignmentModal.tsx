import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Building,
  Save,
  Loader,
  Check,
  UserPlus,
  Mail,
  Phone,
  Shield,
  MapPin
} from 'lucide-react';
import { Yard, User } from '../../types';
import { useYard } from '../../hooks/useYard';

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
  const [autoSaving, setAutoSaving] = useState(false);
  const { availableYards } = useYard();

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
        reports: false,
        depotManagement: true
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
        reports: false,
        depotManagement: true
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
        reports: true,
        depotManagement: true
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
        reports: false,
        depotManagement: true
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
        reports: true,
        depotManagement: true
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
    triggerAutoSave();
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Users to Depot</h3>
                <p className="text-sm text-gray-600">
                  {depot.name} ({depot.code})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
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

          {/* User Assignments */}
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-600 text-white rounded-lg">
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
                className="text-sm font-medium text-green-600 hover:text-green-800 px-3 py-1 hover:bg-green-100 rounded-md transition-colors"
              >
                {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
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
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{user.name}</span>
                            {getRoleBadge(user.role)}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{user.phone}</span>
                          </div>
                          <div className="text-sm text-gray-600">{user.department}</div>
                          
                          {/* Current Yard Assignments */}
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="text-xs text-gray-500">Current assignments:</div>
                            <div className="flex flex-wrap gap-1">
                              {user.yardAssignments.includes('all') ? (
                                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                                  All Depots
                                </span>
                              ) : user.yardAssignments.length > 0 ? (
                                user.yardAssignments.slice(0, 2).map(yardId => {
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
                              {user.yardAssignments.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{user.yardAssignments.length - 2} more
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

            {filteredUsers.length === 0 && (
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
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedUserIds.length > 0 ? (
                <span className="text-green-600 font-medium">
                  ✓ {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                </span>
              ) : (
                <span className="text-red-600">⚠ No users selected</span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || selectedUserIds.length === 0}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Assign Users</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};