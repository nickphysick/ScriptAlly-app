# The Correction UI — what landed, what is verified, and what is waiting on you

Five phases on `main`, unpushed, deployed to dev. One engine derives both the preview and the
outcome, and that is now measured rather than asserted.

## Verified on the deployed page

| Check | Result |
|---|---|
| 1 · a date edit crossing another event: preview == outcome | **verified, twice** — rung for rung, including the crossing |
| 4 · a note-only edit raises no sheet | verified |
| 5 · the To-do focus sheet carries no ⋯ | verified |
| 2 · removal | sheet + removal verified; **undo not exercised** (see below) |
| 3 · move between queries | **not built** |
| 6 · removing a closure reopens the query | **unexercised** — no closed query with a removable closure |

## Three questions for you

**1 · The move flow is specified and not built.** `correctionGuards.ts` holds its guards, its target
notes and the stale-note check, all tested. What is missing is the target picker and the two-query
atomic undo — a surface of its own. I stopped rather than build it shallowly at the end of a long
pack. Nothing is half-wired: the ⋯ offers no Move, so there is no dead control.

**2 · `CorrectionFork` mounts as a sheet, not as menu items.** Ref 169 draws the fork both ways —
card 1 as two menu rows, card 2 as a sheet. I built card 2, because the two branches carry a
sentence of explanation each and a menu row cannot hold one. Defensible, and worth your eye.

**3 · The harness account needs re-seeding, and that is my doing.** Getting check 1 verified cost
several destructive runs, and the undo that should have reversed them was masked by a selector fault
of the probe's own (a case-sensitive `/^Undo$/` against a label rendered `.toUpperCase()`). The
account now holds no query with two correctable entries, so checks 2 and 6 cannot run. Nothing of
yours is touched — this is the `SA_E2E_PASSWORD` account — and re-seeding it finishes both checks in
one run.

## The fault worth reading

The removal's undo was wired with an empty closure: the toast said UNDO, and pressing it would have
done nothing while telling the writer it was reversed. **An absent control leaves someone knowing
they must fix it themselves; a dead one leaves them believing it is already fixed.** Fixed with
`deleteActivities(ids)`, which captures both stores before deleting and returns the closure that
writes them back, recomputing once at the end. The law is recorded in `CLAUDE.md`.

The undo's *page* behaviour remains the one unverified claim in this pack.
