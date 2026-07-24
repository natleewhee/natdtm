'use client'

import { useState, useEffect } from 'react'
import { C, SGD } from '@/lib/drive/theme'

export function OwnershipCurve({ coo, tenure, visible }) {
  const [in_, setIn] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [hoveredYear, setHoveredYear] = useState(null)

  const [prevVisible, setPrevVisible] = useState(visible)
  if (prevVisible !== visible) {
    setPrevVisible(visible)
    if (!visible) { setIn(false); setShowDetail(false); setHoveredYear(null) }
  }
  useEffect(() => {
    if (visible) { const t = setTimeout(() => setIn(true), 450); return () => clearTimeout(t) }
  }, [visible])

  if (!coo || coo.length === 0) return null
  // Guard against NaN values which crash SVG rendering
  const hasNaN = coo.some(d => isNaN(d.cashOut) || isNaN(d.paperValue))
  if (hasNaN) return (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,padding:24,marginBottom:14,textAlign:'center'}}>
      <span style={{fontSize:C.sm,color:C.muted}}>Ownership curve unavailable — check car data.</span>
    </div>
  )

  const finalYear = coo[coo.length - 1]
  const totalPaid = finalYear.cashOut
  const recovery  = finalYear.paperValue
  const sunkCost  = finalYear.sunkCost

  // SVG chart dimensions
  const W = 440, H = 120, padL = 8, padR = 8, padT = 10, padB = 20
  const cW = W - padL - padR, cH = H - padT - padB
  const maxY = Math.max(...coo.map(d => d.cashOut))
  const minY = Math.min(...coo.map(d => d.paperValue), 0)
  const range = maxY - minY || 1

  const toX = i => padL + (i / (coo.length - 1)) * cW
  const toY = v => padT + cH - ((v - minY) / range) * cH

  const cashPts  = coo.map((d, i) => `${toX(i)},${toY(d.cashOut)}`).join(' ')
  const paperPts = coo.map((d, i) => `${toX(i)},${toY(d.paperValue)}`).join(' ')

  // Area between the two lines (sunk cost zone)
  const topPath    = `M ${cashPts.split(' ').join(' L ')}`
  const bottomPath = `L ${paperPts.split(' ').reverse().join(' L ')}`
  const areaPath   = `${topPath} ${bottomPath} Z`

  const hovered = hoveredYear !== null ? coo[hoveredYear - 1] : null

  return (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,overflow:'hidden',marginBottom:14,opacity:in_?1:0,transform:in_?'translateY(0)':'translateY(8px)',transition:'opacity 0.5s 0.4s,transform 0.5s 0.4s',boxShadow:C.shadow}}>

      {/* Header */}
      <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,background:C.bg,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:C.xs,fontWeight:700,color:C.primary,textTransform:'uppercase',letterSpacing:'0.1em'}}>Cost of Ownership</span>
        <span style={{fontSize:C.xs,color:C.faint}}>Over {tenure} year{tenure>1?'s':''}</span>
      </div>

      {/* Three key numbers */}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',borderBottom:`1px solid ${C.border}`}}>
        {[
          { label:'Total paid',     value:SGD(totalPaid), color:C.primary,  sub:'Cash out by end of loan' },
          { label:'You recover',    value:SGD(recovery),  color:C.accent,   sub:'PARF + COE rebate' },
          { label:'True cost',      value:SGD(sunkCost),  color:C.red,      sub:'Money gone forever' },
        ].map((item, i) => (
          <div key={i} style={{padding:'14px 16px',borderRight:i<2?`1px solid ${C.border}`:'none',background:i===2?C.redBg+'44':'transparent'}}>
            <div style={{fontSize:C.xs,color:C.muted,marginBottom:4,lineHeight:1.3}}>{item.label}</div>
            <div style={{fontSize:C.lg,fontFamily:C.fontMono,fontWeight:700,color:item.color,lineHeight:1}}>{item.value}</div>
            <div style={{fontSize:'10px',color:C.faint,marginTop:3}}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* SVG Ownership Curve */}
      <div style={{padding:'16px 18px 8px',position:'relative'}}
        onMouseLeave={() => setHoveredYear(null)}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible',display:'block'}}>
          {/* Grid lines */}
          {[0.25,0.5,0.75].map(p => (
            <line key={p} x1={padL} x2={padL+cW} y1={padT+cH*p} y2={padT+cH*p}
              stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
          ))}
          {/* Sunk cost area */}
          <path d={areaPath} fill={`${C.red}18`}/>
          {/* Paper value line (teal) */}
          <polyline points={paperPts} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Cash out line (navy) */}
          <polyline points={cashPts}  fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Hover dots + vertical line */}
          {hovered && (() => {
            const i = hovered.year - 1
            const x = toX(i)
            return <>
              <line x1={x} x2={x} y1={padT} y2={padT+cH} stroke={C.border} strokeWidth="1" strokeDasharray="3,2"/>
              <circle cx={x} cy={toY(hovered.cashOut)}  r="4" fill={C.primary} stroke="#fff" strokeWidth="2"/>
              <circle cx={x} cy={toY(hovered.paperValue)} r="4" fill={C.accent}  stroke="#fff" strokeWidth="2"/>
            </>
          })()}
          {/* Invisible hover targets */}
          {coo.map((d, i) => (
            <rect key={i} x={toX(i) - (cW/coo.length/2)} y={padT} width={cW/coo.length} height={cH}
              fill="transparent" style={{cursor:'pointer'}}
              onMouseEnter={() => setHoveredYear(d.year)}/>
          ))}
          {/* Year labels */}
          {coo.filter((_, i) => i === 0 || (i+1) % Math.ceil(tenure/4) === 0 || i === coo.length-1).map(d => {
            const i = d.year - 1
            return <text key={i} x={toX(i)} y={H-4} textAnchor="middle" fontSize="9" fill={C.muted}>Yr {d.year}</text>
          })}
        </svg>

        {/* Legend */}
        <div style={{display:'flex',gap:16,marginTop:4}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:16,height:2,background:C.primary,borderRadius:1}}/>
            <span style={{fontSize:'10px',color:C.muted}}>Cash out</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:16,height:2,background:C.accent,borderRadius:1}}/>
            <span style={{fontSize:'10px',color:C.muted}}>Recovery value</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:12,height:8,background:`${C.red}30`,borderRadius:2,border:`1px solid ${C.red}44`}}/>
            <span style={{fontSize:'10px',color:C.muted}}>True cost (gap)</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div style={{margin:'0 18px 12px',padding:'10px 14px',background:C.bg,borderRadius:C.r,border:`1px solid ${C.border}`,display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',gap:8}}>
          <div>
            <div style={{fontSize:'10px',color:C.muted,marginBottom:2}}>Year {hovered.year}</div>
            <div style={{fontSize:C.sm,fontWeight:700,color:C.primary,fontFamily:C.fontMono}}>{SGD(hovered.cashOut)}</div>
            <div style={{fontSize:'10px',color:C.faint}}>cash out</div>
          </div>
          <div>
            <div style={{fontSize:'10px',color:C.muted,marginBottom:2}}>Recovery</div>
            <div style={{fontSize:C.sm,fontWeight:700,color:C.accent,fontFamily:C.fontMono}}>{SGD(hovered.paperValue)}</div>
            <div style={{fontSize:'10px',color:C.faint}}>if scrapped now</div>
          </div>
          <div>
            <div style={{fontSize:'10px',color:C.muted,marginBottom:2}}>True cost</div>
            <div style={{fontSize:C.sm,fontWeight:700,color:hovered.sunkCost<0?C.accent:C.red,fontFamily:C.fontMono}}>{SGD(Math.abs(hovered.sunkCost))}</div>
            <div style={{fontSize:'10px',color:C.faint}}>{hovered.sunkCost<0?'still net positive':'sunk so far'}</div>
          </div>
        </div>
      )}

      {/* Expandable detail */}
      <div style={{borderTop:`1px solid ${C.border}`}}>
        <button type="button" onClick={() => setShowDetail(d => !d)} aria-expanded={showDetail}
          style={{width:'100%',padding:'10px 18px',background:'transparent',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:C.fontBody}}>
          <span style={{fontSize:C.xs,color:C.muted}}>Show year-by-year breakdown</span>
          <span aria-hidden="true" style={{fontSize:C.xs,color:C.faint,transition:'transform 0.2s',transform:showDetail?'rotate(180deg)':'none'}}>▾</span>
        </button>
        {showDetail && (
          <div style={{padding:'4px 18px 14px',animation:'expandDown 0.2s ease forwards'}}>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(tenure,7)}, minmax(0,1fr))`,gap:6}}>
              {coo.map(d => (
                <div key={d.year} style={{background:C.bg,borderRadius:C.r,padding:'8px 10px',border:`1px solid ${C.border}`,textAlign:'center'}}>
                  <div style={{fontSize:'10px',color:C.faint,marginBottom:4}}>Yr {d.year}</div>
                  <div style={{fontSize:C.xs,fontFamily:C.fontMono,fontWeight:700,color:C.primary,marginBottom:2}}>{SGD(d.cashOut)}</div>
                  <div style={{fontSize:'10px',color:C.accent,marginBottom:2}}>{SGD(d.paperValue)} back</div>
                  <div style={{fontSize:'10px',fontWeight:700,color:d.sunkCost<0?C.accent:C.red}}>{d.sunkCost<0?'net +':'net -'}{SGD(Math.abs(d.sunkCost))}</div>
                </div>
              ))}
            </div>
            <p style={{fontSize:'10px',color:C.faint,margin:'8px 0 0',lineHeight:1.5}}>
              &quot;Recovery value&quot; = PARF rebate + unused COE months. &quot;True cost&quot; = cash out minus recovery. Negative true cost in early years means you&apos;d recover more than you&apos;ve paid out — not a profit, but the loan still has to be repaid.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
