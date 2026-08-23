# Noteboard — centred workflow, examples to the drawer

23 Aug 2026, unattended. Commit-only; nothing pushed, nothing deployed.

---

## 1 — Premises that turned out false

### 1.1 — "The drawer regains grouped headings" — it never lost them

The drawer has rendered `.nb-exgroup` + `.nb-exhead` since the original build's Phase 7. There
were no headings to restore.

**What actually changed is the ACTION**, and the brief does not name it. The drawer offered
**"Use as a starting point →"**, which called `setCompose(draftFromExample(ex))` — it *seeded the
composer with an editable draft and wrote nothing*. v2's "Keep this" **commits immediately**.
That was the right call while the board carried example papers with their own immediate "Keep
this"; with the papers gone, the drawer inherits both the behaviour and the wording. One example,
one door — so the old link is **gone, not relabelled**.

### 1.2 — The persistence store does not become dead code; only one key becomes dead data

The brief anticipates "if the dismissal-persistence store becomes unreferenced". It does not.
`todoPrefs.noteboard` is read **every render**, because **`order` (drag-to-reorder) lives in the
same sub-map** — `noteboardPrefs` and `saveNoteboardPrefs` are both load-bearing. Only the
**`dismissedExamples` key** goes unread.

So the honest report is narrower than "dead code": existing dismissals sit **unread on user
documents** as dead *data*. Left alone, with the rules, exactly as instructed — deleting a store
is not an unattended-run decision. §2 has the detail.

### 1.3 — Two probes could not use the instrument the brief implies

Phase 1's (b) and (c) ask about the drawer's rendered contents. **The drawer mounts only when
open**, and this repo's component tests are `renderToStaticMarkup` — no effects, no clicking — so
a closed render proves nothing about it and a probe asserting over it would pass vacuously, which
is the failure mode the brief itself flags for (a).

Those two cases read the drawer's **shape from source** — the group map nesting the item map,
which is what makes a loose example *structurally impossible* rather than merely absent today —
and the end-to-end click (`Keep this` → a note appears, the drawer closes) is measured **in the
browser**, where a click is a click. Stated because it is a change of instrument, not of claim.

### 1.4 — My own block-kind helper counted the empty board

