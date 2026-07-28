# Agent list — door axis & two fixes — run report

Three phases on `claude-il` (worktree `/Users/nickphysick/ScriptAlly-il`), one commit each, every
commit gated on `tsc --noEmit` + `vite build` + full Vitest. Follows the agent-list rebuild v2
(`bad55d3 → c140b80`). No deploys, no rules changes, no card restyling.

## Commits

| Phase | Commit | Suite | Shipped |
|---|---|---|---|
| 1 | `20a09d3` | 1696 | Door precedence REMOVED; `agentDoor` as the third axis; filter facet, popover section, group-by, applied tags; four reconciliation tests |
| 2 | `37b2b11` | 1697 | `lastQueriedAt` locked to `max(dateSent)` with a fetch-order fixture; scoping documented |
| 3 | `2c57a44` | 1703 | Generic popover flip (`popoverAlign`) wired into the shared component |

Net: +432 / −57 across 10 files. Suite 1690 → 1703.

## 1 · Every consumer of `agentStanding`, and how each was handled

**The red gate did not fire: nothing outside the agent list consumes it.** All call sites were
inside `src/lib/agentList.ts`, plus its test file.

| Consumer | Depended on the precedence? | Handling |
|---|---|---|
| `agentTurn` (`:123`) | **Yes, fatally** — gated on `standing === "active"`, so a closed door suppressed the turn axis too | Gate kept, but it now tests history only, so the turn survives a closed door. This was the second half of the bug. |
| `agentAxisCounts` (`:164`) | Yes — counted `closed` as a standing | Standing counts three values; a new independent `door` count added |
| `groupAgents` (`:314`) | Yes — emitted a `closed` section among the standings | Standing groups three; `door` is its own grouping option |
| `matchesFilterSet` (`:362`) | Yes — `closed` was a standing value | `door` is its own facet, ANDed with the rest |
| `agentList.test.ts` | Yes — five assertions encoded the precedence | Rewritten to the three-axis model; each now carries a failure message naming what breaks |
| `agentStateClass` | **No** — it calls `isDoorOpen` directly, never `agentStanding` | Untouched. This is why the card still greys correctly with no visual change in this pack. |

`isDoorOpen` was already derived (`submissionStatus !== CLOSED`), already used independently by
`AgentCard`, and needed no new field — `agentDoor` is just `isDoorOpen` in axis clothing.

## 2 · The four reconciliation tests

All in `agentList.test.ts`:

1. **Standing sums to the agent total** — `active + noactive + never === total`.
2. **Turn sums to the active count** — `you + them === standing.active`, and strictly less than the total.
3. **Door sums to the agent total** — `open + closed === total`.
4. **THE FIXTURE** — an agent with a `Full Requested` at a closed agency appears under
   `Active queries`, under `Closed for submissions`, **and** under `Awaiting your pages`; survives
   each of those filters individually; and the intersection `standing:["active"] + door:["closed"]`
   returns exactly that agent.

**Verified to fail against the old model.** I temporarily reinstated the precedence in
`agentStanding` and re-ran: the fixture failed with *"the live full at a shut agency stopped
counting as active history: expected 'noactive' to be 'active'"*. Source restored immediately; the
green suite in `20a09d3` is against the fixed model.

A fifth test asserts the axes genuinely **overlap** (an agent counted active is also counted
closed) — if a future change makes the sets disjoint again, a precedence has crept back in.

## 3 · Manuscript scoping — the agent list is GLOBAL

It reads the whole `queries` collection from the DB context, has no manuscript selector, and never
touches `scriptally_active_manuscript_id`. The only `manuscriptId` reference in the page resolves
titles for the card's history strip. So `max(dateSent)` is a global max, correctly.

**The implementation was already `max(dateSent)`** — phase 2 did not change the derivation, it
locked and documented it. The test that was missing is now there: a two-query agent on two
manuscripts with the **older** query first in fetch order, which is exactly what a naive
first-match-wins implementation would take (dating them to January instead of July and burying
them at the bottom). Never-queried agents already sank to the bottom of this order; the rule is now
written beside the function.

The lib comment states what would have to change together if this page ever gains a manuscript
scope: the sort key, the counts and the pulse all take the scoped query set, or they disagree.

