import React, { useState, useEffect } from 'react';
import { X, Save, Loader, User as UserIcon, Mail, Phone, Building, Shield, MapPin, Check } from 'lucide-react';
import type { User } from '../../types';
import { useYard } from '../../hooks/useYard';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser?: User | null;
  onSubmit: (userData: any) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  selectedUser,
  onSubmit
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const { availableYards } = useYard();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    company: '',
    role: 'operator' as User['role'],
    yardAssignments: [] as string[],
    isActive: true,
    password: ''
  });

  // Initialize form data when editing
  useEffect(() => {
    if (selectedUser) {
      setFormData({
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone || '',
        department: selectedUser.department || '',
        company: selectedUser.company || '',
        role: selectedUser.role,
        yardAssignments: selectedUser.yardAssignments || [],
        isActive: selectedUser.isActive,
        password: '' // Never pre-fill password
      });
    } else {
      // Reset form for new user
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        company: '',
        role: 'operator',
        yardAssignments: [],
        isActive: true,
        password: ''
      });
    }
  }, [selectedUser, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    triggerAutoSave();
  };

  const handleYardAssignmentToggle = (yardId: string) => {
    setFormData(prev => ({
      ...prev,
      yardAssignments: prev.yardAssignments.includes(yardId)
        ? prev.yardAssignments.filter(id => id !== yardId)
        : [...prev.yardAssignments, yardId]
    }));
    triggerAutoSave();
  };

  const handleSelectAllYards = () => {
    const allYardIds = availableYards.map(yard => yard.id);
    setFormData(prev => ({
      ...prev,
      yardAssignments: prev.yardAssignments.length === allYardIds.length ? [] : allYardIds
    }));
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || (!selectedUser && !formData.password)) {
      alert('Please fill in all required fields.');
      return;
    }

    if (formData.yardAssignments.length === 0) {
      alert('Please assign at least one yard to the user.');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSubmit(formData);
    } catch (error) {
      alert('Error saving user: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDescription = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'Full system access across all modules';
      case 'supervisor': return 'Operations oversight and management';
      case 'operator': return 'Daily operations and container handling';
      case 'client': return 'View containers and create release orders';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedUser ? 'Edit User' : 'Create New User'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedUser ? 'Update user information and yard assignments' : 'Add a new user to the system'}
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
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="form-input w-full"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="form-input w-full pl-12"
                      placeholder="john.doe@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="form-input w-full pl-12"
                      placeholder="+225 XX XX XX XX XX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="form-input w-full"
                    placeholder="Operations, Administration, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="form-input w-full pl-12"
                      placeholder="Container Depot Ltd"
                    />
                  </div>
                </div>

                {!selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="form-input w-full"
                      placeholder="Enter secure password"
                      minLength={6}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Role & Permissions
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    User Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="operator">Operator</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrator</option>
                    <option value="client">Client</option>
                  </select>
                  <p className="text-xs text-purple-600 mt-1">
                    {getRoleDescription(formData.role)}
                  </p>
                </div>
              </div>
            </div>

            {/* Yard Assignments */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-600 text-white rounded-lg">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-900">Yard Assignments</h4>
                    <p className="text-sm text-green-700">
                      Select which yards this user can access ({formData.yardAssignments.length} selected)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllYards}
                  className="text-sm font-medium text-green-600 hover:text-green-800 px-3 py-1 hover:bg-green-100 rounded-md transition-colors"
                >
                  {formData.yardAssignments.length === availableYards.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {availableYards.map((yard) => {
                  const isSelected = formData.yardAssignments.includes(yard.id);
                  const occupancyRate = (yard.currentOccupancy / yard.totalCapacity) * 100;

                  return (
                    <div
                      key={yard.id}
                      onClick={() => handleYardAssignmentToggle(yard.id)}
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
                              <span className="font-medium text-gray-900">{yard.name}</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {yard.code}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">{yard.location}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="text-xs text-gray-500">
                                {yard.currentOccupancy}/{yard.totalCapacity} containers
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                occupancyRate >= 90 ? 'bg-red-100 text-red-600' :
                                occupancyRate >= 75 ? 'bg-orange-100 text-orange-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                {occupancyRate.toFixed(0)}%
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

              {availableYards.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No yards available</p>
                  <p className="text-xs">Contact administrator to set up yards</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-900">
                Active User
              </label>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {formData.yardAssignments.length > 0 ? (
                <span className="text-green-600 font-medium">
                  ✓ {formData.yardAssignments.length} yard{formData.yardAssignments.length !== 1 ? 's' : ''} assigned
                </span>
              ) : (
                <span className="text-red-600">⚠ No yards assigned</span>
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
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading || formData.yardAssignments.length === 0}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>{selectedUser ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{selectedUser ? 'Update User' : 'Create User'}</span>
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
