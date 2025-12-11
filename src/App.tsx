import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthProvider, AuthContext } from './hooks/useAuth';
import { useLanguageProvider, LanguageContext } from './hooks/useLanguage';
import { FullScreenLoader } from './components/Common/FullScreenLoader';
import ToastContainer from './components/UI/ToastContainer';
import ConfirmModal from './components/UI/ConfirmModal';
import { useToast } from './hooks/useToast';
import { useConfirm } from './hooks/useConfirm';

// Lazy load components for better performance
const LoginForm = lazy(() => import('./components/Auth/LoginForm').then(module => ({ default: module.LoginForm })));
const ResetPasswordPage = lazy(() => import('./components/Auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const ProtectedApp = lazy(() => import('./components/Layout/ProtectedApp'));

function App() {
  const authProvider = useAuthProvider();
  const languageProvider = useLanguageProvider();
  const { toasts, removeToast } = useToast();
  const { isOpen, options, handleConfirm, handleCancel } = useConfirm();

  return (
    <AuthContext.Provider value={authProvider}>
      <LanguageContext.Provider value={languageProvider}>
        <Suspense fallback={<FullScreenLoader message="Loading Application..." />}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </Suspense>
        
        {/* Global Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        {/* Global Confirmation Modal */}
        {options && (
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
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
