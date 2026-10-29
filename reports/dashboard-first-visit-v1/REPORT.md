# Dashboard first visit and empty states v1 — report

Branch `dashboard-first-visit-v1`, cut from **`dev/pk391-qm1-pk392-calx` at `d6726195`**. That is the
branch dev was serving when this started: a build of it reproduced the served `index-BM6PjqtJ.js` exactly.
It contains v118.1 and dashboard-mobile-v1; the only commits it lacks from either branch are report-only.
Reference: `design-refs/dashboard-first-visit-v1/`. All seven files matched the pack's SHA256 values, and the
mock is enrolled in `.refhashes.json`. Desktop only (≥768px).

## 1. False premises, and §0's findings

**False premises (read these first)**

1. **S4's "partial request due in 12 days" does not exist.** The audit recorded it. Read straight from
   S4's data: all three queries are `Queried` / `No Response`, and no partial-request activity exists either.
   Dev's rules refused the response save (memory note "Nested allowlist denies materials rungs"), and the
   drawer showed it optimistically. So it was never "lost to housekeeping". There is no task to rank.
   **No dev account can reach "your move" through the app's flows** while that rule stands.
2. **S5x's overdue close is not an ordering fault either.** Felix's agent has no stated reply window.
   `replyTask` returns "none" as soon as there is no window, before it reads the writer's own nudge date
   (8 Sep) or expected date (1 Sep). The Query Centre, meanwhile, dates the query from `writerExpectedDate`.
   So no close task is ever generated. Fixing that is a task-generator change: it would also move the To-do page
   and the phone. **I did not make it; it needs its own pack.** (The account is also stuck by the refused
   Pass write, which has `closingReason` set on a `Queried` query.)
3. **Real tasks already outranked housekeeping.** `listPlan` ordered req → nudge → quiet → house. Part C
   therefore came down to adding Getting started's place, fixing "Then:" and showing the pager. The order is
   locked on the plan itself (DFV-C).
4. **The mock's Getting started order is the "Not yet" order on both panes.** The pack's prose orders "Yes"
   as manuscript, query, agent. The prose was followed.
5. **The mock's pane 05 shows a feed badge of 2 after the first query.** A5 says the writer's own acts never
   count. A5 was followed: the badge counts only what came in.

**§0 findings**

- **0.1:** confirmed on the base:
  - `isPreQuery` is read by Dash58:177 and DashPhone:85;
  - `DEFAULT_SHAPE.pre` was `false`;
  - WhereStart, QueriesDoor, AgentsDoor, AgentsSnap and Dash60Lift drew the pre page;
  - `gettingStartedRows` fed `startingPlan`, but Dash71Right ignored `task` before the first query, so the
    deeds were never drawn;
  - the founding card collapsed because the pre branch of Dash71Right dropped `.d71-right` and its `fw-slot`
    (112px at 1280/1512).
- **0.2:** the eyebrow was `switcherStanding(ms).status`, the sidebar switcher's own function, reading the stored
  `Manuscript.status`. The sidebar keeps it (it still reads "READY TO QUERY"); the header no longer uses it.
- **0.3:** no completion event existed for a log, an import or an add-agent. The hooks are at the writes:
  - `db.addQuery` (any surface; an imported query never counts);
  - `db.addAgent`;
  - `ImportFlow`'s commit (Smart Import and the template share it).

  Log a query and Add an agent finish over the current page (often the dashboard). The import returns to the
  dashboard.
- **0.4:** `dashList` reads only the board's `todo` and `today` lanes, and the order was already right; see
  false premises 1–3.
- **0.5:** the pre-query locks were DB60 (P1, P2, P4, P5, P7, P8, P10), DB601, DB71 L3 and its day-one
  shots, and IRF-C, plus the unit suites dashboardPageSmoke, dashFirstUse, dashV58, oneScreenMark and
  oneScreenPanel. What happened to each is in §5.

## 2. Per part: SHA, red then green

