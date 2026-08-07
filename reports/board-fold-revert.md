# P6 reverted, and the card gap put back (7 Aug 2026)

Two jobs, and they turn out to be **one cause**: the thing that made the cards look cramped was
the fold's own lane wrapper. Reverting P6 fixes the spacing as a side effect — but the gap is now
locked independently, so it survives whatever comes next.

Suite **3248 passed | 2 skipped, 207 files** (down 16 from 3264: 24 fold locks out, 8 gap locks
in). tsc + production build green.

## 1 — Collapsible columns and reflow are GONE

Parked, not paused: no dormant code, no dead flag, no stored preference.

**Deleted outright:** `src/lib/todoFold.ts` (the whole lib — `readFold`/`writeFold`/`toggleFold`/
`reflowPlan`/`splitLanes`/`reflowHeadLabel`, `FOLD_RAIL_PX`, `REFLOW_MS`, `MAX_LANES`) and its 24
locks. **Out of `TodoBoard.tsx`:** the `fold` state and `flip`, the `foldOverride` prop, the
folded-rail early return, the head's ▾ control, the `gridColumn: "span 2"` reflow, the
`SHOWING · WAS` figures, the lane split; `columnSlice` is restored as the one capping path.
**Out of `todoBoard.css`:** the whole P6 block — `.tbd-folded`, `.tbd-railbtn`, `.tbd-railchev`,
`.tbd-railn`, `.tbd-railname`, `.tbd-foldb`, `.tbd-showing`, `.tbd-body2`, `.tbd-lane`,
`.tbd-span`, the `tbdLaneIn` keyframes and the reduced-motion line that suppressed them.

**The estimates survived the file they lived in.** P7 had appended its locks to
`boardFold.test.tsx`, so deleting that file wholesale would have taken time estimates with it.
The eight estimate locks moved to **`boardEstimate.test.tsx`** under their own name, with the
provenance in its head — a suite named for a feature that no longer exists is its own small trap.

**The stored preference:** the fold lived in `localStorage` under `sa.todoFolded` and **never
reached Firestore** — P6's own commit recorded the schema diff as locked, and the rules and types
are untouched by this revert because there was nothing in them to remove. Nothing reads or writes
that key now, so it is inert; a browser that folded a column on dev keeps a stray string with no
reader. **I have deliberately NOT added a cleanup shim** — code whose only job is to delete a key
nobody reads is exactly the dormant code the instruction rules out, and it never reached prod.

### ⚠️ `todoPrefs` SURVIVES — the prod sequencing does NOT shorten

Checked directly rather than assumed. `todoPrefs` was introduced by **P5** (`6c0fb97`), the Task
settings sheet, and holds the four behaviours — stale threshold · a good day is · roll forward ·
weekly briefing. **None of them is the fold**, which used localStorage precisely because a view
preference had no business in the schema the board derives from. Live readers today:
`TaskSettingsSheet` (writes all four), `todoColumns.wipLine` and `todoEstimate` (both read
`goodDay`), `TodoBoard` (the prop), `ToDoPage` (feeds it) — all P5/P7, all standing.

**So the prod rules queue is unchanged: rejectedDate · detail/surfaceOffset · committedDate ·
tags · todoPrefs · estimateMin.** Sorry — no shortening available.

### Nothing else depended on P6

`grep` across `src/` for every fold and reflow identifier returns nothing but the new gap lock's
own explanation of the shape it guards against. The one shared thing P6 touched was
`BOARD_COL_CAP` (it multiplied the cap by the lane count); `columnSlice` owns capping again, at
the single-lane figure it always had. P7's estimates never referenced fold state.

## 2 — The card gap, restored and pinned

**The cause, named.** The gap is `.tbd-body > .tbd-card { margin-bottom: 12px }` — a
**direct-child** selector. P6 rendered every column's cards inside a `.tbd-lane` div, which put a
node between the body and its cards, so the rule stopped matching. Both gaps died: the 12px
between cards and the 21px under a sweep pile.

**And it was never confined to reflowed columns.** The lane wrapper was rendered
unconditionally — `splitLanes(visible, 1)` still returns one array, which still got a wrapper — so
**every card on every column went flush**, on a board where no column had been folded at all.
That is why it read as a spacing regression rather than as a reflow bug.

The declaration was correct and present in the file the entire time. Nothing failed: not tsc, not
the production build, not one of 3264 tests. A CSS combinator can stop applying in perfect
silence, which is what makes this worth a lock rather than a fix.

**The lock (`boardMeasure.test.tsx`, four cases).** A value-only assertion would have sailed
through the whole regression, so the lock asserts the rule **together with the DOM shape it
depends on**, against rendered markup:

1. the gap is declared at its value, and the sweep's wider one with it;
2. **no element opens between `.tbd-body` and its first `.tbd-card`** — the assertion P6 fails;
3. **all three cards are siblings** and `tbd-lane` appears nowhere — a per-pair wrapper would
   leave the first card correct and orphan the rest, which case 2 alone would miss;
4. `.tbd-body` declares no `gap` of its own — two owners would make the real spacing their sum,
   and the next reader would "fix" the value and make it worse.

**Verified against the bug, not just written.** I reintroduced P6's lane wrapper and confirmed
cases 2 and 3 go red, reporting *"a wrapper sits between .tbd-body and its cards — the card gap
is dead"*, then restored and re-ran green. The file is renamed `.test.ts` → `.test.tsx` because
the structural half has to render.

The CSS now carries a comment at the declaration explaining why the `>` is fragile and pointing at
the lock — the house rule being that the comment explains the test rather than standing in for it.

## Deploy

Dev hosting redeployed at this commit. **No rules change** — this revert touches neither
`firestore.rules` nor `types.ts`, so the rules on both dev databases stay as deployed earlier
today, and the prod queue is untouched.
