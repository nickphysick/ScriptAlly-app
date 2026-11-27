# Contact list rows v1.2.1 — report (27 Nov 2026)

Branch `contact-list-rows-v1-2-1`, cut from `dev/bew3-clr12` @ 50758f184 (what dev served: `index-ch0gjPrp.js` = Birds-eye
world v3 on top of Contact list rows v1.2). Ref `design-refs/contact-list-rows-v1-2-1/contact-list-rows-v1-2-1.html`,
sha256 `82bc8a73…9b02` — matched, committed, enrolled in the design-ref watchlist.

## False premises

- **The row's action never opened its handler.** The handler was right (it stops the click and opens the journey). The
  action and the resting status share one grid cell, and the resting stack's hover transform (its fade up) made it
  paint OVER the action: a press on "Nudge" landed on the invisible "Queried" and bubbled to the row, which opens the
  agent card. On today's dev, every mouse press of the actions opened the card and started no journey (M23 red-before).
- **The bug above the pinned headings had three causes, not one:** v1.2's page-colour strip was 14px tall and never
  reached the slim bar; the card's frame clipped anything more than 14px outside it; and the light bar, no longer
  sticky on this page, kept the Query Centre's z-index 30, so it painted over the headings (the "peek under the top bar").
- **"Send your partial / full" do not open in the query drawer.** The app routes the drawer's "sent" to the newer Card
  journeys v1 "send", hosted in the app's side panel (`openCardJourney`). That IS the send journey, and it opens without
  the agent card — no STOP was needed.
- **"Panel height + sticky top + 16 ≤ the window's inner height" leaves out the shell.** The sticky top is measured
  from the page's scroller, which starts under the shell's top bar (64px) and, until dismissed, the beta strip (42px).
  M24 counts both. Pinned, the slim bar also pushes the panel's sticky top to 98px. See M24 below.
- **The middle tier could not hold two tags a line with v1.2's middle columns** at a 1440 window (Genres about 46px on a
  972px card). The middle tier has its own columns now.
- The QC panel, the journeys and the card were not touched (M20 still pixel-identical).

## Step 0

- 0.2 Layers between the shell's top bar and the pinned headings, as Nick saw them (1440×900): the slim bar (60px, its
  own ground and bottom rule), then the light bar (count, search, Sort, Group — it peeked above the slim bar), the card's
  ring and white top, the frame's line, and rows.
- 0.3 The row's action: `ContactSheet26` `Row26`, `data-clr="act"` (hover) and `data-clr="act-end"` (touch), both calling
  `p.onAct` → `AgentList` → nudge: `openQueryDrawer({ mode: "nudge" })`; send your partial / full:
  `openQueryDrawer({ mode: "sent" })` → card journey "send" (side panel); record a response: `openResponse` (side
  panel, `RespondStagesPanel`, mounted once in App.tsx); log a query: `openQueryDrawer({ mode: "log", agentId })` →
  `LogStagesPanel`. The panel: `ContactViews` on the shared `shell/FilterPanel`; its sticky top: qcv153.css
  `.qc153-rail { top: calc(var(--pin-cover, 12px) + 12px) }`. The tiers: `contactListRows.css` container queries `clr`.
  "Outside the UK": `ContactViews`, and `appliedFilters`. The words: below.

## Commits

| sha | |
|---|---|
| `661b7d506` | the design ref |
| `013ab850f` | phase 1: nothing scrolls above the pinned headings |
| `7f3dd5ef5` | phase 2: row actions open their own journeys |
| `9ca26cae3` | phase 3: compact filter panel |
| `f4503a3de` | phase 4: v1.2 answers |
| (phase 5) | measured — this report and the harness |

## Gates against the baseline

| | baseline | after |
|---|---|---|
| `tsc --noEmit` (8 GB heap) | 0 errors | 0 errors |
| `vite build` | exit 0 | exit 0, no error/warning lines |
| Vitest | 13,841 passed, 4 skipped | touched suites green (contact, lib, dashboard, to-do, marketing: 10,781 passed); three tests that pinned the old action words or tiers re-pointed |

## Measurement — `tests/e2e/contactListRows.measure.ts`, M1–M27

All green on the final run (`runs/green-final.txt`): M1 640, M2 864, M3 228, M4 240, M5 9, M6 36, M7 6, M8 80, M9 20,
M10 10, M11 472, M12 6, M13 39, M14 71, M15 38, M16 2, M17 61, M18 5, M19 22, M20 pixel-identical, M21 9, M22 3, M23 52,
M24 4, M25 10, M26 2, M27 4. M9, M17 and M18 re-pointed for the compact panel and the new tiers.

