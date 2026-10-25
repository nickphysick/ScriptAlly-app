# Query Centre v149.2: the page column and the overlay

Branch `query-centre-v149-2`, worktree `../ScriptAlly-qc1492`. Not merged to `main`.

## 1. False premises

1. **v149 A4 never gave the page column a maximum width.** So on wide screens the header, banner, view row and list stretched across the whole sheet. On v149.1 the list was 1208px at a 1512 window and 1600px at 1920 and 2560. The mock caps them in a centred column.
2. **v149.1 B6 changed the query panel from an overlay to a push layout without sign-off.** Above a 1440 window, opening the panel narrowed the list by the panel's width (at 1920: 280–1880 → 280–1336). Part B removes it.

Two smaller differences between the pack and the mock or the app:

- **The inset at a 1440 window — RULED (25 Oct): match the mock's 32.** The first build followed the pack's rule ("32 when `.ws-window` is wider than 1440, else 24"), which gave 24 at a 1440 window where the mock's table has 32. Nick's ruling: the table wins. The inset now keys off the sheet width S: **24 while S is under 1100, else 32**. That gives 24 at a 1280 window (S 1024) and 32 at 1440 (S 1184), 1512 and 1920. See §4a for the 1440×900 reading.
- **"The scrim is visible."** The panel has no scrim while you are just reading a query. The scrim (`[data-side-scrim]`) appears only while an action is running in the panel (Query panel v2 §D), and that was true before v149.1 as well. So L3 checks the scrim after pressing the panel's action button, and checks that the list still has not moved.

## 2. Base

`origin/dev/hm31-pv4-qc1491` at **42b2d956**. That is what dev was serving (`index-pQgTRP-n.js`), and it carries v149.1.

## 3. What changed, and which wrapper holds the cap

| Commit | What |
|---|---|
| 521f6469 | **Part A.** `qcv149.css`: the ≥768px `.qcv-group` rule sets the column. `--qc149-col` is `min(S − 64, 1136)`. `--qc149-ext` is 80 from a 1500 sheet (a stepped clamp), else 0. `--qc149-list` is the sum of the two. `--qc149-w` (the header card, banner and view row) is the list less `2 × --qc149-in` (first built as 32, or 24 at or below a 1440 window; now 24 while S is under 1100, else 32 — see ae78868a). `qcv137.css`: the list's wrapper reads `--qc137-w: var(--qc149-list, …)`. |
| e751cef1 | **Part B.** Removes B6 entirely: the `useEffect` in `Queries.tsx` that set `data-push` / `--qc149-push`, plus the `margin-right` and transition it drove in `qcv149.css`. A search for `qc149-push` or `data-push` now finds nothing. |
| a0b7a0ba | The QC1492 locks; QC149 L2 and QC1491 L11 retired. |
| ae78868a | **The ruling.** `--qc149-in` is a stepped clamp on `--hsheet-w` (`clamp(24px, 24px + (S − 1099.5px) × 1000, 32px)`): 24 under a 1100 sheet, else 32. The window media query that set 24 at ≤1440 is deleted (the same block still hides the switch, unchanged). QC1492 L2 re-pointed to the sheet rule. |

**The cap lives on the list's wrapper, `.qcv-group.qc13 > .qcv-page.qcw` (`qcv137.css`).** Its width `--qc137-w` now reads `--qc149-list`, defined on `.qcv-group` in `qcv149.css`. The header card centres on the same column (`margin-left: calc(50% − w/2)`). The view row sits inside the list, inset by `--qc149-in`.

The shared hero frame `--hero-w` is untouched, because other pages read it. Full screen keeps its own `width: var(--hsheet-w)`.

Measured after the change:

| Window | Sheet S | List | Header card |
|---|---|---|---|
| 1440 | 1184 | 280 → 1400 (1120) | 312 → 1368 (1056) |
| 1512 | 1256 | 308 → 1444 (1136) | 340 → 1412 (1072) |
| 1920 | 1664 | 472 → 1688 (1216) | 504 → 1656 (1152) |

Both are centred in the sheet. These match the pack's table, which is the mock's S plus 8px.

## 4. Locks — `tests/e2e/qc1492.measure.ts`

