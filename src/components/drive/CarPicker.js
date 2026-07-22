'use client'

import { useState, useRef, useEffect } from 'react'
import { C, SGD, RATE_TIERS } from '@/lib/drive/theme'
import { calcPriceGap } from '@/lib/drive/calc'

function hlMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return <span>{text.slice(0,idx)}<mark style={{background:C.accentBg,color:C.accent,borderRadius:2,padding:'0 1px'}}>{text.slice(idx,idx+query.length)}</mark>{text.slice(idx+query.length)}</span>
}

export function CarPicker({ value, onChange, slot, ceiling, down, allCars = [], top5Cars = [], customPrice = '', onCustomPrice }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [hiIdx, setHiIdx] = useState(-1)
  const [budgetFilter, setBudgetFilter] = useState(false)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)
  const slotCol = slot === 'A' ? C.primary : C.blue
  const hasCeiling = ceiling && (ceiling.catA > 0 || ceiling.catB > 0)
  const budgetCars = hasCeiling ? allCars.filter(car => {
    const cap = car.coe === 'Cat A' ? ceiling.catA : ceiling.catB
    const minDown = car.price * (1 - car.loanCap / 100)
    return car.price <= cap && (down||0) >= minDown
  }).sort((a,b) => { if (a.top5 && !b.top5) return -1; if (!a.top5 && b.top5) return 1; if (a.top5&&b.top5) return a.rank-b.rank; return b.price-a.price }).slice(0,5) : []
  const showBudget = budgetFilter && hasCeiling
  const listCars = showBudget ? budgetCars : top5Cars
  const filtered = query.trim().length === 0 ? [] : allCars.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.type.toLowerCase().includes(query.toLowerCase()) ||
    (c.coe||'').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)
  const showDrop = focused && query.trim().length > 0
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setFocused(false); setQuery('') } }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const select = car => { onChange(car); setQuery(''); setFocused(false); setHiIdx(-1) }
  const handleKey = e => {
    if (!showDrop) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i+1, filtered.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHiIdx(i => Math.max(i-1, 0)) }
    if (e.key === 'Enter' && hiIdx >= 0) select(filtered[hiIdx])
    if (e.key === 'Escape') { setFocused(false); setQuery('') }
  }
  return (
    <div ref={wrapRef}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <span style={{background:slotCol,color:'#fff',fontSize:10,fontWeight:700,borderRadius:4,padding:'2px 8px',fontFamily:C.fontMono,letterSpacing:'0.1em'}}>{slot}</span>
        <span style={{fontSize:C.sm,fontWeight:600,color:C.primary}}>Select a car</span>
      </div>
      {!value && (
        <p style={{fontSize:C.xs,color:C.faint,marginBottom:12,lineHeight:1.5}}>
          Already have a dealer quote? Pick the closest match below, then edit its price to match — that gives you the most accurate numbers.
        </p>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:C.xs,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em'}}>
          {showBudget ? `🎯 Within your budget · ${budgetCars.length} car${budgetCars.length!==1?'s':''}` : '🏅 Top 5 best-sellers 2025'}
        </div>
        {hasCeiling && (
          <button type="button" onClick={() => setBudgetFilter(v => !v)} aria-pressed={showBudget}
            style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:showBudget?C.accentBg:C.bg,border:`1.5px solid ${showBudget?C.accent:C.border}`,borderRadius:100,cursor:'pointer',transition:'all 0.2s',fontSize:C.xs,fontWeight:700,color:showBudget?C.accent:C.muted,fontFamily:C.fontBody}}>
            {showBudget?'✓ ':''} Within my budget
          </button>
        )}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
        {listCars.length === 0
          ? <div style={{padding:'16px',textAlign:'center',background:C.bg,borderRadius:C.r,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:C.sm,color:C.muted}}>No cars fit within your current budget.</div>
              <div style={{fontSize:C.xs,color:C.faint,marginTop:4}}>Try a higher downpayment or search below.</div>
            </div>
          : listCars.map(car => {
              const t = RATE_TIERS.find(r => r.id === car.rateTier)
              const sel = value?.id === car.id
              return (
                <button key={car.id} type="button" onClick={() => select(car)} className={`top5-btn${sel?' sel':''}`}
                  aria-pressed={sel}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:sel?C.accentBg:C.bg,border:`1.5px solid ${sel?C.accent:C.border}`,borderRadius:C.r,cursor:'pointer',textAlign:'left',width:'100%'}}>
                  {car.top5
                    ? <span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.accent,minWidth:22,textAlign:'center'}}>#{car.rank}</span>
                    : <span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.faint,minWidth:22,textAlign:'center'}}></span>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:C.sm,fontWeight:700,color:sel?C.primary:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{car.name}</div>
                    <div style={{fontSize:C.xs,color:C.muted,marginTop:1}}>{car.type}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    <span style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color:sel?C.primary:C.muted}}>{SGD(car.price)}</span>
                    {car.priceVerified === false && (
                      <span title="Price not in LTA monthly data — using last known price" style={{fontSize:C.xs,fontWeight:700,color:C.amberText,background:C.amberBg,border:`1px solid ${C.amber}44`,borderRadius:100,padding:'2px 7px'}}>⚠️</span>
                    )}
                    <span style={{fontSize:C.xs,fontWeight:700,color:t.color,background:t.bg,border:`1px solid ${t.color}44`,borderRadius:100,padding:'2px 7px'}}>{t.display}</span>
                    {sel && <div style={{width:6,height:6,borderRadius:'50%',background:C.accent,boxShadow:`0 0 0 2px ${C.accentBg}`}}/>}
                  </div>
                </button>
              )
            })}
      </div>
      <div>
        <div style={{fontSize:C.xs,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Search all 100+ models</div>
        <div style={{position:'relative'}}>
          <span aria-hidden="true" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:12,pointerEvents:'none',color:C.faint,fontWeight:600}}>⌕</span>
          <input ref={inputRef} type="text" value={query}
            onChange={e => { setQuery(e.target.value); setHiIdx(-1) }}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKey}
            placeholder="e.g. Tesla, BYD, SUV, Cat A, hybrid…"
            aria-label={`Search all cars for slot ${slot}`}
            role="combobox" aria-expanded={showDrop} aria-autocomplete="list" aria-controls={`car-listbox-${slot}`}
            style={{width:'100%',background:C.surface,border:`1.5px solid ${focused?C.accent:C.border}`,borderRadius:C.r,padding:'10px 32px 10px 36px',color:C.text,fontSize:C.sm,outline:'none',transition:'border-color 0.2s,box-shadow 0.2s',boxShadow:focused?`0 0 0 3px ${C.accentBg}`:'none'}}/>
          {query && (
            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Clear search"
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:C.faint,cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>✕</button>
          )}
          {showDrop && (
            <div id={`car-listbox-${slot}`} role="listbox" className="coah-scroll" style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:999,background:C.surface,border:`1.5px solid ${C.accent}55`,borderRadius:C.r,boxShadow:C.shadowMd,overflow:'hidden',animation:'expandDown 0.18s ease forwards'}}>
              {filtered.length === 0
                ? <div style={{padding:'14px',fontSize:C.sm,color:C.muted,textAlign:'center'}}>No matches for &quot;{query}&quot;</div>
                : filtered.map((car, i) => {
                    const t = RATE_TIERS.find(r => r.id === car.rateTier)
                    const sel = value?.id === car.id
                    const hi = hiIdx === i
                    return (
                      <button key={car.id} type="button" className={`search-row${hi?' hi':''}`} aria-pressed={sel}
                        onMouseEnter={() => setHiIdx(i)} onClick={() => select(car)}
                        style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:sel?C.accentBg:hi?C.bg:'transparent',border:'none',borderBottom:i<filtered.length-1?`1px solid ${C.border}`:'none',cursor:'pointer',textAlign:'left'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:C.sm,fontWeight:600,color:sel?C.primary:C.text}}>{hlMatch(car.name, query)}</div>
                          <div style={{fontSize:C.xs,color:C.muted,marginTop:1}}>{car.type} · {car.coe} · {car.loanCap}% loan</div>
                        </div>
                        <div style={{flexShrink:0,textAlign:'right'}}>
                          <div style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color:sel?C.primary:C.text}}>
                            {SGD(car.price)}{car.priceVerified === false ? ' ⚠️' : ''}
                          </div>
                          <span style={{fontSize:C.xs,fontWeight:700,color:t.color,background:t.bg,borderRadius:100,padding:'1px 7px'}}>{t.display}</span>
                        </div>
                        {sel && <span style={{color:C.accent,fontSize:13,flexShrink:0}}>✓</span>}
                      </button>
                    )
                  })}
              {filtered.length > 0 && (
                <div style={{padding:'8px 14px',borderTop:`1px solid ${C.border}`,fontSize:C.xs,color:C.faint}}>
                  {filtered.length} result{filtered.length!==1?'s':''} · ↑↓ navigate · Enter select
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {value && (
        <div style={{marginTop:12,padding:'12px 14px',background:C.accentBg,border:`1.5px solid ${C.accent}66`,borderRadius:C.r,animation:'fadeUp 0.25s ease forwards'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div>
              <div style={{fontSize:C.sm,fontWeight:700,color:C.primary}}>{value.name}</div>
              <div style={{fontSize:C.xs,color:C.muted}}>{value.type} · {value.coe}</div>
            </div>
            {value.top5 && <span style={{marginLeft:'auto',fontSize:C.xs,fontWeight:700,color:C.accent,background:C.surface,border:`1px solid ${C.accent}55`,borderRadius:100,padding:'2px 10px'}}>#{value.rank} in SG</span>}
          </div>
          {value.desc && <p style={{fontSize:C.sm,color:C.text,lineHeight:1.6,marginBottom:8}}>{value.desc}</p>}
          {value.priceVerified === false && (
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:C.amberBg,borderRadius:C.r,marginBottom:8,border:`1px solid ${C.amber}44`}}>
              <span style={{fontSize:12}}>⚠️</span>
              <span style={{fontSize:C.xs,color:C.amberText}}>Not in this month&apos;s LTA update — using our last saved price for this model.</span>
            </div>
          )}
          <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:8}}>
            <span style={{fontSize:C.xs,color:C.muted}}>Max loan: <strong style={{color:C.primary}}>{value.loanCap}%</strong></span>
            <span style={{fontSize:C.xs,color:C.muted}}>Min. downpayment: <strong style={{color:C.primary}}>{SGD(value.price*(1-value.loanCap/100))}</strong></span>
            <span style={{fontSize:C.xs,color:C.muted}}>OMV: <strong style={{color:C.primary}}>{SGD(value.omv)}</strong></span>
          </div>
          {/* Price override field — promoted as a primary action: our prices are
              indicative (see data-staleness banner), but a dealer quote is exact,
              so entering one is the single highest-value thing a user can do here. */}
          <div style={{marginBottom:8,padding:'12px 14px',background:customPrice?C.accentBg:C.surface,borderRadius:C.r,border:`1.5px solid ${customPrice?C.accent:C.accent+'66'}`}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
              <span style={{fontSize:13}}>💬</span>
              <span style={{fontSize:C.xs,fontWeight:700,color:customPrice?C.accentText:C.primary}}>Got a dealer quote? Enter it for your real numbers</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:C.sm,color:C.faint}}>S$</span>
              <input
                type="text"
                value={customPrice || value.price.toLocaleString('en-SG')}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g,'')
                  onCustomPrice && onCustomPrice(raw)
                }}
                onFocus={e => { e.target.select() }}
                aria-label="Enter your dealer-quoted price to override the indicative price"
                style={{flex:1,minWidth:0,border:'none',outline:'none',fontSize:C.base,fontFamily:C.fontMono,fontWeight:700,color:customPrice ? C.primary : C.muted,background:'transparent',padding:0}}
              />
              {customPrice && (
                <span style={{fontSize:C.xs,color:C.accent,fontWeight:700}}>✓ Your price</span>
              )}
              {!customPrice && (
                <span style={{fontSize:'10px',color:C.faint}}>indicative — click to edit</span>
              )}
            </div>
          </div>
          {(() => {
            const displayCar = customPrice ? {...value, price: parseInt(customPrice, 10)||value.price} : value
            const pg = calcPriceGap(displayCar)
            return (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:C.xs,color:C.muted}}>{pg.label}:</span>
                <span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.blue}}>{SGD(pg.gap)}</span>
                <span style={{fontSize:C.xs,color:C.blueText,opacity:0.8}}>({pg.gapPct.toFixed(1)}% of total price)</span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
