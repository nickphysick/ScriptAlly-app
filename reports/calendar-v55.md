# Calendar v55 — STOPPED AT THE STOP CONDITION

## 1. The ref — THE RUN IS STOPPED HERE

**No `design-refs/timeline-v55.html` exists, in the checkout or anywhere on this
machine.** Searched `design-refs/`, `~/Downloads`, `~/Desktop`, `~/Documents` and
`/tmp` for any file named `*v55*`: none.

What is present:

| Where | File | SHA-256 (first 24) | Its own `<title>` |
|---|---|---|---|
| checkout | `design-refs/timeline-v40.html` | — | — |
| `~/Downloads` | `timeline-v54-ref.html` | `a4c98ea5d469a145fbaeddd4` | ScriptAlly — Calendar design ref **v54** (normative) |
| `~/Downloads` | `timeline-v54-ref (1).html` | `a4c98ea5d469a145fbaeddd4` | identical file, re-downloaded 07:45 today |

The two Downloads copies are **byte-identical**, and the file declares itself
**v54**, not v55.

**I have not substituted it.** The stop condition says so in as many words — *"Do
not fall back to an older ref... The previous run built against a ref three
versions stale because it substituted silently."* Treating a file whose own title
says v54 as though it were v55 is that substitution, and the fact that it is one
version behind rather than three does not change what it is.

**What I need from you — one of two things:**

1. Drop `timeline-v55.html` into `design-refs/` (or Downloads and tell me), or
2. Tell me explicitly that `timeline-v54-ref.html` **is** the normative ref for
   this pack and the pack's version number is out of step. That is a one-line
   answer and I will run the whole pack from it.

⚠️ There is a real chance (2) is the case: my v54 run reported that no v54 ref was
supplied and built from the pack prose, and this file was created at 21:33 on
31 Aug — during that run. If so, several Phase 0 findings below are very likely
divergences from a ref I have never seen.

## 2. Phase 0 — the eight hypotheses, measured on the deployed board

Worktree: primary tree only, `main`, clean, level with `origin/main` at
`57fda8df`. Local bundle `index-CzKIN5xX` matches the deployed one. Measured at
1440×900, Month range, with the stir suppressed. **Nothing was changed.**

| # | Hypothesis | Verdict | The measurement |
|---|---|---|---|
| 1 | Cards fade at ends inside the window | **FOUNDED** | see below |
| 2 | Rows whose wait ends at a reminder render no card | **FOUNDED** (different kind) | 1 of 22 cards is zero-width and `display: none` |
| 3 | A passed date still reads as future | **FOUNDED** | 1 row, and the path is the offer branch |
| 4 | The headline is centred while the pill is left | **FOUNDED** (different mechanism) | pill at 2 x values, headline at **9** |
| 5 | Rows paint over the sticky rail | **UNFOUNDED** | rail `z70`, `isolation: isolate`, **0** elements crossing it |
| 6 | Tasks render twice | **FOUNDED** | 2 elements per task, both on the timeline, 0 in the head |
| 7 | `CLOSED 0` with a rejected relationship present | **FOUNDED, with a caveat** | see below |
| 8 | Marsh runs past the right edge; its ghost sits left of its card | **UNFOUNDED here** | Marsh ends exactly at the lane edge; every ghost is after its card |

### H1 — founded, and the suspected mechanism is exactly right

**Every one of the 22 cards carries `fadeR` and a frame mask.** The predicate is
`right: !!live || end > days`, and `live` means *"this piece reaches today"* —
which is true of every non-terminal relationship whatever its named end. So a
named end inside the window cannot prevent the fade.

The clearest cases, all at `days = 31`:

| Row | `trueFrom` | `trueTo` | inside the window? | fadeL | fadeR | mask |
|---|---|---|---|---|---|---|
| Wren Ashcombe | −38.5 | **17.5** | yes, by 13.5 days | Y | **Y** | Y |
| Imogen Farr | −25.5 | **22.5** | yes, by 8.5 | Y | **Y** | Y |
| Hester Blaine | −8.5 | **25.5** | yes, by 5.5 | Y | **Y** | Y |
| Ana Duarte | −28.5 | **27.5** | yes, by 3.5 | Y | **Y** | Y |
| Devendra Rao | −40.5 | **29.5** | yes, by 1.5 | Y | **Y** | Y |
| Marcus Reed | 6.5 | 15.5 | yes | **n** | Y | Y |

