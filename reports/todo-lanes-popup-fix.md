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

## PHASE 2 — exact-fit lanes (Airbnb pattern; fades retired)

- **Fit maths** in NEW `src/components/todo/laneFit.ts` (component layer — `todoBoard.ts` is out
  of scope): `laneFit(trackWidth)` → `N = clamp(floor((w + 14) / (300 + 14)), 1, 5)`, card width
  `(w − 14×(N−1)) / N`, plus `lanePageDistance` (one page = N cards + gaps). Constants exported;
  GAP is our 14px lane value (the ref mock's 18 is its own). Unit-locked in `laneFit.test.ts`:
  exact-fill identity at seven widths · boundary steps (2→3 at 928, 3→4 at 1242) · floor 1 at
  mobile widths · cap 5 ultrawide · page distance.
- **The Lane hook extended, not duplicated:** the ONE `check` now does both jobs — laneFit →
  `--tdb-cardw` on the scroller + a ref for paging, then the polish pass's two-boolean
  `laneFadeState` (UNMODIFIED, same 4px thresholds) driving the pager disabled states instead of
  the retired fades. Same passive scroll + ResizeObserver + bail-out.
- **Snap:** `scroll-snap-type: x mandatory` + `scroll-behavior: smooth` (auto under
  reduced-motion) on the scroller; `scroll-snap-align: start` on cards; scrollbar hidden both
  engines (`scrollbar-width: none` + `::-webkit-scrollbar`). Trackpad/touch scrolling intact.
- **Cards:** fixed `width: 330px` → `flex: 0 0 var(--tdb-cardw, 330px)` on `.tdb-tile` AND
  `.tdb-gcard` — receipt/dismissed overlays are `.tdb-tile` variants so they ride the basis for
  free (Nick's requirement). The 330 fallback covers any render before the first measure.
- **Pagers:** the lone `›` `.tdb-chev` (26px, hidden-until-overflow, 340px nudge) became the
  32px `.tdb-pager` PAIR after Focused session — ‹ svg / › svg per the ref, click =
  `page(±1)` (one full page via `lanePageDistance`), hover warms the border. Disabled = the
  SHARED inert grammar (both selector lists extended): ‹ until `scrollLeft > 4`, › at the end;
  a non-overflowing lane renders both disabled. `aria-label`s "Previous/Next {lane} cards".
  Pagers render on non-empty lanes only (the empty reel has no track — the old chevron hid there
  too; reported as the interpretation of "always rendered").
- **Fades fully retired:** the `.tdb-track` wrapper existed solely for the fade overlays — the
  wrapper div, its `can-scroll-*` classes, both `::before/::after` overlay rules and the old
  `.tdb-chev` rules are DELETED (markup + CSS, no dead state). `laneFadeState` + its tests stay
  in `todoBoard.ts`, repurposed.
- **jsdom can't verify snap/smooth-scroll geometry** — flagged for the in-browser checklist.

## PHASE 3 — Today's-list pop-up stacking

Step 0's finding: the render rule was intact, the SIZING was never wired — fixed here.

- **The pop-up grows with content:** `.tdb-pop` `height:` → `max-height: min(540px,
  calc(100vh − 120px))` (the existing cap kept as the ceiling).
- **The outstanding list owns the flexible height:** `.tdb-tcommit` `flex: none; max-height:
  168px` → `flex: 1 1 auto; min-height: 0` (renders first, scrolls internally only past the cap).
  The pre-follow-up "capped so the done band always shows" comment — the inversion's source — is
  rewritten.
- **The done band never steals space:** `.tdb-tdone` `flex: 1` → `flex: 0 0 auto; max-height:
  32vh` (content-sized, own scroll); the **zero-done `flex:1` spacer div is DELETED** — that
  spacer was the 5-committed/0-done dead space. The `doneN > 0` render conditional (follow-up
  rule) unchanged. Dead `.tdb-donenil` rule removed.
- **Header/footer:** already `flex: none` — untouched, verified.
- **Locks:** NEW `todoPopupStack.test.ts` — the flex contract + the spacer regression pinned at
  the source/rule-text layer (the repo's testing policy is logic-only, no component mounts — the
  pack's "render-logic tests" are realised as text-layer locks; reported as the policy-compliant
  translation). At-5/0 pixel behaviour flagged for the in-browser checklist.

## PHASE 4 — Filter & Sort removed

- Both buttons + the row + their stub `flash("… — later")` handlers deleted entirely (Step 0
  confirmed stubs — no state, no real handlers). `.tdb-tools`/`.tdb-tool` CSS removed; no
  commented-out code, no orphans (`flash` itself survives — many live callers).
- The row was the tools row's only occupant, so the ROW went with it; the ~17px gap it provided
  moved to the content column (`.tdb-col` `padding-top: 17px` — the ribbon col overrides padding
  wholesale, so this reaches the content column only). The first lane header — and the A/E
  empty-state cards, which render in the lanes' place — sit ~17px below the band's rule.
- Tour: no stop targeted these controls (Step 0 item 7) — zero selector/copy changes.

## PHASE 5 — MISSING MATERIALS kicker: NO CHANGE (branch 1)

- Evidence: `.tdb-kick` (mono small-caps + 6px `--hk-spine` dot) is the retoken G3 spec verbatim
  ("mono kicker + sage dot — 'MISSING MATERIALS' / 'MISSING WISH LIST'") and its report records it
  as shipped intent. The fix-pack ref's soft-pink `.tag` on the grouped card is **a drawing
  error, not a spec** (Nick's ruling; the ref's declared authority is fit/pagers/stacking/clamp).
  G3's grammar stands — the kicker also stays visually distinct from the two-depth pink tag law,
  which applies to status/urgency tags, not the grouped card's rule label.

## FINALISE

| Phase | SHA | Commit |
|---|---|---|
| 1 | `3a84be9` | fix(todo): two-line grouped subtitle clamp |
| 2 | `e6dce31` | feat(todo): exact-fit lanes with snap paging; fades retired |
| 3 | `8113dc6` | fix(todo): pop-up stacking — outstanding list owns the height |
| 4 | (this commit) | fix(todo): remove the Filter/Sort stubs |
| 5 | — | no change (report note above) |

- **Files touched:** `ToDoPage.tsx` · `todo.css` · NEW `laneFit.ts` + `laneFit.test.ts` + NEW
  `todoPopupStack.test.ts` · `design-refs/todo-lanes-popup-fix.html` (committed P1) · this
  report. Out-of-scope files untouched: FocusFlow, view-models (`todoBoard.ts` read-only —
  `laneFadeState` re-consumed unmodified), StatusDot/MountPanel, the band header + both polish
  pills.
- **Fit-maths cases locked:** exact-fill identity at 7 widths · N steps 2→3 at 928 and 3→4 at
  1242 · floor 1 (200px → one full-width card) · cap 5 (3000px) · page distance = N×(w+gap).
- **Done-band finding + fix:** render rule was intact; sizing was inverted (committed capped at
  168px, done zone flex:1, plus a zero-done flex spacer) — outstanding list now owns the height,
  the spacer is deleted, the pop-up grows with content. Locked in `todoPopupStack.test.ts`.
- **Filter/Sort:** stubs confirmed then removed, row included; gap re-provided via the content
  column.
- **Tour:** zero selector changes (no stop targeted the affected chrome).
- **Tests:** 1069 → **1080** (+6 laneFit, +5 pop-up stacking). No behavioural test broke.
- **In-browser checklist (jsdom can't prove):** lane flex at 3/4/5-card widths (~<928 / 928–1241 /
  1242+ track px) with no partial card at rest · snap feel + one-page chevron clicks · ‹ enabling
  only after scroll, › dying at the end, both inert on a short lane · the pop-up at 5/0 (all five
  visible, zero dead space) and after ticking items (done band appears content-sized, 32vh cap) ·
  the grouped card's full two-line sub at real data · the first lane header ~17px under the band.
- **Deviations:** pagers render on non-empty lanes only (the empty reel has no track; the old
  chevron hid there too) · pack's "render-logic tests" realised as text-layer locks per the
  repo's logic-only policy · GAP kept at our 14px token vs the ref mock's 18.
