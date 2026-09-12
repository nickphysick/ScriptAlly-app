# To-do — the list view, the landing state, and the card

Contracts, committed in `0b0fe849` and enrolled on the watchlist:

| file | md5 | binds |
|---|---|---|
| `design-refs/todo-list-view-contract.html` | `ebaee862e5d90cdd7562b431c6cc717a` | the list view · the landing state |
| `design-refs/todo-list-and-card.html` | `25858ab2cb53bda89e714a3b597d8e2b` | the grid card (`.card` only) |
| `design-refs/todo-three-views-contract.html` | `180d51fc828d990d646d30edf8b0ccd6` | the board (`.bcard` top block, column heads) |

Phase 0's recon — **the derivation table first**, as the brief asks — is `run-artifacts/list-recon.md`.
The mutation table is `run-artifacts/list-mutations.txt`; the measurements are
`run-artifacts/list-round.txt` (the rendered page) beside the unit suites named per phase.

| phase | SHA | what |
|---|---|---|
| contracts | `0b0fe849` | the two new refs, enrolled |
| 0 · recon | `fa1c2e0c` | `list-recon.md` — every due date's source, and which are missing |
| 1 · every task has a due date | `fa1c2e0c` | `lib/taskDue.ts`, derived and never stored |
| 2 · the list view | `bda8c7ab` | Task · Agent · Due · Overdue by · ⋯ |
| 3 · the landing state | `6533c778` | grouped by When, Overdue by, longest first |
| 4 · the card says the agent once | `8c5b7c99` | the title is the act, the footer is the person |
| 5 · the board card is one row | *(no code — landed in the three-views round; B1–B4 re-proved under 6)* | `.fact` deleted, the dot on the agent line, 62.9px |
| 6 · the diff lock | `6a33010f` | properties and positions, over three contracts |
| 7 · re-prove | `27f0fea1` | every suite that read the old list rows |


Two harness commits ride with them, each with its own story below: `67b17da6` (the saved session is
tried before another sign-in) and `4c8c8aee` (32 To-do measurements have been reading an animating
page).

---

## 1 · The round's real work — where a due date comes from

The brief said the columns are cheap once the date exists, and that was right. The whole of
`src/lib/taskDue.ts` is one question asked in one order, per task type:

1. **the date they set** — a `TaskFlag.snoozedUntil` hold ("hold me to it"), then the field the
   writer's own form wrote (`sendReminderDate`, `nudgeDate`);
2. **the natural date** — the ask date for a request, the window-close for a nudge, the
   expected-reply for a gone-quiet, the check-in after a nudge, the date on a note;
3. **nothing**, and the row says so.

`dueOwner` rides beside it: `owed` where the next move is the writer's, `theirs` where the clock is
the agency's, `none` where there is no date at all. Nothing is stored. The full table — every task
type, both dates, where each is written, and the harness account's own census — is section 1 of
`run-artifacts/list-recon.md`; it is the first thing in that file because it was the first thing in
the work.

**Two dates are MISSING and no task fabricates one.**

1. **The day a housekeeping gap was raised.** Every `fix` task comes from a `TaskFlag`, which
   carries `snoozedUntil`, `committedDate`, `skippedAt` and `resolvedAt` — every date except when it
   was created. `waitAnchorMs` already returns `NaN` for `fix`, so the app had already admitted it.
   Those rows read `none` and draw a dashed chip. Adding `createdAt` to the flag is a data decision.
2. **An offer or an R&R with no `lastStatusChange`.** The field exists and every live write path
   sets it; the harness's two decide queries were seeded without an activity, so they have none.
   Honest null.

Three sources were **considered and refused, each for a stated reason** — `expectedSendDate` (the
agent's deadline for the pages, not the day the request became the writer's), the offer's reply-by
(a different figure with a different label, which `figureFor` already draws), and `offerDate` (the
same fact as `lastStatusChange` on every write path). The dashboard's fortnight panel DOES read
`expectedSendDate || responseDeadline` as its own "due"; that is a different question on a different
surface, and it is recorded in the recon so nobody reconciles the two by accident.

## 2 · The list view

Task · Agent · Due · Overdue by · ⋯, at the contract's grid template, 62px rows, the status tint
down the leading edge. Due is the Query Centre's calendar chip — month over day, the year only when
it is not this year, dashed and reading `none` where there is no date. Overdue by is a Playfair
numeral and its unit, the contract's own `unit()` ported line for line: days under 14, weeks under
9, months under 18, then years to the quarter, and no sub-words. Ahead of time it reads `4 days to
go` in muted ink; today it reads `Due today`; and the numeral is burgundy **only when the task is
the writer's own** — `owner === "owed"` — never when it is merely large.

