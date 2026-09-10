# To-do — the three views, ported

Contract: **`design-refs/todo-three-views-contract.html`**, md5 `180d51fc828d990d646d30edf8b0ccd6`,
enrolled on the watchlist and asserted inside the Phase 4 lock.

Phase 0's full table — the contract's computed value beside the page's, per selector, per view — is
**`run-artifacts/views-recon.md`**.

| phase | SHA | what |
|---|---|---|
| 0 · recon | — | `views-recon.md`, no commit |
| 1 · the grid | `afffb576` | the ticket cards, and two dashed rules that had never rendered |
| 2 · the list | `28e7899c` | the Query Centre's table |
| 3 · the board | `7baad795` | one row per card, and three more unresolved tokens |
| 4 · the lock | `0acfc22d` | the diff that sees arrangement |

---

## Phase 0 — what the recon found

| view | absent | differing | property disagreements |
|---|---|---|---|
| grid | **0 of 14** | 12 of 14 | 41 |
| list | **20 of 21** | — | 3 |
| board | 1 of 15 | 12 of 14 | 21 |

**The list did not exist.** Twenty of the twenty-one elements the contract draws in that view had no
counterpart: no column header, no group head of the Query Centre's kind, no status edge, no date
chip, no stamp, no stands sentence, no actions cell. What was there was a 44px single-line row with
a category pill, a deed carrying the agent inline, and a wait fragment.

**The grid was all there and almost all wrong** — every element present, 41 property disagreements
across 12 of them.

**The board was closest**, missing only the wait, and carrying a whole extra row the contract draws
`display: none`.

### the three largest differences a writer would see

- **grid** — the tag was a mono uppercase 5px-radius label where the contract draws a 22px pill in
  the body face; the two dashed rules that part the deed from its figures from its foot were
  **invisible**; the status was a dot with no word.
- **list** — it was a different object. A dense 44px ledger row against a two-line table row.
- **board** — every card carried a second row, so cards were 89px against the contract's 61.

---

## What was missing versus merely different

**Missing, and this is the round's finding: three tokens read by three surfaces resolved to
nothing.**

| where | token | what it silenced |
|---|---|---|
| `.tkt .facts` · `.tkt .tfoot` | `--hair2` | both dashed rules on every grid ticket |
| `.brd-colh .c` | `--edge` | the column count's border |
| `.brd-colh .r2` | `--muted2` | the column caption's colour — it fell to `currentColor` |
| `.brd-card .disc` | `--edge`, `--paper` | the disc's rim |

A `var()` on an unresolved custom property makes the whole declaration invalid at computed-value
time, so each fell back to nothing — `border-top-width: 0px · style: none · color: rgb(58,28,20)`,
that last being `currentColor`, which is the signature. **Every one of those rules reads perfectly
correctly in the file, and every one shipped through a green build.** `.tlc`, `.tpn` and `.tdf` each
define these on their own root; the ticket and the board are siblings of all three and inherit from
none. This repo already records the law — *"the token exists" is not "the token resolves HERE"* —
and it had been broken on two more surfaces since the round that built them.

**Merely different, and each waived at its own value with the reason:** the app's `--edge` is three
points from the ref's and its `--muted` and `--paper` a few more (the ref's private palette against
the app's own tokens); the ticket's title is Inter 14.5/600 against the ref's Playfair 18/500 (see
the false premises); the status edge and the board card's top border are **derived**, so the two
pages give two correct answers about two different queries; `margin-left: auto` resolves to
whatever is left beside a column name; and `.board`'s `height: 100%` is 100% of two different
parents.

---

## The end state

| view | absent | in the wrong place | property disagreements |
|---|---|---|---|
| grid | 0 of 14 | **0** | 7, all waived |
| list | 1 of 21 *(declared)* | **0** | 5, all waived |
| board | 0 of 15 | **0** | 3, all waived |

**Phase 4's lock: 148 assertions · 398 properties matched · 15 waived · 49 places compared · 0 red.**

## Assertions, red → green

`run-artifacts/views-claims.txt` carries the fourteen claims the diff cannot make — the ones about
DERIVATION and about ABSENCE. Every one was watched failing on a mutation aimed at the thing it
guards, and the mutation is always made to the app or to the CONTRACT'S copy, never to the check.

