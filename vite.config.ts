import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Vottish-Apartment-management-System-2/',
  build: {
    outDir: 'docs',
    // Add these options for better GitHub Pages compatibility
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})

