import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('PWA service worker registration skipped:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
