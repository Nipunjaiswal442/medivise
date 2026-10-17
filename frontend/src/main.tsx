import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConvexProvider } from 'convex/react';
import { convex } from '@/convex/client';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
);
