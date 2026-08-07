# To-do board optimisation — run report (7 Aug 2026)

**Pack:** layout, sidebar, art slots, dock, settings, and three features.
**Refs committed** (`2fb9287`, each scope-fenced): `board-optimised.html` · `board-features.html`
· `board-reflow.html` · `art-slots.html`.
**Commits (one per phase):** `97fddcc` (P1 measure) → `d3b5efd` (P2 sidebar) → `f2c49c0` (P3 art)
→ `a2d1d6b` (P4 dock) → `6c0fb97` (P5 sheets) → `8d5dedc` (P6 fold + reflow) → `b83154b`
(P7 estimates). Gates green per commit. Suite at close: **3264 passed | 2 skipped, 207 files**
(from 3140 at the pack's start).

**⚠️ PHASE 8 IS NOT BUILT — its premise does not hold. See the finding at the foot; it needs
your call before anything is written.**

---

## P1 — the column measure (`97fddcc`)

`1fr` tracks stretched a card to whatever the monitor offered: at 2560 the same four cards wore
~600px each, and a 13px title in a 600px measure is a line you scan rather than read. The grid
is `repeat(4, minmax(0, --tbd-col-w))` at 290px with `justify-content: start`, so the surplus
becomes calm margin after the last column.

`minmax`'s **zero min is load-bearing** — it lets a column shrink when the viewport cannot afford
the cap, which is what stops a capped grid overflowing; both narrow breakpoints therefore keep
the same track function with fewer tracks rather than falling back to `1fr`. Locks are rule-text
with the arithmetic stated per case (no jsdom to measure in): four 290px tracks + three 20px gaps
= 1220px of content, and at 2560 the remaining ~1340px is distributed by `justify-content`.

## P2 — the page sidebar (`d3b5efd`)

1. **The active row carries an ink inset bar** beside its parchment fill (2px, the ref's value).
   The fill alone read as a hover that stuck — a temperature, not a state. A focused active row
   stacks the ring rather than losing the bar.
2. **ONE CLEAR, beside FILTERS, resetting BOTH.** It sat on the TAGS cap and reset tags alone —
   so a page narrowed by Urgent AND #synopsis needed two gestures in two places to get back, and
   neither said it was half a reset.
3. **An inline ＋ New tag row**, opening the ONE TagPicker's create path — creation reachable
   from where the tags are read, not only from an item you happen to be tagging.
4. **Task settings pinned above a hairline.** The existing `.tds-foot` rule was edited IN PLACE
   rather than a second rule appended: two rules for one selector is the drift this file's own
   locks exist to catch.

Rode along: the tag WRITE pair moved into `useTagWrites` — two pages carried a copy and P2
needed them on four, which would have made four copies of the null-detach convention. The
Calendar gained the shared toast with it (a page that can now create needs a visible failure).

## P3 — ArtSlot and the six slots (`f2c49c0`)

One component, six named slots. Each declares its brief's **ratio**, so the placeholder reserves
exactly the room the illustration will take and nothing shifts when the artwork lands; a missing
asset **degrades to the caption** (no `src` today; an `onError` flips a future 404 back).

**⚠️ The two rejections are enforced, not just noted** — no art in a page header (asserted on
`TasksPageLayout`, which covers all four pages at once) and none per card (asserted on the board
card, the note card and the calendar). Those decisions are what keep the budget on six pieces
that land rather than forty that decorate.

The triggers: `done-empty` (the Done column while empty, capped at 260px so it reads at the
column measure) · `desk-clear` (Today, on the **three-way AND** — nothing committed ∧ nothing
urgent ∧ bench exhausted, read UNFILTERED so a filter cannot fake it) · `noteboard-empty` ·
`first-run-board` (distinct from desk-clear: *not yet* versus *well done* — two briefs, never
one asset reused) · `review-masthead` (inside the temporary briefing card, the one place a header
illustration earns its keep) · `dock-seal` (defined here, mounted in P4).

## P4 — the dock's work surface (`a2d1d6b`)

The 30/70 stands. The work surface is the two-column sheet: **THE STORY SO FAR** at ~230px left,
the Playfair title, the record line and the flow right. The cause it fixes: the story ran ABOVE
the work, so a long history pushed the flow below the fold — and what happened and what to do are
the two things you need in one glance. An empty history says so rather than leaving a frame.
Footer contract untouched. **DOCK-SEAL** strikes the instant a flow completes, before the card
animates to Done — seal first, act immediately after, so the flourish rides over rather than
delays; never mounted under reduced motion, and the mount's timer and the keyframe are locked
equal at 600ms.

## P5 — settings and tags as sheets (`6c0fb97`)

Both are **sheets over the page, never routes**: a route would take the board off screen, put an
entry in history, and make the back button the way out of a rename.

**The four behaviours** — stale threshold · a good day is · roll unfinished work forward · weekly
review briefing — each with the ref's plain-spoken subtitle, persisted through **ONE stored map**
(`User.todoPrefs`). One rules entry, one write path, one place to look; four flat fields would
each need their own allowlist line, and this repo has lost writes to exactly that omission
before. Every reader goes through `todoPrefs()`, which is **total** (absent map, absent field and
nonsense all resolve to the stated default). **The defaults are the behaviour the app already
had** — a setting's arrival changes nothing for a writer who never opens the sheet.

**And the setting takes effect:** `wipLine` read a hardcoded 3–5, which made its own settings row
a control over nothing. It takes the writer's number now (defaulting to the same 5).

**The dismissed ledger is a door that states its count**, with the list beneath it — the figure is
what a reader wants at a glance, and unrolling every hidden item before the four behaviours had
been read was answering a question nobody had asked. **Tags moved to their own sheet**: a list
that grows with the writer was pushing four fixed behaviours off the first screen. Delete still
detaches and never deletes items (order locked: ids leave the tasks first).

## P6 — collapsible columns + reflow (`8d5dedc`)

**The fold:** a 44px rail, the Playfair name rotated up it, the count pilled, ▸ restores — a real
named button, so a keyboard meets a control rather than a decoration.

**⚠️ The fold is a UI preference, never board data.** It says nothing about any card, only about
what this reader wants to look at — so it lives in localStorage under the house `sa.` prefix,
read defensively (private mode, corrupt value and unknown keys all read as "nothing folded").
**The schema diff is locked**: no fold field in the rules or the types, and the lib touches no db
primitive.

**Reflow:** freed width is claimed by the **leftmost OVERFLOWING** column — one column, never
shared, and never one that already fits (a fitting column gains nothing from a second lane except
looking like a sparser board). **At most two lanes.** One head spans both with its ink rule,
carrying "SHOWING {n} · WAS {m}".

**⚠️ Order survives:** reading fills top-to-bottom THEN the next lane, so item 5 sits at the top
of lane two rather than beside item 1 — locked by asserting that concatenating the lanes
reproduces the derived order exactly. The lanes can be pure presentation precisely BECAUSE order
is derived and never stored. "+N more" survives after both lanes fill; the collapse rides the
shared curve at 220ms and stops under reduced motion.

## P7 — time estimates on Today (`b83154b`)

A ⏲ chip on committed cards, set from the fixed one-tap ladder in the ⋯ menu — never free text.
The head sums **only what carries one** and never guesses; past the good-day line it says so
instead, so the head never states two opinions about one day. The ladder is offered on Today
alone (locked per column) and the chip renders nowhere else.

### ⚠️ THE FIELD, JUSTIFIED (the pack asked for this)

`UserTask.estimateMin?: number` — the smallest possible addition to user-facing task state:

- **Not derived, and that is the point.** Nothing in the app knows how long *your* redraft takes.
  Every other figure on this board is derived precisely because the data already implies it; this
  one is a judgement only the writer can make, so storing it is the honest option rather than the
  lazy one. (The alternative — inferring from past completions — would invent a number from a
  sample of one and present it as fact.)
- **A scalar on the object the writer already owns**, not a new collection or a map: the write
  stays inside `updateUserTask` and one rules allowlist entry — no new document, no new listener,
  no new failure mode, nothing to migrate.
- **Minutes as a number**, so the head sums without parsing prose.
- **Optional, and absent means absent**; the ladder's "none" rung clears the field entirely
  (`deleteField`), so declining to estimate leaves no trace. Rules bound it (int, 0 < n ≤ 600).

---

## ⚠️ PHASE 8 — NOT BUILT: the premise does not hold

The pack's P8 is written as a **reuse**: "Reuse the list's batch model wholesale — no second
selection system", "the existing batch bar appears with typed counts", and the test asked for is
"selection model reuse (asserted, not reimplemented)".

**There is no list batch model or batch bar in live code.** Recon:
- `ToDoPage.tsx:342` records it plainly: *"the ledger's selection/keyboard/kebab machinery
  retired with the run sheet — Final Shape P5"*.
- The `batch*` helpers in `todoLedger.ts` are the **housekeeping cohort** (agents under one rule
  — `batchChildren`, `batchDetail`), a different thing entirely.
- `git log -S "SELECTED ·"` across all branches finds no batch bar ever shipped; the ＋Today /
  Snooze… / Close queries… / Dismiss… bar exists only in `board-features.html`.

So P8 as written cannot be done: there is nothing to reuse, and building the selection model, the
checkbox materialisation, the bar, the typed counts, the guards, the batched undo and the
itemised failure reporting from scratch is a pack of its own — not a wiring phase. **Building it
fresh while calling it a reuse would also make its central test a lie.**

**Your call, and the options as I see them:**
1. **A P8 pack of its own** — build the selection model + bar properly, once, and wire the board
   and any future list to it. My recommendation: the guards (offers auto-excluded, one undo
   across a batch, itemised failures) are where the real work is, and they deserve their own
   phases and fixtures.
2. **Skip it**, and let the ⋯ menu remain the one-card path. The register itself marks
   multi-select "ADD LATER", so this is a scheduling decision rather than a reversal.
3. **A minimal version** — shift-click range + ＋Today + Dismiss only, no bar of its own — if you
   want the gesture without the apparatus.

Nothing is half-built: no selection state, no checkbox, no bar exists on the board today.

---

## The walk (dev — auth-gated, so these are yours)

**Lead check:** fold **Snoozed** and **Done** (the ▾ in each head) — watch **To do** claim the
freed width and flow into **two lanes under one spanning head**, with its order running
top-to-bottom then across ("SHOWING 16 · WAS 8"). Unfold and watch them collapse back. Reload:
the fold survives; nothing about it touches your data.

Then:
1. **Width:** at a wide monitor the columns stop at 290px and the surplus sits as margin on the
   right — cards never stretch.
2. **Sidebar:** the active FILTERS row wears the ink edge; CLEAR appears beside FILTERS only when
   something narrows and resets facet AND tags; ＋ New tag creates from the sidebar; Task settings
   sits on the panel's floor above its rule.
3. **Art:** clear the Done column to see the DONE-EMPTY placeholder at 260px; a fresh Noteboard
   shows its own. (They are placeholders — the six briefs are in `art-slots.html` for the
   illustrator; nothing shifts when the art arrives.)
4. **Dock:** open any card — the story sits left, the work right; complete a flow and watch the
   seal strike before the card leaves.
5. **Settings:** Task settings → change "a good day is" to 3, then commit four things to Today
   and watch the head say "THAT'S A FULL DAY". The dismissed door states its count. Tags →
   Manage opens their own sheet; delete one and confirm the notes survive.
6. **Estimates:** on Today, ⋯ → How long… → 25m; the chip appears and the head reads EST. 25 MIN.
   Add an unestimated card — the head does not guess. The ladder is absent on the other columns.

## Deploy

Dev hosting redeployed at the pack's tip. **⚠️ Rules changed and are DEV-DEPLOYED ONLY** —
`todoPrefs` (user doc) and `estimateMin` (tasks) join the queue. **PROD remains yours**, and the
sequencing deploy now carries: rejectedDate · detail/surfaceOffset · committedDate · tags ·
**todoPrefs · estimateMin**. Until it lands, those two writes are silently denied on prod.
