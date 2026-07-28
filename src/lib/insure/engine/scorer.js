/**
 * Insurance Gap Analyzer — Scoring Engine
 * Pure functions. No side effects. No framework dependencies.
 * All monetary values in SGD. Income = annual.
 */

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

export const BENCHMARKS = {
    CI_ADEQUATE_MULTIPLE: 5,      // 5× annual income — CFP needs analysis
    CI_PARTIAL_MULTIPLE: 2,       // 2× annual income
  LIFE_ADEQUATE_MULTIPLE: 9,    // 9× annual income
  LIFE_PARTIAL_MULTIPLE: 5,     // 5× annual income
  ECI_STRONG_RATIO: 1.5,        // 1.5× annual income
  ECI_SOME_RATIO: 0.8,          // 0.8× annual income
  ECI_STRONG_THRESHOLD: 100000, // $100k — fallback when income unknown
  ECI_SOME_THRESHOLD: 50000,    // $50k — fallback when income unknown
  PREMIUM_SAFE_RATIO: 0.10,     // 10% of annual income — no penalty up to here
  PREMIUM_HIGH_RATIO: 0.15,     // 15% = overpay warning, score reaches 0 here
  OVER_INSURED_MULTIPLE: 1.25,  // cover ≥ 1.25× the benchmark → flagged as possibly over-insured
  FINAL_EXPENSES_BUFFER: 20000, // SGD — assumed Life/TPD need when no dependents rely on your income
  TYPICAL_HOME_LOAN: 300000,    // SGD — rough HDB/private mortgage estimate used by the "buy a home" what-if preset
  DI_REPLACEMENT_RATIO: 0.6,    // 60% of gross monthly income — typical DI payout cap (moral-hazard limit most Singapore insurers apply)
};

/**
 * Risk profiles scale the CI and Life/TPD income-multiple benchmarks up or
 * down. "Balanced" reproduces BENCHMARKS.CI_ADEQUATE_MULTIPLE /
 * LIFE_ADEQUATE_MULTIPLE exactly, so it's a no-op for anyone who doesn't
 * touch this — existing scores are unaffected by default.
 * Partial-band multiples scale with the same ratio as the standard bands
 * (2/5 for CI, 5/9 for Life) so "less than X" / "X–Y" labels stay proportionate.
 */
export const RISK_PROFILES = {
  conservative: {
    label: 'Conservative',
    description: 'Prioritise full replacement cover — err on the side of more.',
    ciMultiple: 7,
    lifeMultiple: 12,
  },
  balanced: {
    label: 'Balanced',
    description: 'The standard benchmark most financial planners use as a starting point.',
    ciMultiple: BENCHMARKS.CI_ADEQUATE_MULTIPLE,
    lifeMultiple: BENCHMARKS.LIFE_ADEQUATE_MULTIPLE,
  },
  selfInsured: {
    label: 'Self-insured',
    description: 'You have savings or other assets that can absorb some risk — lower benchmarks, more room for other goals.',
    ciMultiple: 3,
    lifeMultiple: 6,
  },
};

const CI_PARTIAL_RATIO = BENCHMARKS.CI_PARTIAL_MULTIPLE / BENCHMARKS.CI_ADEQUATE_MULTIPLE;
const LIFE_PARTIAL_RATIO = BENCHMARKS.LIFE_PARTIAL_MULTIPLE / BENCHMARKS.LIFE_ADEQUATE_MULTIPLE;

/**
 * Resolve a risk-profile key to its CI/Life adequate + partial multiples.
 * Unknown/missing keys fall back to "balanced" (today's default behaviour).
 */
export function getProfileBenchmarks(riskProfile) {
  const profile = RISK_PROFILES[riskProfile] ?? RISK_PROFILES.balanced;
  return {
    profile,
    ciAdequateMultiple: profile.ciMultiple,
    ciPartialMultiple: profile.ciMultiple * CI_PARTIAL_RATIO,
    lifeAdequateMultiple: profile.lifeMultiple,
    lifePartialMultiple: profile.lifeMultiple * LIFE_PARTIAL_RATIO,
  };
}

export const BAND_MIDPOINTS = {
  // CI bands expressed as income multiples
  CI_LOW:     1.0,     // "less than 2×" → assume 1×
  CI_PARTIAL: 3.5,     // "2–5×" → assume 3.5×
  CI_HIGH:    6.0,     // "more than 5×" → assume 6×
  // Life bands expressed as income multiples
  LIFE_LOW: 3.0,   // "less than 5×" → assume 3×
  LIFE_PARTIAL: 7.0, // "5–9×" → assume 7×
  LIFE_HIGH: 11.0, // "more than 9×" → assume 11×
// ECI bands as income multiples (labels are dynamic per user income)
ECI_LOW:  0.4,   // less than 0.8× income → assume 0.4×
ECI_MID:  1.15,  // 0.8–1.5× income → assume midpoint 1.15×
ECI_HIGH: 2.0,   // more than 1.5× income → assume 2×
};

export const WEIGHTS = {
  CI: 0.40,
  LIFE: 0.30,
  PREMIUM: 0.20,
  // Hospitalisation is a gate, not a weight
  // ECI is a sub-component boost within CI, not a separate weight
};

export const SCORE_BANDS = [
  { min: 0,  max: 39,  label: 'At risk',          color: 'red' },
  { min: 40, max: 59,  label: 'Partially covered', color: 'amber' },
  { min: 60, max: 79,  label: 'Mostly covered',    color: 'blue' },
  { min: 80, max: 100, label: 'Well protected',     color: 'teal' },
];

// ---------------------------------------------------------------------------
// INPUT TYPES
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} UserInputs
 * @property {number}  age
 * @property {number}  annualIncome          — exact SGD
 * @property {'yes'|'no'|'unsure'} hasHosp
 * @property {'yes'|'no'|'unsure'} hasCI
 * @property {number|null}  ciAmount         — exact SGD, null if unknown
 * @property {'low'|'partial'|'high'|null} ciBand — fallback if ciAmount null
 * @property {'yes'|'no'|'unsure'} hasECI
 * @property {number|null}  eciAmount        — exact SGD, null if unknown
 * @property {'none'|'low'|'mid'|'high'|null} eciBand — fallback
 * @property {'yes'|'no'|'unsure'} hasLife
 * @property {number|null}  lifeAmount       — exact SGD, null if unknown
 * @property {'low'|'partial'|'high'|null} lifeBand — fallback
 * @property {number|null}  monthlyPremium   — SGD, null if skipped
 * @property {'overpaying'|'undercovered'|'unsure'|'curious'|null} primaryConcern
 * @property {number}  outstandingDebt       — SGD, total outstanding loans (mortgage, car, personal, etc.), 0 if none/skipped
 * @property {'conservative'|'balanced'|'selfInsured'|null} riskProfile — scales CI/Life benchmarks, defaults to 'balanced'
 * @property {'yes'|'no'|'unsure'|null} hasDependents — 'no' drops the Life/TPD target to debt + final-expenses buffer
 * @property {'yes'|'no'|'unsure'|null} hasDI — Disability Income cover; null means the question was never asked (supplementary, not in finalScore)
 * @property {number|null} diMonthlyBenefit — SGD/month DI payout, null if unknown/skipped
 */

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Resolve actual coverage amount from exact input or band fallback.
 * Returns { amount, isEstimated }
 */
