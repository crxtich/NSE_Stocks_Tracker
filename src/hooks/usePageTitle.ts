import { useEffect } from 'react'

const SITE_NAME = 'NSE Market Intelligence'

// Runs on mount/update rather than being read once, so client-side route
// changes (this is a SPA — no full page load) actually update the tab title.
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  }, [title])
}
