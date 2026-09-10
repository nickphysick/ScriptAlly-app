# Timeline board — the ladder aligned to the five locked state colours

Built and measured 10 September 2026 from a clean worktree at `9544efdf`, dev bundle,
`127.0.0.1:4714`. Reference captured from **unmodified HEAD at 16:45 the same day**, before
any edit, at 1280/1440/1920 — the board's DOM is date-bound and a reference older than a day
has expired.

**Outcome: the board paints the five locked states on both pages. To-do's DOM differs from its
same-day reference in exactly 22 attribute values, every one a band class, at all three widths.
Nothing else changed.**

---

## False premises, at the top

### 1. `stageFor` was not changed, and changing it would have been the bug

The brief says *"`stageFor` keeps its direction … it gains a sand rung for Queried and loses the
intermediate steps."* Implementing that literally produces a function returning
`queried | agent | you | offer | closed` — which is **`stateFor`, which already exists**, already
returns exactly those five, and is already what Grid, List, Board, the tiles and the drawer read:

```ts
const STATE_OF = {                       // lib/queryCardFacts.ts — unchanged by this run
  QUERIED: "queried",  PARTIAL_SENT: "agent",  FULL_SENT: "agent",
  PARTIAL_REQUESTED: "you", FULL_REQUESTED: "you", REVISE_RESUBMIT: "you",
  OFFER: "offer",      /* everything else falls to */ closed
};
```

Two functions returning the same thing is the fault this repo records more than any other. And
`stageFor` has a **consumer outside the board**: the task pane reads it for a column tint
(`useTaskPaneSession` makes the call, `TaskPane` reads `var(--stage-*)`). Rewriting it would have
retinted a To-do surface this run was never scoped to touch.

**So the board became `stateFor`'s fourth caller instead.** The rendered result is exactly what the
brief specifies; only the mechanism differs, and it differs in the direction the brief's own Phase 2
demands — *"one mapping, exported once, both pages, not copies."*

### 2. The board *did* carry a copy, and the copy's justification had stopped being true

Phase 2 says to read the tokens "not copies", as though the board already did. It did not:
`todoCalendar.css` declared its own `--tl-stage-*` set of eight, locked rung-for-rung against
`f12.css` by `calendarStageTints.test.ts`.

That copy existed for a stated reason: `--stage-*` is declared on `.t-f12`, and *"the Calendar does
not sit under it"*, so a direct read would paint nothing at all through a clean build. **The
Calendar's own root is `<div className="t-f12 spine-root cal-timeline">`.** It does sit under it.
Measured before the change: `--panel`, declared on `.t-f12`, resolves on both calendars.

The five state colours are declared at **`:root`** besides, so they resolve on both regardless. The
copy is deleted; nothing is mirrored, so nothing can drift.

The old lock's third case predicted this in as many words — *"if the tokens move to `:root`, this
copy becomes unnecessary … the lock fails so somebody decides rather than drifting."* It failed, and
somebody decided.

### 3. The ghost has no band

The brief rules that *"the ghost's band takes the flat token like any other band; its fill and
opacity do not."* Measured: `.tl-jc` contains **no `.tl-sband`**. It renders a `StatusDot`
medallion and a line of text on white with a hairline — there is no band to tint. Nothing was
invented to satisfy the clause. Its fill, opacity and hover are untouched, as ruled.

(The one `bandClass` in `TimelineBoard.tsx` sits on `openCardOver` — the card that opens when a
ghost is *clicked* — and that does now carry the state token, correctly.)

### 4. The inventory's "fill" is a different thing from the band's tint

Phase 1 asks which of the 40 behaviours touch fill. **B4/B5/B6 are the bar's PROGRESS fill** — an
element with a width, decided by `fillFor`, stating whether a date exists. That is not the state
tint and this run does not touch it. The behaviours this run actually moves are the band tint and
`--st`, neither of which is a numbered inventory item.

### 5. The 106/39 gate is a day out of date — today's baseline is 102/43

The brief's gate says *"no worse than 106/39, same 39"*. Measured: **43 failed / 102 passed** with
the change — and **43 failed / 102 passed on a pristine build of the same base commit**, run in the
same session on the same machine, twenty-eight minutes apart.

The 106/39 figure comes from `reports/calendar-mount.md`, written yesterday. Four cal cases have
reddened since, from other streams' work; none of it is this run's. **A count is not a baseline** —
it cannot distinguish "those 39 plus four of mine" from "35 of those plus eight of something else",
which is why the pristine run was made rather than the list reasoned about.

The diff of the two failure sets is two entries, and both are the same cases at different line
numbers: `calBar63` d7 `361 → 365` and d9 `427 → 431`, because this commit's own d2 retarget makes
that file four lines longer. **41 shared + 2 line-shifted = 43 either way.**

⚠️ **The next run should quote 43, not 39** — and better, should store the failing NAMES rather than
a count, since a stored count is what made this re-run necessary.

---

## What changed

