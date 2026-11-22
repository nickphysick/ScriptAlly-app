# Analytics — decisions

> Merged 22 Nov 2026 (consolidate-main-v2): the dev line's newer sections come first, then main's earlier rounds, as the dev copy's own note asked.

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

---

# Earlier rounds (main's copy, moved from CLAUDE.md on 11 Nov)

## Current state

- Newest recorded build: Analytics v24 / v24.1 (17 Oct; ref design-refs/analytics-v24/, reports reports/analytics-v24*/). v17 is the older page.
- Moved verbatim from CLAUDE.md on 11 Nov 2026 (CLAUDE.md diet; map in docs/claude-md-diet/MAP.md). Sections are newest first by the date in their heading; undated sections come last. A section headed “Branch-only” was recorded as not merged; the note under it says what the 11 Nov check found.
- Later work than the newest section here may exist on branches, with its report under reports/<name>/REPORT.md on that branch. Check `git log` before trusting any “current” claim below.

## Analytics v24 — seven plain-English sections, benchmarking, and the steps card (17 Oct; ref = design-refs/analytics-v24/analytics-v24.html + screens; report reports/analytics-v24/REPORT.md; REPLACES v21's sections C–H and v17's phone sections — v21's header, card, desk construction, tints and empty panel stand)
- **Analytics (v24): v21's light header ('See what happened ↓'; ring 'Replied on time') and desk (amended by v24.1, below), then seven question sections: What happened to your queries? (two pies) · Benchmarking (expected-by-now bar, You vs Most writers columns against fixed QueryTracker anchors) · How many have you sent, and when? (monthly columns) · Do agents reply when they say they will? (said/took bar pairs) · Who are you still waiting on? (said/waited pairs; reading rows count from the day they asked) · Moments worth remembering · A note on these numbers. Tints on 2, 4, 6. Every section answers its question in its first sentence; 'typical' always means the writer's own figure.**
- **Desk: Queries sent, Asked to read more, Replies due (open queries' stated reply times running out: due in two weeks, past, later; a past/today/next-8-weeks strip; goes to S5).** (v24.1, 17 Oct; ref design-refs/analytics-v24-1; report reports/analytics-v24-1/REPORT.md. `repliesDue` reads `stillWaiting`'s own rows, so its past count is S5's by construction.)
- **On Analytics a request is a reply: replies = asked to read more + said no to the letter, dated or not. Timing figures use dated replies only.** (`replyTally`; dated = a gap of 0–730 days. A reply dated before its send or more than two years after it is a bad date: left out of the timings, counted in S4's "no reply date" line, never edited.)
- **Empty /queries/analytics: navy panel with the Archivist, the shared steps card ('How it works.', three steps, art slot + fixed sample tile each), Ways to get started.**
- **`outcomes` is the one partition of a manuscript's queries for S1 and the desk's request rate; `standing` stays the header card's partition.** (`lib/analyticsV24`; asked to read more = a request or an offer, whatever happened after; waiting = no answer yet; ended = closed without a request.)
- **⚠️ ONE DURATION FORMATTER (`span`): under 7 days "{n} days", else weeks rounded, "1 wk" / "{n} wks"; a difference rounding to nothing is "on time".** A bar of 0 days reads "Today", an undated one draws no bar and reads "Not dated". AN24-U1 forbids "1 wks", "0 wks" and "0 days" anywhere on the page.
- **⚠️ "MOST WRITERS" IS `BENCHMARKS_QUERYTRACKER` (6% asked to read more, 50% get any reply, 44 sent), FIXED ANCHORS, NEVER COMPUTED AND NEVER RESTATED.** No community data is collected or shown. A dev build can swap them (`window.__SA_AN24_BENCH`, gated at the call site) so AN24-S2 proves the panels read them.
- **⚠️ AN AGENCY'S STATED REPLY TIME IS FOR THE QUERY.** Reading rows in S5 draw one bar from the day they asked, in the query's status fill, against nothing.
- **⚠️ THE SECTIONS ARE BOTH WIDTHS.** v24's rules sit in `a24.css` (after `a21.css`); the phone keeps the at-a-glance strip and v21's phone band. "Compact" is still `.ws-app.sheet-wide` (base = compact).
- **⚠️ `window.__SA_AN21` IS DEV ONLY, GATED AT THE CALL SITE**: it carries `v21`, `v24` and v17's `requests`, which AN24-B1 and -S1 use as the anchor a lib mutation cannot also move.
- **Locks:** `tests/e2e/analyticsV24.measure.ts` AN24-A3, B1, B2, C1, R1, R2, S1–S6, U1, I1 (v24.1's retirements: `tests/e2e/RETIRED-analytics-v24-1.md`) (fixture `seed-ms-1`; I1 seeds and removes `seed-an21-empty` through `tests/e2e/seedAn21.mjs`); AN21-A1, A2 and L1 stand in `analyticsV21.measure.ts`; unit `src/lib/analyticsV24.test.ts`. Retired and rewritten: `tests/e2e/RETIRED-analytics-v24.md`.

## Analytics v17 — the whole page in the v126 dress, desktop and phone (5 Oct; ref = design-refs/analytics-v17.html + design-refs/analytics-v17/*.png; report reports/analytics-v17/REPORT.md; SUPERSEDES v13 and v2a)
- **`/queries/analytics` is the Query Centre's v126 dress**: the shared anthracite band (`PageHeader band bandFixed` — 337px, contents centred, a 250px empty disc, no eyebrow), the at-a-glance strip, NINE sections each opening on a banner with an empty perched-art slot standing on the desk's white frame (readings along its foot), the caveats in the blush workspace under an anthracite band, a floating section tab (the Birds-eye tab's dress, 24px inside `.ws-window`), and `AppFooter`. Every figure and sentence is `analyticsModel(...).v17` (`buildV17`); parts in `analytics/A17Frame.tsx` · `A17Figures.tsx` · `A17Empty.tsx` · `a17.css`.
- **⚠️ `bandFixed` IS A MODIFIER, NOT A SECOND BAND.** Every rule names `.ph--bandfix`, so the Query Centre's band (no prop) cannot move — AN17-3 compares its boxes at 1512 with a baseline captured before this pack (`reports/analytics-v17/qc-band-baseline.json`).
- **⚠️ THE BIRDS-EYE TAB IS GATED ON `routeActive`.** It is portalled to `<body>` and every page stays mounted, so it (and its B shortcut) showed on every route — in the corner the section tab needs. The drawer stays mounted, so its state survives.
- **⚠️ EVERY FIGURE IS DRAWN TWICE**: `.a17-d` (desktop SVG) and `.a17-m` (phone, ≤760px, REDRAWN — labels at their reference sizes). The phone section bar and phone shell are another session's; the tab hides ≤760px.
- **⚠️ THE THIN-SAMPLE RULE, v17's FORM**: a zero is words ("None", "Not yet", "No replies yet") — never `0`, `0%` or a bare dash; a STATISTIC carries `data-population` and names it under five; a plain count carries none (its number is its population). AN17-16 cuts the page to one query through the dev-only `lib/analyticsReviewAid` (`window.__SA_AN_LIMIT`), gated at the call site so production carries none of it.
- **⚠️ THE 90-DAY WINDOWS ARE (now − 90d, now] AND (now − 180d, now − 90d]**; the busiest week's tie goes to the EARLIEST week, so exactly one bar is rust.
- **Rust is `--o-ms` (#8a4a3c)** — the ref's #b4553f has no token; the window blue #4a5d78 is `--sp-anthracite` at .78; "ended" grey #8a8378 is the ink at .5.
- **⚠️ THE SHARED `openRoute` CANNOT OPEN A PHONE WIDTH** (its first `.ws-panel` match is the hidden sidebar); `an17Lib.openAn` signs in at 1440 and reloads at the phone size.
- **⚠️ `/queries/analytics` IS IN `BAND_ROUTES`** (`tests/e2e/plateRoutes.ts`), so the open-header censuses (`quietBar` Q8, `pageHeaderV2` §4.4, `livingHeadersV3`) exempt it by name; `pageHeaderV2` counts its open headers among its OWN four routes, so a band route outside them takes none away.
- Locks: `tests/e2e/analyticsV17.measure.ts` (AN17-1…18 at 1280/1440/1512/1920 and 390/414/760), red first against the unchanged build (`REDFIRST.md`) and by each lock's named mutation (`mutation-proofs.jsonl`).
