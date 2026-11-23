# Retired by Query card v168 — one way to edit

The slide-in query card (desktop) now has one way to edit: the pencil on the thing (`QcEdit168` `EditPen`), the cross
and the tick where the pencil was (`CrossTick`), one thing open at a time, the card's own toast with Undo. The
whole-card edit mode is gone. Locks: `tests/e2e/qc168.measure.ts` (L1–L14).

## Retired parts

| Part | Where it was | What replaced it |
|---|---|---|
| The band's pencil (`data-qc152="pencil"`, `ed.start`, `onPencil`) | `QcCard152.tsx` band | The band's ⋯ (`data-qc168="band-more"`): Move to another agent · Delete this query |
| `useEditLayer` and its draft sums (`draftOf`, `changedKeys`, `editsOf`, `changeWords`, `ED_LABEL`, `EdKey`) | `QcCardEdit152.tsx` (deleted) | Each thing's own editor holding the card's one-open rule (`useEditRule168`, `useHold168`) |
| `EditStrip` ("Editing", "Stop editing") | `QcCardEdit152.tsx` | Nothing: the band never changes while something is open |
| `SaveBar` ("N unsaved changes", Save changes) | `QcCardEdit152.tsx` | `CrossTick` in the open thing's heading row; the tick saves that one thing |
| `LeaveAsk` ("Stop editing and lose N changes?") | `QcCardEdit152.tsx` | `DiscardAsk` ("Discard your changes?"), inside what is open |
| The step editor's "Discard what you've entered?" strip | `QcStepEdit1522.tsx` | `DiscardAsk` |
| The step editor's ✕, Cancel and Save | `QcStepEdit1522.tsx` | `CrossTick` |
| `Ed` (the dotted-underline value) and its double-click into edit mode | `QcCardEdit152.tsx` | The pencil on the thing |
| `Inl` (the dashed-rule text value) | `QcCardEdit152.tsx` | A note's words typed in place in its own editor |
| `NotesEditPane` (every note on a dashed line, Delete on hover, "+ Add a note") | `QcCardEdit152.tsx` | Each note opens in place; "Delete this note" inside it; the writing box adds |
| `EdMenu` / `MenuItem` | `QcCardEdit152.tsx` | KEPT as the card's one small menu, renamed `CardMenu` / `CardMenuItem` in `QcEdit168.tsx` (the brief forbids a new menu) |
| `METHODS` (the step's How choices) | `QcCardEdit152.tsx` | Moved unchanged to `QcStepEdit1522.tsx` as `STEP_METHODS` |
| `AgentDetails`, `CardEditData`, `CardEdits` (the edit layer's), `EditAgent`, `EditNote` | `QcCardEdit152.tsx` | Nothing: the agent's details are edited in v167's profile drawers |
| `qcv152inplace.css` | deleted | The rules still drawn (the menu, the step editor's How/Package rows, `.qc152-in` relative) moved to `qcv168.css` |
| `data-editing` on the query card | `QcCard152.tsx` root | `data-qc168-open` (what is open) |
| "Steps are edited one at a time: hover a message for ✎ Edit" | `QcCard152.tsx` Tracking | Nothing |
| The Notes tab's unsaved-changes dot (`data-qc152="tab-dot"`) | `QcCard152.tsx` tabs | Nothing: one thing open at a time, asked inside it |
| `view="details"` (and `CardMode` "details") | `QcCard152.tsx`, `QcQueryCard149.tsx` | Nothing reached it (no caller sets the mode) |
| `onPencil` / `onPencil152` | `QcCard152.tsx`, `QcQueryCard149.tsx`, `WsPreview.tsx` | Nothing |
| The page's `card1522.editData`, `card1522.onSaveEdits`, `detailsOf` (v167 report, item 2: the agent details the edit layer still carried, and Save's step 2) | `Queries.tsx` | Nothing: v167's drawers save the agent's profile |
| The "✎ Edit" pill beside a bubble (`.qc152-fx`, `data-qc152="edit-step"`) and its 96px hover bridge | `QcCard152.tsx`, `qcv152card.css`, `qcv1522card.css` | `EditPen` on the bubble's corner |
| The Materials tab's "+ Add something you sent" and "Edit what went" (`onAddSent`, `onEditWent`) | `QcMaterials158.tsx` | Each group's own pencil, editing in the tab |
| The notes' hover row of actions (`.nx-acts` and its max-height rule) on both cards | `QcNotes158.tsx`, `qcv158.css`, `acv2.css` | The note's pencil and ⋯ disc (absolutely placed: nothing moves) |
| The tile's aria-hidden pencil glyph (`.qc167-pn`) | `QcAgent158.tsx`, `qcv167.css` | `EditPen` |

Unit test deleted with its subject: `src/components/queries/centre/qcCardEdit152.test.ts` (it tested `draftOf`,
`changedKeys`, `editsOf`, `changeWords` only).

## Older locks re-pointed, with why

| Lock | Was | Now | Why |
|---|---|---|---|
| `qcv160.test.ts` v161.2 "stops it at the press" | `breatheClose(...); p.stepCard!.go(±1)` | the same inside `g168(() => …)` | ‹ › go through the one-open rule; the breath still stops at the press, before the host's swap |
| `qcMaterials158.test.tsx` QC158-8 | the two foot links | no foot links; a pencil per sent group with items | the tab edits each group itself |
| `qcNotes158.test.tsx` QC158-10, QC158-12 | the hover row's `data-act` buttons | the ⋯ disc drawn; its items from `menuItems168` | the actions sit behind ⋯ so nothing moves on hover |
| `qcNotes158.test.tsx` QC158-12 (page block) | slice to `mode={qcCardMode}` | slice to `onEditNote=` | the note's own edit and delete are the journal's writes, by design now |
| `qcv158.test.ts` the card's CSS set | read `qcv152inplace.css` | read `qcv168.css` | the file is deleted; its kept rules live in `qcv168.css` |
| `qc1612.measure.ts` QC1612 edit-mode trace | the band's pencil → `[data-editing]` | a step opened from its pencil → `[data-qc1522='step-edit']` | the edit mode is retired; the editing that remains is one thing in place |
| `qc152.measure.ts` lean ("editing: 0°") | the band's pencil | a step's pencil | the card still stands straight while something is open |
| `qc1522.measure.ts` L12 "never writes" | the band's pencil (the details form) | a step's pencil | the details form is gone; a step's form must carry no prefilled prose either |
| `qc1611.measure.ts` "delete a step" | `[data-qc152='edit-step']` | the bubble's `[data-qc168='pen']` | the pill is the pencil |
| `acv2.measure.ts` AC2-9 (and its `noteAct`) | hover row's Edit / Delete / Pin, `edit-save` | the pencil; "Delete this note" asked inside; ⋯ menu; the tick | the hover row is retired on the agent card too |
| `qc158.measure.ts` QC158-10/12 | `[data-qc158='act']` buttons | the ⋯ disc and its menu items | as above |
| `qc1581.measure.ts` the last note's Pin | the hover row's Pin | the last note's ⋯ menu's Pin (opens above it) | as above |

Retired whole: `tests/e2e/laqEdit.measure.ts` and its helper `tests/e2e/laqEditDb.mjs`. Every lock in it measured
the retired layer (LQE1–LQE3 the edit mode's signals, tab dot and leave check; LQE4 the agent-detail round-trip
through the edit layer; LQE6 Materials' Edit sending you to Tracking, now the opposite rule). Their successors:
qc168 L3/L4/L5 (a step in place, the cross and the question), L6 (Materials in the tab), L8 (a note round-trip), L11
(the agent move), and qc167's drawers for the agent's details; LQE7 (no native `<select>`) is checked by qc168 L3.

## Already stale before v168 (not re-pointed)

`qc152.measure.ts` (Fix a mistake, Free, package and L12 blocks), `qc1521.measure.ts` and `qc152Shots.measure.ts`
press the band's pencil to reach v152's "What needs changing?" fork (`fork-fix`, `fork-details`, `fork-changed`),
which v152.2 removed (no `fork-*` hook exists in `src/`). They were red or empty before this branch.

## Left as they are

- The To-do desk's preview hides `[data-qc152="pencil"]` (`todoWs.css`); the preview now draws no pencils at all (a
  card with no footer actions is a preview), so the rule is inert and its smoke lock unchanged.
- `data-editing` on the agent card (`AgentCard24`, `AgentCard262`, `contactV262.css`) is the agent card's own section
  editing, not the query card's layer.
- The phone card (`QcQueryCard149`'s own layout) and its `onSaveEdits` / `CardEdits` are untouched.
