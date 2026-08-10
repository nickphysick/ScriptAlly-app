# To-do list — Fix 4's revision: weight, the dial, and the keys that went with it

**Refs** `design-refs/todo-splitguard-v1.html` (already committed) · `design-refs/todo-weight-slider-v1.html`
(commit 0, `276162d`) — the weight sheet **supersedes** the splitguard sheet wherever they differ.

**Commits** `276162d` ref → `83d4018` P1 weight → `98901da` P2 the menu wears the dial →
`d67341c` P3 twelve stops, hatch, receipts → `6a2a1b5` P4 the keys are extinct.

**Framing.** Fix 4 shipped at `225d4e1`. This was a **revision of live code**, not a build: three
changes, with everything else in the shipped split button left alone.

---

## Baseline, and the gate

Recorded before any edit: `tsc` **0** · `vite build` **clean** · Vitest **221/222 files, 1 failed**
(`src/lib/agentPicker.test.ts`, 6 cases — the queries create-mode stream's, the permitted baseline
failure). That file **went green during the session**, fixed by the stream that owns it, so every
gate below is better than baseline rather than merely no worse.

| | tsc | build | vitest |
|---|---|---|---|
| baseline | 0 | clean | 221 pass / 1 fail |
| P1 `83d4018` | 0 | clean | **3563** pass, 2 skip |
| P2 `98901da` | 0 | clean | **3578** |
| P3 `d67341c` | 0 | clean | **3594** |
| P4 `6a2a1b5` | 0 | clean | **3595** |

Explicit-path staging throughout; `git diff --cached` checked before each commit. Two other sessions
held ~44 paths in the index the whole time (dashboard, `CLAUDE.md`, `firestore.rules`) and none of
them appears in any commit here.

---

## Step 0 — what the recon changed about the plan

Two findings, reported before any edit:

1. **Phase 3 named the wrong component.** `CheckBackSlider` is the *nudge flow's* control
   (`forms/`, Form-11 `.sa-wk-*` styles shared with `WeekSlider`, a hardcoded `id="sa-checkback"`).
   Extending it would have changed nudge-flow behaviour **and** left the app with a third slider.
   The To-do snooze slider already existed: **`SnoozeDial`**, built in tasks-consolidation P4.
   Nick confirmed: Phase 3 extends `SnoozeDial`, and `CheckBackSlider`/`NudgeModal`/`WeekSlider`/
   `forms.css` were declared untouchable for the pack. **They were not touched.**
2. **The ceiling is discoverable ahead of submission.** `snoozeCeilingDays(card, daysUntilDeadline)`
   is exported, pure and total, so the hatch is rendered from it rather than learned by refusal, and
   **no offer rule was restated in the slider**.

Also confirmed: the group is available at the row (but `groupColumn` cannot carry it — it collapses
five ids to three); `.tdg-verbs`/`.tdg-slot` were already extinct; `.tbd-mi`'s only second
definition is three *additive state* rules in `todoGroups.css`, not a redefinition of the base.

---

## Phase 1 — weight follows the group (`83d4018`)

`splitWeight(group)` in `lib/taskRow.ts`. **Filled ink in `now`; outlined everywhere else.**

