# The drawer round — run report

**Contracts:** `todo-fullscreen-final.html` · `todo-sort-filter.html`, both installed from
`~/Downloads` byte-identical to their stated hashes (neither was in the tree), committed alone as
`c4080482` with the file count checked (`design-refs` 395 → 397) and both **enrolled on
`check-design-refs.mjs`'s watchlist** (20 → 22 guarded), so a later edit to either fails the build
rather than silently changing what this round's assertions cite.

**Where I stopped:** end of Phase 5. Recon is `run-artifacts/drawer-recon.md`.

---

## Deviations from the brief (recon's, plus one Phase 1 found)

1. **`todoPrefs.listView` does not exist** — Phase 6 **creates** it, extending the existing pure
   `ListView` in `src/lib/todoListView.ts` rather than adding a parallel value beside it. No rules
   change and no deploy: `firestore.rules` validates `todoPrefs` as `is map` with **no key-level
   check**, and it is already in the user-update allowlist.
   ⚠️ **That convenience is also a liability worth a decision.** Anything at all can be written
   under `todoPrefs` — any key, any shape, any size — and nothing on the server would object. It
   costs this round nothing and it is the kind of hole that is only ever found by something
   exploiting it; a later round may want a schema there.
2. **The sidebar collapse is skipped**, taking the brief's own escape. The state exists
   (`useSidebarCollapsed`) but it is instantiated in `WorkspaceShell` and no context, prop or event
   exposes it to a page. And `setCollapsed` **writes localStorage**, so a drawer-driven collapse
   would change the writer's own preference permanently — a run that died with the drawer open
   would leave it flipped. If it is built later it needs a *transient* collapse that never touches
   the stored preference, through the one seam named in the recon.
3. **Phase 1's manuscript column** is measured present (this account has four manuscripts); the
   absent half is proved at the rule and the wiring, and on the page by the class. See below.
4. **Agent photos are not wired.** `Agent.image` is documented — *"absent === the initials
   avatar"* — and is **not in the agent-update allowlist**, with 0 of 22 agents carrying one. A
   field with that docstring, no data and no way to write any is a promise the app has made and
   cannot keep; the fix is an allowlist entry plus an upload surface, which is its own small round.
5. **Phase 7 is ~8 files, not the 97 it first looks like** — `qcPanel` still to be confirmed as the
   `.ws` false positive before it is touched.

---

## Phase 1 — `todo: the list at full width` · `0521e829`

The list card fills the content area with no task open; the row is the contract's seven columns —
pill · deed · agent (22px blush disc) · agency · manuscript · wait · action — folding to three
when a task is docked.

### Two reasons the resting state was unreachable

Both had to go before anything in this phase could be asserted about a page a reader ever sees.

- **The auto-dock** opened the first card on the first render that had one, so `/todo` had no "no
  task open" at all with work on the board — the full-width list existed only in the frames before
  the data arrived. **Its own guard said so:** `restedOnce` existed because *"closing the pane
  deliberately would re-open it on the next frame"*, i.e. the effect was already known to fight the
  writer and the ref was a way to let it win exactly once.
- **Close did not close.** `paneCard` fell back to `heldCard` on `allDockable.length > 0`, which is
  true of the ordinary resting page, so the held card outlived `closeDock`. It is guarded on
  `dockKey` now: a narrowing leaves the key set (the writer has not closed anything, so the card is
  held) and closing clears it. The narrowed-to-nothing hold — the whole point of the fallback — is
  unchanged, and reading the queue's length could never have separated the two cases.

### ⚠️ And the pane has no close affordance at all — which is why nobody noticed

`closeDock` **has no caller**; `TaskPane` renders no Close; no Escape handler reaches the dock. That
is the second half of the same story: the auto-dock stopped you arriving at rest and this stops you
returning to it, so a held card surviving a close was invisible. **Reported, deliberately not
built** — the contract puts Close and Escape in the sheet's band, which Phase 2 builds and Phase 3
replaces, so a Close added here would sit in a band Phase 3 rewrites. Phase 2 now has a cause
rather than a symptom.

### ⚠️ The rail was a second card — found by measuring, not by reading

`.tdw-rail` carried `border: 1px`, `border-radius: 14px` and `overflow: hidden` from when it *was*
the bare column; the ported `.tlc` then brought its own 1px, 12px and shadow.

```
1440:  rail left 282 · card left 283      rail right 1382 · card right 1381
       rail 1100 wide · card 1098 wide     14px arc outside a 12px arc
       the card's 0 8px 26px lift: clipped away entirely by the wrapper
```

