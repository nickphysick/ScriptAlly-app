# Comparable titles v32 — report (17–18 Nov)

**Parts could not be split into one commit each.** Parts A–E live in one page file (`ComparableTitlesPage.tsx`), and
the lib removals (`highlightOf`, `letterCards`, `leadLine`) only compile together with the new page. So the page is one
commit (A–F's code) and the harness is a second (F's locks and retirements).

## 1. False premises

1. **"The branch dev serves is the most recently updated `origin/dev/…` branch."** At the start dev served
   `status-marks-v3` @ e08d528d5 (`index-B40IUGVQ.js`), which is not a `dev/…` branch. I cut `comps-v32` from it.
   Dev then moved twice during the session: to `dev/smv31-vv6` (Versions v6), then to `dev/smv31-vv6-rsp15`
   (Responses v15, `index-DBGl9D_1.js`). The Responses session messaged me before my deploy. The deploy branch is
   stacked on that line (§9).
2. **"The current letter is decided in `LetterDesk.tsx`."** The derivation is `inUseLetter` in `lib/queryLetters.ts`
   (the stored `inUseLetterId`, else the active package's letter, else the newest live letter). The page and the
   Letters page both read it. The Letters page opens on that letter by default, so "See the letter" is a navigation
   only; `letters/` is untouched.
3. **"Use the Dashboard's card, Next up row, pill switch and Founding band if reusable."** None of them is reusable.
   `dashboard/v2/Frame.tsx` and `dash2Frame.css` are scoped to `.d58.d2`, and the Founding band's stripes are its own.
   I built all four page-local under `cp32-`, from the ref's values (lift candidates, §7).
4. **"Keep `CompLetterPicker` as it is; only its wording changes."** The copy table's "Picker, for a comp" rows
   (tick the *letters* that mention a comp; "Also mentions…"; "Already sent, so it can't be changed") need a mode the
   built picker did not have: it only ever ticked comps for one letter. I added a **for-a-comp mode** inside the same
   dialog (same head, list, foot; the rows are letters). The unrecorded-letter wording ("Which comps did it mention?",
   "It didn't mention any") went in the same way. The letter mode is unchanged. **The Letters page also renders this
   picker** (`LetterDesk.tsx:411`), so the new wording ("Comps in this letter", "{n} comps ticked", the fixed-letter
   line) shows there too.
5. **"Retire `CompDrawer` if nothing else opens it."** It is still the add and edit drawer, so it stays. Its detail
   (`view`) mode, the retired drawer, is deleted.
6. **The shared header draws ellipses.** The ruled by-line (`.qc1531-for span`) and the collapsed bar's title and aside
   carry `text-overflow: ellipsis` in the shared sheets, which S2 forbids on this page. Page-scoped overrides make them
   clip or wrap; the shared files are untouched (§5).
7. **wsHeaders H1 held every page's headline at the Query Centre's 54px.** That contradicts this page's own size
   (baked decision 1). The comps row is re-pointed to the clamp (§6).
8. **`docs/decisions/comps.md` is not on the dev line.** It exists on `main` (the CLAUDE.md diet) but not on the branch
   I built from, so this page's lasting decisions are recorded here (§8, follow-up).
9. The worktree checkout had no `functions/node_modules`, so the e2e harness's login (`firebase-admin`) failed on the
   first run. I symlinked the primary's, per the repo rule.
10. At the start, 6 worktrees existed besides the primary (above the rule's 5). Only `ScriptAlly-tdf` was clean, and it
    was claimed by a live session, so I touched none of them.

## 2. Base, baseline and after

- **Base:** `status-marks-v3` @ e08d528d5 (+ 7d44665d2, the ref pack). Branch `comps-v32` @ **12cb37c50** (pushed).
- **Baseline:** taken on a clean export of 7d44665d2 in the scratchpad. The machine was thrashing (three other
  sessions' typechecks on 8 GB), so the worktree's own baseline run was stopped.

| Gate | Baseline (base) | After (`comps-v32`) | Dev line (`dev/smv31-vv6-cp32`) |
|---|---|---|---|
| `tsc --noEmit` | 7 errors, all `functions/` modules not installed (environment) | the same 7, nothing else | **0** (functions' modules linked) |
| `build:dev` | exit 0, no error / warning | exit 0, clean | exit 0, clean |
| `build:prod` | exit 0, no error / warning | exit 0, clean | exit 0, clean |
| Vitest | 12 failed + 7 files not loaded (the export has no git repo and no `functions/node_modules`; source sweeps timed out under load) | **3 failed / 12,671 passed** | 3 failed / 12,708 passed |

The three failures are the same three in every run: `emuGuard` ("no recipe under tests/ starts an emulator without the
guard": `tests/e2e/cb21Emu.sh`) and two in `firestoreTarget` (25 `tests/e2e/cl25*.mjs` files). All are tracked files
this pack does not touch, and none names a file of mine. **No worse than baseline.**

## 3. What landed

- **A · Header.** The shared `WorkspaceNavyHeader`, unchanged, with this page's slots (`comps32/CompsTop32.tsx`):
  "{n} comparable titles", + Add a comp, How it works. On the right, the current letter's comps (each on its own line,
  wrapping), the "{letter}, sent to {n} agents" line and See the letter; "No comps yet" when the letter has none; no
  block without a current letter. The collapsed bar reads "{k} in your current letter" and "Add a comp". The headline is
  `clamp(44px, 3.6vw, 66px)` on this page only (`.cp32-hdr`, through the header's existing `className` prop). The block
  is 320 wide, 260 max under 1380. Empty and no-manuscript states as specified.
- **B · Band.** `comps32/CompsBand32.tsx`, the Founding band's construction. It shows the unrecorded sent letter with
  the most queries (`noticeOf` now picks it); its pill opens the picker in the unrecorded mode.
- **C · Shelf and open comp.** `comps32/CompsDesk32.tsx`. The shelf has find, where ("All 7 / Sent 3 / In a draft 1 /
  Not used 3": `WHERE_LABEL` re-worded, keys unchanged), sort (`SHELF_SORTS`) and Next up rows with the four lines and
  the current-letter pill; `aria-current` on the open row; "Nothing matches. Show all". The open comp has a navy band,
  the Letters / Queries switch, the byline, Edit and Add to a letter, four figures (`statOf` / `compRate`;
  "–" / "too early for a percentage" under 5), Why it compares, facts with an "Add publisher →" link, letter rows
  (`letterRate`), and query rows (StatusDot and its word, letter, date; requests first; "See all {q} in the Query
  Centre →" opens `/queries?ids=…&from=Sent with {title}`). It is sticky under the bar. The loading state is two
  skeleton cards.
- **D · Podium.** `podiumOf` / `rankedOf` (new, pure, `lib/compsShelf.ts`) and `comps32/CompsPodium32.tsx`: 2nd · 1st ·
  3rd, steps 112 / 168 / 76, tilts 1.6° / −1.2° / −2°, navy double-ring postmark, the navy base with the `h2`; spare
  places hatched with their line; nothing ranked gives the bare 640 podium and its line.
- **E · Comp-pendium.** `comps32/CompsPendium32.tsx`: bound book (navy spine, stone cover, berry ribbon), table in
  `pendiumOrder`, the note (`pendiumNote`), then the Scout strip. The strip writes `notifyPrefs.comps` exactly as v30
  did, through the page's own writer, then reads "We'll let you know", with an Undo toast. `AppFooter` stays, 96 below.
- **Day one.** One card, "How it works", three oat panels with the landing drawings in their slots, Nick's headings and
  foot line.
- **F · Copy.** Every row of the table, in `CompForm`, `CompDrawer`, `CompLetterPicker`, `CompsHow30` and the page's
  toasts. A grep of the page's sources finds none of "named", "logged", "went out with", "record is fixed" or
  "no line yet" in any user-facing string. That grep first found "went out with" in How it works' step 3 line (the ref
  keeps it, but the prompt bans it and protects only the step headings and the foot line). It now reads "See which
  comps were in the letters that got agents asking for more." That fix was committed and deployed after the first dev
  deploy (§9).

**What survived from v30:** `CompsHow30` (the pop-up; step 2's line re-worded), `marks30` (`Media30`, `Close30` only),
`comps30.css` (buttons, the how-it-works pop-up, ✕, the drawer head), `comps25/CompDrawer` (add and edit),
`CompLetterPicker`, `comps28/CompsExplainDialog` and `refocus`. Retired: `CompsTop30`, `CompsShelf30`, `CompsLetters30`,
their CSS, the drawer's view mode, `highlightOf`, `leadLine`, `letterCards`, `numberWord`, `WHERE_SWATCH`.

**A fix found by a re-pointed lock.** CV25 E2 caught that the picker's saves gave every comp an id (rewriting the
manuscript's comp list) whenever any comp lacked one. v30 wrote ids only when a comp being recorded lacked one; that
rule is restored (`ensureIds(at)`).

## 4. Locks

CP32 (`tests/e2e/cp32.measure.ts`) at 1280 × 800 and 1512 × 900 on `seedComps32.mjs`. `CP32_PROVE=1` runs each lock
clean, then with its mutation (`cp32Mutate.mjs`). Results: `readings.json` (188 readings), `readings-h1-reproof.json`,
and `readings-dev-line.json` (98 readings, 0 failures on the deploy tree).

| Lock | Clean | Mutation went red | Status |
|---|---|---|---|
| H1 headline one line at 1280 / 1512 / 1717; size = the clamp; top and height = the Query Centre's ±1 | green | 1280 ✓ · 1512 ✓ (re-proof after adding the clamp reading: a 66px headline fits on one line at 1512) | landed (measured at 1280/1512) |
| H2 right block lists the current letter's comps, each fully visible | green | ✓ ✓ | landed (measured at 1280/1512) |
| B1 band only with an unrecorded letter; pill opens the picker on it | green | ✓ ✓ | landed (measured at 1280/1512) |
| S1 row lines by state; pill only on current-letter comps | green | ✓ ✓ | landed (measured at 1280/1512) |
| S2 no `text-overflow: ellipsis`; no clipped text (population > 50) | green | ✓ ✓ | landed (measured at 1280/1512) |
| O1 figures = `statOf` / `compRate`; one line | green | ✓ ✓ | landed (measured at 1280/1512) |
| O2 switch swaps the list; StatusDot glyph and word; requests first | green | ✓ ✓ | landed (measured at 1280/1512) |
| P1 order and places = `podiumOf`; 1st tallest and navy | green | ✓ ✓ | landed (measured at 1280/1512) |
| P2 equal rates share a number and say "equal" | green | ✓ ✓ | landed (measured at 1280/1512) |
| P3 spare step hatched with its line; bare podium and line | green | ✓ ✓ | landed (measured at 1280/1512) |
| C1 Comp-pendium order | green | ✓ ✓ | landed (measured at 1280/1512) |
| C2 ribbon clear of "Percentage" | green | ✓ ✓ | landed (measured at 1280/1512) |
| SC1 strip inside the Comp-pendium; leaf stored and survives a reload | green | ✓ ✓ | landed (measured at 1280/1512) |
| G1 no green; no small uppercase mono label; one `h1`; no control inside a control | green | ✓ ✓ | landed (measured at 1280/1512) |
| W1 no sideways scroll; the page is the shared column | green | ✓ ✓ | landed (measured at 1280/1512) |

The first run went red on B1 and P3 after mid-lock re-seeds. The app's persistent cache paints the previous fixture
first, so `openCp` now waits for the page's text to settle for 2 seconds.

**Unit locks** (`src/lib/compsShelf.test.ts`, "CP32 P (unit) · podiumOf" and "CP32 B1 (unit)"): green. Each source
mutation went red, and `lib/compsShelf.ts` was restored byte-identical (sha checked):

| Mutation | Red |
|---|---|
| U1 sort by rate ascending | order, ties, Comp-pendium |
| U2 place = position (no shared places) | ties |
| U3 no `READY_AT` filter | order, under-three / none, Comp-pendium |
| U4 `equal` never set | ties |

## 5. Where the build differs from the ref

- **The header is the shared one** (shared part wins): a 268px drawing column and 36px gaps (the ref has 300 / 240
  with no gap), the Query Centre's button sizes, and the bar's own markup. The right-hand block is hidden under 1100
  by the shared rule (the ref hides it under 1160).
- **No ellipsis on this page:** on this page only, the shared by-line wraps, and the bar's title and aside clip instead
  of ending in "…".
- **Drawers and pop-ups are the built ones** (ref screens 09–12 are stand-ins). The picker's for-a-comp mode follows
  the built picker's layout, not the ref's side drawer.
- **Day one's drawing slots hold the landing drawings** already used by How it works. The ref shows empty hatched slots.
- **"See all {q} in the Query Centre"** appears only when there are more than six queries, as in the ref.
- **A missing year** reads "Add year →" (the ref's data always has one).
- **The off podium card** has a dashed 1.5px border (the prompt says "dashed outline"); the ref has a solid inset ring.
- **Headings:** the shelf and open-comp band titles are `h2`, not the ref's bare spans, so the page has an outline.

## 6. Retired and re-pointed locks

`tests/e2e/RETIRED-comps-v32.md` covers each lock and its successor. In short:

- **Deleted:** `cp30.measure.ts`, `cp30Lib.ts`, `cp30Mutate.mjs`, `cp30Shots.measure.ts`, `seedComps30.mjs`.
- **Re-pointed:** CV25 A1, E2, A3 · AD1–AD7, AD10 · X1 · wsHeaders' comps row · `materialsPageSmoke` (comps) ·
  `compsInQueryRetired` · `pageWidth` W5.
- **Run, one suite at a time, on both `comps-v32` and the deploy tree:**
  - CV25: A1 8/8, E2 11/11, A3 12/12.
  - AD: AD1 16/16, AD2 14/14, AD3 36/36, AD4 14/14, AD5 18/18, AD6 18/18, AD7 11/11, AD10 22/22.
  - X1: 24/24.
  - wsHeaders comps: H1, H3–H9, T1, T2 green.
- **wsHeaders T3 (the Query Centre's pixel oracle) is red, and it is red on the base commit too.** I ran T3 on a clean
  export of 7d44665d2 and it failed identically, so it predates this pack.
- **Cover lost:**
  - CP30 D1t (the drawer title's width; the drawer head is unchanged).
  - CP30 E1's order check of header → card → footer on the empty page. Its presence is still held by wsHeaders H9 and
    the smoke test.

## 7. Lift candidates

- **The Dashboard's framed card** (`cp32-rc` / `cp32-rc-in` / `cp32-rb`): white rim 8, frame `#e9e3d9`, radius 20 / 13,
  a toned band. The Dashboard's own (`os-card`) is scoped to `.d58.d2`.
- **The striped band** (`cp32-band`): white rim, 118° blush stripes, a ringed disc, a white pill.
- **The pill switch** (`cp32-tog`) on a navy band.
- **The Next up row** (`cp32-row`), with its selected state.

## 8. Follow-ups

- **Nick:** when comps v32 merges to `main`, add a "v32 · current state" section to `docs/decisions/comps.md`. In order:
  1. The header block reads `inUseLetter`.
  2. The podium is `podiumOf`: equal rates share a place.
  3. Details live on the page; the detail drawer is retired.
  4. The picker has a for-a-comp mode.
  5. Nothing on the page ends in an ellipsis.
- **Nick (copy check):** the picker's re-worded letter mode also shows on the Letters page ("Comps in this letter",
  "Tick every comp the letter mentions.", "{n} comps ticked").
- **Next comps pack:** the empty-page order lock (header → card → footer) and the drawer-title width lock (§6, lost
  cover).
- **The Query Centre's owner:** wsHeaders T3's oracle is out of date on the base too; re-record it deliberately
  (`WSH_T=recon`) or find what changed.
- **Whoever owns the harness:** `emuGuard` and `firestoreTarget` are red on every line here (`cb21Emu.sh`,
  `cl25*.mjs`).

## 9. Dev deploy

- **Branch:** `dev/smv31-vv6-cp32` @ **f46f73f71** (pushed) = `origin/dev/smv31-vv6-rsp15` @ eae593673 (Status marks
  v3.1 + Versions v6 + Responses v15) + `comps-v32` @ 12cb37c50.
- **Merge conflicts:** two, both in `design-refs/.refhashes.json`, resolved as the union of both maps with no clashing
  key (1,218 refs, all verified).
- **Checks on that tree:** gates and every lock above.
- **Deploy:** hosting only, `--config firebase.dev.json --project scriptally-dev`, from a clean checkout of the pushed
  tip. The served hash (`index-DBGl9D_1.js`) was checked inside the same command before the build and again before the
  deploy.
- **First deploy:** `index-C2JbkeZI.js` from f46f73f71, matching the build. The bundle carries the comps page,
  Responses v15 and Versions v6.
- **Second deploy (the copy fix, 2bcef3a7f merged):** `dev/smv31-vv6-cp32` @ **345ccfed1** (pushed). The same guard
  passed (served = `index-C2JbkeZI.js` before the build and again before the deploy), with tsc 0 and a clean build.
  **Dev now serves `index-C_PGqmGZ.js`**, which matches the build.
- **Not merged to main.** Prod is untouched, and Firestore rules are unchanged.
