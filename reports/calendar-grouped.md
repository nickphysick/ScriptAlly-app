# Calendar — grouped, and in the writer's words

**Session** `calendar` · base `249e0117` · **Phase 0 — recon, read-only**

**Red gate: clear** for the owned files. `todoTimeline.ts`, `StatusDot` and the pane mount are
intact and unmodified since the range pack closed. Tree level with `origin/main`, 7 ahead, nothing
of mine outstanding.

> ⚠️ **Two untracked files are another session's, and I have not touched them.**
> `tests/e2e/seedBoardShapes.ts` and `tests/e2e/zzShape.measure.ts` (23:22 / 23:23). They address
> **`/todo`** and query `.tlc .row` — classes that exist nowhere in the calendar's markup, which is
> `.tl` › `.tl-row`. Different page, different surface, not in my territory. Read, not moved.

> ⚠️ **`design-refs/timeline-grouped.html` DOES NOT EXIST.** The pack names it as normative. The
> artefact is `~/Downloads/timeline-grouped-ref.html` (26 Aug 23:27) — this has happened before in
> this project, and the recovery is the same: Phase 1 commits it under the name the pack uses so
> every later reference resolves.

---

## 1 · Where row order is decided, and what grouping costs

`timelineWeek(...)` in `src/lib/todoTimeline.ts` emits a **flat, fully sorted** `rows` array. The
ordering block is one place (`:606-632`):

- a closed row sinks below every live one **in every sort**, before the sort key is consulted;
- then `cmp[view.sort]` — `soonest` · `waiting` · `name` · `stage`;
- then `a.order - b.order`, the input order, stated rather than relying on sort stability;
- `YOU_ROW` is **prepended** afterwards, and only if it survived the survival rule.

**Grouping is a PARTITION of that already-sorted list, exactly as the agent list does it.** Assign
each row a group key, then bucket in group order. Sort applies within groups **for free** — no
second ordering pass, and therefore no way for the two to disagree. This is the cheapest possible
shape and it is already precedent in this repo.

**Filters run earlier** (`:598-604`, the `alive > 0` survival rule) than ordering, so filters
already apply before grouping and the counts cannot drift. Phase 3 asserts it rather than assuming.

## 2 · Whose move is already derived — twice, and both are reusable

**`sideOf(status)`** — `src/lib/journeyBars.ts:235`. Reads `getPrimaryAction(status).ballHolder`,
the app-wide CTA engine, and returns `"yours" | "theirs" | null`. It drives every bar's colour and
every waypoint's side.

**`agentTurn(agent, queries)`** — already consumed at `todoTimeline.ts:350` to set `Draft.dot`.

**Neither will be re-derived.** The now/soon split comes from what these already say plus the
query's own state; no day-count constant is needed, which is what the pack asks for.

## 3 · `StatusDot` renders at 18px unforked — but the row does not carry a status yet

**The API allows it.** `overrideSize` exists precisely for "the dense timelines, where a full-size
dot would be clipped", and clamps at `Math.max(12, …)`. It already ships at **19px** on the Agents
page and **22px** in the query list. **18 is inside the supported range and needs no fork.**

⚠️ **One correction to the pack's framing, and it matters because it prevents a wrong build.** The
component does **not** carry direction in colour. Under the amended lock the six pipeline statuses
are **one hue per theme** (`--sd-hue` / `--sd-centre`), and *direction and stage are carried by
SHAPE*. Rendering the real component therefore gets whatever is correct by construction — and any
attempt to reproduce "colour for direction" here would be a fork of a locked component. The plan is
to render it and restate nothing.

⚠️ **What the row head draws today is NOT a `StatusDot`.** `.tl-sd` is a 10px CSS disc keyed on
`RowDot` = `"you" | "them" | "quiet" | "self"` — *whose move*, not the query's status. So Phase 4 is
not a swap: the row must start carrying a **status**.

**It can, without a new list.** `Draft.stage` is already `STATUS_ORDER.indexOf(status)` of the most
advanced LIVE query, so `STATUS_ORDER[stage]` returns the status. A closed row (`stage === -1`)
needs the most advanced TERMINAL status by the same index. One derivation, no second table.

