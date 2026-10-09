# Contact list v15.2 — report (8–9 Oct)

One phase on `main`, on top of v15.1 (`92b0b33b`). Not deployed.

## 1. False premises

1. **The "Coming soon" chip was not hidden below 1440 in the app.** Measured on `92b0b33b` at 1280: the chip was
   100 × 21, `display: inline-block`. The `.nl-h span { display: none }` rule is the mock's own, not the app's.
   The chip is now its own element in its own header, so no rule about the list header's note can reach it, and K7
   holds it visible at both widths. Its mutation hides it the way the mock's rule did, and goes red at 1280.
2. **A month-on-month figure can't go down on today's data.** On file's change is the agents added this calendar
   month; Queried's is the agents first queried in it. The history knows only agents that still exist, so neither
   count falls. The down state (▼, rust) is built and held by unit locks; the page can't show it.
3. **The mock disagrees with the prompt in one place.** The Discover lede computes 14px in the mock; the prompt says
   17px (15.5px). Built to the prompt. The panel is unaffected in height (the card sets the row).
4. **`shell/desk` is not shared with the Query Centre.** Only the Contact list imports it, and the Query Centre's
   stamp and sparkline live in its own files. The v15 ledger card was replaced in place; nothing of the Query
   Centre's was touched.

## 2. Month-end derivations

| Figure | Exists? | Where |
|---|---|---|
| On file, six month-end points | Yes | `lib/contactDesk.ts` `deskModel` → `file.trend` (from `dateAdded`) |
| On file, change since last month | Yes | `deskModel` → `file.mom`; locked equal to the line's last step |
| Queried count and its change | Yes | `deskModel` → `queried` (latest query per agent; first sent date this month) |
| Profile completion now | Yes | Housekeeping's `hkModel`, passed in as `hk` |
| Profile completion at last month's end | **No** | Nothing stores a snapshot. Profiles' month-on-month line is hidden, as v15 hid its stamp |

## 3. Locks retired or re-pointed (`tests/e2e/RETIRED-contact-list-v15.md`)

- **CL15-3** (v15 desk): every reading about the v15 cards. It keeps the three presses. K1–K4 replace the rest.
- **CL15.1 D2** (titles, row gap, heights). K1 replaces it.
- **CL15.1 B2** "band → workspace bar 56": re-pointed to band → banner 56 (48). K8 holds banner → bar.
- **CL15-6**: the two placeholder rows, the old sentence, "panel ≤ 350", "a 46px plus". K6 and K7 replace them.
- Re-pointed for the copy: CL15-1 (button), CL14-5 and CL14-16 (bar title), v12 P1 in `contactV11` (Discover
  navigates), `pageHeaderV2` §4.6 (the secondary button).

## What changed

| Part | Change | Files |
|---|---|---|
| Desk | Three white cards: ink disc breaking out 28 (24) at the top left, one line, month on month, a chart (line, ring, bar). 164 (140) tall. | `lib/contactDesk.ts`, `shell/desk/DeskCard.tsx`, `desk.css`, `ContactDesk.tsx` |
| All queried | Card tucks 44 (36) over the panel. Add card shows a ghost card; the "+" is gone. Panel: plum header and chip, lede, three feature rows, the request button, the bird clipped by the corner. | `ContactNextStep.tsx`, `contactV15.css`, `contactV14.css`, `FeatureStage.tsx` (a `panelClass` prop) |
| Banner | Blush, full sheet width, 136 (112) tall, with the 150 × 34 (120 × 28) arrow. 56 (48) of page above, 76 (64) to the list's bar. | `AgentList.tsx`, `contactV15.css`, `contactV11.css` (grid rows) |
| Copy | "View all agents" scrolls to the list (24 above its bar) and focuses Find. The bar reads "Agents on file". The guide's step is renamed. | `ContactOpenHeader.tsx`, `YourAgentsBar.tsx`, `contactGuide.ts`, `AgentList.tsx` |
| Art | `public/images/contact/discover-binoculars-bird.png` (hash verified). | |

## Locks — `tests/e2e/contactV152.measure.ts`

