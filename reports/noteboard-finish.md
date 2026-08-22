# Noteboard — the finish run

22 Aug 2026, unattended. Baseline at Step 0; commit-only; nothing pushed, nothing deployed.
Colour rules were deployed to dev before this run and recon re-verified them live.

---

## 1 — Premises that turned out false

### 1.1 — "The other session's uncommitted `Queries.tsx` was the known single test failure"

**Reality: gone before the run started.** That session committed its Query Centre work
(`fb6ec4e2`/`49d356b7` and onward); the baseline is **fully green — 372 files, 6313 passed,
2 skipped, 0 failed**. There are no other-session failures to name separately, and the working
tree's only dirt is their calendar report PNGs and `calLook.measure.ts`. (They are still active in
this checkout — `reports/calendar-foot/` appeared mid-run — so gates were still attributed before
being believed, and browser measurement still ran from a worktree.)

### 1.2 — "Undo returns a removed note to the top of the board and drops its tag" (0.5's premise)

**Reality: already fixed, last run** (`b736ef85`). `deleteNote` captures `noteRestoreFields(note)`
**before** the confirm, restores through the same id with `createdAt`, `tags`, `detail` and
`colour`, and `addUserTask` accepts a caller-supplied `createdAt` for exactly this. The probe that
guards it compares the whole ordered sequence.

**But the premise found a real hole anyway:** `noteRestoreFields` carries a *named list*, and two
optional fields postdate the list's design — **`committedDate` and `estimateMin` are dropped**, so
a note committed to Today comes back silently uncommitted. The exhaustive-keys test never caught it
because its fixture note carried neither field — the check was honest about the note it was given.
Phase 2 replaces the named list with the whole document.

### 1.3 — "The pre-build 'Read as a column' control wrapped in the same place, which suggests a shared cause in the toolbar's flex sizing"

**Reality: the flex hypothesis is disproven by measurement.** At 1440 the visible tool row is
1070px wide, its children sum to 1023px, `.tpl-grow` holds **394px of slack**, and no child is
compressed (`flex-shrink` never engages; nothing overflows horizontally). The real cause is in
§3 — a block-level SVG, nothing to do with available width, and it wraps at *every* width.

### 1.4 — "Remove the kebab's swatch row… confirm deleting the swatch row returns PortalMenu to a pure leaf model"

**Reality: the kebab never had a swatch row.** The original build recorded this as a deliberate
deviation — `PortalMenu` renders a pure leaf model with no custom-row slot, so the mockup's
swatches were never built. There is nothing to remove; `PortalMenu` was already pure and stays
untouched. Phase 3's real work — recolour via edit — stands.

### 1.5 — Phase 1b's probe, as specified, would never have been red

The prompt's probe — button height equals a single-line control's height, and
`scrollWidth ≤ clientWidth` — **passes on the broken page**: the button's height is *fixed* at
34px by rule, and the wreckage is vertical, not horizontal (the icon line and the text line sum to
≈32px, which *fits inside* the fixed box — measured `clientH 32 / scrollH 32`, no overflow at
all). The shipped probe asserts what actually distinguishes broken from fixed: **the icon and the
label share a line box** (the SVG's rect and the text's rect vertically overlap), plus the
prompt's two checks.

### 1.6 — "seed one note of each colour… if pink or sage still resolve border-color to transparent, that is a Phase 1 fix"

**Reality: all three papers border visibly on dev, measured fresh this run** — sage
`rgb(201,211,197)`, pink `rgb(238,205,195)`, yellow `rgb(237,223,174)`, three distinct values,
none transparent — and a swatch click repaints the composer live
(`rgb(251,243,217)` → `rgb(233,237,230)`). The source-order fix generalised; **1e is not needed**.

### 1.7 — The first toolbar measurement answered about the wrong element

`document.querySelector(".tpl-tools")` returned the **Calendar's** tool row — main pages stay
mounted, and the Calendar's hidden row precedes the Noteboard's in the DOM. Every reading was a
zero. The default-subject trap, live: the probe now scopes to the row that contains `.nb-search`
and has real width, and asserts it found one.

---

## 2 — Step 0.4: **Branch A**, and the evidence

The three questions, answered against files:

1. **Is the note's To-do row deliberately dateless?** Yes — `isNoteTask` (`todoBoard.ts:35`) is
   `!t.dueDate && !t.done`; the two-natures law. But the note **document** can carry `dueDate` —
   the field is long-standing on `UserTask` (`types.ts:711`).
