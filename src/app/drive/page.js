'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { C, SGD } from '@/lib/drive/theme'
import { calc, calcCeiling, COE_FALLBACK, COE_FALLBACK_AS_OF, isCoeFallbackStale } from '@/lib/drive/calc'
import { calcUsed } from '@/lib/drive/used-car'
import { useDebounce } from '@/lib/drive/hooks'
import {
  STORAGE_KEY, serializeToParams, deserializeFromParams,
  serializeToJSON, deserializeFromJSON, mergeRestoredState,
} from '@/lib/drive/persist'
import { loadGarage, saveGarage, makeGarageEntry, addEntry, removeEntry, renameEntry, defaultEntryName } from '@/lib/drive/garage'
import { SectionDivider, MoneyInput } from '@/components/drive/ui'
import { CarPicker } from '@/components/drive/CarPicker'
import { UsedCarForm } from '@/components/drive/UsedCarForm'
import { ResultPanel } from '@/components/drive/ResultPanel'
import { AffordabilityCeilingCard } from '@/components/drive/AffordabilityCeilingCard'
import { GaragePanel } from '@/components/drive/GaragePanel'

// Car prices come from /public/data/cars.json (edit that file to update prices)
// COE premiums come from /api/coe (live from LTA DataMall)

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DriveReadyPage() {
  // ── Live data state ────────────────────────────────────────────────────────
  const [baseCars,    setBaseCars]    = useState([])  // loaded from /public/data/cars.json
  const [priceMap,    setPriceMap]    = useState({})             // from /api/cars
  const [scrapeStatus,setScrapeStatus]= useState('loading')      // 'loading' | 'live' | 'fallback'
  const [scrapedAt,   setScrapedAt]   = useState(null)
  const [lowCoverage, setLowCoverage] = useState(false)           // true if the LTA parse matched suspiciously few cars
  const [coeData,     setCoeData]     = useState(null)
  const [coeLoading,  setCoeLoading]  = useState(true)

  // Merge scraped prices onto base car list
  const allCars = baseCars.map(car => {
    if (priceMap[car.id]) {
      return { ...car, price: priceMap[car.id], priceVerified: true }
    }
    return { ...car, priceVerified: scrapeStatus === 'live' ? false : null }
    // priceVerified: true = from LTA PDF live, false = unmatched (show ⚠️), null = data not loaded yet
  })

  const top5Cars = allCars.filter(c => c.top5).sort((a,b) => a.rank - b.rank)

  // Date.now() is impure to call directly during render (breaks hydration
  // consistency), so "now" is captured in an effect and re-captured whenever
  // scrapedAt changes rather than read live on every render. This
  // synchronous setState is the standard, necessary pattern for syncing
  // React state with the system clock (there's no meaningful async boundary
  // to defer it behind), so the set-state-in-effect rule is disabled here
  // rather than distorted with an artificial setTimeout.
  const [now, setNow] = useState(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
  }, [scrapedAt])

  // Stale banner: show if scrape failed, coverage looks broken, or scrapedAt is > 2 days ago
  const showStaleBanner = scrapeStatus === 'fallback' || lowCoverage ||
    (scrapedAt && now ? (now - new Date(scrapedAt).getTime()) / 3600000 > 48 : false)

  const staleDaysAgo = (scrapedAt && now)
    ? Math.floor((now - new Date(scrapedAt).getTime()) / 86400000)
    : null

  useEffect(() => {
    // 1. Load base car data (names, OMV, loanCap, emoji etc) from public JSON
    fetch('/data/cars.json')
      .then(r => r.json())
      .then(d => { if (d.cars?.length > 0) setBaseCars(d.cars) })
      .catch(() => {})

    // 2. Fetch prices from LTA PDF via our API route
    fetch('/api/cars')
      .then(r => r.json())
      .then(d => {
        if (d.source === 'lta_pdf' && d.prices && Object.keys(d.prices).length > 0) {
          setPriceMap(d.prices)
          setScrapedAt(d.scrapedAt)
          setScrapeStatus('live')
          setLowCoverage(!!d.lowCoverage)
          // If API returned live OMV/VES data, update base cars with accurate values
          if (d.omv || d.ves) {
            setBaseCars(prev => prev.map(car => ({
              ...car,
              omv:  (d.omv && d.omv[car.id])  ? d.omv[car.id]  : car.omv,
              ves:  (d.ves && d.ves[car.id])   ? d.ves[car.id]  : (car.ves ?? 0),
            })))
          }
        } else {
          setScrapeStatus('fallback')
        }
      })
      .catch(() => setScrapeStatus('fallback'))

    // 3. Fetch live COE from LTA DataMall
    fetch('/api/coe')
      .then(r => r.json())
      .then(d => { if (d.catA && d.catB) setCoeData(d) })
      .catch(() => {})
      .finally(() => setCoeLoading(false))
  }, [])

  // ── Form state ────────────────────────────────────────────────────────────
  const [salaryRaw, setSalaryRaw] = useState('')
  const [salary,    setSalary]    = useState('')
  const [downRaw,   setDownRaw]   = useState('')
  const [down,      setDown]      = useState('')
  const [existingDebtRaw, setExistingDebtRaw] = useState('')
  const [existingDebt,    setExistingDebt]    = useState('')
  const [tenure,    setTenure]    = useState(7)
  const [mode,      setMode]      = useState('single')
  const [carA,      setCarA]      = useState(null)
  const [carB,      setCarB]      = useState(null)
  const [customPriceA, setCustomPriceA] = useState('')
  const [customPriceB, setCustomPriceB] = useState('')
  // New-vs-used per slot. Used-car scenarios are session-only right now —
  // not persisted to localStorage/URL/garage like new-car inputs are, since
  // that would mean extending every persistence schema (persist.js,
  // garage.js's restore path) for a manual multi-field form. A reasonable
  // scope cut, but a real one: reloading or sharing a link loses used-car
  // inputs even though it keeps new-car ones.
  const [conditionA, setConditionA] = useState('new') // 'new' | 'used'
  const [conditionB, setConditionB] = useState('new')
  const [usedCarA,   setUsedCarA]   = useState(null)
  const [usedCarB,   setUsedCarB]   = useState(null)
  const [calculated,setCalculated]= useState(false)
  const resultsRef = useRef(null)

  // ── Persistence: restore inputs from a shared URL (wins) or the last
  // session's localStorage (fallback) on mount, then keep both in sync as
  // inputs change. Car selections are stored as IDs and resolved against
  // allCars once it's loaded (see the effect below). `hasRestored` gates the
  // persist effect so it doesn't overwrite storage with blank initial state
  // before the restore effect has had a chance to apply it.
  const [hasRestored, setHasRestored] = useState(false)
  const [pendingCarIds, setPendingCarIds] = useState(null)

  // Fully replaces the form state from a restored/loaded input snapshot —
  // shared by the mount-time restore effect below and the garage "load"
  // handler, so loading a saved scenario mid-session behaves identically to
  // restoring one on page load.
  const applyRestoredState = (restored) => {
    const salaryRawVal = restored.salaryRaw || ''
    const downRawVal = restored.downRaw || ''
    const existingDebtRawVal = restored.existingDebtRaw || ''
    setSalaryRaw(salaryRawVal); setSalary(salaryRawVal ? Number(salaryRawVal).toLocaleString('en-SG') : '')
    setDownRaw(downRawVal); setDown(downRawVal ? Number(downRawVal).toLocaleString('en-SG') : '')
    setExistingDebtRaw(existingDebtRawVal); setExistingDebt(existingDebtRawVal ? Number(existingDebtRawVal).toLocaleString('en-SG') : '')
    setTenure(restored.tenure || 7)
    setMode(restored.mode || 'single')
    setCustomPriceA(restored.customPriceA || '')
    setCustomPriceB(restored.customPriceB || '')
    setCalculated(!!restored.calculated)
    setPendingCarIds({ a: restored.carAId ?? null, b: restored.carBId ?? null })
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from
       localStorage/URL on mount; this can't happen during render since both
       are unavailable during SSR and would cause a hydration mismatch */
    const fromStorage = deserializeFromJSON(window.localStorage.getItem(STORAGE_KEY))
    const fromUrl = deserializeFromParams(new URLSearchParams(window.location.search))
    const restored = mergeRestoredState(fromStorage, fromUrl)
    if (Object.keys(restored).length > 0) applyRestoredState(restored)

    setHasRestored(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Resolve pending car IDs once the car list has loaded.
  useEffect(() => {
    if (!pendingCarIds || allCars.length === 0) return
    /* eslint-disable react-hooks/set-state-in-effect -- one-time resolution
       once allCars becomes available, not a re-render loop */
    if (pendingCarIds.a) setCarA(allCars.find(c => c.id === pendingCarIds.a) ?? null)
    if (pendingCarIds.b) setCarB(allCars.find(c => c.id === pendingCarIds.b) ?? null)
    setPendingCarIds(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pendingCarIds, allCars])

  // Persist on every change, once initial restore has completed.
  useEffect(() => {
    if (!hasRestored) return
    const state = { salaryRaw, downRaw, existingDebtRaw, tenure, mode, carAId: carA?.id ?? null, carBId: carB?.id ?? null, customPriceA, customPriceB, calculated }
    window.localStorage.setItem(STORAGE_KEY, serializeToJSON(state))
    const params = serializeToParams(state)
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [hasRestored, salaryRaw, downRaw, existingDebtRaw, tenure, mode, carA?.id, carB?.id, customPriceA, customPriceB, calculated])

  const dSalary = useDebounce(parseInt(salaryRaw||'0', 10), 120)
  const dDown   = useDebounce(parseInt(downRaw||'0',   10), 120)
  const dExistingDebt = useDebounce(parseInt(existingDebtRaw||'0', 10), 120)
  const dTenure = useDebounce(tenure, 80)

  // Pass live COE to calc so it uses real premiums when available
  const liveCOE = coeData ? { catA: coeData.catA.premium, catB: coeData.catB.premium } : null
  // Merge user-overridden prices into car objects before calculations (new-car
  // slots only — used-car forms already collect price directly).
  const effCarA = conditionA === 'used' ? usedCarA : (carA && customPriceA ? { ...carA, price: parseInt(customPriceA.replace(/,/g,''), 10) } : carA)
  const effCarB = conditionB === 'used' ? usedCarB : (carB && customPriceB ? { ...carB, price: parseInt(customPriceB.replace(/,/g,''), 10) } : carB)
  const calcForSlot = (condition, ...args) => condition === 'used' ? calcUsed(...args) : calc(...args)
  const rA = (calculated && effCarA)                      ? calcForSlot(conditionA, dSalary, dDown, dTenure, effCarA, liveCOE, dExistingDebt) : null
  const rB = (calculated && effCarB && mode==='compare')   ? calcForSlot(conditionB, dSalary, dDown, dTenure, effCarB, liveCOE, dExistingDebt) : null

  const handleSalary = e => { const r=e.target.value.replace(/\D/g,''); setSalaryRaw(r); setSalary(r?Number(r).toLocaleString('en-SG'):'') }
  const handleDown   = e => { const r=e.target.value.replace(/\D/g,''); setDownRaw(r);   setDown(r?Number(r).toLocaleString('en-SG'):'') }
  const handleExistingDebt = e => { const r=e.target.value.replace(/\D/g,''); setExistingDebtRaw(r); setExistingDebt(r?Number(r).toLocaleString('en-SG'):'') }
  const isReady = salaryRaw && downRaw && effCarA && (mode==='single' || effCarB)
  // Garage saves rely on IDs to restore new-car selections — used-car
  // scenarios (manually entered, not persisted) can't round-trip through
  // that path, so saving is disabled while either slot is in used-car mode.
  const canSaveToGarage = conditionA === 'new' && (mode === 'single' || conditionB === 'new')

  const handleCalc = () => {
    setCalculated(true)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 120)
  }

  // ── Garage: save/compare multiple calculated scenarios ─────────────────────
  const [garage, setGarage] = useState([])
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time load from
       localStorage on mount, same rationale as the input-restore effect above */
    setGarage(loadGarage())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const summarizeResult = r => r ? { name: r.car.name, price: r.car.price, monthly: r.monthly, totalCoo: r.totalCoo, verdict: r.verdict, tdsrExceeded: r.tdsrExceeded } : null

  const handleSaveToGarage = () => {
    const inputs = { salaryRaw, downRaw, existingDebtRaw, tenure, mode, carAId: carA?.id ?? null, carBId: carB?.id ?? null, customPriceA, customPriceB, calculated: true }
    const summary = { carA: summarizeResult(rA), carB: summarizeResult(rB) }
    const name = defaultEntryName(carA?.name, mode === 'compare' ? carB?.name : null)
    const next = addEntry(garage, makeGarageEntry({ name, inputs, summary }))
    setGarage(next)
    saveGarage(next)
  }

  const handleLoadFromGarage = entry => { applyRestoredState(entry.inputs) }

  const handleDeleteFromGarage = id => {
    const next = removeEntry(garage, id)
    setGarage(next)
    saveGarage(next)
  }

  const handleRenameInGarage = (id, name) => {
    const next = renameEntry(garage, id, name)
    setGarage(next)
    saveGarage(next)
  }

  const trackPct   = ((tenure-1)/6*100).toFixed(1)
  const trackStyle = `linear-gradient(90deg,${C.accent} ${trackPct}%,${C.border} ${trackPct}%)`

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column',fontFamily:C.fontBody}}>

      {/* ── STRUCTURED DATA ─── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context':'https://schema.org','@type':'WebApplication',
        name:'DriveReady by Coah',url:'https://coah.vercel.app/drive',
        description:'Singapore car affordability calculator. Know your true monthly cost before you commit.',
        applicationCategory:'FinanceApplication',operatingSystem:'Web',
        offers:{'@type':'Offer',price:'0',priceCurrency:'SGD'},
        audience:{'@type':'Audience',geographicArea:{'@type':'Country',name:'Singapore'}}
      }) }} />

      {/* ── NAV ── */}
      <nav className="coah-nav" style={{background:C.coah,padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 0 rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <span style={{fontFamily:C.fontCoah,fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.5)',letterSpacing:'0.14em',textTransform:'uppercase'}}>COAH</span>
          <span style={{fontFamily:C.fontDisplay,fontSize:18,color:'#fff',lineHeight:1}}>DriveReady</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          {coeLoading ? (
            <span className="coah-nav-badge" style={{fontSize:C.xs,color:'rgba(255,255,255,0.25)'}}>Fetching COE…</span>
          ) : coeData ? (
            <div className="coah-nav-badge" style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:C.xs,color:'rgba(255,255,255,0.35)'}}>Latest COE</span>
              <span style={{fontSize:C.xs,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:100,padding:'2px 10px',color:'rgba(255,255,255,0.7)',fontFamily:C.fontMono,fontWeight:600}}>A: {SGD(coeData.catA.premium)}</span>
              <span style={{fontSize:C.xs,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:100,padding:'2px 10px',color:'rgba(255,255,255,0.7)',fontFamily:C.fontMono,fontWeight:600}}>B: {SGD(coeData.catB.premium)}</span>
            </div>
          ) : (
            <span className="coah-nav-badge" style={{fontSize:C.xs,color:'rgba(255,255,255,0.25)'}}>Car prices indicative</span>
          )}
          <div style={{display:'flex',alignItems:'center',gap:14}}>
          <Link href="/drive/renew-or-replace" style={{fontSize:C.xs,color:'rgba(255,255,255,0.4)',textDecoration:'none',borderBottom:'1px solid rgba(255,255,255,0.15)',paddingBottom:1}}>Renew or Replace?</Link>
          <Link href="/drive/the-math" style={{fontSize:C.xs,color:'rgba(255,255,255,0.4)',textDecoration:'none',borderBottom:'1px solid rgba(255,255,255,0.15)',paddingBottom:1}}>The Math →</Link>
        </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{background:C.coah,padding:'48px 32px 52px',textAlign:'center'}}>
        <div style={{fontFamily:C.fontCoah,fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:14}}>Singapore Car Loan Calculator</div>
        <h1 style={{fontFamily:C.fontDisplay,fontSize:'clamp(28px,5vw,50px)',color:'#fff',marginBottom:10,lineHeight:1.2}}>Be Ready to Drive.</h1>
        <p style={{fontFamily:C.fontDisplay,fontSize:18,color:'rgba(255,255,255,0.5)',marginBottom:24,fontStyle:'italic'}}>Your salary, your cash, your real monthly number.</p>
        <div style={{display:'flex',justifyContent:'center',gap:10,flexWrap:'wrap'}}>
          {['50+ SG models','True cost incl. depreciation','Zero data collected','Free, forever'].map(b => (
            <span key={b} style={{padding:'5px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,0.14)',fontSize:12,color:'rgba(255,255,255,0.45)',letterSpacing:'0.03em'}}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── MAS disclaimer ── */}
      <div style={{background:'#f3f5f2',borderBottom:`1px solid ${C.border}`,padding:'8px 24px',textAlign:'center'}}>
        <p style={{fontSize:11,color:C.faint,margin:0}}>
          Educational tool only · Not financial advice · Not affiliated with any insurer or MAS-licensed entity
        </p>
      </div>

      {/* ── Stale data banner ── */}
      {showStaleBanner && (
        <div style={{background:'#f5ecd9',borderBottom:`1px solid ${C.amber}55`,padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <span style={{fontSize:14}}>⚠️</span>
          <p style={{fontSize:12,color:C.amberText,margin:0}}>
            {scrapeStatus === 'fallback'
              ? 'Could not fetch latest prices from LTA — showing last known prices from cars.json. Figures are indicative only.'
              : lowCoverage
                ? 'LTA price matching looks broken this month (very few cars matched) — showing a mix of live and last-known prices. Figures are indicative only.'
                : `Prices may be outdated — last updated from LTA ${staleDaysAgo === 0 ? 'today' : `${staleDaysAgo} day${staleDaysAgo !== 1 ? 's' : ''} ago`}. Figures are indicative only.`
            }
          </p>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,display:'flex',justifyContent:'center',padding:'32px 16px 80px'}}>
        <div style={{width:'100%',maxWidth:mode==='compare'?1140:660,transition:'max-width 0.4s ease'}}>

          <GaragePanel garage={garage} canSave={calculated && !!rA && canSaveToGarage}
            onSave={handleSaveToGarage} onLoad={handleLoadFromGarage}
            onDelete={handleDeleteFromGarage} onRename={handleRenameInGarage}/>

          {/* INPUT CARD */}
          <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rXL,boxShadow:C.shadowMd,overflow:'hidden',marginBottom:20}}>
            <div style={{padding:'22px 28px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
              <div>
                <div style={{fontSize:C.xs,fontWeight:700,color:C.accent,textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:4}}>Step 1 — Your finances</div>
                <h2 style={{fontFamily:C.fontDisplay,fontSize:22,color:C.primary,lineHeight:1.1}}>Enter your details</h2>
              </div>
              <div style={{display:'flex',background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.r,padding:3}}>
                {['single','compare'].map(m => (
                  <button key={m} type="button" onClick={() => { setMode(m); setCalculated(false) }}
                    aria-pressed={mode===m}
                    style={{padding:'7px 16px',fontSize:C.xs,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer',borderRadius:6,border:'none',fontFamily:C.fontBody,background:mode===m?C.primary:'transparent',color:mode===m?'#fff':C.muted,transition:'all 0.2s',boxShadow:mode===m?'0 2px 8px rgba(27,35,32,0.2)':'none'}}>
                    {m==='single'?'Single Car':'Compare Two'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{padding:'22px 28px 26px'}}>
              <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:18,marginBottom:4}}>
                <MoneyInput id="salary-input" label="Monthly Gross Salary" value={salary} onChange={handleSalary}
                  hint={salaryRaw && parseInt(salaryRaw)>0
                    ? `Take-home after CPF: S$${Math.floor(parseInt(salaryRaw)*0.8).toLocaleString('en-SG')}/mo · 30% limit: S$${Math.floor(parseInt(salaryRaw)*0.8*0.3).toLocaleString('en-SG')}/mo`
                    : 'Your gross income before CPF deductions'}/>
                <MoneyInput id="down-input" label="Cash Downpayment" value={down} onChange={handleDown}
                  hint="More cash above the minimum means a smaller loan and less interest"/>
              </div>
              <div style={{marginTop:18}}>
                <MoneyInput id="debt-input" label="Existing Monthly Debt Payments (optional)" value={existingDebt} onChange={handleExistingDebt}
                  hint="Other loans, credit cards, etc. — counted against the bank's 55% TDSR limit alongside this car's instalment"/>
              </div>

              <SectionDivider label="Your budget range"/>
              <AffordabilityCeilingCard salary={dSalary} down={dDown} tenure={dTenure} existingDebt={dExistingDebt}/>

              <SectionDivider label="Loan tenure"/>
              <div style={{marginBottom:26}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:C.sm,fontWeight:600,color:C.text}}>How many years to repay?</div>
                    {calculated && <div style={{fontSize:C.xs,color:C.muted,marginTop:2}}>Drag to update results live</div>}
                  </div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                    <span style={{fontSize:C.hero,fontFamily:C.fontMono,fontWeight:500,color:C.primary,lineHeight:1}}>{tenure}</span>
                    <span style={{fontSize:C.sm,color:C.muted}}>year{tenure>1?'s':''}</span>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,padding:'0 10px'}}>
                  {[1,2,3,4,5,6,7].map(y => (
                    <button key={y} type="button" onClick={() => setTenure(y)}
                      aria-label={`Set loan tenure to ${y} year${y>1?'s':''}`} aria-pressed={tenure===y}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',background:'none',border:'none',padding:'4px 2px'}}>
                      <div aria-hidden="true" style={{width:1,height:6,background:tenure===y?C.accent:C.border}}/>
                      <span style={{fontSize:C.xs,fontFamily:C.fontMono,color:tenure===y?C.accent:C.faint,fontWeight:tenure===y?700:400}}>{y}</span>
                    </button>
                  ))}
                </div>
                <input type="range" className="zz-slider" min={1} max={7} step={1} value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  aria-label="Loan tenure in years" aria-valuetext={`${tenure} year${tenure>1?'s':''}`}
                  style={{background:'transparent', '--slider-fill': trackStyle}}/>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                  <span style={{fontSize:C.xs,color:C.muted}}>↑ Less total interest</span>
                  <span style={{fontSize:C.xs,color:C.muted}}>Lower monthly payment ↓</span>
                </div>
              </div>

              <SectionDivider label="Choose your car"/>
              <div style={{display:'grid',gridTemplateColumns:mode==='compare'?'minmax(0,1fr) minmax(0,1fr)':'minmax(0,1fr)',gap:28,marginBottom:4}}>
                <div>
                  <div style={{display:'flex',background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.r,padding:3,marginBottom:14,width:'fit-content'}}>
                    {['new','used'].map(cnd => (
                      <button key={cnd} type="button" aria-pressed={conditionA===cnd}
                        onClick={() => { setConditionA(cnd); setCalculated(false) }}
                        style={{padding:'6px 14px',fontSize:C.xs,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',cursor:'pointer',borderRadius:6,border:'none',fontFamily:C.fontBody,background:conditionA===cnd?C.primary:'transparent',color:conditionA===cnd?'#fff':C.muted,transition:'all 0.2s'}}>
                        {cnd==='new'?'New Car':'Used Car'}
                      </button>
                    ))}
                  </div>
                  {conditionA === 'new' ? (
                    <CarPicker value={carA} onChange={c => { setCarA(c); setCustomPriceA(''); setCalculated(false) }} slot="A"
                      ceiling={calcCeiling(dSalary, dDown, dTenure, dExistingDebt)} down={dDown}
                      allCars={allCars} top5Cars={top5Cars}
                      customPrice={customPriceA} onCustomPrice={v => { setCustomPriceA(v); setCalculated(false) }}/>
                  ) : (
                    <>
                      <UsedCarForm slot="A" onChange={c => { setUsedCarA(c); setCalculated(false) }}/>
                      <p style={{marginTop:8,fontSize:'10px',color:C.faint,lineHeight:1.5}}>Used-car inputs aren&apos;t saved to your garage or a shareable link yet — they reset if you leave the page.</p>
                    </>
                  )}
                </div>
                {mode==='compare' && (
                  <div>
                    <div style={{display:'flex',background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.r,padding:3,marginBottom:14,width:'fit-content'}}>
                      {['new','used'].map(cnd => (
                        <button key={cnd} type="button" aria-pressed={conditionB===cnd}
                          onClick={() => { setConditionB(cnd); setCalculated(false) }}
                          style={{padding:'6px 14px',fontSize:C.xs,fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',cursor:'pointer',borderRadius:6,border:'none',fontFamily:C.fontBody,background:conditionB===cnd?C.primary:'transparent',color:conditionB===cnd?'#fff':C.muted,transition:'all 0.2s'}}>
                          {cnd==='new'?'New Car':'Used Car'}
                        </button>
                      ))}
                    </div>
                    {conditionB === 'new' ? (
                      <CarPicker value={carB} onChange={c => { setCarB(c); setCustomPriceB(''); setCalculated(false) }} slot="B"
                        ceiling={calcCeiling(dSalary, dDown, dTenure, dExistingDebt)} down={dDown}
                        allCars={allCars} top5Cars={top5Cars}
                        customPrice={customPriceB} onCustomPrice={v => { setCustomPriceB(v); setCalculated(false) }}/>
                    ) : (
                      <>
                        <UsedCarForm slot="B" onChange={c => { setUsedCarB(c); setCalculated(false) }}/>
                        <p style={{marginTop:8,fontSize:'10px',color:C.faint,lineHeight:1.5}}>Used-car inputs aren&apos;t saved to your garage or a shareable link yet — they reset if you leave the page.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button className="coah-btn-primary" onClick={handleCalc} disabled={!isReady}
                style={{width:'100%',padding:'14px 20px',background:isReady?C.primary:C.bg,border:`1.5px solid ${isReady?C.primary:C.border}`,borderRadius:C.r,color:isReady?'#fff':C.faint,fontSize:C.base,fontWeight:700,letterSpacing:'0.04em',cursor:isReady?'pointer':'not-allowed',transition:'all 0.2s',boxShadow:isReady?'0 4px 16px rgba(27,35,32,0.2)':'none',fontFamily:C.fontBody}}>
                {isReady
                  ? calculated
                    ? `↻  Recalculate${mode==='compare'?' comparison':''}`
                    : mode==='compare'
                      ? `Compare ${effCarA?.short??effCarA?.name} vs ${effCarB?.short??effCarB?.name}  →`
                      : `Check if I can afford the ${effCarA?.short??effCarA?.name}  →`
                  : 'Fill in all fields above to continue'}
              </button>
              {calculated && <p style={{marginTop:8,textAlign:'center',fontSize:C.xs,color:C.muted}}>Results update live as you drag the tenure slider</p>}
              {/* COE used in calculation */}
              <div style={{marginTop:8,padding:'8px 12px',background:C.bg,borderRadius:C.r,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:C.xs,color:C.faint}}>COE used in calculations:</span>
                {coeLoading
                  ? <span style={{fontSize:C.xs,color:C.faint}}>Fetching live COE…</span>
                  : coeData
                    ? <><span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>Cat A: {SGD(coeData.catA.premium)}</span><span style={{fontSize:C.xs,color:C.faint}}>·</span><span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>Cat B: {SGD(coeData.catB.premium)}</span><span style={{fontSize:C.xs,color:C.faint,fontSize:'10px'}}> · {coeData.month} · Live from LTA</span></>
                    : <><span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.amberText}}>Cat A: ~{SGD(COE_FALLBACK.catA)}</span><span style={{fontSize:C.xs,color:C.faint}}>·</span><span style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.amberText}}>Cat B: ~{SGD(COE_FALLBACK.catB)}</span><span style={{fontSize:C.xs,color:C.amberText,fontSize:'10px'}}> · {isCoeFallbackStale() ? `⚠ Stale estimate as of ${COE_FALLBACK_AS_OF}` : `Estimated as of ${COE_FALLBACK_AS_OF} — LTA unavailable`}</span></>
                }
              </div>
              <p style={{marginTop:6,textAlign:'center',fontSize:C.xs,color:C.faint}}>Prices indicative incl. COE · Figures based on latest applicable policies · Educational tool only</p>
            </div>
          </div>

          {/* RESULTS */}
          <div ref={resultsRef}>
            {mode==='single'
              ? <ResultPanel r={rA} tenure={dTenure} visible={!!rA}/>
              : (
                <div>
                  {(rA||rB) && (
                    <div style={{marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                      <span style={{fontSize:C.sm,fontWeight:700,color:C.primary,fontFamily:C.fontDisplay,fontStyle:'italic'}}>Side-by-side comparison</span>
                      {rA&&rB&&rA.monthly&&rB.monthly && (
                        <div style={{display:'flex',alignItems:'center',gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:100,padding:'5px 14px',boxShadow:C.shadow}}>
                          <span style={{fontSize:C.xs,color:C.muted}}>Monthly diff:</span>
                          <span style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color:C.primary}}>{SGD(Math.abs(rA.monthly-rB.monthly))}/mo</span>
                          <span style={{fontSize:C.xs,color:C.accent,fontWeight:600}}>({rA.monthly<rB.monthly?`${rA.car.short} cheaper`:`${rB.car.short} cheaper`})</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:12,alignItems:'start'}}>
                    <ResultPanel r={rA} tenure={dTenure} visible={!!rA} slim/>
                    <ResultPanel r={rB} tenure={dTenure} visible={!!rB} slim/>
                  </div>
                  {rA&&rB&&rA.canDown&&rB.canDown && (
                    <div style={{marginTop:12,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,padding:'20px 24px',boxShadow:C.shadowMd}}>
                      <div style={{fontFamily:C.fontDisplay,fontSize:20,color:C.primary,marginBottom:4}}>Total cost over {dTenure} years</div>
                      <p style={{fontSize:C.sm,color:C.muted,marginBottom:18}}>Downpayment + all monthly instalments combined</p>
                      {[{r:rA,slot:'A',color:C.primary},{r:rB,slot:'B',color:C.blue}].map(({r,slot,color}) => {
                        const maxTco = Math.max(rA.totalCoo, rB.totalCoo)
                        const pct = (r.totalCoo/maxTco)*100
                        const cheaper = r.totalCoo <= Math.min(rA.totalCoo,rB.totalCoo)
                        return (
                          <div key={slot} style={{marginBottom:16}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:7,alignItems:'center'}}>
                              <div style={{display:'flex',alignItems:'center',gap:10}}>
                                <span style={{background:color,color:'#fff',fontSize:C.xs,fontWeight:700,borderRadius:4,padding:'2px 8px',fontFamily:C.fontMono}}>{slot}</span>
                                <span style={{fontSize:C.sm,fontWeight:600,color:C.text}}>{r.car.name}</span>
                                {cheaper && <span style={{fontSize:C.xs,fontWeight:700,color:C.accentText,background:C.accentBg,border:`1px solid ${C.accent}44`,borderRadius:100,padding:'1px 8px'}}>CHEAPER</span>}
                              </div>
                              <span style={{fontSize:C.lg,fontFamily:C.fontMono,fontWeight:700,color}}>{SGD(r.totalCoo)}</span>
                            </div>
                            <div style={{height:8,background:C.bg,borderRadius:4,overflow:'hidden',border:`1px solid ${C.border}`}}>
                              <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:4,transition:'width 1s cubic-bezier(0.16,1,0.3,1) 0.3s'}}/>
                            </div>
                          </div>
                        )
                      })}
                      <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontSize:C.sm,fontWeight:600,color:C.text}}>Choosing {rA.totalCoo<=rB.totalCoo?rA.car.short:rB.car.short} saves you</div>
                          <div style={{fontSize:C.xs,color:C.muted,marginTop:2}}>over the full {dTenure}-year loan period</div>
                        </div>
                        <span style={{fontFamily:C.fontDisplay,fontSize:C.xxl,color:C.accent}}>{SGD(Math.abs(rA.totalCoo-rB.totalCoo))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ── BUILT BY COAH ── */}
      <div style={{padding:'48px 24px',maxWidth:660,margin:'0 auto',width:'100%'}}>
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:'28px 24px',borderTop:`3px solid ${C.coah}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <span style={{fontFamily:C.fontCoah,fontSize:18,fontWeight:600,color:C.coah,letterSpacing:'0.04em'}}>COAH</span>
            <span style={{fontSize:11,color:C.faint,borderLeft:`1px solid ${C.border}`,paddingLeft:10,letterSpacing:'0.06em',textTransform:'uppercase'}}>Modern Utilities for the Common Good</span>
          </div>
          <p style={{fontSize:14,color:C.text,lineHeight:1.7,marginBottom:14}}>
            DriveReady is built by Coah — a collective dedicated to creating transparent, privacy-first tools for Singaporeans. No data is stored on any server. No sales agent will call. No commissions influence the math.
          </p>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.6,fontStyle:'italic',fontFamily:C.fontDisplay}}>&quot;We put the logic on a hill for everyone to see.&quot;</p>
        </div>
      </div>

    </div>
  )
}
