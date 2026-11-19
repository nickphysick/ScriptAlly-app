# List filters v1.1 — the filter panel always pins

Branch `list-filters-v1-1`, cut from `list-filters-v1` @ `aa5421231`. One commit (QUICK LANE). Not deployed: it goes
out in the next deploy batch. NOT merged.

## 1. False premises

1. **The worktree did not exist.** `../ScriptAlly-list-filters-v1` was removed at the end of v1, as the worktree rule
   asks. It was re-made at the same path from the pushed `list-filters-v1` tip, on the new branch.
2. **It is not only the Agents panel.** On the seed, the Queries panel un-pins too, at 1440×900 (971px tall against a
   786px port). Nick sees Queries pinned because his own Queries panel is shorter than his room; both panels shared the
   one rule that un-pins.
3. **The Queries list has no under-1000px fold.** The 1000px rule exists only in `contactPrinciples.css` (Agents).
   Queries keeps its two columns at any width, so LF18's "above the list, not pinned" applies to Agents only. On Queries,
   LF18 checks instead that with page content under 1000px the panel still pins and the cap clips nothing.

## 2. Step 0 — the cause

Emulator, the v1 build (before any change). `rail` = the panel's offsetHeight; `port` = the scrollport's clientHeight;
`top`/`gap` = the panel's top below and bottom above the port (negative = beyond it).

| page · size · state | rail | port | --pin-cover | data-qc154-tall | position | top | gap | clp-page |
|---|---|---|---|---|---|---|---|---|
| Queries 1440×900 rest | 971 | 786 | 12 | **set** | **relative** | 295 | −480 | — |
| Queries 1440×900 @1500 | 971 | 786 | 84 | **set** | **relative** | −1205 | 1020 | — |
| Agents 1440×900 rest | 797 | 786 | 12 | **set** | **relative** | 295 | −306 | 1352 |
| Agents 1440×900 @1500 | 797 | 786 | 84 | **set** | **relative** | −1205 | 1194 | 1352 |
| Agents 1440×900 sidebar collapsed @1500 | 797 | 786 | 84 | set | relative | −1205 | 1194 | 1352 |
| Queries 1717×960 @1500 | 971 | 846 | 12 | set | relative | 141 | −266 | — |
| Agents 1717×960 rest | 797 | 846 | 12 | — | sticky | 295 | −246 | 1629 |
| Agents 1717×960 @1500 | 797 | 846 | 84 | — | sticky | 98 | **−48.6** | 1629 |
| Agents, real-data shape, 1440×900 @1500 (6 long genre pills, the "not known" link) | 991 | 786 | 84 | set | relative | −1205 | 1000 | 1352 |
| Agents, real-data shape, 1717×960 @1500 | 991 | 846 | 84 | set | relative | −1205 | 1060 | 1629 |

**The cause is the tall-panel rule**: `useTallRail` sets `data-qc154-tall` whenever the card is taller than the port less
14px and `--pin-cover`, and `qcv154.css` then makes it `position: relative`, so it scrolls away with the page. With
Nick's genres the Agents panel is always taller than his room; the seed's Queries panel is too at 1440×900.
**The `clp-page` rule is not it**: the container is 1352px and 1629px wide (sidebar open or collapsed), never under 1000.

**Step 0.5 — the stale reading is real.** `useTallRail` measured with the resting cover (12px) and is not re-run when the
collapsed bar sets it to 84px. At 1717×960 the Agents panel was judged to fit and stayed pinned, but scrolled its
bottom hangs **48.6px below the port** — its foot unreachable until you scroll back up.

## 3. The fix

- `shell/FilterPanel`: the sections sit in one `.fp-body`. The card is a column (`display: flex; flex-direction:
  column`) with `max-height: calc(var(--wpg-port-h, 100vh) - var(--pin-cover, 12px) - 28px)`, so it follows the
  collapsed bar through the variable, with no script. Head and foot are `flex: none`; `.fp-body` is `flex: 1 1 auto;
  min-height: 0; overflow-y: auto; overscroll-behavior: contain`, with a thin `#d6cabb` scrollbar.
- `data-fp-more` on the card while `.fp-body` has more below (read on scroll, resize and content change); the foot then
  carries `0 -10px 14px -12px rgba(28, 19, 15, .28)`. None at the end or when nothing overflows.
