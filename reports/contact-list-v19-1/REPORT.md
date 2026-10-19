# Contact list v19.1 — report

Pack `cc-prompt-contact-list-v19-1.md`: Nick's review of v19 on dev. The mock and screens are enrolled at
`design-refs/contact-list-v19-1/`. All 13 SHA256s matched the pack's table. Branch `contact-list-v19-1`. Nothing
outside the Contact list changed.

## False premises

1. **The pinned illustration was not cut by an ancestor's `overflow`.** Every ancestor up to `.wpg-scroll` is
   `overflow: visible`. What cut it was the sheet's 12px sticky lip (`.wpg-scroll > .sheet-lip`, z 19), which painted
   over the top of the art because the pinned head sat at z 9.
   - Where it showed: at 1512 and 1280 the lip only covers the PNG's transparent padding, so nothing visible is lost.
     At wider windows the lip covers the hawk's head. At 1920 the head was sliced flat on v19 and is whole on v19.1
     (`shots/E-art-before-1920.png`, `shots/E-art-after-1920.png`).
   - The fix: the pinned head now sits at z 19, above the lip. The art's size and position are unchanged: 137×122 at
     1512 (foot 4px past the toolbar) and 117×104 at 1280.
2. **The mock uses a different, padded image** (640×569 against our 720×641), so its hawk has air above the head. The
   build keeps our asset and the mock's geometry.
3. **The mock's contact text is a fixed 14px, and its column gaps don't follow Part D's rule.** The build follows the
   prompt: the text keeps v19's fitted size, and spare width is shared between the gaps up to 56px each.
4. **At 1280 unpinned, the harness account's longest email forces the 12px type floor.** Agent gives way to 233px,
   below its rule width of 241, because there is no more room. Lock D1 allows this, since 233 is no wider than the
   rule.
5. **The harness account has no websites.** Lock B1 seeds a long website and email on one agent and puts them back.
   The website icon and ↗ were seen on the page only through that fixture.
6. **The page cream.** Where the prompt says cream, the build uses the route's existing page-cream token,
   `--ink-sheet`, as the prompt asks.
7. **A probe trap, for future locks:** the art and the sheet lip both have `pointer-events: none`, so
   `elementsFromPoint` skips them. E1 frees them for its read and skips anything at opacity 0 or
   `visibility: hidden` (an invisible To-do drawer scrim surfaced otherwise).

## Base

`d6d63ba2`, the tip of `dev/…-qc139-dv1b-cl19`. Dev served it as `index-LypZ-ruq.js`, and a local build reproduced
that hash exactly. It carries v19. Baseline gates: tsc and the build clean, Vitest 9116 passed, with only
`functions/src/email.test.ts` red (known).

## Per part

| Part | Commit | What changed, and where |
|---|---|---|
| A | `616d8359` | A missing website or email shows a blank cell at rest. "+ Add website" / "+ Add email" (serif 14px, navy, underline at 35% offset 4px) appears while the row is hovered or has focus inside it. Its words are `visibility: hidden` at rest; the button stays in the tab order and shows with a focus ring. Clicking opens the add flow, never the card. `ContactCells.tsx`, `contactV19.css`. |
| B | `8b3fd161` | A 15px globe or envelope icon (navy at 70%, 6px to the text) on each website and email, with no underline at rest. On hover the text takes a navy underline (and the ↗ shows for a website); the email keeps its copy behaviour. The column fit counts the icon (`CONTACT_ICON = 22`). |
| C | `d3e9fd67` | Date added reads "25 Jun 2026", all ink, through `lib/dates` `formatDate`. Never "Sept". `addedParts` is replaced by `addedLabel`. |
| D | `bfff795e` | `lib/contactColumns.ts`: Agent = max(disc + gap + widest name, disc + gap + widest agency line, heading) + 8, clamped to 230–330. Every other column is as wide as its content or heading. Spare width is shared between the gaps up to 56px each, and the rest goes into the Email track. The headings follow, through `--cl19-gap`. |
| E | `732a224e` | The pinned head sits at z 19, above the sheet lip; see false premise 1. |
| F | `88be4b16` | Unpinned only. A navy toolbar with no bottom rule; cream letters (disabled at 28%; the current one a cream tile with navy text); Find, Group by and Filters lose their rings; Pin is cream with navy text. The card rounds all four corners at 18px, with 22px of page below it. Pinned is unchanged. |
| G | `2bc4fca5` | The open-row strip is cream `#f6f1e8`, with its divider at 12% ink. Group bands stay powder. |
| Locks | `5933376d` | The CL191 locks, the CL19 updates, the refs and the shots. |

