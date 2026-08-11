# Query Centre — Record response

The response journey. Where a query is logged by the create takeover, this is how it moves on.

**Landed:** ref `9284ec4` · extraction `2999e59` · §1 `0a438ed` · anchor sweep `40ed4f3` · §2 `37e62f1`.
Gates green before each (`tsc --noEmit`, `vite build`, full Vitest, `set -o pipefail`).
Suite **3,869** at close, from 3,774. **Not deployed, not pushed.**

**Next session, in this order:** materials extraction → §3 → §4 → §5 → finish this report.

---

## Step 0 — recon findings

### The four surfaces, and the one that mattered

| surface | file | wrote | through `recomputeQuery`? |
|---|---|---|---|
| "Record response" primary | `Queries.tsx` (hero + mobile) | **nothing** — `composerRef.current?.focus()` | n/a |
| "What happened next?" | `reading-pane/TimelineComposer.tsx` | `recordQueryResponse` | yes |
| "Mark closed" | `Queries.tsx` toolbar | `updateQueryStatus` | yes (appends, then `recompute()`) |
| Mark-sent popover | `MarkSentPopover.tsx` | writer-side sends | — |

**The finding that shaped §1: the primary was not a door.** It focused the composer. So deleting the
composer and giving the primary a real action were **one change**, and a test for either alone would
have passed over a dead button.

### The write path

**`recordQueryResponse(deps, data)`** — `src/lib/recordResponse.ts`. Sets `resultingStatus` on the
activity (exact enum member), writes response DETAILS only, then calls `recomputeQuery`. It already
returns an `undo()` that reverts its own writes and recomputes. **This pack is a new UI over a
primitive that existed**, not a new write path. *(Note the argument order: `deps` first.)*

### Outcomes → `QueryStatus` — all six map, no model change

`Partial Requested · Full Requested · Revise & Resubmit · Offer · Rejected · No Response`.

**`Withdrawn` is deliberately absent and that is §5's whole reason.** Withdrawing is not a response —
nothing came back. `recordQueryResponse` maps `close` → `NO_RESPONSE` unless `closingReason` is
`"Withdrew my submission"`, which this journey never sends. Removing "Mark closed" therefore strands
`WITHDRAWN` until §5 lands.

### Create-mode pieces: already generic vs extracted

| piece | verdict |
|---|---|
| `AgentContextPanel`, `BrandDatePicker`, `createQty`, `createSteps`, `agentContext` | already generic |
| Fix-pack-5 motion | generic in CSS, welded in JS — the two takeovers now share the classes |
| **Step stack** | **EXTRACTED** (`2999e59`) → `lib/stepStack.ts` + `queries/StepStack.tsx` |
| **Materials chips + unit stepper** | **still welded** — see the deferral below |

### Nudge tasks — verified, and no resolver was built

**Tasks are DERIVED per render** in `db.tsx` (`calculatedTasks`); only suppression is stored.
`replyTask` (`lib/taskPrecedence.ts:51`) gates a nudge on
`status ∈ {Queried, Partial Sent, Full Sent}`. **Every one of the six outcomes moves the status off
that set, so the task stops being produced.** There is nothing to close, and a resolver would be
worse than nothing because the next person would believe it was doing something.

Locked in `responseJourneys.test.ts` — including an assertion against `taskPrecedence.ts` itself, so
narrowing that gate fails here rather than quietly resurrecting a task nobody can dismiss.

---

## What landed

**`2999e59` — the step-stack extraction.** Pure refactor, proven by five rendered create-mode frames
byte-identical at 56,196 bytes. That proof is now a standing guard: `createFrames.test.tsx` +
`createFrames.fixture.html`, with `SA_UPDATE_CREATE_FRAMES=1` to regenerate deliberately.

**`0a438ed` — §1, the shell.** Takeover from the primary; header with motif, italic line and two
chips; reference panel present from the first frame; shared entrance/cancel/save motion. Removed:
the inline composer, "Mark closed", the generic "Edit".

**`40ed4f3` — the anchor sweep.** See the rule below.

**`37e62f1` — §2, the branching stack.** Three-across grid, three journeys, and the reseat.

---

## ⚠️ Decisions that will be expensive to rediscover

**The correction editor is unreachable, deliberately.** It lived *inside* the composer §1 removed,
so `QueryTimeline`'s "Edit" menu item had nothing to call — it rendered unconditionally and called
an optional handler, which is silent when absent. It now renders only when it has somewhere to go.
**Correcting an entry is ABSENT rather than dead** until its own work lands. The ref
(`83-record-response.html`) carries that second view; it is no part of this pack.