**It survived review because the two greys are almost the same** — `#ece5d8` outside `#e6dccd`. At a
straight edge that reads as one slightly heavy hairline; only the corners and the missing shadow say
otherwise, and only the arithmetic says it plainly. It is also exactly why the list card measured
1098 in an 1100 column: the fill assertion could not be satisfied while a frame sat between the
track and the card. The rail is a track now; the card is `.tlc`.

### Also in this phase

- **`.tdw-none` is retired with its mount.** At rest there is no work column for an empty pane to
  sit in — and it was the page's **third** empty statement beside `renderNewDesk` (not yet) and
  `renderDeskCleared` (well done), rendering whenever nothing happened to be docked, i.e. beside a
  full list of thirty tasks. `paneRestLine` and its nine unit cases are left whole and unmounted.
- **`.actb` is a `<span>`, not the contract's `<button>`** — the row is `role="button"` and the
  mockup's control carries no handler of its own. A real button inside a button is invalid and puts
  a second tab stop on every row for something the row already does. The treatment is the
  contract's to the pixel; only the element is honest.
- **The wide row's cells always render**; folding and hiding are CSS. Unmounting them would rebuild
  a third of the list on every open and close, and would make "the drawer is open" indistinguishable
  from "this row has no agency" to anything measuring a row.

### The three links, and where each is proved

The brief asks for "absent on one manuscript and present on two". The harness account has **four**,
and the fixture that carries the board's two shapes is about materials gaps; a one-manuscript
variant would mean deleting three manuscripts, which cascades their queries. So the claim is split
and each half is proved where it can be — stated rather than skipped:

| link | claim | where |
|---|---|---|
| 1 · the rule | `showsManuscriptColumn(n)` at 0, 1, 2, 4 | `taskListWide.test.tsx` |
| 2 · the wiring | the flag reaches the card's class, **rendered** not read from source | `taskListWide.test.tsx` |
| 3 · the geometry | the class's effect on the track and the cell, in a browser | `listWide.measure.ts` |

### Assertions — red→green

`tests/e2e/listWide.measure.ts` — **28/28 at 1440 and 1920.**

| # | claim | proved red by |
|---|---|---|
| P1.0 | the board rendered (population, first) | — precondition |
| P1.1 | the page **arrives** at rest — nothing docked, nothing folded | reinstating the auto-dock → **14 red** |
| P1.2 | the list card's width **is** the content area's | putting the rail's frame back → 4 red |
| P1.3 | the resting split resolves to one track | (with P1.2) |
| P1.4 | the wide row is a seven-track grid | — |
| P1.5 | the manuscript column is present and carries ink | — |
| P1.6 | without the class the track is zero and the ink hidden | `visibility: visible` → 2 red |
| P1.7 | the action control is transparent at rest | filling it → 2 red |
| P1.8 | under the row's hover it is `--pink` and says the word | — |
| P1.9 | the row holds no focusable child | making it a real `<button>` → 2 red |
| P1.10 | the agent's disc is 22px, blush, burgundy hairline | 26px → 2 red |
| P1.11 | the meta sentence is hidden while the columns carry its facts | showing it → 2 red |
| P1.12 | opening folds the card to 520 and the row to three tracks | 560px → 2 red |
| P1.13 | folded, the meta comes back and the action control goes | — |

`src/components/todo/taskListWide.test.tsx` — **8/8**, each proved red one at a time: `> 1` → `>= 1`;
`hasms` never emitted; `.r-ms` mounted conditionally; `.actb` as a real button; glyphs given a disc;
a second `.tlc .row` base rule.

**Two of my own assertions were wrong before the code was**, and both are worth recording:

- **P1.8 asserted `display: inline` and the computed value is `block`.** `.actb` is an inline-flex
  container, so a direct child is **blockified** — the browser rewrites `inline` before anything can
  read it. The rule was winning the whole time; the assertion was pinning a spelling. It asks "not
  none" now, and the CSS carries a note at the value so the next reader does not chase it either.
- **A `not.toContain("border")` on `.tdw-rail` went red on `box-sizing: border-box`** — this repo's
  most-repeated lock fault, wearing a property name instead of a class name. `drawsAnEdge` matches
  only a `border…:` at the start of a declaration.

### Nine assertions retargeted — four were pinning a spelling

