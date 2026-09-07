# To-do on the Query Centre's chassis — the round

**Complete: Phases 0–7, on `main`, pushed, deployed to dev.** Recon in
`run-artifacts/qc-chassis-recon.md`; per-phase measurements in `run-artifacts/qc-chassis-p{1..6}.txt`.

**52 assertions across six phases, 0 red, measured against the deployed dev bundle** — and every
phase watched failing on a mutation aimed at the thing it guards.

| phase | SHA | what landed |
|---|---|---|
| contracts | `af98bb58` | the three refs, enrolled |
| 0 · recon | — | `qc-chassis-recon.md`, no commit |
| 1 · header, tiles, toolbar | `e7acb30e` | the page moves onto the Query Centre's own parts |
| 1 · measured | `48e429ec` | the TDZ crash, the two totals, `visiblePage()`, two `CLAUDE.md` rules |
| 1 · reconciled | `c595a02e` | the nine reds Phase 1 left in `tightened.measure.ts` |
| 1 · reported | `a77860f6` `20165878` | the rail badge is a third number |
| 2 · categories | `4a8512fc` | `reason` recorded at source; Category as a grouping |
| 3 · the ticket grid | `d540e2ae` | the view switch stops being decorative |
| 4 · the board | `3d9e768b` | five columns, and a third view the contract does not draw |
| 5 · the drawer | `437de8cd` | `SlideOver`, and the task opens over the grid |
| 6 · urgency motion | `927ec967` | the lens moves, reduced motion proved both ways |
| 7 · re-prove | `9051ac43` | every phase red-proved; three suites the round had broken |

---

## The two findings that matter most

### 1 · Phase 1 shipped a page that crashed on every tile click, through green gates

`railGroups()` is a hoisted function whose first render-time caller sits at line 924. Phase 1 made
it reach `tileNarrow`, which reads `nudgedBefore` — declared eight hundred lines further down.
Every tile click threw `Cannot access 'oc' before initialization` and dropped the whole page into
its error boundary.

**Three things made it invisible.** `tsc` cannot see through a function boundary. `tileNarrow`
returns early while the tile is `all` — the initial state — so the page LOADED perfectly and only
died on the first click. And a warning comment describing this exact fault, from the last time this
file had it, sat **four lines above the offending call site**.

It reached dev. `todoTileTdz.test.ts` asserts the ORDER now, both halves, proved red by putting the
bug back. This is the whole argument for the rule the round added to `CLAUDE.md`: *a phase whose
measurement has not run is not landed, whatever the gates say.*

### 2 · Phase 2 was red for two commits and nothing said so

It was green when it landed. Phase 3 made the ticket grid the default view, and Phase 2's probe —
which reads `.tlc .grp`, because grouping draws HEADS and heads are a list concept — quietly began
measuring a page showing tickets. Four of its six assertions went red the moment Phase 3 committed.

That is the presumed-vacuous rule arriving from the other end: the usual form is a suite going
vacuously GREEN after a rebuild; this one went **red and was invisible anyway**, because each phase
had written its own report saying it passed and nothing re-ran it. The same fault hit
`tightened.measure.ts` (twelve assertions) and `paneMounts`, the round's own canary, which reported
"the board did not render" about a page full of work.

**Phase 7 exists to re-run everything rather than trust those reports, and it earned its keep on
the first pass.**

---

## What each phase decided

**Phase 2 — the reason is recorded where it is known.** `nudge_overdue` has two feeders and one
type: a first chase, and a check-in the writer booked on a query they have already nudged. The
second is a silence, not a nudge, and belongs in Gone quiet. Phase 1 told them apart with a boolean
every caller computed by reaching into `queries`; two sites did, and the board and the cards would
have made four. The derivation that RAISES the task has the query in hand — it records `reason`
there, the card carries it, and `taskCategory` takes one argument again.

Category also became a grouping, and it is **not `type` renamed**: `type` partitions by the six
buckets (the shape of the act), `category` by the five the tiles, columns and tags all speak (where
the work came from). An offer is a `decide` under one and an Agent request under the other.

The account had no `lastNudgeSentDate` at all, so Gone quiet was a **monoculture** — five
stale-window rows that would have passed every assertion while the branch separating the feeders
was never entered. `seedNudgedQuery.mjs` supplies the missing state; P2.4 is a tally, not a count,
and fails loudly on a row matching neither shape.

**Phase 3 — the ticket grid, and the switch stops being decorative.** Phase 1 mounted Grid/Board
and read `todoView` nowhere: a control that looked like a choice and changed nothing, live on dev,
past a lock that counted its options and never asked whether either did anything.

The ticket takes its edge from `stateFor`/`STATE_TOKEN` — the Query Centre's own palette, not the
ref's literal `TINT` table, which would have been a second status palette free to drift. Its
figures come from `listRowInputs`, so a ticket and its row cannot state different numbers. Its
burgundy calls `isUrgentCard` rather than repeating the test, which is why P3.6 can assert the
burgundy figures **ARE** the urgent cards as a set equality.

**The grid and the list are two views of ONE card.** The first cut swapped the whole card and took
the footer with it — the count and the key hints vanished, `.tpl-zone` left the chain, three locks
went red and were right to. Only the body swaps now.

**The labels key on the BUCKET, not the category**, and the rendered page said so: Agent requests
holds both a partial request and an OFFER, so a per-category table gave an offer "Asked on" — a
claim about something nobody asked for.

