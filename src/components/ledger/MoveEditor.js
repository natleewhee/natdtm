'use client'

// The per-scenario move list: add a dated life-event move, pick its type,
// set its year, fill the type-specific input group. An "Upgrade property"
// affordance adds a sell + buy pair at one year (KTD6). Move years are
// non-negative integers inside [0, years-to-retirement) (KTD1).

import { useState } from 'react'
import { C, parseMoney } from '@/lib/ledger/theme'
import { MoneyInput, NumberInput, PercentInput, TextInput, SelectInput, Segmented } from './ui'

const num = parseMoney
let seq = 0
const nextId = () => { seq += 1; return `mv-${Date.now()}-${seq}` }

const TYPE_LABELS = {
  'sell-property': 'Sell a property',
  'buy-property': 'Buy a property',
  'cash-to-investments': 'Move cash',
  'buy-car': 'Buy / change a car',
  'have-child': 'Have a child',
}

function blankInputs(type) {
  switch (type) {
    case 'sell-property':
      return { propertyType: 'private', purchasePrice: '', purchaseDate: '', salePrice: '', saleDate: '', loanTaken: '', mortgageRate: '2.60', loanTenure: '25', cpfOutlay: '' }
    case 'buy-property':
      return { newPrice: '', newLoanAmount: '', newLoanTenure: '25', newMortgageRate: '3.00', absd: '', otherFees: '' }
    case 'cash-to-investments':
      return { amount: '', direction: 'in' }
    case 'buy-car':
      return { carId: '', down: '', tenure: '7' }
    case 'have-child':
      return { annualCost: '18000', lumpAmount: '', lumpYear: '' }
    default:
      return {}
  }
}

function yearError(year, retireYears) {
  if (year === '' || year == null) return 'Set a year'
  const n = Number(year)
  if (!Number.isInteger(n)) return 'Whole years only'
  if (n < 0) return 'Cannot be negative'
  if (retireYears > 0 && n >= retireYears) return `Before retirement (< ${retireYears})`
  return null
}

function FieldGrid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 10 }}>{children}</div>
}

function InputsFor({ move, onInput, cars }) {
  const inp = move.inputs
  const set = (k) => (e) => onInput({ ...inp, [k]: e.target.value })
  switch (move.type) {
    case 'sell-property':
      return (
        <FieldGrid>
          <SelectInput id={`${move.id}-ptype`} label="Type" value={inp.propertyType} onChange={set('propertyType')}
            options={[{ value: 'private', label: 'Private' }, { value: 'hdb', label: 'HDB' }]} />
          <MoneyInput id={`${move.id}-pp`} label="Bought for" value={inp.purchasePrice} onChange={set('purchasePrice')} />
          <TextInput id={`${move.id}-pd`} label="Bought on" placeholder="YYYY-MM-DD" value={inp.purchaseDate} onChange={set('purchaseDate')} />
          <MoneyInput id={`${move.id}-sp`} label="Sale price" value={inp.salePrice} onChange={set('salePrice')} />
          <TextInput id={`${move.id}-sd`} label="Sale date" placeholder="YYYY-MM-DD" value={inp.saleDate} onChange={set('saleDate')} />
          <MoneyInput id={`${move.id}-lt`} label="Original loan" value={inp.loanTaken} onChange={set('loanTaken')} />
          <PercentInput id={`${move.id}-mr`} label="Mortgage rate" value={inp.mortgageRate} onChange={set('mortgageRate')} />
          <NumberInput id={`${move.id}-ten`} label="Loan tenure" suffix="yr" value={inp.loanTenure} onChange={set('loanTenure')} />
          <MoneyInput id={`${move.id}-cpf`} label="CPF used" value={inp.cpfOutlay} onChange={set('cpfOutlay')} />
        </FieldGrid>
      )
    case 'buy-property':
      return (
        <FieldGrid>
          <MoneyInput id={`${move.id}-np`} label="Price" value={inp.newPrice} onChange={set('newPrice')} />
          <MoneyInput id={`${move.id}-nl`} label="Loan amount" value={inp.newLoanAmount} onChange={set('newLoanAmount')} />
          <NumberInput id={`${move.id}-nt`} label="Loan tenure" suffix="yr" value={inp.newLoanTenure} onChange={set('newLoanTenure')} />
          <PercentInput id={`${move.id}-nr`} label="Mortgage rate" value={inp.newMortgageRate} onChange={set('newMortgageRate')} />
          <MoneyInput id={`${move.id}-absd`} label="ABSD" value={inp.absd} onChange={set('absd')} />
          <MoneyInput id={`${move.id}-of`} label="Other fees" value={inp.otherFees} onChange={set('otherFees')} />
        </FieldGrid>
      )
    case 'cash-to-investments':
      return (
        <FieldGrid>
          <MoneyInput id={`${move.id}-amt`} label="Amount" value={inp.amount} onChange={set('amount')} />
          <div style={{ alignSelf: 'end', paddingBottom: 4 }}>
            <Segmented
              options={[{ value: 'in', label: 'Into invest.' }, { value: 'out', label: 'Out to cash' }]}
              value={inp.direction} onChange={(v) => onInput({ ...inp, direction: v })}
            />
          </div>
        </FieldGrid>
      )
    case 'buy-car':
      return (
        <FieldGrid>
          <SelectInput id={`${move.id}-car`} label="Car" value={inp.carId} onChange={set('carId')}
            options={[{ value: '', label: 'Pick a car…' }, ...(cars || []).map(c => ({ value: c.id, label: `${c.name} · ${c.price ? 'S$' + c.price.toLocaleString('en-SG') : ''}` }))]} />
          <MoneyInput id={`${move.id}-down`} label="Down payment" value={inp.down} onChange={set('down')} />
          <NumberInput id={`${move.id}-ctn`} label="Loan tenure" suffix="yr" value={inp.tenure} onChange={set('tenure')} />
        </FieldGrid>
      )
    case 'have-child':
      return (
        <FieldGrid>
          <MoneyInput id={`${move.id}-ac`} label="Cost / year" value={inp.annualCost} onChange={set('annualCost')} />
          <MoneyInput id={`${move.id}-la`} label="Education lump" value={inp.lumpAmount} onChange={set('lumpAmount')} />
          <NumberInput id={`${move.id}-ly`} label="Lump in year" value={inp.lumpYear} onChange={set('lumpYear')} />
        </FieldGrid>
      )
    default:
      return null
  }
}

