# Calendar v61 — consolidated pack

## Phase 0 — **PASS.** `design-refs/timeline-v61.html`, title `ScriptAlly — Calendar v61 · design of
record`, sha256 `42ff813201d88a4a84e05ec80eade16dec0977b949c5f1c0c9659068cb7f132c` (the pack's
`42ff813201d8…`). Enrolled; 18 refs guarded. Both Downloads copies byte-identical.

## Phase 0.5 — measurement worktree at `/tmp/sa-v61`, preview on 4195, served hash verified per run.
Deploy from a clean worktree at the committed HEAD.

---

## Phase 1 — one calendar. **Built.**

- **One container** (`.tl-cal`), white, 1px border, 16px radius, holding the rail as its top row and
  every group inside it. v60's six framed sections are gone: `border: none; box-shadow: none;
  background: transparent` on every `.tl-grp`.
- **Groups are dividers** — a hairline inset 14px at both ends with a tinted pill sitting on it:
  icon · name · zero-padded count, in the group's own tint. Six distinct tones, asserted.
- **The numbers gutter has no fill.** Mono, zero-padded, running 01…nn across groups on the
  container's own white.
- **Sidebar** at 200px: the group list (All plus each non-empty group, with counts) as the filter,
  Display, search, the count and Add task or note, then ‹ Week / Today / Week ›.
- **The tab strip is retired.** It named four cuts of the board while the board is divided into six
  groups with different names — two vocabularies for one question, and two sets of numbers that did
  not match. The group list's counts **sum to All**, which the tabs' never could.
- **Inline rail** at the ref's 46px: one row of small parchment tiles, day and month on **one line**,
  today's tile soft pink, no month shelf, no ticks.
- **The today cap is hidden**, and so is the rail's own today chip — the pink tile already names
  today, and there were three statements of one date within a few pixels.
- **Tokens** to the ref's v61 values: `--row-h` 88→**76**, `--bar-h` 62→**56**, `--badge` 58→**40**,
  `--tl-rail-h` 76→**46**, gutter 64→**58**, stage card 48→**44** with a 30px mark.

## Phase 2 — the card. **Built.**

- **Inset soft-fill badges.** The 58px medallion that burst 35% past the card's left edge is gone;
  the dot sits at `left: 9px` inside the card at 40px with a 2px white ring, and the whole board
  stops reserving room for an overhang — the rail, the lanes and the container all did.
  **`StatusDot`'s own default variant**, with v60b's `badge` prop dropped: at 40px the tint is the
  mark, and the calendar stops having a badge of its own.
- **Cards are white.** The tinted-fill experiment is withdrawn; chips keep holder colouring.
- **The ongoing end is the TAIL** — the pack's first choice, not the `mark` fallback. The frame stops
  16px short with a square borderless edge and a **drawn** SVG chevron completes it to a tip on the
  today line. Measured: every ongoing card's tip within 1.5px of today.
  - ⚠️ **Drawn, never clipped.** A `clip-path` on the frame would cut its border off with its fill
    and leave the diagonals bare. Two paths: the chevron, and two one-pixel stubs that seam it to
    the frame's top and bottom borders. `preserveAspectRatio="none"` stretches the 100-unit box to
    the bar's height and `vector-effect="non-scaling-stroke"` is what stops that distorting the
    1.2px stroke into a wedge — the two go together, and neither is decoration.
  - **No fade on an ongoing card.** A fade says "cut off" and a tail says "still running"; v60
    dissolved both, so a live wait and one clipped by the window looked identical. The LEFT dissolve
    survives unchanged — that edge really is cut.
- **The trail never leaves the bar.** One inset token (`--tl-card-inset: 62px`) read by the words,
  the track and the fill; the fill is `min(fill-to-today, track)`; the track clears the chevron
  notch by 24px on ongoing bars and 12 on dated ends.
- **Past stages: two gates, and the second is new.** Skip under 4 days, drop the badge under 8 — the
  ref's 3.5% and 8% converted at the fixed 90-day window. v60c skipped everything under **12** days
  because a 54px medallion could not fit beside words; the badge is 30px and inside the card now and
  the ref gives a narrow variant that drops it, so the gate comes down and stages v60c dropped are
  drawn.

## Phase 3 — carried fixes. **Two built.**

- **Line two is agency · fact.** It was PREFIX · fact, where the prefix is the status word the chip
  beside it already states, or "Out since 19 Jul" — a date that is not the fact. The agency is the
  one thing about the row that appears nowhere else on the card.
- **One lateness vocabulary.** Three shapes were live at once — `overdue since 20 Aug · 15 days`,
  `no date promised · owed 20 days`, `expected 27 Jul · 6 weeks overdue`. All three are now
  `{what the date was} · {how late}`. v60c flagged the owed wording and declined to change it as a
  copy decision; v61 made the decision.

---

## ⚠️ Two conflicts, both resolved to the app, both recorded

**1 · The pack asks for seven soft fills; a locked app law says one per theme.**
`StatusDot`'s amendment (consolidated-v37) reads: *"the PALETTE of the six pipeline statuses is a
theme token — one hue per theme via `--sd-hue`/`--sd-centre` … direction/stage is carried by SHAPE,
not colour."* The calendar renders under `.t-f12`, which sets that pair. Measured: **23 badges,
2 fills** — the six pipeline dots sharing one centre, with the closed set and the Offer star keeping
their own. The authority split gives colour to the app, so the app wins and the lock asserts what is
true: the soft fill is drawn and comes from the component. Asserting seven tints would have meant
overriding a locked palette from a page, which is what that lock exists to stop.

**2 · "Cards are white" is not true of a closed one, and the ref agrees.** Its
`body[data-fill] .card.shut .frame { background: #f1eee8 }` applies under `data-fill="white"` like
any other value. The lock asserts white on LIVE cards and states the exception.

## ⚠️ And a compensation whose reason had expired

The rail carried `border-left/right: 1px solid transparent`, added in v58 with its reason written at
it: *"the card's own border insets its lanes by 1px a side, and the rail is NOT inside a card."*
v61 puts the rail inside the container with every row, so both are inset by the same border and the
compensation double-counts. Measured on the seam lock: rail lane **570/802** against a row's
**569/804** — one pixel of origin, two of width, from a rule that was correct when it was written.
A compensation outlives the thing it compensated for as easily as a comment does.

## ⚠️ Three faults of my own, two of which stopped the page rendering

1. **I deleted `.tl-board` and took every token with it.** Replacing the element with `.tl-cal`
   removed the host of `--row-h`, `--badge`, the six section tones and every colour — all scoped
   there deliberately. `calc()` on an undefined custom property yields nothing and the declaration
   is dropped, so the rows collapsed to 15px and the cards piled on each other, **silently, through
   a clean build and a clean typecheck**. The container is both classes now.
2. **TDZ, twice, and `tsc` caught only one.** `sidebar` is a `const` whose initialiser is JSX, so it
   runs at its declaration: it read `SectionIcon` 93 lines below it and the whole page threw on
   load — the harness could not find the shell — while the typecheck passed. The second time TS2448
   named four figures, and per the standing rule the fix was the ORDER: everything the sidebar reads
   is above it.
3. **A duplicate `.tl-rows` rule.** I added a second one setting only `padding`, which is this
   file's own invariant broken — the cascade takes the last, a reader takes the first, and the
   viewport lock read the wrong block and reported the rows had stopped scrolling. Folded into one.

## Not built

| | |
|---|---|
| Phase 3's remaining Section B items | reminder chip wording, the Upcoming 14-day seeded case, future-flag glyph check |
| Phase 4 · edge tags against a seeded fixture | **unbuilt** — v60d measured the population at zero and the fixture is the prerequisite |
| Phase 5 · the sweep and retirement | **unbuilt** |

## Gates

| | Baseline (`40217631`) | After |
|---|---|---|
| `tsc` | 0 | **0** |
| `vite build` | exit 0, 0 diagnostics | **exit 0, 0 diagnostics** |
| `vitest` | 1 failed — `datePickerHub` | **1 failed — `datePickerHub`**, 439 files passed, 7,375 tests |
| Calendar measurement | 25 | **9 new (`calOne61`)**, all green |

Six suites went red from the v61 changes and all six were correct: the token lock read the v60 ref,
the viewport lock found the duplicate rule, the smoke and the viewport named the retired tab strip,
and `journeyBars` held the old lateness wording twice. All retargeted with the reason at the line.

### Mutations proved red

| | Mutation | Failure |
|---|---|---|
| L | the rail loses its spacer | *a row's lane does not start where the rail's does* |
| M | the old lateness wording returns | *reads "Frayn Agency · overdue since 15 Apr 2024 · 29 months"* |

**The ongoing end that shipped is the TAIL** — the drawn SVG chevron, not the `mark` fallback.
