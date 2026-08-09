# Tasks consolidation — Phases 3 and 4, plus the two P2 calls

**Refs:** `design-refs/tasks-states.html` sheet 1 (every task type the engine can raise) for P3;
`design-refs/tasks-page.html`'s `.snzmenu` block for P4. Page body only — the chrome around them
belongs to other surfaces and was not copied.

**Gates:** `tsc --noEmit` 0 · production build clean · **216 files, 3387 passed | 2 skipped**.
Four commits: `a353434` (tags) → `9582c87` (goodDay) → `02e4a7f` (P3) → `<this>` (P4).

---

## The two P2 calls, first

### Tags return to the tool row (`a353434`)

`#All ▾`, single-select, the **Noteboard's own control** — same `.cal-nav` trigger, same
`.cal-viewmenu`, same wording. Two tag filters that looked different would be two things to learn
about one idea. It composes inside `narrowCards`, the page's one narrowing, so the list, the dock's
queue and the no-match branch cannot be looking at different sets; the predicate is the shared pure
`matchesTags`, with the single selection passed as a set of one rather than a second
one-versus-many comparison. It renders only where there is something to pick.

**⚠️ A LATENT BUG CAME OUT WITH IT.** `.cal-nav` / `.cal-viewmenu` / `.nb-tagwrap` were declared in
`todoCalendar.css` and `todoNoteboard.css` — the stylesheets of the pages that used them first. The
To-do list imports neither. In a production build every sheet is bundled into one file, so this
would have *looked* correct forever; in dev, where Vite injects a module's CSS only when the module
loads, the filter renders unstyled on the one page that has not visited a sibling first. The rules
moved to `taskChrome.css`, imported by all three. **A rule that works only because some other page
happened to be visited is not a rule.**

### "A good day is" is retired whole (`9582c87`)

Control, reader and stored field. It advised on the size of the day's **commitment**, and
committing work to a day is exactly what the consolidation removed; the copy law reaches the same
answer independently ("the app reports and never appraises" — "THAT'S A FULL DAY" is an appraisal).

It went whole deliberately: board-optimise P5's own lesson was that a settings row over a hardcoded
number is a control over nothing, and leaving the field with no reader is the same fault with the
halves swapped. So `wipLine`, the `goodDay` key, its bounds, the sheet's control and
`estimateHeadLabel`'s full-day branch all left together. `todoPrefs` stays a **total** reader, so a
writer who stored the key before today simply has it ignored — never carried, never resurrected.

**⚠️ THE PROD RULES QUEUE DOES NOT SHORTEN, and the instruction rested on a wrong premise worth
recording.** The allowlist entry is **`todoPrefs`** — the whole map — never `goodDay`, and three
other settings still write it. Retiring a key inside a map changes no rule. Locked in
`boardSettings.test.tsx` so the correction cannot be lost.

---

## Phase 3 — task kinds and their verbs

`lib/taskRow.ts` answers **what a row IS**: the kind pill's tone, the primary verb's *name*, and the
three-stage journey. It answers nothing about permissions — whether a slot fills at all stays
`cardMenu`'s, so the row and the ⋯ menu can never disagree about what a card allows.

**The split is the contract: the menu says WHETHER, `taskRow` says WHAT IT IS CALLED.**

### Nine tones, one per live kind

Superseding P2's four family tones. The families answer "how urgent is this" — which the group
headings already answer, permanently and in words — so a pill repeating it said one thing twice
while the thing a pill is *for* went unsaid. Values are the ref's own `.sp.*` hexes.

**⚠️ The pill's WORDS are `card.kind`, never a new table** — the same vocabulary the facet chips,
the snoozed band and the counting law already speak. A per-kind label table would be a second
vocabulary, and this repo has twice paid for exactly that.

The CSS restatement is locked to the `PillTone` union **in both directions**: every tone must have
a rule, and no rule may exist without a tone.

### What each kind renders

| kind | tone | journey | primary |
|---|---|---|---|
| offer | `offer` | ●●● OFFER ON THE TABLE | Action |
| agent waiting (partial) | `wait` | ●◑○ PARTIAL REQUESTED | Action |
| agent waiting (full) | `wait` | ●●◑ FULL REQUESTED | Action |
| R&R | `rr` | ●●◑ REVISION IN HAND | Action |
| sweep | `sweep` | bar · N OF M DONE | Start |
| stale | `stale` | — | Close |
| your task / note | `yours` / `note` | — | *(none — the tick is the act)* |
| snoozed | `snoozed` | — | Return |
| done | `done` | — | Undo |

**⚠️ An R&R is its own kind now**, changed at the source in `derivedCopy` rather than mapped at the
row, so the pill, the snoozed band ("R&R · 🕐") and every future reader speak one vocabulary. The
lane is unchanged, so the counting law, the families and the groups are untouched — `liveFamily`
keys on the stream, not the kind.

**⚠️ State beats kind.** `done` and `snoozed` are consulted before the task type: a finished thing
is finished whatever it was. But a snoozed card keeps its **own kind in the words** and only its
tone sleeps — the ref draws a bare `SNOOZED` pill, and `tasksAuditGrammar` locks the opposite with
its reason: a row that forgets what it is while it sleeps tells you nothing about what returns.

**⚠️ The journey is a function of the TASK TYPE, not of the query.** The engine only raises a
`full_requested` task for a query that *is* at full-requested — the status is what produced the
task — so reading the query again would be a second derivation of a fact the first already carries.
A pile and a journey never appear together.

