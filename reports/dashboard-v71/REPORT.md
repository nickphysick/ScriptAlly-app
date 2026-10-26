# Dashboard v71 — the desk header, the cycling task card, the founding card's feedback flow

Branch `dashboard-v71`, off `main` at `8ce3d91f` (level with `origin/main`: 0 behind). Ref
`design-refs/dashboard-v71/` (the HTML and 13 PNGs, every SHA256 verified, enrolled in the refs
manifest). Five parts, one commit each:

| Part | Commit | What |
|---|---|---|
| A | `d5d266f1` | the header becomes the desk-ink title panel |
| B | `ec6ec722` | the layout: two columns, two cards on the right, bottoms in line |
| C | `c679c25f` | the task card: one card, cycling through the writer's tasks |
| D | `e15254ce` | the founding writer card: pink, navy band, ask → noted → sent |
| E | _see the tail_ | fit, the DB71 locks, the retired and rewritten locks, this report |

## False premises

1. **`sendWeeklyPulse` is not deployed on dev.** §0.5 asked me to confirm it was.
   `firebase functions:list --project scriptally-dev` lists `extractFromEmail`, `sendBetaFeedback`,
   `smartImportMap` and `waitlist`, and nothing else. On dev today a face press therefore fails, and
   the card correctly stays on Ask and says "That didn't send. Try again?". The F2 lock answers the
   callable itself, as v59's P3 did. **Deploying the callable (and the `betaPulse` rules) on dev is
   Nick's call; this pack was told not to touch `functions/**`.**
2. **"The same items the focus card held" and the reference disagree.** v59's focus card stepped
   through the plan's FIRST group only (`focusOf`). The reference's card reads "1 OF 9" and goes from a
   nudge to "Then: send your partial…", which crosses groups. I took the reference's reading: the
   card walks **every item the plan shows, in the plan's order** (`plan.items`: agents waiting, then
   worth a nudge, then gone quiet, then housekeeping; or ready to query; or coming up). On the harness
   account that is 34 items. If Nick wants the first group only, it is one line (`plan.items` →
   `plan.groups[0].items`) in `Dash71Task`.
3. **The shell's desk token is `--ink-shell` (#1b2433), not the reference's #1d2432.** The header
   reads the token, and the H1 lock compares the panel with the token's computed value.
4. **The reference's header buttons are 40px tall at 1512 and its panel padding is `12px 26px 13px`.**
   The prompt says 44px (40 at 1400 and under) and `16px 28px 18px`; the prompt's values are built.
5. **The reference's dashed step chip is 1px; the prompt says 1.5px.** 1.5px is built.
6. **"The tab must be on screen at the shell's minimum width"** — at 768px the page flows (v58's
   step below 1100); the tab is still in the sheet and still on screen. L3 measures it at 768×800 too.
7. **The feedback dock unmounts when it closes**, so "the same `FeedbackDock` element" across two
   openings is not something a DOM can show. F2 asserts that each door opens FeedbackDock's own
   panel and that there is never a second one in the document.

## §0 Recon

### 1 · What survives, what moves, what retires

| v58–v60.1 part | v71 |
|---|---|
| Header: title page, eyebrow (the sidebar's status), byline | **kept**, recoloured on a desk-ink panel |
| Header: the three buttons | **restyled**: icon first, cream primary, two ghosts; below 1200px the ghosts are icon-only |
| Header: "Where do I start?" (first use only; it does not show when querying) | **kept** in the button row, restyled as a ghost on the ink |
| `Dash60Left`: the chart (`OneScreenChart`), Closed hoop, Agents hoop | **kept as built**; the grid around them changes |
| v60's hoop-need column floor (`--d60-hoop-need`, its CSS rule and the page's measurement) | **retired**: v71's `1.72fr 1fr` grid replaces it |
| Right column: "What's on the list today?" title row | **retired** (querying) — still used by "Ready for lift off?" before the first query |
| Right column: "All {n} →" | **retired** |
| Right column: the focus card (`d58-focus`: band, ‹ ›, timeline stages, rust edge, "View task →") | **replaced** by the task card; `Dash58List.tsx` deleted |
| Right column: the hairline | **retired** while querying; kept before the first query |
| Right column: the coming-up "Add an agent / Discover agents" pair | **retired** (it sat between the focus card and the hairline) |
| `Dash59Panel` (history dots, "This week?", the two-sentence note) | **replaced** by the founding writer card; deleted |
| The page's "tight" measurement (the timeline gave way before the panel's sentence) | **retired** with the timeline it measured |
| The feed tab, the feed drawer, the hawk's shadow | **unchanged** |

### 2 · The tasks

The focus card's items came from `lib/dashList` (`dashList()` → `listPlan()`), composed from:

| Group | Source | Kinds (board `taskType`) | `item.action` | "View task →" lands on |
|---|---|---|---|---|
| Agents are waiting (`req`) | the To-do board (`assembleBoardColumns` → `todoRows`) | `partial_requested`, `full_requested`, `revise_resubmit`, `offer_send_full`, `offer_received`, `offer_tell` | the drawer door (`drawerDoorForTask`) | **that query in the query panel** (`openQueryPanel`) |
| Worth a nudge (`nudge`) | the board | `nudge_overdue` | the drawer door | that query in the query panel |
| Gone quiet (`quiet`) | the board | `no_response_close` | the drawer door | that query in the query panel |
| Housekeeping (`house`) | the Contact list's gaps (`hkModel`) | one per gap kind | the agent card's editor | **the agent card**, at the gap |
| Ready to query (`ready`) | the Contact list's next step | — | log drawer, agent prefilled | **the log drawer** |
| Coming up (`coming`) | the Query Centre's clock | — | response drawer | that query in the query panel |

Every landing is unchanged: the card calls the page's existing `viewTask`. The board's items now
carry their `taskType` (one optional field on `ListItem`) so the card can tell which send it is.

### 3 · The reply window

- **Sent date:** the Query Centre row's `stageStartMs` (the day the query reached the stage it
  stands at — for a waiting query, the last send), falling back to `sentMs`. Both come from
  `buildQcRows` → `stageHistory`, which reads the query document's own dates first.
- **Expected date:** the row's `expectedMs` (`expectedFor` → `resolveExpectedDate`: the agent's
  stated window from the last send, or a date the writer or the agent gave).
- **Close threshold:** the app HAS one — `taskPrecedence.replyTask`, the To-do board's rule.
  Read back as a date (`closeThresholdMs`): the writer's "Consider closing" plan (`closePlan`) when
  there is one; for an agent whose silence is a stated pass, the expected date plus the 14-day grace;
  otherwise the earlier of a nudge ignored for another full window and the hard ceiling
  (`closeAfterDays`: max(2 × window, 90 days) after the original send). The marker's words are
  "CLOSE AFTER {n} WKS PAST", n being that date less the expected date in whole weeks.

### 4 · The feedback panel

`Dash59Panel` opened `FeedbackDock` through `lib/feedbackStore.openFeedback()`; `AppShell` mounts
the one dock and subscribes. **The dock already reported a send** — `FeedbackDock` takes an
`onReceipt` prop and calls it after a successful send — but `AppShell` passed a no-op. The smallest
hook: `feedbackStore` gains `notifyFeedbackSent` / `subscribeFeedbackSent`; `AppShell`'s
`onReceipt` calls `notifyFeedbackSent()`; the Dashboard subscribes. Nothing in the dock's form, copy
or callable changes, so this did not need a stop.

### 5 · The pulse

**Not deployed on dev** (false premise 1). The page reads this week's `betaPulse` document through
`readWeeklyPulse` (now for this week only — the dots are gone); on dev that read is refused by the
undeployed rules and the card falls back to the local echo, as v59 did.

### 6 · First-run states