**Phase 4 — the board.** Five columns, because `CATEGORIES` partitions every card exactly once.
Urgent stays a lens: a sixth column would drain into another overnight. Every column renders,
including empty ones, which say "Nothing here" rather than leaving a hole.

⚠️ **Three views, not the contract's two, and this is a stated departure.** Mounting the board made
Grid and Board the only reachable states, which stranded the LIST — its dense rows, their action
strips, and the five keys the footer teaches. The ref draws two because its mockup has no list to
strand. The footer now teaches those keys **only in List**, asserted in both directions.

⚠️ **The board's classes are `brd-`, not `tbd-`, because those are taken by a ghost.**
`todoBoard.css` still declares `.tbd-col`/`.tbd-card`/`.tbd-empty` for the retired four-column
board, whose component is "mounted nowhere" — and that sheet is still LOADED, because `PortalMenu`
imports it. **`TodoBoard.tsx` being a dead component with a live stylesheet is flagged, not fixed**:
untangling it from `PortalMenu` is real work, not a line removal.

**Phase 5 — `SlideOver`.** The app had three right-hand drawers and no shared one. This is that
shape once, with the Query Centre's two-duration trick kept. It **names its three non-adopters and
migrates none** — each sits in a file another stream is mid-round in — and `slideOver.test.tsx`
asserts both that it has a live mount and that the three still own their own fixed elements, so the
list is a fact rather than a memory. It went red on the mount half before the mount existed.

**Two faults the screenshot found and the assertions did not:** the split still folded its list to
520px behind a drawer that takes no width, squeezing the grid to one column for nothing; and at 580
the pane's reference rail took half the drawer and left the document a strip. Neither was reasoned
— both came from looking at the picture, which is the argument for rendering one per phase.

**Phase 6 — the urgent lens moves.** Still for three-quarters of a 4.5s cycle, then a nudge with a
glow timed to land with it, staggered in three phases, paused on hover. One file for both card
kinds so `prefers-reduced-motion` answers in ONE place. The resting mark — the ticket's border, the
board card's burgundy head — lives with the cards, because it must survive reduced motion: motion
is the emphasis, the border is the fact.

⚠️ **The reduced-motion fault is PARTIAL, which is why the assertion reads every card.** Moving the
override above its target stopped **five of six** urgent cards and left one moving: the
`:nth-child` selectors inside the block are 0-3-0 and outrank the later base rule at 0-2-0, so only
the card matching neither `2n` nor `3n` kept its animation. A check that sampled one card, or asked
whether "the motion stops", would have passed over a page still moving.

---

## The mutation table — every phase watched failing

| phase | mutation | what fired |
|---|---|---|
| 1 | the tiles count the raw board again | P1.2b — tile 30 against footer 28 |
| 2 | `taskCategory` ignores the recorded reason | P2.4 (tally 0-and-5), P2.5 |
| 3 | the ticket's burgundy stops calling `isUrgentCard` | P3.6 — 19 against 6, both sets printed |
| 4 | an empty column renders `null` instead of words | P4.4 — `says ""` |
| 5 | the split's pane mounts alongside the drawer | P5.3 — one in each |
| 6 | the reduced-motion block moved above its target | P6.4 and P6.6, naming the single card |

---

## Open, for Nick

1. **The rail badge is a third number** — it reads 29 against the page's 27, because it counts
   snoozed and dismissed cards the page drops. Predates this round; contradicts `ShellSidebar`'s own
   comment. What the badge MEANS is a product call, and it is shell chrome. P1.2c prints both every
   run.
2. **The task drawer lost its hug at laptop height** — Phase 1's chrome lowered the sheet's cap:
   content wants 461px, the cap is 404 at 900 and clear from 1050 up. `tightened` P3.10b tests the
   law at 1050 so it is not silently dropped, which is not the same as the hug being fine.
3. **The urgent motion's intensity.** Six cards nudging every 4.5s is what the contract draws; it
   may be more movement than a work page wants. One value in `urgentMotion.css` changes it, and
   dropping the wiggle while keeping the glow is one line.
4. **`TodoBoard.tsx` is dead with a live stylesheet** — worth a cleanup pass of its own.

---

## Corrections to the brief and the contracts

1. **`.card .ttl` is declared twice in `todo-qc-style.html`** — Inter 14.5/600, then Playfair 18/500
   two hundred lines later, so the ref RENDERS Playfair while the brief specifies Inter 600. The
   brief wins; recorded at the value because a reader diffing the two will find it.
2. **The tags' family tokens are not the ref's.** It calls them `--now1`/`--house1`/`--yours1`;
   this app has never had those. Copying them meant three rules reading tokens nothing defines — a
   `var()` with no fallback drops the declaration entirely, so the tags would have rendered with no
   background at all, silently, through a green build. The token lock caught it.
3. **The view switch has three segments, not two** — see Phase 4.
4. **The board is not draggable**, per the brief's out-of-scope list, and should not be: the
   category is derived from the query's state, so dragging between columns would mean changing what
   kind of task a thing is, which is not the writer's to decide.

---

## And one about the machine

`vite preview` bound **IPv6 only** — the mirror image of the note already in `CLAUDE.md`. Every
localhost measurement took **16–17 minutes instead of 22 seconds** and failed three different ways
(a dead `auth.setup`, a `toBeVisible` timeout, a run that wrote no report), costing about an hour
before the socket was the thing anyone checked. Bind it with `--host 127.0.0.1`;
`lsof -nP -iTCP:<port> -sTCP:LISTEN` names the family in one line. Written into `CLAUDE.md`.