The split's class became a template (`tdw-split` plus `open`), so three locks reading
`className="tdw-split"` went red over an element that had not moved — including one in
`todoWorkbench` that asserted `indexOf(...) < -1`, which no index can satisfy. `tasksViewport`'s
*"the rail is a CARD"* asserted the frame this phase retires.

Each states its claim now — the body's opening element wherever it is; the track list not being
content-sized (over **both** shapes, and forbidding `auto`/`min-content`/`max-content`/`fit-content`
by name rather than pinning a width); exactly one thing drawing the list's edge, with **both halves**
asserted because an absence alone passes on a page with no card at all. Each was proved red against
the fault it guards before being believed:

```
the rail draws a frame again   → 3 red
the rail clips again           → 2 red
the card loses the frame       → 3 red
```

A named carve-out was also removed rather than left to pass: `.tdw-rail` had been exempted from
*"no box in either chain clips"* because it was a rounded card. It is a track now and joins the flat
rule — a carve-out that has stopped applying quietly shrinks the population a case covers.

### Concurrency

This session owns `/todo`, the pane and its stylesheet. The calendar stream committed twice mid-run
(`4a75dc9d`, `235792f1`); `git diff --name-only` shows they touched only `TodoCalendarPage.tsx`,
`todoCalendar.css` and three of their own measures — no overlap, and nothing of mine was swept in.
All measurement ran in a detached worktree, because `bundleGuard` correctly refuses a bundle older
than its sources and their edit loop is faster than a Playwright run.

### Gates

tsc clean · production build clean (grepped, not tailed) · **7,553 pass**. Four reds are the
baseline's and none is this commit's, each proved by the file it names:

- `datePickerHub`, `calendarTokens`, `todoPageSmoke` — red on `e840c617` before this phase began.
- `todoTokenResolution` — `todoCalendar.css` reads `--tl-flag-lift`, which nothing defines. That
  file arrived in `4a75dc9d` from the calendar stream. **It is a genuine dangling-token red on
  `main`**, flagged for its owner.

`paneMounts.measure.ts` — the round's canary, and the first thing this round was expected to break —
**14/14 green** on the Phase 1 build, 30 rows, six journey kinds.

### One thing found, not this round's to fix

The **first row's pane renders an empty work area** — `0` characters, one child, a 338px blank
white card between the band and the foot. Checked against `4a75dc9d` before this phase's changes:
**identical there**, so it is pre-existing and not a Phase 1 regression. `paneMounts` reads
`chars=176` for "Decide" because it clicks a *different* Decide row — the per-pill sample is honest
about the type and does not reach this member. It may be correct behaviour for an offer (there is
nothing to fill in; the foot says *"this records nothing yet"* and offers the primary), in which
case it is a design question about an empty box rather than a bug. Either way it wants a look.

### Screenshots

`run-artifacts/p1-rest-1440.png` · `p1-rest-1920.png` · `p1-open-1440.png` · `p1-open-1920.png`


---

## Phase 2 — `todo: the drawer` · `e473c0bb`

Opening a task folds the list to 520px and brings the drawer in beside it in a single 380ms
motion. The list stays live underneath nothing.

### The two widths are one interpolation, not two transitions kept in step

The split's own `grid-template-columns` goes `100% minmax(0, 1fr)` → `520px minmax(0, 1fr)`, with
`gap` travelling from 0 to 18 beside it. The drawer's width **is** what the list gave up, every
frame, by construction — two transitions on two elements would be a synchronisation problem, and
this one cannot drift because there is nothing to drift from.

Sampled per animation frame, at both widths: list, drawer and gap first move on the **same frame**,
and `list + gap + drawer` equals the split to within **0.1px on all 40 frames**.

⚠️ **The resting shape is two tracks with the drawer's at zero, and that is why.**
`grid-template-columns` interpolates only between lists of the *same length*, so the one-track rest
state Phase 1 shipped would have made opening a snap. The gap has to travel with it: a standing
18px beside a zero-width track leaves the list 18px short of the width it is supposed to fill, at
rest, forever.

⚠️ **And `gap` must be declared once in that rule.** The first form had `gap: 0px` three lines above
the surviving `gap: 18px`, so the later declaration won and the resting split overflowed its own
content box by exactly 18 — the two-base-rules fault arriving *inside a single rule*, where the file
still reads correctly top-down. Locked three ways: one `gap` in the base rule, 0 at rest, 18 open.

### ⚠️ A preserved `scrollTop` is not a preserved place

Rows are **57.9px folded** (two lines) and **50px open** (one), so the same offset lands further
down the list after unfolding.

