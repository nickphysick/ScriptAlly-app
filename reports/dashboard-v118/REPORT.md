# Dashboard v118.1

Branch `dashboard-v118`, cut from dev's integration at `39c5768f`. That is the integration dev was serving (`index-Cg9wZ_F1.js`): v71, v105, v116, Contact list v25.6, Responses v5 and the phone dashboard. It carries the v116 HoverStacks, so there was no STOP.

## 1. False premises and §0

1. **0.1, where the stacks were anchored:**
   - **Closed hoop:** both slices and key rows anchored just right of the key's longest line, at the row's height (a slice used the key's first row), never at the pointer. So (a) a row's stack opened a long way to its right, and (b) a slice's opened away from the cursor.
   - **Agents hoop:** already anchored at the pointer (+18/−14). The apparent drift in (d) was the on-screen rule lifting a five-card stack near the foot of the window, which Part A now locks as exactly the overflow.
   - **Found by A1:** moving row to row left two frames with no stack, because `HoverStack` turned itself off and on for a new category. Fixed in Part A.
2. **0.2, the tilt, confirmed:** the straighten rule included `:focus-within`, and How it works hands focus back to the ⓘ with `focus()` when it closes. So the card stayed straight after a mouse close.
3. **0.3, the step chips:** `stageHistory` takes every stage date the query document holds. Two queries on the account carry a sent date from a stage they have since moved back from, on or before the later request. The card took the last two spans blindly, so it showed that stage as done and again as the to-do. Measured on dev:
   - `seed-cal-passed865-q`: "Full sent 20 Sep › Full requested 20 Sep › Full sent";
   - `cor-move-a`: "Partial sent 21 Aug › Partial requested 7 Sep › Partial sent".
4. **0.4, the Closed stack:**
   - **Name cut off:** the name was capped at 104px. With the webfont, a long name still showed 14 characters on v116; in a wider fallback face (as a reader sees it before the webfont loads) it showed 13. So "Fenella Str…" reproduces only in the fallback.
   - **"Queried 5 Dec":** no closed card on the account reads that today, and none has a future sent date (the fixture has moved since the screenshot). The date shown is the query's `dateSent`. Future and missing dates are now handled and unit-locked.
   - **"0 WKS":** whole weeks rounded down, and `closedAt` falls back to the send date when nothing dates the close, which reads as no time at all.
5. **0.5, the helper:** it is `queriesForIds` (it was in `lib/dashPhone`), now in `lib/queriesFilterParam` and shared.
   - **⚠️ The Contact list's filter menu has a `status` field but no control for it.** The Filters popover holds Genres, Submissions and Profiles; its count reads genres and "open" only. A link setting that field would narrow the list with nothing on screen to say so or clear it, which is how the first Part B build behaved.
   - **The list's visible status filter is the At a glance cards** (Not queried · Querying · Closed). `?status=` presses the matching card: shown pressed, cleared by pressing it again. That was a Part B follow-up commit.
6. **0.6, the kinds:** the desktop's `kindOf` (`lib/dashTaskCard`) made a req item "send" only for a request for pages. The phone's `phoneKindOf` (`lib/dashPhone`) took the group.
   - **Desktop kinds that change** (the group is "Agents are waiting"): `offer_received` and `offer_tell`, from "other" (slate) to "Your move". `offer_send_full`, `partial_requested`, `full_requested` and `revise_resubmit` were already "send".
7. **⚠️ The two pages count an agent differently, and both rules are kept** (the pack leaves the counting functions alone):
   - The dashboard files an agent by their latest query on the book (`agentQueryStates`). The Contact list's cards file one as querying if any query on the book is still live.
   - On the harness account, 2 agents are "closed" on the dashboard (Closed 3, Querying 21) and "querying" on the Contact list (Closed 1, Querying 23).
   - "Not yet queried" is the same fact on both and matches exactly (29); the other two match as a sum (24).
   - Making them agree is a ruling about which rule is right, not a link fix.

## 2. Per part

| Part | SHA | What landed |
|---|---|---|
| A | ef55be25 | Every stack at the pointer; keyboard focus alone anchors to the element; swap in place |
| B | f4b4d9cf | Slices and rows click through; the shared `queriesForIds` with `?from=`; `?status=`; "+N more · click to see all" |
| B (follow-up) | c4d4b1d2 | `?status=` presses the Contact list's At a glance card instead of a field with no control |
| C | 7808942b | The founding card straightens only on hover or keyboard focus |
| D | 0563c89d | One kind map (`lib/taskKinds`) for desktop and phone; "Your move" burgundy; the kind from the group; the step chips |
| E | f3395bbe | The Closed stack's names, dates and weeks |
| F | (this commit) | Shots, the phone pixel check, kept locks re-pointed, this report |

**Each lock: red, then green.** RED is v116 (deployed dev) unless a mutation is named, with `DB118_MUTATE=<name>`.

| Lock | RED | GREEN |
|---|---|---|
| A1 | `closed-hoop row letter @0.15: anchored 18 right of and 14 above the pointer — anchor 629,735 · pointer 479.8,752.8`; `closed-hoop: row to row swaps without a gap — 2 frames without a stack`. `A1-no-fit`: `shifted only by the on-screen rule — shift 0,-123 · overflow 0.0,-246.0` | 24 placements over 4 target types × 3 positions × 2 sizes, each slice's far edge included; every shift equals the overflow; no gap row to row |
| B1 | `closed-hoop row quiet (1) click: opens the Query Centre on exactly the slice's queries — /queries · 0 ids`. `B1-dead`: `… — /dashboard · 0 ids` | Every row by click and Enter: the Query Centre holds exactly the slice's ids with "{label} · {n}" on its chip; the Contact list's card pressed, cleared by pressing it again; "Not yet queried" exact; 0 rows inert with a default cursor; arrival at the top; Back returns; a slice click opens its list; the pill's wording |
| C1 | `close: closed with the mouse, the card tilts back to −1.8° — {"rotate":"0deg","swap":1,"inCard":true}`. `C1-focus-within`: the same | ✕, the dim layer and Got it at two sizes; keyboard open and Esc straight while the ⓘ has focus, −1.8° after Tab leaves; hover straight |
| D1 | `task-full-rj-dupe: the band is burgundy … rgb(162, 69, 42)` (also the avatar, a .16 pager, past at .45). `D1-rust`: the same | Every "Your move" card: band, avatar `rgb(110, 52, 38)`, pager rgba(255,255,255,0.18), past segments rgba(110,52,38,0.4); every card with chips has one dashed to-do, last, no stage both done and to do, done stages in date order |
| E1 | `a seeded long name shows at least 14 characters — {"fitWeb":14,"fitFallback":13}` | 20 and 19 characters; the pill folds to its icon below 230px of card; no "0 wks"; future-dated cards read "Queried —" (none on the account) |
| unit `dashLinks` | `queriesForIds is not a function` (against v116's libs) | 4/4 |
| unit `dashKinds` | `Cannot find module './taskKinds'` | the map, the kinds, the four chip shapes |
| unit `dashClosedStack` | 3 of 7 (the one-week minimum, weeks to today, the future date) | 7/7 |

**Kept locks re-pointed, each with a note at the line:**
- `dashTaskCard.test`: the send band is `#6e3426`, and an offer is "send".
- DB116 F1: keyboard focus straightens the card, so the test presses a key first.
- DB116 C1 and B2: the pill's new wording.
- DB116 K1: focus after a key press; Enter's show/hide toggle held on empty targets only, since on others Enter opens the list (B1).

**The pages Part B touched were re-run:** `qc1501` 15/15 and `cl256` 7/7, as on dev.

## 3. Gates

| Gate | Baseline (39c5768f) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `vite build` | clean | clean |
| Vitest | 682 files · 10,669 passed · 3 skipped | 685 files · 10,689 passed · 3 skipped |
| Rules emulator | 4 files · 232 passed | 4 files · 232 passed |

## 4. Shots

`shots/` holds:
- `closed-row-hover` and `agents-slice-hover` at 1440×900, and at 1280×650 near the bottom-right, each with a 6px dot at the pointer;
- `your-move-card`;
- `founding-after-how` (mouse close, pointer away);
- `qc-after-click` ("No reply · 1" on the chip);
- `contact-list-after-click`.

**Phones:** `phone/before-390x844.png` (deployed dev) and `phone/after-390x844.png` (this build) are pixel-identical: `{"pixels":329160,"diff":0}`. The phone's own DM1 suite passes, 7 locks.

## 5. Data issues (Part E)

- **No future-dated sent date** on any closed record on the harness account today. Cards now carry `data-future` when one appears, so it can be listed.
- **The chip fault came from two records** carrying a later stage's date: `seed-cal-passed865-q` and `cor-move-a`.
- **The "0 wks" came from closes with no date of their own:** `closedAt` falls back to the send. The weeks now run to today in that case.

## 6. Dev

**Deployed 28 Oct, hosting only, from a clean worktree.** Dev's integration had not moved (`39c5768f`, Contact list v25.6, Responses v5 and the phone dashboard), so the deploy is that integration plus this branch, a fast-forward: `636efadd` on `dev/…-db116-cl256-rsp5-dm1-db118` (pushed).
- **Served:** dev serves `index-BbTfqWZJ.js`, checked after the deploy. It is the same bundle every lock above ran against.
- Prod is untouched.