function resolveAmount(exact, band, bandMap) {
  if (exact !== null && exact !== undefined && !isNaN(exact) && exact >= 0) {
    return { amount: exact, isEstimated: false };
  }
  if (band && bandMap[band] !== undefined) {
    return { amount: bandMap[band], isEstimated: true };
  }
  return { amount: 0, isEstimated: true };
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value) {
  return Math.round(clamp(value));
}

// ---------------------------------------------------------------------------
// PILLAR SCORERS
// ---------------------------------------------------------------------------

/**
 * Hospitalisation — binary gate.
 * Returns { score: 0|50|100, passed: bool, isUnsure: bool }
 */
export function scoreHospitalisation(hasHosp) {
  if (hasHosp === 'yes')    return { score: 100, passed: true,  isUnsure: false };
  if (hasHosp === 'unsure') return { score: 25,  passed: false, isUnsure: true  };
  return                           { score: 0,   passed: false, isUnsure: false };
}

/**
 * Critical illness base score (0–100).
 * Uses continuous ratio formula when exact amount known.
 * Target = adequateMultiple× income + outstanding debt, so existing loans
 * count toward the benchmark. adequateMultiple/partialMultiple default to
 * the standard 5×/2× benchmarks but can be swapped for a risk profile's
 * multiples (see getProfileBenchmarks).
 */
export function scoreCIBase(
  hasCI, ciAmount, ciBand, annualIncome, outstandingDebt = 0,
  adequateMultiple = BENCHMARKS.CI_ADEQUATE_MULTIPLE,
  partialMultiple = BENCHMARKS.CI_PARTIAL_MULTIPLE,
) {
  const target = adequateMultiple * annualIncome + outstandingDebt;

  if (hasCI === 'no' || hasCI === 'unsure') {
    return { score: 0, amount: 0, isEstimated: true, multiple: 0, target, adequateMultiple };
  }

  // Band-fallback midpoints scale with the ratio of the active multiples to
  // the standard 2×/5× ones, so they stay proportionate under other risk profiles.
  const partialRatio = partialMultiple / BENCHMARKS.CI_PARTIAL_MULTIPLE;
  const adequateRatio = adequateMultiple / BENCHMARKS.CI_ADEQUATE_MULTIPLE;
  const ciBandMap = {
    low:     BAND_MIDPOINTS.CI_LOW     * partialRatio * annualIncome,
    partial: BAND_MIDPOINTS.CI_PARTIAL * ((partialRatio + adequateRatio) / 2) * annualIncome,
    high:    BAND_MIDPOINTS.CI_HIGH    * adequateRatio * annualIncome,
  };

  const { amount, isEstimated } = resolveAmount(ciAmount, ciBand, ciBandMap);
  const multiple = annualIncome > 0 ? amount / annualIncome : 0;
  // target <= 0 (zero income, zero debt) would otherwise divide 0/0 into
  // NaN when amount is also 0 — a target of $0 needed is trivially met.
  const score = target > 0 ? roundScore(Math.min(amount / target, 1.0) * 100) : 100;

  return { score, amount, isEstimated, multiple, target, adequateMultiple };
}

/**
 * ECI boost (0–20 points added to CI base).
 */
export function scoreECIBoost(hasECI, eciAmount, eciBand, annualIncome) {
  if (hasECI === 'no') return { boost: 0, amount: 0, isEstimated: false };
  if (hasECI === 'unsure') return { boost: 0, amount: 0, isEstimated: true };

  const eciBandMap = {
    none: 0,
    low:  BAND_MIDPOINTS.ECI_LOW  * annualIncome,
    mid:  BAND_MIDPOINTS.ECI_MID  * annualIncome,
    high: BAND_MIDPOINTS.ECI_HIGH * annualIncome,
  };

  const { amount, isEstimated } = resolveAmount(eciAmount, eciBand, eciBandMap);

  const someThreshold   = annualIncome > 0 ? annualIncome * BENCHMARKS.ECI_SOME_RATIO   : BENCHMARKS.ECI_SOME_THRESHOLD;
  const strongThreshold = annualIncome > 0 ? annualIncome * BENCHMARKS.ECI_STRONG_RATIO : BENCHMARKS.ECI_STRONG_THRESHOLD;

  let boost = 0;
  if (amount >= strongThreshold) boost = 20;
  else if (amount >= someThreshold) boost = 10;
  else if (amount > 0) boost = 5;

  return { boost, amount, isEstimated };
}

/**
 * Combined resilience score = min(CI base + ECI boost, 100)
 */
export function scoreResilience(
  hasCI, ciAmount, ciBand, hasECI, eciAmount, eciBand, annualIncome, outstandingDebt = 0,
  ciAdequateMultiple = BENCHMARKS.CI_ADEQUATE_MULTIPLE,
  ciPartialMultiple = BENCHMARKS.CI_PARTIAL_MULTIPLE,
) {
  const ci  = scoreCIBase(hasCI, ciAmount, ciBand, annualIncome, outstandingDebt, ciAdequateMultiple, ciPartialMultiple);
  const eci = scoreECIBoost(hasECI, eciAmount, eciBand, annualIncome);
  const combined = roundScore(Math.min(ci.score + eci.boost, 100));

  return {
    score: combined,
    ci,
    eci,
    isEstimated: ci.isEstimated || eci.isEstimated,
  };
}

/**
 * Life / TPD score (0–100).
 * Target = adequateMultiple× income + outstanding debt (DIME-style), unless
 * hasDependents === 'no' — in which case the standard financial-planning
 * guidance is that large income-replacement cover isn't needed, so the
 * target drops to just outstanding debt + a final-expenses buffer.
 * adequateMultiple/partialMultiple default to the standard 9×/5× benchmarks
 * but can be swapped for a risk profile's multiples.
 */
