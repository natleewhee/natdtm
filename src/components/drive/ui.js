'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/drive/theme'
import { useCountUp } from '@/lib/drive/hooks'

export function StatBox({ label, value, sub, accent, delay=0, visible }) {
  const num = parseInt(String(value).replace(/\D/g,''), 10) || 0
  const animated = useCountUp(visible ? num : 0, 900, delay + 200)
  const [in_, setIn] = useState(false)
  // Reset synchronously during render on the visible->false transition (see
  // "Adjusting state when a prop changes"); the effect only owns the async
  // "fade in after delay" schedule, never a synchronous setState. Uses state
  // (not a ref) to track the previous value, since refs must not be
  // read/written during render.
  const [prevVisible, setPrevVisible] = useState(visible)
  if (prevVisible !== visible) {
    setPrevVisible(visible)
    if (!visible && in_) setIn(false)
  }
  useEffect(() => {
    if (visible) { const t = setTimeout(() => setIn(true), delay); return () => clearTimeout(t) }
  }, [visible, delay])
  const pre = String(value).startsWith('S$') ? 'S$' : ''
  return (
    <div style={{background:accent?C.accentBg:C.bg,border:`1.5px solid ${accent?C.accent:C.border}`,borderRadius:C.r,padding:'14px 16px',opacity:in_?1:0,transform:in_?'translateY(0)':'translateY(8px)',transition:'opacity 0.4s,transform 0.4s'}}>
      <div style={{fontSize:C.xs,fontWeight:700,color:accent?C.accentText:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{label}</div>
      <div style={{fontSize:C.xl,fontFamily:C.fontMono,fontWeight:500,color:accent?C.accent:C.primary,lineHeight:1,marginBottom:sub?4:0}}>{pre}{animated.toLocaleString('en-SG')}</div>
      {sub && <div style={{fontSize:C.xs,color:C.muted}}>{sub}</div>}
    </div>
  )
}

export function GaugeBar({ ratio, visible }) {
  const pct = Math.min(ratio * 100, 100)
  const color = pct<=30 ? C.accent : pct<=45 ? C.amber : C.red
  const label = pct<=30 ? 'Comfortable' : pct<=45 ? 'Getting stretched' : 'Too high'
  const [w, setW] = useState(0)
  const [prevVisible, setPrevVisible] = useState(visible)
  if (prevVisible !== visible) {
    setPrevVisible(visible)
    if (!visible && w !== 0) setW(0)
  }
  useEffect(() => {
    if (visible) { const t = setTimeout(() => setW(pct), 200); return () => clearTimeout(t) }
  }, [visible, pct])
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontSize:C.sm,color:C.muted,fontWeight:500}}>Monthly burden on take-home pay</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color}}>{pct.toFixed(1)}%</span>
          <span style={{fontSize:C.xs,color,fontWeight:700,background:pct<=30?C.accentBg:pct<=45?C.amberBg:C.redBg,border:`1px solid ${color}55`,borderRadius:100,padding:'2px 10px'}}>{label}</span>
        </div>
      </div>
      <div style={{height:8,background:C.bg,borderRadius:4,overflow:'hidden',position:'relative',border:`1px solid ${C.border}`}}>
        <div style={{position:'absolute',left:'30%',top:0,bottom:0,width:1,background:`${C.accent}60`}}/>
        <div style={{position:'absolute',left:'45%',top:0,bottom:0,width:1,background:`${C.amber}60`}}/>
        <div style={{height:'100%',width:`${w}%`,background:`linear-gradient(90deg,${C.accent} 0%,${C.accent} 30%,${C.amber} 45%,${C.red} 70%)`,borderRadius:4,transition:'width 1.2s cubic-bezier(0.16,1,0.3,1)'}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
        <span style={{fontSize:C.xs,color:C.accent,fontWeight:600}}>Safe ≤ 30%</span>
        <span style={{fontSize:C.xs,color:C.amberText,fontWeight:600}}>Stretch ≤ 45%</span>
        <span style={{fontSize:C.xs,color:C.red,fontWeight:600}}>Too high &gt; 45%</span>
      </div>
    </div>
  )
}
