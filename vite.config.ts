import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'assets/logo.png', 'assets/logo_white.png'],
      manifest: {
        name: 'Container Depot Management System',
        short_name: 'CDMS',
        description: 'Advanced Container Depot Management System',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/assets/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/assets/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Gate In',
            short_name: 'Gate In',
            description: 'Quick access to Gate In operations',
            url: '/gate-in',
            icons: [{ src: '/assets/logo.png', sizes: '192x192' }]
          },
          {
            name: 'Gate Out',
            short_name: 'Gate Out',
            description: 'Quick access to Gate Out operations',
            url: '/gate-out',
            icons: [{ src: '/assets/logo.png', sizes: '192x192' }]
          },
          {
            name: 'Booking',
            short_name: 'Booking',
            description: 'Quick access to Bookings',
            url: '/booking',
            icons: [{ src: '/assets/logo.png', sizes: '192x192' }]
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
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
      // Ensure React is resolved from a single location
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true, // Listen on all addresses, including 0.0.0.0
    port: parseInt(process.env.PORT || '3000', 10), // Use PORT environment variable
  },
});