The column heads sort, and they sort on REAL DAYS rather than on the words in the cell: a row
reading "2 months" and one reading "9 weeks" order by 62 and 63.

**And the Task cell does not name the agent, which is a deliberate deviation from the contract's own
sample strings.** The artefact's rows read *"No response from Jonathan Marsh"* beside an Agent
column that already says Jonathan Marsh — the name twice in one row, which is exactly what Phase 4
removed from the card. Those strings are a mockup's invented content rather than a rule about the
column, so the app's agent-free deed vocabulary stays, and P2.8e locks it over 33 rows that name an
agent.

Measured 17 of 17 at 1440×900. The unit thresholds are proved against the contract's own function
over every day from 0 to 4,000, with 13/14, 62/63 and 547/548 named as the boundaries the contract's
rounding actually puts them at.

## 3 · The landing state

A first visit lands grouped by When — Overdue · Due this week · Coming up · No date — with Overdue's
head in burgundy, ordered longest-overdue first. "This week" is a rolling seven days, so it cannot
empty itself as the week runs out; an empty bucket draws no head.

It is a DEFAULT, not a setting: `parseView` still lets a stored view win field by field, and
Category and None stay in the Group menu. Measured 8 of 8, including a later choice replacing it and
surviving a reload.

**And the finished work nearly came back with it.** The page dropped the `done` group with a
`.filter()` on the RESULT of `applyView` — which only ever worked while the grouping was the urgency
partition and the group kept its id. Every other grouping FLATTENS and re-heads, so a completed card
walked straight past that filter inside a generated head: latent under "By agent" since regrouping
shipped, and about to become the default's behaviour. The membership rule is stated in `applyView`
now, beside the snoozed and dismissed ones, and asserted over EVERY grouping.

## 4 · The card says the agent once

The title is the act and the footer is the person. `card.title` names the agent by construction, so
the grid hands in `listTaskText` — the same expression the list's Task cell prints — while the
dashboard's snipped panel keeps the card's own title, because it has no footer and the name is the
only way a reader learns who it is about. The status moved to the top line beside the tag, as a dot
AND its word; the verb sits quiet in the foot until the pointer arrives; the manuscript is absent on
a one-manuscript account.

Measured 6 of 6 over 30 cards.

**The one clause of Phase 4 this fixture cannot show** is the manuscript's absence on a one-book
account. It was already built — `showsManuscriptColumn`, the same predicate the list's own column
reads, landed in the three-views round — and the harness account holds four manuscripts, so every
card correctly states one. A measurement here would have to seed a second account; the predicate is
unit-locked instead, and the rule is named rather than quietly assumed to hold.

## 5 · The board card is one row

Already true, and re-proved rather than assumed: `.fact` is deleted from the DOM rather than hidden
(the contract's own stylesheet says `display:none`, which is a mockup keeping a thing it stopped
drawing — not an instruction to ship one), the status dot leads the agent line inside it, the wait
sits where the chip was, and the tallest of 30 cards measures 62.9px against a 70px ceiling. No code
changed; B1–B4 are green in `run-artifacts/views-claims.txt`.

## 6 · The diff lock

Three artefacts describe this page and they overlap. The lock read ONE of them for all three views,
**which is how the ticket's height came to be measured against a superseded card**: every property
matched, the run was green for weeks, and the number it agreed with was 16px out from the design the
card is actually built to. Each view names its own contract now, all three are hashed, and the
newer wins where two draw the same thing.

**Coverage is read out of the files.** A parts table is a census of what somebody remembered; a
contract can gain a rule and every assertion below goes on passing about the rules that were already
there. Every selector in each file's own block must be a part, a part's `also`, or a named entry
saying which check holds it instead — 87 selectors, 81 parts, seven named elsewhere, no orphans. It
found ten the old table never mentioned. *(`6a33010f`'s own message says six named elsewhere; it
is seven. Recorded here rather than rewritten there — a tidy history is not worth a ref another
session may be standing on, and the claim that matters, no orphans, is right.)*

**The list is put in the state the contract draws, and put back.** The contract's list is the
landing state; the harness account carries a writer's own later choice, which is what Phase 3 built.
Measured against that, five parts had no counterpart at all — no head active because the stored sort
is not a column, no Overdue head because the stored grouping is the urgency partition, and nothing
due in the future. Five true readings of a page in a state the artefact does not draw. The stored
view is read before, cleared, written back exactly, and the check that it came back runs BEFORE the
report is written.

Final: **244 assertions · 465 properties matched · 14 waived · 80 places compared · no difference of
either kind in any of the three views.** `viewsClaims` is 14 of 14.

### Four faults on the page came out of pointing it at the right file

Every one of them a rule that read perfectly correctly.

