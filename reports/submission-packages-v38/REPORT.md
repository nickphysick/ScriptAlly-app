# Submission packages v38 — one page, package labels, the package drawer and Results

27–28 Oct. Branch `submission-packages-v38` (off `submission-packages-v40`), pushed, **not merged**. On dev as
`dev/…-cl255-db105-pk38`, serving **`index-C2Fx9WTc.js`**. Prod untouched; no rules or functions changed.

## False premises, first

1. **"Work on branch `submission-packages-v26`."** v40 had already been built on top of v26: 31 commits covering the lock,
   Draft → Ready → Out with agents, copies, the shelf, and Tracking on every tab. v38's own drawer copy ("Locked, so what
   each agent got stays true", "Draft. It needs a letter and pages.") assumes v40's lock, which the v26 branch does not
   have. **Nick ruled: build on top of v40.** v40's lock, stages and copies stand. v40's page shape (the tabs, the shelf,
   the workbench header and selector, and Tracking on every tab) is replaced by v38's.
2. **The two mocks fork after v26.** v40's mock went shelf → workbench → tabs; v38's went labels → one page → Results. Both
   carry the same v1–v26 history. Neither includes the other's later layers.
3. **The mock's builder edits a sent package** (it shows Edit and ✕ on Standard UK's pieces). That contradicts v40's lock,
   which the dev rules enforce. **Nick ruled: it shows locked.** A sent package loads into the builder with:
   - no ✕ and no drop target;
   - no extra to tick and no Add;
   - a lock line with "Make a copy" (and Retire where it is allowed).

   Name, note and icon stay editable.
4. **The mock brings back mono capitals** (YOUR PACKAGES, QUERY LETTER, READY, ACTIVE, RESULTS). v40 ruled them off this
   page. **Nick ruled: keep v40's ruling.** The kickers and tags read in the typewriter, sentence case. The census (L8) is
   carried over.
5. **"Header unchanged from v26 except the line."** The header is v40's (the Pro pill beside the title, no eyebrow). Only
   the line changed: "{n} packages for {Manuscript}. Pick one to change it below, or open its figures."
6. **"The builder: as v26, minus its header block and package buttons."** On v40 the builder is v40's: cards, the stepper,
   quiet empty slots, the start card and the guidelines. v38 lists none of those as superseded, so they stay. Its
   workbench header and package selector are gone, and Figures is in the Harbour bar. **Side-by-side 02 therefore shows a
   v40 builder against a v26-style one. That is deliberate.**
7. **`packageReplies` counts a query withdrawn before any answer in `sent`**, while keeping it out of every segment and
   rate. On this page "sent" and every percentage leave it out (`packagesV38.figOf`), as the drawer's "Sent" in the mock
   implies.
8. **`packageReplies` has no full-request count and no reply days.** Both are taken from the same first-answer rows:
   - a full request is a first answer that was a request whose row reached a full;
   - reply days come from Analytics' `replyDays` over requests and passes.
9. **This page's figures move.** v40's page used `factsOf`: any request ever counts, and a share shows from 5 sent. v38
   uses `packageReplies` throughout, as the pack says: the first answer, and ranked from **4 answered**. Versions still
   reads `factsOf`. The fixture shows the difference: Standard is 40% under both rules, Standard 2 is "Too early" under
   both, and the retired Old one is "Too early" here.
10. **Removing the tab pages would strand put-away materials.** The Query letters and Synopses tables were the only route
    to "Bring it back". Your materials now lists them on request ("Show put away (n)"), and they open their drawer.
11. **"?tab=let / ?tab=syn (or however v26 encoded the tabs)."** The page had no such links; the tabs were local state.
    Every spelling (`let`, `letters`, `syn`, `synopses`, `ver`, …) now opens Your materials on that list, and `?pkg=`
    still works.
12. **Still to prove can be a draft.** The mock's copy for an unsent one is "Ready, but not sent yet", which is false for a
    draft. A draft reads "Not sent yet. It needs a letter and pages before it can go."
13. **The generator dropped a heading's responsive override.** A heading's base rule is emitted `!important` (brand.tsx
    forces heading faces), and its media-query override was not, so the results title stayed 36px at 1280.
    - Fixed in `scripts/pk38/gen.py`.
    - v40's sheet was checked and has no such rule.
14. **Nine of v26's PK26 locks were red before this pass touched them.**
    - **Red since v40, seven of them:** R, W, E, X, H, S and RT. They read the v26 package buttons, a sent package's
      edits, or v26's Results, all of which v40 replaced. That file had gone unrun since v40.
    - **Red because of v38, two:** D and T.

    See "Locks" below.

### The v26.1 items

All had landed before this pass (PK26-M and PK26-H are green, and the code carries each):
- one-line material names;
- the summary that never repeats the type;
- "+ Add a note" and the one-line note;
- the title's minimum width at 1280.

The v26.1 Results package set and the sticky tab bar are moot: both parts are gone.

## Counts

| | Baseline (v40 tip `8b447942`) | Final (`1c2b0db3`) | Dev stack (`eced7acd`) |
|---|---|---|---|
| tsc | clean | clean | clean |
| vite build | clean (no errors or warnings) | clean | clean |
| vitest | 662 files · 10,459 passed · 3 skipped (1 reporter timeout, 0 failed) | 663 files · 10,480 passed · 3 skipped | 676 files · all passed* |

\* Three `functions/` files first failed to load in the deploy worktree because `functions/node_modules` was not
linked. Once it was linked, all three passed (38 tests).

## Commits