## Part D — the column template, before and after (the harness account, as sparse as Nick's: no websites, some emails)

These are the rows' `grid-template-columns`. The widest disc + gap + name or agency line is 232.2px, so the rule gives
240.2.

| Size and state | Before (v19) | After (v19.1) | Gap (before → after) |
|---|---|---|---|
| 1512 unpinned | `323 94 107 210 99 157` | `241 94 93 232 99 157` | 20 → 34.79 |
| 1512 pinned | `371 94 107 210 99 157` | `241 94 93 232 99 157` | 20 → 44.4 |
| 1280 unpinned | `230 94 198 99 157` | `233 94 195 99 157` | 20 → 20 |
| 1280 pinned | `272 94 204 99 157` | `241 94 226 99 157` | 20 → 22.25 |

## Locks (CL191, `tests/e2e/contactV191.measure.ts`)

Each lock was red on the base build (v19, as on dev) and red under its named mutation, then green on this branch. The
B1, C1 and D1 mutations were edits to `src`, made from path-derived backups and restored afterwards.

| Lock | Base | Mutation | Green |
|---|---|---|---|
| A1 blank | 10/50: the link is always visible | shown at rest: 42/50 | 50/50 |
| A2 focus | 14/18: not hidden before focus | out of the tab order: 8/16 | 18/18 |
| B1 icons | 118/234: no icons | without the +22: 233/234 (the long email 0.48px clear at 1280) | 234/234; least clearance 22.5px |
| C1 date | 6/8: grey year | the grey year restored: 6/8 | 8/8 |
| D1 agent width | 44/48: Agent 323 / 371 | `1fr` restored: 44/48 | 48/48 |
| E1 illustration | 26/28: the lip over the art | band `overflow:hidden`: 20/28; head z-index auto: 24/28 | 28/28 |
| F1 unpinned bar | 22/42 | the bar reverted: 32/42 | 42/42 |
| G1 strip | 18/26: powder strip | powder: 22/26 | 26/26 |

**CL19 updates** (each has its one-line reason in the code):
- **P1** no longer compares the control rings on Find, Group by and Filters, or Pin's colour, which now differ by
  design (Part F). The "+ Add" link is checked as a fixed 14px in both positions (Part A).
- **P2** and **I1:** the unpinned card has 18px bottom corners and ends 22±1px above the page's foot (Part F). Pinned,
  the card still meets the foot.
- **D1:** the strip is rgb(246,241,232) (Part G).

## L1 (each file run alone on this branch's build)

- **Green:** contactV19 (15/15), contactV183, contactV18, and QC138, .1, .3, .4, .5 and .6.
- **Red, identical on the v19 base:** CL17 FS1, CL16 C3/F7, QC138.2 D1. These were already red before this pack.

## Shots

`reports/contact-list-v19-1/shots/` holds one image beside each `screens/*` file (01–06, at 1512 and 1280), plus the
1920 before/after crop of the pinned art. They match the mock's structure. One thing for Nick's eye: at 1280 the
stacked "Website and email" cell keeps the hidden "+ Add website" laid out above the email, so the email sits on the
cell's second line, slightly below the row's main line. That is what Part A's `visibility: hidden` rule (no layout
shift) produces.

## Deploy

_Filled in below._