1. **`--ink2` and `--muted2` resolved to nothing at the ticket's scope** — five declarations. The
   agency line under an agent's name rendered INK where the contract states muted; four more fell
   back to `currentColor`, close enough to the intended ink that nothing looked wrong. `--muted`
   DID resolve, to a DIFFERENT value from the one the list and the board read, so one page drew two
   muteds three inches apart. This is the fourth surface to hit it. On the board, `--ink2` was
   absent and `--sage` resolved to the status dot's sage rather than the one the contract states —
   and **a token that resolves to the WRONG value is worse than one that resolves to nothing**,
   because nothing eventually gets noticed.
2. **The card inherited its leading from the page.** Tailwind's preflight sets a unitless 1.5, so
   every leaf recomputed it against its own size: a 12px name in the foot took a 34px box where the
   contract's takes 28, and the card came out 11.8px too tall. A format that inherits its typography
   is not a format. Now 173.5 against 173.5, and every child identical.
3. **`line-height: normal` had to be declared AFTER `font: inherit`.** `font` is a shorthand and
   resets every longhand it does not mention. Above that line it read correctly, computed to the
   page's 24px, and the card stayed 2.8px too tall. Same law as the `background` shorthand silently
   taking a colour with it, on a different property.
4. **The list card's radius was 16 against the contract's 14**, and the ticket's Housekeeping tag
   was two shades darker than the contract's ink.

### And it fails both ways, proved

A value bent on the CONTRACT's copy and an element moved there (`viewsDiff`'s second test, which
already existed); a value bent in the APP; an element moved in the app without the moved one's own
properties changing; and a part removed from the table, where the coverage case names the orphan and
refuses to measure at all. Five proofs, in `run-artifacts/list-mutations.txt`.

## Two harness faults, each of which had been hiding a measurement

**`auth.setup` signed in on every run** while its own first line has said "log in ONCE, reuse the
session" since the day it was written. Firebase's password quota is per project and a mutation sweep
reaches it: the eighth run came back `auth/quota-exceeded`. What that looks like is the trap — the
shell never appears, the run dies in SETUP, the measurement it was carrying never starts and writes
no report, and a runner that reads the report FILE reads the PREVIOUS run's and records the mutation
as proved. **Two of this round's mutations were logged that way before the cause was found.** One of
them, the list header's tracks, has since been re-run against a deleted report and is genuinely red
on two claims — including a head standing 20px off its own column.

**`gotoTodo` navigates, and a navigation drops the motion suppression.** `openRoute` re-injects
after its own `goto` and 148 call sites reach `/todo` that way; the 32 files that come through
`gotoTodo` do not. Each of those has been measuring a page whose animations are running. It was
invisible for exactly as long as the urgent glow's keyframe pinned a literal shadow at its resting
frames — a card mid-animation read back a stable-looking value that happened to equal the grid
card's own. **The moment those frames were corrected the same measurement started reporting
`0.879095px` blurs: the fault had not arrived, it had stopped hiding.** And the keyframe itself was
a real fault — one keyframe animates two cards whose resting shadows differ, so an urgent BOARD card
wore the grid card's shadow.

## False premises in the brief, and one in the standing notes

1. **"Extend `anatomyDiff`."** `anatomyDiff` locks the DRAWER against `todo-qc-style.html`; the
   three views' diff is `viewsDiff`, built on `views.ts` by the three-views round. Extended that
   instead — the brief named the wrong file, and extending the drawer's lock would have compared the
   list against a contract that does not draw one.
2. **"Comparing computed properties AND each element's rect relative to its container."** The rect
   half already existed: `views.ts` was written for exactly that after the anatomy round's diff
   passed on a foot sitting 350px too high. The work this phase needed was the per-view CONTRACTS
   and the coverage claim, not the instrument.
3. **Phase 5 was already done.** `.fact` deleted, the dot on the agent line, the wait where the chip
   was — all landed in the three-views round. The phase cost a re-proof rather than a rebuild, which
   is the right outcome and worth saying plainly.
4. **The standing `.card .ttl` carve-out does not apply to this contract.** CLAUDE.md records that
   the ref declares `.card .ttl` TWICE — Inter 14.5/600 then Playfair 18/500 — so the artefact
   renders Playfair while the brief specifies Inter, with the brief winning. That is true of
   `todo-qc-style.html`. `todo-list-and-card.html` declares it **once**, at 15px/600/1.3, and the
   app matches it exactly. The waiver that used to carry it is gone; a reader diffing this contract
   against `TaskTicket.tsx` will find no difference to explain.
5. **"The columns are cheap once the date exists."** True, and it is worth confirming rather than
   assuming: Phases 2 and 3 together are a smaller diff than Phase 1.