| new lock | red-before on today's dev |
|---|---|
| M21 pinned, 1440×900, three depths: every pixel above the headings is slim bar or page colour | 10,337 / 10,443 / 10,860 of 35,017 pixels were card, rim or row |
| M22 nothing under the pointer above the headings | (behind M21 in its test) |
| M23 each action opens its own journey (host and agent / query id), never the card; keyboard; elsewhere opens the card | every mouse press opened the agent card and started no journey |
| M24 the panel fits a 1440×900 window without scrolling inside | content 1032px in 638px: it scrolled |
| M25 the compact panel's sections and pills; No genres yet ⇄ genre picks; Missing details gone, Fill the gaps stays | panel test failed (no compact panel) |
| M26 "Outside the UK" / "Outside the US" | failed, but on the old panel's markup (its row put the count first), so it is not a clean proof of the label logic; v1.2's code said "Outside the UK" whatever the home country |
| M27 card widths → narrow / middle / wide / wide | 1440 drew narrow, 1600 drew middle |

Two probe faults found and fixed while proving red, so the reds above are real: M21 first read the scroller's
transparent background as "page colour" (every pixel counted); M23 first used Playwright's click, which waits for the
button to be uncovered and so could not see the fault — it now presses the pointer at the button's centre as a person
does. M21 excuses the slim bar's whole band: its bottom rule (#e0d9ce) is drawn past its box to the page's edges.

## M24 in numbers

Pinned under the slim bar at a 1440×900 window (inner height 790): the panel's full height 608 + the shell above the
scroller 64 + its sticky top 98 + 16 = **786 ≤ 790**, no inner scroll, the whole panel inside the window. **With the
beta strip showing (a fresh session, 42px), it does not fit** and the panel scrolls inside itself (3.3's fallback);
Nick's dev screenshot shows the strip dismissed. Sections are 8/14 (the ref's 10/14 less 2) to make this fit.

## Card widths and the new tiers

| window | list card (content box) | tier |
|---|---|---|
| 1280 | 812 | narrow (< 900): short headings, one tag a line, Letter margin 18 |
| 1440 | 972 | middle (900–1099): full headings, two tags a line, Letter margin 18 |
| 1600 | 1132 | wide (≥ 1100): Letter margin 28 (to 1249) |
| 1920 | 1280 | wide: three tags a line from 1250, Letter margin 84 |

Thresholds 900 and 1100 (were 980 and 1150). The middle columns are 232 · 72 · 170–260 · 160 · ≥176 · 30 (gap 16).

## Screens (`shots/`)

`rest-1440x900.png`, `pinned-1440x900.png`, `panel-compact-1440.png` (pinned), `row-action-journey-1440x900.png` (Send
your partial → the send journey, the card closed); and the earlier views re-taken: `rest-1280/1440/1600/1920`,
`hover-action-1440`, `hover-rate-fit-1440`, `touch-1440`, `filters-crime-open-1440`, `sorted-status-1600`.

## Not individually ruled (in on Nick's behalf — flagged)

- The panel's compaction: one "Your list" section, counts beside words, four genres, "No genres yet" as a pill; sections
  8/14 rather than the ref's 10/14 so it fits pinned.
- "Missing details" leaving the panel.
- The Phase 4 answers: pinning kept; "Outside {short name}"; the status-section order (your-move stages first, a
  nudge-due agent first inside Queried); the 1440 tier, with the middle tier's own columns and per-tier Letter margins;
  the words app-wide.

## Questions for Nick

1. **The beta strip costs the panel its fit.** With the strip showing, the compact panel is 42px too tall at 1440×900
   and scrolls inside itself. Shrink further (e.g. Replies as two lines), or accept it until the strip is dismissed?
2. **Other "Send the …" text remains where this build may not go:** the Query Centre's foot (lib/qcFoot1522) and timeline
   (lib/qcTimeline), the phone's "Send the partial now" (lib/queriesPhone), the parked-journey chip (lib/queryActions/
   parking), and the stored to-do title written by lib/db.tsx ("Send the full to …", saved into the task). Change them
   in their own builds?
3. **A nudge-due agent now sits inside the Queried section** (grouped by Letter, sorted by status), below Full sent. If
   you want the nudge due at the very top, the status sort would need its own "Nudge due" section.

## Dev

**https://scriptally-dev.web.app serves `index-CSL1bsjK.js`**, built from a clean checkout of `dev/bew31-clr121` @ 2b2ec27db = this branch (cc4b351a2) merged onto `dev/bew31-clr12` @ 6b9ade4a3 (Birds-eye world v3.1 over Contact list rows v1.2), which dev served as `index-BKLzeKlK.js` when the deploy ran — dev had moved since this branch was cut, so it stacked on the new line rather than over it. The merge was clean; the served hash was checked inside the deploy command.
