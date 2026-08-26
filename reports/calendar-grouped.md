# Calendar — grouped, and in the writer's words

> **DEPLOYED TO DEV.** All seven phases on `main` (`657d964a` → `489ece21`), every gate green, and
> `https://scriptally-dev.web.app` verified as carrying them — the groups, the counts, the filtered
> counts and the sentences read back off the deployed bundle rather than off the success line.

**Session** `calendar` · base `249e0117` · **complete** · hosting only; nothing touched functions or
rules.

| phase | commit | what landed |
|---|---|---|
| 0 | `cfd85b12` | recon |
| 1 | `657d964a` | the v21 ref committed |
| 2 | `a3e105f4` | the today spine goes |
| 3 | `aa4718d5` | six groups; a snoozed row stops disappearing |
| 4 | `20c4a85c` | the real `StatusDot` in every row head |
| 5 | `7b32717e` | the board speaks in the writer's words |
| 6 | `666c18b5` | every range opens before today |
| 7 | `489ece21` | acceptance, four widths × five ranges |

**Suite at close:** 414 files, 7,158 passed, 3 skipped. tsc clean. Production build clean (grepped,
not tailed).

---

## What a reader sees — identical at 1280 / 1440 / 1920 / 2400

| range | groups | past / columns | today | markers | captions painted |
|---|---|---|---|---|---|
| 1 week | 4 | 2 / 7 | 1 | 1 | 0 |
| 2 weeks | 4 | 3 / 14 | 1 | 1 | 0 |
| 1 month | 4 | 7 / 31 | 1 | 10 | 0 |
| 3 months | 4 | 3 / 13 | 1 | 15 | 0 |
| 6 months | 4 | 1 / 7 | 1 | 20 | 0 |

**Offers 1/1 · Needs you now 5/5 · Watching brief 7/7 · Snoozed 3 stated, 0 drawn** — the two empty
groups absent entirely. Filter a kind off and Offers goes, "Needs you now" drops 5 → 1, and every
header still equals the rows the browser drew.

The heads, at 1440:

```
  Noah Bright     Offer on the table — an answer was due yesterday
  Marcus Reed     They want the full — asked 63 days ago
  David Marsh     No word in 73 days
  Iris Kwan       They want a revise and resubmit — asked 61 days ago
  Devendra Rao    Out with Rao — reply expected by 15 Sept
```

---

## Flags

**1 · Deployed, and why.** Every gate green at every phase, twenty acceptance stops green at four
widths, and the deployed bundle re-measured rather than assumed. Nothing here touches functions or
rules, so the blast radius is one hosting release.

