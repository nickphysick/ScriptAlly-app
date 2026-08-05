# Tier 3 + 4 — logic gaps and hygiene · run report (5 Aug 2026)

Worked directly on `main`, one commit per landed phase, gates green per commit (tsc + vite build + full Vitest). Rules tests are CI-executed (no Java locally). No deploys of any kind. Evidence base: the 4 Aug audit + the Tier 1/Tier 2 reports.

## ⚠️ Rules-deploy requirements (read first)

None of the following bites against live data until Nick next deploys `firestore.rules` (prod + dev):

1. **Phase 3** — `rejectedDate` added to the queries update allowlist + a string validator clause. **Until deployed, recomputeQuery's new `rejectedDate` write is silently denied by the deployed rules** (the whole recompute update fails `hasOnly`), which would break every status transition — so this deploy is not optional housekeeping: **the Phase 3/4 code must not reach production hosting before the rules deploy lands.** (Dev carries the same coupling.)
2. **Phase 7** — the top-level `users/{uid}/activity` store retired (match block + validator removed → default-deny).
3. **Phase 9** — `pinned` removed from the agents validator and update allowlist.
4. **Phase 5** — comment-only on the queries block (no behaviour change).
5. Still outstanding from Tier 1, untouched per the collision warning: the tasks `committedDate` allowlist unblock (todo-stream-owned, three-spot fix recorded in the Tier 1 report).

## ⚠️ Burgundy — Nick's browser review needed (Phase 10)

The Queries **burgundy theme's hover shade changes visibly**: `primaryHover` consolidates on designTokens' `deepBurgundy` **#6b3023** (the live value used by the note components), retiring the drifted **#632e22** twin. What was removed with it: the dead `--burg-d` CSS variable (defined in index.css, referenced nowhere) and a dead scoped hover rule whose class key (`hover:bg-[#632e22]`) no JSX emitted. The LIVE hover selector keys on `#632f2f` and paints `primaryHover`, so the visible change is that hover state on the burgundy queries theme only. The dev server renders it for review; the other two queries themes are untouched.

## Step 0 — baseline and recon

