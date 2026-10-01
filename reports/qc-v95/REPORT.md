# Query Centre v95 — run report

Branch `qc-v95` off `a5770cdd` (the pushed tip, Living headers v3 included), worktree
`/tmp/sa-qc95`. Five commits. **Not deployed — that is yours.**

Reference `query-centre-v95.html`, SHA256 `4304009916…e56ccf79`, verified and enrolled.

---

## False premises, named first

Nine, and five of them changed what got built.

**1. The three courts do not sum to the total.** `tileCourt` returns `null` for `WITHDRAWN` and
`SIGNED`, so those queries are in no section. Measured on the harness account: **13 + 56 + 13 = 82
against 83 rendered rows.** QC2's "the desk still says 4 / 19 / 4" reads as a partition and is not
one, so the lock asserts the three *unfiltered court counts* and that they do not follow the filter —
never that they add up to the title.

**2. §2 contradicts itself about "urgency", and the reference settles it.** It names three headings
verbatim — *Your move* / *Waiting on agents* / *Gone quiet* — and then says "the grouping rule is the
Birds-eye view's", whose Group option **labelled "Urgency"** is `attention`: *Overdue* / *Upcoming* /
*Watch and wait*. They are different partitions (a with-you query past its date is `overdue` there
and *Your move* here; an agent's-turn query sixty days into a sixteen-week window is `watch` there
and *Waiting on agents* here). The reference renders the three headings, so they win — off
`tileCourt` + `pastExpected`, both existing derivations, no new rule written.
**For your call:** the list's "urgency" and the expanded view's "Urgency" are now two partitions of
one word. Unifying them means editing the expanded view, which §7 fences.

**3. "The rail's bars-with-today-line all go" — the today line went on 24 September.** v65.3 already
replaced it with `eyeProgress` bars (your decision 1 of that pack). §4 is a re-dress of bars that
exist, not a replacement of a due line.

