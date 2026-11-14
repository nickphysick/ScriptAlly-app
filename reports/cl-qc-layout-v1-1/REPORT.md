# Contact list — QC layout v1.1: report

Branch `cl-qc-layout-v1-1`, cut from `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi` @ `c24562273`. That was the branch dev served at the start (**`index-BQC9KmLH.js`**), and it contains `cl-qc-layout-v1` and `query-centre-v156-1`. **Not merged to main.** Dev: see "Deploy" at the foot.

Ref: `design-refs/contact-list-pinned-v8/`. All three SHA256s match the brief, and the three files are enrolled and committed with the refs commit.

## False premises (read first)

1. **"Surname" and "No grouping" render in Source Sans 3: false.**
   - Step 0 (a) read both chips' labels as Source Serif 4 on the Contact list, as on the Query Centre. So were the bar's count and Find.
   - The Sans spans were the Views panel's: the view labels, the tick-box labels and the foot.
   - One chip did differ: the Sort chip's field name was 15px (the shared sort chip's own rule) against the Query Centre's 14.5px. It now takes the Query Centre chip's type.
2. **"Read on dev."** Step 0 and every lock ran on the emulator harness, against a build of the served commit (`c24562273`), as CLAUDE.md requires. Live dev was not read. The harness's Query Centre has 88 queries and its Contact list 53 agents.
3. **"The cap paints the page's ground across its whole box" contradicts "at rest it is pixel-identical to today's card".**
   - Today's card draws its own 1px ring and soft shadow down both sides, reading rgb 215–225 just outside it.
   - A cap that always paints the ground erases them along the cap's height and doubles the top ring (rgb 209 against 225). Run 1 measured this against the base.
   - So the cap paints its ground (and the white top draws its ring) **only while pinned**. The bar's reader sets `data-clq-stuck`, on the same events v1 uses for the strip.
   - At rest the card is today's card. Pinned it is the ref's.
4. **T3's range ("to the headings' top") runs into the card itself.**
   - In the ref the cap's white top and its ring start 11px above the headings.
   - On the harness, grouped by Letter, the cap also holds the letter index, so the card's top is 58px above the headings.
   - T3 samples from the strip's top to the card's own top (its ring row). Every pixel there is the page's ground.
5. **The cap holds the letter index as well as the applied row and the headings.**
   - The brief lists only the applied row and the headings, because the ref uses No grouping.
   - The index row pinned before this run (v26), and dropping it would remove the jump row while scrolling, so it stays in the cap.
   - Pinned, the card begins at its own top: the index, then the headings.
6. **T5 at a literal "0.0%" is not reproducible on this harness at 1440.**
   - The same unchanged Query Centre measured 0, 2734 and 102 differing pixels (glyph edges) on three runs of one build. 1717 was 0 every time.
   - The shell's rail beside the page (the avatar and an icon) re-renders by 1–3 levels too.
   - T5 now compares the Query Centre's own sheet. It takes up to three fresh renders and passes **only on an exact match** (0 px), recording every attempt. A code change can never pass it: the mutation build's seal change failed all three attempts, with identical counts.
7. **Re-running v1's L1–L7 found v1's L1 and L2 already red on this dev line, before any edit here.**
   - v156.1 made the Query Centre's header as tall as its drawing: the hawk, 360×347 at 190 wide = 183.1px, plus 44px of padding, gives 227.1.
   - v1 had held v156's 242.9 (the old line block). The Contact list's binoculars bird (523×512) is 186.0px at the same width, and its header is 230.0.
   - The bird now takes the hawk's layout height: equal negative margins, the drawing itself unscaled. The header is 227.2 against 227.1.
   - ⚠️ The Query Centre's header height now follows its drawing, so a change of drawing on either page moves this. L1 measures it.
8. **Re-run of v1's L6 needed re-pointing.**
   - v1's L6 started sampling at the pin's top. The cap now opens with the card's white 10px edge, above the frame's line.
   - It now starts at the frame's rounded top inside the cap (`.clq-captop` + 14).
9. **T4b's frame corner.**
   - On the harness, the frame's 13px arc is where its #e3d5c9 line meets the navy letter index, so its pixels are the line anti-aliased into navy (ΔE about 31 from the line colour), both pinned and at rest.
   - T4b checks that the arc's pixels pinned equal its pixels at rest (ΔE ≤ 3) and that white sits outside the arc. Its band comparison covers the card's own width.
10. **The brief names `.qc156-sw` for the streak type.**
    - On this line the Query Centre's bar draws v156.1's `.qc1561-sw` (the same 18px figure and 15px italic).
    - `.qc156-sw`'s rules still exist, and List health's ring button uses them as asked. T1 compares the two and they match.

