# Phone app v4.1 — Today's new header, the Birds-eye card, and the full Birds-eye view (below 768px only)

Branch `phone-app-v4-1`, cut from the branch dev served: `dev/…-qc154-qc1541-pa4` @ `936411db3` (`index-CzLH0sbg.js`,
Phone app v4 on Query Centre v154.1). Refs enrolled at `design-refs/phone-app-v4-1/`; both SHA256 match the brief.
Not merged to main. Never deployed to prod.

## False premises and corrections

1. **"The desktop drawer" is not what the desktop shows.** At 768px and up the Query Centre's Birds-eye is `QcBirds150`
   on `lib/qc150` (`beGroups` at its defaults — urgency, by due date — and `beLine`). The drawer (`QcBirdsDrawer`,
   `bvdGroups`, `tlRow`) is mounted only below 768px, where no phone page now shows it. Phase C first read the drawer;
   a fix commit moved the card and the view to the engine desktop users actually see, and PA41-7 compares against it.
2. **Landscape at 844 × 390 is the desktop.** The app's one breakpoint (`useIsMobile`, 768px wide) serves a phone
   turned wider than that the desktop page, so it never reaches this view, and "the desktop does not change" rules out
   moving the breakpoint. The landscape layout applies where a landscape phone is under 768 wide; it is measured at
   740 × 360. Whether landscape iPhones should get the phone app is Nick's call.
3. **The desktop's past-date wording.** `beLine`'s and `currentWords`' labels say "overdue since {date}"; the phone draws
   its own words for that one case ("{Stage} · date was {date}", "N wks past its date") so PA41-13 holds.
4. **"Overdue" is the desktop's first group.** The phone names it "Past its date" (the brief's wording); the engine's
   key stays `overdue` as a data attribute, never as text.
5. **The ring card's companion.** v4's "Closest to their date" card retires with the ring card: the Birds-eye card's rows
   are that preview now.

## §0 Recon

1. **Served branch:** `…-qc1541-pa4` @ `936411db3`, v4 on board: phones render `TodayV4` (v4 header with date,
   headline and journey track; the ring card; the Closest-to-their-date card), `BirdsViewV4`'s "How close" mode, and
   v4's slim bar (title, Today's "N need you" pill, search).
2. **Where each new figure comes from:**

| Figure | Source |
|---|---|
| active queries | `v3Counts(qs).active` = with you + with the agent + gone quiet (`queryState` via `stampRows`, folded by `quickOf`) |
| weekly series since the first query | `aggregateLedger(dailyLedger(queries, now), "weekly")[].active` (lib/oneScreen: sends minus closes at each week's close — v3's hero series) |
| change on last week | the same series: last week's closing value minus the one before |
| things that need you | `useV3().ordered.length` — the To-do workspace's own tasks; Up next's "of N" and the Today tab's accessible count read the same array |
| day count | `dayN(firstSentMs(buildRows(…)))` (lib/phoneV4) |

   **Missing:** nothing. **Two definitions of "active" meet here:** the figure is `queryState`'s open courts; the
   chart is the ledger's sends-minus-closes. Measured on the harness they agree today (PA41-2/3 read both).
3. **The desktop engine (the one the Query Centre shows at 768px and up, lib/qc150):** `beLine(eyeRow, now)` builds each
   row: past bars for every dated stage before the current one, each running to the next stage's start; the current
   bar from its stage's start (or the undated current span's) to its due date, or to today once the date has passed
   (`overdue`); `dueMs`. `beScale` sets the range (the earliest start less three weeks to the latest end plus half a
   span). `beGroups(rows, "urgency", "due", now)` groups by `whenOf` (Overdue, Upcoming, Watch and wait, No date) and
   sorts each by due date, undated last. The phone calls these unchanged (months and week ticks from lib/qcTimeline's
   calendar helpers) and renames only the first group. (The drawer's `tlRow`/`bvdGroups` were read first — false
   premise 1.)
4. **Gone quiet:** yes — the ring card's third count was `v3Counts(qs).quiet`, the Query Centre's `quiet` state. The
   Birds-eye card reads the same three counts.

## The locks (tests/e2e/phoneAppV41.measure.ts), measured on the rendered page

Harness account on the emulator, Chromium (`--project=pixel`), at 390 × 844 and 360 × 740 (landscape at 740 × 360 —
false premise 2). Ledgers in `ledger/`, each mutation's in `*.mut-<name>.json`. Final Chromium run: Today 32 readings,
the view 18, sizes and motion 55 — 0 red; the desktop 6 — 0 red.

