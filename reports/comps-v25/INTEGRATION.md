# Comparable titles v25 — the dev integration build

Dev was serving `dev/query-panel-v1-onb9-tip-onb9` (`2bc44f23`: query panel v1 and onboarding v9, 25 commits not on main). Deploying `comps-v25` alone would have removed that work from dev, so dev gets a merge of the two.

- **Branch:** `dev/query-panel-v1-onb9-tip-onb9-comps25`
- **Merge commit:** `351d2873` (`comps-v25` at `2abbfa30` into `2bc44f23`). This file is one commit later.
- **`comps-v25` is unchanged.** This file exists only on the dev branch.

## The merge

One conflict: `design-refs/.refhashes.json`. Both sides add entries. Resolved as the union: 256 refs (base 237, the dev branch 244, comps-v25 249), no key carrying two different hashes, and `scripts/check-design-refs.mjs` passes on all 256.

`firestore.rules` on the merged tree is byte-identical to `comps-v25`'s. The dev branch carries no rule change of its own against main (0 changed lines for `query-panel-v1`, `onb-v9` and the integration branch), so "both sides' changes" is `compIds` on versions and nothing else. Those rules were deployed to dev only.

## Gates on the merged tree

| Gate | Result |
|---|---|
| Typecheck (app) | 0 errors |
| Typecheck (functions) | 0 errors |
| `build:prod` | exit 0, no error or warning lines |
| `build:dev` | exit 0 (`index-wc5ZEw5i.js`) |
| Vitest | 571 files, 8,640 passed, 3 skipped, 0 failed |
| CV25, every rendered lock, 1512 × 900 and 1280 × 800 | 13 locks, 199 readings, 199 green |
| Query panel v1 locks (`queryPanelV1.measure.ts`, 10 tests) | all passed |
| Onboarding v9 locks (`onbV9.measure.ts`, 28 tests on `#/onb-lab`) | all passed |

Not run: `onbV9Walk.measure.ts`, the three-test walk that puts a dedicated account back into set-up and imports a file. The smoke is the two lock suites above.

## Locks that read differently on the merged build than on comps-v25

**None in substance.** All 13 ledgers were compared with the ones committed from `af59397f`. Twelve are identical. `A1` differs only in the random ids the page gives a comp on its first write (`cmp_esn6gi90p5yf` there, `cmp_2tof0lcizxt9` here) and the added comp's id; every reading is green in both.
