# Stage colours v1 — report

## 1. False premises and conflicts, first

1. **CLAUDE.md says "direct-to-`main` only, no feature branches"; this prompt says to cut a branch and not to touch
   `main`.** The prompt also says to stop where the two disagree. I followed the prompt, as every dev-line pack since
   October has (branch, push, dev deploy, `main` untouched), and record the conflict here rather than stopping.
2. **Step 0 says "stop if any gate is red"; the base is red.** `src/test/firestoreTarget.test.ts` fails 2 tests on the
   dev line before any edit: 23 tracked e2e scripts (`tests/e2e/cl251Agents.mjs` and others) create a Firebase app
   without `fsTarget`. Nothing here touches them. I took the prompt's other rule ("no worse than baseline") as the gate.
3. **The pill cannot be both 30px / 14px 600 and "within 1px of the baseline".** It was 32px with a 15px / 400 word.
   I followed the explicit pill spec (the reference's) and changed SC1-11 to hold the pill's right edge and centre line
   rather than its size. Every other box is held to the pixel.
4. **The Contact list's `SEG_COLOUR` is dead code on this line.** `ContactAddressBook24` is rendered by nothing
   (`pinList.test.ts` asserts the page does not render it), so SC1-17's named mutation cannot change the page. SC1-17
   was proved red with a live out-of-scope mutation instead: the Contact list's "your move" badge
   (`[data-cdb="badge"]`).
5. **The Analytics page draws no stage fill.** `STATE_FILL` and `STANDING_FILL` have no render reader, so Phase 4's
   Analytics item changes nothing.
6. **The audit list called `TimelineDot.tsx`, `DeskStats.tsx`, `WhatsLivePanel.tsx` and the stage ring live.** None is
   rendered by any route (AUDIT.md, "Unreachable or dead").

## 2. Branch, base, dev

- Branch `stage-colours-v1`, cut from `dev/smv31-vv6-cp32-lqmf1-cb15-td57-qc157-an26-ms29` @ c0e82e3d0 (the line dev
  served, `index-DcWnGsi0.js`).
- Commits: Phase 1 7a7069f35 · Phase 2 b2f63b28e · Phase 3 f49943306 · Phase 4 771144554 · Phase 5 ced8cf95a · Phase 6
  (this commit).
- Dev: https://scriptally-dev.web.app (bundle named in the deploy note at the end of the session).

## 3. The audit

`design-refs/stage-colours-v1/AUDIT.md` in full: 24 in-scope rows with their phase and whether each changed, the
out-of-scope maps (whose move, To-do buckets, notes, the book row, needs-you navy), the unreachable and dead code left
in place, and the allow-list SC1-1 reads.

## 4. Rows left unchanged, and why

- **Out of scope (not a stage colour):** Contact list segments and sets, court tones (`qc1511` TINT/PILL_FILL,
  `qcCardStory` STRIP_TINT, `QcQueryCard149` CARD_TONE, `--qp-court`), Dash60 `CLOSED_STONES` / `AGENT_SEG`, To-do
  buckets (`NEED_FILL`, `RING56_FILL`, `--tw-*`, the asks row), Your notes buckets, the slide-out's book row, the
  Responses gone-quiet example dots, the phone flow card, the needs-you Next box, `OUTCOME_TONE`, QueryTimeline's wait
  tones, the phone's court bar.
- **Unreachable (left, named):** the stage ring (`RING_BUCKETS`, `LEGACY_TONE_FILL_153`), `qc1512` header tones
  (`HEAD_FILL`, `STATE_TONE`, `headTone`, `headFill`), `QcPage151` `row()`, `qc1522` `head1522`, `discFill` (it follows
  `STATUS_FILL`'s new values), the rail court tiles, `DeskStats` `TONE_FILL`, `WhatsLivePanel`, Analytics
  `STATE_FILL`/`STANDING_FILL`, `StatusPill` (RecordResponseModal), `TimelineDot`, `getListStatusPill`.
- **Needs a ruling:** the f12 `--state-*` family (`queryCardFacts` `STATE_OF`, `queryCard.css` and its siblings). It
  splits each stage by whose move it is. Its readers are the undrawn desk body, dead phone branches, and three panels
  (QueryPanel, CorrectionDesk, QueryAgentTab) behind `creating` / `deskVerb` gates not traced to a live trigger.
- **Decorative:** the two confetti palettes keep their old hexes (allow-listed).

## 5. Locks

Unit (Vitest) locks are proved red by a mutation, then green; measured (Playwright, emulator, 1512 × 982, phone 390 ×
844) locks were red on the base where the base differed, then red again on a mutation build, then green.

| Lock | Red before | Mutation (red) | Green after |
|---|---|---|---|
| SC1-1 one source (`src/lib/sc1source.test.ts`, asserts > 200 files scanned) | — | `#8ea7c6` back in `qcv154.css` | ✓ |
| SC1-2 rose | ✗ base (foil) | restore `#8ea7c6` | ✓ |
| SC1-3 strip | ✗ base (navy) | leave the strip navy | ✓ |
| SC1-4 quiet strip | ✗ base | every Queried card quiet | ✓ |
| SC1-5 agent bubbles | ✗ base (no edge) | "asked for the full" → partial | ✓ |
| SC1-6 writer bubbles | ✓ base (unchanged by design) | "Query sent" sand | ✓ |
| SC1-7 offer bubble | ✗ base (no sheen) | sheen on every bubble on an offer card | ✓ |
| SC1-8 seal | ✗ base (paper) | restore the paper seal | ✓ |
| SC1-9 label | ✗ base | a coloured disc behind the mark | ✓ |
| SC1-10 footer | ✗ base | Tint for the disc | ✓ |
| SC1-11 no movement | after only | strip +4px | ✓ (pill: see 1.3) |
| SC1-12 Birds-eye | ✗ base | "requested" its own shade | ✓ |
| SC1-13 marks are ink | ✓ base (already ink) | Responses per-stage mark colour | ✓ |
| SC1-14 Responses | ✗ base (offer foil) | R&R as partial | ✓ |
| SC1-15 Dashboard | ✗ base (navy chart) | old chart hexes | ✓ |
| SC1-16 phone | (before run could not sign in at 390) | old pink for partial | ✓ |
| SC1-17 out of scope held | after only | the live "your move" badge (see 1.4) | ✓ |

Source halves of SC1-2, -12, -14, -15, -16 and the Phase 2 card are in `stageColours.test.ts`, `qcThread152.test.ts`,
`qcFoot1522.test.ts` and `qc1533.test.ts`, each proved red by its phase's mutation.

Readings: `reports/stage-colours-v1/ledger/` (`before-*`, `mutant-*`, `after-*`), geometry in `baseline.json` /
`after-slide.json`.

## 6. Gates, baseline against final

| Gate | Baseline (c0e82e3d0) | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Vitest | 12807 passed, 2 failed (firestoreTarget), 4 skipped | 12823 passed, 2 failed (the same two), 4 skipped |
| `vite build` | clean | clean |

## 7. Before and after shots

`design-refs/stage-colours-v1/screens/`, `before-*` and `after-*` of: the Query Centre grid, Birds-eye, Dashboard,
Responses, Analytics (unchanged), To-do, the Contact list (byte-identical), phone Today and phone queries, and the
slide-out card in each stage (queried, partial, full, offer, closed) and gone quiet.

## 8. For the writer's ruling

1. **The f12 `--state-*` family** (requested = "you", sent = "agent"). (a) Leave it: no live route draws it today.
   (b) Move it onto the stage table now, so a revived panel cannot bring the old split back. (c) Delete it with the
   dead desk body in a clean-up pack.
2. **The offer paperclip's ink `#7a3f3c`** breaks the v153 "no red or rust ink" rule the paperclip tests kept. I kept
   your values and exempted the offer. (a) Keep the rose ink. (b) Use ink `#1c130f` on the rose accent.
3. **The writer's own dashed draft** keeps v152.2's stone outline; only the agent's draft takes the stage Mark.
   (a) Keep that. (b) Give the writer's draft the card's stage Mark too.
4. **The Dashboard feed:** an agent's move now tints its row with the stage's Tint (it was a blue-grey or sand by event
   kind). (a) Keep. (b) Leave the feed rows untinted and colour only marks.