⚠️ **`YOU_ROW` has no query and therefore no status.** "Every row head leads with a `StatusDot`"
cannot include the pinned Your-tasks row without inventing one. It keeps its square `self` mark.

## 4 · Every string the timeline renders, and where authored

**Comment-stripped before counting** — the raw grep reported `"The week"` as live when it is a
comment describing a value already fixed last pack. The house rule earned its keep inside the
recon that was written to apply it.

| string | authored | fate |
|---|---|---|
| `Closed` · `No reply time recorded · give it a date` · `Next reminder due {d}` · `Reply window · to {d}` · **`Reply window`** · `Decide on the offer · no date set` · `Your move · revise & resubmit · no date set` · `Your move · {label}` · `Your move` | **`labelFor`**, `journeyBars.ts:594` — the ONE bar-label authority | Phase 5 rewrites in place |
| `They asked by {d}` · `Expected {d}` · `Reminder due {d}` · `Back on {d}` · `Expected` | `journeyBars.ts:412-486`, waypoint captions | reviewed Phase 5 |
| **`Reply window`** (a fact-list KEY) · `None resolvable` · `Your note` · `Your turn` · `Your move` · `Their move` | `TodoCalendarPage.tsx:763-875`, the work drawer | Phase 5 |
| **`Nothing this week.`** | `TodoCalendarPage.tsx:1046` | assumes a week; wrong at four of five ranges |
| `Your tasks` · `Nothing logged yet.` · `In focus` · `Everyone` · `The whole conversation` | page | kept |
| `Previous window` · `Next window` · `Kinds` · `Sort` · `Search agents, agencies and tasks` | page, control labels | kept |

**`Reply window` appears twice and both are on screen** — once as a bar label, once as a fact-list
key. Phase 5's grep must cover the bundle, not one file.

## 5 · A past slice is an OFFSET, not a code path

**Confirmed, and the ref agrees.** `windowDays(startYmd, days)` takes any start; positions are
fractional (`calc(n / var(--tl-days) * 100%)`); `shiftWindow` already carries the length. Opening
before today is `winStart = today − past`.

`BarWindow.past` is a **different thing** and is not in the way: it means *the whole window is
behind today* (`todoTimeline.ts:481`, `last < data.today`) and is used to suppress the overrun
hatch. A straddling window makes it `false`, correctly.

**The ref is `PAST = 3, DAYS = 14`** — `for (i = -PAST; i < DAYS - PAST; i++)`, i.e. ≈21%. Per the
pack's stated default (fraction, not fixed days), Phase 6 puts a fraction in the existing
`TIMELINE_RANGES` table, which is already the per-range token home:

| range | days | fraction | past days | forward |
|---|---|---|---|---|
| 1 week | 7 | .214 | 2 | 5 |
| 2 weeks | 14 | .214 | **3** (the ref's own number) | 11 |
| 1 month | 31 | .214 | 7 | 24 |
| 3 months | 91 | .25 | 23 | 68 |
| 6 months | 182 | .25 | 46 | 136 |

## 6 · The spine, checked against the ref before deleting it

**The ref draws no spine.** Its single match on the word is prose — *"The past gives the long view
its shape"* — not an element. Phase 2 deletes it with the ref behind it rather than on the pack's
say-so alone.

**What depends on it:** `--spine-at` (set inline in the page), `.tl-spine` (one CSS rule reading
`--tl-head-w`), and the acceptance sweep's spine clause, which is mine and goes with it. Nothing
else reads either.

---

## Findings the pack did not anticipate

- ⚠️ **`Nothing this week.`** is a fifth "week" assumption left over from the fixed 7-day board,
  live and rendered. Not in any phase's brief; Phase 5 owns the copy, so it goes there.
- ⚠️ **The row head's dot is whose-move, not status.** Phase 4 reads as a component swap and is
  actually a data change in `todoTimeline.ts`. Budgeted accordingly.
- ⚠️ **`labelFor` is a single authority and that is a gift** — the copy table rewrites one function
  rather than a scatter of call sites. Its own docstring already forbids the word "overdue" in as
  many words, so Phase 5 extends a rule the module already holds rather than imposing a new one.
