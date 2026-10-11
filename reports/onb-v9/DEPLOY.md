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
