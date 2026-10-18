import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import App from './App';
import SetupRequired from '@/components/SetupRequired';
import { convex } from '@/convex/client';
import './styles/global.css';

// Apply the saved theme before the first paint
try {
  if (localStorage.getItem('medivise_theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
} catch {
  // storage unavailable
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {convex ? (
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    ) : (
      <SetupRequired />
    )}
  </React.StrictMode>,
);
