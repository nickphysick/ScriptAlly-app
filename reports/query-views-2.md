# Query Centre — views amendments (pass 4)

Run of 6 Sep 2026 · ref `design-refs/query-centre-v14-list-standing-copy.html` (fe0bc2de — verified, committed and enrolled, `2975c609`). Commits `2975c609 → fb6927de` + this report's. Gate: tsc 0 · production build clean (whole log) · full Vitest **7418 passed, 3 skipped, 0 failed**.

---

## False premises, first

1. **The board's shingle could not simply be "deleted" — it had to go with the thing it hid.** The overlap existed so each card's fact line was covered at rest; §1 removes the fact line, so an overlap left in place would have begun eating the **leaf** instead. Deleting both is one change, not two, and the density the shingle bought is bought again by the card being 60px rather than 100px overlapped by 40.
2. **The standing copy moved a number out from under its label, and the label was somewhere else entirely.** The drawer's stat tray was **regexing `facts.caption`** (`/^(\d+)\s+(\w+)/`) for its "waiting so far" figure. v14's caption opens with days-to-**expected**, so the tray would have gone on showing a true number under a false noun — the fault this repo has recorded in three other shapes. `facts.elapsed` is the figure the tray actually meant; it reads that now, and the prose is free to move.
3. **"The divider is a hairline pipe, not a middot" is not a copy change.** A rule cannot be a character inside a string, so the caption gained `captionParts` (additive — `caption` stays the joined string every other reader takes) and the renderer draws the hairline between clauses.
4. **The verb predicate did not exist as one thing to import.** The brief says "same predicate — import it, don't restate it". It was split: the primary's *label* in `Queries.tsx`, the Nudge and Mark-closed *gates* inside `QueryPanel`. Two files deciding what a row offers is exactly how two surfaces come to disagree about a closed query. `queryVerbs` in `lib/queryRowFacts.ts` is that decision now, and both surfaces import it.
5. **The scrim's fault was the desk's fault again.** `inset: 0` was already there — what was missing is that a `position: fixed` element inside a **transformed** ancestor is contained by it, and this page has transforms above the drawer. Portalling to the body is the fix, and it is the same one the desk needed in pass 3.
6. **`Reopen` is drawn and disabled rather than omitted.** The action grid holds a fixed slot per row; a closed row offering nothing would leave a hole where every other row has its primary. A greyed verb says reopening will exist; an empty slot says this row has no primary, which is false.

## §1 · Board card — identity only *(commit `fb6927de`)*

5px state strip · monogram · name · agency · 34px leaf, in an 8px stack. No hairline, no fact line, no materials, no shingle, no hover lift — the hover **shadow** stays, because a card you can click should say so. The fact line's rules went with its markup rather than being left inert.

## §2 · The list row

Columns: Status · Agent · Sent · What went · **Since then** · Where it stands · Actions. **Court is retired** — the Status column's dot and word already said it, and the standing sentence says it a third time in prose.

