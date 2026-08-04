'use client'

import { useState, useEffect } from 'react'
import { C, SGD } from '@/lib/drive/theme'
import { computeCoeTrend } from '@/lib/drive/coe-trend'
import { COE_HISTORY_ENDPOINT } from '@/lib/drive/endpoints'

function DirectionBadge({ direction }) {
  const color = direction === 'above' ? C.red : direction === 'below' ? C.accent : C.muted
  const bg = direction === 'above' ? C.redBg : direction === 'below' ? C.accentBg : C.bg
  const label = direction === 'above' ? '↑ Above recent average' : direction === 'below' ? '↓ Below recent average' : '→ In line with recent average'
  return (
    <span style={{fontSize:C.xs,fontWeight:700,color,background:bg,border:`1px solid ${color}44`,borderRadius:100,padding:'2px 10px'}}>{label}</span>
  )
}

function CategoryRow({ label, trend }) {
  if (!trend) return null
  return (
    <div style={{background:C.bg,borderRadius:C.r,padding:'12px 14px',border:`1px solid ${C.border}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:6}}>
        <span style={{fontSize:C.sm,fontWeight:700,color:C.primary}}>{label}: {SGD(trend.latest)}</span>
        <DirectionBadge direction={trend.direction}/>
      </div>
      <p style={{fontSize:C.xs,color:C.muted,margin:0,lineHeight:1.6}}>
        {trend.direction === 'flat'
          ? `About the same as the last ${trend.recentN} bidding exercise${trend.recentN>1?'s':''} (avg ${SGD(trend.recentAvg)}).`
          : `${Math.abs(trend.pctDiff).toFixed(1)}% ${trend.direction} the average of the last ${trend.recentN} bidding exercise${trend.recentN>1?'s':''} (${SGD(trend.recentAvg)}).`}
        {' '}Sits at the <strong>{trend.percentile}th percentile</strong> of all {trend.sampleSize} recorded exercises — {trend.percentile >= 80 ? 'among the highest ever' : trend.percentile <= 20 ? 'among the lowest ever' : 'a middling range historically'} (range {SGD(trend.historicalMin)}–{SGD(trend.historicalMax)}).
      </p>
    </div>
  )
}

export function CoeTimingSignal() {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    fetch(COE_HISTORY_ENDPOINT)
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d?.history) ? d.history : []))
      .catch(() => setHistory([]))
  }, [])

  const card = children => (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,overflow:'hidden',boxShadow:C.shadow}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg}}>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:'0.1em'}}>Where COE Stands Right Now</span>
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  )

  if (history === null) return card(<p style={{fontSize:C.sm,color:C.faint,margin:0}}>Loading…</p>)
  if (history.length < 2) {
    return card(
      <p style={{fontSize:C.sm,color:C.muted,lineHeight:1.7,margin:0}}>
        Not enough recorded bidding history yet to describe a trend — this needs at least a couple of data points to compare against. Check back after a few more bidding exercises.
      </p>
    )
  }

  const trendA = computeCoeTrend(history, 'catA')
  const trendB = computeCoeTrend(history, 'catB')

  return card(
    <>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:12}}>
        <CategoryRow label="Cat A" trend={trendA}/>
        <CategoryRow label="Cat B" trend={trendB}/>
      </div>
      <p style={{fontSize:'10px',color:C.faint,lineHeight:1.6,margin:0}}>
        This describes the past — where today&apos;s premium sits relative to recent bidding and to all recorded history. COE prices are set by open bidding against a quota LTA controls, and nothing here predicts what a future bidding exercise will do. Treat it as context, not a signal to time a purchase around.
      </p>
    </>
  )
}
