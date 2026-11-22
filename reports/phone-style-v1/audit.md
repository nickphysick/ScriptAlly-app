# Phone style v1 — the audit of every phone screen (Phase 5)

Read-only: no app code changed for this. Measured at 390 × 844 on the emulator harness by PS1 in report mode (tests/e2e/phoneStyle.measure.ts, group `audit`), the same probe that is a hard gate on Today. Numbers are breaches counted on the rendered page — each element once per assertion. Open `review.html` beside this file for the shots.

Rules PS1 cannot measure are marked *by eye* (P2, P3, P4, P7, P11, P13, P14, P16, P17): read them off each screen's shot. P22–P27 are measured separately below.

## One table: screens by rule

| Screen | PS1-1<br>P8 · P12 sizes | PS1-2<br>P9 · P10 weights, the typewriter | PS1-3<br>P1 · P19 · P20 page, card corner and shadow | PS1-4<br>P15 the 16 gutter | PS1-5<br>P18 targets 48, rows 64 | PS1-6<br>P6 grey on the page | PS1-7<br>P5 one coloured card | PS1-8<br>one filled button | PS1-9<br>P21 dashes | PS1-10<br>rows in a card | total |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Today · Queries (built to the sheet; the calibration) | · | · | · | · | · | · | · | · | · | · | 0 |
| Today · Agents | 4 | 4 | 6 | · | 3 | 3 | · | · | · | · | 20 |
| Today · Activity | · | 4 | · | 1 | · | 8 | · | · | · | 4 | 17 |
| To do | 2 | · | 4 | 1 | 98 | · | · | · | · | · | 105 |
| the task screen | 20 | 1 | 1 | 1 | 10 | 1 | · | · | · | 1 | 35 |
| Materials · Packages | 4 | 3 | · | · | · | 3 | · | · | · | 1 | 11 |
| Materials · Letters | 1 | · | · | 2 | · | 13 | · | · | · | 1 | 17 |
| Materials · Versions | 1 | · | · | · | · | 4 | · | · | · | 1 | 6 |
| Materials · Comps | 1 | · | 2 | · | · | 4 | · | · | · | 1 | 8 |
| Profile | · | · | 8 | · | · | · | · | · | · | · | 8 |
| the full query list | 1 | 176 | · | 4 | · | 156 | · | · | · | 88 | 425 |
| one query · Queried | 1 | 1 | 2 | 1 | · | · | · | · | · | · | 5 |
| one query · Partial | 1 | 2 | 4 | 2 | · | · | · | · | · | · | 9 |
| one query · Full | 1 | 1 | 2 | 1 | · | · | · | · | · | · | 5 |
| one query · Offer | 1 | 1 | 2 | 1 | · | · | · | · | · | · | 5 |
| one query · closed | · | 2 | 2 | 1 | · | 1 | · | · | · | · | 6 |
| the agent sheet | 1 | · | 1 | · | · | 1 | · | · | · | · | 3 |
| the + sheet | · | · | · | · | · | 5 | · | · | · | · | 5 |
| quick log | · | · | · | · | · | 5 | · | · | · | · | 5 |
| search | · | · | 4 | 1 | · | · | · | · | · | · | 5 |
| the full Birds-eye view | · | 4 | · | 4 | 34 | 4 | · | · | · | 17 | 63 |
| the gaps sheet | 2 | · | 1 | · | · | 1 | · | · | · | · | 4 |
| Settings | 9 | 3 | 4 | 3 | 1 | 1 | · | · | · | · | 21 |
| Settings · a section | · | · | 8 | · | · | · | · | · | · | · | 8 |
| set-up · a set-up step | 5 | 1 | 2 | 1 | 1 | · | · | · | · | · | 10 |
| account · sign-in | 4 | 2 | 1 | · | 1 | · | · | · | · | · | 8 |
| account · sign-up | 4 | 2 | 1 | · | 1 | · | · | · | · | · | 8 |
| the phone landing | 76 | 5 | 10 | 24 | 10 | · | · | · | · | · | 125 |
| pricing | 57 | 21 | 5 | 5 | 18 | · | · | · | 1 | · | 107 |

## Proposed roll-out order

Most-used screens first. Size is the work, not the count: a count of 150 that is one rule on one repeated row is small.

| # | Screen(s) | Size | What would visibly change |
|--:|---|---|---|
| 1 | Today · Agents and Activity (finish Today) | small | The agent summary's figures become tiles; List health and Lately sit in white cards under page headings; the feed's dates leave the typewriter for 14 system; Lately's rows go into a card (4 loose today). |
| 2 | To do | medium | The card's corners 24 → 16; the title 32 → 28; the 98 "Then" rows grow from 60 to 64 and sit in one card; a press state on the rows and the card's two buttons. The throttled reload jumps (layout shift 1.2): the loading shapes P26 asks for. |
| 3 | The full query list | medium | Rows into a card per group (88 loose); names 700 → 600 (176); the grey count and status text off the oat (156); the headline 24 → 28. Repeated rows, so one change each. The reload jumps (0.44). |
| 4 | One query (every state) | medium | The bubbles' corners 18 → 16; their dates leave the typewriter (14 → system); the filled button 56/17 → 48/16 (the sheet's); the bubbles keep the 16 gutter. |
| 5 | The full Birds-eye view | medium | Rows 27 → 40 inside a card, as on Today; the group headings leave the typewriter; the grey counts off the oat. |
| 6 | The task screen | large | Twenty off-scale sizes (13, 17, 18 …) onto the six; ten small targets (the 44 close ring, chips) to 48; the tiles' shadow to the card's; the footer copy off the oat. |
| 7 | Materials (four tabs) | small | The header line 17 → 16; the tab labels and empty-state text off the oat; the package row into its card; the comps list's corners 24 → 16. |
| 8 | The sheets: + sheet, quick log, agent sheet, gaps, search | small | Their grey text now sits on the oat (the sheets take the page colour): it goes ink or the darker grey, or onto white cards; the search field's corners; the agent sheet's 56 button → 48. |
| 9 | Profile and Settings | small | Card corners 24 → 16 (8 on Profile, 8 on a Settings section); Settings' headings and sizes onto the six; the 13 holding-value insets take their sheet colours (white, --ps-fill, --ps-press). |
| 10 | Set-up and account screens | small | The wordmark 18.5 and the typewriter "Skip for now" / "Sign in" (14.5, 19) onto the six and the system font; the 44 exit link to 48. |
| 11 | The phone landing and pricing | large | A different tier (marketing). 76 and 57 off-scale sizes, weight 700 in the nav, the 16 gutter. A question first: do the public pages follow the app's phone sheet at all? |