| # | claim | proved red by |
|---|---|---|
| G1 | the ticket paints the same set of regions the contract paints | — *(compared against the ref, so it cannot be pinned)* |
| G2 | the edge and the tag are different colours from different derivations | — |
| G3 | the ticket's edge IS a resolved ladder token | — |
| **G4** | **the status is a dot AND ITS WORD, in ink** | deleting `getStatusLabel(card.status)` from the foot → `1 dot · word ""` |
| G5 | the ticket's height is the contract's, within 1px | fired on M1 below, as a knock-on |
| **G6** | **the facts and the foot each sit on a dashed rule that actually paints** | putting `--hair2` back out of the ticket's reach → `facts:0px none · tfoot:0px none` |
| L1 | the group head is white, with no disc | — |
| L2 | every row's verb is one the contract prints, and the column is contextual | — |
| L3 | six tracks, five named cells, a 5px status edge | fired on M5 below |
| L4 | the row's edge IS a resolved ladder token | — |
| **B1** | **every board card is one row — 70px or less at 1440** | re-adding a `.fact` row → the tallest card went past 70 |
| **B2** | **the fact row is GONE from the DOM, not hidden** | the same mutation → `1 .fact element in the board` |
| B3 | the task is the card's largest text | — |
| B4 | the status dot leads the agent line | — |

### the mutation table — five, each aimed at one phase

| # | mutation | what fired |
|---|---|---|
| M1 | `--hair2` put back out of the ticket's reach | G6 and G5 — the dashed rules stop painting and the card loses 2px |
| M2 | the status word deleted from the ticket's foot | G4 |
| M3 | the group head's name back to mono 9px | the diff, on `.lgh .t`'s properties **and its place**, and on `.lgh .n`'s place |
| M4 | a `.fact` row re-added to the board card | B1 and B2 |
| M5 | the list's `.lact` renamed and hidden | the diff, three MISSING — `.lact`, `.lact .go`, `.lact .ic` |

⚠️ **M3 is the one worth reading.** Changing one property on the group head's NAME reddened three
assertions: its own font, its own position, and **the count pill's position beside it** — which no
property of the count changed. That is the arrangement half doing its job on a real edit rather
than on a contrived one.

---

## False premises in the brief

Four, and the brief's own rule settled three of them — *where this brief and the file disagree, the
file wins.*

**1 · "Title Inter 600, not Playfair" — and the file renders Playfair.** `.card .ttl` is declared
**twice** inside the contract's own cards section: Inter 14.5/600 for the ticket, then Playfair
18/500 thirty lines later, as a leftover of a superseded `.card .body`/`.desc`/`.foot` card the
ticket replaced. The cascade takes the last, so the ref RENDERS Playfair. **The brief won here, and
it is the one place it did** — because CLAUDE.md already carries a standing ruling on the identical
duplicate in `todo-qc-style.html` (*a reasoned value in prose beats an unreasoned one in an
artefact*), and because the app already had the ticket's own declared value. Nothing changed;
the difference is waived and named.

**2 · "Column heads unchanged (they already match)."** They did not. Two of the three unresolved
tokens above were theirs — the count had no border and the caption no colour.

**3 · "the group head … contains exactly three children."** This app's has four. The head is a
**disclosure** — the tightened round made it collapse its section — and the contract's is not, so
the ref has nothing to say about a chevron. Removing a working control to satisfy a drawing that
never had one would be a functional loss wearing a port's clothes.

**4 · a fifth thing the contract declares and does not draw.** `.lgh .rule` is an element in the
ref because it has no `::after` to hand; this app's head already draws that hairline as
`.grp::after`. Asserted **absent** with its reason rather than gaining a span to satisfy a drawing.

### and one deviation of the round's own

**The row keeps the name `.row` where the contract says `.lrow`** — recorded at the rule. 143
assertions across 41 measurement suites address `.tlc .row`; renaming it would be a change of
SPELLING with no claim behind it, which is what this repo's locks exist to refuse. Every child
inside it is the contract's own word.

**And the tag is scoped to the To-do page.** One component, two refs: the dashboard's
`dashboard-cappuccino-v29.html` draws `.tk .tag` as a mono 9.5 uppercase label with a stated
argument at the rule, and this contract draws a pill in the body face. Neither is wrong — they are
drawings of two surfaces. `.tkt-grid` and `.os-tkgrid` were spliced from the two call sites, so the
scoping cannot reach the dashboard and its gates measure what they measured.

