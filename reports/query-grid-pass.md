# Query Centre — the Grid pass

Six sections, five commits, 10–11 September 2026 (measured on the 12th). The grid lost its well and got the ref's shadows
(§1), the fact line gained a register chip and relational sentences (§2, §3), the page opens on
what needs you (§4), the band grew verbs (§5), and the two empty moments got the cards the ref
drew for them (§6).

| § | what | commit |
|---|---|---|
| 1 | the well leaves the DOM; the card and tile shadows return to the ref's | `e1cee04a` |
| 2 | the register chip replaces the `!` ring | `e455939d` |
| 3 | relational copy — sentences about who is waiting on whom | `e455939d` |
| 4 | Attention sort, and it is the Grid's default | `d64824d3` |
| 5 | band verbs — ink primary, icon squares, ⋯ | `d78b6f8a` |
| 6 | two empty states on `IlloSlot` placeholders | `d78b6f8a` |
| — | the two refs' notes fenced and their copy table completed | `ffd49e0d` |

---

## False premises, first

**1 · The ground is not `#f2ede7`, and the page was already on the app's own.** The brief and the
ground ref both say treatment A puts the grid "on the app ground `#f2ede7`". Measured, walking the
painted layers behind a card: `.ws-work--fit` `#fefcfa` → `.ws-window` `#fefcfa` (the window card)
→ `.ws-main` `#f7f4ee`. The app's ground is **`--ws-ground: #f7f4ee`**, which is locked in
`workspaceShell.test.tsx`; `#f2ede7` is the mockup's own `--ground`, and in the app it is
`--shell-panel`/`--shell-parch` — a different surface entirely. Nick's ruling: keep the token,
repaint nothing, and record the correction. So §1 was the well's removal and the shadows, and
nothing else. The ref now carries a fenced note saying so.

**2 · "Contact list already sits on the ground" was the same mistake one page along.** Measured:
Contact list sits in the identical chassis — the same `.ws-window` card on the same `.ws-main`. The
two pages did not disagree about their ground; they disagreed about a well, and the well is gone.

**3 · The hover lift cannot be built, and is now recorded as unbuilt rather than pending.** A
`translateY(-2px)` on hover and the grid's FLIP inverse transform are the same property on the same
element: last write wins, and the re-order animation is worth more than two pixels. Refused during
§1, ruled dropped, and the ref's own rule is fenced in place (`ffd49e0d`) so the next reader does
not treat it as outstanding.

**4 · "Filtered to zero" and "nothing needs you" are different facts (§6).** The ref draws one card
for the filtered moment, headed *Nothing needs you right now* — but that headline is a claim about
the whole set, not about the filter. Type a search to zero while a partial is waiting to go out and
the card would state something false, confidently, on the one page whose job is to tell you what
needs you. So the card renders **only where the claim holds** — no query in the set the tiles count
is in a register that needs the writer — and everywhere else the page keeps its plain
`Nothing matches.` line. Three outcomes where the brief describes two; the third is the old line,
unchanged.

**5 · The two refs disagree about where the verbs go, and the brief picks the winner.** The
enhancements ref (section 2) fades the FACT LINE and puts the verb row there; the locked verbs ref
draws the row in the BAND. The brief specifies the band, which is what is built — and the fact line
is now measured clear of the row rather than assumed to be.

**6 · "The first's numbers equal the tile counts" is true under one definition, and it is the one
built.** The card's number is counted with the With-the-agent tile's OWN predicate (`inQuick(turn,
"agent")`) over the tiles' OWN set (`mastheadScopedQueries`, manuscript scope only). Equality is
then structural rather than lucky: the card only renders when nothing needs the writer, which means
no query is past its window, which means every agent-side query is calm. The two derivations are
asserted against each other in `queryGridEmpty.test.ts` — never against a literal.

**7 · The list's "bell" is not a bell.** §5 asks for a bell for snooze, and the card draws one. The
LIST row's snooze glyph is `☉` — U+2609 SUN — beside a comment that says *"the bell is
snooze"*. The card is right, the list is out of this pass's scope, and the mismatch is flagged
rather than fixed.

---

## §1 · The well, and the shadows — `e1cee04a`

