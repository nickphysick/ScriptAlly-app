# Query Centre v96 — §0 recon

Baseline, recorded before any edit, on `ef96f4be` (v95 + living headers v3), worktree clean:

| | |
|---|---|
| `tsc --noEmit` | 0 errors |
| `vite build` | clean, 0 flagged lines |
| Vitest | **8,227 passed · 3 skipped / 511 files** |

Reference enrolled: `design-refs/query-centre-v96.html`, SHA256 `5a47fb7c…f16d5996` — matches the pack.
105 refs now guarded.

---

## False premises in the pack, named first

**1 · §2's "faint mono column labels above the first row" predates head C.** The reference draws the
head, then the anthracite band, then `#cards` — no label strip (`colsLabelRow: false` in its rendered
DOM). The reference wins; v95's `AGENT · QUERIED · …` strip is dropped. *(Ruled by Nick, 2 Oct.)*

**2 · §6's baked decision describes v95, not v96.** It reads *"The list head is one line on the page:
title left, three dashed typewriter controls right. No pills."* — which is exactly what v95 built and
exactly what §2 of this same pack replaces. The one-paragraph summary at the top has the same problem
(*"a typewriter head line and pill controls"*). The reference renders `data-h="c"` — head C,
Contact-list style, serif `Your queries` + mono `27 OF 27` + `Find a query` + icon Filter · Group ·
Sort — and §2's own prose agrees with it. The reference wins.

**3 · The reference is NOT in a container.** Of the seven head options its scaffolding still carries
(A–G), the rendered one is **C**, not D ("Contact-list style, in the container"): `.box` is absent
from the DOM. ⚠️ **And its static `<body>` ships `data-h="white"`, which its own script overwrites on
load** — so reading the file answers this wrongly. Read the rendered DOM.

**4 · "Run after `cc-prompt-living-headers-v2.md` … It is already running; rebase onto its result."**
What landed is living headers **v3** (`a5770cdd`), and it is finished rather than running. There is
nothing to rebase onto: this worktree is level with `origin/main`.

**5 · §5 QC9's mutation "clamp nothing" cannot redden that lock.** Measured in v95: the bar's track is
`overflow: hidden`, so removing `Math.min(100, …)` leaves a fill asking for 340% and still measuring
100%. The clamp and the clip are two guards on one claim and only the clip is observable from the
page. QC9's red comes from the colour and from the dateless track instead.

