# Header panel v2 — report

Branch `header-panel-v2` (worktree `../ScriptAlly-hp2`). Not merged. Deployed to dev from the branch.
Reference: `design-refs/shell/header-panel-v2.html` and `design-refs/header-panel-v2/ref-*.png`. All five hashes matched.

## 1. False premises

1. **"The Analytics band's blue, `#2d3a50`."** `--ink-band` is `#2d3a50`, but the Analytics band as built painted
   `--phb-ink` `#2a3a52`. The panel uses `--ink-band`, as the pack says, so Analytics' header changed colour by three
   units as well as shape.
2. **Lock C1, "`elementsFromPoint` returns the badge first".** A badge has `pointer-events: none` (so the card's press
   target underneath takes the click), and an element with no pointer events is never returned by
   `elementsFromPoint`. The lock switches pointer events on for the read and off again. Pixel sampling needs no such step.
3. **Lock P8's mutation, "`z-index: auto` on the header".** It reddens nothing: 0 of 12 readings. The Set aside popover
   carries its own `z-index: 30` and nothing under the header competes with it. The lock is proved red by
   `overflow: hidden` on the panel instead, which is the way a rounded panel could really hide it (8 of 12 red).
4. **Lock P3, "with an empty fixture".** The harness account is populated and a client cannot empty it. P3 is held at
   unit (`pageHeaderPanel.test.tsx`: the empty state is not a panel whatever the prop says) and proved red there by
   rendering the panel when `living.count` is 0. `QcEmpty` and `ContactEmpty` are separate components with no diff.
   **No empty state was rendered in a browser in this pack.**
5. **Lock A2, "prove with a zero fixture".** Same reason. The zero case is held at unit for the Query Centre
   (`qcOpenHeader.test.tsx`); on the page both stamps were read at non-zero counts only (13 with you, 31 not queried).
6. **Lock P7, "no horizontal overflow on any workspace route at 1280 or at 390".** Three things were already true on
   the commit before the pack:
   - Discover's card row overflows its scroller by 39px at 1280. P7 holds it to that figure.
   - Comparable titles and Submission packages keep a two-column page grid at 390, so their header row is 368 wide in
     a 334 column and ends 6px past the screen. P7 holds the panel to that edge. The document does not scroll sideways.
   - The Query Centre draws no panel at 390: under 768px it is still the v126 page with its band card.
7. **Lock P6, "loading and loaded header boxes are equal".** Comparable titles and Submission packages already grew by
   30px (258 → 288) when their data landed, because the button row arrives with the manuscript. Fixed here with a floor
   height on a full panel.
8. **Part D's reference shows a month-on-month line on Profiles complete.** `deskModel` returns `profiles.mom: null`
   and the pack says no data derivation changes except "added this month". The card keeps the line's box, empty.
9. **§0.2, "own open headers: `MsOpenHeader`".** Correct. The v135 report's premise 11, which said no such component
   existed, was wrong: it is in `Msv21Parts.tsx`.
10. **"Calendar and Noteboard through `TasksPageLayout`, with a control row fixed under the masthead."** Noteboard has
    one and keeps its 16px relationship. Calendar has none, so it takes the 48px rule.

## 2. Base and conflicts

Base: `origin/v135-header-desk`, which already contains `origin/main` (16ff0db8). v135 is not on main. No conflicts.
Both `qcvDesk135.css` and `HeaderSheet.tsx` are present.

## 3. Part by part

Readings are from `tests/e2e/headerPanelV2.measure.ts` at 1512 × 900 and 1280 × 800: 14 cases, 614 readings, all green on the final run (`ledger/_totals.json`). "Red on base" is a run of the
same file against a build of 839ece03 (the commit before Part A). "Red by mutation" is `HP2_MUTATE=<lock>`
(`reports/header-panel-v2/mutation-proofs.jsonl`).

### Part A — landed, measured (commit d7e9c746, with later fixes in the locks commit)

| Lock | Green | Red on base | Red by mutation |
|---|---|---|---|
| A1 height | 313.2 at 1512 and 268.4 at 1280, on both pages | 4 of 6 (390 and 317) | 4 of 6 (347.2 with a subheader) |
| A2 stamp | "13 with you", "31 not queried", `rgb(224, 161, 136)`, outside the h1; none on the other eight routes | 6 of 18 | 4 of 20 ("4 with you" vs 13) |
| A3 faces | one row, halo is the panel's blue, no key, no subheader, the hidden sentence sums to the count on file | 10 of 18 | 2 of 18 (key restored) |
| A4 buttons | `rgb(243, 238, 230)` with `rgb(27, 36, 51)`; transparent with the cream ring | 8 of 8 | 4 of 8 |
| A5 art | `qc-courier-disc` at 206 (170); `contact-header-hawk` at 214 (172) | 4 of 4 | 2 of 4 (cut-out courier) |
| A6 gap | 72 at 1512, 60 at 1280, both pages; halos clear the panel by 37 (25) | 8 of 10 | 4 of 10 (88) |

