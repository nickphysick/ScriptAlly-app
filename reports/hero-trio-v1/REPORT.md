# Hero trio + centred phone drawer — report (2 Nov 2026)

## What changed
- **Copy, both layouts:** a new row "Query · Track · Discover" in the typewriter face, and the sub-line is now "Give your manuscript the chance it deserves with **QueryHawk**." The brand is bold and never breaks. One shared component (`HeroLines.tsx`) draws both rows for both layouts.
- **Desktop:** the trio sits 22px under the strap (24px type, 12px either side of each rust dot) and the sub-line 10px under the trio (both measured). One addition: `text-wrap: balance` on the desktop sub-line, because without it "QueryHawk." sat alone on its second line.
- **Phone:** the drawer is a centred stack with no stretching: 34px top and bottom padding, then the question, strap (10 above), hawk (128px, static, 14 above), trio (6), sub-line (12), link (10) and sign-up (26, left-aligned). The 70% height and the auto margins are gone.

## One spec value had to give
With the spec's gaps, the drawer ends at 740 on a 390×844 phone. With the 38px gap below it, the Birds-eye heading ended at 853, 9px past the screen. I cut the gap under the drawer from 38px to **26px**, the one value this brief doesn't set (it was 22px before the last change). The heading now ends at 841 at 390×844. That leaves only **3px** to spare, so any taller hero copy pushes it off again.

## Drawer heights (content + padding, no floor)
| Phone | Drawer foot |
|---|---|
| 375×667 | 785 (taller than the screen, as expected) |
| 390×844 | 740 |
| 411×915 | 740 |
| 430×932 | 740 |

## Locks
- **LW-7 (replaced):** at all four phones, the drawer's height equals its content plus padding (±2), no gap over 30px, strap and trio one line each, hawk centred (±2), "QueryHawk" in one piece. At 390 and 411 the heading and its rule are in the first screen.
  - Red on today's main (1efc7a9b) at all four sizes.
  - Each break turns it red: LW7, LW7b, LW7c, LW7d, LW7e, LW7f, LW7g.
- **LW-13 (new):** the trio is a list reading Query/Track/Discover, with two hidden dots, in Special Elite. The sub-line matches word for word, the brand is weight 700, and nothing in the hero is uppercase. Checked at 390 and 1440. Red on main; red under `LW13`.

## Gates
- tsc: clean.
- Production build: no warnings.
- Public e2e: 95 passed, 33 skipped (was 92 / 33; three new cases).
- Vitest: 10,030 passed. Three repo-sweep files failed only while the Playwright suite was loading the machine; they pass run alone.

## Pictures
`phone-375x667.png`, `phone-390x844.png`, `phone-411x915.png`, `phone-430x932.png`, `desktop-1440x900.png`. They are taken locally, so the places counter is blank but keeps its space.
