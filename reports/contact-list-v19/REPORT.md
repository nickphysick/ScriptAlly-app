# Contact list v19 — report

Pack `cc-prompt-contact-list-v19.md`; the mock and screens are enrolled at `design-refs/contact-list-v19/`. All 27 files
are in `design-refs/.refhashes.json`, and each SHA256 matched the pack's table before anything was built. Branch
`contact-list-v19`.

## False premises

1. **The folder tab is not `rgb(243,242,240)` on this route.** The sheet is `--ink-sheet`, rgb(242,238,232). The tab,
   its fillet and the sheet all read that token. CL19-P2 asserts the tab and the fillet equal the sheet's computed
   background, and asserts the sheet's value.
2. **There was no condensed sticky bar on the base.** `git grep` of `d06446e8` finds none. Part A retired what did
   exist:
   - the old list bar, `.cl18-lh` (the "Showing all N agents · Grouped by …" sentence, its own Find, the density toggle
     and the circle pin);
   - the A to Z tabs above the hero.

   CL19-P2 still asserts that only the toolbar and the headings (plus the shell's own 12px sheet lip) are held at the
   scroll area's top.
3. **There was no list footer.** "That's everyone…" never rendered. The only thing below the list was `AppFooter`,
   which Part A took off `/agents`. Part I's one change is that a short list's card now reaches the bottom of the page.
4. **The FLIP never ran on filter changes.** The base reflowed the list on filter, group, sort and Find changes with
   v14's `useReflow`, which Part H retired. The FLIP after a save (`lib/flip.ts`) is not a list change, so it stays.
5. **"Ready to query" follows the pack's definition, not `isReady`:** not queried AND open to submissions. v15's
   `isReady` also requires the genres to fit (or be unknown). Picking Ready to query also selects Open to submissions,
   and the applied row shows it as two chips.
6. **Literal parity conflicts with Part C's type step at 1280.** The unpinned card is 48px narrower, so it steps the
   Date added, Website and Email type down once more (14 against 14.5). CL19-P1 holds those three to each position's
   own fitted size and keeps every other property identical.
7. **Date added needed no migration.** It reads the required `Agent.dateAdded`; 0 of 52 agents on the harness account
   lack it, and nothing is backfilled. A missing or unreadable date renders an empty cell, never an invented one.
8. **Priority exists:** it is `Agent.starRating` (groups "5 stars" down to "1 star", then "Not rated").
9. **Grouping already defaulted to "none"** on the base.
10. **Where the mock styles the two positions differently, the build keeps one look.** For example, the mock's pinned
    letters are 18px wide against 21 unpinned. Parity is the pack's rule. The mock's counts are invented and
    inconsistent, and none are copied.
11. **"Not queried" has no StatusDot glyph**, because it is not a query status. Its mark is the mock's dotted ring.
    Every real status, including in the group bands and the filter menu, uses StatusDot.
12. **The headings are all at 85% ink, as the pack says;** the mock shows the inactive ones at 50%. Also, the pack says
    the Agent column takes the slack, while the mock spreads it across the gaps; the build follows the pack.
13. **The guide's "open" step and a still pointer.** With six checklist items, the "open" item's spotlight sits over
    the first row. A pointer left there opens that row's strip after the 450ms wait. CL18.3 F2 now moves the pointer
    off first.

## Base

`d06446e8`, the tip of `dev/…-cl1833-cx28-qhnet-td52-dv1-qc139-dv1b`, which dev served as `index-B4WIr-Ea.js`
(reproduced byte for byte by a local build). It carries v18.3.3. Baseline gates: tsc and the build clean, Vitest 9090
passed, with only `functions/src/email.test.ts` red (known).

## Per part

| Part | Commit | What changed |
|---|---|---|
| A | `f556d23c` | One list in two positions (`ContactListHead`). Pinned: navy band (66px) with the art, "N agents", Not queried · Querying · Closed, "your move", List health and "+ Add an agent"; the active tab turns navy with a 14px inverted corner. Unpinned: white list card 22px under the hero, square bottom corners, cream tab. Retired: the old list bar `.cl18-lh`, the hero's A to Z tabs, the density toggle; `AppFooter` left `/agents`. The pin no longer collapses the sidebar (`usePinList` gained `holdSidebar`; the Query Centre and To-do are unchanged). View transition on pin and unpin. |
| B | `534d2921` | The toolbar: 52px, A to Z jumps and follows the scroll, the controls on the right, and a give-way pass (`data-fit`) that keeps it on one row. At ≤1440 Find folds to an icon and opens to 240px over the letters. |
| C (+J) | `a9deb108` | Columns: Agent · Date added · Website · Email (or "Website and email" stacked) · Replies · Query status. Widths are measured (`lib/contactColumns.ts`). Website and email are never shortened, and the type steps down 0.5px to no lower than 12px. The email copies, with "✓ Copied" for 1400ms. Headings sort (↓/↑/⇅); a new "added" sort. Margin letters retired. |
| D | `543afc80` | The open row is one powder strip: genres, a divider, the wishlist (it ends in "…" and scrolls on hover). The social handle and the next step leave the row. `lib/rowActions.ts` is deleted. v18.3.3's "always closes" behaviour is kept, and CL1833-E5 stays green. |
| E | `e07fbc78` | The Group by applied chip with its own ✕, which returns the list to ungrouped and leaves the sort alone. Menu: Letter, Status, Action required, Country, Priority, No grouping. 50px strong bands (Letter uses the same band, with no mark). The jump row, with "+N more". |
| F | `3062a796` | The Filters chip, the layout-A menu (640px, navy header, four quick picks, the status and submissions columns, genres) and the applied row. Every choice shows its live count, and a choice that would give zero is disabled. The v14–v18 strip and panels are retired. `quietScroll()` keeps a scroll the page makes itself from closing a popover. |
| G | `7da28aec` | Per device in localStorage `qh.cl.view`: group, sort, direction, pinned. For the visit in sessionStorage `sa.contactList.v5`: filters, search, glance group, scroll. The old pin keys (`sa.pinList.agents`, `sa.contactsFull`) are migrated once, then removed. The skeleton matches the loaded heights. |
| H | `c8c7cad6` | One arrival for every list change: built before the first paint, rows arriving top-down with a 24ms stagger (capped at 18), bands fading only. Hover is held until the pointer moves. `useReflow` is retired. |
| I | `04aa09db` | No footer existed to remove; a short list's card now reaches the bottom of the page. |
| K | `8a2e81d9` | "Pin the list" is the third of six checklist items. It ticks when the pin goes from off to on while the page is on screen. No rules change was needed: `todoPrefs` leaves are not individually allowlisted. |
| Locks | `649ffb68` | The CL19 locks, retirements, references and shots. |
| Fixes | (this commit) | The two open items found by L1; see below. |

## Locks (CL19, `tests/e2e/contactV19.measure.ts`)

Each lock was measured red on the base build (`CL19_BASE=1`, a preview of the base's `dist` on :4852), red under its
named mutation (`CL19_MUTATE=<lock>`), and then green on this branch's build. C2, C3, F1 and G1 are mutated in `src`,
from path-derived backups in `/tmp/mut19/`; C3's mutation removes both click guards (the email's `stopPropagation` and
the row's `closest` check).

| Lock | Base | Mutation | Green |
|---|---|---|---|
| P1 parity | 100/124 (no pin) | 234/236 (Group by 15.5 vs 14.5) | 236/236 |
| P2 unpinned shell | 10/30 (hero, old bars) | 26/30 (navy tab) | 30/30 |
| P3 pinned band | 0/12 | 8/10 (letter 444 vs count 434) | 10/10 |
| T1 never wraps | 0/68 | 44/52 (toolbar 35, wraps) | 52/52 |
| C1 columns | 8/13 (What they want column) | 17/73 (email truncated) | 73/73 |
| C2 date sort | 4/22 | 10/18 (oldest first) | 18/18 |
| C3 copy | 0/2 | 16/18 (the card opens) | 18/18 |
| D1 strip | 1/17 | 39/67 (social handle back) | 67/67 |
| E1 grouping | 10/22 | 44/50 (✕ leaves bands) | 50/50 |
| E2 jump row | 3/14 | 26/32 (a button cut off) | 28/28 |
| F1 filter menu | 8/40 | 50/54 (Open pick 48 ≠ 4) | 54/54 |
| G1 memory | 4/38 | 19/26 (a new visit still filtered) | 26/26 |
| H1 arrival | 0/4 | 4/25 (a row changed after the first frame) | 8/8 |
| I1 end | 0/40 | 22/34 (footer present) | 34/34 |

Green total: 704/704.

How some of the locks work:
- **F1:** compares each quick pick with a direct read of Firestore, derived with the app's own `courtOf` and
  `isYourMove` and scoped by `resolveScopedManuscript`.
- **G1:** opens the new visit in a second tab.
- **H1:** compares every on-screen row and band at the first frame after a regroup (by Status, and by Country) with
  the same rows and bands 1000ms later.
- **I1:** checks a long list and a one-agent list, pinned and unpinned.
- **E2:** enters "+N more" while pinned, grouped by Status, with Open to submissions on, at 1280. Unpinned at 1280, all
  eight status groups fit.

## L1 (each file run alone on this branch's build; reds compared against the base build)

| Suite | Result |
|---|---|
| contactV183 | Green after the retirements and re-points below; CL1833-E5 18/18. |
| contactV18 | Green. |
| contactV17 | Only FS1 is red, as it already was on the base. It also fails one extra reading ("sidebar at its icons"); that is deliberate, because the v19 pin no longer collapses the sidebar. |
| contactV16 | C3 and F7 are red on the base too (pre-existing). F1 was red on this branch: fixed (open item 1). |
| qcV138 | A2 failed once in the full run (a Query Centre guide note intercepted a click); it passes alone and on the base. |
| qcV1381 | Green. |
| qcV1382 | D1 is red on the base too (pre-existing). |
| qcV1383 | Green. |
| qcV1384 | Green. |
| qcV1385 | Green after re-pointing A1. |
| qcV1386 | Green after the re-points, A2 included (open item 2). |

## Open items found by L1, both resolved in this commit

1. **A selected row lost its tint while hovered or open (CL16 F1).** The v19 hover and open rules set white or `#fdfbf8`
   over the selected row's `#f7f3ed`. Those rules now skip `[aria-current="true"]`, and the selected row states its
   tint and ink edge itself. CL16 F1 is green, and CL19-D1 (an open row's background doesn't change) stays 67/67.
2. **"The first Escape does not close the agent panel" was the lock, not the app (QC138.6 A2).** The lock clicked the
   row's centre. In v19 that centre holds the Website/Email cell, whose "Add website" opens the editor with focus in a
   field, and the first Escape leaves the field. Opening the row by its name, Escape closes the panel on the first
   press, as on the base. The lock now clicks the name. It is green.

## Retirements and re-points

- **Retired (tests, mutations and every ledger variant deleted):**
  - CL183 B2, C1, CL1833-E1, E2, E3, E4 and E1. E4 tested the email pill on the details line, which is gone; the
    email now has its own column, and CL19-C3 holds the copy.
  - CL18 A1, A2, B1, B2 and C1 (the old list bar, the old letter tabs, the old filter strip and density control).
  - CL16 E2, as a `test.skip`: full screen is retired, and pinning replaces it.
- **Re-pointed, with the claim unchanged:**
  - CL183 A4, E3, F1, F2 and F4.
  - CL18 A3.
  - CL17 D1.
  - CL16 C3.
  - QC138.5 A1.
  - QC138.6's page definitions, A1, A2 (agent panel; Query Centre part unchanged), A3, A5 and B1/C1.

Each re-point carries its one-line reason in the code.

## Shots

`reports/contact-list-v19/shots/` holds one image beside each `screens/*` file, at the same size and state: 26 PNGs at
2×, from this branch's build on the harness account. Names and counts therefore differ from the mock's invented data.

## Deploy

_Filled in below by the deploying session._
