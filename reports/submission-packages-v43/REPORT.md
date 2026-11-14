# Submission packages v43 — the navy header, the list on the left, the collapsing bar

Branch `submission-packages-v43` (worktree `ScriptAlly-pk43`, removed at the end), cut from the served dev line
`dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align` @ 04c4fd8d7. Merged into
`dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43` @ 1458323a7 and deployed to dev.
**Dev before: `index-Dw4R5Vgb.js`. Dev after: `index-BMKczFFq.js`** (served = the clean build of the pushed tip).
Not merged to main. Prod untouched.

## False premises and conflicts with the brief

1. **The served line's name.** The brief names `dev/…-td56-ql24`; dev served `index-Dw4R5Vgb.js` from its descendant
   `dev/…-td56-ql24-align` @ 04c4fd8d7 (Query letters v2.4's art and alignment on top). This branch is cut from that.
   It changes nothing in the plan.
2. **The snackbar's words.** The brief asks for "<name> now goes out with new queries." Change calls the model's
   `makeActive` (Step 0 item 5), which raises its own snackbar, **"New queries now go out with <name>."**, with Undo.
   That string is in `usePk26Model.ts`, which is on the do-not-touch list, so it is unchanged. One string to change if
   Nick wants the ref's order.
3. **"Where the builder says 'Current batch'."** It says it nowhere. v42's builder shows no tag on the current package,
   and "Current batch" lived only on the stat tile, which is retired. Only the button changed:
   "Use for current batch" → "Use for new queries".
4. **`PkTile` is not retired.** The brief lists `PkTile` with the tiles, but Results (`Pk41Results`) draws its package
   icons with it. It stays, and the list's rows use it too. `Pk42Tiles.tsx` and pk42.css §C are deleted.
5. **The Change menu's "stamp motion".** The flag stamps in when Change moves it. The builder's own "Use for new
   queries" moves the flag through the same writer, but without the stamp: wiring the stamp would mean editing the
   builder, which is untouched.
6. **The fixtures read live Firestore.** `seedPk40.mjs`, `pk41Fixture.mjs` and `seedPk26.mjs` still read
   `.env.development`. The first two were moved to `targetEnv()` before any run (commit b1e6cedbf). **`seedPk26.mjs`
   was missed until run 2: it wrote pk26-ms (ten documents) to scriptally-dev and removed them in its own afterAll
   ("removed 10").** I did not read live Firestore to confirm, since that needs the opt-in. It is moved to
   `targetEnv()` in c886be88a. Other seeds outside this page still read `.env.development`: the firestoreTarget sweep
   was red at baseline and still is.
7. **The emulator harness is not a founding writer**, so the founding strip never shows there. pk41 L2 and pk42 L8
   (the strip) cannot pass on the emulator. They are not v43's: the strip is untouched (outside the page root).
8. **Day one changed meaning.** v26's "empty" page (no letters or synopses) is retired with its hero. Day one is "the
   manuscript has no package at all", as the brief says. A writer with letters but no package used to see v42's empty
   card; they now see day one with the draft first package.

## Step 0

1. Served: `index-Dw4R5Vgb.js` from `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align` @ 04c4fd8d7.
   The baseline build of that commit produced the same hash.
2. a. ✓ `SubmissionPackages.tsx` composed `Pk41Banner`, `Pk41Header`, `Pk42Tiles`, `Pk26Builder`, `Pk41Results`,
      `Pk42Empty`, `Pk26Hero` (from `v26/Pk26Header.tsx`) and the portalled `Pk41Hawk`.
   b. ✓ Query letters: `OpenHeader` in `.qc151.qc153.qlp-hdw`, dressed by qcv1531 / qcv1534 / qcv154 / qcv156.
   c. ✓ `shell/SlimBar` with `shell/slimReveal`; qcv156.css §3's lists were `:is(.qc151.qc153, .cl27, .tws56)` and
      `:is(.qc151, .cl27, .tws56)`. To-do mounts `WsSlim56` as the page root's FIRST child.
   d. ✓ `.qlp-desk { grid-template-columns: 268px minmax(0, 1fr); gap: 28px }`; `.qlp-work` #fbf9f5, radius 18, the
      hairline + paper shadow, 26 / 32 inside.
3. The Query Centre on the build of 04c4fd8d7 (emulator, the e2e user, pk40-ms in scope). These are the numbers the
   locks compare against:

| page @ width | header left → right | height | top | radius | ground | title left / size | buttons | bar at 600: h / title / button / ground |
|---|---|---|---|---|---|---|---|---|
| Query Centre @1440 | 112 → 1400 | 227.1 | 143.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | 60 / 24px / 40 / 80→1432 |
| Query Centre @1717 | 112 → 1677 | 227.1 | 143.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | 60 / 24px / 40 / 80→1709 |
| Contact list @1440 | 112 → 1400 | 227.2 | 143.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | 60 / 24px / 40 / 80→1432 |
| Contact list @1717 | 112 → 1677 | 227.2 | 143.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | 60 / 24px / 40 / 80→1709 |
| To-do @1440 | 112 → 1400 | 227.1 | 113.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | 60 / 24px / 40 / 80→1432 |
| To-do @1717 | 112 → 1677 | 227.1 | 113.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | 60 / 24px / 40 / 80→1709 |
| Query letters @1440 | 112 → 1400 | 227.1 | 143.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | (no bar) |
| Query letters @1717 | 112 → 1677 | 227.1 | 143.8 | 20px | rgb(42, 58, 82) | 408 / 54px | 46, 46 | (no bar) |

   The bar's top: 12 under the scroller on the Query Centre and Contact list, 0 on To-do (its own rule).
4. `before.json`: the four pages' headers and bars (boxes plus a computed-style walk of every element) at both sizes,
   captured from the baseline build before any edit (`PK43_BEFORE=write`).
5. The current batch is the manuscript's `activePackageId`, written by **`usePk26Model().makeActive(p)`**
   (`canMakeActive`: Ready or Out, not already active; it calls `setActivePackage` and shows the snackbar with Undo).
   Change and the builder's button both call it.
6. The locks that read the v41/v42 header, tiles, hawk, width cap or hero: pk26 PK26-R/H; pk38's shared wait, L1, L11;
   pk39's wait and L5; pk393's shared open (L10–L14) and L10's disc colour; pk41 L1, L2, L3, L6, L8; pk42 L1–L8;
   pk41.shots and pk42.shots; the units materialsPageSmoke (empty and populated), workspacePageGrid (the root),
   pageWidth (the allow-list's reason), livingExhibitSource (Pk26Header.tsx) and wsSlim56 (qcv156 §3's lists).
   Each is accounted for under P12.

## Gates: baseline vs final

Baseline, with the functions modules linked into the worktree (the first baseline, without them, had 7 tsc errors and 12
red Vitest files, all of them `functions/` module resolution; the second is the one compared):

- tsc: `tsc exit 0`, 0 errors → final `tsc exit 0`, 0 errors.
- build:dev: exit 0, no error or warning lines, `index-Dw4R5Vgb.js` → final exit 0, no error or warning lines.
- Vitest baseline: ` Test Files  2 failed | 867 passed | 1 skipped (870)` / `      Tests  3 failed | 12543 passed | 4 skipped (12550)`
- Vitest final: ` Test Files  2 failed | 868 passed | 1 skipped (871)` / `      Tests  3 failed | 12557 passed | 4 skipped (12564)`
- The three reds, the same before and after: emuGuard "no recipe under tests/ starts an emulator without the guard",
  and firestoreTarget's two sweeps (unguarded seeds elsewhere in tests/e2e; this branch removed three of them).

## Commits (on `submission-packages-v43`)

| hash | commit | files |
|---|---|---|
| b1e6cedbf | prep: the packages fixtures target the emulator | tests/e2e/seedPk40.mjs, pk41Fixture.mjs |
| 14ae27662 | the ref, verified and enrolled | design-refs/submission-packages-v43/ (HTML, 10 PNGs, SHA256SUMS), design-refs/.refhashes.json |
| e6d7e21e8 | the navy header, the hawk in it | SubmissionPackages.tsx; v43/Pk43Header.tsx, pk43.css, pk43.test.ts (new); lib/packagesV43.ts (new); v41/pk41.css; v41/Pk41Hawk.tsx, Pk41Header.tsx (deleted); materialsPageSmoke, workspacePageGrid, pageWidth tests; tests/e2e/pk43Probe.ts, pk43.measure.ts; reports/…/before.json |
| 5d84099a4 | the list and the workspace | SubmissionPackages.tsx; v43/Pk43List.tsx (new), pk43.css, pk43.test.ts; v41/pk41.css; v42/pk42.css; v42/Pk42Tiles.tsx (deleted); materialsPageSmoke |
| 64b8e75e1 | the current batch in the header | SubmissionPackages.tsx; v43/Pk43GoingOut.tsx (new), pk43.css, pk43.test.ts; lib/packagesV42.ts, packagesV43.ts |
| 12454dc09 | the collapsed bar | SubmissionPackages.tsx; v43/Pk43Slim.tsx (new), pk43.css, pk43.test.ts; queries/centre/qcv156.css; todo/ws/wsSlim56.test.tsx |
| 2608b70a9 | day one | SubmissionPackages.tsx; v43/Pk43DayOne.tsx (new), pk43.css, pk43.test.ts; v26/Pk26Header.tsx (deleted); materialsPageSmoke, workspacePageGrid, livingExhibitSource tests |
| c886be88a | the locks, and the two fixes they found | SubmissionPackages.tsx, v43/pk43.css; tests/e2e pk26/pk38/pk39/pk393/pk41/pk41.shots/pk42/pk42.shots/pk43 measures, seedPk26.mjs, RETIRED-submission-packages-v43.md; reports/submission-packages-v43/ (after.json, ledger, shots, old-locks) |
| (this report) | report | reports/submission-packages-v43/REPORT.md |

Merge: 1458323a7 on `dev/…-td56-ql24-align-pk43` (pushed), deployed.

## qcv156.css §3, widened

`.pk43` added after `.tws56` in every list of §3 (15 lines, 16 lists; specificity unchanged, since `.pk43` is one class
inside `:is()` beside two-class arguments). Nothing else in the file changed.

- `:is(.qc151.qc153, .cl27, .tws56, .pk43) > .qc156-slim` (and `::before`, `[data-shown]`, and the reduced-motion rule ×2)
- `:is(.qc151, .cl27, .tws56, .pk43) .qc156-st`, `.qc156-st b`, `.qc156-st i`, `.qc156-sa`, `.qc156-sw`, `.qc156-sw b`,
  `.qc156-sw em`, `.qc156-sb`, `.qc156-sb:hover`, `.qc156-sb:focus-visible`, `.qc156-sb:disabled`

⚠️ **Overlap:** the live session `workspace-headers-v1` (worktree ScriptAlly-wsh1, uncommitted when read, same base
04c4fd8d7) adds `.wsnh` to qcv156's lists and edits `wsSlim56.test.tsx`. Whichever merges second gets a line conflict
in both files. The resolution is to keep both additions.

## Tests re-pointed or retired (P12)

The full table is tests/e2e/RETIRED-submission-packages-v43.md. In short:

- **Retired (test.skip, with pointer):** pk41 L3 header (→ pk43 P1), pk41 L8 hawk (→ P6), pk42 L2 tiles (→ P7),
  pk42 L3 builder (rim deleted → P3/P8/P9), pk41.shots and pk42.shots (→ pk43 shots); pk42 L6's no-packages half
  (→ P10) and L8's hawk half (→ P6); materialsPageSmoke's hero case (re-pointed to day one); livingExhibitSource's
  Pk26Header.tsx entry (file deleted).
- **Re-pointed:** every opener and wait from `[data-pk42-tile]` / `[data-pk42="tiles"]` to `[data-pk43-row]` /
  `[data-pk43="list"]`, and `[data-pk41="header|new|how"]` to `[data-pk43=…]` (59 selector changes in 8 specs);
  pk41 L1 "no header art" → "the header's one drawing"; pk39 L5 the row's name; pk393 L10 the disc is navy;
  pk393 L11 parses the seed's last line; pk38 L11's brand-new manuscript waits for day one's steps;
  workspacePageGrid, pageWidth, wsSlim56 and materialsPageSmoke as listed above.
- **Their run on this branch** (run 2 + run 3, emulator; readings in reports/submission-packages-v43/old-locks/):
  green: pk26 PK26-R, pk38 L1/L3/L4/L7/L10/L11, pk39 L5, pk393 L10/L11/L12/L13-sent/L14, pk41 L1/L6 (both sizes),
  pk42 L1/L5/L6/L7 (1512). **Red, not v43's:**
  - pk393 L13 and pk42 L4 (two readings each): they look for `[data-qad-drawer='log']`. Since Log a query v1.2
    (bd5cdbfca, 11 Nov) the desktop log journey is `LogStagesPanel`; the specs predate it.
  - pk41 L2 and pk42 L8: the founding strip does not show for the emulator harness (premise 7).
  - pk26 PK26-N: it reads a sidebar "Packages" row with a PRO tag, which Shell nav v3 retired.

## The locks: green, then red under their break

Every lock reads green, then applies its break in the same page and must read red. A break that changes nothing fails
the lock. Ledgers: reports/submission-packages-v43/ledger/<lock>.json (both readings). Run 2: all pk43 cases passed.

| lock | green | red under its break (first readings) |
|---|---|---|
| P1 @1440 / @1717 | 11/11 · 11/11 | 8 of 11: OpenHeader's frame; height; top (break: v41's header in its place) |
| P2 | 17/17 | 1 of 1: Query Centre @1440 header ≠ before.json (break: navy +1 channel) |
| P3 @1440 / @1717 | 6/6 · 6/6 | workspace left ≠ headline left (break: one column) |
| P4 @1440 / @1717 | 2/2 · 2/2 | 2 of 2: both 48s (break: 26) |
| P5 @1440 / @1717 | 15/15 · 15/15 | 7 of 15: part-way placement, height, top, title (break: `.pk43` taken out of §3 in the live CSSOM) |
| P6 @1440 / @1717 | 5/5 · 5/5 | no `.p41-perch`; no drawing pinned (break: the pinned hawk added) |
| P7 @1440 / @1717 | 11/11 · 11/11 | 5 of 5: rows, order, aria-current, flag (break: the tiles in the list's place) |
| P8 @1440 | 13/13 | the draft is offered (break: every live package listed) |
| P9 @1440 / @1717 | 8/8 · 8/8 | 4 of 8: a green disc, "nothing green" (break: v42's #3e7d5a) |
| P10 @1440 / @1717 | 11/11 · 11/11 | 8 of 11: headline, no right block, no hero (break: v26's hero in the header's place) |
| P11 | 11/11 | 820 scrolls sideways; the right block shows under 1100 (break: a 1500px desk) |
| P12 | (above) | |
| unit pk43.test.ts | 16 cases | P6's source half red with `Pk41Hawk.tsx` restored (1 failed, 3 passed) |

**Two fixes came from the locks** (both in c886be88a): (1) the bar was mounted after the header, so part-way down it sat
in the flow under the header (seen in the first draft shot). It is now the root's first child, as on the Query Centre
and To-do, and P5 reads 200 / 260 / 320 scrolled. (2) At 1280 the Query Centre's 400px floor for its right column left
"4 packages" short of its width (P11 red in run 1). This page's right column is `auto` (the block is at most 384).

## Where the built page differs from the ref, and why

- **Header and bar measurements** are the built Query Centre's (the brief's oracle): radius 20 (ref 24), art column 268
  (ref 300), title 54px (ref 66). The drawing is 220 tall, standing on the header's bottom edge, in a box of exactly the
  QC hawk's 183.14, so the header is the QC's 227.1.
- **The header's right column** is `auto`, not the QC's `minmax(400px, 560px)` (P11). The block is the ref's sizes.
- **The builder and Results are v42's** (the brief's oracle): the status pill with its dot and the Figures icon rather
  than the ref's "Make a copy / How it's doing" buttons; v42's longer sent note; the guidelines under the builder.
  The open step is a warm neutral (#f6f3ee) with a navy bar, replacing v42's pale green.
- **Day one's workspace** holds v39.3's draft as built ("My first package", its own note), and its one filled button is
  the draft's own (disabled) "Add a version and a letter to send it". The ref's sketch shows "Standard UK, An example,
  + New package".
- **The snackbar** says "New queries now go out with <name>." (premise 2).
- **The Change menu** lists packages in the list's order. The ref's order is a mock's.
- **Only retired packages:** the headline reads "0 packages" (the live count, as specified) over v42's "No packages
  yet" card.
- **The ref's collapsed bar visible at rest** (screen 04 at 1440) is a mock artefact. The built bar shows only once
  the header has gone under the lip.
- **Fixture names** (Standard, Standard 2, Ready one, Draft one; "Locks of v40") differ from the ref's sample words.

## Screenshots (dev build on the emulator; ref beside)

| built | ref |
|---|---|
| ![](shots/01-rest-1440.png) | ![](../../design-refs/submission-packages-v43/01-rest-1440.png) |
| ![](shots/01-rest-1717.png) | ![](../../design-refs/submission-packages-v43/01-rest-1717.png) |
| ![](shots/02-scrolled-600-1440.png) | ![](../../design-refs/submission-packages-v43/02-scrolled-600-1440.png) |
| ![](shots/02-scrolled-600-1717.png) | ![](../../design-refs/submission-packages-v43/02-scrolled-600-1717.png) |
| ![](shots/03-draft-1440.png) | ![](../../design-refs/submission-packages-v43/03-draft-1440.png) |
| ![](shots/03-draft-1717.png) | ![](../../design-refs/submission-packages-v43/03-draft-1717.png) |
| ![](shots/04-change-menu-1440.png) | ![](../../design-refs/submission-packages-v43/04-change-menu-1440.png) |
| ![](shots/04-change-menu-1717.png) | ![](../../design-refs/submission-packages-v43/04-change-menu-1717.png) |
| ![](shots/05-day-one-1440.png) | ![](../../design-refs/submission-packages-v43/05-day-one-1440.png) |
| ![](shots/05-day-one-1717.png) | ![](../../design-refs/submission-packages-v43/05-day-one-1717.png) |

The Query Centre's header, after (shots/qc-header-1440.png, qc-header-1717.png). P2 holds it equal, element by
element, to the before capture (before.json vs after.json).

The shots are taken on the local emulator build of this branch with the e2e user. Dev serves the same code
(`index-BMKczFFq.js`) against live dev data, which was not screenshotted. Live reads are opt-in and this session did
not opt in.