Red on `92b0b33b`: the desk had no discs, the all-queried state had no ghost, header or bird, and there was no
banner, so K1–K8 failed at their population reading; K9 read `["+ Add an agent", "Discover agents"]`. Each lock was
then broken on purpose; all 26 mutations went red (`mutation-proofs.jsonl`).

| Lock | Green, 1512 / 1280 | Mutation → red reading |
|---|---|---|
| K1 shape | disc 28 / 24 above the card, 44 / 36 under the hairline; ink disc, page-colour halo; no stamp; 164.1 / 140.2 tall | discs inside the card → 0; a stamp added → "stamps 3"; taller padding → 194.1 |
| K2 lines | "37 agents on file", "6 of 37 queried", "3% profiles complete"; 21 / 17px, one line; desk Queried 37 = the section's 37 | line allowed to wrap → not one line |
| K3 month on month | up ▲ `rgb(79, 122, 75)` "4 since last month"; none "No change since last month"; Profiles none | always ▲ → unit and page red; an invented Profiles line → red |
| K4 charts | one path, 6 points, last = 37; arcs 13.51 + 2.70 = 6 / 37; bar 3.0% vs 3%; all `aria-hidden`, labels present | ring from active only → sum short; bar fixed at half → 50% vs 3%; a chart exposed → red |
| K5 tuck | all queried 44.0 / 36.0; ready 150.0 / 130.0 | small tuck everywhere → ready 44; all queried on 150 → 150 |
| K6 ghost | ghost 166 tall, `aria-hidden`, no words, above the title; no "+"; button opens the Add card | "+" restored → 1; ghost given words → red |
| K7 Discover | header `rgb(90, 61, 85)`, the panel's full width; chip 100 × 21 at both widths; exact copy; bird 250 / 196, clipped | chip hidden below 1440 → zero box at 1280; white header; no clip → `overflow visible`; rows restored → 2 |
| K8 banner | exact text; blush to both sheet edges; 56 / 48 of page above; arrow centred, 34 / 28 tall, flush; 76 / 64 to the bar | butted to the band; blush in the column only; arrow clipped; bar at 40 |
| K9 copy | buttons "+ Add an agent", "View all agents"; "Agents on file"; bar 24.0 / 23.9 under the top; caret in Find | old label; old header; lands at 90; no focus |

K3's down branch and the charts' arithmetic are also unit locks: `src/components/shell/desk/deskCard.test.tsx` and
`src/lib/contactDesk.test.ts`.

## Gates

- tsc: 0 errors.
- Vitest: 539 files, 8,452 passed, 3 skipped (baseline 538 files, 8,446).
- Build: exit 0, whole log read: no error and no CSS warning; the standing chunk-size and dynamic-import notes only.
- Design refs: unchanged, 174 checked (the new oracle's hash is in the manifest).
- e2e, one worker, on the v15.2 build: `contactV152`, `contactV151`, `contactV15`, `contactV14`, `contactV13`,
  `contactV11` — 52 tests, all passed on the final build.
- Other routes: `pageHeaderV2` §4.6, `qcV126` QC126-11 and `analyticsV17` AN17-14 passed.

One regression was found by the neighbours and fixed before the commit: **CL13-12 (the loading beat)** read every row
212 (176) higher than it loads, because the placeholder page had no banner. The banner now holds its place while the
page loads, with its words hidden until the data arrives.

## Screenshots

`reports/contact-list-v15-2/shots/`, beside the pack's `screens/`:

| Pack | Built |
|---|---|
| `01-header-and-desk-{1512,1280}.png` | `header-desk-{1512,1280}.png` |
| `02-all-queried-discover-{1512,1280}.png` | `all-queried-discover-{1512,1280}.png` |
| `03-banner-{1512,1280}.png` | `banner-{1512,1280}.png` |
| `04-ready-state-{1512,1280}.png` | `ready-state-{1512,1280}.png` |

Written only with `CL152_SHOTS=1`.

## Open, for Nick

1. The Discover lede: 17px (the prompt) or 14px (the mock)?
2. The Add card's border is still v15's 1.5px dashed with no shadow; the mock draws 1px dashed with the floating
   card's shadow. Not in the prompt, so left alone.
3. The header's "Discover agents" button is gone from the list page; the empty state's secondary button still reads
   "Discover agents" (`ContactEmpty`), which the prompt did not mention.