`.nb-board` mounts even with zero notes — it holds the ghost tile. Marking it unconditionally
appended a trailing `board` to the empty state's sequence and reported `heading lede cta steps
board` against a **correct** page. The helper now marks the board only when a note is inside it.

### 1.5 — The empty-state browser case failed on a dirty fixture, and said the wrong thing

It failed with *"the empty arrangement is not on the page"* — which reads as a broken page. The
board simply was not empty: the other cases in the same file pin notes on the same shared harness
account. It asserts its **precondition** now, so the red says *"the board holds 5 notes — run
seedNotes.mjs --clean first"*.

### 1.6 — Deleting a whole lock file was the right call, not a shortcut

`noteboardExamplePapers.test.tsx` locked the board-side papers: the threshold, the dismissals, the
coexistence rule, the sparse arrangement. Every one of those subjects is gone. Repointing each
assertion would have produced a file about nothing that still had to be maintained. **Deleted**;
its three surviving claims moved to siblings, each stating what it retires.

---

## 2 — What went with the example papers

| Removed | Where |
|---|---|
| `NOTE_EXAMPLE_PAPERS`, `ExamplePaper`, `sparseExamples`, `NOTEBOARD_HINT` | `lib/noteboard.ts` |
| `examplePapers`, `keepExample`, `dismissExample`, the intro block and card render | `TodoNoteboardPage.tsx` |
| `.nb-example`, `.nb-exlabel`, `.nb-ex-actions`, `.nb-exdismiss`, `.nb-exintro(-h)`, `.nb-uselink` | `todoNoteboard.css` |
| `noteboardExamplePapers.test.tsx` | deleted whole (§1.6) |

**Kept, deliberately, and each says why in place:**

- **`noteboardPrefs` / `saveNoteboardPrefs`** — still read every render for `order` (§1.2).
- **`dismissedExamples`** — dead *data*, not dead code. Untouched on user documents; rules
  untouched.
- **`draftFromExample`** — total, tested, and the shape any future seed-a-draft surface would
  want. Nothing renders it; the lock records that rather than asserting a caller.
- **`.nb-keep`** — rehomed beside the drawer's own rules, since the drawer inherited both the
  action and its style from the papers.

## 3 — Both states share one panels component

`NoteboardSteps` is defined **once** in `noteboardEmptyState.tsx` and mounted by both
arrangements; they differ only in what surrounds it. Locked four ways: one `const NoteboardSteps`,
two-or-more mounts, exactly one `NOTEBOARD_STEPS.map`, and the same `data-nb-steps="workflow"`
marker present in both **rendered** states. Two divergent copies would have passed every other
probe in the file and drifted on the next edit.

---

## 4 — Phase by phase

### P0 — the ref · `d8a3d97a`
`design-refs/noteboard-empty-state-v2.html`, 302 lines, sha256 `917935560c3e…986311ef7`, one file.

### P1 — examples to the drawer · `b0181be2`
`lib/noteboard.ts` · `TodoNoteboardPage.tsx` · `noteboardDrawer.test.tsx` (new) · three locks
repointed · one deleted

**Red 6/6 → green 6/6.**

| Probe | Evidence |
|---|---|
| (a) zero example elements on the board | board anchor asserted first, then five bounded class tokens absent, plus `data-example` |
| (a′) the machinery is gone from page and lib | `sparseExamples`, `examplePapers`, `keepExample`, `dismissExample`, `NOTE_EXAMPLE_PAPERS` all absent — and `noteboardPrefs` asserted **present**, because `order` needs it |
| (b) the drawer's groups | the module's six names, and the item map nested inside the group map |
| (c) Keep this creates | `addUserTask` + `setUserTaskColour` + `setExamples(false)` + the unchanged receipt; `Use as a starting point` and `draftFromExample` absent from the page |

### P2 — the two arrangements · `ca78bb2b`
`noteboardEmptyState.tsx` · `noteboardEmptyState.test.tsx` · `TodoNoteboardPage.tsx` ·
`todoNoteboard.css` · `nbWorkflow.measure.ts` (new)

**Red 5/5 → green 13/13 unit.** Browser, red against dev then green:

```
[empty]   heading·lede·cta·steps ordered on screen = true
[empty art] A note being written        250×130 fill=rgb(233, 237, 230)
[empty art] Three coloured notes…       250×130 fill=rgb(251, 243, 217)
[empty art] A note gaining a date…      250×130 fill=rgb(245, 226, 218)
[below 1] board.bottom → sep.top gap = 64px · cta rows = 0 · heading = "Write it down for later…"
[below 4] board.bottom → sep.top gap = 64px · cta rows = 0 · heading = "Write it down for later…"
[keep]    kept "Heard [agent] on [podcast]…" · board head "Heard [agent] on [podcast]…"
```

(c) is **geometric, not DOM order** — the board is a multicol block whose height is whatever the
columns grew to, and "later in the markup" would not have caught the flow problem that put the
examples' hint line beside the cards it introduced one run earlier. (d) requires a **palette**
fill, never merely "a real colour string": every unpainted SVG shape carries SVG's default black,
so a probe satisfied by `rgb(0,0,0)` is satisfied by artwork that was never painted.

### P3 — sweep · this commit

```
tokens read: 27 · dangling: none
rendered but unstyled: none        styled but never rendered: none
gradient on a note surface: none   gradient/filter/shadow inside the SVGs: none
display:contents / mix-blend-mode / transform on a note: none
paper rules: .nb-c-yellow/pink/sage all AFTER .nb-note's transparent border
scope: all four floating surfaces carry .nb-scope
```

Eight screenshots at 1280 and 2300 — zero notes, the drawer, one note, four notes — each
**asserting its own claim before shooting** (board empty; CTA visible; CTA count zero; separator
visible), so a shot cannot quietly capture the wrong state.

---

## 5 — Degraded or skipped

1. **Nothing was skipped.** All Phase 1 and Phase 2 probes landed, both instruments, plus all
   eight shots.
2. **Two Phase 1 probes changed instrument** (§1.3) — source-shape for the drawer's structure,
   browser for its behaviour. The claims are unchanged.
3. `artSlots.test.tsx`'s v1 trigger case remains `it.skip` from the previous run — the 3 skipped
   above baseline's 3. Unchanged here.

## 6 — Baseline vs final

| | Files | Tests |
|---|---|---|
| Baseline (Step 0.2) | 379 passed | 6482 passed · 3 skipped · **0 failed** |
| Final | **379 passed** | **6483 passed** · 3 skipped · **0 failed** |

File count is level because this run **added** `noteboardDrawer.test.tsx` and **deleted**
`noteboardExamplePapers.test.tsx`.

**No other-session failures at either end.** Another session is live in this checkout — it
committed twice during the run and holds uncommitted WIP in `ToDoPage.tsx` plus untracked
`taskCardFacts.ts` and `useTaskPaneSession.tsx` (whose `tsc` errors are theirs, and were
attributed before any gate was believed).

**Do-not-touch:** the three commits touch the ref, the Noteboard's own sources and locks, and
nothing else. `tasksNoteboard.test.tsx`'s retirement assertion is **untouched** — this run did not
open that file.

## 7 — Left for Nick

- **Nothing to deploy or run.** No rules change; none pending.
- The behaviour ships with the next ordinary dev deploy:
  `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`
- **The harness account holds four `WFSHOT` notes** from the screenshot runs, created through the
  real composer. Clear with `node tests/e2e/seedNotes.mjs --clean` — or leave them; they are
  ordinary notes.
- **`dismissedExamples` is dead data** on user documents (§2). No action needed; recorded so it is
  not mistaken for live state later.

## 8 — Do-not-touch verification

Every file across the three commits:

```
design-refs/noteboard-empty-state-v2.html
src/components/todo/TodoNoteboardPage.tsx
src/components/todo/noteboardDrawer.test.tsx
src/components/todo/noteboardEmptyState.test.tsx
src/components/todo/noteboardEmptyState.tsx
src/components/todo/noteboardExamplePapers.test.tsx   (deleted)
src/components/todo/noteboardExamples.test.ts
src/components/todo/todoNoteboard.css
src/components/todo/todoPageSmoke.test.tsx
src/lib/noteboard.ts
tests/e2e/nbWorkflow.measure.ts
```

Filtering that list for `PortalMenu` · `todoBoard.ts` · `todoBoard.css` · `todoFamily.ts` ·
`TodoCalendarPage.tsx` · `calLook.measure.ts` · `FocusFlow` · `workspacePageGrid.css` ·
`PageHeaderProps` · Query Centre · `StatusDot` · `MountCard`/`MountPanel` · `#/pkg-lab` ·
`tasksNoteboard.test.tsx` returns **nothing**.
