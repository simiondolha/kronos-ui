import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cesium(),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Note: cesium is handled by vite-plugin-cesium
          react: ['react', 'react-dom'],
          zustand: ['zustand'],
        },
      },
    },
  },
});
