/**
 * Scoring Engine Tests
 * Run with: node scorer.test.js
 * No framework. Just assertions.
 */

import {
  calculateScore,
  generateInsights,
  explainPillar,
  computeGaps,
  generateActionPlan,
  simulateLifeEvent,
  simulateLifeEvents,
  LIFE_EVENT_PRESETS,
  scoreHospitalisation,
  scoreCIBase,
  scoreECIBoost,
  scoreResilience,
  scoreLife,
  scorePremium,
  scoreDI,
  getProfileBenchmarks,
  BENCHMARKS,
} from './scorer.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function assertEqual(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✓ ${label}: ${actual}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
console.log('\n[Hospitalisation gate]');
// ---------------------------------------------------------------------------
const h1 = scoreHospitalisation('yes');
assert('yes → passed', h1.passed === true);
assertEqual('yes → score 100', h1.score, 100);

const h2 = scoreHospitalisation('no');
assert('no → not passed', h2.passed === false);
assertEqual('no → score 0', h2.score, 0);

const h3 = scoreHospitalisation('unsure');
assert('unsure → not passed', h3.passed === false);
assertEqual('unsure → score 25', h3.score, 25);
assert('unsure → isUnsure flag', h3.isUnsure === true);

// ---------------------------------------------------------------------------
console.log('\n[CI base score]');
// ---------------------------------------------------------------------------
const income = 60000;

const ci1 = scoreCIBase('yes', 300000, null, income); // 5× = adequate
assertEqual('5× income → 100', ci1.score, 100);
assert('exact → not estimated', ci1.isEstimated === false);

const ci2 = scoreCIBase('yes', 150000, null, income); // 2.5× → 50
assertEqual('2.5× income → 50', ci2.score, 50);

const ci3 = scoreCIBase('yes', 225000, null, income); // 3.75× → 75
assertEqual('3.75× income → 75', ci3.score, 75);

const ci4 = scoreCIBase('no', null, null, income);
assertEqual('no CI → 0', ci4.score, 0);

const ci5 = scoreCIBase('yes', null, 'partial', income); // band fallback, 3.5× midpoint
assertEqual('band partial (3.5×) → 70', ci5.score, 70);
assert('band → estimated', ci5.isEstimated === true);

const ci6 = scoreCIBase('yes', 360000, null, income); // above 5× → capped
assertEqual('above 5× → capped at 100', ci6.score, 100);

// Outstanding debt raises the target: 5×60k + 100k debt = 400k
const ci7 = scoreCIBase('yes', 200000, null, income, 100000);
assertEqual('debt-adjusted target: 200k / 400k → 50', ci7.score, 50);
assertEqual('debt-adjusted target exposed on result', ci7.target, 400000);

// ---------------------------------------------------------------------------
console.log('\n[ECI boost]');
// ---------------------------------------------------------------------------
const e1 = scoreECIBoost('no', null, null);
assertEqual('no ECI → 0 boost', e1.boost, 0);

const e2 = scoreECIBoost('yes', 100000, null);
assertEqual('$100k ECI → 20 boost', e2.boost, 20);

const e3 = scoreECIBoost('yes', 150000, null);
assertEqual('>$100k → still 20 (ceiling)', e3.boost, 20);

const e4 = scoreECIBoost('yes', 75000, null);
assertEqual('$75k → 10 boost', e4.boost, 10);

const e5 = scoreECIBoost('yes', 30000, null);
assertEqual('$30k (below $50k) → 5 boost', e5.boost, 5);

const e6 = scoreECIBoost('yes', null, 'mid', income); // band mid = 1.15× income = $69k
assertEqual('band mid ($69k) → 10 boost', e6.boost, 10);

// ---------------------------------------------------------------------------
console.log('\n[Resilience combined]');
// ---------------------------------------------------------------------------
const r1 = scoreResilience('yes', 300000, null, 'yes', 100000, null, income);
assertEqual('CI 100 + ECI 20 → capped at 100', r1.score, 100);

const r2 = scoreResilience('yes', 150000, null, 'no', null, null, income);
assertEqual('CI 50 + no ECI → 50', r2.score, 50);

const r3 = scoreResilience('yes', 150000, null, 'yes', 75000, null, income);
assertEqual('CI 50 + ECI 10 → 60', r3.score, 60);

