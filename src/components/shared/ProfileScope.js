'use client'

import { useEffect, useRef, useState } from 'react'
import { getActiveProfileId, subscribeToProfileChanges } from '@/lib/shared/profile'

// Remounts a tool's page subtree when the active profile changes, so
// every page's mount-time "load my numbers" effect re-runs for the new
// profile — the same effect the old full-page reload had, but instant
// and with no network round-trip or white flash.
//
// `gen` stays 0 through the initial mount and hydration (no churn), and
// only increments on a real post-mount profile change, so a normal page
// load never pays for a remount.
export default function ProfileScope({ children }) {
  const [gen, setGen] = useState(0)
  const idRef = useRef(null)

  useEffect(() => {
    idRef.current = getActiveProfileId()
    return subscribeToProfileChanges(() => {
      const next = getActiveProfileId()
      if (next !== idRef.current) {
        idRef.current = next
        setGen((g) => g + 1)
      }
    })
  }, [])

  return (
    <div key={gen} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
