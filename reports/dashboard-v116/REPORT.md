# Dashboard v116: hover detail

Branch `dashboard-v116`, cut from `dashboard-v105` at 67e4b876, which I pushed to origin first; it was local only. Refs: `design-refs/dashboard-v116/`, 12 files. Every hash matches the pack's list, and all 12 are enrolled in `.refhashes.json`.

## 1. False premises found in §0

1. **0.1: v105 was not on origin.** I stopped and reported this. Nick asked me to push it, so I pushed it and cut this branch from it.
2. **0.2: the segment models, as found.**

   | Ring | Order (from 12 o'clock) | Start | Colours |
   |---|---|---|---|
   | Closed (`Hoop`, `CLOSED_BUCKETS`) | No reply · Passed on query · Passed on partial · Passed on full | 12 o'clock (`rotate(-90)`), with a 1.2-unit gap between non-zero slices | `#b9b2a8` · `#8c8379` · `#6f6962` · `#4a443f` |
   | Agents on file | Querying · Closed · Not yet queried | 12 o'clock | `#2a3a52` · `#c9c2b8` · `var(--clv-slate-pale)` |

   A zero bucket draws no slice, so it has nothing to hover. Its key row still shows "None yet". The chart's hover popup came from `DashPopup`, fed by a week layer and an event layer.
3. **0.3: everything the cards need is already on the client.** No new read was needed. Closed cards come from `closedTile.members` plus the query (`dateSent`, `lastStatusChange`) and the agent (name, agency). Agent cards come from `agentQueryStates` plus `Agent.genres`. Neither needed a server change.
4. **0.4:** the scoped manuscript's title is `activeManuscript.title` (the header's `data-ms-title`).
5. **0.5: the task card had no internal frame for any kind.** It had no rim and no line, only an 18px-radius white card with its band at the edge. So Part E was needed.
6. **The callout's three rows cannot sum to the count on their own.** `weekMix` keeps a "Stage not dated" count for queries whose stage that week cannot be known, and the harness account has four. I kept it as a fourth row (stone swatch, shown only when it isn't zero), so the rows always add up to the headline, as the old popup's did. **Grouping:** Partial out is partial requested + partial sent. Full out is full requested, full sent, R&R, resubmitted and offer.
7. **The "+N more" pill cannot be clicked.** B4 makes the stack ignore the pointer, and the Agents stack follows the cursor, so it moves away as you reach for it. Clicking the slice or key row itself opens the full list instead. **Neither list has a filter for one outcome or one status:** the Query Centre's closest is `?status=closed`, and the Contact list has no status parameter. So Closed opens the closed queries, and Agents opens the Contact list.
8. **Two placements follow the pack's text where the ref drew them differently:**
   - The Closed stack starts just right of the key's longest line. The ref's mock overlaps the line ends.
   - The Agents stack anchors at the pointer, then the on-screen rule moves it. The ref's shot 06 hangs off the page.

## 2. Per part

| Part | SHA | What landed |
|---|---|---|
| A | c878b022 | The chart's week callout. Also the pure helpers (`lib/dashHover`) with their unit lock, the e2e lib, and the refs |
| B | 6eff6cbf | `HoverStack`: steps, cap, the on-screen rule, portal, no pointer, `Bust` |
| C | ed00f890 | Closed: slices and key rows, swell, the mini query card, "None yet", `useStackHover`, the live region. Also fixes A's date formatting (below) |
| D | 58083303 | Agents on file: the stack follows the cursor, mini agent cards with status-coloured headers. Also fixes: the fit counts tilted corners, and a 90ms leave grace |
| E | 7ca32934 | The task card's 6px rim and 1px burgundy line at 11px, all four kinds, paid for from the card's own padding |
| F | 221a48cd | The founding card's −1.8° tilt and its header swap; six layout locks re-pointed |
| G | (this commit) | Shots, this report, the CLAUDE.md lines |

### Each lock: red, then green

Before is deployed dev (the v105 stack) unless stated. Every named break is `DB116_MUTATE=<name>` (db116Lib).