## Per screen

### Today · Queries (built to the sheet; the calibration)

Shot: `audit/today-queries-built-to-the-sheet-the-calibration.png` · population 112 texts, 3 cards, 46 tappable, 31 rows.

- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Today · Agents

Shot: `audit/today-agents.png` · population 44 texts, 3 cards, 18 tappable, 5 rows.

- **PS1-1** (P8 · P12 sizes): 4 — `b.pa4-T "5" 30px`; `b.pa4-T "43" 30px`; `b.pa4-T "5" 30px`; `button.pa4-cta "Log a query to Ingrid" 17px`
- **PS1-2** (P9 · P10 weights, the typewriter): 4 — `span.pa5-gapn.pa4-T "20" typewriter 16px 400`; `span.pa5-gapn.pa4-T "3" typewriter 16px 400`; `span.pa5-gapn.pa4-T "52" typewriter 16px 400`; `span.pa5-gapn.pa4-T "4" typewriter 16px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 6 — `div.pa4-card.pa5-hl "69%List health79 gaps ac" radius 24px`; `div.pa4-card.pa5-hl "69%List health79 gaps ac" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0`; `div.pa4-card.pa5-nq "Next to queryIMIngrid Ma" radius 24px`; `div.pa4-card.pa5-nq "Next to queryIMIngrid Ma" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0` …
- **PS1-5** (P18 targets 48, rows 64): 3 — `button.pa4-tap.pa5-hl-g "Know when replies are du" row 52`; `button.pa4-tap.pa5-hl-g "Know what to send3" row 52`; `button.pa4-tap.pa5-hl-g "Know who fits your book5" row 52`
- **PS1-6** (P6 grey on the page): 3 — `span. "to query" grey on the page`; `span. "querying" grey on the page`; `span. "closed" grey on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Today · Activity

Shot: `audit/today-activity.png` · population 27 texts, 0 cards, 11 tappable, 4 rows.

- **PS1-2** (P9 · P10 weights, the typewriter): 4 — `span.pa4-s.pa4-T "30 Oct" typewriter 14px 400`; `span.pa4-s.pa4-T "30 Oct" typewriter 14px 400`; `span.pa4-s.pa4-T "30 Oct" typewriter 14px 400`; `span.pa4-s.pa4-T "30 Oct" typewriter 14px 400`
- **PS1-4** (P15 the 16 gutter): 1 — `h2.pa4-h "Lately" 24 / 24`
- **PS1-6** (P6 grey on the page): 8 — `span.pa4-s "You imported your list: " grey on the page`; `span.pa4-s.pa4-T "30 Oct" grey on the page`; `span.pa4-s "You imported your list: " grey on the page`; `span.pa4-s.pa4-T "30 Oct" grey on the page` …
- **PS1-10** (rows in a card): 4 — `button.pa4-tap "1 agentYou imported your" loose on the page`; `button.pa4-tap "1 agentYou imported your" loose on the page`; `button.pa4-tap "1 agentYou imported your" loose on the page`; `button.pa4-tap "1 agentYou imported your" loose on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### To do

Shot: `audit/to-do.png` · population 219 texts, 2 cards, 107 tappable, 104 rows.

- **PS1-1** (P8 · P12 sizes): 2 — `h1.pa5-tdh-h "To do" 32px`; `button.pa4-cta "Send" 17px`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 4 — `div.pa4-card.pa5-dkc "LaterDo it1 of 105Send M" radius 24px`; `div.pa4-card.pa5-dkc "LaterDo it1 of 105Send M" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px `; `div.pa4-card.pa5-ckc "Send Ana your fullWas du" radius 24px`; `div.pa4-card.pa5-ckc "Send Ana your fullWas du" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px `
- **PS1-4** (P15 the 16 gutter): 1 — `h2.pa4-h.pa5-tdsec "Then" 24 / 24`
- **PS1-5** (P18 targets 48, rows 64): 98 — `button.pa5-ck "Send Ana your fullWas du" row 60`; `button.pa5-ck "Send David your partialW" row 61`; `button.pa5-ck "Send Rachel your partial" row 61`; `button.pa5-ck "Answer Tom’s offerWas du" row 61` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the task screen

Shot: `audit/the-task-screen.png` · population 22 texts, 2 cards, 13 tappable, 4 rows.

- **PS1-1** (P8 · P12 sizes): 20 — `span.tdp-pos "1 of 105" 13px`; `h1.tdp-ttitle "Send Marcus your full" 23px`; `span. "Full requested" 12.5px`; `span. "Day 151" 12.5px` …
- **PS1-2** (P9 · P10 weights, the typewriter): 1 — `b. "155" typewriter 17px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 1 — `div.tws-tiles "Query letterSynopsisFull" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rg`
- **PS1-4** (P15 the 16 gutter): 1 — `div.tdp-mini "Full requestedDay 151Mar" 18 / 18`
- **PS1-5** (P18 targets 48, rows 64): 10 — `button.pa-ring "" 44×44`; `button.pa-ring "" 44×44`; `button.pa-ring "" 44×44`; `button.tdp-slot "What went" 80×26` …
- **PS1-6** (P6 grey on the page): 1 — `p.tdp-qh "Tick everything you sent" grey on the page`
- **PS1-10** (rows in a card): 1 — `div.tdp-mini "Full requestedDay 151Mar" loose on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Materials · Packages

Shot: `audit/materials-packages.png` · population 38 texts, 0 cards, 11 tappable, 1 rows.

- **PS1-1** (P8 · P12 sizes): 4 — `b.pa5m-hdc "Choose what goes out wit" 17px`; `b. "5 from 5" 22px`; `b. "1 from 5" 22px`; `b. "0 from 1" 22px`
- **PS1-2** (P9 · P10 weights, the typewriter): 3 — `small. "from 5" typewriter 14px 400`; `small. "from 5" typewriter 14px 400`; `small. "from 1" typewriter 14px 400`
- **PS1-6** (P6 grey on the page): 3 — `button. "Letters" grey on the page`; `button. "Versions" grey on the page`; `button. "Comps" grey on the page`
- **PS1-10** (rows in a card): 1 — `button.pa5m-hdpk "Dear agent,SynopsisChapt" loose on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Materials · Letters

