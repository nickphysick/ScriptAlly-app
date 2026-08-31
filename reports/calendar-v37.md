# Calendar v37 — one list, bare, taller bars

Baseline at `ce6e2f7c`: **tsc 1 error**, in `tests/e2e/mastheadMatrix.measure.ts:329` (`Property
'titleSize' does not exist`) — the masthead session's file, proved by reading, not this pack's.
Production build clean. Vitest **432 files, 7364 passed, 3 skipped, 0 failed**. Level with `main`
and `origin/main`; 88 untracked files in the tree and **none under `src/` or `tests/`**; no other
session holding uncommitted `src/`.

---

## Phase 0 — recon

### 0. The ref exists, and my first check said it did not

`design-refs/timeline-v37.html` is absent; the ref is `~/Downloads/timeline-v37-ref.html`
(15,499 bytes, 31 Aug 00:55, titled *"ScriptAlly — Calendar design ref v37 (normative)"*).

**The first search reported it missing and was wrong.** zsh aborts an entire command when *any*
glob fails to match, so a `Desktop/timeline-v37*.html` that matched nothing killed the
`Downloads/timeline-v37*.html` in the same line before it was evaluated. The failure printed one
`no matches found` naming only the Desktop path, which reads as a report about the Desktop rather
than as the whole line being cancelled. Worth remembering: **a shell "not found" is evidence about
the shell, not about the disk** — `find` is the check that answers the question actually asked.

### 1. The scrawl — every consumer, separated into code and comment

Comments count here because the deletion lock reads source, and this repo's prose is unusually rich
in the tokens it retires.

| file | total | code | comment |
|---|---|---|---|
| `TodoCalendarPage.tsx` | 15 | 9 | 6 |
| `todoCalendar.css` | 5 | 2 | 3 |
| `timelineCopy.ts` | 5 | **1** (`scrawlEarns`) | 4 |
| `timelineCopy.test.ts` | 11 | 10 | 1 |
| `calLook.measure.ts` | 11 | 9 | 2 |
| `tlNote.measure.ts` | 2 | 1 | 1 |
| `todoTimeline.ts` | 3 | 0 | 3 |
| `journeyBars.ts` | 1 | 0 | 1 |
| `timelineGroups.ts` | 1 | 0 | 1 |

The code surface is small: an import and six uses in the page (`scrawlFor`, the `.tl-scr` render at
`left: calc(pct + 16px)`), two CSS declarations (`--tl-scrawl: #8a4a36` and the `.tl-scr` rule), one
exported predicate, one whole `describe` block of ten assertions, and nine measure references
across two files — including an entire case, *"the scrawl and the fill name the SAME date"*.

**⚠️ Two things that must NOT be swept.** `src/components/onboarding/ImportOverview.tsx` has its own
"scrawl" — an onboarding corner note, unrelated. And **Caveat is used in ~46 files app-wide**
(post-its, note bodies, the task pane, packages, marketing). The lock the brief asks for must be
scoped to the calendar path, where there is exactly one: `todoCalendar.css:380`.

### 2. Grouping — confirmed, the row list is flat before bucketing

`timelineRows` returns `timelineWeek(...).rows`, a flat array. The page buckets it into
`board` at `TodoCalendarPage.tsx:1117` (`for (const g of GROUP_ORDER)`) and renders `g.rows.map(row)`
at `:1648`. So ONE LIST is not a new derivation — it is the array that already exists, rendered
without the bucketing pass. Last run's report was right.

### 3. `barFit` — a pure three-way decision, no DOM

`fitLabel(barWidth, longWidth, shortWidth) → "long" | "short" | "bare"`, with `FIT_PAD_LONG = 26`
and `FIT_PAD_SHORT = 22`. The widths are measured in the browser and the decision comes out, which
is what makes the fallback provable. Extending to two lines is a second width and a precedence,
not a new mechanism.

**The two lines already exist as one string.** The ref's `t1`/`t2` are a split of today's single
label: `"Out since 8 Aug · reply expected 3 Sept"` becomes `Out since 8 Aug` / `reply expected 3
Sept`. So the split belongs in `journeyBars`, which builds the label, rather than in the view
splitting on a separator.

### 4. Literal vertical offsets in the bar path — fewer than expected

Three, and only one is in the bar itself: `.tl-tchip { height: 23px }` (the ref makes this
`calc(var(--bar-h) - 2px)`), `.tl-tchip .sq { height: 8px }` (a glyph, not an offset), and
`.tl-fl`'s two 3px corner radii (a radius, not an offset). Vertical placement already goes through
`.tl-at2 { top: calc((var(--lane,0) + .5) / var(--lanes,1) * 100%); transform: translateY(-50%) }`,
so the lane maths is already tokenised. **The work in Phase 2 is the chip height and the token
split, not a sweep of literals.**

### 5. The wash and the today rule as built

- `.tl-c-tl::before` — `width: var(--tl-past-w, 0)`, flat `background: rgba(58, 28, 20, .035)`,
  `z-index: 0`. The width is published from the page at `TodoCalendarPage.tsx:1194`.
- `.tl-todayline` — `border-left: 1px solid var(--tl-todayl)`, `z-index: 5`, zero width.
- `.tl-todayflag` — the mono date chip, `translateX(-50%)`.

The ref replaces the first two with `.past` (`linear-gradient(90deg, transparent,
rgba(58,28,20,.055))`) and `.td` (`box-shadow: -6px 0 8px -6px rgba(58,28,20,.28)`, **no border**,
`z-index: 6`). The flag and stem are unchanged.

### Red gate

None of the five implicates derivation beneath the view layer. The one that comes closest —
splitting the bar label into two lines — is a change to how `journeyBars` *presents* a string it
already composes, not to what any of it means.
