import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { SettingsProvider } from './context/SettingsContext.tsx';
import { UserProvider } from './context/UserContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
);
