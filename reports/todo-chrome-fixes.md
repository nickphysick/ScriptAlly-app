# To-do — Chrome Fixes (pop-up click-away · done pill · journey exit)

Pack: `todo-chrome-fixes`, against HEAD `fc26b92`. Spec-derived (no design ref — the shipped
surfaces are the visual reference). Gates per commit; explicit-path staging.

## STEP 0 — findings (tree clean at `fc26b92`)

1. **Open/close:** `todayOpen`; the FAB opens, the ✕ closes — NOTHING else closed it (no
   click-away, no Esc).
2. **The overflowing control = a CLASS COLLISION, and it was never a toggle.** `.tdb-cd` is both
   the pop-up's done-count pill AND the tour coach's progress-dot class; the coach's unscoped
   rule (`width: 6px; height: 6px; border-radius: 50%`) bled into the header pill — "3 done"
   spilling out of a 6px tour dot. No show-done switch existed; the band's visibility was purely
   `doneN > 0`. Phase 2 therefore kills the collision AND builds the badge-as-toggle, defaulting
   pressed/shown (today's always-shown behaviour preserved as the default — Nick's call).
3. **Add-to-list exemption set:** exactly ONE board control commits to Today's list — the card
   pill `.tdb-pill.today-p` → `toggleToday`. Quick-✓ paths complete (never commit); every other
   list control lives inside the pop-up, unreachable by click-away.
4. **FocusFlow chrome:** `.tdb-ffchrome` floats at the viewport edges outside the sheet (exit
   pill top-left, dots + count + staged chip top-right) over the bare scrim.
5. Tree clean.

**Decisions (Nick, 17 Jul):** badge defaults pressed/shown · the collision resolves by renaming
the TOUR-COACH side · all in-step "Leave it"/"Not now" skips KEPT (skip → advance to review,
staged work survives; exit → discard behind confirm — semantically distinct, single-item journeys
included) · confirm skip/exit stay verbally + visually distinct.

## PHASE 1 — pop-up click-away collapse

- **ONE close path:** `closeToday()` — the ✕, click-away and Esc all land there (lock-tested:
  exactly one `setTodayOpen(false)` call site).
- **Click-away:** a document-level `pointerdown` listener attached only while expanded, cleaned
  up on collapse/unmount. Exempt: clicks inside `.tdb-pop`, and the add-to-list pills
  (`.tdb-pill.today-p` — watching the item land is the point).
