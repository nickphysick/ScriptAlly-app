# To-do Board — Fix Pass (exact-fit lanes · subtitle clamp · pop-up stacking · Filter/Sort removal)

Pack: `todo-lanes-popup-fix`, against HEAD `535b9ca` (post-polish). Presentational + one control
removal. Gates (tsc · build · full Vitest, pipefail) green per commit; explicit-path staging.
Design ref `design-refs/todo-lanes-popup-fix.html` (supplied ✓, committed with Phase 1).

## STEP 0 — ground truth (tree clean at `535b9ca`)

1. **Track:** `.tdb-track` > `.tdb-scroller` (gap 14, overflow-x, padding 2/2/6); the Lane hook
   drives the polish pass's `fade {left,right}` (todoBoard.laneFadeState, 4px thresholds; passive
   scroll + ResizeObserver + bail-out). The `›` `.tdb-chev` (26px) renders only while `fade.right`
   and nudges `scrollBy(340)` — fixed pixels, not a page. The ref's pager-disable logic is exactly
   the two booleans laneFadeState already computes — reused unmodified (Nick-approved).
2. **Cards:** `.tdb-tile`/`.tdb-gcard` fixed `width: 330px; min-height: 190px`; clip-safety =
   `.tdb-mid` flexes/clips, everything else flex:none; the scroller's `align-items: stretch`
   already makes in-lane heights uniform. Receipt/dismissed overlays are `.tdb-tile` variants.
3. **Clamp:** the one-line truncation is ONLY `.tdb-gsub` (`-webkit-line-clamp: 1` — the retoken's
   deliberate "1 line grouped" clause, now superseded). Standard `.tdb-tsub` was already 2-line.
4. **Pop-up:** the done-band RENDER rule survived (`doneN > 0` — follow-up pack intact). The
   SIZING was never rewired: `.tdb-pop` fixed `height: min(540px, 100vh−120px)`; `.tdb-tcommit`
   `flex:none; max-height:168px` (a pre-follow-up cap); and at zero done a literal spacer
   `<div className="tdb-tdone" />` with `flex:1` reserves the whole remaining panel — the
   5-committed/0-done dead space. `.tdb-donenil` found dead (unused in markup).
5. **Filter/Sort:** stubs confirmed — `flash("Filter — later")`/`flash("Sort — later")` toasts,
   no state, no handlers. NO red gate.
6. **MISSING MATERIALS:** `.tdb-kick` mono + `--hk-spine` dot = the retoken's deliberate G3
   grammar (spec + report verbatim). The ref re-draws it as a soft-pink `.tag` — but the pack
   scopes the ref's authority to fit/pagers/stacking/clamp, and **Nick ruled it a drawing error:
   branch 1, kicker stands** (Phase 5 = no-change note below).
7. **Tour:** none of the five stops target the track, the chevron, or Filter/Sort; stop 2 frames
   the whole Urgent reel and simply includes the new pagers. No selector rides.
8. **Tree:** clean.

**Decisions (Nick, 17 Jul):** min-height 208 (the ref's 224 is its own type scale) · item 6
branch 1 (kicker stands) · laneFit.ts at the component layer (todoBoard is out of scope) ·
laneFadeState re-consumed unmodified · pagers always rendered on non-empty lanes, both disabled on
non-overflow · overlays ride `--cardw` (free — they are `.tdb-tile`s) · GAP stays the 14px value.

## PHASE 1 — subtitle clamp (two lines)

- `.tdb-gsub` `-webkit-line-clamp: 1 → 2` — the grouped card's full first sentence ("Add what
  they ask to receive so your package check can run.") now renders both lines.
- `.tdb-tile` + `.tdb-gcard` `min-height: 190 → 208` — one 12px/1.5 sub line (18px) absorbed, both
  card classes raised together so mixed lanes stay uniform (belt-and-braces on top of the
  scroller's `align-items: stretch`). The ref's 224 is its own 13px/18px-padding scale; 208 is the
  faithful translation at ours (Nick-confirmed).
- Clip-safety invariant untouched: tags/foot/pills stay `flex: none`, only `.tdb-mid` flexes and
  clips. CSS comments (option-A block + G3 block) updated to match.
- The design ref rides this commit. No test changes (visual only).