// ---------------------------------------------------------------------------
console.log('\n[Life / TPD score]');
// ---------------------------------------------------------------------------
const l1 = scoreLife('yes', 540000, null, income); // 9× = adequate
assertEqual('9× income → 100', l1.score, 100);

const l2 = scoreLife('yes', 300000, null, income); // 5×
assertEqual('5× income → 56', l2.score, 56);

const l3 = scoreLife('no', null, null, income);
assertEqual('no life → 0', l3.score, 0);

const l4 = scoreLife('yes', null, 'partial', income); // band 7× = $420k
assertEqual('band partial (7×) → 78', l4.score, 78);

// Outstanding debt raises the target: 9×60k + 100k debt = 640k
const l5 = scoreLife('yes', 320000, null, income, 100000);
assertEqual('debt-adjusted target: 320k / 640k → 50', l5.score, 50);
assertEqual('debt-adjusted target exposed on result', l5.target, 640000);

// ---------------------------------------------------------------------------
console.log('\n[Premium efficiency]');
// ---------------------------------------------------------------------------
const p1 = scorePremium(500, 60000); // $6k/yr on $60k = 10% = safe ratio → full marks
assertEqual('10% ratio (safe threshold) → 100', p1.score, 100);
assert('10% → not overpaying', p1.isOverpaying === false);

const p1b = scorePremium(625, 60000); // $7.5k/yr = 12.5% → midway through taper
assertEqual('12.5% ratio (mid-taper) → 50', p1b.score, 50);
assert('12.5% → not yet overpaying', p1b.isOverpaying === false);

const p2 = scorePremium(800, 60000); // $9.6k/yr = 16% → overpay
assert('16% ratio → overpaying', p2.isOverpaying === true);
assertEqual('16% ratio → score 0', p2.score, 0);

const p3 = scorePremium(null, 60000);
assert('null premium → score null', p3.score === null);

// ---------------------------------------------------------------------------
console.log('\n[Final score — full scenarios]');
// ---------------------------------------------------------------------------

// Scenario A: Well-covered user
const scoreA = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 240000, ciBand: null,
  hasECI: 'yes', eciAmount: 100000, eciBand: null,
  hasLife: 'yes', lifeAmount: 540000, lifeBand: null,
  monthlyPremium: 400,
  primaryConcern: null,
});
assert('Well-covered → band teal or blue', ['teal', 'blue'].includes(scoreA.band.color));
assert('Well-covered → score ≥ 70', scoreA.finalScore >= 70);
assert('Well-covered → not estimated', scoreA.isEstimated === false);

// Scenario B: No hospitalisation — score capped at 50
const scoreB = calculateScore({
  age: 25, annualIncome: 48000,
  hasHosp: 'no',
  hasCI: 'yes', ciAmount: 200000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 450000, lifeBand: null,
  monthlyPremium: 300,
  primaryConcern: null,
});
assert('No hosp → score ≤ 50', scoreB.finalScore <= 50);

// Scenario C: All unknown → band inputs
const scoreC = calculateScore({
  age: 28, annualIncome: 55000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: null, ciBand: 'low',
  hasECI: 'yes', eciAmount: null, eciBand: 'low',
  hasLife: 'yes', lifeAmount: null, lifeBand: 'low',
  monthlyPremium: null,
  primaryConcern: null,
});
assert('All band inputs → isEstimated true', scoreC.isEstimated === true);

// Scenario D: Bare minimum (no CI, no life, no ECI)
const scoreD = calculateScore({
  age: 22, annualIncome: 36000,
  hasHosp: 'yes',
  hasCI: 'no', ciAmount: null, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'no', lifeAmount: null, lifeBand: null,
  monthlyPremium: 100,
  primaryConcern: 'undercovered',
});
assert('Bare minimum → band red or amber', ['red', 'amber'].includes(scoreD.band.color));
assert('Bare minimum → score ≤ 40', scoreD.finalScore <= 40);

// ---------------------------------------------------------------------------
console.log('\n[Insight generation]');
// ---------------------------------------------------------------------------
const insightsB = generateInsights(scoreB);
assert('No hosp → first card is no-hosp', insightsB[0]?.id === 'no-hosp');

const insightsD = generateInsights(scoreD);
const hasCI_gap = insightsD.some(c => c.id === 'ci-gap');
assert('No CI → ci-gap card present', hasCI_gap);
const hasECIcard = insightsD.some(c => c.id === 'eci-gap');
assert('No CI → eci-gap NOT shown (folded into ci-gap)', !hasECIcard);