**The general rule that came out of it:** *an optional handler whose trigger renders unconditionally
is a menu item that lies.* Silent-when-absent is the worst failure mode — no error, no log, just a
click that does nothing.

**Source-string anchors must be scoped to a journey before they match.** Three occurrences in one
session, all in `Queries.tsx`. `src/lib/testAnchors.test.ts` now scans every source-reading test and
fails on any bare `indexOf` whose literal occurs more than once in the file it reads. **This rule is
NOT yet in CLAUDE.md and that is deliberate** — another stream was holding CLAUDE.md with nineteen
uncommitted deletions, and committing it by path would have removed their work under this stream's
name (the `61924e7` shape). **Add the pointer only after re-checking that their edit has landed.**

**No red anywhere.** Endings are muted grey, offers burgundy, incoming sage. A rejection is not a
failure state, and the response CSS block introduces **zero colour literals** (asserted).

**The discard notice speaks only when it cost something.** A notice that fires when nothing was lost
trains the writer to dismiss notices — so when one finally matters, it is already invisible.

---

## ⚠️ Deferred, with the trap attached

**The request step needs fix pack 4's materials chips and unit-aware stepper.** They are welded into
create's `What` step across ~120 lines; reusing them means extracting them — **its own pure-refactor
commit, and `createFrames.fixture.html` makes proving it cheap.** Do it at the START of a session,
not the end: a rushed 120-line JSX move risks create mode. The step currently holds what it can
state honestly — what they asked for in the writer's words, plus the deadline.

**⚠️ AND THE PRE-TICK MUST READ THE NEW ASK, NOT THE OLD ONE.** When that extraction lands, the
request step pre-ticks from **what the agent has now asked for**, never from what they asked for at
query time. A full request SUPERSEDES the original materials. This is easy to get wrong precisely
because create's seeding (`materialRowsForDraft(agent)`) looks reusable and is not: create seeds from
the agent's standing requirements, and here the writer is recording a *fresh, specific* ask.

---

## Flagged, not acted on

- **Another stream is recapitalising "Contact list" → "Contact List"**, which appears to reverse
  `a9fc684`'s *"the page is Contact list — sentence case, everywhere"*. Five comment-only lines rode
  into `0a438ed` because path-level staging cannot exclude them. **Nick is asking that session what
  it is doing** — do not restore, do not raise as a bug.
- **`deleteQuery` orphans journal entries** (top-level collection, not in its cascade). Create's undo
  works around it; the Delete button still has the gap. Fix belongs in `db.tsx`.
- **`prefersReducedMotion` has ~6 inline copies**; `src/lib/reducedMotion.ts` is the canonical util.

---

## Still to build

- **Materials extraction** (above), then:
- **§3** — picker bounds (not before the send, not in the future), the interval line, the write
  contract. *Most of §3 is already true*: the interval is derived (`repliedIn`), the write goes
  through `recordQueryResponse`, and the nudge is verified. What is missing is the **date bounds**
  and the **R&R revision-round assertion**.
- **§4** — the row updates in place; the reading pane reflects the new status without a reload.
  **⚠️ Wire undo to `recordQueryResponse`'s own `undo()`** — never a second delete-plus-recompute
  path that looks equivalent.
- **§5** — a writer-side **"Withdraw this query"**, confirming before it writes, sitting with the
  query's own actions rather than with what the agent did. Without it `WITHDRAWN` is unreachable.

---

## Browser checklist

Nothing here has been seen in a browser — the takeover is auth-gated and the in-app pane holds the
document hidden, so animations never advance and `animationend` never fires (see
`queries-create-mode-state` memory).

- [ ] The primary opens the takeover; there is no inline composer anywhere in the pane
- [ ] "Mark closed" and the generic "Edit" are gone from the toolbar
- [ ] The timeline's ⋯ menu shows **Delete only** — no dead "Edit"
- [ ] The reference panel is there on the first frame, and states the send, the window, the history
- [ ] An agent with no stated turnaround: **no "They said" row at all** (omitted, not blank)
- [ ] Each of the six outcomes through to Save
- [ ] The stack changes shape with the outcome — request/offer/ending ask different questions
- [ ] **Fill the offer terms, then change the outcome to Rejection** — the terms clear AND the notice
      names what went
- [ ] **Change between two endings with nothing typed** — no notice at all
- [ ] partial → full keeps what you typed (same journey)
- [ ] Save is live as soon as outcome + date exist, with every later step unvisited
- [ ] Cancel with a dirty draft confirms first; Esc works during the entrance
- [ ] The whole journey with **Reduce Motion on** — every transition cuts to its final frame
- [ ] After §3–§5: date bounds, an R&R's revision round, undo from the receipt, a forced write
      failure, and Withdraw
