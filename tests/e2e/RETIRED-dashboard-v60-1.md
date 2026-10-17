# Dashboard v60.1 — re-pointed locks

Nothing was retired. Two older locks pinned wording this pass changes, and were re-pointed:

| Lock | Was | Now | Why |
|---|---|---|---|
| `dashV58.measure.ts` H1 "eyebrow" | the constant `— NOW QUERYING —` | `— {sidebar status, upper case} —`, read from the sidebar's own `[data-ms="standing"]` | the eyebrow reads the sidebar's function now (DB601 S1) |
| `dashV60.measure.ts` P8 "the count is the tiles'" | `n OF 4 · NOTHING REQUIRED` | `n OF 4 · OPTIONAL` | the pack's counter wording |

Unit: `dashboardPageSmoke.test.tsx` now looks for "No agents yet." and "Where do I start?" (day one) and `— QUERYING —` (its fixture's status) where it looked for "Your list starts here." and `— NOW QUERYING —`.
