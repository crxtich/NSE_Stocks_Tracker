import type { Config } from 'tailwindcss'

// Colors resolve to CSS custom properties (defined per-theme in src/index.css
// as "R G B" triplets) rather than fixed hex values, so every existing
// bg-canvas/text-ink/etc. utility automatically repaints for light vs dark —
// no dark: variants needed anywhere in the component tree. The
// rgb(var(...) / <alpha-value>) wrapper keeps Tailwind's opacity modifiers
// (e.g. bg-accent/10) working the same way they would with a plain hex color.
function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Named "canvas" rather than "base" to avoid colliding with Tailwind's
        // built-in font-size scale, which already defines a "base" key (1rem) —
        // that collision makes `text-base` ambiguous between color and font-size.
        canvas: {
          DEFAULT: withOpacity('--color-canvas'),
          raised: withOpacity('--color-canvas-raised'),
          panel: withOpacity('--color-canvas-panel'),
          border: withOpacity('--color-canvas-border'),
        },
        ink: {
          DEFAULT: withOpacity('--color-ink'),
          muted: withOpacity('--color-ink-muted'),
          faint: withOpacity('--color-ink-faint'),
        },
        accent: {
          DEFAULT: withOpacity('--color-accent'),
          bright: withOpacity('--color-accent-bright'),
          // Text on a bg-accent fill: white on light-mode navy, dark on dark-mode blue.
          ink: withOpacity('--color-accent-ink'),
        },
        gain: {
          DEFAULT: withOpacity('--color-gain'),
        },
        loss: {
          DEFAULT: withOpacity('--color-loss'),
        },
      },
      fontFamily: {
        // Self-hosted via @fontsource (bundled by Vite), no font CDN calls.
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Numbers and tickers use Archivo's tabular figures rather than a code font.
        mono: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Book type for the wordmark and page titles, shared with crotich.com.
        serif: ['"Libre Caslon Text"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      boxShadow: {
        none: 'none',
      },
      // Flatter corners: closer to print than to an app kit.
      borderRadius: {
        md: '3px',
        lg: '4px',
        xl: '4px',
        '2xl': '6px',
      },
      keyframes: {
        countup: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadein: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        countup: 'countup 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        fadein: 'fadein 0.4s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
