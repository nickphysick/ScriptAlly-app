# Query card v164 — interim report (21 Nov 2026)

**Status: built, NOT measured, NOT deployed.** Phases 0–4 are committed on `query-card-v164` (pushed). Phase 5's
browser half and Phase 6 are blocked: the emulator guard (`scripts/emu-guard.mjs`) refuses under 20 GB free, and the
volume is at 19 GB. It was 27 GB at session start; two worktrees made since by other live sessions
(`ScriptAlly-td581`, To-do v58.1; `ScriptAlly-cr2`, Consistency roll-out v2; 3.1 GB each) took it under. None of
it is this session's to clear, and lowering `EMU_MIN_FREE_GB` would be working round the guard.

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
- **0.4** The computed list needs the browser (`QC164_TAG=before`, not yet run). From the sheets, the card's
  sub-12px / JetBrains Mono rules on the header and Tracking tab: initials disc 11.5 mono, agency 10.5 mono,
  "QUERYING" 10 mono, book chips 9.5 mono, bubble initials 8.5 mono, material chips 8.5 mono, "2nd nudge" 11px.
  Agent/Materials/Notes bodies (`qcv158.css`) have no mono and nothing under 12 in their own sheet; the Agent tab's
  edit-mode strip (`.qc152-agq small` 9.5 mono) and the composer's agent initials (`.qc1522-ag .av` 9 mono, a
  journey, v165) are outside the read tabs. The browser list is the authority once it runs.
- **0.5** `qcMotion160.ts` `words()` l.456 animated the strip's word and the label's words; `markPop()` l.464 popped
  the label's mark; `strip()` l.430 eases the strip's colour; `easeBg()` l.450 eased the label's colour.
- **0.6 Baseline:** tsc clean. Vitest 13,054 passed / **5 failed (already red, not touched)**:
  `firestoreTarget.test.ts` ×2 (23 old e2e scripts without the fsTarget guard), `events.test.ts` ×2
  (`getting_started_done` recorded nowhere), `marketingLinks.test.tsx` ×1 (retired support address). The five
  measures (qc160/161/1611/1612/163) built (4m36s) but the guard refused to start the emulator: **no measure
  baseline exists yet.**

## Phases

| Phase | Commit | Files |
|---|---|---|
| 0 ref + SHA | `a7d6fdb4a` | `design-refs/query-card-v164/query-card-v164.html` (SHA256 matches), `SHA256` |
| 1 strip | `b350f8c6c` | `QcCard152.tsx`, `qcv164.css`, `lib/qc164.ts` (+test), `stageColours.test.ts` (re-pointed) |
| 2 type | `8f11ecbe1` | `QcCard152.tsx`, `qcv164.css`, `lib/qc164.ts` (+test) |
| 3 bubbles | `3c153dbc4` | `QcCard152.tsx`, `QcBubble152.tsx`, `qcv164.css`, `qc164Bubble.test.tsx` |
| 4 toast | `681521b0a` | `QcCard152.tsx`, `qcv164.css` |
| 5 (part 1) | `cded94655` | `tests/e2e/qc164.measure.ts` (collected, not run), `qc160.measure.ts` (re-pointed) |

All v164 CSS is in `qcv164.css`, scoped to `.qc152[data-qc164]` (QcCard152's root only): the agent card
(`AgentCard262`) and the reply picker (`QcWhoReplied`) reuse the qc152 classes and must not move. The To-do desk
opens this same card, so it takes the new look too.

## Locks so far (red first, then green)

| Lock | Where | Red under | Green |
|---|---|---|---|
| L1 name = display name, every status | `lib/qc164.test.ts` | name → "YOUR MOVE": 3 failed | ✓ |
| L2 current step, every status incl. each closed kind × furthest | `lib/qc164.test.ts` | step off by one: 1 failed | ✓ |
| L9 words shown / none when none stored | `qc164Bubble.test.tsx` | quote always rendered: 1 failed | ✓ |
| L1–L10 in the browser | `qc164.measure.ts` | mutant mode written (M1–M10, runtime, named in the file) | not run |

Re-pointed older lock: `stageColours.test.ts` "the label" read the card's pill markup → now asserts no label and
the track drawn (the sheet rule it reads stays, for AgentCard262). `qc160.measure.ts`: label readings → the strip's
status; "the label's colour eases" → "the track's current mark pops" + "the strip's status moved on".

## To resume (once `df -h ~` shows ≥ 20 GB)

In `/Users/nickphysick/ScriptAlly-qc164`, one run at a time, reading each:
1. Base baseline: `git diff 9a76f0876 HEAD -- src > patch`, `git checkout 9a76f0876 -- src`, then
   `npm run e2e:emu -- tests/e2e/qc160.measure.ts tests/e2e/qc161.measure.ts tests/e2e/qc1611.measure.ts tests/e2e/qc1612.measure.ts tests/e2e/qc163.measure.ts tests/e2e/qc164.measure.ts --workers=1`
   with `QC164_TAG=before` (qc160 is the base's own copy for this run), then `git checkout HEAD -- src`.
2. After: the same six with `QC164_TAG=after`; then `QC164_TAG=mutant` (qc164 only); then `QC164_ONLY=F`.
3. Phase 6: build, re-check what dev serves, merge onto it as a new dev branch, deploy dev, prove the bundle.

## For Nick to rule

- **Disk.** Free ~1 GB+ (e.g. when td581 / cr2 finish) or say which caches may go (`~/Library/Caches` 6.9 GB).
- The four-line clamp on their words (no "more" affordance; the full text is in the step's editor).
- A skipped step (query straight to full) draws as not reached (60%) with a dotted line — the ref has no case.
- "N days later" lines take the ref's computed margin `18px 6px 7px` on both sides, so the agent's sits at 6px
  rather than under the bubble at 40px, as the ref draws it.
- The label's colour ease (`easeBg`) went with the label; nothing replaced it.
- All `.qc1522-btn` in the card (including the in-place editor's small ones) take the 40px `.sp-btn` shape.
- The To-do desk's one-row book ("Querying" label) is untouched.
- Mono left on the Agent/Materials/Notes tabs: list pending the browser run.
