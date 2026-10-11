# Import truth: the dev deploy

11 October. Dev only. Nothing was merged to `main`. Prod was not touched. Hosting only: no rules, no functions.

| | |
|---|---|
| Served before | `index-OJDaewC9.js` |
| Built from (before) | `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import-fixes-import-page` at `42d72bac` (the bundle in that worktree's `dist/` had the same name) |
| Merged | `origin/import-truth` (`0b3b01af`) into a new branch, `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import-fixes-import-page-truth`, at `4fdfe87f`. No conflicts. Pushed. |
| Gates on the merged branch | `tsc` 0 · Vitest 561 files, 8,543 passed, 3 skipped · production build 0 · `build:dev` 0 |
| Rendered locks on the merged build | the import-truth walk and the three matcher suites: 4 passed · P2 and H11: 2 passed · the Import page, set-up parts 1 and 2 and the import-fixes walk: 126 passed, 2 skipped |
| Deployed | `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`, from a clean tree |
| Served after | `index-BgPpCckO.js` |

The harness account after every run: 73 queries, 37 agents, 5 manuscripts, 396 feed rows, 113 history steps (the counts after the ten probe rows were removed). The empty fixture account: no documents, as before.