### Not built, and that is the law

Two of the ref's thirteen rows: **DEADLINE** (no task type raises an expiring exclusive) and
**DISMISSED** (the Task-settings ledger's, not a group on this page). The shell renders what
exists, never what is planned. Their verbs — Review, Restore — are locked *out* of `taskRow`.

**⚠️ `nudge_overdue` is the one live kind the ref does not draw.** It gets the `wait` tone and
**no journey**, deliberately: its card is about silence — a duration, which the age lane already
states — not a position on a path. Flagged so the omission reads as a decision. Its `kind` string
is still "AGENT WAITING", which is arguably wrong (you are chasing them, not the reverse); changing
it is a copy call for Nick rather than a rendering one.

---

## Phase 4 — the snooze dial

**⚠️ It names the resulting date before you commit to it**, in Playfair, as the headline. That is
the whole reason it replaced a tier menu: "Give it a week" is a promise about a date you then have
to work out yourself, and the one thing a writer wants before putting an agent's request away is
which morning it comes back.

**⚠️ The ceiling is the track's own length.** `reachableStops` applies `snoozeCeilingDays`, so an
offer's dial has one stop and a deadline's ends at the deadline — the knob physically cannot reach
a tier it may not write, rather than sliding past a limit and being pulled back. `clampSnooze` is
still called on the way out: *a guard you rely on being unnecessary is a guard you have stopped
having.* A ceiling of zero draws no track at all and says why.

**⚠️ It is a range input under a painted track.** Dragging, clicking anywhere on the track, arrow
keys, Home/End and assistive technology all come free and correct from the platform; a bespoke
`pointermove` gives the first two and reimplements the rest badly. Focus is painted on our own knob
— a keyboard-operable dial that shows no focus is worse than one that is not operable.

It replaced the ⋯ menu's snooze submenu at **one call site**, which is exactly why P2 routed the
clock through a pre-opened submenu instead of growing a chooser. The menu keeps its tiers for the
keyboard path and for Snoozed's "Change the date…"; both resolve through the same clamp.

`SNOOZE_STOPS` gained a terse `tick` beside its prose `label` — two registers of one fact declared
on the same row, so a stop cannot gain one and lose the other. "Pick a date…" is the app's **one**
`BrandDatePicker` with the ceiling as its `max`.

---

## The browser walk

Against the **built** `dist/assets/index-*.css`, real rendered markup, measured with
`getBoundingClientRect`. **No new faults this time** (the P2 walk found two the suite could not).
Confirmed: every one of sheet 1's live rows renders its right tone, stage label, age and verb set;
the long title still wraps to two lines rather than truncating; the strike is on the title and not
the row; the dial is 290px with the **real** date picker fitting at 170px beside the Snooze button,
no overflow; the five tick labels clear each other by 25px.

The dial's shell was hand-mirrored in the harness because `renderToStaticMarkup` cannot render a
portal — the component's own markup is asserted in `tasksList.test.tsx` instead. The real
`BrandDatePicker` was mounted for the measurement that mattered.

## ⚠️ THE MANUAL BROWSER CHECKLIST — the scroll behaviour jsdom cannot see

**This list exists because the automated lock cannot measure layout.** There is no jsdom in this
repo, and adding it would not help: jsdom has no layout engine and returns 0 for every scroll and
client dimension. A real browser is a tooling decision across 217 test files, not a bug fix. So
these are checks a person runs, and the first one is the one that shipped broken.

Open `/todo` on a viewport short enough that the list overflows (1440×900 with a dozen tasks does
it), and paste into the console:

```js
const z = document.querySelector('.tpl-zone');
({ scrolls: z.scrollHeight > z.clientHeight, overflow: z.scrollHeight - z.clientHeight,
   wrapClipped: (w => w.scrollHeight - w.clientHeight)(document.querySelector('.tdb-wrap')) })
```

1. **`scrolls` must be `true` and `wrapClipped` must be `0`.** Anything else means the designated
   scroller is dead and the frame is clipping — the exact fault of 9 August. Measured after the
   fix at 1440×900: zone 430px tall over 2576px of content (2,146px scrollable), wrap clipped 0.
2. **The zone actually moves.** `z.scrollTop = 99999` then read it back — a non-zero value. A zone
   can report an overflow and still refuse to scroll if an ancestor is doing something odd.
3. **The header block does not move with it.** Eyebrow, title, stat chips and tool row stay put.
4. **The group headings pin and release** at their section boundaries as you scroll.
5. **The page itself never scrolls** — `document.querySelector('.ws-wbody').scrollTop` stays 0.

## Deviations from the ref, carried forward

- **A user task's ✕ is absent** (the ref's sheet-1 row draws one). The ref's own prose says your own
  tasks and notes get Delete in the ⋯ instead, "because they are the only things you own outright",
  and `cardMenu` agrees. Prose with a reason beats an unreasoned artefact.
- **A sweep's ✕ is present** (the ref draws an empty slot). Its prose says "Sweeps dismiss as a
  cohort with a confirm", and `cardMenu` offers it. Same rule, opposite direction.
- **A snoozed pill keeps its kind** rather than reading bare `SNOOZED` (see above).
- **Title stays "To-do list"** and the tool row keeps its locked 34px step — both unchanged from P2.

## What remains

Phase 5 (row states, the loading shell, the empty states) · Phase 6 (toasts, motion, keyboard,
many-at-once) · Phase 7 (narrow and touch). **Phase 5 was not started, per the brief.**
