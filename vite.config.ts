import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at nse-tracker.crotich.com (see public/CNAME) — a custom domain
// serves from the root, so base must be '/' rather than a repo subpath.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
