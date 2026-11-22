# Phone app v2: the design ref

This folder is the normative design for QueryHawk on a phone (below 768px). It came out of a design pass on 28–29 October 2026. Nick picked every option on a series of boards, and the prototype holds those picks as its defaults.

## What is here

| File | What it is |
|---|---|
| `phone-app-v2.html` | **The oracle.** One self-contained clickable prototype. Open it in a browser. It has three views: Prototype (a live phone), Screens (a gallery) and Rulebook. |
| `phone-app-v2-rulebook.md` | The rulebook as text. Every pick by area, the general rules, notes on each screen, behaviour and wording rules. |
| `screens/*.png` | 46 screens at 2×, rendered from the prototype's defaults. Use them for pairs (ref on the left, the app on the right). |
| `src/*` | The prototype's readable source. `build.py` concatenates the files into one script. Use these to read values. The `.html` is the same code with the illustrations inlined. |

## How to read the source

- `build.py` concatenates `art.js, art2.js, data.js, screens.js, overlays.js, flows.js, v2.js, qsheet.js, flowv.js, toastv.js, todov.js, agentsv.js, menuv.js, respv.js, msv.js, anv.js, restv.js, rules.js, app.js` in that order. `art.js` and `art2.js` are omitted here because they are only the inlined images.
- **Later files override earlier ones.** A function declared again later wins, and some files wrap an earlier function (`const _x = f; f = function(){…}`). The version that renders is the LAST definition in build order. For example, `ovQuery` in `overlays.js` is superseded by `qsheet.js`.
- **Every design decision is a variant global, and the default is Nick's pick.** Only the default branch is normative. The other branches are options he rejected, so ignore them. The defaults are:

| Global | Default | Decision |
|---|---|---|
| `HV` (v2.js) | `C` | Band header: the book as a chip under the page name |
| `PICK` (v2.js) | hdr C, stats D, next B, bg B | Home: navy band with the hero; split-bar stat card; Up next as a white card with a blush strip; warm off-white page |
| `ACC`, `QROW`, `ACT` (app.js) | `B`, `B`, `C` | Blush accent; status glyph leads query rows; + sheet is two big rows and three pills |
| `QH`, `QB`, `QL`, `QN` (qsheet.js) | `B`, `B`, `B`, `A` | Query sheet: landing-page card header; one scroll; stage track then the latest; Your next step pinned at the bottom |
| `FQ`, `FP`, `FA`, `FE` (flowv.js) | `B`, `C`, `B`, `C` | Flow: answers as one list; answers-so-far chips; agent search first; check card you can tap to change |
| `FL` (flowv.js) | `E` | Flow layout: the query card builds itself in the navy band, the question sits on the sheet below |
| `TSV` (toastv.js) | `C` | Confirmation: snackbar (navy pill, small picture, one line, Undo) |
| `TDB`, `TDG`, `TDR` (todov.js) | `B`, `A`, `B` | To-do: this-week strip in the band; grouped by when; glyph and a verb button |
| `AGR`, `AGS`, `AGD`, `ADC` (agentsv.js) | `B`, `D`, `C`, `B` | Agents: glyph rows with facts; profile with a navy header of key facts; Your list / Discover switch; Discover cards like the query card |
| `MV`, `PH` (menuv.js) | `B`, `B` | Menu: tiles with live numbers; menu pages open with the navy band |
| `BRAND` (menuv.js) | `A` | No logo inside the app; the hawk and wordmark only in the menu's sign-off |
| `RSQ`, `WALL` (respv.js) | `B`, `B` | Responses: requests as mini query cards; the Wall of no as a wall of pinned paper cards |
| `MSH`, `MSL`, `MSP`, `COV` (msv.js) | `B`, `B`, `A`, `B` | Manuscript: the book in the band; one scroll; packages as cards with results overlaid; a proper paperback cover |
| `ANT`, `ANC` (anv.js) | `B`, `B` | Analytics: headline in the band; stage track, weekly columns and record cards |
| `FRH`, `FRQ`, `GLV`, `CBV`, `CEV` (restv.js) | `C`, `A`, `B`, `A`, `C` | First run: Home faded behind a button / Queries first-query card; Streaks & goals ring, dots and badges; Corkboard pinned notes; celebrations navy with the stamped card |

## Where each screen lives (the last definition wins)

