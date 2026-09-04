# Calendar v63 — the two-pane frame

## Phase 0 — **PASS.** `design-refs/timeline-v63.html`, title `ScriptAlly — Calendar v63 · design of
record`, sha256 `6414dc934fde5416dbd6e7340738a68ddcb5d731baea79167a008be050697317` (the pack's
`6414dc934fde…`). All 27 body attributes the pack names are present and match. 20 refs guarded.

## Phase 0.5 — worktree at `/tmp/sa-v63`, preview on 4197; deployed from a clean worktree at HEAD.

⚠️ **The shared tree held nine of another session's files at the start of this run** — including
`QueryCard.tsx`, `queryCard.css` and `queryCardFacts.ts`, which are *exactly* the files section D
tells me to read tokens from. The worktree builds from committed HEAD, so it sees their last commit
rather than their WIP, and the locks read tokens **by name** — which is what "by identity, never a
copy" buys: when their edit lands, the calendar moves with it.

---

## A · The frame — **BUILT AND MEASURED.**

| Reading | |
|---|---|
| container | `flex-direction: row` — two panes |
| sidebar | inside the container, **232px** = the token |
| chrome identity | axis `rgb(250,249,247)` **=** date bar `rgb(250,249,247)` |
| one ground | rows `rgb(242,241,238)` **=** container `rgb(242,241,238)`; lanes transparent |
| group bars | 40px, full width (866), chrome tone, hairlines top and bottom |
| Urgent bar | `rgb(248,236,230)` blush, eyebrow `rgb(140,79,74)` rose |
| numbers gutter | present in the DOM, `display: none` |

**The chrome is its own token set**, deliberately separate from v62's scheme: `--tl-cs-*` says what
the *board* is made of, `--tl-ch-*` says what the *furniture* is. Keeping them apart is what lets
the chrome read as one continuous surface while the board's palette changes underneath it — and it
is what makes "sidebar = date bar = group bar" a claim a lock can state at all.

**Group bars carry their purpose** at the right end — *Needs you now · Coming up · Waiting on a
reply · No reply for a long while · Your to-dos · For the record*. A group NAME is a label a reader
has to decode; the bar is full width, so there is room for the sentence beside it.

## B · The sidebar pane — **BUILT AND MEASURED.**

Four hairline-separated blocks: search · window · views · At a glance.

- **The window pill's centre is the live range** — `22 Jul – 19 Oct`, moving on every step. Three
  buttons labelled `‹ TODAY ›` say what they do and never say where you are.
- **Back to today appears only when it has something to undo.** Measured: absent at today, present
  after one step, and gone again after it is used. A permanent one on a board already showing today
  is a control that does nothing, which teaches a reader to ignore it for the moment it matters.
- **The views list is a census** — the counts sum to All (23), and All equals the rows on the board.
- **At a glance is derived from the same sections the views count**, so the pane cannot hold two
  descriptions of one board: "need you now" is asserted equal to the Urgent view's own figure.

⚠️ **The search field filled the pane as one enormous empty box** until it was given `flex: 0 0
auto`. v61 fixed this once for the old sidebar and the rule did not follow the pane inside the
container — the controls were built for a row and are still in a column.

---

## ⚠️ C · The toolbar — **NOT BUILT, and the ref contradicts the pack.**

This is the finding of the run, and it needs a ruling rather than a guess.

1. **The ref hides its toolbar with an unscoped `!important`.** Line 1280: `.toolbar { display:
   none !important }`, inside the "the left axis IS the sidebar" block and behind no attribute. The
   pack's own reading rule — *"`!important` beats position"* — makes that final: under the selected
   design there is no toolbar, because the sidebar replaced it.
2. **And the ref's toolbar markup is not the one section C describes.** It holds the *v62* control
   set — pager, view pills, search, `DISPLAY ▾`, count, Add. There are **no** Group / Sort / Status
   dropdowns, no Reverse checkbox, no Reset link, no status checklist, no Clear all.

So section C is **net-new work specified in prose**, not a reading of the ref — and it partly
duplicates the sidebar the same pack asks for (both carry search and a row count; Group/Sort would
join the existing Display popover, which the ref keeps). Building it from the prose alone would put
a second filter surface beside the views list, which is the two-vocabularies fault this board has
already been through twice — the tab strip in v61 and the tinted dividers in v62.

**Recommended**: fold Group / Sort / Status into the sidebar's existing Display control rather than
adding a toolbar above the date bar. That is one home for view options, and it is what the ref's own
layout does. **Not taken unilaterally** — it changes the pack's shape, and it is your call.

## D · The bar in Query Centre's language — **NOT BUILT.**
## E · Actions — **NOT BUILT.**
## F · Tasks as bars — **NOT BUILT.**
## G · Behaviours (collapse, drag, sticky) — **NOT BUILT.**

Sections D–G are each the size of an earlier whole pack: the band with QC's tokens and the nudge
rule, three density levels, open ends, the right dissolve, the pulse dot, ghost stages, event
markers, hover-revealed actions at true dates, and tasks re-rendered as spans. They are reported
unbuilt rather than half-landed — this run put the frame and the pane in, measured both, and stopped
where the next section would have been rushed.

**The sweep and edge tags remain open**, as they have since v60d.

---

## Gates

| | Baseline (`b865a41c`) | After |
|---|---|---|
| `tsc` | 0 | **0** |
| `vite build` | exit 0, 0 diagnostics | **exit 0, 0 diagnostics** |
| `vitest` | — | **2 failed in 2 files** — `datePickerHub` and `QueryCard`, 444 files, 7,491 tests |
| Calendar measurement | 13 | **18** — `calOne61` 9 · `calScheme62` 4 · `calFrame63` 5 |

⚠️ **Both reds are the Query Centre session's, established by reading rather than by moving
anything**: `QueryCard.test.tsx` and `QueryCard.tsx` are both dirty in the shared tree and neither is
mine; `datePickerHub` has been theirs since v60. Nothing of theirs was stashed or reverted, and the
commit stages my paths only.

### Mutations proved red

| | Mutation | Failure |
|---|---|---|
| P | Urgent loses its blush; the date bar leaves the chrome | *the date bar is not the sidebar's tone* |
| Q | Back to today is always offered | *Back to today is offered on a board already showing today* |
