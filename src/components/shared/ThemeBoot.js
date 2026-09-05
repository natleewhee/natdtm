'use client'

import { useSyncExternalStore } from 'react'
import { getEffectiveMode, subscribeToThemeChange, applyThemeEverywhere } from '@/lib/shared/themeMode'

// The server always renders 'dark' (src/app/layout.js hardcodes
// data-theme="dark") — matching that here avoids a hydration mismatch;
// the real stored/system mode, if different, applies on the client's
// first paint after mount, same one-frame-late pattern already used by
// ProfileSwitcher for its own localStorage read.
function getServerSnapshot() { return 'dark' }

// React may call getSnapshot on every render, so this guards against
// re-running the (idempotent but non-trivial) token mutation when
// nothing has actually changed — only the mismatch-correction case (the
// very first client read, if it differs from the 'dark' server default)
// and genuine mode switches should trigger it.
let lastApplied = 'dark'
function getSnapshot() {
  const mode = getEffectiveMode()
  if (mode !== lastApplied) {
    applyThemeEverywhere(mode)
    lastApplied = mode
  }
  return mode
}

// Everything in the tree that reads a token via a plain `C.x` inline
// style (as opposed to a `var(--color-x)` CSS string) only picks up a
// mutated token value on its NEXT render — CSS custom properties update
// instantly on their own, but plain JS reads don't. Remounting the
// subtree via `key={mode}` is the simplest way to force that next
// render for literally everything at once, without threading a theme
// prop through every component. `display: contents` keeps the wrapper
// out of the layout box tree, so it can't affect flex/grid parents.
export default function ThemeBoot({ children }) {
  const mode = useSyncExternalStore(subscribeToThemeChange, getSnapshot, getServerSnapshot)
  return <div key={mode} style={{ display: 'contents' }}>{children}</div>
}