## Step 0 readings (base build, `step0-readings.json`, `shots/step0-*`)

| | Query Centre | Contact list (before) |
|---|---|---|
| (a) view label | Source Serif 4, 15.5px 400 | **Source Sans 3**, 15.5px 400 |
| (a) tick-box label · foot | Source Serif 4 | **Source Sans 3** |
| (a) Sort chip label | Source Serif 4, 14.5px 600 | Source Serif 4, **15px** 600 |
| (a) Group chip label | Source Serif 4, 14.5px 600 | Source Serif 4, 14.5px 600 |
| (b) collapsed bar at 600px | 60 tall, title 24px, button 40 | **48** tall, title **19px**, button **34** |
| (b) its ground vs the sheet | 80–1432 = sheet 80–1432 (1440) | **98–1414** vs sheet 80–1432 |
| (c) 1px outside the column, strip top → headings | — | page ground to y 162, then **rgb(215,210,205)** (the card's ring) every 4px down to the headings (y 166–270), both sides, both sizes |

All three causes in the brief held (allowing for premise 1), so Step 0 did not stop.

## What changed

- **Phase 1, type** (`contactQcLayout.css`).
  - The Query Centre's guard, scoped to the header, the Views panel, the bar strip and the collapsed bar.
  - Each piece's own root also takes the Query Centre page root's type (`400 16px/1.45` serif), because brand.tsx names a bare `div` too and the pieces would inherit the body face from it.
  - The Sort chip's label takes the Query Centre chip's 14.5px.
  - The Contact list's own nodes (the "your book" tag, List health's words, the ruled line, the slim ring's figure and words) keep their faces. T1 checks them.
- **Phase 2, the collapsed bar.**
  - `shell/SlimBar` is extracted from `QcSlim156`. Its markup is byte-identical to the pre-extraction capture in five states (rest, day one, one query, a streak, no streak).
  - `ContactSlimBar` mounts it: "{n} agents on file", the subline (still the filter button), List health's ring button in the streak type, and + Add an agent. It uses the same reader, the same `--pin-cover` (extra 12) and the same full-width ground.
  - `ContactSlimRow` and its CSS are deleted. Its `data-clh2` hooks are kept on the new bar.
- **Phase 3, the cap** (the ref's `.cap` / `.capin` / `.captop` / `.rowsf`).
  - The card's top is one sticky block: `cl26-pin clq-cap` › `clq-capin` (the white top, 22px corners) › `clq-captop` (the frame's top, 13px corners, its line) › the index, applied and heading rows. The rows' frame below continues the sides and closes the foot.
  - Pinned, the cap paints the page's ground 14px past the card and the white top draws its ring.
  - The stuck strip's ground reaches 14px past the column, inside the gap and never into the panel.
  - At rest the card is today's card.

## Locks — red and green

Emulator harness, 1440×900 and 1717×1000.
- **Green:** `tests/e2e/clq11.measure.ts` and v1's `clq1.measure.ts` in one run: **5 passed, 162 checks** (`green-run.txt`). v1's L1–L7 readings are in `v1-rerun/`.
- **Red:** one build with all six mutations, in a disposable measurement worktree (`red-run.txt`, `mutation-proofs.jsonl`). All 12 lock × size cells went red.

| Lock | Size | Mutation | Red reading | Green reading |
|---|---|---|---|---|
| T1 | 1440 | **M-T1** | view label: face, size and weight = the Query Centre's — QC "Source Serif 4" 15.5px 400 · CL "Source Sans 3" 15.5px 400 | view label: face, size and weight = the Query Centre's — QC "Source Serif 4" 15.5px 400 · CL "Source Serif 4" 15.5px 400 |
| T1 | 1717 | **M-T1** | view label: face, size and weight = the Query Centre's — QC "Source Serif 4" 15.5px 400 · CL "Source Sans 3" 15.5px 400 | view label: face, size and weight = the Query Centre's — QC "Source Serif 4" 15.5px 400 · CL "Source Serif 4" 15.5px 400 |
| T2 | 1440 | **M-T2** | Contact list: its ground from the sheet's left edge to its right ±1 — ground 98–1414 · sheet 80–1432 | Query Centre: shown at 600px, the shared bar — qc156-slim |
| T2 | 1717 | **M-T2** | Contact list: its ground from the sheet's left edge to its right ±1 — ground 98–1691 · sheet 80–1709 | Query Centre: shown at 600px, the shared bar — qc156-slim |
| T3 | 1440 | **M-T3** | 1px and 6px outside the column, strip top 177.8 to the card's top 246.8 (headings 305.8), 68 samples, ΔE ≤ 2 from the ground rgb(242,238,232) — worst ΔE 9.81 x=407.0 y=17… | at 600px the strip is stuck and the cap pinned directly under its ground (±1) — {"capTop":142,"sticky":142,"stripFoot":142,"stuck":true} |
| T3 | 1717 | **M-T3** | 1px and 6px outside the column, strip top 177.8 to the card's top 246.8 (headings 305.8), 68 samples, ΔE ≤ 2 from the ground rgb(242,238,232) — worst ΔE 9.81 x=407.0 y=17… | at 600px the strip is stuck and the cap pinned directly under its ground (±1) — {"capTop":142,"sticky":142,"stripFoot":142,"stuck":true} |
| T4 | 1440 | **M-T4** | 300px: the frame's line (#e3d5c9, ΔE ≤ 3) and the white edge (ΔE ≤ 2) unbroken from the headings' top (306) to 890, 294 rows — worst line ΔE 9.57, white ΔE 6.67 left line… | 300px: pinned — {"capTop":142,"sticky":142,"stripFoot":142,"stuck":true} |
| T4 | 1717 | **M-T4** | 300px: the frame's line (#e3d5c9, ΔE ≤ 3) and the white edge (ΔE ≤ 2) unbroken from the headings' top (306) to 990, 344 rows — worst line ΔE 9.57, white ΔE 6.67 left line… | 300px: pinned — {"capTop":142,"sticky":142,"stripFoot":142,"stuck":true} |
| T4b | 1440 | **M-T4b** | left 22px corner: outside the curve is the page's ground (ΔE ≤ 2), inside it white — outside ΔE 6.67, inside ΔE 0.00 | left 22px corner: outside the curve is the page's ground (ΔE ≤ 2), inside it white — outside ΔE 0.00, inside ΔE 0.00 |
| T4b | 1717 | **M-T4b** | left 22px corner: outside the curve is the page's ground (ΔE ≤ 2), inside it white — outside ΔE 6.67, inside ΔE 0.00 | left 22px corner: outside the curve is the page's ground (ΔE ≤ 2), inside it white — outside ΔE 0.00, inside ΔE 0.00 |
| T5 | 1440 | **M-T5** | at rest: base vs this build, 0.0% of the sheet (1352×787; an exact render within 3 attempts) — attempts: 4244 px, 4244 px, 4244 px | at rest: base vs this build, 0.0% of the sheet (1352×787; an exact render within 3 attempts) — attempts: 0 px |
| T5 | 1717 | **M-T5** | at rest: base vs this build, 0.0% of the sheet (1629×887; an exact render within 3 attempts) — attempts: 5906 px, 5906 px, 5906 px | at rest: base vs this build, 0.0% of the sheet (1629×887; an exact render within 3 attempts) — attempts: 0 px |

**Also re-run:** `clh2.measure.ts`, with its slim-row checks re-pointed to the kept `data-clh2` hook and to 60px. Result: 7 passed, 3 skipped (the three v1 retired). Readings are in `clh2-rerun/`.

**Unit:** `contactQcLayout.test.tsx` (27, of which 5 are v1.1's, plus two v1 cases re-pointed), and `qcSlim156.test.tsx` re-pointed to `shell/SlimBar`.

## Gates (against the Step 0 baseline)

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `npm run build:dev` | ✓ | ✓ (no error or warning lines) |
| `npx vitest run` | 3 failed / 12523 passed / 4 skipped | 3 failed / 12528 passed / 4 skipped |

The three reds are the baseline's own: `emuGuard.test` (1) and `firestoreTarget.test` (2).

## Screens (`sbs/`, `shots/`)

- **The two pages side by side:**
  - at rest: `sbs/cl-vs-qc-rest-{1440,1717}.png`;
  - at 600px scrolled: `sbs/cl-vs-qc-600-{1440,1717}.png`.
- **The pinned card's corners at 3×, ours beside the ref's** (1717): `sbs/corner-left-3x-vs-ref.png`, `sbs/corner-right-3x-vs-ref.png`. Ours shows the navy letter index under the frame's top line, because the harness groups by Letter; the ref uses No grouping.
- **Pinned at 300, 600 and 1200px:** `shots/cl-pinned-*`.
- **The Query Centre before and after:** `shots/qc-before-*`, `shots/qc-after-*`.

## Deploy

Recorded in the follow-up commit (the dev branch and the served bundle).
