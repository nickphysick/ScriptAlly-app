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
