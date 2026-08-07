# Tasks workspace audit fixes — run report (7 Aug 2026)

**Pack:** the contained fix pack from Nick's full-workspace audit of dev — one real bug with
tentacles, then consistency, then polish.
**Commits (one per phase):** `9091b30` (P1 the return boundary) → `64f1d7d` (P2 band + count
grammar) → `17d2f30` (P3 button + control laws) → `9c134ad` (P4 legend + the butter decision)
→ `77f9de9` (P5 teachings + scope). Gates green per commit. Suite at close: **3054 passed |
2 skipped, 194 files.**

---

## P1 — the return boundary (`9091b30`)

**The cause, in two halves.** Nothing owned the boundary: the engine suppressed by the INSTANT
(`snoozedUntil > now`) while other readers compared their own ways. And — the sharper half —
an OFFER's snooze flag is its **"I need time" quiet reminder**: the engine deliberately never
hides offers (journey-logic P4 — the card stays on the board, quieter), but the flags-built
Snoozed column picked the same flag up as a put-away. One field, two meanings, no owner —
"Tom Ellery has made an offer" in BOTH To do and Snoozed, twice in the calendar's today cell.

**The law, landed at one choke** — `taskFlags.flagSleeps` / `flagReturnedToday`, DAY-level, the
calendar's own local clock: a return day after today = SLEEPING (the Snoozed column only); today
or before = RETURNED (the lanes only, chipped **🕐 SNOOZED · BACK TODAY** for that day only, and
a **parchment** calendar pip — "this came back", not "this just landed"). `isFlagSuppressing`
and todoListPage's `isSnoozed`/`returnedToday` all delegate — the ledger-era `returnedToday`
helper had the day-level law half-written and no board consumer. No stored state flips.
*{snoozedOn} is NOT stored on the flag, so the chip states the return rather than inventing a
date — adding a stamp would be a schema + rules change, flagged here rather than smuggled.*

**The offer carve-out, argued not silent:** an offer cannot be put away — `offerGuard`'s own
standing law, already enforced on drag. Its flag may never enter the Snoozed column or place a
snoozed-return pip; the engine's on-board quiet behaviour is unchanged. The column-side pickup
was the violation, and removing it is the double-render fix.

**⚠️ THE MISSING-FIXTURE ADMISSION (the pack asked for this said plainly):** the partition tests
PASSED while the page double-rendered because **no fixture ever sat ON the boundary** — every
snoozed fixture was safely in the future, every returned one safely in the past. The seam
between them (snoozedUntil = today) was the one day nobody wrote down, and it was the day the
audit walked. `tasksAuditBoundary.test.tsx` now holds the yesterday/TODAY/tomorrow rows — the
today row fails on the old code — with single placement asserted across the board (DOM
title-node count), the counts, and the calendar; the chip on the return day only; the parchment
family; the offer exclusion on both surfaces.

## P2 — band and count grammar (`64f1d7d`)

1. **The kind survives snoozing.** Bare "SNOOZED" told you the card's state twice (the column
   already says it) and its nature never. Grammar: **"{KIND} · 🕐 | BACK {date}"** — AGENT
   WAITING · 🕐, STALE · 🕐, YOUR TASK · 🕐 — the kind from the SAME `derivedCopy` rebuild the
   title uses, never a second map. (Supersedes tasks-pages P2's bare band.)
2. **The bench header counts cards.** It summed the raw lanes (member units — every sweep agent
   loose): 24 against a 16-card world. The pool behind the bench is the To do column itself, so
   the header states `cols.todo.length` — the same card-unit figure the column head shows.
   Equality locked over a sweep-heavy fixture where the member sum visibly diverges.
3. **Why-lines per reason** — the derivation already named reasons (corrections fix 7); now
   LOCKED: the three quoted forms verbatim, and the distinctness law (two rows with different
   reasons may never render identical why-lines) asserted over all eight reason branches.

## P3 — button and control laws (`17d2f30`)

1. **"Work the list"** at zero committed wears the house disabled grammar — paper fill,
   hairline, faint text, not-allowed cursor, never opacity-only (the `.tpl-tools
   button[disabled]` attribute selector outweighs the ink primary's own fill — specificity
   stated in the lock); with one or more committed it is the ink primary. Both states locked.
2. **One control height per tool row:** the ink primary (42px on the board's own surfaces)
   takes the row's 34px step — the pink Add's height and single-line grammar.
3. **TAGS swatches** wear the FILTERS grammar: solid dots in the tag's strong tone; the
   outlined-ring form is extinct. One dot class, one grammar.

## P4 — the legend + the butter decision (`9c134ad`)

The legend (built with the Calendar) is locked: beneath the grid, from the one record, naming
exactly the live families in the ref's order. **The butter "dated notes" family is RETIRED**:
under the two-natures law a dated user card IS a task, so the set was structurally empty — a
legend entry and a pip branch for a thing that cannot exist. The type, the tone, the legend row
and the placement branch went together (no dead render path); `themes.md` carries the
retirement and its one return condition (the model ever recording note-ORIGIN on tasks).

## P5 — teachings + scope (`77f9de9`)

1. **Done's empty state teaches:** "Tick anything and it settles here until midnight."
2. **FILTERS scope on Today, defined:** the active filter (facet ∧ tags) applies to BOTH the
   committed list and the bench. Recon found no reason for a bench exemption — a page narrowed
   to Urgent suggesting housekeeping would be the FILTERS contract holding for one region and
   not the other — so the bench narrows through the same `applyFacet ∧ matchesTags`, and while
   anything narrows its header reads **"THE MOST PRESSING OF THE {n} MATCHING"** (the n stays
   card-unit, narrowed the same way). Locked behaviourally: an Urgent filter drops a
   housekeeping suggestion from the bench.

---

## The walk (dev — auth-gated, so these are yours)

**Lead check:** snooze a non-offer item until TODAY's date (the dock's clock or the ⋯ tiers
won't offer "today", so set one until tomorrow late tonight — or simplest: find one already
reading BACK {today}) and confirm it appears ONCE, in To do (or Today if committed), wearing the
**🕐 SNOOZED · BACK TODAY** chip, with a **parchment** pip in today's calendar cell — and that
the Snoozed column and count don't carry it.

Then:
1. Snooze an offer ("Remind me tomorrow") — it stays on the board (quieter), never enters the
   Snoozed column, and today's cell shows it once.
2. A sleeping card's band reads its KIND · 🕐 | BACK {date} — never bare SNOOZED.
3. Today's bench header figure matches the To do column's card count; with a filter active it
   says MATCHING and the suggestions honour the filter.
4. "Work the list" at zero committed: paper/hairline/faint/not-allowed — and the row's controls
   sit at one height.
5. Sidebar TAGS dots are solid fills, same weight as the FILTERS dots.
6. The calendar legend shows four families — no DATED NOTES.
7. Done's empty column reads the teaching line.

## Deploy

Dev hosting: `main` at the pack's tip → https://scriptally-dev.web.app. Prod untouched.
**The queue beneath is unchanged:** prod sequencing (the grown rules deploy: rejectedDate ·
detail/surfaceOffset · committedDate · tags) → Correction UI → notes-store convergence.