| Lock | RED | GREEN |
|---|---|---|
| unit `dashHover` | `Cannot find module './dashHover'` | 9/9: the fold, the up / down / no-change wording, the not-dated row, steps, cap, fit, closed and agent lists, founderSwap including TOP RANK and NO CONTRIBUTIONS YET |
| A1 | dev: `A1 · population: weeks swept — 0 weeks`. `A1-bars-equal`: `31 Aug bars proportional ±1px — … off 58.85,17.91,…`. `A1-no-flip`: `19 Oct 10px from the guide — left gap off by 228.0` | 9 weeks swept. Change on last week matches the week before; rows sum to the count; bars ±1px; 10px from the guide on both sides (the last weeks flip); inside the card; full-height dashed guide; a pin's popup wins |
| B1 | dev: `B1 · population: a stack with +N more — 0`. `B1-flat`: `row querying card 1 at (14i, 38i) — (0.0, 0.0)` | Each card at (14i, 38i) ±1; later cards on top; ≤5; the pill 8px under the last card, on its left edge |
| B2 | dev: `B2 · 1440x700: population, the key rows — {}`. `B2-no-fit`: `1440x700 @907,580: inside with ≥12 to spare — {… "b":-112}` | 1440×700, 1280×650, 1100×800 and 1280×220, three pointer positions each (12 in all). ≥12px to spare, tilted corners included. At 220 tall fewer than five cards show and the pill counts the rest |
| C1 · C2 | dev: `C1 · population: the four key rows — {}`. `C1-no-swell`: `slice quiet: the slice swells ≥1.4×, the others stay — … "w":9` | Every row and every slice. One category per stack; cards + more = the row's count; newest closed first; "None yet" for Passed on partial; the hovered slice 13.5 against 9 (others unchanged); every card fully opaque. **C2:** bust, name, agency, pill, manuscript, both dates; no initials anywhere |
| D1 | dev: `D1 · population: the three key rows — {}`. `D1-short-header`: `the header spans the card — 127 of 212`. `D1-one-colour`: `row closed …: the header is the status's colour — rgb(42, 58, 82)` | Each status by row and slice. Header colours exact; header width = card width; anchored at pointer +18/−14 and re-placed on move |
| E1 | dev: `E1 · other: the frame line — rgb(28, 19, 15) 0px 0px vs rgb(124, 58, 42) 1px 11px`. `E1-no-frame` first stayed GREEN (a pseudo-element's computed border survives `display: none`). After the lock also read `display`: `E1 · other: the frame line, drawn — …` | All four kinds (other, send, nudge, close): colour, width, radius and inset equal to the Closed hoop's (6 / 1px / 11px); the band inside the frame |
| F1 | dev: `F1 · fledgling: tilted −1.8° at rest — none`. `F1-no-tilt`: `tilted −1.8° at rest — none`. `F1-no-swap`: `fledgling: the header swaps — … (1/0)` | Fledgling, Mentor, QueryHawk, egg and no-number: −1.8deg at rest, 0 on hover, the swap text exact, one line, the name whole, the ⓘ unmoved, no pop-up, and back. Focus-within; reduced motion; no clipping ancestor cuts the tilted card |
| K1 | dev: `K1 · closed-hoop: population —` | Tab reaches every slice and row on both rings; focus shows the stack and the live region names the first card; Esc hides; Enter shows, then toggles off |

**Faults found by measuring:**
- **Rotated corners:** each card is tilted, so its corners reach about 3px past its layout box. The first fit measured layout and left painted corners 9px from the edge. The fit now uses the tilted boxes.
- **Stack flicker:** the key's rows sit 3–5px apart, and the card lifts 2px on hover. Crossing between rows blinked the stack out and back. A pointer leave now waits 90ms before hiding.
- **Part A's dates:** Part A's commit formatted short months itself, which `src/lib/dates.test.ts` forbids. That house lock was red at c878b022 because I'd run only the dashboard suites; Part C fixes it (now `dayMonth`).

**Kept locks:**
- **Green:** DB58 (all), DB60, DB71 (all), DB77 (all), DB93 (all) and DB105 (all) on the final build.
- **The rim's cost:** the 6px rim first took 12px from the task card, which reddened DB93 A3 (`d71-tb 135/133`) and DB71 G1. Paying it from the card's padding fixed both.
- **Re-pointed, not retired:** DB71 L2 · L3 · L4, DB77 A3 · A4, DB93 C6, DB105 S1 and S2 read the founding card's bounding rect, which the tilt inflates while its layout is unchanged. They now read the card straight. Over the Activity feed tab the tilt only lifts the card's edge, so the layout check is the conservative one there.
- **Red before this pack:** DB601 E (`1920x1080 C closed: one screen — 972/966`) is equally red on deployed dev.

## 3. Baseline vs final

| Gate | Baseline (67e4b876) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `vite build` / `build:dev` | clean / clean | clean / clean |
| Vitest | 646 files · 9,943 passed · 3 skipped | 647 files · 9,952 passed · 3 skipped |
| Rules emulator | 4 files · 225 passed | 4 files · 225 passed |

## 4. Shots

`shots/` mirrors the ref's 01–11:
- `01` chart week;
- `02` Closed ring (the largest slice);
- `03` Passed on query;
- `04` "None yet";
- `05` the longest category with "+3 more";
- `06` / `07` the Agents ring (querying / closed);
- `08` Not yet queried;
- `09` / `10` founding at rest and on hover;
- `11` the on-screen rule at 1440×700.

Plus `closed-key-passed`, `agents-key-notqueried`, `founding-rest` and `founding-hover` at 1280×650, and `task-close-framed` (Consider closing in its stone band, framed).

**The account differs from the ref's sample:** 11 closed (1 / 8 / 0 / 2), and agents 21 / 3 / 29.

## 5. Anything in §0.3 that needed a new read

None. Every card reads what the dashboard already had loaded (queries, activities, agents, the scoped manuscript).

## For Nick

- **The Closed stack's place:** just right of the key, per the text. The ref overlaps the key's line ends. It's a one-number change if you want the ref's placement.
- **Neither list has a per-category filter**, so clicking a slice or row opens the whole closed list, or the Contact list. Adding the filters is follow-up work.
- **"Stage not dated" is a fourth row in the week callout** whenever such queries exist. Without it, the rows would not add up to the count.
- **Dev: NOT deployed.** Dev serves `index-C2Fx9WTc.js`, the Submission packages v38 stack, and v39 is committed on top of it by a session that was active at the time (`53246c1c`, which builds as `index-BsasSL7F.js`). Deploying would have put this branch over that session's next step, so it waits for your go-ahead. The clean base is the pk39 stack plus this branch; it is hosting-only, because nothing server-side changed. Prod is untouched.
- **Pushed:** `dashboard-v105` (as you asked). `dashboard-v116` is local only.
