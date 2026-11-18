# Corkboard v15 — report (18 Nov 2026)

The Corkboard's desktop page (768px and up) rebuilt to the Responses v15 standard from
`design-refs/corkboard-v15/corkboard-v15.html`, and every user-facing "pile" now says "stack", desktop and phone.
Branch `corkboard-v15`, cut from the tip dev serves. Not merged to main; prod untouched.

## 1. False premises, named first

1. **"The pack unzips at the repo root into design-refs/corkboard-v15/"** — it was not in the repo; it was
   `~/Downloads/corkboard-v15-pack.zip`. Unzipped to a scratch folder, every file verified against `SHA256SUMS` and
   the html against `1ac9fb0d…11fe2` (all match), then committed (Phase 1). Not a red gate: the ref was present.
2. **"Add a task … It goes on your to-do list, and stays on your board as a note"** (the ref's sub-line) is false in
   this app: a task added there has no paper, and `sortNotes` keeps an unpapered dated task off the board. The
   pop-up says only "It goes on your to-do list." (CLAUDE.md: copy asserts only what the code does.)
3. **"Every control at least 32px tall"** and **"port the ref's values"** conflict in two places: the ref's Read all
   is 28px and its link chip 30px. Decision 13 won: both are 32px (commit `eb24271f8`).
4. **"docs/decisions/corkboard.md" exists** — on `main`, yes; not on this dev line (whose docs/decisions has four
   files). Created here with a merge note at its top: on merging, put the v15 section atop main's file.
5. **"Use WorkspaceNavyHeader through its props only"** — done, but its right slot is capped at 440px by the shell's
   sheet (`.wsnh-rc`); three 150px figures need more. The page's own sheet widens it under `.cb15` (560px, one
   column); nothing under `src/components/shell/` was edited. The shell also hides the right block below 1100px
   (`@media (max-width: 1100px)`), so the figures are not shown between 768 and 1100px — as built for every page.
6. **The shortcut guard can be blocked by another page.** On the dev line a Dashboard dialog (`.d105-how`) can leave
   `aria-modal="true"` in the DOM at full size while not on screen, and `modalOpen()` then stands every plain-key
   shortcut down — N and "/" included. Seen in the browser pane after visiting /dashboard; the known trap fixed on
   the unmerged `shortcut-guard-v1`. Not this page's; lock C14 reads the guard first and names any stale modal.
7. **Baseline tsc's 7 errors were the worktree's**, not the code's: a fresh worktree has no `functions/node_modules`.
   Linking the primary's (needed for the emulator's login step) makes tsc 0. Baseline Vitest had the same cause for
   10 of its 12 failing files.

## 2. Base, branch, commits

- **Base:** `dev/smv31-vv6-cp32` @ `345ccfed1` — dev serves `index-C_PGqmGZ.js`, which the comps-v32 report names as
  that tip's build; it contains `dev/smv31-vv6-rsp15` (checked with `merge-base --is-ancestor`), so it is the
  later of the two 18 Nov lines.
- **Branch:** `corkboard-v15`, worktree `/Users/nickphysick/ScriptAlly-cb15`.