```
scrollTop  140 → 138        a two-pixel drift
top row    Ottoline Frayn → Marcus Reed        a whole row of movement
```

…at a shallow scroll; deeper in the list it is a row per eight pixels of row above you. **A pixel
tolerance would have shipped this** — the number looked like nothing. Asserting the *row at the top
of the port* is what caught it, and it is the stronger claim besides: it cannot be satisfied by a
coincidence of numbers.

The browser's scroll anchoring cannot do this one — it compensated 2px of a ~60px shift, because
every row changes size at once — and `overflow-anchor: none` is the wrong lever in the other
direction, which this repo already records. `TaskList` holds the anchor itself (the row at the top
and its offset) over the fold, in a layout effect, and leaves anchoring alone everywhere else.

### The pane's first way out

Until this commit it could not be closed by **any** route. Now: the band carries the contract's
**Close** chip beside ‹ ›, **Escape** closes, and **↑/↓** walk between tasks without closing.

- Escape is **last** in the page's Escape chain — the search clears first, then the narrowing,
  because a writer who has just typed into the search box means that, not the drawer three gestures
  ago. Two listeners on one key, each with its own guard, is how a key comes to do two things.
- Neither key fires inside an editable: ↑ and ↓ are cursor keys in a field and in a stepper, and
  the pane is full of both.

### ⚠️ There is no `prefers-reduced-motion` block in `todoSplit.css`, and writing one was the mistake

`workspaceShell.css` already ends with `.ws-app * { transition-duration: 0.01ms !important }` under
that query — app-wide, `!important`, deliberately last in its file. A block here **could never have
won**: it would have read as the drawer handling its own reduced-motion path while doing nothing at
all, and gone on looking correct forever. That is the rule-with-no-subject family.

So the measurement asserts the **outcome**, not the mechanism: 0.38s under no-preference,
effectively nothing under reduce. If the shell's block ever goes, that reddens — which a lock in
this file could not do.

### The sidebar skip is checked, not assumed

`.ws-panel`'s width must not move with the drawer. **The first form of that check guessed at
`.ws-side, .sv2-side, aside`, measured `0px` both times, and "passed" the equality** — the vacuous
shape, arriving through a selector that matched an element with no box. The floor (`> 0`) is what
makes it a measurement.

### ⚠️ The canary was red, and for a reason worth keeping

`paneMounts.measure.ts` waited on the pane's **height** and then asserted `VIS`, which is width
*and* height. Indistinguishable while the pane appeared at full width in one frame; wrong the moment
the drawer took 380ms to open. Five of six journeys reported `pane=false` with their content
demonstrably present (`workChars` 164–523) — **a green canary turning red on a working page**, which
is the most expensive kind of false alarm there is. The wait and the claim are the same predicate
now. **14/14 green** after.

### ⚠️ P2.1 could not be made to fail in its first form

Measuring only the two boxes left the claim structurally unfalsifiable: a 200ms delay on the track
leaves *both* widths pinned, because the list track is a fixed `100%` and the drawer has nothing to
take. And a 20px tolerance on `list + drawer` was absorbing an 18px fault — the sum legitimately
falls by the gap, so it was the wrong invariant to bound.

Sampling the **gap** with them, and asserting `list + gap + drawer === split` rather than a tolerance,
made both reddenable. **An assertion nobody has watched fail is unproved, not safe.**

### Assertions — red→green

`tests/e2e/drawerMotion.measure.ts` — **25/25 at 1440 and 1920.**

| mutation | red |
|---|---|
| a delay on the track only | 4 (P2.1, P2.2) |
| a backdrop laid over the page | 6 (P2.3 + knock-ons) |
| the list stops taking the pointer | 2 (P2.4) |
| the selected row loses its mark | 2 (P2.5) |
| the arrow keys stop walking | 2 (P2.7) |
| Close becomes a no-op | 2 (P2.8) |
| the fold anchor is not restored | 2 (P2.9) |
| Escape stops closing | 2 (P2.10) |
| the motion is 900ms | 1 (P2.12) |
| the resting gap opens to 18 | 2 (unit) |
| `gap` declared twice in one rule | 2 (unit) |
| the open gap never opens | 2 (unit) |
| the resting track becomes content-sized | 1 (unit) |

**P2.11** is the sidebar's "does not move", which no mutation reddens by design — its floor did the
work instead, and did it for real: the wrong selector produced `0px before · 0px after` and failed.

### Gates

tsc clean · build clean (grepped) · **7,551 pass**. The same four baseline reds as Phase 1, none of
them this commit's.