**6 · The reference's own annotation prose is stale** — it still describes the tray as *"the primary
verb as an ink pill, Snooze, and a ⋯"* while its rendered tray reads **`Decide on the offer · Edit ·
Close`**. The render is the oracle. *(Ruled by Nick, 2 Oct.)*

---

## §0.1 · What is there now

| The pack's name for it | Component | File |
|---|---|---|
| the three court tiles | `QcCourts` — **already the desk** since v95 §1 | `components/queries/centre/QcCourts.tsx`, `qcvCourts.css` |
| the list bar, Filter / Group / Sort | `QcSentence` + `QcMenu` | `QcSentence.tsx`, `QcMenu.tsx`, `.qcv-lhead` in `qcvPage.css` |
| the row card | `QcList` | `QcList.tsx`, `qcvList.css` |
| the Birds-eye rail header | `QcBirdsEye` | `QcBirdsEye.tsx`, `qcvBirdsEye.css` |
| the rail's rows and bars | `QcBirdsEye` + `lib/qcBirdsEye.ts` | same |
| the rail's Everything / With you / With the agent | `.qcv-be-focus` in `QcBirdsEye` | same |

## §0.2 · The measurements

Main column, rail and gutter — the reference and dev, same browser, same ruler:

| Viewport | ref main | dev main | Δ | ref rail | dev rail | ref gutter | dev gutter |
|---|---|---|---|---|---|---|---|
| 1280 | **578.1** | 582.1 | +4.0 | 336 @ 903 | 340 @ 899 | 35.9 | 27.9 |
| 1440 | 727.8 | 731.8 | +4.0 | 336 @ 1057.9 | 340 @ 1053.9 | 36.0 | 28.0 |
| 1512 | **795.3** | 799.3 | +4.0 | 336 @ 1127.6 | 340 @ 1123.6 | 35.9 | 27.9 |
| 1920 | 884.0 | 888.0 | +4.0 | 336 @ 1376 | 340 @ 1372 | 36.0 | 28.0 |

The pack states 796 at 1512 and 578 at 1280; measured, the reference is 795.3 and 578.1. **Dev is 4px
wider at every width — far inside the 40px red gate**, so §S does not fire.

**What moved the rail's 4px** (ruling 4): one declaration — `.qcv-group`'s
`grid-template-columns: minmax(0, 1fr) 340px; column-gap: 28px` (`qcvPage.css:132`). The reference is
`336px` with a `36px` gap. The three figures sum identically either way — 795.3 + 35.9 + 336 and
799.3 + 27.9 + 340 are both **1167.2**, the desk's width — so dev spends 4px of the gutter on the rail
and 4 more on the list. Building to the reference moves the track to 336 and the gap to 36. `RAIL_W`
(`QcRail.tsx:31`) and `GROUP_GAP` (`:76`) are the JS mirrors and move with it; `RAIL_RESERVE` is
derived (`RAIL_W + RAIL_INSET_X * 2`), so `RAIL_STACK_BELOW` follows for free.

## §0.3 · The court fold

`tileCourt(status)` in `lib/qcSummary.ts`. **Offers count as "with you"** — it folds `Offer` into the
you court because the decision is the writer's. `Withdrawn` and `Signed` return `null` and sit in no
section, so **the three counts do not sum to the total** (13 + 56 + 13 = 82 against 83 rows on the
harness account). Any desk lock asserts the three counts, never a partition.

## §0.4 · What the app can answer for the desk's foot lines

`courtFoot(rows, key, nowMs)` in `lib/qcSummary.ts`, built in v95 §1: the discs are **agents** (so
`+N` counts agents, not queries) in due-date order, capped at four; the right-hand fact is the next
**future** date and is omitted when there is none; closed runs the other way off `stageStartMs`.

## §0.5 · The coming-up derivation — SHARED, so §S does not fire

`comingUp(card, row, nowMs)` in `lib/qcComingUp.ts` turns the **To-do board's own `cardBucket`** into
words. A query reaches its card by `relatedRecordId` via `cardsByQuery(liveBoardCards(cols))`, the
columns coming from `assembleBoardColumns`. The row and the to-do cannot disagree about which query
needs what; only the wording is shorter, because the column is 160px. **This pack writes no new
derivation.**

## §0.6 · What the app records for "what you sent"

`sentRecordOf(query)` in `lib/queryActions/sentRecord.ts` → `how: "package" | "individual" |
"unrecorded"`, plus `packageId`, `edition`, `packageName`, `versions`, `materials`. **"Not recorded"
IS distinguishable** — `how === "unrecorded"` means no send snapshot at all, where an empty
`materialsWanted` cannot tell "we don't know" from "nothing went".

⚠️ **Two cautions carried from v95's mutation run.** The icons treatment is reached by *two* paths —
`how === "individual"`, and `how === "unrecorded"` with materials recorded against the query — so the
three treatments are not `sentRecordOf`'s three answers. And **no query on the harness account is
`how === "individual"`**, so that branch is covered by the unit suite and not by the page.

## §0.7 · The rail's progress-bar inputs

`eyeProgress`, `barEnds` and `barTone` in `lib/qcBirdsEye.ts`, over `stageHistory` (the query document
first, the feed only for stages the document does not date) and `expectedFor`. **Statuses with no next
date:** any agent's-turn query whose agency states no `responseTimeWeeks`, and any writer's-turn query
with no `expectedSendDate` — `agentWindowMs` returns null rather than inventing a house default, so
the bar draws an empty track and the row says so.

## §0.8 · Filtered to nothing

Nothing special: `listGroups` returns `[]` for an empty row set and `QcList` maps over the groups, so
the page renders its head and its column labels over **an empty body — there is no "nothing matches"
state at all**. With v96 dropping the labels it would be the head, the band and blank space. Reported,
not fixed: the pack does not ask for one.

## §0.9 · Other sessions

Ten peers, all idle; none is the Birds-eye or Query Centre session. §4 proceeds.

---

## One reversal to flag before it is built

**§4 names two rail groups — *Overdue* and *Upcoming* — and the reference draws exactly those two.**
Its header still counts a third (`18 OVERDUE · 3 UPCOMING · 2 WAITING`) but no `Waiting` section is
rendered.

v95 drew **three**, deliberately, and CLAUDE.md records why: dropping `watch` empties the rail for the
writer whose pipeline is healthiest — **21 of 69 on the harness account are in it today**, and a
writer with nothing overdue and nothing upcoming would get a rail with a header and no body.

The pack's rule is that the reference wins and I say so, so **I am building two** — and saying so
here, because it reverses a recorded decision and the cost falls on the calmest accounts. One line to
put back if you want it.
