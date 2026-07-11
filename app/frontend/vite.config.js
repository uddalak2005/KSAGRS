import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firebase — group all firebase/* subpaths together
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          // PDF & canvas libs
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/pdf-lib') || id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf';
          }
          // AI SDK
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'vendor-ai';
          }
          // Animation
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          // Utilities
          if (id.includes('node_modules/axios') || id.includes('node_modules/date-fns') ||
              id.includes('node_modules/lucide-react') || id.includes('node_modules/react-markdown')) {
            return 'vendor-utils';
          }
        },
      },
    },
  },
})

