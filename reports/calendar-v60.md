# Calendar v60 — design of record

## Phase 0 — ref check: **PASS**

| | |
|---|---|
| File | `design-refs/timeline-v60.html` |
| `<title>` | `ScriptAlly — Calendar v60 · design of record` ✓ |
| sha256 | `abf9bf08621295744034b9debcb00f3f778d2350825cd864fdd56c20a4a8c872` |
| Size | 72,076 bytes (v58 was 38,379) |
| Enrolled | `.refhashes.json`, 15 refs now guarded |

Four byte-identical copies were in `~/Downloads`; all four hash the same, so there was no ambiguity
about which is canonical. v58 was not consulted.

### ⚠️ THE REF CARRIES REJECTED ALTERNATIVES, AND THE `<body>` ATTRIBUTES ARE THE SELECTOR

The file explores five card treatments (medallion · ring · ticket · headline · trail), four rail
formats, four numbering styles, five urgent-flag palettes and four flag layouts. **The design of
record is whatever `<body>`'s data attributes select**, and everything else is context:

```
data-style="ruler"  data-past="dotted"  data-num="mono"  data-uflag="soft"
data-focus="on"     data-probe="on"     data-rail="tiles"  data-flay="side"
```

Three traps in reading it, all of which would have produced a wrong build:

1. **Two `data-past` rules use an invalid selector and are silently dropped.**
   `body[data-past="dotted" data-num="mono"]` puts two attributes inside one bracket, which is a
   parse error — so the "greyed" and "inset" past-stage treatments never apply. Only the third,
   `body[data-past="dotted"]`, is live. Read as written, they look like the spec.
2. **Where two selected variants collide, the later block wins.** `data-style="ruler"` sets
   `.wktick { height: 6px }`; `data-rail="tiles"` sets `.wktick { display: none }` four hundred
   lines further down. The ticks are gone, not 6px.
3. **`data-card` is absent entirely**, so every `body[data-card="…"]` rule is dead and the
   *unscoped* `.medal` / v59d scale-up block is what draws the badge.

---

## Phases 1–2 — **BUILT AND MEASURED.** The re-cut landed.

Deployed to dev. Eight measurement cases in `tests/e2e/calSurface60.measure.ts`, every number read
from the ref at test time via `refValues.ts`; four proved red by mutation before being trusted.

### The chassis (Phase 1)

- **No field.** `.tl-board` was a 14px-radius card in `--tl-field`; v60's `.board` is
  `background: transparent; border: none; border-radius: 0`. What replaced it is the **section** —
  six white containers with tinted headers — so a field behind them would be a seventh surface
  behind six objects. `--tl-field` survives with exactly one reader: the rail.
- **The rail is STATIC, and `position: sticky` is gone from the calendar (Law 4, lock (e)).** v58
  pinned it *inside* the scroller; v60 puts it *outside* one. That is a structural claim, not a
  stacking one — sticky pins by clamping, and a clamp is the only behaviour left on a board with
  nothing to scroll. The scroll boundary moved from `.tpl-zone` down to a new `.tl-rows`.
  - ⚠️ Scoped as **`.tpl-zone.tl-zone`** (0-2-0), not `.tl-zone`. `.tpl-zone` declares
    `overflow: auto` for three pages at the same specificity on the same element, so a bare
    `.tl-zone` would be decided by which sheet the bundler put last.
- **Week tiles.** The rail was `days / 9` arbitrary slices with a tick and a date label; it is now
  parchment tiles, one per week, anchored on today, Playfair numeral over mono month, **today's
  week in soft pink**. 13 tiles at 1440. Ticks gone (`.wktick { display: none }` under tiles).
- **Six sections**, each a container: tinted full-width header (icon + Playfair 24) and a
  zero-padded mono number column running **continuously across sections**, 01→23.
  The header and the number column read **one** `--gtint` token, so they cannot disagree.
- **Geometry**: `--row-h` 66→**88**, `--bar-h` 44→**62**, `--badge` **58** new,
  `--tl-rail-h` 42→**76**.
  - The left column is **derived, not typed**: `--tl-nm-w: calc(var(--tl-gnum-w) + var(--badge) * 0.36)`.
    The rail reserves it before its lane; the rows reserve the same as the number column plus
    `.tl-glanes`' padding. One expression, two readers — which is the whole of the alignment
    guarantee, and the reason a tick at `pct(d)` lands on the same pixel as a bar at `pct(d)`.

