# Hero v3 — phone lockup panel, desktop pillars strip (2 Nov 2026)

## What changed
- **Phone:** the trio row and sub-line are replaced by one lockup panel, 6px under the hawk: a 1.5px blush outline, radius 16, no fill, with "Query · Track · Discover" (typewriter, 20px, blush dots) over "QueryHawk" (Source Serif 4, 700, 30px). A screen reader hears "Query, Track, Discover. QueryHawk"; the drawn lines are hidden from it. The phone no longer draws the sub-line. "See what it does" is 12px under the panel.
- **Desktop:** the trio row is gone from the copy column. The sub-line sits 16px under the strap, its pre-trio spacing. A strip of three equal columns (Query / Track in rust / Discover, each with its line) runs along the card's foot, flush with its edges and corners. The card lost its bottom padding. At ≤1080px the strip stacks into rows with hairlines between them.
- **Copy:** `HERO_PILLARS` added to landingCopy.ts; `HERO_TRIO` stays for the phone. `HeroTrio` and every trio rule are deleted.

## Measured
- **HERO-2 at 1440×900:** the strip's left, right and bottom edges equal the card's (142 / 1298 / 739.0). The columns are 385.3, 385.3 and 385.3px.
- **The phone drawer ends 10px higher than before** (the panel is shorter than the trio plus sub-line). The Birds-eye heading ends at 831 on a 390×844 screen, 13px to spare. The 26px gap under the drawer is unchanged.
- **HERO-1 (the card's shadow) still passes.**

## Locks (all red on ece880f6 first, then under named breaks)
- **LW-7:** at 375/390/411/430, the drawer is its content plus padding (±2), no gap over 30px, the strap is one line, the hawk is centred, and the panel is exactly two lines with "QueryHawk" under the trio. No sub-line on the phone. At 390 and 411 the heading is in the first screen.
  - Breaks LW7, LW7b, LW7c, LW7d, LW7e, LW7f and LW7g each turn it red.
  - ⚠️ The panel's first line cannot wrap as built: its words and dots are spans with no spaces between them, so there's nowhere to break. LW7f adds the spaces before narrowing the panel, which is the only way to make that check fail.
- **LW-13:** on phones, the panel's reading, its shown lines, the two dots and the typewriter face, and no sub-line. On desktop, the sub-line word for word with its bold brand, no trio, the three pillars word for word, and a rust Track. Nothing uppercase on either layout. Red under `LW13`.
- **HERO-2:** red under `HERO2` (strip inset) and `HERO2b` (unequal columns).
- **LW-F:** the face sweep now reads the panel's two lines instead of the sub-line.

## Pictures
`phone-375x667.png`, `phone-390x844.png`, `phone-411x915.png`, `phone-430x932.png`, `desktop-1440x900.png`, `desktop-1080x900.png` (the 1080 shot is cropped to the card's foot so the stacked strip shows). Taken locally, so the places counter is blank but keeps its space.
