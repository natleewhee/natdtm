'use client'

// src/components/shared/dashboard/HomeDashboard.js
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
import {
  loadMyNumbers, readStoreSnapshot, subscribeToNumbers, getActiveProfileName,
} from '@/lib/shared/profile'
import { summarise, formatTile } from '@/lib/ledger/summary'
import { buildInsights } from '@/lib/shared/insights'
import { getTool } from '@/lib/shared/tools'
import ToolIcon from '@/components/shared/ToolIcon'

const SERVER = '\u0000server'
const getServerSnapshot = () => SERVER

function Tile({ t }) {
  const tool = getTool(t.toolId)
  const value = formatTile(t)
  if (value == null) {
    return (
      <Link href={tool.route} className="dash-tile dash-tile--empty">
        <span className="dash-tile-label">{t.label}</span>
        <span className="dash-tile-add">+ Add · {tool.name}</span>
        <span className="dash-tile-sub">{t.sub}</span>
      </Link>
    )
  }
  return (
    <Link href={tool.route} className={`dash-tile${t.tone === 'warn' ? ' dash-tile--warn' : ''}`}>
      <span className="dash-tile-label">{t.label}</span>
      <span className="dash-tile-value">{value}</span>
      <span className="dash-tile-sub">{t.sub}</span>
      {t.checked && (
        <span className={`dash-tile-checked${t.stale ? ' dash-tile-checked--stale' : ''}`}>
          {t.stale ? `Checked ${t.checked} · worth a re-check` : `Checked ${t.checked}`}
        </span>
      )}
    </Link>
  )
}

function InsightCard({ insight }) {
  return (
    <div className="dash-insight">
      <span className="dash-insight-icon"><ToolIcon id={insight.toolId} size={18} /></span>
      <div>
        <p className="dash-insight-title">{insight.title}</p>
        <p className="dash-insight-fact">{insight.fact}</p>
        <Link href={insight.href} className="dash-insight-link">{insight.linkLabel} →</Link>
      </div>
    </div>
  )
}

export default function HomeDashboard() {
  const snapshot = useSyncExternalStore(subscribeToNumbers, readStoreSnapshot, getServerSnapshot)

  const view = useMemo(() => {
    if (snapshot === SERVER) return null
    const data = loadMyNumbers()
    const summary = summarise(data)
    return { summary, insights: summary.hasData ? buildInsights(data) : [], profileName: getActiveProfileName() }
  }, [snapshot])

  if (!view) {
    return <section className="dash dash--pending" aria-hidden="true" />
  }

  const { summary, insights, profileName } = view

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
    <section className="dash" aria-labelledby="dash-title">
      <div className="dash-head">
        <h2 id="dash-title" className="dash-title">
          Your money{profileName ? <span className="dash-profile"> · {profileName}</span> : null}
        </h2>
        <Link href="/start" className="dash-update">Update my numbers</Link>
      </div>
      <div className="dash-tiles">
        {summary.tiles.map((t) => <Tile key={t.id} t={t} />)}
      </div>
      {insights.length > 0 && (
        <div className="dash-insights" aria-label="What your numbers say">
          {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}
      <p className="dash-note">
        Figures come from what you entered in each tool, on this device only. Educational, not financial advice.
      </p>
    </section>
  )
}
