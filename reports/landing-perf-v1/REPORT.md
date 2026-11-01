# Landing perf v1 and split v1 (1 Nov 2026)

Two briefs, one report:
- **Perf fix v1, phases 1–3:** the "Every query tracked" card stops holding layers, its frame contains its pile, and the landing page uses lighter images.
- **Split v1, phases 4–5:** queryhawk.net downloads the public site and nothing else.

**Phase 5 stopped.** Its brief says to stop if lazy workspace routes need changes inside workspace pages, and they do (§6). Phase 4 is in, and it is the part that changes what queryhawk.net visitors download.

## For Nick: what a prod deploy changes for visitors

**queryhawk.net then sends 132 KB of JavaScript and 24 KB of CSS (gzipped) instead of 810 KB and 436 KB.** At 10 Mbps / 40 ms the heading shows in about 0.5 s instead of about 1.4 s. Nothing on the page looks or behaves differently.

## Commits

| | |
|---|---|
| `95105782` | Phase 1: the card stops holding layers |
| `d65d633c` | Phase 2: the frame contains its pile |
| `f6a39720` | follow-up: declares the pile shift tokens (Phase 2 was committed while a unit test was red; that commit was not chained to the gate) |
| `f90aa36d` | Phase 3: lighter images on the landing page |
| `43c0b8e4` | the PERF locks |
| `d538fa13` | Phase 4: the landing-only build loads the public site alone |
| `2b625475` | AppRoot named first in main.tsx, and the SPLIT locks |

## 1. False premises

1. **"App.tsx imports every workspace page statically, and `LANDING_ONLY` decides only what renders."** That is half true. The minifier already folded the early return, so some workspace code was dropped from production: ToDoPage and lottie were absent. Most of it stayed, because the module graph still reached it: 2.6 MB of JS.
2. **SPLIT-2's names (`Dashboard`, `ToDoPage`, `xlsx`, `jspdf`, `lottie`) cannot be grepped in a production bundle**, because the minifier renames components and the landing copy contains the filename "my-queries.xlsx". So each name is matched by a string that survives minifying:
   - Dashboard: `d58-header`
   - ToDoPage: `tdb-nc-body`
   - xlsx: `sheet_to_json`
   - jspdf: `jsPDF`
   - lottie: `bodymovin`

   The lock checks first that each string still exists in its source file.
3. **The founding sign-up pulled in Firebase Auth for one regular expression.** `isValidEmail` lived in `authActions`, which imports Auth. It now lives in `lib/emailShape.ts`, and authActions re-exports it.
4. **App Check was already lazy.** It only loads when someone submits the form. Firebase (53 KB gzipped) is a separate chunk that a cold load never fetches.
5. **"Boot splash unchanged"** does not apply to the landing-only build: it never had a splash, because App's landing-only branch returns before it.
6. **The perf brief's own premises** (in the perf phase summary): the drift never ran in feature mode; the pulses were 15 waiting dots; the 249 animations at load came from animations started and then paused when the fonts loaded; and the brief's layer-area method differs from mine (§3).

## 2. Asset tables

**Production build** (`vite build --mode production`, the queryhawk.net build). Before is `assets-before-split.txt` (43c0b8e4, 154 files). Gzip sizes use `gzip -9`.

| File | Raw (bytes) | Gzip (bytes) |
|---|---|---|
| **Before:** `index-CCXdiknq.js` | 2,623,570 | 805,802 |
| **Before:** `index-C9kzXrbY.css` | 2,289,003 | 436,398 |
| **Before:** 152 other assets (flag-icons SVGs, workspace images, html2canvas, purify…) | | |
| **After:** `index-BIdhfWR6.js` (React, router, boot) | 196,074 | 61,366 |
| **After:** `PublicRoot-etxmmtTE.js` (the public pages) | 208,689 | 70,229 |
| **After:** `PublicRoot-CLe81Mzo.css` | 117,853 | 23,830 |
| **After:** `firebase-e46xLgj2.js` (App Check, fetched only on submit) | 217,962 | 52,978 |
| **After:** `index.esm-DKxyYu6v.js`, `index.esm-Dr09ypjK.js` (App Check parts, on submit) | 69,787 | 16,069 |
| **After:** other assets | 0 files | |

**Whole-app build** (`build:dev`, dev.queryhawk.net), which Phase 5 would have split:

| File | Raw (bytes) | Gzip (bytes) |
|---|---|---|
| **Before:** `index-DJumXKXg.js` | 6,369,038 | 1,829,506 |
| **Before:** `index-C9kzXrbY.css` | 2,289,003 | 436,398 |
| **Before:** `html2canvas`, `index.es`, `purify`, `index.esm` | 413,039 | 116,639 |
| **After (Phase 4):** `index-D1uL8JGq.js` (React, router, boot) | 196,208 | 61,422 |
| **After (Phase 4):** `AppRoot-ChmOAcnG.js` | 6,155,684 | 1,765,053 |
| **After (Phase 4):** `AppRoot-*.css` (byte-identical to before) | 2,289,003 | 436,398 |
| **After (Phase 4):** the four lazy libraries, unchanged | ≈413,000 | ≈116,700 |

## 3. Cold load of `/` at 10 Mbps / 40 ms

**Method:**
- Each build was served locally with gzip, as hosting serves it.
- Chromium was throttled through CDP.
- Each figure is the median of three cold loads.
- "Site JS+CSS" is the transferred bytes of this site's scripts and stylesheets.

The page never reaches network-idle under throttling, in either build, so no idle time is reported.

| Build | Width | First paint | Heading visible | `load` | Site JS+CSS | Everything incl. fonts and images |
|---|---|---|---|---|---|---|
| prod before | 390 | 1,364 ms | 1,375 ms | 1,223 ms | 1,218 KB | 1,961 KB |
| prod after | 390 | **488 ms** | **496 ms** | 358 ms | **153 KB** | 895 KB |
| prod before | 1440 | 1,384 ms | 1,396 ms | 1,209 ms | 1,218 KB | 2,252 KB |
| prod after | 1440 | **472 ms** | **482 ms** | 343 ms | **153 KB** | 1,186 KB |
| dev before | 390 | 2,252 ms | 2,266 ms | 2,155 ms | 2,222 KB | 2,965 KB |
| dev after | 390 | 720 ms | 725 ms | 367 ms | 478 KB | 1,220 KB |
| dev before | 1440 | 2,280 ms | 2,442 ms | 2,206 ms | 2,222 KB | 3,312 KB |
| dev after | 1440 | 640 ms | 710 ms | 363 ms | 478 KB | 1,511 KB |

In the dev rows, "after" fetches 478 KB because the whole app's JS is one lazy chunk loaded right after boot. That is Phase 4's dynamic root, not Phase 5.

## 4. What Phase 4 did

- **`main.tsx` picks its root on the build-time flag.** A landing-only build imports `marketing/PublicRoot`; any other build imports `AppRoot`. AppRoot is App followed by index.css: the same two imports, in the same order, that main.tsx used to make.
  - The condition reads `import.meta.env` directly, so the minifier drops the other branch. The production bundle has no App chunk at all, not even a lazy one.
  - **AppRoot is named first**, because the CSS order follows the order modules are first met, and that includes the dropped branch. With PublicRoot first, the whole app's stylesheet came out with its 1,147 marketing rules moved to the front.
- **`PublicRoot` does what App's landing-only branch did:**
  - ErrorBoundary;
  - BrandProvider, whose injected rules set the heading and body faces;
  - BrowserRouter;
  - the path and hash, including clearing a sign-in hash;
  - `onNavigate` as `navigate(pathFor(...))`.

  It leaves out DbProvider (the public pages read no account) and ToastProvider (its container was an empty 0px box on public pages). App's own landing-only branch stays as it was.
- **`marketing/public.css` is the public site's global stylesheet.** Each item in it was measured: every rule that matched any element on the 8 public paths at 390 and 1440, read from a dev server with the whole app's CSS loaded. Outside the marketing sheets that came to:
  - Tailwind's base reset;
  - two mobileShell rules (no tap highlight; on phones, no rubber-banding and the 16px input floor);
  - BrandProvider's injected faces;
  - `:root` token sheets, which matched `html` but are not read by any public rule.

  Tailwind scans only the public files. flag-icons and every workspace sheet stay out.
- **Moved to `lib/`:** `pathFor`, `useHash` and the email check. App and authActions re-export what they used to export.

## 5. Locks, red then green

All locks were run on locally served builds (the `public` project).

