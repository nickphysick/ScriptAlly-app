# Calendar v56 — ghosts, then order, then the ref violations

**Territory:** `TodoCalendarPage.tsx`, `todoTimeline.ts` + tests, `todoCalendar.css`, the
bar/segment module, `timelineGroups.ts`, `timelineCopy.ts`, the calendar-local modules,
`cal*.measure.ts`, this report. **View layer only.**

---

## FLAG 1 — REF, DEPLOY, PUSH

| | |
|---|---|
| Ref | `design-refs/timeline-v55.html`, 26,166 bytes |
| SHA-256 | `6e4a047bd20525868f93369bc462e2214c91f972b4dddbda56ec08391edd4fff` |
| Guarded by | `design-refs/.refhashes.json`, checked on every build |
| Deploy | **dev, `index-C9RbzTMW.js`** — served hash matches the local build |
| Pushed | **yes** — see GATES |

The ref carried far more than styling: its `.panel` / `.masthead` / `.ctrl` / `.inner` rules settle
the container question outright, and its ghost block (`.ghost`, `.ghost.due`, `.ghost .bdg`, the
`GL` glyph table and the placement expression) is the complete specification for Phase 1.

---

## FLAG 2 — GHOSTS

**They were never deferred. The condition could not fire.**

`liveStop` takes `Math.max(todayAt, goalAt, lastEventAt)`, so a card is extended TO its named end —
while the ghost required a named date **past** the card's end. Zero ghosts at Month, one at three
months, over twenty-three relationships. Two rounds reported it "unbuilt"; nothing counted them.

The ref settles the model: its rows run to a future `to` **and** carry a ghost, so the ring is not
the named end — it is the **move**, standing past whatever the card ends on.

### How many render

| Range | Ghosts |
|---|---|
| Month | 2 |
| 3 months | 3 |
| 6 months | 4 |

9 across the sweep — **8 due** (solid, badged) and **1 still ahead** (dotted, unbadged). Kinds
seen: `nudge`, `half`, `answer`.

**⚠️ It was 14 until the sweep found a real fault.** The ring is anchored to the card's END, so on a
card the window truncates it was placed *past the clip* — eleven rings sitting 26–50px **outside
the lane**. (The ref has the same arithmetic, `Math.min(r.to, hi)`, and simply never draws a ghost
on a clipped row.) Suppressed on `endsAtEdge`, which is not only geometry: a card the window cuts
off does not *end* there, so a ring "just past the end" states a position the reader cannot see.
Month loses most of its rings to this, which is what a 31-day window does to cards that outrun it.

**⚠️ And that leaves the dotted branch with a population of 1.** Both branches are still asserted
separately and both are non-empty, but one subject is thin — stated rather than glossed.

### The four locks, with their populations

| Lock | Population | Result |
|---|---|---|
| every ghost is past its card's end, glyphed, 24px round | 2 / 3 / 4 per range | pass — min gap **5px**, and **26px** where the card's right edge dissolves (the ref's 17 and 38, less the ring's 12px half-width) |
| due → solid + badge; ahead → dotted, no badge | 8 due · 1 ahead | pass — both branches asserted separately; the dotted population is thin |
| clearance when the card is **opened** | 3 cards both clipped and ghosted | pass — 26.1px and 5px |
| no ring for an agency's own move / no named date | 23 cards · 15 agent-held | pass |

### ⚠️ Two moves render no ring, and I did not invent them

The ref's glyph tables (`GL` and `MK`) hold exactly four: `nudge`, `half`, `answer`, `close`.
There is **no full-disc glyph and no revision glyph anywhere in the file**. The pack names a "full
disc (full to send)"; the ref draws none, and the ref wins on anything visual. `revision` is named
by neither.

So these draw nothing, counted at Month: **`Send the full` × 2**, **`Send the revision` × 1**.
`ghostKindFor` returns `null` for both rather than borrowing a mark that means something else.
**Two glyphs are wanted.**

`close` renders nowhere on this fixture: no row is in the long-silence state. The ring is wired and
its branch is unexercised — stated rather than counted as covered.

