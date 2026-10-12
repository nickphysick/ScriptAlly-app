# Comparable titles v26 — the dev build

On this branch only. `comps-v26` itself is unchanged.

- **Branch:** `dev/query-panel-v1-onb9-tip-onb9-comps26`
- **Merge commit:** `aeaf7b17` — `comps-v26` at `d875e1e9` merged into `dev/query-panel-v1-onb9-tip-onb9-comps25` at `aa478623` (what dev served before).
- **The merge was automatic.** No conflict; `design-refs/.refhashes.json` checks clean (268 refs).
- **Rules:** `firestore.rules` and `functions/` are unchanged by the merge. No rules deploy was made.

## Gates on the merged tree

| Gate | Result |
|---|---|
| Typecheck, app | clean |
| Typecheck, functions | clean |
| Vitest | 573 files, 8,654 passed, none failed |
| Production build | clean |
| Dev build | clean (`index-C1gu_Aki.js`) |

## Locks on the merged build

One pass at 1512 × 900 and 1280 × 800 against the merged dev bundle: **25 passed, none failed.**

- AD1 16 · AD2 14 · AD3 36 · AD4 14 · AD5 18 · AD6 18 · AD7 11 · AD8 12 · AD9 8 (147 readings)
- B1 18 · B2 32 · C1 14 · D1 8 · D2 29 · D3 9 · D4 8 · E1 18 · F1 24 · L1 10 · A1 8 · E2 9 · A3 12 (199 readings)

**No lock reads differently from `comps-v26`.** Twenty of the twenty-two ledgers are byte-identical. A1 and AD6 differ only in the random ids a new comp is given, and (AD6) in the order Firestore returns a document's keys.

## Not re-run

The query panel v1 and onboarding v9 suites were not re-run for this merge. They were smoke-tested on the comps25 merge, and v26 touches only the comps drawer and the comps empty page.
