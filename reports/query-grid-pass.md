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

From the LIST, measured on the same build: the snooze square opens `QuickActionPopover` (titled
*Snooze the nudge*), Escape dismisses it, and the primary opens the drawer and then the desk —
i.e. the handler extraction did not change the surface it was extracted from.

From the CARD, and the keyboard walk, and §6's live mapping: **not yet re-measured — the harness
account's sign-in was blocked mid-run** (see below). The three tests are written and were green in
part before the block; they are the first thing to re-run.

### Harness note — why four tests did not finish

Every measurement signs in with a password, because Firebase keeps its session in **IndexedDB**,
which Playwright's saved storage state does not carry. After enough sign-ins in one session Firebase
blocked further attempts from this device ("unusual activity"), which failed four tests and then
`auth.setup` itself. It is time-based and clears on its own; nothing about the app is implicated,
and the tests that ran before it hit passed on this same build. Re-running them is the outstanding
work below.



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

## Outstanding — the measurements the sign-in block cut short

Written and ready; they need a harness account that will sign in again:

1. `qcGridPass` §5 keyboard — Tab from the card into its own row, Escape back to the card.
2. `qcGridPass` §5 from the CARD — snooze and close open the popover anchored to the pressed
   control and open no drawer; the primary opens the drawer and the desk.
3. `qcGridPass` §6 live — with something waiting on the writer, a view filtered to zero must show
   the plain line and NOT the card (this account has 8 with you and 1 offer, so that is the branch
   it will take); the tally it prints is the evidence either way.
4. The two rendered red-then-greens for §5, scripted and ready (`after_proofs.sh`): the band stops
   being the row's containing block → the row must reach the fact line; the row joins the band's
   flow → the band's height must move.
5. The two empty cards' shots at each width. Neither card can be reached honestly on an account
   that has queries and has something waiting, so the worktree build gets a patch honouring
   `?__qce=first|filtered` (`force_patch.py`), the shots are taken, and the patch is restored. The
   report will say the condition was forced.

## Shots taken so far

`reports/query-grid-pass-shots/` — the grid at rest and a card hovered with its verb row, at
1280 / 1440 / 1920. The 1280 hover shot is the one that shows the status-word overlap.

## Standing flags

- **The list's snooze glyph is `☉` (SUN), not a bell**, while its own comment calls it a bell.
  The card draws a real bell. One of the two should move; the list was out of scope here.
- **`See what's waiting` cannot clear the shell's global search.** It clears the page's own search,
  the facets, the status ticks and the overdue flag, and sets the tile. If a global search term is
  what emptied the view, the CTA will not rescue it — flagged, not built.
- **Two overdue rules still exist.** The Past-expected tile reads `isOverdueForReply` (the writer's
  own expected date only); the card's `late` register reads `resolveExpectedDate` (the writer's date
  OR the agency's window). The second contains the first, so in the condition the filtered card
  renders in the tile necessarily reads 0 — but they are two derivations of one idea, and that is
  worth retiring in its own pass.
- **`aria-hidden` housekeeping:** the ghost card draws no verbs and no open control, asserted.
