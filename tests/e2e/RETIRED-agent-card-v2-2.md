# Retired by Agent card v2.2 — one way to edit on both cards

The agent card's slide-in now edits the query card's way (Query card v168's parts, imported): the same pencil, one
section at a time with the question inside it, the head edited in place, the saved message in the card's own toast, the
band's ⋯. Locks: `tests/e2e/acv22.measure.ts` (AC1–AC14).

## Retired parts

| Part | Where it was | What replaced it |
|---|---|---|
| The 28px `.ag-pen` and its rules | `AgentCard262.tsx`, `acv2.css`, `acv21.css` | v168's `EditPen` (26px disc), placed by `acv22.css` |
| Several sections open at once | `AgentCard262` `open` list | One at a time, through v168's one-open rule (`useEditRule168`, `useHold168`) |
| `GuardBar` (the rust bar: Unsaved changes · Keep editing · Discard · Save all) and its CSS | `AgentCard262Edit.tsx`, `acv21.css`, `acv2.css` (`.ag-savewrap`) | `DiscardAsk` inside the changed section or the head ("Discard your changes to {section}?") |
| Save all (`saveAll`, `saveAllThen`, `discardThen`) and the guard state | `AgentCard262.tsx` | Nothing: one section saves at a time with its own tick |
| The Contact details section and `EditContact`'s layout | `AgentCard262.tsx`, `AgentCard262Edit.tsx` | `contactHead` (the same controls and rules) drawn in the head by `HeadOpen` |
| The section's own ✕ / ✓ buttons (`.ag-no`, `.ag-ok`, `data-acv21="cross"/"tick"`) | `OpenSec` | v168's `CrossTick` (`data-qc168="cross"/"tick"`) |
| The app's snackbar for the open card's messages | `AgentCard262`, `HostAgentCard`, `AgentList` (card kit) | The card's own toast bar above the footer (`lib/agentCardToast`) |
| The remove gate's private copy inside the old footer | `AgentCard24` `Foot` | `RemoveConfirm` (lifted unchanged), drawn by both cards |

## Older locks re-pointed, with why

| Lock | Was | Now | Why |
|---|---|---|---|
| `acv21.measure.ts` helpers `tick`, `cross`, `toastUndo` | `data-acv21="tick"/"cross"`, `.sa-toast-undo` | v168's `data-qc168` buttons inside the open section (or the head for contact); the card toast's Undo | the parts are v168's; the open card's messages are in the card. The old `cross` silently missed and left sections open, which is what turned 2a, 2d and 4a–4c red |
| AC21-2c | the Contact details section; the head's name text and flag showing the draft | the head opens in place; its name field holds the words; the checked country pill is the place line while open | contact is edited in the head itself |
| AC21-2f | the 28px pencil; two sections open together for Tab | the 26px disc; each section opened in turn; cross and tick named by the open section | v168's pencil; one section at a time |
| AC21-2g | Based in as two lines in the section | in the head: a country of the three puts the city on the pills' line (the v2.2 ref); Elsewhere keeps v2.1's ruling (search on the pills' line, the city beneath at full width, the 280px list) | Based in moved into the head, where the place line was (for Nick: the plain case follows the ref, not the 21 Nov two-line ruling) |
| AC21-2d | the wishlist and genres open together; the wishlist's tick leaves the genre draft on screen; the cross leaves the other section's draft | each changed and ticked on its own; "nothing else was open"; the cross and its Undo on the wishlist alone (the other-draft checks go; the `wholedraft` mutation has no second open section to bite on now) | one section at a time |
| AC21-2f (Tab) | Tab reaches every open section's cross and tick | Tab reaches the cross; the tick once the section has a change (a disabled tick is not a Tab stop) | the tick waits for a change |
| AC21-4a | the wishlist opened while How held a change | How's change discarded first (its cross) | opening another section with a change asks |
| AC21-4b | the wishlist and genres opened together; the breath back after the tick (genres still open); a tick with nothing changed | the wishlist alone, genres opened for its own step; the rim at rest after the tick (nothing left open); the tick disabled and the cross with nothing changed | one section at a time; the tick waits for a change |
| AC21-4c | "a tick with nothing changed" rests the border; "the rust bar's Discard" | "a cross with nothing changed"; the question's Discard inside the section | the tick is disabled until a change; the rust bar is retired |
| AC21-4b, 4c Undo | the snackbar's Undo | the card toast's Undo | the open card's messages are in the card |
| `acv2.measure.ts` AC2-9 (and its `undodrop` mutation) | the snackbar's Undo | the card toast's Undo | the open card's messages are in the card |

Retired whole: **AC21-2e** (leaving with two sections changed: the rust bar, Save all, Discard). Its subject is retired.
Successors: acv22 AC2 (one section at a time), AC3 (the question inside the changed section), AC4 (no rust bar, no Save
all, in any state).

## Already stale before v2.2 (not re-pointed)

`acv2.measure.ts` AC2-6 was already `test.skip` (it pressed v2's save bar, retired by v2.1). `acv21Shots.measure.ts`
(report shots, not locks) still presses Save all and the rust bar; its frames are superseded by acv22's.
