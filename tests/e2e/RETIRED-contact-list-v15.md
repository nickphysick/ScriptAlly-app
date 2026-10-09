# Retired by Contact list v15

Each entry names what retired, why, and where its claim lives now (if anywhere).

## Phase 1 — the open header (v15 §2)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV13.measure.ts` | CL13-1 · band | The band (v14's compact hero card, its disc, its living sentence) is replaced by the page-local open header | CL15-1 (header), CL15-2 (headroom) |
| `contactV13.measure.ts` | CL13-2 · rhythm (band → strip → next-step section) | The band is gone; the rhythm under the header is the desk's and the section's | CL14-1 for now; the v15 desk and section locks (Phases 2 and 4) |
| `livingHeadersV3.measure.ts` | the Contact list's row in `PAGES` (LH1–LH7 for `/agents`) | The populated header is no longer a living header: the count is the title and the line is fixed | CL15-1. The **empty** state still draws the shared living header and is held by contactV13 CL13-14 |
| `livingHeadersV3.measure.ts` | LH9 · the Contact list filtered to nothing keeps its hero | The same | CL14-14 (the dead end) |
| `src/lib/livingHeaders.test.ts` | "the Contact list's two lines", and the Contact list's rows in LH9 and LH12 | `contactHeaderCopy` is deleted with the header it fed | — |
| `src/lib/contactList.test.ts` | "the facts sentence" | `heroFacts` is deleted; its one reader was the living header | — |

**Repointed, not retired:** CL13-12 (the loading header is the open header), CL14-1 (the header is v15's open header, not v131's card), `pageHeaderV2` §4 / §4.4 / §4.6 and `quietBar` Q8 (`/agents` is in the new `OWN_HEADER_ROUTES` register, exempt by name; §4.6's add door reads the header's own buttons).

**Deleted (their only reader was the band):** `CONTACT_BAND_DISC`, the `.clv-bdisc` rules, `contactHeaderCopy` / `ContactCopyContext` (`lib/livingHeaders`), `heroFacts` / `HeroFacts` (`lib/contactList`). `/images/contact-archivist.png` stays: the marketing Contact page reads it.

## Phase 2 — the desk (v15 §3)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV13.measure.ts` | CL13-S · the numbers strip | The five-cell strip is replaced by the desk of three cards | CL15-3 (desk) |
| `contactV14.measure.ts` | CL14-2 · the strip's figures are inert | The strip is gone. On file is inert; Queried and Profiles complete are pressable by design | CL15-3 (On file changes nothing; Queried filters to its figure; Profiles opens Housekeeping) |
| `src/components/agents/contact/contactStrip.test.tsx` | the whole file | `ContactStrip` is deleted | `src/lib/contactDesk.test.ts` |
| `src/lib/contactStrip.test.ts` | the `stripFacts` cases | `stripFacts` / `StripFacts` are deleted with the strip | `src/lib/contactDesk.test.ts`. The `statedWeeks` and `fitsGenre` cases stay |

