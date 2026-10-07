# Query Centre v131.1: the desk becomes three ledger cards

**Reference:** `design-refs/desk-ledger-v6.html` (`body[data-sub=tile]`), plus two PNGs in `design-refs/qc-v131-1/`. All three SHA256s match the brief, and all three are enrolled in the hash manifest.

**Branch and worktree:** branch `qc-v131-1` off `origin/main` at `847b5f31` (the v131 desk), in worktree `/tmp/sa-qc1311`.

**Status:** deployed to dev; not merged.

**Baseline before any edit:** tsc 0, both builds clean, Vitest 532 files / 8,387 passed / 3 skipped.

## False premises

1. **The reference PNGs aren't drawn in Special Elite.**
   - Their name, stamp and big number are a plain fallback monospace: the reference loads Special Elite from Google Fonts, and the capture didn't get it.
   - The rendered DOM and the brief both say Special Elite, and that is what ships.
   - A pixel comparison against the PNGs would fail on the face alone.
2. **The reference's stamp is bold.** Its `.stamp` sets `font-weight: 700` after the `font` shorthand. Special Elite has one weight, so the browser synthesises the bold. The build matches the render; the brief doesn't mention a weight.
3. **"With the agent" also came from the carousel's cards, not just the desk.**
   - Each carousel card's band names its query's court (`qcFanModel`), which put six "WITH THE AGENT" bands on the page.
   - D2 forbids the phrase anywhere on the route, so the band now reads "With agents", the court's name.
   - The centred card's court label and the filter sentence still use `COURT_LABEL`, which is unchanged. Neither renders at rest or with a card selected.
4. **"Due this week" was "the next seven days" in v131.** It is now the London Monday-to-Sunday week, as the brief asks, so on a Wednesday it counts four days, not seven.
5. **The page's span font reset beat single-class rules.**
   - Measured: the card name, the stamp and the line labels all rendered in Playfair.
   - The cause is `.qcv-own :where(span, …)`, which is 0-1-0 and lands later in the bundle.
   - Every span rule here is scoped with two classes. This is the same fault this repo has recorded before.
6. **QC126-2.7 asserted that "with the agent" appears on the page** (`agent > 0`), as its proof that the court's name was there. That now contradicts D2, so it counts "with agents".

## §0 recon

