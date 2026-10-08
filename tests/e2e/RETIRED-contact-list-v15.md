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
