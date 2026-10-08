# Query Centre v132 — report

Branch `qc-v132`, four commits, deployed to dev from the branch. Not merged to `main`.

Reference: `design-refs/query-centre/query-centre-v132.html` and the eleven PNGs in `design-refs/qc-v132/`.
Locks: `tests/e2e/qcV132.measure.ts` (R1–R3, R5, W1–W10) and `src/lib/qcRecent.test.ts` (R4).
Screenshots: `reports/qc-v132/shots/`, at 1280 and 1512, named for the reference PNG each sits beside.

## 1. False premises and things the brief did not match

1. **The list has one filter value, not facets.** `QcFilter` is a single value and no sectioned filter panel exists. Ruled: pills and chips are one-at-a-time choices over it. W3's AND clause is withdrawn.
2. **"Due this week" and "Materials" have no filter.** Ruled: dropped, not built.
3. **`SORT_BY_OPTIONS` is the Birds-eye drawer's.** The list sorts by its own `SORT_OPTIONS`. Ruled: the control reads "Sort: {short}" and the direction button is dropped.
4. **Four statuses had no verb.** Ruled: R&R "asked for a revision", Resubmitted "has your revision", Signed "signed with you", Withdrawn "no longer has your query". All four are locked in `qcRecent.test.ts`.
5. **"Your move" as the `you` filter leaves offers out.** Ruled: the pill is `court:you`, so it matches the desk's With you number (13 on the harness account, where `you` gives 12).
6. **No list memory existed to add density to.** Density persists alone, in `localStorage["sa.qcList.v1"]`, validated on restore.
7. **The default grouping is "No grouping", which draws two bands** (Your move, Everything else) by the 3 Oct ruling. The four court-coloured bands appear under Grouped: urgency.
8. **No derivation of a package's contents existed.** `sentCell` in `lib/qcRowLines.ts` is new (§2.2).
9. **The reference's 1280 frame has no sidebar.** Its panel is about 1,176px wide. In the app at 1280 with the sidebar open the panel is about 964px, so with two fixed 284px columns the Agent and "Where it stands" columns are about 136px each: a long status wraps to two lines and long names end in an ellipsis. See `shots/ws-1280.png`. **This needs a decision** (§6).
10. **The reference PNGs fall back from Special Elite to a monospace**, so their typewriter text is wider than the app's.
11. **"+ Add" has no materials step to open.** It opens the edit drawer, which is where "what you sent" is recorded today.
12. **A package chip cannot open its package.** There is no per-package link, so it opens the Submission packages page.
13. **The YOUR MOVE stamp now shows inside the Your move band** (brief §3). This reverses v131's QC13, which is retired.
14. **`comingTone` has no reader left in the product**, but its tests are in `qcDesk.test.ts`, which is off limits. It stays.

## 2. §0 findings

### 2.1 Overdue

The workspace's overdue pill and chip use `pastExpected` (the `past` filter): a query with the agent whose expected reply date has passed. This is the predicate behind the desk's "responses overdue" line. W2 reads the number off the desk and compares: 34 and 34 on the harness account.

### 2.2 What a package contained

A package send lights its tiles from the **edition that went** (`sentPackageEdition`, through `editionsOf` / `contentsOf`), not from the package as it is now. A sample sent later on request lights the sample tile and says "on request". Where a send names a package that is no longer on file, the chip still shows, its popup says "This package is no longer on file", and the four tiles read "Not recorded" (never "Not sent"). The harness account has such sends; W6 tallies them.

### 2.3 Verbs

Every `QueryStatus` has a verb in the "Also moved" panel (`qcRecent.ts`) and a dating verb in "Where it stands" (`STAND_VERB`). Both tables are locked over `Object.values(QueryStatus)`, so a new status fails until it has both.

## 3. Locks retired, re-pointed and rewritten

Full reasons are in `tests/e2e/RETIRED-query-centre-v132.md`.