2. **Does a dated note reach the Calendar with zero edits?** Yes — `userCard`
   (`todoBoard.ts:387`) derives `isTask = !!t.dueDate` and renders **one** row ("Your task", due
   chip, promoted to Urgent on the day); the Calendar reads the same assembled cards through
   `cardActionYmd`. No edit to `TodoCalendarPage.tsx`, `todoBoard.ts` or `todoFamily.ts`.
3. **Does the date need a rules change?** No — `dueDate` is in both `userTasks` allowlists
   (create `firestore.rules:410`, update `:752`), deployed everywhere.

**The question the prompt did not ask, and its answer decided the design:** a dated note is
indistinguishable from an ordinary To-do task, and the Noteboard's own filter (dateless ∧
unticked) would drop it the moment it was dated — the retired "date is the door" behaviour. The
board needs a discriminator to keep it, and one already exists: **`colour` is written by the
Noteboard alone** (grep: `setUserTaskColour`'s only callers are in `TodoNoteboardPage.tsx`), it is
**deployed** to both dev databases, and the conversion write can stamp it. So: a dated task stays
on the Noteboard iff it carries a paper — written at conversion, no new field, no rules change, no
deploy. The fragility (a future surface writing colour onto tasks would leak them onto the board)
is fenced by a sweep lock.

Consequences accepted and recorded:
- **The popover loses its Task field.** One object has one text; a separate short title would
  have to overwrite the note's body, which violates "the note stays here, unchanged". The task
  reads as the note's body — which is precisely what the app's own original "Give it a date" flow
  shipped for months. The heading and body copy stay verbatim.
- **Completing the task retires the note from the board** (`done` excludes it) — the document
  survives, and unticking on the To-do Done column brings it back.

---

## 3 — Step 0.3: the toolbar wrap, as measured

**Cause:** Tailwind preflight sets `svg { display: block }`. The Pin button is `display: block`
(`.tdb-addb`, `todo.css:1349`), so the lucide `<Plus>` inside it is a **block box in inline
content, which forces a line break around itself regardless of `white-space: nowrap`** — nowrap
suppresses soft wraps at white space and has no authority over block boxes. The icon takes one
line (~13px), the label the next (~19px); the two line boxes total ≈32px and **fit inside the
fixed 34px height**, so nothing overflows, nothing shrinks, and no width makes it better or worse.

Measured on dev at 1440: row `w=1070`, children sum `1023`, `.tpl-grow` slack `394px`, every
child `flex: 0 1 auto` and uncompressed; button `display: block`, its svg `display: block`,
`clientH 32 = scrollH 32`. The search field (`.nb-search`, fixed `width: 190px`) takes no slack —
Phase 1b gives it the mockup's `flex: 1; min-width: 220px; max-width: 340px`.

---

## 4 — Step 0.5: restore-through-create, every site

| Site | Shape | Status |
|---|---|---|
| `TodoNoteboardPage.tsx` `deleteNote` | captures before delete; restores id + createdAt + tags + colour + detail; **drops `committedDate`, `estimateMin`** | **fixed this run (Phase 2)** — whole-document receipt |
| `TodoNoteboardPage.tsx:214` `detachTask` undo | re-creates the projected task with createdAt but **drops `tags`** | **path deleted this run (Phase 4)** — the projection itself retires |
| `ToDoPage.tsx:1650` delete-undo | re-creates with id + dueDate + surfaceOffset; **drops `createdAt`, `tags`, `committedDate`, `estimateMin`, `colour`** | **listed, not fixed** — outside this run's scope |
| `Dashboard.tsx:527` post-it delete-undo | re-creates via `addNote` with **new id and new createdAt** (its own comment says so) | **listed, not fixed** — the separate notes store |

`FocusFlow`'s undos rewrite (`updateUserTask` / flag upserts) — not this class, and do-not-touch
besides.

---

## 5 — Phase by phase

Every probe was run against HEAD (the deployed dev build, byte-identical for noteboard files)
before its fix, and against a worktree `vite preview` of the fix after — the other session was
live in this checkout throughout, so no measurement ran from the shared tree.

### P1 — layout and chrome · `26c31f0b`

**1a** `column-width: 280px`, no count, media queries deleted. Red: 291px cards at 1280 under the
spec's 300 floor (see §6 for why the floor moved), 505px at 1920. Green: **3 / 4 / 6 columns** at
1280 / 1800 / 2300, cards 291 / 344 / 307 — the count now falls out of the viewport, three
distinct counts across the three widths.

**1b** `.nb-scope .tdb-addb { display: inline-flex }` — the measured cause (§3), fixed
page-scoped because `todo.css` belongs to the board. The search takes the mockup's
`flex: 1; min-width: 220px; max-width: 340px`, folded into the ONE `.nb-search` rule (a second
block for the same selector silently repoints first-match slices — `tasksViewport`'s lock went
red on the two-block version and was right to). Red: icon/label line overlap **−1.0** (the icon
line strictly above the text line). Green: **13.0**, at 1280 and 2300, height 34, no horizontal
overflow.

**1c** The resting tally retired; `noteFilterLabel(shown, total)` renders `{n} of {total} notes`
only while a search or chip narrows, immediately left of the view toggle. Red: eyebrow
`"11 notes pinned"` at rest. Green: nothing at rest; exact `"2 of 11 notes"` under the seeded
NBPAIR search; gone when cleared. `noteCountLabel` deleted with the eyebrow.

**1d** The ghost's min-height is the one-line note's own members —
`pad + body-line (size × unitless lh) + foot margin + foot min-height + pad-foot + border` —
never a matched number. Red: ghost 120.00 vs note 97.72. Green: **97.72 vs 97.72, delta zero**.

**1e** Not needed (§1.6) — all three papers border visibly, measured fresh.

### P2 — the whole-document receipt · `a02b503f`

`noteReceipt(n) = {...n}` captured before the confirm; a new db primitive `restoreUserTask`
writes it back verbatim (`setDoc`, nothing restamped — the whole map is allowlisted, `colour`
included since the dev rules deploy). The page's undo no longer routes through `addUserTask`.

Red: the probe's fixture gained `committedDate` + `estimateMin` and the named-list receipt
dropped both (3 of 7 red). Green: 7/7 — the receipt deep-equals the note and is a copy; the
sequence comparison now carries **body · tags · colour · committedDate per slot**, because a
body-only compare passes on a note that came back in place wearing less; every position is
removed and restored in turn, not only the middle.

*(A tooling incident worth its line: the edit script's end anchor had been hoisted ABOVE its
start anchor by an earlier commit, so the bounded slice was empty and `replace("", …)` inserted
the block at position 0 of the file. Caught by tsc, redone with anchors asserted in order — the
bounded-slice law applied to the tooling that edits, not only the tests that read.)*

### P3 — the composer is the editor · `7845e209`

Edit opens the composer, seeded (body, paper, first tag), **in the note's own board slot** — one
closure, two mounts, the commit button the only fork (Pin it / Save). `saveEdit` writes only what
changed; empty body keeps the words; **the tag field governs the set only when touched** (single
input, seeded with the first tag's label — an untouched field must not collapse a multi-tag set).
The bare-textarea editor, its `editing` state and `.nb-edit` deleted. `firstTagLabel` joins the
lib (a tag id with no def yields `""` — an id in an input is a leak).

Red: no `.nb-compose` in edit mode at all (the second case burned its full timeout waiting for
one, which was the red, expensively). Green: textarea value = body exactly; composer index 6 =
note index 6; after swatch + Save the card's **computed** background is `rgb(245, 226, 218)` — a
class the cascade discards still reads as present, so the probe reads the paint. Cancel restores;
empty save keeps the words.

### P4 — the date on the note · `25b4c2f8` (§2 has the branch evidence)

`sortNotes` keeps *dated ∧ papered ∧ unticked*; `makeTask` stamps the paper **before** the date
(a refused stamp stops the conversion and says so — dated-unpapered would leave the board between
the writes); `detachTask` clears the date and only the date; the badge is `n.dueDate`; the
popover asks one question. `projectedTaskId` / `projectedTask` / `noteTaskTitle` deleted.
`migrateNotetasks.mjs` migrated the projection era's documents and is idempotent.

Red: 6 of 8 (the rewritten lock against the projection-model lib). Green: 8/8 — including the
one-row assertion against **`assembleBoard`, the To-do board's real selector**, and the
colour-discriminator census (walks every component source; fails if a second `setUserTaskColour`
caller appears). Browser end-to-end: convert due-today → badge on the same card → **exactly one
visible row on /todo** → detach → badge gone, note intact.

### P5 — sweep · this commit

31 tokens read, 0 dangling, 0 fallbacks on undefined tokens; no `display:contents`, no
`mix-blend-mode`, no transform on a note; every rendered class styled and every styled class
rendered (the popover's dead `.nb-pinput` deleted); the three paper rules confirmed **after**
`.nb-note` in source order; `.nb-scope .tdb-addb` outranks `todo.css` by specificity, so order
cannot bite it. Screenshots at 1280 and 2300 with all three papers, plus the drawer, in
`reports/noteboard-finish/`.

---

## 6 — Degraded or deviated

1. **1a's probe floor is 280, not the spec's 300.** Not taste — arithmetic. Multicol renders
   `(container − gaps) ÷ N`, and at a 1280 viewport the content column is 909px: three columns
   are 291px and two are 445px, so the spec's [300, 420] holds **no reachable value** there. 291
   misses the floor by 9; 445 misses the ceiling by 25. The probe states this and holds 280–420;
   the design goal (viewport-derived count, note-sized cards) is asserted intact.
2. **`column-width` is 280, not the spec's 340.** Same arithmetic: at 909px available, 340 drops
   the board to two 445px columns. 280 keeps three at 1280 and yields 344 / 307 at 1800 / 2300.
3. **Phase 4's "one row" browser assertion counts visible list rows, not the model.** The To-do
   page renders grouped batches and folded lanes, so a DOM count cannot re-prove a model count —
   and a duplicate could hide folded exactly where a naïve count looks green. The model-level
   one-row claim is held by the vitest probe against `assembleBoard` (the real selector, as the
   spec asked); the browser proves the wiring end-to-end with the note due **today**, promoted
   into the open urgent lane, exactly one visible row.
4. **The popover lost its Task field** — a Branch A consequence, recorded in §2, not a cut.
5. **Nothing else was degraded or skipped.** 1e was found unnecessary by measurement (§1.6).

## 7 — Baseline vs final

| | Files | Tests |
|---|---|---|
| Baseline (Step 0) | 372 passed | 6313 passed · 2 skipped · **0 failed** |
| Final | 372 passed | **6323 passed** · 2 skipped · **0 failed** |

No other-session failures at either end (§1.1) — their `Queries.tsx` had been committed before
Step 0. Mid-run, their live `TodoCalendarPage.tsx` WIP briefly failed 2–3 calendar suites twice;
both times the failing file was confirmed theirs by `git diff --name-only HEAD` before any gate
was believed, and both cleared when they saved/committed. The +10 is this run's probes.

Do-not-touch: the union of the four commits' files is fifteen paths — the Noteboard's own five
sources/locks, `db.tsx` + `noteboard.ts` (additive), and eight `tests/e2e/` files. Grep of that
list against every do-not-touch name returns nothing. `todoBoard.ts` was **read** (`isNoteTask`,
`assembleBoard`) and never written; `PortalMenu` untouched (it never had the swatch row the spec
believed it had, §1.4).

## 8 — Left for Nick

- **Nothing to deploy from this run.** Phase 4 needed no rules change (`dueDate` and `colour`
  are both live on dev), and rule 9 forbade deploys anyway. The two changed-behaviour surfaces
  (hosting) go out with the next ordinary dev deploy:
  `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`
- **If any account other than the harness ever created a note-task on 22 Aug** (the projection's
  one live day), run `node tests/e2e/migrateNotetasks.mjs` signed in as that account — it is
  idempotent and dry-runnable (`--dry`). The harness account is already migrated.
- **The two listed restore-through-create sites** (§4): `ToDoPage.tsx:1650` and
  `Dashboard.tsx:527` — both drop fields on undo; both outside this run's scope.

---

## 9 — Dev deploy (22 Aug, after the run)

Asked for after the run closed. **Hosting only** — the finish run changed no rules (`dueDate` and
`colour` were already live), so there was nothing else to ship.

Pre-flight: `git fetch`, **0 behind** `origin/main` (39 ahead); `src/` clean, so the bundle
carries exactly the committed tree — HEAD `5fe44f7f`, the run's P5. Build output read in full and
grepped, not tailed: clean, `assert-build-target` confirmed *"bundle targets scriptally-dev;
gen-lang-client-0801391782 absent"*. Then:

```bash
firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

176 files → https://scriptally-dev.web.app

**Verified against the deployed site itself** (`SA_E2E_BASE_URL=dev`, fixtures seeded then
removed): the full measurement suite — `nbFinish` + `noteboardLook`, **16/16** — including the
derived column count (3/4/6 at 1280/1800/2300), the one-line Pin button (overlap 13.0), the
filtered count, the ghost pair (97.72 = 97.72), edit-in-slot with a painted recolour
(`rgb(245,226,218)`), and the Phase 4 end-to-end (convert → badge → one visible To-do row →
detach). `migrateNotetasks.mjs` re-run against the live data confirms **0 projection documents**
remain. §8's first item is thereby done; the other two remain.
