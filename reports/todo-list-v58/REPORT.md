# To-do list v58: the tray and the hawk's bubble

## 1. False premises from Step 0

None of the red-gate premises was false. Hashes matched. 0.3a, b, d and e hold. No branch named `todo-list-v58` existed.

Five things differed from the brief or are worth knowing:

- **0.3a.** `todoWs56.css` is not imported by `TodoWorkspace.tsx`. It comes in through `WsHeader56.tsx:29` and `WsSlim56.tsx:23`, which `TodoWorkspace.tsx` imports between `todoWs54.css` (l.50) and `todoWs55.css` (l.58). The effective order is still todoWs → 54 → 56 → 55 → 57, with v57 last (l.59).
- **0.3c.** Partly overtaken. The row reads `trayFigure()` (`TodoWorkspace.tsx:455`). The desk chip read `dueChip()` (l.597).
  - Consistency roll-out v1.1 had already changed `dayBit`, `dueChip` and `startReason` to "past expected".
  - `dueFigure` (the row's nudge/offer/own figure) still said "days late".
  - `stripWords` still said "{n}d late". Nothing renders it today; `startReason` isn't rendered either.
  - The phone's `PhoneTaskScreen.tsx:121` also reads `dueChip`. So I left `dueChip` in place and gave the desk a new `deskChip`.
- **0.3f.** `.tws-ti` itself had no `::before` or `::after` in the five sheets. The only pseudo near it is `.tws-ti[data-ticked] .tws-av::after`, on the child.
- **0.3g.** A tray task carries its query as `WsTask.query`. Tasks with no stage:
  - own tasks (`kind "own"`);
  - housekeeping (`group "house"`: `fix` agent gaps, which have no query, and `batch`, which names a head query but is not about one).
  - `wsStage()` returns null for all of these.
- **0.3d.** True. `.tws-du[data-late]` had no colour rule anywhere, so 5.3 had nothing to undo on the row. The only late colour was the desk chip's terracotta edge (`.tws-dchip[data-late]`, todoWs.css:210). See decision 4.

**Ref vs prompt.** The ref opens with switch 5 "Glyphs" on (24px, no disc, for rows without `data-st`). Every row in the ref has a stage, so that switch shows nothing there. I followed the prompt: non-stage glyphs keep their own drawing in a 32px cell. The hairline therefore starts at 54px (the ref's disc override), not 48.

**Environment.**
- Plain `npx tsc --noEmit` ran out of node's default 2 GB heap (exit 134), so every typecheck here ran with `NODE_OPTIONS=--max-old-space-size=8192`.
- The worktree needed `functions/node_modules` symlinked from the primary for the emulator's login step. Before that, 7 typecheck errors and 10 Vitest collection failures were all "Cannot find package firebase-functions".
- There were 7 worktrees besides the primary when I started (the rule's threshold is 5). I left them alone; see section 7.

## 2. Branches and commits

- **Cut from:** `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211` @ d80c2b92b. Dev served it as `index-BJO6iTBo.js`, confirmed by that deploy checkout's own `dist`.
- **Branch:** `todo-list-v58` (pushed).

| Phase | Commit |
|---|---|
| 1 group headings | 13ad1d55f |
| 2 stage disc | 2d1dd551c |
| 3 open row | 38e61750f |
| 4 one-line figure | eec5de578 |
| 5 row = desk, no "late" | 466a35bbb |
| 6 row rhythm | 614d22822 |
| 7 hawk's bubble | 689f02de6 |
| 8 locks, shots, readings | 1b6229232 |

**Dev deploy.** Dev moved while I worked: Next up v1.1 was deployed (`index-B3yW9Bab.js`). Rebuilding `…-acv211-nu11` @ 94e4eeaf2 gave exactly that hash.

- I merged v58 onto it as `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58` @ 9a76f0876 (pushed). The merge was clean, though both touch `lib/todoWs.ts`.
- On the merged tree: tsc 0 errors; To-do, todoWs, stageColours and queryActions specs 1036 passed.
- The served hash was checked in the deploy command itself. **Dev now serves `index-DDBRal-w.js`.**

## 3. Baseline against final

| Gate | Baseline (d80c2b92b) | Final (1b6229232) |
|---|---|---|
| tsc | default heap: OOM. 8 GB heap: 7 errors, all `functions/` missing packages (no `functions/node_modules`) | **0 errors** |
| build | clean (`vite build`, no error/warning lines) | clean |
| Vitest | 12 files failed (10 collection failures from the missing packages), **5 tests failed**, 12857 passed | **4 tests failed**, 13035 passed |

The 4 final reds were all red at baseline:
- `src/lib/events.test.ts` × 2: `getting_started_done`, pre-existing on the dev line since Dashboard v3.
- `src/test/firestoreTarget.test.ts` × 2: `tests/e2e/cl25*Data.mjs` and others.

The baseline's fifth red (`functions/src/smartImportCore.test.ts`) passes once the package resolves.

## 4. Measurements (rendered page, emulator, `tests/e2e/todoV58.measure.ts`) and the red-then-green proofs

Readings are in `readings/before.json` and `readings/after.json`. Shots are in `before/` and `after/`.

| Reading | Before 1512 | After 1512 | After 1280 |
|---|---|---|---|
| row height, one-line title | 59 | **58** (44 rows) | **58** (27 rows) |
| rows whose title wraps (two lines) | 5 of 53 (77.8) | 8 of 53 (73.8) | **26 of 53** (73.8); before: 14 |
| glyph cell | 36 × 36 | **32 × 32** on every row (full, partial, offer, queried discs; own) | 32 × 32 |
| open row's bar | — | **3 wide**, inset 10 / 10, navy rgb(42,58,82) | same |
| gap above each heading | 14 (2 above the first) | **24** above Nudges, Gone quiet, Housekeeping, Your tasks; 10 above the first | same |
| heading height | 40 | **32**; no background, no image; rule 149–256px wide | 32 |
| desk chip vs open row | "154 days past expected" vs "154 days waiting" | **"154 days waiting" both**. Nudge: "78 days past expected" both. Offer: "91 days past expected" | same |
| figure ink | — | one colour on every row, rgb(58,51,45) | same |
| hawk's bubble | blush rgb(248,226,216) | full: band rgb(183,201,222) + edge rgb(157,180,207), ink rgb(28,19,15). Nudge: rgb(239,230,214). Offer: the sheen gradient | same |
| hover | 59 / title 206.7 both | **58 / title 190.2 at rest and on hover**; figure hidden, actions flex | |

**Red then green** (`src/components/todo/ws/todoWs58.test.tsx`, 9 cases, all green with the fixes in). Each mutation was made in my worktree and restored from a copy:

| Mutation | What went red (only these) |
|---|---|
| A. `stageVars` returns nothing | the three rows' band and edge; the offer row's sheen; the hawk note's band |
| B. the hawk note loses its stage attributes | both hawk cases |
| C1. `deskChip` reads `dueChip` | "chip text equals the row's" |
| C2. the desk calls `dueChip(t)` | "the desk reads deskChip" (and the render cases, since `dueChip` is no longer imported there) |
| D. `dueFigure` says "days late" | the /\blate\b/ sweep |
| E1. no rule span | "every heading renders the rule span" |
| E2. a heading keeps `background: var(--tw-sand)` | "todoWs58.css takes every heading's background away" |

Each case first asserts its population is not empty: exactly three stage rows, more than one heading, more than three figure kinds, at least one "past expected".

## 5. The no-figure "send" rows

**Two of the 13 send rows show no figure:**
- "Send Ottoline your full" (`seed-cal-passed865-q`)
- "Send Marcus your partial" (`cor-move-a`)

Both query records have status Full / Partial Requested but carry no `fullRequestedDate` / `partialRequestedDate`. `listRowInputs` (lib/taskCardFacts.ts) counts days waiting from that field, finds nothing, and `trayFigure` shows nothing rather than guess.

Both also have later "Sent" activities that contradict the stored status. They are seed inconsistencies, the kind Query card audit v1 counted, not a code fault.

## 6. Decisions for Nick to rule on

1. **Nudge rows read "{n} days past expected".** The mock first showed "days quiet", which Gone quiet already uses for a different count.
2. **Tasks with no query keep the blush hawk bubble** (own tasks, housekeeping).
3. **Own, housekeeping and initials glyphs keep their own drawing at 32px**, with no stage disc. This follows the prompt over the ref's switch 5 (24px, no disc), which the ref shows on no row.
4. **The desk chip keeps its terracotta edge on every task.** Before, the edge appeared only when a task was late or due today. The ref's chip shows the edge on "2 days waiting", and the baked rule says how long a task has waited never changes a colour. The other choice is no edge at all.
5. **The collapsed strip's word "{n}d late" became "{n}d past".** `stripWords` renders nowhere today, but it lives in `lib/todoWs.ts`.
6. **The desk got a new `deskChip(t, now)` instead of changing `dueChip`**, because the phone's task screen reads `dueChip` and the phone is out of scope. The phone chip therefore still differs from its row (it shows "{n} days" for Gone quiet and nothing for a request with no due date).
7. **The one-line figure makes more titles wrap.** At 1280, 26 of 53 rows now wrap to two lines (73.8 tall), against 14 before. "{n} days past expected" on one line is wider than the stacked figure was. The ref's tray is 394 wide; at 1280 the real tray is narrower. A rule is needed: e.g. let the words wrap under the number below some width, or shorten the copy.

## 7. Seen and left alone

- **Housekeeping's "Quick fill" button covers the heading's rule.** It is positioned absolute over the header's right end (todoWs.css `.tws-qfb`). The rule runs under its white pill; the chevron stays visible.
- **The open row shows its quick actions after a click** (focus-within, v57 behaviour), so in the shots the open row's figure is swapped for the two buttons.
- **`WsHeader56`'s "past expected" line** and the phone's `dueChip` copy are unchanged (out of scope).
- **The other worktrees, which I did not touch:** `ScriptAlly-acv21b`, `-ca2`, `-live`, `-rsp6`, `-tdf`, and a stale deploy checkout in another session's scratchpad. `git worktree list` showed 7 besides the primary when I started; the rule's threshold is 5. The live claim list also names several directories (`-cr11`, `-cf1`, `-dbv3`, `-search-v1`…) that no longer exist as worktrees, so their claims are stale.
- **The `Next up v1.1` session** may redeploy from its own branch. Dev's v58 is on `…-nu11-td58`; a redeploy of plain `…-nu11` would take v58 off.
