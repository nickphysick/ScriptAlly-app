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