Shot: `audit/materials-letters.png` · population 24 texts, 0 cards, 11 tappable, 1 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `b.pa5m-hdc "Choose what goes out wit" 17px`
- **PS1-4** (P15 the 16 gutter): 2 — `h2.pa5m-h "Query letters" 24 / 41`; `h2.pa5m-h "Synopses" 24 / 38`
- **PS1-6** (P6 grey on the page): 13 — `button. "Packages" grey on the page`; `button. "Versions" grey on the page`; `button. "Comps" grey on the page`; `span.pa4-s "3" grey on the page` …
- **PS1-10** (rows in a card): 1 — `button.pa5m-hdpk "Dear agent,SynopsisChapt" loose on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Materials · Versions

Shot: `audit/materials-versions.png` · population 9 texts, 0 cards, 7 tappable, 1 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `b.pa5m-hdc "Choose what goes out wit" 17px`
- **PS1-6** (P6 grey on the page): 4 — `button. "Packages" grey on the page`; `button. "Letters" grey on the page`; `button. "Comps" grey on the page`; `p.pa4-s.pa5m-lede "No versions of your manu" grey on the page`
- **PS1-10** (rows in a card): 1 — `button.pa5m-hdpk "Dear agent,SynopsisChapt" loose on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Materials · Comps

Shot: `audit/materials-comps.png` · population 30 texts, 1 cards, 14 tappable, 8 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `b.pa5m-hdc "Choose what goes out wit" 17px`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 2 — `div.pa4-card.pa5m-list "TTThe Tidewater LineR. O" radius 24px`; `div.pa4-card.pa5m-list "TTThe Tidewater LineR. O" shadow rgba(31, 38, 51, 0.05) 0px 1px 2p`
- **PS1-6** (P6 grey on the page): 4 — `button. "Packages" grey on the page`; `button. "Letters" grey on the page`; `button. "Versions" grey on the page`; `p.pa4-s.pa5m-lede "Your comparable titles. " grey on the page`
- **PS1-10** (rows in a card): 1 — `button.pa5m-hdpk "Dear agent,SynopsisChapt" loose on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Profile

Shot: `audit/profile.png` · population 21 texts, 4 cards, 9 tappable, 5 rows.

- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 8 — `div.pa4-card.pa4-lapcard "87queries sent32asked fo" radius 24px`; `div.pa4-card.pa4-lapcard "87queries sent32asked fo" shadow rgba(31, 38, 51, 0.05) 0px 1px `; `div.pa4-card "Wall of no15 so farEvery" radius 24px`; `div.pa4-card "Wall of no15 so farEvery" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgb` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the full query list

Shot: `audit/the-full-query-list.png` · population 287 texts, 0 cards, 97 tappable, 88 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `h1.pa4-d2.pa4-hl "24 need you.5 are with a" 24px`
- **PS1-2** (P9 · P10 weights, the typewriter): 176 — `span.pa4-nm "Tom Ellery" weight 700`; `span.pa4-s.pa4-T "13w" typewriter 14px 400`; `span.pa4-nm "Noah Bright" weight 700`; `span.pa4-s.pa4-T "14w" typewriter 14px 400` …
- **PS1-4** (P15 the 16 gutter): 4 — `h2.pa4-h "With you" 24 / 285`; `h2.pa4-h "With the agent" 24 / 231`; `h2.pa4-h "Gone quiet" 24 / 266`; `h2.pa4-h "Closed" 24 / 302`
- **PS1-6** (P6 grey on the page): 156 — `span.pa4-s "24" grey on the page`; `span.pa4-s.pa4-T "13w" grey on the page`; `span.pa4-s.pa4-T "14w" grey on the page`; `span.pa4-s.pa4-T "8w" grey on the page` …
- **PS1-10** (rows in a card): 88 — `button.pa4-ib2.un "TETom Ellery13wOffer · 3" loose on the page`; `button.pa4-ib2.un "NBNoah Bright14wOffer · " loose on the page`; `button.pa4-ib2.un "JMJonathan Marsh8wFull r" loose on the page`; `button.pa4-ib2.un "OFOttoline Frayn9wFull r" loose on the page` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### one query · Queried

Shot: `audit/one-query-queried.png` · population 9 texts, 1 cards, 5 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `button.pa4-cta "I’ve nudged Hester" 17px`
- **PS1-2** (P9 · P10 weights, the typewriter): 1 — `time.pa4-s.pa4-T "8 Sep" typewriter 14px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 2 — `div.pa4-bub "You sent Hester your que" radius 18px`; `div.pa4-bub "You sent Hester your que" shadow rgba(31, 38, 51, 0.08) 0px 1px 2px 0px`
- **PS1-4** (P15 the 16 gutter): 1 — `div.pa4-bub "You sent Hester your que" 149 / 16`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### one query · Partial

