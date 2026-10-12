# Comparable titles v27 — the dev build

On this branch only. `comps-v27` itself is unchanged.

- **Branch:** `dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27`
- **Merge commit:** `de094984` — `comps-v27` at `80532d2a` merged into `dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2` at `5f9a1292`.

## ⚠️ The base is not the branch the prompt named

The prompt named `dev/query-panel-v1-onb9-tip-onb9-comps26-1`. By the time v27 was ready, dev was serving `…-comps26-1-qp2` (`index-Qpey2I_I.js`): another session had deployed query panel v2 on top of that branch. Merging v27 into the named branch and deploying it would have taken query panel v2 off dev. The qp2 branch contains the named one, so v27 is merged into what dev served.

- **One conflict:** `design-refs/.refhashes.json`, resolved as the union of both sides' entries (288 refs, checked clean).
- **Rules:** `firestore.rules` and `functions/` are unchanged by the merge. No rules deploy was made.

## Gates on the merged tree

| Gate | Result |
|---|---|
| Typecheck, app and functions | clean |
| Vitest | 577 files, 8,697 passed, 3 skipped, none failed |
| Production build | clean |
| Dev build | clean (`index-Czjpd4O8.js`) |

## Suites on the merged build

All at `http://127.0.0.1:4428`, serving the merged dev bundle.

| Suite | Result |
|---|---|
| V27 locks (`compsV27.measure.ts`), 1512 × 900 and 1280 × 800 | 106 readings green: V1 12 · V2 16 · V3 10 · V4 6 · V5 12 · V6 6 · V7 6 · V8 22 · V9 8 · V10 8 |
| AD locks (`compsV26.measure.ts`) | 161 readings green: AD1 16 · AD2 14 · AD3 36 · AD4 14 · AD5 18 · AD6 18 · AD7 11 · AD8 12 · AD10 22 |
| CV25 locks (`compsV25.measure.ts`) | 185 readings green: B1 18 · B2 32 · D1 8 · D2 29 · D3 9 · D4 8 · E1 18 · F1 24 · L1 8 · A1 8 · E2 11 · A3 12 |
| Query panel v1 (`queryPanelV1.measure.ts`) | 11 passed, none failed |
| Onboarding v9 (`onbV9.measure.ts`) | 30 passed, none failed |
| Onboarding v9 walk (`onbV9Walk.measure.ts`, one worker) | 5 passed, none failed |
| Query panel v2 (`queryPanelV2.measure.ts`), not asked for, run because dev carries it | 9 passed, 1 skipped by its own rule, none failed |

**No V27, AD or CV25 lock reads differently from `comps-v27`:** every reading has the same name and the same result.