**Baseline.** Start `48a48cf` (Tier 2's report commit; all Tier 2 commits present). Tree clean apart from the standing untracked `reports/app-audit.md`. Gates on clean HEAD: tsc 0 · build 0 · vitest **2199 passed | 2 skipped, 138 files**.

**0.4 — `Query.rejectedDate`.** Writers: none, anywhere (PkgLab builds in-memory dev-lab stubs; packageMetrics.test fixtures are pure inputs). Readers: `packageMetrics.ts:160` (`avgReplyDays`) and `:425` (`replySpans` → `medianReplyDaysAll`), plus `manuscriptPage.ts:92` (a last-activity date candidate). **The exact absent behaviour:** both maths sites build the first-move candidate list as `[partialRequestedDate, fullRequestedDate, rejectedDate].filter(Boolean)`; for a query rejected **without a prior request** — the most common outcome in querying — the list came back empty and the row hit `continue`. So those queries were **silently excluded** from reply-time figures despite `isResponse()` being true: not defaulted, not degraded — **wrong by omission**, biasing averages toward engaged agents and yielding `null` when only straight rejections existed. It was also in **neither** the rules validator nor the queries update allowlist, so a derived write would have been denied — both added in Phase 3. No test pins the queries allowlist string (checked).

**0.5 — `Query.lastStatusChange`.** Writers: exactly the three stamps (recordResponse.ts:242, its undo revert :369, the auto-close db.tsx:1962). Readers all coerce (Timestamp | string) behind helpers with fallbacks: the Dashboard event chains, Queries' CSV/order chains, WhatsLivePanel, fortnightEvents, dashboardStats:149, manuscriptPage:92, queryAmbient:127, the backfill heal (db.tsx:883/:914), and — read-only, no code touched — the todo dir's FocusedSession/todoLedger/todoBoard "REQUESTED {date}" surfaces. Rules: validator accepts timestamp **or string**; already in the allowlist. Semantic shift accepted and recorded: readers now see the rung's own event time (the user-chosen received date) rather than the wall-clock recording moment — which is what those surfaces always meant to show.

**0.6 — dismissedTasks migration: premise FAILS → Phase 8 SKIPPED**, exactly as the brief instructs. `migrateDismissedTasks` (db.tsx:2358) is a **manually-invoked one-shot** ("Nick runs once", :2357), not an on-load migration — and it iterates the `dismissedTasks` **state the listener feeds**, so removing the listener would silently hollow the migration into a no-op. The listener (db.tsx:567) stays.

**0.7 — pinned strip recipe:** still applied verbatim at recon time (types.ts:252-253, agentsPage.ts:107-112 partition, rules :188 validator clause + :527 allowlist entry, and the rule-text lock describe agentsPage.test.ts:321-336). Executed in Phase 9.

## Phases

**P1 (`9af5540`) — toast titles.** `getToastTitle` compared against four camelCase strings nothing produces, so partial/full/R&R/close silently fell to the generic title. Now the pure lib `responseToastTitle`, typed on `RecordResponseData["responseType"]` with a never-guarded exhaustive switch — non-members don't compile, unhandled members don't compile. Tightening `toastConfig.responseStyle` from `string` to the union surfaced the loose seam the types were hiding: the focus-form path passed prose the toast never rendered — it now passes `null` (the honest generic). Tests: all seven members + the null path.

**P2 (`fa60f60`) — timeline events.** `mapActivityToEvent` substring-matched description prose. Now the pure lib `activityEventLabel`, keyed on **typed fields only**: `resultingStatus` (exact enum, through the same normaliser recomputeQuery uses) for status distinctions — which `activityType` alone cannot make, the one refinement on the brief's letter, in its spirit — plus `activityType` for the non-status rows (nudge; the never-repeated send). The input type carries no description, so prose *structurally* cannot mean anything. Unrecognised rows → null, visibly inert. Tests include the reworded-prose invariance case and status-laden prose with no typed signal staying inert.

**P3 (`10b1a92`) — `rejectedDate` derived.** The Tier 1 pattern exactly: `deriveRejectedDate` = the final status-bearing rung's time, only when that rung is REJECTED; `deleteField()` otherwise and under the provisional import guard. Ninth derived field in recomputeQuery's single update. Rules allowlist + validator clause added (see the deploy warning); rules-suite cases for the string update and non-string denial; the single-writer sweep is now table-driven. Existing queries heal on next recompute — straight rejections re-enter the reply-time maths with the rejection as the first move.

**P4 (`00d927e`) — `lastStatusChange` derived.** Tenth field: the most recent status-bearing rung's own time, provisional-guarded. All three stamps removed — recordResponse's primary update now carries response details only, the undo revert restores neither audit field, and the auto-close's follow-up updateDoc is gone entirely. **The db.tsx close-path TODO is deleted: nothing remains of it.** recomputeQuery's payload was judged not yet unwieldy — contract, single-writer status and Store-A-only read untouched.

**P5 (`1c18a0e`) — the status door.** Recon settled the branch: recomputeQuery writes via `updateDoc` — an **update** at the rules layer — and `affectedKeys()` carries `status` exactly when a transition happens, so removing it from the allowlist would deny every real transition. **The preferred option is structurally unavailable; the fallback landed:** a deliberate-door comment on the rules block, plus `queryStatusWriters.test.ts` locking the known mutation paths at the source (engine + create-seed anchored as the two writers; updateQueryStatus/recordQueryResponse/commitQueryEdits locked to zero bare `status:` keys via anchored slices — the lowercase word-boundary pattern lets `resultingStatus`/`newStatus`/`rejectedFromStatus` pass).

**P6 (`662d4f9`) — import dedupe, one-absent.** An agency-less agent whose name is compatible with a present-agency cluster now joins it — flagged with an OPEN duplicate reason for the review gate, never auto-merged. The conservative boundary: the join happens only when the name points at **exactly one** present-agency cluster; a name matching two different agencies is genuinely ambiguous and stays in the pool unflagged. Both-present-different-agencies stays never-compared; the both-absent pool path is byte-equivalent. Tests per the brief plus the ambiguity case.

**P7 (`5bda14f`) — Store C retired.** The Dashboard listener, `timelineItems` state, and Dashboard's *entire* direct-Firestore import block (the listener was its only consumer) are gone; the rules match block + `isValidTopLevelActivity` removed (default-deny); legacy documents stay orphaned in Firestore, the manuscripts-notes treatment. The rules suite's owner-create case is **rewritten as the retirement lock** (a rules-free-seeded legacy row denied to the owner across create/read/delete).

**P8 — SKIPPED**, per recon 0.6: the migration is one-shot-manual and listener-fed. No change, no commit.

**P9 (`7836bd5`) — the sweep (−860 lines).** Legacy `components/AppShell.tsx` + `Nav.tsx`; `ShellChrome.tsx` + `TopStrip.tsx` + `QueriesRailContext.tsx`; Dashboard's dead HeroCard/StatCards imports; **Agent.pinned stripped per the recipe** (type, rules clause + allowlist entry, the retired grouping partition, its lock tests rewritten to assert the stripped state, a new emulator denial for a pinned update; `pinnedNoteId` untouched; legacy stored values inert — no typed path can carry the key and updates never touch it); the Tabler webfont CDN link; `firebase.app.json`. `#/shell-lab`'s SidebarShell/SidebarNav/QueriesRail survive, per the bake. One mid-phase red, worth recording: `shellV2Smoke.test.tsx:206` read `Nav.tsx` as source via `resolve("..", "Nav.tsx")` — a form my pre-sweep grep for `/Nav.tsx` missed — and was rewritten to the stronger absence assertion (`existsSync === false`). Note for future sweeps: grep for basenames too, not just path literals.

**P10 (`62f128a`) — burgundy + comments.** The consolidation above, plus the comment pass. Corrected (they described deleted chrome as current): App.tsx's focus-tier notes and F12 "CrumbStrip" mentions, shell/AppShell's header (an already-superseded era presented as live), SubmissionPackages' ChromeSlab/qhbar host note, ComparableTitlesPage's ChromeSlab masthead claim, AccountSettings ×3, PlansPage's FocusShell note, F12Shell's app-wide-CrumbStrip line, types.ts's three "parked" notes (those allowlist entries are committed; live behaviour tracks the deployed rules revision). **Kept deliberately, as accurate tombstones** (a per-site judgement the brief's flat list didn't make): shell/AppShell :85/:342, ImportCsv :659, ComparableTitlesPage :566 and Queries' F12-retirement note — each truthfully explains a vacated slot, which is documentation, not archaeology.

## Gate results per commit

| Commit | Phase | tsc | build | vitest (local) |
|---|---|---|---|---|
| `48a48cf` (baseline) | — | 0 | pass | 138 · 2199 \| 2 |
| `9af5540` | 1 | 0 | pass | 2207 \| 2 (+8) — one intermediate red was the type guard working (toastConfig widened `string`), fixed at source |
| `fa60f60` | 2 | 0 | pass | 2221 \| 2 (+14) |
| `10b1a92` | 3 | 0 | pass | 2229 \| 2 (+8) |
| `00d927e` | 4 | 0 | pass | 140 files · 2233 \| 2 |
| `1c18a0e` | 5 | 0 | pass | 2238 \| 2 (+5) |
| `662d4f9` | 6 | 0 | pass | 2242 \| 2 (+4) |
| `5bda14f` | 7 | 0 | pass | 2242 \| 2 |
| — | 8 | skipped | | |
| `7836bd5` | 9 | 0 | pass | 2241 \| 2 (one red → the Nav.tsx source-lock, rewritten; net −1 with the pinned describes consolidated) |
| `62f128a` | 10 | 0 | pass | 2241 \| 2 |
| report commit | 11 | run before commit | run | run |

(Counts are as printed per run; the rules suites — now including the retirement, rejectedDate and pinned-denial cases — execute only in CI.)

## Push & CI

Pushed after the report commit; CI is the only executor of the rules tests, and the Phase 3/7/9 rules changes are unverified until it is green. The Phase 3 deploy coupling at the top of this report is the one sequencing constraint that matters for production.
