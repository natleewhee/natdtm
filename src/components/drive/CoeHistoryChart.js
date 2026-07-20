'use client'

import { useState, useEffect } from 'react'
import { C, SGD } from '@/lib/drive/theme'

function monthLabel(month) {
  // LTA's `month` field is typically "YYYY-MM" — fall back to the raw
  // string for anything else rather than guessing.
  const m = /^(\d{4})-(\d{2})$/.exec(month || '')
  if (!m) return month || '?'
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const idx = parseInt(m[2], 10) - 1
  return names[idx] ? `${names[idx]} '${m[1].slice(2)}` : month
}

export function CoeHistoryChart() {
  const [history, setHistory] = useState(null) // null = still loading

  useEffect(() => {
    fetch('/data/coe-history.json')
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d?.history) ? d.history : []))
      .catch(() => setHistory([]))
  }, [])

  const card = (children) => (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,overflow:'hidden',boxShadow:C.shadow}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg}}>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:'0.1em'}}>COE Bidding History</span>
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  )

  if (history === null) {
    return card(<p style={{fontSize:C.sm,color:C.faint,margin:0}}>Loading…</p>)
  }

  if (history.length === 0) {
    return card(
      <p style={{fontSize:C.sm,color:C.muted,lineHeight:1.7,margin:0}}>
        No bidding history recorded yet. LTA DataMall only exposes the current and previous bidding exercise — not a historical range — so this chart has no way to be backfilled with past premiums. It fills in automatically, one entry per bidding exercise (~2×/month), from whenever this feature started running. Check back after a few cycles.
      </p>
    )
  }

  if (history.length === 1) {
    const e = history[0]
    return card(
      <>
        <p style={{fontSize:C.sm,color:C.muted,lineHeight:1.7,marginBottom:12}}>
          Only one bidding exercise recorded so far — not enough for a trend line yet. This builds up over time.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:8}}>
          <div style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>Cat A · {monthLabel(e.month)}</div>
            <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>{SGD(e.catA.premium)}</div>
          </div>
          <div style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>Cat B · {monthLabel(e.month)}</div>
            <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(e.catB.premium)}</div>
          </div>
        </div>
      </>
    )
  }

  const W = 440, H = 140, padL = 8, padR = 8, padT = 12, padB = 24
  const cW = W - padL - padR, cH = H - padT - padB
  const allValues = history.flatMap(e => [e.catA.premium, e.catB.premium])
  const maxY = Math.max(...allValues)
  const minY = Math.min(...allValues, 0)
  const range = maxY - minY || 1
  const toX = i => padL + (i / (history.length - 1)) * cW
  const toY = v => padT + cH - ((v - minY) / range) * cH
  const catAPts = history.map((e, i) => `${toX(i)},${toY(e.catA.premium)}`).join(' ')
  const catBPts = history.map((e, i) => `${toX(i)},${toY(e.catB.premium)}`).join(' ')
  const latest = history[history.length - 1]

  return card(
    <>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:8,marginBottom:12}}>
        <div style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>Latest Cat A · {monthLabel(latest.month)}</div>
          <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>{SGD(latest.catA.premium)}</div>
        </div>
        <div style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>Latest Cat B · {monthLabel(latest.month)}</div>
          <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(latest.catB.premium)}</div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible',display:'block'}}>
        {[0.25,0.5,0.75].map(p => (
          <line key={p} x1={padL} x2={padL+cW} y1={padT+cH*p} y2={padT+cH*p} stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        <polyline points={catAPts} fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={catBPts} fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {history.filter((_, i) => i === 0 || i === history.length - 1 || i % Math.ceil(history.length / 5) === 0).map(e => {
          const i = history.indexOf(e)
          return <text key={i} x={toX(i)} y={H-6} textAnchor="middle" fontSize="9" fill={C.faint}>{monthLabel(e.month)}</text>
        })}
      </svg>
      <div style={{display:'flex',gap:16,marginTop:8}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:16,height:2,background:C.primary,borderRadius:1}}/>
          <span style={{fontSize:'10px',color:C.muted}}>Cat A</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:16,height:2,background:C.blue,borderRadius:1}}/>
          <span style={{fontSize:'10px',color:C.muted}}>Cat B</span>
        </div>
      </div>
      <p style={{fontSize:'10px',color:C.faint,marginTop:10,lineHeight:1.5}}>
        {history.length} bidding exercises recorded, {monthLabel(history[0].month)}–{monthLabel(latest.month)}. LTA DataMall&apos;s live API only exposes the current and previous exercise, so beyond that this builds up going forward rather than being fetched fresh each time.
      </p>
    </>
  )
}