**Repointed, not retired:** CL14-1 and CL14-5 (the strip's place in the rhythm is the desk's), CL14-16 (guide step 1 rings the desk, with Nick's wording), CL13-12 / CL13-13 / CL13-14 (the loading beat and the empty state read the desk).

**Deleted:** `ContactStrip.tsx`, `stripFacts` / `StripFacts` and their helpers (`lib/contactStrip`), the strip's rules in `contactV13.css`.

## Phase 3 — one ready rule, three states (v15 §4)

| Suite | Case | Why | Now |
|---|---|---|---|
| `src/components/agents/contact/contactNextStep.test.tsx` | "gaps: title, copy, the first agent without genres as the card…" | v14's fourth state is retired: an agent with no genres recorded is ready now | lock 7 in the same file (the fixture that drew it is Ready; neither the lib nor the component names the state) |
| `src/components/agents/contact/contactNextStep.test.tsx` | the v14 copy in the ready, reopening and done cases (the "who take {genres}" sentences, the progress line, the ordering note, "Every agent queried") | §4 and §5 replace the copy; the progress bar and the ordering note are gone | the three-state cases in the same file |
| `src/components/agents/contact/contactNextStep.test.tsx` | "off: the reopening and gaps feet are hidden", "on: the reopening foot and the gaps foot return" | the gaps foot went with its state | the reopening foot is held in both Discover branches |
| `src/lib/contactNextStep.test.ts` | the gaps-state cases and the takers-only progress figures (`takers`, `sent`, `outcomes.more`) | the lib returns the v15 accounting (`total`, `queried`, `mismatches`, `closed`, four outcomes) | lock 4 and the accounting cases in the same file |

**Repointed, not retired:** CL14-9 and `cl13Lib.openContacts` (the memory key is `sa.contactList.v3`; a v2 value is an older shape and is refused). CL14-6 stands unchanged: the ready pill's number is still the rows it leaves, now through the ready-only mode.

**Deleted:** the `gaps` state and its copy, the progress bar (`.cl14-nx-prog`, `.cl14-nx-bar`), `READY_FILTERS` (the pill's genre-filter set).

## Phase 4 — the section's layout (v15 §4a)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV14.measure.ts` | CL14-1 "the next-step section … 44 (±1) under it" and "the workspace … 56 (±2) under it" | The section's gaps are the feature stage's, to its panel: 66 and 58 (56 and 50 below 1440) | CL15-5a. CL14-1 keeps the order |
| `contactV14.measure.ts` | CL14-3 "the frame's bottom is 22 (±2) below the card's", "no space under the card", "the card is 318 wide at 1512, 290 at 1280" | The white frame and its powder well are gone; the card is 300 / 270, vertically centred over the panel's left edge | CL15-5a |
| `contactV14.measure.ts` | CL14-3 "a Next-in-line row's Log a query opens the journey" | A row picks its agent onto the card; rows carry no action of their own | CL15-5a (the pick); CL14-3 "the card's Log a query opens the journey" |

**Deleted:** the v14 frame, well, side column and ledger-row rules (`.cl14-nx`, `.cl14-nx-well`, `.cl14-nx-lede`, `.cl14-nx-why`, `.cl14-nx-side`, `.cl14-nl*`, `.cl14-more`, the `cl14next` container), and the per-row writer's stars and wishlist line they drew.

## Phase 5 — all queried (v15 §4)

| Suite | Case | Why | Now |
|---|---|---|---|
| `src/components/agents/contact/contactNextStep.test.tsx` | "off: the all-queried state has no Discover list or link…" (the empty side) | While Discover is off the panel is the coming-soon panel, not empty | "off: the all-queried panel is the coming-soon panel…" and "off: the request button reads as set once asked for" in the same file; CL15-6 on the rendered page |

## v15.1 — spacing, the hawk on the rule, the band, the footer (8 Oct)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV15.measure.ts` | CL15-1 "the drawing starts 56 (36) after the text block" | The drawing sits at the content column's right edge; the gap is a minimum, and on the harness account it is 44 at 1512 (see the report) | CL15.1 H2 |
| `contactV15.measure.ts` | CL15-1 "the drawing is 400 / 310 wide" | 490 / 380 | CL15.1 H1 |
| `contactV15.measure.ts` | CL15-1 "the hairline: 1px ink at 12%" | 14%; re-pointed in place, not removed | CL15-1 (14%), CL15.1 H3 |
| `contactV15.measure.ts` | CL15-2 "the drawing's top is 8px or more below the top bar" (the whole lock) | The header has no top margin; the drawing's drop is the headroom | CL15.1 H5 |
| `contactV15.measure.ts` | CL15-3 "every card is 200 / 186 tall or less" | 212 / 194, with 16 (12) under the header row | CL15.1 D2 |
| `contactV15.measure.ts` | CL15-3 "the desk is 28 (±1) under the header's hairline" | 72 / 60 | CL15.1 D1 |
| `contactV15.measure.ts` | CL15-5a "the desk-to-panel gap is 66 (56)" and "the panel-to-workspace gap is 58 (50)" | The section sits on a band; the gaps are the band's | CL15.1 B2 |
| `analyticsV17.measure.ts` | AN17-14 "the footer's top rule spans the main column" | The shared footer has no ground; its one hairline runs the content column, on the inner wrapper | CL15.1 F1 (measured on `/queries/analytics` too) |

## v15.2 — icon desk cards, Discover in plum, the ghost Add card, the banner (8 Oct)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV15.measure.ts` | CL15-3, everything about the v15 CARDS: the three titles, ink titles, the weekly bars, the striped progress bar, the stamps and their inner rule, the two-row lists, "no row repeats its stamp", "On file's figure is the header's count" | The desk is three icon cards: a disc, one line, a month-on-month line, a small chart | CL15.2 K1–K4. CL15-3 keeps the three PRESSES |
| `contactV151.measure.ts` | D2 "card titles are Special Elite 16 / 14", "the header row to the body row is 16 (12)", "every card is 212 / 194 tall or less" | The cards have no title row; they are 165 / 141 tall | CL15.2 K1 |
| `contactV151.measure.ts` | B2 "the band's bottom to the workspace bar is 56" | A banner sits between them; re-pointed in place, not removed: band → banner is 56 (48) | CL15.1 B2 (re-pointed), CL15.2 K8 (banner → bar 76 / 64) |
| `contactV15.measure.ts` | CL15-6 "the panel is Discover, coming soon: the heading, the pill, the sentence, two nameless rows" and "the panel is no taller than 350 at 1512" | The panel has a plum header strip, three feature rows and the bird; the placeholder rows are gone | CL15.2 K7 |
| `contactV15.measure.ts` | CL15-6 "the Add an agent card … tightened (20 22 18, a 46px plus)" | A ghost card replaced the plus; the reading keeps "solid white with a dashed ring" | CL15.2 K6 |
| `contactV15.measure.ts` | CL15-1 "the two buttons: + Add an agent · Discover agents" | The second button is "View all agents"; re-pointed in place | CL15-1 (re-pointed), CL15.2 K9 |
| `contactV14.measure.ts` | CL14-5 "'Your agents'", and the guide's "Your agents" step title | The bar reads "Agents on file"; re-pointed in place | CL14-5, CL14-16 (re-pointed), CL15.2 K9 |
| `contactV11.measure.ts` | v12 P1 "Discover navigates" | The header's second button stays on the page; re-pointed to assert that | CL15.2 K9 |
| `pageHeaderV2.measure.ts` | §4.6 "the secondary is Discover" | Re-pointed to "View all agents" | CL15.2 K9 |


## v15.3 — the hero number, the agent faces, "added this week" (9 Oct)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV152.measure.ts` | K2 "the lines: 'N agents on file' …" (the On file row) and "On file's figure is the header's count" | The count on file is the header's hero number; the first desk card is about this week | CL15.3 N6 (the line), N1 (the count) |
| `contactV152.measure.ts` | K3, On file's month-on-month line | The week card compares with last WEEK | CL15.3 N6; K3 keeps Queried and Profiles |
| `contactV152.measure.ts` | K4 "On file is ONE line path of 6 points", its "{month} → now" caption and its "on file" label | 8 weekly bars, captioned "added per week" | CL15.3 N6 |
| `contactV152.measure.ts` | K4, the ring's pale-blue closed arc (`#9fb0c4`; never asserted on the page, held in `deskCard.test.tsx`) | Closed is grey on this page | CL15.3 N3, `deskCard.test.tsx` |
| `contactV151.measure.ts` | H5 "the drawing's top is 30 / 24 below the sheet's top" | The header has 30px of top padding above the drop; re-pointed in place to 60 / 54 | CL15.1 H5 (re-pointed) |
| `contactV151.measure.ts` | H4 "the header is no taller than the drawing's layout box plus 14" | The same padding; re-pointed in place to plus 44 | CL15.1 H4 (re-pointed) |
| `contactV15.measure.ts` | CL15-1 "the title is Special Elite at 72 / 58" | The h1 carries the words' size, 42 / 34; re-pointed in place | CL15-1 (re-pointed), CL15.3 N1 (the figure, 124 / 98) |
| `deskCard.test.tsx` | "the line is ONE path through every value" | `LineChart` is deleted with its only caller | "the weekly bars …" in the same file |
| `contactDesk.test.ts` | "On file: the line …" and "On file's line is six month-end points" | The model has no `file` card | the three week-card cases in the same file |
