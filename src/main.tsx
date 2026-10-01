import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Registra o Service Worker de notificações
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-notifications.js', { scope: '/' })
      .then((reg) => {
        console.log('✅ SW de notificações registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ SW não registrado:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);