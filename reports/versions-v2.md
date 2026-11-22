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
2. **The Query Centre version link — FOLLOW-UP (Nick, 23 Oct: leave it out for now).** The drawer ships without "See these N in the Query Centre →". When the Query Centre gains a reachable version filter (today it exists only in the retired three-column arm of `Queries.tsx`), add the link back to the drawer's footer, filtering by `resolveQueryVersion` so its count matches the drawer's.
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

## 7. v2.1 — Tracking & performance "warming up" (23 Oct; ref `design-refs/versions-v2-1`, S30)

Once a book has a live version, the section stays on the page. If fewer than two live versions have each gone out with 5 queries, the band shows its divider and the warming-up panel instead of the carousel, league table and summary. Compare appears only with the full section.

### 7.1 False premises
- **The spec file is `tests/e2e/versionsV2.measure.ts`**, not `e2e/versions-v2.spec.ts`. W1–W4 are in that file, beside S01–S29.
- **The pack arrived in `~/Downloads`**, not the repo root. It was copied to `design-refs/versions-v2-1/` and hash-checked (`053072a9`).
- **v2 did not hide the section on "fewer than 2 ready".** It hid it on fewer than 2 *sent* versions (any query at all): `V2Tracking.tsx:51` at `053072a9` (`if (sent.length < 2) return null`). Compare used the same test (`VersionsV2Page.tsx:79,260`). So a book with two versions out once each showed the full section, with every rate reading "too early". v2.1 replaces both conditions with one: `trackingState` (`lib/versionsV2.ts`).
- **W2 does not drive the Log-a-query journey.** It writes the same query and activity documents `addQuery` writes (`ver2Fixture.mjs --warm-log n`), while the page stays open with a window mark set. Driving the drawer five times would have tested the drawer rather than B4. B4 works because the section is derived from the live snapshot, and the mark surviving proves no reload happened.
- **The CSS was hand-ported, not regenerated.** The v2 extractor only reads the v2 ref, and the v41 rules are a self-contained block. So the `.wt*` rules were copied into `versionsV2.app.css`, scoped to `.vv2`. The `@container sheet (max-width:1200px)` block was written by hand because the extractor's parser misses `@container`.
- **W4 cannot be shown red first.** The empty state already hid the band in v2. It is a guard, and it was green on dev before the change.
- **The panel title rendered in Playfair**, not the typewriter face. brand.tsx forces every `h3` with `!important`. One claw-back rule fixes it (`.vv2.vv2 .wt-tx h3`), and W1 now asserts the face.

### 7.2 Recon
- The threshold is `MIN_SENT_FOR_RATE = 5` (`lib/versionsV2.ts:29`). The panel reads it, so there is still only one "5".
- "Sent" is `VersionFacts.n`, which already excludes withdrawn queries (`counts`, `:132`). Archived versions are not in `m.live`.
- Pace counts this manuscript's queries dated in the last 30 London days: withdrawn excluded, with any version or none. The day comes from `Intl` en-CA in `Europe/London`.
- **B5 (Free):** the lock is unchanged. As in v2, a Free page draws everything beneath the lock, inert (`VersionsV2Page.tsx:295,315`). So what sits under the lock now follows the same three states, and a Free book with only one ready version shows the warming panel there, inert, rather than nothing.

### 7.3 Commits and red proofs
- `053072a9`: the pack.
- `47acf2c4`, phase 1: `trackingState`, `warmOrder`, `warmNeed`, `warmPace`, `warmWeeks`, `V2Warming`, the state branch in `V2Tracking`, Compare on "full", the ported CSS and the smoke update.
  - `versionsV21.test.ts` has 11 cases. Each was turned red by a named mutation (`scratchpad/mut/p21.py`) before being trusted.
  - The tie-order case passed under its own mutation at first: a stable sort hid it. The fixture was reordered so that only the tie-break can pass, then proved red.
- Phase 2: W1–W4, the fixture (two new books, High Water and Low Water), the S30 shots and this section.
  - W1, W2 and W3 were red on dev's build before the change (`index-OojVGv_5.js`). W4 was green, as a guard (see 7.1).

### 7.4 Gates against baseline
| | Baseline (before editing) | After |
|---|---|---|
| tsc | clean | clean |
| `vite build` (whole log grepped) | no errors or warnings | no errors or warnings |
| vitest | 650 files · 9,998 passed · 3 skipped | 651 files · 10,010 passed · 3 skipped |
| VER2 on dev (`index-OojVGv_5.js`, S cases) → after (`index-DIv_ZsAq.js`, S + W) | 24 + setup green; W1–W3 red | 33 of 33 green (S01–S29 and W1–W4 at both widths, plus setup) |
| VER2 locally (127.0.0.1:4614) | — | 33 of 33 green |