Shot: `audit/one-query-partial.png` · population 13 texts, 2 cards, 6 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `button.pa4-cta "Mark partial sent" 17px`
- **PS1-2** (P9 · P10 weights, the typewriter): 2 — `time.pa4-s.pa4-T "6 Sep" typewriter 14px 400`; `time.pa4-s.pa4-T "6 Sep" typewriter 14px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 4 — `div.pa4-bub "You sent Edda your query" radius 18px`; `div.pa4-bub "You sent Edda your query" shadow rgba(31, 38, 51, 0.08) 0px 1px 2px 0px`; `div.pa4-bub.t "Edda asked for a partial" radius 18px`; `div.pa4-bub.t "Edda asked for a partial" shadow rgba(31, 38, 51, 0.08) 0px 1px 2px 0px`
- **PS1-4** (P15 the 16 gutter): 2 — `div.pa4-bub "You sent Edda your query" 161 / 16`; `div.pa4-bub.t "Edda asked for a partial" 16 / 176`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### one query · Full

Shot: `audit/one-query-full.png` · population 11 texts, 1 cards, 6 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `button.pa4-cta "Mark full sent" 17px`
- **PS1-2** (P9 · P10 weights, the typewriter): 1 — `time.pa4-s.pa4-T "24 Sep" typewriter 14px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 2 — `div.pa4-bub "You sent Jonathan your q" radius 18px`; `div.pa4-bub "You sent Jonathan your q" shadow rgba(31, 38, 51, 0.08) 0px 1px 2px 0px`
- **PS1-4** (P15 the 16 gutter): 1 — `div.pa4-bub "You sent Jonathan your q" 130 / 16`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### one query · Offer

Shot: `audit/one-query-offer.png` · population 9 texts, 1 cards, 5 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `button.pa4-cta "Record your answer" 17px`
- **PS1-2** (P9 · P10 weights, the typewriter): 1 — `time.pa4-s.pa4-T "22 Aug" typewriter 14px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 2 — `div.pa4-bub "You sent Tom your query2" radius 18px`; `div.pa4-bub "You sent Tom your query2" shadow rgba(31, 38, 51, 0.08) 0px 1px 2px 0px`
- **PS1-4** (P15 the 16 gutter): 1 — `div.pa4-bub "You sent Tom your query2" 166 / 16`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### one query · closed

Shot: `audit/one-query-closed.png` · population 11 texts, 1 cards, 3 tappable, 0 rows.

- **PS1-2** (P9 · P10 weights, the typewriter): 2 — `time.pa4-s.pa4-T "16 Sep" typewriter 14px 400`; `time.pa4-s.pa4-T "28 Oct" typewriter 14px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 2 — `div.pa4-bub "You sent Elinor your que" radius 18px`; `div.pa4-bub "You sent Elinor your que" shadow rgba(31, 38, 51, 0.08) 0px 1px 2px 0px`
- **PS1-4** (P15 the 16 gutter): 1 — `div.pa4-bub "You sent Elinor your que" 157 / 16`
- **PS1-6** (P6 grey on the page): 1 — `div.pa4-gap.pa4-s "42 days later" grey on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the agent sheet

Shot: `audit/the-agent-sheet.png` · population 17 texts, 1 cards, 3 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 1 — `button.pa4-cta "Log a query to Edda" 17px`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 1 — `div.pa4-card "Your fit★★★★★Not rated y" radius 24px`
- **PS1-6** (P6 grey on the page): 1 — `div.pa4-s "Kron Literary" grey on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the + sheet

Shot: `audit/the-sheet.png` · population 9 texts, 0 cards, 7 tappable, 0 rows.

- **PS1-6** (P6 grey on the page): 5 — `span.pa4-s "Ingrid" grey on the page`; `span.pa4-s "Tomas" grey on the page`; `span.pa4-s "Edda" grey on the page`; `span.pa4-s "Imogen" grey on the page` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### quick log

Shot: `audit/quick-log.png` · population 9 texts, 0 cards, 7 tappable, 0 rows.

- **PS1-6** (P6 grey on the page): 5 — `span.pa4-s "Ingrid" grey on the page`; `span.pa4-s "Tomas" grey on the page`; `span.pa4-s "Edda" grey on the page`; `span.pa4-s "Imogen" grey on the page` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### search

Shot: `audit/search.png` · population 15 texts, 2 cards, 15 tappable, 13 rows.

- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 4 — `label.pa4-field "" radius 24px`; `label.pa4-field "" shadow rgb(232, 200, 188) 0px 0px 0px 2px`; `div.pa4-card "ResponsesAnalyticsPackag" radius 24px`; `div.pa4-card "ResponsesAnalyticsPackag" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgb`
- **PS1-4** (P15 the 16 gutter): 1 — `label.pa4-field "" 16 / 88`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the full Birds-eye view

Shot: `audit/the-full-birds-eye-view.png` · population 34 texts, 0 cards, 28 tappable, 17 rows.

- **PS1-2** (P9 · P10 weights, the typewriter): 4 — `h2.pa5bv-gt "Past its date" typewriter 14px 400`; `h2.pa5bv-gt "Upcoming" typewriter 14px 400`; `h2.pa5bv-gt "Watch and wait" typewriter 14px 400`; `h2.pa5bv-gt "No date" typewriter 14px 400`
- **PS1-4** (P15 the 16 gutter): 4 — `h2.pa5bv-gt "Past its date" 16 / 283`; `h2.pa5bv-gt "Upcoming" 16 / 307`; `h2.pa5bv-gt "Watch and wait" 16 / 268`; `h2.pa5bv-gt "No date" 16 / 322`
- **PS1-5** (P18 targets 48, rows 64): 34 — `button.pa5bv-top "Vale" 390×27`; `button.pa5bv-top "Halloran" 390×27`; `button.pa5bv-top "Kovic" 390×27`; `button.pa5bv-top "Kovic" 390×27` …
- **PS1-6** (P6 grey on the page): 4 — `span. "47" grey on the page`; `span. "15" grey on the page`; `span. "2" grey on the page`; `span. "6" grey on the page`
- **PS1-10** (rows in a card): 17 — `button.pa5bv-top "Vale" loose on the page`; `button.pa5bv-top "Halloran" loose on the page`; `button.pa5bv-top "Kovic" loose on the page`; `button.pa5bv-top "Kovic" loose on the page` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the gaps sheet

