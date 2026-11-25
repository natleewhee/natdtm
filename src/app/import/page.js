'use client'

// /import#v1.<payload> — the receiving end of "Send to my phone"
// (super-app plan U11). Reads the fragment in the browser only, shows what
// it would bring over, and replaces this device's profiles on confirm.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ShellHeader from '@/components/shared/ShellHeader'
import { importProfiles } from '@/lib/shared/profile'
import { decodeTransfer, describeTransfer } from '@/lib/shared/transfer'
import { getTool } from '@/lib/shared/tools'

const toolName = (id) => (id === 'flow' ? 'Capacity' : getTool(id)?.name ?? id)

export default function ImportPage() {
  const router = useRouter()
  const [state, setState] = useState({ status: 'reading' })

  useEffect(() => {
    let live = true
    const hash = window.location.hash
    decodeTransfer(hash)
      .then((json) => {
        if (!live) return
        // Decoded into memory: now drop the numbers from the address bar
        // and this tab's history, before any confirm. (Done here, not
        // before decoding, so a remount re-running this effect still
        // finds the fragment.)
        window.history.replaceState(null, '', '/import')
        setState({ status: 'ready', json, summary: describeTransfer(json) })
      })
      .catch((err) => { if (live) setState({ status: 'error', error: err.message }) })
    return () => { live = false }
  }, [])

  const confirm = () => {
    const res = importProfiles(state.json)
    if (!res.ok) { setState({ status: 'error', error: res.error }); return }
    router.push('/')
  }

  return (
    <>
      <ShellHeader title="Import my numbers" />
      <div className="me-wrap">
        <h1 className="me-title">Import my numbers</h1>
        {state.status === 'reading' && <p className="me-hint" aria-busy="true">Reading the link…</p>}
        {state.status === 'error' && (
          <>
            <p className="me-msg me-msg--error" role="alert">{state.error}</p>
            <Link href="/me" className="me-link">Make a new link →</Link>
          </>
        )}
        {state.status === 'ready' && (
          <section className="me-card">
            <p className="me-hint">This link carries:</p>
            <ul className="me-profiles">
              {state.summary.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <span className="me-hint">{p.tools.length ? p.tools.map(toolName).join(', ') : 'no numbers yet'}</span>
                </li>
              ))}
            </ul>
            <p className="me-warn">Importing replaces every profile currently on this device.</p>
            <div className="me-row">
              <button type="button" className="me-btn" onClick={confirm}>Replace and import</button>
              <Link href="/" className="me-btn me-btn--ghost">Cancel</Link>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
