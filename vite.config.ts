import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 👇 IMPORTANT for GitHub Pages
  base: '/Vottish-Apartment-management-System-2/',
  // (Optional) build straight into /docs so Pages can serve it
  build: { outDir: 'docs' }
})