Ledgers are in `reports/qc-v149-2/ledger/`: `base-*` is the v149.1 build, `mut-*` the mutations, plain is green.

| Lock | Red | Green |
|---|---|---|
| **L1** column: width = min(S − 64, 1136) + (S ≥ 1500 ? 80 : 0) ±1, centred ±1; 1216 at 2560 | **v149.1:** 10/16. List 976 vs 960 (1280), 1136 vs 1120 (1440), 1208 vs 1136 (1512), 1600 vs 1216 (1920 and 2560). **Mutation: cap removed:** 12/16. 1192 at 1512, 1680 at 1920, 2320 at 2560. | 16/16 |
| **L2** inner blocks share edges, each inside the list by the inset: **24 while the measured sheet S is under 1100, else 32** (re-pointed by the ruling) | **v149.1:** 15/15 under the first rule; the header was already inset from the list there, so the red comes from the mutations. **Mutation: header = list width:** 5/15. The card and banner sit on the list's edges (0.0 inset) at all five sizes. **Mutation L2W: the old `.ws-window` > 1440 rule restored:** 14/15. Fails at exactly 1440×900, as the ruling requires: left 24.0, right 24.0, expected 32 (S 1184). | 15/15 |
| **L3** list edges the same with the panel closed and open; the panel's left edge left of the list's right edge; the scrim visible during an action, with the list still unmoved (1440, 1512, 1920) | **v149.1:** 15/18. At 1920 the list was 280–1880 → 280–1336; the panel at 1352 sat right of the list's 1336. **Mutation: B6's narrowing above 1440 restored:** 12/18. At 1512, 308–1444 → 308–884; at 1920, 472–1688 → 472–1128. | 18/18 |

The mutations are in the spec as `QC1492_MUTATE=L1|L2|L2W|L3`, each applied as page CSS.

### 4a. The 1440 × 900 reading (after the ruling)

| | Sheet S | List | Header card · banner · view row | Inset |
|---|---|---|---|---|
| Now | 248 → 1432 (1184) | 280 → 1400 (1120) | 312 → 1368 (1056), all three | **32 / 32** |
| Under L2W (old rule) | 1184 | 280 → 1400 (1120) | 304 → 1376 (1072) | 24 / 24 ✗ |
| Mock (its sheet is 8px wider) | 1192 | 32 → 1160 (1128) | 64 → 1128 (1064) | 32 / 32 |

The app's widths are the mock's less the 8px its sheet is narrower by, as at every other size.

**Retired:**

- **QC149 L2** ("the header, banner and view row share edges; the list is the inset wider each side"). It held v149's uncapped widths. QC1492 L1 and L2 replace it.
- **QC1491 L11** ("at 1920 the open panel pushes the list card…"). It held the push. QC1492 L3 replaces it.

Both are `test.skip` with the reason beside them.

**Still passing on the new build:** QC1491 L1–L10, L12 and L13 at 1280 and 1512, and the rest of QC149: 42 passed and 5 skipped (the two retired locks, plus the sizes those files skip by design).

**Gates** (`gates/`): tsc 0; production build clean; Vitest 10,367 passed. Three files fail, the same three as the baseline: the `functions/` suites, which cannot load in a worktree without `functions/node_modules`.

## 5. Screenshots (`screens/`)

- `closed-1512.png`: 1512×900, top of the page, panel closed.
- `closed-1920.png`: 1920×1080, top of the page, panel closed.
- `open-1920.png`: 1920×1080, panel open. It lies over the list's right edge, and the list keeps its width.

## 6. Integration and dev

- Integration branch **`dev/hm31-pv4-qc1492`**: cut from `dev/hm31-pv4-qc1491` (42b2d956, which dev was serving), with `query-centre-v149-2` merged in (17843e85). Pushed.
- Gates there match the baseline: tsc 0, build clean, Vitest 10,367 passed, plus the same three `functions/` reds. QC1492 L1–L3 and QC1491 (22 passed, L11 skipped as retired) were run on that build and all pass.
- **Dev deploy:** hosting only, `--config firebase.dev.json --project scriptally-dev`, from that clean tree. Served before: `index-pQgTRP-n.js`. **Served after: `index-DPSsooOm.js`.**
- Prod is untouched, and nothing is merged to `main`.
