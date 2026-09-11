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
          // Fixed, not theme-variable: text sitting on a bg-accent button/chip
          // needs to stay dark regardless of the overall theme, since the
          // accent color itself is bright in both light and dark mode.
          ink: '#0B0D10',
        },
        gain: {
          DEFAULT: withOpacity('--color-gain'),
        },
        loss: {
          DEFAULT: withOpacity('--color-loss'),
        },
      },
      fontFamily: {
        // System font stacks only — no webfont CDN calls, so the page ships
        // with zero font-loading network requests and no layout shift.
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      boxShadow: {
        none: 'none',
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