### Part B — landed, measured (commit d38afafd, with later fixes in the locks commit)

| Lock | Green | Red on base | Red by mutation |
|---|---|---|---|
| P1 panel everywhere | all ten routes, both widths: `rgb(45, 58, 80)`, radius 14, 1px border, on the column, 28 under the sheet's top, no sheet, tab is the page colour | 116 of 120 | 8 of 120 (panel dropped from `/todo`) |
| P2 out of scope | Dashboard, `/account`, Help, Plans, Import: box, class and 17 computed styles equal the base's, both widths | 0 of 50 (it is the baseline) | 24 of 50 (`panel` on every shared header) |
| P3 empty states | unit only (see premise 4) | — | red at unit |
| P4 contrast | every title, eyebrow, intro and button ≥ 4.5:1 | 21 of 21 | 20 of 87 (intro in ink: 1.59) |
| P5 drawing inside | inside on four sides; centres equal | 1 of 1 | 11 of 21 |
| P6 no jump | all ten routes, both widths | 4 of 25 (premise 7) | 4 of 25 |
| P7 no overflow | see premise 6 | 19 of 40 | 5 of 20 |
| P8 popover | the popover is first at four points, both widths | 4 of 4 (no door found: the base's header was not a panel) | 8 of 12 (premise 3) |
| P9 Analytics | left edge on the column; height 322.6 at 1512 and 293.8 at 1280; the section list opens and a section is reached | 4 of 6 | 4 of 6 |

Built from rules, not from a drawing: Analytics, Discover, Manuscripts, Comparable titles, Submission packages, To-do,
Calendar, Noteboard. Their shots are in `shots/` for review.

### Part C — landed, measured (commit ab906aee)

| Lock | Green | Red on base | Red by mutation |
|---|---|---|---|
| C1 opaque badge | six badges, two widths, four points each: `rgb(255, 255, 255)`, badge first | 2 of 52 | 36 of 100 (first point `rgb(246, 226, 216)`) |

On the base only the Query Centre's badges could be read (the Contact list had none), so the count there is small.

### Part D — landed, measured (commit ddb28501)

| Lock | Green | Red on base | Red by mutation |
|---|---|---|---|
| D1 same construction | badge 64 × 64 at 16, −26; strip 64; inner border inset 6 — equal to the Query Centre's at both widths | no badge cards on base | 6 of 18 |
| D2 slate | `rgb(226, 231, 239)` strip, `rgb(61, 80, 112)` ring and title | — | 4 of 6 |
| D3 content | titles, labels, captions exact; week badge is the last bar, first tile the eight bars' sum; queried is active + closed and each tile matches its arc; complete + gaps is the count on file | — | 2 of 14 (active and closed swapped) |
| D4 charts | one chart a card, 96 × 46 | — | 6 of 6 |
| D5 presses | Queried: list 37 → 6. Profiles: Housekeeping opens. Week: no button | 5 of 5 | 2 of 5 |
| D6 placeholder | dashed, "Art to come", `aria-hidden`; a filled slot is the same box with no dashes | 3 of 3 | 2 of 6 |
| D7 no jump | card, badge, strip, chart box and line equal loading and loaded | 20 of 20 | 6 of 20 |
| D8 no overflow | no overflow at 1280; "Profiles complete" and "Added this week" wrap to two lines clear of the placeholder | — | 2 of 6 |

Both desks render the compact card at 1512 and at 1280: the page sheet is under 1440 wide at both.

## 4. Header inventory (§0.2)

| Route | Header | Family |
|---|---|---|
| `/queries` | `QcOpenHeader` | own open header |
| `/agents` | `ContactOpenHeader` | own open header |
| `/manuscripts` | `MsOpenHeader` (`Msv21Parts.tsx`) | own open header |
| `/manuscripts/comps` | `PageHeader variant="full"` | shared, full |
| `/manuscripts/packages` | `PageHeader variant="full"` | shared, full |
| `/todo` | `PageHeader variant="full"` | shared, full |
| `/agents/discover` | `PageHeader variant="workspace"` | shared, compact |
| `/todo/calendar`, `/todo/noteboard` | `PageHeader variant="workspace"` through `TasksPageLayout` | shared, compact |
| `/queries/analytics` | `PageHeader band bandFixed` | the band |

No route fitted none of these. No page was left unchanged because a rule did not fit. Other `PageHeader` callers, all
untouched: Help centre, Plans, Import, `QcEmpty`, `ContactEmpty`, `AllManuscripts` (not routed).

## 5. The see-through badge

`.qc135-card > *:not(.qc135-hit)` gives every child of the card `position: relative; z-index: 1`. That made the strip
a stacking context. The badge was inside the strip. The card's inner border is its `::before` at `z-index: 2`, so it
painted across the badge: a 1.25px line through the disc, 6px under the card's top edge. The disc's own fill was
always white. The fix makes the badge a child of the card at `z-index: 3`. The Contact list's badge cards are built
that way from the start.

## 6. Other changes made along the way

- **The panel's vertical padding at 1440 and wider is 30 / 30.** It was first built 34 / 26, which put every drawing
  4px under the panel's centre (P5).
- **A hero panel under 768px** is one column with the drawing hidden, and its title row, title and buttons wrap. The
  three own headers had no phone rule; at 390 the hawk lay across the words.
- **A full panel has a floor height** (257; 236 below 1440; none on a phone). See premise 7.
- **`StagePage` marks an inactive page `data-stage-off`.** The folder tab's colour is decided in CSS by whether a
  header sheet is mounted on the page on screen.

## 7. Locks retired or re-pointed

`tests/e2e/RETIRED-header-panel-v2.md` names each one with the HP2 lock that replaces it. See §8 for the suites run
after the pack.

## 8. Older suites run after the pack

Fourteen suites that read these headers or desks were run against the branch build after Part D.

| Suite | Result after retirement and re-pointing |
|---|---|
| `qcV135` | 5 passed, 2 retired (B1–B9, the Query Centre's badge desk, all pass with the badge moved) |
| `shellV2` | S1, S2–S4, S6, B1, B2–B3 pass; L1 re-pointed and passes; S5 retired |
| `contactV151`, `contactV152`, `contactV153` | the remaining cases pass; four retired |
| `contactV15` | 6 passed; CL15-1 retired |
| `qcV133` | H3, H5 pass; H1, H2, H4, H6 retired |
| `qcV134` | N1, the band, banner and no-jump cases pass; N2, N3 retired |
| `analyticsV17` | 16 passed; AN17-2 retired. **AN17-17 (phone) went red on the first run and was a real regression of this pack**: the panel's rules out-ranked the band's phone rules, so the phone header lost its 100px disc at the text's top right. Fixed; it passes |
| `manuscriptsV21` | 20 passed; H1, H2 retired |
| `pageHeaderV2` | §2 on two routes and §4.4 retired |
| `livingHeadersV3` | LH9 and LH11 re-pointed (they forbade any border under the header) and pass; the LH1 · LH2 · LH4 · LH6 · LH7 test is retired, so **LH1, LH2 and LH6 are no longer re-proved** |
| `quietBar` | Q8 retired |
| `inkShell` | 22 passed |

**Red and not this pack's**
- `inkShell` INK19 (the phone's shell against main's): every difference is `rgb(243, 242, 240)` against `rgb(242, 238, 232)`, greige against oat. That is app shell v2's page colour, on the base this branch sits on.
- `pageHeaderV2` §4.5 "the switcher" timed out after ten minutes waiting for `.ws-ms-add`, a sidebar control. This pack does not touch the sidebar. **It was not run against the base, so it is unattributed.**

Other e2e suites were not run. About sixty remain from the shell v2 note; any that pins a header's hairline, the header
sheet on a workspace route, or the Contact list's icon cards will be red.

**Gates on the final tree:** `tsc` 0; `functions` `tsc` 0; Vitest 540 files, 8,351 passed, 3 skipped (baseline: 538 files, 8,337 passed); production and dev builds clean.

## 9. Shots (`reports/header-panel-v2/shots/`)

- `compare-qc-1512.png`, `compare-qc-1280.png`, `compare-cl-1512.png`, `compare-cl-1280.png`: the branch beside its reference.
- `top-<route>-1512.png` and `top-<route>-1280.png` for all ten workspace routes.
- `top-queries-390.png`, `top-agents-390.png`.

## 10. Lift candidates (not lifted)

- **The two badge desks.** `QcDesk` + `qcvDesk135.css` and `ContactDesk` + `contactDeskBadge.css` are one card with two
  class prefixes. D1 measures them against each other.
- **The three own headers.** `QcOpenHeader`, `ContactOpenHeader` and `MsOpenHeader` now share `headerPanel.css` for the
  box, the grid, the buttons, the stamp and the disc, and still keep three sets of title and faces rules.

## 11. For Nick

**Drawings that went into a white disc**
- Query Centre: the courier (`/images/qc/qc-courier-disc.png`, the disc is in the file).
- Manuscripts: its header drawing, in `.hpanel-disc`.
- Submission packages: the archivist, in the shared header's disc.
- Analytics: the disc is drawn and is empty, as it was on the band.

**Drawings that read poorly on the blue**
- Contact list: the hawk is bare. Its grey brush stroke was painted for a light ground and reads as a smudge on the blue.

**No drawing**
- To-do list (its slot is empty), Comparable titles, Discover, Calendar, Noteboard.
- The six desk art slots (three on each badge desk) are placeholders.

New exports drop in by file: the header drawings by their paths, the desk slots by `QC_DESK_ART_*` (`qcArt.ts`) and
`CONTACT_DESK_ART_*` (`ContactOpenHeader.tsx`).

**Things to decide**
1. The Contact list's Profiles card has an empty line where the reference shows "3 since last month". It needs a
   completion history that does not exist.
2. Comparable titles and Submission packages are 6px too wide at 390 (their page grid, not the header).
3. The Query Centre's phone page has no panel.
4. Empty states were not looked at in a browser. They keep the header sheet by unit lock only.