Shot: `audit/the-gaps-sheet.png` · population 15 texts, 2 cards, 7 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 2 — `button.pa5-gs-x "✕" 18px`; `button.pa4-cta "Save and next" 17px`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 1 — `div.pa4-card.pa5-gc "AKAisha KapoorThe Lanter" radius 24px`
- **PS1-6** (P6 grey on the page): 1 — `div.pa4-s "Filling the gaps · 1 of " grey on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Settings

Shot: `audit/settings.png` · population 21 texts, 4 cards, 12 tappable, 10 rows.

- **PS1-1** (P8 · P12 sizes): 9 — `span.pa3-seal "H" 13.5px`; `span.pa3-s "Pro trial" 13.5px`; `h2.pa3-h2 "Reminders" 18px`; `span. "Nudge reminders by email" 14.5px` …
- **PS1-2** (P9 · P10 weights, the typewriter): 3 — `h2.pa3-h2 "Reminders" typewriter 18px 400`; `h2.pa3-h2 "Help and tools" typewriter 18px 400`; `h2.pa3-h2 "Your account" typewriter 18px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 4 — `div.pa3-card "HharnessPro trial" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgba(31, 3`; `div.pa3-card "Nudge reminders by email" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgb`; `div.pa3-card "Import queriesBring a sp" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgb`; `div.pa3-card "YouPreferencesEmailsPlan" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgb`
- **PS1-4** (P15 the 16 gutter): 3 — `h2.pa3-h2 "Reminders" 20 / 275`; `h2.pa3-h2 "Help and tools" 20 / 236`; `h2.pa3-h2 "Your account" 20 / 250`
- **PS1-5** (P18 targets 48, rows 64): 1 — `button.pa3-sw.on "" 50×30`
- **PS1-6** (P6 grey on the page): 1 — `p.pa3-note "QueryHawk doesn’t send t" grey on the page`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### Settings · a section

Shot: `audit/settings-a-section.png` · population 21 texts, 4 cards, 9 tappable, 5 rows.

- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 8 — `div.pa4-card.pa4-lapcard "87queries sent32asked fo" radius 24px`; `div.pa4-card.pa4-lapcard "87queries sent32asked fo" shadow rgba(31, 38, 51, 0.05) 0px 1px `; `div.pa4-card "Wall of no15 so farEvery" radius 24px`; `div.pa4-card "Wall of no15 so farEvery" shadow rgba(31, 38, 51, 0.05) 0px 1px 2px 0px, rgb` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### set-up · a set-up step

Shot: `audit/set-up-a-set-up-step.png` · population 8 texts, 1 cards, 1 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 5 — `span.ws-bwm "QueryHawk" 18.5px`; `span.ws-beta "BETA" 8px`; `button.sf-exit "Skip for now" 14.5px`; `small.sf-pbstep "Step 3 of 3" 13px` …
- **PS1-2** (P9 · P10 weights, the typewriter): 1 — `button.sf-exit "Skip for now" typewriter 14.5px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 2 — `div.ws-main.sf-main "QueryHawkBETAGetting set" page rgba(0, 0, 0, 0)`; `div.ws-window.sf-sheet "Lab filler — the frame i" radius 20px`
- **PS1-4** (P15 the 16 gutter): 1 — `div.ws-window.sf-sheet "Lab filler — the frame i" 8 / 8`
- **PS1-5** (P18 targets 48, rows 64): 1 — `button.sf-exit "Skip for now" 94×44`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### account · sign-in

Shot: `audit/account-sign-in.png` · population 7 texts, 0 cards, 1 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 4 — `span.ws-bwm "QueryHawk" 18.5px`; `span.ws-beta "BETA" 12px unmarked`; `b.ws-ftn "Sign in" 19px`; `button.sf-exit "Back to site" 14.5px`
- **PS1-2** (P9 · P10 weights, the typewriter): 2 — `b.ws-ftn "Sign in" typewriter 19px 400`; `button.sf-exit "Back to site" typewriter 14.5px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 1 — `div.ws-main.sf-main "QueryHawkBETAYour accoun" page rgba(0, 0, 0, 0)`
- **PS1-5** (P18 targets 48, rows 64): 1 — `button.sf-exit "Back to site" 89×22`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### account · sign-up

Shot: `audit/account-sign-up.png` · population 7 texts, 0 cards, 1 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 4 — `span.ws-bwm "QueryHawk" 18.5px`; `span.ws-beta "BETA" 12px unmarked`; `b.ws-ftn "Create account" 19px`; `button.sf-exit "Back to site" 14.5px`
- **PS1-2** (P9 · P10 weights, the typewriter): 2 — `b.ws-ftn "Create account" typewriter 19px 400`; `button.sf-exit "Back to site" typewriter 14.5px 400`
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 1 — `div.ws-main.sf-main "QueryHawkBETAYour accoun" page rgba(0, 0, 0, 0)`
- **PS1-5** (P18 targets 48, rows 64): 1 — `button.sf-exit "Back to site" 89×22`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### the phone landing

Shot: `audit/the-phone-landing.png` · population 88 texts, 12 cards, 15 tappable, 0 rows.

