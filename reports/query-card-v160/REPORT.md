# Query card v160: the card bumps on save, and confirm and undo ease in

Branch `query-card-v160`, worktree `ScriptAlly-qc160` (removed after the push). Reference
`design-refs/query-card-v160/query-card-v160.html`, SHA256 `66cf1850…2654` (matches).

## 1. False premises

1. **"The stored query is restored within one frame of pressing Undo" (QC160-8).** It is not, before or after v160.
   `restoreSnapshot` (lib/queryActions/snapshot) first reads what to put back from the server, then commits one
   batch. On the emulator the read takes about 0.45s. The card draws the undo when that commit lands, about 0.5s
   after the press. v160 does not change when or how the data is written. QC160-8 therefore asserts what holds:
   - the restore's first read goes out within 100ms of the press;
   - its commit is never held for a motion;
   - the stored query comes back byte for byte.
2. **"· draft" is removed at the start.** The composer's draft bubble carries no "· draft" mark. `QcCard152` draws it
   without Bubble's `draft` prop, so there is nothing to remove.
3. **The draft's dashed "outline".** The draft's dashed edge is a `border`, not an outline. At the settle the border
   goes with the draft's class, and a dashed `outline` in the same colour takes its place and fades over 300ms,
   starting 120ms in. This is the reference's own technique.
4. **The "Logged" mark** belongs to the To-do desk's read-only preview only (`desk.stampKey`). The card that saves
   never shows it, so there is nothing to fade in.
5. **The harness turns CSS motion off.** `openRoute` (tests/e2e/measure.ts) injects
   `transition: none !important; animation: none !important` on every element, so no measurement had ever seen the
   card's CSS motion. Every v160 lock lifts that suppression (`liftMotionSuppression`). Without that, QC160-10
   (reduced motion) would pass on every build.
6. **The production build has no card.** `vite build` builds the landing only. The card ships in the dev and emulator
   builds, so the build gate is read on both.
7. **Phase 4's CSS transition.** A `transition: background-color 500ms` on the grid band was tried and measured. It
   never started on the card behind the open slide-in card: the save's render blocks the page for about 400ms, and
   the band reached its new colour with no transition running. Phase 4 uses Web Animations instead, started from the
   committed change.
8. **The To-do desk's card does not draw a save's new step (FOUND, and the same on the base).** The card the To-do
   desk opens draws a short thread there: for `seed-pkgq-3` it shows only "You sent Marcus your query", where the
   Query Centre shows three steps. It never draws the step a save adds. This was measured on the base, 987e479ec,
   with v160's source files swapped out. So on that desk the bump plays, but the draft has no step to settle into:
   it goes when the save lands. QC160-13 holds the bump and records this.
9. **A save that adds no step.** On `seed-pkgq-3`, "Mark the full sent" re-stamps the "full sent" step the query
   already has (its data says Full requested beside a full already sent). The draft has no new step to become, so it
   goes at the landing.
10. **Where a stage change moves a grid card to another group** (the default "attention" grouping), React re-mounts
   it and it changes at once. The prompt calls this "as built". QC160-14 measures with the grouping set to none.

## 2. Branch, base, dev

- Branch `query-card-v160`, cut from `dev/qc1581-pk62` @ 987e479ec: what dev served, Submission packages v62 on Query
  card v158.1. It contains Query card v158 (aafbe6163) and v158.1 (a08fd5e07).
- Dev: https://scriptally-dev.web.app, bundle `index-BBv9y05U.js`, built from 5d8ef0504 on a clean checkout of the pushed tip. Before
  this deploy dev served `index-D36ukT_K.js`, from the base.

## 3. Saves and undos (Step 0.3)

All in `src/components/Queries.tsx`. Each save commits through `save1522` → `run1522` (`commitPlan`/`commitMany`,
one batch) and is followed by `done1522`, which sets the toast. Every undo is the toast's Undo
(`card1522.toast.onUndo` → `restoreSnapshot`).

| Action | Journey | Bumps and eases now |
|---|---|---|
| Mark the partial, full or revision sent | `send` | yes |
| Log a nudge | `nudge` | yes |
| Close (no response / withdrawn) | `close` | yes |
| Record a response (request, pass, R&R, offer, something else) | `reply` | yes |
| Take a pass off (reopen) | `unpass` | yes |
| Tell the other agents of an offer | `tell` | yes |
| Accept an offer | `accept` | yes (the burst plays as before) |
| Decline an offer | `decline` | yes |
| Delete a step (✎ Edit → Delete) | step edit `onDelete` | yes (the step folds away) |
| Each undo of the above | toast Undo | yes |
| Edit a step's date or materials | step edit `onSave` | no: it adds no step and moves no status |
| Save the agent's details or notes in place | `onSaveEdits` | no (the prompt's "never") |

QC160-11 ran five of these through the UI, each save and its undo bumping: mark the partial sent, log a nudge, record a
request, record a pass, and close. Reopen and answering an offer wait for a choice in their composer, so they were not
run there. They share `run1522`'s path, which is where the bump is wired.

## 4. Existing motion (Step 0.4)

- **Reused:**
  - `.qc152-m.new` (`qc1522Pop`), the entrance of a step that arrives with no draft. It now gets the class in the
    frame the step is drawn; before, it got it about 200ms later, from `freshKey` after the commit.
  - The same entrance for a step an undo restores.
  - The toast's entrance, as built.
  - `.qcm-fade`, the band overlay, for the gradient cross-fade.
