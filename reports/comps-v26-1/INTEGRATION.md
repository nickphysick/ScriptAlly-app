# Comparable titles v26.1 — the dev build

On this branch only. `comps-v26-1` itself is unchanged.

- **Branch:** `dev/query-panel-v1-onb9-tip-onb9-comps26-1`
- **Merge commit:** `36bb682f` — `comps-v26-1` at `ebb93316` merged into `dev/query-panel-v1-onb9-tip-onb9-comps26` at `5990b6f5` (what dev served before).
- **The merge was automatic.** No conflict; the design refs check clean (268).
- **Rules:** `firestore.rules` and `functions/` are unchanged by the merge. No rules deploy was made.

## Gates on the merged tree

| Gate | Result |
|---|---|
| Typecheck, app and functions | clean |
| Vitest | 573 files, 8,654 passed, 3 skipped, none failed |
| Production build | clean |
| Dev build | clean (`index-D2MP5Ba8.js`) |

## Suites on the merged build

All at `http://127.0.0.1:4428`, serving the merged dev bundle.

| Suite | Result |
|---|---|
| AD locks (`compsV26.measure.ts`), 1512 × 900 and 1280 × 800 | 171 readings green: AD1 16 · AD2 14 · AD3 36 · AD4 14 · AD5 18 · AD6 18 · AD7 11 · AD8 12 · AD9 10 · AD10 22 |
| CV25 locks (`compsV25.measure.ts`) | 201 readings green: B1 18 · B2 32 · C1 14 · D1 8 · D2 29 · D3 9 · D4 8 · E1 18 · F1 24 · L1 10 · A1 8 · E2 11 · A3 12 |
| Query panel v1 (`queryPanelV1.measure.ts`) | 11 passed, none failed |
| Onboarding v9 (`onbV9.measure.ts`) | 30 passed, none failed |
| Onboarding v9 walk (`onbV9Walk.measure.ts`, one worker) | 5 passed, none failed: the four journeys, and `template-mixed.csv` through the gated review to the dashboard |

**No lock reads differently from `comps-v26-1`.** Every reading has the same name and the same result. A1 and AD6 differ only in the random ids a new comp is given.