Confirmed: day one (no agents, no queries: the two doors, "Ready for lift off?", "Where do I
start?") and agents-no-queries (the coverage snapshot) are v60.1's and unchanged, apart from the
header's ink and the founding card, which is the same card at the column's own height (the art may
grow to 118px).

### 7 · Locks retired or rewritten

| Lock | Disposition |
|---|---|
| DB59 R1 (title row, "All {n} →", hairline, no rows) | **retired** — DB71 L1 asserts their absence |
| DB59 R2 (the focus card's rust edge) | **retired** — the task card's head is tinted by kind (DB71 C1) |
| DB59 V1 ("View task →" lands, writes nothing) | **rewritten** onto the task card; the button text stays "View task →" |
| DB59 P1 · P4 (the panel's copy; one feedback panel) | **retired** — DB71 F1 (copy) and F2 (doors, one panel) |
| DB59 P2 (the panel's height tiers) | **retired** — DB71 F3 |
| DB59 P3 (the pulse, Noted only on a yes) | **retired** — DB71 F2 |
| DB59 F1 (one screen) | **kept**, split out of the R1 · F1 · P2 test |
| DB59 S2 (a hovered card comes forward of the shadow) | **re-pointed** from the focus card to the task card |
| DB59 E1, L1 | **re-pointed** (`focus-next` → the card's ›; "focus" → the task card) |
| DB59 shots | **retired** — DB71 writes its own (`DB71_SHOTS=1`) |
| DB58 R1 (the right column has no container) | **retired** — DB71 L1 |
| DB58 R2 (the fixed order) | **rewritten**: the card's FIRST item is the first group's, its count is every item shown, › steps on (the card now carries `data-group` and `data-counts`) |
| DB58 F2 "tab clear of the title" | **rewritten** to "tab clear of the task card" (the title is retired; DB71 L2 holds the 14px) |
| DB58 F2/L1 "focus" clip, escape and loading-box readings | **re-pointed** to the task card |
| DB60 P1 "right follows the predicate" | **rewritten**: while querying, the task card and no list title |
| DB60 P10 the panel's floor | **rewritten**: while querying, 194px (128 at ≤760 tall); before the first query, v60's floor |
| DB60 P10 (loading) boxes | "focus" **re-pointed** to the task card |

## Locks — DB71 (`tests/e2e/dashV71.measure.ts`)

Every lock states its population first. Readings are in `reports/dashboard-v71/ledger/`.

**Red first, on the untouched `main` build** (`8ce3d91f`, served from a detached worktree): all eight
DB71 tests fail — H1 (no ink panel: `rgba(0, 0, 0, 0)` against the token's `rgb(27, 36, 51)`, a navy
primary, 42px buttons), L1 (`list-head>focus>rule>panel`, the title present), L2/F3 (no founding card to
measure), L4, C1–C3 and C5 (no task card: population `{}`), C4, F1–F2. The page-level readings inside the
fit test that a pre-v71 page also satisfies (G1's one screen, L3's tab on screen) are proved by their
named mutations instead.

**Green, on the branch:** all nine tests (the auth setup and the eight lock tests).

**Red by each lock's named break** (`DB71_MUTATE=<name>` for the in-page ones; C4, C5 and F2 are code
changes made in the worktree, rebuilt, measured and restored from a path-derived backup —
`reports/dashboard-v71/mutation-proofs.jsonl`):

| Lock | Break | Reading under the break |
|---|---|---|
| H1 | `H1-white` | 4 red · 1512x900 the panel's background is --ink-shell — rgb(255, 255, 255) vs token rgb(27, 36, 51) |
| L1 | `L1-title` | 3 red · exactly the task card, then the founding card — list-title>task-slot>fw-slot · task true · fw true |
| L2 | `L2-fw-172` | 18 red · 1920x1080 the three bottoms are equal (±1) — 1023.8 / 1023.8 / 1001.8 |
| L3 | `L3-tab-off` | 20 red · 1920x1080 the tab is inside the viewport — {"l":1915.96875,"r":2112,"t":1038,"b":1072,"w":196.03125,"h":34} |
| L4 | `L4-clip` | 6 red · 1512x900 closed: 6px under its edge is darker than the ground 30px down — x 482 · 242,238,232 vs 242,238,232 |
| C1 | `C1-close-title` | 1 red · close title — "Close Priya Nair?" vs "Close your query to ?" |
| C2 | `C2-solid` | 4 red · nudge the solid part ends at the expected date (±2px) — 1421.0 vs 1278.7 |
| C3 | `C3-solid` | 1 red · the step still to do is dashed and unfilled — {"todo":true,"style":["solid","solid","solid","solid"],"bg":"rgba(0, 0, 0, 0)","text":"Full sent —"} |
| C4 | `C4-ignore-hover` | 2 red · hovered for 10s, it holds — 2 → 3 |
| C5 | `C5-write` | 3 red · nudge nothing written — the query changed |
| F1 | `F1-copy` | 1 red · Ask heading and line — "The early bird gets the worm." · "Your feedback is gratefully received!" |
| F2 | `F2-noted-early` | 4 red · nothing says Noted before the call resolves — {"state":"noted"} |
| F3 | `F3-art-140` | 6 red · 1288x660 nothing leaves the frame — IMG |
| G1 | `G1-hoops-320` | 3 red · 1288x660 one screen: no vertical scroll — {"sh":618,"ch":546,"sw":1010,"cw":1010} |

Two findings from proving them:

- **G1 first went GREEN under its own break.** With the chart's row at `minmax(0, 1fr)`, a 320px hoop row
  simply crushed the chart and the page still read as one screen. The chart's row now has a 140px floor
  (the smallest measured chart card is ~150px, at 1280×650), so too much below it overflows and is
  caught. That is a layout fix the lock found, not a test change.
- **F2's break first made the test HANG, not fail** — an unbounded click waited five minutes for a face
  that the break had removed. Every press in that test is now bounded and a missing control is a recorded
  red.
- C5's break writes `personalisationNotes` on press; the test restores each query it touched in the same
  run (`seed-pkgq-2`, `cor-move-b`, `rj-dupe`: all restored).

The C1 population on the harness account: 34 items — 11 nudge, 8 close, 9 send, 6 other.