- **Replaced:** Record a response's `savedCard` and `bandColourNow` (lib/cardMotion), which did the band cross-fade,
  the pill pop and the footer swap after a save. They are deleted. `swapCard` and `leaveGhost` stay.
- **Untouched:**
  - the composer's draft (`.qc1522-draft`), until it settles;
  - the To-do desk's typing dots, "Checking" and "Logged" (the preview only);
  - the composer's open and close;
  - the card's slide-in and lean.

## 5. After an undo (Step 0.5)

The toast clears and nothing is said. A refused restore says "Couldn't undo that. Nothing was changed.", as before.
Both are kept.

## 6. Locks

`tests/e2e/qc160.measure.ts` (emulator, 1512 × 900, the app's CSS motion live) and the source locks in
`src/components/queries/centre/qcv160.test.ts` (16).

**Final run:** 12 tests, 112 readings, all green after the timing fixes listed under "Settled during the work". Then
mutation builds A, B and C (`SA_PHASE=mutant`): every lock read red.

| Lock | Green after | Red under (the prompt's mutation unless noted) | Build |
|---|---|---|---|
| QC160-1 bump on save | one `scale` animation, 500ms, peak 1.022; rotate and translate still; `transform` none | bump on `transform` | A |
| QC160-2 bump on undo | the same, on Undo | skip it on undo | B |
| QC160-3 no bump otherwise | opening, tab change, adding a note, next query, opening the composer: none | bump when the composer opens | A |
| QC160-4 no stacking | at most one bump at a time; frame box at rest unchanged (`932,100,540,700`) | let them stack: **cannot turn the e2e red**, because two landings never come within 500ms through the UI. The unit lock on `bump` (stub frame) goes red without the cancel. | unit |
| QC160-5 the draft settles | same element; fill 0% → 100%; Band `rgb(228, 235, 242)` by 500ms; no dashed edge; scale from 1.015 | the draft drawn as a new element (a different React key) | A |
| QC160-6 strip and label ease | strip `rgb(231, 234, 235)` at 196ms, between `rgb(239, 230, 214)` and `rgb(228, 235, 242)`; equal by 500ms; footer fades in | remove the strip's easing | B |
| QC160-7 undo folds | opacity 0.21 at 150ms; height 4 of 61px at 350ms; gone by 500ms; the bubble above moves 0px | undone step removed in one frame | A |
| QC160-8 undo is immediate | the restore's read goes out within 100ms of the press (72ms); its commit is not held; the stored query comes back byte for byte | the restore delayed 600ms | B |
| QC160-9 toast leaves | opacity passes from 1 to 0 over 220ms, on Undo and on timeout | removed in one frame | A |
| QC160-10 reduced motion | no animation and no transition in the card on save or undo; end states right | the bump ignoring reduced motion | A |
| QC160-11 every action | five actions bump on save and on undo | only "record a response" wired | C |
| QC160-12 nothing else moved | every box within 1px, the same words (73 and 58 elements) | a folded step left at height 0 | B |
| QC160-13 To-do desk | the save and its undo bump the card the To-do desk opens | the bump scoped to the Query Centre | C |
| QC160-14 grid card (Phase 4, mine) | band `rgb(232, 233, 232)` part-way 150–300ms in; new colour by 560ms | the grid ease removed | B |

Each lock was proved red by its mutation build, not by a run against the base. The Step 0.6 trace records the base's
single-frame behaviour (`trace-materials.json`).

**Settled during the work:**
- QC160-1 now reads rotate only on frames where the lean's own return (a 320ms transition, existing) is not running.
- QC160-9's "gone by 400ms" became "invisible by 400ms, removed by 1s". The copy is dropped after the undo's own
  render, which can hold the page for about 0.4s.

## 7. Gates

| Gate | Baseline (987e479ec) | Final (5d8ef0504) |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Vitest | 12880 passed, 2 failed | 12896 passed, 2 failed |
| `vite build` (production: the landing only) | clean | clean |
| `vite build --mode development` (the app) | clean | clean |

The 2 failures are the same two in `src/test/firestoreTarget.test.ts`, failing on 18 Nov and still failing now. They
are untouched by this pack.

## 8. Frames

`reports/query-card-v160/frames/save-000ms.png` … `save-500ms.png` and `undo-000ms.png` … `undo-500ms.png`. Every
animation was paused at the landing and scrubbed, so each frame is exact. They show the agent's "asked for a partial"
on q152-agent:
- **Save:** at 150ms the bubble is part-filled from the left and the footer is fading in.
- **Undo:** at 150ms the step is fading out and the strip's word is rising in.

## 9. For Nick

1. **The To-do desk's card does not draw a save's new step** (§1.8, already on the base). Should its thread be made
   live, so the draft can settle there too? Options: (a) a fix of its own, where the To-do desk's card reads the
   query's live activity like the Query Centre's; (b) leave it.
2. **Steps that re-stamp rather than add** (§1.9). When a save re-stamps an existing step, the draft goes at once.
   Should it settle into the re-stamped step instead? Options: (a) yes, so the draft becomes whichever step the save
   touched; (b) leave it: it only happens on data that already disagrees with itself.
3. **The grid card in the default grouping** re-mounts when its stage moves it to another group, so its band changes
   at once (§1.10). Keep that as built, or also ease it there? Options: (a) keep; (b) carry its old colour across the
   re-mount.
