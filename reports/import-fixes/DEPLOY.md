# Dev deploy, 11 Oct

- Before: dev served `assets/index-CFtzAFzK.js`. Rebuilding `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import` at `3f2f2478` gives the same file name, so that is the branch it was built from.
- Merged `import-fixes` into it as `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import-fixes` (`688dc201`). No conflicts.
- Gates on the merged branch: tsc 0; Vitest 554 files, 8,476 passed; production build 0; part 1's and part 2's rendered locks 104 passed; the import walk 3 passed, with the account's counts back to zero.
- After: dev serves `assets/index-BkZQizOC.js`. Hosting only. Prod untouched; nothing merged to `main`.
