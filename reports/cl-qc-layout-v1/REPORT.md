# Contact list — Query Centre layout v1: report

Branch `cl-qc-layout-v1`, cut from `dev/srm1-plv3-qc156` @ `d5f5a8015`. Dev was serving **`index-P-Ljb31B.js`** from that branch when I started; its tip adds only a report commit after the deployed `3de6d2079`. **Not merged to main.** Dev: see "Deploy" at the foot.

Ref: `design-refs/contact-list-qc-layout-v7/`. Both SHA256s match the brief. Both files are enrolled on the watchlist and committed with the refs commit.

## False premises (read first)

1. **"The navy header and Views panel are on dev" was false when the brief was first run (14 Nov, morning).** They were Query Centre v156, then uncommitted in another session's worktree.
   - Step 0 stopped there, as the brief says to.
   - v156 reached dev later that day (`dev/srm1-plv3-qc156`, `index-P-Ljb31B.js`), and this run was restarted from it.
   - The branch the brief names, `dev/clh2-nwv1-clh21-ql21-nw11-snv3` @ `09901d3b`, has neither.
2. **The Query Centre had no shared header, panel or bar component to extend.** It had three page-local pieces.
   - `QcHeader1531` already rendered through the shared frame `shell/OpenHeader`. The navy look, though, is QC-only CSS in `qcv156.css` §1, scoped to `.qc151.qc153`.
   - `QcViews156` and `QcBar153` were Query Centre components.
   - The brief's red gate ("no shared … to extend: STOP") did not apply as written: a component that exists can be extended. So I took the brief's other instruction, "extend it into a shared primitive that both pages mount".
     - `shell/ViewsPanel` and `shell/ListBar` are extracted from those components. Their markup is byte-identical (proof below).
     - The CSS is shared by widening the Query Centre's selectors to `:is(.qc151.qc153, .cl27)`. `:is()` takes its most specific argument, so the Query Centre's specificity is unchanged. That is the pattern `qcv1531.css` already used for the v27 header and rail.
3. **The harness has 53 agents, not 17.** L4's "restores 17" is the ref's mock number. The lock restores the harness's total (53).
4. **"1 agent on file … 'All of them queried'":** with one agent who is queried, `clHeadline` says "Already queried". That is the existing code and its words, kept.
5. **"His head breaking out above the ring's top" disagrees with the ref's literal.**
   - The ref places the archivist with `bottom: 30px`. At 118 wide (105 tall) that leaves his box 5px *inside* the ring's top.
   - I followed the brief's words and L3: `bottom: 43px`, so the head clears the ring's top by 8px. Measured: archivist top 182.1, ring top 190.2.
6. **The header height has no single source in the Query Centre.** It is content-driven: its right-hand block is the "this week" line, 198.875px.
   - List health (140) is shorter. Its column holds that height as a `calc()` of the line block's own sizes (`contactQcLayout.css`, with the derivation).
   - L1 measures both headers, so if the Query Centre's line block changes, L1 goes red.
7. **Where the Query Centre's own behaviour would break Phase 4, Phase 4 wins.**
   - The Query Centre's strip paints a 22px fade over the cards under its bar. Over a card whose index and headings pin, that fade showed rows between the bar and the pinned rows, and tinted the card's line.
   - On the Contact list the strip is solid to the bar's foot and paints nothing in those 22px. The card's pin rises into them.
   - The bar itself pins exactly as the Query Centre's does (`qc154-tbw`, `top: calc(var(--pin-cover) - 12px)`, the same stuck attribute).
8. **There is no "how-it-works video script" for the Contact list.** Nothing in `scripts/` or `tests/` reads the Contact list's hooks for one. "How it works" is a section of the empty page (`ContactEmptyPage`), and this run leaves it unchanged.
9. **Commits are not one per phase.**
   - Phases 1–4 share files (`AgentList.tsx`, `qcv156.css`, `contactQcLayout.css`).
   - Splitting them afterwards would have committed intermediate trees no gate ever ran against.
   - So: one refs commit, one commit for Phases 1–4 (gated), and one for the locks, readings and report.

## Step 0 map

