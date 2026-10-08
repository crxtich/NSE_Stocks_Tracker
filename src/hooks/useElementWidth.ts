import { useLayoutEffect, useState, type RefObject } from 'react'

// Tracks an element's rendered width so SVG charts can draw at 1 unit = 1px
// instead of letterboxing a fixed viewBox inside a wider container.
export function useElementWidth(ref: RefObject<Element>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}
