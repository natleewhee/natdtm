// Guards the super-app consolidation: each shared primitive has exactly
// one implementation. A second `function MoneyInput` (or a second
// annuity formula) anywhere in src/ fails this test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(js|jsx)$/.test(name) && !/\.test\.js$/.test(name)) out.push(p)
  }
  return out
}
const FILES = walk(join(ROOT, 'src')).map((p) => ({ path: relative(ROOT, p), src: readFileSync(p, 'utf8') }))

function definers(re) {
  return FILES.filter((f) => re.test(f.src)).map((f) => f.path)
}

const PRIMITIVES = ['SectionDivider', 'MoneyInput', 'PercentInput', 'NumberInput', 'TextInput', 'DateInput', 'SelectInput', 'Slider', 'Segmented', 'Toggle', 'OverrideField']

for (const name of PRIMITIVES) {
  test(`${name} is defined once, in components/shared/inputs.js`, () => {
    assert.deepEqual(definers(new RegExp(`(function|const) ${name}\\b`)), ['src/components/shared/inputs.js'])
  })
}

test('reducing-balance and annuity formulas live only in lib/shared/loan.js', () => {
  assert.deepEqual(definers(/\(Math\.pow\(1 \+ \w+, \w+\) - 1\) \/ \w+/), ['src/lib/shared/loan.js'])
})

test('SGD is defined once, in lib/shared/money.js', () => {
  assert.deepEqual(definers(/(const|function) SGD\b(?!Compact)/), ['src/lib/shared/money.js'])
})

test('the shared kit reads theme tokens at render, not at module load', () => {
  // C is mutated in place on a theme switch; a module-level object holding
  // C.* values would freeze the first mode's colours (seen as unreadable
  // labels in light mode).
  const src = readFileSync(join(ROOT, 'src/components/shared/inputs.js'), 'utf8')
  const moduleLevel = src.split('\n').filter((l) => /^const \w+ = \{[^}]*\bC\.\w+/.test(l))
  assert.deepEqual(moduleLevel, [])
})