| Piece | Query Centre (before) | Shared primitive now | Contact list mounts |
|---|---|---|---|
| (a) navy header | `QcHeader1531` → `shell/OpenHeader` (`qc1531-*`, qcv1531.css). Navy: qcv156.css §1 (`.qc151.qc153 > .qc1531-hd.qc1531-hd`). Grid 268 / 1fr / 400–560: qcv1534.css §3. Title 54px: qcv1534 §2 | `shell/OpenHeader` (the ruled line takes no lead now). The navy, grid and title rules read `:is(.qc151.qc153, .cl27)` | `ContactHeaderQc` |
| (b) Views panel | `QcViews156` (`qc153-rail qc156-views`, qcv156.css §6). Card stickiness: qcv154.css (`.qc153-rail` top, tall rule) + the tall-rail effect in `QcPage151` | **`shell/ViewsPanel`** (extracted). **`shell/useTallRail`** (extracted). §6 and the rail-stickiness rules read `:is(…, .cl27)` | `ContactViews` |
| (c) light bar | `QcBar153` (`qc153-bar`, qcv153.css; the strip `qc154-tbw`, qcv154 / 1541 / 156). "/" is `SHORTCUTS.qcFind` in useQcListKeys | **`shell/ListBar`** (extracted). Strip, bar, find and count rules read `:is(…, .cl27)` | `ContactBar` ("/" is the Contact list's own `contactsFind`, unchanged; it finds the field by `data-nb1="find"`) |
| (d) columns | `.qc153-cl` (268px panel, 28px gap, list) qcv153.css. Header 8px above / 30px below (qcv156 §1). Page top padding 30 (qcv151 `.qc151`). Bar sticky `pin-cover − 12`, panel `pin-cover + 14` | unchanged, shared through the widened rules | `.clv-main > .qc153-cl` (already v27's), page padding 30, header row 1 |

**What it replaces on the Contact list:**
- `ContactHeader27` (header v2's open state) → `ContactHeaderQc`;
- the `ContactHealth26` figure mount → `ContactHealth26 fill` on navy;
- `ContactRail27` → `ContactViews`;
- the `cl26-band` in `ContactSheet26` → `ContactBar` above the card.

**Who read their hooks:**
- **Tests:** `contactHeader27.test.tsx` (+ snapshot), `contactPrinciples2.test`, `contactV26.test`, `inkShell.test`, `agentsPageSmoke.test`, and three Query Centre CSS tests that read the widened selectors (`qcv156.test`, `qcQuiet1541.test`, `qcSticky154.test`).
- **Measures:** `cl26`, `cl27`, `clh2`, `clp1`, `clp1Shots`, `clp2`, plus `qc156.measure`'s "before" reading of `[data-cl27='rail']` (a reading, not a lock; now null).
- **The page guide:** its "search" target reads `[data-cl26='find']`, kept on the new field. Its "pin" target fell back to `[data-cl26='group']`, now `[data-clq='group']`.
- **The slim row:** reads `[data-cl27='header']`, kept on the new header. It works unchanged.
- **The "/" key:** reads `[data-nb1="find"]`, kept.

## Extracted into shared primitives (the Query Centre's markup held byte-identical)

- **`shell/ViewsPanel`** from `QcViews156`. Its rendered markup in five states (rest, a view, More filters set, loading, a status ticked) is byte-identical to the pre-extraction capture, `useId` ids included.
- **`shell/ListBar`** from `QcBar153`. Seven states (rest, narrowed, find text, Birds-eye, loading, stuck with a group, one) are byte-identical.
- **`shell/useTallRail`** from `QcPage151`'s effect, unchanged.
- **`shell/OpenHeader`**: the ruled line's lead is optional. With a lead the markup is unchanged; `openHeaderShared.test` holds it.
- **CSS:** 77 selector lines (in the rules each opens) in qcv156 / qcv1534 / qcv154 / qcv1541 / qcv153 now read `:is(.qc151.qc153, .cl27)` or `:is(.qc151, .cl27)`, at the same specificity. `contactQcLayout.css` holds only the Contact list's own differences: the mirrored bird, List health on navy, the ruled line's button, the "your book" tag, the frame colour, and the strip's solid stuck state.

## Retired

**Components and code:**
- `ContactHeader27`, `ContactRail27`, `contactV27.css`;
- `healthNudge` (+ `NUDGE_*`), `ring26Colours`, `RING26_TRACK`;
- the band CSS and the stuck mask (`contactV26.css`), and the pin's `stuck` state;
- v27's light-ground List health, headline, count-line, nudge and rail rules (`contactPrinciples.css`).

**Hooks retired** (nothing reads them now):
- `data-cl27`: rail, rail-head, rail-on, rail-reset, rail-sec, rail-fold, pick, genre, tile, open-only, rail-foot, rail-showing, export, genres-none, art, main;
- `data-clp`: more, more-body;
- `data-cl26`: band, count, group, sort (in the card), fig;
- `data-stuck` on the pin.

The new hooks are `data-clq` (views, view, genre, stand, open-only, more, more-body, reset, showing, export, your-book, toolbar, bar, count, sort, group, find-clear, header, ruled).

**Locks:** see `tests/e2e/RETIRED-contact-list-qc-layout-v1.md`. In short:
- **Skipped in place, each with its note:**
  - cl26 H1, H4, H10, H11, shots;
  - cl27 H1, R1, R2, R3, shots;
  - clh2 CLH2-5, -6, -12;
  - clp1 CLP1, CLP6, CLP13;
  - clp1Shots "each state";
  - clp2 CLP18–21.
- **Re-pointed:** the count helpers in cl26, cl27 and clp1 CLP12.
- **Unit locks retired:** contactHeader27.test (with CLH2-7's v26 snapshot), healthNudge's five cases, and ring26Colours.
- ⚠️ **CLP13** (the narrow, 200%-zoom stacking) has its rules re-pointed to the new header but was **not re-measured** this run.

## Locks — red and green

Playwright, emulator harness (`npm run e2e:emu`), 1440×900 and 1717×1000. Unit locks: `contactQcLayout.test.tsx` (22). Proofs: `mutation-proofs.jsonl`. Ledgers: `ledger/`.

| Lock | Mutation (red) | Red reading (1440) | Green reading (1440 · 1717) |
|---|---|---|---|
| L1 | **M1** · contactQcLayout.css: the `.clq-rc` min-height (the Query Centre line block's height) removed | header height = the Query Centre's ±1 — CL 230.0 · QC 242.9 | header height = the Query Centre's ±1 — CL 242.9 · QC 242.9 · 1717: CL 242.9 · QC 242.9 |
| L2 | **M2** · contactQcLayout.css: `.cl27 .qc153-railcol { padding-left: 6px }` (the panel 6px in) | the panel's left x = the header's ±1 — panel 118.0 · header 112.0 | the panel's left x = the header's ±1 — panel 112.0 · header 112.0 · 1717: panel 112.0 · header 112.0 |
| L3 | **M3** · contactQcLayout.css: the archivist at the ref's `bottom: 30px` (was 43px) | the archivist's top is above the ring's top — archivist 188.7 · ring 183.8 | the archivist's top is above the ring's top — archivist 182.1 · ring 190.2 · 1717: archivist 182.1 · ring 190.2 |
| L4 | **M4** · ContactViews.tsx: Waiting to hear back's count + 1 | wait: its count = the list it shows — view 8 · bar 7 · rows 7 | wait: its count = the list it shows — view 7 · bar 7 · rows 7 · 1717: view 7 · bar 7 · rows 7 |
| L5 | **M5** · ContactViews.tsx: a genre tick replaces the genres instead of adding to them (AND/replace, not OR) | literary-fiction OR thriller: at least either, at most both — A 29 · B 22 · A∪B 22 | literary-fiction OR thriller: at least either, at most both — A 29 · B 22 · A∪B 51 · 1717: A 29 · B 22 · A∪B 51 |
| L6 | **M6** · contactQcLayout.css: v26's stuck mask re-introduced (`.cl26-pin::before`, page colour 14px past each side and 12px above, while the bar's strip is stuck) | while pinned (600px): the frame's line, 334 samples from y=225 to 890 (frame x 418.0–1390.0), ΔE ≤ 3 — worst ΔE 9.57 at left y=225 rgb(242,238,232) | while pinned (600px): the frame's line, 334 samples from y=225 to 890 (frame x 418.0–1390.0), ΔE ≤ 3 — worst ΔE 0.00 at — · 1717: worst ΔE 0.00 at — |
| L7 | **M7** · qcv156.css (Query Centre only): the cards' seal navy #2a3a52 → rust #a2452a | the Query Centre at rest, base vs this build (1440×900) — 4032 px differ = 0.3111% | the Query Centre at rest, base vs this build (1440×900) — 0 px differ = 0.0000% · 1717: 0 px differ = 0.0000% |

All 14 lock × size cells went red under the mutation build and are green on this build (76 checks across both sizes; `green-run.txt`, `red-run.txt`). The seven mutations ran in one build in a disposable measurement worktree. Each targets one lock, and the red readings name each one's effect. Two reds are knock-ons, not their own lock's proof: M1 shortened the header, which also moved L2's panel and bar tops and L3's ring, so L2's own red is the panel at x 118 against 112 (M2) and L3's is the archivist below the ring's top (M3).

## Gates (against the Step 0 baseline)

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` (8 GB heap) | 0 errors | 0 errors |
| `npm run build:dev` | ✓ | ✓ (no error or warning lines) |
| `npx vitest run` | 3 failed / 12504 passed / 4 skipped | 3 failed / 12506 passed / 4 skipped |

The three reds are the baseline's own: `emuGuard.test` (1) and `firestoreTarget.test` (2).

## Screens (`shots/`, each beside the ref in `sbs/`)

- **At rest:** `cl-rest-{1440,1717}`.
- **A view picked with a genre ticked:** `cl-view-genre-{…}`.
- **Two genres ORed:** `cl-genres-{…}`.
- **More filters open:** `cl-more-{…}`.
- **Scrolled 600px with the bar pinned:** `cl-pinned-{…}`.
- **The Query Centre before and after:** `qc-before-{…}` / `qc-after-{…}`, 0 pixels differ at both sizes.
- **L6 states:** `cl-l6-*`.

## Deploy

Recorded in the follow-up commit (the dev branch and the served bundle).
