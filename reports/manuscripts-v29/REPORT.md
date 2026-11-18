# Manuscripts v29 — the book on the page

Branch `manuscripts-v29` (pushed). Dev: `dev/smv31-vv6-cp32-lqmf1-cb15-td57-qc157-an26-ms29` @ c0e82e3d0, serving
**`index-DcWnGsi0.js`**. Not merged to main; prod untouched.

## 1. False premises in the prompt

1. **The base branch.** At the time of the run dev served `index-DJ8tuHvN.js` from `dev/smv31-vv6-cp32-lqmf1-cb15-td57`
   @ dad7fdbce, not `dev/smv31-vv6-cp32`. The branch was cut from dad7fdbce. By deploy time dev had moved again (Query
   Centre v157 + Analytics v26, `index-DAoT-GtE.js` from `…-td57-qc157-an26` @ 8da5b784e); the dev branch stacks on that.
2. **"Undo is one `updateManuscript`."** `updateManuscript` narrates every write into the feed ("You updated a
   manuscript's details"), so an undo through it would leave the save's feed row and add a second — the compensating
   entry CLAUDE.md forbids. Undo writes back through `updateManuscriptQuiet` and deletes the feed rows the save made
   (those not present when the drawer opened). And `updateManuscriptQuiet` re-stamps `statusChangedDate` *after* the
   fields whenever the status moves, so the stamp is put back in a second quiet write. So: two quiet writes and a delete,
   not one call.
3. **"Reuse the built quoted-line rule so a writer's own quotes are not doubled."** The built rule (`QuotedLine`) only
   bound the closing mark to the last word; nothing stripped a writer's own quotes. The page now drops a writer's outer
   quote marks from the *display* (`unquoted`), keeps the last-word binding (`splitLastWord`, moved into
   `lib/manuscriptV29`), and Copy still writes the stored text verbatim.
4. **"Add a Manuscripts v29 entry to CLAUDE.md."** The rulebook (main's CLAUDE.md, and every pack on this line since
   Responses v15) keeps page history out of CLAUDE.md. Nothing was added there; the lasting decisions are in
   `docs/decisions/manuscripts.md` (created on this line — main already has one; fold by hand at merge).
5. **"No horizontal overflow … at 200% zoom on 1512."** 200% on a 1512 screen is a 756px CSS viewport — below 768, where
   the desktop page stands aside for the phone screens (do-not-touch). MSV29 L3 measures it anyway (no overflow), but it
   measures the phone layout, not this page.
6. **"Long titles: follow the ref's `.title.long` clamp."** wsHeaders H8 (Workspace headers v1) locks a 60-character
   Manuscripts title at **54px, "never smaller"**, and the prompt says not to loosen a lock or change the shared header.
   The built 54px wrap is kept; the clamp is item 8a below.
7. **Seeds.** The harness account has no book with exactly one query, so the "one query" variant is held by the unit lock
   (msv29.test C4), not the rendered harness. Its book with 14 queries is querying since **14 Mar 2026** (the earliest
   `dateSent`), not 10 Mar.
8. **"The ref's `1 queries`."** The ref only models 14 and 0; "1 query sent for this book" is the prompt's string.

## 2. Base and gates

Base: `dev/smv31-vv6-cp32-lqmf1-cb15-td57` @ dad7fdbce, + the ref pack (01022c7eb). Baseline was taken on a clean
detached checkout of 01022c7eb (a first attempt ran while the tree was being edited and was discarded).

| Gate | Baseline (01022c7eb) | After (c818d5663) |
|---|---|---|
| `tsc --noEmit` (6 GB heap; the default heap OOMs) | 7 errors, all `functions/` "cannot find module" (the checkout had no `functions/node_modules`); **0** once the primary's was linked | **0** |
| `build:dev` | exit 0 | exit 0, no errors/warnings |
| `build:prod` | exit 0 | exit 0, no errors/warnings |
| Vitest | 3 failed / 12,554 passed (11 files failed: 8 `functions/` files on module resolution, `queryClock` and `aiRefusal` at collection, `firestoreTarget`) | 2 failed / 12,745 passed — the same two `firestoreTarget` cases, naming the same 23 pre-existing scripts (not `ms29Fixture.mjs`) |

The after run had `functions/node_modules` linked (needed by the emulator's `authUser.mjs`), which is why the
`functions/` files collect there. The merged dev line: tsc 0, the 39 Manuscripts spec files 576/576, MSV29 17/17.

## 3. What landed

| Commit | Phase |
|---|---|
| 01022c7eb | The ref pack, alone (hash gate passed: `4ed4f3ba…f960`; enrolled in `.refhashes.json`) |
| db95febf9 | A–D and F: the header, the desk, the drawer's feedback |
| 95900879c | E: the retirements |
| c818d5663 | G: the locks, the harness, the readings |
| (this commit) | H: decisions and report |

- **A · header.** One white "Edit details" (pen, serif 600/18) at the built height; Edit and View summary gone. Right
  block (`MsVitals`): count + "words" or "Add a word count", hairline, main genre, age, cream dot + status with "since"
  only when Querying with a date. Collapsed bar: "Edit details". Box unchanged at 1280/1512/1717 (MSV29 L1).
- **B · The pitch.** Sand band; sub-line by count written; logline / elevator pitch / synopsis rows; Copy + Edit, or
  "No … yet." + reason + "Add one"; synopsis clamp at five lines above 90 words with Read it all / Show less and the
  word count.
- **C · Details.** Stone band + Edit; five full-width ledger rows with `"{Label}: {value}. Edit"`; foot: "{n} queries
  sent for this book" / "1 query sent for this book" + See them (`onNavigate("queries")` — the Query Centre reads the
  shell's shared manuscript key, so it lands scoped), or "No queries sent for this book yet." + Log a query (railNav
  `invokeCapture("query")`, the top bar's own entry).
- **D · Your manuscripts.** The active book on the rail spine's cloth (#34425c + its cream edge, the ref's weave and
  strip); the coming-soon tile with no button, no tabindex, `role="group"` labelled "Add a manuscript, coming soon".
- **Layout.** `minmax(0,1fr) 392px`, 24 gap, tops aligned; one column at 1180. The desk sits 24 under the header (the
  ref's `.head` margin) via a page-local −24px against the shared sheet's 48.
- **F · drawer.** "wordCount" open target; Undo on the saved toast ("Put back as it was."); changed pitch rows flash
  sand → white once (off under reduced motion). Esc / dim / Cancel discard; focus returns to the opener (built).

## 4. Retired and deleted

Deleted (no other importer): `v27/BookView.tsx`, `v28/MsFoot.tsx`, `v28/QuotedLine.tsx` (+ its test). Dead CSS removed
from `msv27.css` (book container, details card, logline strip, book view) and `msv28.css` (page foot, closing-quote
rules). Kept: `V27Hero` and its `.ms27-mh` rules (the Versions page imports it), the guide's `.ms27-gl`, and
`lib/manuscriptV27`'s `bookRows` / `coverKicker` / `cardRows` (pure, still unit-locked; now unused by the page — a
candidate for removal with their tests). Retired locks: `tests/e2e/RETIRED-manuscripts-v28.md`.

## 5. Locks and their red-before proofs

**Rendered — `tests/e2e/manuscriptsV29.measure.ts`, 20/20 green** (L1 ×3, L2, L3 ×5, L4, L5, L6 ×2, L7, L8, L9, L10,
shots ×2). `MSV29_MUTATE=all` turned every lock red on its own named break (`red-before-e2e.txt`); L3's first break
missed the three wide widths, so it was widened and re-proved (`red-before-e2e-L3.txt`).

| Lock | Holds | Break that turned it red |
|---|---|---|
| L1 | header left/width/height/top and 38 from the sheet = before.json (MSV29_TAG=before on the base build) | header +60px |
| L2 | one filled button, "Edit details", white, bottom ≤ 800 at 1280×800; no navy-filled button on the desk | a cloned header button |
| L3 | two columns (392, 24 gap, tops aligned) at 1280/1512/1717, one at 1180, desk on the header's edges, no overflow; 756-wide no overflow | swapped columns + a too-wide desk |
| L4 | every desk / header button ≥ 32 tall (population > 8); Details rows span the ledger | links squashed, rows 60% |
| L5 | Copy writes the stored logline (no added quotes), pitch and synopsis; "Copied" on #e0e5dd; toast; back after 1.8s | clipboard wrapped in quotes |
| L6 | Edit (Everyday) and Add one / Add a word count (Just added) focus the right field, caret at end; Esc returns focus | focus dropped |
| L7 | Read it all only above 90 words, 5 lines → more, aria-expanded, focus stays; 90 words: no link, "90 words" | aria-expanded reset |
| L8 | band sub-lines (3 / 1 / 0), foot (14 / 0), vitals text, Shelved shows no "since", 45-char title wraps unclipped | sub-line text swapped |
| L9 | save → "Saved…" + Undo + flash; stored changed (+1 feed row); Undo → "Put back as it was." and the doc equals the seed exactly (the absent pitch absent again, the stamp back), feed row gone | a field left behind |
| L10 | Tab reaches every desk button (population > 10), never the coming-soon tile; solid focus ring | tile given tabindex |

**Unit — `v29/msv29.test.tsx`, 29 green.** Eight source mutations each turned the lock red (`unit-red-before.txt`): no
`deleteField()` in the inverse, the clamp at 89, "since" without the Querying test, a writer's quotes kept, no singular
foot, the tile in the tab order, a second header button, the saved toast without Undo.

**Re-pointed:** wsHeaders' Manuscripts row (first = the desk, gap 24). Its **H8** (60-char title on two lines at 1280)
and **T3** (Query Centre pixel-identical) are **red on the base line too** (8 lines there, 7 after) — pre-existing, not
loosened; readings in `wsh-after-manuscripts.json`.

## 6. Shots and the differences from the pack

`shots/`: everyday-1280, everyday-1512, just-added-1280, just-added-1512, drawer-on-pitch-1512, saved-toast-1512,
long-title-1280. Differences kept on purpose:
- Title size: the built 54px, not the ref's `clamp(44px,4.3vw,66px)` (wsHeaders H1 holds the header's title size to the
  Query Centre's); long titles: see 1.6.
- Header art: the built ArtSlot placeholder, not "the Scribe" (baked decision 15).
- Header columns: the built 268px art column at every width, not the ref's 300 / 250 (≤1360) / 220 (≤1180) — the box is
  locked; and the ref's ≤1180 move of the vitals onto their own row is not applied (it would change the header's height).
