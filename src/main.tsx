import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Ion } from 'cesium';

// Cesium CSS (local import to avoid CDN version drift)
import 'cesium/Build/Cesium/Widgets/widgets.css';

import App from './App';
import './index.css';

// Initialize Cesium Ion token
Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || '';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element. Check index.html for div#root.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
