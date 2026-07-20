'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { C, SGD } from '@/lib/drive/theme'
import { calcPriceGap } from '@/lib/drive/calc'

export function DepreciationCard({ r, tenure, visible }) {
  const [in_, setIn] = useState(false)
  const [prevVisible, setPrevVisible] = useState(visible)
  if (prevVisible !== visible) {
    setPrevVisible(visible)
    if (!visible && in_) setIn(false)
  }
  useEffect(() => {
    if (visible) { const t = setTimeout(() => setIn(true), 700); return () => clearTimeout(t) }
  }, [visible])
  if (!r) return null
  const { deprAtTenure, monthly, liveCOEPremium } = r
  const isUsed = !!r.car.isUsed
  // Depreciation tier based on % of purchase price (not absolute S$)
  // Low < 7%/yr, Moderate 7-10%/yr, High > 10%/yr
  const annualDeprPct = (deprAtTenure.annualDepr / r.car.price) * 100
  const lbl = annualDeprPct < 7 ? 'Low' : annualDeprPct < 10 ? 'Moderate' : 'High'
  const col = annualDeprPct < 7 ? C.accent : annualDeprPct < 10 ? C.amber : C.red
  const colBg = annualDeprPct < 7 ? C.accentBg : annualDeprPct < 10 ? C.amberBg : C.redBg
  // "Distributor margin" only makes sense for a new car bought from an
  // authorised dealer at a published price — a used car's asking price is
  // set by an individual seller with no such decomposition, so that box is
  // swapped for a used-car-relevant metric instead (see the isUsed branch
  // in the JSX below).
  const pg = isUsed ? null : calcPriceGap(r.car, liveCOEPremium)
  const usefulYears = isUsed ? r.car.monthsRemaining / 12 : null
  const costPerCoeYear = isUsed && usefulYears > 0 ? r.car.price / usefulYears : null
  const ageAtExpiry = isUsed ? r.car.ageNow + usefulYears : null
  return (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,overflow:'hidden',marginBottom:14,opacity:in_?1:0,transform:in_?'translateY(0)':'translateY(8px)',transition:'opacity 0.5s,transform 0.5s',boxShadow:C.shadow}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:'0.1em'}}>Depreciation Impact</span>
        <span style={{fontSize:C.xs,fontWeight:700,color:col,background:colBg,border:`1px solid ${col}44`,borderRadius:100,padding:'2px 10px'}}>{lbl} depreciation</span>
      </div>
      <div style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',gap:8,marginBottom:14}}>
          {[
            ['Annual loss',  SGD(deprAtTenure.annualDepr),          `${annualDeprPct.toFixed(1)}% of price/yr`],
            ['Monthly loss', SGD(deprAtTenure.monthlyDepr),         'Hidden cost/month'],
            ['True monthly', SGD(monthly+deprAtTenure.monthlyDepr), 'Instalment + depr.'],
          ].map(([k,v,h]) => (
            <div key={k} style={{background:C.bg,borderRadius:C.r,padding:'10px 12px',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:C.xs,color:C.muted,marginBottom:4}}>{k}</div>
              <div style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.primary,marginBottom:3}}>{v}</div>
              <div style={{fontSize:'10px',color:C.faint}}>{h}</div>
            </div>
          ))}
        </div>

        {/* Price gap / dealer margin (new cars) — or cost-per-remaining-COE-year
            (used cars, where "distributor margin" doesn't mean anything since
            the asking price is set by an individual seller) */}
        {isUsed ? (
          <div style={{background:C.blueBg,border:`1px solid ${C.blue}33`,borderRadius:C.r,padding:'12px 14px',marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:C.xs,fontWeight:700,color:C.blueText,textTransform:'uppercase',letterSpacing:'0.08em'}}>Cost per remaining COE year</span>
              <span style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(costPerCoeYear)}/yr</span>
            </div>
            <p style={{fontSize:C.xs,color:C.blueText,margin:0,lineHeight:1.5,opacity:0.8}}>
              Asking price ÷ {usefulYears.toFixed(1)} years of COE left — the clearest apples-to-apples metric when comparing used cars with different remaining COE. Car will be <strong>{ageAtExpiry.toFixed(1)} years old</strong> when this COE expires.
            </p>
          </div>
        ) : (
          <div style={{background:C.blueBg,border:`1px solid ${C.blue}33`,borderRadius:C.r,padding:'12px 14px',marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:C.xs,fontWeight:700,color:C.blueText,textTransform:'uppercase',letterSpacing:'0.08em'}}>{pg.label}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(pg.gap)}</span>
                <span style={{fontSize:C.xs,fontWeight:700,color:C.blueText,background:C.blueBg,border:`1px solid ${C.blue}44`,borderRadius:100,padding:'2px 8px'}}>{pg.isSubtotal ? `${pg.gapPct.toFixed(0)}% of total price` : `${pg.gapPct.toFixed(1)}% of total price`}</span>
              </div>
            </div>
            <p style={{fontSize:C.xs,color:C.blueText,margin:0,lineHeight:1.5,opacity:0.8}}>
              {pg.sublabel}
            </p>
            <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:'10px',color:C.blueText,opacity:0.6}}>COE used in this calc:</span>
              <span style={{fontSize:'10px',fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(pg.govtCosts.coe)}</span>
              <span style={{fontSize:'10px',color:C.blueText,opacity:0.5}}>{r.car.coe}{!r.liveCOE ? ' · est.' : ' · live'}</span>
            </div>
          </div>
        )}

        <p style={{fontSize:C.sm,color:C.muted,lineHeight:1.75}}>
          On top of your instalment of <strong style={{color:C.primary}}>{SGD(monthly)}</strong>, this car depreciates ~<strong style={{color:col}}>{SGD(deprAtTenure.monthlyDepr)}/mo</strong> — making the true effective cost <strong style={{color:C.primary}}>{SGD(monthly+deprAtTenure.monthlyDepr)}/mo</strong>.
        </p>
        {/* COE/PARF inline explainer */}
        <details style={{marginTop:12}}>
          <summary style={{fontSize:C.xs,color:C.primary,cursor:'pointer',userSelect:'none',fontWeight:600}}>What is COE and PARF? →</summary>
          <div style={{marginTop:10,padding:'12px 14px',background:C.bg,borderRadius:C.r,border:`1px solid ${C.border}`,fontSize:C.xs,color:C.muted,lineHeight:1.7}}>
            <p style={{margin:'0 0 8px'}}><strong style={{color:C.text}}>COE (Certificate of Entitlement)</strong> is a 10-year right to own a car in Singapore. The price is set by open bidding twice a month. It&apos;s bundled into your car&apos;s sticker price — the single most volatile component of what you pay.</p>
            <p style={{margin:'0 0 8px'}}><strong style={{color:C.text}}>ARF (Additional Registration Fee)</strong> is a government tax paid on registration, calculated as a % of the car&apos;s OMV. It ranges from 100% to 320% depending on OMV tier.</p>
            <p style={{margin:'0 0 8px'}}><strong style={{color:C.text}}>PARF rebate</strong> is money you get back when scrapping a car under 10 years old — a percentage of your ARF paid. The older the car, the less you recover.</p>
            <p style={{margin:'0 0 8px'}}><strong style={{color:C.text}}>COE rebate</strong> is the pro-rated refund of unused COE months when you deregister early. Together, PARF + COE rebate is why Singapore cars always have a minimum scrap value.</p>
            <Link href="/drive/coe-explained" style={{color:C.primary,fontWeight:600,fontSize:C.xs}}>Full COE explainer with interactive calculator →</Link>
          </div>
        </details>
      </div>
    </div>
  )
}
