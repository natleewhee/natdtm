import ShellHeader from '@/components/shared/ShellHeader'
import ToolIcon from '@/components/shared/ToolIcon'
import HomeDashboard from '@/components/shared/dashboard/HomeDashboard'
import { TOOLS, toolCountWord } from '@/lib/shared/tools'

export default function HomePage() {
  return (
    <>
    <ShellHeader />
    <div className="shell-wrap" style={{ padding: '56px 24px 80px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px',
        borderRadius: 999, background: 'var(--color-accent-bg)', marginBottom: 20,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)' }} />
        <span style={{
          fontFamily: 'var(--l-font-mono)', fontSize: 11, letterSpacing: '.06em',
          color: 'var(--color-accent-text)',
        }}>
          {toolCountWord()} calculators, one household
        </span>
      </div>
      <h1 style={{
        fontFamily: 'var(--l-font-display)', fontWeight: 600, fontSize: 'clamp(28px,4vw,42px)',
        lineHeight: 1.1, letterSpacing: '-0.01em', margin: '0 0 16px', maxWidth: '18ch',
      }}>
        The math behind your biggest Singapore money decisions.
      </h1>
      <p style={{ color: 'var(--l-sub)', maxWidth: '58ch', fontSize: 16, margin: '0 0 32px' }}>
        No accounts, no upsells. Each tool shows exactly how it got to its answer —
        pick the decision you&apos;re facing.
      </p>

      <HomeDashboard />

      <h2 className="home-tools-title" id="tools">All tools</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {TOOLS.map((t) => (
          <a key={t.id} href={t.route} className="home-tool-card">
            <div className="home-tool-icon">
              <ToolIcon id={t.id} />
            </div>
            <p style={{ fontFamily: 'var(--l-font-display)', fontWeight: 600, fontSize: 19, margin: '0 0 8px' }}>
              {t.name}
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--l-sub)', margin: '0 0 18px', lineHeight: 1.5 }}>
              {t.desc}
            </p>
            <span className="home-tool-cta">the math →</span>
          </a>
        ))}
      </div>
    </div>
    </>
  )
}
