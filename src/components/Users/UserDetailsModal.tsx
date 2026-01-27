import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Building,
  Shield,
  MapPin,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Calendar,
  Monitor,
  Globe,
  Settings,
  Loader,
  AlertCircle
} from 'lucide-react';
import type { UserDetails, User } from '../../types';
import { userService } from '../../services/api';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { UserManagementErrorFallback } from '../Common/DatabaseErrorFallback';
import { useDatabaseRetry } from '../../hooks/useRetry';
import { handleError } from '../../services/errorHandling';
import { logger } from '../../utils/logger';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  user,
  onEdit,
  onDelete
}) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataLoadingStates, setDataLoadingStates] = useState({
    yardDetails: false,
    activityHistory: false,
    permissionSummary: false,
    loginHistory: false
  });

  // Use retry mechanism for fetching user details
  const {
    execute: fetchUserDetailsWithRetry,
    isRetrying,
    retryCount,
    lastError
  } = useDatabaseRetry(async (userId: string) => {
    return await userService.getUserDetails(userId);
  });

  // Fetch user details when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      fetchUserDetails();
    } else {
      // Reset state when modal closes
      resetModalState();
    }
  }, [isOpen, user?.id]);

  const resetModalState = () => {
    setUserDetails(null);
    setError(null);
    setDataLoadingStates({
      yardDetails: false,
      activityHistory: false,
      permissionSummary: false,
      loginHistory: false
    });
  };

  const fetchUserDetails = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setDataLoadingStates({
      yardDetails: true,
      activityHistory: true,
      permissionSummary: true,
      loginHistory: true
    });

    try {
      const details = await fetchUserDetailsWithRetry(user.id);
      setUserDetails(details);
    } catch (err) {
      handleError(err, 'UserDetailsModal.fetchUserDetails');
      const errorInstance = err instanceof Error ? err : new Error('Failed to load user details');
      setError(errorInstance);

      // Set fallback user details with proper error handling
      setUserDetails({
        ...user,
        yardDetails: [],
        activityHistory: [],
        permissionSummary: {
          totalModules: Object.keys(user.moduleAccess || {}).length,
          enabledModules: Object.values(user.moduleAccess || {}).filter(Boolean).length,
          disabledModules: Object.values(user.moduleAccess || {}).filter(v => !v).length,
          moduleList: Object.entries(user.moduleAccess || {}).map(([module, enabled]) => ({
            module: module as keyof typeof user.moduleAccess,
            enabled: Boolean(enabled),
            category: 'core' as const
          }))
        },
        loginHistory: []
      });
    } finally {
      setLoading(false);
      setDataLoadingStates({
        yardDetails: false,
        activityHistory: false,
        permissionSummary: false,
        loginHistory: false
      });
    }
  };

  const handleRetry = () => {
    fetchUserDetails();
  };

  if (!isOpen || !user) return null;

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'supervisor':
        return <Shield className="h-4 w-4 text-orange-600" />;
      case 'operator':
        return <UserIcon className="h-4 w-4 text-blue-600" />;
      case 'client':
        return <UserIcon className="h-4 w-4 text-green-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: User['role']) => {
    const roleConfig: Record<string, { color: string; label: string }> = {
      admin: { color: 'bg-red-100 text-red-800', label: 'Administrator' },
      supervisor: { color: 'bg-orange-100 text-orange-800', label: 'Supervisor' },
      operator: { color: 'bg-blue-100 text-blue-800', label: 'Operator' },
      client: { color: 'bg-green-100 text-green-800', label: 'Client' },
      viewer: { color: 'bg-gray-100 text-gray-800', label: 'Viewer' }
    };

    const config = roleConfig[role] || roleConfig.viewer;
    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
        {getRoleIcon(role)}
        <span className="ml-2">{config.label}</span>
      </span>
    );
  };

  const formatLastLogin = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'Never';

    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return dateObj.toLocaleDateString();
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ErrorBoundary
      context={`User Details Modal - ${user?.name || 'Unknown User'}`}
      onError={(error, errorInfo) => {
        logger.error('User Details Modal component error', 'UserDetailsModal', {
          error: error.message,
          userId: user?.id,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getRoleBadge(user.role)}
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  user.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(user)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Edit User
              </button>
              <button
                onClick={() => onDelete(user.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && !userDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">Loading user details...</p>
                <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
                {retryCount > 0 && (
                  <p className="text-xs text-orange-600 mt-2">Retry attempt {retryCount}</p>
                )}
              </div>
            </div>
          ) : error && !userDetails ? (
            <div className="p-6">
              <UserManagementErrorFallback
                error={error}
                onRetry={handleRetry}
                operation="loading"
              />
              {isRetrying && (
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center space-x-2 text-blue-600">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      Retrying... ({retryCount}/3)
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column - User Profile */}
            <div className="lg:col-span-1 space-y-6">

              {/* Basic Information */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Profile Information
                </h4>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Email</p>
                      <p className="text-sm text-blue-700">{user.email}</p>
                    </div>
                  </div>

                  {user.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Phone</p>
                        <p className="text-sm text-blue-700">{user.phone}</p>
                      </div>
                    </div>
                  )}

                  {user.department && (
                    <div className="flex items-center space-x-3">
                      <Building className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Department</p>
                        <p className="text-sm text-blue-700">{user.department}</p>
                      </div>
                    </div>
                  )}

                  {user.company && (
                    <div className="flex items-center space-x-3">
                      <Building className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Company</p>
                        <p className="text-sm text-blue-700">{user.company}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Created</p>
                      <p className="text-sm text-blue-700">{formatDate(user.createdAt)}</p>
                      <p className="text-xs text-blue-600">by {user.createdBy}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Last Login</p>
                      <p className="text-sm text-blue-700">{formatLastLogin(user.lastLogin)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions Summary */}
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Permissions Overview
                </h4>

                {dataLoadingStates.permissionSummary ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="h-5 w-5 animate-spin text-purple-600" />
                    <span className="ml-2 text-sm text-purple-600">Loading permissions...</span>
                  </div>
                ) : error && !userDetails?.permissionSummary ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Unable to load detailed permissions</span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      Retry Loading
                    </button>
                    {/* Show basic permissions from user object as fallback */}
                    <div className="bg-white rounded p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 mb-2">Basic permissions (from user profile):</p>
                      <div className="text-xs text-purple-700">
                        {user.moduleAccess ? (
                          <div className="grid grid-cols-2 gap-1">
                            {Object.entries(user.moduleAccess).map(([module, enabled]) => (
                              <div key={module} className={`px-2 py-1 rounded text-xs ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {module}: {enabled ? 'Yes' : 'No'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No permission data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : userDetails?.permissionSummary ? (
                  <div className="space-y-3">
                    <div className="text-sm text-purple-700">
                      <p className="font-medium">Module Access Summary</p>
                      <p className="text-xs mt-1">
                        {userDetails.permissionSummary.enabledModules} of {userDetails.permissionSummary.totalModules} modules enabled
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2 border border-purple-200">
                        <p className="font-medium text-purple-800">Enabled</p>
                        <p className="text-green-600 font-semibold">{userDetails.permissionSummary.enabledModules}</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-purple-200">
                        <p className="font-medium text-purple-800">Disabled</p>
                        <p className="text-red-600 font-semibold">{userDetails.permissionSummary.disabledModules}</p>
                      </div>
                    </div>

                    {/* Module categories breakdown */}
                    <div className="space-y-2">
                      {['core', 'operations', 'management', 'admin'].map(category => {
                        const categoryModules = userDetails.permissionSummary.moduleList.filter(m => m.category === category);
                        const enabledInCategory = categoryModules.filter(m => m.enabled).length;

                        return (
                          <div key={category} className="bg-white rounded p-2 border border-purple-200">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-purple-800 capitalize">{category}</span>
                              <span className="text-xs text-purple-600">
                                {enabledInCategory}/{categoryModules.length}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-purple-600">
                    <Settings className="h-6 w-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-sm font-medium">No detailed permission data available</p>
                    <p className="text-xs text-purple-500 mt-1">
                      Permission details could not be loaded. Check user's module access settings.
                    </p>
                    <button
                      onClick={handleRetry}
                      className="mt-2 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Yard Assignments and Activity */}
            <div className="lg:col-span-2 space-y-6">

              {/* Yard Assignments */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Yard Assignments
                  {user.yardIds && user.yardIds.length > 0 && (
                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                      {user.yardIds.length} assigned
                    </span>
                  )}
                </h4>

                {dataLoadingStates.yardDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-5 w-5 animate-spin text-green-600" />
                    <span className="ml-2 text-sm text-green-600">Loading yard assignments...</span>
                  </div>
                ) : error && (!userDetails?.yardDetails || userDetails.yardDetails.length === 0) && user.yardIds && user.yardIds.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Unable to load yard assignment details</span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Retry Loading Yard Details
                    </button>
                    {/* Show basic yard IDs as fallback */}
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm font-medium text-green-900 mb-2">Assigned Yard IDs:</p>
                      <div className="flex flex-wrap gap-2">
                        {user.yardIds.map((yardId) => (
                          <span key={yardId} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            {yardId}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        Detailed yard information could not be loaded
                      </p>
                    </div>
                  </div>
                ) : userDetails?.yardDetails && userDetails.yardDetails.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userDetails.yardDetails.map((yard) => (
                      <div key={yard.yardId} className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-600 text-white rounded-lg">
                            <Building className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-green-900">{yard.yardName}</p>
                            <p className="text-sm text-green-700">Code: {yard.yardCode}</p>
                            <p className="text-xs text-green-600">
                              Assigned {formatDate(yard.assignedAt)} by {yard.assignedBy}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-green-600">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-green-400" />
                    <p className="text-sm font-medium">No yard assignments</p>
                    <p className="text-xs text-green-500 mt-1">
                      {user.yardIds && user.yardIds.length > 0
                        ? 'Yard assignment details are not available'
                        : 'User has not been assigned to any yards'
                      }
                    </p>
                    {user.yardIds && user.yardIds.length > 0 && (
                      <button
                        onClick={handleRetry}
                        className="mt-2 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        Try Loading Details
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* User Activity History */}
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                  <span className="ml-2 text-xs text-orange-600">(Last 30 days)</span>
                </h4>

                {dataLoadingStates.activityHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-5 w-5 animate-spin text-orange-600" />
                    <span className="ml-2 text-sm text-orange-600">Loading activity history...</span>
                  </div>
                ) : error && (!userDetails?.activityHistory || userDetails.activityHistory.length === 0) ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Unable to load activity history</span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="w-full px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      Retry Loading Activity
                    </button>
                    <div className="bg-white rounded-lg p-4 border border-orange-200 text-center">
                      <Activity className="h-6 w-6 mx-auto mb-2 text-orange-400" />
                      <p className="text-sm text-orange-600">Activity tracking may not be available</p>
                      <p className="text-xs text-orange-500 mt-1">
                        User activity logs could not be retrieved at this time
                      </p>
                    </div>
                  </div>
                ) : userDetails?.activityHistory && userDetails.activityHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {userDetails.activityHistory.map((activity) => (
                      <div key={activity.id} className="bg-white rounded-lg p-4 border border-orange-200">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-orange-600 text-white rounded-lg">
                            <Monitor className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-orange-900">{activity.action}</p>
                            <p className="text-xs text-orange-700 mt-1">{activity.details}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-orange-600">
                              <span>{formatDate(activity.timestamp)}</span>
                              {activity.ipAddress && (
                                <span>IP: {activity.ipAddress}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-orange-600">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs text-orange-500 mt-1">
                      {error
                        ? 'Activity tracking is currently unavailable'
                        : 'User activity will appear here when available'
                      }
                    </p>
                    {error && (
                      <button
                        onClick={handleRetry}
                        className="mt-2 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                      >
                        Check for Activity
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Login History */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Login History
                  <span className="ml-2 text-xs text-gray-600">(Recent sessions)</span>
                </h4>

                {dataLoadingStates.loginHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-5 w-5 animate-spin text-gray-600" />
                    <span className="ml-2 text-sm text-gray-600">Loading login history...</span>
                  </div>
                ) : error && (!userDetails?.loginHistory || userDetails.loginHistory.length === 0) ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Unable to load login history</span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Retry Loading Login History
                    </button>
                    <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <Globe className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Login tracking may not be available</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Session history could not be retrieved at this time
                      </p>
                      {user.lastLogin && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <p>Last known login: {formatLastLogin(user.lastLogin)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : userDetails?.loginHistory && userDetails.loginHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {userDetails.loginHistory.map((login) => (
                      <div key={login.id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-600 text-white rounded-lg">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">Login Session</p>
                              {login.sessionDuration && (
                                <span className="text-xs text-gray-500">
                                  {login.sessionDuration} min
                                </span>
                              )}
                            </div>
                            <div className="mt-1 space-y-1 text-xs text-gray-600">
                              <p>Login: {formatDate(login.loginTime)}</p>
                              {login.logoutTime && (
                                <p>Logout: {formatDate(login.logoutTime)}</p>
                              )}
                              {login.ipAddress && (
                                <p>IP: {login.ipAddress}</p>
                              )}
                              {login.userAgent && (
                                <p className="truncate" title={login.userAgent}>
                                  Browser: {login.userAgent.split(' ')[0]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium">No login history available</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {error
                        ? 'Session tracking is currently unavailable'
                        : 'Login sessions will appear here when available'
                      }
                    </p>
                    {user.lastLogin && (
                      <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                        <p>Last known login: {formatLastLogin(user.lastLogin)}</p>
                      </div>
                    )}
                    {error && (
                      <button
                        onClick={handleRetry}
                        className="mt-2 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Check Login History
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};
