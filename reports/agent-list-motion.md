# Agent list — motion — run report

Three phases on `claude-il` (worktree `/Users/nickphysick/ScriptAlly-il`), one commit each, every
commit gated on `tsc --noEmit` + `vite build` + full Vitest. No deploys, no rules changes.

## Commits

| Phase | Commit | Suite | Shipped |
|---|---|---|---|
| 1 | `e50b363` | 1749 | Shared `rise`/`fall` stylesheet; page-load sequence with the row stagger; mockup committed + annotated |
| 2 | `c6210fe` | 1758 | FLIP helper (settle-before-measure); arrival, bump, discard, scroll-into-view |
| 3 | `f1b6738` | 1775 | Save's three beats; id adoption; cross-section fall/rise; both notices + Undo |

Suite 1743 → 1775.

## 1 · Where `rise` lives, and the Hub

**It never existed.** `git log --all -S"@keyframes rise"` returns nothing on any branch, and there
is no `queries-hub-v4` work anywhere — the newest Hub commit is v3 phase 1 (`0e78da2`). The Queries
page's only animations are a cursor blink and a toast countdown. Nick's correction: the prompt was
written and parked when the shell changed, and asserted a dependency that was never built.

**Resolved by creating the shared home first**, which honours "one keyframe, never a second" in the
other order. `src/styles/motion.css` now holds `rise` (7px lift + fade) and `fall` (5px up + fade),
imported from `index.css` so they are app vocabulary rather than page furniture. The header comment
states they are shared and consumed by more than one page, so nobody scopes them back into a
component, and a lock asserts the agent list never redefines them.

**⚠️ The `queries-hub-v4` prompt needs amending before it is run:** its Phase 4 must ADOPT
`rise`/`fall` from `src/styles/motion.css` rather than define its own. Not amended here — out of
this pack's scope, as instructed.

The Hub was **not** repointed, because there was nothing to repoint: no existing animation was
moved or changed, only a new shared definition created.

## 2 · Did the grid keying support FLIP?

**Partly — and the gap was exactly where the pack predicted.**

- **Add and discard: fine as they stood.** Cards are keyed `key={agent.id}`, so on an insert or a
  removal every neighbour keeps its identity, React moves the DOM nodes, and FLIP has real elements
  to measure. No change needed.
- **Save: broken, and fixed by id adoption.** The draft card is keyed by a temporary id
  (`new-abc123`); the saved agent arrives from Firestore with a real one. The key changed, React
  destroyed the node and built a fresh card, and FLIP cannot animate an element that no longer
  exists. `addAgent` already returned the created id, so the fix was small: adopt it onto the draft
  node **on a confirmed successful create only**, so the incoming snapshot matches the existing node
  and React moves it. On a failed write nothing is adopted — the draft stays a draft and the error
  surfaces as before, so no node ever claims an id that isn't in the database.
- **Group sections: left structurally alone**, per Nick's ruling. Each section renders its own grid,
  so a card changing section moves between different parent elements and remounts regardless of
  keying. Rather than flatten the layout, a card that changes section now **falls at its old home
  and rises at the new one** — a design decision, not a workaround: a card moving within a list is a
  shuffle and sliding is honest, but a card that has changed category flying across a heading
  implies a continuity that isn't there.

## 3 · Was the sorted position knowable at save time?

**Yes.** Sort is applied to the DATA — `sortAgentList`, a pure function over the agent array, inside
a `useMemo` — not to the rendered list. So the destination index, the total, the sort's label and
whether the card still survives the filters are all computable before anything moves.
`src/lib/agentSaveOutcome.ts` does exactly that, and a lock asserts the outcome is computed **before**
the first beat, so the choreography and the sentence can never describe different things.

## 4 · ⚠️ The settle-before-measure trap is worse than documented

The pack said a filled animation outranks an inline transform, so the bump "silently does nothing".
**Measured in a real browser, it is worse than that.** A card holding a finished `fill-mode: both`
animation, given `transform: translate(200px, 150px)`:

```
unsettled  → matrix(1, 0, 0, 1, 0, 7)      ← the FLIP offset is discarded AND the
                                             entrance keyframe's own 7px offset wins
settled    → matrix(1, 0, 0, 1, 200, 150)  ← as asked
```

So an unsettled card doesn't merely fail to travel — it sits **visibly displaced by 7px**, which
reads as a layout bug in a place nobody would look for a motion one. The helper settles every
element before any rect is read (not settled-then-measured one at a time, since adding a class can
itself reflow), and I verified the ordering lock fails against the interleaved version.

## 5 · Bump performance with sixteen cards

**No dropped frames.** Measured in-browser with 300px-tall cards: 17 cards, all displaced, cost
**4.8ms of JavaScript in total** — 4.4ms for the settle-and-measure (one forced layout) and 0.4ms to
invert. That is comfortably inside a single 16.7ms frame, and the 340ms bump itself is a
transform-only transition, so it is compositor work with no per-frame layout or paint.

The guard the pack asks for is already in place regardless: `playFlip` touches **only** the cards
whose position actually changed — a card that stayed put gets no transform, no transition and no
compositor layer. All new positions are read before any style is written, so there is no read/write
thrash. If this ever does drop frames on a much longer list, that is the lever, not the duration.

## 6 · Other notes worth keeping

- **The suite runs `environment: node`** — there is no DOM in tests at all. So the column-count
  parsing was split from the DOM read to keep the arithmetic genuinely testable, and the FLIP tests
  drive the helper through minimal fakes. Everything else DOM-shaped is an artefact lock.
- **The row stagger reasoning is recorded in three places** (the lib, the stylesheet and the
  committed mockup) because it is exactly the kind of rule that gets "corrected" to per-card later.
  Sixteen cards at 25ms each would spend 400ms on stagger alone; by row it finishes in 240ms, and
  every row past the fourth shares the fourth delay so a two-hundred-agent list costs the same.
- **The load sequence disarms itself.** Not tidiness — a card still holding a filled entrance
  animation would ignore every later FLIP transform (see §4).
- **Undo is offered only for an edit.** A save that created an agent has no previous version, and
  undoing it would mean deletion — which this page deliberately has no affordance for, since
  `deleteAgent` has no cascade and would orphan queries.
- **A no-op Done writes nothing, animates nothing and says nothing.** It is not an event.

## Browser-check list

The page is auth-gated, so everything below needs a signed-in pass on dev. Standalone harnesses
verified the mechanisms (row stagger at four columns, the FLIP invert, the settle trap, the bump
cost) but not the real page.

- **Row stagger at sixteen cards** — four visual rows, each arriving together; confirm nothing
  past the fourth row waits longer.
- **The bump at both add and discard** — cards making room, and the gap closing afterwards.
- **The three save beats** — that the crossfade reads as a transformation in place (no rotation),
  that the breath is perceptible, and that the travel reads as a consequence.
- **A save whose sorted slot is off-screen** — the notice is the whole point here.
- **The filtered-out notice** — save a never-queried agent while filtered to Active queries; check
  the card leaves, the sentence appears, and "Show all agents" clears and scrolls it into view.
- **Grouping on, card changes section** — it should fall and rise, never fly across the heading.
- **Reduced motion** — every one of the above should still READ correctly with all animation off.
- **⚠️ The specific question Nick asked: is save now indistinguishable from add?** Id adoption
  removed the remount, so the saved card should travel exactly as an added one bumps. If the card
  still blinks, flashes, or restarts its entrance at the moment of saving, the node is being rebuilt
  somewhere else and adoption has only moved the problem.
