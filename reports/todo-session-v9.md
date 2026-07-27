# To-do — the session, v9 (the manuscript page · the journey · the quiet exit)

Run against HEAD `364bab0` (v7, deployed to dev). **This is the definitive session spec**:
where anything here conflicted with the v7 pack or any earlier session pack, this pack won.
Refs (fenced + committed at `42dabff`): `todo-fix29.html` → `design-refs/session-v9-journey.html`
(the master, six frames) · `todo-fix27.html` → `session-v9-page.html` (**composition A only** —
B/C/D rejected) · `todo-fix28.html` → `session-v9-header.html` (**V2**, no kicker) ·
`todo-fix30.html` → `session-v9-exit.html` (**option 3**, the quiet line — 1/2/4 rejected).

## Phase 0 — recon: what was live, and the four faults

**Live at v7**: Begin → the gather (board furniture exits, the sheet dissolves, every item
flies onto the engine's first task, the pile morphs to a centred rest) → the curtains + dim →
the templated card at the rest line → the carriage between tasks → the close in place →
Back to your desk reversing it all. The engine (`boardCards` order captured at launch, no
requeue in FocusFlow, handled driven by the VANISH from `liveKeys`, writes nothing) was sound
and is untouched.

The four faults, each traced to a cause rather than a symptom:

| Fault | Cause found | Fixed in |
|---|---|---|
| **END SESSION did nothing** | `.tdb-ss` (`position:fixed; inset:0; z-index:48`) lies OVER the hero, where the link was rendered — the overlay caught every pointer before it reached the link. Not a wiring bug. | P1 (overlay pointer-transparent; the skip catcher becomes its own layer) + P4 (the control moves into the overlay) |
| **The Begin/review pair stayed visible** | v7 P1 removed `.tdb-heropair` from `EXIT_FADE` (the hero was to own it) but it was never added to the hero's own `.insession` fade — so nothing faded it. | P1 |
| **The curtains covered the app bar** | `.tdb-fscurt { top: 0 }` inside a viewport-fixed overlay. | P1 (top = the measured bar bottom) |
| **"Reed, Reed … RAMAN"** | `standFor`'s `outstanding` collects one name per live query with no dedupe and no cap; the template rendered whatever it was handed. | P2 (fixed **at the template level**) |

Close/exit as found: `backToDesk` ran the ~700ms reverse; browser back jump-cut straight to
`onClose`. Both now take the same road.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| refs (fenced, rejected variants recorded) | `42dabff` | 1423 |
| P1 — the frame | `afe90e6` | 1423 |
| P2 — the manuscript page + the name-list fix | `82d09bc` | 1435 |
| P3 — the carriage + the close against the page | `3e8be1e` | 1438 |
| P4 — the quiet exit, and it works | `f315bb9` | 1442 |
| P5 — the sweep + this report | `<this commit>` | 1445 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging throughout.

## What shipped

- **P1 — the frame.** The app bar is **exempt**: `measure()` takes the board wrap's top as the
  bar's bottom edge and the curtains + dim begin there (no hardcoded height — it survives any
  bar change). The overlay is **pointer-transparent**, its interactive children opting back
  in, and the overture's skip is its own layer that exists only while the opening plays. The
  hero title crossfades to **"In focus"**; the Begin/review pair fades with the opening and
  unmounts once composed; the sub-slot's session occupant is the **progress treatment** — a
  4px ink bar on `#ddd2c2`, 340px, with a Playfair fraction ("2 / 29", lining figures), no
  kicker and no other text. **The spacing law is real space**: `sessionRegion()` puts a
  minimum **48px** clear band below the progress row and runs the region to the stage foot;
  the page centres inside it and re-derives on resize.
- **P2 — the manuscript page.** The card grammar is gone. A 600px white page, radius 8,
  38/54/30 padding under a deep shadow: a mono running head in accent red carrying the tag and
  the lane **as text**; a Playfair 27 title; the manuscript · agent in italics; and the context
  set as **prose under a hairline rule** (the boxed card and its eyebrow retired). Actions
  split — Action now (ink) and ✓ Mark handled left, **＋ Today's list** and **🕐 Snooze or
  dismiss** as quiet underlined text links right — over a **running footer**: `‹ PREVIOUS ·
  REDO` left, `SKIP · NEXT ›` right. REDO reverses the carriage; a page that was stamped
  returns **with** its stamp and offers **UNDO HANDLED**, which calls the very inverse the undo
  toast already carries (remembered by card key in `doneToast` — one inverse in the app, no
  parallel store). The floating NEXT UP line is gone, derivation included.
