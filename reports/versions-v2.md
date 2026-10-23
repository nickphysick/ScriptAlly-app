# Versions v2 — the Pro Versions page, built to design-refs/versions-v2

Branch **`versions-v2`** (worktree `../ScriptAlly-ver2`), cut from **`versions-v1-pkglink`** (41156a6e), the tip of Versions v1,
which is not merged to `main`. On dev through **`dev/ver1-nbab-pkglink-hm1-ver2`** (468c0d35), which dev serves as
**`index-OojVGv_5.js`**. Not merged to `main`. Prod untouched.

## 1. False premises

| # | What the code said | What changed (file) |
|---|---|---|
| a | `queryVersions.ts:9` — *"NOTHING HERE IS STORED ON A QUERY (D5)"* | `Query.bookVersionId` (types.ts), stamped by `db.addQuery` and written by the picker. The header now says the reversal and why (queryVersions.ts:9). |
| b | `bookVersions.ts:22` — *"COUNTS, NEVER RATES (D15/D17)"*, locked by `bookVersions.test.ts:247` | The module still returns counts (it serves Manuscripts and packages); the Versions page's rates live in `lib/versionsV2.ts` and show from 5 sent only. Header rewritten; the lock now also asserts the new rule (`MIN_SENT_FOR_RATE = 5`, `ratePct: early ? null`). |
| c | `bookVersions.ts:64` — *"LATEST IS A DATE FACT … nothing in this module ranks versions"*, locked by `bookVersions.test.ts:119` | Ranking, the league and "Leading" exist on the Versions page only (`versionsV2.rated`, `leadingId`: 5+ sent, strictly ahead). Header says so; the lock now asserts that rule and that `bookVersions.ts` still ranks nothing. |
| d | `bookVersions.ts:55` — `versionsActive` (two or more) is *"the feature's one gate"* | The Versions page gates on `versionsUnlocked` only and shows its empty state with none. `versionsActive` still governs the Query Centre chips and Manuscripts surfaces (whose files are out of bounds); its comment now says which. |
| e | `bookVersions.ts:14` — *"Packages never reference a version directly"* | False since the packages work: `SubmissionPackage.bookVersionId` and `PackageEdition.bookVersionId` exist. The header is replaced with the D4 order. |
| f | `kind` and the single `note` | Gone from every Versions v2 surface. `changes: string[]` replaces them; a legacy `note` reads as `changes: [note]`. `kind` is still written (`initial` / `revision`) because other surfaces read it. |
| g | The prompt's *"deep-links the existing version filter"* | The Query Centre's version filter (`Queries.tsx` ~4357) is mounted only in the retired `GRID_IS_THE_PAGE === false` arm, so nothing on screen can filter by version. The drawer's "See these N in the Query Centre" link is left out rather than shipped as a link that doesn't do what it says. See §5. |
| h | The prompt's route `/versions` | The app's convention is `/manuscripts/versions` (siblings `/manuscripts/comps`, `/manuscripts/packages`; every route register lists it), and the prompt said to follow it. Kept. |
| i | `e2e/versions-v2.spec.ts` | This repo's Playwright config collects `tests/e2e/*.measure.ts`, so the suite is `tests/e2e/versionsV2.measure.ts`. |

## 2. Recon (Step 0)

