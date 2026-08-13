# Query Centre — Pack A: reconcile, then fix what is actually broken

Refs: `98-sheet-crumb.html` (§3 `.agband`) · `96-form-colour.html` (the sage cap's rationale).
Commits `eacfde1` → `91616ef`. **Not deployed, not pushed.**

---

## 0 · Reconcile — did the fix pack run?

**No. Nothing did.** `ResponsePane.tsx` had exactly two commits in its whole history, both the
original build: `0a438ed` (the shell — which wrote `.qr-ref` and the "FOR REFERENCE" caption bar)
and `37e62f1` (the branching). No `qc-record-fixpack-1.md` exists in the repo or `~/Downloads`. The
"fix pack" commits in the log (2, 3, 4, 5) are all **create-mode** packs.

**Both faults traced to one commit, and it was not a record pack.** `98bc614` — the rhythm/dock pack
— wrote *both* `.qc-stack { margin-top: auto }` and `.qr-ref { align-self: stretch }` (deleting a
sticky as it went). Clean ground, nothing half-fixed.

| # | Question | Answer |
|---|---|---|
| 2 | What renders the pink block | `ResponsePane.tsx:229`, `.qr-refsub` inside `<aside className="qc-ref qr-ref">`. **Not** old FocusForm styling — record's own, from `0a438ed`, painted with create's marginalia tokens |
| 3 | Are `AgentContextPanel`'s rows content? | **No — hard-coded.** Props were `{agent, queries, onOpenQuery}`; every row computed internally from `lib/agentContext`. §2 was a real refactor |
| 4 | What produces the bottom alignment | `f12.css:418`, `.qc-stack { margin-top: auto }` — **on the stack as a whole**, wrapping the active section *and* the queue |
| 5 | Create's agent block | `QueryCreatePane.tsx:314`, `.f12-hero.qc-hero` — **118px measured** (the prompt's ~130 was an over-estimate) |
| 6 | Do chips render before completion? | **Yes, both.** Create 3 chips / 1 empty ring at stage 1; record 2 / 1 before any choice |

Two premises in the prompt that the code contradicted, both confirmed and struck: create has **no**
`position: sticky` (deliberate, with a browser-measured note), and there was nothing orphaned to
remove.

---

## 1 · Gates

| | tsc | `vite build` | Vitest |
|---|---|---|---|
| **Baseline** | pass | pass | 275 files / **4551 passed**, 0 failed |
| **Final** | pass | pass | 277 files / **4574 passed**, 0 failed |

---

## 2 · The distribution rule — four states, three sizes

Gap = header block bottom → active step top. **Slack** = the same measured from the last element
*before* the stack, which separates real slack from legitimate content (create puts the agent band
in between).

| state | before (1024 / 1440 / 1920) | after — slack |
|---|---|---|
| create, a step open | 130 / 195 / 375 | **12 / 12 / 12** |
| record, nothing chosen | 226 / 358 / 538 | **0 / 0 / 0** |
| record, branch open | 65 / 197 / 377 | **0 / 0 / 0** |
| create stage 1 (all collapsed) | 341 / 473 / 653 | **12 / 12 / 12** |

The tell was that the gap **scaled with viewport height** — the signature of the whole stack being
pushed rather than the queue after it. `margin-top: auto` now goes on the first collapsed section
*after* the active one, which carries it and the rest of the queue to the dock while the open step
stays with its question.

**The assertion is constancy, not a threshold.** Header-relative distance legitimately differs
between the journeys, so a literal would have encoded the agent band's height and failed the moment
§3 shrank it. Spread is 0 in every state.

### ⚠️ The rule's third clause has no live case

"When every step is collapsed the whole stack sinks" describes create's stage 1 — and stage 1 is not
this stack. It is `.qc-ghosts`, which carries its **own browser-measured decision against** an auto
margin: *"514px of dead space with it and 12px without"*, because that column also holds a picker, a
panel and a grid. The old `.qc-stack` rule had been overriding it. Removing it restored the
documented 12px exactly. So **no `--settled` modifier ships** — both `StepStack` callers always name
an active step, so it would have been a class that never applies keying a rule that never matches.

---

## 3 · The pink block, and what is *not* dead

`.qr-ref` and its `qr-ref*` children are deleted — a second chassis for one job.

**`--qc-ref-*` are NOT dead, and nothing is reported as such.** `--qc-ref-plate`, `--qc-ref-rim` and
`--qc-ref-rule` are create's marginalia treatment and `.qc-ctx` is a live consumer; deleting them
alongside would have taken the surviving panel's rim with it. The record rows' new
`.qc-ctxrow`/`.qc-ctxrk`/`.qc-ctxrv` read `--qc-ref-rule` too.

One rule was retired rather than repointed: `@media (max-width: 1100px) { .qr-ref { display: none } }`
— `.qc-ctx` already carries its own hide at that breakpoint, and a second rule for one element at one
breakpoint is one more thing to keep in step for no gain.

### The panels, before and after

| | create | record |
|---|---|---|
| **before** | 326×427, `flex-start`, static | 300×642, **`stretch`**, static |
| **after** | 326×427, `flex-start`, static, top 148 | **326**×395, **`flex-start`**, static, top 148 |

Height differs by content, which is the one thing that should. Equality asserted at **1440 and 1920**;
**absence** asserted at 1024, because both are `display: none` below 1100px and an equality test where
both measure 0×0 cannot fail.

