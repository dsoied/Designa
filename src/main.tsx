import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BatchProvider } from './context/BatchContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <BatchProvider>
          <App />
        </BatchProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
