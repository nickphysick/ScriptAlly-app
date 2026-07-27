# To-do — the frame pass (bar · buttons · rail sections)

Run against HEAD `c22fca8` (the document pass, deployed to dev). The one ref fresh in
Downloads (`todo-fix8.html`, 23 Jul 11:45), read in full, committed with P1 as
`design-refs/todo-frame-v5.html`; its §1 burgundy Begin, §2 system-1+2 recommendation and
centred Playfair "To do" are fenced as superseded by the pack's button law and title drop.
Phase 0 confirmed the doc-pass state live with no drift (document bar, ledger v2, undo
toasts, reactive rail).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the lighter bar | `42b7a36` | 1327 |
| P2 — the button law, rewritten | `783c7cb` | 1328 |
| P3 — the sectioned rail + the afterlife | `63a0c5d` | 1333 |
| P4 — sweep + tour retarget | `2ac3d69` | 1335 |
| report | `<this commit>` | 1335 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — the document bar lightens: `#f4f3f1 → #f0eeeb`, base rule `#e5e3de`, meta ink
  `#8a857d`; the view segment restyles for the paler ground (`#faf9f8` track, `#dbd9d4`
  border). No centred title — the bar keeps meta left / toggle right only, both views.
- **P2** — **the press system is retired** (no offset shadows, no translate steps, anywhere;
  its reduced-motion branch went with it). Two primitives replace it: **`.tdb-btnp`** — the
  tailored ink solid (`#2a1a13` fill, `#1d100c` border, cream `#f3e7da`, 600, .02em, 42px /
  34px `.sm`; hover deepens to full ink) — reserved for the three singular page-level
  actions: **Begin focused session · Work the list · Open it ›**; and **`.tdb-btnh`** — the
  hairline secondary in two tones: emphasised (`.em`: ink border, ink text, 700) for
  per-row/per-card lead actions, quiet (hairline, muted `#6b5a4e`, 600) for the rest. The
  ledger's "Action now" and the cards' ✓ DONE / ⚡ FIX take the emphasised hairline (the verb
  row adopts the tones at its own compact geometry — the ink-solid verb face is dead);
  ＋ Today's list / ☾ Snooze or dismiss / ＋ Add more / ＋ Add / Help me pick go quiet. The
  page's ink census is locked at exactly three. The view segment's active chip = white +
  1px ink ring, shadowless; the inert grammar re-keys to the new primitives; the Pro slate
  CTA stays exempt.
- **P3** — the rail restructures: **Begin · grey REVIEW band · the review row · grey FILTER
  band (carrying the reactive query chip) · SHOW ALL + family pills + divider + Today's
  list · the foot**. The header bands wear the bar's greys (1px `#e5e3de` top and bottom,
  mono 7px) — one grey system across rail and sheet; the FILTER band drops its top rule
  when the review row's own line precedes it. The review row: small cup, "Last week in
  review", the `#c96a55` unread dot while the week is unopened, a mono `WK {n}` stamp;
  clicking it opens the review. **The afterlife**: the centre-stack banner renders until
  opened or dismissed — either collapses it for the week, persisted in the sa. prefs
  (`sa.todoReviewSeen` / `sa.todoReviewDismissed`, week-keyed; recon found no existing
  flags — the completion sentinel is the one stored "opened" record and composes into
  seen, so a completed week stays collapsed on any device). The rail row is the sole
  re-entry; opening clears its dot (a dismissal keeps it — the week is still unread); a new
  week's key mismatch resets both. Task settings: a bare 20px stroke cog, same wiring.
- **P4** — orphan scan clean; the tour's review stop retargeted from the now-transient
  banner to the rail's standing REVIEW row, copy gaining "or find it under REVIEW in the
  rail"; no tour step referenced Task settings (nothing to retarget).

## In-browser checklist (dev)

1. The paler bar, no title — meta left, toggle right; the active view chip white with a
   plain ink ring.
2. **Begin in tailored ink** (42px, cream text, hover deepening); the Today pair — quiet
   ＋ Add more beside ink Work the list — still perfectly level at 34px.
3. The ledger: **"Action now" reading as each row's lead without any black in the rows**
   (ink border + ink text on white); ＋ Today's list and ☾ Snooze or dismiss quiet beside
   it; the cards' hover verbs likewise two-tone, no ink slab.
4. The rail: Begin, then the grey REVIEW band, the review row (cup · label · dot · WK
   stamp), the grey FILTER band, the pills. Typing a search still grows the chip in the
   FILTER band with the struck counts.
5. Dismiss the review banner (✕): it vanishes for the week — find it under REVIEW with its
   dot still glowing; open it from the row: the dot clears and the banner stays collapsed.
   Reload — all of it holds.
6. The bare cog at the rail's foot, no circle, same Task-settings sheet.
7. The tour: stop 4 now spotlights the rail's REVIEW row.

## Deviations

- **The review section renders only when a review week exists** (`reviewWin` — the same
  guard the banner always had): a brand-new desk shows no REVIEW band over an empty row.
- **The dot survives a dismissal** (clears only on opening) — the pack ties the dot to
  "hasn't been opened", and a dismissed-but-unread week is still unread; recorded as the
  intended reading.
- **The View-again flip died**: an opened week never re-shows the banner, so the banner's
  opened state is unreachable — its button is always the ink "Open it ›". The completion
  sentinel lives on inside the seen derivation.
- **`dismissReviewWeek`** (not "dismissReviewBanner") — the obvious name sat on a
  banned-identifier list from the Deck-v2 sweep; renamed rather than amending the ban.
- **The "existing dismiss animation"** the pack references does not exist — the banner has
  always unmounted plainly (the polish pack's ✕ was a bare unmount); it unmounts plainly
  still, reported rather than invented.
- **The ✕ persisting per-week supersedes** the polish pack's fenced "session-only"
  resolution — this pack's explicit instruction wins.
- **The card verbs adopt the law's tones at their own compact geometry** (the 42/34 heights
  govern the button primitives; resizing the in-card verb row to 34px pills was read as out
  of scope for "the cards' ✓ DONE / ⚡ FIX take the emphasised hairline").
- jsdom limits as ever: the greys, the ink census by eye, the dot glow and the collapse
  feel are source/rule-text locks — the browser walk confirms the pixels.

## Close

**Nothing queues before dev deploy and the prod sequencing pass.**
