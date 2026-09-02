'use client'

import { useEffect, useRef, useState } from 'react'
import {
  listProfiles, createProfile, renameProfile, deleteProfile, setActiveProfile,
  subscribeToProfileChanges, exportProfiles, importProfiles, MAX_PROFILES,
} from '@/lib/shared/profile'

// Lets someone keep separate named sets of numbers on the same browser
// — "Me", "Joint with Alex", "5-years-from-now plan" — each with its
// own live data across every tool, rather than one household's numbers
// overwriting another's. Global, not per-tool: every tool reads/writes
// through the same active profile (see src/lib/shared/profile.js), so
// this lives in the shared header rather than any one page.
//
// Switching, creating, or deleting broadcasts a profile-change event;
// ProfileScope remounts each tool's page so it re-reads its numbers, so
// no page reload is needed. This component also subscribes so its own
// list stays in sync when another tab changes a profile.
export default function ProfileSwitcher() {
  const [profiles, setProfiles] = useState(null) // null until mounted — avoids an SSR/client name mismatch
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [importMsg, setImportMsg] = useState(null) // { tone: 'ok'|'error', text }
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only reads
       from localStorage (unavailable during SSR); the subscription keeps
       the list fresh when another tab switches or renames a profile */
    setProfiles(listProfiles())
    return subscribeToProfileChanges(() => setProfiles(listProfiles()))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!profiles) return null // nothing to show before the client-only profile list has loaded

  // returnFocus is set when the menu was dismissed from the keyboard
  // (Escape) so focus lands back on the trigger rather than being lost;
  // an outside click already moves focus elsewhere and passes nothing.
  function closeMenu({ returnFocus = false } = {}) {
    setOpen(false)
    setEditingId(null)
    setCreating(false)
    setNewName('')
    if (returnFocus) triggerRef.current?.focus()
  }

  const active = profiles.find(p => p.isActive) || profiles[0]

  // No page reload: setActiveProfile / createProfile / deleteProfile
  // broadcast a profile-change event (see src/lib/shared/profile.js) that
  // ProfileScope acts on to remount each tool's page. That remount also
  // discards this component instance, so ProfileScope restores focus to
  // the switch trigger after it — closeMenu's own returnFocus here would
  // be undone.
  function handleSwitch(id) {
    if (id === active.id) { closeMenu({ returnFocus: true }); return }
    setActiveProfile(id)
    setProfiles(listProfiles())
    closeMenu()
  }

  function startRename(p) {
    setEditingId(p.id)
    setEditingName(p.name)
  }
  function saveRename() {
    if (editingId) renameProfile(editingId, editingName)
    setProfiles(listProfiles())
    setEditingId(null)
  }

  function handleDelete(id) {
    if (!deleteProfile(id)) return
    setProfiles(listProfiles())
  }

  function submitCreate() {
    const id = createProfile(newName)
    if (!id) return // at MAX_PROFILES — button is hidden in that state, but guard anyway
    setProfiles(listProfiles())
    closeMenu({ returnFocus: true })
  }

  function handleExport() {
    const blob = new Blob([exportProfiles()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ndtm-profiles.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again after a cancel
    if (!file) return
    if (!window.confirm(
      `Import "${file.name}"? This replaces all ${profiles.length} profile${profiles.length === 1 ? '' : 's'} on this browser with the file's contents.`,
    )) return
    let res
    try {
      res = importProfiles(await file.text())
    } catch {
      res = { ok: false, error: 'Could not read the file.' }
    }
    if (res.ok) {
      setProfiles(listProfiles())
      const extra = res.truncated ? ` (${res.truncated} beyond the ${MAX_PROFILES}-profile limit were dropped)` : ''
      setImportMsg({ tone: 'ok', text: `Imported ${res.imported} profile${res.imported === 1 ? '' : 's'}${extra}.` })
    } else {
      setImportMsg({ tone: 'error', text: res.error || 'Import failed.' })
    }
  }

  return (
    <div
      className="shell-switcher"
      ref={menuRef}
      onKeyDown={e => {
        // Escape anywhere in the switcher (trigger or open menu) closes
        // it and returns focus to the trigger. A rename/create field
        // stops propagation on its own Escape so the first press only
        // exits that sub-mode.
        if (e.key === 'Escape' && open) closeMenu({ returnFocus: true })
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="shell-switcher-btn shell-profile-btn"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="true"
        title="Switch profile"
      >
        {active.name}
        <span className="shell-switcher-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="shell-switcher-menu shell-profile-menu" role="menu">
          <div className="shell-profile-menu-label">Profiles</div>
          {profiles.map(p => (
            <div key={p.id} className="shell-profile-row">
              {editingId === p.id ? (
                <input
                  autoFocus
                  className="shell-profile-rename-input"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename()
                    if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null) }
                  }}
                  onBlur={saveRename}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="shell-profile-name"
                    onClick={() => handleSwitch(p.id)}
                    role="menuitemradio"
                    aria-checked={p.isActive}
                  >
                    <span className={`shell-profile-dot${p.isActive ? ' shell-profile-dot--active' : ''}`} aria-hidden="true" />
                    {p.name}
                  </button>
                  <div className="shell-profile-actions">
                    <button type="button" className="shell-profile-action" onClick={() => startRename(p)} aria-label={`Rename ${p.name}`}>Rename</button>
                    {profiles.length > 1 && (
                      <button type="button" className="shell-profile-action shell-profile-action--danger" onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.name}`}>Delete</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="shell-switcher-divider" />

          {creating ? (
            <div className="shell-profile-row">
              <input
                autoFocus
                className="shell-profile-rename-input"
                placeholder={`Profile ${profiles.length + 1}`}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitCreate()
                  if (e.key === 'Escape') { e.stopPropagation(); setCreating(false) }
                }}
              />
              <button type="button" className="shell-profile-action" onClick={submitCreate}>Add</button>
            </div>
          ) : profiles.length < MAX_PROFILES ? (
            <button type="button" className="shell-profile-add-btn" onClick={() => setCreating(true)}>
              + New profile
            </button>
          ) : (
            <div className="shell-profile-menu-hint">Up to {MAX_PROFILES} profiles</div>
          )}

          <div className="shell-switcher-divider" />

          <div className="shell-profile-actions">
            <button type="button" className="shell-profile-action" onClick={handleExport}>
              Export
            </button>
            <button type="button" className="shell-profile-action" onClick={() => fileInputRef.current?.click()}>
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportFile}
            />
          </div>
          {importMsg && (
            <div
              className={`shell-profile-menu-hint${importMsg.tone === 'error' ? ' shell-profile-action--danger' : ''}`}
              role="status"
            >
              {importMsg.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
