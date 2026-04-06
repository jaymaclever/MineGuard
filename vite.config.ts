import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: false },
        manifest: {
          name: 'MineGuard Security',
          short_name: 'MineGuard',
          description: 'MineGuard Industrial Security System',
          theme_color: '#f97316',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'vendor-maps';
              }
              if (id.includes('socket.io-client')) {
                return 'vendor-realtime';
              }
              if (id.includes('browser-image-compression')) {
                return 'vendor-media';
              }
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 2026,
      allowedHosts: true,
      hmr: { host: 'localhost' },
      watch: {
        ignored: ['**/.local/**', '**/node_modules/**', '**/*.db', '**/*.db-wal', '**/*.db-shm'],
      },
    },
  };
});
