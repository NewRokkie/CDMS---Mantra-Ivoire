import React from 'react';

/**
 * Props for the AccessDenied component
 */
interface AccessDeniedProps {}

/**
 * Access Denied component displayed when user tries to access
 * a module they don't have permission for
 */
export const AccessDenied: React.FC<AccessDeniedProps> = () => (
  <div className="text-center py-12">
    <div className="h-12 w-12 text-red-400 mx-auto mb-4">🚫</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
    <p className="text-gray-600">
      You don't have permission to access this module.
    </p>
    <p className="text-sm text-gray-500 mt-2">
      Contact your administrator to request access.
    </p>
  </div>
);