- **P2 — the template fix.** `nameList()` dedupes on the rendered short form
  case-insensitively, keeps first-seen order, caps at **three** with `+{n} more`; the
  sentence's number is `distinctNames()`, so number and names always agree. The malformed
  sentence is now impossible at the template level whatever the caller collected.
- **P3 — the carriage + the close.** Same motion, bigger object: seat, leaving clone and both
  slide directions carry the 600px page, timings unchanged. Because a page's height varies
  with its prose, the centring re-derives on every task change. The close resolves in that
  same centre — both headlines, the ledger (Handled · Skipped · Session length, with Review
  what you did expanding the list), the two exits.
- **P4 — the quiet exit.** Mono 11px at `.18em` in `#5d4d40`, a 1px `#c9bcae` rule 3px below,
  centred at the stage foot 28px above the bottom, a 44px invisible hit area, hover taking
  text and rule to ink. No icon, no pill, no plate. It renders **in the overlay** — not in the
  hero the overlay lies over — which is why it is finally clickable. Ending early leaves live
  tasks, so the close reads "Good session." **Browser back takes the same road**: popstate now
  runs the full ~700ms reverse. The board needs no sync step on return — the session holds no
  counts; queue and live set are handed in from the board's own derivation, so 29 → 24 is
  simply true.
- **P5 — the sweep.** "Clearing the desk", `tdb-fscard*`, `tdb-fslane`, `tdb-ssctx`,
  `tdb-ssnext`, `tdb-fsses`/`tdb-fsend`, `nextUp`, "NEXT UP", "END SESSION ✕" — all extinct in
  source, styles and copy (grep-locked). The component and `sessionContext` headers now
  describe v9. The tour's targets were checked: nothing it points at moved (Begin still sits
  in the hero pair at rest), so no retarget was needed.

## In-browser script (dev)

1. **The bar**: begin a session — the app bar stays full-width and uncovered; the curtains
   close beneath it, edge to edge.
2. **The hero**: "What's on your desk?" crossfades to **In focus**; the pair and the search
   go; the progress bar shows 1 / n with a sliver filled. Nothing overlaps; there is a clear
   band of at least 48px before the page.
3. **The page**: read it — running head in red for an offer, the title, the italic
   manuscript · agent, the context as prose. Check an offer with two live queries to the same
   agent: the sentence names them **once**, and caps at three with "+n more".
4. **The links**: hover ＋ Today's list and 🕐 Snooze or dismiss — underline to ink, no pills.
5. **The footer**: `SKIP · NEXT ›` runs the carriage; `‹ PREVIOUS · REDO` runs it backwards.
   Mark one handled, then REDO it: the page returns **stamped** with **UNDO HANDLED** —
   press it and the board's own undo runs (the same one the toast offers).
6. **The exit**: the quiet line at the foot — hover it (text + rule go ink), click it: it
   **works**, and the close reads "Good session." Clear a whole queue instead and it reads
   "Desk cleared."
7. **Back to your desk**: curtains withdraw, dim lifts, the title crossfades back, the board
   reassembles — and the counts are already right. Press **browser back** mid-session: the
   same road, not a jump cut.
8. **Resize** mid-session (and try a short laptop viewport): the page stays centred, the band
   holds, the curtains narrow.
9. **Reduced motion**: the session starts composed; every swap is instant.

## Deviations (flagged)

- **The dim starts below the hero**, not at the bar, so the title strip and the progress row
  stay crisp; the curtains do start at the bar as specified. (Carried from v7 — the ref keeps
  the hero above the dim by z-order, which we cannot do while the hero is board DOM and the
  session is an overlay.)
- **The pair fades, then unmounts** (rather than unmounting at once) so the opening reads as a
  departure rather than a pop.
- **The ledger's second row reads "Skipped — back on your desk"**, not the ref's "Snoozed or
  skipped": the session can only honestly count its own skips — a snooze taken through the
  journey leaves via the vanish and counts as handled.
- **UNDO HANDLED reuses the toast's inverse via a by-key ref** in ToDoPage. This is the "no
  parallel undo store" clause read as *no second inverse*: there is exactly one inverse per
  action in the app, and the page hands the session a callback to it.
- **The carriage clips at the curtain's inner edge** (the wrap insets by the curtain width) —
  unchanged from v7, and still right for a straight carriage.
- jsdom mounts nothing: the frame, the page and the carriage are source/rule-text locks over
  **real** unit-tested maths (`sessionRegion`, `progressPct`, `nameList`, `distinctNames`,
  `gatherTransform`, `staggerFor`, `restTop`). The browser script confirms the pixels.

## Close

**The session is finished. The To-do redesign is finished. Remaining queue, entire: dev
deploy → prod sequencing pass → Correction UI.**