| | Result |
|---|---|
| 0.1 Pack | In `~/Downloads/versions-v2-pack.zip` (not the repo root). All `SHA256SUMS` lines pass; `versions-v2.html` = `16e95e72…4540`. Committed alone (d9d735f0). |
| 0.2 Baseline | tsc clean · `vite build` clean (no CSS warnings) · Vitest 649 files, 9,956 passed, 3 skipped. |
| 0.3 v1 survivors | `VersionsV1Page.tsx` + `versionsV1.css` — **retired** (replaced, deleted in the same commit). `lib/versionsPage.ts` + test — **retired** (v1-only). `VersionsPane.tsx`, `BookVersionsPanel.tsx`, `manuscripts/v27/VersionsPage.tsx` — **left** (manuscripts files, out of bounds; mounted nowhere or by the unrouted `AllManuscripts`). `lib/bookVersions.ts` — **reworked** (v2 writers added). `lib/queryVersions.ts` — **reworked** (reads the resolver). `unrecordedVersion` — **kept** (packages' count). `versionLock.ts` — **kept** (materials, unrelated). `usePackagesModel` `bookVersionId` — **kept**, read by the resolver. `VersionLines.tsx` — **kept**, reads the resolver through `openingRead`. Route and sidebar row — **kept**. v1's e2e (`versionsV1`, `ver1Shots`, `ver1Fixture`, `ver1Lib`) — **retired**. |
| 0.4 Resolution today | Three routes: `packageReplies.creditedSlot(q,"version")` (credited edition), `queryVersions.openingRead` (package's sample), `queryVersions.manuscriptHeld` (the last send activity's `bookVersionId`). One reader now: `versionsV2.resolveQueryVersion`. |
| 0.5 Pro / founding | `UserPlan.PRO`; `versionsUnlocked = VERSIONS_FOUNDING_ACCESS \|\| plan === Pro`, the constant on. **No founding flag exists**, so no real account sees the lock today (§5). |
| 0.6 Guide | `PageChecklist` + `lib/pageChecklist` state under `todoPrefs.<page>.guide` (Contact list, Query Centre, Manuscripts). |
| 0.7 Rules | `bookVersions` is a list ≤ 50; no per-entry shape (owned by the writer). A query may not write `bookVersionId` (not in the allowlist). |
| 0.8 False premises | §1. |
| 0.9 Prod data | Not read (prod data is off limits). The migration is read-time and writes nothing (`readVersions`), so there is no rewrite to stop for. |
| 0.10 Harness | Written first; red against dev's `index-BP7RZ5a2.js`: 6 of 6 cases fail on `[data-vv2="page"]` (d06d296f). |

## 3. Phases

Gates per commit (tsc · build · Vitest), against baseline 649 files / 9,956 passed:

| Commit | What | Vitest |
|---|---|---|
| d9d735f0 | the pack | — |
| d06d296f | the harness, proved red | — |
| 38ab7d52 | **Phase 1** — model, resolver, rules | 650 / 10,000 |
| 5ad9686c | **Phase 2** — wiring | 651 / 10,007 |
| 3a30acfc | **Phases 3–9** — the page | 650 / 9,998 (v1's lib tests retired with it) |
| 6c2b610c | **Phase 10** — VER2 and two fixes | 650 / 9,998 |

All tsc clean, all builds clean of CSS warnings.

**Phase 1.** `BookVersion` gains `num`, `parentId`, `changes`, `original`, `archived`/`archivedDate`; `Manuscript` gains `inUseBookVersionId`, `bookVersionSeq`; `Query` gains `bookVersionId`. `lib/bookVersions` (still the single writer): `readVersions` (legacy read), `saveNewVersion` (the first save creates Original in the same write), `editVersion`, `setInUse`, `archiveVersion`, `bringBackVersion`, `deleteVersion` (children move to its parent), validation, `versionSnapshot`. `lib/versionsV2`: `resolveQueryVersion` (D4), `inUseId`, `versionAtLogging`, facts, donut, carousel and league orders, tree, picker helpers. `db.writeVersionChange`: one batch, `null` clears a key. Rules: the three fields; dev rules deployed (release `updateTime` 2026-10-23T11:50:44Z; every rules commit on every branch is an ancestor of this one, so nothing was dropped).

- **A rule cannot loop over a list**, so a version's own caps (a name of 1–40 characters, 1–8 changes of 1–80) are enforced by the writer and its tests, not by the rules.
- **Red before green** — each fix removed, the suite run, the file restored from a path-derived backup:
  - R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, D4 order, D6, D3a: each red.
  - R1's mutation fails the shared fixture at collection, so the file reports "no tests"; that counts as red.
  - Emulator rules cases: the three that allow the new fields are red against the old rules. The two denial cases pass on both, because they guard the shape.

**Phase 2.**
- `openingRead` and `listVersion` read the resolver, so the reading pane's "Opening read", the list chip and the version filter all agree with the Versions page.
  - This reverses D8 "held wins over read". What the agent holds after a send stays its own line (`manuscriptHeld`).
- `manuscriptSummary.queryVersionId` reads the query's own version first.
- The edit journey re-stamps the version when what was sent is corrected.
- `packagesHolding` lists the unsent packages a delete clears.
- `addQuery` stamps every log path, and imports pass `{ imported: true }` and record nothing (D7).
- Each case was proved red the same way.

**Phases 3–9 (one commit: one component tree and one generated stylesheet; splitting would commit states that never existed).**
- The ref's markup and copy are ported component by component.
- **The stylesheet is generated, not hand-written** (`scripts/versions-v2/extract-css.mjs`, `gen-css.mjs`):
  - It keeps the 761 of the ref's 3,770 rules that match its Versions DOM, across all five states and every overlay, in the ref's order, scoped to `.vv2`.
  - Three traps found on the way:
    - **The CSSOM re-serialises a `font:` shorthand holding a `var()` as empty longhands**, which the browser drops. Every rule's body is taken from the ref's source text instead (3,746 of 3,752 rules aligned).
    - **`@container` rules** were being skipped by the extractor.
    - **The header's `100cqw` reads the ref's `.scroll` container.** Here the page root is that `sheet` container.
  - It adds:
    - an `all: revert` restore against Tailwind's preflight and brand.tsx's bare-element fonts;
    - heading font claw-backs;
    - the two faces read from `--sp-type` / `--sp-serif` (the house lock forbids naming them).
- **"Not sure yet" is stored** as `VERSION_NOT_SURE`. Clearing the id would let the resolver re-count the query through its package or Original.

**Phase 10.** Two faults found, both fixed:
- **Undo after a first save wrote `bookVersions: []`** where the key had been absent. The snapshot now holds `null` and the writer deletes the key.
- **The faces resolved to nothing.** The ref redefines `--sp-type` / `--sp-serif` from its own tokens, and that made a cycle with my swap.
  - tsc, Vitest and all 24 locks stayed green over it; only the screenshots showed it.
  - S01 now reads the faces off the page, and was proved red on the broken build.

**VER2: 24 of 24 green at 1512 × 982 and 1280 × 832**, on the local dev build and again on the deployed site.
- Covered: S01, S02 (with the hover label), S04 archive and Undo (byte for byte), S05 delete copy and Undo, S06, S11/S12 (all four bands, and keyboard focus), S14, S15/S16, S17/S18, S27 first save and Undo, S19–S21 guide ticks from real actions, S29.
- Every case that writes re-seeds first, and the suite re-seeds at the end.
- **The red proofs are thinner than v1's.**
  - The natural red is the whole file against dev's v1 build, and S01's typography check against the broken build.
  - I did not run a named mutation for each e2e lock.

## 4. Ref against dev (`reports/versions-v2/shots/`, all 29 at both widths)

Differences, and what was done:

- **Data.**
  - The fixture uses invented names (house rule), so the names and counts differ from the ref's sample.
  - One fixture version has no word count, so it shows "–" and "same as original".
- **The shell is the app's.**
  - The sidebar is 248px against the ref's 240, and the app has its beta strip, so the content is 8px narrower.
  - At 1280 the title spills 9px past its own box into the gap; the ref's spills 3px. It never reaches the donut card, and S01 locks exactly that.
- **The drawer's "See these N in the Query Centre →" link is omitted** (false premise g).
- **Lock card item 1:** "Head to head. Any two versions, side by side." became "A league table. Every version side by side." Head to head isn't built, and copy states only what the code does.
- **The guide pill is hidden on the Free page.** The ref keeps it, but every step would spotlight an inert control.
- **The guide's checklist and done note** are the shared `PageChecklist`'s own dress (the prompt: "exactly as the guide system already behaves"). Step 1's tip line is added.
- **"Show all {n} versions"** appears only when something is hidden: more than the pinned card plus 8. The ref showed it at exactly 9 rows, with nothing hidden.
- **R5 applied where the ref printed a percentage below 5 sent:** the archived row, the funnel tooltips, the league's "Request rate, all versions" and "Highest request rate".
- **"Asked for more" reads the history** (R4). The ref's `isMore` matched only the current status.
- **The dim behind the drawer** is the same value as the ref's (`rgba(27,36,51,.42)`). The screenshots differ only in what sits behind it.
- **Compact tree:** neither the ref nor the app scrolls to the in-use version. The ref's formula yields 0 too.

## 5. Open items for Nick

1. **Founding members.** No flag exists. The gate is `VERSIONS_FOUNDING_ACCESS || Pro`, with the constant on, so no real account sees Free today. The Free state shows on dev builds through `sessionStorage["sa.dev.versionsFree"]="1"`.
2. **The Query Centre version link.** Build a reachable version filter in the Query Centre, or leave the drawer link out for good?
3. **Prod rules.** `Query.bookVersionId`, `Manuscript.inUseBookVersionId` and `bookVersionSeq` must be deployed to prod before this page reaches prod; otherwise every save and every logged query is denied silently.
4. **`manuscriptSummary.queryVersionId`** (Manuscripts page) reads the query's own version and then the package's, but not Original by date. That step needs its callers (manuscripts files) to pass the versions.
5. **Pre-v2 manuscripts** keep reading: their first version is the root, and no Original is created for them.
6. **Illustrations.** The tree's "A hawk pinning cards to a family tree" and the league's "A hawk with a trophy" are still the ref's placeholders.
7. **The explainer's step 2** ("New queries send what that package holds") is the ref's copy. With In use as the default, it tells only half of it.

## 6. Dev

- `https://scriptally-dev.web.app/manuscripts/versions` serves **`index-OojVGv_5.js`**, from `dev/ver1-nbab-pkglink-hm1-ver2` at 468c0d35.
  - That branch is the previous served branch, `dev/ver1-nbab-pkglink-hm1` (verified to build to the served `index-BgvCz4eN.js`), plus `versions-v2`.
- Dev Firestore rules deployed (`updateTime` 2026-10-23T11:50:44Z).
- **Prod untouched** (hosting, rules and functions).
