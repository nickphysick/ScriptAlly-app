# Analytics — decisions

## Current state

- **Analytics v26 (18 Nov 2026; ref design-refs/analytics-v26/; report reports/analytics-v26/REPORT.md; branch
  `analytics-v26`, NOT merged).** Replaces the whole of v24 / v24.1 on `/queries/analytics`.
- ⚠️ This file was created on the dev line (`dev/…-td57` and up), where `docs/decisions/analytics.md` did not exist.
  main has its own copy (v24 and older, moved from CLAUDE.md on 11 Nov): at merge, put the v26 section below at the top
  of main's file and keep main's older sections under it.

## Analytics v26 — one short page built only from the writer's own data (18 Nov)

- **The page's job:** show how the campaign is going in pictures anyone can read, and link each finding to the page
  where the writer acts on it. Nothing is completed on this page.
- **The data-only rule:** every figure and sentence is counted from what the writer has logged (`lib/analyticsV26`).
  Nothing is estimated, forecast or inferred: no "suggests", "likely", "may", "should", "expect". AN26-G1 holds the page
  to `/\b(suggests?|likely|probably|should|expect(ed)?|predict|forecast|overdue|late)\b/i`, no "1 in 1", no "0 weeks" or
  "0 days". The one exception is section F (below).
- **Sections, top to bottom, 64px apart:** A the shared workspace header (`shell/WorkspaceNavyHeader`, the Archivist;
  "{sent} queries, {replies} replies"; Record a response / How it works) · B What to do next (Everyday) or "Patterns
  appear after 5 replies" (Early) · C What happened to your {sent} queries? (where they are now; how far they got) ·
  D Is it getting better? + Who says yes? (Everyday) · E How long do replies take? + Do nudges work? (Everyday; in Early,
  How long sits beside F) · F How do you compare? · G the closing line, then `AppFooter`. Day one: A, then H "How it works".
- **The three states:** day one = no queries; Early = fewer than 5 replies (`EVERYDAY_REPLIES`); Everyday = 5 or more.
  Replies are `replyTally.all` (v24.1: a request is a reply). With no reply at all the header's right block is "Your
  oldest query has been out"; with 1–4 it is already "Asked to read more" (the mock's reading).
- **One mark is one query, everywhere,** drawn by `StatusDot` in the query's current status (a reply's mark in E is
  drawn as the reply it was: `ReplyPoint.replyStatus`). The app's status marks carry no fill (status marks v3: shape
  only), so the disc behind each mark is one neutral token. Hover/focus shows agent, agency and one line; press opens the
  query's card (`openQueryPanel`).
- **Where they are now** is v24's `outcomes` cut four ways (`nowGroups`): waiting · being read (asked, still open) ·
  offer · ended (passed, read then passed, closed by the writer, withdrawn). It throws if the four ever disagree with
  `outcomes`.
- **The cut rule for rounds:** the dated queries in send order (ties by id), cut into three runs — ceil(n ÷ 3) in each of
  the first two, the rest in the third; no rounds under 9 dated queries (`ROUNDS_FLOOR`), and then Who says yes? takes
  the full width. A run's "asked" counts its queries that ever asked to read more; the best run is the most asked, a tie
  going to the later run.
- **The group-of-3 rule for genres:** queries grouped by the FIRST genre on the agent's record; groups of fewer than 3
  dropped; the three largest shown, most first. `lead` = the kept genre with the highest asked ÷ sent (tie: more sent),
  only if its asked > 0; `unqueried` = agents on the writer's list whose genres include `lead` (any position) with no
  query for this manuscript. No group of 3: "Not enough queries to any one genre yet."
- **How a reply is attributed to a nudge:** nudges are the activity log's nudge-sent events (`eventKey: "nudge_sent"`, or
  an unkeyed "Nudge Sent"); `Query.lastNudgeSentDate` stands in only where the log has none. A reply (an incoming rung,
  `AGENT_RESPONSE_STATUSES`; else the query's own dated incoming stages) belongs to the LAST nudge before it, so a
  nudge's `repliedDays` is the days to the first reply in (that nudge, the next nudge]. A reply before the nudge never
  counts. "Due" is the task engine's own `nudge_overdue` with `reason: "nudge-first"` on an open query.
- **`SHOW_OUTSIDE_COMPARISON`** (analytics/A26Compare.tsx) gates section F and the header's third line ("Most writers
  see about 1 in {round(100 ÷ requestRate)}."). Set it false and both go, in one line. F is v24's `benchmark` unchanged
  against `BENCHMARKS_QUERYTRACKER`, labelled as outside data, last on the page. A dev build can swap the anchors
  (`window.__SA_AN26_BENCH`) or turn F off (`window.__SA_AN26_NO_COMPARE`), both gated at the call site.
- **Links out:** Queries and the Contact list open unfiltered (neither has a filter a link can set; every workspace
  page stays mounted, so a session-storage preset would be read only on a first visit). Settings opens at Preferences,
  where "A query goes quiet after" is. Follow-ups for Nick in the report.
- **Below 768px this page is not mounted:** `phone/pages/PageRoutes`'s `AnalyticsRoute` draws the phone app's
  `AnalyticsPhone`. v26's CSS still stacks to one column at 760 for a narrow desktop window.
- **`window.__SA_AN26` is dev only, gated at the call site:** `{ v26, bench, anchors, showCompare, manuscriptId }`.
- **Locks:** `tests/e2e/analyticsV26.measure.ts` AN26-A1, B1, B2, C1, C2, D1, D2, E1, E2, F1, G1, H1, L1 (fixtures from
  `tests/e2e/seedAn26.mjs`, every id `seed-an26-`, restored in the same run); unit `src/lib/analyticsV26.test.ts`.
  Retired: `tests/e2e/RETIRED-analytics-v26.md`.
