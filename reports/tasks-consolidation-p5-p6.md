# Tasks consolidation — Phases 5 and 6

**Ref:** `design-refs/tasks-states.html`, sheets 2–7. Page body only.
**Gates:** `tsc --noEmit` 0 · production build clean · **62 files, 1175 passed | 2 skipped** across
the To-do scope. Commits `7c82d07` (P5) → `1fb0f0e` (P6).

**⚠️ Phase 7 is NOT started** — the brief's own clean split. Its recon is at the foot of this file.

---

## Phase 5 — row states, the loading shell, the empty panels

**Focus is an ink bar on `:focus-visible`, never an outline.** The row is a `role="button"`, so a
pointer press must not leave it looking picked; `:focus` alone would do exactly that.

**The optimistic write is believed immediately and only failure interrupts.** The row dims to 55%,
its circle becomes a spinner *in place*, and it stops taking clicks. The pending key clears **on
settle, not on a data change** — a refused write changes no data, so clearing on the next render
would leave a denied row dimmed for ever, which is how a silent permission failure becomes a page
that looks broken. `onTick` returns its write for that reason alone.

**The completion ring is derived from arrival, not from the click** — keys newly present in the
Done group, 600ms. The first render rings nothing: arriving at a page is not an achievement. It
**survives reduced motion** where the shimmer and the spinner stop, because the ring carries a
fact and the rest is decoration.

**The skeleton is the real row wearing placeholders** — `.tdg-row`, the same six tracks, the four
verb slots with their empties. Its trigger is `collectionsReady`, the db's own first-snapshot flag:
*"no tasks" and "we do not know yet" are different sentences.*

⚠️ **A sharp edge this introduced:** any db mock that omits `collectionsReady` now renders the
skeleton, and every content assertion under it fails for the wrong reason. Two suites were patched;
a third (`src/test/pageSmoke.tsx`) already had it.

### Two of the ref's five empty states cannot exist — and the law is right, not the ref

Sheet 4 draws "Nothing cleared yet today" and "Housekeeping is empty". Both need a group that
renders while empty; `taskGroups` filters those out, locked, with its reason. The ref's own
housekeeping copy admits it ("this group hides itself when it has nothing to say"), which reads as
a demonstration of the rule rather than a state to build. The `done-empty` art slot stays in the
census, unmounted, as `seize-the-day` does.

The filtered-empty panel is built: it names what you searched for, states the size of the set you
get back, and carries no art — a dead end to escape is not a moment to decorate.

---

## Phase 6 — keyboard, toasts, motion

J/K move · Space ticks (or opens the flow where the tick is not the act — `isTickable`, the same
question the row asks before drawing a circle) · Enter fires the primary · S opens the dial · E
edits · Esc closes innermost-first · `?` shows the map · W works the list · `/` jumps to search.

Every decision is pure in `lib/taskShortcuts`. **Every one is a bare key**, so the typing guard is
the whole point: `j`, `k`, `s`, `e` and a space are characters a writer types into a title. The `?`
map renders **from `KEY_MAP`**, so the sheet cannot advertise a key that does nothing — and a lock
walks the map asserting every advertised key is answered by a handler.

**The focused row is the browser's own focus.** J/K move real focus rather than tracking an index,
so Tab, a click and a shortcut all agree about where you are, and `:focus-visible` paints it for
free. Order comes from the DOM.

**Toasts:** eight seconds (the takeback window is about a person, not a frame), bottom-left, never
stacked — a second act replaces the first, which the hook has always enforced. A `warn` shape in
pink for refusals only, carrying no Undo because nothing happened to reverse.

### ⚠️ Selection is NOT built, and `X` is not bound

Sheet 7 says selection "borrows the batch model wholesale". **There is no batch model.** The
ledger's machinery retired with the run sheet (Final Shape P5), `todoLedger`'s `batch*` helpers are
the housekeeping cohort rather than a selection, and board-optimise's Phase 8 was left unbuilt for
this exact reason with Nick's call still open. Building one fresh contradicts the phase's own
central instruction and is a pack of its own. The row's `.sel` state is not shipped either — a
state with no producer is dormant code. Nothing is half-built.

---

## ⚠️ The browser walk — two faults, and the suite could not have caught either

1. **The keyboard was unreachable from a standing start.** The keys were on the list container, so
   they only fired once focus was already *inside* the list: pressing `j` on a freshly loaded page
   did nothing, and because keydown bubbles *up*, focus on the scrollzone never reached the handler
   either. The whole point of "drivable without a mouse" is not needing the click first. It listens
   on the window now, with the same visibility guard `/` uses.

2. **The fold's staggered rows sat at `opacity: 0` indefinitely** — under `fill-mode: both`, and
   again under `backwards` — because the animation clock never advanced. Chrome throttles
   animations in background tabs for the same reason. **An entrance animation must never carry
   visibility.** The rows rise and never fade, so the failure mode is a stagger you do not get
   rather than work you cannot see. Locked: no keyframe in this sheet may start content at
   `opacity: 0`, and reduced motion *stops* the rise rather than swapping in a fade — which would
   reintroduce the fault for the readers least able to afford it.

**A third measurement was the documented trap, not a fault:** the focus background read as
transparent because `background` is transitioned and this pane does not advance transitions.
Suppressed the transition, re-read, `rgb(253, 250, 243)`. The house note in CLAUDE.md is right.

**What the walk could NOT prove, stated plainly:** the keyboard *wiring* lives in a `useEffect`,
which `renderToStaticMarkup` never runs — so the harness verified the CSS and the layout, and the
handler's registration is covered by source locks only. "Press `j` on a freshly loaded page" is
item 1 of the manual checklist below.

## The manual browser checklist for this pack

1. **Press `j` with nothing focused** — the first row takes focus and shows the ink bar. Then `k`,
   `Space`, `Enter`, `S`, `E`, `Esc`, `?`.
2. **Type a `j` into the composer** — it must reach the field, not move the list.
3. **Expand Housekeeping** — the revealed rows rise in sequence and are *never* invisible.
4. **Tick a user task** — it dims with a spinner, then the ring blooms as it lands in Done.
5. **A toast appears bottom-left**, holds 8s, pauses on hover, and a second act replaces it.

---

## Phase 7 — the recon, so it can start cold

**It stands alone and is not started.** What is already known:

- **The defect is real and measured.** At 800px the six fixed tracks take 670px, leaving ~86px for
  the title, which breaks to one letter per line. Browser-measured during the P3/P4 walk.
- **The ref (sheet 8):** below 900px the grid gives up its columns and each row becomes a small
  card — title and subtitle lead, the pill, the age and the two verbs that matter sit on a second
  line, and the journey meter is **dropped rather than shrunk** (five pixels of progress tells
  nobody anything; the stage is already named in the pill). Controls stack: search collapses to an
  icon, sort and Add share a row under the stat chips, "Work the list" becomes a floating action.
- **⚠️ THE COLLISION TO SETTLE FIRST.** Mobile pass 1 is locked and owns **below 768px** with its
  own chassis (sheet chrome, floating tab capsule). The ref's break is at **900px**. So the reflow
  lands in the 768–900 band, and what happens below 768 is a decision, not a detail — the swipe
  layer especially, since the mobile chassis may already claim those gestures.
- **The scroll chain is enumerated and locked** (`tasksChain.test.tsx`): any wrapper introduced
  between `.tpl-body` and `.tpl-zone` must be added to the enumeration, not worked around.