| Part | SHA | Lock | Red (before) | Green |
|---|---|---|---|---|
| A | `a883d55b` | DFV-A unit: `fv1/dashFirstVisit.test.tsx` and the A5 case in `dashFeedSeen.test.ts` | against d6726195: `expected '<link…' to contain 'data-fv1="setup"'` (and five more); `DEFAULT_SHAPE.pre: expected false to be true`; badge `expected 3 to be 1` | 12/12 and 4/4 |
| A | — | DFV-A rendered: `tests/e2e/dashFirstVisit.measure.ts` | A1 `{"mode":"pre","setup":false,…}`; A2 `missing d105-body,d105-btn,… · pre 112.0px · after 208.9px`; A3 `{"b":[null],"e":"— DRAFTING —"}`; A5 `d60-door,d60-way,wds-btn,d59-rule`; A8 `{"loading":"1","mode":"q",…"b":["Log a query","Record a response","Add an agent"]}`; the answer case could not find `choice-yes` | 4/4 tests (including setup) |
| B | `eeb6b942` | DFV-B: `lib/firstWin.test.ts` | by mutation: pickStamp ignoring what was shown → `expected { kind: 'query', msId: 'ms-a' } to be null`; the agent stamp keyed per manuscript → `expected 'agent_ms-a' to be 'agent_ms-b'`; an imported query raising a stamp → `expected true to be false` | 8/8 |
| C | `3e98cfd1` | DFV-C: `lib/dashListOrder.test.ts` (and rendered C1/C2) | by mutation: housekeeping first → `expected 'house' to be 'req'`, `expected [ 'house', 'quiet' ] to deeply equal [ 'quiet', 'house' ]`; Then wrapping → `expected +0 to be null`; the pager hidden again → regex matched. Rendered against d6726195: `{"text":"1 OF 34","shown":false}`, `then "Then: send your full to Tobias Hark"` | 8/8; rendered 3 sizes |
| D | `29dcb791` | DFV-D: `fv1/dashEmptyStates.test.tsx` (and rendered D1) | against d6726195: `to contain 'data-d60="closed-title">Closed</h3>'`, `expected 4 to be 1` (rows), `not to contain 'QUERYING'`, `not to contain '0 ready to query'`, `{ dow: 'WED', day: '9' }` without the month, the backdated send listed; by mutation for the chart (`expected null to deeply equal { kind: 'first', … }`). Rendered: `{"rows":["0Passed on partial"]}` | 12/12; rendered 3 sizes |
| E | `3799ac30` | retirements (§5) | — | suites green |
| F | (this commit) | locks re-pointed, shots, report | — | — |

The full red logs are in the session's scratch files; the lines above are copied from them.

## 3. Gates, baseline against final

| Gate | Baseline (d6726195) | Final |
|---|---|---|
| tsc (app) | 0 errors | 0 errors |
| tsc (functions) | 0 errors | 0 errors |
| production build | clean, no CSS diagnostics | clean, no CSS diagnostics |
| Vitest | 685 files · 10,687 passed · 3 skipped | 689 files · **10,719 passed** · 3 skipped (the new locks; nothing red) |
| rules | 4 files · 232 passed | 4 files · 232 passed |

**Phones at 390×844**: the branch matches the base pixel for pixel in all four states (pre-query and querying, with and without agents). One base capture differed from a second base capture only in the beta strip's text, which renders differently between runs, so the comparison is against the second.

**The e2e suites the pack touches**, run on both builds against local previews with the shared harness
account:
- **Red on the base as well, so not this pack's:** DB59 F1 (`scroller 972 in 966`; the 1920 fixed shape
  scrolls by 6px on the base too), DB59 V1, DB71 C1–C3 (the account holds no nudge or close task) and
  IRF-C querying.
- **Newly red on the branch, from first runs of the locks this pack re-points:** R2, A1, T1, P1, P2, P4, P5,
  C4, C5 and IRF-C pre. The rerun results are in §5.

## 4. Shots beside the reference

