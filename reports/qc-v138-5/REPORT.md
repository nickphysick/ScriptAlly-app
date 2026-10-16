# Query Centre v138.5 — report

Branch `query-centre-v138-5`, cut from `dev/main-cl18-todo51-cl181` at **d3dd2a94**: the branch dev served when the pack
started (`index-BFjZu6hN.js`; a dev build of d3dd2a94 reproduces that hash exactly). It contains v138.4 and the
pinned-row fix (`fix-pinned-row-centre` is merged: it is on `main` at 30439920 and in this base).

Commits, one per part:

| Part | Commit | |
|---|---|---|
| A · Header frame | b70986f6 | shared inset (`shell/pageHeroFrame.css`), desk hawk, the four-column grid |
| B · Status glyphs | b404eb4d | centred row, 62 × 56, hover labels |
| C · Weekly chart | 4a1de812 | the "Sent" card, `lib/qcSentWeeks` |
| D · Hawk shadow | 1a6ad8fe + 93e12675 | see "a red commit" below |
| E · Filters | 1486887a | Filters button + panel in the navy header |
| F · Columns | 88cdc185 | one template, What you sent on two lines |
| G · Pin | 6e1c3393 | the pin replaces Full screen |
| H · Group art | 483a0111 | 36px, inside the band |
| I · Locks | (this commit) | `tests/e2e/qcV1385.measure.ts`, retargets, CLAUDE.md, this report |

## False premises

1. **The Contact list has no cut-out hawk to copy.** §0.1 asks for "the hawk's size and margins"; v17.1 removed the
   Contact list's cut-out hawk, so only its shadow is left. The desk hawk is new on the Query Centre and its size and
   margins are the pack's (250 / 190, the inset less 6, −20/−30 and −14/−22).