function MoveRow({ move, retireYears, cars, onPatch, onRemove, groupedLabel }) {
  const err = yearError(move.year, retireYears)
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: C.rL, padding: 14, marginBottom: 10, background: C.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: C.sm, fontWeight: 700, color: C.primary, flex: 1 }}>
          {groupedLabel || TYPE_LABELS[move.type] || move.type}
        </span>
        <label htmlFor={`${move.id}-year`} style={{ fontSize: C.xs, color: C.muted }}>Year</label>
        <input
          id={`${move.id}-year`} type="text" inputMode="numeric" value={move.year}
          onChange={(e) => onPatch({ ...move, year: e.target.value })}
          style={{
            width: 56, padding: '6px 8px', fontFamily: C.fontMono, fontSize: C.sm,
            border: `1.5px solid ${err ? C.red : C.border}`, borderRadius: C.r, background: C.surface, color: C.primary, outline: 'none',
          }}
        />
        <button type="button" onClick={onRemove} aria-label="Remove move"
          style={{ border: 'none', background: 'transparent', color: C.faint, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
      </div>
      {err && <p style={{ margin: '6px 0 0', fontSize: C.xs, color: C.redText }}>{err}</p>}
      <InputsFor move={move} cars={cars} onInput={(inputs) => onPatch({ ...move, inputs })} />
    </div>
  )
}

export default function MoveEditor({ moves, onChange, retireYears, cars, salary }) {
  const [adding, setAdding] = useState(false)

  const patch = (id, next) => onChange(moves.map(m => (m.id === id ? next : m)))
  const remove = (id) => {
    const m = moves.find(x => x.id === id)
    onChange(moves.filter(x => x.id !== id && (!m?.groupId || x.groupId !== m.groupId)))
  }
  const add = (type) => {
    setAdding(false)
    onChange([...moves, { id: nextId(), type, year: '0', inputs: blankInputs(type) }])
  }
  const addUpgrade = () => {
    setAdding(false)
    const groupId = nextId()
    onChange([
      ...moves,
      { id: nextId(), type: 'sell-property', year: '5', groupId, inputs: blankInputs('sell-property') },
      { id: nextId(), type: 'buy-property', year: '5', groupId, inputs: blankInputs('buy-property') },
    ])
  }

  // Render grouped upgrade pairs together, other moves individually.
  const rendered = []
  const seen = new Set()
  for (const m of moves) {
    if (m.groupId && seen.has(m.groupId)) continue
    if (m.groupId) {
      seen.add(m.groupId)
      const pair = moves.filter(x => x.groupId === m.groupId)
      const year = pair[0]?.year
      rendered.push(
        <div key={m.groupId} style={{ border: `1px solid ${C.accent}55`, borderRadius: C.rL, padding: 12, marginBottom: 10, background: C.accentBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: C.sm, fontWeight: 700, color: C.accent, flex: 1 }}>Upgrade property (sell + buy)</span>
            <button type="button" onClick={() => remove(pair[0].id)} aria-label="Remove upgrade"
              style={{ border: 'none', background: 'transparent', color: C.faint, cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
          </div>
          {pair.map(p => (
            <MoveRow key={p.id} move={{ ...p, year }} retireYears={retireYears} cars={cars}
              groupedLabel={p.type === 'sell-property' ? 'Sell the current place' : 'Buy the new place'}
              onPatch={(next) => onChange(moves.map(x => (x.groupId === m.groupId ? { ...x, year: next.year, ...(x.id === p.id ? { inputs: next.inputs } : {}) } : x)))}
              onRemove={() => remove(pair[0].id)} />
          ))}
        </div>,
      )
    } else {
      rendered.push(
        <MoveRow key={m.id} move={m} retireYears={retireYears} cars={cars} salary={salary}
          onPatch={(next) => patch(m.id, next)} onRemove={() => remove(m.id)} />,
      )
    }
  }

  return (
    <div>
      {rendered}
      {adding ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <button key={type} type="button" onClick={() => add(type)}
              style={{ padding: '7px 12px', fontSize: C.xs, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: C.r, background: C.surface, color: C.primary, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
          <button type="button" onClick={addUpgrade}
            style={{ padding: '7px 12px', fontSize: C.xs, fontWeight: 600, border: `1px solid ${C.accent}`, borderRadius: C.r, background: C.accentBg, color: C.accent, cursor: 'pointer' }}>
            Upgrade (sell + buy)
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          style={{ padding: '8px 14px', fontSize: C.sm, fontWeight: 600, border: `1.5px dashed ${C.border}`, borderRadius: C.r, background: 'transparent', color: C.muted, cursor: 'pointer', width: '100%' }}>
          + Add a move
        </button>
      )}
    </div>
  )
}

export { yearError }