**Retired:** `qcV126` QC126-5 · `qcV131` QC7, QC9, QC10, QC11, QC12, QC13, QC14, QC16 · `qcV1311` D7 · `qcV96` QC8.

**Re-pointed, claims intact:** `qcV126` QC126-6, QC126-7, QC126-20 · `qcV131` QC1 (the 96px gap, now to `ws-head`), QC8 · the openers of `qcV131` and `qcV1311` · `qcV96` QC4, QC6.

**Rewritten:** `qcV96` QC12 (a closed row's tray is Edit alone) · the skeleton case in `qcList.test.tsx`.

**Red before this pass and not touched:** `qcV126` QC126-2 (reads `a17.css`) · `qcV131` QC15 (its capture file is absent).

## 4. Contact list pieces built a second time

`src/components/agents/**` is another session's, so these were built beside theirs rather than lifted:

| Query Centre | Contact list | 
|---|---|
| the ink bar, pills and controls (`QcWorkspace.tsx`) | `YourAgentsBar` |
| the filter strip | `ContactFilterStrip` |
| `CountTo` (the live count) | `CountTo` in `ContactTouches` |
| the density switch and `qcListMemory` | density in `ContactTouches`, `contactListMemory` |
| the keyboard card and `useQcListKeys` | the key sheet and row keys in `ContactTouches` |
| the dead end (`QcDeadEnd`) | the Contact list's dead end |

Shared, not duplicated: `shell/listTable` (`ListLabels`, `useStuckPast`), `QcMenu`, the shortcut registry and the escape stack.

## 5. Each lock, red and green

Every lock was run red under its named mutation, then green on the restored build. Red readings are in `mutation-proofs.json`.

| Lock | Claim | Mutation | Red reading | Green |
|---|---|---|---|---|
| R1 | the featured card and the panel sit as drawn | panel offset from the card | "panel starts 318 right of the card" | pass at 1280, 1512, 1920 |
| R2 | choosing a desk section never filters the list | the desk sets the list's filter | "you: the list is untouched" | 83 rows before and after |
| R3 | "See all N" is the list's own count | count taken from the section | "See all 13" against 83 | "See all 83 in the list" |
| R4 (unit) | "this week" is seven days | window widened to 14 | unit red | 7 |
| R5 | featuring a row changes the rows | featured row not removed | "the rows do not change when one is featured" | pass |
| W1 | the hawk overhangs the bar unclipped; 96px gap | `overflow: hidden` on the page | "the hawk is clipped by qcv-page qcv-own qcw" | pass |
| W2 | the pills are the desk's numbers | pill counts `you` | 12 against 13 | 13 = 13, 34 = 34 |
| W3 | one strip line, one choice, Clear all | Clear all keeps the filter | "Clear all leaves nothing pressed" | pass |
| W4 | four bands, named and toned | old label kept | "Gone quiet" against "Past the date" | pass |
| W5 | one label row, shadow only once stuck | shadow at rest | shadow present at rest | "none" at rest |
| W6 | a slot and four tiles on every row, on one grid | add slot at its own width | "a add slot is 57 wide" | within 0.5px |
| W7 | popups are ours, never a native title | `title` on a tile | native title "Covering letter: Sent 7 Sep" | none |
| W8 | the tray never covers "What you sent" | tray widened | tray −53px against sent | 8px or more clear |
| W9 | keys stand down while typing | J bound while typing | Find reads "" for "jk" | "jk" |
| W10 | loading frames do not move | row placeholder shortened | row 54.6 → 74.6 at 1512 | 0px tops at all widths |

W10 compares row height at 1512 and 1920 only. At 1280 a loaded row wraps (§1.9), so it is taller than its placeholder; the tops still match.

## 6. For Nick

1. **The 1280 squeeze** (§1.9). Options: narrow the two fixed columns below about 1,000px of panel; fold the dated lines; or accept the wrap.
2. **"+ Add"** opens the edit drawer. A materials step in the drawer would be a query-actions change.
3. **The package chip** opens the packages page, not the package.
4. **`comingTone`** can be deleted once `qcDesk.test.ts` is in scope.
5. **Five pieces are now built twice** (§4). They are lift candidates into `shell/`.

## 7. Gates

- `tsc --noEmit`: 0 errors.
- Production build: clean, no CSS warnings.
- Vitest: 538 files, 8,443 passed, 3 skipped (baseline 535 / 8,417 / 3).
- e2e, Query Centre suites on the Phase 4 build: 50 passed, 21 skipped (the retired cases), 2 failed. The two failures are QC126-2 and QC15, both red before this pass (§3).

## 8. Follow-ups after review (8 Oct)

One commit on `qc-v132`, after merging `origin/main`.

### 8.1 The merge

`origin/main` at `a0900cbe` (Contact list v15, phases 1 to 3 of 6) merged into `qc-v132`. One conflict, in `design-refs/.refhashes.json`: both sides added refs at the same place. Both are kept; the ref check passes (172 refs). No source file conflicted.

### 8.2 What changed

1. **The narrow panel.** Under 1100px of workspace panel the package chip is its 34px box, the slot is 34px on every row, and Next move is 220. Agent and Where it stands take the freed width.
2. **Two things the brief's three changes did not cover, found by measuring:**
   - The longest tray (an offer's action, Edit, Close) is 258px, wider than a 220px cell. In the narrow panel Edit and Close are icon buttons; each keeps its accessible name.
   - "Revise & resubmit" with its YOUR MOVE stamp is 226px and the status column was 208. The two text columns are now 0.96fr / 1.04fr there, with slightly tighter type (status 15px, name 16.5px, stamp padding).
3. **Urgency is the default grouping**, remembered beside density in `sa.qcList.v1` under version 2. A version-1 record is refused whole, so a device that had chosen Compact starts at Comfortable once.
4. **"+ Add"** is drawn as a plus alone in the narrow panel.

### 8.3 W12

At 1280 with the sidebar open (panel 982px, 83 rows, 18 package chips): every status and dated line is one line, no agent name is cut, every slot is 34px, the first tile shares one x, the chip shows its box alone with the name as the popup title, the default grouping is Urgency, and a chosen grouping survives a reload. All rows are 73px.

| Mutation | Red reading |
|---|---|
| remove the breakpoint | "Tobias Hark: the status is one line", 2 against 1 |
| default grouping back to No grouping | "the default grouping": "Grouped: none" |

Green on the restored build. W10 now compares row height at all three widths (74.6 → 74.6 at 1280).

### 8.4 Gates on the merged branch

- `tsc --noEmit`: 0 errors (root and `functions/`).
- Production build: clean.
- Vitest: 538 files, 8,440 passed, 3 skipped. `origin/main` alone in a throwaway checkout: 534 files passed, 8,404 passed, 3 skipped, plus `functions/src/email.test.ts`, which could not load there (no `functions/node_modules`). The branch adds three test files.
- Query Centre e2e: 49 passed, 21 skipped, 4 failed on the first run. Two are QC126-2 and QC15, red before v132. The other two were W2 and W4, which read counts that another session was changing on the shared account during the run (overdue read 35, 37 and 39 in three consecutive runs). W4 passed on re-run unchanged. W2 now reads the desk and the list in one instant, passed twice, and was re-proved red.
- Contact list e2e (`contactV11`, `V13`, `V14`, `V15`): 40 passed, 2 failed on the first run. CL13-10 clicked the centre of a Query Centre row, which is now the "+ Add" slot; it is re-pointed to the agent's name and passes. CL15-5b passed on re-run unchanged (the same shared-account seeding).

### 8.5 Shots

`shots/ws-1280.png` and `shots/ws-1512.png` show the workspace top grouped by urgency. All eighteen shots were retaken on this build.
