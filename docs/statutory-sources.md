# Statutory constants — source register

Every hard-coded Singapore statutory figure in the calculation engines, with
its authoritative source and the date it was last verified. `src/lib/shared/statutory-currency.test.js`
asserts this file stays current and lists every `*_AS_OF` marker in the code.

**Audit date: 2026-08-31**

`src/lib/shared/statutory-currency.test.js` fails CI when this audit is more
than ~3 months old, when anything is left under *Open discrepancies*, or when
an entry under *Scheduled changes* has reached its effective date while still
`pending`. Rows re-checked on 2026-10-18 (marked below) were verified against
excerpts of the official CPF Board and LTA pages; `cpf.gov.sg` could not be
fetched directly from that session, so a full re-audit should still open
each source in a browser and move the Audit date.

When re-verifying: check each source URL, update the value **and** its
`*_AS_OF` marker in the code if it changed, update the "Verified" column and
the Audit date above, and move any resolved discrepancy out of the section
at the bottom.

---

## Income tax — `src/lib/tax/calc.js` (`TAX_RATES_AS_OF = '2026-01-01'`)

| Constant | Value | Source | Verified |
|---|---|---|---|
| `TAX_BANDS` | Resident progressive schedule, YA2024 onwards (0% to 24%, top rates 23% on $500k–1M and 24% above $1M) | [IRAS — Individual income tax rates](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-rates/individual-income-tax-rates) | 2026-08-31 ✓ |
| `PERSONAL_RELIEF_CAP` | $80,000 per YA (unchanged since YA2018) | [IRAS — Personal income tax relief cap](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/personal-income-tax-relief-cap) | 2026-08-31 ✓ |
| `SRS_CAP_CITIZEN_PR` / `SRS_CAP_FOREIGNER` | $15,300 / $35,700 (unchanged since 2016) | [IRAS — SRS contributions](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/srs-contributions) | 2026-08-31 ✓ |
| `RSTU_RELIEF_CAP_SELF` / `_FAMILY` | $8,000 / $8,000 | [IRAS — CPF cash top-up relief](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/central-provident-fund-(cpf)-cash-top-up-relief) | 2026-08-31 ✓ |
| `COURSE_FEES_CAP` | $5,500 | [IRAS — Course fees relief](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/course-fees-relief) | 2026-08-31 ✓ |
| `EARNED_INCOME_RELIEF`, `PARENT_RELIEF_*`, `CHILD_RELIEF`, `NSMAN_RELIEF` | $1k/$6k/$8k by age; $9k/$5.5k; $4k; $1.5k–$5k | [IRAS — Tax reliefs](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs) | 2026-08-31 ✓ |

## CPF — `src/lib/retire/cpf.js` (`CPF_RATES_AS_OF = '2026-01-01'`)

