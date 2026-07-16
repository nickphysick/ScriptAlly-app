# To-do Board — Polish Pass v3 (fades · pink tag law · Focused session · Walk me through · band header)

Pack: `todo-board-polish-prompt` v3 (CONSOLIDATED — supersedes v1/v2). Presentational + copy only;
no engine, store, write-path or behaviour changes. Gates (tsc · production build · full Vitest,
`set -o pipefail`) green before every commit; explicit-path staging throughout.

## STEP 0 — ground truth (read-only; tree clean at `21fea7b`)

The pack was authored between journey Phase A (`f286b06`) and the B–E unblock; four packs have
landed since (journey B–E `14fc04f`→`d997286`, cascade `2224ae9`, retoken `bf9dd74`→`ed7ffc8`,
follow-up `3e2f190`→`21fea7b`), all live on dev. Nick confirmed the rebase (decisions below).

1. **Component map:** `src/components/todo/ToDoPage.tsx` (ribbon, reels, cards, pop-up, FAB,
   empty states, tour wiring) · `FocusFlow.tsx` (the one completion surface) · `TodoTour.tsx` ·
   `todo.css` · `.t-f12` tokens in `src/index.css` (~540) · view-model `src/lib/todoBoard.ts` (+
   `todoWalk/todoHousekeeping/todoEmpty/todoTour`).
2. **What shipped:** the `f286b06` ribbon CHROME survived (white, 1.5px ink border, radius 14 —
   todo.css:20) but the retoken rebuilt its contents (20/28 padding, date over the Playfair-25
   question, 88px post-it counters). Journey A–E ALL landed — the drawer + per-lane walkthrough the
   pack references were deleted in `14fc04f`; FocusFlow replaced them. **Tag reconcile:** the
   retoken AS EXECUTED deliberately shipped tags neutral-outline + burgundy `warn` (its report:
   "Tags: neutral outline default · burgundy FILL = live deadline") — the two-depth pink law from
   the later retoken revision NEVER landed. `--pink-t/-b/-i/--pink-btn` all exist (index.css:552).
   So Phase 2 has a live target, exactly as the pack anticipates. Corroborated by
   `todo-task-settings.html` (Downloads), which draws the identical law and names the urgency text
   token `--pink-deep: #6e3325`, calling it "a colour-law amendment to the retoken pack".
