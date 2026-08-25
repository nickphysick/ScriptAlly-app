# Close-out — Move, `#/pkg-lab`, blue tokens, Phase 5 (25 Aug)

## Part 1 — Move

### ⚠️ The premise is wrong: Move was already on the menu

The brief says Correction UI *"shipped everything except the control: the ⋯ menu offers no Move
rather than a dead one"*. It offers one. `CorrectionFork` takes an `onMove` prop and renders a third
branch when it is passed, and `Queries.tsx:4315` passes it — gated on `moveTargetsFor().length`, so
it appears only when there is somewhere to move to.

**D2 was already honoured too, in the code's own words:**

> *"MOVE SITS ON THE CORRECTION BRANCH, not beside it. Filing an event under the wrong agent IS the
> record being wrong, so it belongs with 'I'm correcting a mistake'; offering it as a third peer
> would suggest a move is a different KIND of act from an edit."*

**No code was written for Part 1.** What follows is verification.

### Measured on the running app, 1440

```
fork branches   ✏ I'm correcting a mistake  ·  ↩ Something changed since
                ↦ It belongs to a different query        ← last, and `.cor-branch--minor`  (D2)
picker          43 candidates, each "agent · agency · STATUS"
sheet control   "Move it · one undo restores both queries"
```

⚠️ **The guard fired first, and it was right.** The probe's first pick produced no picker at all:

> *"This entry cannot move — this is the first thing that happened on this query, so it cannot move.
> The query would be left with no beginning."*

A probe that always takes entry one measures the guard rather than the move. It now takes the last
of a query with more than one.

### D3 / D4 — the source, both directions

```
BEFORE      seed-query-9  status "Partial Sent"  lastStatusChange 2026-08-23T19:18:07.647Z
AFTER MOVE                status "Full Sent"     lastStatusChange 2026-08-21T15:27:50.587Z
AFTER UNDO                status "Partial Sent"  lastStatusChange 2026-08-23T19:18:07.647Z
```

The source lost an entry, **recomputed a different status from its own remaining log, and re-anchored
`lastStatusChange`** — then undo restored both figures exactly. One toast, one undo, and the control
says so.

⚠️ **What I did not measure: the destination's derived state.** D4 asks for both sides; I captured
the source before, after and after-undo, and inferred the destination from `moveActivity`'s batch and
the restored source. Stated rather than claimed.

⚠️ **And my first assertion was wrong about a move that had worked.** I counted the top-level
`activities` feed by `queryId`; the move does not re-key that projection, so the count held at 4 and
the probe reported *"the source did not lose an activity"* about a source that visibly had. The
derived status is the evidence — a shorter log deriving a different status is exactly what D4 asks
about.

⚠️ **Harness note:** the run that failed on that wrong assertion left `cor-move-a` mutated (its
Partial Sent entry moved and not undone). Repaired by re-running `tests/e2e/seedCorrection.mjs`.
