import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthProvider, AuthContext } from './hooks/useAuth';
import { useLanguageProvider, LanguageContext } from './hooks/useLanguage';
import { FullScreenLoader } from './components/Common/FullScreenLoader';

// Lazy load components for better performance
const LoginForm = lazy(() => import('./components/Auth/LoginForm').then(module => ({ default: module.LoginForm })));
const ProtectedApp = lazy(() => import('./components/Layout/ProtectedApp'));

function App() {
  const authProvider = useAuthProvider();
  const languageProvider = useLanguageProvider();

  return (
    <AuthContext.Provider value={authProvider}>
      <LanguageContext.Provider value={languageProvider}>
        <Suspense fallback={<FullScreenLoader message="Loading Application..." />}>
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
