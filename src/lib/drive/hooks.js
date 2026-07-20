'use client'

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(callback) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}
function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}
function getReducedMotionServerSnapshot() {
  return false
}

// Tracks the OS-level "reduce motion" accessibility preference via
// useSyncExternalStore, so components can skip JS-driven animation (e.g. the
// rAF-based count-up below) rather than relying solely on the CSS-level
// override in globals.css, which only handles CSS transitions/animations.
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot)
}

export function useCountUp(target, ms = 800, delay = 0) {
  const [v, setV] = useState(0)
  const raf = useRef(null); const t0 = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  // Reset synchronously during render when the animation's key inputs change,
  // rather than as a side effect (see "Adjusting state when a prop changes":
  // https://react.dev/learn/you-might-not-need-an-effect). Uses state (not a
  // ref) to track the previous key, since refs must not be read/written
  // during render.
  const [prevKey, setPrevKey] = useState([target, ms, delay])
  if (prevKey[0] !== target || prevKey[1] !== ms || prevKey[2] !== delay) {
    setPrevKey([target, ms, delay])
    if (!reducedMotion && v !== 0) setV(0)
  }

  useEffect(() => {
    if (reducedMotion) return // render already returns `target` directly, below
    t0.current = null; if (raf.current) cancelAnimationFrame(raf.current)
    const id = setTimeout(() => {
      const step = ts => {
        if (!t0.current) t0.current = ts
        const p = Math.min((ts - t0.current) / ms, 1)
        setV(Math.round(target * (1 - Math.pow(1 - p, 4))))
        if (p < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(id); if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, ms, delay, reducedMotion])
  return reducedMotion ? target : v
}

export function useDebounce(val, ms) {
  const [d, setD] = useState(val)
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t) }, [val, ms])
  return d
}
