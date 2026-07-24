'use client'

import { useState, useEffect } from 'react'
import { C, SGD } from '@/lib/drive/theme'
import { estimateAnnualRunningCosts } from '@/lib/drive/tco'

export function RunningCostCard({ r, visible }) {
  const [in_, setIn] = useState(false)
  const [prevVisible, setPrevVisible] = useState(visible)
  if (prevVisible !== visible) {
    setPrevVisible(visible)
    if (!visible && in_) setIn(false)
  }
  useEffect(() => {
    if (visible) { const t = setTimeout(() => setIn(true), 800); return () => clearTimeout(t) }
  }, [visible])
  if (!r) return null

  const { monthly, deprAtTenure, car } = r
  const running = estimateAnnualRunningCosts(car)
  const allInMonthly = monthly + deprAtTenure.monthlyDepr + running.monthly

  return (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,overflow:'hidden',marginBottom:14,opacity:in_?1:0,transform:in_?'translateY(0)':'translateY(8px)',transition:'opacity 0.5s,transform 0.5s',boxShadow:C.shadow}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:'0.1em'}}>Running Costs (Estimated)</span>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.blueText,background:C.blueBg,border:`1px solid ${C.blue}44`,borderRadius:100,padding:'2px 10px'}}>~{SGD(running.total)}/yr</span>
      </div>
      <div style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',gap:8,marginBottom:14}}>
          {[
            ['Insurance', SGD(running.insurance)],
            ['Road tax', SGD(running.roadTax)],
            ['Maintenance', SGD(running.maintenance)],
            ['Parking', SGD(running.parking)],
          ].map(([k,v]) => (
            <div key={k} style={{background:C.bg,borderRadius:C.r,padding:'10px 10px',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'10px',color:C.muted,marginBottom:4}}>{k}</div>
              <div style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>{v}</div>
              <div style={{fontSize:'9px',color:C.muted,marginTop:1}}>/yr</div>
            </div>
          ))}
        </div>

        <div style={{background:C.blueBg,border:`1px solid ${C.blue}33`,borderRadius:C.r,padding:'12px 14px',marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <span style={{fontSize:C.xs,fontWeight:700,color:C.blueText,textTransform:'uppercase',letterSpacing:'0.08em'}}>All-in monthly cost</span>
            <span style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(allInMonthly)}</span>
          </div>
          <p style={{fontSize:C.xs,color:C.blueText,margin:0,lineHeight:1.5,opacity:0.8}}>
            Instalment ({SGD(monthly)}) + depreciation ({SGD(deprAtTenure.monthlyDepr)}) + insurance, road tax, maintenance &amp; parking ({SGD(running.monthly)}) — the fullest picture of what this car costs you per month.
          </p>
        </div>

        <p style={{fontSize:'10px',color:C.faint,lineHeight:1.6,margin:0}}>
          Rough estimates, not quotes — insurance varies by driver profile (age, NCD, claims history), road tax depends on exact engine capacity/power rating, and parking depends on location. Maintenance is modeled off {running.brandKey.charAt(0).toUpperCase() + running.brandKey.slice(1)} year-1 service costs. Use these to compare cars directionally, not as a budget commitment.
        </p>
      </div>
    </div>
  )
}
