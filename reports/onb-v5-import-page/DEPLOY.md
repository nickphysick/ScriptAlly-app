# Dev deploy, 11 Oct

- Before: dev served `assets/index-BkZQizOC.js`, the build of `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import-fixes` at `688dc201` (the worktree's own build of that branch has the same file name).
- Merged `onb-v5-import-page` into it as `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import-fixes-import-page` (`42d72bac`). No conflicts.
- Gates on the merged branch: tsc 0; Vitest 556 files, 8,488 passed; production build 0; the Import page's locks and the three matcher suites 22 passed; parts 1 and 2's rendered locks 104 passed; the set-up import walk 3 passed. Every imported row was removed in the same run.
- After: dev serves `assets/index-OJDaewC9.js`. Hosting only. Prod untouched; nothing merged to `main`.
