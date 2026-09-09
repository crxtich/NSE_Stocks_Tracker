import { useEffect, useRef, useState } from 'react'
import type { SignalBand } from '../lib/analysis'

const BAND_STYLES: Record<SignalBand, { text: string; bg: string; ring: string; label: string }> = {
  strong: { text: 'text-gain', bg: 'bg-gain-soft', ring: 'ring-gain/30', label: 'Strong Signal' },
  moderate: { text: 'text-accent', bg: 'bg-accent-soft', ring: 'ring-accent/30', label: 'Moderate Signal' },
  neutral: { text: 'text-ink-muted', bg: 'bg-canvas-raised', ring: 'ring-canvas-border', label: 'Neutral' },
  weak: { text: 'text-loss', bg: 'bg-loss-soft', ring: 'ring-loss/30', label: 'Weak Signal' },
}

/** Animates a number counting up from 0 on mount — the one entrance animation in the app. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}

export default function SignalScoreBadge({
  score,
  band,
  size = 'md',
  animate = true,
}: {
  score: number
  band: SignalBand
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}) {
  const style = BAND_STYLES[band]
  const animated = useCountUp(score)
  const display = animate ? animated : score

  const sizeClasses = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-16 w-16 text-xl',
  }[size]

  return (
    <div className="flex items-center gap-3" title={`${style.label} — ${score} out of 100`}>
      <div
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full font-display font-semibold tabular ring-2 ${style.bg} ${style.text} ${style.ring} ${animate ? 'animate-countup' : ''}`}
      >
        {display}
      </div>
      {/* On the compact (table-row) size, the label is hidden below `sm` — other
          columns already claim most of a phone's width, so the label's box would
          render mostly off-screen; the circle's color + score still convey the band. */}
      <div className={`min-w-0 max-w-[110px] flex-col ${size === 'sm' ? 'hidden sm:flex' : 'flex'}`}>
        <span className={`block truncate text-sm font-semibold ${style.text}`}>{style.label}</span>
        <span className="block truncate text-xs text-ink-faint">out of 100</span>
      </div>
    </div>
  )
}
