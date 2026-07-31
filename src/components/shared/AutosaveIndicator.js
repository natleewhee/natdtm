'use client'

// Small status line for tools that autosave every keystroke to whichever
// profile is active (mirrors DriveReady's own persistence, just scoped
// per-profile instead of one global browser key). `justSaved` briefly
// swaps the text/color right after a save lands, then it settles back to
// a quiet, permanent reminder that nothing needs to be pressed.
export default function AutosaveIndicator({ justSaved, C, style }) {
  return (
    <p style={{
      marginTop: 10, fontSize: C.xs, lineHeight: 1.5,
      color: justSaved ? C.accent : C.faint,
      fontWeight: justSaved ? 700 : 400,
      transition: 'color 0.4s ease',
      ...style,
    }}>
      {justSaved ? 'Saved to this profile ✓' : 'Autosaved to this profile as you type — nothing to press.'}
    </p>
  )
}
