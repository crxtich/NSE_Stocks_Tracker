import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at nse-tracker.dukaribu.com — a custom domain serves from the root,
// so base must be '/' rather than a repo subpath.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    // Mirrors production's nginx `location /api/ { proxy_pass ...:3015 }` so
    // `npm run dev` works against a locally running api-server unchanged.
    proxy: {
      '/api': { target: 'http://127.0.0.1:3015', changeOrigin: true },
    },
  },
})