| Phase | Commit | What |
|---|---|---|
| 1 | `4ae91027f` | the ref, its 23 screens, enrolled in `.refhashes.json` |
| 2 | `f109d5440` | Piles → Stacks in every user-facing string (the v2 components, now the phone's) |
| 3 | `6adffa46f` | the pure layer in `lib/corkboard` + `corkboardV15.test.ts` |
| 4–8 | `5beb3abd1` | header, board, Stacks, who-it's-about, day one, pop-ups — **combined**: the header's figure filters, the desk and the pop-ups share one page state, so they cannot build apart |
| 9 fix | `eb24271f8` | 32px targets (Read all, link chip, find input) |
| 9 fix | `ac069e784` | a drag knows its note from the first dragover (C7 / C8 found it) |
| 9 fix | `3a08487fb` | the figures never squeeze the title at 1280 (the shots found it; C1 now holds it) |
| 9 | `2c842ed4a` | locks, shots, ledgers, retirements, decisions |
| report | _(this commit)_ | this file |

## 3. Baseline against final

| Gate | Baseline (base `345ccfed1`, before any edit) | Final (`3a08487fb` / `2c842ed4a`) |
|---|---|---|
| tsc | 7 errors, all `functions/` "cannot find module" (no `functions/node_modules` in a fresh worktree) | **0** (the primary's `functions/node_modules` linked; 0 under `src/`) |
| vite build | clean | clean (and `build:dev` clean on the deployed merge) |
| Vitest | 12 failed files, 4 failed tests, 12,539 passed | **1 failed file, 2 failed tests**, 12,723 passed |
| — the reds | 8 `functions/` files (missing modules), `aiRefusal`, `queryClock`, `emuGuard` (offender: `tests/e2e/cb21Emu.sh`, the Corkboard's own), `firestoreTarget` ×2 | `firestoreTarget` ×2 only — the same 23 offending scripts as the baseline, none of them this branch's |
| v15 measure suite | — (did not exist; red-before below) | **13 / 13 green**, 131 readings, all ok |
| kept v2 locks | — | CB12 (phone 390) and CB14 (rules) green; CB1, CB3–CB11 skipped with their successor named |

The merged dev tree (`dev/smv31-vv6-cp32-lqmf1-cb15`) was gated again before the deploy: tsc 0, Vitest todo + corkboard
+ shortcuts + src/test 75 files green and the same two `firestoreTarget` baseline reds, `build:dev` clean.

## 4. What survived from v2 / v2.1, component by component

| Piece | Desktop (≥768px) | Phone (<768px) |
|---|---|---|
| `TodoNoteboardPage.tsx` | kept; the writes, prefs and store wiring are v2's, plus v15's writes; renders `Cb15Desk` | kept |
| `CbHeader.tsx` · `CbNavyHeader` | **rewritten right block** (figures / Pick a colour); title, for-line, buttons, bar unchanged | `CbHeader` (the panel) unchanged |
| `CbToolRow`, `CbWall`, `CbPostIt`, `CbPiles`, `CbMenu` | not used (replaced by `Cb15Desk`) | kept; words only |
| `CbNoteDialog`, `CbTaskDialogs` (`CbTurnTask`, `CbAddTask`), `CbStartPile` | not used (replaced by `Cb15Dialogs`) | kept; words only |
| `CbEmpty` + `noteboardExamples.ts` | not used (day one is `DAY_ONE_EXAMPLES`) | kept (the phone's empty page still shows the four from `NOTE_EXAMPLES`; `noteboardExamples.test.ts` still reads them) |
| `corkboard.css` | only `.cb2-hsw` (the header swatches' base class) | kept |
| `lib/corkboard.ts` | everything kept; v15 functions added | `glance` / `glanceRows` / `boardSentence` stay the phone's |
| `lib/noteboard.ts` (store, writes, papers) | unchanged | unchanged |
| `useTodoToast` | every write's feedback + Undo | unchanged |
| AddTask (To-do list) | hosted in the v15 shell, unchanged | v2's host |

New: `corkboard/Cb15Desk.tsx`, `corkboard/Cb15Dialogs.tsx`, `corkboard/corkboard15.css`.
Retired locks: `tests/e2e/RETIRED-corkboard-v2-1.md` (every v2 and v2.1 lock, kept / re-pointed / retired, and why).

## 5. Locks: red-before and green-after, with populations

**Red-before** (`reports/corkboard-v15/red-before.txt`): the suite run against the base build — `345ccfed1` with only
the v15 locks, their helpers, the seeder and `lib/corkboard`'s pure layer copied in (the page is v2's), run
unserialised so every case ran. **All 13 red.** Honestly, the red is the coarse kind: each case first waits for the
v15 desk, which the base does not have, so each failed on its subject being absent ("a lock that finds no subject has
failed"). That proves no case passes vacuously; it does not separately prove each assertion against a near-miss. Two
assertions did get a real red on the way, from this branch's own bugs: **C7 / C8** (a fast drag dropped nothing until
`ac069e784`) and **C1's "title and buttons hold"** (the 1280 header wrapped until `3a08487fb`; the wrap is in the shot
taken before the fix).

**Green-after** (`reports/corkboard-v15/green-after.txt`, ledgers in `reports/corkboard-v15/ledger/`):

| Case | Holds | Readings | Population |
|---|---|---|---|
| C1 | the three figures = `figureRows(figures(docs))`; each filters to exactly `inFigure` notes, pressed, chip shown; pressing again clears; linked = agent + query only; the title one line and both buttons on one row (1512, 1280) | 19 | 14 notes, 3 figures (7 / 2 / 2) |
| C2 | no figure at zero; "Pick a colour" + 5 papers with none; "Pick a colour to start" + 5 on an empty board | 6 | few 3, none 0 |
| C3 | Pinned to top = exactly the pinned notes, above the rest, in all four orders | 5 | 2 pinned |
| C4 | columns = `columnCount(wall width)`; note i in column i mod n, row i div n; min-height 196 | 15 | 12 notes; 4 cols at 1717 / 1512, 3 at 1280, 2 at 1000 |
| C5 | only the long note shows Read all; it opens "Your note"; Special Elite | 6 | 14 notes, 1 cut |
| C6 | 4 labelled 32px actions on every note; hover reveals; pin, colour, turn into a task (this Sunday), take off, Move to front (order + My order), Move to stack (first tag), Remove (no confirm), Edit — each with its toast and its Undo restoring the document | 18 | 14 notes |
| C7 / C8 | a drag writes My order, the note before its target, the wall follows, Order says My order; a pinned note cannot cross; a drop on #comps gives `[comps, to-check]` and Undo puts `[agents, to-check]` back | 6 | — |
| C9 | stacks A to Z then Loose notes with counts; empty started stack dashed; + Start a stack; an open stack shows its notes, 5 other stacks, All stacks; an empty one says "Nothing in this stack yet" | 11 | 7 stacks |
| C10 | one card per agent = `aboutRows`; five squares; Clara's status "Partial Requested" (her query on Murphy's Day Out); picking filters to her 2 notes with the chip; again clears | 6 | 6 agents |
| C11 / C12 | day one is exactly the three, tagged Example; Keep this writes a blush note, Undo deletes it; quiet board shows What you can do and no about; everyday the reverse | 8 | — |
| C13 / C14 | the pop-up starts on the paper, Tab ×24 and Shift+Tab ×8 stay in, Escape closes and focus returns to + New note; N opens a new note; "/" focuses Find; both stand down in the field; Escape clears the find | 9 | — |
| C15–C18 | no "pile" in the desktop (board, More, Start a stack, Stacks, an open stack) or the phone (board, Stacks); no sideways overflow at 1280 / 1512 / 1717 with 14 and 60 notes; No notes match + Show all notes; matches marked; every desk control ≥32px tall and ≥24 wide; the focus ring and actions on keyboard focus | 13 | 14 and 60 notes |
| C19 / C20 | every note paints its paper; the old yellow / pink / sage read butter / blush / powder and stay stored old; no task write on load; the view and the order survive a reload | 9 | 17 notes |

⚠️ C14 found the Dashboard's `.d105-how` with a full-size `aria-modal="true"` on every run and neutralised only that
element before pressing N and "/" (false premise 6). Any other stale modal fails the lock.

## 6. Screenshots (`reports/corkboard-v15/shots/`, each at `-1280` and `-1512`)

| State | Shot | Ref screen |
|---|---|---|
| everyday | `01-everyday`, `19-everyday-wall` | `01-everyday-top-1512@2x`, `19-everyday-full-page-1280/1512` |
| a note's hover actions | `02-hover-actions` | `02-note-hover-actions-1512@2x` |
| the More menu | `03-more-menu` | `03-more-menu-1512@2x` |
| Change colour | `04-change-colour` | `04-change-colour-1512@2x` |
| Turn into a task | `05-turn-into-a-task` | `05-turn-into-a-task-1512@2x` |
| Add a task | `06-add-a-task` | `06-add-a-task-1512@2x` |
| New note, link finder | `07-new-note-link-finder` | `07-new-note-link-finder-1512@2x` |
| Your note | `09-your-note-edit` | `09-your-note-edit-1512@2x` |
| a figure filter | `10-figure-filter-to-do` | `10-figure-filter-to-do-1512@2x` |
| who it's about / one agent's notes | `11a-who-your-notes-are-about`, `11-about-one-agent` | `11-about-one-agent-1512@2x` |
| find / no match | `12-find`, `13-no-notes-match` | `12-find-1512@2x`, `13-no-notes-match-1512@2x` |
| Start a stack | `14-start-a-stack` | `14-start-a-stack-1512@2x` |
| Stacks / an open stack / an empty stack | `15-stacks`, `16-stack-open`, `16b-empty-stack` | `15-stacks-1512@2x`, `16-stack-open-1512@2x` |
| just started | `17-just-started`, `17b-just-started-how` | `17-just-started-1512@2x` |
| day one | `18-day-one` | `18-day-one-1512@2x`, `20-day-one-full-page-*` |
| 60 notes | `20-sixty-notes`, `20b-sixty-notes-wall` | — |

The page scrolls inside the workspace, so shots are of the viewport, scrolled to the part in question.

## 7. In the ref but not built, or built differently

1. **The shell** (rail, top bar, tabs, the "Design mock" bar, the sheet's pattern) — illustration; the app's shell
   stays (decision 6). The header's place, height and the gap beneath it are the app's (wsHeaders), not the ref's.
2. **Status marks** are the real `StatusDot` plus its word, in one ink; the ref's SVGs are not ported (decision 7). So
   a link chip says e.g. "Partial Requested" beside the mark, which the ref's chip leaves to a tooltip; the agent
   card's status is the agent's query on the active manuscript, or no line (the ref shows "Not queried yet").
3. **Add a task's sub-line** cut to "It goes on your to-do list." (false premise 2); the form is the To-do list's own
   `AddTask` inside the v15 shell (its own "A new task" heading hidden), not the ref's one-field form (decision 4).
4. **Turn into a task** offers the ref's three; v2's "Pick a date" is not on the desktop.
5. **Start a stack** is a name and suggestions only; the ref has no clash line, so none here (the phone keeps
   v2.1's).
6. **Read all and the link chip are 32px**, not 28 / 30 (false premise 3).
7. **The figures sit tighter below 1440px** than the ref's 150px minimum, so the title holds one line at 1280 (the
   ref's own 1280 screen shows them tighter too). Between 768 and 1100px the shell hides the right block entirely.
8. **The tool row sticks at the collapsed bar's foot**, not the ref's `top: 48px` (the ref's palette bar).
9. **"1 of 14 note"** — the ref's own words for one filtered note ("…note" when the count is one); kept word for word.
10. **Filtering hides** non-matching notes (the ref), where v2 faded them.
11. **The example agent in "Say who it's about"** (Clara Beaumont, Partial Requested) is the ref's illustration, drawn
    with the real StatusDot.

## 8. Open items that need a ruling (each owned by nobody until ruled)

1. **The Dashboard's stale `aria-modal`** (`.d105-how`) stands every plain-key shortcut down app-wide on this dev
   line — N and "/" here included. The fix exists on the unmerged `shortcut-guard-v1`. Ruling: merge it onto the dev
   line, or fix the Dashboard dialog.
2. **Add a task's field-for-field lock** (v2's CB9 half) is not re-run on the desktop: the write is the unchanged
   `AddTask` → `saveTask`, but nothing measures it in the v15 shell.
3. **Start a stack with a note** (More → New stack… → "Start stack and move note") is built and was exercised by
   hand, not locked.
4. **Remove stack and Add notes to this stack** exist only on the phone; an empty started stack cannot be removed
   on the desktop.
5. **"Pick a date"** for Turn into a task — keep it off the desktop (the ref), or add it back?
6. **The figures between 768 and 1100px** are hidden by the shell's sheet; should the Corkboard show them there?
7. **The phone's empty page** still shows v2's four `NOTE_EXAMPLES`, not v15's three (decision 12 kept the phone's
   layout).
8. **`docs/decisions/corkboard.md`** must be merged by hand into main's file when this line merges (the file says how).
9. **The header drawing** is still the "Art to come" slot (decision 14).
10. **v2.1's mutation tools** (`cb2Mutate.mjs`, `cb21Mutate.mjs`) were deleted with the desktop locks they broke; the
    kept CB12 / CB14 no longer have a mutation runner.

## 9. The dev deploy; main and prod

- Dev was serving `index-i8hg4u51.js` by deploy time, not the base's `index-C_PGqmGZ.js`: another session had deployed
  `dev/smv31-vv6-cp32-lqmf1` (Log a query materials fork v1). Proven by building that branch's pushed tip clean:
  `index-i8hg4u51.js`. Its diff shares no file with this branch.
- So this deploy stacks: **`dev/smv31-vv6-cp32-lqmf1-cb15`** @ `b9226fc5e` = that line + `corkboard-v15`, pushed; built
  from a clean checkout of the pushed tip (`build:dev`, design refs checked); hosting only, `--config firebase.dev.json
  --project scriptally-dev`.
- **Dev now serves `index-sl2zR2So.js`**, which matches the build (checked after the deploy).
- **main untouched** (`7fd445aa5`, local and origin). **Prod untouched**: no prod command was run. No rules or
  functions were deployed anywhere. No API money spent (no Smart Import, no model calls).
