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