No `position: sticky` on either, and the reasoning is carried into record's file so it explains its
own absence: `.qc-form` is the scroll container, the panel is its sibling, `.qc-two` never scrolls —
scrolling the flow 104px moved the panel 0.0px.

**A live bug found in passing:** `responseRefRows` was being called with a literal `[]`, so
`historyRow` returned null on **every reply ever recorded**. `ResponsePane` takes `queries` now.

---

## 4 · The band, and the double gap

Agent block **118 → 63px**; the first question's top moves 269 → 214, so the stack begins **55px
higher**. (§3 predicted ~90, from a ~130px card that measured 118. The band matches the ref's 62px.)

⚠️ **The ref's `margin-bottom: 14px` was a trap.** Its container has no gap; `.qc-form` is a flex
column with `gap: 12px`, so the margin *adds* — measured 26px of slack against the 12 the rest of the
column reads. Two elements, one gap, never both. Taking a value from a ref without checking what the
container already pays is how a double gap gets in.

`.qc-hero` retired with the card it dressed. Fixture regenerated deliberately: four hero classes out,
four band classes in, nothing else.

---

## 5 · Chips — and the fault the browser caught after the first fix

Filtering on `answered` was not enough. Create still opened with a **ticked Date chip** at every
size, because `QueryCreatePane` reported a step opened with `i >= stepIndex(...)` and `reached`
starts at the *first* step — so "opened" was true for When from frame one. Record had the same fault
one step later (its Date chip armed on `active === "when"`). Both are **strictly past** now.

`requirements`' own rule is untouched: "opening a step ticks it even when the writer changes nothing"
is still true and still locked. What changed is when the *pane reports* a step as opened, and those
booleans have exactly one consumer — the chips.

Measured, all three sizes: **create stage 1 → 0 chips**; **record 0 → 1** on choosing an outcome,
with the title holding at **56** and the place line at **87**. Space reserved via `min-height`, not
animated — a height transition still moves everything below it for its duration.

---

## 6 · Browser checklist

`tests/e2e/qcReconcile.measure.ts`, committed with §1 as its lock. Against a local `build:dev`
preview, signed in. **9 tests, all green.**

- Four states × three sizes, gap and slack — table in §2.
- The active step holds position: spread **0** in all three open states.
- Stage 1's ghosts hug: 12/12/12.
- Panels indistinguishable in chassis at 1440 and 1920; absent at 1024.
- Neither panel stretches — both shorter than the column.
- Chips: zero on arrival in both journeys; earning one moves neither title nor place line.

**Not verified in the browser:** the two journeys side by side by eye (the measurement compares
numbers, not appearance), and the collapsed queue tracking the dock as steps open *and close* — the
harness opens steps but never closes one.

---

## 7 · Locks: five caught real faults

1. **`createFrames` fixture** — caught §3's markup change. Regenerated deliberately, diff read.
2. **Two keyframe locks** — caught a `var()` reported inside `f12-collapse`. Cause: a **one-line
   `@keyframes` has no `\n}`** for the extraction regex, so the match ran on into §3's new rules and
   reported *theirs*. Same trap as `qc-scrim-in` in the sheet pack. **Every one-line keyframe in the
   sheet is now multi-line.**
3. **…which then exposed that those two locks overreached.** `f12-settle` has used
   `background: var(--pink-t)` since it was written and works — but as a one-liner the regex could
   never extract it (`[^@]*?` cannot cross the next `@keyframes`), so a blanket "no var() in any
   keyframe" had been passing on a keyframe it could not see. The documented failure is a `var()` in
   a keyframe **percentage**, where the block is dropped silently. Both narrowed to selector
   position, matching `createSaveMotion`, which already checked it that way. **A rule narrowed
   because it overreached, not to make a change pass.**
4. **`testAnchors`** — no new hits this pack.
5. **The comment-vs-code trap, eighth occurrence** — `recordResponseShell` matched `qr-ref` in the
   prose explaining its deletion. Comment-stripped.

---

## 8 · Flagged, not fixed

- **The panels hide below 1100px.** A writer on a 13" laptop in a split window loses the glance
  entirely during **both** journeys — including the agent's stated policy, which record's copy leans
  on. Recorded in `f12.css` where the rule lives, so it is met rather than rediscovered during the
  mobile pass.
- **`.f12-root .f12-hero:not(.qc-hero) > .f12-btn-pri`** — the `:not()` now excludes a class nothing
  renders, so it is a no-op. Harmless, but it reads as load-bearing. Left alone because simplifying
  it means editing a mobile lock inside a desktop section.
- **Ref count** — five of the six named files arrived (94, 95, 96, 98, 100). `98` is the one §3
  needed.

---

## 9 · The mechanism worth keeping

`98bc614` took reasoning correct for **one state** — create's stage 1, where every step is collapsed
and the stack really is all remainder — and wrote it into a comment as a general rule. The comment
made it look decided, so no later reader had cause to re-derive it. **A rule derived from one state,
written into a comment, becomes load-bearing.** That comment is rewritten in the same commit as the
fix, because a stale comment asserting the fault is how the fault comes back.

And the two panels reaching 326×427 against 300×642 with different alignment is what per-journey
pixel locks buy: **neither was wrong on its own terms**, so no lock on either side's numbers could
ever have failed. Equality is the only assertion that could.

---

**Not deployed. Not pushed.**