---

## Phase 4 — the diff that sees arrangement

`tests/e2e/viewsDiff.measure.ts`. For every selector in Phase 0's table it compares the computed
properties **and** the element's rect inside its own container.

**Both directions are proved, in the lock itself:**

1. **a bent contract value reddens** — `border-radius: 4px` forced onto the ref's board disc; the
   diff reports 4px against the app's 50%.
2. **an element MOVED, with every one of its own properties untouched, reddens** — the ref's disc is
   widened to 60px, which moves the task beside it. The lock first asserts that *every one of the
   task's own declared properties is unchanged*, then that the place check notices anyway, then
   that the element genuinely moved by more than 10px. **This is the drawer-foot hole, and the
   proof is that a property-only diff passes this mutation.**

### what the harness had to learn about itself — four things, and the fourth is the lesson

⚠️ **1 · The contract's first board card is URGENT, and the `glow` keyframe sets `box-shadow`.** So
`.bcard` read back `rgba(58,28,20,0.04) 0 1px 2px` — the animation's own 0% frame — against an app
whose motion the harness suppresses. It looked exactly like the app having the wrong shadow, and
the app had the right one. **The contract's motion is suppressed now, as the app's already was:
compare two pages in the same posture or you are comparing two postures.**

⚠️ **2 · A resolved track list is a fact about the container's width, not about the rule.**

⚠️ **3 · So is a position — and three attempts to normalise it each fixed one class of artefact and
created another.** Shares of the container failed pixel-anchored children. Flush-edge anchoring was
written backwards first (a flush-RIGHT element's LEFT edge is the content-driven one) and then
failed containers. Per-track proportions failed mixed fixed-and-flexible templates.

⚠️ **4 · THE ANSWER WAS TO STOP NORMALISING AND MAKE THE TWO PAGES THE SAME WIDTH.** The contract's
view root is forced to the app's measured content width, and every reading is then in pixels. The
whole class of argument disappears, and what is left is exact: **"either edge agrees" is the precise
test for "it did not move"**, because a translation shifts both edges together while a width change
holds the anchored one. Vertically the tolerance is 4px and it is paid for by two recorded
differences — the app's inherited body face is Source Sans Pro where the ref's is Inter, and the
ticket's title is deliberately Inter against the ref's Playfair — rather than by generosity.

⚠️ **AND ONE FAULT ONLY THE PICTURE COULD HAVE FOUND.** The board card's agent line printed
**"Noah Bright · Noah Bright · Bright Literary"**: `record` is already joined from `[name, agency]`,
and the port bolded the name and appended it. Every property of `.ag` matched. Its position matched.
It is the composed-result rule again — a measurement of the parts is not a measurement of the
whole — and the screenshot the phase renders anyway is what caught it.

---

## Concurrency

⚠️ **Several other sessions are live in this checkout and none of their work was touched.** `main`
was 9 commits ahead of `origin` when this round began — a calendar stream (`qc-cal`), a dashboard
stream (`dash`) and a build fix, all committed and unpushed by their own sessions — and it moved
again mid-round (`9544efdf` landed while the measurement worktree was being created). Their source
was clean throughout; only `run-artifacts/` and `reports/` were dirty, which are measurement
outputs.

**Every commit here staged by explicit path**, and the tree was checked after each. Measurement ran
in an isolated worktree at `/tmp/sa-views` against a `build:dev` of the tip, bound `--host
127.0.0.1`, for the standing reason: `dist/` and `src/` are shared, and another session's edit loop
invalidates the bundle faster than a run completes.

⚠️ **The push carries their nine commits with it**, because `main` is one branch. Flagged rather
than worked around: there is no way to push this round's five without pushing what is under them,
and CI runs on the tip either way.

---

## Screenshots — `reports/todo-three-views/`

`app-{grid,list,board}-{1440,1920}.png` beside `contract-{grid,list,board}-{1440,1920}.png`. The
contract is rendered at the same viewport as the app in every pair — two pictures at two sizes
cannot be compared by eye, and "it looks like the mockup", taken at the mockup's own convenient
width, is the claim this round exists to stop being made.