The recessed well left the DOM rather than going transparent: a see-through recess still has a box
to anything measuring the page. `.qcc-plain` — already the board's and the calendar's wrapper, and
carrying the well's box metrics to the pixel — became unconditional, so the change is a DELETION and
the toolbar does not move. The card's rest shadow went back to the ref's
`0 1px 2px rgba(58,28,20,.05), 0 8px 22px rgba(58,28,20,.09)` (it had been deepened for the recess)
and the tiles' to `0 1px 2px …04, 0 5px 14px …06`, values two refs state independently.

Four locks about the well were **deleted, not repointed** — a lock aimed at a subject that no longer
exists is a lock inventing a claim. The fifth was never about the well (the sticky row's law) and
stayed.

## §2 · The register chip — `e455939d`

`registerOf(turn, pastWindow)` is one derivation with five values — `calm · late · you · offer ·
closed` — and the chip NAMES it at the head of the fact line. The `!` ring is gone from the render:
it said "something is wrong here" in one shape and left the reader to work out what. The chip needs
no `aria-label` (its own text is its name) and the sentence takes its colour from the same register,
so chip and sentence cannot disagree.

## §3 · Relational copy — `e455939d`

Sentences are about who is waiting on whom, per the locked ref's column C, with the agent's first
name and **no pronoun anywhere** — the record holds no gender. Three rulings from Nick during the
run, all built: a query with no stated window gets no invented date (*"Waiting on Harriet — no reply
window stated"*); *"{First} closed to submissions"* is its own row rather than a variant of the
pass; and the distance is numerals (*"1 day"*), which is what the brief asked for where the ref's
table reads "a day".

The ref's table was missing five sentences the build renders. They are in it now (`ffd49e0d`),
column C only, under a fenced note: closed · to submissions, closed · withdrawn, calm · no window,
no response · weeks only, no response · no window. The note also records the "1 day" divergence, so
the table stops being incomplete without anyone having to remember why.

## §4 · Attention sort — `d64824d3`

A new sort key, `Attention`, orders by register — your move, then past the window, then offers, then
calm by nearest expected date, then closed — and it is the Grid's default. Ties inside a register
fall to last activity, newest first; calm with no stated window sorts last among calm. It reads the
card's own register, so the order and the chip cannot disagree about the same query. The comparator
is pure (`queryAttentionSort.ts`) and locked as a partition rather than as an index list.

## §5 · Band verbs — `d78b6f8a`

On hover or focus the turn caption fades (120ms) and the verb row stands where it stood: the primary
as an ink pill carrying its name (`--btn-ink` #1c130f, parchment text, mono 8px/.08em, `0 11px`,
26px), then 26px squares for snooze (agent's side only) and close (open rows only), then ⋯.
Availability is `queryVerbs`' — the list's table, not a second one.

**The card's root stopped being a `<button>`, and that was forced rather than chosen.** Interactive
content may not nest inside a button, so a band holding buttons cannot sit inside one. The card is
now a container whose FIRST child is `.qcc-open`: an absolutely-placed, pointer-transparent button
carrying the card's whole name and its focus ring. First, because Tab from the card must reach THIS
card's row — the brief's keyboard rule — and DOM order is tab order. Pointer-transparent, because a
click should land on the card itself (whose handler opens it by bubbling), which also keeps hover
alive for everything underneath, the materials tip included. Escape inside the row hands focus back
to that control and stops there.

No wrapper was built and the FLIP is untouched: `data-qcc-id` is still on the root, so the re-order
animation moves the card and its row together without composing anything.

**One handler for both views.** The list row's inline closure became the page's `handleRowVerb`, and
the grid mounts the same function: the primary opens the drawer and then the desk (the desk needs its
host, and its ghost rung needs a rail), while snooze and close open `QuickActionPopover` and change
nothing else — one decision each, no drawer, no selection. A card cannot open something a row would
not, because there is only one thing to open it with.

## §6 · The two empty states — `d78b6f8a`

Both are `QueryEmptyCard`, both on 96px round `IlloSlot` placeholders (`empty · first` /
`empty · filtered`) that say they are unfilled until artwork exists.

**No queries at all** — *Your first query goes here*, the ref's line, `+ Log your first query`
(enters create mode), `or import a spreadsheet`. It replaces the old empty-database split — a
placeholder list column beside a ghost of the reading pane, behind a welcome card — and that CSS is
deleted in the same commit. One addition to the ref's card: the import-template link survives, as a
second quiet route on the alternatives line. An earlier pack had ruled those routes survive "as
quiet alternatives, not deletions", and the importer does not offer the template itself, so dropping
it here would have removed the only in-app way to it.

**Filtered to zero** — *Nothing needs you right now*, a factual line built from the same `cardFacts`
the cards state, an ink `See what's waiting` and a mono `or clear the filter`. Two honesty rules
inside it:

- the line never calls a query with no stated window "inside its window". Where every agent-side
  query has one it is the ref's sentence; where some do not it splits (`{n} queries are with agents;
  {w} are inside their windows.`); where none does, it states only what is true; and where nothing is
  with an agent there is no line and no CTA, because a door onto an empty tile is a control that does
  nothing.
- `See what's waiting` sets the With-the-agent tile exactly as pressing the tile sets it, and lifts
  the narrowing that emptied the view — but NOT the manuscript scope, which is the set the number was
  counted over.

`gridEmptyKind` decides both slots and the third (`nomatch`) from one place; its partition is locked
as a property over every combination of inputs, with a tally proving each outcome is reachable.

**One thing fixed in passing:** with a draft open and the filters excluding everything, the grid used
to answer with `Nothing matches.` and not draw the ghost at all. The selector treats a visible ghost
as content, so the preview now shows.

---

## Red, then green

Every lock in this pass was made to fail on the one thing it guards, in an isolated worktree holding
exactly the committed code, and then checked green again with the file checksummed back.

| what was broken | the lock that noticed | red |
|---|---|---|
| the chip reads a fixed label instead of the card's register (§2) | `QueryCard.test.tsx` | 1 failed / 19 |
| a sentence says "waiting on **her** partial" (§3) | `queryCopy.test.ts` | 4 failed / 10 |
| the attention rank puts `late` above `you` (§4) | `queryAttentionSort.test.ts` | 1 failed / 5 |
| snooze is drawn on every card, not where `queryVerbs` offers it (§5) | `queryBandVerbs.test.tsx` | 1 failed / 11 |
| the filtered card renders whether or not its headline is true (§6) | `queryGridEmpty.test.ts` | 2 failed / 11 |
| its number stops using the tile's own predicate (§6) | `queryGridEmpty.test.ts` | 2 failed / 11 |

And on the rendered page, where §5's two geometric claims live. **The first two mutations proved the
wrong assertions, which is recorded rather than tidied away:**

| mutation | what actually went red |
|---|---|
| the band stops being the row's containing block | *"the verb row left the band"* — the containment assertion, not the fact-line one |
| the row is statically placed in both states | **still green** — a row that is in the flow at rest AND on hover cannot change the height *between* them. The band is 2px taller always, which is a different claim needing a different check. |
| the row is placed over the fact line (the enhancements ref's own §2 placement) | *"the verb row covers the fact line"* ✓ |
| the row joins the band's flow **on hover only** | *"the band changed height on hover"* ✓ |

The two that matter are proved by the last two. The second row is the useful one to keep: the
band-height assertion guards the row ARRIVING in the flow, and says nothing about a row that was
always in it — worth knowing before anyone trusts it to catch the latter.

---

## Measured on the page

12 September, against the committed build (`d78b6f8a`) served from a measurement worktree, at
1280 / 1440 / 1920. `tests/e2e/qcGridPass.measure.ts`; readings in `reports/query-grid-pass.json`.

### §5 · geometry — 30 card-measurements, every turn present at every width

| width | cards | turns seen | band rest → hover | row ∩ fact line | row at rest → hover | caption on hover | status-word gap |
|---|---|---|---|---|---|---|---|
| 1280 | 10 | you · sand · agent · offer · closed | 51.00 → 51.00 (all) | none | 0 → 1 | 0 | **−37.9** … 93.2 |
| 1440 | 10 | you · sand · agent · offer · closed | 51.00 → 51.00 (all) | none | 0 → 1 | 0 | 15.4 … 146.5 |
| 1920 | 10 | you · sand · agent · offer · closed | 51.00 → 51.00 (all) | none | 0 → 1 | 0 | 175.4 … 306.5 |

The two assertions the brief asks for hold everywhere: **the band is exactly as tall hovered as at
rest** (30 of 30, to within 0.01px) and **the verb row never intersects the fact line** (30 of 30) —
the latter by construction, since the band is the row's containing block, which is the thing the
mutation below actually tests. Row widths by turn: your move 135.0 · the agent's side 198.6 (it
carries the bell) · offer 167.6 · closed 87.6.

### ⚠️ The finding the brief did not ask for: at 1280 the row covers the status word

The gap column above is the distance from the status word's right edge to the row's left edge. At
1440 and 1920 there is room to spare. **At 1280 six of ten cards are negative** — −37.9 on an
agent-side card (whose row is widest, 198.6px, because it carries the bell), −23.8 and −14.7 on
your-move cards — and the shot shows it: the hovered card reads *"Partial Request"* with the ink
pill sitting on the *"ed"*. Nothing in the brief's assertions fails; the band keeps its height and
the fact line stays clear. It is the status word that gets painted over, while the pointer is on
that card.

Three ways out, none of them built, because all three change what the ref draws:

1. **Fade the status word with the caption** (one rule, `.qcc-word` joins the existing fade). The
   band then says "what you can do" while you point at it and "what state this is" the rest of the
   time; the StatusDot and the band's own tint still carry the state, and the fact line states it in
   words underneath. Simplest, and my recommendation.
2. **Let the word truncate** (`min-width: 0; overflow: hidden; text-overflow: ellipsis`) so the row
   pushes it rather than covering it. Honest, but "Partial Requ…" at the width where the reader most
   needs the word is not obviously better than losing it cleanly.
3. **Widen the cards at 1280** (two columns rather than three below some width). The biggest change,
   and it costs density on the width that has least of it.

### §5 · the verbs open what the list row's verbs open

From the CARD, at 1440: the snooze square opens `QuickActionPopover` titled *Snooze the nudge*
with the panel **flush to the pressed square** (nearest-edge distance 0.0px) and **no drawer**
(`.qpn[data-on='true']` count 0 — one decision, no selection change); Escape dismisses it. The ×
opens *Close this query* the same way. The primary opens the **drawer first and then the desk**
(`.qpn[data-on='true']`, then `.qcd-card .qrd`), which is the order the list has always used.

From the LIST, same build: the snooze square opens the same popover and the primary the same drawer
and desk — the handler extraction did not change the surface it was extracted from.

The keyboard walk, at 1440, reading the accessible names as it went:

| step | where focus is | its name |
|---|---|---|
| focus the card | `.qcc-open` of `thin-q-close` | *"Rosalind Vale, Vale & Marchetti — Queried. Rosalind is 380 days past the window"* |
| the row is revealed by that focus | — | `.qcc-verbs` opacity 1 |
| Tab | inside **that same card's** row | *"Record response"* |
| Escape | back on `.qcc-open` of the same card | — |

### §6 · the empty states, live and forced

**Live, on the harness account (1440).** The registers the cards themselves state:

| Your move | Past expected | Offer | Waiting | Closed |
|---|---|---|---|---|
| 8 | 20 | 1 | 10 | 15 |

Twenty-nine of those need the writer, so a view filtered to zero must take the plain line — and it
did: searching to nothing left 0 cards, `.qcc-none` rendered, and **neither** card did. That is the
gate working on real data rather than on a hope about the fixture.

**Forced, for the shots.** Neither card can be reached honestly on an account that has queries and
has something waiting, so the measurement build (worktree only, never committed) was patched to
honour `?__qce=first|filtered`, the shots were taken, and the patch was restored and the committed
state rebuilt. What the cards measure:

| card | box | slot | heading | line | actions |
|---|---|---|---|---|---|
| first | 640 × 351 | 96 × 96, `border-radius: 50%` | Playfair 21px | the ref's, verbatim | `+ Log your first query` · `or import a spreadsheet` · `download the template` |
| filtered | 640 × 331 | 96 × 96, round | Playfair 21px | *30 queries are with agents; 10 are inside their windows. The next reply is expected on 13 Sep.* | `See what's waiting` · `or clear the filter` |

Two things in that line are the point of §6. **30 is exactly the With-the-agent tile's number** —
same predicate, same set. And **10, not 30, are "inside their windows"**: the twenty past-expected
queries are with agents and are not inside anything, so the sentence splits rather than claiming
they are. The ref's single sentence would have stated something false about twenty queries.

The first card renders with **no tiles and no toolbar** above it (measured: no visible `.qct-tile`);
the filtered card keeps both, because the page is not empty — the view is. The 1920 shot of the
first card was lost to a sign-in flake; the card is `max-width: 640` and centred, so 1280 and 1440
already show it at full width.

### Harness note — the sign-in block, and what it cost

Every measurement signs in with a password, because Firebase keeps its session in **IndexedDB**,
which Playwright's saved storage state does not carry. Enough sign-ins in one session and Firebase
blocks further attempts from the device: four tests failed in `ensureSignedIn`, and then
`auth.setup` itself did. It reads exactly like "the page never rendered", and every retry extends
it. Stopping and waiting cleared it; the same four tests then passed in 39.5 seconds.

It also cost one real fault-finding: the §6 measurement had been targeting the **hidden list
column's** search box (`aria-label="Search queries"`) rather than the toolbar's, and sat out a 180s
timeout on a page whose search box was on screen the whole time. Fixed in `fa441182`'s follow-up —
and it is the hidden-mounted-page hazard in its smallest form: two inputs answer that name, and the
one that answers first is the one nobody can see.



---

## What the measurements turned up that nobody asked for

**1 · "Past expected" reads 0 in the tile and 20 on the cards, on the same screen.** Measured on the
harness account: the tile says **0**, and **20 of 54 cards** carry the `Past expected` chip. Both are
correct in their own terms and the page states them an inch apart.

The cause is two derivations of one word. The tile counts `isOverdueForReply`, which reads **only the
writer's own expected date**; the card's register reads `resolveExpectedDate`, which prefers the
writer's date and **falls back to the agency's stated window**. Nobody on this account has set a
writer date, so the tile is empty while twenty agencies' windows have passed. This predates the pass
— §4 and §6 only made it visible, because the register is now drawn on every card and the tiles sit
directly above them. It is the "two numbers both called X" fault this repo keeps retiring, and it
wants its own small pass: one predicate, read by both.

**2 · The relational sentence truncates on most cards at 1280.** The fact line is one line with an
ellipsis, and §3's sentences are roughly twice the length of the neutral ones they replaced
(*"Reply expected by 23 Sep"* → *"Waiting on Harriet — reply expected by 23 Sep"*). Measured over all
54 cards:

| width | sentences cut | captions cut | by register |
|---|---|---|---|
| 1280 | **34 / 54** | 22 | Waiting 10/10 · Past expected 19/20 · Closed 5/15 · Your move 0/8 · Offer 0/1 |
| 1440 | 4 / 54 | 3 | Waiting 1 · Past expected 2 · Closed 1 |
| 1920 | 0 | 0 | — |

The registers that lose their words are exactly the ones with the longest templates, and *"Rosalind
is 380 …"* is what a reader gets on the card whose whole job is to say how far past the window it
is. **The LIST does not have this problem** — its `Where it stands` cell wraps, so the same sentence
reads in full there. One sentence, two containers, one of which cuts it. Your-move sentences are short and never cut. Options: let the sentence wrap to two lines (the
grid already stretches cards to the tallest in the row, so the cost is some height at the narrow
end); shorten the calm and late templates; or accept it above 1280. Not built — it is §3's copy, and
the ruling is yours.

**3 · The verb row covers the status word at 1280** — numbers, shot and options in the measured
section above.

---

## Gates

Run in an isolated worktree holding HEAD (`823b1eaa`) plus exactly the files of this change, because
the shared checkout had another session's To-do work in flight and its reds are theirs:

- `tsc --noEmit` — **0 errors** (read from the compiler's own exit code, never through a pipe).
- production build — **clean**: no `error` and no `[WARNING]` line in the whole log, not just its tail.
- `vitest run` — **473 files, 7,792 passed | 3 skipped**. One file failed to COLLECT there
  (`functions/src/email.test.ts`: a fresh worktree has no `functions/node_modules`); with its
  dependencies linked it runs 9/9.
- design refs — **57 guarded, unchanged**; the two edited refs were re-recorded deliberately and
  nothing else was.

Provenance of the primary tree's reds at commit time, read rather than moved: `listCells`,
`taskListWide`, `tasksViewport`, `boardSettings` — all To-do, all importing files this pass never
touched, all dirty in the shared checkout from another session's list round.

## Outstanding

- **The broader Query Centre measurement sweep was not completed.** The sign-in block killed it
  twice, so rather than keep hammering the account I ran the suites this change can actually break.
  The desk and rung internals were not re-run; nothing in this change reaches them, which is a claim
  about the diff rather than a measurement.

  | suite | verdict | provenance |
  |---|---|---|
  | `qcGridPass` (new) | **9 of 9 green** | this pass's own |
  | `queryCentreCard` | one divergence: `card.display` ref `block` vs built `flex` | **identical at base** (791cc61f), same line, same words — the column flex predates this pass by several |
  | `queryViews` | the tiles case counts 16 where it expects 5; two cases about the DRAWER's verb row (*"the verb row is empty"*, *"no Snooze"*) are red, and this pass touches no file the drawer renders from. **The drawer-opens-from-Grid/List/Board case passed** — the check that matters here, since the card's root changed. Two more cases were red for reasons this pass owns, and are fixed in `ac0daf54` (below) | **identical at base**: `Expected: 5, Received: 16`, and the scrim case was retrying at base too. The tiles probe reads `document`, so it sees To-do's tiles as well — the hidden-mounted-page hazard, in a suite that predates this pass |
  | `qcFlash` | two red | both are list-era probes on a Grid-default page: they wait for `.f12-row` and the list head AFTER the load, and neither exists in the Grid body. **And this build is better than base on the claim the suite exists for**: at base the empty-state words flashed at ~10s (`first-run copy seen: true`); here they never appeared |

  **Two of those reds were this pass's own litter, found by running rather than by reading** and
  fixed in `ac0daf54`:

  - **Fourteen `.qcc-well` selectors in three measurement files** — `queryViews`, `qcCalendar`,
    `qcCalLayout` — still named the element §1 deleted. Each waited 30 seconds for it and then
    reported *"element(s) not found"* about a page that works. Repointed at `.qcc-plain`, which
    carries the same box to the pixel (that is why §1 reused it), so every geometric claim survives;
    the one assertion genuinely about the recess — its `#eee8e0` fill — is **inverted** instead: the
    frame paints nothing and the window's ground shows through, and it asserts both halves.
  - **The Sort menu's row count** still expected five where §4 made six by adding Attention. It now
    asserts six *and* that Attention leads, because a count cannot tell an added key from a renamed
    one.

  With those repointed, `well · the recess`, `toolbar v2` and `parity` pass. What is left red is
  two cases about the DRAWER's verb row, below.

  The one thing worth saying about `card.display`: now that the root is a `<div>`, `display: block`
  is finally *possible* — it was a flex column because a `<button>` centres its own content box. It
  would close that last divergence, and it would also move where a short card's spare height sits
  (`.qcc-body`'s `flex: 1` stops applying). A separate decision, not smuggled in here.
- **The first card's 1920 shot** (one sign-in flake; the card is 640px capped and centred, so the
  two widths taken show it whole).
- **Three rulings**, all in the sections above: the 1280 verb-row overlap, the sentence truncation,
  and whether the Past-expected tile or the register should move.

### The sweep's verdict

Every red in these suites is either **identical at base** — the card's `display` and the tiles' count
of 16, both checked against the base run rather than assumed — or **this pass's own stale lock**,
repaired in `ac0daf54`. The one case that directly tests what §5 changed — the drawer opening from
Grid, List and Board — passes. The two remaining reds are about the DRAWER's verb row, and no file
the drawer renders from is in this pass's diff; an A/B against the base build is the last word on
them and is running as this is written (result in `ab2-*.log` beside this report).

**⚠️ And the first A/B was void, which is worth more than its result.** The script checked out the
base commit, the checkout ABORTED on a stray spec file in the worktree — and the loop carried on and
built, ran and reported two "sides" that were the same build twice, in perfect agreement. It is the
`cd X && …` failure this repo already records, wearing a different coat: a step that fails without
stopping turns the next step into a measurement of the wrong thing. The redo verifies `HEAD` after
the checkout and stops if it is not what it asked for.


## Shots

`reports/query-grid-pass-shots/` — twenty:

- the grid at rest and a card hovered with its verb row, at 1280 / 1440 / 1920 (the 1280 hover shot
  is the one showing the status-word overlap);
- one card per register at 1440 — waiting, past expected, your move, offer, closed;
- the List at 1280 / 1440 / 1920, showing the relational copy;
- the filtered-to-zero page as it really answers on this account (`filtered-live-1440`), and the two
  empty cards with their conditions forced — first at 1280/1440, filtered at 1280/1440/1920.

## Standing flags

- **The list's snooze glyph is `☉` (SUN), not a bell**, while its own comment calls it a bell.
  The card draws a real bell. One of the two should move; the list was out of scope here.
- **`See what's waiting` cannot clear the shell's global search.** It clears the page's own search,
  the facets, the status ticks and the overdue flag, and sets the tile. If a global search term is
  what emptied the view, the CTA will not rescue it — flagged, not built.
- **Two overdue rules still exist** — measured at 0 against 20 on one screen; see finding 1 above.
- **`aria-hidden` housekeeping:** the ghost card draws no verbs and no open control, asserted.
