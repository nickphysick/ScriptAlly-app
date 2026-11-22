# Dashboard on the phone v1

Branch `dashboard-mobile-v1`, cut from dev's integration at the time (`568a3056`, the Submission packages v39 stack with Dashboard v116). Refs: `design-refs/dashboard-mobile-v1/`, 9 files. Every hash matches the pack's list, and all 9 are enrolled in `.refhashes.json`.

## 1. False premises, and what §0 found

1. **Dashboard v118 does not exist.** It isn't on any branch, local or on origin, and isn't merged anywhere. The pack says "if dashboard-v118 isn't merged anywhere, base on origin/main". I did not, because origin/main has none of what this pack is built on: the v71 task card (Up next's source), the v93/v105 founding card and v116. I based on dev's integration, which contains main. Everywhere the pack says "v118", this build uses v116's equivalent.
2. **"v118's filters" don't exist either, and a status link can't land on the card's number.** The Query Centre lists every manuscript, while the dashboard counts one. Measured: `?status=awaiting` opened 142 rows behind a "With agents" card saying 30, and `?status=closed` opened 35 behind "Closed 11". So each card opens the Query Centre's existing `?ids=` entry point (the one Submission packages' "See these queries" uses) with exactly its own queries, and the count matches.
   - **No "active" filter:** the Query Centre has none, so Active uses the same `?ids=` route.
   - **Agents opens the Contact list whole:** it takes no status from the URL.
3. **0.1, the phone shell:** no newer shell exists anywhere. `BottomTabBar` is still the four-tab capsule (Home / Queries / Agents / Scripts), and the only phone-named branch is `pricing-v4-mobile`. So the tab bar is untouched (§6).
4. **0.2, the top bar on Home:** before this pack it was the shell's generic phone bar: the column toggle and the crumb "Dashboard". The manuscript switcher (`ShellScope`) had no visible home on a phone. The feed had no phone entry point: the desktop feed tab is portalled into the desktop sheet.
5. **0.3, data:** every figure is derivable; nothing was invented.
   - (a) `aggregateLedger(dailyLedger(scoped), "weekly")`; "sent in all" counts `sentAt` over the scoped set.
   - (b) and (c): `liveQueries` split by `tileCourt` ("you", offers included, is "need you"; "agent" is With agents; reading means partial or full sent). The two add up to the live count, so 10 + 30 = 40.
   - (d) `closedTile`.
   - (e) `agentCoverage`.
   - (f) Dash58's own `dashList` + `taskCardModel`.
   - (g) `useFoundingStats`.
   - (h) `feedEntries` → `drawerEvents`.
6. **0.4, search:** the app has one, the shell's palette (`buildCorpus` + `rankItems`). The phone search ranks that same corpus (agents and queries) and runs a row as the palette does.
   - **"Recent":** the palette's own recents were retired earlier. With nothing typed, "Recent" lists the agents of the three most recently moved queries.
7. **FeedbackDock's own heading is "Tell us what you found", not the mock's "Tell us something".** Its internals are out of scope, so it keeps its words, its four kinds and its uppercase "WHAT KIND OF THING IS IT?" label. Only its placement on this page changes, through phone-only CSS that turns it into a bottom sheet over a scrim.
8. **0.5, the old phone dashboard was already mostly retired.** The v37 desk line and To-do doorway hadn't rendered for a long time; on a phone the page was Dash58's desktop layout stacked in one column. The locks that asserted on it are listed in `tests/e2e/RETIRED-dashboard-mobile-v1.md`.
9. **An offer is "your move".** The desktop card's `kindOf` files an offer as "other" (slate) because it isn't a send, and the account's first task is an offer. The phone takes the kind from the task's list group instead: "Agents are waiting" is your move. The colours are one map, `PHONE_KIND`, as asked.
10. **Mock-only, not ported:** the review chrome, bezel, status row and home indicator, the toasts, the stub filtered screen, the emoji pills, and every name and number.
11. **App tokens and fonts won.** The faces are read from `--sp-type` / `--sp-serif`, never named (a house lock forbids naming them). The page colour is the app's `--ws-page` (242, 238, 232), not the mock's.

## 2. Per part

| Part | SHA | What landed |
|---|---|---|
| A | a7a693ed | The top bar (mark, manuscript, Search, Feedback, +), the + menu, the search sheet, the feedback sheet; the refs |
| B | e5634135 | Active queries with the scrub chart and the Mentor; With agents / Closed / Agents; `lib/dashPhone` + unit lock |
| C | 4cb0410f | Up next: the hero tinted by kind, the courier, the step chips, View task, three rows |
| D | 77a34c92 | The founding writer row; Recent; the feed as a bottom sheet |
| E | 38683b29 | Phone retirements (v37 block, Dash58's phone lines, the mobile unit lock rewritten) |
| F | (this commit) | A2 + F1 locks, the desktop pixel lock, INK19 re-pointed, shots, this report, CLAUDE.md |

**Each lock: red, then green.** RED is deployed dev (the base) unless a mutation is named, with `DM1_MUTATE=<name>`.

| Lock | RED | GREEN |
|---|---|---|
| A1 | `A1 · 390x844 population: the top bar — null`. `A1-overlap`: `a long title ellipsises before Search — {"nameR":350,"searchL":260…}`. `A1-no-rotate`: `+ reads × while open (rotated 45°) — none` | 60/60 at 390 and 375: four controls visible, each 40×40, in order; the name never under a control (a long title too); bar 50 tall; + menu role=menu with three items, 230 wide, × while open, closed by an outside tap and by Esc (focus back on +); each item opens its own flow's dialog; absent at 768, 1280 and 1512 |
| A2 | `the search sheet opens with the field focused — {"open":false…}`. `A2-short`: `it is on top everywhere, right edge included — [true,false,false,true]` | 10/10: full-screen at both sizes, field focused, Recent rows, typing ranks, Cancel returns focus to Search |
| B1 | `population: four cards — {"active":null,…}`. `B1-order`: `order: Active above With agents / Closed / Agents — …` | 70/70: Active = the desktop chart's headline, Closed = the hoop's total and buckets, Agents = the desktop's coverage; need you + With agents = Active; the scrub snaps at three positions, names the week, hides the chip, holds then restores after 0.8s, never navigates; pan-y; every card opens exactly its own queries (list count = card number) |
| C1 | `as found: the hero is task 1 — undefined vs task-offer-seed-query-12`. `C1-one-tint`: `drop req: the hero's tint is nudge's — rgb(245, 226, 218) vs #e6edf6`. `C1-view-dead`: `View task (query) opens its place — {"names":[]…}` | 51/51: hero and rows equal the desktop card's own keys at four drops; all four kinds were the hero; tints and discs from the one map; the courier once in the hero, the Mentor once on the chart; the title clears the courier; View task opens the query card (or the agent editor) and completes nothing |
| D1 | `egg: population, the row — null`. `D1-no-feed`: `Activity feed opens the feed — null`. `D1-gap`: `22px between sections — [30,30,30]` | 25/25: four seeded ranks against the desktop card's own swap; the row opens the feedback sheet over its scrim, Esc closes both; Recent = the feed sheet's first two; the feed opens as a bottom sheet; order and the 22px rhythm |
| E1 | `390x844 population: the phone page —`, `no the desktop page — [data-d58="page"]` | 28/28: no desktop page, header buttons, ring cards, task pager, desk line or doorway on phones; the first five still render at 1280 and 1512 |
| F1 | `390x844 population: tap targets — 0`. `F1-wide`: `no sideways scroll (the page's scroller) — 46`. `F1-small`: `every tap target ≥ 40px — [{"name":"Search","w":30…}]` | 10/10: no sideways scroll at 390 or 375, the page is the window's width, all 15 tap targets ≥ 40px |
| unit `dashPhone` | `Cannot find module './dashPhone'`; with the reading set mutated, `expected 6 to be 2` | 16/16 |
| unit `dashboardMobile` (retirement) | against the pre-retirement sheet: `.sa-dashroot has no consumer on a phone` | 6/6 |

**Faults found by measuring:**
- **A long manuscript title widened the whole app.** The shell's columns are flex items at `min-width: auto`, so the title's width reached them: 930px wide at 390. `.dm1` now carries `contain: inline-size`.
- **The search sheet was painted over at its right edge.** A fixed child can't leave the shell's stacking context, so it's now portalled to `<body>`.
- **An all-caps line on the hero.** With no sentence from the desktop card, the hero fell back to the list's uppercase mono fact ("BRIGHT LITERARY · OFFER 19 AUG"). The phone now states only the desktop card's sentence.

**Kept locks:** INK19 is re-pointed so the hidden `.ws-mobilebar` on `/dashboard` leaves its comparison. It is still red, as on dev before this pack: the same nine background-colour lines.

## 3. Gates

| Gate | Baseline (568a3056) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `vite build` / `build:dev` | clean / clean | clean / clean |
| Vitest | 679 files · 10,633 passed · 3 skipped | 680 files · 10,649 passed · 3 skipped |

One Vitest run in Part A also reported the known reporter timeout (`Timeout calling "onTaskUpdate"`) beside a real red from this pack: the stylesheet named a font family, which a house lock forbids. The red was fixed and the gates re-run clean.

## 4. The desktop is pixel-identical

`dashMobileV1Pixel.measure.ts` photographed `/dashboard` from the unmodified base build (`index-CCukoHg6.js`, the build dev then served) and from the final build, back to back, and compared every pixel:

```
{"1512x900":{"pixels":1360800,"diff":0},"1280x800":{"pixels":1024000,"diff":0}}
```

**The comparison can fail:** a capture with one stray 1px margin on the desktop title differs by 2,843 and 2,405 pixels.

## 5. Shots

`shots/` holds all eight states at 390×844 and 375×667. `pairs/` puts each ref screen (left) beside the app at 390 (right): 01 top, 02 Up next, 03 bottom, 04 chart scrub, 05 + menu, 06 search, 07 feedback sheet, 08 tile click-through.

The account differs from the ref's sample: 40 active, 30 with agents, 11 closed, 24 of 53 agents.

What the pairs show that isn't this pack's:
- The shell's beta strip above the bar.
- The old four-tab capsule.
- The shell's foot fade above it.
- A faint 12px darkening at the right edge of the phone screen, present on dev's phone page too. Its source isn't in the DOM (nothing covers that point), and it's left for a shell pass.

## 6. What the tab bar still needs

The mock's bar is five tabs (Home, Queries, Agents, Materials, More), full width rather than a floating capsule, with the selected tab in navy. Today it is `BottomTabBar`'s four-tab capsule with a ground-fill pill and mono labels. It needs:
- a fifth tab and a destination for More (the you-menu sheet is the natural one);
- "Scripts" renamed to "Materials", pointing at the Materials group;
- the full-width bar instead of the capsule, which changes the bottom inset every phone page reserves.

It is shared by every phone page, so it is its own pack.

## 7. Dev

Deployed on top of dev's integration at the time of deploy; the bundle and branch are in the deploy note below this report's commit (`dev/…-db116-cl256-rsp5-dm1`). Prod is untouched.
