# Calendar v60c — completion pack

## Phase 0 — **PASS.** `design-refs/timeline-v60.html`, title matches, sha256
`abf9bf08621295744034b9debcb00f3f778d2350825cd864fdd56c20a4a8c872`, `check-design-refs` green (15
refs). Measured in a worktree at `/tmp/sa-v60c`, preview on 4193, served hash verified per run.

---

## The standing ruling — one instruction per row. **Built.**

Two rows read `expected 27 Jul · 6 weeks overdue` beside `Nudge · from 19 Sept`. Both were true —
a passed estimate, and the agency's next window — and side by side they state two moves at once,
leaving the reader to decide which is being asked of them. An Urgent row now shows its urgent flag
and nothing else; both facts survive in the hover record. Measured: **0 rows** carry both, with
both populations non-zero.

⚠️ **And the ruling made one of my own locks wrong.** `calFlags60`'s "an overdue card takes no end
mark" selected owed rows as *Urgent with no future flag* — which, once future flags were suppressed,
became **every** Urgent row, including the passed-estimate ones that legitimately keep a mark for
their future window. The claim was never about the flag: a card that runs to **today** has no dated
future moment to mark. The selector is now the card's own right edge.

---

## Phase 3 — the in-card trail. **Built.**

3px, `bottom: 6px`, starting after the badge at `calc(var(--badge) * 0.66 + 10px)`, in the
section's `--gtone`. The track stops 12px short of the card's end.

**⚠️ The ref subtracts a fade extension and we have none, and that difference is load-bearing.**
Its card is `calc(w% + 30px)` on a running wait, so `trailBits` recovers the true span as
`(100% - 30px)`. Ours is `var(--w)` exactly — our dissolve is an overlay *inside* the card rather
than an extension past its end date. Carrying the ref's 30px across would have pushed every trail
30px past its own date. The term is absent deliberately, and its absence is why the fill lands on
today.

**Readings** (todayX = 871.9): every open card's fill ends within **0–1.5px** of today; the three
at 1.5 are cards whose *own right edge* sits 1.1px past the today line, so the fill is exactly at
`min(today, card end)` — which is the claim asserted. Closed and finished rows fill to the card's
end (David Marsh −258px, Rosalind Vale −155px from today), which falls out of the clamp rather than
needing a branch. Tones distinct per section: Urgent `#c98e8a`, Upcoming `#d9a8a3`, With agents
`#aebe96`, Closed `#cfc6b8`.

⚠️ **One branch is unexercised**: all 23 cards have `F > 0`, so the no-fill case (a card entirely in
the future) is not on this board and its behaviour is unproved.

---

## Phase 4 — past stages. **Built, and the population is the finding.**

A stage is the gap between two prior events, the last running to the current card's start. Dotted
outline, no lift, `48px` tall against the live card's 62, its own `StatusDot` at **0.22**, and the
sentence from the grammar.

### ⚠️ The board holds ONE in-window stage, and that is why the grammar is locked separately

Five prior marks across three rows is the entire in-window history on the harness account. A
rendered sweep of that is a monoculture wearing a census's clothes. So the split is:

- **`stageSentence` is a pure module**, exhausted in `stageSentence.test.ts` over **1,500+ pairs** —
  every stage × every ending × every duration band — asserting no appraisal, no pronoun for an
  agent, and the five sentences the design quotes **verbatim**.
- **The rendering** is measured for what exists, and the count is **printed on every run**:
  `past stages rendered: 1 on 1 row(s); 5 prior marks on the board`.

### ⚠️ The ref's own width gate is too low, and two stages rendered as 2px slivers

It skips a stage under 1.5% of the lane — 1.35 days here — while subtracting a gap of
`badge + clearance` (~58px) from the width. A two-day stage therefore drew a **2px dotted box with
a 54px badge hanging off it**, narrower than its own border. Measured: two of the three.

The gate is now in **days, not pixels**, because nothing here may measure the lane (Law 6). The
arithmetic is stated at the value: at the narrowest width this board supports (1280, lane ≈ 930px
over 90 days) a day is ≈ 10.3px, so the ~58px gap is ≈ 5.6 days and the words need roughly that
again — `STAGE_MIN_DAYS = 12`. **Nothing is lost by skipping one**: the node's own marker still
stands on its date and its caption still reaches the hover record; what is dropped is a card too
small to carry either.

---

## Phase 5 — **focus built, probe not.**

The hover lift was `scale(1.004)` — on a 500px card, two pixels of growth, which reads as a
rendering artefact rather than as the card coming forward. The ref's `data-focus="on"` is
`scale(1.018)` with a deeper shadow (`.10/.18` against the base hover's `.09/.16`), and focus is on,
so **the base hover value had no reader at all**. Both are now the ref's, single-sourced through
`--tl-frame-sh-hover` so the value has one home. Nothing else changes on hover — the pack is
explicit, and the ref's own "focus quietens the others" comment describes a rule it does not ship.

**The cursor probe is unbuilt.**

## Phases 6–7 — **unbuilt.** Navigation, edge tags, and the sweep of stale `cal*` cases.

---

## ⚠️ Another session is working in this checkout, and 13 reds are theirs

The tree is shared. Established by reading, without moving anything (the house rule for exactly
this):

- **Dirty files that are not mine:** `src/components/shell/PageHeader.tsx`,
  `src/components/shell/pageHeader.css`, `src/components/shell/mastheadFormat.test.tsx`,
  `src/components/shell/workspacePageGrid.css`, `src/index.css`.
- **What the failures say:** `expected … to contain '<span class="wsh-kicker">Querying'`,
  `expected [Function] to throw error matching /holds NONE/` — a masthead rebuild in progress.
- **They also committed to `main` while this ran** — `f0363046`, which HEAD now sits on.
- **My own paths, run alone: 114 passed, 0 failed** (`stageSentence`, `calendarSections`,
  `calendarTokens`, `calendarColourLaw`, `todoPageSmoke`, `tasksViewport`).

Nothing of theirs was stashed, reverted or reordered, and the commit below stages my paths only.

---

## Gates

| | Baseline (`ff57d805`, before the other session started) | After |
|---|---|---|
| `tsc` | 1 — `mastheadMatrix`, another session's | **0** (they fixed it in `f0363046`) |
| `vite build` | exit 0, 0 diagnostics | **exit 0, 0 diagnostics** |
| `vitest`, my paths alone | — | **114 passed, 0 failed** |
| `vitest`, whole suite | 1 failed (`datePickerHub`) | **14 failed** — `datePickerHub` + 13 in the other session's dirty shell files |
| Calendar measurement | 17 | **20 green** — `calSurface60` 8 · `calFidelity60` 5 · `calFlags60` 5 · `calTrailStages60` 2 |

### Mutations proved red before anything was trusted

| | Mutation | Failure |
|---|---|---|
| G | the weeks-and-days remainder dropped | *expected '3 weeks' to be '3 weeks and 1 day'* (3 cases) |
| H | an appraisal enters the grammar | *"No reply in 1 day — still waiting" appraises* |
| I | the trail always fills, ignoring today | *Elinor Hale's trail ends 166.5px from where it should* |
| J | the stage badge undrained | *a past stage's badge sits at 1* |
| J | the trail ignores its section's tone | *4 sections share 1 trail tone(s)* |