- The app's own shell, rail, tabs, guide pill and beta strip; the byline reads the account name ("harness" on the
  harness).
- The drawer is the built one (mono section labels such as AGE CATEGORY are the drawer's, untouched by this pack).
- After a save the guide's built "Your book's set up" card can open over the header (the guide's own behaviour).
- Saving through the drawer rewrote the seed's stored "Book club" as "Commercial Fiction" (GenreField's alias
  resolution, built); Undo restores the stored label exactly.

## 7. Restated page-local (lift candidates)

- The frame: `ms29-frame` (white, r28, 10 padding, the ref's shadow), `ms29-in` (1px rgba(28,19,15,.13), r20),
  `ms29-band` (76 min, 18/26 padding; sand #f3e6da, stone #ebe7e2). Versions v6's `.v6-card` is scoped under `.vv6`.
- The pill `ms29-b2` and link `ms29-lk` (the ref's `.b2` / `.lk`), the ledger row `ms29-dt-r`.
- The right block's override of `.wsnh-rc` (block, no max-width) — scoped under `.ms29`, not in the shared sheet.

## 8. Open items for Nick

a. **Long titles:** keep the built 54px wrap (wsHeaders H8, "never smaller"), or adopt the ref's `.title.long` clamp
   (36–48px over 22 characters) and re-rule H8?
b. **Title size generally:** the ref's 44–66px clamp vs the built 54px shared with the Query Centre.
c. **wsHeaders H8 and T3 are red on the dev line before this pack** — someone should own them.
d. **GenreField rewrites a stored label on save** ("Book club" → "Commercial Fiction") even when the writer did not touch
   the genre. Intended?
e. **Item 8 (multiple manuscripts):** an account can hold more than one today (`addManuscript`, the spine's menu, legacy
   data; Free is capped at one by `FREE_MANUSCRIPT_LIMIT`). "Your manuscripts" shows only the active book, as baked.
f. `lib/manuscriptV27`'s `bookRows`, `coverKicker`, `cardRows`, `allGenres`, `paragraphs`, `whereItsBeen` have no page
   caller now; remove with their tests in a later pass?
g. Merge: `docs/decisions/manuscripts.md` was created on this line; main has its own.

## 9. Dev and clean-up

- Dev branch `dev/smv31-vv6-cp32-lqmf1-cb15-td57-qc157-an26-ms29` @ c0e82e3d0 (QC v157 + Analytics v26 + this pack; one
  conflict, `design-refs/.refhashes.json`, resolved as the dev line's file plus this ref). Deployed with
  `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` from a clean checkout of the pushed
  tip, after checking dev still served `index-DAoT-GtE.js`. **Served: `index-DcWnGsi0.js`, equal to the build.**
- Worktrees: `ScriptAlly-ms29` and the two scratch checkouts (baseline, deploy) are removed at the end of the session
  (see the session's wrap-up; nothing uncommitted was left in them).
