import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { initializeServices } from './services/initialize';
import { AuthProvider } from './hooks/useAuth';
import { LoadingProvider } from './hooks/useLoading';
import { LanguageProvider } from './hooks/useLanguage';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// Initialize services and event listeners
initializeServices();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <LanguageProvider>
        <LoadingProvider>
          <App />
        </LoadingProvider>
      </LanguageProvider>
    </AuthProvider>
  </BrowserRouter>
);