**4. §2's "the active filters show in the floating bar the app already has" — there is no such bar on
this page.** `filterPills` exists and only the *expanded* view renders one. So the filter control
names its value where there is one (`filter with you ⌄`) and counts them where there is more than one
(`filter 2 on ⌄`, §2's literal form). That is the reference's own grammar for `group` and `sort`, and
it needs neither the second line §2 forbids nor a bar this pack is not building.

**5. §4 names two rail groups; drawing only two empties the rail for a healthy pipeline.** The
reference draws *Overdue* and *Upcoming* because its fixture holds nothing else. Every query inside
its agency's window with nothing due in a fortnight is `watch` — **22 of 69 on the harness account** —
and dropping them would make the rail say "Nothing is out with an agent" over a dozen live queries,
while the header still counted them. All three groups are drawn.

**6. The reference cannot say what Group = urgency does with a closed query** — it has no closed row.
A fourth **Closed** group, drawn only when it has rows, which is what every other grouping already
does.

**7. The reference's folds are viewport media queries, which are wrong here.** It reproduces this
app's frame exactly, so its 1460 and 1366 are right for the one state it draws — but this sidebar
collapses, and at 68px the row gains 180px at the same viewport. Container queries on the row's own
width, at the reference's values carried across by the measured slope.

**8. QC4's absolute reading cannot hold.** After the fixes below, **no string the app chooses**
truncates at 1280/1440/1512/1920. What still ellipsises is writer-chosen — an agency, a package name
— and a 112px chip cannot hold "The Complete Autumn Submission Bundle" at any type size. Each carries
its full text in a `title`.

**9. §3's Coming-up verbs cannot equal the To-do list's strings.** The list says "Send your full
manuscript"; the column is 160px of 13.5px typewriter. The **bucket** is what is shared, and QC7
reconciles on it — the stronger claim anyway: a string comparison passes on two surfaces that agree
about words while disagreeing about which query needs what.

---

## §0 Recon

Reported in full in [`RECON.md`](RECON.md) and committed before any edit (`80c4b4c8`). The headline:

| Viewport | app main column | reference row | delta | rail | gutter |
|---|---|---|---|---|---|
| 1280 | **582** | 578 | +4 | 340 / 336 | 28 |
| 1440 | **732** | 728 | +4 | 340 / 336 | 28 |
| 1512 | **799** | 795 | +4 | 340 / 336 | 28 |
| 1920 | **888** | 884 | +4 | 340 / 336 | 28 |

Uniformly 4px, all of it the rail (336 drawn against 340 built). **The red gate is 40px at 1512;
this is 4**, so the rows are built to the reference's own column widths unchanged.

§0.5 found the shared derivation, so no stop: `assembleBoardColumns` → `cardBucket` → `taskDeed`,
reached per query by `relatedRecordId` — the key `queryTaskBadge` already uses on this page.
`nextAction` is a *different* derivation (status and dates, not a task flag) and stays where it is.

§0.9: I am the Query Centre session and there is no separate Birds-eye one. The only peer whose work
could move §0.2's numbers is **Workspace sidebar redesign**; I asked and it confirmed the widths are
settled (`--shell-side-w` 248, collapsed 68, nothing pending).

---

## The commits

| | |
|---|---|
| `80c4b4c8` | **0/4** — enrol the reference, and the §0 recon |
| `3f779b23` | **1/4** — the desk: one white frame, three equal sections |
| `f0099c43` | **2/4** — the list head: one line, and Group arrives |
| `9d9ac8cc` | **3/4** — the rows: five columns, the disc's glyph, the hover tray |
| `e38d372a` | **4/4** — the rail: one universal progress bar per query |
| `82c570b6` | **5/6** — two fixes the measurement found: the folds measured at the edge, the foot's mark bound to its words |
| `c6880434` | **6/6** — the eleven locks, the red-first evidence, the screenshots and this report |
| *(this one)* | **7/7** — the commit list, which could not name its own last two rows |

Each commit message carries its own reasoning; what follows is only what a reader of the diff could
not work out.

---

## What the measurement found that reading could not

**My own probe read one row and reported one clipped line; swept over the whole fixture it was
fifty.** The §0 monoculture fault, in my own measurement, two hours after I wrote it down. The first
fold moves the "ago" *into* the agency line, so from there down the Agent column carries two facts
where Where-it-stands carries one — the flexible ratio now inverts at the fold that causes it.

**The stands line printed `23 SEP` under `Queried` beside a Queried column already printing
`23 SEP`.** A Queried query's stage date *is* its send date. The agent's court talks about the reply
now, and "yet" versus the span is `pastExpected` rather than a day threshold: inside the agency's own
window nothing is late, and the reference's two examples fall either side of exactly that line.

**"Decide on offer in 2 weeks" and "Fill in what you sent 5 months over" both ran past 160px.** Only
a send and a nudge carry a countdown — the reference's own split, and not a length compromise.

**An offer inside its deadline was drawn with the overdue dot.** The reference draws its one offer
that way, which is true of its example and not of the state.

**A documented source order does not hold in the build.** `qcvPage.css`'s 0-1-0 font reset says it is
emitted before every component sheet; measured in `dist/assets/index-*.css`, **the reset is at byte
782,751 and the desk's rules at 745,696**. The numeral rendered in Playfair with
`font-family: var(--qcv-type)` reading perfectly correctly. Nothing else on the page is affected, and
only for a reason nobody chose: every other face rule in these sheets happens to sit on a `<b>`,
which the reset's element list does not name. Scoped to `.qcv-desk` (0-2-0) rather than reordered.

**`qcCentre.test.tsx` caught the head's title rendering in Playfair within a minute** — brand.tsx
forces `h2 { … !important }` at runtime, injected last, so no specificity reaches it.

**A removal took out a rule serving something else, and a screenshot found it.** Rewriting the rail's
row block as one authoritative block truncated everything after it, and `.qcv-sr-only` sat at the end
— so the view's screen-reader count rendered as **visible text under the card, "69 queries out"**.
The house rule is that a removal is verified against the post-edit file; a rendered image is what
verified it.

**The foot's `⤢` would have rendered as a dot**, caught by the lock a previous pass left for exactly
that: U+2922 is in neither Special Elite nor the mono face. Same drawn path as the expand button,
bound to "FOR THE TIMELINE" in a `nowrap` span or it lands alone at the head of the second line.

---

## Decisions you have not seen

1. **A desk section filters by `tileCourt`, not by the menu's keys.** The menu's `"you"` *excludes*
   the offer the section counts and its `"closed"` *includes* a Withdrawn the section does not —
   measured, 12 rows under a section saying 13, and 14 under a section saying 13. One function counts
   a section and filters to it. The fan's `see all` carried a comment claiming it already did this;
   it does now.
2. **The desk's court names keep the app's capitalisation** ("With you"), where the reference draws
   them lower-case — the filter menu and the rail control three inches away say "With you".
3. **The right-hand foot fact is omitted where there is no future date**, rather than stating a past
   one under "next reply expected".
4. **`+N` on the desk counts AGENTS, not queries.** A disc is a person; two discs reading RV for one
   Rosalind Vale would say there are two of her.
5. **`LEDGER_MIN` keeps its value and loses its derivation.** It was the row's four-column floor; the
   v95 row's flexible tracks are `minmax(0, …)` so there is no sum to derive from. Deriving it from
   the second fold instead would stack the rail at a 1280 viewport.
6. **The column labels landed in commit 3, not commit 2** — labels naming columns that did not exist
   yet are worse than one commit's difference in placement.

---

## Gates

| | baseline (`a5770cdd`) | after |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean | clean |
| Vitest | **8,225 passed / 510 files** | **8,227 passed · 3 skipped / 511 files**, 0 failures |

The unit count moves by design: five rail cases were **retired with their subjects** in commit 4 and
replaced by two, one list case was replaced by one, and the new file is `src/lib/qcComingUp.test.ts`
with QC7's six cases. Every retirement says at the case which claim it carried and where that claim
now lives. No case was deleted because it was inconvenient.

The build is read by `grep -inE "error|\[WARNING\]"` over the whole log rather than by `tail`,
because `vite build` prints CSS diagnostics near the TOP and exits 0 anyway; `tsc` is read by its own
exit code under `set -o pipefail`, so the verdict belongs to the compiler and not to the formatter.
Nothing was flagged either way.

**The rendered locks: 12 passed (2.7m)** — the eleven, plus the case that refuses a run which wrote
fewer readings than it claims.

## The locks

Eleven, each proved red before it was believed. QC7 is a unit lock (the shared bucket is a pure
derivation and needs no browser); the other ten are measured on the rendered page in
`tests/e2e/qcV95.measure.ts`, which writes a reading per lock and refuses a run that produced fewer
than it claims.

| Lock | Asserts |
|---|---|
| **QC1** desk thirds | the three sections are equal and the three feet sit at one y — *with a wrapped line injected*, because on a fixture whose lines all fit, "the feet agree" is true of a desk with no mechanism at all |
| **QC2** desk counts | a filter that hides rows does not move the three counts, and a section's count IS the number of rows it produces |
| **QC3** court click | a section filters the list AND sets the rail's control; pressing it again clears both; the agent section moves it the other way; closed hands the rail back to Everything |
| **QC4** no truncation | no string the app chooses truncates, at four widths × flat/grouped × hovered/rest — 16 states, with the row count asserted in each |
| **QC5** folds | six columns above 1460, five at 1460 and 1440, four at 1366 and 1280 — each fold dropping a column *and its label*, with the "ago" appearing in the agency line exactly when Queried goes |
| **QC6** tray | hover *and* focus show it; nothing's box moves; and two claims a before-and-after comparison cannot make — the tray shares a centre with the line it replaces, and a row with a tray is exactly as tall as one without |
| **QC7** one vocabulary | every bucket the board can raise is answered by both surfaces from one `cardBucket` call; a query with no card has no line; only a send and a nudge count down |
| **QC8** sent treatments | one treatment per row and never two; each of the three is required to be ENTERED, with a printed tally so a fixture that drifts into one state fails loudly rather than skipping the assertion |
| **QC9** bars | past the date a full bar in solid ink; inside the window a part bar that is not ink; no date, no fill and the words |
| **QC10** header untouched | every node of the header and the tab pill — tag, classes, attributes, own text, box, and 24 computed properties — against a capture of the pre-pack build |
| **QC11** grouped | the reference's three headings and glosses (plus Closed) as a SET, each pill equal to its own row count, and the groups partitioning the list |

### What the locks measured

- **QC1** — three sections at **388 / 388 / 388**, feet at **503 / 503 / 503**. With the longest line
  the app can state injected into one section, all three feet moved together to **536 / 536 / 536**
  and the widths did not move. The wrap is asserted to have happened before the claim is read, or
  the case proves nothing.
- **QC2** — pressing *With you* took the list from **83 rows to 13** and left the desk at
  **13 · 56 · 13**. The section says 13 and shows 13; with the menu's own `"you"` key it showed 12.
- **QC3** — the rail's control read `all → you → all`, and `all` again for *Closed*, which has no
  focus to set.
- **QC4** — **16 states swept** (4 widths × flat/grouped × hovered/rest), **0** clipped app strings.

### Two things the locks caught in their own first run

**QC5's thresholds were a pixel short, because they were interpolated rather than measured at the
edge.** The slope between 1280 and 1512 is 0.935px of column per px of viewport, which puts the
reference's 1460 at 750 and its 1366 at 662. Measured at the boundaries themselves:

```
1460 → 750.5625    1461 → 751.5       1366 → 662.59375   1367 → 663.53125
```

so `max-width: 750` does not fire at 1460 — the very width the reference folds at. 751 and 663 are
the only values that fold at the reference's widths and not one pixel earlier. **QC5 asserts 1460 and
1366 themselves for exactly this reason**: an interpolated threshold is right about the slope and
wrong about the edge, and the edge is the whole claim.

**QC10 reported one difference across the entire header: `195.141px → 195.125px`.** Sixteen
thousandths of a pixel on the counts line's width — float noise between two builds of the same text
in the same face. Computed LENGTHS are now compared at 0.1px and everything else exactly; rounding a
length is measuring the claim correctly, where rounding a colour or a family would weaken it.

### Red first — and six of the eleven did not notice their first mutation

Every lock was broken on purpose before it was believed, and the run took five passes because **six
of the eleven went green on the first attempt.** That is the most useful thing in this report. A
green from a mutation is either a lock that cannot fail or a mutation that was not a break, and the
two are indistinguishable from the outside: three were the mutation's fault, two were the lock's,
and one was both.

Each mutation is one named change, applied in the measurement worktree, rebuilt, run alone, and
restored from a path-derived backup — never `git checkout`, which restores to HEAD and would have
destroyed the uncommitted measurement files.

| Lock | The mutation that reddened it | What it said |
|---|---|---|
| **QC1** | take a section out of the desk row's stretch — `align-self: start` | `a wrapped line moved the feet: 536,503,503` |
| **QC2** | count `qcVisible` instead of `qcScoped` | `the desk followed the filter: 13,56,13 → 13,0,0` |
| **QC3** | delete the `setQcEyeFocus` line from the court handler | `the rail's control did not follow the section` |
| **QC4** | widen the Coming-up typewriter from 13.5px to 15px | `the app's own strings truncate` — at 1280, flat and grouped, hovered and at rest |
| **QC5** | move the first fold's threshold out of reach | `1460 did not drop Queried` |
| **QC6** | put the tray in the flow — `position: static` | `the tray is 20.5px off the line it replaces` |
| **QC7** | hard-code a verb in `comingUp` | `Tests 1 failed │ 5 passed (6)` |
| **QC8** | the icons never light — `const sent = false` | `every icon is ghosted` |
| **QC9** | paint the overdue bar in the near tone; and, separately, fill the dateless bar | `an overdue bar is a tint of ink rather than ink`; `a dateless row draws a fill` |
| **QC10** | move the rail's title one pixel — `left: 19px` → `20px` | `the rail's header changed` |
| **QC11** | file the with-you court under *waiting* | `a court is missing from the grouping` |

#### Three mutations that were not breaks

**QC1 · a grid STRETCHES its auto tracks, so removing the `1fr` spacer does not remove the
mechanism.** Two attempts were no-ops, for opposite reasons. With all four rows `auto` and
`align-content: normal` — which behaves as `stretch` — the leftover space is shared among them and
the last row still ends at the container's bottom. With the `1fr` present, `align-content: start` has
nothing to distribute, because a flexible track absorbs the free space whatever the property says.
What the lock rests on is that **the three sections are one grid row and therefore one height**, so
the mutation that says so is `align-self: start` on a section: it leaves the stretch, takes its own
content's height, and its foot drops to 536 while the other two stay at 503.

**QC9 · the track clips, so no painted measurement can see the width clamp.** Removing
`Math.min(100, …)` leaves an overdue bar asking for 340% and still measuring 100, because
`.qcv-be-pb` is `overflow: hidden`. The clamp and the clip are two guards on one claim and only the
clip is observable from the page. The clamp stays — a fill asking for 340% escapes the moment anyone
makes that track visible — and the reading now says so at the line that takes it, so the next reader
does not mistake a measured 100% for proof the clamp is doing anything.

**QC10 · the token I reached for has one reader, and it is not in the header.** `--qcv-be-pad` is
read by exactly one rule, `.qcv-be-none` — the message an empty rail draws — so changing it from
22px to 24px could not move a header that was not looking at it. One pixel on the title's `left`
reddened the lock immediately, with every node compared.

#### Two locks that were too weak, and one that was both

**QC6 · the fault was a CONSTANT, and the lock only compared the row against itself.** Making the
tray `position: static` is the canonical break, and it reddened nothing — not the row's height, and
not even its own cell's box after that was added. Measured: in the flow the tray takes its space at
rest too, because `opacity: 0` still occupies a box, so the row was **97px in BOTH states** and every
before-and-after assertion was satisfied by a row that was 17px too tall the whole time. The cell
could not grow either: the row's cells are grid items stretched to the row's own height, so their
boxes are fixed and the content simply overflows them invisibly. The two claims are now stated
absolutely — **the tray shares a centre with the line it replaces** (as built both at 774.6; static
788.6 against 768.1, 20.5px apart) and **a row with a tray is exactly as tall as one without** (80
and 80; static 97 against 80).

**QC11 · `listGroups` drops an empty group, so losing a court looks like having three.** Filing the
with-you court under *waiting* removed its heading altogether, and the three that remained had the
right labels, the right glosses and counts that still added up to 83. The claim is the SET of courts
now, not each member that happened to survive — the fixture has rows in all four (13 · 25 · 31 · 14),
so a missing one is a fault and not a quiet fixture.

**QC8 · both, and the lock's own description was wrong.** The first mutation drew the package chip
for an individual send; it changed nothing, because **no query on this fixture has
`how === "individual"`.** The icons treatment is reached by the other path —
`how === "unrecorded"` with materials recorded against the query — so the page's three treatments
are *not* `sentRecordOf`'s three answers, which is what both the lock's comment and this file's
CLAUDE.md note claimed. (`sentRecordOf` returns `unrecorded` when there is no send snapshot at all;
`row.materialsRecorded` is a different fact, read from `materialsWanted`.) On top of that the icons
branch was asserted behind `if (seen.tally.mats > 0)` — the one assertion that would have noticed,
guarded by the condition it was meant to check. It is unconditional now, and the mutation that
reddens it operates on the rows the fixture really draws. **The `individual` answer is covered by the
unit suite and not by the page**, and the report says so rather than implying a coverage it does not
have.

### And one thing only the screenshot caught

The rail's foot ends `THE FULLER THE BAR, THE SOONER IT NEEDS YOU · ⤢ FOR THE TIMELINE`, with the
mark drawn rather than typed and held to its words by a `white-space: nowrap` span. On the page the
mark was sitting **on a line of its own, above the words**, reading as a stray bullet — the exact
fault the span exists to prevent, with the span working perfectly.

`white-space` governs where a line may BREAK; it says nothing about whether a child is a block box,
and two rules make every `svg` a block on this page. **The first fix did not work, which is the more
useful half**: a bare `.qcv-be-foot-ex { display: inline-block }` measured `display: block` with the
declaration reading correctly, because Tailwind's preflight (0-0-1) is *layered* — any unlayered rule
beats it — while the real winner is the legacy page-wide **`.f12-root svg { display: block }` at
0-1-1**, which a single class cannot outrank. `.qcv-be-foot .qcv-be-foot-ex` is 0-2-0 and wins
honestly: scoping, never `!important`. Measured after: the tail has one client rect, 94.9 × 10px, and
the foot shrank from 55px to 46px.

Nothing measured the foot, so no lock could have said; it was found by opening the screenshot. QC9
now asserts the tail is one line tall, and that claim was proved red by taking the scoped rule off.

### The green run, with its readings

Eleven locks, all green. Each writes a reading and the run refuses to pass if one wrote none.

```
QC1   sections 388 / 388 / 388   feet 503 / 503 / 503   →  wrapped: 536 / 536 / 536
QC2   83 rows → 13, desk unmoved at 13 · 56 · 13, and the section's 13 IS its 13 rows
QC3   rail focus:  all → you → all,  and all again for Closed
QC4   16 states swept (4 widths × flat/grouped × hover/rest) — 0 clipped app strings
QC5   1920, 1512: six columns, ago hidden  ·  1460, 1440: five, ago inline  ·  1366, 1280: four
QC6   tray 0 → 1 on hover AND on focus; row height and all four column boxes unchanged
QC8   83 rows — 19 package · 4 icons · 60 Add · 0 drawing two · 0 drawing none
QC9   69 bars, 31 of them over: every one 100% wide in rgb(28, 19, 15)
QC10  13 header elements compared, 0 differences
QC11  Your move 13 · Waiting on agents 25 · Gone quiet 31 · Closed 14  =  83
```

QC11's four groups reconcile with the desk exactly: *With you* 13; *With the agent* 56 = 25 + 31;
*Closed* 13 plus the one Withdrawn the desk does not count. QC8's tally is printed because a probe
that read the first row would have found a chip, reported the package treatment working, and said
nothing about the other two.