2. **The header frame was page-local on BOTH pages, as copies.** `contactV17.css` and `qcv138.css` each stated the same
   width, centring and inset rules. The inset is lifted into `src/components/shell/pageHeroFrame.css` (`.phf`,
   `--phf-inset`), which both headers carry; the Contact list reads it as `--cl17-inset` and measured identical to
   the pixel at 1512 and 1280 after the change. The width/centring rules are still two identical copies (a further
   lift, not done: they sit in the Contact list's own sheet and nothing needed them moved).
3. **The inset could not be shared as written.** `(100% − 900px) / 2` in a margin is a percentage of the element's
   own containing block, so it meant "the header's width" only on the header's direct children. The desk hawk is a
   grid item that pulls itself out by the inset; there `100%` is its grid area. The shared token is in container
   units (`100cqw` of the header), which equals the old value on every element that read it before.
4. **The shell already has a collapsed sidebar: 68px, animating over 0.24s** (`--shell-side-w-collapsed`, ink shell
   v1). The pack's 76px rail and 340ms described a rail to add only "if there isn't one", so the shell's own values
   stand. G1 asserts the rail at the shell's own width.
5. **F1's "no chip truncated on the fixture" cannot hold on the harness account.** It carries a package named "The
   Complete Autumn Submission Bundle for Literary Agents" (~446px, the name that stopped v138.1's Part C). No
   180–270px column holds it. The pack's own rule says such a name ends in "…" with the full name in the tooltip, so F1
   asserts that rule: a chip truncates only once it is as wide as its column, and its tooltip then has the name.
   Every other chip on the account shows in full.
6. **F2 as written ("the end of the Where it stands text to the chip ≤ 40px") fails the design itself**, in the mock
   too: with a fixed 148px column a short status ("Queried") leaves ~100px before the chip. Measured from the cell's
   edge instead, it cannot see the old gap at all (the gap was inside a wide cell): that reading stayed green under its
   own mutation, so it was thrown away. F2 now measures each row's gap from the right edge of the WIDEST Where it
   stands in the list (text by Range, plus the track's marks): 16.1px worst at 1512, and 61.1px with the old template.
7. **D1's mutation ("leave the header grid as a stacking context") would not redden anything.** The shadow and the
   card are both inside the grid, so a context there keeps their order. The break that does reproduce the mock's bug
   is a stacking context on the chart column (`.qc138-cc { z-index: 1 }`): the card can no longer rise above the
   shadow. That is the mutation used, and it turns D1 red (5548 pixels differ under hover).
8. **The mock and the prompt disagree in places; the prompt's values were used:** header grid to navy header 54px
   (mock 74); Offer to Closed 32px (mock 38); the Filters button's and pin's border 1.5px (mock 1px).
9. **The Contact list's shadow is not the shadow §D describes.** On the Contact list it sits behind the title at .15,
   400–460px, rotated −4°. §D's own values (behind the chart, .11, 560px, `rotate(-8deg) scaleX(-1)`, blur 2,
   multiplied) were used; the image is the same `hawk-shadow.png`.
10. **"No package: no chip" covers the individual-pieces case.** When nothing at all is recorded the cell keeps its
    "+ Add" button on line 1 (it is the way to record the send, not a package chip), with the icons under it.

## A red commit, repaired

Part D (1a6ad8fe) was committed with one unit test red (`qcCentre.test.tsx`: a selector declared twice). The gate
was piped through `tail`, so the commit chained after it ran on `tail`'s exit code: the exact trap CLAUDE.md records.
93e12675 folds the declaration into the existing rule. The red commit stays on the record; every later gate was read
from its own exit code.

## §0 Recon

1. **Contact list header:** `agents/contact/ContactLightHeader.tsx` (letters, title block, actions, `ContactSummaryCard`)
   over `contactV17.css` + `contactV18.css`. Inset: `max(40px, (100% − 900px)/2)`, full `max(64px, (100% − 1080px)/2)`;
   at 1512 with the sidebar open it is 154 (letter strip 426 → 1326), at 1280 it is 40 (312 → 1208). No cut-out
   hawk. Shadow: 400 (460 full) wide, .15, −4°, blur 1.5, behind the title's left. **The frame now lives in
   `shell/pageHeroFrame.css` (`.phf`).**
2. **Sidebar collapse:** `useSidebarCollapsed` (localStorage `scriptally:sidebar-collapsed`) plus `sidebarForce`'s
   hold (`holdSidebarCollapsed`), which reads as collapsed without touching the writer's own choice; collapsed width
   68px, 0.24s. The Contact list's full screen already uses the hold.
3. **Query Centre header before:** `QcHeader138` (title block, actions, and on the right the glyph capsule with counts
   and two-line labels), `QcFilters138` as the header's filter row, `BulkBar138`, `QcPinned138`; Full screen was
   `QcList138`'s button (state `qcFull` in Queries.tsx, no sidebar hold). Touched: QcHeader138, QcFilters138,
   QcList138, Queries.tsx, qcv138.css, qcvList138.css, and on the Contact list two lines of contactV17.css and the
   header's class.
4. **Weekly data:** first-queried is `QcRow.sentMs` (from `dateSent`). The dashboard already counts sends by week
   (`lib/dashboardStats`: `isoWeekStart`, `trailingWeekStarts`, `weeklySendSeries`, Monday in the user's own zone);
   `lib/qcSentWeeks` reuses the first two. `lib/qcDeskWeeks` also exists but is fixed to Europe/London, so it was not
   the one for "the user's time zone".

## Locks — QC138.5 (`tests/e2e/qcV1385.measure.ts`)

Red first on the pre-pack build (d3dd2a94, served from a separate worktree), then green on the branch, then red
under each named mutation. Logs in `runs/`.

| Lock | Red on base | Green on branch | Mutation → red |
|---|---|---|---|
| A1 inset | no status row, no card | status row and grid at 426/1326 (1512) and 312/1208 (1280) = letter strip; card right = grid right | own inset 120 → 392 vs 426 |
| A2 hawk | no hawk | 250.0 / 190.0; out by 148 / 34 (inset 154 / 40) | no negative margin → 0 vs 154 |
| B1 glyphs | old capsule (counts on show) | 7 × 62 × 56, centred to 0.0px, no visible digits, no title; each label = the rows its filter shows | counts in the button → digits on all 7 |
| B2 one store | old row | glyph → pill "Partial requested"; panel Stage → glyph pr pressed | glyphs' own state (source) → pill "Stage" |
| C1 height | no card | card = title block ±0 at 1512, 1280 and after a resize | fixed 150 → 150 vs 177 |
| C2 weeks | no chart | 12 weeks = per-Monday counts of all 73 rows' first-queried dates; this week pressed; week 11 → "SENT · LAST WEEK" | Sunday-start weeks (source) → [3,13,4,…] vs [3,15,2,…] |
| D1 lift | no card | rest: ~5,700 pixels differ (shadow over card); hovered: 0 differ, card up 3px | chart column a stacking context → 5548 differ hovered |
| E1 filters | the old row | no row; title · search · Filters · density · pin left to right; badge 1; "Showing 1 of 73 queries, grouped by …"; Escape closes, focus on Filters | old row kept (source) → 6 pills in the header |
| F1 columns | 92px chips, old template | one template over 59 rows; every chip that fits is whole; the over-long name truncates at the column with its tooltip; icons under the chip | fixed 92px chip → whole names truncated |
| F2 gap | old template | worst 16.1px (widest Where it stands 151.9) | old template → 61.1px |
| G1 pin | Full screen, no rail | rail 68 = 68; no header; navy header 22.0 under the sheet; no pinned bar even scrolled; unpin restores 248 (and 68 when collapsed before) | always expand on unpin (source) → 248 vs 68 |
| H1 art | 46 / 54, overhanging | both 36, inside the band, centred, left 12 | old size → 46 |

The source mutations are made, built, run and restored by `tests/e2e/qcV1385Mutate.sh` (path-derived backups; the
script refuses to finish unless the file is back at HEAD).

### L1 — no regression

QC138.1, QC138.2, QC138.4, PIN1, CL17 (4 skipped by design), CL17.1 (2 skipped by design) and RS2 pass unchanged.
QC138 and QC138.3 needed retargeting, each edit marked in the file:

- **QC138 A1:** "no illustration" now allows exactly the desk hawk; the title's sum reads the glyphs' `data-n`;
  **retired:** "title at the inset" (the title follows the hawk; QC138.5 A1/A2 own the inset) and "shadow .15"
  (QC138.5 D1 owns the shadow).
- **QC138 A2:** labels read from the buttons' names (no drawn labels); sum from `data-n`; aria now ends "… queries";
  **retired:** the Stage pill check (the pill is in the Filters panel; QC138.5 B2 owns "one store").
- **QC138 B1:** reads the filters inside the Filters panel rather than a row under the header.
- **QC138 G1:** "a refilter clears" refilters with a glyph (the pills are behind the button).
- **QC138.3 F1:** the art's width is 36 (QC138.5 H1 owns its placement).

QC138 after the retargets: 17 passed.

## Shots

`shots/` holds the states of `screens/01–11` at 1512 and 1280: top (01/02), a status selected (03), the Filters
panel (04), a glyph hovered (05), the chart at rest, a week hovered and a week clicked (06a–c), pinned (07/08), the
columns (09/10) and a group band (11).

## Deploy

See the end of this file.

## For Nick

- **Should pinning persist across page loads?** As built it does not: a reload comes back unpinned. The Contact list's
  full screen does persist (URL parameter plus localStorage), so the two pages now differ here.
- **Should the old pinned top bar still appear on scroll when not pinned?** As built, yes: it only stands down while
  pinned.
- The sidebar rail is the shell's 68px at 0.24s, not the mock's 76px at 340ms (false premise 4). Changing the shell's
  own timing would change the « button everywhere.
- The harness account's over-long package name truncates by design; if that name is not realistic, the fixture could
  be shortened.
