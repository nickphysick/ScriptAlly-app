# Hero and Birds-eye tidy-up (2 Nov 2026)

## What changed
- **Desktop hero:** the Query / Track / Discover strip is removed (component, CSS, `HERO_PILLARS`, HERO-2). The card's padding is back to 64 64 56 72. The rest of the hero is as it was. HERO-1 (the shadow) passes.
- **Phone Birds-eye heading:** the heading and its navy rule are centred.
- **Phone Birds-eye window:**
  - The hawk's head stands on the today line, with its base still on the navy header's foot.
  - The line, the hawk and the TODAY pill are all placed from one expression: the names column plus the lane width × `BE_DATES.today`.
  - The TODAY pill is now drawn at the window's root, so it sits in front of the hawk. The window's own copy is hidden on phones; inside the window it would sit below him, because the window is its own stacking context.
  - The names-column header has no divider. The "26" tick is hidden behind the hawk, as allowed.
- **Month labels on phones are "Oct" / "Nov"** (your choice). Right-aligned with 8px padding, the full "November" (52px) didn't fit beside the hawk: there were 47px at 390 and 42px at 375. Desktop keeps the full names.

## Locks
- **BE-P1** (375 / 390 / 411 / 430): the hawk's centre is within ±2px of the today line, the TODAY pill is wholly on screen and in front, and "Nov" doesn't touch the hawk's box.
  - Red on 2d1c861f: the hawk was 193 to 229px off the line.
  - Red under each break: BEP1 (hawk back), BEP1b (pill back inside the window), BEP1c (label back under the hawk).
  - ⚠️ The hawk is `pointer-events: none`, so `elementFromPoint` looked straight through him and found the pill whatever the stacking. The "in front" check was passing on a broken page, which BEP1b showed. The check now switches his pointer events on for that one reading.
- **BE-P2:** each line of the heading and the rule centred to ±2px. Red on 2d1c861f (−8.7px) and under BEP2.
- **LW-13:** desktop now asserts no pillars strip. Red under LW13.
- **Unit copy lock:** `HERO_PILLARS` is gone.
- **Token sweep:** placing the hawk with an inline-only CSS variable failed the "every token read is declared" check, so the hawk and pill take their position inline, as the line already did.

## Pictures
- `phone-390x844-first.png`, `phone-390x844-birdseye.png`
- `phone-411x915-first.png`, `phone-411x915-birdseye.png`
- `desktop-1440x900-first.png`

They were taken locally, so the places counter is blank but keeps its space.