export function scoreLife(
  hasLife, lifeAmount, lifeBand, annualIncome, outstandingDebt = 0,
  adequateMultiple = BENCHMARKS.LIFE_ADEQUATE_MULTIPLE,
  partialMultiple = BENCHMARKS.LIFE_PARTIAL_MULTIPLE,
  hasDependents = 'yes',
) {
  const usesIncomeMultiple = hasDependents !== 'no';
  const target = usesIncomeMultiple
    ? adequateMultiple * annualIncome + outstandingDebt
    : outstandingDebt + BENCHMARKS.FINAL_EXPENSES_BUFFER;

  if (hasLife === 'no' || hasLife === 'unsure') {
    return { score: 0, amount: 0, isEstimated: true, multiple: 0, target, adequateMultiple, usesIncomeMultiple };
  }

  const partialRatio = partialMultiple / BENCHMARKS.LIFE_PARTIAL_MULTIPLE;
  const adequateRatio = adequateMultiple / BENCHMARKS.LIFE_ADEQUATE_MULTIPLE;
  const lifeBandMap = {
    low:     BAND_MIDPOINTS.LIFE_LOW     * partialRatio * annualIncome,
    partial: BAND_MIDPOINTS.LIFE_PARTIAL * ((partialRatio + adequateRatio) / 2) * annualIncome,
    high:    BAND_MIDPOINTS.LIFE_HIGH    * adequateRatio * annualIncome,
  };

  const { amount, isEstimated } = resolveAmount(lifeAmount, lifeBand, lifeBandMap);
  const multiple = annualIncome > 0 ? amount / annualIncome : 0;
  // target <= 0 (zero income-multiple branch with zero debt) would
  // otherwise divide 0/0 into NaN when amount is also 0 — a target of $0
  // needed is trivially met. usesIncomeMultiple's own branch already adds
  // FINAL_EXPENSES_BUFFER so it can't hit this in practice, but the
  // income-multiple branch (zero income + zero debt) can.
  const score = target > 0 ? roundScore(Math.min(amount / target, 1.0) * 100) : 100;

  return { score, amount, isEstimated, multiple, target, adequateMultiple, usesIncomeMultiple };
}

/**
 * Premium efficiency score (0–100).
 * Full marks up to PREMIUM_SAFE_RATIO, tapering linearly to 0 at PREMIUM_HIGH_RATIO.
 * Returns null if monthlyPremium not provided.
 */
export function scorePremium(monthlyPremium, annualIncome) {
  if (monthlyPremium === null || monthlyPremium === undefined) {
    return { score: null, annualPremium: null, ratio: null, isOverpaying: false };
  }

  const annualPremium = monthlyPremium * 12;
  const ratio = annualIncome > 0 ? annualPremium / annualIncome : 0;

  const { PREMIUM_SAFE_RATIO, PREMIUM_HIGH_RATIO } = BENCHMARKS;
  const taperSpan = PREMIUM_HIGH_RATIO - PREMIUM_SAFE_RATIO;
  const score = ratio <= PREMIUM_SAFE_RATIO
    ? 100
    : roundScore(100 * (1 - (ratio - PREMIUM_SAFE_RATIO) / taperSpan));

  const isOverpaying = ratio > PREMIUM_HIGH_RATIO;

  return { score, annualPremium, ratio, isOverpaying };
}

/**
 * Disability Income (DI) score (0–100) — a SEPARATE, NOT-WEIGHTED supplementary
 * score. It never feeds into finalScore, so existing scores (and score
 * history trend lines) stay comparable regardless of whether this is answered.
 * Target = 60% of gross monthly income, the typical DI payout benchmark.
 * Returns score: null if the question was skipped (not asked yet), distinct
 * from score: 0 (asked, and no DI cover).
 */
export function scoreDI(hasDI, monthlyBenefit, annualIncome) {
  const monthlyIncome = annualIncome > 0 ? annualIncome / 12 : 0;
  const target = Math.round(monthlyIncome * BENCHMARKS.DI_REPLACEMENT_RATIO);

  if (hasDI === null || hasDI === undefined) {
    return { score: null, amount: 0, target, isEstimated: false };
  }
  if (hasDI === 'no' || hasDI === 'unsure') {
    return { score: 0, amount: 0, target, isEstimated: hasDI === 'unsure' };
  }

  const amount = typeof monthlyBenefit === 'number' && monthlyBenefit >= 0 ? monthlyBenefit : 0;
  const score = roundScore(target > 0 ? Math.min(amount / target, 1.0) * 100 : 0);

  return { score, amount, target, isEstimated: false };
}

// ---------------------------------------------------------------------------
// FINAL SCORE AGGREGATOR
// ---------------------------------------------------------------------------

/**
 * Main scoring function. Returns the full score object.
 * @param {UserInputs} inputs
 * @returns {ScoreResult}
 */
export function calculateScore(inputs) {
  const {
    annualIncome,
    hasHosp,
    hasCI, ciAmount, ciBand,
    hasECI, eciAmount, eciBand,
    hasLife, lifeAmount, lifeBand,
    monthlyPremium,
    outstandingDebt,
    riskProfile,
    hasDependents,
    hasDI, diMonthlyBenefit,
  } = inputs;
  const debt = outstandingDebt || 0;
  const { ciAdequateMultiple, ciPartialMultiple, lifeAdequateMultiple, lifePartialMultiple } =
    getProfileBenchmarks(riskProfile);

  // --- Pillar scores ---
  const hosp       = scoreHospitalisation(hasHosp);
  const resilience = scoreResilience(
    hasCI, ciAmount, ciBand, hasECI, eciAmount, eciBand, annualIncome, debt,
    ciAdequateMultiple, ciPartialMultiple,
  );
  const life = scoreLife(
    hasLife, lifeAmount, lifeBand, annualIncome, debt,
    lifeAdequateMultiple, lifePartialMultiple, hasDependents,
  );
  const premium = scorePremium(monthlyPremium, annualIncome);
  // Supplementary only — deliberately excluded from the weighted formula
  // below, so finalScore (and score-history trend lines) stay comparable
  // whether or not this question was ever answered.
  const di = scoreDI(hasDI, diMonthlyBenefit, annualIncome);

  // --- Weighted base score ---
  const premiumWeight = premium.score !== null ? WEIGHTS.PREMIUM : 0;
  const ciWeight      = WEIGHTS.CI;
  const lifeWeight    = WEIGHTS.LIFE;

  // Redistribute premium weight if skipped
  const totalWeight = ciWeight + lifeWeight + premiumWeight;
  const premiumScore = premium.score ?? 0;

  let weightedScore =
    (resilience.score * ciWeight +
     life.score       * lifeWeight +
     premiumScore     * premiumWeight) / totalWeight * 100 / 100;

  // --- Hospitalisation gate ---
  // If hosp failed or unsure, cap the weighted score at 50
  if (!hosp.passed) {
    weightedScore = Math.min(weightedScore, 50);
  }

  const finalScore = roundScore(weightedScore);

  // --- Band ---
  const band = SCORE_BANDS.find(b => finalScore >= b.min && finalScore <= b.max)
    ?? SCORE_BANDS[0];

  // --- Estimated flag ---
  const isEstimated =
    resilience.isEstimated ||
    life.isEstimated ||
    (hasCI !== 'no' && ciAmount === null) ||
    (hasLife !== 'no' && lifeAmount === null);

  return {
    finalScore,
    band,
    isEstimated,
    pillars: { hosp, resilience, life, premium, di },
    inputs, // pass through for insight generation
  };
}