### Screenshots

`run-artifacts/p2-rest-1440.png` · `p2-rest-1920.png` · `p2-open-1440.png` · `p2-open-1920.png`

---

## Phase 3 — `todo: the sheet and the Quick reference slip` · `1cb76f10`

The three floating cards — header, work, action bar — become **one framed object** (`.sheet > .rim`
holding band, work and foot), and the record is promoted to a 264px sage-edged slip beside it, with
a bookmark tab on the sheet's edge when the slip is put away. **21/21 at 1440 and 1920.**

### The two laws, proved red first — as asked

Both were written and run against the three-card build before a line of it changed: **16 of 20
assertions red** on the old pane. The red pass earned its keep immediately — **P3.7 was green
against a page with no slip at all**, because "absent" satisfied "still away". It requires
`dismissed` first now.

**The wrap law is structural, not remembered.** The slip's 264px slot is *always* there; only the
slip inside it comes and goes, so nothing about its state can reach the band. The ref does not obey
its own law — its `.wcol` is `flex: 1 1 auto` over a collapsing slot, so dismissing grows the sheet
by 264px and the deed re-wraps. Restoring the ref's own behaviour as a mutation reddens 2. The cost
is 264px of empty desk when the slip is away, and it is the right trade.

**The height rule is `flex`, and `align-self` has nothing to do with it** — corrected by trying to
break it. The first note credited `align-self: flex-start` with the hug; mutating it to `stretch`
changed *nothing*, because `.wcol` is a flex **column** and `align-self` there governs the
horizontal axis. `flex-grow: 0` is the hug; `flex-shrink: 1` plus `max-height: 100%` is the cap.
The note now names the real mechanism — a note naming the wrong one is worse than none, because the
next person breaks the real lever while carefully preserving the decoration.

### ⚠️ The height assertion was circular in its first form

It computed the content's height as `sheet.height + scroller.overflow`. A sheet stretched to fill
has no overflow, so "wants" came back **equal to the cap** and `h === min(wants, cap)` was satisfied
by the very fault it exists to catch — **`flex-grow: 1` reddened nothing.** Only mutation shows
this; reading the assertion does not. The content's height is now summed from its parts (band +
foot + `scrollHeight` + padding + the rim's own borders), which does not know how tall the sheet
turned out. Two more corrections fell out of the same repair:

- **Round once.** Three separate roundings made a 0.6px layout read as a 1px disagreement at 1920.
  The claim is a full-precision `delta`; the printed figures stay rounded for the reader.
- **"Long" is width-dependent.** The same journey overflows by 418px at 1440 and fits at 1920, so
  "a long journey caps" as a fixture-shaped case was the short case twice at one width. The claim is
  now the rule — `min(content, drawer)` — with a run-level tally (P3.10) asserting **both branches
  were actually exercised**, so a fixture drifting shorter fails loudly.

### ⚠️ The fourth backtick of the round faked three clean mutation results

A comment containing backticks was moved *into* a `page.evaluate` template. The file failed to
collect, "No tests found" grepped as **zero reds**, and three mutations in a row reported clean
about runs that never happened. The mutation runner now refuses any run that produced fewer than 15
assertions, and the file was swept before anything after it was believed. That is the "No tests
found" trap escalated: it does not just hide a stale report, it **counterfeits a clean mutation
pass**.

### Also in this phase

- **`JourneyIntent` gains a required `glyph`** (✓ ⏱ × ↻) — the contract's fork mark, declared per
  intent rather than derived, because a derivation needs a default and a default here invents a
  meaning. All 16 intents state theirs; the compiler makes the next one do the same. The fork is
  the contract's roomy 80px grid; ledger rows 40 → 44.
- The foot keeps `actbar` beside `foot` — every rule and four measurements address it by that name.
- The slip's dismissal is the **session's**, at module scope (the `foundingStore` argument), and
  deliberately not persisted.
- `taskPanePort`'s fork fixture now derives from `JOURNEYS.send.fork` rather than a hand-typed
  copy — it went stale the moment the glyph landed, the an-input-the-system-can-produce fault
  caught in the act.
- `.fc`, `.ws`, `.ws.solo`, `.paneCol`, `.rec` deleted, not left inert. `.rec` was declared twice,
  two hundred lines apart — found by removing it.
- A journey with no record renders **no slip, no slot and no tab** — the slot is reserved only when
  there is something to put in it, a different claim from the wrap law and asserted separately.

### Mutations — all reddening

