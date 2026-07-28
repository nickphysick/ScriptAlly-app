# Agent list rebuild v2 — run report

Five phases on `claude-il` (worktree `/Users/nickphysick/ScriptAlly-il`), one commit each, every
commit gated on `tsc --noEmit` + `vite build` + full Vitest. Design authority:
`design-refs/scriptally-agent-list-v2.html` (committed phase 1, headed with the one rejection).
No deploys, no rules changes, no branches. Nick merges to `main` and deploys.

This run follows the first agent-list rebuild (`reports/agent-list-rebuild.md`), which built the
card grid and the flip editor. It rebuilds the *page around* them.

## Commits

| Phase | Commit | Suite | Shipped |
|---|---|---|---|
| 1 | `bad55d3` | 1666 | Two axes (`agentStanding` / `agentTurn`) + the reconciliation tests · the four-facet filter set · mockup committed |
| 2 | `86bbbeb` | 1671 | 28/60/48 padding, 1240px centred column, 268px grid floor · the right-gutter fix at its cause · flip-lock failure messages |
| 3 | `c08550a` | 1680 | One toolbar replacing five bands · Filters popover · applied tags · legend + count line deleted |
| 4 | `7b6d167` | 1686 | Group by (None/standing/turn/stars) with the To-do section pattern · the four working sorts · chip-era API retired |
| 5 | `ad1a03a` | 1690 | Card location line: flat 14×10 flag + city |

Net: +1903 / −321 across 11 files. Suite 1650 → 1690.

## 1 · How status was modelled, before and after — no migration needed

**Before (derived, not stored):** two read-time derivations existed —
`agentRelationship(agentId, queries)` → `active | prev | never`, and `isDoorOpen(agent)` from
`submissionStatus`. "Awaiting your pages" came from a *third*, `awaitingYourPages`, testing
membership of `AWAITING_PAGES_STATUSES`. Nothing was stored, so **the red gate did not fire**: the
defect was entirely in how the chip row presented these three — it drew `awaiting` as a peer of
`active` when it is a subset, which is why the counts summed past the total and why ticking both
returned the union.

**After:** the same underlying facts, composed into two axes.

- **Axis A — `agentStanding`**: `active | noactive | never | closed`. Exclusive and exhaustive.
  The door OUTRANKS history: an agent closed for submissions reads Closed whatever their query
  record, because that is the fact governing what you can do next. (An open agent with a live
  query and a closed agent with a live query are different situations; the old model had to pick
  one chip and lost the other.)
- **Axis B — `agentTurn`**: `you | them | null`, meaningful only inside active queries.

The filter set (`AgentFilterSet`) has four facets — standing, turn, stars, location. Ticks within
a facet are alternatives (OR); facets narrow each other (AND). That is the actual fix for the
union bug: because standing and turn are different axes, ticking both now intersects.

**The two reconciliation tests** (`agentList.test.ts`) are the phase's point, and both would fail
against the old model: axis A's counts sum to the agent total; axis B's sum to the *active* count
and are asserted strictly less than the total.

## 2 · Is the turn derivation reusable from this page? — Yes, directly

`getPrimaryAction(status).ballHolder` in `src/lib/queryPrimaryAction.ts` is pure, imports only
`QueryStatus`, and carries no React or Firebase dependency. `agentTurn` calls it rather than
re-listing the writer's-turn statuses, so the agent list, the Queries command bar and the To-do
flows cannot disagree about whose move it is, and a taxonomy change lands in one place.

No stored field was added. Derived-over-stored holds across the whole run.

## 3 · Is a last-queried date derivable? — Yes, and from the better of two sources

Available, with a deliberate choice. Both paths exist:

- **The activity feed**, joined `Activity.queryId → Query.agentId` (activities carry no `agentId`
  of their own — the existing `closedStampDate` helper has to string-match description text to
  attribute one, which is fragile).
- **`query.dateSent`**, which is `recomputeQuery`'s own output *from that feed*.

`lastQueriedAt` reads `dateSent`. It **is** the log's derivation, computed once and shared, so
there is no second scan that could disagree with the canonical one, and no dependence on
description-string matching. Still nothing stored on the agent.

## 4 · Vocabulary for the never-queried state — no discrepancy, no third term

The codebase says **"Never queried"** (`relationshipLabel`), the mockup says the same, and "idle"
was retired in an earlier pass. `STANDING_LABEL.never` is locked *equal to*
`relationshipLabel("never")` so the two can never drift. All axis wording is single-sourced:
the popover, the applied tags and the group headings all read `STANDING_LABEL` / `TURN_LABEL`.

## 5 · The right-gutter cause — checklist item 2, a near-miss from a previous pack

Worked in the pack's order:

1. **`100vw` in the shell chain — ELIMINATED.** No shell rule uses it. The three hits in the repo
   are unrelated overlay widths (`Form11Drawer`, the diary carousel's already-documented case,
   the import panel).