All are in `shots/`. The reference panes are in `design-refs/dashboard-first-visit-v1/screens/`. The shots were taken on the branch's dev
server (a corner "BG LAB" badge is a dev-only aid and not in production) at 1280×800, 1512×900 and
1920×1080. **The page does not scroll at any of these sizes in any pre-query state.** The querying states
scroll by 6px at 1920, exactly as the base does.

| State | Shots | Reference | Account |
|---|---|---|---|
| S1 (Yes) | `s1-yes-*` | 01 | Audit FV S1 (new, this pack) |
| S1 (Not yet) | `s1-notyet-*` | 02 | Audit FV S1 |
| S2 (one agent) | `s2-*` | 02's second path | Audit FV S1 |
| stamp, first agent | `stamp-first-agent-1512` | 04 | Audit FV S1 |
| stamp, first query | `stamp-first-query-1512` | 04 | Audit FV S1 |
| S3 (first query today) | `s3-*` | 05 | Audit FV S1 |
| S4 | `s4-*` | — | Audit S4 |
| S5 (all closed) | `s5-*` | 06 | Audit S5B |
| S5x (stuck) | `s5x-*` | — | Audit S5 |
| S6 (nothing due) | `s6-*` | — | Audit S6 |
| first load | `skeleton-first-load-*` | — | Audit FV S1, no remembered shape |

**Where the build differs from the mock** (the app's tokens and cards win):
- The set-up card is a real `.os-card`: white rim, burgundy line and navy band.
- In the band, the pager is "1 of 5" in the serif plus ‹ ›, as built, rather than the mock's bare count.
- The art slots show the registry's mono placeholder ("ART · DASH-…"), not the mock's captioned hatch.
- Below 860px of window height the set-up card tightens and the choices lose their second lines. The
  Getting started row keeps its link and drops its note, and the tip clamps to four lines (three below 820).
  The mock draws only 1512×900.

## 5. Retired and re-pointed

- **Components deleted:** WhereStart and its CSS, Dash60Lift, OneScreenChartEmpty, and QueriesDoor, AgentsDoor and
  AgentsSnap. From `dashFirstUse`: `firstUseTiles`, `tilesDone`, `startAnswers`, `spotOf` and
  `START_TARGETS`.
- **CSS:** 255 lines of rules this retirement orphaned, found by diffing the orphan set against the base's,
  so rules that were orphaned before stay for their own pass.
- **Kept for the phone:** `isPreQuery`, `agentCoverage`, `startingPlan`, `gettingStartedRows` and
  `GETTING_STARTED`'s wording (the desktop card has its own table; see below).
- **Each lock, one line:** in `tests/e2e/RETIRED-dashboard-first-visit-v1.md`.
  - DB601 is deleted.
  - DB60 P7 and P8 are retired; P1, P2, P4, P5 and P10 are re-pointed.
  - DB58 R2 and A1, DB59 T1, DB71 C4 and C5 (the pager's words) and IRF-C (its card list) are re-pointed.
  - Re-run on the branch: every re-pointed case passes, DFV-A/C/D pass at all three sizes, and IRF-C querying, which was red on the base, now passes.

## 6. The tip's clamp

Needed only below 860px of window height: four lines, three below 820, with "More" to open it. At 1280×800 the
tip clamps to three. At 1512×900 and 1920×1080 every tip is whole and there is no "More".

## 7. Dev bundle and integration

DEPLOY_LINE

## Out of scope, reported

- The Pass write that dev's rules refuse, which leaves the query stuck (S5x).
- What a non-founding writer sees in the founding card's place (still "FOUNDING WRITER").
- The sidebar's "Give feedback" overlapping "To-do list" at 1280.
- Mobile: the phone keeps its own first run, and the feed's honest dates are desktop-only (`honestDates`).
- **Also found:**
  - `replyTask` ignores a writer's own nudge date when the agent states no window (false premise 2).
  - The shared materials step still names an opening sample that its tick no longer checks. The phone shows it,
    so it was left alone; the desktop card says "letter and synopsis".
  - The querying page scrolls by 6px at 1920×1080 on the base and on this branch alike.
