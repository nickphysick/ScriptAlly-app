# Comparable titles v27.1 — the dev build

On this branch only. `comps-v27-1` itself is unchanged.

- **Branch:** `dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1`
- **Merge commit:** `29d03459` — `comps-v27-1` at `fc8dbdd7` merged into `dev/…-comps27-qp2b` at `20734f85`.
- **The base was checked before merging.** Dev had moved on from `…-comps27`: another session had deployed `…-comps27-qp2b` (query panel v2's ruling 3) on top of it. That branch contains the comps v27 build, so v27.1 is merged into it and everything dev carried is kept.
- **The merge was automatic.** No conflict; the design refs check clean (288).
- **Rules:** `firestore.rules` and `functions/` are unchanged by the merge. No rules deploy was made.

## Gates on the merged tree

| Gate | Result |
|---|---|
| Typecheck, app and functions | clean |
| Vitest | 577 files, 8,700 passed, 3 skipped, none failed |
| Production build | clean |
| Dev build | clean (`index-BPI6h562.js`) |

## Suites on the merged build

All at `http://127.0.0.1:4428`, serving the merged dev bundle.

| Suite | Result |
|---|---|
| New locks (`compsV271.measure.ts`) | 60 readings green: W1 16 · W2 14 · X1 30 |
| V27 locks | 106 readings green |
| AD locks | 161 readings green |
| CV25 locks | 196 readings green |
| Query panel v1 (`queryPanelV1.measure.ts`) | 11 passed, none failed |
| Query panel v2 (`queryPanelV2.measure.ts`) | 10 passed, 1 skipped by its own rule, none failed |
| Onboarding v9 (`onbV9.measure.ts`) | 30 passed, none failed |
| Onboarding v9 walk (`onbV9Walk.measure.ts`, one worker) | 5 passed, none failed |

No comps lock reads differently from `comps-v27-1`.