| Commit | What |
|---|---|
| `21f33660` | The design pack (ref + 18 screens, hashes checked, enrolled) and `scripts/pk38/` |
| `dacad943` | Phases 1–3: one page, the labels, the package drawer, Results. **One commit, not three:** they share `SubmissionPackages.tsx`, and no split of it built and rendered on its own |
| `1c2b0db3` | Phase 4: the locks, the retirements and their ledgers |
| (this one) | The report, screenshots, side-by-sides and CLAUDE.md |

**New files:**
- `src/lib/packagesV38.ts` (+ test);
- `Pk38Labels.tsx`, `Pk38Drawer.tsx` and `Pk38Results.tsx`;
- `pk38.generated.css` and `pk38.css`;
- `tests/e2e/pk38.measure.ts` and `pk38.shots.measure.ts`.

**Deleted:**
- `Pk26Tabs.tsx`, `Pk26Materials.tsx`, `Pk40Shelf.tsx` and `Pk40Tracking.tsx`;
- `pk40.measure.ts`, `pk40.shots.measure.ts`, `pk26Shots.measure.ts` and `pk261Shots.measure.ts`.

## Locks

`tests/e2e/pk38.measure.ts` covers 1512 × 982 and 1280 × 832 on `seedPk40.mjs`, unchanged. All green: 102 readings, and
L1, L5 and L11 also green on the deployed site.

| Lock | Claim | Red before (named break, `PK38_MUTATE`) | Green |
|---|---|---|---|
| L1 | No tab bar or tab page; `?tab=syn` opens Synopses | Tab bar injected → red | 8/8 |
| L2 | A live label loads its package; a retired one opens the drawer; one selected | A second label pressed → red ×3 | 17/17 |
| L3 | Figures opens the open package's drawer at `packageReplies`' rate; Edit in the builder loads it | The rate changed to 55% → red | 9/9 |
| L4 | No package in two Packages showcases | First showcase duplicated → red ×3 | 3/3 |
| L5 | Showcase figures = the fixture's `packageReplies` arithmetic; no too-early winner | Standard 2 made Doing best → red | 14/14 |
| L6 | The band spans the sheet (±1) at 1512 and 1280 | Band given 48px margins → red (1160 vs 1256) | 3/3 + 3/3 |
| L7 | Empty: the band's line, the dashed message, no showcases | Showcase injected → red | 4/4 |
| L8 | No mono capitals (page, dialog, How it works, both drawers) | The mock's kicker restored → red | 14/14 |
| L9 | A sent package opens locked; a Ready one does not | ✕ injected → red ×2 | 15/15 |
| L10 | Make a copy opens New package with "A copy of {name}" chosen | Empty forced → red | 3/3 |
| L11 | Smoke, both manuscripts, no console errors | (smoke) | 9/9 |

Unit: `src/lib/packagesV38.test.ts`, 21 cases covering:
- L4's uniqueness over five arrangements;
- L5's "too early never wins";
- the band's withdrawn rule;
- the label and drawer wording;
- the deep links.

Ledgers: `ledger/*.json`; the red proofs are in `ledger/mut-*.json`.

### Retired and rewritten (full table in `tests/e2e/RETIRED-submission-packages-v38.md`)

**Rewritten:**
- v40 L1 → L9;
- v40 L2 → L10;
- v40 L8 carried as L8;
- v40 L10 → L11.

**Retired with what they read:**
- v40 L4, L5/L6, L6/L7 and L9: the shelf, the per-tab tracking and the shared widths;
- PK26-E and PK26-X: changing a sent package, which v40 forbids;
- PK26-S and PK26-RT: v26's Results;
- PK26-T: the tab bar.

**Retargeted onto the labels and Your materials:** PK26-R, W, D and H. These were red on this build before the retargets
(the red proof) and are green after. The whole PK26 file is green again: 10 cases.

## Screenshots

- **App, every ref screen at 1512 and 1280:** `app/` (18 files: 01–09 × 2).
- **Side-by-sides with the ref for 02, 03, 06 and 07 at both widths:** `side-by-side/`.

What differs:
- **02:** v40's builder (point 6).
- **Labels:** wrap to two rows at 1280 because the fixture has four live packages to the mock's three.
- **Pieces cards:** the fixture's letters carry no summary, so those cards show only the placeholder lines.
- **Everywhere:** the app's shell (beta strip, sidebar) and the fixture's names.

## Deploy

- **Before deploying:** dev was serving `index-DYV2msSU.js`, built from another session's local stack
  `dev/…-cl255-db105` (Dashboard v105). I confirmed that by building it.
- **The merge:** v38 is merged onto that stack as `dev/…-cl255-db105-pk38` (`eced7acd`). The only conflict was the
  hash manifest, where both sides appended a line, and both are kept.
- **Gates:** green.
- **Deploy:** hosting only. Dev now serves **`index-C2Fx9WTc.js`**.
- **⚠️ Pushing that stack also published the Dashboard v105 commits to origin.** Their session had deployed them to dev
  but not pushed them, and the repository is public.

## Open for Nick

- **Shortcuts to Versions and Comparable titles.** The tab bar's "Also goes in" pills are gone. Versions is still reached
  from Your materials' Versions list and its foot, and Comparable titles from the Letters foot, but neither has a
  header-level shortcut now.
- **v40's dead CSS.** `pk40.generated.css` and `pk26.css` still carry the shelf's, the tabs' and the tracking's rules,
  which nothing renders. Regenerating v40's sheet without them is a separate pass.
- **`model.duplicate` (v40's instant copy) has no caller.** Every copy now goes through the dialog. Retire it with
  `revertPackageEdition` and the v4 splits.
- **Prod rules** are still v40's question (Nick's): v38 changes no rules.
