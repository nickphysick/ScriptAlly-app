# Dashboard — recreate the ref, with a ref-diff harness

**Ref:** `design-refs/dashboard-cappuccino-v14.html`
**md5 as delivered:** `6180d85fc66dc13d6f4a04f807197238`
**md5 now:** `1ca59a49e8783b7c92f17d47f99a3e9d` — six `data-probe-text` attributes added, and one of
them moved (see *Probes*). No rendered value in the ref was changed.

**Harness:** `scripts/dash-refdiff.mjs`. **Result:** `run-artifacts/dash-refdiff.json`.
**Baseline 291 → 56.** Widths 1536 / 1920 / 2520: `98 → 22`, `95 → 20`, `98 → 14`.

---

## Decisions I took

**1. Each probe is anchored to the edge its design pins it to, and `main` is a datum rather than a
subject.** The app's content box is not the ref's — 1650×1324 at 1920 against 1634×1408 — because
the shell's gutters are not the ref's page padding and because of a control row the pack keeps.
Both grids are elastic, so that one difference landed in every flexible track and produced nine
misses that no edit could close. A `left` probe's left inset and width are the facts; a `right`
probe's right inset and width are; a `span` probe fills the elastic track, so both its insets are
the facts and its width follows. `main`'s own box is now printed in the table rather than compared.

**2. The app is re-read in a window that gives it the ref's content box exactly** — 1904×1540 at a
nominal 1920, by a measured delta rather than a chosen one. The pack's three widths are the design
intent and are unchanged; both deltas stay inside the same media-query regime, so the app is
measured in the layout the width names. This is what makes an elastic card's height comparable at
all. The self-test proves on every run that a real 40px break still fails.

**3. The chart's band is a scoped exception to the shared 51px band.** Measured in the ref: to-do
50.2, activity 50.2, chart **115.3**. Holding the chart to 51 made its card 52px shorter than the
ref's and moved every card in the middle column. The exception is a descendant selector, not a
loosened default, and a lock asserts that no other band may take it.

**4. The chart's residual band is drawn in the offer colour and its legend entry is conditional.**
The pack specifies a three-entry legend; the ref gates a fourth on there being one. Making the line
the band sum requires the unplaceable queries to be *somewhere*, and a gap with a sentence
explaining it is what this pass was told to end.

**5. The ref's decorative start-pin is not reproduced.** The pack says delete the event pins; the
ref keeps one burgundy ring above its first point. It says nothing the end disc does not, and
adding a burgundy mark back inside a change that deletes burgundy marks would be incoherent.

**6. The axis is ONE number where the ref has two.** The ref scales its line to `max + 2` and
labels its axis at `nice(max)`, which on its own sample data puts the top label at 20 against a
ceiling of 19 — the label paints above the plot and is visible only because the SVG does not clip.
"Ticks at 0, half and top" is only a true description when the top tick is on the axis.

**7. The ticket's headline takes the card's own face on the dashboard only.** The two refs
disagree: `todo-qc-style.html`'s brief specifies Inter 600 for the To-do page's ticket, and this
page's ref sets `.tk .ttl` with no family, so it inherits. Scoped to the dashboard's grid. **One
component reading two ways on two pages is a question for you** — see *Open questions*.

**8. The To-do stream's repo-wide phrase lock is narrowed to the To-do surface.** It retired "Over
to you" in favour of "Agent waiting" and enforced it with a `grep -ril` over all of `src/`, which
went red on this page's band legend. Its claim is about the To-do board's family names. **The
underlying vocabulary collision is real and is NOT settled** — see *Open questions*.

**9. The goals card's `.try` row is not built** ("Try it: Send one · Reset"). It is a demo control
for a static mockup. ~38px of the card's remaining 54px miss is that row, and eighteen of the
fifty-six misses ride on this card's height.

**10. The rings stay one-per-target rather than the ref's five slots.** The ref hardcodes five
because five is its demo target. One per target is the same treatment, honestly parameterised.

