import type { Config } from 'tailwindcss'

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
          DEFAULT: '#0B0D10',
          raised: '#12151A',
          panel: '#161A20',
          border: '#242A32',
        },
        ink: {
          DEFAULT: '#F5F7FA',
          muted: '#8B93A1',
          faint: '#565E6B',
        },
        accent: {
          DEFAULT: '#F0A93A',
          soft: '#F0A93A1A',
          bright: '#FFC266',
        },
        gain: {
          DEFAULT: '#2FBF71',
          soft: '#2FBF711A',
        },
        loss: {
          DEFAULT: '#E4574C',
          soft: '#E4574C1A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"IBM Plex Serif"', 'ui-serif', 'Georgia', 'serif'],
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
