'use client'

// src/components/shared/dashboard/HomeDashboard.tsx
// The "Your money" block on the home page (super-app plan U8).
//
// The store lives in localStorage, so the server cannot know whether this
// visitor has numbers. Server render (and the first client render, for
// hydration) shows a neutral placeholder of the same height; the browser
// then picks the filled or empty state from the real store in one step,
// so a returning user never sees the empty state flash first. Tiles
// update live on a profile switch, a save in this tab or another tab.

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { loadMyNumbers, readStoreSnapshot, subscribeToNumbers, getActiveProfileName } from '@/lib/shared/profile'
import { summarise, formatTile } from '@/lib/ledger/summary'
import { buildInsights } from '@/lib/shared/insights'
import { getTool } from '@/lib/shared/tools'
import { needsBackup } from '@/lib/shared/transfer'
import { maskFigures, readPrivacy, setPrivacy, subscribeToPrivacy } from '@/lib/shared/privacy'
import ToolIcon from '@/components/shared/ToolIcon'

const SERVER = '\u0000server'
const getServerSnapshot = () => SERVER

function Tile({ t, hide }: { t?: any; hide?: any; }) {
  const mask = hide ? maskFigures : (x: any) => x
  const tool = getTool(t.toolId)
  const value = formatTile(t)
  if (value == null) {
    return (
      <Link href={tool!.route} className="dash-tile dash-tile--empty">
        <span className="dash-tile-label">{t.label}</span>
        <span className="dash-tile-add">+ Add · {tool!.name}</span>
        <span className="dash-tile-sub">{t.sub}</span>
      </Link>
    )
  }
  return (
    <Link href={tool!.route} className={`dash-tile${t.tone === 'warn' ? ' dash-tile--warn' : ''}`}>
      <span className="dash-tile-label">{t.label}</span>
      <span className="dash-tile-value">{mask(value)}</span>
      <span className="dash-tile-sub">{mask(t.sub)}</span>
      {t.checked && (
        <span className={`dash-tile-checked${t.stale ? ' dash-tile-checked--stale' : ''}`}>
          {t.stale ? `Checked ${t.checked} · worth a re-check` : `Checked ${t.checked}`}
        </span>
      )}
    </Link>
  )
}

function InsightCard({ insight, hide }: { insight?: any; hide?: any; }) {
  const mask = hide ? maskFigures : (x: any) => x
  return (
    <div className="dash-insight">
      <span className="dash-insight-icon"><ToolIcon id={insight.toolId} size={18} /></span>
      <div>
        <p className="dash-insight-title">{mask(insight.title)}</p>
        <p className="dash-insight-fact">{mask(insight.fact)}</p>
        <Link href={insight.href} className="dash-insight-link">{insight.linkLabel} →</Link>
      </div>
    </div>
  )
}

function EyeGlyph({ off }: { off?: any; }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

export default function HomeDashboard() {
  const snapshot = useSyncExternalStore(subscribeToNumbers, readStoreSnapshot, getServerSnapshot)
  // Privacy mode: off by default, remembered per device (lib/shared/privacy.ts).
  const hide = useSyncExternalStore(subscribeToPrivacy, readPrivacy, () => false)

  const view = useMemo(() => {
    if (snapshot === SERVER) return null
    const data = loadMyNumbers()
    const summary = summarise(data)
    return { summary, insights: summary.hasData ? buildInsights(data) : [], profileName: getActiveProfileName(), backup: needsBackup(summary.hasData) }
  }, [snapshot])

  if (!view) {
    return <section className="dash dash--pending" aria-hidden="true" />
  }

  const { summary, insights, profileName, backup } = view

  if (!summary.hasData) {
    return (
      <section className="dash dash--empty" aria-labelledby="dash-start-title">
        <div>
          <h2 id="dash-start-title" className="dash-start-title">See your whole picture in one place</h2>
          <p className="dash-start-copy">
            Answer six quick questions once and every calculator opens already filled in.
            Your numbers stay in this browser.
          </p>
        </div>
        <Link href="/start" className="dash-start-btn">Set up my numbers · 2 min</Link>
      </section>
    )
  }

  return (
    <section className={`dash${hide ? ' dash--private' : ''}`} aria-labelledby="dash-title">
      <div className="dash-head">
        <h2 id="dash-title" className="dash-title">
          Your money{profileName ? <span className="dash-profile"> · {profileName}</span> : null}
          {hide && <span className="dash-private-tag">Numbers hidden</span>}
        </h2>
        <div className="dash-actions">
          <button
            type="button" className="dash-privacy"
            aria-pressed={hide}
            onClick={() => setPrivacy(!hide)}
          >
            <EyeGlyph off={hide} />
            {hide ? 'Show numbers' : 'Hide numbers'}
          </button>
          <Link href="/start" className="dash-update">Update my numbers</Link>
        </div>
      </div>
      <div className="dash-tiles">
        {summary.tiles.map((t) => <Tile key={t.id} t={t} hide={hide} />)}
      </div>
      {insights.length > 0 && (
        <div className="dash-insights" aria-label="What your numbers say">
          {insights.map((i) => <InsightCard key={i.id} insight={i} hide={hide} />)}
        </div>
      )}
      {backup && (
        <p className="dash-backup">
          These numbers live only in this browser. <Link href="/me">Back up or send them to your phone →</Link>
        </p>
      )}
      <p className="dash-note">
        Figures come from what you entered in each tool, on this device only. Educational, not financial advice.
      </p>
    </section>
  )
}