`g.id` is threaded as a third argument to `renderRow`. **`groupColumn` was not touched**: it maps
five group ids onto three columns — `now`, `housekeeping` and `yours` all land on `todo` — which is
right for the *menu* (a card's permissions follow its state: live, asleep, finished) and useless for
weight, which is exactly the distinction it discards.

**It asks "is this the urgent group", never "is it one of the quiet ones".** A list of the quiet
groups is a list a new group joins by being forgotten, and the forgotten default would be filled ink
— the loud one. Locked, including against a group id that does not exist yet.

### The `.ghost` fold, and what it turned up

`.ghost` had two meanings: row state (`primary.ghost` on `undo-done`) and, after this change, group
weight. The row-state flag is **deleted**, and Done reaches the outlined weight the honest way — it
is not the urgent group. Same pixels, better rule. Locked against rendered output
(`not.toContain("primary.ghost")`, and Done still renders `tdg-split ghost` reading `Undo`).

**⚠️ And folding it exposed a live defect.** The outlined weight used `border: 1px`. On a
`border-box` element that leaves **116px** of content while the three children ask for 81 + 3 + 34 =
118. The seam is `flex: none`, so the primary and **the caret** absorb the 2px — and Guard 1 states
34px. Now `box-shadow: inset 0 0 0 1px`, which paints the same hairline and occupies no layout.

**Browser-measured, against `dist/assets/index-*.css`** (see *Measurements* below): shipped
**81 / 3 / 34** in both weights; the bordered counterfactual **79.59 / 3 / 33.41**. Every Done row
has been serving a sub-34px caret since `225d4e1`.

---

## Phase 2 — the menu wears the dial (`98901da`)

The two preset rows are gone. They asked the writer to round their intention to the nearer of
Tomorrow and Next week, and the day they wanted was usually neither.

**One dial, two surfaces — extracted, not copied.** `SnoozeDialBody` holds the control;
`SnoozeDial` is now a thin popover wrapper (portal, placement, closers) around it. Those three are a
*popover's* concerns and the menu has its own set, so pushing them into the body would have given
the inline copy machinery fighting its container. Locked: the body contains neither `createPortal`
nor `addEventListener`. **A second slider built for the menu is what the pack forbade, and copying
this one would have been that in all but name.**

Three judgement calls inside the swap:

- **An offer still gets a dial.** The greyed `Next week` row is gone; the ceiling does that job
  better — one stop plus the caption. The limit is visible *on* the control rather than stated
  beside a row you cannot press. Dismiss keeps its greyed-not-absent treatment, unchanged.
- **A finished card gets no dial and says so.** `cardMenu` collapses Done to its way back, so the
  section renders `.tbd-mi.dim` — "A finished task has nothing left to put off" — rather than a
  track that can write nothing. A plain row with `aria-disabled`, not a `<button disabled>`: a
  button takes the shape of something pressable and then refuses.
- **The head reads `MOVE IT TO` in Snoozed**, not `SNOOZE UNTIL`. `cardMenu` made this call first
  when it swapped "Snooze…" for "Change the date…"; the menu now agrees with the model.

`.tbd-mi.dim` reused as instructed — no fourth state rule. `.tbd-menu2` consumed untouched; **258px
is the one thing this menu overrides**, because it holds a control where the board's others hold
rows.

**⚠️ Dependency recorded:** the split's menu consumes `.tbd-menu2` / `.tbd-mi` from
`todoBoard.css` — live classes in the retired board's stylesheet. Consumed, never edited. (Also
noted in `STATE.md` against the parked sweep.)

---

## Phase 3 — twelve stops, a hatched ceiling, receipts that name the day (`d67341c`)

**Twelve stops, one table.** 1–6 days singly, then 1–3 weeks, then 1–3 months. Fine where a day is a
real difference, coarse where nobody is choosing between the 61st and the 62nd. `SNOOZE_STOPS` is
the single source the prose (`label`), the spoken/terse form (`tick`), the Playfair title
(`stopTitle`, derived) and the printed axis (`axis`) all read.

**The track is the whole scale; `reachableStops` decides only how far the knob goes.** It used to
render the reachable stops and nothing else, so a shortened track was the *only* sign a ceiling
existed — and a track that quietly ends early reads as "there is nothing past here" rather than "you
may not go past here". The tail is hatched with the app's own 45° closed-door rule, the stop past the
ceiling stays faintly drawn, the range's `max` is the ceiling so the knob **stops** rather than
snapping back, and `clampSnooze` is still called on the way out.

### ⚠️ Two faults that were already live

1. **The receipt named a tier, and it was wrong before this pack.** The page flashed
   `days === 1 ? "tomorrow" : "next week"` — a **binary** label over what was already a five-stop
   scale, so snoozing something for a month announced *"Snoozed until next week"*. Three further
   paths carried hardcoded copies of the same sentence. All four now go through `snoozeDateLabel`,
   the same formatter the commit button uses. **The lock written for this found the fourth
   occurrence I had missed** (`forkNotNowGroup`).
2. **`s` never reached the dial.** The popover focused nothing, so after pressing `s` the arrow keys
   the dial exists to be driven by were still talking to the list behind it — a path advertised in
   `KEY_MAP` and not wired. Fixed by the same `autoFocus` Phase 3 needed for the menu.

### A superseded rule, restated rather than deleted

