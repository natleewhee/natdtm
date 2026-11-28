'use client'

// src/components/shared/TabBar.tsx
// App-style bottom navigation for phones (super-app plan U7). Shown below
// 640px only (CSS in globals.css), where it replaces the header's tool
// switcher. Tabs: Home · Plan (MyLedger) · Tools (a sheet of every tool in
// the registry) · Me (profiles, backup, send to my phone).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ToolIcon from './ToolIcon'
import { TOOLS, getTool, getToolByPath } from '@/lib/shared/tools'

const PLAN_ID = 'ledger'
const PLAN_ROUTE = getTool(PLAN_ID)!.route

function HomeGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" />
    </svg>
  )
}

function MeGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" />
    </svg>
  )
}

function ToolsGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="6" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="18" cy="6" r="1.6" />
      <circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" />
      <circle cx="6" cy="18" r="1.6" /><circle cx="12" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" />
    </svg>
  )
}

export default function TabBar() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef<any>(null)
  const toolsBtnRef = useRef<any>(null)

  const active = getToolByPath(pathname)
  const onHome = pathname === '/'
  const onPlan = active?.id === PLAN_ID
  const onTool = !!active && !onPlan

  // Close the sheet whenever the route changes (a tool was picked).
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    if (sheetOpen) setSheetOpen(false)
  }

  useEffect(() => {
    if (!sheetOpen) return
    sheetRef.current?.querySelector('a')?.focus()
    function onKey(e: Record<string, any>) {
      if (e.key === 'Escape') { setSheetOpen(false); toolsBtnRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  if (pathname?.startsWith('/lab')) return null

  const tools = TOOLS.filter((t) => t.id !== PLAN_ID)

  return (
    <>
      {sheetOpen && (
        <div className="tabbar-scrim" onClick={() => setSheetOpen(false)} aria-hidden="true" />
      )}
      {sheetOpen && (
        <div className="tabbar-sheet" role="dialog" aria-modal="true" aria-label="All tools" id="tabbar-sheet" ref={sheetRef}>
          <div className="tabbar-sheet-grip" aria-hidden="true" />
          <ul className="tabbar-sheet-list">
            {tools.map((t) => (
              <li key={t.id}>
                <Link href={t.route} className="tabbar-sheet-item" aria-current={active?.id === t.id ? 'page' : undefined}>
                  <span className="tabbar-sheet-icon"><ToolIcon id={t.id} size={20} /></span>
                  <span>
                    <span className="tabbar-sheet-name">{t.name}</span>
                    <span className="tabbar-sheet-eyebrow">{t.eyebrow}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <nav className="tabbar" aria-label="App">
        <Link href="/" className="tabbar-tab" aria-current={onHome ? 'page' : undefined}>
          <HomeGlyph />
          <span>Home</span>
        </Link>
        <Link href={PLAN_ROUTE} className="tabbar-tab" aria-current={onPlan ? 'page' : undefined}>
          <ToolIcon id={PLAN_ID} size={22} />
          <span>Plan</span>
        </Link>
        <button
          type="button" ref={toolsBtnRef}
          className="tabbar-tab"
          aria-expanded={sheetOpen} aria-controls="tabbar-sheet"
          data-active={onTool ? 'true' : undefined}
          onClick={() => setSheetOpen((o) => !o)}
        >
          {onTool ? <ToolIcon id={active.id} size={22} /> : <ToolsGlyph />}
          <span>{onTool ? active.label : 'Tools'}</span>
        </button>
        <Link href="/me" className="tabbar-tab" aria-current={pathname === '/me' ? 'page' : undefined}>
          <MeGlyph />
          <span>Me</span>
        </Link>
      </nav>
    </>
  )
}
