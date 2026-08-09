# Dashboard audit fixes — run report

Eight phases from Nick's review of the deployed build. Run in the order **3, 7, 2, 4, 5, 6** at
Nick's instruction, after Phase 1 landed separately.

**Working method.** A dedicated worktree, `/Users/nickphysick/ScriptAlly-dash`, created at `main`.
The primary checkout held another stream's uncommitted work throughout, and the shared index
repeatedly carried that stream's staged files — every commit here is `git commit --only` by
explicit path, and foreign paths were unstaged (index-only, never touching their working tree)
before each one.

## Commits, and the base each was verified against

| Phase | Commit | Base | Gates |
|---|---|---|---|
| 1 (earlier) | `e16faa4` | `440a652` | green |
| 3 — to-do count reconciliation | `3d7d230` | `f40d38c` | tsc ✓ · 220 files / 3472 tests ✓ · build ✓ |
| 7 — activity feed run collapse | `c73ef83` | `3d7d230` | tsc ✓ · 221 / 3479 ✓ · build ✓ |
| 7b — correction (see below) | `35fc1bb` | `c73ef83` | tsc ✓ · 3481 ✓ · build ✓ |
| 2 — sidebar foot | `76f4899` | `35fc1bb` | tsc ✓ · 3486 ✓ · build ✓ |
| 4 + 5 + 6 — spacing, chart, entrances | `cc1c799` | `76f4899` | tsc ✓ · 3486 ✓ · build ✓ |

`main` moved under this run several times (the To-do and Query Centre streams). Each phase was
verified against the base named above rather than carried forward from a stale point.

---

## Step 0 — the recon, and the one genuine diagnosis

The pack reported **badge 16 vs trio 4 + 26 + 2 = 32** and asked what each counts.

**What they count today.**

- **Sidebar badge** (`ShellSidebar`) — `boardFigures(assembleBoardColumns(...).cols).cards`: every
  live card across To do + Today + Snoozed. The unit is **CARDS**.
- **Dashboard trio** (`OneScreenTasks`) — three independent derivations: `buildOverToYouRows`
  (urgent), `buildHousekeepingRows`, and `yourTasksToday`. The unit is **ITEMS**.

**The measured divergence.** Built a three-task fixture — two `full_requested` tasks from one
agent on one manuscript, plus one for a second agent:

```
DASHBOARD  buildOverToYouRows().length   = 2
BOARD      boardFigures(cols).urgent     = 1
```

The board collapses two requests from one agent on one manuscript into a single card
(`dedupeAgentCards`); the dashboard listed both. Neither is wrong on its own terms, and nothing in
the app said which one the word "urgent" means.

**The fix** is a shared key, not a second reconciliation: `agentCardKey(taskType, agentId, msTitle)`
is extracted from `dedupeAgentCards` and imported by the row builder. It runs **before** the
deadline sort, so the surviving row is the one the board keeps — otherwise the two lists agree on
the count while naming different queries. All three dashboard surfaces that state an urgent number
(attention chip, tasks card, To-do panel) read `buildOverToYouRows`, so all three were fixed at
once.

### ⚠️ FLAG — the baked "badge = urgent only" decision is superseded, and I did not apply it

The pack's baked decision was *"the sidebar badge shows the urgent count only"*, with the
invitation to *"flag in the report if the recon surfaces something that changes the picture"*.
It does.

`lib/todoCount.ts` records that `todoBadgeCount` (= actionable) was **deliberately retired as the
badge** by a later pack, in favour of the cards figure, because the item-unit number *"said 42
beside a page saying fifteen cards: both correct in their own unit, which is exactly the
two-numbers-both-called-To-do fault this file was written to end."*

So changing the badge to urgent-only now would revert a later, documented decision made to fix the
same class of fault the pack is complaining about. **I have left the badge as the cards figure and
reconciled the urgent derivation instead** — which removes the disagreement the pack actually
reported without overturning a decision that post-dates it. **This is Nick's call to confirm.**

**Also confirmed NOT a bug:** the snoozed rebuild classifies an urgent card as *housekeeping*.
`liveFamily`'s own comment states this is deliberate — *"housekeeping HERE because they are
housekeeping in the count"*. Left alone.

No stored count was introduced.

---

## Phase 7 — the activity feed collapses runs

Runs of consecutive same-type, same-day events fold into one line. **Folded, never filtered** — a
feed that silently drops events is worse than a noisy one, so the line states its own size.

**Three things it must never fold**, each locked by the case that would lose information:

1. **Query-scoped events never fold.** Two "Query sent" rows naming the same agent on the same day
   are two different queries; folding would report one submission where two happened. `FeedRow`
   gained an explicit `scope` rather than inferring this from whether a status dot happens to be
   present.
2. **Only consecutive rows fold.** An interruption ends a run — two runs of one, never one run of
   two. The fold walks the sorted list for exactly this reason; a `groupBy` would silently merge
   the two ends around the interruption.
3. **The day is part of the key.** Rows are day-grouped in the render, so a run crossing midnight
   would sit under one heading holding another day's events.

**Time: the span** (`3:05pm–4:10pm`). The pack allowed either; the span says when the burst
happened, which is the thing a folded run hides.

### The correction inside Phase 7

I first keyed the fold on the **subject** as well, which meant six edits to six *different* agents
stayed six lines — the exact case the pack's own example asks to collapse. Corrected in `35fc1bb`:
the key is type + day + scope.

That surfaced a second thing worth stating: **the sentence counts SUBJECTS, not events.** Six edits
to one agent folds to one line, but calling that *"6 agents"* would state something that did not
happen. So a single-subject run keeps its own name and shows repetition as a count; only a
multi-subject run reads `You updated details for 6 agents`.

