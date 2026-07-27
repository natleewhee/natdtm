'use client'

import { useState, useEffect } from 'react'
import { C, RATE_TIERS, parseMoneyKM } from '@/lib/drive/theme'
import { MAINTENANCE_BY_BRAND } from '@/lib/drive/maintenance'

const BRAND_OPTIONS = Object.entries(MAINTENANCE_BY_BRAND)
  .sort((a, b) => a[1].label.localeCompare(b[1].label))
  .map(([key, val]) => ({ key, label: val.label }))

function Slider({ label, hint, value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <label style={{fontSize:C.sm,fontWeight:600,color:C.primary}}>{label}</label>
        <span style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        style={{width:'100%',accentColor:C.accent}}/>
      {hint && <p style={{marginTop:4,fontSize:C.xs,color:C.muted,lineHeight:1.5}}>{hint}</p>}
    </div>
  )
}

// Manual entry form for a used car — there's no database of used-car
// listings to pick from (asking prices are set by individual sellers, not
// LTA), so unlike CarPicker this is pure user input. Calls onChange with a
// car-shaped object (or null while required fields are incomplete) matching
// what src/lib/used-car.js's calcUsed() expects.
export function UsedCarForm({ slot, onChange }) {
  const [priceRaw, setPriceRaw] = useState('')
  const [omvRaw, setOmvRaw] = useState('')
  const [ageNow, setAgeNow] = useState(5)
  const [monthsRemaining, setMonthsRemaining] = useState(60)
  const [mileage, setMileage] = useState(60000)
  const [brandKey, setBrandKey] = useState('toyota')
  const [rateTier, setRateTier] = useState('ice')
  const [isElectric, setIsElectric] = useState(false)

  useEffect(() => {
    const price = parseInt(priceRaw.replace(/\D/g, ''), 10)
    const omv = parseInt(omvRaw.replace(/\D/g, ''), 10)
    if (!price || !omv) { onChange(null); return }
    onChange({
      price, omv, ves: 0, ageNow, monthsRemaining, mileage, brandKey, rateTier,
      type: isElectric ? 'Electric' : '',
      name: `Used car (${BRAND_OPTIONS.find(b => b.key === brandKey)?.label ?? brandKey})`,
      short: 'Used car',
    })
    // onChange intentionally omitted — it's a fresh closure each render from
    // the parent and including it would re-fire this effect every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRaw, omvRaw, ageNow, monthsRemaining, mileage, brandKey, rateTier, isElectric])

  const ageAtExpiry = ageNow + monthsRemaining / 12
  const canGetPARF = ageAtExpiry <= 10
  const slotCol = slot === 'A' ? C.coah : C.blue

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <span style={{background:slotCol,color:'#fff',fontSize:10,fontWeight:700,borderRadius:4,padding:'2px 8px',fontFamily:C.fontMono,letterSpacing:'0.1em'}}>{slot}</span>
        <span style={{fontSize:C.sm,fontWeight:600,color:C.primary}}>Used car details</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div>
          <label htmlFor={`used-price-${slot}`} style={{display:'block',fontSize:C.sm,fontWeight:600,color:C.primary,marginBottom:7}}>Asking price</label>
          <div style={{position:'relative'}}>
            <span aria-hidden="true" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:C.sm,fontWeight:600,color:priceRaw?C.accent:C.faint}}>S$</span>
            <input id={`used-price-${slot}`} type="text" inputMode="numeric" value={priceRaw ? Number(priceRaw).toLocaleString('en-SG') : ''}
              onChange={e => { const p = parseMoneyKM(e.target.value); setPriceRaw(p != null ? String(p) : '') }} placeholder="0"
              style={{width:'100%',background:C.surface,border:`1.5px solid ${priceRaw?C.accent:C.border}`,borderRadius:C.r,padding:'11px 12px 11px 36px',color:C.primary,fontSize:C.lg,fontFamily:C.fontMono,fontWeight:500,outline:'none'}}/>
          </div>
          <p style={{marginTop:5,fontSize:C.xs,color:C.muted,lineHeight:1.5}}>What the seller is asking</p>
        </div>
        <div>
          <label htmlFor={`used-omv-${slot}`} style={{display:'block',fontSize:C.sm,fontWeight:600,color:C.primary,marginBottom:7}}>Car OMV</label>
          <div style={{position:'relative'}}>
            <span aria-hidden="true" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:C.sm,fontWeight:600,color:omvRaw?C.accent:C.faint}}>S$</span>
            <input id={`used-omv-${slot}`} type="text" inputMode="numeric" value={omvRaw ? Number(omvRaw).toLocaleString('en-SG') : ''}
              onChange={e => { const p = parseMoneyKM(e.target.value); setOmvRaw(p != null ? String(p) : '') }} placeholder="0"
              style={{width:'100%',background:C.surface,border:`1.5px solid ${omvRaw?C.accent:C.border}`,borderRadius:C.r,padding:'11px 12px 11px 36px',color:C.primary,fontSize:C.lg,fontFamily:C.fontMono,fontWeight:500,outline:'none'}}/>
          </div>
          <p style={{marginTop:5,fontSize:C.xs,color:C.muted,lineHeight:1.5}}>From the log card or OneMotoring — determines Cat A/B and PARF</p>
        </div>
        <Slider label="Age of car now" value={ageNow} onChange={setAgeNow} min={1} max={10} unit=" years"/>
        <Slider label="COE months remaining" value={monthsRemaining} onChange={setMonthsRemaining} min={1} max={119} unit=" months" hint="Check the log card or OneMotoring"/>
        <Slider label="Mileage" value={mileage} onChange={setMileage} min={10000} max={200000} step={5000} unit=" km" hint="Higher mileage raises the maintenance estimate"/>
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:12}}>
          <div>
            <label htmlFor={`used-brand-${slot}`} style={{fontSize:C.sm,fontWeight:600,color:C.primary,display:'block',marginBottom:6}}>Brand</label>
            <select id={`used-brand-${slot}`} value={brandKey} onChange={e => setBrandKey(e.target.value)}
              style={{width:'100%',padding:'10px 12px',border:`1.5px solid ${C.border}`,borderRadius:C.r,fontSize:C.sm,color:C.primary,fontFamily:C.fontBody,background:C.surface,outline:'none'}}>
              {BRAND_OPTIONS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`used-fuel-${slot}`} style={{fontSize:C.sm,fontWeight:600,color:C.primary,display:'block',marginBottom:6}}>Fuel type</label>
            <select id={`used-fuel-${slot}`} value={rateTier} onChange={e => setRateTier(e.target.value)}
              style={{width:'100%',padding:'10px 12px',border:`1.5px solid ${C.border}`,borderRadius:C.r,fontSize:C.sm,color:C.primary,fontFamily:C.fontBody,background:C.surface,outline:'none'}}>
              {RATE_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {rateTier === 'green' && (
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:C.xs,color:C.muted,cursor:'pointer'}}>
            <input type="checkbox" checked={isElectric} onChange={e => setIsElectric(e.target.checked)}/>
            Pure electric (not a hybrid) — affects EEAI/ARF math
          </label>
        )}
        <div style={{padding:'10px 12px',background:canGetPARF?C.accentBg:C.amberBg,borderRadius:C.r,border:`1px solid ${canGetPARF?C.accent:C.amber}44`}}>
          <p style={{fontSize:C.xs,color:canGetPARF?C.accentText:C.amberText,margin:0,lineHeight:1.6}}>
            Car will be <strong>{ageAtExpiry.toFixed(1)} years old</strong> when this COE expires — {canGetPARF ? 'PARF rebate will be available then.' : 'no PARF rebate (car will be over 10 years old).'}
          </p>
        </div>
      </div>
    </div>
  )
}