3. **Fades:** overlay, not mask (red gate (a) clear) — one `::after` on `.tdb-track.more`, 70px,
   `transparent → var(--oat)`, driven by a passive scroll listener + ResizeObserver in the Lane
   component. The RIGHT fade already cleared at scroll end (half the pack's bug was already fixed);
   the LEFT fade did not exist. Phase 1's delta = the two-boolean machine extending that hook.
4. **Sweep:** `.tdb-sw` "Sweep →" per lane header → `setFlow({ items, mode: "sweep" })` (FocusFlow
   sweep mode — the walkthrough's successor). Red gate (b) fired on the pack's literal terms;
   Nick confirmed the rebase onto the existing handlers. No tests assert the copy.
5. **Ribbon button:** "Work through priorities now" (`.tdb-btn-pri`), `disabled={!tiles.urgent}`,
   → `openFlowCards(board.do)`. Count source is ONE place — `ribbonTiles().urgent =
   board.do.length`, the same number the Urgent post-it and lane chip read.
6. **Header structure:** NOT sticky. The pack's scroll premise is wrong for this app — `.tdb-wrap`
   owns the scroll (`overflow-y:auto`, `max-width: var(--maxw,1520px)`, `margin:0 auto`,
   `padding:16px 12px 88px`); the observable requirement (header scrolls away) holds. Full-bleed
   band ⇒ restructure the wrap into outer-scroller + inner-column (the pack's two-layer markup).
   A Filter/Sort tools row exists below the ribbon (`.tdb-tools`, margin 11px 0).
7. **n = 0:** unreachable from the button (disabled under the follow-up pack's inert grammar).
8. **Gold:** zero renders on the page (retired by the retoken; re-verified).
9. **Tree:** clean.

**Decisions (Nick, 16 Jul):** (e) rebase all renames onto the existing FocusFlow handlers, no
behaviour change · Phase 4 keeps disabled-at-zero (inert grammar wins; the 55%-clickable clause is
dropped; disabled sublabel `GUIDED · NOTHING URGENT`) · Phase 5 keeps the live 88px post-its —
chrome swap only; the ref's counter tiles are illustrative · carry tour stop 5's selector ·
Phases 1–2 as written.

**⚠ Design ref deviation:** `todo-board-polish-final.html` was NOT in `~/Downloads` (searched by
name and by the pack's distinctive copy — "Walk me through" / "Focused session" / "GUIDED ·" match
nothing there). Built from the pack's complete prose spec (every phase carries full geometry, copy,
type and colour law) per the repo's ultrawide-law precedent, with `todo-task-settings.html` as
corroborating visual evidence for Phase 2. The pack itself overrides the ref's two unique
contributions (hexes → tokens; counter tiles → illustrative). When the file surfaces, drop it in
Downloads and it gets committed + reconciled as a follow-up.

## PHASE 1 — scroll-aware edge fades (both edges, all lanes)

- **Pure machine** `laneFadeState(scrollLeft, scrollWidth, clientWidth)` in `lib/todoBoard.ts`:
  `left = scrollLeft > 4`, `right = scrollLeft < scrollWidth − clientWidth − 4` (the pack's exact
  thresholds; the old right-edge check used 8px). Unit-locked in `todoBoard.test.ts`: rest → right
  only · mid → both · end → left only · no overflow → neither.
- **Lane hook extended, not duplicated:** the existing `more` state became `fade {left, right}`;
  same passive scroll listener + ResizeObserver + run-once-on-mount. The functional update bails
  out (returns `prev`) when neither boolean changed, so scroll ticks don't re-render the reel.
  The overflow chevron now keys off `fade.right` (same semantics as before).
- **CSS:** `.tdb-track::before/::after` — 64px overlays (were 70), `pointer-events:none`,
  `z-index:1` (above card content, below the fixed corner chrome), gradient solid end =
  `var(--oat)` (the ground token, unchanged), always present at `opacity:0` with
  `transition: opacity 0.25s ease`; `.can-scroll-left`/`.can-scroll-right` on the track flip them
  to 1 — appearance/disappearance cross-fades, no JS timers. The old `.tdb-track.more::after`
  rule is deleted.
- Classes live on `.tdb-track` (the scroller's immediate wrapper — the "lane wrapper" in the
  pack's terms; the overlays must anchor to the same box the scroller fills).
- The design ref could NOT ride this commit (missing — see STEP 0).

## PHASE 2 — card tags → the two-depth pink law

Step 0 found the law NOT landed (the executed retoken deliberately kept neutral-outline +
burgundy-warn); this phase applies it, corroborated visually by `todo-task-settings.html` §3
(which names the token and calls the change "a colour-law amendment to the retoken pack").

- **Minted `--pink-deep: #6e3325`** on the `.t-f12` pink line (index.css) — the mockup's own token
  name; literals-only house rule honoured.
- **`todo.css`:** base `.tdb-tag` → soft pink (`--pink-t`/`--pink-b`/`--pink-i`); `.due.warn` →
  deeper pink (`--pink-btn` fill, `--pink-b` border, `--pink-deep` text, 700); `.offer` unchanged
  (ink ★); the `.snz` faint override DELETED (SNOOZED ×n is a standard tag — base pink; the class
  stays in markup as a semantic hook); NEW `.tdb-tile.nt .tdb-tag` → note-yellow
  (`--note-t/-b/-i`). Type treatment untouched (mono 8px small-caps, radius 99).
- **Burgundy audit:** no tag fill remains. Survivors, all deliberate: StatusDots (locked), the
  focus flow's warn STREAM CHIP `.tdb-ffstream.warn` (flow internals — retoken Phase E's approved
  grammar and explicitly OUT of this pack's scope), and micro-accents (`.tdb-pip`, progress/coach
  dots, italic emphasis in the flow question + new-desk heading).
- **Gold:** nothing to fix — already fully retired by the retoken (re-verified; the lock test now
  asserts the stylesheet stays gold-free).
- **Micro-cleanup:** the Urgent post-it's ink literal `#6e3325` → `var(--pink-deep)` (same value,
  one source).
- **Locks:** NEW `todoTagLaw.test.ts` (rule-text over todo.css — base pink, warn depth+700+dark
  text, offer ink, nt note-yellow, no `--burg` in any tag rule, no gold). No snapshot/markup tests
  existed to update (logic-only Vitest policy).
- **`design-refs/themes.md` regenerated:** the retoken law line amended (burgundy no longer a tag
  fill) + a dated "Polish v3 amendments" subsection documenting the law and the new token.

## PHASE 3 — "Sweep" → "Focused session" (Option C pill)

Copy + weight only; the handler (the focus flow's SWEEP MODE — the per-lane walkthrough's
successor, per the confirmed rebase) is untouched, same position in the lane header.

- **Markup:** `.tdb-sw` ghost text-button → the `.tdb-fs` pill: white, 1px hairline, radius 99,
  padding 7px 16px (9px leading, snug to the disc); 20px `.tdb-fsd` disc (gradient
  `--pink-t → --pink-btn`, 1px `--pink-btn-h` border) carrying a solid ink play triangle (~9px,
  +1px right optical); label "Focused session", 12.5px/600 body sans, ink. No arrow. The keyboard
  hint moved into the title attribute ("Focused session — D done · S snooze · → skip").
- **Hover:** border → `--pink-btn-h`, fill → `--paper` (the warm near-white token), 0.15s.
- **`aria-label`:** `Start a focused session on {lane label}` (Urgent / Housekeeping / Notes to
  self).
- **Rename decision (the pack's either/or):** identifiers renamed WHERE LOCAL — the Lane prop
  `onSweep` → `onFocusedSession` and the class `.tdb-sw` → `.tdb-fs` (both live only in
  ToDoPage.tsx/todo.css, in scope). FocusFlow's `mode: "sweep"` API + sweep-mode internals KEEP
  the sweep name (exported/consumed across FocusFlow.tsx + its tests — flow internals are out of
  this pack's scope). No tests asserted the old copy.

## PHASE 4 — "Work through priorities now" → "Walk me through" (Option C)

- **Markup:** the ink-filled button became the white pill — radius 99, padding 13px 27px 13px
  14px, 1px hairline, `--sh-btn`; 38px `.tdb-wdisc` (gradient `--pink-t → --pink-btn`, 1px
  `--pink-btn-h`) carrying the 15px ink play triangle (+2px right optical); two-line block —
  "Walk me through" (Playfair 19/600, ink) over the mono 9px letter-spaced sublabel at ink@55%.
  No burgundy anywhere on the button.
- **One count source:** the sublabel + aria read `tiles.urgent` (= `ribbonTiles().urgent` =
  `board.do.length` — the same number the Urgent post-it and lane chip draw). Builders
  `walkSublabel(n)` / `walkAria(n)` in `lib/todoBoard.ts`, singular-safe, unit-locked
  (`5 URGENT ITEMS` / `1 URGENT ITEM` / `GUIDED · NOTHING URGENT`).
- **n = 0 (Nick's decision):** the follow-up pack's disabled-at-zero inert grammar STANDS — the
  55%-clickable clause is dropped. The shared `:disabled` block flattens the pill; companions mute
  the disc (paper fill, faint triangle) and lift the sublabel's 55% opacity so faint isn't
  double-dimmed. Disabled sublabel reads `GUIDED · NOTHING URGENT`; disabled aria "Walk me
  through — nothing urgent right now".
- **Hover:** lift 1px, shadow deepens to `--sh-card-h`, border warms to `--pink-btn-h`, 0.12s.
- **Handler + selector unchanged:** same `openFlowCards(board.do)` (the focus flow review walk —
  the confirmed rebase target); the class stays `.tdb-btn-pri`, so tour stop 5's
  `.tdb-ribbon .tdb-btn-pri` selector holds without touching `todoTour.ts`.
- No tests asserted the old copy; the page doc-comment updated.

## PHASE 5 — header → full-bleed band (supersedes the `f286b06` ribbon chrome)

Chrome swap only (Nick's decision): the 88px post-its, date line, question, spacer and the Phase-4
pill all carry over untouched; only the frame around them changed.

- **Two-layer markup (the pack's structure, applied to the wrap):** `.tdb-wrap` is now the
  FULL-WIDTH scroller only — its `max-width: var(--maxw)` cap, centring and 12px side padding
  moved to a new `.tdb-col` (one instance inside the band, one wrapping the tools row + lanes /
  empty states). The band's background spans edge to edge of the content area (`.f12-root` has no
  side padding — verified); the title's left edge aligns with the lane headers (ribbon inline
  padding 14px = col 12 + the reel headers' own 2px inset).
- **The band:** `--paper` ground (parchment, not white) + a single 1px base rule + no radius, no
  shadow, NOT sticky. The `f286b06` white/1.5px-ink/radius-14 chrome is DELETED (rule rewritten,
  no dead CSS). **Deviation, reasoned:** the pack's "hairline" base is realised as `--line`
  (#e6dccd, the STRUCTURAL weight — the same rule the app-wide crumb strip uses); the literal
  `--hairline` token (#f0eae1) is invisible paper-on-oat. One-line swap if the softer rule is
  wanted.
- **Flush top:** the wrap's 16px top padding removed — the band sits directly under the shell bar;
  vertical padding 22px (shorter than the ribbon); title `.tdb-ask` 25 → 27px Playfair 600; date
  line unchanged.
- **Post-its:** untouched (the ref's counter tiles treated as illustrative per Nick — their fills
  already follow the lane colour law from the retoken; the housekeeping tile has been hk-sage
  since then, no gold to move).
- **Tools row:** stays below the band on the oat, top margin 11 → 17px (the pack's 16–18 window).
- **Tour:** stop 5's `.tdb-ribbon .tdb-btn-pri` selector holds — `.tdb-ribbon` survives as the
  band's inner flex row; stop 1's `.tdb-postits` unchanged. `todoTour.ts` untouched.
- **Scroll ownership** stays with `.tdb-wrap` (the stage-rules translation of the pack's
  "scrolls away with the page"); on ultrawide screens the vertical scrollbar now rides the
  viewport edge rather than the capped column — a side effect of full-width scrolling, flagged.

## FINALISE

| Phase | SHA | Commit |
|---|---|---|
| 1 | `cef4169` | feat(todo): scroll-aware edge fades on both lane edges |
| 2 | `3eb8276` | feat(todo): two-depth pink tag law |
| 3 | `3a070ad` | feat(todo): Focused session pill replaces Sweep |
| 4 | `68a3069` | feat(todo): Walk me through ribbon pill |
| 5 | (this commit) | feat(todo): paper band header |

- **Files touched:** `src/components/todo/ToDoPage.tsx` · `src/components/todo/todo.css` ·
  `src/lib/todoBoard.ts` (+ its test) · `src/index.css` (one token line) ·
  `src/components/todo/todoTagLaw.test.ts` (new) · `design-refs/themes.md` · this report.
  App.tsx, FocusFlow, TodoTour, StatusDot, MountPanel, engine/store/write paths: untouched.
- **Step 0 retoken state → Phase 2 delta:** tags were neutral-outline + burgundy-warn (the
  executed retoken's deliberate law); Phase 2 applied the two-depth pink amendment and minted
  `--pink-deep #6e3325`.
- **Sweep rename decision:** local identifiers renamed (Lane prop `onSweep` → `onFocusedSession`,
  class `.tdb-sw` → `.tdb-fs`); FocusFlow's exported `mode: "sweep"` API and sweep-mode internals
  keep their names (out of scope). UI copy fully "Focused session".
- **themes.md:** regenerated (tag-law amendment + the new token, dated subsection).
- **Gold:** already retired before this pass; the new lock test pins the stylesheet gold-free.
- **Tests:** 1057 before the pass → **1069** after (+4 fade machine, +6 tag law, +2 walk
  sublabel/aria). No behavioural test broke at any phase (red gate (f) never fired).
- **Needs Nick's in-browser eyeball (jsdom can't prove):** band ↔ lane column alignment at
  several widths (incl. >1520px where the band bleeds past the capped column) · fade feel on all
  three lanes (left fade appearing on first scroll, both mid, right clearing at the end,
  non-overflowing lanes clean) · the n=0 disabled pill (paper-flat, NOTHING URGENT sublabel) ·
  tag hierarchy at real density (soft pink vs deeper-pink-bold vs ink ★ vs note-yellow) · the
  Focused-session pill + Walk-me-through pill hover states · tour stop 5 still framing the new
  pill.
- **Deviations, all logged in place:** the design ref `todo-board-polish-final.html` was absent —
  built from the pack's complete prose spec (+ `todo-task-settings.html` corroborating Phase 2);
  commit it as a follow-up when supplied. Band base rule = `--line` not the literal `--hairline`
  token (invisible on oat). n=0 stays disabled (Nick's decision superseding the pack's
  55%-clickable). Sweep handlers are FocusFlow's (the confirmed rebase). Pill/button paddings and
  disc gradients are token translations of the pack's mockup-vocabulary values.
