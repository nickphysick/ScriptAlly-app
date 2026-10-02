# Query Centre v96 — run report

v95 was the baseline, as the cover note instructed: not reverted, built over. Most of v96 was
already in it, so this reads as a diff — what already matched the reference and was left alone, what
differed, and what the pack says that the reference contradicts.

**Nothing is deployed.** Dev is still serving v95 (`ef96f4be`).

---

## False premises, named first

**1 · §2's "faint mono column labels above the first row" predates head C.** The reference draws the
head, then the band, then the cards — no label strip. *(Ruled by Nick, 2 Oct: the reference wins.)*

**2 · §6's baked decision describes v95, not v96.** It reads *"The list head is one line on the page:
title left, three dashed typewriter controls right. No pills."* — which is exactly what v95 built and
what §2 of the same pack replaces. The one-paragraph summary has the same problem.

**3 · "it is the Contact list's head, so reuse that component" is false, measured.** Side by side at
1512: the reference's title is **Source Serif 4 at 600/28px**, the Contact list's is **Special Elite
at 23px**. Same arrangement — title, tally, find, three icon controls — and a different object.
`ContactControls` is bound to the contact filter model besides. Built to the reference; what IS
shared is shared properly, in `components/shared/listControlIcons`.

**4 · the reference is a settled design wearing a review harness's clothes.** Its scaffolding still
carries seven head options (A–G) from an earlier round, and its `<body>` ships `data-h="white"` in
the markup while its script sets **`data-h="c"`** on load. Reading the file answers the one question
§0 exists to settle, wrongly; the rendered DOM is the oracle, and it says head **C**, not in a
container.

**5 · the reference's own annotation prose is stale** — it describes the tray as *"the primary verb
as an ink pill, Snooze, and a ⋯"* while its rendered tray reads `Decide on the offer · Edit · Close`.
*(Ruled by Nick, 2 Oct.)*

**6 · §5 QC9's mutation "clamp nothing" cannot redden that lock.** Measured in v95: the bar's track
is `overflow: hidden`, so removing `Math.min(100, …)` leaves a fill asking for 340% and still
measuring 100. QC9's red comes from the colour and the dateless track instead.

**7 · "Run after `cc-prompt-living-headers-v2.md` … It is already running; rebase onto its result."**
What landed is living headers **v3** (`a5770cdd`), finished rather than running. Nothing to rebase
onto.

**8 · §4b's "reachable afterwards from the top bar's ?" could not be built as the obvious reading
suggests.** `AppShell`'s help menu — the one place an item would go — **is dead code**: its FAB was
retired and nothing anywhere sets `helpMenuOpen`. The `?` itself is the route now.

---

## What already matched, and was left alone

| | Reference | Dev (v95) |
|---|---|---|
| Content column | 578.1 / 727.8 / 795.3 / 884 at 1280 / 1440 / 1512 / 1920 | identical |
| The desk | x 296.4, w 1167.3, h 144.6 | identical to the pixel |
| The row's grid | `34px · 138.25 · 110 · 112 · 159 · 160`, gap 10, pad 13/16, radius 12, h 80 | `34px minmax(0,1fr) 110px 112px minmax(0,1.15fr) 160px` — the same fixed three, the same resolved flexible two |
| The folds | 1460 and 1366 | measured at 1460 and 1366 |
| The rail's header | §4 says untouched | untouched, and QC10 proves what the narrowing was allowed to do to it |

## What changed, in five commits

| | |
|---|---|
| `0a6adab4` | **0/6** — enrol the reference, and the §0 recon |
| `7177aed7` | **1/6** — the geometry: 44px below the desk, and the rail's four pixels |
| `e02d6f41` | **2/6** — the list head: the reference's, the band, Find, no column labels |
| `a55f9fd2` | **3/6** — the hover tray: the action, Edit, Close, on every row |
| `10b24482` | **4/6** — the rail draws two groups |
| `(5/5)` | **5/6** — the page guide |
| `(6/6)` | **6/6** — the thirteen locks, and the `?` that makes §4b's route back real |

---

## What the measurement found that reading could not

**The rail's 4px was one declaration, and it reached a third file.** `.qcv-group`'s
`minmax(0, 1fr) 340px` with a 28px gap, against the reference's 336 and 36 — the three figures sum
to 1167.2 either way, so dev was spending 4px of the gutter on the rail and 4 more on the list. But
`qcvExpanded.css`'s opening `clip-path` **restates the rail's width**, and its own comment says so.
Left at 340 it would have started the expanded card's grow 4px wide of the card it grows FROM, with
both declarations reading perfectly correctly. Both are tokens now, at `:root` because that card
portals to `document.body`. Measured after: main, rail and gutter exact at all four widths.

