import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TEMPORARY: still /NSE_Stocks_Tracker/ — do NOT flip to base:'/' until the
// repo's Pages "Custom domain" setting is confirmed live for
// nse-tracker.is-a.dev. Flipping early breaks the current bookmarked/shared
// github.io/NSE_Stocks_Tracker/ link (its script/css tags would resolve to
// the wrong path) before the new domain can take over — confirmed the hard
// way once already. public/CNAME can stay; it's inert until Pages is told
// to use it.
export default defineConfig({
  plugins: [react()],
  base: '/NSE_Stocks_Tracker/',
})