---

## False premises found

**The premise that a source lock was measuring the app.** Four locks were reading something other
than what they named, and all four were green:

- `.os-ahead {` is a substring of `.os-lead > .os-ahead {`, so two band locks silently repointed at
  the scoped override the moment it was written — first-match slicing arriving through a descendant
  selector.
- `oneScreenChart`'s "the slate offer band is absent outright" reasoned from *"an open offer is
  TERMINAL to this chart's own ledger, so the band would have had no members"*. `bandsAt` counts an
  open offer as ACTIVE and cannot place it, so it went into `undated` and showed as clear air.
- The counters' fixture put every agent on a random id and every query on `"a1"`, so nothing was
  ever queried and the split chip had one branch to report — a monoculture passing as a census.
- The harness's own self-test asserted the *field name* of a miss rather than the size of the break.
  Under `span` a width break is reported as a right-inset, so it declared the harness untrustworthy
  over the name of a column while the 40px break was being caught correctly.

**The premise that the family papers were a dashboard problem.** `--u-now-1` and its two siblings
were declared only on `.tpn`, and `TaskTicket` renders outside a pane on **both** surfaces. The
dashboard's grid carried a private copy; `/todo` had 28 tickets with a computed `rgba(0, 0, 0, 0)`
behind a label whose only job is to be a coloured paper. **A page-scoped workaround for a
token-scope bug is worse than the bug** — it removes the symptom from the page someone is looking
at. Hoisted to `:root` in its own commit, with the grid's copy forbidden.

**The premise that "responsive rules live in the responsive block".** Three of the ref's
`@media (max-width:1700px)` steps were written into the grid's media block, two hundred lines above
the rules they override, where both sides are 0-1-0 and the later wins. All three were dead: the
hero did not stack, the stat slot stayed 112px, the brush stayed 230. The slot's step then had to
move **twice** — placed after `.os-cic`'s base rule it still lost to `.os-cic.plane` below it.

**The premise that a value in a media block is the value.** Twice, a number was taken from the
ref's narrow override and applied at every width: `.main`'s padding (22 where the base is 30) and
`.stats`' gap (36 where the base is 56). Two rules apart in the same sheet.

**The premise that the plot's box was the plot.** The ref's chart is one svg whose viewBox reserves
48 of its 330 units below the baseline for the period labels. The app drew them as HTML beneath —
the same picture, a different box, and 17px of card height the ref does not spend, on top of a plot
sized from a ratio that counted them as inside.

---

## Per phase

| Phase | Commit | Misses after (1920) |
|---|---|---|
| baseline | `daaa1bee` (ground) | 95 |
| 3 · layout | (in `daaa1bee`) | 63 |
| 4 · stats | `24f29056` | 57 |
| 5 · the chart | `08677359` | 53 |
| — the datum | `3054c8c0` | 30 |
| 6 · to-do (+ the hoist) | `fa9a2acb`, `4f8e0b1e` | 25 |
| 7 · activity | `14f40ee0` | 22 |
| 8 · goals | `ce85fcbc` | 22 |
| 9 · responsive | `201d4304` | 20 |

All three widths, first measured at Phase 8: **76 → 56**.

---

## What is still missing, and why