| Screen | Function(s) |
|---|---|
| Shell: tab bar, band, page band, sheets | `tabbar()` screens.js; `bandPage`, `bandHead` v2.js; `bk()` menuv.js; `buildApp`, sheet drag and swipe handling app.js |
| + sheet | `ovAction` v2.js |
| Menu, book switcher, search, feedback | `ovMenu` menuv.js; `ovMs`, `ovSearch`, `ovFeedback` overlays.js |
| Snackbar | `toastHtml` toastv.js |
| Home | `screenHome2`, `heroBand`, `foundingCard` v2.js; first run `homeEmpty` restv.js |
| Queries | `screenQueries2`, `qRow` v2.js; first run v2.js (FRQ A); Birds-eye view `ovBirds` overlays.js |
| Query sheet | `ovQuery`, `stageTrack`, `tlList`, `nextBlock` qsheet.js |
| Flows (log, respond, mark sent, nudge, close, task, note, agent) | `FLOWS` flows.js; `ovFlow`, `flowSteps`, `liveCard` flowv.js |
| Celebration | `ovCele` restv.js |
| To-do and Corkboard | `screenTodo2`, `taskRowV` todov.js (the Corkboard is the CBV A branch, i.e. the original) |
| Agents, Discover, agent profile | `screenAgents2`, `agRow`, `discList`, `ovAgentD` agentsv.js |
| Responses and the Wall of no | `PAGES.responses` respv.js |
| Manuscript | `PAGES.manuscript`, `coverHtml` msv.js |
| Analytics | `PAGES.analytics` anv.js |
| Streaks & goals | `PAGES.goals` restv.js |
| Discover page, Import, Help, Settings, Notifications, Plan | `PAGES.*` overlays.js inside the `bk()` page band |

## Illustrations

Every picture in the prototype is one of the app's own files, inlined and downscaled. The dashed circle is a **placeholder**: the slot stays and shows a placeholder until the illustrator's piece arrives. It is never filled with another drawing.

| Prototype key | App file |
|---|---|
| talon, hourglass, courierMap | placeholders on the phone (the app files exist: `query-centre/your-move-talon.png`, `query-centre/waiting-hourglass.png`, `qc/hero-courier-map.png`) |
| beHead | `/images/qc/be-hawk-head.png` |
| scout | `/images/discover/scout-face.webp` |
| archivistDrawer | `/images/contact-list-archivist.webp` |
| wallHawk, wallTile | `/images/responses/responses-wall-hawk.webp`, `responses-wall-tile.webp` |
| analyticsArchivist | `/images/analytics/analytics-archivist.webp` |
| boxes, pile | `/images/packages/packages-hero-boxes.png`, `materials-tray-pile.png` |
| compsArchivist | `/images/comps/comps-tray-archivist.png` |
| binoculars | `/images/binocular-hawk.webp` |
| courier, mentor, mentorLook, archivistLook, quill | `/images/dash/courier.png`, `mentor-leaning.png`, `mentor-leaning-looking.png`, `archivist-looking.png`, `quill.png` |
| courierCut, courierDisc, tipHawk | `/images/qc/courier-cutout.png`, `qc-courier-disc.png` |
| inkwell | `/images/qa/quill.webp` |
| writers, armchair, story | `/images/let-writers-write.png`, `make-querying-simple.png`, `get-good-stories-told.png` |
| discHawk | `/images/contact/contact-disc-hawk.webp` |
| fly | `/images/hawk-fly.webp` |
| todoSun, cork | `/todo-seize-the-day.png`, `/corkboard splash.png` |
| founding, tierFounding, tierFree, tierPro, offGround, activeHawk | probably `/images/founding-writers.png`, `tier-founding.png`, `tier-free.png`, a versions/pro drawing, `off-the-ground.png`, `active-query-hawk.png`. These are trimmed crops, so confirm each by eye. |
| mark, logo, hawkhead, feedback | the hawk mark (`/images/queryhawk-logo.png` / `icon-512.png`) |
| wordmark | `/images/queryhawk_title.png` |

**Never the same drawing twice on one screen.** This is the existing L11 rule, now app-wide on the phone.

## Normative versus sample

- **Sample:** names, books, counts and dates in `data.js` (Alex Morgan, "The Salt Road", Eleanor Whitfield and so on). The app shows the writer's own data through its existing derivations.
- **Normative:** layout, sizes, colours, type, copy patterns, ordering, behaviour and what each control does.
- Where the prototype's numbers and the app's derivations would disagree, the app's derivation wins, and the report says so.
