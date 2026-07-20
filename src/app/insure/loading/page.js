'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateScore, generateInsights } from '@/lib/insure/engine/scorer'
import { appendScoreHistory } from '@/lib/insure/scoreHistory'

const MESSAGES = [
  'Checking your coverage gaps…',
  'Comparing against Singapore benchmarks…',
  'Calculating your Insurance Score…',
]

export default function LoadingPage() {
  const router = useRouter()
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('iga_inputs')
      if (!raw) { router.push('/insure/check'); return }
      const inputs = JSON.parse(raw)
  
      // Save previous score before overwriting
      try {
        const prevRaw = sessionStorage.getItem('iga_result')
        if (prevRaw) {
          const prev = JSON.parse(prevRaw)
          const prevScore = prev?.result?.finalScore
          if (typeof prevScore === 'number') {
            sessionStorage.setItem('iga_prev_score', String(prevScore))
          }
        }
      } catch {}
  
      const result = calculateScore(inputs)
      const insights = generateInsights(result)
      sessionStorage.setItem('iga_result', JSON.stringify({ result, insights }))
      appendScoreHistory(result.finalScore)
    } catch {
      router.push('/insure/check')
      return
    }

    // Cycle through messages
    const t1 = setTimeout(() => setMsgIndex(1), 700)
    const t2 = setTimeout(() => setMsgIndex(2), 1400)
    const t3 = setTimeout(() => router.push('/insure/results'), 2200)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      gap: '32px',
    }}>
      {/* Pulsing ring */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        border: '3px solid var(--color-accent)',
        borderTopColor: 'transparent',
        animation: 'spin 0.9s linear infinite',
      }} />

      <p key={msgIndex} style={{
        fontSize: '16px',
        color: 'var(--color-primary)',
        fontWeight: '500',
        animation: 'fadeSlideUp 0.3s ease both',
      }}>
        {MESSAGES[msgIndex]}
      </p>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}