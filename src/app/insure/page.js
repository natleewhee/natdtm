'use client'

import { SITE_URL } from '@/lib/shared/site'

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

      {/* Nav */}
      <nav style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontFamily: 'var(--font-coah)',
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--color-coah)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}>
            Coah
          </span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            color: 'var(--color-primary)',
            lineHeight: 1,
          }}>
            InsureCheck
          </span>
        </div>
        <a href="#how-it-works" style={{
          fontSize: '14px',
          color: 'var(--color-primary)',
          textDecoration: 'none',
          opacity: 0.6,
        }}>
          How it works
        </a>
      </nav>

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
          fontSize: 'clamp(30px, 6vw, 46px)',
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

        <a href="/insure/check" style={{
          display: 'inline-block',
          padding: '16px 40px',
          background: 'var(--color-accent)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          fontSize: '16px',
          fontWeight: '600',
          textDecoration: 'none',
          letterSpacing: '0.01em',
        }}>
          Check my score — it&apos;s free
        </a>

        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {[
            'No sign-up',
            'No data stored',
            'Not affiliated with any insurer',
          ].map(badge => (
            <span key={badge} style={{
              fontSize: '12px',
              color: 'var(--color-faint)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: '700' }}>✓</span> {badge}
            </span>
          ))}
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
                  color: '#fff',
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

      {/* Built by Coah */}
      <section style={{ padding: '48px 24px', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          padding: '28px 24px',
          borderTop: '3px solid var(--color-coah)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
          }}>
            <span style={{
              fontFamily: 'var(--font-coah)',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--color-coah)',
              letterSpacing: '0.04em',
            }}>
              COAH
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--color-faint)',
              borderLeft: '1px solid var(--color-border)',
              paddingLeft: '10px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Modern Utilities for the Common Good
            </span>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text)',
            lineHeight: 1.7,
            margin: '0 0 14px',
          }}>
            InsureCheck is built by Coah — a collective dedicated to creating transparent,
            privacy-first tools for Singaporeans. No data is stored on any server.
            No agents will call. No commissions influence the math.
          </p>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-muted)',
            lineHeight: 1.6,
            margin: '0 0 16px',
            fontStyle: 'italic',
          }}>
            &quot;We put the logic on a hill for everyone to see.&quot;
          </p>

        </div>
      </section>

      {/* Secondary CTA */}
      <section style={{ padding: '8px 24px 56px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          color: 'var(--color-primary)',
          margin: '0 0 8px',
          lineHeight: 1.3,
        }}>
          Know before you buy. Check before you commit.
        </p>
        <p style={{ color: 'var(--color-faint)', fontSize: '14px', margin: '0 0 28px' }}>
          Takes 3 minutes. No sign-up required.
        </p>
        <a href="/insure/check" style={{
          display: 'inline-block',
          padding: '14px 36px',
          border: '2px solid var(--color-primary)',
          color: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          fontSize: '15px',
          fontWeight: '600',
          textDecoration: 'none',
        }}>
          Check my score — free
        </a>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-coah)',
      }}>
        <div style={{ padding: '28px 24px', maxWidth: '520px', margin: '0 auto' }}>

          {/* Coah wordmark row */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '20px',
          }}>
            <div>
              <span style={{
                fontFamily: 'var(--font-coah)',
                fontSize: '22px',
                fontWeight: '600',
                color: '#ffffff',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '4px',
              }}>
                COAH
              </span>
              <span style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Modern Utilities for the Common Good
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                margin: '0 0 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Built for Singapore
              </p>
              <a href="#" style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
              }}>
                coah.sg
              </a>
            </div>
          </div>

          {/* More from Coah */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '16px',
            marginBottom: '20px',
          }}>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              More from Coah
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { name: 'DriveReady', desc: 'Car ownership costs',    url: '/drive', active: true },
                { name: 'WhatETF',   desc: 'ETF portfolio examples', url: '/etf',   active: true },
              ].map(tool => (
                <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  textDecoration: 'none',
                }}>
                  <p style={{
                    margin: '0 0 2px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#ffffff',
                  }}>
                    {tool.name}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    {tool.desc}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '16px',
          }}>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              lineHeight: 1.6,
              margin: '0 0 6px',
            }}>
              This tool is for educational purposes only and does not constitute financial advice.
              Coverage benchmarks are based on general Singapore financial planning guidelines.
              Please consult a MAS-licensed financial adviser for personal recommendations.
            </p>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
              margin: '0 0 8px',
            }}>
              Not affiliated with any insurer or MAS-licensed entity.
            </p>
            <a href="/insure/the-math" style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textDecoration: 'none',
            }}>{'How we calculate your score \u2192'}</a>
          </div>

        </div>
      </footer>

    </main>
  )
}
