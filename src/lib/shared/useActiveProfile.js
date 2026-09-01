'use client'

import { useSyncExternalStore } from 'react'
import { getActiveProfileId, subscribeToProfileChanges } from './profile'

/**
 * Returns the active profile's id, re-rendering the component whenever the
 * profile is switched, created, or deleted — in this tab or another.
 * Key a "load my numbers" effect on it so a tool re-reads its slot when
 * the active profile changes, instead of the page doing a full reload.
 * @returns {string|null} the active profile id, or null during SSR
 */
export function useActiveProfile() {
  return useSyncExternalStore(
    subscribeToProfileChanges,
    getActiveProfileId,
    () => null,
  )
}
