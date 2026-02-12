import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import ProtectedApp from './components/Layout/ProtectedApp';
import { LoginForm } from './components/Auth/LoginForm';
import { ResetPasswordPage } from './components/Auth/ResetPasswordPage';
import ToastContainer from './components/UI/ToastContainer';
import ConfirmModal from './components/UI/ConfirmModal';
import { useToast } from './hooks/useToast';
import { useConfirm } from './hooks/useConfirm';
import { PWAManifestManager } from './components/PWA/PWAManifestManager';

/**
 * Enhanced Application with:
 * - Performance monitoring
 * - Loading states management
 * - Error boundary protection
 * - Global Toast notifications
 * - Global Confirmation dialogs
 * - PWA Manifest Management
 */
const App: React.FC = () => {
  const { toasts, removeToast } = useToast();
  const { isOpen, options, handleConfirm, handleCancel } = useConfirm();

  return (
    <ErrorBoundary>
      {/* PWA Support */}
      <PWAManifestManager />

      {/* Global UI Components */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {isOpen && options && (
        <ConfirmModal
          isOpen={isOpen}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Application Routes */}
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;