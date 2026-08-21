# To-do pane — focus steer, expanding pill, paper & rules

**Contract hash verified:** `design-refs/todo-pane-contract.html` md5 **`3f8cdf0e55ccc56741d9a1f15f70baea`**,
with `upill` ×13, `sqPulse` ×2, "to answer" ×4. Committed as `f19a2a7f`.
**Measured:** **21 of 21 green at 1440** — `tests/e2e/steerRound.measure.ts` → `run-artifacts/steer-round.txt`.
**Baseline:** `run-artifacts/steer-RED-before.txt` — 15 assertions, 6 RED.
**Screenshots:** `reports/steer-round/` — Send at zero / partial / complete / missing, plus Note and Bulk, at 1440 and 1920.
**Not deployed.**

---

## The one thing to look at first

**`reports/steer-round/send-missing-1440.png`.** It is the whole round in one frame: the square
breathing beside `WHEN` (not beside `WHAT ARE YOU SENDING?` — a full manuscript has no unit to pick,
so that requirement is already met), the chip reading `3 to answer` on the primary, the will-record
strip having yielded, and the bar wrapping to two lines rather than clipping —
*"Still to answer: when it went, when you expect to hear back and your reminder"*, each a link.

Worth your eye: **the bar grows a row when the line appears.** That is the brief's own instruction
("line wraps rather than truncating") and it is right, but it means the action bar is not a fixed
height any more. If that reads badly to you, the fix is a decision, not a bug.

---

## False premises, at the top

1. **The contract was stale for the third run running** — byte-identical to the previous round's
   `52473130`, with zero of the three markers. It was in `~/Downloads` as
   `todo-pane-contract (5).html`. I installed it rather than stopping, because the file matches the
   hash **the brief itself states**, byte for byte: the stale condition is resolved rather than
   bypassed. Said plainly in `f19a2a7f` so the judgement is visible.
2. **The brief calls the multi-select mode `offers`; this repo has always called it `wanted`.** Not
   renamed — that is the signature change rule 4 forbids on a shared component.
3. **`Their stated window` and `#e6dccd` are prose-only** (carried from the last round's report).
   The contract's `--edge` is `#e8e0d8`, and that is what ships.
4. **No `Close` row exists on the harness account tonight.** Two were there earlier in the sequence.
   P2.4 reports NOT RUN rather than passing or failing, and a coverage floor sits beside it.
5. **`SampleSpecPicker` and `agentMaterials` have no packages caller** — checked before extending,
   per rule 4. Only the two To-do surfaces this session owns.

---

## Per phase

| Phase | SHA | Measured | The surprise |
|---|---|---|---|
| 1 · one required-fields source | `c3a66bda` | — | a braced JSX comment at expression position |
| 2 · the steer square | `7fe3bc92` | 4/4 runnable | an assertion asserting the fixture, not the law |
| 3 · the expanding pill | `b0983ff7` | 4/4 | a probe firing blur and click in one tick |
| 4 · paper and rules | `2b7af6ae` | 5/5 | the card-within-card survived in the story column |
| 5 · the primary names what is missing | `7d0bb21f` | 6/6 | **a TDZ across `setTimeout`, and a double count on bulk** |

---

## What measurement found that no test could

**A `ReferenceError` thrown into a callback nobody was listening to.** The jump read a local
`const REQ_ANCHOR` from inside a `setTimeout`. `tsc` was clean — a TDZ is invisible across a
deferred callback, exactly as CLAUDE.md's standing note says — and the symptom was the missing line
rendering perfectly beside a focus that never moved and a scroll that never happened. Found by
reading the page's console, not the code. The map now lives beside the declaration whose ids it was
restating, which is why it should never have been local.

**Bulk was rendering two counts on one button** — `Log 0 queries` with a chip reading `1 to answer`
beside it. Two numbers counting different things (queries filled in, requirements outstanding) with
nothing to tell the reader which is which.

**And focus was being placed before React flushed.** `setShowMissing` re-renders the pane; the jump
ran synchronously after it and landed on a node the next render replaced.

---

## Assertions that were asserting the fixture

Four, and they are the same mistake four times: **the harness's send card is a FULL MANUSCRIPT**,
which has no unit to pick, so `unit` is satisfied by the material itself.

- the square was expected on `#s-unit`; it correctly sits on `#s-when`
- the chip was expected to read `4 to answer`; `3` is right
- the missing line was expected to hold four links; three is right
- the landing section was named `#s-unit`

Each now compares **two readings of the page** — the chip's number against the line's links, the
landing section against the square's own answer — which is what "one declaration, four surfaces"
is actually claiming. A number in an assertion was describing the test data.

**And one probe was wrong while the app was right:** the stepper read `77 → 4`, which looked exactly
like a typed value being discarded. It was the probe firing blur and click in one tick, reading the
stepper's closure before React had flushed. Split into two events — as a writer's two actions are —
it reads `77 → 78`.

---

## Concurrency

Three sessions shared this checkout. What happened, in full:

- **Two commits swept a foreign file into my staged set.** `PackagesHeroBand.tsx` on the first
  attempt at Phase 4, then `PackagesHero.tsx` on the retry — the packages session created and staged
  them inside my window. **The file count caught both** (5 where I expected 4). Unstaged; their
  files were never modified and neither reached a commit of mine. On the second occurrence I took
  the index down to my four paths explicitly rather than by subtraction.
- **Reds I attributed to them, and did not chase:** `workspacePageGrid.test.tsx`'s masthead census
  and the three `materialsPageSmoke` failures it took with it (`SubmissionPackages` had lost
  `variant="workspace"`). They were absent in my own worktree throughout, which is how I knew. Both
  are green again now without my touching anything.
- **The dev server's sign-in failed once** mid-run and recovered on retry; noted rather than chased.
- **The harness account changed under me** — the Close rows disappeared between phases. Reported as
  NOT RUN, never as a pass.
- **No phase was deferred for a contested file.** Nothing I own was touched by another session.

My own gate baseline, recorded at `f19a2a7f` before any edit: tsc 0 errors, 6,086 passing / 1
failing (the census, my declared Phase 4 red-before). **At the end: tsc 0 errors, 6,100 passing, 0
failing.** Delta: my red resolved, nothing else moved.

## Gates

Every phase verified in its own worktree — tsc clean, `build:dev` clean, full Vitest — because the
shared tree's totals moved under me all night.