**"Nothing is pre-focused" is superseded.** It was written when this menu was a column of *verbs*,
where a pre-focused item put Enter a slip from Dismiss. The snooze section is a **control**: it opens
on tomorrow, Enter commits, and open-then-Enter is the commonest move. What makes a one-key commit
honest is that it is reversible from its own receipt. Where the dial is greyed, focus falls back to
the box and Enter still does nothing — **no verb is ever pre-focused, in either case**. The child's
`autoFocus` lands in the commit phase, *before* the parent's layout effect, so the parent's
`el.focus()` is guarded or it would take focus straight back.

### Two deliberate readings against the instructions

- **The readout.** The instruction was "keep `dialDateLine`'s Playfair headline, add the mono
  resolved date right" — but `dialDateLine` **is** the resolved date, so that prints the same day
  twice in two fonts. Built to the ref instead: **Playfair says how long ("3 weeks"), mono says
  which day ("TUE 11 AUG")**. Twelve stops are what made the duration worth stating. `dialDateLine`
  survives where it is worth most — the spoken `aria-valuetext`.
- **The axis marks are positioned on their stops, not `space-between` as the ref draws them.** 1D is
  index 0 of 12, 1W is 6, 1M is 9; evenly spaced would put "1M" at a third of the track while its
  stop sits at four fifths. A ruler with its numbers in the wrong places is worse than no ruler.
  (Measured below: each mark lands on its stop to 0.05px.)

**The foot now stacks** — full-width dated button, picker beneath. The ref draws the button
full-width and is silent on the picker; losing exact-date from the row's own control at 258px would
have been a real capability loss. Both entry points intact: `s`, "Change the date…",
`BrandDatePicker` with the ceiling as `max`.

`Shift`+arrow travels the four printed axis marks, clamped like every other movement — the axis you
can see is the axis the keyboard uses. Plain arrows stay the platform's.

---

## Phase 4 — the number keys are extinct (`6a2a1b5`)

`1` and `2` fired the two preset rows. A continuous twelve-stop scale has no two stops worth a
shortcut — picking tomorrow is open-then-Enter now, which is **fewer** keys than it was.

Deleted in all four places: the constant, the `hint` field, the menu's keydown branch, and
`.tdg-mkey` with its dim-state override. The menu's keydown answers **Escape and nothing else**.

**The `?` overlay is confirmed unaffected, not assumed.** The two tables were always separate —
`KEY_MAP` (`taskShortcuts`) drives both the overlay and the window handler; `SPLIT_NUMBER_KEYS`
(`taskRow`) drove the menu alone — so the overlay never advertised `1` or `2` and cannot now be
teaching a key that does nothing. Locked from both ends: no `KEY_MAP` entry matches a bare number,
and `S` is still advertised and still works.

**Ordering note.** The keys became inert *by construction* at P2 (their lookup searched section
`items`, and the snooze section has none). That interim was written into the suite as a case so it
could not read as an oversight, then removed here. Dead code that cannot misfire is the safe order.

---

## Verified red — every lock was seen to fail before it was believed

| lock | neutered how | result |
|---|---|---|
| weight follows the group | `splitWeight` → always `"filled"` | **3 fail** |
| the dial's permission is `cardMenu`'s | `dial.enabled` → always `true` | 1 fail |
| one dial, two surfaces | inline `SnoozeDialBody` → `<div/>` | 1 fail |
| the track walks the whole scale | `SNOOZE_STOPS.map` → `reach.map` | 1 fail |
| an axis mark stays on its stop | `axis: "1M"` removed | 1 fail |
| the receipt names a date | reverted to the binary tier label | 1 fail |
| the constant is extinct | `SPLIT_NUMBER_KEYS` re-added | 1 fail |
| the CSS rule is extinct | `.tdg-mkey` re-added | 1 fail |

### ⚠️ One of these locks passed for the wrong reason, and the red-check is what caught it

"The track walks the whole scale" searched the **whole file** for `SNOOZE_STOPS.map` and went
**green** with the track neutered back to `reach.map` — because the axis block a few lines below
walks the same table. Two blocks, two maps. It now anchors on `snz-track`, asserts its anchors
exist first, and slices between them (the house rule: *anchor before you slice*). Re-verified red.