// scoreD already has primaryConcern: 'undercovered' — life gap ($324k) is
// larger than the CI gap ($180k), so it should lead instead of the default
// hosp/CI/ECI/Life/Premium priority order.
assertEqual('undercovered concern → largest-dollar gap (life) leads', insightsD[0]?.id, 'life-gap');
assertEqual('undercovered concern → second-largest gap (CI) follows', insightsD[1]?.id, 'ci-gap');

// Unsure concern → band-nudge (verify your real figures) floats to front
const scoreUnsure = calculateScore({
  age: 28, annualIncome: 55000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: null, ciBand: 'partial',
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: null, lifeBand: 'partial',
  monthlyPremium: 300,
  primaryConcern: 'unsure',
});
assert('unsure concern scenario → isEstimated true (band inputs used)', scoreUnsure.isEstimated === true);
const insightsUnsure = generateInsights(scoreUnsure);
assertEqual('unsure concern → band-nudge card leads', insightsUnsure[0]?.id, 'band-nudge');

// Curious (or unset) → no reordering, default priority order preserved
const insightsCurious = generateInsights({
  ...scoreD,
  inputs: { ...scoreD.inputs, primaryConcern: 'curious' },
});
assertEqual('curious concern → default priority order (ci-gap leads, not life-gap)', insightsCurious[0]?.id, 'ci-gap');

const insightsECI = generateInsights({
  ...scoreA,
  inputs: { ...scoreA.inputs, hasECI: 'no' },
  pillars: {
    ...scoreA.pillars,
    resilience: { ...scoreA.pillars.resilience, eci: { boost: 0, amount: 0 } },
  },
});
const eciCard = insightsECI.find(c => c.id === 'eci-gap');
assert('Has CI but no ECI → eci-gap card shown', !!eciCard);

// Overpaying concern → premium card floated first
const scorePremiumUser = calculateScore({
  age: 35, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 240000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 540000, lifeBand: null,
  monthlyPremium: 900,
  primaryConcern: 'overpaying',
});
const insightsPremium = generateInsights(scorePremiumUser);
assert('Overpaying concern → premium card first', insightsPremium[0]?.id === 'premium-overpay');

// ---------------------------------------------------------------------------
console.log('\n[Pillar explanations]');
// ---------------------------------------------------------------------------

// Over-insured CI: 400k cover vs 300k benchmark (5×60k) — 1.33× the target
const scoreOverCI = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 400000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 540000, lifeBand: null,
  monthlyPremium: 400,
  primaryConcern: null,
  outstandingDebt: 0,
});
const ciExplain = explainPillar('ci', scoreOverCI);
assert('Over-insured CI → explanation flags it', ciExplain.toLowerCase().includes('over-insured'));

// Life target rises with outstanding debt: 9×60k + 200k = 740k benchmark
const scoreDebtLife = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 300000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 400000, lifeBand: null,
  monthlyPremium: 400,
  primaryConcern: null,
  outstandingDebt: 200000,
});
assertEqual('Life target includes outstanding debt', scoreDebtLife.pillars.life.target, 740000);
const lifeExplain = explainPillar('life', scoreDebtLife);
assert('Debt-adjusted life explanation mentions the loan amount', lifeExplain.includes('$200,000'));

const hospExplain = explainPillar('hosp', scoreB);
assert('Hospitalisation gate explanation returned', hospExplain.length > 0);

// ---------------------------------------------------------------------------
console.log('\n[Risk profiles]');
// ---------------------------------------------------------------------------

const balanced = getProfileBenchmarks('balanced');
assertEqual('balanced CI multiple = default', balanced.ciAdequateMultiple, BENCHMARKS.CI_ADEQUATE_MULTIPLE);
assertEqual('balanced Life multiple = default', balanced.lifeAdequateMultiple, BENCHMARKS.LIFE_ADEQUATE_MULTIPLE);

const unknownProfile = getProfileBenchmarks('not-a-real-profile');
assertEqual('unknown profile falls back to balanced', unknownProfile.ciAdequateMultiple, BENCHMARKS.CI_ADEQUATE_MULTIPLE);

// Conservative profile raises the CI target: 7×60k = 420k (no debt)
const ciConservative = scoreCIBase('yes', 300000, null, income, 0, 7, 2.8);
assertEqual('conservative CI target = 7× income', ciConservative.target, 420000);
assertEqual('conservative CI: 300k / 420k → 71', ciConservative.score, 71);