---

## FLAG 3 — ORDERING: THE PREMISE IS UNFOUNDED, THE CONTROL WAS DEAD

**The board was already painted `pressingFrom` ascending at first load**, before any control is
touched, and `pressingFrom` already implements the pack's three-case key verbatim. Measured before
anything changed.

What the round-trip lock found instead: **the Order control did nothing.** `oneList` re-sorted every
row on `pressingAt` regardless of `view.sort`, so selecting "Longest waiting" set `aria-pressed` on
the option and repainted **the identical order** — and threw away the builder's rule that a closed
row sinks below every live one.

### First ten rows at load — before and after

Identical, and that is the point: the fix restored the control without moving the default.

| # | key | `pressingAt` |
|---|---|---|
| 0 | agent-seed-cal-passed865 | 1713178800000 |
| 1 | agent-thin-ag-close | 1776769200000 |
| 2 | agent-thin-ag-chase | 1784545200000 |
| 3 | agent-seed-agent-2 | 1785150000000 |
| 4 | agent-seed-agent-1 | 1785150000000 |
| 5 | agent-seed-agent-5 | 1785495600000 |
| 6 | agent-seed-agent-6 | 1785841200000 |
| 7 | agent-seed-cal-passed20 | 1786186800000 |
| 8 | agent-seed-agent-3 | 1787223600000 |
| 9 | task-seed-cal-carried | 1787482800000 |

**⚠️ Asserting the two states separately could not have seen this.** Load order was right and
re-selecting Soonest was right; the fault lived in the transition. The round-trip case therefore
asserts that the *other* order actually differs before asserting that Soonest comes back — without
that line it passes on a board where the control does nothing.

---

## FLAG 4 — THE DASHED BORDERS, AND WHAT DREW THE CONTAINER

The ref carries exactly one dashed rule: `.card.closedc .bg`.

| Card class | Was | Now | Why |
|---|---|---|---|
| `closedp` (closed) | dashed | **dashed** — unchanged | the one state the ref dashes |
| `ghost` (long silence) | dashed | **solid** | not a closure — it is the state you can still nudge or close *from*, which is why it offers the close ring |
| `hollow` (past a passed named end) | dashed **+ the closed border colour** | **solid** | unfinished business, not a closed one |

Measured after: **69 cards across three ranges, every one solid**, 16 family/style combinations.

**`.tl-p.closedp .tl-frame` was declared twice**, ninety lines apart; the later won, so the earlier
block's border-colour had been dead while reading as live. Third stylesheet in this repo with that
fault. Folded into one rule.

### What drew the container

**`.tl-tbl`** — `border: 1px solid var(--tl-hair); border-radius: 11px; overflow: hidden`. Inside
`.ws-window`'s own 1px and 16px: a card within a card, where the ref draws one panel and states in
its own prose that the rows have *"no rounded container of their own"*. All three declarations
removed — with no radius left to round, the clip had nothing to do but cut a ghost ring off at the
right edge, and `.tl-zone` already contains horizontal spill.

Fourteen elements now sit between the row and the panel; not one draws a border or a radius.

### ⚠️ The 12px margin is NOT done, and here are the numbers

The ref insets `.masthead` and `.ctrl` at **26px** and `.inner` at **12px** — rows deliberately
*wider* than the chrome. Ours are all at **37px**, the workspace grid's gutter, shared by the
masthead, the tabs and `/todo`.

