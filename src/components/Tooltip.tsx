import { useState, type ReactNode } from 'react'

export default function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-md border border-canvas-border bg-canvas-raised px-3 py-2 text-xs font-normal leading-relaxed text-ink-muted shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}
