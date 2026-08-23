# Querying goals — Phase 5 measurements

Local `vite preview` of a `npm run build:dev` bundle from this worktree, signed in as the
harness account, `SA_E2E_BASE_URL=http://localhost:4197`. Every state was **seeded** by writing
`queryingGoals` on the account and reloading, then restored — measuring whichever state the
account happened to be in would not be coverage.

⚠️ **The scroller is `.ws-wbody`, not `.ws-cscroll`.** The pack named the latter; it does not exist
on this route (`WorkspaceShell` moved it and says so in its own comment), and a null selector
reports zero overflow and passes having measured nothing. Every read asserts non-null first.

## The gate — state C must not make the dashboard scroll

| Viewport | goal card | activity card | its floor | slack | **overflow** |
|---|---|---|---|---|---|
| 1920×1080 | 274.3 | 468 | 120 | 348 | **0** |
| 1440×900 | 274.3 | 288 | 120 | 168 | **0** |
| 1280×800 | 274.3 | 196 | 120 | 76 | **0** |
| **1440×720** | 274.3 | **120** | 120 | **0** | **0** |

State A 156.3 · State B 167.8 · State C 274.3. **Δ C−B = 106.5px**, close to the ref's predicted
+101 and absorbed everywhere.

⚠️ **1440×720 has zero slack, and that is the honest number.** The activity card sits exactly on
its 120px floor and nothing scrolls — the layout absorbs state C and not one pixel more. Flagged
per the pack's under-30px rule.

**The floor is 120px, not the 150px the ref states.** With 150 the tight case would have overflowed
by 30.

## Under stress

Repeated with the tallest realistic card — four history periods (the cap) and two digits on both
sides of "13 of 10":

| Viewport | goal card | history | self-crop | overflow |
|---|---|---|---|---|
| 1440×720 | 274.3 | 26.3 (1 line) | 0 | **0** |
| 1280×800 | 274.3 | 26.3 (1 line) | 0 | **0** |
| 1440×900 | 274.3 | 26.3 (1 line) | 0 | **0** |

**State C's height is constant at 274.3 regardless of content** — the count, the target and the
history do not change it. That is what makes the zero-slack case safe rather than lucky.

⚠️ **The real worst case is a WEEKLY cadence, not a monthly one.** Monthly history labels are three
characters (`JUL`); weekly and fortnightly are dates (`10 AUG`), roughly twice as wide, and the
strip wraps. Measuring only the monthly case and calling the layout safe would have been a
coincidence of the fixture's cadence. Measured, reached, at 1440×720:

```
"10 AUG 0 · 3 AUG 13 · 27 JUL 0 · 20 JUL 3"   hist 26.3 (1 line)   goal 274.3   over 0
```

⚠️ That case was **wrong on its first run** and reported comfort: with no send dated today the
weekly period was empty, so it measured state B — 134px shorter. It now asserts `reached` is true
before believing the number, which is the precondition rule this repo keeps paying for.

## What was NOT reproduced

**1440×720 does not scroll today, and did not before this pack either** — baseline overflow was 0
at all three original viewports. The pack expected the locks to release there; that expectation was
wrong and is dropped rather than worked around.

## Housekeeping

Every seeded write is undone. Verified after the run, not assumed:

```
stress queries left behind: 0
queryingGoals on the account: null
total queries on the account: 44
```
