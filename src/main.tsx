import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const isOperator = window.location.pathname === '/operator';

const AppComponent = isOperator
  ? (await import('./operator/OperatorApp')).default
  : (await import('./App')).default;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppComponent />
  </StrictMode>,
);