**2 · `StatusDot` rendered at 18px unforked — yes, and nothing about it is restated.**
`overrideSize` exists for exactly this ("the dense timelines, where a full-size dot would be
clipped"), clamps at `Math.max(12, …)`, and already ships at 19 on the Agents page and 22 in the
query list. ⚠️ **One correction to the brief, and it prevented a wrong build:** the component does
NOT carry direction in colour. Under its amended lock the six pipeline statuses are **one hue per
theme** and *direction and stage are carried by SHAPE*. Reproducing "colour for direction" here
would have been a fork wearing a helpful face.
⚠️ **And this was not a component swap.** What the head drew was `.tl-sd`, a 10px CSS disc keyed on
*whose move* — so the row had to start carrying a **status**, which is a change in
`todoTimeline.ts`. It takes it from the same ranking `stage` already uses, so a row cannot be
sorted by one journey depth and marked with another.

**3 · The now/soon split, and what was ambiguous.** `sideOf(status)` decides "the agent asked for
something" — the app-wide CTA engine the bars, the filters and the row dot already read — and the
writer's own `nudgeDate` decides whether a reminder has arrived. **`timelineGroups.ts` contains
exactly one number and a lock asserts it**, by counting the integers in its comment-stripped
source: the closure linger, which is a retention policy rather than a classification.
**Nothing was ambiguous between now and soon.** The one genuine ambiguity is in flag 4.

**4 · The one situation the derivation cannot distinguish.** The brief separates *"nudged, clock
restarted"* (`giving it two more weeks`) from *"nudged, reminder ahead"* (`a reminder falls due in
5 days`). **The record does not:** both are a nudge with a reminder in front of it, and nothing
stored says which the writer meant. So the wait is stated in the unit that reads naturally at its
size — whole weeks where it is whole weeks, days otherwise. **Flagged rather than invented**, and
the note sits at the branch.

**5 · An agent record can lack a surname, and "the agent" is doing more work than it looks.**
`agentPrimary` falls back to the **agency** where there is no personal name, so the last word is
not reliably a name at all. `agentSurname` therefore returns `null` for anything that is not a
plain word — an initial (`Marcus R.`), a trailing mark (`Curtis Brown —`), an empty string — and
those rows read *"Out with the agent — …"*. A single word is used whole: it is either a surname
already or a mononym, and both read correctly. **No pronoun can be produced**, asserted over 500+
generated sentences and again over the rendered board's whole ink at all twenty stops.

**6 · Rows at 900px: six rows and four group headers** visible at 1440×900 at the 1-week range. The
headers cost real estate the flat list did not — four of the ten visible bands are now headings —
which is the trade the grouping makes and is worth your eye on dev.

**7 · What remains unverifiable, and cross-session notes.**
- **The pinned "Your tasks" row was never exercised on the page** — the harness account has no task
  due, so every rendered check reports it as absent. Its two absences (no group, no status) are
  locked in the unit suite in **two halves with two fixtures**, because without the positive half
  they pass on a build where both fields were deleted outright.
- **"Needs you soon" and "Recently closed" never rendered** on this account, so their headers are
  unit-locked only. That they are ABSENT rather than empty is asserted at every stop.
- **`design-refs/timeline-grouped.html` did not exist** — the pack named it as normative and the
  artefact was in `~/Downloads`. Third time in this project; Phase 1 committed it under the name.
- **Two untracked files are another session's** — `tests/e2e/seedBoardShapes.ts` and
  `zzShape.measure.ts`, addressing `/todo` and `.tlc .row`. Read, not moved. One of their commits
  (`16e8b6db`) landed mid-run between my Phases 2 and 3; my tree stayed level throughout.

---

## Three things measurement found that reading could not

**⚠️ A closed row with NO closure date was being deleted.** `rejectedDate` and `lastStatusChange`
are DERIVED fields, so a record predating them carries neither — and returning "gone" there is a
confident answer to a question we cannot answer. **The two failures are not the same size:** a
stale closure costs a row the writer can see and dismiss, a hidden real one costs them the record.
The unknown case fails **open**. Four `todoTimeline` cases went red within a minute of the linger
landing, which is the argument for running the owned locks in the phase that changes them.

**⚠️ The past slice exposed a bug that could not exist before it.** `.tl-dh` marked today by
`c.ymd === today` — the column that STARTS on today, identical to the one that CONTAINS today only
while today was column zero. With a slice in front of it, no column starts on today at week or
month grain, and **today fell off the board entirely at two ranges out of five**.

**⚠️ An existing lock caught a reword, then caught the comment explaining the catch.** The obvious
phrase for a writer's-move stretch is a **retired To-do family name**, renamed to AGENT WAITING,
and `todoWorkbench.test.ts` greps every file under `src/` for it — so the rename is app-wide, not
To-do-local. It then reddened over the comment that explained why, because that lock reads raw file
contents and does not strip comments. Its own needle is split in two *"so this lock never matches
itself"*; the note now describes the phrase instead of quoting it.

---

## Probe repairs, all one family

Three probes were answering about a subject that depended on the fixture rather than on the claim.

- **`tlPhase2` selected its row as `.tl-row:not(.tl-head)`**, which happily matches the pinned
  "Your tasks" row — chips, not bars, so a different and equally correct 40px lane. It passed while
  the account had no task due and went red the day it had one. **The failure read as a layout
  regression at 2400 and was a selector.**
- **`tlCaptions` required a caption at every range** and went red when grouping began dropping
  stale closures. Population accumulated across the five; the vacuity guard asserted once.
- **Its waypoint check took the first waypoint on trust**, which broke the day the board grew
  sticky group headers — the pointer landed on a header over the upright and the caption never lit,
  **reading as the reach being broken when the reach was fine**. Scrolling a candidate into view
  and measuring it in the same frame then gave coordinates stale by the time the pointer arrived;
  the symptom (reachable waypoint, clean hit test, empty caption) looks identical to the reach
  failing. It searches across ranges now and moves nothing.

---

## Known, out of scope, carried forward

- **`.tpn .ws` still squeezes the pane below ~600px.** Confirmed by `calLook.measure.ts:406`, which
  asserts it as a standing, deliberate non-fix and passes.
- **Marker clearance is still `journeyBars.GAP = 0.34` days** rather than the pixel token. Moving
  it is a change to the bar derivation, which cuts its pieces in days and knows nothing about ink.
  `--clear` remains deliberately **undeclared** rather than declared-and-unread.

## Built to the stated defaults, flagged not resolved

| decision | built as |
|---|---|
| how long "recently closed" lingers | **7 days** — `CLOSED_LINGER_DAYS`, one constant |
| where "Your tasks" sits | **above** the groups; its `group` is `null` and that is what exempts it |
| whether Snoozed expands or navigates | **expands in place**, session-only, not persisted |
| past slice: fraction or fixed days | **fraction** — 3/14 at the short ranges, ¼ at 3 and 6 months |

---

## Phase 0 — recon (read-only), as taken

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
