# Query Centre v95 — §0 recon

Worktree `/tmp/sa-qc95`, branch `qc-v95`, HEAD `a5770cdd` — **already the pushed tip**
(`origin/main`), and it contains the whole of Living headers v3 (`c5cc0d59` → `a5770cdd`),
including `6e370fdf` "Query Centre — already living since v1". Local `main` in the shared
checkout is at `bf297633`, which is an *ancestor* of my HEAD, so there was nothing to rebase onto.

Reference hash verified: `4304009916dbe1632f04704d083814cc29221c649bd291f129ff36eae56ccf79`
matches, enrolled in `design-refs/` (104 refs guarded).

**Baseline, recorded before any edit:** `tsc` 0 errors · `vite build` clean (no `error`/`[WARNING]`
beyond the expected chunk-size note) · Vitest **8,225 passed / 510 files**.

---

## False premises — named first

**1. The three courts do not sum to the total, so QC2 cannot assert a sum.**
`tileCourt()` returns `null` for `WITHDRAWN` and `SIGNED` — those queries are in **no** section.
Measured on the harness account at the tip: **With you 13 · With the agent 56 · Closed 13 = 82,
against a stated 83 queries and 83 rendered rows.** One query is uncourted. The brief's
"the desk still says 4 / 19 / 4" with 27 queries reads as a partition; it is not one. I will build
the lock as *the three counts are the unfiltered court counts* (and that they do **not** follow the
filter), never as *they add up to the title*.

**2. "Group = urgency … the grouping rule is the Birds-eye view's" contradicts the brief's own
headings, and the reference sides with the headings.**
The expanded view's Group option **labelled "Urgency"** is `attention` → `attentionGroup()` →
**Overdue / Upcoming / Watch and wait** (`ATTENTION_LABEL`). The reference renders
**Your move / Waiting on agents / Gone quiet** with the glosses §2 quotes verbatim. They are
genuinely different partitions: a with-you query whose date has gone is `overdue` to the expanded
view and *Your move* to the reference; an agent's-turn query 60 days into a 16-week window is
`watch` to the expanded view and *Waiting on agents* to the reference.
Per the brief's own tie-break the **reference wins**: I will group on `tileCourt` + `pastExpected`,
both existing derivations, so no new rule is written. **The consequence, for your call:** the
list's "urgency" and the expanded view's "Urgency" will then be two different partitions of the
same word. Unifying them means editing the expanded view, which §7 fences, so I am not touching it.

**3. "the rail's bars-with-today-line all go" — the today line went on 24 September.**
v65.3 already replaced it with `eyeProgress()` progress bars (your decision 1 of that pack: the
shared vertical axis meant every bar had to be shifted so its own date sat on it). §4 is therefore a
re-dress of bars that exist, not a replacement of a due line: what it adds is the key line, the 10px
height, the mono end labels, the distance on the name line, the dateless *add*, 13px rows and the
foot line.

**4. The reference cannot answer what Group = urgency does with a closed query** — its four demo
rows are hand-placed and none is closed. I will draw a fourth **Closed** group, and only when it has
rows, which is what every other grouping in `groupRows` already does (`.filter(g => g.count > 0)`).

**5. The reference's folds are viewport media queries; in this app that is wrong when the sidebar
collapses.** See §0.2 below.

---

## 0.1 What is there now

| Thing | Component | Sheet |
|---|---|---|
| The three court tiles | `queries/centre/QcCourts.tsx` (`QcCourts`, `QcCourtsSkeleton`); probes `courts`/`court`/`court-band`/`court-count`/`court-fact` | `qcvCourts.css` |
| "All 27 queries ⌄" bar + Filter/Sort | `queries/centre/QcSentence.tsx`; probes `sentence`/`pk-filter`/`pk-sort` | `qcvPage.css` |
| The row card | `queries/centre/QcList.tsx` (`QcList`, `QcListSkeleton`); probes `list`/`row`/`row-chip`/`row-stand`/`row-date`/`row-sent` | `qcvList.css` |
| Rail frame, header, tabs | `queries/centre/QcRail.tsx` | `qcvRail.css` |
| Rail rows + bars | `queries/centre/QcBirdsEye.tsx` | `qcvBirdsEye.css` |
| Everything / With you / With the agent | `EYE_FOCUS` + `eyeFaded` in `lib/qcBirdsEye.ts` | — |

All five are composed by `Queries.tsx` (lines 6465–6616) and laid out by `QcCentre.tsx`.
`QcCentre` already puts `PageHeader` across **both** grid tracks with the rail starting in the row
below it, so the hero is already 1167px — the full column — and §1 needs no change to it.

## 0.2 The page, measured — **the red gate passes at 4px**

App (`npm run build:dev`, served on 127.0.0.1:4411, sidebar at rest) against the reference opened at
the same viewport:

| Viewport | app main column | reference row | delta | rail (app / ref) | gutter |
|---|---|---|---|---|---|
| 1280 | **582** | 578 | +4 | 340 / 336 | 28 |
| 1440 | **732** | 728 | +4 | 340 / 336 | 28 |
| 1512 | **799** | 795 | +4 | 340 / 336 | 28 |
| 1920 | **888** | 884 | +4 | 340 / 336 | 28 |

Uniformly 4px, and the whole of it is the rail: the reference draws 336 where the app has 340. At
1512 that is **3–4px against a 40px gate**. The reference reproduces this app's frame exactly —
248px sidebar (confirmed settled by the sidebar session: `--shell-side-w` 248, collapsed 68), the
same 1360 content cap at 1920, the same x offsets (289 / 294 / 296 / 456). **So the rows are built
to the reference's own column widths unchanged.**

Vertical arrangement, from the reference at 1512: hero `.hd` y 92 **w 1167** → `.desk` y 381
**w 1167** → `.lhead2` y 552 **w 795** and `.rail` y 552 w 336 side by side. So **the desk is a
full-column band** like the hero, and the list and the rail are the two columns beneath it. In the
app that is one more full-span row in `.qcv-group`'s grid, beside the two rules already there.

Row geometry at 1512: `34px 138.25px 110px 112px 159px 160px`, gap 10, padding `13px 16px`,
height 80, radius 12, two shadows, no border — i.e. the brief's `1fr`/`1.15fr` exactly
(138.25 : 159 = 1 : 1.15). Desk sections: three equal `388.4px`, `18px 22px 16px` padding, numeral
Special Elite 64/57.6. The hover tray `.qa` is `position: absolute; right: 16px; top: 40px`,
274px wide, `opacity` 0 → 1 — so it cannot move the row, which is QC6's claim by construction.

**The folds.** The reference uses `@media (max-width:1460px)` (hide Queried, reveal the inline
`ago`) and `@media (max-width:1366px)` (hide What-you-sent), confirmed by its rendered templates:
four tracks at 1280, five at 1440, six at 1512 and 1920. In this app the row's width depends on the
**sidebar state** as well as the viewport — collapsing it gives the row 180px more — so a viewport
query hides Queried at a 1440 viewport on a row with ample room for it. I will put the folds on a
**container query over the row's own width**, with the thresholds derived by measurement from the
reference's two viewport values, and lock **both**: the reference's rendering reproduced exactly at
1460/1366 with the sidebar at rest, *and* the collapsed-sidebar case a viewport query gets wrong.

## 0.3 The court fold

`tileCourt(status)` in `src/lib/qcSummary.ts:233`, over `courtOf`. **Offers count as "with you"**
(`c === "you" || c === "offer"` → `"you"`), exactly as the brief says. `WITHDRAWN` and `SIGNED`
return `null`. `isWithYou` is a different and narrower question (material owed) and is untouched.

## 0.4 What the app can answer for the desk's foot lines

Everything asked for, from `QcRow`:

- **the agents in a court, in due-date order** — `row.initials` (`agentInitials`), ordered by
  `row.expectedMs`; `dueCell(row, nowMs)` gives the formatted date, the distance, its kind and
  whether it is urgent, and is already shared by the rail and the expanded view so the desk cannot
  disagree with them.
- **next thing due from you** — the with-you rows' earliest `expectedMs` (`expectedKind` `sendBy`,
  or `offer` for the one offer).
- **next reply expected** — the agent's-turn rows' earliest future `expectedMs` (`kind: "reply"`).
- **last closed** — `history.currentStartMs` (`row.stageStartMs`), the day the query reached the
  closed stage. **Not `lastMs`**, which is `max(last activity, lastStatusChange, dateSent)` and so
  moves whenever anyone adds a note to a closed query.

An undated row contributes no date rather than a guessed one (`dueCell` returns `"—" / "No date"`).

## 0.5 The coming-up line — the shared derivation, named

**There is one, so §S does not apply.** The To-do list's item for a query is:

```
tasks (derived in DbProvider)  →  assembleBoardColumns()   src/lib/todoColumns.ts:411
  →  BoardCard  →  cardBucket(card)                        src/lib/todoBuckets.ts:56
  →  taskDeed(card, partial)                               src/lib/todoBuckets.ts:145
     exposed to the list as listDeed(RowInputs)             src/lib/taskListRow.ts:58
```

`cardBucket` keys on `card.taskType` → `send` · `decide` · `chase` · `close` · `fix` · `note`, and
`taskDeed` is the sentence the list row prints ("Send your partial", "Reply to the offer",
"Worth a nudge", "Consider closing", "Fill in what you sent"). The ticket grid's short verb is
`ticketVerb(card)` (`lib/ticketFacts.ts:95`) off the same bucket.

**A query reaches its card by `BoardCard.relatedRecordId === query.id`** — the same key
`queryTaskBadge(tasks, queryId)` uses, which `Queries.tsx` already imports and calls. Every input
`assembleBoardColumns` needs (`tasks`, `userTasks`, `queries`, `agents`, `manuscripts`, `taskFlags`,
`activities`, `mutedTaskRules`) is on the Db context this page already consumes. I will build the
board once in a memo, index by `relatedRecordId`, and read the bucket — **reading the derivation,
not writing one**, as §7 requires.