- No sideways shift: the scrollbar's measured width (`--fp-sb`) comes out of the sections' right padding.
- **Retired**: `shell/useTallRail.ts` (its only two callers, QcPage151 and AgentList, no longer call it) and
  `qcv154.css`'s `.qc153-rail[data-qc154-tall]` rule. No other consumer existed.
- Folded (Agents, page content under 1000px): `contactPrinciples.css` keeps the panel static, and now also lifts the cap
  (`max-height: none`) and lets `.fp-body` stop scrolling, so it shows at full height above the list.
- Keyboard: focusing a control out of sight scrolls `.fp-body` to it; the page does not move (LF15).
- Gates: tsc clean; build clean; Vitest 12,948 passed, the same 2 `firestoreTarget` failures as the baseline (12,945).
- Loading and day one: unchanged.

## 4. The locks

`tests/e2e/lf11.measure.ts`. Red proofs in four builds, so each red can only come from its own mutation:
A = LF16 + LF18, B = LF15, C = LF17, D = LF19.

| Lock | Mutation (build) | Red reading | Green reading |
|---|---|---|---|
| LF15 pins when short | the tall rule restored for `.fp` (B) | Queries 1440×700 @1500: top −1204.9 (cover 84); body 851/851 (no scroll); head and foot out of view; no shadow | top 98 = 84 + 14; 14px clear beneath; body 851/354 scrolls; head and foot in; shadow on, gone at the end; focus on the last control scrolls the body to 497, page stays at 1500. Agents the same (body 656/333) |
| LF16 no scroll when it fits | `max-height` fixed at 600px (A) | 1717×1200 at rest: body 851/480 scrolls, the foot shadowed (Agents 656/459) | body 851/851 (Agents 656/656), no shadow; scrolled, top 98 |
| LF17 follows the bar | pin offset hard-coded to 26px (C) | @400, @900, @1500: top 26 with cover 84 — over the collapsed bar (its bottom at 72) | top 98 at cover 84 at every depth, back to rest at cover 12; never over the bar |
| LF18 folded | the fold's `max-height: none` left out (A) | Agents, content 888px: static and above the list, but capped at 600px, body 656/459 scrolling | Agents: above the list, static, `max-height: none`, body 656/656. Queries (no fold): sticky, top 98, 14px clear |
| LF19 real-data shape | `.fp-body`'s scroll removed (D) | content 991 > room 676 (proved); pinned; but scrolled to its end the body did not move (top 0) and its last control was outside its box | content 991 > room 676; pinned at 98; body 850/533; scrolled to its end it moved and the last control is in view |

LF19's first version passed under its own mutation (`scrollHeight > clientHeight` is also true of content that merely
overflows a clipped card). It now also scrolls the body to its end and requires it to move and show its last control;
under the mutation that reads red, as above.

**Final green**: one run of lf11 (LF15–LF19), lf1 (v1's LF1–LF13) and qc154 M6 — **12 tests passed, 389 checks, 0 red**.

**Existing locks.** `qc154.measure.ts` M6's rail check accepted "relative when taller than the port"; that branch is
retired (it now asserts sticky only), with a note. In the final run M6 is green at both sizes: `{"pos":"sticky","top":"26px","tall":false,"h":746,"port":786}` and `h 926, port 966`. The rest of `qc154` (M1–M3: twenty weeks, header 227 vs
218, M3's hover hanging 10 minutes with no action timeout) is stale from later passes and unrelated to the panel; it was
not run to completion. v1's lf1 locks (LF1–LF13, which include its own pin and one-line checks) are all green in the same run.

## 5. Screens

**The four screens of the fixed build were not taken.** Two runs queued for the test slot and gave up after 45 minutes
each; another session held it from 21:31 past 22:50 with an eight-suite run. The geometry they would show is in the
ledgers above (`ledger/LF15-*.json`, `LF16-*`). To take them, in this worktree:

    SA_PHASE=shots npm run e2e:emu -- tests/e2e/lf11.measure.ts --workers=1

which writes `queries-1440x700-scrolled.png`, `agents-1440x700-scrolled.png`, `queries-1717x1200.png` and
`agents-1717x1200.png` here. What is here: Step 0's real-data shape on the old build, `step0-agents-tall-1440.png` and
`step0-agents-tall-1717.png` (the panel scrolled away).

## 6. Branch

`list-filters-v1-1` @ COMMIT, on top of `list-filters-v1`. For tonight's deploy batch.
