# Contact list v18: letter tabs at the top, a slate list header, the row peek, the paper card, and Housekeeping rebuilt

Branch `contact-list-v18`, in its own worktree, cut from **`main` at `30439920`**. One commit per part, A to F, then G
for the locks and this report. Not merged to `main`.

## 1. False premises, deviations, and differences from the mock

**Premises that the code does not match.**

1. **"Base: the branch dev serves, once v17 and v17.1 are deployed there."** The `dev/…` integration branches no longer
   exist: they were merged into `main` and deleted. Dev serves `index-HLaL39lM.js`, which is the To-do list v5 deploy, and
   that commit's `src/` is identical to `main` at `30439920`. `main` carries v17.1 (its centred header, the List health
   ring and the dismissable tab), so it was the base. A To-do v5.1 session is working in its own worktree on top of
   `main`, uncommitted and unpushed; this branch does not include it.
2. **"Responses RS1."** No lock of that name exists. The Responses page landed on `main` as Responses v2, whose locks are
   `rs2.measure.ts`; L1 runs those in its place.
3. **"Retire `IndexCard` here only if nothing else uses it."** There is no `IndexCard` component. The panel's index card
   was inline markup (`apn-index`); its styles stay because the empty page's example agent still wears them. The two
   lib derivations that fed the old Profile tab (`panelStand`, `panelIndex`) are now used only by their unit tests; they
   are left in place and reported here rather than deleted (§9).
4. **Fields the peek asks for that the agent record does not hold (§0.3):** "Not for them" (exclusions), and a
   submission-form or QueryManager address. They are left out of the peek, not shown as gaps. "Query via" names the
   method ("By email", "Through their submission form") and links nothing.
5. **"Use the existing controls and option lists … materials and genres: multi-select chips."** The existing control for
   materials is `MaterialsField`, the agent card's own (rows with a tick and an amount), not a row of chips. The focus
   view uses it as it is. Genres and reopening dates are chips, as asked.
6. **The mock's Filters panel draws the four pills inside it**, where the prompt specifies five sections holding each
   menu's contents. The prompt's version is built.

**Deviations, each with its reason.**

7. **The drawer's box.** The mock starts the drawer at the page sheet's top edge. The app publishes the sheet's right and
   bottom offsets but not its top, so the drawer keeps the shared drawers' 8px top inset and sits flush to the sheet's
   right edge with the 18px left corners.
8. **A reply-time answer starts empty ("Not set").** The old drawer started the stepper at the colleagues' average or 6.
   Save is disabled until there is an answer, so the first press of − or + sets that same starting value and enables
   it. Nothing is answered for the writer.
9. **The "+n" pops float once the save has landed.** The pack orders it that way ("writes through the existing save
   path, then …"). The write is a Firestore round trip, so the pops appear a few hundred ms after the press; lock F5
   times its 400ms from the save landing.
10. **The ring's pop starts 20px above the ring**, so it rises clear of the drawer's top edge (the save's pop starts
    30px above the button, as asked).
11. **Kept from the old drawer, not mentioned in the pack:** the wishlist check-in (its card and its one-at-a-time
    session) and the "{n} put off until …" line with "Show them now". Both are on home. Dropping them would have
    removed working features.
12. **The key sheet** (the keyboard-shortcut popover beside the density toggle) has no place in the slate header and
    is retired with `ContactBarExtras`.
13. **The sentence's group name reads "A to Z" whenever the list is ungrouped**, as asked, even when a column heading
    sorts it another way.
14. **"You've queried them"** reads Housekeeping's `live` (any live query on any manuscript), the only queried fact on
    a Housekeeping item.
15. **At zero visible gaps with some put off with Later**, the score is below 100 (those details are still missing),
    so the page ring's line reads "Some put off for later" rather than "All filled in". This copy is mine.

## 2. Base and gates

Base `30439920`. Baseline there: `tsc` 0; both builds exit 0; Vitest 8,843 passed, 3 skipped, one file failing to
load (`functions/src/email.test.ts`). On the branch's tip: `tsc` 0; both builds exit 0 (the chunk-size note is the
one warning); Vitest 8,849 passed, 3 skipped, the same one file failing to load. No worse than baseline. The dev-only
review aid (`__SA_HK_ALL_FILLED`) is absent from the production bundle (grepped).

## 3. §0

1. **The letter tabs and the jump.** v17's `ContactIndexStrip` sat inside the list sheet (with an "All · N" tab); the
   jump was `pickLetter` + `landUnder` in `AgentList` (the band under letter grouping, the first row otherwise, after
   switching to letter grouping from any other). The spy marked only under letter grouping. v18 reuses `landUnder` for
   the correction and moves the strip; the strip component is deleted.
2. **Filter state.** One `useState<ContactFilters>` in `AgentList`, remembered in `sessionStorage`
   (`sa.contactList.v4`). The pills (`ContactFilterStrip`) drive it through `onFilters`. The Filters panel drives the
   same state: each menu's contents became one component that both render.