// ---------------------------------------------------------------------------
// INSIGHT GENERATOR
// ---------------------------------------------------------------------------

/**
 * Generates up to 4 prioritised insight cards from a score result.
 * @param {ScoreResult} result
 * @returns {InsightCard[]}
 */
export function generateInsights(result) {
  const { pillars, inputs, finalScore } = result;
  const { hosp, resilience, life, premium } = pillars;
  const { hasCI, hasECI, primaryConcern, outstandingDebt } = inputs;
  const debt = outstandingDebt || 0;
  const debtClause = debt > 0 ? `, including your ${formatSGD(debt)} in outstanding loans` : '';
  const cards = [];

  // --- P1: No hospitalisation ---
  if (!hosp.passed) {
    cards.push({
      id: 'no-hosp',
      priority: 1,
      severity: 'critical',
      title: hosp.isUnsure
        ? "You're not sure about your hospitalisation cover"
        : "You have no hospitalisation cover",
      body: hosp.isUnsure
        ? "You may already be covered under MediShield Life — all Singapore Citizens and PRs are enrolled automatically. What matters is whether you have an Integrated Shield Plan on top, which covers private or restructured hospital wards. Check your CPF statement or your insurer's app under 'Active Policies'."
        : "A single hospitalisation without insurance can cost $10,000–$50,000 or more out of pocket. This is your most urgent gap to close before anything else.",
      action: "Integrated Shield Plans start from around $200–400 a year for someone in their 20s or 30s — roughly the cost of one night in a B1 ward without cover. One conversation with a licensed adviser is all it takes to get this sorted.",
    });
  }

// --- P2: CI coverage gap ---
if (resilience.ci.score < 50) {
  const hasAnyCi = hasCI === 'yes';
  const isUnsureCi = hasCI === 'unsure';
  const ciMultipleLabel = `${resilience.ci.adequateMultiple}×`;
  const targetAmount = formatSGD(resilience.ci.target);
  const currentAmount = hasAnyCi && resilience.ci.amount > 0
    ? formatSGD(resilience.ci.amount)
    : null;
  const prefix = resilience.ci.isEstimated ? 'approximately ' : '';

  cards.push({
    id: 'ci-gap',
    priority: 2,
    severity: 'warning',
    title: hasAnyCi
      ? "Your critical illness cover may not be enough"
      : isUnsureCi
        ? "You're not sure about your critical illness cover"
        : "You have no critical illness coverage",
    body: hasAnyCi
      ? `Your CI cover of ${prefix}${currentAmount} is below your ${ciMultipleLabel} income benchmark${debtClause} (${targetAmount}). A serious diagnosis like cancer or a stroke can stop your income for months — your cover needs to bridge that gap, not just pay for the first week of treatment.`
      : isUnsureCi
        ? `Check your policy documents or your insurer's app for a critical illness rider or standalone plan. If you're not covered, a serious diagnosis means your savings take the full hit — lost income, treatment costs, and everything in between. Your benchmark is ${ciMultipleLabel} your annual income${debtClause} (${targetAmount}).`
        : `Without CI cover, a serious diagnosis means your savings take the full hit — lost income, treatment costs, and everything in between. Your benchmark is ${ciMultipleLabel} your annual income${debtClause} (${targetAmount}).`,
    action: hasAnyCi
      ? "A CI top-up rider can often be added to your existing plan — usually cheaper than a new standalone policy. Ask an adviser to check if your current plan allows it."
      : "A standalone term CI plan is usually the most cost-efficient starting point. An adviser can compare options based on your age and health profile.",
  });
}

  // --- P3: ECI gap (only if CI exists) ---
  if (hasCI === 'yes' && hasECI === 'no') {
    cards.push({
      id: 'eci-gap',
      priority: 3,
      severity: 'info',
      title: "Your CI only covers late-stage illness",
      body: "Standard CI policies pay out at late-stage diagnosis — confirmed heart failure, late-stage cancer, and so on. Early Critical Illness (ECI) cover pays out earlier, at a minor heart attack, early-stage cancer, or initial stroke, when treatment is most intensive and costs are at their highest.",
      action: "ECI isn't usually a separate policy — it's a rider you can add to your existing CI plan. It takes one conversation with your adviser to check if yours allows it, and what it would cost.",
    });
  }

  // --- P4a: Life/TPD gap ---
  if (life.score < 50 && cards.length < 4) {
    const targetAmount = formatSGD(life.target);
    const currentAmount = life.amount > 0 ? formatSGD(life.amount) : null;
    const prefix = life.isEstimated ? 'approximately ' : '';
    const lifeMultipleLabel = `${life.adequateMultiple}×`;
    const benchmarkClause = life.usesIncomeMultiple
      ? `The recommended starting point is ${lifeMultipleLabel} your annual income${debtClause} (${targetAmount}).`
      : `Since you told us no one depends on your income, the benchmark here is just your outstanding loans plus a final-expenses buffer (${targetAmount}), rather than a full income-replacement multiple.`;

    cards.push({
      id: 'life-gap',
      priority: 4,
      severity: life.score === 0 ? 'warning' : 'info',
      title: life.score === 0
        ? "You have no life or TPD coverage"
        : "Your life and TPD coverage has room to grow",
      body: life.score === 0
        ? `Life and TPD cover protects the people who depend on your income, and can clear outstanding debts so they don't inherit them. ${benchmarkClause}`
        : `Your life and TPD cover of ${prefix}${currentAmount} covers ${life.multiple.toFixed(1)}× your income. ${benchmarkClause} Term life insurance is usually the most cost-efficient way to close the gap.`,
      action: "Term life insurance is the most straightforward and affordable way to get meaningful life and TPD cover. Premiums are significantly lower the younger and healthier you are when you start.",
    });
  }

  // --- P4b: Premium overpay ---
  if (premium.isOverpaying && cards.length < 4) {
    const pct = (premium.ratio * 100).toFixed(1);
    cards.push({
      id: 'premium-overpay',
      priority: 4,
      severity: 'info',
      title: "Your premiums may be higher than needed",
      body: `You're spending ${pct}% of your annual income on insurance premiums. The general guideline is under 10–15%. This could mean you're holding expensive whole-life or investment-linked policies where a term equivalent would give you the same cover for less — freeing up cash for other financial goals.`,
      action: "A policy review can identify where you're paying for coverage you don't need, or where a cheaper structure gives you the same protection. This is worth doing before your next renewal.",
    });
  }

  // --- P4c: Band input nudge ---
  if (result.isEstimated && cards.length < 4) {
    cards.push({
      id: 'band-nudge',
      priority: 5,
      severity: 'nudge',
      title: "Your score is an estimate",
      body: "You used approximate ranges for some of your coverage amounts. Your actual score may be higher or lower. Check your policy documents or your insurer's app for your exact sum assured — it's usually listed under 'Policy Details' or 'Coverage Summary'.",
      action: "Return and update your score with exact figures. It takes under a minute and gives you a more accurate picture.",
    });
  }

  // --- P6: Disability income ---
  // di.score === null means the (optional, supplementary) DI question was
  // never asked — nudge toward answering it. Once answered, show a real
  // gap card with actual numbers instead of the generic nudge; a healthy
  // DI score (≥50) gets no card at all, same as any other covered pillar.
  if (cards.length < 4) {
    const di = pillars.di;
    if (di.score === null) {
      cards.push({
        id: 'di-blindspot',
        priority: 6,
        severity: 'nudge',
        title: "Disability income isn't covered in this score",
        body: "If an injury or illness leaves you unable to work — even temporarily, not just at critical-illness severity — Disability Income (DI) insurance replaces part of your salary while you recover. It's a common Singapore blind spot: many people have CI and hospitalisation cover but no DI, even though a temporary work disability is statistically more likely than a critical illness diagnosis.",
        action: "Ask your adviser whether your employer benefits or existing riders already cover this, and if not, what a DI rider or standalone policy would cost.",
      });
    } else if (di.score < 50) {
      const targetAmount = formatSGD(di.target)
      const currentAmount = di.amount > 0 ? formatSGD(di.amount) : null
      cards.push({
        id: 'di-gap',
        priority: 6,
        severity: 'info',
        title: currentAmount
          ? "Your disability income cover may not be enough"
          : "You have no disability income coverage",
        body: currentAmount
          ? `Your DI cover pays ${currentAmount}/month against a ${targetAmount}/month benchmark (60% of your gross income). If a temporary disability kept you off work, that gap would have to come from savings.`
          : `Without DI cover, a temporary disability that keeps you off work isn't covered by CI (which needs a critical illness diagnosis) or hospitalisation (which only covers the hospital stay itself). The benchmark is ${targetAmount}/month (60% of your gross income).`,
        action: "Ask your adviser whether your employer's group insurance already includes income protection before buying a standalone DI policy.",
      });
    }
  }

  // --- Personalise card order by primaryConcern ---
  // "No hospitalisation" always stays first when present — it's a hard gate
  // on the score, not a matter of personal priority, regardless of concern.
  const hospFirst = (a, b) => {
    if (a.id === 'no-hosp') return -1;
    if (b.id === 'no-hosp') return 1;
    return 0;
  };

  if (primaryConcern === 'overpaying') {
    // Lead with the premium gap — that's literally what they told us worries them.
    const overpayIdx = cards.findIndex(c => c.id === 'premium-overpay');
    if (overpayIdx > 0) {
      const [card] = cards.splice(overpayIdx, 1);
      cards.unshift(card);
    }
  } else if (primaryConcern === 'undercovered') {
    // Lead with whichever gap is largest in dollar terms — "where am I most
    // exposed" is the literal question, so answer it with the real numbers
    // instead of a fixed pillar priority order.
    const gaps = computeGaps(result);
    const amountByCardId = {
      'ci-gap': gaps.find(g => g.id === 'ci')?.amount ?? -1,
      'life-gap': gaps.find(g => g.id === 'life')?.amount ?? -1,
      'di-gap': gaps.find(g => g.id === 'di')?.amount ?? -1,
    };
    cards.sort((a, b) => {
      const gate = hospFirst(a, b);
      if (gate !== 0) return gate;
      const aAmt = amountByCardId[a.id];
      const bAmt = amountByCardId[b.id];
      if (aAmt === undefined && bAmt === undefined) return 0;
      if (aAmt === undefined) return 1;
      if (bAmt === undefined) return -1;
      return bAmt - aAmt;
    });
  } else if (primaryConcern === 'unsure') {
    // "I don't know what I have" — the most useful thing isn't a bigger gap
    // number, it's the nudge to go check policy documents for real figures.
    const nudgeIdx = cards.findIndex(c => c.id === 'band-nudge');
    if (nudgeIdx > 0) {
      const [card] = cards.splice(nudgeIdx, 1);
      cards.unshift(card);
    }
  }
  // 'curious' (or unset) — no personalisation signal, keep the default priority order.

  return cards.slice(0, 4);
}