// Self-insured profile lowers the CI target: 3×60k = 180k (no debt)
const ciSelfInsured = scoreCIBase('yes', 180000, null, income, 0, 3, 1.2);
assertEqual('self-insured CI target = 3× income', ciSelfInsured.target, 180000);
assertEqual('self-insured CI: 180k / 180k → 100', ciSelfInsured.score, 100);

// calculateScore wires riskProfile through end-to-end
const scoreConservative = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 300000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 540000, lifeBand: null,
  monthlyPremium: 400,
  primaryConcern: null,
  riskProfile: 'conservative',
});
assertEqual('conservative profile end-to-end: CI target = 7×income', scoreConservative.pillars.resilience.ci.target, 420000);
assertEqual('conservative profile end-to-end: Life target = 12×income', scoreConservative.pillars.life.target, 720000);

// ---------------------------------------------------------------------------
console.log('\n[Dependents]');
// ---------------------------------------------------------------------------

// No dependents → Life target drops to debt + final-expenses buffer, not 9×income
const lifeNoDeps = scoreLife('yes', 50000, null, income, 100000, BENCHMARKS.LIFE_ADEQUATE_MULTIPLE, BENCHMARKS.LIFE_PARTIAL_MULTIPLE, 'no');
assertEqual('no dependents: target = debt + final-expenses buffer', lifeNoDeps.target, 120000);
assert('no dependents: usesIncomeMultiple false', lifeNoDeps.usesIncomeMultiple === false);
assertEqual('no dependents: 50k / 120k → 42', lifeNoDeps.score, 42);

// Default (dependents unspecified) still uses the income multiple — unchanged behaviour
const lifeDefaultDeps = scoreLife('yes', 540000, null, income);
assertEqual('unspecified dependents defaults to income-multiple target', lifeDefaultDeps.target, 540000);

const scoreNoDeps = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 300000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 30000, lifeBand: null,
  monthlyPremium: 400,
  primaryConcern: null,
  hasDependents: 'no',
  outstandingDebt: 50000,
});
assertEqual('no dependents end-to-end: Life target = debt + buffer', scoreNoDeps.pillars.life.target, 70000);
const noDepsExplain = explainPillar('life', scoreNoDeps);
assert('no-dependents life explanation mentions final-expenses framing', noDepsExplain.includes('no one depends on your income'));

// ---------------------------------------------------------------------------
console.log('\n[Gap summary]');
// ---------------------------------------------------------------------------

const gapsD = computeGaps(scoreD);
assertEqual('gap count matches pillars (CI, Life, Premium)', gapsD.length, 3);

const ciGapD = gapsD.find(g => g.id === 'ci');
assertEqual('bare minimum: CI gap = full target', ciGapD.amount, 180000);
assert('bare minimum: CI direction under', ciGapD.direction === 'under');

const lifeGapD = gapsD.find(g => g.id === 'life');
assertEqual('bare minimum: Life gap = full target', lifeGapD.amount, 324000);
assert('bare minimum: Life direction under', lifeGapD.direction === 'under');

const premGapD = gapsD.find(g => g.id === 'premium');
assert('bare minimum: premium not overpaying → ok', premGapD.direction === 'ok');

const gapsOverCI = computeGaps(scoreOverCI);
const ciGapOver = gapsOverCI.find(g => g.id === 'ci');
assert('over-insured CI: direction over', ciGapOver.direction === 'over');
assert('over-insured CI: positive surplus amount', ciGapOver.amount > 0);

const gapsPremiumUser = computeGaps(scorePremiumUser);
const premGapOver = gapsPremiumUser.find(g => g.id === 'premium');
assert('overpaying user: premium direction over', premGapOver.direction === 'over');
assert('overpaying user: premium surplus amount positive', premGapOver.amount > 0);

const scoreSkipPremium = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 300000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 540000, lifeBand: null,
  monthlyPremium: null,
  primaryConcern: null,
});
const gapsSkipPremium = computeGaps(scoreSkipPremium);
assert('skipped premium excluded from gap list', !gapsSkipPremium.some(g => g.id === 'premium'));

// ---------------------------------------------------------------------------
console.log('\n[Action plan]');
// ---------------------------------------------------------------------------