| Constant | Value | Source | Verified |
|---|---|---|---|
| `CPF_OW_CEILING` | $8,000/month (from 1 Jan 2026; phase-in from $6,000) | [CPFB — CPF changes 2026](https://www.cpf.gov.sg/employer/infohub/news/cpf-related-announcements) | 2026-08-31 ✓ |
| `CPF_ANNUAL_CEILING` | $102,000/year (unchanged since 2016) | [CPFB — How much CPF contributions to pay](https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay) | 2026-08-31 ✓ |
| `CPF_CONTRIBUTION_TABLE` — 55 and below | total 37% | [CPFB — Contribution rates from 1 Jan 2026 (Table 1)](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf) | 2026-08-31 ✓ |
| `CPF_CONTRIBUTION_TABLE` — above 55 to 60 | total 34% (16% employer + 18% employee); allocation OA 12% / RA 11.5% / MA 10.5% (CPF ratios .353 / .3382 / .3088 of the total) | [CPFB — Contribution rates from 1 Jan 2026](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf), [CPFB — Allocation rates from 1 Jan 2026](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf) | 2026-10-18 ✓ |
| `CPF_CONTRIBUTION_TABLE` — above 60 to 65 | total 25% (12.5% + 12.5%); allocation OA 3.5% / RA 11% / MA 10.5% (CPF ratios .14 / .44 / .42 of the total) | same | 2026-10-18 ✓ |
| `CPF_CONTRIBUTION_TABLE` — above 65 to 70 / above 70 | total 16.5% / 12.5% | same | 2026-08-31 ✓ |
| `CPF_OA_RATE` | 2.5% p.a. | [CPFB — CPF interest rates Q1 2026](https://www.cpf.gov.sg/member/infohub/news/news-releases/cpf-interest-rates-from-1-january-to-31-march-2026-and-basic-healthcare-sum-for-2026) | 2026-08-31 ✓ |
| `CPF_SA_RATE` / `CPF_MA_RATE` | 4% p.a. (4% floor extended to 31 Dec 2026) | [CPFB — 4% floor extended](https://www.cpf.gov.sg/member/infohub/news/news-releases/government-extends-4-per-cent-interest-rate-floor-on-special-medisave-and-retirement-account-monies-until-31-december-2026) | 2026-08-31 ✓ |
| `CPF_EXTRA_*` (extra interest tiers/caps: +1% below 55 on $60k, +2%/+1% from 55 on $30k/$30k, OA sub-cap $20k) | as coded | [CPFB — Earning attractive interest](https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/earning-attractive-interest) | 2026-08-31 ✓ |
| `CPF_FRS_BASE` / `CPF_FRS_BASE_YEAR` | $220,400 / 2026 (2025 was $213,000) | [CPFB — Retirement sums](https://www.cpf.gov.sg/member/retirement-income/retirement-sums) | 2026-08-31 ✓ |
| `CPF_BHS_BASE` / `CPF_BHS_BASE_YEAR` | $79,000 / 2026 (2025 was $75,500) | [CPFB — Basic Healthcare Sum 2026](https://www.cpf.gov.sg/member/infohub/news/news-releases/cpf-interest-rates-from-1-january-to-31-march-2026-and-basic-healthcare-sum-for-2026) | 2026-08-31 ✓ |

`CPF_FRS_GROWTH_RATE` (3.5% p.a.) and `CPF_BHS_GROWTH_RATE` (4.75% p.a.) are the app's own forward-projection assumptions off the labeled base year, not statutory figures.

## SRS withdrawal — `src/lib/retire/srs.js` (`SRS_AS_OF = '2026-01-01'`)

| Constant | Value | Source | Verified |
|---|---|---|---|
| `SRS_RETIREMENT_AGE` | 64 — the statutory retirement age from 1 Jul 2026, which is the penalty-free age locked in by a first SRS contribution made from then (63 for first contributions 1 Jul 2022–30 Jun 2026; 62 before) | [MOM — Retirement age](https://www.mom.gov.sg/employment-practices/retirement), [IRAS — Withdrawing from SRS](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/withdrawing-from-srs) | 2026-10-18 ✓ |
| `SRS_WITHDRAWAL_TAXABLE_FRACTION` | 50% (from statutory retirement age, spread over up to 10 years) | [IRAS — Withdrawing from SRS](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/withdrawing-from-srs) | 2026-08-31 ✓ |
| `SRS_EARLY_WITHDRAWAL_PENALTY_PCT` / `SRS_MAX_WITHDRAWAL_YEARS` | 5% / 10 years | same | 2026-08-31 ✓ |

## Stamp duty — `src/lib/house/stampDuty.js`

| Constant | Value | Source | Verified |
|---|---|---|---|
| `BSD_TIERS` (`BSD_AS_OF = '2023-02-15'`) | 1%/2%/3%/4%/5%/6% on $180k/$360k/$1M/$1.5M/$3M/rest (residential; last revised 15 Feb 2023, still current) | [IRAS — Buyer's Stamp Duty](https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/buyer's-stamp-duty-(bsd)) | 2026-08-31 ✓ |
| `ABSD_REFERENCE` (`ABSD_AS_OF = '2023-04-27'`) | SC 0/20/30%, PR 5/30%, Foreigner 60%, Entity 65% (last revised 27 Apr 2023, still current) | [IRAS — Additional Buyer's Stamp Duty](https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer's-stamp-duty-(absd)) | 2026-08-31 ✓ |
| `calcSSD` schedules (`SSD_AS_OF = '2025-07-03'`, `SSD_REGIME_CUTOVER_DATE = '2025-07-04'`) | old: 12/8/4% over 3 yrs; new: 16/12/8/4% over 4 yrs (purchases on/after 4 Jul 2025) | [IRAS — Seller's Stamp Duty](https://www.iras.gov.sg/taxes/stamp-duty/for-property/selling-or-disposing-property/seller's-stamp-duty-(ssd)-for-residential-property) | 2026-08-31 ✓ |
| `HDB_MOP_YEARS` | 5 years | [HDB — Minimum Occupation Period](https://www.hdb.gov.sg/residential/selling-a-flat/eligibility) | 2026-08-31 ✓ |

## PARF rebate — `src/lib/drive/calc.js` (`PARF_AS_OF = '2026-02-16'`)

Two schedules, chosen by when the car's COE was issued (`parfRegimeFor` / `parfRegimeForAge`). `PARF_AS_OF` is the first day of the 2nd Feb 2026 COE bidding exercise, the first COE the revised schedule applies to.

| Constant | Value | Source | Verified |
|---|---|---|---|
| `PARF_SCHEDULES.revised2026` | 30% of ARF at ≤5yr, 25% / 20% / 15% / 10% / 5% at 6 / 7 / 8 / 9 / 10yr, nil after; cap **S$30,000**. Applies to COEs from the 2nd Feb 2026 bidding exercise onwards (and COE-exempt vehicles registered on/after 13 Feb 2026) | [LTA — Revision of PARF rebate schedule and cap (12 Feb 2026)](https://www.lta.gov.sg/content/ltagov/en/newsroom/2026/2/news-releases/revision-parf-rebate-schedule-cap.html) | 2026-10-18 ✓ |
| `PARF_SCHEDULES.legacy` | 75% of ARF at ≤5yr, 70% / 65% / 60% / 55% / 50% at 6 / 7 / 8 / 9 / 10yr, nil after; cap **S$60,000**. Cars registered before the cutover keep this for life | same | 2026-10-18 ✓ |

## EV Early Adoption Incentive — `src/lib/drive/calc.js` (`EEAI_AS_OF = '2026-01-01'`, `EEAI_END = '2027-01-01'`)

| Constant | Value | Source | Verified |
|---|---|---|---|
| `calcEEAI` | 45% of ARF, capped at S$7,500 for registrations in 2026 (S$15,000 in 2025, not modeled: older EVs use the 2026 cap); **ceases for registrations from 1 Jan 2027** | [LTA/NEA — Extension of VES and EEAI (Sep 2025)](https://www.lta.gov.sg/content/ltagov/en/newsroom/2025/9/news-releases/extension_of_ves_and_eeai_to_support_vehicle_electrification.html) | 2026-10-18 ✓ |

## COE fallback — `src/lib/drive/calc.js` (`COE_FALLBACK_AS_OF = '2026-07-01'`)

`COE_FALLBACK` is a stale-data fallback only; the live figure comes from data.gov.sg's mirror of LTA's COE Bidding Results. Freshness is surfaced on `/drive/data-status`. Not re-verified here — it self-heals from the live feed.

## ETF illustrative data — `src/lib/etf/logic.js` (`RETURNS_AS_OF`, `BROKER_DATA_AS_OF`, `FEE_BENCHMARK_AS_OF = 'mid-2025'`)

Illustrative historical returns, broker fee tables, and expense-ratio benchmarks — not statutory. Labeled in the UI; out of this register's scope beyond noting the markers exist.

---

## Open discrepancies

Wrong shipping constants that are known but not yet fixed. **This section must be
empty for CI to pass**: fixing a value changes calculator output, so each entry is
a follow-up to do now, not a note to leave. Format: one numbered item each.

None.

## Resolved discrepancies

- **2026-10-18** — `CPF_CONTRIBUTION_TABLE` 55–60 (was 32.5%) and 60–65 (was 23.5%) updated to the 1 Jan 2026 rates of 34% and 25%, with the sub-account allocation re-derived from CPF Board's allocation table (the 2026 increase goes to the Retirement Account).
- **2026-10-18** — `SRS_RETIREMENT_AGE` raised from 63 to 64 (statutory retirement age from 1 Jul 2026).
- **2026-10-18** — PARF: Budget 2026 schedule and S$30,000 cap added; the old schedule is kept for cars registered before the cutover. Previously every car was given the old 75% / S$60,000 schedule.

## Scheduled changes

Known future changes to a rule the app encodes. When an effective date arrives
and the row is still `pending`, CI fails until the code, this register and the
row are updated together (set the last column to `applied`). Format of each row:
`| <effective date> | <what changes> | <where it lives> | pending or applied |`.

| Effective | Change | Where | Status |
|---|---|---|---|
| 2027-01-01 | EEAI ceases for new registrations; `calcEEAI` is date-gated, so no code change is needed | `src/lib/drive/calc.js` | applied |
| 2027-01-01 | CPF senior-worker contribution rates rise a further 1.5 points for 55–60 (to 35.5%) and 1 point for 60–65 (to 26%); the `CPF_CONTRIBUTION_TABLE` bands and their Retirement Account allocation need updating (or the table made date-aware) | `src/lib/retire/cpf.js` | pending |