### 7.5 Screenshots (`reports/versions-v2-1/`, beside S30)
- **1512:** three columns: the illustration slot, the copy with the ETA box, and the progress panel. Then the "What you'll see here" row with three EXAMPLE tiles. Copy, eyebrow, typewriter title and progress rows match S30.
- **1280:** the progress panel wraps under the copy, as in S30.
- **Differences:**
  - **Rows:** the fixture has two live versions, so two rows. S30 draws five, two of them "Not sent yet".
  - **Width:** the app's sheet is about 8px narrower than the ref's frame, so at 1512 the title wraps one word earlier.
  - **Not in the app:** the ref's demo state switcher ("Early days · Querying, no versions …") is part of the mock.

### 7.6 Dev
- **Deployed to dev 23 Oct (hosting only)** from a clean checkout of the pushed `dev/ver1-nbab-pkglink-hm1-ver21` (`40100845`, which is v2's integration branch with `versions-v2` merged in). Served before: `index-OojVGv_5.js`. Served after: **`index-DIv_ZsAq.js`**.
- Gates on the merged tip: tsc clean, vitest 652 files · 10,025 passed · 3 skipped, `build:dev` with no warnings.
- **Prod is untouched.** No prod deploy, no rules change and no data-model change.

## 8. v2.2 — title card, tinted list panel, new empty states (24 Oct; ref `design-refs/versions-v2-2`, S31–S37)

The living header (hawk, "{n} versions on file", "of {title}", Compare, "?", and the "Sent with queries so far" donut) is gone. The page now opens on one title card. The version list sits in a pale blue panel. A book with no versions shows "No versions yet": a preview of the list whose dashed row opens the first save, and under it the comparisons note. The first save on a book with no queries now says "Original is saved too", not "your 0 queries".

### 8.1 False premises
- **0.4's crash does not happen.** On dev's build at the time (`index-eXm3BypA.js`), on a Pro book with no versions and no queries ("Dead Reckoning"), New version → name → one change → Save worked:
  - Original and the version were both saved (two rows);
  - no console errors and no error boundary.
  - The form already treats any book with no versions as a first save (`V2Overlays.tsx:246`, `first = !v && !m.versions.length`), whatever the query count.

  What was wrong was the copy: the ready line read "Ready. Original is saved too, with your 0 queries.", the diagram read "Your original manuscript · 0 queries", and the toast read "Your 0 earlier queries count towards Original." C4 fixes the copy; there was no crash to fix.
- **The spec is `tests/e2e/versionsV2.measure.ts`**, not `e2e/versions-v2.spec.ts`. The pack was in `~/Downloads`, not the repo root.
- **The list panel's top margin renders 56px, not 28.** The mock's `margin:28px 24px 0` loses to its own older `#secTiles.cx-sec.first { margin-top:56px !important }`. Measured on the rendered mock: 56. The app's generated sheet carries the same rule, so the literal port gives the same 56. The ref is the oracle.
- **The empty state's side margin renders 0, not 24.** The mock's `.ev` sits level with the title card (24px from the sheet, measured), not 24px further in as B1's numbers suggest. The port keeps the mock's cascade, so it matches.
- **The v2.2 mock still says a version "still counts in your totals, like the donut and 'Sent with queries so far'"** in the archive confirm. Both are deleted, so the app reads "It still counts in your totals." A sentence must not point at things that are not there.
- **I did not regenerate `versionsV2.css`.** The extractor keeps every rule that matches the ref's DOM, and the v2.2 mock still carries the old header in its markup (hidden, `tb2-old`). A regenerated sheet would keep `.mh`/`.hpie` all the same. Those rules remain in the generated sheet and nothing renders them. Everything new is hand-ported, scoped to `.vv2`, in `versionsV2.app.css`.
- **D had already landed (v2.1),** so it was only checked: the warming-up CSS in the v2.2 mock is rule-for-rule identical to v2.1's (41 rules, no differences), and the S33 screenshot matches.

### 8.2 Recon
- **0.1:** pack present; `shasum -a 256 -c SHA256SUMS` all OK; `versions-v2-2.html` = `5e9bba58…7ec77`. Committed on its own as `57de63ca`.
- **0.2:** v2.1 had landed: `053072a9` (pack), `47acf2c4` (panel), `53e667f3` (tests and report).
- **0.3, as found:**
  - header: `VersionsV2Page.tsx:253–292` (hawk, title, "of {title}", New version · Compare · ?, donut card; donut built at `:224–234` from `lib/versionsV2.donut`);
  - empty state: `:337–355` ("Start tracking versions", pre-note, three steps);
  - first-save notes: `V2Overlays.tsx:246` (`first`), `:262` (ready line), `:283` (earlier-queries note), `:327` (diagram sub-line); toast at `VersionsV2Page.tsx:147`.
- **0.4:** see 8.1.
- **0.5:** T1–T6 written first and run against dev's build before any of this was deployed. All six were red:
  - T1: no title card
  - T2: list background transparent
  - T3: no hairline ring
  - T4: no "already sent" line
  - T5: no comparisons note
  - T6: the spotlight's hole is not on an Add button

### 8.3 Commits and red proofs
- `57de63ca`: the pack.
- `c6ba8996`, Phase 1 (A + B):
  - the title card;
  - the header, Compare and donut deleted, including `donut`/`versionColour`/`DonutSlice` and their R12 tests;
  - the tinted list panel;
  - the guide's "Add a version" now targets the title card's button, or the dashed row when that is the one on screen.
- `fee0275c`, Phase 2 (C):
  - `V2Empty` (No versions yet and the comparisons note);
  - the three-step empty state removed;
  - `ExampleTiles` built once and shared with the warming panel;
  - C4's copy;
  - `firstSaveMessage`;
  - `firstSave.test.tsx` (3 cases). Proved red twice: HEAD's form fails the zero-query case, and the old toast wording fails the toast case.
- Phase 3 (this commit): T1–T6 at both widths, and the S31–S37 shots. Four existing cases were re-pointed because they read what A1 deleted, each with its reason stated at the change:
  - S01 now reads the list's count, the banner and the title card's faces;
  - S27 reads the empty state's line and Original's own card;
  - W2 asserts no Compare;
  - the smoke test reads the title card.

### 8.4 Gates against baseline
| | Baseline (57de63ca) | After |
|---|---|---|
| tsc | clean | clean (after each phase) |
| `vite build` (whole log grepped) | no errors or warnings | no errors or warnings (after each phase) |
| vitest | 651 files · 10,010 passed · 3 skipped | Phase 1: 651 · 10,008 (the 2 donut tests deleted) · Phase 2: 652 · 10,011 (+3 C4) · 3 skipped |
| VER2 locally (127.0.0.1:4615) | — | 45 of 45 (S, W and T at both widths, plus setup) |
| VER2 on dev | 33 of 33 (`index-eXm3BypA.js`) | every case green at both widths on `index-Bf3T4TiO.js` (see below) |

### 8.5 Screenshots (`reports/versions-v2-2/`, beside the refs)
- **31, 32:** the title card (Versions + PRO, the line with the bold title, the two buttons, the quill hawk at 180/150) and the tinted panel (`#e8ecf2`, radius 22, inset ring, the OTHER VERSIONS label in slate) match.
- **33:** matches S33.
- **34, 36:** the empty state matches (hairline container, four-column preview, Original "None yet" or "{n} already out · they'll count here", the dashed row and its pill).
- **35:** the comparisons note and its three tiles match.
- **37:** the note, "Starts from" fixed to Original, the diagram's "Your original manuscript" and the ready line match.
- **Differences, none needing a change:**
  - the fixture's titles, word counts and query counts are not the mock's;
  - the app's sheet is about 8px narrower than the mock's frame, so the title-card line wraps a word earlier;
  - the first-save drawer is slightly wider than the mock's, as in v2 (the form beyond C4 is out of scope).
  - Shot 32's first framing clipped the heading; I re-shot it.

### 8.6 Dev
- **Deployed to dev 24 Oct (hosting only)** from a clean checkout of the pushed `dev/ver1-nbab-pkglink-hm1-ver21-hm2-hm3-ver22` (`b18c8ef5`, which is dev's then-current `…-hm2-hm3` with `versions-v2` merged in). Served before: `index-CKMg5_xB.js`. Served after: **`index-Bf3T4TiO.js`**.
  - Gates on the merged tip: tsc clean; vitest 653 files · 10,027 passed · 3 skipped; `build:dev` with no warnings.
- **Dev moved twice during the pass,** and both times the build was rebased rather than deployed over someone else's work. At recon it served `index-eXm3BypA.js` (`…-hm2`, another session's build on top of v2.1). At deploy time it served `index-CKMg5_xB.js` (`…-hm2-hm3`, phone hero v3, 26 minutes old). My first integration branch was cut from `-hm2`; I deleted it unpushed and rebuilt on `-hm3`.
- **The dev run, in full:** the whole spec ran 40 passed, with T3 at 1280 red on a timing slip in my own case: it read the ready line the instant Enter was pressed, before React re-rendered, and saw "Add at least one change.". The case now waits for the text. A follow-up run of T3–T6 and S29 at both widths (everything serial mode had skipped, plus T3 at 1512 again) was 11 of 11 with setup. T3's save was undone by its own Undo, and the fixture was re-seeded after.
- **One flake, recorded:** in one of four local full runs, S19's "use" tick did not arrive within 8s. It passed alone at both widths twice in a row, the next full run was 45 of 45, and the dev baseline and the dev run also passed it. Nothing in the guide was changed by this pass.
- **Prod is untouched.** No prod deploy, no rules change, no data-model change.
