'use client'

import { useState } from 'react'
import { C } from '@/lib/shared/theme'
import { SGD, parseMoneyOrNull } from '@/lib/shared/money'
import { optimiseReliefs, LEVER_INFO, LEVERS } from '@/lib/tax/optimise'
import { SRS_RETIREMENT_AGE } from '@/lib/retire/srs'
import { MoneyInput, Segmented, Toggle } from '@/components/shared/inputs'
import ExploreSection from '@/components/shared/ExploreSection'

const pct = (r) => `${Math.round(r * 1000) / 10}%`

function Heading({ children }) {
  return (
    <div style={{ fontSize: C.xs, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

/**
 * "Put spare cash to work on this year's bill": allocates a lump of cash
 * across SRS and CPF cash top-ups in the person's chosen order and prices
 * each step. States facts only; the order is the person's own choice.
 */
export default function ReliefsOptimiser({ inputs, tax }) {
  const [spare, setSpare] = useState('')
  const [priority, setPriority] = useState('access')
  const [levers, setLevers] = useState({ srs: true, cpfMa: true, cpfRa: true, cpfFamily: false })
  const [maRoom, setMaRoom] = useState('')
  const [raRoom, setRaRoom] = useState('')

  if (!(tax > 0)) return null

  const spareNum = parseMoneyOrNull(spare) ?? 0
  const r = optimiseReliefs(inputs, {
    spare: spareNum, priority, levers,
    maRoom: parseMoneyOrNull(maRoom), raRoom: parseMoneyOrNull(raRoom),
  })
  const available = inputs.isForeigner ? ['srs'] : LEVERS
  const totalRoom = Math.min(
    r.capacity.capHeadroom,
    (levers.srs ? r.capacity.srs : 0)
      + Math.min(r.capacity.cpfSelf, (levers.cpfMa ? r.capacity.cpfMa : 0) + (levers.cpfRa ? r.capacity.cpfRa : 0))
      + (levers.cpfFamily ? r.capacity.cpfFamily : 0),
  )

  return (
    <section aria-labelledby="optimiser-title" style={{ marginTop: 32, padding: '22px 20px', border: `1px solid ${C.border}`, borderRadius: C.rL, background: C.surface }}>
      <h2 id="optimiser-title" style={{ fontFamily: C.fontDisplay, fontSize: C.lg, color: C.primary, margin: '0 0 6px' }}>
        Put spare cash to work on this bill
      </h2>
      <p style={{ fontSize: C.sm, color: C.muted, lineHeight: 1.6, margin: '0 0 18px' }}>
        Enter what you could set aside before 31 December. I&apos;ll fill SRS and CPF top-ups in the order you pick and show what each dollar saves. Every one of these saves tax at the same rate; they differ in where the money ends up.
      </p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', alignItems: 'start' }}>
        <MoneyInput
          id="opt-spare" label="Cash you could set aside" grouped
          hint={totalRoom > 0 ? `Up to ${SGD(totalRoom)} still earns relief with the options below` : 'No relief room left with the options below'}
          value={spare} onChange={(e) => setSpare(e.target.value)}
        />
        <div>
          <div style={{ fontSize: C.sm, fontWeight: 600, color: C.text, marginBottom: 8 }}>What matters more</div>
          <Segmented
            value={priority} onChange={setPriority}
            options={[{ value: 'access', label: 'Keeping access' }, { value: 'taxFree', label: 'Never taxed later' }]}
          />
          <p style={{ marginTop: 8, fontSize: C.xs, color: C.muted, lineHeight: 1.5 }}>
            {priority === 'access'
              ? 'SRS first: you can still invest it and withdraw it, at a cost.'
              : 'CPF first: locked in, but never taxed again. SRS is only half-taxed later.'}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: C.sm, fontWeight: 600, color: C.text, marginBottom: 8 }}>Options to use</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {available.map((k) => (
            <Toggle key={k} active={levers[k]} onClick={() => setLevers((l) => ({ ...l, [k]: !l[k] }))}>
              {LEVER_INFO[k].label}
            </Toggle>
          ))}
        </div>
        {inputs.isForeigner && (
          <p style={{ marginTop: 8, fontSize: C.xs, color: C.muted }}>CPF top-ups need a CPF account, so only SRS applies to you.</p>
        )}
      </div>

      {!inputs.isForeigner && (
        <ExploreSection title="Room left in your CPF (optional)" defaultOpen={false}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <MoneyInput
              id="opt-ma-room" label="MediSave room" grouped
              hint="Basic Healthcare Sum minus your MediSave balance. Blank assumes enough room."
              value={maRoom} onChange={(e) => setMaRoom(e.target.value)}
            />
            <MoneyInput
              id="opt-ra-room" label="SA/RA room" grouped
              hint="Full Retirement Sum minus your SA (or RA) balance. Blank assumes enough room."
              value={raRoom} onChange={(e) => setRaRoom(e.target.value)}
            />
          </div>
          <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 10 }}>
            Both figures are on the CPF website or app under your account balances and top-up limits.
          </p>
        </ExploreSection>
      )}

      {spareNum > 0 && (
        <div style={{ marginTop: 22 }}>
          {r.used > 0 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 12px', marginBottom: 6 }}>
                <span style={{ fontFamily: C.fontMono, fontSize: C.xl, fontWeight: 700, color: C.greenText }}>{SGD(r.saving)}</span>
                <span style={{ fontSize: C.sm, color: C.muted }}>
                  off this year&apos;s tax, from {SGD(r.used)} set aside ({pct(r.savingRate)} back). Your bill goes from {SGD(r.baseTax)} to {SGD(r.newTax)}.
                </span>
              </div>

              <div style={{ marginTop: 18 }}>
                <Heading>Where each dollar goes</Heading>
                {r.steps.map((s, i) => (
                  <div key={s.lever} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                      <span style={{ fontSize: C.sm, fontWeight: 700, color: C.primary }}>{i + 1}. {s.label}</span>
                      <span style={{ fontFamily: C.fontMono, fontSize: C.sm, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{SGD(s.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6 }}>{s.access}</span>
                      <span style={{ fontFamily: C.fontMono, fontSize: C.xs, color: C.greenText, whiteSpace: 'nowrap' }}>saves {SGD(s.saving)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {r.slices.length > 1 && (
                <div style={{ marginTop: 18 }}>
                  <Heading>Why the later dollars save less</Heading>
                  <p style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6, margin: '0 0 8px' }}>
                    Relief comes off the top of your income, so it&apos;s taxed at your highest band first. Once you drop into a lower band, each dollar saves less.
                  </p>
                  {r.slices.map((sl) => (
                    <div key={sl.rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: C.xs, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.text }}>{SGD(sl.amount)} out of the {pct(sl.rate)} band</span>
                      <span style={{ fontFamily: C.fontMono, color: sl.rate > 0 ? C.greenText : C.faint }}>{sl.rate > 0 ? `saves ${SGD(sl.saving)}` : 'saves nothing'}</span>
                    </div>
                  ))}
                </div>
              )}

              {r.taxDeferredOnly > 0 && (
                <p style={{ fontSize: C.xs, color: C.amberText, lineHeight: 1.6, marginTop: 14 }}>
                  The {SGD(r.taxDeferredOnly)} in SRS is tax put off, not tax removed. From age {SRS_RETIREMENT_AGE}, half of each withdrawal is taxable, at whatever your income is then.
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: C.sm, color: C.muted, lineHeight: 1.6 }}>
              None of the options you picked has room left this year, so this cash wouldn&apos;t reduce your tax.
            </p>
          )}

          {r.unused > 0 && r.used > 0 && (
            <p style={{ fontSize: C.xs, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
              The other {SGD(r.unused)} earns no relief this year: {r.limitedBy === 'reliefCap'
                ? 'you reach the S$80,000 cap on total personal reliefs.'
                : `the options you picked are full${!inputs.isForeigner && !levers.cpfFamily && r.capacity.cpfFamily > 0 ? '. A family top-up would take up to ' + SGD(r.capacity.cpfFamily) + ' more' : ''}.`}
            </p>
          )}

          <p style={{ fontSize: C.xs, color: C.faint, lineHeight: 1.6, marginTop: 14 }}>
            This shows the tax effect only, not whether locking the money away suits you. Top-ups must reach CPF or SRS by 31 December to count for next year&apos;s assessment. See <a href="/tax/the-math#the-reliefs-optimiser" style={{ color: C.accent }}>the math</a> for every rule used here.
          </p>
        </div>
      )}
    </section>
  )
}
