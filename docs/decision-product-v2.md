# єКапітал: decision product v2

## Promise

Find what a person can realistically explore with available money; compare consequences under explicitly different conditions; lead to a verified next step. Not a spending tracker, guaranteed forecast, bank safety score, or substitute for a concrete contract quote.

## Implemented

- Compact root opportunity workspace; detailed bank catalog remains /app/offers.
- Monthly/annual contribution presentation, 1/3/5/10-year horizons, reference UAH/USD/EUR and Ukraine CPI purchasing power.
- Macro conditions: unchanged FX + recent CPI, trailing 5/10-year compounded historical pace, empirical maximum rolling 12-month FX/CPI stress repeated annually. Stress extremes need not coincide. No probabilities implied.
- Month-specific contribution conversion. Fixed-deposit mechanics preserve minimums, term dates, top-ups, maturity and paid interest. Future renewal rates are held fixed only as a scenario.
- Currency savings, deposits, explicitly approximate OVDP placement-yield reference, historical fund distribution/flat NAV, 50/50 USD+fund without rebalancing.
- Retrospective 5/10-year one-time cash/FX comparison using official NBU rates and CPI. Not a bank-tradable backtest; no historical spread or fees.
- Specific rental/commercial property economics and specific business economics. Region is a label, not a market-derived ranking. Business uses sourced 2026 FOP 2 / FOP 3 no-VAT tax scenarios and losses/break-even.
- Plans record assumptions and source dates; no implied transactions.

## Verified source routes

- Bank offers: official provider URLs in bank-providers.ts, six-hour refresh with last-verified retention and staleness exclusion.
- FX/CPI history: NBU + State Statistics; month-end checkpoints at initial load, full daily history on demand.
- Runtime public macro refresh checks CPI and USD/EUR history independently every 24 hours. Failed or older source responses preserve last verified series and report source health; fund reports still follow scheduled ingestion.
- FOP 2026: https://sumy.tax.gov.ua/media-ark/news-ark/print-975635.html
- ESV: https://ck.tax.gov.ua/media-ark/news-ark/978697.html
- Rent tax: https://rv.tax.gov.ua/deklaratsiyna-kampaniya-2026/informatsiyni-povidomlennya/print-1047451.html
- Registration: https://diia.gov.ua/services/reyestraciya-fop
- KVED: https://kved.ukrstat.gov.ua/KVED2010/kv10_i.html

## Not falsely implemented

- Independent bank resilience rating: requires named agency/report, methodology, effective date and licensed/public feed. Yield ranking is not safety ranking.
- Live property/industry margin intelligence: needs authorized listings/data feed, regional sample sizes, transaction versus asking price distinction and quality checks. No guessed rental or business averages.
- AI: requires a scoped provider integration; assistant must call deterministic calculators, cite source timestamps, refuse unknown numbers and keep assumptions separate from facts. Do not allow generated investment projections to replace validated math.
- Passkey accounts: inspected snowbhub/varangym frontend/src/lib/api.js, real WebAuthn options/verify flow. Current Railway e-kapital has no database or persistent volume. Do not reuse gym accounts or expose a fake Face ID button. Separate account/credential/challenge/session/profile storage, ownership isolation, recovery/export and deployment RP_ID/origin are prerequisites.

## Monetization constraints

Affiliate placements can be offered only after an agreement. Disclose affiliate compensation next to links, never secretly alter comparison order, preserve unsupported-data warnings, and do not claim existing partnerships. Licensed quote/data coverage and retention should precede growth claims. No promise of a million users or guaranteed revenue.
