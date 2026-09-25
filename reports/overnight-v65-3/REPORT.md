# Query Centre v65.3 — overnight run report

**25 September 2026, unattended.** Built to `design-refs/query-centre-v85.html` (SHA256 `16d788ca…b9379`,
matching the prompt — no hard stop). Started at `6e0a64f5`, on `main`, level with `origin/main`.

## What is on `main`

Six phases, five commits, each pushed after its own green gates and a completed measurement.

| Commit | Phase |
|---|---|
| `34651583` | 2 + 3 — v85 enrolled; the rail's bars become progress bars |
| `b2192eb3` | 4 — the expanded frame and header, layout A |
| `770b7a85` | 5 — the date row |
| `f5c19e4f` | 6 — the corner's controls, and Group |
| `e2309960` | 7 — the group bands, the overdue mark, and what closing does |
| *(this one)* | 8 — the locks, CLAUDE.md, and this report |

**Phase 1 was a no-op:** every v65.2 phase had already landed, so §1.2 had nothing to finish. The
plan's named risk — that repointing the comparison to v85 would redden the ref cases before the
build phases restored them — **did not materialise**: 30/30 were green against v85 before any §3
work, because v85 leaves every element the comparison reads where v74 had it.

## The page now

**The rail.** Each row's bar is a progress bar: the fill is how far through the allowance the query
is, the allowance shrinks as `1/f` once it is past, and what is past is an ink overrun at full
opacity. No due line. **Colour is the true status colour and is never deepened** — a bar that darkens
with urgency says two things with one channel. Headings are sticky and run the card's full width;
overdue rows are inset 12px each side.

**The expanded view.** Its box is the viewport's, inset 16, so it lies over the shell's bar — the one
stated exception to the house viewport law. The header is layout A: the title at the tray's top left
with *today & next up* beside it, placed from the title's **measured** width and re-published when
the fonts settle; the hawk beneath at 150 wide; the count cards after him; the time controls at the
tray's foot right; Find and ✕ on one line at the top right.

**The date row** is one sticky 60px row of two cells inside the scroller. The corner is sticky-left at
the names column's own width — white, opaque, and holding **Filter · Group · Sort · ↺** — and the tier
beside it is transparent, because what colours it is the month bands inside it. The row carries one
band per month (contiguous, alternating, each naming itself with its label stuck at the names
column's right + 8), every Monday's date with a tick that is the label's own `::before`, a 6px navy
density strip along the foot, and the TODAY pill on the dates' line.

**Grouping** has five options — Urgency · Status · **Next action** · Submission package · No grouping —
and Group is its own control, so changing the grouping no longer lights the Sort button. Group bands
are anthracite, sticky below the dates, and run the track's full width with a 14px gap before each
but the first. An overdue row's highlight is a rounded pill inset in the names cell with an ink tab
at its left, not a wash across the track.

## The four findings worth keeping

**1. The ref's cascade said the opposite of its render, on the value that mattered.** Its rules hide
`.xheat` in the chosen date-row treatment and paint `u.tdy` as ink text on white — which reads as *no
heat strip, and TODAY as plain text*. Rendered, it draws a 6px `.hstrip` (a different element) and
TODAY as an ink pill with cream text. This is the repo's own first-match-slicing law one level up: a
value read off a stylesheet is only the value once you have checked which declaration wins **and**
which element is the subject. Every number in phases 5–7 is measured off a render.

**2. A probe that counted BANDS BY CONTAINMENT reported 0 of 37.** The month markers used to be
points, so "wholly inside the box" was the same question as "on screen". They are bands a month wide
now, and at the 6w zoom the window is shorter than a month — so no band is ever wholly inside it, and
the check reported nothing visible about a row naming its month perfectly well. It counts the sticky
**labels by intersection** now, which is what the claim was always about.

**3. `:first-child` matched no band.** The today line and the crosshair are `<i>` siblings ahead of
the first section, so the rule clearing the gap above the first heading reached nothing and every
band carried 14px — including the one against the date row.

**4. A fixture that tested the wrong field.** The close-threshold case set `responseDeadline` and a
send date far apart; `resolveExpectedDate` reads the **last send plus the agency's window**, so a
case asking for 27 days over got 244.

## The one decision that goes beyond the mock

**Next action has a seventh group: `revision` — "Revision owed · send the new version".** The mock's
classifier names three with-you statuses (offer, full requested, partial requested) and lets
everything else fall through to a date branch — nudge, consider closing, waiting on the agent. Its
fixture has **no Revise & Resubmit**, so a live R&R would fall through and be filed under *"Waiting on
the agent"*: a confident wrong statement about a query where the writer owes a new version.

`isWithYou` is ONE definition in this app — partial requested · full requested · R&R — and it governs
here too. The group is drawn only when there is one, which is the shape `stageOrder` already uses for
the summary's seventh column. The alternative is a fabricated value rendered with the same confidence
as a real one, which this repo's own law forbids. **It is the only thing built that the mock does not
draw, and it is flagged here for Nick rather than buried.**

Three smaller decisions are in the log: the window's start falling back to the send date where a
stage entry is unrecorded; a window of zero or less being fully overrun with the allowance clamped to
a 3% floor; and the legend reading "to the date", which the mock settles.

## Gates and measurement

| | baseline | at close |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| production build | clean | clean |
| Vitest | 505 files · 8,370 passed · 3 skipped | 505 files · **8,390 passed** · 3 skipped |
| `qcV65.measure.ts` | 30 passed | **30 passed**, 1,267 assertions (floor 95) |

**28 mutations were run and undone in the measurement worktree** across phases 5–7 — one named thing
at a time — and **none went green**. The full inventory, claim by claim, is in `RUN.md`.

⚠️ **Premise §1.10 could not be met and it is not mine to fix.** `git diff --name-only HEAD` was
never empty: the tree carried other sessions' and earlier runs' PNG and TXT artefacts under
`reports/` and `run-artifacts/`, and `git checkout`/`restore` on another session's paths is forbidden.
No gate reads those paths. **Gate cleanliness was read over `src/` and `tests/` only**, and it was
clean before every commit.

## What still stands

- **The Tracking tab inside the open card is still v11's `QueryTimeline`**, where the ref draws a
  replacement. Carried through v65, v65.1, v65.2 and now v65.3 — four passes.
- **Nothing on the page names the Next-action thresholds to a reader.** *Consider closing* means 28
  days past the expected date, or 84 days undated in the stage; a reader sees the band and not the
  rule. Deliberately not invented as copy.
- **Not deployed.** Dev serves v65.2. Prod is Nick's.

## Eyeball this on dev first

The date row at 1280 and 1920 against the ref; the drag on the dates and the three zooms; the Group
popover's five options and whether the bands read right under *Next action*; whether **Revision owed**
says the right thing on a live R&R; and the anthracite bands against the inset overdue pills, which
are the two treatments this pass changed most.
