import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // manualChunks: {
        //   'vendor': [
        //     'react',
        //     'react-dom',
        //     'react-router-dom',
        //     '@tanstack/react-query',
        //     'zustand',
        //     'framer-motion'
        //   ],
        //   'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        //   'charts': ['recharts'],
        //   'ui': ['lucide-react']
        // }
      }
    },
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    copyPublicDir: true
  },
  optimizeDeps: {
    exclude: ['lucide-react', '@google-cloud/vision'],
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    open: true,
    proxy: {
      '/api/gemini-vision': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
    open: true
  }
});