| mutation | red |
|---|---|
| the ref's own collapse restored (wrap law) | 2 |
| the sheet grows to fill (`flex-grow: 1`) | 3 |
| the cap and the shrink both go | 2 |
| the tab never appears | 2 |
| the tab stays while the slip is back | 2 |
| the tab rendered while the slip shows | 2 |
| a control appears in the slip's body | 2 |
| per-task dismissal memory | 4 |
| a second rim inside the sheet | 6 |

### Gates

tsc clean · build clean · **7,553 pass** · the same four baseline reds. `paneMounts` **14/14**.

### Screenshots

`run-artifacts/p3-sheet-1440.png` · `p3-sheet-1920.png` · `p3-dismissed-1440.png`

---

## Phase 4 — `todo: the unit row's Next` · `20ddc464`

The unit question is the pane's one *editable*, and the rule is written into the contract comment
as the brief instructs: **a question that can be edited rather than merely picked needs its own
commit gesture, and must never silently accept an unconfirmed value.** 16/16 measured.

### Red first, as asked — and the named one reddened hardest

Run against HEAD before a line changed: **8 red**, and the sharpest was the phase's whole case —
**a stepper press advanced the flow** ("What you sent" → "When" on a − + nudge), because commit and
advance were one callback. The assertion you named — *choose a unit, press nothing, prove the next
question does not open* — is green on HEAD too (choosing never advanced), so its red came from
mutation: wiring the pill's click to advance reddens **9 of 16**, the largest of the set.

### The three changes

- **The value follows the keys live.** The picker's draft was local until a commit — two copies of
  one number, which is what made "typed 7, kept 3" possible at all. Write-through removes the
  divergence structurally; emptying the field un-answers the question in the same keystroke, which
  is what makes the count honest while typing (P4.7 watches it dip and return).
- **The flow moves only on Enter or Next** — the contract's `.nextb`, pinned right of the row, the
  return glyph in a key cap. Steppers, arrows and blur commit and stay: nudging − + is still
  deciding. The optional free-text fields get the same split; Shift+Enter keeps the newline in the
  note, because a note has paragraphs and the rule is not worth the field's point.
- **Answered from the moment a unit is chosen** — the owner's amendment, superseding the journey
  round's `unitCommitted` gate. What made the seed dangerous was never its presence but its
  divergence; with write-through there is none, and the flag is retired with the fault it tracked.
  The `paneGate` lock is retargeted with that law stated, and asserts the flag is gone from the
  predicate entirely (comments stripped first).

### ⚠️ Answered-on-pick made the fallback advance by itself

The mechanism find of the phase. The open row is `openId ?? firstUnanswered` — so removing the
question from the unanswered set *in the same click* moved the fallback on with no gesture
anywhere. The first build of the phase failed its own P4.4 this way. Choosing a unit now **pins**
the row open (`onOpen(q.id)`); Enter and Next release the pin, and the fallback then points where
the flow should go. Pinned on the unit *change* only, never per keystroke.

### ⚠️ An orphaned rule fired in its second direction

