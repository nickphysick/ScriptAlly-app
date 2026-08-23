# Pack B Phase 2 — `useTaskPaneSession`: the move

**Session** `tasks-workflow` · **base** `6d5349e5`, behind main 0 · **uncommitted, at the gate**

## Status: DONE — suite green, retarget approved

The move is built. Seven existing locks failed; **all seven read `ToDoPage.tsx` by path** and
anchored on identifiers inside it, and none asserted behaviour that changed. A declared relocation
cannot leave a path-bound source lock green, by construction — so the pack's *"if a test must
change, behaviour changed"* premise does not hold here. Reported, and **Nick approved the retarget
on the same reasoning as `paneGate`**, with two conditions, both met:

1. **Each retargeted lock states its law in its own file** — which law it asserts, and that the law
   survives the move. One line each, so the next session can tell a legitimate retarget from a
   convenient one.
2. **Where the anchor spans the seam, the lock follows the behaviour rather than the file** — and
   where a half is no longer expressible in source at all, it says so rather than narrowing
   silently.

**Suite: 381 files · 6513 passed · 3 skipped · 0 failed.**

## Gates

| gate | result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| `vite build` | **green** — only the expected chunk-size note (whole log read, 178 lines) |
| Vitest | **6513 passed · 0 failed · 3 skipped** (7 path-bound locks retargeted, below) |
| mid-run gate | **clear** — `git status src/components/todo/ src/lib/todo*` shows only my two files |

Two commits landed during the pass (`5fdbdc66`, `6d5349e5`, the packages session). **Neither
touches the three failing suites nor `ToDoPage.tsx`**, and I have edited none of the three test
files — so the seven are mine, not inherited.

## The shape

`ToDoPage.tsx` **3671 → 3049**; `useTaskPaneSession.tsx` **777**. Eleven ranges moved.

**The hook takes `(card, host, idPrefix)` and returns `{ journey, onPrimary }`.** It builds the
journey from `(card, data)` alone — no `boardCols`, no `facts`, no `events`, no `primaryLabel`,
which is what Packs A and A2 bought.

**The seven the page keeps — confirmed by the code, not assumed:**

| callback | why it cannot be the hook's |
|---|---|
| `jumpToSection` | reaches `document` — the pack's own constraint |
| `openFlow` | the `offer`/`fix` hand-off to `FocusFlow`, which the page mounts |
| `commit` | writes and toasts |
| `advance` | moves the dock cursor, which is the page's |
| `onSnooze` | opens an `AnchoredPanel` the page renders |
| `onDismiss` | opens a dialog the page renders |
| `openQuery` | navigation |

`nav` (index/total/label/prev/next) stays on the page too — it is the dock cursor, not the session.

## Three findings the move surfaced

**1. `paneVerbs.snooze.onPress` and `.dismiss.onPress` are dead, and were dead before the move.**
The journey reads only `.disabled` from those two and supplies its own handlers; only
`openQuery.onPress` is ever called. The two dead closures pointed at a *different* surface from the
live one — `cbSnooze`/`setCbDial` and `forkStale(card, "notNow")`, against the journey's
`setSnoozeAnchor` / `setDismissOpen(true)`. Relocating them faithfully would have meant three more
host callbacks that nothing calls. They now point at `host.onSnooze` / `host.onDismiss`, so a future
caller cannot reach a different surface than the journey does. **No live path changed.**

*This is also why the pack's "no scripted substitution" constraint earned its keep.* I had written a
`verbs` replacement from the map rather than relocating the real one; it dropped `openQuery`
entirely and invented two handlers. Reading the original caught it.

**2. `bulkRows` had to become an argument to `commitFromPane`.** It was a page closure the writer
reached for (`commitRecordSweep(card, bulkRows)`). With the table's state in the session, a bulk
commit driven from the calendar would otherwise have written the *To-do page's* rows. Signature is
now `commitFromPane(card, v, bulkRows)`.

**3. `paneJourneyKind` has two consumers and only one of them moved** — the pane's primary (moved)
and `commitFromPane` (stayed). It is now module-level and exported from the hook, taking `agents` as
an argument instead of closing over it. One table, two readers; `cardGaps` came with it.