const planD = generateActionPlan(scoreD);
assert('bare minimum: no hosp item (hosp covered)', !planD.some(i => i.id === 'plan-hosp'));
assert('bare minimum: CI plan item present', planD.some(i => i.id === 'plan-ci'));
assert('bare minimum: Life plan item present', planD.some(i => i.id === 'plan-life'));
const ciPlanItem = planD.find(i => i.id === 'plan-ci');
assert('CI plan item has an adviser question', ciPlanItem.ask.length > 0);

const planB = generateActionPlan(scoreB);
assert('no hosp: hosp item present and first', planB[0]?.id === 'plan-hosp');

const planOverCI = generateActionPlan(scoreOverCI);
assert('over-insured: over-insurance review item present', planOverCI.some(i => i.id === 'plan-over'));

const planPremiumUser = generateActionPlan(scorePremiumUser);
assert('overpaying: premium review item present', planPremiumUser.some(i => i.id === 'plan-premium'));
assertEqual('overpaying concern → premium item leads action plan too', planPremiumUser[0]?.id, 'plan-premium');

const planA = generateActionPlan(scoreA);
assert('well-covered exact amounts: no estimate-nudge item', !planA.some(i => i.id === 'plan-exact'));

// scoreD: primaryConcern 'undercovered' — life gap ($324k) > CI gap ($180k)
// (reuses planD from the Action plan section above, same scoreD input)
assertEqual('undercovered concern → largest-dollar action item (life) leads', planD[0]?.id, 'plan-life');

const planUnsure = generateActionPlan(scoreUnsure);
assertEqual('unsure concern → replace-estimates item leads action plan', planUnsure[0]?.id, 'plan-exact');

// ---------------------------------------------------------------------------
console.log('\n[Life-event what-if presets]');
// ---------------------------------------------------------------------------

assertEqual('four life-event presets defined', LIFE_EVENT_PRESETS.length, 4);

const familySim = simulateLifeEvent(scoreNoDeps.inputs, 'family');
assertEqual('family preset: before life target = debt + buffer', familySim.before.pillars.life.target, 70000);
assertEqual('family preset: after life target = 9×income + debt', familySim.after.pillars.life.target, 590000);

const homeSim = simulateLifeEvent(scoreD.inputs, 'home');
assertEqual('home preset: before CI target (no debt)', homeSim.before.pillars.resilience.ci.target, 180000);
assertEqual('home preset: after CI target (+300k mortgage)', homeSim.after.pillars.resilience.ci.target, 480000);

const debtFreeSim = simulateLifeEvent(scoreDebtLife.inputs, 'debt-free');
assertEqual('debt-free preset: before life target includes debt', debtFreeSim.before.pillars.life.target, 740000);
assertEqual('debt-free preset: after life target excludes debt', debtFreeSim.after.pillars.life.target, 540000);

const conservativeSim = simulateLifeEvent(scoreA.inputs, 'conservative');
assertEqual('conservative preset: before CI target (balanced 5×)', conservativeSim.before.pillars.resilience.ci.target, 300000);
assertEqual('conservative preset: after CI target (conservative 7×)', conservativeSim.after.pillars.resilience.ci.target, 420000);

const unknownSim = simulateLifeEvent(scoreA.inputs, 'not-a-real-preset');
assert('unknown preset id returns null', unknownSim === null);

// Combined presets — life events stack
const combinedSim = simulateLifeEvents(scoreD.inputs, ['family', 'home']);
assertEqual('combined presets: count', combinedSim.presets.length, 2);
assertEqual('combined family+home: life target = 9×income + debt', combinedSim.after.pillars.life.target, 624000);
assertEqual('combined family+home: CI target = 5×income + debt', combinedSim.after.pillars.resilience.ci.target, 480000);

// Later preset in LIFE_EVENT_PRESETS order overrides an earlier one on the same field
const cancelSim = simulateLifeEvents(scoreD.inputs, ['home', 'debt-free']);
assertEqual('home then debt-free nets to zero debt: CI target unchanged from baseline', cancelSim.after.pillars.resilience.ci.target, cancelSim.before.pillars.resilience.ci.target);

const emptySim = simulateLifeEvents(scoreD.inputs, ['not-a-real-id']);
assert('simulateLifeEvents with no matching presets returns null', emptySim === null);

// ---------------------------------------------------------------------------
console.log('\n[Disability income blind-spot card]');
// ---------------------------------------------------------------------------

const insightsA = generateInsights(scoreA);
assert('well-covered user still gets the DI blind-spot nudge', insightsA.some(c => c.id === 'di-blindspot'));