- **PS1-1** (P8 · P12 sizes): 76 — `a.mk-skip "Skip to content" 15.2px`; `span.mk-navword "QueryHawk" 17px`; `button.mk-wljoin "Join" 15px`; `mark. "literary agent?" 41px` …
- **PS1-2** (P9 · P10 weights, the typewriter): 5 — `span.mk-navword "QueryHawk" weight 700`; `b. "QueryHawk Pro, free" weight 700`; `b. "A direct line" weight 700`; `b. "Smart Import" weight 700` …
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 10 — `body. "Skip to contentQueryHawk" page rgba(0, 0, 0, 0)`; `article.mk-vcard "Get good stories told.A " radius 22px`; `article.mk-vcard "Get good stories told.A " shadow rgba(0, 0, 0, 0.6) 0px 18px 34px -18px`; `article.mk-vcard "Make querying straightfo" radius 22px` …
- **PS1-4** (P15 the 16 gutter): 24 — `ul.mk-wl-ticks "All your queries from st" 24 / 24`; `ul.mk-wl-ticks "Queries, partials and fu" 24 / 24`; `ul.mk-wl-ticks "Their manuscript wish li" 24 / 24`; `ul.mk-wl-ticks "Works with any email, se" 24 / 24` …
- **PS1-5** (P18 targets 48, rows 64): 10 — `button.mk-brand.mk-brand-link "QueryHawk" 128×26`; `button.mk-wljoin "Join" 61×36`; `a. "Query tracking" 169×46`; `a. "A home for your agents" 169×46` …
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

### pricing

Shot: `audit/pricing.png` · population 69 texts, 3 cards, 32 tappable, 10 rows.

- **PS1-1** (P8 · P12 sizes): 57 — `a.mk-skip "Skip to content" 15.2px`; `span.mk-navword "QueryHawk" 17px`; `button.mk-lg "Log in" 15px`; `h1.mk-pvh1 "A free QueryHawk campaig" 29.6px` …
- **PS1-2** (P9 · P10 weights, the typewriter): 21 — `span.mk-navword "QueryHawk" weight 700`; `button.mk-lg "Log in" weight 500`; `p.mk-pvlaunchh "Then, once we launch:" typewriter 19.2px 400`; `span. "Free" typewriter 16.8px 400` …
- **PS1-3** (P1 · P19 · P20 page, card corner and shadow): 5 — `body. "Skip to contentQueryHawk" page rgba(0, 0, 0, 0)`; `section.mk-pvbox "Founding writersA free Q" radius 20px`; `section.mk-pvbox "Founding writersA free Q" shadow rgba(28, 19, 15, 0.05) 0px 1px 2px 0px,`; `article.mk-lcard.mk-lcard--pro "ProChoose how long to st" radius 22px` …
- **PS1-4** (P15 the 16 gutter): 5 — `section.mk-pvbox "Founding writersA free Q" 14 / 14`; `div.mk-pvtabsin "Free£0Profrom £3.75 a mo" 14 / 14`; `article.mk-lcard.mk-lcard--pro "ProChoose how long to st" 14 / 14`; `h2.mk-lname "Pro" 42 / 42` …
- **PS1-5** (P18 targets 48, rows 64): 18 — `button.mk-brand.mk-brand-link "QueryHawk" 128×26`; `button.mk-lg "Log in" 66×36`; `button.mk-burger "" 32×41`; `button.mk-doclink "Privacy" 49×20` …
- **PS1-9** (P21 dashes): 1 — `ul.mk-llist "Everything in Free, plus" Top dashed`
- *By eye:* P2, P3, P4, P7, P11, P13, P14, P16, P17 — see the shot.

## Touch and motion (P23–P27)