This is the argument for red-checking every lock rather than the interesting ones: it was written
carefully, it read correctly, and it tested nothing.

---

## Measurements — browser, against the built CSS

Harness rendered the component's own markup with `dist/assets/index-*.css` linked whole (never a
hand-picked list of sources — Tailwind's preflight is what makes every box `border-box`, and this
fix's arithmetic depends on it). Screenshot taken first to force layout. Harness deleted after.

**The split, both weights:**

| | box | primary | seam | caret | caret left |
|---|---|---|---|---|---|
| filled | 118 | 81 | 3 | **34** | 286 |
| outlined | 118 | 81 | 3 | **34** | **286** |
| *outlined with `border: 1px` (the counterfactual)* | 118 | 79.59 | 3 | **33.41** | — |

Identical footprint, and the caret's left edge at the same x in both — so the column stays aligned
and a row moving between groups changes colour and nothing else.

**The dial** (track 204px wide): hatch runs 111.3 → 204 (to the end) with
`pointer-events: none`; stops land at 0 / 111.3 / 166.9, matching 0% / 54.55% / 81.82% exactly; axis
marks centre on their stops — `1W` at 111.25 against its stop's 111.3, `1M` at 166.9 against 166.9 —
with `1D` flush left and `3M` flush right so neither hangs off the track.

**⚠️ Two harness traps hit, both in CLAUDE.md already.** A first measurement read the split box as
`width: 0` while its children read non-zero — the pane's known "first JS call reads zeros" behaviour;
the screenshot-first rule fixed it. And `vite build` wipes `dist/`, so a gate build between writing
the harness and loading it leaves the page pointing at a stylesheet that no longer exists.
**Neither number was reported until it was explained.**

---

## Manual browser checklist — none of this is verifiable in jsdom

The page is auth-gated, so these are on dev with a real account.

**Weight**
- [ ] Filled buttons appear **only** in *Needs you now*; Housekeeping, Your tasks, Snoozed and Done
      are outlined.
- [ ] The caret column is on the same x down the whole page, across both weights.

**The guards** (unchanged by this pack, re-check after the weight change)
- [ ] Each half arms alone on hover — never both, never neither while one is hovered, in **both**
      weights.
- [ ] The seam fires nothing; press a half and slide off before releasing — nothing happens.
- [ ] Tab reaches the split once; Enter fires the primary; `↓` and `Alt+↓` open the menu.

**The menu**
- [ ] Nothing commits on opening.
- [ ] Destructive items sit below the dead zone; a click at the dead zone's midpoint does nothing.
- [ ] On an **offer** row, `Dismiss` is greyed and inert, and its reason shows on hover.
- [ ] On a **Done** row, the snooze section is a greyed line, not a track.
- [ ] In **Snoozed**, the head reads `MOVE IT TO`.

**The dial**
- [ ] Opens on tomorrow, with the slider focused; **Enter commits immediately**.
- [ ] Arrows move one stop; `Shift`+arrow lands on 1D / 1W / 1M / 3M.
- [ ] The Playfair duration, the mono date, the button's date and the receipt's date **all agree**.
- [ ] **Offer row:** hatched track visible, knob stops at the first stop and does not snap back, the
      caption explains why.
- [ ] `s` on a focused row opens the popover **with the slider focused** (this is the newly-fixed
      path — worth a deliberate look).
- [ ] "Change the date…" from Snoozed still opens it; the exact-date picker still refuses past the
      ceiling.

**Receipts**
- [ ] Snooze and dismiss both flash a receipt naming the **date**, and Undo reverses both.
- [ ] A long snooze (3 months) reads a real date, not "next week" — the fault this pack fixed.

---

## Open / not done

- **Phase 7 of tasks-consolidation (narrow and touch)** remains the only deferred item, unchanged by
  this pack. At 800px the six fixed tracks take 670px; the ref breaks at 900px but mobile pass 1 owns
  below 768px with its own chassis, so the swipe layer's home is still an open decision.
- **The button reads "Snooze until …" in Snoozed too**, where the head says `MOVE IT TO`. The body
  does not know its column; giving it one is a prop and a decision, not a fix-pack's call. Flagged.
- **Selection / batch** (`X` unbound) is still Nick's call — its premise remains false, there is no
  batch model.
