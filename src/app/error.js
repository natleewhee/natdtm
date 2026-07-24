'use client'

import Button from '@/components/shared/Button'

export default function Error({ reset }) {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '64px 24px',
      gap: '16px',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: 'var(--color-red-text)',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        Something broke
      </p>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(26px, 5vw, 36px)',
        color: 'var(--color-primary)',
        margin: 0,
      }}>
        The math didn&apos;t work out.
      </h1>
      <p style={{
        fontSize: '15px',
        color: 'var(--color-muted)',
        maxWidth: '420px',
        margin: '0 0 8px',
        lineHeight: 1.6,
      }}>
        Something went wrong loading this page. Your inputs weren&apos;t sent anywhere — try again, or head back home.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="dark" onClick={() => reset()}>Try again</Button>
        <Button href="/">Back to ndtm</Button>
      </div>
    </div>
  )
}
