# Contact list rows v1.2 — report (26 Nov 2026)

Branch `contact-list-rows-v1-2`, cut from `dev/bew2-clr1` @ 7fd054db9 (what dev served: `index-_ZibFKqo.js` =
phone-birds-eye-world-v2 + contact-list-rows-v1). Ref `design-refs/contact-list-rows-v1-2/contact-list-rows-v1-2.html`,
sha256 `57c09ee6…3666` — matched (two identical packs in ~/Downloads), committed and enrolled in the design-ref watchlist.

## False premises

- **v1.1 never landed.** No branch, no commits, nothing on dev. Every item was TO DO; nothing was skipped.
- **The panel did not pin on this page.** It was taller than the window, so the tall-panel rule (shell/useTallRail)
  dropped it to `position: relative` and it scrolled away (the red-before measured its top at −499px). "Read the top
  from the panel's own rule" needed the panel to pin first: it is now capped to the room under its sticky top and scrolls
  inside itself (List filters v1.1's rule), so the tall rule never unpins it.
- **The headings could not pin level with the panel as the card was built.** The index, applied and heading rows were
  one sticky block (the "cap") under a sticky light bar. Pinned level with the panel, as the ref draws it, means the
  heading row alone pins and the bar scrolls away. Done — and flagged below.
- **The agent card's action words live in three places,** not one: the mounted card's call box (`lib/contactV24`
  `CALL_BUTTON`), its foot button (`lib/agentCardV2` `acFoot`: "Mark partial sent" / "Mark full sent"), and the older
  `lib/agentCard` `primaryFor`. All three now say the query card's words.
- **The status-sort "two Queried sections" and the Fit sort's sections exist only under Letter grouping** (the default).

## Step 0 · what is where

- Query status cell and action: `ContactSheet26` `Row26` (`data-clr="status"`, `rest`, `act`, `act-end`); words from
  `lib/contactListRows` `rowActionOf` → `lib/qc1512` `rowAct`.
- Genre pills: `shared/agentRowParts` `GenrePills` (unchanged, other surfaces) → the list now draws
  `ContactRowParts` `GenreLines`.
- Heading row and pin: `ContactSheet26` `.cl26-th.cl26-pin` (now inside the frame); its top from the panel
  (`.qc153-rail`'s computed `top`, qcv153.css `calc(var(--pin-cover, 12px) + 12px)`).
- Filter panel: the shared shell `shell/FilterPanel` (card, navy head, foot — shared with the Query Centre's
  `QcViews156`, unchanged) and the Contact list's own content `ContactViews` (rewritten).
- ContactFilters and counts: `lib/contactList` (`sectionMatch`, `matchesContactFilters`, `appliedFilters`),
  `lib/contactV27` `railCounts` (old) → `lib/contactPanel` `panelCounts` (new).
- Letter margin: `--cl26-m` (contactV26.css: 84px grouped, 22px ungrouped/Status).
- Status-sort sections: `lib/contactV26` `sections`.
- Agent card words: above. Its Fit setter: `AgentCard262` `rate` → `p.edit.save({ rating })` (AgentList `editKitFor`),
  toast `fitToast`.
- getHomeCountry: `lib/territory`.

## Commits

| sha | |
|---|---|
| `6a137ad96` | the design ref |
| `791c72ce9` | phase 1: query status width, larger typewriter headings, pinned with the panel |
| `1a5d77454` | phase 2: genres in lines, rate Fit from the row, plain initials, row consistency |
| `0e400a00b` | phase 3: status at rest, action on hover or at the row's end |
| `c1bda58e6` | phase 4: filter panel revamped |
| `8a1ade124` | phase 5: letter margin, one Queried section |
| (phase 6) | measured — this report, the harness, and the fixes the measurement found |

## Gates against the baseline

| | baseline (this line) | after |
|---|---|---|
| `tsc --noEmit` (8 GB heap) | 0 errors | 0 errors |
| `vite build` | exit 0 | exit 0, no error/warning lines |
| Vitest | 13,819 passed, 4 skipped | the touched suites green (contact, shell, lib contact/agent card/panel); source-scan suites time out at the default limit under load and pass at `--testTimeout=120000` |

v1's M1–M7 on this line before any change: M5–M7 green; M1 re-pointed to v1.2's templates (its v1 form had passed at
v1's own tip, `4ae2a75ad`).

## Measurement — `tests/e2e/contactListRows.measure.ts` (M1–M20)

Fixture `tests/e2e/clrFixture.mjs`: 19 agents on their own emulator account (home GB). v1's 19, changed to give three not
queried, five unrated, two abroad (New York, Dublin), one with five genres, both reply policies, and a closed-to-queries
agent carrying the book's genre (so door counts are faceted observably). The book's genre is Crime. Every lock asserts its
population first. Windows 1280, 1440, 1600, 1920.

| lock | green | red-before |
|---|---|---|
| M1 columns ±1 | 640/640 | today's dev 412/640 |
| M2 no overlap, headings untruncated | 864/864 | — |
| M3 centred cells ±2 | 228/228 | — |
| M4 the flag only abroad | 240/240 | — |
| M5 action words | 9/9 | (passed on dev: the words were already the query card's) |
| M6 heading sorts both ways, chip agrees | 36/36 | (passed on dev) |
| M7 opens A to Z, search words | 6/6 | (passed on dev) |
| M8 status centred between Response policy and the › (the glyph) ±2 | 80/80 | today's dev 4/80; v1 template restored (`m8`) 4/80 |
| M9 typewriter headings 18/16px, untruncated | 20/20 | inner-span face fix removed: 12/20 ("Source Sans 3") |
| M10 pinned: top = panel top ±1, radius ≥13, no row above | 10/10 | today's dev 4/10; sticky top/radius removed (`m10`) 6/10 |
| M11 tags in lines of 2/3/1, ≤2 lines, 6px clear, 28px Source Serif 600 14px | 466/466 | v1 tag restored (`m11`) 323/466 |
| M12 rate from the row: hover, click 4 → store 4, toast, stars; keyboard → → Enter = 3 | 6/6 | today's dev: failed (no rater) |
| M13 no "!", navy/dotted/stone discs, every row's words drawn | 39/39 | today's dev 19/20 (3 "!"); the dangling-selector bug restored: Reed's name and stage not drawn |
| M14 the mouse swap, one centre ±2, height unchanged | 71/71 | swap removed (`m14`) 37/71 |
| M15 no hover: button in the last column, still two lines | 38/38 | today's dev 19/38; hover:none rule removed (`m15`) 21/38 |
| M16 the outline button's computed style; the card's words | 2/2 | today's dev: failed |
| M17 panel sections and faceted counts (hand count), Crime + Open | 60/60 | faceting removed in source: 49/60 (door and genre counts) |
| M18 Clear all hidden / shown / resets | 5/5 | today's dev: failed |
| M19 1280 Letter: a whole tag per agent; one Queried section, nudge due first | 22/22 | today's dev 4/22 |
| M20 the Query Centre's filter panel, pixel-identical at 1440 | passed | baseline captured on today's dev |

Ledgers in `ledger/` (`*-mut-*` for the CSS mutations); every run's log in `runs/`.

**Faults the measurement (and the screens) found, fixed in phase 6:**
- A dangling selector (phase 3's edit) made closed rows' name, agency and stage word `display: none`. M4 read the
  text and passed; the screens showed blank rows. M13 now locks every row's words as drawn, proved red on the bug.
- "Genres" / "Response" headings were drawn in Source Sans: the brand sheet names bare spans. M9 now reads the face of
  the element that draws the words, proved red without the fix.
- The action's padding was 10px below a card of 980 (the ref's narrow rule); 3.4 says 0 12 and the words fit: 12 now.
- The agent card's foot button said "Mark partial sent": it now says "Send your partial".
- The page's ground above the pinned headings let clicks through to the hidden rows; it now catches them.
- The Letter margin needed 18px, not 28, for "Young adult" (101px) to show whole at 1280.

## The screens (`shots/`)

`rest-1280/1440/1600/1920.png`, `pinned-1440.png`, `hover-action-1440.png`, `hover-rate-fit-1440.png`,
`touch-1440.png`, `filters-crime-open-1440.png` — the ref's nine views, on the emulator fixture. (`sorted-status-1600.png`
is M6's.)

## The Letter margin

**18px below a card of 980** (was 84), letters 16px, stage glyphs 14px, their small words dropped. At a 1280 window the
card's content box is about 812px; every column but Genres sought is fixed there, so Genres gets about 114px — the
fixture's longest single tag ("Young adult", 101px) plus the cell's 6px each side. Wider cards keep 84px.

## Not individually ruled (in on Nick's behalf — flagged)

- The query card's words on the agent card too (call box, foot button, `primaryFor`).
- Narrowing the Letter margin (to 18px below 980).
- One Queried section (the status sort grouped by Letter: one section a stage).
- Fit and Replies as single-choice toggles; Genres as any-match; six genres before "+n more".
- "Outside the UK" and "Missing details" as rows at the panel's foot.

## Questions for Nick

1. **Pinning took the light bar and the index with it.** For the headings to sit level with the panel, only the heading
   row pins now: the light bar (count, search, Sort, Group, Export) and the A–Z index scroll away instead of sticking.
   The margin letters still stick. Keep, or should the bar stay pinned with the headings under it (then they cannot be
   level with the panel)?
2. **"Outside the UK" uses the writer's home country.** A writer whose home is the US sees UK agents counted as
   "outside the UK". Should the label follow the home country ("Outside the US")?
3. **The status sort, grouped by Letter, now draws one section a stage** in the order each first appears, so a waiting
   Queried agent sits above Full sent. Ungrouped, the sort is exactly your 3.1 order. Acceptable?
4. **At 1440 the card is under 980**, so 1440 gets the narrow template and short headings ("Genres", "Response").
5. Other app surfaces still say "Send the partial" / "Send the full" in their own words (dashboard feed, to-do, the
   calendar pill, the history story). D7 says app-wide — should those follow?

## Process

- **Dev: https://scriptally-dev.web.app serves `index-8JglYLZj.js`**, built from a clean checkout of `contact-list-rows-v1-2` @ 236d78822. Dev served `index-_ZibFKqo.js` (`dev/bew2-clr1`) just before, which this branch contains, so no merge was needed; the served hash was checked inside the deploy command.
- Red-before ran in this worktree before any source edit; the slot was shared with other sessions' runs.
