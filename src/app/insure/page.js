'use client'

import { SITE_URL } from '@/lib/shared/site'
import ShellHeader from '@/components/shared/ShellHeader'
import TrustBadges from '@/components/shared/TrustBadges'
import Button from '@/components/shared/Button'

export default function LandingPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "InsureCheck by Coah",
            "url": SITE_URL,
            "description": "Free insurance coverage checker for Singaporeans. Get your Insurance Score in 3 minutes.",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "SGD"
            },
            "audience": {
              "@type": "Audience",
              "geographicArea": {
                "@type": "Country",
                "name": "Singapore"
              }
            }
          })
        }}
      />

      <ShellHeader links={[{ href: '#how-it-works', label: 'How it works' }]} />

      {/* Hero */}
      <section style={{
        padding: '72px 24px 56px',
        maxWidth: '560px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <h1 style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}>
          Free Insurance Coverage Checker Singapore — InsureCheck by Coah
        </h1>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(30px, 5.5vw, 48px)',
          color: 'var(--color-primary)',
          lineHeight: 1.2,
          margin: '0 0 16px',
        }}>
          You probably have insurance. But do you actually know what it covers?
        </h2>

        <p style={{
          fontSize: '17px',
          color: 'var(--color-muted)',
          lineHeight: 1.7,
          margin: '0 0 32px',
        }}>
          InsureCheck scores your coverage in 3 minutes — free, neutral, no agent involved.
        </p>

        <Button href="/insure/check">
          Check my score — it&apos;s free
        </Button>

        <div style={{ marginTop: '20px' }}>
          <TrustBadges items={['No sign-up', 'No data stored', 'Not affiliated with any insurer']} />
        </div>
      </section>

      {/* Social proof */}
      <section style={{
        padding: '20px 24px 32px',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: '15px',
          color: 'var(--color-muted)',
          lineHeight: 1.6,
          margin: 0,
          fontStyle: 'italic',
          borderLeft: '3px solid var(--color-accent)',
          paddingLeft: '16px',
          textAlign: 'left',
        }}>
          1 in 3 Singaporeans are underinsured without knowing it. Are you one of them?
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{
        padding: '48px 24px',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            color: 'var(--color-primary)',
            textAlign: 'center',
            margin: '0 0 36px',
          }}>
            How it works
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {[
              {
                step: '1',
                title: 'Tell us what you have',
                body: '5 quick questions about your policies. Takes under 3 minutes.',
              },
              {
                step: '2',
                title: 'We run the numbers',
                body: 'Your coverage is benchmarked against Singapore financial planning standards — not a generic template.',
              },
              {
                step: '3',
                title: 'See exactly where you stand',
                body: 'Gaps, overpayment, and what to do next — laid out clearly, without the sales pitch.',
              },
            ].map(({ step, title, body }) => (
              <div key={step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0,
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  color: 'var(--l-accent-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '15px',
                }}>
                  {step}
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: '600', color: 'var(--color-primary)', fontSize: '15px' }}>
                    {title}
                  </p>
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing line — the brand signature + privacy claims live once in the
          shell Footer; the home page doesn't repeat the Coah card or a second
          CTA (the hero CTA + sticky header already carry the action). */}
      <section style={{ padding: '48px 24px 56px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          color: 'var(--color-primary)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          Know before you buy. Check before you commit.
        </p>
      </section>

    </main>
  )
}
