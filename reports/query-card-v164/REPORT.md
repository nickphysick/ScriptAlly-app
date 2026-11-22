# Query card v164 — report (21–22 Nov 2026)

**Status: built and measured.** Locks L1–L10 green on the v164 build and each red under its named mutation;
qc160/161/1611/1612/163 no worse than the base. The browser half of Phase 5 was blocked on the emulator guard on
21 Nov (19.9 GB free) and ran on 22 Nov at 22–25 GB. **Dev serves `index-McyfFrDf.js`** (Phase 6 at the end).

## Step 0

- **0.1** Dev serves `index-DDBRal-w.js`, from `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58` @
  `9a76f0876` (To-do v58 onto Next up v1.1). `query-card-v164` is cut from it.
- **0.2** Gate passed: `qcMotion160.ts` has 18 `qc163` references; `stageColours.ts` has `rim`/`rimHi` (l.21–);
  `primitives.css` has `--sp-h-card` (l.138), `--sp-btn-h` (l.155), `--sp-px-size` (l.178).
- **0.3** (lines on the base, `9a76f0876`)
  - The strip: `QcCard152.tsx:545–556` — the word `[data-qc152=band-word]` l.547 (v152.2 `band1522().word`,
    "YOUR MOVE"/"WITH THE AGENT"), "Day N" `.qc152-day` l.548, pencil l.553, close l.555.
  - Name row and label: `QcCard152.tsx:558–564`; agency upper-cased in JSX l.562; `.qc152-pill` l.563.
  - Manuscript box: `QcCard152.tsx:570–574` (`<small>QUERYING</small>`, chips from `qcCardStory.bookChips`).
  - The bubble: `QcBubble152.tsx` — mark `.qc152-g0` l.99 (StatusDot 18px, no disc), title l.102, chips row l.107,
    quote l.108, stamp l.112. Chips are drawn by `QcCard152.tsx:397–405`: each a `<button data-qc152="chip">`
    whose press opens the dark tip (head = the label, body = its detail) and whose blur closes it.
  - Their words: stored as the step's `replyNote` (older queries: the query's one note field), read by
    `qcCardView.ts:112–121` into `ThreadStepIn.quote`, kept by `qcThread152.ts:272` for the agent's side only, and
    already shown as `.qc152-qt` (a tinted box, 3px rule) after the chips.
  - Footer status box: `QcFoot1581.tsx:38` `.qc152-rf` (26px radius pill, `qcv152card.css:190`).
  - Toast: `QcCard152.tsx:632`, absolute, centred 86px above the foot (`qcv1522card.css:149`).
- **0.4** Computed on the base (`QC164_TAG=before`): `before-under12.json`, `before-mono.json`. Every sub-12px and
  JetBrains Mono use sat in the header and the Tracking tab (initials disc, agency, "QUERYING", book chips, bubble
  initials, material chips, "2nd nudge"); the Agent/Materials/Notes bodies had none. **Mono left after v164: none on
  any of the four tabs** (`after-mono-left.json` is empty).
- **0.5** `qcMotion160.ts` `words()` l.456 animated the strip's word and the label's words; `markPop()` l.464 popped
  the label's mark; `strip()` l.430 eases the strip's colour; `easeBg()` l.450 eased the label's colour.

## Phases

| Phase | Commit | Files |
|---|---|---|
| 0 ref + SHA | `a7d6fdb4a` | `design-refs/query-card-v164/query-card-v164.html` (SHA256 matches), `SHA256` |
| 1 strip | `b350f8c6c` | `QcCard152.tsx`, `qcv164.css`, `lib/qc164.ts` (+test), `stageColours.test.ts` (re-pointed) |
| 2 type | `8f11ecbe1` | `QcCard152.tsx`, `qcv164.css`, `lib/qc164.ts` (+test) |
| 3 bubbles | `3c153dbc4` | `QcCard152.tsx`, `QcBubble152.tsx`, `qcv164.css`, `qc164Bubble.test.tsx` |
| 4 toast | `681521b0a` | `QcCard152.tsx`, `qcv164.css` |
| 5 (part 1) | `cded94655` | `tests/e2e/qc164.measure.ts`, `qc160.measure.ts` (re-pointed) |
| 5 (part 2) | `cbc8ba9ea` | `QcCard152.tsx`, `qcv164.css` (two fixes the locks found), `qc164.measure.ts`, base lists |
| 5 (part 3) | the commit after | `qc161.measure.ts` (QC161-12 re-pointed), ledgers, frames, this report |

