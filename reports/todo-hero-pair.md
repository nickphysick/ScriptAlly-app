# To-do — the hero-pair pass (buttons · chip · filter format · composer)

Run against HEAD `1701931` (the detail pass, deployed to dev). All three refs fresh in
Downloads (23 Jul 15:18), read in full, committed with P1: `todo-fix13.html` →
`design-refs/todo-hero-pair.html` (variant B normative; variant A rejected) ·
`todo-fix14.html` → `design-refs/todo-filter-formats.html` (option 3 normative; 1/2/4/5/6
rejected) · `todo-fix11.html` → `design-refs/todo-composer.html` (§3 + §4 normative; §1
superseded by the hero-pair ref, §2 by the filter reformat).

## Phase 0 — the dialog inventory

| Site | Kind | Replacement |
|---|---|---|
| ToDoPage:688 `window.prompt("New note")` | prompt | the inline composer |
| ToDoPage:631 duplicate-send guard | confirm | ConfirmAsk ("Send again" / "Cancel") |
| FocusFlow:205 staged-discard exit guard | confirm | ConfirmAsk ("Discard them" / "Keep working") |
| FocusFlow:342 duplicate-send guard (staged path) | confirm | ConfirmAsk |
| FocusFlow:853 duplicate-send guard (quick path) | confirm | ConfirmAsk |

`window.alert`: none found. All four confirms are true blocking choices → the styled dialog;
zero native dialogs remain in the To-do scope (grep-locked).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the pair beneath the search | `0fb6481` | 1339 |
| P2 — the white rewind chip | `e88b52f` | 1342 |
| P3 — the filter list, format 3 | `4f1cdc0` | 1342 |
| P4 — bold bar · composer · dialog sweep | `c79b2b9` | 1347 |
| P5 — sweep + tour retarget | `49d53f3` | 1349 |
| report | `<this commit>` | 1349 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — Begin and the review chip left the toolbelt for a **centred pair beneath the
  search**, breathing 24px clear; both size to content (Begin the 44px ink primary, now with
  the ref's SVG play). The chip renders **only in its afterlife state** (opened/dismissed —
  the banner's complement); Begin re-centres alone otherwise; the chip's appearance fades in
  200ms (reduced-motion instant). The toolbelt stack container is gone — the left column and
  the <1428 drawer begin directly with the filter card; the pair is hero furniture (never
  part of the rail's fold) and wraps to a stacked-centred column when width runs out.
- **P2** — the chip goes **white** (ink text and border, Begin's exact height and
  typography); the unread dot is dead — the **↺ rewind glyph** (TypeGlyph's grammar as the
  page-scoped RewindGlyph, 12px) sits at the play's exact seat (the same 8px gap token both
  sides). **Unread by weight**: unopened → full ink; opened → glyph and label soften to
  muted `#6b5a4e` via currentColor. Same flags, same weekly reset.
- **P3** — the filter list wears **format 3's soft rectangles**: white rows, 1px hairline,
  **10px radius**, 34px, 6 apart — family dot · **sentence-case** label · count right.
  "Show all" leads (explicitly not capitals); labels are "Offers", "Agent waiting",
  "Materials", "Wish lists", "Stale", "Snoozed", "Notes", "Today's list". Counts 10px muted
  with tabular-nums. **One selected grammar**: ink border + inset ring + 700, no tick — the
  narrowed rows wear the same clothes (the burgundy pill fill retired). The zero-dim,
  struck search counts and the FILTER query chip carry over unchanged.
- **P4** — the bar line goes **Playfair 700**. The **inline composer** replaces the browser
  prompt: the ledger's "＋ Add a note" and the cards' add affordance transform in place —
  white notes-family card, autofocused Caveat textarea growing to content, the mono
  "⌘⏎ SAVE · ESC CANCEL" hint, quiet Cancel + emphasised Save note; ⌘⏎/Ctrl⏎ saves, Esc
  cancels, an outside click cancels only when empty; save rides the existing `addUserTask`
  action. The **dialog sweep** cleared the whole Phase-0 inventory via the new
  promise-based **ConfirmAsk** (quiet cancel · emphasised confirm · Esc/scrim cancel ·
  z 90, mounted in both the board and the flow).
- **P5** — the toolbelt-era clothes verified extinct; the tour's first stop retargets the
  pair's Begin and the filter stop's copy names "Show all" as the reset; orphan scan clean.

## In-browser checklist (dev)

1. The centred pair breathing 24px under the search; **dismiss the review banner** and watch
   the chip fade in beside Begin; while the banner is live, Begin re-centres alone.
2. The white chip's **rewind at the play's exact seat**; open the review — glyph and label
   soften to muted; a new week brings the full-ink face back.
3. **"Show all"** leading the soft-rectangle list — sentence case throughout, ink ring on
   the selected row, no tick; typing still strikes counts and dims zero rows in place.
4. The **bold** bar line, still re-deriving under search with steady figures.
5. **Add a note in place**: the dashed row (ledger) or the ghost ＋ (cards) becomes the
   Caveat composer, focused; ⌘⏎ saves it into a real row/post-it; Esc walks away; a click
   outside keeps a live draft but folds an empty one. **No browser dialog anywhere** — the
   duplicate-send and discard-staged guards now arrive as the styled card.
6. The tour: stop 1 spotlights the pair's Begin; stop 3 says "Show all".

## Deviations

- **The chip's conditionality is a refinement of "as now"**: previously the chip stood
  ALONGSIDE the live banner; the pack's own transition line ("banner collapses → chip
  appears") defines the complement, so the chip now waits for the afterlife. Flagged.
- **The body sans stands in for the ref's Inter** on the filter rows (the app's standing
  body-font convention — the same call the landing made).
- **The narrowed (nar) rows adopt the ink-ring selected grammar** — the pack restyles "the
  row's clothes" once; two active grammars (ink ring + burgundy fill) would have clashed.
- **`.tdb-heropair`, not "pairrow"** — "tdb-pair" sits on the Deck-v2 banned-identifier
  list.
- **The rewind is not literally "via TypeGlyph"** (locked, material-types only) — the
  page-scoped RewindGlyph follows its exact grammar, as ClockGlyph did in the detail pass.
- **Begin's play became an SVG glyph** (the ref draws it; the text ▶ retired) — this is what
  makes the chip's seat parity exact.
- **The ledger's add-row still yields to real rows once notes exist** (the affordance
  "returns beneath" reads as the empty state's return; with notes present the heading ＋
  remains the add path, opening the same composer above the rows).
- jsdom limits as ever: the pair's centring, the fade, the ring, the Caveat feel and the
  dialog stacking are source/rule-text locks — the browser walk confirms the pixels.

## Close

**The redesign is complete; dev deploy → prod sequencing pass, then Correction UI.**
