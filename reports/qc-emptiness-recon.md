# Query Centre — every place that decides "empty" (§1 recon)

Measured on deployed dev with a `MutationObserver` installed before the app boots, because a 155ms
flash cannot be caught by sampling. The last pack's checks passed while the flash was live: they
measured the skeleton's stylesheet and the resolved page, and never asked what was on screen in
between.

## The sequence, as recorded

| t | what is on screen |
|---|---|
| 24ms | nothing — `authReady` is false, the app shows its splash |
| **336ms** | **"No queries yet" / "Your first query starts here"** — 0 rows |
| 491ms | 44 rows |

`firstRun@311ms → rows@507ms` on a second run. **The skeleton never rendered at all.**

## Every branch that decides emptiness

| # | Site | Condition | Distinguishes not-loaded from empty? |
|---|---|---|---|
| 1 | `Queries.tsx:3956` — skeleton vs first-run | `showSkeleton && !collectionsReady` | **NO — this is the fault** |
| 2 | `Queries.tsx:3957` — the empty-database branch (list placeholder + welcome pane) | `queries.length === 0 && !creating` | **NO** — reached whenever #1 is false |
| 3 | `Queries.tsx:4754` — list "No queries match these filters" | `sortedList.length === 0 && queries.length > 0` | Incidentally yes — the `queries.length > 0` clause makes it unreachable while loading |
| 4 | `Queries.tsx:6041` — pane `qc-nomatch` | `sortedList.length === 0` | Incidentally yes — nested inside the populated branch |
| 5 | `Queries.tsx:1893` — the remembered-selection restore | `queries.length > 0 && !selectedQueryId` | N/A (does not render an empty state) |

There is exactly ONE render of the first-run copy, at `Queries.tsx:3975`/`4005`, and one path to it.
The "other path" is not a second component — **it is time**.

## Why the last fix did not take

⚠️ **THE GRACE IS INVERTED, AND IT GUARANTEES THE THING IT WAS MEANT TO PREVENT.** `showSkeleton`
starts `false` and flips `true` 180ms after MOUNT. The Query Centre mounts when `authReady`
resolves — measured at ~336ms — so the timer starts then, and for the next 180ms the ternary at #1
falls straight through to #2. The data arrived at 491ms, *inside* that window. So on this account
the skeleton could never render, and the empty state covered the entire load.

It was borrowed from the Dashboard, where it is correct: there the flag guards a component that is
already mounted. Here it guards the first paint of a component that mounts late, and a grace before
a skeleton is a grace during which something else renders — that something being the wrong answer.

## What `collectionsReady` gates, and what it missed

`collectionsReady` is false until manuscripts, agents AND queries have each delivered a first
snapshot. It is the right flag and this page's branch #2 never consulted it — only #1 did, behind
the grace. ⚠️ **AND `markCollectionsLoaded` TRUSTS THE FIRST SNAPSHOT WHATEVER ITS SOURCE**: it sets
`qLoaded = true` on any snapshot, including an empty one raised from cache before the server
replies. That is a second way for readiness to be true while the data is not there, and it is why
#1's condition needs more than a boolean that a cache miss can satisfy.

## The rule this implies

A falsy array cannot mean both "not loaded" and "loaded and empty". Every branch above must read one
readiness value, and that value must not be satisfiable by an empty cached snapshot.

## §4 — the pane's `qc-nomatch` is NOT a clean deletion, and is left in place

Four test files reference it, three asserting the pane branch exists and one using it as a **slice
anchor** for a different claim. But the dependency that decides it is functional, not structural:

⚠️ **THE PANE'S HALF CARRIES THE ONLY WAY BACK.** The list's copy is a bare sentence — "No queries
match these filters." — with no control. The pane's half adds `Clear filters`, which also clears the
search, on the stated grounds that "a dead end is not a state, it is a trap". Deleting the pane's
half would remove the only escape from a filtered-to-zero view, so it is a regression rather than a
de-duplication until that button has somewhere else to live.

⚠️ **AND ITS ORIGINAL REASONING HAS BEEN INVALIDATED WITHOUT BEING REPLACED.** `queryCentreRest`
states it plainly: *"an auto-select fallback means 'nothing selected' is only reachable when the
FILTER matched nothing. So that is the state to design, and the pane is where it belongs."* The
auto-select fallback was retired in the previous pack, so "nothing selected" is now the ordinary
state and that argument no longer holds — the pane has a genuine unselected state of its own now.
The duplication is therefore real and worth resolving, but the resolution is a design decision (does
`Clear filters` move into the list's note, or does the list's sentence go?) rather than a deletion.

Reported and left, per the brief.
