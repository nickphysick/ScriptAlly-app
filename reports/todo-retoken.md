# To-do — Visual Retoken (reels, post-its, option-A type, sage/coffee)

Presentational only — no engine/`taskFlags`/write-path/behaviour changes. Ref:
`design-refs/todo-board-final-retoken.html` (committed this pass).

## STEP 0 — recon

1. Tree clean at `2224ae9`; Phase-6A present (6B remains red-gated separately).
2. **Surface inventory / ownership:** everything the pass touches lives in THREE files —
   `ToDoPage.tsx` (header, tools, lanes, cards, grouped cards, receipts/dismissed/fork/flip,
   pop-up, FAB), `FocusFlow.tsx` (stream chips, choice cards, review verbs, sweep frame),
   `todo.css` (+ the `.t-f12` token block in `index.css`, its documented home).
3. **Dashboard sage SAMPLED AT SOURCE** (the dashboard is auth-gated; the stylesheet that renders
   it is the honest sample): `diaryCarousel.css --dc-band: linear-gradient(#dce0d9, #d0d6cc)` and
   `index.css --sage-band: #dce0d9; --sage-band-2: #d0d6cc` — **exactly the pack's tokens; no
   red-gate.** themes.md already carries the "sage correction" note agreeing.
4. **⛔ COPY/RULE MISMATCH — the pack's red-gate FIRES for the approved materials copy.** The
   grouped "Missing materials" card's approved copy ("…missing submission material details / Add
   details of what you sent so you never lose track") frames a **query SENT-materials** gap. The
   underlying rule `dq_materials` checks `agentDataQualityNeeds → agent.materialsWanted` — the
   agent's **REQUIREMENTS** (what they ask to receive; the batch surfaces write that field).
   **Requirements-based ⇒ the approved copy does not ship.** Shipped instead (same G3 format,
   rule-accurate): "N agents missing a materials list / Add what they ask to receive so your
   package check can run." **For Nick:** either approve rule-accurate copy, or commission a NEW
   sent-materials task type (a future engine change — out of this pass's scope).
5. `design-refs/themes.md` current (35KB, updated 16 Jul incl. the F12 sections) — regenerated at
   Phase E with the new tokens.

## PHASE A — tokens + post-it header

New `.t-f12` tokens (index.css, ADDITIVE literals, colour law documented inline): `--sub`,
`--postit-pink/sage/note`, `--hk-sage/-2/spine/ink` (= the verified diary pair), `--coffee/-2/edge/
ink/deep`, `--sh-card/-h/postit`. Gold tokens stay defined (other consumers) — this page stops
using them (completed through Phase E).

Header: bar padding 20/28, question Playfair 25 over the mono date; the metric tiles are replaced
by **88px post-it buttons** — tilts −2.4°/+1.8°/−1.2°, tape-strip `::before`, Caveat 40 numerals,
mono 7px labels, hover/focus straightens (transition; reduced-motion kills it), pink/sage/note per
the law. **Tap scrolls to the lane** — note: the pack said "rewire the Phase-6B tile-tap", but 6B
is red-gated (never built), so the behaviour is BUILT here (three lines: lane ids +
`scrollIntoView`, smooth unless reduced-motion). Counts ride `aria-label`s (the Caveat numerals
are `aria-hidden`). Post-it counts = lane counts by construction — both read the ONE
`ribbonTiles` object (already unit-locked).

**Gates:** tsc clean · build OK · Vitest **1040** green (no behavioural test moved).

## PHASE B — open reels (de-containering)

The white lane containers are GONE. Each lane is a reel: heading row straight on the oat —
10px lane dot (pink-btn / hk-sage-2 / note-b, hairline outlines) · Playfair 19 lane title ·
white/hairline count chip · a 1px rule stretching to fill · the SWEEP text-button (replaces the
pill affordance; same handler) · chevron (＋ on Notes). Cards sit straight on the oat with the
deeper desk shadows (`--sh-card`/`--sh-card-h`, hover lifts 1px); the scroller right-edge fade now
fades to OAT (70px); horizontal scroll behaviour unchanged (same ref/ResizeObserver machinery).
Empty Notes reel = the dashed GHOST CARD (330px, serif-italic line + mono "＋ Add a note"), not a
boxed empty state; Urgent/Housekeeping empties are quiet italics on the desk. The muted-rules
recovery strip floats de-containered between the heading and the track.

**Gates:** tsc clean · build OK · Vitest **1040** green.

## PHASE C — option-A cards + spines + G3 grouped

Type (all cards): title **Playfair 17/600 ink**, 1.28 lh, 2-line clamp — the burgundy-italic agent
emphasis is GONE (names ink roman, per the law); sub Inter 12 `--sub` 1.55 with **manuscript titles
serif-italic `--ink-2`** (`.tdb-ms`, detected by title match); meta mono 8.5 unchanged. **Clip-safety
relaxed but intact:** `min-height: 190px` (not fixed) — tag/meta/pill rows `flex:none`, only the new
`.tdb-mid` flexes and clips (subs clamp 2 / grouped 1) — the pills-can-never-spill invariant stands
structurally (the overlay bodies swapped `height:100%` → `flex:1` to survive the min-height change).
**Spines:** 3px `::before` per lane (pink-btn / hk-spine / note-b) — receipts/fork/flip inherit them
by sitting in the same card shells. **Tags:** neutral outline default · **burgundy FILL = live
deadline** · **ink fill ★ = offer**. **Neutral monograms** (paper + hairline) everywhere.
**G3 grouped card:** mono kicker + sage dot ("MISSING MATERIALS"…), serif title with the inline
21px numeral, one-line sub (**rule-accurate copy — the approved sent-materials line is red-gated**,
see STEP 0.4; `G3_COPY` is a one-line swap when decided), **sage progress bar + mono caption from
REAL counts** (`hkGroupProgress(agents.length, gapCount)` — complete = total − gaps, unit-locked),
neutral stack + "+N", **"Fix together →" as an ink-outline button (fills ink on hover)**. The quiet
"Never" stays (dropping it would delete an affordance — behaviour is locked this pass; flagged as a
mockup deviation). ✓-flip / ⏸-fork behaviours unchanged.

**Gates:** tsc clean · build OK · Vitest **1042** green (+2: the progress arithmetic).

## PHASE D — coffee Today + unified done-sage

**Coffee = Today's list** (a darker patch of the desk): the pop-up header band/border, committed
chip, dashed commit prompt, row hovers and the footer "Help me pick" all move to the coffee family;
"Work the list" becomes the ink primary (per the ref's footer). The card "✓ ON TODAY" pill state +
committed border are coffee (landed with the Phase-C pill styles). **The FAB progress ring is
coffee** (`--coffee-2` conic); the FAB is otherwise untouched. The rolled-over Keep/Clear bar —
Today furniture — moves from gold to coffee. **No Pro gating anywhere — Today's list stays free**
(nothing touched entitlement).

**Unified done-sage:** the pop-up done-band ticks + the done-count pill AND every receipt (quick-✓
card flips, batch-save receipts, sweep's inline receipt in Phase E) now share the dashboard-sage
family — fills from `--hk-sage`/`--hk-spine`, deep text/fills `--hk-ink #54614f`. ONE "done"
colour page-wide. (Note: the ref's own pop-up mock used `--sageD` for ticks — that's the LOCKED
StatusDot family, which Phase E's sanity rule forbids outside StatusDots, so the law's `#54614f`
family wins; flagged.) Dismissed/fork states stay neutral.

**Gates:** tsc clean · build OK · Vitest **1042** green.

## PHASE E — flow follow-through + themes.md

**The focus flow + sweep adopt the grammar:** stream chips are **neutral outline by default**, with
**burgundy fill = live deadline** (send/nudge why-screens + sweep summaries pick it up from
`card.warn`), **ink fill = offer**, **hk-sage = housekeeping**, note = notes; the review sheet's
"Ready to save" chip is done-sage. **Choice-card selected state → done-sage** (`--hk-sage` fill,
`--hk-ink` tick). **Review verb chips: Done = done-sage · Snoozed = neutral · Noted = note.** The
staged pill, progress-dot "done", both big-tick circles, the sweep inline receipt, the batch-flip
selected chips/header/save chips, the ✨ Find button, the unmute chips and the muted-rules strip
all moved off gold/StatusDot-sage onto the hk/coffee families. **The celebration screen keeps its
moment** — confetti + the Caveat aside untouched in spirit (the aside's INK moved from `--sageD`
to `--hk-ink`: the ref itself used the locked StatusDot hue there, which the sanity rule forbids).

**Sanity sweep confirmed:** `todo.css` contains **zero `gold`** and **zero `--sage`-family**
references (the one "gold" hit left in components was a stale comment — fixed); StatusDot sage now
renders ONLY through the real `StatusDot`. The rail's "gold" class modifier was renamed `hk`
(behaviour identical). No orphaned pink-glass styles remain (`--pink-hero`/`--float-*` have no
consumers on this page; tokens stay defined for other surfaces).

**`design-refs/themes.md` REGENERATED** — the new `.t-f12` section documents the post-it, hk-sage
(incl. the dashboard-wins verification), coffee, and done-sage law + the StatusDot lock note +
gold's retirement from this page.

**Gates:** tsc clean · build OK · Vitest **1042** green.

## FINALISE — the pack's confirmations

- **Per-phase SHAs:** A `bf9dd74` (tokens + post-it header) · B `a023be1` (open reels) ·
  C `a0125c2` (option-A cards + G3) · D `3af7abe` (coffee + done-sage) · E `<this commit>`.
- **Sampled dashboard sage:** `#dce0d9 → #d0d6cc` (from `--dc-band`, `diaryCarousel.css`; matches
  `--sage-band/-2` in index.css) — **identical to the pack's tokens; the dashboard and the tokens
  agree.**
- **Copy/rule reconciliation:** ⛔ **MISMATCH — the approved materials copy did NOT ship.**
  `dq_materials` is REQUIREMENTS-based (`agent.materialsWanted` — what the agent asks to receive;
  the batch surfaces write that field), while "Add details of what you sent so you never lose
  track" describes query SENT-materials. Shipped rule-accurate copy instead ("N agents missing a
  materials list / Add what they ask to receive so your package check can run") — a one-line
  `G3_COPY` swap when Nick either approves new wording or commissions a sent-materials task type
  (an engine change, out of scope here).
- **StatusDots untouched** — the component consumed verbatim throughout; its sage family now
  appears nowhere else on the page.
- **Gold fully retired** from `/todo` (tokens remain defined for other consumers; zero usages).
- **Done-sage unified** — pop-up ticks + done pill + quick-✓/batch/sweep receipts all read
  `--hk-sage`/`--hk-ink`.
- **Behavioural tests:** none changed, none broken (1042 green throughout — the pack's
  "presentational pass broke behaviour" red-gate never fired). The one behavioural ADDITION the
  pack presumed already existed: post-it tap-to-lane (6B's tile-tap was red-gated, never built) —
  three lines, flagged in Phase A.
- **Mockup deviations flagged:** the grouped card keeps its quiet "Never" (dropping it would
  delete an affordance — behaviour is locked); the pop-up tick/pill use `#54614f` not the ref's
  `--sageD` (StatusDot-lock compliance).

**Nick eyeballs (after a deploy):** the post-its (tilt/tape/hover-straighten, Caveat numerals),
reels on the open oat, option-A cards at real data (serif titles, spines, warn/offer tag fills),
the G3 grouped card's bar with real counts, the coffee pop-up with the sage done band, a quick-✓
receipt in the new sage, and the flow's chips/choices/review verbs.
