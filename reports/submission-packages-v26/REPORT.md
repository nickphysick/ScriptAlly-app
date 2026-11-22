# Submission packages v26 — report (25 Oct)

Ref: `design-refs/submission-packages-v26/submission-packages-v26.html` (sha256 e47254b2…, matching SHA256SUMS; now in
`design-refs/.refhashes.json`). It supersedes packages-v4 and materials/packages-v3 for this page.
Branch `submission-packages-v26` in worktree `../ScriptAlly-pk26`. Base: 38432b44 (the dev stack 223b2939 with origin/main merged in).

## 1. False premises (first, as asked)

1. **"Work on `main`" did not give a usable base.** The primary checkout's local `main` was stale, the ref was
   not in the repo (it was in `~/Downloads` as a zip, checked against its SHA256SUMS), and Versions v1/v2, which this
   pack builds on, was not on `main` at all. I built on the dev stack 223b2939 with origin/main merged in, on a branch
   in a worktree of its own (the primary checkout holds other sessions' uncommitted work). **That means this is NOT on
   `main`.** Merging it brings the dev stack's unmerged branches (Versions v2 among them) with it.
2. **Attachments cannot be built: Firebase Storage is not set up on dev.** The bucket answers 404, there is no
   `storage.rules` in the repo, no `storage` block in either firebase config, and no `firebase/storage` import in `src/`.
   By the pack's own rule **Phase 5 is STOPPED**. Every drop zone ships visible and disabled ("coming soon"), the
   "Attach the file" toast step is left out, and nothing uploads. There is no Phase 5 commit.
3. **"Every group fits" / "the mock's 5 sent".** The mock's Results ranks on "5 sent". The app's threshold is
   packageReplies' `MIN_SENDS_FOR_CLAIM = 4` **answers**, where still waiting never counts. The page uses the app's
   rule, and the mock's number is illustrative. The two disagree on real data: a package can show "5 sent" and still
   be "Too early".
4. **"In use" in the letters and synopses tables** first read as "the newest letter". The ref means the letter in
   the **active** package (the one new queries go out with). Corrected in Phase 3.
5. **The ref has no way to put a letter away.** The v4 page had one, and dropping it would strand the action. So
   "Put away" sits in the drawer's footer, and put-away letters stay listed last, tagged, with "Bring it back".
6. **The ref's stylesheet cannot be ported as written.** It is v10–v26 of one mock, with later blocks overriding
   earlier ones (435 `!important`, 83 `@container`). I read the computed cascade in Chromium for 24 states at
   1512/1440/1360/1280 (`scripts/pk26/extract.cjs`), flattened it into one rule per element signature (`gen.py`), and
   checked every generated rule against every observation (`verify.cjs`), so no rule reaches an element it does not
   own. The result is `pk26.generated.css` (do not hand-edit). The few hand-written rules (focus, the animation's
   pause and reduced-motion frame, `:empty`) are in `pk26.css`.

## 2. Gates, baseline vs final

| | Baseline (38432b44) | Final (phase 7) |
|---|---|---|
| tsc | clean | clean |
| production build | clean (the chunk-size note only) | clean (the chunk-size note only) |
| vitest | 659 files, 10,403 passed, 3 skipped | 660 files, 10,424 passed, 3 skipped |

One run of the final suite ended with `Errors 1 error` and zero failed tests. That is the reporter's RPC timeout
under load (CLAUDE.md, 9 Sep). A re-run had no error. Single-file 5s and 120s timeouts in Phases 1–2 also passed when
re-run alone.

## 3. Commits

| Phase | Commit | Files |
|---|---|---|
| 1 · route, sidebar, header and tabs | 2379e895 | App.tsx, packagesRoute, the route tables (livingRoutes, searchPalette, shellForRoute, topNav, routeTiers, headerSheetRoutes, railNav, topCrumb, AppShell), workspaceNav/workspaceShell/WorkspaceShell/inkShell.css, `packages/v26/*` (generated + hand CSS, icons, header, tabs, first builds of builder, Results, materials, drawer, dialog, model), SubmissionPackages.tsx, index.html (Source Serif 4 italic), the ref and its hash, `scripts/pk26/*`, the unit tests re-pointed; v4 header + filter pills deleted |
| 2 · the package builder | b7b7fed5 | Pk26Builder, Pk26Dialog, usePk26Model, packagesV26(+test), types.ts, db.tsx, packageEditions, firestore.rules, rulesProbe.mjs, seedPk26.mjs; v4 sheets + drawer deleted |
| 3 · letters, synopses and the drawer | 655d50a8 | Pk26Materials, Pk26Drawer, usePk26Model |
| 4 · Results | d798b429 | Pk26Results, packagesV26, Queries.tsx (`idsFilter` only), App.tsx (passes `?ids`); v4 "What's getting replies" deleted |
| 5 · attachments | — | **stopped** (see §1.2) |
| 6 · named extras, empty state, animation | c399cd09 | types, rules, packagesV26, usePk26Model, Pk26Builder, Pk26Header, pk26.css, countExtras.mjs, the exhibition lock; v4 empty page, parts and sheet deleted |
| 7 · locks | (this commit) | pk26.measure.ts, pk26Mutate.mjs, pk26Shots.measure.ts, RETIRED-packages-v26.md, 38 e2e path renames, hr1 changes, `data-own-header` on the v26 header, this report, the ledgers and screenshots; pk4.measure, pk4Shots, pk4Mutate, seedPk4 deleted |

Each commit message carries the phase's detail.

## 4. Locks

**Added. Each one was proved red by its named break before its green was believed.** Ledgers are in `ledger/`;
`mut-*.json` holds the red runs.

| Lock | Claim | Break that turned it red | Red readings |
|---|---|---|---|
| PK26-R | `/manuscripts/packages?pkg=x` lands on `/queries/packages?pkg=x` with that package open | source: the redirect drops its query string | 3 of 4 |
| PK26-W | header card inset 92 (±1), tab bar 72, builder and Results 48, at 1512 and 1280 | CSS: the page takes back the shell's 20px gutter | 8 of 8 |
| PK26-B | only the matching row takes a drop and is marked; keyboard Add does the same | JS: every row accepts every drop | 1 of 6 |
| PK26-E | a sent package's new letter starts its next edition, and the sent query keeps the old one | source: the edition engine rewrites the 1st edition | 1 of 5 |
| PK26-X | ticking an extra on a sent package does not change the sent query's extras | the same source break | 1 of 4 |
| PK26-D | the drawer's header fill stops at the inner border | CSS: the header runs to the rim | 2 of 6 |
| PK26-S | under packageReplies' threshold an item is shown "Too early" and not ranked | JS: rank everything | 1 of 5 |

The unit locks `src/lib/packagesV26.test.ts` (22 tests) cover readiness, extras, the migration plan, sent as is / with
changes, and Results asserted **against packageReplies** rather than typed twice. Both empty and populated states are
in `materialsPageSmoke`.

**Final run:** PK26 10/10 green on the dev build. The fixture is re-seeded around each writing lock and removed in
`afterAll` ("removed 7").

**Censuses on the new route.** `hr1`, `headerPanelV2`, `headerV3` and `inkShell` were run on this branch and on
the unchanged base (38432b44, its own build, same harness, same day). **The same 15 tests are red on both, with the
same messages** (P1–P7/P6/P2/floor, H1–H8, HR1-8's stale reference, INK4/6/7/8/13/17/19). INK6 names a different
page because the group changed: base `/manuscripts/comps: full,full,ic`, branch `/manuscripts: full,ic`. None is
new, and none was rebaselined.

**Retired and re-pointed:** see `tests/e2e/RETIRED-packages-v26.md`. Four v4 files were retired. 38 censuses were
re-pointed to the new path. `hr1` drops packages from the shared hero (as the Query Centre did at v149), and HR1-5's
break moves to the To-do header.

## 5. Screenshots

`shots/` holds every ref screen's state at 1512 × 982 and 1280 × 832 (01–10), plus the animation seeked to the ref's
six moments (11, 1512). `side-by-side/` has ref | ours for 01, 02, 05, 06 and 09 at both widths.

Differences that are expected rather than faults:
- the beta strip and the sidebar's founding-member card (the live shell);
- the harness account's data in place of the mock's;
- a fourth folder tab, Responses, which the ref predates (it folds to "+1" at 1280);
- the ref's 09 was taken on the Synopses tab, ours on Packages.

At 1280 the open package's note wraps to two lines in the Harbour bar ("Make active" takes the room "Active" left in
the ref). This is not fixed.

## 6. Rules and the migration

**Dev rules were deployed** (`firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev`).
Release updateTime is **2026-10-25T16:38:24Z**. The changes:
- a package may be created empty;
- `icon` (one of twelve) is allowed and sits outside the freeze;
- `extraIds` is frozen with the slots, except the one-time migration write;
- the manuscript's `extras` is allowed.

After the deploy, `rulesProbe.mjs`'s v26 section read every case as intended (both "expect DENIED" cases denied).
**Prod rules are untouched.**

**otherMaterials → named extras, on dev** (`tests/e2e/countExtras.mjs`):
- before: 11 packages · 1 with text ("Autumn round: Author bio", sent) · 1 unmigrated · 0 manuscripts with extras
- after: 11 packages · 1 with text · 0 unmigrated · 1 migrated · that manuscript's extras `["Author bio"]`

The text is unchanged, so no edition started. `otherMaterials` is kept as the joined names of the ticked extras: the
send drawer, the edition engine and every query's frozen summary already read that one string.

## 6b. Dev deploy

Pushed `submission-packages-v26` (tip includes 4423fb25). Dev was serving `dev/hm31-pv4-qc1492-dh41-cl24-hm32`
(`index-B3rTkS_C.js`, one step past this branch's base), so the deploy is that branch merged with v26:
**`dev/hm31-pv4-qc1492-dh41-cl24-hm32-pk26` 00821194**. The only conflict was the ref manifest (both entries kept).
Gates passed on the merge: tsc clean; build clean; vitest all green once `functions/node_modules` was linked in the
fresh worktree. It was deployed from a clean worktree, and dev now serves **`index-DQ4bM-WA.js`**. PK26-R and PK26-W
pass against the deployed site.

## 7. Open for Nick

1. **Free / Pro split.** Plan gating is unchanged: the page is open to all (`PACKAGES_OPEN_TO_ALL`), and the PRO
   tags in the sidebar and header are labels only. Which parts, if any, should be Pro is your call.
2. **Attachments (Phase 5).** These need Storage set up on dev (bucket, `storage.rules`, a config block). Your
   banked ruling stands: on delete, remove the Storage object before its Firestore record. Until then the drop zones
   are disabled.
3. **What the data model could not honour, and what was done instead:**
   - the mock's "5 sent" threshold → packageReplies' 4 answers (§1.3);
   - a version's word count → `BookVersion` has none, so it is not shown;
   - a sent package's extra renamed → it keeps the name it went with, and only unsent packages take the new name;
   - "Put away" → the drawer's footer (§1.5).
4. **Merging.** The branch sits on the dev stack, so merging it to `main` also brings the dev stack's unmerged
   branches with it (§1.1).
5. **The 1280 note wrap** in the Harbour bar (§5).
