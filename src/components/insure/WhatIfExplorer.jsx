'use client'

import { useState } from 'react'
import { LIFE_EVENT_PRESETS, simulateLifeEvents, formatSGD } from '@/lib/insure/engine/scorer'

function TargetDelta({ label, before, after }) {
  if (before === after) return null
  const up = after > before
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0' }}>
      <span style={{ color: 'var(--color-muted)' }}>{label} target</span>
      <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
        {formatSGD(before)} <span style={{ color: 'var(--color-faint)' }}>→</span> {formatSGD(after)}
        <span style={{ color: up ? 'var(--color-red-text)' : 'var(--color-green-text)', marginLeft: '6px' }}>
          {up ? '↑' : '↓'}
        </span>
      </span>
    </div>
  )
}

export default function WhatIfExplorer({ inputs }) {
  const [activeIds, setActiveIds] = useState([])

  const sim = activeIds.length > 0 ? simulateLifeEvents(inputs, activeIds) : null

  function toggle(id) {
    setActiveIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '20px',
        color: 'var(--color-primary)',
        margin: '0 0 2px',
        fontWeight: '400',
      }}>
        What changes if…
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-faint)', margin: '0 0 12px' }}>
        Tap one or more life events to see how they&apos;d shift your score together — nothing here is saved.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: sim ? '12px' : 0 }}>
        {LIFE_EVENT_PRESETS.map(preset => {
          const active = activeIds.includes(preset.id)
          return (
            <button
              key={preset.id}
              onClick={() => toggle(preset.id)}
              aria-pressed={active}
              style={{
                padding: '8px 14px',
                borderRadius: '100px',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                color: active ? 'var(--l-accent-ink)' : 'var(--color-primary)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {sim && (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          padding: '16px 18px',
          animation: 'fadeSlideUp 0.2s ease both',
        }}>
          {sim.presets.map(preset => (
            <p key={preset.id} style={{ fontSize: '12px', color: 'var(--color-faint)', margin: '0 0 4px' }}>
              <strong style={{ color: 'var(--color-primary)' }}>{preset.label}:</strong> {preset.description}
            </p>
          ))}

          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            paddingBottom: '10px',
            marginTop: '10px',
            marginBottom: '4px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Score:</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
              {sim.before.finalScore}
            </span>
            <span style={{ color: 'var(--color-faint)' }}>→</span>
            <span style={{
              fontSize: '20px',
              fontWeight: '700',
              color: sim.after.finalScore >= sim.before.finalScore ? 'var(--color-green-text)' : 'var(--color-red-text)',
            }}>
              {sim.after.finalScore}
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: sim.after.finalScore >= sim.before.finalScore ? 'var(--color-green-text)' : 'var(--color-red-text)',
              marginLeft: 'auto',
            }}>
              {sim.after.finalScore >= sim.before.finalScore ? '+' : ''}
              {sim.after.finalScore - sim.before.finalScore} pts
            </span>
          </div>

          <TargetDelta
            label="Critical illness"
            before={sim.before.pillars.resilience.ci.target}
            after={sim.after.pillars.resilience.ci.target}
          />
          <TargetDelta
            label="Life / TPD"
            before={sim.before.pillars.life.target}
            after={sim.after.pillars.life.target}
          />

          <p style={{ fontSize: '11px', color: 'var(--color-faint)', margin: '10px 0 0', lineHeight: 1.5 }}>
            This is a simulation based on your current inputs — it doesn&apos;t change your saved score.
            {sim.presets.length > 1 && ' Combined events apply in order, so a later one can override an earlier one on the same field (e.g. paying off loans after buying a home nets to zero debt).'}
          </p>
        </div>
      )}
    </div>
  )
}
