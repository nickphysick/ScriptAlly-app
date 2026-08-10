# Manuscript-aware dashboard (B1–B4) — run report

Baseline `d10f728`, taken in a **fresh worktree** (`/Users/nickphysick/ScriptAlly-msb`) because the
previous one had drifted 13 files from HEAD — a green suite on a mixed tree proves nothing.

| Phase | Commit |
|---|---|
| B1 selection state (+ rules) | `a80cad6` |
| B2 scoping | `06655e6` |
| B3 empty + single cases | `05f0c31` |
| B4 verification | *this commit* |

Final gates: `tsc` clean · **3,619 passing, 2 skipped** · `npm run build` ✓.

## The rules deploy (B1's gate)

Deployed to dev with **both configs**, because `scriptally-dev` has two Firestore databases and the
success line never names which one it hit. Verified by release `updateTime`, not by the message:

| Release | updateTime |
|---|---|
| `releases/cloud.firestore` | 09:53:05 |
| `releases/cloud.firestore/ai-studio-…` | 09:52:48 |

**Ruleset `05445b7e-e7c0-4a95-9b55-9024fcf09364`** on both. **Prod rules remain Nick's** — the
field is inert in production until he ships them, and until then a prod write of
`selectedManuscriptId` is silently denied.

## The classification, as built

| Scoped to manuscript | Account-scoped |
|---|---|
| Active-queries chart | Agents on file |
| Queries-sent counter | Tenure ("querying since") |
| Responses counter | **Achievement pill** (see below) |
| Query-keyed + manuscript-keyed tasks | Agent-keyed housekeeping |
| Query events in the feed | Agent events in the feed |
| Querying goals | User tasks ("yours") |
| The book half of the author tile | The author half |

**One addition to your table: the achievement pill stays account-scoped.** It sits directly beside
the tenure pill, which is explicitly account-wide. Narrowing "your best month" to one book turns a
real record into a weaker claim about a subset, and two adjacent pills answering at different
scopes is the two-numbers-one-name fault in a new place.

**User tasks are unscoped.** `UserTask.manuscriptId` exists but is optional and rarely set, so they
follow the same rule as everything else without a manuscript: no manuscript → always visible.

## ⚠️ The design finding you asked for — the tasks list barely moves

You asked me to say this plainly rather than ship it quietly. **It is real.**

Of the four housekeeping kinds, **two are agent-keyed and therefore never move**:

| Housekeeping kind | Keyed on | On a switch |
|---|---|---|
| `dream_agent_unqueried` | agent | **unchanged** |
| `data_quality_poor` | agent | **unchanged** |
| `querying_unstarted` | manuscript | scoped |
| `no_response_close` | query | scoped |

The urgent tier is entirely query-keyed, so it moves cleanly. But on the deployed data the trio read
**4 urgent · 26 housekeeping · 2 yours** — so the *largest* tier is dominated by the two kinds that
cannot move, and the "yours" tier does not move either.

**Expect a switch to change the chart, the counters, the goals and the feed's query events
noticeably, and the tasks card hardly at all.** That is correct behaviour — an agent with no reply
window on file is a fact about a person, true whichever book you have selected — but it will *read*
as though the card is broken, because the card gives no reason for its stillness.

I have **not** added explanatory copy, per your instruction to report the real behaviour first. The
options, when you want them: the housekeeping pill already separates the two kinds and may be
enough once seen; otherwise a quiet line, or moving agent-keyed housekeeping out of the dashboard
card entirely on the grounds that it is not dashboard work.

## Verification

**Both directions asserted** on a two-manuscript fixture with different query sets: scoped sets
differ between `m1` and `m2`, **and** the agent-keyed task and agent event are present and
identical in both. A scoped figure that fails to move is asserted as a failure, not only the
reverse.

**Single manuscript — the regression risk, tested hardest.** Asserted as a **no-op**: each scoped
set `toEqual` the unscoped one, and the scoped stage equal to the account stage. That is a stronger
claim than "looks the same".

**Deleted manuscript**: a stored id that no longer resolves falls back to the most recently created
book rather than throwing. **Never matched on title** — a lock asserts a title resolves nothing,
since two books may share one.

**Not verifiable here:** `vitest` is `environment: 'node'`, so the re-render-on-switch and the
persistence across reload/route are **not** covered by the suite. The state is on the user document
and read through `currentUser`, so persistence follows from the store rather than from a component
— but it has not been exercised in a browser.

### ⚠️ No 1440×900 screenshot

`/dashboard` is auth-gated and I will not enter credentials, so the only capture available is the
sign-in page. Everything above is verified by suite, by source, and by the rules API. **Nobody has
switched a manuscript in a running app.** That, and the tasks-card finding above, are what to look
at first on dev.

Cappuccino only; Bold and Editorial remain unreviewed.