| state | rung(s) retired | painted before | painted after | locked value |
|---|---|---|---|---|
| Queried | `out-1` | `#e6eae3` sage | **`#f7efe3` sand** | `--state-queried` |
| Partial Sent, Full Sent | `out-2`, `out-3` | `#d7ddd3`, `#c7d0c2` | **`#e0e5dd` sage** | `--state-agent` |
| Partial Req., Full Req., R&R | `in-1`, `in-2`, `in-3` | `#f8e9e2`, `#f1dbd0`, `#e8c9bb` | **`#f5e6df` pink** | `--state-you` |
| Offer | — | `#d7e0e8` | `#d7e0e8` **unchanged** | `--state-offer` |
| Closed family | — | `#e4e1db` | `#e4e1db` **unchanged** | `--state-closed` |

Sixteen CSS rules became ten; eight copied tokens were deleted. Three call sites moved from
`stageFor` to `stateFor` — the band (`boardParts`), the clicked-ghost card (`TimelineBoard`) and
To-do's own card builder (`TodoCalendarPage`).

**`#e8c9bb` is now only an accent.** It was `--tl-stage-in-3` *and* `--state-you-deep`, the locked
pink accent for desk strips, active tabs and target rings. It is no longer any state's fill, and the
note sits at the declaration so the next reader takes the accent reading. The same goes for
`#c7d0c2`, which was `out-3` and is `--state-agent-deep`.

## Proof

**To-do against its same-day reference**, 1280 / 1440 / 1920 — every difference enumerated:

| difference | count | verdict |
|---|---|---|
| `tl-sband tl-st-out-1` → `tl-st-queried` | 14 | changed as intended |
| `tl-st-out-2`, `tl-st-out-3` → `tl-st-agent` | 4 | changed as intended |
| `tl-st-in-1`, `in-2`, `in-3` → `tl-st-you` | 4 | changed as intended |
| **anything else** | **0** | — |

Attribute-field count identical (4443 To-do, 3667 Query Centre), so nothing was added, removed or
re-parented. Computed fills: **22 band nodes and 44 `--st` values moved, 0 changes of any other
kind, 0 landing on a value other than the locked one** — the same figures on both pages.

**Cross-view, in Query Centre** — the calendar band against the card's `--band-a`, resolved to paint:

| state | calendar | Grid card | agree |
|---|---|---|---|
| queried | `rgb(247,239,227)` | `rgb(247,239,227)` | ✔ |
| agent | `rgb(224,229,221)` | `rgb(224,229,221)` | ✔ |
| you | `rgb(245,230,223)` | `rgb(245,230,223)` | ✔ |
| offer | `rgb(215,224,232)` | `rgb(215,224,232)` | ✔ |
| closed | *absent from the window* | `rgb(228,225,219)` | **unexercised** |

⚠️ **`closed` is not proved on the calendar today** — no closed query falls inside the harness
account's 90-day window, so that branch of the mapping was never entered. Its rule and token are
unchanged from before, and the unit lock asserts the CSS serves it; but this is a monoculture-shaped
gap and is stated rather than glossed.

**Ghosting, untouched:** opacity `0.32` at rest, `rgb(255,255,255)` fill, `rgb(227,217,203)`
hairline, `1` on hover.

**⚠️ `--st` is consumed only in COMPACT density** — the 4px status edge on the card frame. Every
measurement above was taken in comfortable, where the property is set and nothing reads it, so the
compact branch was measured separately: see the gate table.

## Gates

| gate | result |
|---|---|
| `tsc --noEmit` | clean |
| production build | clean (grepped in full, no `error` / `[WARNING]`) |
| unit | 466 files · 7,717 tests · 3 skipped |
| `calendarStageTints` retargeted | 5 cases, **proved red** by putting a literal hex back where the token belongs |
| `queryStateColours` census | retargeted to the measured owner set — see below |
| compact-density edge | 23 edges a page, 4 states, **every one the locked colour** — both pages |
| `cal*` e2e locks | **102 passed / 43 failed — zero newly red, zero newly green** (see below) |

### Two locks moved, and one of them caught the change

`calendarStageTints.test.ts` asserted the copy agreed with `f12.css` rung for rung. Its subject is
gone, so it now asserts the inverse and stronger law: the calendar declares no local copy, reads
`var(--state-*)` for all five, has no rule left for a retired rung, and the five it serves are
exactly the five `stateFor` can return — two derivations against each other, never a literal on
both sides.

**`queryStateColours.test.ts` failed on the first full run, working exactly as written.** It is a
consumer census: it names the ladder's remaining owners and fails when one leaves, *"so somebody
decides rather than drifting"*. The calendar left, taking the count from 2 to 1. The owner list was
**re-measured rather than edited to fit** — the pane splits across two files, `useTaskPaneSession`
making the call and `TaskPane` reading the token — because a carve-out naming a page that has
stopped reading is a census quietly shrinking its own population.

## Carried forward, unchanged

- The two dead rules for the CSS sweep: `.t-f12 .tl-gracebar .tl-sweep` (no renderer anywhere in
  `src`) and the `.tpl-zone.tl-zone` compound.
- `--panel`'s two-point white — `#fffdfb` on To-do, `#fff` in Query Centre, because
  `.t-f12.qc-neutral` overrides `.t-f12` and only Query Centre carries it — and the stale comment
  at `todoCalendar.css:508`.
- **A reference for this board expires in hours.** Capture from unmodified HEAD, same day, always.
- The ladder's tokens (`--stage-*`) stay in `f12.css`: the task pane still reads them.
