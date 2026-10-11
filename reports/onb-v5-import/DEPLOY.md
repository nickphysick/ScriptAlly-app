# Dev deploy, 10 Oct

- Before: dev served `assets/index-OufFe0UB.js`, the build of `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5` at `1b8cc7a1`.
- Merged `onb-v5-import` into it as `dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import` (`3f2f2478`). One conflict, in `design-refs/.refhashes.json`, resolved as the union of both sides; all 230 refs check.
- Gates on the merged branch: tsc 0; Vitest 548 files, 8,444 passed; production build 0; OB2 and OB1 104 passed against the merged dev build.
- After: dev serves `assets/index-CFtzAFzK.js`. Hosting only. Prod untouched; nothing merged to `main`.