3. **Agent fields for the peek:**

   | Peek field | On the record | Name |
   |---|---|---|
   | Email | yes | `email` |
   | Website | yes | `website` |
   | Social handle | yes | `socials[]`, mirrored in `twitter` / `bluesky` / `instagram` |
   | How they take queries | yes, as a method only | `submissionMethod` (no form or QueryManager address) |
   | Not for them | **no** | — |
   | Reply policy | yes | `noResponseMeansNo` (true: no reply means no; false: replies to every query) |
   | Your notes | yes | the `notes` subcollection, cached as `notePreview` |
   | The wishlist's source | yes | `fieldSources.mswlNotes.source` |

4. **Gap rules.** `agentGaps` in `src/lib/contactHousekeeping.ts` decides each gap (reply, materials, genres, wishlist,
   reopen); `hkModel` orders them by `gapScore` (live first, then fit, then the detail's weight), then name, then the
   table order. The points, the drawer and the queue all read that model.
5. **Save paths.** Every field saves through the page's `onHkFix`: reply time, materials, genres and wishlist through
   `writeFix` (the agent card's own save path, `lib/agentCardSave`, with its snapshot Undo); "They don't say" through
   `settledPath` in the prefs store; the reopening reminder through `addUserTask` (Undo deletes it). Every field has
   one.
6. **The landing card.** `public/images/home-for-your-agents.png` is a static image; nothing renders it as a
   component. `AgentPaperCard` is new.
7. **Per-user UI flags.** v17.1 saved the tab's dismissal at `todoPrefs.contacts.tabDismissedAtGaps`. The intro's flag
   is `todoPrefs.contacts.hkIntroSeen` beside it (no rules change: `todoPrefs` is an unconstrained map).
8. **Neither stop condition applied.**

## 4. What was built

| Part | Commit | What |
|---|---|---|
| A | `704dd9e2` | The letter tabs at the top; compact letters in the pinned row; the switch to A to Z; one per-frame reader. |
| B | `f6b27b0b` | The slate list header and its sentence; the Filters panel over the pills' own option components; the Query Centre's headings strip. |
| C | `4afcdb63` | The dotted not-queried disc in the rows. |
| D | `b99dd609` | The row peek. |
| E | `e88a9749` | `AgentPaperCard`; the panel's status masthead and plain Profile card. |
| F | `7c413a86` | The points score; the rebuilt Housekeeping drawer (intro, home, focus, the pops). |
| G | this commit | The locks, the seeder for the flags, the ring pop's start, retirements, CLAUDE.md, this report. |

## 5. Locks: red first, then green

`tests/e2e/contactV18.measure.ts`, at 1512 × 900 and 1280 × 800 with the shell (E1 and F1–F5 at 1512), one worker.
"Base" is the lock run against `main` at `30439920` (`CL18_BASE=1`). "Mutation" is the named break: in the page,
or (marked *src*) a source edit made and undone in the measurement worktree.

| Lock | Green | Base (red) | Mutation (red) |
|---|---|---|---|
| A1 strip | 8/8 | timed out: no list header to search in | counts held from the unfiltered list: "B:3/1 E:1/0 …" |
| A2 jump | 8/8 | timed out: no top letter tabs | *src* skip the switch: "grouped by Status" stays, M lands 2,000px off |
| A3 spy | 6/6 | 4/6: no current letter on either strip (601 misses) | an interval re-setting `top`: "2 boxes" |
| B1 header | 10/10 | timed out: no Filters button | the filter row left in the page header: "1" |
| B2 filters | 10/10 | timed out: no Filters button | *src* the panel's own state: "33 of 37 … either" |
| C1 headings | 6/6 | 4/6: the strip is white | the strip inset: "314–1438 vs 272–1480" |
| C2 disc | 4/4 | 0/4: cream fill, solid | the cream fill restored |
| D1 peek | 8/8 | timed out: no peek | *src* clicks bubble: "1 panel(s)" |
| E1 card | 8/8 | timed out: no intro | the frame drawn inside the panel's card: "frame true" ×3 |
| F1 score | 5/5 | 0/3: ring "3", no tab or drawer figure | *src* the ring from complete agents: "3 · 75 · 75" |
| F2 intro | 6/6 | timed out: no intro | *src* the flag kept in component state: "hkIntroSeen null" |
| F3 home | 10/10 | timed out: no home | *src* runs counted against the queue: "42 of 49 (run of 8)" |
| F4 focus | 7/7 | timed out: no focus | *src* the save path bypassed: no saved line, "Not stated → Not stated" |
| F5 pop | 6/6 | timed out: no Save | the pop drawn inside the drawer's body: "absolute", clipped |

Unit: `listHealth.test.ts` (6 cases, including the 41-agent fixture with closed agents and "a reply time adds exactly
6"); `contactHealth.test.ts` moved to the points share.

**What writes, and is put back.** F1 and F5 save a reply time and Undo it; F4 does the same through a run. F2 and E1
clear the intro's flag (`tests/e2e/hkFlags.mjs --clear`) and leave it set, as it was before the run.

**Two faults the regression run found in my own build, fixed in Part G.**
- **The page guide's second step rang the filter row**, which v18 removed, so it pointed at nothing. It now rings the
  list's slate header, and its words say "open Filters".
- **Opening a row left its peek open**, so the selected row wore the peek's tint. Opening the agent now closes the
  peek (and any peek still waiting to open).

**L1, the regression set, on the v18 build (one worker).** CL17 and CL17-amend (with the edits in §6), CL16 less the
earlier retirements, v11, v13, v14, v15 to v15.3, QC 138 to 138.4, Responses (`rs2`) and header v3.
- **Green:** CL18 (15/15), CL17, CL17-amend, CL16, v11, v13, v15 to v15.3, QC 138, 138.1, 138.3, 138.4, Responses
  `rs2`, header v3.
- **Red, and red on the base build too (`main` at `30439920`), so not v18:**
  - CL14-11's two readings that expect the pinned row's old 68px: the "Pinned rows" pass on `main` made the row the
    sheet's cover plus 64 (76 here). Measured red against the base: `top 76px`.
  - QC 138.2 C1 ("your send-by date is today", a date-dependent fixture) and D1 (a card's motion at 100ms). Both red
    against the base the same way.

## 6. Retired and re-pointed locks

`tests/e2e/RETIRED-contact-list-v18.md` has the full table. In short:
- **Retired:** v11 §10.2; v13 CL13-9, CL13-HK, CL13-HKW, CL13-13; v14 CL14-7, -8, -9, -10 and the marquee readings
  in CL14-11 and CL14-15; v16 C4, F2, F3 and F7's two stand-card readings; v17 B1, E1, E2, E3 and D1's cream-disc
  reading; v17.1 B3 (the pct formula: F1 replaces it), C2, and A4's filter-row reading.
- **Re-pointed:** CL13-12; CL14-11, -14, -15, -16; v16 C3; v17 C1, D1, FS1; v17.1 D1 and D2 (D2 now drives the count
  through Focus's "They don't say" and `hkFlags.mjs --unsettle`, since the new drawer has no per-row Later); QC 138 J1
  (a not-queried disc in `/agents`' rows is a dotted ring with no fill).
- **The marquee:** the wishlist's scrolling preview starts 500ms into a hover and the peek opens at 450ms and stills
  it, so on a pointer hover it no longer runs. The peek shows the whole wishlist instead.
- **"Later" is gone from the drawer.** The old per-row "Later" (hide for 30 days) has no place in the new drawer;
  items put off earlier still come back on their own, and home says so with "Show them now".

## 7. Shots

In `shots/`, beside each `design-refs/contact-list-v18/screens/` file, plus `/agents` at 1920 and 1024, the Filters
panel with two filters set, a peek for an agent with missing fields, and the drawer's By agent view at 1280.
**Not shot:** `11-hk-complete` (the complete screen). It needs every gap on the account filled, and the account has 46;
the screen is reached only by finishing the last task, so it is held by code and not by a picture.

## 8. Integration and deploy

Before deploying, dev served `index-HLaL39lM.js` (the To-do list v5 deploy, whose `src/` is `main` at `30439920`), and
`main` had not moved. v18 was cut from that commit, so the new integration branch **`dev/main-cl18`** (off `main`,
with v18 merged in) is a fast-forward: no conflicts, and the tree is the one the gates and the locks ran on.

Built from a clean checkout of the pushed tip with `npm run build:dev` and deployed with
`firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`. **Dev serves `index-CGTPomg3.js`**
(stylesheet `index-BWQq-97C.css`). Not merged to `main`; prod untouched; no rules or functions changed.

## 9. For Nick

- **Fields left out of the peek because the record has none:** "Not for them" (exclusions), and a submission-form or
  QueryManager address (so "Query via" names the method and links nothing). Each is a model field and a prod rules
  change.
- **Housekeeping fields without a save path:** none. Every question saves through the page's existing `onFix`.
- **List health on the harness account:** 75% under points (503 of 674; 49 gaps), against 3% under v17.1's share of
  agents with no gaps (1 of 37). **Your real data is in prod, which I cannot read**, so "before and after" on it needs
  you; the same account-wide shift is expected (a list with a few gaps per agent moves from near 0 to the 70s).
- **Now unused, left in place:** `panelStand` and `panelIndex` in `src/lib/agentPanel.ts` (only their tests read them),
  and `ContactFilterStrip`'s pills (as the pack asked).
- **Copy that is this build's:** "Some put off for later" (the page ring at zero visible gaps with some put off), the
  reply stepper's "Not set", and the "How points work" table's row names.