## Faithfulness

578 substantive lines were cut from `ToDoPage`. **559 appear verbatim in the hook** after the
declared adaptations. The 19 that do not are all accounted for: 11 are the three `useState`
declarations and their comments (**restored verbatim** after the diff caught that I had dropped
them — only `HELD BY THE PAGE` → `HELD BY THE SESSION`, which is the point of the move); 2 are the
JSX prop wrappers that became `journey={session.journey!}` / `onPrimary={session.onPrimary}`; 2 are
`paneJourneyKind`/`cardGaps` gaining `agents`; 2 are the dock-cursor lookup, moved verbatim into
`paneHost.advance` on the page; 2 are the snooze/openQuery/dismiss adaptation above.

## TDZ audit (recorded, as the pack requires)

`tsc` does not catch this class, so it was checked by declaration order.

- **Hook:** the only render-time evaluation is `buildJourney(...)` at line 660. It reads 28 local
  declarations plus 4 destructured states. **Every `const` precedes it; every function is a
  declaration and hoists.** No exposure.
- **Page:** the hook is called at line 817. `openFlowCards` (498), `dockable` (769), `setDockKey`
  (733), `setSnoozeAnchor` (461), `setDismissOpen` (464), `PANE_ID_PREFIX` (300) all precede it.
  `jumpToSection` (2815) and `commitFromPane` (2431) are **function declarations** — hoisted, and
  the only one referenced eagerly (`jumpToSection`, as a shorthand property) is one of them.

## The seven failures, and what each would need

All seven read `ToDoPage.tsx` by path:

| suite | anchor | why it misses |
|---|---|---|
| `paneCommit.test.ts` ×3 | `indexOf("function dockPrimary")` | `dockPrimary` is in the hook |
| `paneCommit.test.ts` | `toContain("openFlowCards([card])")` | now `host.openFlow(card)` in the hook; `openFlowCards([c])` on the page |
| `paneCommit.test.ts` | `toContain('requiredFor(journeyKind(paneCard)).includes("unit")')` | in the hook, and `paneCard` → `card` |
| `sentPreviously.test.ts` | `sliceBetween(page, "sentPreviously: (() => {", …)` | in the hook |
| `tasksViewport.test.tsx` | `indexOf("const paneFacts")` | in the hook |

**The retarget, as landed.** `slice()` in `paneCommit.test.ts` now searches **both** files and
asserts it found exactly one — so the next relocation fails loudly rather than reading nothing.
Two locks span the seam and say so:

- **the hand-off** asserts BOTH halves — the session reaches (`host.openFlow(card)`) *and* the page
  wires that reach to the real `openFlowCards`. Asserting only the session's half would pass on a
  page that had quietly stopped mounting anything, which is the failure the lock exists for.
- **"it advances only on a commit that wrote"** keeps its write-gate half in the session, and states
  plainly that the other half — reading the cursor off the board as it WAS — is now **closure
  capture rather than statement order**, which source cannot see. It is named and handed to the
  rendered check instead of being quietly dropped.

`CLAUDE.md` gained the general rule: a lock states its claim against the strongest artefact that can
carry it, because a rendered-page lock survives relocation and a path-bound one cannot.

### A correction the retarget forced

Writing the seam lock exposed a comment I had written that was **false**: `paneHost.advance` carried
*"THE NEXT CARD IS READ BEFORE THE WRITE LANDS … the index is read here, at press time."* It is not
read at press time — it runs after the write resolves. The guarantee is real but comes from
somewhere else: `dockable` inside `advance` is the array from **the render in which the primary was
pressed**, because the session holds that render's host object, so it is still the pre-write board.
Behaviour is identical to the original; the comment describing it was not. Corrected to state the
mechanism, and flagged in the code that reading `dockable` from anywhere newer breaks it silently.

## Next

- **Phase 2's rendered check** — type a body, stage answers, switch cards, return; commit a primary
  and assert the same write with the same args; console clean. Plus the one claim the retarget
  handed it: that the dock cursor still resolves against the pre-write board.
- Phase 3 (the calendar mounts the pane) and Phase 4 (verify + conditional deploy).
