import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

// Initialize i18n FIRST before any other imports
import './i18n/config';

import App from './App.tsx';
import { initializeServices } from './services/initialize';
import { AuthProvider } from './hooks/useAuth';
import { LoadingProvider } from './hooks/useLoading';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// Initialize services and event listeners
initializeServices();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <LoadingProvider>
        <App />
      </LoadingProvider>
    </AuthProvider>
  </BrowserRouter>
);
