import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/')) return 'firebase'
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react'
            if (id.includes('xlsx')) return 'xlsx'
            if (id.includes('jspdf')) return 'jspdf'
            if (id.includes('lucide-react')) return 'icons'
            return 'vendor'
          }
        }
      }
    }
  }
})