1. **Where the v131 desk lived:**
   - `QcDesk.tsx`;
   - `qcv131.css` (`.qc13-desk`, `.qc13-dc*`, `.qc13-vz`, `.qc13-bars`, `.qc13-b`);
   - `lib/qcDesk.ts` (facts, foot, caption, bar heights);
   - `lib/qcDeskWeeks.ts` (arrivals per London week);
   - the v131 tooltip `.qc13-tip`, which the trend now reuses;
   - the locks QC3, QC4 and QC6, plus `qcDesk.test` and `qcDeskWeeks.test`.

   **Retired, by name:**

   | Case | Retired | Now measured by |
   |---|---|---|
   | `qcV131` QC3 | the eyebrow, the facts, the foot date ("NEXT REPLY DUE …") and the captions ("REQUESTS & OFFERS IN", "QUERIES SENT", "CLOSED") | D2, D3, D4 |
   | `qcV131` QC4 | the twelve bars, "12 WKS", the 2px stub and the 30px tallest | D5, D6 |
   | `qcV131` QC6 | the bars' tooltip and list role | D5's tooltip case |
   | `qcV126` QC126-2.7 | its desk-foot reading | nothing; the cards have no foot |
   | unit | the desk's facts and foot (five cases), the bar heights, and the arrivals counting (five cases) | — |

   The deleted bar derivations (`deskEvents`, `bucket`, `deskBars`, `barText`) are recoverable from `847b5f31`.

   **Re-pointed:**
   - qcV131's opener (the desk is `data-v^="131"`);
   - QC7 ("With agents");
   - QC16 (the cards' total, tiles and stamp: 12 readings, as before);
   - QC126-2.7 (as above);
   - the `qc16-zero` named break.

   All of these are listed in `tests/e2e/RETIRED-query-centre-v131-1.md`.

2. **The running count didn't exist, so I built it.**
   - It is `lib/qcCourtHistory.ts`, with `courtAt`, `countAt`, `courtSeries`, `courtChange` and `stampText`.
   - **What it reads:** `QcRow.history` (`stageHistory`) — the query document's dates first, then its own dated rungs, ordered by the same `queryDerivation` primitive the Tracking tab's `QueryTimeline` reads.
   - **What it never reads:** the current status for past weeks.
   - **Points:** each is read at the last instant of its London week, and the last point is now.
   - **Now is a fact:** at now the court is today's status, so the last point equals the big number by construction.
   - **Nothing is estimated:** where the move into a query's current stage is undated, the query is in no point between its last dated event and now.
3. **Every line reuses an existing derivation:**

   | Line | Derivation |
   |---|---|
   | offers | `status === OFFER` in `rowsForTile("you")` |
   | owed, by kind | the rest of that court, typed by `status` |
   | overdue | `pastExpected` |
   | due this week | `expectedMs` inside `londonWeek(now)`, from v131's own `weekStart` |
   | rejections | `closedHow === "passed"` |
   | no response | `closedHow === "noReply"` |

   A withdrawn query appears on neither of the Closed card's lines, and the big number is v131's `rowsForTile("closed")`.

## Phase 1: the cards

- **Layout:**
  - three separate cards in `repeat(auto-fit, minmax(300px, 1fr))` with an 18px gap;
  - the container has no fill, border or shadow;
  - the 22px above and 44px below the desk are v131's.
- **Card surface:** `#fffdf9`, radius 16, padding `20px 22px 14px`, the brief's three-part shadow.
- **Hover:** a 1px lift, with the reference's deeper shadow.
- **Selected:** a 1.5px inset outline and a 3px foot bar inset 22px, both in the court colour.
- **Header:**
  - the court name, Special Elite 16px, in the court colour;
  - the stamp: −3°, a 1.6px border, the inner ring, and the reference's SVG noise mask copied verbatim.
- **Body:** the big number in Special Elite at 60/.85. Beside it, two lines behind a 1px rule at 12% ink. Each line is a tile (26 tall, the court tint; rust for needs-you-now; muted at zero) and a Source Serif 4 label at 15.5px.
- **Trend:**
  - 52px tall, with ten points from `courtSeries`;
  - a Catmull-Rom curve drawn as Béziers, stroke 2.2, under the `feTurbulence` + `feDisplacementMap` pen at scale 1.3;
  - 35° hatching under the same filter;
  - a 4px end dot with a 7px ring at .5;
  - labels: the first week's month, then "Now";
  - a hover target per week, carrying v131's tooltip style: "W/C 29 SEP · 20 with agents";
  - an accessible label: "With agents: 14 in early August, 19 now".
- **Behaviour:** clicking a card, or Enter/Space, fills the carousel only, and clicking again clears it. The carousel title reads "With agents", and so does the page guide.
- **Loading:** the same component over no rows, with every number painted over. The box is the same; D8 measures it.

## Locks: QC131-1

**Where they run:** `tests/e2e/qcV1311.measure.ts` at 1280, 1512 and 1920; D6 is the unit test `src/lib/qcCourtHistory.test.ts`.

**Red-first, two ways:**
- **Against the v131 build:** D1–D5, D7 and D8 were all red, each at its first reading, because none of their subjects existed.
- **By the brief's named mutation:** each lock was also proved red after the cards existed (`reports/qc-v131-1/mutation-proofs.json`).

| Lock | Mutation | Red reading | Green |
|---|---|---|---|
| D1 cards | wrap the three in one frame again | the container is `rgb(255,255,255)` with a 1px hairline shadow | three cards, 18px apart, `#fffdf9`, radius 16, no frame |
| D2 copy | restore "past the date" | "34 past the date" | the six lines read as specified, the singulars agree, and no "With the agent" at rest or with any card selected |
| D3 tiles | paint every tile the court tint | the With you offer tile isn't rust | 26px tiles; 6 rust readings, 3 muted zeros |
| D4 stamp | count from the 1st of the month | "+1 this month" where now 13 − four weeks ago 10 = "+3" | the stamp equals now minus four weeks ago, rotated |
| D5 trend | plot weekly arrivals | last point 1 against a big number of 13 | one 52px chart, ten points, the last is the big number, "Aug … Now", no bars, the tooltip |
| D6 history (unit) | read the current status for every week | both history cases red | weeks 1–4 with agents and 5–10 with you; closed from week 7 |
| D7 list untouched | a card also filters the list | "you: the list is unchanged" fails | the rows, order and counts are identical for every card, and by keyboard |
| D8 no jump | shorten the placeholder | 195.5 against 209.5 tall | the placeholder and the loaded card share their box (±1) |

## Gates and suites (final build)

**Gates:**
- tsc: 0.
- Both builds: clean.
- Vitest: 533 files / 8,387 passed / 3 skipped. The count is level with the baseline: 11 cases retired, 11 added.

**e2e:**

| Suite | Result |
|---|---|
| QC131-1 | 7/7 |
| qcV131 | green bar QC15 |
| qcV126 | green bar QC126-2 |
| qcV96 | green |

**The two reds, both already red on `main`:**
- **QC15:** its phone-page captures were never committed, so it fails on any fresh checkout.
- **QC126-2:** three rules in Analytics' `a17.css` use the retired page colour. v131 listed it as red before v131.

## Screenshots

**This build** (`reports/qc-v131-1/`):
- `desk-rest-1280.png`
- `desk-agents-1280.png`
- `desk-rest-1512.png`
- `desk-agents-1512.png`

**References** (`design-refs/qc-v131-1/`):
- `ref-desk-ledger@2x.png`
- `ref-desk-ledger-selected@2x.png`

The numbers differ because the references use sample data. The type differs because of false premise 1.