**Pressed state (P23).** Each tappable on screen was given the pressed state (DevTools' `:active`, forced: a synthetic touch or mouse press did not raise `:active` in this emulation, even on Today's rows, whose pressed state is known — Today is the calibration and shows it). A press drawn by script on pointerdown (To do's card) is not seen by this. Tappables with no pressed state:

| Screen | pressed / tested | with no pressed state (first eight) |
|---|--:|---|
| Today · Queries (built to the sheet; the calibration) | 8 / 16 | `button.t "Today"`, `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "Queries"`, `button. "Agents"`, `button. "Activity"`, `button.pa5-be-row "Quint"`, `button.pa5-be-row "Vale"` |
| Today · Agents | 0 / 11 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.pa5-need "105 things need you"`, `button. "Queries"`, `button.on "Agents"`, `button. "Activity"`, `button. "5to query"`, `button. "43querying"` |
| Today · Activity | 0 / 9 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.pa5-need "105 things need you"`, `button. "Queries"`, `button. "Agents"`, `button.on "Activity"`, `button.pa4-tap "1 agentYou imported yo"`, `button.pa4-tap "1 agentYou imported yo"` |
| To do | 0 / 7 | `button.pa4-ib ""`, `button.pa4-cta "Send"`, `button.pa4-link "Not now, show the next"`, `button.pa5-ck "Send Ana your fullWas "`, `button.pa5-ck "Send David your partia"`, `button.pa5-ck "Send Rachel your parti"`, `button.pa5-ck "Answer Tom’s offerWas "` |
| the task screen | 0 / 7 | `button.pa4-ib ""`, `button.pa4-cta "Send"`, `button.pa4-link "Not now, show the next"`, `button.pa5-ck "Send Ana your fullWas "`, `button.pa5-ck "Send David your partia"`, `button.pa5-ck "Send Rachel your parti"`, `button.pa5-ck "Answer Tom’s offerWas "` |
| Materials · Packages | 0 / 8 | `button.pa4-ib ""`, `button.pa5m-hdpk "Dear agent,SynopsisCha`, `button.on "Packages"`, `button. "Letters"`, `button. "Versions"`, `button. "Comps"`, `button.pa4-card "Not sent yetDear agent"`, `button.pa4-card "5 from 5asked for more"` |
| Materials · Letters | 0 / 9 | `button.pa4-ib ""`, `button.pa5m-hdpk "Dear agent,SynopsisCha`, `button. "Packages"`, `button.on "Letters"`, `button. "Versions"`, `button. "Comps"`, `button.pa5m-sheet "Dear agent,Query lett`, `button.pa5m-sheet "Dear agent,Query lett` |
| Materials · Versions | 0 / 7 | `button.pa4-ib ""`, `button.pa5m-hdpk "Dear agent,SynopsisCha`, `button. "Packages"`, `button. "Letters"`, `button.on "Versions"`, `button. "Comps"`, `button.pa4-link "Save a new version"` |
| Materials · Comps | 0 / 10 | `button.pa4-ib ""`, `button.pa5m-hdpk "Dear agent,SynopsisCha`, `button. "Packages"`, `button. "Letters"`, `button. "Versions"`, `button.on "Comps"`, `button.pa4-tap "TTThe Tidewater LineR."`, `button.pa4-tap "SRSalt RoadImogen Hale"` |
| Profile | 0 / 6 | `button.pa4-ib ""`, `button.pa4-link "See the full picture"`, `button.pa4-card "This week0 of your 1 q"`, `button.pa4-link "Open the wall"`, `button.pa4-tap "Your notes"`, `button.pa4-tap "Responses"` |
| the full query list | 0 / 14 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "List"`, `button. "Birds-eye"`, `button.pa4-chip "All 88"`, `button.pa4-chip "With you 24"`, `button.pa4-chip "With the agent 5"`, `button.pa4-chip "Gone quiet 41"` |
| one query · Queried | 0 / 14 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "List"`, `button. "Birds-eye"`, `button.pa4-chip "All 88"`, `button.pa4-chip "With you 24"`, `button.pa4-chip "With the agent 5"`, `button.pa4-chip "Gone quiet 41"` |
| one query · Partial | 0 / 14 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "List"`, `button. "Birds-eye"`, `button.pa4-chip "All 88"`, `button.pa4-chip "With you 24"`, `button.pa4-chip "With the agent 5"`, `button.pa4-chip "Gone quiet 41"` |
| one query · Full | 0 / 14 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "List"`, `button. "Birds-eye"`, `button.pa4-chip "All 88"`, `button.pa4-chip "With you 24"`, `button.pa4-chip "With the agent 5"`, `button.pa4-chip "Gone quiet 41"` |
| one query · Offer | 0 / 14 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "List"`, `button. "Birds-eye"`, `button.pa4-chip "All 88"`, `button.pa4-chip "With you 24"`, `button.pa4-chip "With the agent 5"`, `button.pa4-chip "Gone quiet 41"` |
| one query · closed | 0 / 17 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.on "List"`, `button. "Birds-eye"`, `button.pa4-chip "All 88"`, `button.pa4-chip "With you 24"`, `button.pa4-chip "With the agent 5"`, `button.pa4-chip "Gone quiet 41"` |
| the agent sheet | 0 / 14 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.pa5-need "105 things need you"`, `button. "Queries"`, `button.on "Agents"`, `button. "Activity"`, `button. "5to query"`, `button. "43querying"` |
| the + sheet | 0 / 18 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.pa5-need "105 things need you"`, `button. "Queries"`, `button.on "Agents"`, `button. "Activity"`, `button. "5to query"`, `button. "43querying"` |
| quick log | 0 / 18 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.pa5-need "105 things need you"`, `button. "Queries"`, `button.on "Agents"`, `button. "Activity"`, `button. "5to query"`, `button. "43querying"` |
| search | 0 / 23 | `button.pa4-ib ""`, `button.pa4-ib ""`, `button.pa5-need "105 things need you"`, `button. "Queries"`, `button.on "Agents"`, `button. "Activity"`, `button. "5to query"`, `button. "43querying"` |
| the full Birds-eye view | 0 / 26 | `button.pa4-ib ""`, `button. "List"`, `button.on "Birds-eye"`, `button.pa4-ib ""`, `button.pa4-chip "1 month"`, `button.pa4-chip "3 months"`, `button.pa4-chip "6 months"`, `button.pa4-ib ""` |
| the gaps sheet | 0 / 18 | `button.t "Today"`, `button.pa4-ib ""`, `button.pa4-ib ""`, `button. "Queries"`, `button.on "Agents"`, `button. "Activity"`, `button.pa4-tap "Know when replies are "`, `button.pa4-tap "Know what to send3"` |
| Settings | 6 / 8 | `button.pa4-ib ""`, `button.pa3-sw ""` |
| Settings · a section | 0 / 6 | `button.pa4-ib ""`, `button.pa4-link "See the full picture"`, `button.pa4-card "This week0 of your 1 q"`, `button.pa4-link "Open the wall"`, `button.pa4-tap "Your notes"`, `button.pa4-tap "Responses"` |
| set-up · a set-up step | 0 / 1 | `button.sf-exit "Skip for now"` |
| account · sign-in | 0 / 1 | `button.sf-exit "Back to site"` |
| account · sign-up | 0 / 1 | `button.sf-exit "Back to site"` |

**Saves with no snackbar (P25).** Measured only where an existing lock already saves and undoes in the same run: To do's right swipe (PA5-10) and filling a gap (PA5-11) — both show the snackbar with Undo. Every other save writes, and this pack's measurement writes nothing, so no other save was pressed: that list is **not measured** (a question for the roll-out pack, which can save and undo screen by screen).

**Loads (P26).** Each root reloaded under a slow network (400 ms latency, 200 kB/s) and a 4× slower CPU; spinner = anything visible turning, or a progressbar, sampled every 100 ms; jump = cumulative layout shift.

| Root | layout shift | spinner samples |
|---|--:|--:|
| `/dashboard` | 0.001 | 0 |
| `/todo` | 1.196 | 0 |
| `/materials` | 0 | 0 |
| `/you` | 0 | 0 |
| `/queries/all?view=list` | 0.44 | 0 |

**Motion (P24, P27)** is by eye: every phone stylesheet stops its animations under reduced motion (phoneV4.css, phoneV5.css), and PS1 ran with motion killed.

## Icons (P22: a 24 box, a 1.8 line, round ends)

Every svg up to 40 wide on each screen, status marks excluded (P22 keeps status to the marks).

| box | line | ends | count | on |
|---|---|---|--:|---|
| 24×24 | 1.7px | round | 351 | Today · Queries (built to the sheet; the calibration), Today · Agents, Today · Activity, To do … |
| 18×18 | 1.6px | butt | 25 | the phone landing |
| 18×18 | fill | butt | 10 | Settings |
| 40×40 | fill | butt | 9 | Settings |
| 12×12 | 2px | round | 9 | pricing |
| 14×14 | 2.4px | round | 3 | the task screen |
| 10×10 | 1.1px | butt | 3 | the phone landing |
| 10×10 | 1.5px | butt | 3 | the phone landing |
| 19×19 | 2px | butt | 2 | the task screen |
| 20×20 | 1.6px | round | 2 | the task screen |
| 13×12 | fill | butt | 2 | account · sign-in, account · sign-up |
| 9×9 | 1.8px | round | 2 | the phone landing |
| 24×24 | 1.8px | round | 1 ✓ | Today · Queries (built to the sheet; the calibration) |
| 19×19 | 2px | round | 1 | the task screen |
| 24×24 | 2px | round | 1 | the full Birds-eye view |
| 20×20 | 2px | round | 1 | the phone landing |
| 16×16 | 2px | butt | 1 | the phone landing |
| 20×20 | 2px | butt | 1 | the phone landing |
| 15×15 | fill | butt | 1 | the phone landing |
| 9×9 | 1.6px | butt | 1 | the phone landing |
| 12×12 | 1.8px | round | 1 | the phone landing |
| 9×10 | 1.1px | butt | 1 | the phone landing |
| 8×9 | 1.1px | butt | 1 | the phone landing |
| 13×13 | 1.6px | round | 1 | the phone landing |
| 7×7 | 1.2px | butt | 1 | the phone landing |
| 13×13 | 2px | round | 1 | pricing |
| 16×16 | 1.7px | round | 1 | pricing |
| 16×16 | 1.6px | round | 1 | pricing |

## Colour outside the sheet — the holding value `--pa-inset-legacy` (ruling 1b)

Each reader keeps #f8f6f2 until its screen is rolled out; the census counts each as a breach. The sheet colour each should take:

| Reader | File | Takes at roll-out | Unchanged by the oat page |
|---|---|---|---|
| `.pf-av.pf-empty` | queryActions/phoneFlow.css | --ps-fill (an empty avatar's ground) | not on a crawled screen · class chain unchanged |
| `.pf-lctray` | queryActions/phoneFlow.css | --ps-fill (a tray inside a card) | not on a crawled screen · class chain unchanged |
| `.pa-addrow` | agents/phone/agentsPhone.css | --ps-fill (a row-shaped field inside a card) | not on a crawled screen · class chain unchanged |
| `.pa-anote` | agents/phone/agentsPhone.css | --ps-fill (a note inside a card) | not on a crawled screen · class chain unchanged |
| `.pa-aq` | agents/phone/agentsPhone.css | white — it is a query card on the agent sheet (P1) | not on a crawled screen · class chain unchanged |
| `.pa-dwish` | agents/phone/agentsPhone.css | --ps-fill (an inset) | not on a crawled screen · class chain unchanged |
| `.pa5-gc-where` | phone/v5/phoneV5.css | --ps-fill (an inset in the gaps sheet) | pixels identical (the gaps sheet) · class chain unchanged |
| `.pa5bv-xpi` | phone/v5/phoneV5.css | --ps-fill (an opened row's inset) | not on a crawled screen · class chain unchanged |
| `.pa-mtile .pa-mi` | phone/phoneShell.css | --ps-fill (an icon's round ground) | not on a crawled screen · class chain unchanged |
| `.pa-set .sc-cf` | phone/pages/settingsPhone.css | --ps-fill (an inset) | not on a crawled screen · class chain unchanged |
| `.pa-pg .pa-annote` | phone/pages/pagesPhone.css | white (a note card, P1) | not on a crawled screen · class chain unchanged |
| `.pa3 .pa3-row` | phone/v3/phoneV3.css | --ps-press (the pressed row, P23) | pixels identical (Settings) · class chain unchanged |
| `.pa3 .pa3-opt.on` | phone/v3/phoneV3.css | --ps-press under the navy ring (the selected state; P2 keeps the ring navy) | not on a crawled screen · class chain unchanged |

## Ruling 1a — the readers that follow the page

- the task screen: fade tdp-foot — equals the page
- the full query list: seal ring — equals the page
- the full query list: seal ring — equals the page
- the full query list: seal ring — equals the page
- one query · Queried: seal ring — equals the page
- one query · Queried: seal ring — equals the page
- one query · Queried: seal ring — equals the page
- one query · Partial: seal ring — equals the page
- one query · Partial: seal ring — equals the page
- one query · Partial: seal ring — equals the page
- one query · Full: seal ring — equals the page
- one query · Full: seal ring — equals the page
- one query · Full: seal ring — equals the page
- one query · Offer: seal ring — equals the page
- one query · Offer: seal ring — equals the page
- one query · Offer: seal ring — equals the page
- one query · closed: seal ring — equals the page
- one query · closed: seal ring — equals the page
- one query · closed: seal ring — equals the page
- The page-fold corner (`.pa-sheetc::before`) did not appear on a crawled screen: not measured.
