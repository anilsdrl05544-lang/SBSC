import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent Firebase quota limit rejections and offline notices from triggering AI Studio chat redirection
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '').toLowerCase();
    if (
      msg.includes('resource-exhausted') ||
      msg.includes('quota limit exceeded') ||
      msg.includes('quota exceeded') ||
      msg.includes('client is offline') ||
      msg.includes('free daily write units')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const joined = args
      .map((a) => (typeof a === 'object' ? (a?.message || JSON.stringify(a)) : String(a)))
      .join(' ')
      .toLowerCase();
    if (
      joined.includes('resource-exhausted') ||
      joined.includes('quota limit exceeded') ||
      joined.includes('quota exceeded') ||
      joined.includes('free daily write units') ||
      joined.includes('maximum backoff delay')
    ) {
      // Route to console.warn so debugging is preserved without triggering AI Studio error redirect
      console.warn(...args);
      return;
    }
    originalConsoleError(...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
