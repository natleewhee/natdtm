'use client'

import { useState } from 'react'
import { C, SGD } from '@/lib/drive/theme'

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function verdictColor(verdict) {
  if (verdict === 'Affordable') return C.accent
  if (verdict === 'Stretch') return C.amber
  return C.red
}

function EntryRow({ entry, onLoad, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(entry.name)
  const cars = [entry.summary?.carA, entry.summary?.carB].filter(Boolean)
  return (
    <div style={{padding:'12px 14px',border:`1px solid ${C.border}`,borderRadius:C.r,background:C.bg,marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:8}}>
        {editing ? (
          <input
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={() => { onRename(entry.id, nameDraft.trim() || entry.name); setEditing(false) }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setNameDraft(entry.name); setEditing(false) } }}
            autoFocus
            aria-label="Scenario name"
            style={{flex:1,fontSize:C.sm,fontWeight:700,color:C.primary,border:`1px solid ${C.accent}`,borderRadius:6,padding:'4px 8px',fontFamily:C.fontBody,outline:'none'}}
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)}
            style={{flex:1,textAlign:'left',fontSize:C.sm,fontWeight:700,color:C.primary,background:'none',border:'none',cursor:'text',padding:0}}
            aria-label={`Rename scenario "${entry.name}"`}>
            {entry.name}
          </button>
        )}
        <span style={{fontSize:'10px',color:C.faint,flexShrink:0}}>{timeAgo(entry.savedAt)}</span>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
        {cars.map((c, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:C.xs,background:C.surface,border:`1px solid ${C.border}`,borderRadius:100,padding:'3px 10px'}}>
            <span style={{color:C.text,fontWeight:600}}>{c.name}</span>
            <span style={{color:C.faint}}>·</span>
            <span style={{fontFamily:C.fontMono,color:C.primary,fontWeight:700}}>{SGD(c.monthly)}/mo</span>
            <span style={{color:verdictColor(c.verdict),fontWeight:700,fontSize:'10px'}}>{c.verdict}</span>
            {c.tdsrExceeded && <span style={{color:C.red,fontWeight:700,fontSize:'10px'}} title="Exceeds the bank's 55% TDSR limit">⚠ TDSR</span>}
          </div>
        ))}
        {cars.length === 0 && <span style={{fontSize:C.xs,color:C.faint}}>No result saved for this scenario</span>}
      </div>
      <div style={{display:'flex',gap:8}}>
        <button type="button" onClick={() => onLoad(entry)}
          style={{fontSize:C.xs,fontWeight:700,color:'#fff',background:C.ndtm,border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer'}}>
          Load
        </button>
        <button type="button" onClick={() => onDelete(entry.id)} aria-label={`Delete scenario "${entry.name}"`}
          style={{fontSize:C.xs,fontWeight:700,color:C.red,background:'none',border:`1px solid ${C.red}44`,borderRadius:6,padding:'6px 12px',cursor:'pointer'}}>
          Delete
        </button>
      </div>
    </div>
  )
}

function CompareTable({ entries }) {
  // One row per car across every saved entry, sorted cheapest total-cost-of-ownership first.
  const rows = []
  for (const entry of entries) {
    for (const car of [entry.summary?.carA, entry.summary?.carB].filter(Boolean)) {
      rows.push({ entryName: entry.name, ...car })
    }
  }
  if (rows.length < 2) return null
  rows.sort((a, b) => a.totalCoo - b.totalCoo)
  const cheapest = rows[0]?.totalCoo
  return (
    <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
      <div style={{fontSize:C.xs,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Compare all saved cars, cheapest first</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {rows.map((row, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'8px 10px',background:row.totalCoo===cheapest?C.accentBg:C.bg,border:`1px solid ${row.totalCoo===cheapest?C.accent:C.border}`,borderRadius:C.r}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:C.xs,fontWeight:700,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.name}</div>
              <div style={{fontSize:'10px',color:C.faint}}>from &quot;{row.entryName}&quot; · {row.verdict}{row.tdsrExceeded ? ' · ⚠ exceeds TDSR' : ''}</div>
            </div>
            <span style={{fontSize:C.sm,fontFamily:C.fontMono,fontWeight:700,color:row.totalCoo===cheapest?C.accentText:C.primary,flexShrink:0}}>{SGD(row.totalCoo)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GaragePanel({ garage, canSave, onSave, onLoad, onDelete, onRename }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{display:'flex',alignItems:'center',gap:6,fontSize:C.xs,fontWeight:700,color:C.primary,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:100,padding:'6px 14px',cursor:'pointer'}}>
          🚗 My Garage {garage.length > 0 && `(${garage.length})`}
          <span aria-hidden="true" style={{fontSize:'10px',transition:'transform 0.2s',transform:open?'rotate(180deg)':'none'}}>▾</span>
        </button>
        {canSave && (
          <button type="button" onClick={onSave}
            style={{fontSize:C.xs,fontWeight:700,color:C.accent,background:C.accentBg,border:`1.5px solid ${C.accent}55`,borderRadius:100,padding:'6px 14px',cursor:'pointer'}}>
            💾 Save this scenario
          </button>
        )}
      </div>
      {open && (
        <div style={{marginTop:12,padding:'16px 18px',background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:C.rL,boxShadow:C.shadow}}>
          {garage.length === 0 ? (
            <p style={{fontSize:C.sm,color:C.muted,textAlign:'center',padding:'12px 0'}}>
              No saved scenarios yet. Calculate a car above, then &quot;Save this scenario&quot; to build up a comparison list.
            </p>
          ) : (
            <>
              {garage.map(entry => (
                <EntryRow key={entry.id} entry={entry} onLoad={onLoad} onDelete={onDelete} onRename={onRename}/>
              ))}
              <CompareTable entries={garage}/>
            </>
          )}
        </div>
      )}
    </div>
  )
}