| Lock | On 43c0b8e4 | On HEAD |
|---|---|---|
| SPLIT-1 cold-load budget | **red**: JS 810,549 B gz (limit 256,000); CSS 436,727 | green: JS 131,924 B gz, CSS 23,829, at both widths. Five largest at 1440: `journey-so-far.png` 293 KB, `home-for-your-agents.png` 223 KB, `PublicRoot-*.js` 209 KB raw / 70 KB gz, `index-*.js` 196 KB / 61 KB, `PublicRoot-*.css` 118 KB / 24 KB |
| SPLIT-2 no workspace code (prod `dist`) | **red**: Dashboard, xlsx and jspdf in `index-CCXdiknq.js` | green: 0 hits in 6 files |
| SPLIT-3 public paths render; sign-up round-trips | green, as it should be: it guards behaviour that must not change. Proved red by a named mutation (`SPLIT3`, the sent message hidden), which fails at "the sent message" | green at both widths: 8 paths with no page errors; the count arrives; one POST carrying the address and source; the sent message shows. The existing landing suites also pass on the new build: LW-1…12, LW-F, PERF-1…5, landingOnly, 44 passed |
| SPLIT-4 whole-app build, signed out | **red**: all five markers in `index-DJumXKXg.js` | **red, by design until Phase 5:** all five markers in `AppRoot-*.js`. Green on the Phase 5 attempt: 61 + 376 KB gz, no markers |
| SPLIT-5 the 16 public pages vs 43c0b8e4 | (it is the reference) | green: every visible element within ±1px, nothing added or gone. 14 pages are 0 pixels different; `/about` 5 px and `/terms` 4 px at 1440 (0.000%). Proved red by `SPLIT5` (heading 3px down: "nothing moved", 1 element named) and `SPLIT5b` (footer colour: 13.8% of pixels) |

**SPLIT-5's method:**
- reduced motion;
- the places count mocked to 13 of 50 in both builds;
- each page scrolled through once and then back to the top;
- a full-page screenshot at DPR 1;
- the same pixel rule as PERF-5: a 2px neighbourhood, with anti-aliased edges ignored.

My first mutation (wordmark letter-spacing) stayed green, correctly: that box has a fixed width. I replaced it with the two mutations above.

**PERF locks** (from the perf phases): PERF-1 to PERF-5 were all red on 5b3a6e2d, with seven failures each naming its reason, and are all green on HEAD:

| | Before | After |
|---|---|---|
| Layers at rest, desktop / phone | 241 / 244 | 22 / 16 |
| Animations at load | 249 / 256 | 0 |
| Finished animations still holding a fill | 187 / 204 | 0 |
| Pulses running off screen | 15 | 0 |
| PERF-5 pixel difference, desktop / phone | | 0.475% / 0.09% |

**Signed-in check of the whole-app build:** `routeShots` (29 routes at 1440, signed in), comparing 43c0b8e4 with HEAD.
- Every route is within 33–49 pixels.
- All of those pixels sit in the top bar's tab row, where two captures of the same 43c0b8e4 build also differ by 2–49 pixels.

## 6. Why Phase 5 stopped

The lazy-route version is in `phase5-attempt.patch`. It is App.tsx only:
- every workspace import becomes `React.lazy`;
- the boot splash becomes the fallback for the whole signed-in tree;
- settings, plans, help and import get a quiet fallback and are prefetched after sign-in.

It passed SPLIT-4 and the unit suite. On the signed-in route comparison, two real differences appeared, and neither can be fixed from the loading side:

1. **The Analytics section tab ("Under the hood") disappears on a cold load.**
   - `SectionTab` (A17Frame.tsx) reads its parent page's ref in its first layout effect. React runs a child's layout effect before it attaches the parent's ref, so on first mount the ref is null and the effect gives up for good.
   - Before, the page always mounted on its loading skeleton before the data arrived, so the tab mounted later, once the ref was attached. Lazy loading reverses that order: the data is there before the page's code.
   - The fix is one line in A17Frame, which is a workspace page.
2. **The whole app's stylesheet changes order.**
   - Each lazy chunk's CSS arrives as its own later file, so equal-specificity rules now resolve differently. Seen: `/account/plan`'s comparison table lost its monospace values.
   - Turning off CSS code-splitting does not restore the order: measured, 32 blocks of rules move.
   - Keeping the cascade would mean raising specificity inside workspace sheets.

I expect the same mount-order fault in other pages that measure on mount, so Phase 5 needs a pass over the pages themselves first.

## 7. Screenshots and files here

- `shots/track-{desk,phone}-{mid,rest}.png`: the track row mid-story and at rest.
- `raster-compare.png`: the card's text before and after the layers were dropped (crisper glyphs, same place).
- `assets-before-split.txt`: every production asset before the split.
- `phase5-attempt.patch`: the Phase 5 attempt.

## 8. Dev

Deployed once, after this report. The URL and the served bundle are in the closing message.
