'use client'

// /me — profiles, backup and device transfer (super-app plan U11).
// natdtm has no accounts, so this browser holds the only copy of the
// user's numbers; this page is where they protect and move them.

import Link from 'next/link'
import { useRef, useState, useSyncExternalStore } from 'react'
import qrcode from 'qrcode-generator'
import ShellHeader from '@/components/shared/ShellHeader'
import ProfileScope from '@/components/shared/ProfileScope'
import {
  listProfiles, exportProfiles, importProfiles, readStoreSnapshot, subscribeToNumbers,
} from '@/lib/shared/profile'
import { buildTransferLink, markBackedUp, lastBackedUpAt } from '@/lib/shared/transfer'
import { relativeAge } from '@/lib/ledger/summary'

const SERVER = '\u0000server'

function qrSvg(url) {
  const qr = qrcode(0, 'L')
  qr.addData(url)
  qr.make()
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
}

function MePanel() {
  const snapshot = useSyncExternalStore(subscribeToNumbers, readStoreSnapshot, () => SERVER)
  const [transfer, setTransfer] = useState(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState(null)
  const fileRef = useRef(null)

  if (snapshot === SERVER) return <div className="me-wrap" aria-busy="true" />

  const profiles = listProfiles()
  const last = lastBackedUpAt()

  const download = () => {
    const blob = new Blob([exportProfiles()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `natdtm-numbers-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    markBackedUp()
    setMessage({ tone: 'ok', text: 'Backup downloaded. Keep the file somewhere safe; it holds every profile.' })
  }

  const restore = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!window.confirm('Replace every profile on this device with the ones in this file?')) return
    const res = importProfiles(await file.text())
    setMessage(res.ok
      ? { tone: 'ok', text: `Restored ${res.imported} profile${res.imported === 1 ? '' : 's'}${res.truncated ? ` (${res.truncated} over the limit of 3 were left out)` : ''}.` }
      : { tone: 'error', text: res.error })
  }

  const makeLink = async () => {
    const t = await buildTransferLink(exportProfiles(), window.location.origin)
    setTransfer({ ...t, svg: t.qrOk ? qrSvg(t.url) : null })
    setCopied(false)
    markBackedUp()
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(transfer.url); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <div className="me-wrap">
      <h1 className="me-title">Me</h1>
      <p className="me-lede">There&apos;s no account. Your numbers live only in this browser, so this is where you back them up and move them.</p>
      {message && <p className={`me-msg me-msg--${message.tone}`} role="status">{message.text}</p>}

      <section className="me-card" aria-labelledby="me-profiles">
        <h2 id="me-profiles" className="me-h2">Profiles</h2>
        <ul className="me-profiles">
          {profiles.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              {p.isActive && <span className="me-badge">Active</span>}
            </li>
          ))}
        </ul>
        <p className="me-hint">Switch, rename or add profiles (up to 3) from the <strong>{profiles.find((p) => p.isActive)?.name}</strong> menu at the top of any page.</p>
        <Link href="/start" className="me-link">Update my numbers →</Link>
      </section>

      <section className="me-card" aria-labelledby="me-phone">
        <h2 id="me-phone" className="me-h2">Send to my phone</h2>
        <p className="me-hint">Makes a link that carries your numbers inside it. Open it on your other device and they&apos;re copied there. The numbers sit after the <code>#</code> in the link, a part browsers never send to any server, natdtm&apos;s included.</p>
        {!transfer && <button type="button" className="me-btn" onClick={makeLink}>Make a transfer link</button>}
        {transfer && (
          <div className="me-transfer">
            {transfer.svg
              ? <div className="me-qr" role="img" aria-label="QR code for the transfer link" dangerouslySetInnerHTML={{ __html: transfer.svg }} />
              : <p className="me-hint">Too much data for a QR code. Copy the link and open it on the other device.</p>}
            <div>
              <p className="me-hint">Scan with your phone camera, or copy the link.{transfer.activeOnly ? ' Only the active profile fits, so switch profiles and repeat for the others.' : ''}</p>
              <button type="button" className="me-btn me-btn--ghost" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
              <p className="me-warn">Anyone with this link or QR code can read these numbers. Send it only to yourself.</p>
            </div>
          </div>
        )}
      </section>

      <section className="me-card" aria-labelledby="me-backup">
        <h2 id="me-backup" className="me-h2">Backup</h2>
        <p className="me-hint">
          {last ? `Last backed up or sent ${relativeAge(last)}. ` : 'Not backed up yet. '}Clearing this browser&apos;s data deletes your numbers; a backup file brings them back.
        </p>
        <div className="me-row">
          <button type="button" className="me-btn" onClick={download}>Download backup</button>
          <button type="button" className="me-btn me-btn--ghost" onClick={() => fileRef.current?.click()}>Restore from a file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} aria-label="Backup file to restore" />
        </div>
      </section>
    </div>
  )
}

export default function MePage() {
  return (
    <ProfileScope>
      <ShellHeader title="Me" />
      <MePanel />
    </ProfileScope>
  )
}