Two things to be honest about:

- **`nextAction()` in `lib/qcCalView.ts` is a *different* derivation** — it keys on the query's
  status and dates, not on a task flag, and names seven groups (offer/revision/full/partial/nudge/
  close/wait). Its vocabulary is much closer to the reference's Coming-up strings. It is **not** the
  To-do list's, so QC7 forbids using it for the verb; it stays where it is, driving Group = next
  action.
- **The To-do list does not have an item for every live query.** A task can be snoozed, dismissed or
  muted by a `taskFlag`, and a query in an agent's window raises nothing at all. QC7's "for every
  live query" will therefore be asserted as *for every live query that has a to-do item, the verbs
  agree* — and the count of rows checked will be printed, so a run that matched nothing fails
  instead of passing.

The **timing** half of the line (*in 7 days*, *13 days over*) is not the To-do list's; it comes from
`dueCell`/`dayCount`, which is where the rail and the expanded view already get it.

## 0.6 What the app records for "what you sent"

`sentRecordOf(q)` in `src/lib/queryActions/sentRecord.ts:45` is **the one reader**, and it supplies
the migration's defaults so an unmigrated query reads exactly like a migrated one. It returns
`how: "package" | "individual" | "unrecorded"`, plus `packageId`, `edition`, `packageName`,
`basedOnId`/`basedOnEdition`/`changes`, the readable `materials` summary, `versions`,
`correctedAt`/`correctedFrom` and `inferred`.

The four material kinds are `MATERIAL_SLOTS` = `queryLetter · synopsis · sample · other`
(`lib/queryCardFacts.ts:367`) — exactly the reference's four icons — read through
`cardMaterials(q.materialsWanted)`, which also returns `materialsRecorded`.

**Is "not recorded" distinguishable from "nothing sent"? Yes, and only through `sentHow`.**
`how === "unrecorded"` means there is no snapshot at all — an import, or a query written before
snapshots. `materialsWanted` alone cannot tell them apart: an empty array is both. "Sent nothing"
is not a state the model has — a query has a `dateSent`, so the only honest third reading is
*we do not know what you sent*, which is what *Add* will say.

## 0.7 The rail's progress-bar inputs

Per row: the start is `row.stageStartMs` (the day it reached its current status, from
`stageHistory`, falling back to `row.sentMs` — not a guess, because an agent's-turn expected date
**is** last-send + the agency's window), and the end is `row.expectedMs` with `row.expectedKind`.
`eyeProgress(row, nowMs)` already turns that pair into `{ dated, f, allowance, fill, over }` and
returns `dated: false` when **either** end is missing.

**Statuses with no next date** (`expectedFor`, `lib/qcSummary.ts:112`):

- **every closed status** — `REJECTED`, `NO_RESPONSE`, `WITHDRAWN`, `SIGNED` → `null`, by design.
- **writer's-turn statuses** (`PARTIAL_REQUESTED`, `FULL_REQUESTED`, `REVISE_RESUBMIT`) → only the
  writer's own `expectedSendDate`; absent where they never set one.
- **`OFFER`** → `offerResponseDeadline`; absent where no deadline was recorded.
- **agent's-turn statuses** → `resolveExpectedDate` from the last send and
  `agent.responseTimeWeeks`; **null when the agency states no window** — no house default is ever
  invented.

On the harness account the rail reads **31 overdue · 16 upcoming · 22 waiting** (69 live of 83).

## 0.8 Filtered to nothing

Two states exist already and both are kept (`Queries.tsx` 6596–6616):

- `emptyKind === "filtered"` → `QueryEmptyCard kind="filtered"`, with a line counted over the
  **scoped** set, a "see what's waiting" route and a clear-filters button.
- `emptyKind === "nomatch"` → `.qcv-none` "Nothing matches." + "Show all queries".

The page's own no-queries empty state belongs to the living-headers pack and is not touched.

## 0.9 Other sessions

I **am** the Query Centre session; there is no separate Birds-eye session, and `QcRail`/
`QcBirdsEye` are mine, so §4 proceeds. Nine peers are live; the only one whose work could move the
numbers in §0.2 is **Workspace sidebar redesign**, which landed the sidebar metrics pass two hours
ago. I asked, and it replied: the widths are settled — `--shell-side-w` 248px and
`--shell-side-w-collapsed` 68px are unchanged, everything that pass changed sits inside the 248px
sidebar, and it has nothing pending that moves the main column. Measured at the tip accordingly.

---

## What this means for the build

Nothing in §S fires. The row widths come straight from the reference; the desk becomes a
full-span band in `.qcv-group`'s grid beside the two rules already there; the folds become a
container query with the reference's rendering locked at rest; Group = urgency follows the
reference's three headings off `tileCourt` + `pastExpected` with a fourth Closed group; and the
Coming-up verb reads the To-do list's own `cardBucket`/`taskDeed` through `relatedRecordId`.