## Concurrency

`main` moved under this round six times, all from other sessions: `368d67b2` (the contacts drawer's
rules through the portal) landed between Phase 3's gates and its commit, and five `qc-grid` commits
landed across Phases 4 to 6. Every commit here is explicit-path; the measurement worktree was moved
to each new tip and rebuilt rather than carrying a stale base. Nothing of theirs was staged, and
`git status` was clean after each commit.


## 7 · Re-proving what read the old rows

The recon's census named three sets. Every one was re-run, and — because a red proves nothing about
whose it is — **every red was run again at the round's own starting point, `791cc61f`, in a second
worktree built and served separately.** That is the whole method: two runs, the same suites, the
same account, and a difference that is either there or not.

**Retargeted with the phase that changed them** — `taskListWide.test.tsx`, `listCells.test.ts`,
`todoListView.test.ts`, `completionHold.test.ts`, `boardSettings.test.tsx`, `tasksViewport.test.ts`,
and on the rendered side `views.ts` + `viewsDiff` (the list parts table, drawn from a superseded
contract) and `viewsClaims` L1–L4.

**The census, re-run.** Thirteen e2e suites and two unit suites. The unit pair is green. Of the
thirteen, **twelve are red at the tip and identically red at `791cc61f`** — same claims, same error
strings, same crash — so not one of them is this round's:

| suite | at the tip | at `791cc61f` | verdict |
|---|---|---|---|
| `completionLeaves` · `elemDiff` · `framePort` · `listPort` · `listWide` | red | red | pre-existing |
| `packA` (2 of 3) · `tightened` (2 of 4) · `tlAccept7` · `tlGroups` · `tlNote` · `unitNext` · `viewPanels` | red | red | pre-existing |
| `qcChassis` P5.2 | **red** | **green** | **this round's** |
| `calClosed56` · `frame2Recon` · `qcChassis` (5 of 6) · `tightened` (2 of 4) · `packA` (1 of 3) · unit `taskPanePort` · `todoGroups` | green | — | green |

**`qcChassis` P5.2 is the one this round broke, and it was a string comparison standing in for an
identity claim.** It took the ticket's headline and required the drawer's `aria-label` to equal it —
true only while the grid's headline WAS the card's title. Phase 4 made the headline the act, so the
card said *"Reply to the offer"* and the drawer said *"Noah Bright has made an offer"*: two correct
derivations about one card, disagreeing about a spelling. What "named for the task it holds" claims
is IDENTITY, so it now opens two different cards, requires each label to name the person that card's
own foot names, and requires the two labels to differ. Proved red by giving the drawer a constant
label — both cards then read `"Task"` — and green at 7 of 7.

**What the pre-existing twelve are, in one line each, because the shapes are worth knowing.**
`listWide` **crashes** rather than failing: it reads `.r-ag`, retired in `28e7899c`, so
`getComputedStyle(null)` throws — a crash names a line number where a failure names a property, and
in a noisy run the two are indistinguishable. `packA` selects a bare `.row` after
`openRoute("/todo")` and Grid has been the default since the QC-chassis round, so its population
floor fires — a phase that names a body must put that body on screen. `tightened` Phase 2 asserts
44px rows, an action strip and an inline `.r-who`, and `.actrow` and `.r-who` were both retired by
`28e7899c` — which `git merge-base --is-ancestor` confirms is an ancestor of this round's start.
`tlGroups` and `tlAccept7` expect a six-group taxonomy (*Offers · Needs you now · Needs you soon ·
Watching brief · Snoozed · Recently closed*) the page no longer draws. `unitNext`, `viewPanels` and
`tlNote` time out on a `fill` against a control that has moved.

**They are out of scope by the brief's own line** — "the twelve red suites" — and the count is
exactly twelve. Retargeting another round's suites would be taking their decisions for them; what
this round owes is the provenance, which is now on the record with the commit that retired each
subject.

## Screenshots

At 1440, `reports/todo-list-round/` — `app-landing-1440.png` beside `contract-landing-1440.png`,
both in the state the contract draws (the stored view cleared for the shot and written back after).
And `reports/todo-three-views/{app,contract}-{grid,list,board}-{1440,1920}.png`, re-taken so the
grid's and the list's contract shots now come from the files that BIND them — `contract-grid-*` and
`contract-list-*` changed with this round and `contract-board-*` did not, which is the supersession
visible as two pictures.

## What a reader should look at

The landing state at 1440: the Overdue head in burgundy over a column of numerals that are burgundy
only where the writer owes the date, ink where the clock is the agency's, muted ahead of today. Then
the same page's Grid, where no card says the agent twice. Then the board, unchanged and still one
row.