## 4 · Filter combination after the change — unchanged, and now confirmed

**OR within a facet, AND across facets** — `matchesFilterSet` returns false facet by facet (AND),
and each facet uses `.includes` (OR). Stars is the one deliberate variant: the lowest tick wins,
because "4+ or 3+" means 3+. The door facet joins on exactly these terms, which is what makes
"Active queries + Closed for submissions" answer a real question instead of returning everything.

**One genuine bug fell out of the change:** "Clear all" was a hand-written facet list
(`{ standing: [], turn: [], stars: [], loc: [] }`) and silently missed the new door facet — ticking
a door value then clearing left it applied. It now calls `emptyFilterSet()`, the single source, and
the lock says why a literal is forbidden.

## 5 · How many agents are in the closed-door-with-active-query state?

**I cannot answer this from here, and I'd rather say so than guess.** The page is auth-gated, this
environment has no admin credentials or ADC for prod Firestore, and the read-only scan procedure on
file requires a temporary hidden route plus a local prod-config preview — outside this pack's scope
and not something to improvise.

**The fix makes the number self-serve.** Once this is on dev, open Filters and tick
**Active queries** + **Closed for submissions**: the footer states the count live ("Show N agents"),
and the popover's own row counts show the totals either side. If it reads 0, the bug was invisible
in your data and this was a correctness fix ahead of the fact. If it reads more than 0, those
agents were previously mis-filed under Closed and absent from both Active and Whose turn — so any
count you took from those filters was short by that number, and the queries themselves were never
lost, only hidden from these two views.

## 6 · Popover collision

Fixed at the shared component, not per-control: `popoverAlign` (pure, unit-locked) flips a popover
to right-anchored when the left-anchored box would exceed the container's right edge. One
refinement worth naming: a popover wider than its container overflows whichever edge it hangs from,
so the flip applies only when right-anchoring actually **fits** — trading a right-hand overflow for
a left-hand one is not a fix.

Measured against the **content column** (`.agl-inner`), not the window: the column is what the
reader perceives as the page's edge, and past the 1240px cap the window includes margin the page
doesn't own. Read in a layout effect, so the flip lands before paint.

**Browser-verified standalone** (auth-gated page, so this was an isolated harness using the real
CSS): with the button inside the container near its right edge, the left-anchored panel overflows
by **166px**; flipped, it sits at 303–533 inside a 20–541 container — fully inside, clearing both
edges.

## Browser-check list

- **Popover flip at narrow widths** — the real measurement, on the real toolbar. Sort is the case;
  check Filters too at the point where the window is narrow enough for its 288px panel.
- **Three-axis filter behaviour** — particularly Active + Closed together, which is the whole point,
  and that the applied tags show all three axes' values.
- **Group-by-door section rhythm** — two sections, sage and grey stubs, against the 88px stub width.
- **Zero-count door rows** — if every agent is open, "Closed for submissions" should sit visible at
  40% and be untickable.

## ⚠️ Open question for Nick — the card's colour semantics (raise, don't fix)

Separating the axes has made a pre-existing conflict live, and it needs your call plus a mockup.

**The locked two-systems rule** (`a5f0e7a`, 13 Jul — *"THEIR DOOR is colour/tone; YOUR HISTORY is
StatusDots"*) says colour expresses **their door**: sage open, pink closed, with your history
carried by `StatusDot`s and never by sage or pink.

**The card does the opposite.** `agentStateClass` gives sage = active queries and pink = no active
queries — both facts about *your history* — and hands the door only grey. So the card currently
spends its entire colour system on the axis the rule reserves for dots, and expresses the door as
an absence of colour.

That was survivable while the door and history were fused into one value. Now that they are
independent, the card has two facts to express and one colour system, and the conflict is visible:
an agent can be sage (active) *and* closed at the same time, and only the grey wins.

Two directions, both needing a mockup:

- **Restyle the band to the rule** — colour becomes the door (sage open / pink closed), and history
  moves to `StatusDot`s on the card, which the history strip already renders.
- **Amend the rule for this page** — colour stays with history because that is what the writer
  scans for, and the door gets a different device (the existing stamp, a pill, a border treatment).

I have restyled nothing. `agentStateClass` is untouched and behaves exactly as before.
