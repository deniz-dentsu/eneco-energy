import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TDPage from './TDPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TDPage />
  </StrictMode>
);
