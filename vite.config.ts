import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this project from https://<user>.github.io/NSE_Stocks_Tracker/
// so every asset URL must be prefixed with the repo name.
export default defineConfig({
  plugins: [react()],
  base: '/NSE_Stocks_Tracker/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
