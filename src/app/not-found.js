import Link from 'next/link'
import Button from '@/components/shared/Button'

export const metadata = {
  title: 'Page not found',
}

export default function NotFound() {
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
        color: 'var(--color-accent)',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        404
      </p>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(26px, 5vw, 36px)',
        color: 'var(--color-primary)',
        margin: 0,
      }}>
        That page doesn't add up.
      </h1>
      <p style={{
        fontSize: '15px',
        color: 'var(--color-muted)',
        maxWidth: '420px',
        margin: '0 0 8px',
        lineHeight: 1.6,
      }}>
        Whatever you were looking for isn't here — the link might be old, or the page moved.
      </p>
      <Button href="/">Back to ndtm</Button>
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px' }}>
        <Link href="/insure" style={{ color: 'var(--color-faint)', textDecoration: 'none' }}>Insure</Link>
        <Link href="/drive" style={{ color: 'var(--color-faint)', textDecoration: 'none' }}>Drive</Link>
        <Link href="/etf" style={{ color: 'var(--color-faint)', textDecoration: 'none' }}>Invest</Link>
      </div>
    </div>
  )
}
