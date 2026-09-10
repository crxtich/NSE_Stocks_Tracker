import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the custom domain nse-tracker.is-a.dev (root path) rather than
// the default https://<user>.github.io/NSE_Stocks_Tracker/ subpath — see
// public/CNAME and the repo's Pages "Custom domain" setting.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
