# Stage colours v1 — audit of every place `src/` picks a colour from a query's status, stage or state

Base: `dev/smv31-vv6-cp32-lqmf1-cb15-td57-qc157-an26-ms29` @ c0e82e3d0 (the line dev served on 18 Nov,
`index-DcWnGsi0.js`). Reachability was traced through an import graph from `src/main.tsx`, then checked render by
render (an import is not a render: `Queries.tsx` imports nearly every Query Centre file).

Two facts that decide many rows:
- **The phone branches of `Queries.tsx` never render.** `useIsMobile` (< 768) and `useDeskWidth` (≥ 768) are exact
  complements and the phone returns `<QueriesV4/>` first, so every `!qcDesk` branch (QcList, QcTimeline,
  QcBirdsDrawer, QcExhibit, the second QcBirds150) is unreachable.
- **The To-do desk draws the slide-out through the same component**: `todo/ws/WsPreview.tsx` renders
  `QcQueryCard149` → `QcCard152`. `todoWs.css` only hides controls and reframes the panel; it holds no card colours.

"Phase" is the phase that covers the row. "Changed" is filled in as each phase lands.

## In scope — the colour means the stage

| # | File | Constant / rule | What it draws | Page | Reachable | Phase | Changed |
|---|---|---|---|---|---|---|---|
| 1 | lib/stageColours.ts | `STAGE_COLOURS` (+ `edge`, `OFFER_SHEEN`) | the one table | — | yes | 1 | yes: offer rose, edge added, sheen exported |
| 2 | queries/centre/qcv154.css:32-36 | `.qc154-card[data-tone] { --tone }` | grid card band | Query Centre, Responses carousel | yes | 1 | yes: offer `#efcdc9` |
| 3 | queries/centre/qcv157.css:18-26 | offer foil | grid card offer band + sheen | Query Centre, Responses | yes | 1 | yes: rose under the `OFFER_SHEEN` stops |
| 4 | lib/qc1533.ts:86-93 | `TAB_ACCENT_157` | paperclip tab and pop-up accent | Query Centre | yes | 1 | yes: offer `#dfb1ac` / `#7a3f3c` (rest `#92625f`) |
| 5 | lib/qc153.ts:27-31, 211-219 | `SLIP_TONE_FILL`, `ACTION_SWATCH`, `sectionSwatch` | group count chips (`--sw`) | Query Centre | yes | 1 / 3 | yes: reads the table (Offers rose through it) |
| 6 | lib/qcFoot1522.ts:166-177, queries/centre/QcCard152.tsx:174-177 | `band1522` bg / `STATE_HEAD` / `QUIET_BAND` | slide-out strip (navy on live states) | Query Centre, To-do desk | yes | 2 | yes: strip = stage Band in ink, sheen on offer, quiet fade |
| 7 | lib/qc1512.ts:28-41 → QcCard152.tsx:412 | `STATUS_FILL[statusKind]` | slide-out pill cap | Query Centre, To-do | yes | 2 | yes: no cap fill; pill = Tint, mark ink |
| 8 | lib/qcThread152.ts:141-153 | `AGENT_TINT`, `tintOf` | agent bubbles (`--bt`/`--be`) | Query Centre, To-do | yes | 2 | yes: `agentTint` reads the table; `AGENT_TINT` deleted |
| 9 | lib/qcFoot1522.ts:81,93,100,153; lib/qcThread152.ts:349,355,361 | `AGENT_TINT[..].fill` on `FootIcon` | footer disc | Query Centre, To-do | yes | 2 | yes: disc = card's Band via `--fdisc`; `tint` field removed |
| 10 | QcCard152.tsx:245-247 | draft `--dr` ternary | dashed draft outline | Query Centre | yes | 2 | yes: agent draft = stage Mark |
| 11 | queries/centre/qcv152card.css:61, :94 | `.qc152-disc`, `.qc152-av` | agent seals (paper) | Query Centre, To-do | yes | 2 | yes: navy seals (not a stage colour; the prompt's seal rule) |
| 12 | queries/centre/qcv1522card.css:102, :115 | `.qc1522-sumo`, `.qc1522-ag .tk.on` (old offer sage `#e5eddf`/`#cddcc1`/`#b7cba5`) | offer summary + told ticks in the composer | Query Centre | yes | 2 | see Phase 2 commit |
| 13 | lib/qc1512.ts:39-41 → QcWhoReplied.tsx:102 | `STATUS_FILL`, `STATUS_PALE` | Who replied pill cap | Query Centre | yes | 3 | yes: values read `STAGE_COLOURS` |
| 14 | Queries.tsx:8236 `barKind=legacyTone153`; qcv153.css:273-280; qcv151.css:313-319 | Birds-eye current bar `[data-sk]` | Birds-eye | Query Centre | yes | 3 | yes: `data-sk` = stage; one colour per stage |
| 15 | lib/qc150.ts:150-156 `stageTint`; qcv150.css:259-260 | `.qc150-t-*` | Birds-eye bar (always overridden by row 14 on desktop) | Query Centre | class applied, colour overridden | 3 | yes: stage keys, table bands |
| 16 | QcSlip153.tsx:177 `legacyTone153`; qcv153.css:23-26; lib/qc1533.ts:76-83 `tabAccent` | slip header + paperclip | Log a query's stage picker / slip preview | Query Centre | yes (QcLogStages) | 3 | yes: slip tone = stage, accent = `tabAccent157` |
| 17 | lib/dash2.ts:99-101 | `BREAKDOWN_COLOR` (queried navy `#2d3a50`) | week breakdown segments + swatches | Dashboard | yes | 4 | yes: Bands |
| 18 | lib/dashHover.ts:41-47 | `WEEK_GROUPS` colours (queried navy) | OneScreenChart callout | Dashboard | **colours unreachable** (OneScreenChart only under F1Queries) | 4 | yes (one line each) |
| 19 | responses/RspWords.tsx:30 `noteTone`; responses15.css:130-131 | `p` / `x` tones (old rose) | In their words cards, pills, quote marks | Responses | yes | 4 | yes: tone = stage |
| 20 | responses/RspPanel.tsx:34 `stripTone`; responses5.css:27-28, 61-64 | `of/you/ag/cl` | Responses slide-out strip | Responses | yes | 4 | yes: strip = stage Band, sheen on offer |
| 21 | phone/v3/V3Parts.tsx:19-28 `statusFill` → phoneTokens.css `--pa-st-*` | asked pink / sent sand / offer slate / closed+Signed grey | glyph discs, phone query page band + agent bubbles, To-do band, Birds-eye bars | phone | yes | 5 | yes: Band of `stageOf` |
| 22 | phone/PhoneDisc.tsx:17-25 `phoneFill` | same split | phone discs, Responses phone band + pill | phone | yes | 5 | yes: Band of `stageOf` |
| 23 | QcCard152.tsx:488; QcLogStages.tsx:247 | confetti hexes | celebration confetti | Query Centre | yes | — | no: decorative, allow-listed |

## Out of scope — the colour means something other than the stage (unchanged)

| File | Constant / rule | What the colour means |
|---|---|---|
| contacts (`SEG_COLOUR`, AgentCard24 `SET_TONE`, agentCard.css, contactV262.css, agentPanel.css) | Contact list segments and sets | with you / with the agent / closed; agent health |
| lib/qc1511.ts:261-262 `TINT`, `PILL_FILL`; lib/qcCardStory.ts:309 `STRIP_TINT`; QcQueryCard149.tsx:39 `CARD_TONE`; queryPanelHost.css:44-46 `--qp-court`; qcvOpenPanel.css:16-17 | court tones | whose move |
| v60/Dash60Left.tsx:30 `CLOSED_STONES`, :32 `AGENT_SEG` | closed hoop stones | closed outcome by how far it got |
| df1.css:310-311, v2/dash2Feed.css:21-22 `[data-kind=request/offer] --t` | feed row tint | event kind (a request may be partial or full) — see the report's rulings |
| lib/todoHeader54.ts:20 `NEED_FILL`; todoHeader56 `RING56_FILL`; todoWs.css `--tw-*`; todoWs54.css:40 `.tws54-asks` | To-do buckets | task need (wait / nudge / quiet / house) |
| lib/yourNotes.ts:131-133 | note buckets | read / planned / in the app |
| queries/centre/qcv153thread.css:31 `.qc153-bkrow` | "Querying <book>" row | the book, not a stage |
| responses15.css:328, :339 `.rsp15-dot.is-q` | waiting-dot example | gone quiet (a state, on the empty page) |
| queryActions/phoneFlow.css:35-37 | phone flow live card | court / state |
| QcCard154 / qcv154.css:83 `.qc154-f.is-hot` | Next box outline | needs you (navy) |
| lib/responseDraft.ts:131 `OUTCOME_TONE` | in / offer / shut | outcome words |
| QueryTimeline.tsx:836-837, :1181 | wait tones, your-move box | reply window certainty; whose move |
| StatusDot.tsx | ink | — (never coloured) |

## Unreachable or dead — left as they are, named here (no dead code deleted in this prompt)

| File | Constant | Why left |
|---|---|---|
| lib/qc1512.ts:46-105 `HEAD_FILL`, `STATE_TONE`, `ACTION_1512`, `headTone`, `headFill`; qcv151.css:158-167 | group header tones | no non-test caller; mixes stage with navy/stone state tones |
| QcPage151.tsx:329-344 `row()`; lib/qc1522.ts:45-68 `head1522` | table row cap; header fill | never called |
| lib/qcThread152.ts:159 `discFill` | reads `STATUS_FILL` | no caller (follows row 13's values) |
| lib/qc1531.ts:39-45 `RING_BUCKETS` / `RING_FILL` (QcStageRing1531) | stage ring | QcStageRing1531 is not imported from main.tsx; more than one line |
| lib/qc153.ts:36-46 `LEGACY_TONE_FILL_153` | v153 tones | after Phase 3 only the unreachable ring reads it |
| qcv1531.css:250-253 `.qc153-court` | rail court tiles | no element emits the class |
| components/dashboard/DeskStats.tsx `TONE_FILL`; WhatsLivePanel.tsx | glyph tones (whose move) | not imported from main.tsx |
| lib/analyticsModel.ts:55 `STATE_FILL`; lib/analyticsV21.ts:39 `STANDING_FILL` | `--state-*` | no render reader: the Analytics page draws no stage fill |
| StatusPill.tsx (RecordResponseModal) | live / offer / closed pill | RecordResponseModal is dead code by the prompt's own ruling |
| TimelineDot.tsx | nudge / open / closed | never rendered |
| shell/f12.css:1022-1036 `--state-*`; lib/queryCardFacts.ts:271-306 `STATE_OF`; queries/queryCard.css; qcvList/qcvBirdsDrawer/queryPanel/queryCentreGrid/correctionDesk css | you / agent / offer / closed | QueryCard is only in the undrawn desk body and dead phone branches; QueryPanel, CorrectionDesk, QueryAgentTab sit behind `creating` / `deskVerb` gates not traced to a live trigger. Mixes whose-move with stage: named for a ruling |
| Queries.tsx:4737 `getListStatusPill`; :234 `STATE_TOKEN` | — | never called / unused |

## Old hexes not found anywhere in `src/` at the base

`efe8f3 c2d0e0 d6bcc7 f1e2bd e4d8ec`. `ccd7e5` and `46668f` appeared only in `stageColours.ts`; `7391b5` only in
`qc1533.ts:90`.

## Allow-list for SC1-1 (paths whose old stage hexes are out of scope, with their reason above)

```allow
src/components/queries/centre/QcCard152.tsx      confetti
src/components/queries/centre/QcLogStages.tsx    confetti
src/components/queries/centre/qcv153thread.css   book row
src/components/queries/centre/qcv1531.css        dead court tiles
src/components/queries/centre/qcv153.css         LEGACY slip tones kept for the unreachable ring's family only if still present
src/lib/qc153.ts                                 LEGACY_TONE_FILL_153 (unreachable ring)
src/components/todo/ws/todoWs.css                To-do buckets
src/components/todo/ws/todoWs54.css              To-do asks row
src/lib/todoHeader54.ts                          To-do buckets
src/lib/yourNotes.ts                             note buckets
src/components/responses/responses15.css         gone-quiet example dots
src/components/shell/__fixtures__/openHeaderShared.fixture.json  a captured fixture, not a style
```