| Reading of "the panel" | Row would be | Today |
|---|---|---|
| `.ws-window` (the ref's `.panel`) | x 259, w 1146 | x 283, w 1098 |
| `.wpg-scroll` | x 259, w 1146 | " |
| `.tl-tbl`'s own box | x 294, w 1076 | " |

Moving the rows alone misaligns the board from its own controls; moving the gutter is a
shared-layout decision, and `/todo` must not change. **Stopped and flagged rather than chosen.**

---

## FLAG 5 — THE FIVE HYPOTHESES

| # | Hypothesis | Verdict | Measurement |
|---|---|---|---|
| 1 | tint without anything overdue | **FOUNDED** | `dueYmd` fell back to `waitFromYmd` (the ask's arrival, always past) whenever the stated date had *not* passed — so every writer-owed card was tinted. A card reading "send by 29 Sept" was washed edge to edge. Now `expectedYmd ?? waitFromYmd`; tinted 6 → 5 at Month, 15 across the sweep against 54 plain |
| 2 | the overdue span is wrong | **FOUNDED** | the span came from `yoursDays` while the date came from `dueYmd`. Three cards read "since 20 Aug · 9 days", "since 24 Aug · 9 days", "since 25 Aug · 9 days". Now `today − dueYmd`: 12, 8, 7, 4 days respectively |
| 2b | *(and a second fault underneath it)* | **FOUNDED** | "overdue since 15 Apr · 29 months" survived — because the span was **right**: that date is **2024**. `shortCalDate` never printed a year, so a two-year-old date read as five months ago and made a correct number look wrong. Now prints the year when it is not the current one |
| 3 | a card runs past today on a passed date | **UNFOUNDED** | 33 cards carry no future named end; **every one ends at 403 of an 806px lane** — today's line exactly — at all three ranges. `Math.max(todayAt, goalAt, …)` cannot extend on a passed goal |
| 4 | rows paint over the rail | **UNFOUNDED, over a real population** | at scroll-top no row can reach the rail, which is what was measured last time. Driven to eight scroll positions: **10 genuine card/rail overlaps, 0 crossings** |
| 5 | the `NEEDS ME` count | **FOUNDED — not a count bug** | the predicate (`offers` + `now`) is right. The **pill** and the **group** used two different tests for one word: `state === "nudged"` (a reminder exists) against `nudgeYmd <= today` (it has arrived). Two rows said "Nudge due" with reminders on 8 and 11 Sept and sat *outside* Needs me; a third sat *inside* it for an arrived reminder while calling itself "Queried". One expression now. After: **writer-owed 7, Needs me 7, all seven in, nothing else in** |

**⚠️ My first probe for #4 reported a crossing that was not one** — it sampled at the card's top
when the card sat just *below* the rail, so the point was outside the rail entirely and
`elementsFromPoint` answered about the row beneath. The sample must be inside both boxes.

---

## FLAG 6 — CLOSED

**Three cases now:** Rejected, Withdrawn, or a query whose agency states silence means no **and**
whose stated window has passed — the agency's own published rule, not a judgement of ours.

**⚠️ And only where the agency never replied.** My first cut omitted that and swept a
`Send the partial` row into Closed: the agency stated the policy and the original window had
lapsed, but the agency *had* answered — that is what a partial request is. Work the writer owes,
filed under the one view saying there is nothing left to do. The clause is `status === QUERIED`.

Counts: **Needs me 7 · With agents 13 · Tasks 2 · Closed 1 = 23** rows painted. Vale
(`thin-ag-close`) is the member, which is where your restatement puts her. No Closed row carries a
close ghost. Proved red by deleting the clause — Closed falls to 0 and both cases fail.

### The seeded rejection, and what it found

`tests/e2e/seedRejection.mjs` puts a real `Rejected` query on the harness account, on the
manuscript the board opens on, closed two days ago and inside `CLOSED_LINGER_DAYS`.

**It does not render, and it cannot.** A row survives only if it has items, segments or nodes, and
`facts` excludes every closed query — so a relationship whose only query is rejected builds **no
bar**, scores `alive === 0`, and is dropped before any tab is consulted.

That is why `Closed` read 0 on an account holding rejections, and it means the tab's only possible
members are rows closed by the agency-policy clause. It also means **"a closed card keeps its
dashed frame" is untestable here** — no closed card can render. The limitation is *asserted*, so
the day the board starts drawing terminal queries the case fails and points at the explanation.

**Whether the calendar should show recorded rejections is a product question I have not answered.**

The seeder took three attempts and each failure is written into it: the rules validate the whole
document; `setDoc` over an existing query is an UPDATE against a narrower allowlist; and the board
is manuscript-scoped, so a fixture on its own manuscript is stored, correct and invisible.

---

## FLAG 7 — EVERY RED MEASURE FILE

| File | Cases | Action | Why |
|---|---|---|---|
| `calLadder` | 3 | **retired** | the v40 ladder; v54 §4 replaced it with clip-and-open and left one `delete seg.dataset.tier` |
| `calProbe` | 1 | **retired** | **zero `expect()`** — a capture script, red because it clicks a retired control |
| `calShot` | 1 | **retired** | zero `expect()`, same cause |
| `calendarWidth` | 1 | **retired** | zero `expect()`, same cause |
| `calViews` | 4 | **rebuilt into `calViews54`** | see below |
| `calCard` | 1 | *(fixed in v55)* | the radius read off `.tl-p` after v54 moved it to `.tl-frame`, hidden by the fade bug leaving its filter empty |

**⚠️ Only one of `calViews`' four cases was red.** Deleting on the strength of that would have taken
two live laws with it — nothing else asserts the retired range slider stays retired, and
`calContrast` measures the words on a *card*, never a control against its own selected ground. Both
carried into `calViews54` with a note. **A file is retired by auditing its cases, not its name.**

**And `calViews54` had its own case made wrong by §5** — it asserted `Closed === rejected +
withdrawn`, an equality that stopped being true when Closed took the agency-policy clause. It went
red on a board that had just been made correct: a lock pinned to a value rather than a claim.
Retargeted to "a terminal row is never missing from Closed" plus "nothing the writer can still act
on is in it".

**Eight stale comments pointed at `calLook.measure.ts`**, retired in v55 §7 — across the page, two
stylesheets, three unit suites and the timeline lib. Repointed.

`datePickerHub` and `mastheadMatrix` are other sessions' and were not touched — see FLAG 10.

---

## FLAG 8 — POPULATION ASSERTIONS

**Every lock written or touched this pass gained one, and prints its count.**

| File | Cases | Population assertions added |
|---|---|---|
| `calGhost56` (new) | 4 | 7 |
| `calOrder56` (new) | 3 | 3 — including a *spread* floor (four distinct sort keys), so a key that had silently become a constant cannot pass |
| `calFrame56` (new) | 2 | 3 |
| `calFaults56` (new) | 4 | 9 — both branches of every claim |
| `calClosed56` (new) | 3 | 5 |
| `calViews54` (rebuilt) | 6 | carried its own, plus the tab-open precondition |
| `calCard` (v55) | 1 | 1, carried in |

**27 population guards across 23 cases**, counted from the source.

**⚠️ And one of them proved the rule's own point.** The tint lock did not redden on its first
mutation: it compared the tint against the card's own words, and **both are computed from
`dueYmd`** — so restoring the bug made the card tinted *and* saying "overdue", agreeing with itself
and wrong. One number read twice. The card now publishes `expectedYmdRaw`, the date the **agency**
named, and the check asserts against that. A population assertion is not enough on its own if the
two things being compared share a source.

---

## FLAG 9 — VALUES IN NEITHER REF NOR PACK

1. **The full-disc and revision glyphs.** The ref draws four; the pack names five and omits
   revision entirely. Not invented — those rows draw no ring, and the counts are in FLAG 2.
2. **The 12px row margin's meaning in our layout.** The ref's value is unambiguous; which element
   is "the panel" here is not, and the three readings differ by 35px. Numbers in FLAG 4.
3. **What `hollow` and `ghost` should be, now that dashed is closed's alone.** The ref draws
   neither state. Both became **solid**, the only other border style the ref uses, keeping the
   properties that already distinguished them (no fill, no shadow, muted ink).
4. **Whether a `close` ghost should be offered on a no-means-no row whose window has not passed.**
   Phase 1 says such a query offers `close`; Phase 5 makes it Closed only once the window passes,
   and says a Closed row carries no close ghost. The remaining case — policy stated, window still
   open — would be offering to close something the agency is still considering. Not built.

---

## FLAG 10 — UNVERIFIABLE REMAINDER, AND CROSS-SESSION

**Not mine, established by reading — no stash, no checkout, no restore:**

- **`src/lib/datePickerHub.test.tsx`** — red since the clock passed 11 August. It renders the
  picker with no value, so it opens on the *current* month against an 11 August floor and no
  `sa-dp-day off` cell exists. Tree-clean, imports nothing in this territory. Date-dependent
  fixture, not a regression, and it will redden again every month.
- **`tests/e2e/mastheadMatrix.measure.ts`** — `tsc` TS2339 on `CARVES.titleSize`, a carve-out the
  masthead session removed (`169f9882`). A reader left behind by a deletion, in their territory.

**Unverifiable here:**

- Single-engine — every measurement is Chromium. Scrollbar width measured 0 throughout, the known
  blind spot.
- The `close` ghost branch is wired and unexercised: no row on this fixture is in the long-silence
  state.
- `calShot39.measure.ts` still overwrites `reports/calendar-v39/board-1440.png` with a picture of
  the current board when the full glob runs — flagged in v55, still true, still not fixed.

---

## FLAG 11 — THE FULL SWEEP, AND WHAT IT COST

**Every `cal*.measure.ts` — 28 files, 60 cases — run end to end. First run: 2 failed. Second: 60
passed, 0 failed.** The run did not end on the partial pass.

The two failures were the same size in the summary and completely different underneath, which is
the reason for reading what each measured rather than the count:

- **`calTask54`** read `g.parentElement` and called it the lane. The ring became a **child of its
  card** in §1, so the check was asking whether the ring sits inside the CARD — which it
  deliberately never does. Eleven true readings of the wrong container, reported as the ring
  escaping the board. It names `.tl-c-tl` now.
- **`calGhost`** required the long-silence card to be **dashed** — the spelling §3 retired. The law
  ("not drawn as live work") is now asserted where it lives: no fill and no shadow, against a live
  card that has both.

**⚠️ And the sweep itself changed the harness account.** `calShot39.measure.ts` overwrites
`reports/calendar-v39/board-1440.png` with a picture of the current board every time the glob runs
— flagged in v55, still true. Restored with a targeted `git show HEAD:path > path`, never a
checkout.

**⚠️ AND MY OWN FIXTURE RE-SCOPED THE BOARD.** An early version of `seedRejection.mjs` created its
own manuscript, `rej-ms`. That manuscript became the account's **active** one — so the scope chip
read "The Closed Fixt…" and every later measurement was silently looking at a different board. I
found it in a screenshot, not in a number. Deleted, and the seeder's `--clean` now removes it so a
stale copy elsewhere goes with the fixture. **A seeder that leaves a manuscript behind changes what
every other check on the account is looking at.**

---

## GATES

| Gate | Baseline (recorded first) | After |
|---|---|---|
| `tsc --noEmit` | 1 error (`mastheadMatrix`) | 1 error (same, not mine) |
| `vite build` (whole output read) | clean | clean |
| `vitest` | 7358 passed · 1 failed (`datePickerHub`) | **7359 passed** · 1 failed (same) |

One test added (the overdue-span law); no new failures.

---

## DEPLOY AND PUSH

```
firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

| | |
|---|---|
| Bundle | `index-C9RbzTMW.js` |
| Verified | served hash **matches** the local build — dev is running this commit |
| New locks re-run **against the deployed site** | **17 passed** |
| Full calendar sweep (local) | **60 passed, 0 failed** across 28 files |

The local pass proves my bundle; only the second run proves what dev serves.

Screenshots: `reports/calendar-v56/` — `v56-1440-month.png` and `v56-1440-ghosts.png`, the latter
scrolled to where the rings are (Priya Nair's half-disc and Noah Bright's tick, both solid and
badged, standing past their cards).

**Pushed to `origin/main`.** The previous run left 11 commits unpushed and CI never saw them; this
run's commits and those are now all on the remote.