- **Status** is plain text with its `StatusDot`; the row's colour is a **4px inset bar** in the state's deep tone. One device per fact: a tinted pill beside the bar is the same sentence at twice the volume.
- **Sent** is the *original* send, built from `dateSent` alone and kept in the Queried **sand** whatever the row's current state — it marks where the journey started, and the card's leaf legitimately drifts to the last event. It shares the card's own month table rather than a second one.
- **Since then** draws one 22px mark per recorded activity after the send, from **the same feed the drawer's timeline renders** — a summary that disagreed with the thing it summarises is worse than no summary. Rows with nothing after the send read `nothing yet`.
- **Where it stands** carries the 44px round `IlloSlot` (same family as the drawer header's) and the new standing sentence, its clauses separated by the hairline rule.
- **Actions** is a fixed four-slot grid; an absent verb is **hidden in its slot**, never removed, so the ⋯ shares one x-coordinate down the page. A row action opens the **drawer first and the desk second** — the desk anchors beside the drawer and its ghost rung is drawn on the drawer's rail, so firing a verb without the drawer would put a card beside nothing and a preview nowhere.

## §3 · Drawer — verbs under the agent

The top bar is navigation only (`‹ › · N OF M · ✕`). The verb row closes the stage block, on the block's own ground, with the `Sent / via` caption right-aligned beside it. The header `IlloSlot` stays top-right of the identity row.

## §4 · Scrim and motion

Scrim portalled to the body, `inset: 0`, `rgba(58,28,20,.14)`, 240ms. Drawer **360ms opening / 220ms closing** — expressed as CSS rather than JS, because a transition reads its timing from the state being transitioned **to**: the closing timing lives on the base rule and the opening timing on `[data-on="true"]`, and nothing has to know which way the drawer is going. Block and body rise 260ms at a 120ms delay; stepping crossfades the body 160ms while the block's colour walks across in 200ms. Reduced motion zeroes the durations and **keeps the scrim's 120ms fade** — a scrim that appears instantly over the whole app is a flash rather than a stillness. No `var()` in any keyframe.

## The harness — 3/3 at 1440 and 2560 (`reports/query-views-2.json`, shots in `reports/query-views-2-shots/`)

| claim | 1440 | 2560 |
|---|---|---|
| board: fact lines inside a card | **0** | 0 |
| board: identity card height | **62.7** (≤ 64) | 62.7 |
| board: banded card | 93.8 — the band's own cost, reported not asserted | 93.8 |
| board: stack gap | **8.0** | 8.0 |
| list: distinct ⋯ x-positions over 12 rows | **1** (1369) | 1 (2024) |
| list: distinct primary widths | **1** (132) | 1 |
| list: Sent month-strip fills | **only** `rgb(247,239,227)` — sand on every row, closed included | same |
| list: accent bar equals the row's `--state-accent` | **true**, all 12 | true |
| list: status pill fill | `rgba(0,0,0,0)` — plain text | same |
| list: Since-then counts | `0,2,0,0,0,0,2,0,11,0,0,0` — and the empty rows read `nothing yet` | same |
| drawer: verbs in the top bar | **0** | 0 |
| drawer: verbs in the verb row | 3 | 3 |
| drawer: verb-row ground vs block ground | `rgb(247,239,227)` = `rgb(247,239,227)` | same |
| scrim: `elementFromPoint(4, 300)` over the rail | **`button.qpn-scrim`**, parent is `body` | same |
| scrim: colour · fade | `rgba(58,28,20,0.14)` · 240ms | same |
| drawer: opening · closing | **0.36s** · **0.22s** | same |
| row action: desk up with the drawer behind it | true, desk on `body` | true |

⚠️ **Two readings needed correcting rather than accepting.** The card-height assertion took the max over *all* cards and caught a **banded** one at 93.8 — which the same brief requires, so the measurement is split and the band's cost is reported. And the first duration read returned **`0s`** for a drawer whose rule says 360ms: `openRoute` suppresses transitions by design, so the probe was measuring the harness's own stylesheet. `liftMotionSuppression` is lifted for that one case — the case that is *about* timing — while every geometric reading above keeps the suppression it needs.

## Red-then-green

The brief names two; all three landed, and the first needed a second attempt worth recording.

- **§3 · no actions in the bar** — a `qpn-act` reinserted into the top bar. ⚠️ **The first attempt passed while changing nothing**: my mutation hit the *retired* bar in the dead `GRID_IS_THE_PAGE === false` branch (there are two `qpn-spacer` in that file). Re-aimed at the live bar by searching forward from `.qpn-bar`, it reddens. The same first-match trap bit the lock itself — two `qpn-inner`, the form mode's first, giving a negative slice and an empty string; the assertion that the slice found something is what caught it.
- **§4 · the scrim leaves the body** — the portal removed; red.
- **§2 · an absent verb collapses its slot** — the `visibility` guard removed; red.

## NOT RUN, with cause

- **A rendered check of the reduced-motion durations.** The harness reads computed durations at the default preference; Playwright can emulate `prefers-reduced-motion`, but the claim that survives is the *rule text* (`transition-duration: 0s` for the drawer, `120ms` for the scrim), which is locked in the unit suite. Adding an emulated pass would prove the same two numbers a second way.
