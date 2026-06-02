import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // custom domain occypicks.com serves from root
  plugins: [
    react(),
    tailwindcss(),
  ],
})