// ---------------------------------------------------------------------------
// GAP SUMMARY + ACTION PLAN
// ---------------------------------------------------------------------------

/**
 * Per-pillar dollar gaps: how far under (or over) each coverage target the
 * user sits, in SGD. Premium reports over-allocation above the safe ratio.
 * @param {ScoreResult} result
 * @returns {{id:string,label:string,direction:'under'|'over'|'ok',amount:number}[]}
 */
export function computeGaps(result) {
  const { pillars, inputs } = result;
  const { resilience, life, premium, di } = pillars;
  const items = [];

  const ci = resilience.ci;
  const ciShortfall = Math.max(ci.target - ci.amount, 0);
  if (ciShortfall > 0) {
    items.push({ id: 'ci', label: 'Critical illness', direction: 'under', amount: ciShortfall });
  } else if (ci.amount >= ci.target * BENCHMARKS.OVER_INSURED_MULTIPLE) {
    items.push({ id: 'ci', label: 'Critical illness', direction: 'over', amount: ci.amount - ci.target });
  } else {
    items.push({ id: 'ci', label: 'Critical illness', direction: 'ok', amount: 0 });
  }

  const lifeShortfall = Math.max(life.target - life.amount, 0);
  if (lifeShortfall > 0) {
    items.push({ id: 'life', label: 'Life / TPD', direction: 'under', amount: lifeShortfall });
  } else if (life.amount >= life.target * BENCHMARKS.OVER_INSURED_MULTIPLE) {
    items.push({ id: 'life', label: 'Life / TPD', direction: 'over', amount: life.amount - life.target });
  } else {
    items.push({ id: 'life', label: 'Life / TPD', direction: 'ok', amount: 0 });
  }

  if (premium.score !== null) {
    const income = inputs.annualIncome || 0;
    const overSpend = premium.isOverpaying
      ? Math.round(premium.annualPremium - BENCHMARKS.PREMIUM_SAFE_RATIO * income)
      : 0;
    items.push({
      id: 'premium',
      label: 'Premium spend',
      direction: overSpend > 0 ? 'over' : 'ok',
      amount: overSpend,
    });
  }

  // DI is supplementary — only include it once the question's been answered.
  if (di.score !== null) {
    const diShortfall = Math.max(di.target - di.amount, 0);
    if (diShortfall > 0) {
      items.push({ id: 'di', label: 'Disability income (monthly)', direction: 'under', amount: diShortfall });
    } else if (di.target > 0 && di.amount > di.target) {
      items.push({ id: 'di', label: 'Disability income (monthly)', direction: 'over', amount: di.amount - di.target });
    } else {
      items.push({ id: 'di', label: 'Disability income (monthly)', direction: 'ok', amount: 0 });
    }
  }

  return items;
}

