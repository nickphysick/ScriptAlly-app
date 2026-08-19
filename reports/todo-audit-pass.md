# To-do page — working the audit

Design authority: `design-refs/todo-materials-contract.html` (committed `362e682`, md5
`1d4d72ee…`, byte-identical to the Downloads copy). **Checked first:** every string the audit
names is in that file — `Send to`, `Sent previously`, `Then expect`, `Record the send`,
`What goes`, `Anything else?`, `Will record`, `The story so far`, `Your turn`, `days with you`,
`Snooze` — and `TRACKING` and `THEIR WINDOW` are **not**. The audit is accurate about the mockup;
these are gaps the contract run did not reach, not disagreements about what the mockup says.

Measured on the deployed site before touching anything (`tests/e2e/auditRecon*.measure.ts`), because
a screenshot cannot tell "absent" from "below the fold".

## The one cause under three symptoms

`.tdk-workrow` was a wrapping flex row, and it **had wrapped**. `flex: 1 1 420px` +
`flex: 0 1 300px` is 720px of basis inside a 650px workrow, so the timeline dropped onto its own
line: measured **300×181 below a 650×482 form**, narrowing to 284px with a journey open.

That single fact explains three separate items in the audit — the entries wrapping mid-phrase (a
starved card), the timeline card looking wrong, and half of why the page did not fit (a stacked
pair is twice as tall as a paired one).

⚠️ **AND MY FIRST FIX FOR IT WAS WRONG — recorded because the wrong fix was plausible and passed
four suites.** I made it a grid, on the reasoning that this was the `.tdw-split` fault one level
down. It is not. **`.tdw-split` sits in a fixed-height frame, so being sized by its content is its
bug; `.tdk-workrow` sits inside `.tdk-w`'s scrollport, so being sized by its content is its job**,
and stacking when the measure is short is the *intended* layout — `paneFrame.measure.ts` states and
reasons it: side-by-side needs a 736px workrow, 1440 gives about 436. A grid cannot wrap, so it
broke exactly what the wrap was for: **the form fell to 314px in a journey at 1440 and to ZERO at
390** — the starved-track fault, reintroduced by the fix for it. `paneFrame` caught it on the
deployed site; the four suites I re-ran locally did not cover it.

**The actual cause was one missing grow factor.** `flex: 0 1 300px` has no grow, so a timeline that
wrapped onto its own line stayed 300px and read as a starved card under a full-width form. With
`flex: 1 1 300px` it fills the line: measured **650×250 where it was 300×181**, and the entry name
gets 574px where it had 20.

⚠️ **AND ITEM 4 IS NOT IMPROVED — pane overflow at rest is 993 → 1003.** The duplicated story saved
about 200px and the contract's own timeline shape gave it back: a date beneath each name is two
lines where a side column was one, plus the terminus row. That is the design, and it means the card
is not going to fit until the form does — see item 5 below.

## Worked, in the audit's order

**1 · One story, one place.** `TRACKING` stood in the form card while `The story so far` stood in
card 3 — both mapped from the same `timeline(card)`, three inches apart. Confirmed in the DOM:
`.tdk-act` contained `TRACKING 5 Jun Full requested · via email…`. The **rich** render was the one
being deleted, so it moved rather than dying: the StatusDot marks, the channel, the agent's own
words and the window bar are card 3's now. Deleting the richer of two duplicates and keeping the
plainer is how a consolidation quietly loses content.

