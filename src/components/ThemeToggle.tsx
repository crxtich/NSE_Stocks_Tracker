import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

// Matches whatever index.html's inline script already applied before first
// paint, so this never causes a mismatch/flash on mount.
function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    // Keeps the mobile browser-chrome color in sync — index.html's inline
    // script sets the same tag's initial value before first paint.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#07111F' : '#02182F')
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Private browsing / storage disabled — theme just won't persist across visits.
    }
  }, [theme])

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/20 text-white/80 transition-colors hover:border-gold hover:text-white"
    >
      {theme === 'dark' ? <Sun className="h-3.5 w-3.5" strokeWidth={2} /> : <Moon className="h-3.5 w-3.5" strokeWidth={2} />}
    </button>
  )
}
