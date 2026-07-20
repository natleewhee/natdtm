'use client'

import { useState } from 'react'
import { C, SGD } from '@/lib/drive/theme'
import { calcDepr } from '@/lib/drive/calc'
import { calcUsedDepr } from '@/lib/drive/used-car'

// COE at deregistration time is a bet, not a known quantity — the premium
// used elsewhere in the app is either today's live rate or a fallback, but
// the car won't actually be scrapped for years, by which point COE could be
// meaningfully higher or lower. Car price itself is fixed (already
// COE-inclusive in cars.json) so a COE swing doesn't change the instalment —
// it changes what you get BACK (PARF + COE rebate) at scrap time, and
// therefore the true cost of ownership. This makes that sensitivity visible
// instead of presenting the depreciation figure as a single point estimate.
const SCENARIOS = [
  { key: 'down', label: '-20%', mult: 0.8 },
  { key: 'base', label: 'Current', mult: 1.0 },
  { key: 'up',   label: '+20%', mult: 1.2 },
]

export function CoeSensitivity({ r, tenure }) {
  const [scenario, setScenario] = useState('base')
  if (!r) return null

  const { car, deprAtTenure } = r
  const baseCoe = deprAtTenure.coePaid
  const active = SCENARIOS.find(s => s.key === scenario)
  const adjustedCoe = Math.round(baseCoe * active.mult)
  // Used cars have a different depreciation model (PARF off total age, COE
  // rebate off actual remaining months rather than a fresh 120-month clock)
  // — see src/lib/used-car.js.
  const deprFn = car.isUsed ? calcUsedDepr : calcDepr
  const depr = scenario === 'base' ? deprAtTenure : deprFn(car, tenure, adjustedCoe)

  const baseTrueCost = deprAtTenure.totalDepr
  const delta = depr.totalDepr - baseTrueCost

  return (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,overflow:'hidden',marginBottom:14,boxShadow:C.shadow}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:'0.1em'}}>COE Sensitivity at Scrap</span>
        <div style={{display:'flex',gap:4,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.r,padding:2}}>
          {SCENARIOS.map(s => (
            <button key={s.key} type="button" onClick={() => setScenario(s.key)} aria-pressed={scenario===s.key}
              style={{padding:'4px 10px',fontSize:C.xs,fontWeight:700,cursor:'pointer',borderRadius:6,border:'none',fontFamily:C.fontBody,background:scenario===s.key?C.primary:'transparent',color:scenario===s.key?'#fff':C.muted,transition:'all 0.2s'}}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',gap:8,marginBottom:12}}>
          <div style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>COE assumed</div>
            <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>{SGD(adjustedCoe)}</div>
          </div>
          <div style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>You recover</div>
            <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.accent}}>{SGD(depr.paperValue)}</div>
          </div>
          <div style={{background:delta===0?C.bg:delta<0?C.accentBg:C.redBg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${delta===0?C.border:delta<0?C.accent:C.red}44`}}>
            <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>True cost</div>
            <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:delta===0?C.primary:delta<0?C.accentText:C.redText}}>{SGD(depr.totalDepr)}</div>
          </div>
        </div>
        <p style={{fontSize:C.xs,color:C.muted,lineHeight:1.6,margin:0}}>
          {scenario === 'base'
            ? `This is the figure used throughout this page: today's ${!r.liveCOE ? 'estimated' : 'live'} COE premium, held flat to year ${tenure}.`
            : `If COE at deregistration ends up ${active.mult < 1 ? 'this much lower' : 'this much higher'} than assumed, your true cost over ${tenure} year${tenure>1?'s':''} would be ${delta === 0 ? 'about the same' : `${SGD(Math.abs(delta))} ${delta > 0 ? 'higher' : 'lower'}`} — COE moves the money you get back at scrap, not your instalment (the price you're financing already includes COE).`}
        </p>
      </div>
    </div>
  )
}