**2 + 6 · The entries, and the rail.** These are one fix. The row was
`grid-template-columns: 60px 20px minmax(0, 1fr)`, spending 80px of every card on a date and a mark
before the name got anything — at 284px the name had ~150 and "Full requested" broke in half. The
date moved **beneath** the name (the contract's `.tl-e .d`), so the name has the full measure at any
width: measured 132px each in a 208px card. With that came the rail — one `::before` line behind
the marks, replacing a segment drawn per pair that had to know which entry was last — and the
`Your turn · Today` terminus, without which the story stops at the last thing that happened and
never says the next move is yours.

⚠️ **The terminus mark is deliberately not a `StatusDot`, and the lock says so.** Every dot drawing
a query *status* goes through the component; this one draws a *turn*, which is not a status and has
no member to pass. A local ring for statusless events was written here and then removed — "it is
only for the statusless case" is exactly how the retired ring comes back, and those events drew no
mark before either.

**3 (part) · One figure on the band.** This is what the audit read as "the figure is inverted".
The band figure was already Playfair-33 over mono — correct. What sat beside it was a **second**
figure, `.tdk-facts`, drawing the agent's stated window as a mono key over an Inter value: two
numbers on one band in two grammars. The window is the contract's **`Then expect` tile** now, and
`.tdk-facts` / `.tdk-fact` are deleted rather than left unused.

**4 (part) · One screen.** Pane overflow at rest is down 20% and the structural cause is gone. It is
not finished — see below.

**7 · The illustration.** Gone, with the ~100px the facts strip reserved to clear it.
`DockMotif.tsx` and `bandMotif` are **left in place** — traced first, this was their only caller, so
both are now unreferenced and will read as live to the next reader until that call is made. The
`.tdk-motif` rule and its two lane tokens are deleted, because a rule kept for a retired element is
how the element returns.

## Nine locks retargeted, every claim kept

The workrow's mechanism · the date track · the StatusDot root (20 → 16, plus the fourth mark
asserted as the terminus and explicitly *not* a StatusDot) · the connector · `TRACKING` inverted to
absent · the motif's stacking layer · its lane arithmetic · the two-register comparison — which was
reading the register of the strip that broke the rule it states, and now reads the band figure ·
the burgundy-stays-on-the-rail case.

## Not done, and why

- **The tile set** is still `waited · requested · window · sent previously`, not the contract's
  `Send to · Sent previously · Then expect`. Needs the agent's email address on the card.
- **The figure's fact.** The contract says `days with you` for a send (the writer's clock) and
  `days waiting` for a chase (the agent's). Ours states the agent's clock in both. It is a real
  per-journey distinction and it needs the request date plumbed through — and the figure is shared
  with the list row by design ("one derivation, two surfaces"), so this forks that deliberately.
- **The deed and sub-line.** `Send your full` with no `<em>`, and a sub-line that restates the deed
  without the date. Both come from `rowDeed`/`bandSubline`, shared with the list rows.
- **The form (item 5) — and a premise correction.** It is not missing and it is not below the fold:
  a **different** form is rendered — the journeys pack's numbered `01 What went · 02 How it went ·
  03 When · 04 Anything to remember`, with no `Will record:` strip and no `.tdk-prime`. So item 5 is
  "replace form A with form B", not "add a missing form", and it is a decision between two shipped
  designs. **It is also what still makes the journey state 1195px tall**, so items 4 and 5 are the
  same problem.
- **The `×`** is left in the band, flagged. It is the only way back to the board from the card's rest
  state.
- **The list column (E)** is untouched this pass — checkbox before the pill, the two right-hand
  grammars, the `13 of 12` count gap.

## Premise corrections

- The **rail is 340px**, not the ~510 the audit estimated.
- **Three tiles render here, one rendered there** — the tile row's grid is correct
  (`repeat(auto-fit, minmax(150px, 1fr))`); the fault is that the *set* is short, so a lone tile
  collapses to one 211px cell and reads as a loose block. Making a short row span the full width
  would hide that facts are missing rather than fix it.
- The account differs (Ana Duarte / 12 tasks here, Jonathan Marsh / 17 there). Structure is the same.

## Gates

tsc 0 · production build 0 (whole output grepped) · vitest **330 files, 5776 passed, 2 skipped**.
Screenshots: `reports/audit/send-rest.png`, `reports/audit/send-journey.png`.
