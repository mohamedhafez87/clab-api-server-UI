import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/app/',
  plugins: [react()],
  build: {
    outDir: '../internal/webui/static',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:8090',
        changeOrigin: true,
        secure: false
      },
      '/login': {
        target: 'https://127.0.0.1:8090',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'https://127.0.0.1:8090',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
