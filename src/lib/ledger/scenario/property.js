// src/lib/ledger/scenario/property.js
// Thin property wrapper for the scenario planner. Property value
// compounds at its own appreciation rate; the mortgage amortises on a
// standard reducing-balance schedule (HouseMuch's calcOutstandingBalance).
// Equity = value − outstanding.
//
// This feeds the net-worth line and the asset-mix chart ONLY. Property
// equity is never added to the liquid figure the withdrawal solver sees
// (KD3) — this module exposes no such path, and U5 asserts it structurally.
// Pure — no React, no fetch.

import { calcOutstandingBalance } from '../../house/calc.js'

// value0 compounded at `appreciationRatePct` for `t` years.
export function propertyValueAt(value0, appreciationRatePct, t) {
  const r = (Number(appreciationRatePct) || 0) / 100
  return (Number(value0) || 0) * Math.pow(1 + r, Math.max(0, t))
}

// property: { value, mortgagePrincipal?, mortgageRatePct?, mortgageTenureYears? }
// Returns one row per year 0..years: { year, value, outstanding, equity }.
export function projectProperty(property = {}, appreciationRatePct = 0, years = 0) {
  const {
    value: value0 = 0,
    mortgagePrincipal = 0, mortgageRatePct = 0, mortgageTenureYears = 0,
  } = property
  const n = Math.max(0, Math.round(Number(years) || 0))
  const principal = Math.max(0, Number(mortgagePrincipal) || 0)

  const rows = []
  for (let t = 0; t <= n; t++) {
    const value = propertyValueAt(value0, appreciationRatePct, t)
    const outstanding = principal > 0
      ? calcOutstandingBalance(principal, mortgageRatePct, mortgageTenureYears, t * 12)
      : 0
    rows.push({ year: t, value, outstanding, equity: value - outstanding })
  }
  return rows
}

// The single row at year `t` — the orchestrator's shortcut for the
// retirement-year asset mix.
export function propertyAtYear(property, appreciationRatePct, t) {
  const rows = projectProperty(property, appreciationRatePct, t)
  return rows[rows.length - 1]
}
