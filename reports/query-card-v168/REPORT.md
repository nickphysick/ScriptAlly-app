# Query card v168 — one way to edit

Branch `query-card-v168` @ (this commit), pushed; cut from what dev served at the start
(`dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3` @ 89df401ee, `index-BoV5x3Ge.js`).
NOT merged to main. Ref: `design-refs/query-card-v168/query-card-v168.html` (SHA256 ffb6ebdb…8f5a, matched, enrolled).

## False premises

- **The brief's Step 0.3 list says `EdMenu`/`MenuItem` retire with the layer, and also "no new menu".** Both can't hold:
  the band's ⋯, the move list and a note's ⋯ need a menu, and the only one the card had was the edit layer's. It is
  kept, renamed `CardMenu`/`CardMenuItem` (in `QcEdit168.tsx`), and is the card's one small menu.
- **"Design rules (settled)" in CLAUDE.md** — that section no longer exists by that name (the 11 Nov diet). The rules the
  brief lists (12px floor, `--sp-anthracite`, `--sp-rust`, no new uppercase mono label) were applied as stated.
- **v165 and v166 are not on any line** (no `QcProfile165/166`, no qc165/qc166 measures). Their baselines don't exist.
- **Dev moved during the work**: at deploy it served `…-pc3-laq22` (Log a query v2.2, `index-B8eJzEuU.js`, rebuilt
  identical). v168 was merged onto it (one conflict, below), not deployed over it.

## Step 0 findings

- 0.1 Dev served `index-BoV5x3Ge.js` = `…-mg1-pc3` @ 89df401ee. Branch cut there.
- 0.2 v167 present (`QcProfile167.tsx`, `QcGhost167.tsx`). v165/v166 absent.
- 0.3 The edit layer: `QcCardEdit152.tsx` (useEditLayer, EditStrip, SaveBar, LeaveAsk, Ed + double-click, Inl, EdMenu,
  MenuItem, NotesEditPane, draft sums), `qcv152inplace.css`, `data-editing`, the track-note line, the Notes tab dot, the
  band pencil (`data-qc152="pencil"` → `ed.start()` or `onPencil`). Only `QcCard152` used them. The agent card uses
  `NotesTab158` (not the layer) and its own section editing (`data-editing` on its sections, untouched). The To-do
  desk's card (`WsPreview`) passes no-op edit props; the phone card (`QcQueryCard149` phone layout) is untouched.
  `view="details"`: no caller sets it.
- 0.4 Step editor: `QcStepEdit1522`; `onEditStep152` clears the composer, its draft and the toast. Save
  (`planStepEdit`) and delete (`planFix`) both commit one plan and return a snapshot: **both already undo exactly**.
- 0.5 Materials: `onAddSent`/`onEditWent`/`onAddTo` all went through `openStep` (jump to Tracking). The step editor's
  own save (`planStepEdit` with `{ id, kind, dayMs, materials }`) takes the step's date as given, so a materials-only
  save passes the step's stored `ms` unchanged. Gate passed.
- 0.6 Notes: the layer's notes path used `updateJournalEntry(id, text)` (writes `entryText` only) and
  `deleteJournalEntry(id)`. The agent's words (`replyNote`) are saved by `planStepEdit`'s words argument. Gate passed.
- 0.7 Move: `planDetails1522(q, { agentId })` sets `agentId` only; committed through `commitPlan` → snapshot. Writing
  the old agent back reverses it fully; the snapshot restore is exact.
- 0.8 Delete: `deleteQuery`; doors were `askDeleteQuery` (shared confirm, "This can't be undone", no Undo), the footer's
  `deleteQueryWithUndo`, and the phone's edit sheet. The slide-in card had none.
- 0.9 The card's toast (`qc1522-toast`): every `done1522` save and the profile save offer Undo (snapshot restore /
  the agent card's undo); the layer's "Changes saved" offered none.
- 0.10 Older locks on the pencil, layer, Edit pill, Materials foot links, notes hover row: listed and re-pointed in
  `tests/e2e/RETIRED-query-card-v168.md`.