`fadeL` is already correct — it is derived from the dates (`trueFrom < 0`) and
Reed/Kwan/Nair correctly carry none. **Only the `right` half is wrong**, and only
in its first term.

### H2 — founded, but it is a CLOSED wait, not a reminder-ended one

**Rosalind Vale draws nothing at all**: `from = 4.500`, `trueTo = 4.500` — the
card is exactly **zero days wide**, and the fit pass's sliver guard then sets
`display: none`. Its row renders, its name renders, and its lane is empty.

The mechanism is not "the end does not resolve": it resolves to the *same day the
wait starts*. Vale's relationship has a close event at day 4.5, so `barStop`
takes the close date and `waitFrom` takes the same event as the last status
change — `from === to`. Any relationship whose last status change IS its end
collapses this way.

22 cards over 23 rows; 2 rows are tasks; **1 card zero-width**.

⚠️ **Two of my own probes could not have found this**, and I am recording it
because the same shape has cost this repo time before: I asked for "rows with a
pill and no card", and the pill lives *inside* the card — so with no card there
is no pill and the predicate can never match. Then I asked which of the *visible*
cards were zero-width, having already filtered visibility out. Both returned an
empty list and read as "unfounded". The honest predicate is an unfiltered walk.

### H3 — founded; the path is the offer branch

**Noah Bright** renders `Offer received · answer by 28 Aug`. Today is 1 Sept.
`labelFor`'s `case "offer"` returns the future phrasing unconditionally — the
derived overdue copy added in v54 is reached from the writer-owed and `quiet`
branches and never from this one. It is the only row on this fixture phrasing a
passed date as future; the brief names Ellery, which will be the same branch.

### H4 — founded; the mechanism is a variable-width pill, not centring

- **Pill left edge: two values** — `617` and `757`. Those are the two correct
  insets (13px and 42px on a `fadeL` card) at two card positions.
- **Headline left edge: nine values** — `724, 735, 746, 751, 756, 772, 867, 883,
  889`.

Nothing is centred. The pill and the line are a flex ROW, so the headline begins
after the pill — and the pill's width is its text (`Queried` against `Send the
revision`). The ref asks for both to begin at the same left inset, which is a
change of layout rather than of a value, and is exactly the sort of thing I must
not guess at without the ref.

### H5 — unfounded. Change nothing

Rail `z-index: 70` with `isolation: isolate`; **zero** rows, cards, chips or
marks cross its box. v54 §2 fixed this.

### H6 — founded, and it is a disagreement between two rules

Each of the two tasks renders **twice on the timeline and zero times in the row
head**: a live mark and its origin ghost. v54 built that deliberately — the ghost
marks the day a task fell due while the live mark sits on today — and its lock
permits the pair as "distinct marks of one task". v55 says one element per task,
full stop. That is a real reversal, not a bug, and the ref presumably shows which.

### H7 — founded, with a caveat I cannot close from the view layer

`All —` · `Needs me 7` · `With agents 14` · `Tasks 2` · `Closed 0`; the four sum
to 23, which is the rendered row count. **But Rosalind Vale's card carries a
close event** (that is what collapses it to zero width), and no card on the board
carries the `closed` state — the six states present are `y3, quiet, theirs, y2,
offer, nudged`. So a closed relationship is on the board and the Closed tab reads
zero.

⚠️ Whether Vale is *the* rejected relationship, and why its state resolves to
`theirs`, needs a read of the query data rather than the rendered board. I have
not made it, because the run is stopped.

### H8 — unfounded on this fixture

**David Marsh**: `575..1381`, `trueTo = 31.000/31` — it ends exactly at the
window edge and exactly at the lane's right edge (`1381`). It does not run past
it. It carries `fadeR`, like every other card (H1).

**Ghosts**: none at Month (the one named date falls outside a 31-day window); one
at three months and one at six, and both are **after** their card's end. No ghost
sits left of its card at any range.

## 3. What I have NOT done

Everything from Phase 1 on. No source file was modified; the only additions are
three read-only recon probes, deleted before this commit. Gates are untouched at
the v54 baseline (vitest 7351 passed / 3 skipped / 0 failed).

The four items Phase 7 asks about are unchanged from the v54 report: the
Manuscript scope row, the ghost's 180-day `close` offer, the "clear of an opened
card" case, and `calLook.measure.ts` — which is still red, still describes a
board several rebuilds old, and which I would retire rather than rebuild, because
its seven cases assert the cut model v40 replaced. **I have not touched it: which
way that goes is a decision the ref may bear on.**