3. **A child exceeding its flex track — ELIMINATED.** `.sv2-app`'s children are rail
   (`flex:none`), panel (`flex:none`, `min-width:0`) and plane (`flex:1`, `min-width:0`); none can
   overrun the content box.
2. **THE CAUSE — viewport-anchored chrome.** The floating help FAB is `position:fixed` at a bare
   `right: 20`, measured from the **browser** edge, which is 14px further out than any capsule —
   the left-correct/right-short signature exactly. This is the same bug the dashboard timeline
   pull tab had; the tone/crumb/padding pack fixed `.sa-tltab` by moving it to the capsule edge
   and **missed the FAB**.

**Fixed at the cause.** The FAB and its menu now measure `calc(var(--shell-cap-gap) + 6px)` at
≥768px, matching the tab. The `right` had to move out of the inline style into the class: an
inline value beats a breakpoint rule, so leaving it inline would have made the fix *look* applied
while doing nothing (the shell CSS footgun). Below md the capsule stands down and flush-to-edge
remains correct. **No compensating right-hand padding anywhere** — `agentLayout.test.ts` asserts
its absence on both the page and the inner column.

## 6 · Flags — from the existing icon set, no inline SVG

`flag-icons@7.5.0` is already a dependency and already used by `CountryCombobox`,
`AgentCountryPicker` and Discover. The card consumes it the same way: `flagFor(code)` yields the
class pair, so every country resolves and the card can never show a flag the picker can't offer.

**Browser-verified standalone** (the page itself is auth-gated, so this was checked on an isolated
page using the exact rule): the box computes to **14×10 with radius 1.5px, `borderWidth: 0px`,
`boxShadow: none`**. At 6× magnification the artwork is correctly proportioned —
`background-size: cover` crops ~5% off a 4:3 flag rather than distorting it, invisible at 14px and
preferable to letterboxing.

## Decisions taken during the run

- **The chip-era API was RETIRED, not left dead** (`AGENT_LIST_CHIPS`, `matchesAgentFilter`,
  `agentListCounts`, `agentCountLine`, `visibleAgents`, `AgentLocationFilter` +
  `matchesAgentLocation` + `AGENT_LOCATION_OPTIONS`). It had no callers after phase 3 and it *is*
  the peer-of-active model — a working, tested API reproducing the exact defect this rebuild
  fixed, waiting for whoever reached for it next. Its surviving behavioural assertions
  (Offer-is-active, Unknown-reads-open, search reach) were re-homed onto the axis and filter-set
  functions. Recoverable at `c08550a` if you want it back.
- **The domestic/international location filter is superseded** by the popover's by-country rows
  with counts — more precise and self-explanatory. `agentTerritory` survives for the
  home-market rule.
- **The earlier home-market flag rule is superseded.** The previous pack asked for
  `flagFor(country)` on the meta line *only when `isHomeMarket` is false*, with no city. This
  pack's card shows the flag *with the city* for every located agent, per the mockup; that ask
  was never built, so nothing was undone.
- **Sort kept its old options through phase 3** and swapped to the new four in phase 4. Replacing
  the set at the same moment the selects were deleted would have left a commit with no working
  sort.
- **Grouping partitions an already-sorted list**, so sort applies within groups for free rather
  than through a second ordering pass that could disagree with the first.
- **Two honesty rules in grouping:** grouping by turn keeps a section for the agents the axis
  doesn't apply to (a silently-dropped remainder would misstate the total), and unrated agents get
  "Not yet rated" rather than being folded into "One star".
- **Zero-count filter rows stay visible and inert.** "Nobody is closed" is worth reading, and
  hiding rows makes the popover jump as data changes.
- **The popover footer is a dismissal, not an Apply gate** — the list is already filtered behind
  it; the button states the live result so ticking a box answers "how many?" before you close.
- **Escape inside a popover is consumed on the capture phase** with `stopImmediatePropagation`,
  matching the country picker. Without it the key falls through to the page handler that discards
  an open card's draft, so dismissing a dropdown would silently throw away edits.

## Flagged for Nick's browser pass

jsdom cannot measure width, gutter, grid reflow or popover placement, and the page is auth-gated,
so the spatial results are all yours to confirm on dev:

- **Gutters at both viewport extremes**, panel expanded *and* collapsed — the FAB fix is the one
  that matters, and the previous pack's tab fix should still hold beside it.
- **Popover placement near the right edge** — the popovers are `position:absolute; left:0` under
  their button, so a Sort popover on a narrow viewport is the case to check.
- **Grid reflow at the 1240px cap** — the point where the column stops growing and the surplus
  becomes margin, plus the column count at common laptop widths against the 268px floor.
- **Group section rhythm** — the 38px section gap, the 88px stub against 23px Playfair, and how
  the sections read when one holds a single card.
- **The location line** in situ: flag-to-city spacing at real names, and long city names
  ellipsing rather than pushing the card.
- Everything still flagged in the first report: flip motion, the photo canvas pipeline, flex
  min-height chains inside the 580px editor, `:focus-within` caution, Escape ordering.