/**
 * Prioritised, checkable to-do list built from the score result. Each item
 * carries `ask` — the concrete question to put to a licensed adviser — so
 * users leave with a script, not just a grade.
 * @param {ScoreResult} result
 * @returns {{id:string,title:string,detail:string,ask:string}[]}
 */
export function generateActionPlan(result) {
  const { pillars, inputs } = result;
  const { hosp, resilience, life, premium, di } = pillars;
  const gaps = computeGaps(result);
  const ciGap = gaps.find(g => g.id === 'ci');
  const lifeGap = gaps.find(g => g.id === 'life');
  const diGap = gaps.find(g => g.id === 'di');
  const items = [];

  if (!hosp.passed) {
    items.push({
      id: 'plan-hosp',
      title: hosp.isUnsure
        ? 'Confirm whether you have an Integrated Shield Plan'
        : 'Get hospitalisation cover',
      detail: hosp.isUnsure
        ? "Check your CPF statement or insurer app under 'Active Policies'. MediShield Life is automatic — what you're confirming is the Integrated Shield Plan on top."
        : 'This is the most urgent gap: one hospital stay without cover can cost S$10,000–S$50,000+ out of pocket.',
      ask: 'Which Integrated Shield Plan tier fits my budget, and what would the annual premium be at my age?',
    });
  }

  if (ciGap?.direction === 'under') {
    items.push({
      id: 'plan-ci',
      title: `Close your ${formatSGD(ciGap.amount)} critical illness gap`,
      detail: `Your CI cover is ${formatSGD(resilience.ci.amount)} against a ${formatSGD(resilience.ci.target)} target.`,
      ask: inputs.hasCI === 'yes'
        ? `Can I add a CI top-up rider of ${formatSGD(ciGap.amount)} to my existing plan, or is a standalone term CI policy cheaper?`
        : `What would a standalone term CI policy with ${formatSGD(resilience.ci.target)} of cover cost at my age and health profile?`,
    });
  }

  if (inputs.hasCI === 'yes' && inputs.hasECI === 'no') {
    items.push({
      id: 'plan-eci',
      title: 'Ask about an Early Critical Illness (ECI) rider',
      detail: 'Your CI policy likely only pays at late-stage diagnosis. ECI covers early-stage, when treatment is most intensive.',
      ask: 'Does my current CI plan allow an ECI rider, and what would it add to my premium?',
    });
  }

  if (lifeGap?.direction === 'under') {
    items.push({
      id: 'plan-life',
      title: `Close your ${formatSGD(lifeGap.amount)} life/TPD gap`,
      detail: `Your life/TPD cover is ${formatSGD(life.amount)} against a ${formatSGD(life.target)} target.`,
      ask: `What would term life insurance with ${formatSGD(life.target)} of cover cost, and until what age should the term run?`,
    });
  }

  if (ciGap?.direction === 'over' || lifeGap?.direction === 'over') {
    const overPillars = [
      ciGap?.direction === 'over' ? 'critical illness' : null,
      lifeGap?.direction === 'over' ? 'life/TPD' : null,
    ].filter(Boolean).join(' and ');
    items.push({
      id: 'plan-over',
      title: `Review possible over-insurance on ${overPillars}`,
      detail: 'Your cover sits well above the benchmark. Extra cover is not wasted, but the premium difference may serve you better elsewhere.',
      ask: 'If I reduced this cover to the benchmark, how much premium would I free up — and are there surrender costs or re-underwriting risks in changing it?',
    });
  }

  if (premium.isOverpaying) {
    items.push({
      id: 'plan-premium',
      title: 'Review your total premium spend',
      detail: `You're spending ${(premium.ratio * 100).toFixed(1)}% of income on premiums — above the 15% guideline.`,
      ask: 'Which of my policies have the highest premium-to-cover ratio, and would a term equivalent give the same protection for less?',
    });
  }

  if (diGap?.direction === 'under') {
    items.push({
      id: 'plan-di',
      title: di.amount > 0
        ? `Close your ${formatSGD(diGap.amount)}/month disability income gap`
        : 'Get disability income (DI) cover',
      detail: `Your DI cover pays ${formatSGD(di.amount)}/month against a ${formatSGD(di.target)}/month target (60% of gross income).`,
      ask: 'Does my employer already provide income protection, and if not, what would a DI rider or standalone policy cost to reach 60% of my income?',
    });
  }

  if (result.isEstimated) {
    items.push({
      id: 'plan-exact',
      title: 'Replace estimates with your exact sums assured',
      detail: "Check your policy documents or insurer app under 'Policy Details' for exact figures, then re-run your check.",
      ask: '',
    });
  }

  // --- Personalise item order by primaryConcern — mirrors generateInsights ---
  const { primaryConcern } = inputs;
  const hospFirst = (a, b) => {
    if (a.id === 'plan-hosp') return -1;
    if (b.id === 'plan-hosp') return 1;
    return 0;
  };

  if (primaryConcern === 'overpaying') {
    const idx = items.findIndex(i => i.id === 'plan-premium' || i.id === 'plan-over');
    if (idx > 0) {
      const [item] = items.splice(idx, 1);
      items.unshift(item);
    }
  } else if (primaryConcern === 'undercovered') {
    const amountByItemId = {
      'plan-ci': ciGap?.direction === 'under' ? ciGap.amount : -1,
      'plan-life': lifeGap?.direction === 'under' ? lifeGap.amount : -1,
      'plan-di': diGap?.direction === 'under' ? diGap.amount : -1,
    };
    items.sort((a, b) => {
      const gate = hospFirst(a, b);
      if (gate !== 0) return gate;
      const aAmt = amountByItemId[a.id];
      const bAmt = amountByItemId[b.id];
      if (aAmt === undefined && bAmt === undefined) return 0;
      if (aAmt === undefined) return 1;
      if (bAmt === undefined) return -1;
      return bAmt - aAmt;
    });
  } else if (primaryConcern === 'unsure') {
    const idx = items.findIndex(i => i.id === 'plan-exact');
    if (idx > 0) {
      const [item] = items.splice(idx, 1);
      items.unshift(item);
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// LIFE-EVENT "WHAT IF" PRESETS
// ---------------------------------------------------------------------------

/**
 * Life events that map onto a real, already-modelled input change — each one
 * demonstrably moves the score, unlike a purely cosmetic preset would.
 * `apply` returns a new inputs object; it never mutates the original.
 */
export const LIFE_EVENT_PRESETS = [
  {
    id: 'family',
    label: 'Get married or start a family',
    description: 'Someone now depends on your income.',
    apply: (inputs) => ({ ...inputs, hasDependents: 'yes' }),
  },
  {
    id: 'home',
    label: 'Buy a home',
    description: `Adds a typical ${formatSGD(BENCHMARKS.TYPICAL_HOME_LOAN)} HDB/private mortgage.`,
    apply: (inputs) => ({ ...inputs, outstandingDebt: (inputs.outstandingDebt || 0) + BENCHMARKS.TYPICAL_HOME_LOAN }),
  },
  {
    id: 'debt-free',
    label: 'Pay off your loans',
    description: 'Clears all outstanding debt from your targets.',
    apply: (inputs) => ({ ...inputs, outstandingDebt: 0 }),
  },
  {
    id: 'conservative',
    label: 'Go more conservative',
    description: 'Switches your risk profile to "Conservative".',
    apply: (inputs) => ({ ...inputs, riskProfile: 'conservative' }),
  },
];

/**
 * Recompute the score under a life-event preset, without touching the
 * original inputs or any stored state.
 * @param {UserInputs} inputs
 * @param {string} presetId
 * @returns {{preset:Object, before:ScoreResult, after:ScoreResult}|null}
 */
export function simulateLifeEvent(inputs, presetId) {
  const preset = LIFE_EVENT_PRESETS.find(p => p.id === presetId);
  if (!preset) return null;
  const before = calculateScore(inputs);
  const after = calculateScore(preset.apply(inputs));
  return { preset, before, after };
}

/**
 * Same as simulateLifeEvent, but composes multiple presets together —
 * life events often stack (e.g. marriage + a home in the same year).
 * Presets apply in LIFE_EVENT_PRESETS order; a later preset can override
 * an earlier one's effect on the same field (e.g. "pay off loans" after
 * "buy a home" nets to zero debt, not both changes independently).
 * @param {UserInputs} inputs
 * @param {string[]} presetIds
 * @returns {{presets:Object[], before:ScoreResult, after:ScoreResult}|null}
 */
export function simulateLifeEvents(inputs, presetIds) {
  const presets = LIFE_EVENT_PRESETS.filter(p => presetIds.includes(p.id));
  if (presets.length === 0) return null;
  const before = calculateScore(inputs);
  const combinedInputs = presets.reduce((acc, preset) => preset.apply(acc), inputs);
  const after = calculateScore(combinedInputs);
  return { presets, before, after };
}

// ---------------------------------------------------------------------------
// PILLAR EXPLANATIONS
// ---------------------------------------------------------------------------

/**
 * Plain-language reasoning for why a pillar scored what it did — including
 * flagging likely over-insurance when a score sits well above its benchmark,
 * not just under-insurance.
 * @param {'hosp'|'ci'|'eci'|'life'|'premium'} id
 * @param {ScoreResult} result
 * @returns {string}
 */
export function explainPillar(id, result) {
  const { pillars, inputs } = result;
  const { hosp, resilience, life, premium, di } = pillars;
  const { hasCI, hasECI, outstandingDebt } = inputs;
  const debt = outstandingDebt || 0;
  const debtNote = debt > 0 ? ` (plus your ${formatSGD(debt)} in outstanding loans)` : '';

  switch (id) {
    case 'hosp': {
      if (hosp.passed) {
        return "You have hospitalisation cover — a serious illness won't immediately mean unaffordable ward bills. This pillar is a pass/fail gate: since you're covered, it doesn't cap your overall score.";
      }
      if (hosp.isUnsure) {
        return "You're not sure if you're covered. All Singapore Citizens and PRs get MediShield Life automatically, but that only covers subsidised public wards — check if you also have an Integrated Shield Plan for private or restructured wards. Because this is unconfirmed, your overall score is capped at 50 until it's resolved.";
      }
      return "You have no hospitalisation cover on file. This is a pass/fail gate, not a partial score — without it, your overall score is capped at 50 regardless of how well covered you are elsewhere, because a single hospital stay could still wipe out your savings.";
    }

    case 'ci': {
      const { amount, target, score, adequateMultiple } = resilience.ci;
      const ciMultipleLabel = `${adequateMultiple}×`;
      if (hasCI !== 'yes') {
        return hasCI === 'unsure'
          ? `You're not sure if you have critical illness (CI) cover, so this scores 0. Your benchmark for adequate cover is ${formatSGD(target)} — ${ciMultipleLabel} your annual income${debtNote}.`
          : `You have no CI cover, so this scores 0. Your benchmark for adequate cover is ${formatSGD(target)} — ${ciMultipleLabel} your annual income${debtNote}.`;
      }
      if (amount >= target * BENCHMARKS.OVER_INSURED_MULTIPLE) {
        return `Your CI cover of ${formatSGD(amount)} is well above your ${formatSGD(target)} benchmark (${ciMultipleLabel} income${debtNote}) — capped at 100, but you may be over-insured here. Extra CI cover isn't wasted since claims pay a lump sum once, but if the gap is large, the premium difference could likely do more for you in an underinsured area, or in savings.`;
      }
      if (score >= 100) {
        return `Your CI cover of ${formatSGD(amount)} meets your ${formatSGD(target)} benchmark (${ciMultipleLabel} income${debtNote}) — a full score, and not far enough above it to flag as over-insurance.`;
      }
      const shortfall = target - amount;
      return `Your CI cover of ${formatSGD(amount)} is ${formatSGD(shortfall)} below your ${formatSGD(target)} benchmark (${ciMultipleLabel} income${debtNote}), so this pillar scores ${score}/100 — proportional to how much of the benchmark you've reached.`;
    }

    case 'eci': {
      const { boost, amount } = resilience.eci;
      if (hasCI !== 'yes') {
        return "ECI is a rider on a CI policy, so it doesn't apply until you have CI cover — this scores 0 until that gap is closed.";
      }
      if (boost >= 20) {
        return `Your ECI cover of ${formatSGD(amount)} is at or above 1.5× your income — full marks. This is already strong early-stage protection; more ECI cover beyond this level has limited extra benefit.`;
      }
      if (boost >= 10) {
        return `Your ECI cover of ${formatSGD(amount)} is between 0.8× and 1.5× your income — partial credit. Topping up toward 1.5× your income would get you the remaining points here.`;
      }
      if (boost > 0) {
        return `Your ECI cover of ${formatSGD(amount)} is below 0.8× your income — light protection, worth only a small boost.`;
      }
      return hasECI === 'unsure'
        ? "You're not sure if you have ECI — check your policy for an \"early stage\" or \"special benefit\" clause. Until confirmed, this scores 0."
        : "You don't have ECI cover, so your CI policy likely only pays out at late-stage diagnosis. This scores 0.";
    }

    case 'life': {
      const { amount, target, score, multiple, adequateMultiple, usesIncomeMultiple } = life;
      const lifeBenchmarkLabel = usesIncomeMultiple
        ? `${formatSGD(target)} benchmark (${adequateMultiple}× income${debtNote})`
        : `${formatSGD(target)} benchmark (your outstanding loans plus a final-expenses buffer, since no one depends on your income)`;
      if (result.inputs.hasLife !== 'yes') {
        return result.inputs.hasLife === 'unsure'
          ? `You're not sure if you have life/TPD cover, so this scores 0. Your benchmark is ${lifeBenchmarkLabel}.`
          : `You have no life/TPD cover, so this scores 0. Your benchmark is ${lifeBenchmarkLabel}.`;
      }
      if (amount >= target * BENCHMARKS.OVER_INSURED_MULTIPLE) {
        return `Your life/TPD cover of ${formatSGD(amount)} (${multiple.toFixed(1)}× income) is well above your ${lifeBenchmarkLabel} — capped at 100, but you may be over-insured here. Worth checking whether that premium could be better used elsewhere, unless you have specific reasons (e.g. estate planning, business needs) for the extra cover.`;
      }
      if (score >= 100) {
        return `Your life/TPD cover of ${formatSGD(amount)} meets your ${lifeBenchmarkLabel} — a full score, and not far enough above it to flag as over-insurance.`;
      }
      const shortfall = target - amount;
      return `Your life/TPD cover of ${formatSGD(amount)} (${multiple.toFixed(1)}× income) is ${formatSGD(shortfall)} below your ${lifeBenchmarkLabel}, so this pillar scores ${score}/100.`;
    }

    case 'premium': {
      if (premium.score === null) {
        return "You didn't provide your premium spend, so this pillar isn't scored (and its weight is redistributed to the others). Add it to see whether you're paying efficiently for your cover.";
      }
      const pct = (premium.ratio * 100).toFixed(1);
      if (premium.score === 100) {
        return `You're spending ${pct}% of your income on premiums — at or below the 10% guideline, so this scores full marks. Spending this little isn't a red flag by itself, but it's worth double-checking the gaps above aren't the reason why.`;
      }
      if (premium.isOverpaying) {
        return `You're spending ${pct}% of your income on premiums — above the 15% guideline, so this scores 0. This often means whole-life or investment-linked policies, where a term-insurance equivalent would give the same cover for less.`;
      }
      return `You're spending ${pct}% of your income on premiums — between the 10% efficient guideline and the 15% overpay threshold, so this scores partial marks. Not alarming, but there may be room to trim.`;
    }

    case 'di': {
      if (di.score === null) {
        return "You haven't answered whether you have disability income (DI) cover. This is supplementary — it doesn't affect your main score — but it's worth checking, since it's a common gap even for well-insured people.";
      }
      if (inputs.hasDI !== 'yes') {
        return `You have no DI cover, so this scores 0. The benchmark is ${formatSGD(di.target)}/month — 60% of your gross monthly income, the typical DI payout cap. This is separate from your main score and doesn't affect it.`;
      }
      if (di.score >= 100) {
        return `Your DI cover of ${formatSGD(di.amount)}/month meets the ${formatSGD(di.target)}/month benchmark (60% of gross income) — a full score on this supplementary check.`;
      }
      const shortfall = di.target - di.amount;
      return `Your DI cover of ${formatSGD(di.amount)}/month is ${formatSGD(shortfall)}/month below the ${formatSGD(di.target)}/month benchmark, so this scores ${di.score}/100. This is separate from your main score and doesn't affect it.`;
    }

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

export function formatSGD(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getBandColor(color) {
  const map = {
    red:   { bg: '#3a1414', text: '#fca5a5', arc: '#ef4444' },
    amber: { bg: '#3a1f12', text: '#fdba74', arc: '#ff5722' },
    blue:  { bg: '#0f2a38', text: '#93d9fb', arc: '#38bdf8' },
    teal:  { bg: '#0f2e23', text: '#6ee7b7', arc: '#10b981' },
  };
  return map[color] ?? map.red;
}

export function getSeverityStyle(severity) {
  // `border`/`arc`-style colors are tuned for use as a saturated accent
  // (borders, bars, pill fills paired with white text) — too light to pass
  // WCAG AA as plain text on a dark background. `text` is the lightened
  // variant safe for that use; pills use the same dark-bg/light-text
  // pattern as the score band pill (getBandColor).
  const map = {
    critical: { border: '#ef4444', text: '#fca5a5', bg: '#3a1414', pillBg: '#3a1414', pillText: '#fca5a5', pillLabel: 'Critical gap' },
    warning:  { border: '#ff5722', text: '#fdba74', bg: '#3a1f12', pillBg: '#3a1f12', pillText: '#fdba74', pillLabel: 'Gap found' },
    info:     { border: '#38bdf8', text: '#93d9fb', bg: '#0f2a38', pillBg: '#0f2a38', pillText: '#93d9fb', pillLabel: 'Worth noting' },
    nudge:    { border: '#10b981', text: '#6ee7b7', bg: '#0f2e23', pillBg: '#0f2e23', pillText: '#6ee7b7', pillLabel: 'Tip' },
  };
  return map[severity] ?? map.info;
}
