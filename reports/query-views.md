# Query Centre — colours v2, stat tiles, and the view switch

Run of 6 Sep 2026 · refs `query-state-colours-v2.md` (afb95652), `query-centre-v9-views-locked.html` (a6457fae), `query-centre-v10-board-headline-locked.html` (8a193a9e) — all three verified, committed and enrolled (`605b2d40`), with `query-tint-ladder.md` marked superseded in place. Commits `605b2d40 → 0b7229ff → dcc35a28 → 341e264a` + this report's. Gate at each: tsc 0 · production build clean (whole log) · full Vitest 0 failed (7395 → 7401 → 7409 passed).

---

## False premises, first

1. **"The `--stage-*` ladder tokens are removed … grep: zero `--stage-`" cannot be done without breaking another stream, mid-flight.** Measured before touching anything: `stageFor` is a SHARED export. `TodoCalendarPage` reads it at **three** sites (`tl-st-{stage}` band classes), `TaskPane` paints `var(--stage-{stage})` **inline**, and `calendarStageTints.test.ts` **locks** the calendar's own `--tl-stage-*` mirror against `.t-f12`'s copy. Deleting the tokens would have blanked live surfaces silently and reddened that lock — for a stream landing commits in this tree the same day. **Conservative choice taken:** the grep is scoped to the eight Query Centre files and asserted there; the tokens stay declared for their remaining owners; `queryStateColours.test.ts` NAMES those owners, so the leftovers read as load-bearing rather than missed — and that case fails the day the To-do stream stops needing them, which is when they can go. `themes.md` carries the same reasoning at the ladder's own entry.
2. **`cardFacts().stage` could not simply *become* `.state`** for the same reason: the two keys now sit side by side, and `QueryCard.test.tsx` asserts them **together**, so a future edit cannot change one and leave the other.
3. **The tiles' fifth key is not `Closed`.** The chips were four courts **plus** a separate overdue toggle; the ref's five tiles are the four courts plus **Past expected**, which is that toggle promoted into the row it always belonged in. So `Past expected` is a **second axis**, not a fifth court — "with you AND past expected" is the commonest question this page is asked, and five exclusive tiles would have made it unaskable. Closed leaves the row and stays reachable through Filter's Status and Whose-turn facets (checked, not assumed).
4. **The List cannot use `GRID_SORTS`.** The page sorts on its own richer vocabulary (`last_activity`, `date_newest`, `date_oldest`, `waiting_longest`, `due_soonest`, `journey_depth`, `agent_az`) and the Sort popover writes those. The headers therefore hand back the page's keys. **Direction is one flag** reversing whichever key is active, because the page's vocabulary bakes direction into *some* pairs and not others — a header toggling between paired keys would work on Sent and silently do nothing on Agent.
5. **Decision 4's compact card was not taken, and it was more than a token change.** The v9 compact cut (42px chip, 18px name, 42px leaf, 16/18 padding) touches four rules in `queryCard.css` plus the card's own type scale, and the ref itself says "if you'd rather keep the cards as they are, the switch works just as well". The card stays as it is; the density win the brief wanted is what **Board** delivers (a column of eight in the height a grid gives three).
6. **`timeline-v57.html` is not in `design-refs/`** — the v9 ref names it as the calendar's source and the repo does not have it. Recorded under the recon rather than guessed at.

## Phase 1 · the palette *(commit `0b7229ff`)*

Five flat fills on `.t-f12`, each with one deeper step of its own family exposed as `--state-accent` by the same `qcc--st-*` class that sets the fill. `stateFor(status)`, `STATE_TOKEN` and `STATE_ACCENT_TOKEN` are the one mapping, exported once. Every Query Centre surface reads it: card band, leaf strip, drawer header block, desk strip, target-rung ring, live-verb ring, the Agent tab's history swatch, and now the list's status pill and the board's header rule.

Six locks retargeted with their laws stated; `queryStateColours.test.ts` is new and holds the values, the **ΔE > 5** separation the sheet states in words ("sand must never be mistaken for closed grey"), the every-status-mapped claim over the enum, and the scoped removal. Proved red: sand drifted toward grey, R&R left the ask family, an accent borrowed another family's deep step.

## Phase 2 · tiles and the switch *(commit `dcc35a28`)*

Tiles per the ref — white tile, state-coloured icon disc, mono label, Playfair count, **active as an ink border, never a fill** (colour on this page states the court). Counts are `quickCounts` over the manuscript-scoped set and, for Past expected, **the** overdue predicate the filter itself calls — never a second rule.

The switch sits right of Sort and changes the **renderer** only. The view is session state with a **URL reflection** rather than a router param: `?q=` is App.tsx's and a selection navigates, so a second owned param would put two writers on one URL. `replaceState` cannot navigate and so cannot fight the router; an effect re-asserts `?view=` whenever a `?q=` navigation drops it. The chip rules went **with** their markup — 22 lines, the reduced-motion line included.

## Phases 3–5 · List, Board, Calendar *(commit `341e264a`)*

All three take `gridRows` already narrowed and ordered; neither List nor Board sorts or filters a copy, and all three open the same drawer. The List renders the fact sentence and the four slots through the **card's own** renderers (`Mark` exported, not copied), keeping both of the card's absences: no `!` unless attention is true, and no slot cluster at all when nothing was recorded.