`taskPane.css` carried `.tpn .unitrow { flex-wrap: wrap }` from a retired sample-spec cell —
`smplink`, `smpcell`, `smpbox`, `unitpill` and all, **zero renderers** — and the moment Phase 4
named a new element `unitrow`, the dead rule's wrap reached it and the Next pill dropped onto a
line of its own, seven hundred lines from the cause. **16/16 was green over it**: P4.6 asked
"shown", and a wrapped element still has a box. Caught by screenshot; the orphan cluster is
deleted; P4.6 asserts **geometry** now (on the row's first line, inside the rim), and restoring the
orphan's wrap as a mutation reddens it. A rule with no subject is not clutter — it is a claim lying
in wait for the next element to wander under its selector.

### Two latent faults the old advance-on-commit was masking

- **The stepper buttons never cleared the typing draft** (the arrow keys did), so a press after
  typing wrote the stepped value while the input went on showing the stale one — unobservable while
  every commit closed the row and unmounted the input; visible the first time it did not.
- **The deed was the wide pane's 19px.** Beside the slip the sheet is ~280px at 1440, and a full
  send deed wrapped to **eight lines**, starving the work area to a 122px scroller with the sheet
  nowhere near its cap. It is the drawer contract's own 16.5/1.34 now; `deedRound`'s P1.4 is
  retargeted with the law stated. Found by screenshot with every assertion green — the composed
  result again: every number correct, the page wrong.

### Mutations — all reddening

| mutation | red |
|---|---|
| choosing a unit advances the flow (the named one) | **9** |
| the gate wants the commit back | 5 |
| a stepper advances again (the old wiring) | 4 |
| the write-through is removed | 4 |
| Enter stops advancing | 2 |
| the Next pill is unmounted | 2 |
| the orphan's `flex-wrap` returns | 1 |

### Fixture repairs, each a lesson kept

The first Send row is a **full manuscript** (`wholeThing` — no unit to pick), so the probe picks
the row whose deed says *partial*; the reopen-finder hunted labels the page never had; and the
recorded value is read off the **closed row's own answer**, because advancing unmounts the input —
`input.value` after Enter measures an element that is not there.

### Gates

tsc clean · build clean · **7,581 pass** · the same four baseline reds. `paneMounts` 14/14 and
`sheetSlip` 21/21 on this build.

### Screenshot

`run-artifacts/p4-unitrow-1440.png` — the chosen unit expanded with its seed selected, the units
wrapping, the Next pill on the row.

---

## Phase 5 — `todo: completion leaves the list` · `2f4cae90`

A successful completion holds everything for the undo toast's own window (`WITH_UNDO_MS`, exported
— **one clock**, so "undo within the window" and "the row holds for the window" cannot drift): the
row stays in the list, still counted, still selected; the sheet stays on the task with
**Recorded ✓** in its foot instead of the primary; ‹ › already skip it, because it left the walk
queue at the write. When the window lapses the row fades (300ms), the footer count drops from the
one array, and the sheet opens the next open task — or closes the drawer when none remain.
**12/12 measured, run twice for stability.**

### Red first, in the brief's order

4 red on HEAD, and the named one was the sharpest: **the crossover's selection landed on
`seed-pkgq-4` while the originating row was `cor-move-a`** — the sheet and the row disagreeing
about which task just finished, on the deployed behaviour, exactly as the brief predicted.

### ⚠️ The race is at BOTH ends

Firestore's latency compensation re-derives the board **before** the awaited write resolves, so the
key-vanished effect moved `dockKey` while `completed()` was still waiting on the ack — the sheet
advanced during the window. The stand-down (`leavingRef`) is therefore armed **before** the write,
synchronously, in the commit wrapper. And the undo end mirrors it: clearing the hold on undo left a
beat where the key was in neither the derived board nor the hold, and the effect stomped in the
gap — so an undone hold stays armed, marked `undone`, until the board actually has the card back.

### ⚠️ The placement map remembers — geometry-not-presence, met one phase after it was written down

The map of row placements was rebuilt from the current board each render; the guaranteed post-write
render forgot the card, the lookup missed, and **the held row re-entered under the "yours"
fallback, three groups from home — with every assertion green**, because they asked whether the row
existed and held. *Where* it held did not exist as a claim until the screenshot forced it; P5.7 now
reads the group head above the held row. The map updates entries and never forgets one. The
restore-the-rebuild mutation is **timing-dependent end-to-end** (the ack sometimes beats the echo —
exactly why a suite alone missed it), so its deterministic red lives in the source lock.

### ⚠️ My `doneToast` wrapper had silently never landed — the phase's meta-lesson

The edit script asserted halfway and aborted **before writing**; I repaired the failed half
believing the first had applied. **Two green runs followed, green for the wrong reason** (`dockKey`
happened not to have moved), and undo left the 8s timer alive — a ghost-fade on the restored row
and a sheet-jump, eight seconds after the writer thought the matter closed. A multi-replace script
that dies on assert N leaves replacements 1…N−1 unapplied too; the repair must re-apply the whole
script, not the assert that failed. Both undo arms (the toast's button and the session's remembered
redo) now route through one wrapped closure.

### Also

- **The done group leaves the list.** A ticked note used to re-file under a rendered "done" group —
  the row left and arrived in one gesture, and the footer could never drop. The cleared log is
  untouched (`deskState` reads `boardCols.done` directly).
- **Undo brings the task back on screen even if the writer walked away mid-window** — without it
  the same undo sometimes restored the sheet and sometimes left a neighbour: the suite caught it as
  a flake, a writer would have met it as inconsistency.
- **The expiry advances only if the writer is still standing on the completed task** — stomping a
  selection made mid-window would be the auto-dock's fault reborn.
- **A failed write leaves everything as it was, with the failure stated in the foot** — and only
  the branch that knows nothing was *declined* sets it, because "couldn't record" over a choice the
  writer just made would be the app contradicting them.
