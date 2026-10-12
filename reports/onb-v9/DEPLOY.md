# Onboarding v9: the dev deploy (11 Oct 2026, 23:10 BST)

**Dev had moved since the instruction.** The instruction named `dev/…-truth-qc137` at `4a8e41b5` (`index-CxhG0y2e.js`). By the time this pack was ready, that branch had been merged into `main` (`13313c9d`), and another session had deployed `query-panel-v1`, which is cut from that `main`.

| | Bundle | Built from |
|---|---|---|
| Before | `index-8t_tGa3-.js` (CSS `index-BpSIDKx5.css`) | `query-panel-v1` at `45aaf306` |
| After | `index-yN1_OWRe.js` (CSS `index-CyvUffHz.css`) | `dev/query-panel-v1-onb9` at `4e81b30b` |

**How the "before" was named.** I built `query-panel-v1` in a clean worktree and compared hashes. Its tip (`803f03b8`) gives `index-CRIr5QHP.js`, which is not what dev served. Its commit `45aaf306` gives `index-8t_tGa3-.js`, which is. The two differ by one source file (`ee694ec4`). That commit and the one after it were in the other session's worktree, unpushed and not on dev.

**What was deployed.** `dev/query-panel-v1-onb9` is `45aaf306` (exactly what dev served) with `onb-v9` merged in. One conflict, in CLAUDE.md's "Next session" list; both lines kept. So dev keeps the query panel, Query Centre v137 and everything under it, and gains onboarding v9. The other session's two newer commits were **not** published.

**On the integration branch, before deploying:** tsc 0, production build 0, `build:dev` 0, Vitest 566 files passed and `functions/src/email.test.ts` failing to load (8,591 passed, 3 skipped). Rendered: `onbV9` 29 and the walk 5 passed; `onbV5`, `onbV5Import`, `onbV5ImportPage`, `importFixes`, `importTruth` 122 passed, 2 skipped. I did not run the query panel's own suite.

Deployed from a clean tree with `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`. The served hash was read again immediately before the deploy (unchanged) and after it (the local build's).

**For whoever deploys to dev next:** dev now serves `dev/query-panel-v1-onb9`. A deploy of `query-panel-v1` alone removes onboarding v9 from dev. Merge into this branch, or merge `onb-v9` into yours first.

Nothing is merged to `main`. Prod is untouched.

## Second deploy (12 Oct 2026): the FAQ follow-up

Dev had moved again. Another session had merged its newer query-panel work onto the first integration branch and deployed that.

| | Bundle | Built from |
|---|---|---|
| Before | `index-DqTM6gRM.js` | `dev/query-panel-v1-onb9-tip` at `c22f2882` (its worktree's build has the same hash) |
| After | `index-DbqJTP9V.js` | `dev/query-panel-v1-onb9-tip-onb9` at `196eb875` |

The new branch is `c22f2882` with `onb-v9` (`5e7d3350`) merged in; no conflicts. On it: tsc 0, both builds 0, Vitest 566 files passed and the same one failing to load (8,591 passed, 3 skipped). Rendered: 154 passed, 2 skipped, 2 failed.

**Correction (later on 12 Oct): the cause was the machine's scrollbar mode, not the date. See REPORT.md §12.** What I wrote at the time: **The two failures are the date, not the merge.** `onbV5ImportPage` P1 (two widths) compares the importing loader with a capture taken on 11 Oct. The dashboard ghost's heading behind the loader sits 11px differently today. The same case fails today on the unchanged `onb-v9` build that passed it last night. The loader's own files are byte-identical to the base (R1). The capture needs retaking, or the ghost's heading needs a fixed clock; I did neither.

**For whoever deploys to dev next:** dev serves `dev/query-panel-v1-onb9-tip-onb9`.

## Third pass (12 Oct): the P1 lock fix, and no deploy

Dev served `index-DbqJTP9V.js`, still `dev/query-panel-v1-onb9-tip-onb9` (`196eb875`). `onb-v9` (`541e39e0`, test-only) was merged into it as `2bc44f23`. Gates there: tsc 0, both builds 0, Vitest 8,591 passed with the same one file failing to load. Rendered: `onbV5ImportPage` and `onbV9` 48 passed, 1 skipped; P1 also green with the clock a week on.

The build of `2bc44f23` is `index-DbqJTP9V.js`: byte for byte what dev already serves. **Nothing was deployed, because there was nothing to change.** Before and after: `index-DbqJTP9V.js`.