- **Esc** collapses too, guarded on no-FocusFlow-open (the journey's Esc wins).
- **Deviation, reported:** pointerdown is ALSO inert while a journey is open (the pack guarded
  only Esc) — otherwise "Work the list" would open a journey whose first click silently collapsed
  the list beneath the scrim, and closing the journey would return you to a vanished pop-up.
- Locks in NEW `todoChrome.test.ts` (source layer per the logic-only policy). Tests 1123 → 1126.

## PHASE 2 — done pill

- **The collision resolved by renaming the TOUR side** (Nick's call — no reason to flip): the
  coach's progress dots are now `.tdb-coachdot` (TodoTour.tsx + todo.css); the unscoped 6px rule
  can no longer squash anything, and a lock asserts NO `.tdb-cd` rule survives anywhere in the
  stylesheet.
- **The badge:** the old static span became a real `<button>` in the committed pill's exact
  grammar (10.5px mono pill) in the done-sage family — white ground, `--hk-spine` hairline,
  `--hk-ink` text; pressed (`aria-pressed="true"`) = `--hk-sage` fill = band shown. It IS the
  show/hide control for the done band (`doneN > 0 && showDone`), defaulting pressed/shown —
  today's always-shown behaviour preserved as the default state. Renders only when done > 0
  (matching the band's own rule); hover previews the sage.
- **The header row:** one flex row, `flex-wrap: nowrap`, both pills `white-space: nowrap; flex:
  none` — no wrap or clipping at two-digit counts.
- The popupStack lock updated to the new gate (`doneN > 0 && showDone`). Tests 1126 → **1129**.

## PHASE 3 — journey exit chrome into the sheet

- **The viewport-floating `.tdb-ffchrome` row is retired entirely** — under the scrim nothing
  renders outside the sheet (lock-tested; the scrim itself is the only sibling).
- **Exit:** the labelled pill **"✕ Back to my desk"** at the sheet's top-right, on every step of
  every mode (the bar is part of the sheet frame — journeys, sweeps, review, the saved screen).
  Same handler, same dismiss guard: immediate when clean, confirm when staged.
- **Dots + "N OF M":** into the sheet bar's left, opposite the exit — and now **multi-item modes
  only** (`items.length > 1`; they previously rendered always, "1 OF 1" included — the pack's
  "as now" assumed multi-only, so single journeys simply lost the clutter; reported as the
  delta). Kicker-then-heading hierarchy inside the body untouched.
- **The staged chip** ("N staged — nothing saved yet") moved to the sheet FOOTER, rendered by
  `sheet()` before the step's own buttons — visible wherever staging is live, left of Back.
- **Skips kept, all of them (Nick's call):** send/nudge "Leave it" · stale "Leave it" · offer
  celebration "Not now — leave it" · dq "Not now"/"Skip" · group "Not now"/"Skip the rest" ·
  notify "Skip — I'll send them now". Every one advances (skip → the next item → review; staged
  work SURVIVES) where exit discards behind the confirm — semantically distinct in single-item
  journeys too. **Copy distinctness confirmed:** skips read "Leave it / Not now / Skip …" as
  ghost buttons in the footer; exit reads "✕ Back to my desk" as the sheet-corner pill — no
  string or position overlaps.
- CSS: the in-sheet `.tdb-ffbar`, the exit restyled as sheet furniture (white pill, hairline),
  the count back to muted ink (it had been light-on-dark for the floating row), the ≤760 media
  block's now-moot chrome overrides removed.
- Tests 1129 → **1134** (+5 P3 locks).

## FINALISE

| Phase | SHA | Commit |
|---|---|---|
| 1 | `cb08099` | fix(todo): pop-up click-away collapse |
| 2 | `ef6ae87` | fix(todo): done pill — collision killed, badge is the band toggle |
| 3 | (this commit) | fix(todo): journey exit chrome into the sheet |

- **Files:** `ToDoPage.tsx` · `FocusFlow.tsx` · `TodoTour.tsx` (one class rename) · `todo.css` ·
  NEW `todoChrome.test.ts` (+ popupStack lock updated). Tests 1123 → **1134** across the pack.
- **What the toggle turned out to be:** not a toggle — a static count pill squashed by the
  `.tdb-cd` class collision with the tour coach's unscoped 6px dot rule. Collision resolved by
  renaming the TOUR side (`.tdb-coachdot`); the badge is now genuinely the band's toggle.
- **The add-to-list exemption set:** one selector — `.tdb-pill.today-p` (the card commit pill);
  quick-✓ paths complete rather than commit, and every other list control lives inside the
  pop-up.
- **Skips kept:** all (list above) — none duplicated the exit semantically.
- **Deviations:** click-away's pointerdown is also inert while a journey is open (the pack
  guarded only Esc) — otherwise Work-the-list would silently collapse the list beneath the scrim
  · dots/count went multi-item-only (the pack's "as now" premise corrected).
- **In-browser checklist (Nick, on dev):** click-away with and without an add-click (add a card
  to the list with the pop open — it stays; click the desk — it collapses; Esc collapses; open a
  journey from Work-the-list, click around inside it, close — the list is still open) ·
  two-digit done counts in the header, no wrap · the done badge toggling the sage band,
  pressed-by-default · the exit pill across a single journey (no dots), a Focused session (dots +
  count), and the review walk · staged-confirm on exit · the staged chip sitting in the footer.