const scoreFullCards = calculateScore({
  age: 30, annualIncome: 60000,
  hasHosp: 'no',
  hasCI: 'yes', ciAmount: 50000, ciBand: null,
  hasECI: 'yes', eciAmount: 100000, eciBand: null,
  hasLife: 'yes', lifeAmount: 50000, lifeBand: null,
  monthlyPremium: 900,
  primaryConcern: null,
});
const insightsFull = generateInsights(scoreFullCards);
assertEqual('four gap cards fill all slots', insightsFull.length, 4);
assert('no room left → DI card excluded', !insightsFull.some(c => c.id === 'di-blindspot'));

// ---------------------------------------------------------------------------
console.log('\n[Disability Income (DI) — supplementary score]');
// ---------------------------------------------------------------------------

const diUnanswered = scoreDI(null, null, 60000);
assert('DI unanswered → score null (not 0)', diUnanswered.score === null);
assertEqual('DI unanswered → target still computed (60% of monthly income)', diUnanswered.target, 3000);

const diNo = scoreDI('no', null, 60000);
assertEqual('DI no → score 0', diNo.score, 0);
assert('DI no → not estimated', diNo.isEstimated === false);

const diUnsure = scoreDI('unsure', null, 60000);
assertEqual('DI unsure → score 0', diUnsure.score, 0);
assert('DI unsure → isEstimated true', diUnsure.isEstimated === true);

const diFull = scoreDI('yes', 3000, 60000);
assertEqual('DI at exactly 60% target → 100', diFull.score, 100);

const diHalf = scoreDI('yes', 1500, 60000);
assertEqual('DI at half target → 50', diHalf.score, 50);

const diOver = scoreDI('yes', 4000, 60000);
assertEqual('DI above target → capped at 100', diOver.score, 100);

// finalScore must be IDENTICAL whether or not DI is answered — it's supplementary only.
const baseInputs = {
  age: 30, annualIncome: 60000,
  hasHosp: 'yes',
  hasCI: 'yes', ciAmount: 150000, ciBand: null,
  hasECI: 'no', eciAmount: null, eciBand: null,
  hasLife: 'yes', lifeAmount: 200000, lifeBand: null,
  monthlyPremium: 400,
  primaryConcern: null,
};
const scoreWithoutDI = calculateScore(baseInputs);
const scoreWithDI = calculateScore({ ...baseInputs, hasDI: 'no' });
assertEqual('finalScore unaffected by answering the DI question', scoreWithDI.finalScore, scoreWithoutDI.finalScore);
assert('DI pillar present once answered', scoreWithDI.pillars.di.score === 0);
assert('DI pillar null when unanswered', scoreWithoutDI.pillars.di.score === null);

// Gaps + action plan only surface DI once it's answered
const gapsNoDI = computeGaps(scoreWithoutDI);
assert('DI absent from gaps when unanswered', !gapsNoDI.some(g => g.id === 'di'));
const gapsWithDI = computeGaps(scoreWithDI);
const diGapEntry = gapsWithDI.find(g => g.id === 'di');
assert('DI present in gaps once answered', !!diGapEntry);
assert('DI gap direction under (no cover)', diGapEntry.direction === 'under');

const planNoDI = generateActionPlan(scoreWithoutDI);
assert('no DI plan item when unanswered', !planNoDI.some(i => i.id === 'plan-di'));
const planWithDI = generateActionPlan(scoreWithDI);
assert('DI plan item present once answered and gapped', planWithDI.some(i => i.id === 'plan-di'));

// Insight cards: generic nudge when unanswered, real numbers once answered
const insightsNoDI = generateInsights(scoreWithoutDI);
assert('DI blind-spot nudge shown when unanswered', insightsNoDI.some(c => c.id === 'di-blindspot'));
const insightsWithDI = generateInsights(scoreWithDI);
assert('DI gap card (not generic nudge) shown once answered', insightsWithDI.some(c => c.id === 'di-gap'));
assert('generic DI nudge suppressed once answered', !insightsWithDI.some(c => c.id === 'di-blindspot'));

// explainPillar
const diExplainUnanswered = explainPillar('di', scoreWithoutDI);
assert('DI explanation (unanswered) mentions it is supplementary', diExplainUnanswered.includes('supplementary'));
const diExplainAnswered = explainPillar('di', scoreWithDI);
assert('DI explanation (answered, no cover) mentions the benchmark', diExplainAnswered.includes('$3,000'));

// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