**A wholesale block rewrite destroyed two rules it had no business touching.** Replacing every
`.qcv-lhead` / `.qcv-op` rule with one authoritative block took `.qcv-ghostpill`'s four rules — the
Record pill — and `.qcv-ctl`'s with them, which was the 44px gap committed an hour earlier. A unit
lock caught the pill within one run; `.qcv-ctl` was found only by auditing the diff's REMOVALS
against a list of what had to survive. **The diff looked exactly like what I asked for.**

**The page guide crashed the Query Centre at short viewports, through every gate.** §4b says the
card must never cover the rail's header, so the first version asked whether the card's rect
overlapped it — and the answer moved the card, and moving the card changed the answer. React stopped
the loop with a maximum-update-depth error and the page fell into its error boundary. **1000 tall was
fine and 860 was a blank error page**, so tsc, 8,227 unit tests, a clean build and every measurement
at the usual height passed over it. Found by measuring the clearance at a second height — done
because the rule was new, not because anything suggested a problem. The honest form asks where the
card WOULD sit unlifted, which does not depend on the lift.

**The shell never heard the guide register itself.** React runs a child's effects before its
parent's, so the page registered its guide before the shell subscribed and the notification reached
nobody; the initial `useState` runs at render, earlier still. QC13 found it as "the help menu does
not offer the guide" on a page that plainly had one. The shell reads the store on subscribe now — a
derived reading cannot go stale, an event you did not receive can.

**Narrowing the rail made one state unreachable and left another reachable, and only measurement
could say which.** An agent's-turn query reaches *Upcoming* solely in the last 14 days of its window,
where its fill is already past .75 — so **a flat dated agent's-turn bar can no longer be drawn at
all**, and three unit fixtures that relied on one went red. But a with-you query is Upcoming whatever
its distance, so the rail still draws **48 rows of which 11 are dateless** and QC9's third clause
stays measurable. Had that gone the other way the pack would have contradicted itself and I would
have stopped.

---

## Decisions you have not seen

**The rail lost a group, and the cost falls on the calmest accounts.** §4 and the reference both draw
*Overdue* and *Upcoming*; v95 drew three deliberately, because dropping `watch` empties the rail for
the writer whose pipeline is healthiest — **21 of 69 on the harness account sit in it**. The counts
line still names all three, which is the reference's own arrangement. One entry in
`RAIL_ATTENTION_ORDER` puts it back.

**The band's gloss is the app's words, not the reference's.** The reference draws its one band with
`OFFERS, REQUESTS AND NUDGES`; this page's four urgency groups already carry hints the expanded view
states too and QC11 locks. Taking the reference's literal for one band would put a second vocabulary
beside a shared one for the three bands it cannot show.

**The `?` behaves differently on a page with a guide.** It opens a two-item menu there and is
unchanged everywhere else. §4b asked for the route and the only menu that existed was unreachable.

**The guide's seen-flag is per device, not per writer.** `localStorage` under the house `sa.` prefix.
The alternative is a Firestore write to show a tooltip.

**§0.8, corrected.** My recon said the list has no "nothing matches" state, which was read from
`QcList` alone and is wrong: `Queries.tsx` supplies `filtered` and `nomatch` branches above it. The
error was mine, not the app's.

---

## Gates

| | baseline (`ef96f4be`) | after |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean, 0 flagged | clean, 0 flagged |
| Vitest | **8,227 passed · 3 skipped / 511 files** | **8,227 passed · 3 skipped / 511 files** |
| The thirteen locks | — | **14 passed** (the thirteen, the setup and the floor) |

Vitest's count is unchanged because every unit file that went red was RETARGETED rather than
added to or deleted — eleven assertions across six files, each saying at the case which claim it
carries now.

⚠️ **Two shell laws caught the new sheet on its way in**: the reduced-motion block must stay last
(equal specificity, source order decides), and a shell stylesheet may not read a token the shell does
not define. Both were repairs to my CSS. And **tsc caught a duplicate import that Vitest ran straight
past** — the gate is both.


---

## The thirteen locks, each proved red first

Every lock was broken on purpose before it was believed, and **all thirteen went red on the first
attempt** — which is worth saying only because v95's run was the opposite: six of its eleven went
green first time, and the two faults that caused it (a reporter that read `tail -1` when playwright
prints "N failed" BEFORE "N passed", and mutations that were not breaks) are both corrected here.

Each mutation is one named change, applied in the measurement worktree, rebuilt, run alone, and
restored from a path-derived backup — never `git checkout`, which restores to HEAD and would destroy
the uncommitted measurement files.