All v164 CSS is in `qcv164.css`, scoped to `.qc152[data-qc164]` (QcCard152's root only): the agent card
(`AgentCard262`) and the reply picker (`QcWhoReplied`) reuse the qc152 classes and must not move. The To-do desk
opens this same card, so it takes the new look too.

## Locks (each red first under a named mutation, then green)

| Lock | Where | Red under | Red run | Green |
|---|---|---|---|---|
| L1 name = display name, every status | `lib/qc164.test.ts` | name → "YOUR MOVE" | 3 failed | ✓ |
| L2 current step, every status incl. each closed kind × furthest | `lib/qc164.test.ts` | step off by one | 1 failed | ✓ |
| L9 words shown / none when none stored | `qc164Bubble.test.tsx` | quote always rendered | 1 failed | ✓ |
| L1 strip: name, accessible name, ≥ 54px, 36px buttons | `qc164.measure.ts` | M1 the old word | 33 of 55 rows red | ✓ |
| L2 four steps, current n, 22 on a 30 disc, ended when closed | 〃 | M2 step moved one along | 8 of 33 | ✓ |
| L3 no label in the name row; Day N there, not in the strip | 〃 | M3 label + day back | 22 of 22 | ✓ |
| L4 nothing under 12px on the four tabs | 〃 | M4 a chip / text at 10px | 44 of 44 | ✓ |
| L5 no mono on the header or Tracking | 〃 | M5 agency in JetBrains Mono | 44 of 44 | ✓ |
| L6 footer + drawer buttons 40 / radius 10, status box 12 | 〃 | M6 the old 52/26 pills | 22 of 22 | ✓ |
| L7 material items focusable; a press shows the chip's tip | 〃 | M7 items as plain text | 42 of 54 | ✓ |
| L8 writer's bubbles white; the agent's their stage band | 〃 | M8 writer's back on paper | 17 of 28 | ✓ |
| L9 words in curly quotes, clamped 4, 2px rule; none where none stored | 〃 | M9 an empty quote everywhere | 7 of 11 | ✓ |
| L10 toast below the thread, above the footer, full width | 〃 | M10 toast absolute over the thread | 2 of 5 | ✓ |

Ledgers: `ledger/after-L*.json`, `ledger/mutant-L*.json`.

Re-pointed older locks: `stageColours.test.ts` "the label" → no label, the track drawn (the sheet rule it reads
stays, for AgentCard262). `qc160.measure.ts` label readings → the strip's status; "the label's colour eases" → "the
track's current mark pops" + "the strip's status moved on". `qc161.measure.ts` QC161-12 → each drawer 2px shorter
with its foot where it was (its buttons 42 → the `.sp-btn` 40, as lock 6 asks).

**What the locks found, fixed in `cbc8ba9ea`:**
- On an undo the thread's scroll-to-end jumped the bubbles above 10px for two frames (QC160-7): the toast now takes a
  row, so the thread's box is shorter and v160's fold overflowed it. The card no longer scrolls when the thread only
  loses a step, and scrolls for the toast on its arrival only.
- Under reduced motion a save started the bubble's 0.15s shadow fade (draft → white paper; QC160-10): off under
  reduced motion.
- The measure itself had to read layout sizes, not bounding boxes: the panel leans ~1.6°, so every rect of the frame
  read too big (strip "69", buttons "37", the toast "over" the thread). Its chip loop also closed the card by clicking
  the dim and then hung; each tip is now dismissed by blurring, and every call is bounded.

## Baseline, before and after

Unit (Vitest): base 13,054 passed / 5 failed — `firestoreTarget.test.ts` ×2, `events.test.ts` ×2,
`marketingLinks.test.tsx` ×1, already red and not touched. After: the card, agent-card and lib suites 484/484; tsc
clean.

| Measure | Base (`9a76f0876`) | After (v164) |
|---|---|---|
| qc160 | 12/12 | 12/12 (re-pointed) |
| qc161 | QC161-11 red in both runs (5 journeys' stored query differ from the chip row's) — already red | QC161-11 red, the same 5 rows; QC161-12 green (re-pointed); the rest green |
| qc1611 | 6/6; F failed only after the emulator wore down | all green incl. F |
| qc1612 | green; 3.6 flaky (passed run 1, red run 3); R needs its own base pictures | all green incl. 3.6; R: no base pictures (v161.2's own pixel check, not applicable to a look change) |
| qc163 | QC163-W (WebKit mask) red — already red | QC163-W red, the same; the rest green |
| qc164 | before lists written | L1–L10 green; mutant: all ten red; frames |

Emulator note: one run of all six specs wore the emulator down after ~45 tests (every seed `ETIMEDOUT`); the runs
were split into sets of two or three specs.

**Frames** (`frames/after-1512-*.png`, `frames/after-1920-*.png`): queried, partial requested, full requested, offer,
gone quiet, closed passed (and with their words), closed withdrawn, R&R with words, long thread, and after a save.

## For Nick to rule

- The four-line clamp on their words (no "more" affordance; the full text is in the step's editor). Words longer than
  four lines clip the stamp's hidden room, so on such a bubble the date sits over the end of the fourth line. No seed
  has words that long.
- A skipped step (query straight to full) draws as not reached (60%) with a dotted line — the ref has no case.
- "N days later" lines take the ref's computed margin `18px 6px 7px` on both sides, so the agent's sits at 6px
  rather than under the bubble at 40px, as the ref draws it.
- The label's colour ease (`easeBg`) went with the label; nothing replaced it.
- All `.qc1522-btn` in the card (including the in-place editor's small ones) take the 40px `.sp-btn` shape.
- The To-do desk's one-row book ("Querying" label) is untouched.
- The panel's lean (~1.6°) is untouched.

## Phase 6 — dev deploy (22 Nov, ~02:10Z)

- Re-checked what dev served: `index-B2Wbs__x.js`, not Step 0's `index-DDBRal-w.js` — named in the reports of
  `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58-td581-td582-tl1` @ `83d77ffe7` (To-do v58.1, v58.2,
  To-do load v1), 22 commits on v164's base, none touching v164's files.
- New branch `…-td58-td581-td582-tl1-qc164` = that tip + `query-card-v164` (merge `3c420e7e1`, clean, no
  conflicts), pushed. Gates on the merge: tsc clean; card, agent, lib and To-do suites 1,306 passed / 3 skipped.
- Built from a clean checkout of the pushed tip (scratchpad worktree): `index-McyfFrDf.js`, no `demo-scriptally`,
  no prod project id. Deployed with the served hash checked in the command (`index-B2Wbs__x.js`, else stop):
  `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`.
- **Proof:** https://scriptally-dev.web.app serves `index-McyfFrDf.js`; its `AppRoot-D58pkxWC.js` carries
  `data-qc164` and `AppRoot-CS6pysWM.css` carries `qc164-went`. Hosting only; no rules or functions.
