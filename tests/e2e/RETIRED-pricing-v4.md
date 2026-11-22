# Retired by Pricing page v4 (24 Oct 2026; ref design-refs/pricing-page-v2.html)

| Retired | Why | Replaced by |
|---|---|---|
| `tests/e2e/pricingV3.measure.ts` (PV1–PV5) | Measured the v3 page (ref pricing-page-v1): the navy founding band, the tally counter, "How long will I need?" and its five-tile result row — none of which renders now. | `tests/e2e/pricingV4.measure.ts` PV4-1…PV4-5 |
| `scripts/pricing-v3-refoutputs.mjs` | Drove pricing-page-v1's estimate script. | `scripts/pricing-v4-refoutputs.mjs` (pricing-page-v2, "I don't know" and "Not sure yet" included, 810 cases) |
| `scripts/pricing-v3-shots.mjs`, `scripts/pricing-v3-journey-shots.mjs` | Review shots against pricing-page-v1. | `scripts/pricing-v4-journey-shots.mjs`, and the `shots` case in `pricingV4.measure.ts` |

Re-pointed, not retired: `landingColoursV2.measure.ts` S1 (its /pricing note now describes the box) and F2
(/pricing's counter and form are back on a light ground, so the page is back in the lock; new break
`LC2_MUTATE=F2pricing`).
