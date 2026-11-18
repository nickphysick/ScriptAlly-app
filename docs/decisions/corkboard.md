# Corkboard — decisions

⚠️ **This file was created on the dev line (branch `corkboard-v15`, 18 Nov 2026).** `main` has its own
`docs/decisions/corkboard.md` (the earlier rounds, moved out of CLAUDE.md on 11 Nov). When this branch merges, put the
v15 section below at the top of main's file and keep main's sections beneath it, newest first.

## Current state (Corkboard v15, 18 Nov 2026)

- **Route** `/todo/corkboard`, page `src/components/todo/TodoNoteboardPage.tsx`. Ref: `design-refs/corkboard-v15/`
  (html sha256 `1ac9fb0d…11fe2`, 23 screens; all enrolled in `design-refs/.refhashes.json`).
- **Two pages in one file, split at 768px** (`useCbWide`). From 768px up: the shared navy header (`CbNavyHeader`) with
  v15's right-hand block, then `corkboard/Cb15Desk.tsx` and the pop-ups in `corkboard/Cb15Dialogs.tsx`, styled by
  `corkboard/corkboard15.css` under `.cb15` / `.cb15-layer`. Below 768px: the phone keeps v2's panel (`CbHeader`),
  `CbToolRow`, `CbWall`, `CbPiles`, `CbMenu`, `CbNoteDialog`, `CbTaskDialogs`, `CbStartPile`, `CbEmpty` and
  `corkboard.css` — its layout unchanged; only its words changed (Piles → Stacks).
- **Every figure the desktop states is `lib/corkboard`'s**: `figures` / `figureRows` / `inFigure`, `wallSections`
  (on `sortBoard`), `columnCount` + `dealColumns`, `aboutRows` / `aboutOf`, `quietBoard`, `DAY_ONE_EXAMPLES`,
  `sectionLine`, `findPieces`, `addedWhen`. The locks (`tests/e2e/corkboardV15.measure.ts`) call the same functions.
- **Data unchanged.** Notes are `UserTask`s; a dated note keeps its paper and is on the to-do list; a stack is a note's
  first tag (`pileOf` / `tagsForPile`); started-but-empty stacks are `todoPrefs.noteboard.started`; the view, sort and
  order are `todoPrefs.noteboard.{view,sort,order}`. The stored view value is still `piles`; internal names say pile.

## Decisions (v15)

- **Stacks, not Piles, in every word a writer reads** (desktop and phone). Identifiers, `data-cb2` probes, the stored
  value and comments keep "pile".
- **The header's right-hand block** is up to three figures — linked to agents, on your to-do list, pinned to top. A
  figure at zero is not shown. **Linked means an agent or a query, never a manuscript** (v2's `glance` counted
  manuscripts too, and still does for the phone's panel). Each figure is a filter; pressing it again clears it. No
  figure above zero → "Pick a colour"; an empty board → "Pick a colour to start" (v1 headers showed no right block on
  an empty board; v15 does).
- **Filtering hides on the desktop** (find, a tag, a figure, an agent): v2 faded non-matches to 22%; the ref hides.
- **The wall is dealt, not flowed**: columns from the wall's own width (4 from 1240px, 3 from 900, 2 from 580), note
  i in column i mod n, so it still reads left to right while notes keep the height of their words (min 196px).
- **Pinned is always first**, in its own section, in every order; a drag never crosses the pinned line.
- **Every write answers through `useTodoToast` with Undo, never a confirm** — including Remove (v2 asked first). Undo
  of colour, save and remove writes the captured document back (`noteReceipt` → `restoreUserTask`); order and sort
  are written together and put back together.
- **Status is the real `StatusDot` plus its word**: on a link chip for a query; on an agent card, that agent's query
  on the active manuscript (`resolveScopedManuscript` over `scriptally_active_manuscript_id`), else no status line.
- **Add a task is still the To-do list's own `AddTask`**, hosted in the v15 pop-up shell (its own heading hidden); the
  write is unchanged. The ref's sub-line "…and stays on your board as a note" is not true here (an added task has no
  paper, so `sortNotes` keeps it off the board), so the pop-up says only "It goes on your to-do list."
- **Turn into a task offers the ref's three** (This week / Next week / Later, each by its Sunday). v2's "Pick a date"
  is not on the desktop.
- **Start a stack is a name and suggestions** (`PILE_SUGGESTIONS`); v2.1's "put notes in it" picker and "Add notes to
  this stack" are the phone's only. "Remove stack" for an empty started stack is the phone's only.
- **Targets**: every desktop control is at least 32px tall. Two ref values were raised to meet it: Read all (28 → 32)
  and the link chip (30 → 32).
- **The tool row sticks at the collapsed bar's foot**, read off the bar (`--cb15-stick` = its sticky top + height),
  never a constant.
- **Shortcuts**: N new note (`corkboardNew`), "/" Find a note (`corkboardFind`), both through the registry and its
  guard; Escape in the find field clears it.
- **The header drawing** stays the "Art to come" slot (`corkboard-header`) until delivered.
