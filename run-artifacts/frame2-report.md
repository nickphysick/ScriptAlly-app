# To-do — frame parity, counts, pane presence, copy

**28/28 assertions green**, from a baseline of **16 RED / 6 green**
(`run-artifacts/frame2-RED-before.txt` → `run-artifacts/frame2.txt`).

## ⚠️ Premises that turned out false

**1 · The page-title premise is backwards.** The brief: *"`/queries` states its page with a small
mono label; `/todo` spends roughly 150px on a Playfair title in its own white card."* Measured, both
use the same `wpg-plate`/`wsh` chrome and **the Query Centre's is taller**:

| | title | plate |
|---|---|---|
| `/queries` | Playfair **38px**/600 | **146px** |
| `/todo` | Playfair **40px**/600 | **102px** |

Removing the card would have *added* 44px. The card stays. The real difference was 2px:
`.wsh--solo` gives a subtitle-less page two extra points, and this page opts out page-scoped.

**2 · Phase 6 needed no work at all.** The brief: *"The pane renders around 1.4× the contract's
sizes — deed ~40 against 27, labels ~13 against 9.5, timeline dates ~11 against 8.5."* Measured on a
journey that *has* a timeline: deed **27**, label **9.5**, segment **12**, timeline name **12**,
timeline date **8.5**. Exact. The 30px reading is a **note's** deed, which the contract sets at 30
for its Caveat variant — also correct. No commit; the assertions stand as regression guards.

**3 · The counts were 15 / 10 / 11 / 14, not 19 / 17 / 20 / 17.** The disagreement was real; the
figures had moved.

**4 · Phase 3 reverses a decision made two rounds ago, for the second time.** The contract round's
D6 said the mockup was right — a note has a real added-date and a real age — and `panePresence` was
changed to give notes tiles and a figure *on that instruction*. Phase 3 says a note renders none.
The newest wins and is implemented; recorded so it is not flipped a third time by accident. What a
note actually rendered was two tiles **both labelled "Added"** plus a "Sent previously / None sent"
tile about materials nobody asked for, which is what settled it.

## Phase 1 — insets · `7db8b490`

Four differences, each matched to a measured Query Centre value:

| | before | after |
|---|---|---|
| `.wpg-scroll` padding | 44/35/0/35 | **0/35/0/35** |
| `.tdb-col.tpl` padding-bottom | 48 | **0** |
| `.tdw-split` padding | 22 all round | **20px 0 32px** (`.f12-body`'s) |
| `.tpl-cols` margin-top | 6 | **0** |
| card left | 305 | **283** (`/queries` 282) |
| card bottom off viewport | 50 | **12** (`/queries` 11) |
| title | 40px | **38px** |

⚠️ **The side padding was the one that mattered.** `.f12-body` has *no* horizontal padding — the
scroll row's 35px gutter is the inset — so the split's 22px was a second one.
⚠️ **And the top gap needed both variants.** `.tpl-wpg.wpg--working` alone changed nothing: the
header condenses on engagement, so at rest the page carries no `.wpg--working` and the token
resolves to `--content-top-gap-rest`, which *is* the 44. `.qc-wpg` states both for the same reason.
⚠️ **The first fix broke a lock that was right** — a `padding-top: 0` beside the token is "a second
number, the squash reborn". The token alone.

## Phase 2 — one count · `aac53c7a`

⚠️ **Snoozed was inside one total and outside the other.** The meter counts three families; the
footer counted every group. `applyView` drops the snoozed group unless the view admits it.
⚠️ **The pane walked a different derivation.** `dockAllCards()` read `board` where the rail reads
`boardCols` — "TASK n OF 14" beside a list of 11. The queue is `railGroups().flatMap(g => g.cards)`.

**Measured: meter = footer = pane = rows = 14.** Filtering a type moves all three to 12 together.

**The documented divergence (§2's escape clause).** The rail badge is `lib/todoCount`'s
`actionable` = urgent + housekeeping **gaps** + yours-**tasks** — it excludes notes and counts gaps
rather than cards — and **the dashboard's attention chip reads the same law**. Equalising it means
changing a cross-page derivation from inside a To-do frame round. The assertion **bounds** the
difference instead of ignoring it: the badge may exceed the view count and may not drift away
unexplained. Measured Δ=1. **What it would take:** redefine `actionable` to count cards rather than
gaps and include notes, then re-verify the dashboard's chip and `OverToYou` against
`urgentReconciliation.test.ts`.

## Phase 3 — pane presence · `e999177d`

A note renders no tiles and no timeline; the figure stays (the band's own slot, stated once). No
label may repeat inside a tile row — asserted generally, first-wins. Snooze and Dismiss appear once
each, in the command bar; the band carries no verbs.

## Phase 4 — pane copy · `cdbf1009`

One table, `PANE_COPY`, keyed by the bucket the row is keyed by. A `null` heading renders no
element (Nudge has nothing to fill in). ⚠️ **"Complete" was still rendering in the WILL RECORD
line**, which printed `rowPrimaryLabel` — the pane's table is the pane's language throughout.
⚠️ **And a label stood over an empty row**: a note has no materials, so "What goes" asked a question
the page declined to answer.

**Decide is not in the brief's table** and is reported rather than invented: an offer is answered in
its own journey, so it keeps the deed as its primary rather than inheriting another bucket's words.

## Phase 5 — type toggles · `5c521d84`

`todoPrefs` carries the map with **no rules change** (rules:64 validates only `is map`; the field is
already in the allowlist). **Adopted, not replaced** — the five toggles are a new group inside the
existing sheet, and `staleMonths` keeps its name and position.

⚠️ **Generation is upstream of the view.** A type switched off is removed in `generatedGroups`
*before* `applyView` — so it is absent from the list, meter, footer, pane queue **and the funnel's
own counts** at once. Filtering inside `applyView` would have left a disabled type countable in the
menu that hides it.
⚠️ **`decide` is forced true in the reader**, not just disabled in the UI — a control a stale
document can bypass is not a rule.

## Phase 6 — type scale

**No commit. Nothing to fix** (premise 2 above). Five assertions kept as regression guards.

## Probe faults — four this run, all of the documented family

- **P4.4's regex could not fail.** Written through a heredoc as `\\b`, it compiled to a literal
  backslash-b rather than a word boundary — reporting "none" while P4.1, three lines up, showed the
  heading was "Complete". *Two assertions contradicting each other in one run is the tell.*
- **P6 measured the timeline on a note**, which has none by design — two sizes came back `-1`, a
  missing element reported as a wrong size.
- **P4.3 counted a `<textarea>` as empty** because a form control has no `textContent` — a label
  with a real field under it, reported as bare.
- **P5 hunted for a gear that is not on the page.** The sheet opens on a window event from the shell
  sidebar; a probe looking for a button reported the sheet missing when it was shut.

Plus one state fault: **the baseline had to be made, not assumed** — the view persists, so "with no
filters" inherits whatever the last run left. P2.4 (a restore assertion) is what caught it.

## Gates

tsc 0 for the To-do surfaces · production build 0 · vitest **332 files, 5631 passed, 2 skipped** ·
frame2 **28/28**.

Screenshots: `reports/frame2/{todo,queries}-{1440,1920}.png` and `reports/frame2/journey-*.png`
(Decide · Send · Close · Fix · Note — the five this account can reach; Nudge and the bulk Fill-in
have no card on it today).

## Out of scope, untouched

Nudge reminders in any form (no `nudgeReminderWhen` exists). `Query.materialsWanted` vs
`Activity.materials`. Pro. The Query Centre's burgundy pill. Duplicate React key warnings.