---

## Phase 2 — the sidebar foot

**Cause found: two `.ws-uacct` rules at equal specificity, ~190 lines apart.** The later one (added
when the avatar returned with the rail's departure) set `align-items: center` but never reset
`flex-direction`, so the `column` declared in the earlier rule stood. Source order only decides
properties that *both* rules state — which is why the avatar sat detached above the name with
neither rule looking wrong on its own.

One rule now, and the ref's composed row: 32px avatar · name over plan as **explicit blocks** ·
Upgrade pill right-aligned **outside** the text column. The pill previously sat inside the plan
line, making it a word in a sentence rather than a control at the end of the row.

Locked: the foot's row selectors must appear exactly once, because a second declaration is how
this returns.

---

## Phase 4 — counter card spacing

`.os-greet`'s `padding-bottom: 26px` was the gap beneath the counters card — nearly double the
15px between every other pair of cards, and unrelated to the cards it was spacing. Both now read
`--os-cardgap`.

**Declared on `.os-root` itself, not in a second `.os-root` block.** My first attempt added a
separate rule for the token, which became the *first* match for `oneScreenSmoke`'s
`rule(".os-root")` slice and hid the lock's `height: 100%` from it — the documented slice-anchoring
trap, and the same one-element-two-rules fault Phase 2 had just fixed. Caught by the suite.

The rail's 13px rhythm is deliberately its own (it spaces with margins so a collapsing panel takes
its spacing with it) and was left alone.

---

## Phase 5 — chart polish

**Controls cluster.** The range label was `text-align: right` in a 96px box at the end of a
`margin-left: auto` row, so it justified to the card's far edge — a value stranded from the control
it reports. Frequency, slider and label are now one right-aligned cluster (`.os-ctrls`), the label
snug at ~10px. It keeps a min-width: the words change length ("Last 14 days" → "All time") and
without it the slider shifts as you drag.

**One resting node — the latest.** A node at every point had been defended as showing how many
readings the line is drawn from; at daily grain over a long range that is hundreds of rings, and
the *line* stops being readable — the thing they were meant to support. Hover and the crosshair
carry the rest. **The keyboard focus node is separate and untouched**, so arrow-key stepping still
shows its position with no pointer present.

---

## Phase 6 — entrance animations

- **Header counters** count up over 400ms, with `font-variant-numeric: tabular-nums` so the row
  does not re-lay-out on every frame.
- **Activity cardlets** cascade, **capped at the first eight** — beyond that a stagger is a queue
  you wait through, and the feed scrolls.
- **The count-up moved to `lib/useCountUp`.** The chart held the only copy; one screen must not
  hold two, or two figures animate at different speeds for no stated reason.
- **⚠️ Found and fixed: the goal meter's fill carried `fill-mode: both` while NOT being scoped to a
  class that gets removed.** It lives on `.f` for the element's whole life, so `both` pinned
  `transform` and `opacity` permanently and would outrank any later declaration on those blocks —
  the §6 trap the pack explicitly forbids, already in the tree. Changed to `backwards`; the
  finished look is unchanged because the final keyframe was already the resting state.
- The card stagger and its `.enter`-removal mechanism were already correct and were not touched.
  Reduced motion is handled by the existing `@media (prefers-reduced-motion: reduce)` block plus
  `useCountUp`'s own check, which shows the value rather than counting faster.

---

## Phase 8 — verification

**Automated, all green at `cc1c799`:** `npx tsc --noEmit` clean · **221 test files / 3,486 passing,
2 skipped** · `npm run build` ✓.

New locks:

- `urgentReconciliation.test.ts` (5) — asserts the two derivations **against each other**, not
  against literals: a `toBe(1)` on both sides would go green the day someone changed both in the
  same wrong direction. **Verified red** by neutering the dedupe before it was believed.
- `feedCollapse.test.ts` (9) — the headline six-agent fold, the subjects-vs-events distinction, and
  the three never-fold rules.
- `shellV2Tokens.test.ts` (+4) — the foot's row selectors are declared exactly once.

### ⚠️ NOT DONE — the 1440×900 screenshot

**I could not capture it.** The dev server runs (worktree, port 3121, viewport set to 1440×900) but
`/dashboard` redirects to the auth screen, and I will not enter credentials. The screenshot in this
report would therefore be of the sign-in page, which proves nothing about any of these changes.

**What this means:** everything above is verified by source, by the test suite and by reading the
computed rules — **not by eye**. The measurement-is-not-sight rule cuts the other way here too: the
CSS says what it says, but nobody has *looked* at the sidebar foot, the chart cluster, the counter
gap or the entrance timings in a running app. Specifically worth Nick's eye on dev:

1. The sidebar foot as one row — avatar beside the name, plan beneath it, Upgrade at the right.
2. The chart's control cluster, and whether one resting node reads as too bare at weekly grain.
3. The 15px counter gap against the 26px it replaced.
4. The entrance sequence end to end, and again with Reduce Motion on.
5. A real run in the feed — the wording and whether the span reads better than a single time.

Everything in this pack is **Cappuccino only**; Bold and Editorial are unreviewed, as with the
preceding dashboard packs.

## Carried forward

- **`responseRatePercent` divides by every query including unsent drafts** — a real bug, tracked
  separately (`task_aa4291be`), untouched here.
- Prod rules deploy still pending for `goalTarget` / `goalPeriod` / `tourCompletedAt` /
  `tourDismissed`.
- The badge-unit question above.