### The card (Phase 2)

- **The badge is the app's `StatusDot` at the ref's 58px**, bursting past the card's left edge by
  35% of itself, no disc or border of its own (the ref reached that by `background: none !important`
  over its earlier medallion — the ref telling you it changed its mind). Sized by `width`/`height`
  with `transform: none` (**Law 8** — some engines ignore a transform on an SVG).
  The ref's own `dot()` is **not** used: it maps a coarse `dk`, one `partial` glyph for both
  "partial requested" and "partial sent", where the app knows the real status.
- **Two lines**: name + chip on line one (the ref's `.trow`), agency · fact on line two. The chip
  was a third flex column before, competing with the fact for the card's width.
- **Type scaled with the card**: name 12.5→14.5, fact 7→8.5, chip 6.5→8.
- **The text inset is two terms of the badge** — `calc(var(--badge) * 0.66 + 10px)` — so retuning
  the badge moves the badge, the words and the trail together.

### ⚠️ THE MASK IS GONE, AND THE REASON IS THE SHADOW RATHER THAN THE FADE (Law 2)

v58 masked the frame, with a good argument: a mask dissolves the card whatever colour the card is,
so nothing has to know what is behind it. What that argument omits is that **a mask clips the
element's box-shadow along with its paint.** It cost nothing while the frame carried one faint
contact shadow. The frame carries **two** layers now — and the wide lift is the layer that makes a
card read as an object — so masking a faded card deleted exactly the layer v58e had just added, at
the end where the card most needs an edge.

Three parts, one mechanism, failing together: the frame drops its own shadow when it fades, a
`.tl-shd` sibling carries it **inset from the dissolve**, and a `.tl-fov` gradient dissolves the
card into the section's surface. The overlay reads `--tl-panel` — the same token `.tl-glanes`
paints with — where the ref hardcodes its own `#fcfaf6`.

**`.tl-content`'s mask went too.** v55 read Law 2 as being about the *card* and moved the mask down
to the text container, which satisfied the letter and not the point: that element holds the headline
and the pill, so the mask was still dissolving type. The clip is a hard cut now, revealed by the
hover glide — which is also what Law 10 says from the other side.

**Zero `mask-image` and zero `position: sticky` in the calendar sheet.** The only textual matches
left are in my own prose describing what was retired, which is why lock (e) must strip comments.

---

## Phase 3 — membership BUILT, ordering carried over

`src/lib/calendarSections.ts` — a pure cascade, unit-locked over the **whole fact space** (448
combinations) rather than a table of six examples.

### ⚠️ THE REF'S SIX PREDICATES OVERLAP, AND ITS FIXTURE CANNOT SHOW IT

The ref runs `rows.filter(gp.f)` once per group with each predicate re-stating its exclusions —
a partition only while no row satisfies two. Two do: `over` is `!shut && isUrgent` and `quiet` is
`!shut && pk === 'quiet'`, and **neither excludes the other**. The ref's three quiet rows carry no
dates at all, so it never happens there. In the app it is reachable the moment an agency that has
gone silent for years had once stated a reply date — the row is a long silence *and* an estimate
that has passed. Under the ref's shape it would be drawn **twice**, and the pack requires the
counts to sum. A first-match cascade cannot double-count, so that is the shape.

**And the order puts `quiet` above `over`, which is the decision the ref leaves open.** Both
sections would take that row and they say opposite things: Urgent's claim is that a prompt is worth
sending, Gone quiet's is that this one is past prompting — which is why the ref gives a quiet row
`Close query?` and an urgent one `Nudge them`. Offering to nudge an agency that has said nothing
for two years is not a prompt anybody would act on. The silence wins.

### ⚠️ v60 AMENDS THE APP'S OWN LAW ABOUT WHOSE DATES CAN BE LATE (Law 9)

`journeyBars` states *"the writer's own dates only — an agency's expected date that has passed is a
silence rather than a deadline"*, and files it as `state: "quiet"`: drawn, counted, prompting
nothing. The pack says both prompt, and the ref's Priya row is exactly that case. So `quiet` is
**Urgent** here, and `ghost` is **Gone quiet**.

**The threshold did not need choosing.** `barState` separates the two at `GHOST_AFTER_DAYS = 180`;
the ref draws its `Close query?` flag at `(0 - r.from) >= 180`. The app and the design already
agreed on the number — the app had simply never used it to file a row.

Ordering *within* a section is v58e's owed-tier sort, carried over unchanged. The pack's
"urgency order (most overdue first, then by date)" within each section is **not separately
verified** — reported as such rather than claimed.

---

## Three faults found in my own work, one of them shipped

### 1 · ⚠️ I PUSHED THREE RED LOCKS AND REPORTED THE GATES AS CLEAN

`calendarTokens.test.ts` had **3 failures at `c0ce49b8`**, all mine, and my v58e report said the
gates were no worse than baseline. The baseline reading was taken from a run that predated the
edits. This is the repo's own recorded law — *"green locally proves nothing about what you pushed"* —
and I hit it from the other side: green *earlier* proves nothing about what you pushed either.

1. **`.tl-body` clashed with `f12.css`.** Worse than a collision: `todoCalendar.css:892` carries a
   comment forbidding that exact name — *"`tl-cbody`, NOT `tl-body` — THE NAME WAS ALREADY TAKEN,
   AND THIS IS THE SECOND TIME"* — and v58 declared `.tl-body` **in the same file, 700 lines below
   the warning**. A comment is not a guard; the lock that was, was red and being stepped over.
   The body is `.tl-cardbody` now and the comment has been corrected to say it happened again.
2. **`--row-h` was pinned at `64px`** while the sheet said 66 and then 88.
3. **`--bar-h` was pinned at `54px`** while the sheet said **44** — and *nobody saw it*, because
   `--row-h` is checked first in the same loop and **a failing assertion hides every assertion
   behind it**. Two stale numbers, one visible.

Both are retargeted to **parse the ref** rather than carry typed numbers, and both proved red by
mutation. `--mk` stays a literal and says why: the ref pins no value for the lead-in mark, and a
lock reading the ref for a value the ref does not carry would have to invent one.

### 2 · ⚠️ THE RAIL SILENTLY EMPTIED, AND ONLY THE SCREENSHOT SAID SO

`todayAt` is **fractional** — the midpoint of today's day cell, which is what puts the today line
half a day into the day. Anchoring the weekly stride on it directly asked `visible[2.5]` and got
`undefined` on every iteration. **Zero tiles, no error, a green build, a clean typecheck and a
passing suite.** A probe that finds no element reports no offence; only a count does, which is why
the tile case asserts the population before anything else. Reproduced as MUT 3 and it reddens.

### 3 · ⚠️ I WROTE A COMMENT DESCRIBING AN ORDER I HAD NOT ESTABLISHED

The fade's shadow suppression carried a note saying it *"is declared last of the states,
deliberately"*. It was not — `.tl-p.owed` sits two hundred lines below at the same 0-2-0
specificity, so an owed card that faded kept a shadow running into its own dissolve, from a rule
that reads perfectly correctly. The prose-outliving-fact fault, committed fresh. The precedence is
now in the **selectors** (`.tl-p.owed:not(.fadeL):not(.fadeR)`) and states what it means: an owed
card takes the owed shadow only where it has an edge to sit against. Moving either block cannot
break it.

### And a fourth, found by the lock rather than by me

**I wrote the CSS for `.tl-shd` and `.tl-fov` and rendered neither for a whole build.** The rules
matched nothing, so faded cards were flat *and* unfaded at once — a class the sheet selects on and
the component never emits. The surface lock caught it; reading the diff had not.

### Plus one that was never mine to miss and had been live for two packs

**`.tl-p:hover .tl-frame` was declared twice**, 170 lines apart, same specificity. The later one set
a single flat `0 3px 10px`, so the two-layer hover lift added in v58e **never painted at all**. The
frame's shadow now has one declaration reading one token, and every state sets the token.

---

## Not built

| Phase | State |
|---|---|
| 4 · Flags (Caveat stamps, dotted future flags, urgent side-strip with `!`, one lateness vocabulary) | **unbuilt** — v58's caps still render |
| 5 · Past stages with sentences (`stageSentence`'s grammar, `dur()`'s weeks-and-days) | **unbuilt** |
| 6 · Tasks incl. rolled ghost | v58's task point survives; the ref's box size is now locked to the ref |
| 7 · Navigation + edge tags | **unbuilt** |
| 8 · The sweep of stale `cal*` cases | **unbuilt** — the count stands where v58d left it |
| The in-card trail (`.ctrack` / `.ctrail`) | **unbuilt** — CSS not written, so no rule with no subject |
| The cursor probe | **unbuilt** |

The pack said Phases 1–2 are the ones that must land. They did.

## Also standing

- **The `--tl-nearblack` / `--btn-ink` duplication is unfixed.** `#1c130f` is declared in the
  calendar and again in `index.css` as the app's one near-black button fill. Same value, two
  owners. Named in `reports/calendar-v60.md`'s predecessor and still true.
- **`--tl-pink: #f5e2da` duplicates `--pink`.** Same shape.
- The section tones are **pinned on `.tl-board`, not read from the theme**, and each names the app
  token or status base it equals. Three of the six accents *are* app status colours: Urgent's
  `#c98e8a` is `STATUS_DOT_MAP[PARTIAL_REQUESTED].base`, With agents' `#aebe96` is
  `[PARTIAL_SENT].base`, Gone quiet's `#c2b6a4` is `[NO_RESPONSE].base`. Reading them through
  `var()` would repaint every header in Bold and Editorial — a three-theme change this pass cannot
  measure — and the board has pinned its colours since v36 for that reason.

---

## Gates

| | Baseline (`c0ce49b8`) | After |
|---|---|---|
| `tsc` | 1 error — `mastheadMatrix.measure.ts`, another session's | **1, unchanged** |
| `vite build` | exit 0, 0 diagnostics (whole output grepped, not tailed) | **exit 0, 0 diagnostics** |
| `vitest` | **4 failed in 2 files** — `calendarTokens` ×3, `datePickerHub` ×1 | **1 failed in 1 file** — `datePickerHub` only |
| Suite | 7,356 passed | **7,365 passed / 3 skipped / 439 files** |

`datePickerHub` and `mastheadMatrix` are other sessions' and are left alone per CLAUDE.md. **Three
reds fixed, none introduced.**

### Three locks went red as a consequence and all three were right

| Lock | Why | Fix |
|---|---|---|
| `calendarColourLaw` | `calendarSections.ts` is a new calendar-owned module outside the census — the law sweeps the territory, and a file with no colour today still has to be swept tomorrow | added to `TERRITORY`, count 12→13 |
| `tasksViewport` | ⚠️ **first-match slicing, fifth instance.** Its anchor was the bare `.tl-zone {`, which is a substring of the new `.tpl-zone.tl-zone {` — so it read the wrong block and reported that the zone had stopped clipping sideways | anchored to `\n.tl-zone {`, plus two new assertions naming `.tl-rows` as the scroller |
| `todoPageSmoke` | asserted `tl-dt` and `tl-tick`, both retired with the tiles | retargeted to `tl-rtile`, and asserts the tick is **gone** |

⚠️ **And I over-reached on the third.** I added `tl-medal` to that case, which is a dated-TASK
fixture: a task has no status, so no `StatusDot`, so no badge. That is a test handing a subject an
input it cannot produce. Dropped, with the reason written at the line — the badge is measured on a
real board where there is a relationship to draw one for.

### Mutations proved before anything was trusted

| | Mutation | Failure |
|---|---|---|
| 1 | the rail back to `position: sticky` | *the rail is not static — v60 forbids sticky anywhere on this board* |
| 2 | badge scaled by `transform: scale(3.2)` instead of sized | *the badge is scaled by a CSS transform* |
| 3 | the fractional stride restored (the fault that shipped) | *the rail rendered no week tiles* |
| 4 | the number column untinted | *over's number column disagrees with its header* |
| 5 | `--row-h` drifted to 84 against the ref's 88 | *`--row-h` is declared 1 times: ["84px"]* |
| 6 | task mark 20px against the ref's 16 | *the task mark is not the ref's 16px* |
| 7 | `quiet`/`over` precedence inverted | *expected 'over' to be 'quiet'* |

## Environment

Measured in a worktree at `/tmp/sa-v60` (own `dist/`, `vite preview` on 4191, symlinked
`node_modules`, `.env.local` and `tests/e2e/.auth/` copied — both gitignored, both the dev-only
harness account). Served bundle hash verified against the local build before every run. The
worktree's second copy of those two files is deleted with it.