| Lock | Green | Mutation → red |
|---|---|---|
| PA41-1 one count | need pill = task rows = Up next's "of N" = the Today tab's count (103 on the harness), both phones | `queries` (the pill counts with-you queries) → 2 red |
| PA41-2 figure | figure = card counts summed = Queries' All less Closed (70 = 88 − 18) | `closed` (closed counted in) → 2 red |
| PA41-3 week | change = the chart's last week − the one before; hidden when 0 (the harness's last three weeks are 70, 70, 70) | `month` (four weeks back, shown when the week's is 0) → 2 red |
| PA41-4 axis | the first card starts below the month labels; nothing over a label; the first label clear of the Mentor | `lap` (the card's −56px margin) → 4 red |
| PA41-5 pinned | past the header the bar's text is exactly the tab's name, with one search, on all four tabs | `figure` (the figure put back in) → 4 red |
| PA41-6 card | ≤ 5 rows, past their date first then by due date; the today line meets every row | `byname` → 2 red |
| PA41-7 engine | all 70 open queries: the phone's current bar start and end and every earlier stage equal the desktop Birds-eye view's at 1512 | `recompute` (start moved three days) → 1 red |
| PA41-8 fold | "Past its date" holds 42: shows 5 and "Show 37 more"; tapping shows 42 | `nofold` → 2 red (and PA41-7's population, which unfolds to read every row) |
| PA41-9 pan | a horizontal touch drag moves the track and not the page; a vertical one scrolls the page and not the track (CDP touch) | `captureall` (touch-action none) → 1 red |
| PA41-10 expand | four states opened: one row open, one navy 56px button labelled with the next step; tapping again closes it | `twobuttons` → 4 red |
| PA41-11 sizes | text ≥ 14px and targets ≥ 48 on the header, the card, the view, an open row and 6 months, both phones and landscape; nothing past the right edge at 125%; landscape is the desktop layout (184px names, no tab bar) | `chips` (40px zoom chips) → red on every view screen |
| PA41-12 motion | reduced motion: nothing running on the header, card or view; the card never replays; the view opens settled on Today; control: without it the view replays | `motion` (animations forced under reduce) → 3 red |
| PA41-13 words | the view's text (with every group unfolded) has no "overdue" or "late" | `overdue` (the group relabelled) → 1 red |
| PA41-14 desktop | Dashboard, Queries and the desktop Birds-eye (`?view=calendar`) at 1512: DOM identical, 0 pixels apart | `shared` (a body rule) → 3 red (62k–129k pixels) |

Found on the way and fixed: month labels piled up on a 939-day campaign (now at least 52px apart, January showing the
year); the "Today" tag sat on the dot when the line ends near the top; a passed bar ran to today with the overrun line
drawn through it and its label (it now ends at the date); "103 things need you" wrapped (the board's compact pill for
three-digit counts).

## What a ref shows that the app can't derive, or that is not built

- The board's "▲ 2 this month" variants are the unchosen layouts; the chosen one (week on week) is built.
- The prototype's agency line under each name shows only in landscape, as drawn.
- The replay's "N queries out" counts queries whose first stage has begun by the replay's date (`stageOn` over each
  row's history), which is the prototype's rule; there is no stored "out" figure.
- Landscape at 844 × 390 (false premise 2).

## Retired

- v4's Today header pieces: the date, the headline sentence and the journey track (`JourneyTrack`, `trackCounts`).
- The ring card (`Ring`, `RingCard`) and v4's Closest-to-their-date card (`closestOpen`).
- The "How close" Birds-eye (`BirdsV4.tsx`: `BirdBar`, `BirdsViewV4`, its peek; phoneV4's `closeness`, `birdsGroups`,
  `closeWords`; their CSS) and, in v4's measurement, PA4-5 and the Birds-eye parts of PA4-6/PA4-10 (noted in
  `tests/e2e/RETIRED-phone-app-v3.md`).
- Today's "N need you" pill in the pinned bar.

## WebKit (once, at the end)

`--project=iphone` (Playwright's iPhone 13 profile): Today 16 readings, the view 14, sizes and motion 24 — 0 red. As in
v4's report, WebKit runs at the profile's own 390 × 664, signs in on a side page and dispatches taps on the element
(Playwright's clicks do not land on the bar in that profile). PA41-9 (touch drags through Chrome's DevTools protocol)
and PA41-7's desktop half run in Chromium only.

## Gates

Baseline before any edit: root `tsc` 0, `functions` `tsc` 0, `build:dev` clean, Vitest 4 failed (the three known reds
plus `domain.test` "D0", red on the served branch). At the end: `tsc` 0, `functions` 0, build clean, Vitest 3 failed
(the three known; "D0" passed this run) — no worse than baseline.

## Housekeeping

Seven worktrees besides the primary existed when this pack began (over CLAUDE.md's five); they belong to other sessions
and were left alone. This pack's own worktrees (`ScriptAlly-pa41`, `ScriptAlly-pa41-base`) are removed.

## Dev deploy (12 Nov)

Dev had moved during the pack: it served `index-CLC0PZ_h.js` from `dev/…-pa4-qc155` (Query Centre v155 on v4); a rebuild
matched it byte for byte. v4.1 was merged onto it as **`dev/…-pa4-qc155-pa41` @ `02b4a22de`** (pushed; the merge was
clean). On the merged tree: `tsc` 0; 111 phone, Query Centre, shell and dashboard spec files green; PA41-7…10 and 13
green (18 readings — the phone's bars still equal the v155 desktop's). Built from a clean checkout of the pushed tip and
deployed hosting-only with the served hash checked in the same command: **dev now serves `index-DjGo0pfu.js`** (matches
the build). Branch `phone-app-v4-1` is pushed and not merged to main. Prod is untouched.
