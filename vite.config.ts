import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at github.io/NSE_Stocks_Tracker/ — no custom domain is registered
// yet, so base must stay a subpath rather than '/'. If a real custom domain
// is set up later, this and public/CNAME need to change together.
export default defineConfig({
  plugins: [react()],
  base: '/NSE_Stocks_Tracker/',
})
