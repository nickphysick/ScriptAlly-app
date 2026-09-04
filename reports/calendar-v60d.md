# Calendar v60d — final pack

## Phase 0 — **PASS.** `design-refs/timeline-v60.html`, title `ScriptAlly — Calendar v60 · design of
record`, sha256 `abf9bf08621295744034b9debcb00f3f778d2350825cd864fdd56c20a4a8c872`.

## Phase 0.5 — deploy from a clean worktree. **Done, and it earned its rule immediately.**

The shared working tree held **nine** dirty files belonging to another session
(`PageHeader.tsx`, `pageHeader.css`, `workspacePageGrid.css`, `index.css`, `AllManuscripts.tsx`,
`AgentList.tsx`, `AgentToolbar.tsx`, `ComparableTitlesPage.tsx`, `mastheadFormat.test.tsx`) — every
one of which a `build:dev` from that tree would have bundled into a dev deploy.

A worktree checked out at `f2f58988` reported **0 dirty files**, built `index-CMUex0ZG.js`, and
`firebase deploy` from it served exactly that hash. `firebase.dev.json`'s `"public": "dist"` is
relative, so the worktree's own bundle is what ships — nothing else needed changing.

**v60c reached dev without waiting on anyone**, which is the whole point of the rule.

---

## ⚠️ THE FINDING OF THE RUN: the board was 91px out of alignment, and every lock was green

Phase 1's probe lock asserts the cap's date against **the rail's own tiles**. On its first run it
said: *the cap reads "24 Jul" over the 31 JUL tile* — a full week. Measuring both lanes:

| | left | width |
|---|---|---|
| the rail's lane | **287** | **1090** |
| every row's lane | **378** | **999** |

**91px apart, and 91px different in width.** v60 §1 gave the rows a number column and a badge
gutter and never gave the rail its matching spacer, so **every bar, flag, trail and terminal mark
on the board sat 91px right of the date the rail named** — more than a week — from the moment the
sections landed, through three packs, deployed twice.

### And nothing caught it, because every other lock measures within one system

Tiles against tiles. Cards against the today line — which is itself placed from a row's lane.
Trails against today. Sections against sections. Every one was internally consistent, and all of
them were consistent with **the same wrong origin**. *A lock that never crosses a seam cannot see
the seam.* The probe's cap is the first thing on this board that had to agree with the rail, and it
disagreed on the first attempt.

**The fix is one expression read by both.** `--tl-lane-inset` is the number column plus the badge
overhang plus the gutter; `.tl-rail` pads left by it and `.tl-glanes` insets by it. They can no
longer be given different values. Measured after: rail **378/999**, every row **378/999**.

A dedicated lock now asserts it as a **rendered** claim — the rail's lane box and every row's lane
box are the same box within 1.5px — rather than as "both read one token", because reading one token
is what the two sheets already appeared to do.

---

## Phase 1 — the probe. **Built.**

The crosshair already followed the cursor and computed the right dates; three things were wrong
against the ref, and all three were the same family of fault:

1. **The cap floated 18px above the rail.** `top: 0` resolves against the containing block's
   *padding* box, and `.tl-wrap` pads its top for the flags — the identical fault the today line
   carried until v60b. Both now read `--tl-flag-lift`, so they cannot drift apart.
2. **The cap was a near-black pill** (`--tl-ink` filled, cream text) — the only dark fill on a cream
   board, against the colour law, and reading as a tooltip rather than as a date on a ruler. It is
   the ref's white pill with a warm hairline now: the rail's own tile idiom.
3. **Both sat below the rail** (z 6 and 7 against the rail's 50), so the cap was invisible exactly
   where it is meant to be read. The line is 39 (under the rail, so it cannot cut through the
   tiles) and the cap is 52 (over it) — the today line and its cap, one step apart, borrowed rather
   than reinvented.

Locked by sampling three tiles including one across a month boundary, and asserting the cap's text
against **the tile's own day and month**.

---

## Phase 2 — navigation. **Name link built; edge tag NOT built, and the reason is a measurement.**

### The name opens the relationship, and the card keeps its own job

The pack offers "the name inside a card, or the card". The card's click already does something the
calendar cannot otherwise do: where the writer owes materials it opens the **work flow**, one press
from the board. Handing the whole card to navigation would delete that — a working affordance
traded for a second route to a page the row already reaches from its detail panel. So the name is
the link and the card is unchanged. **Deviation stated rather than taken silently.**

It is a `<button>`, not a span with a handler: a name that navigates must be reachable by Tab and
announceable as an action. Locked by **driving it** — the URL must change to `/queries?q=…` — not by
reading the handler.

⚠️ **And the lock caught a real fault the moment it was written.** `.tl-fnmlink` carried
`font: inherit`, which is a **shorthand that resets every font longhand** — so it wiped `.tl-fnm`'s
own 14.5px/600 and the name rendered at the page's inherited **16px/400**. Exactly the class of
fault this repo already records against the `background` shorthand, in a different property, and it
was on screen. `font-family: inherit` is what a button actually needs.

### The edge tag is unbuilt because its population is zero

The pack's own lock requires `population > 0`. Measured: at rest, **23 rows, 21 with cards** — the
two without are the task rows. Stepping the window back **ten weeks**: 21 rows, **21 with cards,
none bare**. Not one relationship row on this account lacks an in-window card, and stepping could
not produce one.

That is not surprising in hindsight — `todoTimeline` builds a row's grouping facts from *every*
query the relationship holds rather than from what is in view (its own comment: *"a partial
requested six weeks ago still needs the writer today, at a seven-day window that cannot draw it"*),
and a live relationship's bar runs to today, so it is in the window whenever today is.

**A half-built version was written and then removed.** Shipping an unexercisable feature — one no
lock could redden and no reader could reach — is worse than reporting it. What it needs first is a
row that can actually lose its card, which is a question about the row model rather than the view.

---

## Phase 3 — the sweep

**Run in full; nothing retired.** The sweep put all 33 pre-v60 `cal*` measurement files against the
corrected board. It finished in 7.0 minutes of wall clock: **37 cases failed, 17 passed, 20 never
ran** (Playwright stopped them once the failure ceiling was hit).

**29 of the 33 files** carry at least one failure:

`calAccept55` · `calCaps58` · `calCard` · `calCard54` · `calCentre` · `calContrast` · `calCopy55` ·
`calDeferred` · `calFade55` · `calFaults56` · `calFrame56` · `calGhost` · `calGround54` ·
`calInset55` · `calOpen54` · `calOrder58` · `calRowHead` · `calRowWords55` · `calSemantics58` ·
`calShot39` · `calShot54` · `calSurface58` · `calTask54` · `calText` · `calTint54` · `calTodoCheck` ·
`calV40` · `calViews54` · `calWindow58`

⚠️ **And 17 cases inside those same files PASSED**, which is precisely why none of them was
deleted. This repo's own rule about a case you are removing is that *the
assertions it was standing in front of are unproved, not passing* — and the run proves that
concretely here: 17 live claims are spread through the same files as the 37 dead ones, and 20 more
never ran at all, so their status is **unknown rather than stale**. Deleting by filename would take
all three groups together. Retiring them is a small,
self-contained task with a clear method (read each file's first failing claim, decide stale or
regression, delete or retarget) and it should not be done at the tail of a long session on a
partial run.

**What is certain**: the 33 files describe boards with a field, a sticky rail, masked fades, one flat
list and no sections, and 29 of them say so out loud. **What is unknown**: which of the 17 passing
and 20 unrun cases are worth keeping. Reading them one at a time — stale claim, or a regression this
pack introduced — is the only thing left in v60, and it wants its own short session rather than the
tail of this one.

⚠️ **`calTodoCheck` is in the failing list and it is the one to read first.** Its claim is that
*"/todo is untouched by the calendar pass"* — a claim about a different page. If that is a real
regression rather than a stale selector, it is the only fault in this sweep that reaches beyond the
calendar.

---

## Phases carried and unchanged

`calSurface60` (8) · `calFidelity60` (5) · `calFlags60` (5) · `calTrailStages60` (2) ·
`calProbe60` (5, new) — **25 green**, all re-run in the worktree after the alignment fix.

## Gates

| | Baseline (`f2f58988`) | After |
|---|---|---|
| `tsc` | 0 | **0** |
| `vite build` | exit 0, 0 diagnostics | **exit 0, 0 diagnostics** |
| `vitest` | 1 failed — `datePickerHub` | **1 failed — `datePickerHub`**, 439 files passed |
| Calendar measurement | 23 | **25** |

`datePickerHub` is another session's and is left alone. The 13 shell reds reported in v60c are
**gone** — that session's `PageHeader` work has settled.

### Mutations proved red

| | Mutation | Failure |
|---|---|---|
| K | the rail loses its spacer (the fault exactly as shipped) | *a row's lane starts 91px from the rail's* · *the cap reads "24 Jul" over the 31 JUL tile* |

⚠️ **And one fault was caught by a lock at the moment it was written, before any mutation**:
`.tl-fnmlink`'s `font: inherit` reset `.tl-fnm`'s size and weight, rendering every card's name at
16px/400 instead of 14.5/600. On screen, and only a lock asserting *the link looks exactly like the
name* — a claim about the composed result rather than about the declaration — could see it.