Board: seven columns in the **enum's own** order, Headline headers whose 1.5px rule is the column's own deep step and which take no fill, cards shingled by the fact line's height with the last card showing its fact, hover lifting 6px above its neighbours. Cards drop their band because the column names the status — **except** where the card's status is not the column's own (R&R in Full Requested, No response in Closed), which keeps its band so the board never states something the record does not. **No drag**: status is derived, and a card dragged between columns would ask the board to write one. Locked as the absence of every handler.

Calendar: the placeholder sentence and nothing else.

## The harness — 5/5 at 1280/1440/1920 (`reports/query-views.json`, shots in `reports/query-views-shots/`)

| claim | reading |
|---|---|
| the five band fills, read off the page | sand `247,239,227` · sage `224,229,221` · pink `245,230,223` · slate `215,224,232` · grey `228,225,219` — each exactly its token, at all three widths |
| tiles | 5 · `All queries · With you · With the agent · Offers · Past expected` · counts 54 / 8 / 30 / 1 / 0 |
| active tile | fill `rgb(255,255,255)`, border `rgb(20,20,18)` — a border, not a fill |
| list status pill | tinted with the row's own state (`247,239,227` on a Queried row) |
| list row height | **68.1px** at every width |
| board columns | **7**, in order `queried · preq · psent · freq · fsent · offer · closed` |
| board header rules | each equals its column's own `--state-accent` (`#e7d9bd` → `rgb(231,217,189)`, `#e8c9bb`, `#c7d0c2`, …); **fill `rgba(0,0,0,0)`** on all seven |
| shingle | fact line **40.0** · overlap **40.0** — equal by construction (one token) |
| banded cards | 6 (the R&R and No-response cards whose status is not their column's) |
| last card in a column | `margin-bottom: 0px` — it keeps its fact |
| drawer from Grid / List / Board | opens in all three; the active tile (`With the agent`) and the view survive each; `?view=` reads `list` / `board` and is absent on Grid |

⚠️ **One number needed reading rather than asserting.** `fitIn1000` measured **8**, not twelve. Twelve rows occupy 817px, which sits comfortably inside 1000px **of list** — but the page's masthead, tiles and toolbar take ~400px before the list starts, so a 1000px **viewport** shows eight. The brief's density target is the list's, and that is the form now locked (`12 × rowH + head ≤ 1000`); the viewport figure is reported rather than quietly satisfied.

⚠️ **And the shingle's first attempt was the ref's literal.** `margin-bottom: -36px` beside a fact line the ref measured at 36px — ours renders 40, so the harness caught a 3.5px disagreement between two numbers that were never the same number. Both now read one token, which is this repo's own law about a value one element owns describing another's size.

## Calendar recon

**Verdict: neither adapter nor fork today — EXTRACT first, and not by this stream.**

- **There is no board component to adapt.** `TodoCalendarPage.tsx` exports exactly one thing, `TodoCalendarPageProps { onNavigate, onNavigatePath }`. The board — lanes, bars, markers, the today spine, the drawer — is built *inside* the page from To-do data. Rows are **not** an abstraction the caller supplies: they are assembled internally from tasks and agent relationships, and the page's own comments describe the lane geometry as the stylesheet's (`--tl-days` on `.tl`), not the caller's.
- **So a "re-host with queries as rows" needs an extraction first**: lift the board into a component whose props are `{ rows: TimelineRow[]; days: number; onPick }`, where a `TimelineRow` is `{ id, laneLabel, bars: {fromMs, toMs, tone, estimated}[], marks: {atMs, kind}[] }`. The Query Centre's adapter is then small and pure — one row per query, one bar from `dateSent` to `facts.expectedReply` (solid where `expectedSource` is the agency's, dashed where it is the writer's estimate), marks at sent / requested / nudged. That adapter is perhaps forty lines; the extraction is not.
- **Forking is refused** on the ref's own instruction ("It should be the same component, not a cousin; if it can't be re-hosted cleanly, defer it rather than fork it") and on this repo's standing rule against a second implementation of a live surface.
- **The calendar stream's state:** v65 §A–§D and §F have landed (`d4cbd3f8`, `c70e0497`, `3b4a0ef9`, `d43d532c`); **§E is stopped with its evidence** (`9dcefadc`) — its own report says building it as written would have broken two laws. The board is being actively reshaped: §C added the click card, §D the drawer and a z-ladder fix.
- **Recommended moment:** after §E is resolved and the v65 pack closes. Extracting a board that is mid-reshape would fork it in effect if not in name. `timeline-v57.html`, which the v9 ref names as the calendar's source, is **not in `design-refs/`** — it wants committing and enrolling before that run starts, so the extraction has a contract to build against.

## Open questions (conservative choice taken)

1. **When do the `--stage-*` tokens actually go?** They are the To-do stream's now. The lock names their consumers and fails when the last one leaves; whoever removes them owns `TodoCalendarPage`, `TaskPane` and `calendarStageTints.test.ts` together.
2. **The compact grid card** (decision 4) is not taken — see false premise 5. One commit whenever you want it.
3. **The List's ⋯** opens the drawer rather than a menu of its own. A second overflow menu would be a fourth home for acts that already live in the drawer's top bar; the drawer is one click away and carries all of them.

## NOT RUN, with cause

- **A Board FLIP scope per column.** The brief asks for it; the board has **no FLIP at all**, so there is nothing to scope. `QueryCentreGrid`'s FLIP is the grid's own (one stage element, `data-qcc-id`), and cards entering or leaving a board column on a filter change simply appear and disappear — which is the behaviour the brief specifies for that case anyway. Adding a FLIP per column to satisfy the phrasing would be building motion nobody asked to see.
