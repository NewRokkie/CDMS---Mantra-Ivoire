import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Polyfills for Node.js modules
      stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
      timers: path.resolve(__dirname, 'node_modules/timers-browserify'),
      events: path.resolve(__dirname, 'node_modules/events'),
      util: path.resolve(__dirname, 'node_modules/util'),
    },
  },
});