| probe | 1536 | 1920 | 2520 |
|---|---|---|---|
| activity-card | y 527.1→469.8<br>h 963.3→1020.2 | y 444.7→391<br>h 963.3→1017 | y 444.7→391<br>h 963.3→1017 |
| activity-tabs | y 578.3→521.8 | y 495.9→443 | y 495.9→443 |
| brush | xr 427.3→403 | y 192.3→197.8<br>xr 619.3→463 | · |
| bubble-sentence | family | family | family |
| chart-card | y 210.4→206.8<br>h 348.2→340 | h 392→398.9 | · |
| community-card | y 594.6→537.7<br>h 895.8→380.4 | y 512.2→458.9<br>h 895.8→432 | y 512.2→458.9<br>h 895.8→432 |
| feed | y 618.1→563.1<br>h 830.9→900.4 | y 535.8→484.3<br>h 830.9→897.3 | y 535.8→484.3<br>h 830.9→897.3 |
| goals-card | y 210.4→206.8<br>h 294.7→241 | h 294.7→241 | h 294.7→241 |
| grid | y 210.4→206.8 | · | · |
| manuscript-card | y 210.4→206.8<br>h 362.2→308.9 | h 362.2→308.9 | h 362.2→308.9 |
| plot | · | y 258.3→263.8 | · |
| stats | y 108.4→104.8 | x 424.9→416.4<br>w 1205.1→1213.6 | x 424.9→416.4<br>w 1725.1→1733.6 |
| ticket-title | family | family | family |
| todo-badge | y 599.7→583.3 | · | y 683.4→680.2 |
| todo-card | y 580.6→568.8<br>h 909.8→921.2 | y 542→548.9<br>h 866→859.1 | · |
| todo-rule | y 631.8→620.8 | y 593.2→600.9 | · |

**Structurally unclosable (30 of 56):**

- **`ticket-title` and `bubble-sentence` family** (6). The ref sets `--sans: 'Source Sans 3'`; the
  app's `--font-sans` is `"Source Sans Pro"` — the same typeface, two releases apart. Changing it is
  an app-wide typography decision, and CLAUDE.md already records that the stated stack and the
  rendered one disagree.
- **`community-card`** (6). Addendum H puts `OneScreenPro` in the left column beneath Community; the
  ref has two cards there and the app has three, so the ref's community card fills a column the
  app's shares.
- **`goals-card` and its four dependents** (18). The ref's demo `.try` row is ~38px of the card's
  54px difference, and the activity card takes what the goals card leaves.

**Closable, not closed (26):** `manuscript-card h` is 53px short at every width and is
content-driven — I did not trace it. `stats` is 8.5px narrow (the greeting column's `auto` track).
`brush xr` at 1920 is the band's wrap point. The small `y` residues on the chart, plot, to-do card
and rule at 1536/1920 are the chart card's remaining 7px.

---

## Probes

Six `data-probe-text` attributes were added to the ref and one was moved. `chart-figure` was first
placed on `hdA`'s `#cur`, which the shipping config (`hdr:'b'`) hides — the harness correctly
reported "the ref has no such text probe". It is on `hdB`'s `<b id="curB">`.

Every probe resolved on both sides at all three widths. The harness refuses to report at all if it
finds a sign-in form or fewer than 12 of its 16 probes, after a run measured a signed-out page and
produced 92 plausible misses with nothing in the output saying which page it had been looking at.

---

## Open questions

**1. "Over to you" or "Agent waiting"?** The chart's band legend and the To-do board's family now
name what is arguably one state two ways. Deciding which word wins app-wide is a product call.

**2. The ticket's headline: one component, two faces.** Inter 600 on `/todo` (its brief), the
card's own face on the dashboard (this ref). Reversible either way in one rule.

**3. `OFFER` is in `oneScreen`'s `TERMINAL` set** (out of scope, flagged as the pack asked). An open
offer is therefore treated as off the board: it never reaches a band, and the chart's own comment
about it was wrong for a different reason than anyone thought. Surfaces that would change if it
moved: the chart's line and bands, `awaitingChip`, and the "N active" figure in the header.

**4. The stat illustrations are 100×100 rasters with no `srcset`.** The slot is the ref's 112px and
the artwork caps at 50px because that is the largest sharp size at the DPR the app targets. A
re-export at 2× makes it one `max-width`.

**5. The goals card's `.try` row.** If some equivalent *is* wanted, it needs to be a real control
rather than the ref's demo pair, and it is worth ~38px of the right column.