- **The last task closing the drawer is locked at source** (the expiry's `?? null` IS `closeDock`'s
  state; Phase 2's measured close takes it to full width). The end-to-end walk needs the fixture's
  sparse shape — the same second-account gap as Phase 1's manuscript column. Stated, not skipped.

### The fixture is the restore

The expiry case spends the toast, so the toast cannot be the restore: the spec creates its own task
through the same Firebase SDK the board-shapes fixture uses, and the teardown deletes it whatever
happened in between — asserted in-run, loud on failure. The crossover case commits a real close and
presses Undo inside the window with no navigation between, per the standing rule.

### Mutations

| mutation | red |
|---|---|
| the hold completes the WRONG row (the named one) | 4 |
| the stand-down guard removed (the race returns) | 4 |
| the expiry never removes the row | 2 |
| `committed` stuck false | 3 |
| the done group renders again | 3 |
| the undo never tells the page | 1 |
| source locks (map mirrors · guard gone · last-task opens instead of closing · stand-down after the write · done group back) | 1 each |

### Gates

Build clean. tsc and vitest carry **only other streams' in-flight reds** — verified by file: 0 tsc
errors and 0 FAIL files in this change set; my 108 suite cases pass. The calendar stream's
`gpill`/`--tl-flag-lift` cases and the query-drawer restructure's suites are red against their own
uncommitted WIP in the shared tree.

### Screenshots

`run-artifacts/p5-crossover-hold-1440.png` · `p5-crossover-hold-1920.png` — the originating send
row held in **Needs you now**, selected, with the crossed close sheet reading "CROSSED FROM send",
"THIS RECORDS Closed as withdrawn, today", the foot's Recorded ✓ and the toast's Undo.
`p5-undone-1440.png` — after Undo.

---

## What worked — and the one finding the round is really about

### The resting state had never existed, and nothing had ever asked for it

**The first time anyone tried to render "no task open", it turned out to be unreachable.** Three
mechanisms, each individually reasonable, together guaranteed that `/todo` could not show its own
list:

1. **The auto-dock** opened the first card on the first render that had one.
2. **The held-card fallback** kept it on screen when the key was cleared.
3. **There was no Close** — no caller for `closeDock`, no control in the pane, no key.

Any one of them alone would have been survivable. Together they closed every route: you could not
arrive at rest, you could not be returned to rest, and you could not ask to be. The page had a
resting state in its markup and none in its behaviour, for as long as the split has existed.

⚠️ **`restedOnce` was the code admitting it.** The ref exists because *"closing the pane
deliberately would re-open it on the next frame"* — the effect was already known to fight the
writer, and the ref was a way to let it win exactly once. That comment had been sitting in the file
describing the bug in plain words, and nothing acted on it, because nothing needed to.

**And no assertion had ever asked for the state, because no design had ever needed it.** That is
the honest reason it survived — not an oversight in the checks, but a state with no consumer. It
became reachable and testable in the same hour it became required. **Which is the argument for
measurement over reading in its purest form:** every one of the three was visible in the source,
none of them was wrong on its own, and no amount of reading would have produced the sentence "so
the resting list cannot be shown".

### The rail-as-second-card is the kind of thing only pixels find

Two hairlines a pixel apart, `#ece5d8` outside `#e6dccd` — colours nobody would distinguish, reading
as one slightly heavy edge, surviving every review — while quietly clipping the inner card's lift
away. It was found by an assertion that asked for equality to a tenth of a pixel and got 1098
against 1100.

### The `scrollTop` catch is the round's methodological lesson

**A preserved number is not a preserved place.** Two pixels of drift and a whole row of movement; a
tolerance would have called it green. It is now a standing rule in `CLAUDE.md`, beside the two
coverage-assertion entries, because it is the same family one level up: there the fault hides under
a first-level scan, here under a tolerance.

### The reduced-motion block that could never win

Third instance in this sequence of **a rule that reads perfectly and reaches nothing** — after the
`.wpg--record` class no component emitted, and the `var()` on a retired token that silently fell
back. Asserting the *outcome* rather than the presence of one's own block is the correct response:
if the shell's `!important` ever goes, the measurement reddens instead of the behaviour silently
changing.

---

## Next

**Phase 6 — group & order, and filter.** The `todoListView` extension, both panels through
`AnchoredPanel` with fixed max-height and stable option rows, chips, the footer's two forms,
persistence through `todoPrefs`. Then Phase 7 (the re-prove sweep over ~8 suites, `qcPanel` to be
confirmed as a false positive first).