## Per phase (one commit each)

| Phase | Commit | Files |
|---|---|---|
| 0 Ref in | 60af7ed2c | design-refs/query-card-v168/*, .refhashes.json |
| 1 Shared parts | 53329a5ff | QcEdit168.tsx, qcv168.css |
| 2 Tracking | 56987ce2c | QcCard152, QcStepEdit1522, Queries.tsx, card CSS, sidePanel.css, qcv160.test |
| 3 Materials | f7506ef19 | QcMaterials158, QcCard152, Queries.tsx, qcMaterials158.test |
| 4 Notes | f32e03555 | QcNotes158, QcQueryCard149, Queries.tsx, qcv158.css, acv2.css, qcNotes158.test |
| 5 The band | d707430fc | QcCard152, QcQueryCard149, Queries.tsx |
| 6 Profile drawers | 83bb7f3b6 | QcProfile167, QcAgent158, qcv167.css |
| 7 Why-tips | 96fe70008 | QcCard152, QcAgent158 |
| 8 Retire | bc1708dbe | deletes QcCardEdit152.tsx, qcv152inplace.css, its test, laqEdit.measure.ts; re-points |
| 9 Measure | 17691f400 | qc168.measure.ts, seedQc168.mjs, ledgers, frames; two fixes (below) |
| re-point | c7a387c62 | qc167.measure.ts QC167-13 |

Fixes the measure found (Phase 9): L9's "allow two" hook was in the wrong branch (stayed green under it); and
**Escape with a ⋯ menu open closed the whole card** (the menu listened on `document`, the Escape stack on `window`
capture) — `CardMenu` now sits on the one cascade at `ESC_LEVEL.cardPopup`; L1 and L14 assert it.

## Locks — red under its own mutation, then green

`tests/e2e/qc168.measure.ts`; ledgers `reports/query-card-v168/ledger/{mutant,after}-L*.json`.

| Lock | Mutation (alone) | Red reading | Green |
|---|---|---|---|
| L1 | restore the pencil | "no pencil on the band: 1" | ✓ |
| L2 | pencil static on hover | thread 358 → 384px tall | ✓ |
| L3 | tick always enabled | tick enabled before a change | ✓ |
| L4 | Undo reopens clean | words back to the stored ones | ✓ |
| L5 | tab clicks through | tab became Materials, no ask | ✓ |
| L6 | route through openStep | no "Saved what went"; tab left | ✓ |
| L7 | hover row restored | note 66 → 94px on hover | ✓ |
| L8 | skip the write | read back unchanged | ✓ |
| L9 | allow two | two notes open | ✓ |
| L10 | Cancel without asking | no ask in the drawer | ✓ |
| L11 | write nothing | no "Moved to Bram Lark" | ✓ |
| L12 | open no confirm | no confirm dialog | ✓ |
| L13 | re-load a retired sheet | 2 retired rules loaded | ✓ |
| L14 | drop the note's key handler | Ctrl+Enter saved nothing | ✓ |

Final run on the branch: 14/14 green (+ frames). On the merged dev line: qc168 14/14 and laqV22 all green (20 passed).

## Baseline before and after (each spec on the base worktree, then on the branch)

| Spec | Before (red) | After (red) |
|---|---|---|
| tsc | clean (needs `--max-old-space-size=8192`; default heap OOMs) | clean |
| Vitest | all green once `functions/node_modules` is linked (13,298) | 13,298 green; 13,315 on the merged line |
| qc158 | QC158-1/15 ×2 | same two |
| qc160 | QC160-9, QC160-7/8 | none (both passed: timing-flaky) |
| qc161 | QC161-9/10, -11, -12 | same three |
| qc163 | QC163-W (WebKit) | same |
| qc164 | QC164-1/2/3/8/9 | same |
| qc167 | none | none (QC167-13 re-pointed: Cancel with a change now asks) |

## Retired, and older locks re-pointed

All in `tests/e2e/RETIRED-query-card-v168.md`, each with why: the edit layer and its sheet, the band pencil, the Edit
pill, the Materials foot links, the notes hover row on both cards, the tile's glyph, `view="details"`, `onPencil`, the
page's `editData`/`onSaveEdits`/`detailsOf` (v167 report item 2). Re-pointed: qcv160.test, qcMaterials158.test,
qcNotes158.test, qcv158.test, qc1612, qc152 (lean), qc1522 L12, qc1611, acv2 AC2-9, qc158, qc1581, qc167 L13.
Retired whole: laqEdit.measure.ts (+ laqEditDb.mjs). qc152/qc1521/qc152Shots blocks that reach v152's fork were
already stale and are recorded, not re-pointed.

## Frames

`reports/query-card-v168/frames/` — Chromium (13) and WebKit (9) at 1512: reading, hover on a bubble / group / note,
a step open, the question in a step, a group open, a note's ⋯ menu, a note open, the Last heard tip, the band's ⋯,
the move list, "Changes discarded". WebKit frames are pressed with DOM clicks and have no hover frames: desktop WebKit
refuses Playwright's pointer actions in this harness (as pc3 found).

## Dev

`dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3-laq22-qc168` @ 93fb01e24 (pushed) =
the served laq22 line (`index-B8eJzEuU.js`, rebuilt identical) + this branch. Deployed hosting only, from a clean
checkout of the pushed tip, with the served-hash guard in the command. Dev now serves **`index-CrH8OKjv.js`**; its
`AppRoot-BL3_i0KD.js` chunk, fetched from scriptally-dev.web.app, contains "Changes discarded", "Saved what went",
"Discard your changes?", "Move to another agent", "A query stays with its book", and none of "Stop editing",
"Click anything underlined", "Steps are edited one at a time".

Merge conflict (one): `QcNotes158.tsx` — Log a query v2.2 had lifted `NoteArticle`/`NoteCompose` out of the tab for its
review. Kept v168's tab body and v2.2's two parts unchanged; the tab's writing box is now `NoteCompose` (one writing
box). `qcLogStages.css` states the flex and 14px gap its always-shown action row used to inherit from the retired
`.qc152 .nx-acts` rule, so the review looks as before.

## For Nick to rule

1. **Saves with no Undo, and why**
   - *Delete this query* — the existing confirm says "This can't be undone"; kept unchanged as the brief says.
   - *Delete this note* (query card) — the journal has no restore that keeps a note's id and date; re-adding would be a
     new note. Asked once in the note instead. (The agent card keeps its own Undo for its notes.)
   - *The cross on the agent card's notes* discards with no "Changes discarded" toast: the agent card has no hook for
     the card's toast yet (the parts are exported for it to take next).
   - Everything else that saves offers Undo that puts it back exactly: a step ("Saved that step"), a group ("Saved what
     went"), a note's words ("Saved that note" — the edit writes only `entryText`), the agent's words
     ("Saved {first}'s words"), Move ("Moved to {name}"), the profile drawers (v167).
2. **The To-do desk's card did not take the new editing.** It is a read-only preview (no-op handlers); it now draws no
   pencils and no ⋯ at all (a card without footer actions is treated as a preview).
3. **Decisions I made**
   - `CardMenu` is the kept edit-layer menu (see false premises).
   - A step open in place no longer folds the book and tabs (it was `data-j`); the card still stands straight (lean
     flat) while anything is open, as the step editor did before.
   - Tiles: the pencil sits inside the tile's corner (8px), not at −10px — the tile clips at its 86px. A tile with a
     value is no longer a `role=button` itself: its pencil is the keyboard's way in; a click anywhere still opens it.
   - The group editor's items are MatChips' own chips (mono caps labels, as they stand) — the brief's deviation 8; the
     ref's row-with-× look is not reproduced.
   - A pending group (a request not yet answered) and an undated step's group take no pencil: there is no sent step
     with a date to save through.
   - Notes outside a card that holds the rule (the agent card) hold their own one-open rule.
4. **Housekeeping**: worktrees `ScriptAlly-qc168-base` and the scratch `devint` are removed; `ScriptAlly-qc168` is
   removed after this push.
