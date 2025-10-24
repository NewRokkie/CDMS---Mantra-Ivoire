import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthProvider, AuthContext } from './hooks/useAuth';
import { useLanguageProvider, LanguageContext } from './hooks/useLanguage';

// Lazy load components for better performance
const LoginForm = lazy(() => import('./components/Auth/LoginForm').then(module => ({ default: module.LoginForm })));
const ProtectedApp = lazy(() => import('./components/Layout/ProtectedApp'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

function App() {
  const authProvider = useAuthProvider();
  const languageProvider = useLanguageProvider();

  return (
    <AuthContext.Provider value={authProvider}>
      <LanguageContext.Provider value={languageProvider}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </Suspense>
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
