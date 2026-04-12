import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BatchProvider } from './context/BatchContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BatchProvider>
      <App />
    </BatchProvider>
  </StrictMode>,
);
