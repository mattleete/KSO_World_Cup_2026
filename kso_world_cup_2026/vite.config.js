import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/KSO_World_Cup_2026/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