| Lock | The mutation | What it said |
|---|---|---|
| **QC1** desk thirds | take a section out of the desk row's stretch (`align-self: start`) | `a wrapped line moved the feet: 536,503,503` |
| **QC2** desk counts | count `qcVisible` instead of `qcScoped` | `the desk followed the filter: 13,56,13 → 13,0,0` |
| **QC3** court click | delete the `setQcEyeFocus` line | `the rail's control did not follow the section` |
| **QC4** no truncation | widen the Coming-up typewriter to 15px | `the app's own strings truncate` — at 1280, flat and grouped, hovered and at rest |
| **QC5** folds | move the first fold's threshold out of reach | `1460 did not drop Queried` |
| **QC6** tray moves nothing | put the tray in the flow (`position: static`) | `the tray is 20.5px off the line it replaces` |
| **QC7** one vocabulary | hard-code a verb in `comingUp` | `Tests 1 failed │ 5 passed (6)` |
| **QC8** sent treatments | the icons never light (`const sent = false`) | `every icon is ghosted` |
| **QC9** bars | paint the overdue bar in the near tone; and, separately, fill the dateless bar | `an overdue bar is a tint of ink rather than ink`; `a dateless row draws a fill` |
| **QC10** header untouched | move the rail's title one pixel (`left: 19px` → `20px`) | `the rail's header changed` |
| **QC11** grouped | file the with-you court under *waiting* | `a court is missing from the grouping` |
| **QC12** tray contents | add a fourth button to the tray | `a your-move tray is not action · Edit · Close` |
| **QC13** guide once | show the guide on every load | `it came back on the next visit` |

### What the locks measured

```
QC1   sections 388 / 388 / 388, feet 503 / 503 / 503 — and 536 / 536 / 536 with a line wrapped
QC2   83 rows → 13 under a filter, desk unmoved at 13 · 56 · 13
QC3   rail focus: all → you → all, and all again for Closed
QC4   16 states swept (4 widths × flat/grouped × hover/rest) — 0 clipped app strings
QC5   1920, 1512: six columns · 1460, 1440: five, the "ago" inline · 1366, 1280: four
QC6   tray 0 → 1 on hover AND focus; the row holds its stated 80px; nothing else moves
QC8   83 rows — one treatment each, all three kinds entered, 0 drawing two and 0 drawing none
QC9   48 bars, 31 over: every one 100% wide in rgb(28, 19, 15); the foot's mark on one line
QC10  13 header elements compared — every difference a width or an x, none more than the rail's 4px
QC11  Your move 13 · Waiting on agents 25 · Gone quiet 31 · Closed 14 = 83
QC12  every row has a tray; with an action it is action · Edit · Close, without it Edit · Close
QC13  shows, × dismisses, the reload does not bring it back, the ? does — at step 1 of 3
```

---

## Screenshots

In `reports/qc-v96/shots/`, every clip derived from a measured box rather than a typed x.

| | |
|---|---|
| `1-flat-1440.png` | the page flat |
| `2-grouped-1440.png` | grouped by urgency — the four anthracite bands with the app's own glosses |
| `3-hover-your-move-1440.png` | a your-move row hovered: `Log the send · Edit · Close` |
| `3-hover-waiting-1440.png` | a waiting row hovered: `Edit · Close` |
| `4-guide-1440.png` | the guide on a first visit, 380 × 174 |
| `5-fold-1280.png` | the fold — four columns, `row-chip · row-agent · row-stand · row-next` |
| `6-rail-1512.png` | the rail's opening frame: 3 overdue |
| `6b-rail-upcoming-1512.png` | scrolled to Upcoming: 2 near, 2 flat, **2 dateless** |

⚠️ **The rail took two frames and the reason is the account.** It has 31 overdue rows, so the
Upcoming group — where the dateless ones are, a with-you query being Upcoming whatever its distance
— is hundreds of pixels below the opening frame. Each frame records which kinds are inside it; a
clip that claims three states and shows one is the kind of screenshot nobody checks.

---

## Still standing, not done in this pack

* The Tracking tab inside the open card is still v11's `QueryTimeline` where v65's reference draws a
  replacement — carried now through v65, v65.1, v65.2, v65.3, v95 and v96.
* `AppShell`'s help menu is dead code: nothing sets `helpMenuOpen`, its FAB having been retired. It
  still renders Help centre and Replay the tour, and neither is reachable. Found by this pack and
  left alone — it is the shell's, not this page's.
* The guide's three steps exist for the Query Centre only; §4b says the component serves every page
  that adopts the living header, and the others get theirs in their own packs.
* `tests/e2e/v96diff.measure.ts`, `v96recon.measure.ts`, `v96gap.measure.ts`, `v96rail.measure.ts`,
  `v96guide.measure.ts`, `v96shot.measure.ts` and `v96shots.measure.ts` are throwaway probes from
  this run and are not committed.
