# Material icons v1 — census

Base: `origin/main` @ 347dfa639 (what dev serves: `index-d3wy2buF.js`, rebuilt byte-identical). "Live" = reachable from
`src/main.tsx` by a static import walk; **dead** = imported nowhere live, or imported and never mounted. Sizes are the
label's own text size; "chip h" is a fixed height where one is set. "Before" is what HEAD showed.

## Premises in the brief that the code contradicts

1. Dev serves `main` itself (consolidate-main-v2 merged the dev line at 11:27Z 22 Nov), not a `dev/…` branch.
2. `MatTab1533` is an export of `queries/centre/QcSlip153.tsx`, not a file.
3. `QcQueryCard149`'s `CHIP_ICON` draws only on the phone / sheet path — on desktop the card returns `<QcCard152>` whenever `v152` data exists.
4. `SentMaterials.tsx`, `reading-pane/PackageGroup.tsx` are **dead** (only inside `GRID_IS_THE_PAGE ? … : (old pane)` with the flag the constant `true`).
5. `MaterialsField.tsx`, `MaterialsEditor.tsx`, `PkgComposer.tsx` (and PkgMaterials, PkgMaterialDrawer, PkgCard) are **dead**.
6. `src/marketing/HeroCard.tsx` has no `.mk-lc-chip`; the material chips are `.mk-lc-att span` (`.mk-lc-chips` holds book facts).
7. The Dashboard feed and Next up name materials only inside sentences ("asked for the full manuscript"), never as labels.
8. Responses has no material labels of its own; it reuses the grid card and slip (`MatTab1533`).

## Queries

| Surface | file | Before | Text | Chip h |
|---|---|---|---|---|
| Slide-out card Materials tab rows | QcMaterials158.tsx | `chipIcon(label)` regex → 11px envelope / page / stack | 15.5px serif | min 40 |
| Slide-out card Agent tab "What X asks for" | QcAgent158.tsx | tick only | 15.5px serif | min 42 |
| Read-only thread chips (agent card History) | QcThreadRead.tsx via QcBubble152 `chipIcon` | 11px regex marks | 8.5px mono caps | ~18 (padding) |
| Slide-out "what went" draft line | QcCard152.tsx:446 | paperclip + words joined by " · " | 13.5px serif | — |
| Step-edit material chips | QcEdit152.tsx `.qc152-mp` | words | 9.5px mono | 26 |
| Paperclip pop-up chips | QcSlip153.tsx `MatTab1533` `.qc1533-mc` | CSS sheet `.qc1533-sh` on every chip | 12px serif | 20 |
| Sheet/phone story chips | QcQueryCard149 `CHIP_ICON` + qcCardStory `iconOf` | 12px hand-drawn, chosen by label regex | 9.5px mono | 24 |
| Sheet "sent with" + edit pieces | QcQueryCard149 `.qc149c-att span`, `.qc149c-piece` | `DOC` 11×12 | 9.5px mono | 24 |
| Sheet Materials pane rows | QcQueryCard149 `.qc149c-mrow` | `DOC` | 16px serif | padding 11 |
| Tracking "Queried" sent box rows | queryActions/SentHow.tsx `Rows` | tick only | 13px | — |
| Log a query, pieces headings | QcLogStages.tsx `.laq-gh b` | words | 16px typewriter | — |
| Log a query, package row sub | QcLogStages.tsx:564 `pieces.join(" · ")` | one text node | 13.5px | — |
| Log / Edit / Sent / Response journey toggles | queryActions/controls.tsx `Toggle` | checkbox | 15px machine | — |
| Journey "Sending …" sentence | controls.tsx `SampleLine` | joined sentence | 15px | — |
| Edit query drawer pills | EditQueryDrawer.tsx `.eq-matpill` | words | 11px | padding 4 |
| Record a response unit tiles | RecordResponseModal.tsx | lucide FileText / Type / List (burgundy when on) | 11px | tile |
| Record a response "Queried via … · materials" | RecordResponseModal.tsx:178 | one joined text node | 11px | — |
| QcOpenCard ledger slip | QueryLedger.tsx `LedgerSlip` | 6px navy bullet | 14.5px | min 28 |
| QcOpenCard Agent tab chips | QueryAgentTab.tsx `.qat-achip` | words | 14.5px | min 30 |
| Carousel card / narrow list slots | QueryCard.tsx `Mark`, QcList.tsx | icon-only slots, no visible label | — | — |
| Correction desk | CorrectionDesk.tsx `MaterialsFields` | checkbox | — | — |
| Sent-by-email envelope beside a bubble date | QcBubble152.tsx `VIA_ICON.email` | NOT a material — left alone | — | — |

## Agents

| Surface | file | Before | Text | Chip h |
|---|---|---|---|---|
| Agent card profile "What X asks for" | AgentCard262.tsx:903, `askList()` | own LETTER / PAGE / PAGES 13px | 15.5px | min 42 |
| Agent card edit, material rows | AgentCard262Edit.tsx `MaterialRows` | tick | 15.5px | min 48 |
| Add an agent pills | agentPills.tsx `MaterialPills` | ✓ / + | 15px | 36, nowrap |
| Add an agent summary | AddAgentJourney.tsx:202 | joined text | — | — |
| Housekeeping / agent card materials field | cardInputs.tsx `MaterialsField` `.ae-mtr` | box; **grid column 22px / 128px** | 15px | min 44 |
| Agent quick view chips | AgentCardParts.tsx `.acq-mat` | own ICO ql / syn / smp / oth 12px | 9.5px mono | — |
| Housekeeping intro card | AgentPaperCard.tsx `.apc-mat` | PaperIcon doc / pages | 11.5px mono | — |
| Discover picks | DvPicks.tsx `.dv1-mats span` | `Ico.doc` 12×14 | 12.5px | — |
| Discover share | DvShare.tsx | joined text | — | — |
| Contact list empty page example | ContactEmptyPage.tsx | one text node | — | — |
| Discover phone tags | AgentsPhone.tsx `.pa-tag` | words | 13px | min 28 |

Contact list rows and cards show no material labels (verified by the census; `AgentCardWide24` and `ContactSheet24` are dead).

## Materials and packages

| Surface | file | Before | Text | Note |
|---|---|---|---|---|
| Package "What's in it" rows | Pk62Open.tsx `Row` `.k62-ck` | M62 check | 16px | **fixed width 104 / 84px** |
| Package "Sent with it" | Pk62Open.tsx `.k62-encl li` | M62 `book` (Sample), `page` (Synopsis), `clip` (extras) | 15px | — |
| Package story | Pk62Story.tsx `.k62-sb-s` | M62 `mail` (Query letter), `book` (Manuscript sample) | 15.5px | min 46 |
| Package lines | Pk62Table / Pk62List / Pk62Header `contentsLine` | one text node | 14.5px | — |
| Package drawer head | Pk26Drawer.tsx `Head` | v26 `Mark` (packagesV26 family) | 14.5px | — |
| Packages phone shelf | PackagesPhone.tsx `.pa-sheetc .k` | PI.doc / PI.note 14px | 12.5px | — |
| Packages phone slot rows | PackagesPhone.tsx `SlotRow` | PI marks in a disc; title is the version name | 15px / 13px | — |

Query letters page and Versions: headings ("Query letters", "Synopses") and version names only — no material label.

## Everyday

| Surface | file | Before | Text | Note |
|---|---|---|---|---|
| To-do send / materials tiles | ws/WsControls.tsx `Tiles` (wsFlows) | one generic `DOC` for every material, in a 26/30px box | 16px | — |
| To-do batch tiles and table head | WsBatch54.tsx | DOC / TICK; th words | 14px | **th.c fixed 72px** |
| Bulk fill table head | BulkFillTable.tsx `.bulk th` | words | 8px mono | — |
| Housekeeping sweep buttons | HousekeepingSweep.tsx | words | 12px | — |
| Task pane "Sent previously", "They ask for" | taskPaneJourney / ToDoPage | joined text | — | — |
| Sample unit picker | SampleSpecPicker.tsx | words (Chapters / Pages / Words) | — | — |
| Dashboard, Next up, Responses | — | sentences / reused card | — | none of their own |

## Phone

| Surface | file | Before | Text | Note |
|---|---|---|---|---|
| Quick log options | phone/v4/QuickLogV4.tsx `Opt` | check | 16px | min 58 |
| Quick log "With it" | QuickLogV4.tsx:85 | one text node | 1rem | — |
| Agents phone options / tags | AgentsV3.tsx, AgentsV4.tsx | check / words | 16px / 14px | — |
| Edit query phone "What you sent" | EditQueryPhone.tsx:108 | one text node | — | — |
| Edit query phone pills | EditQueryPhone.tsx `.eqp-pill` | words | 14px | — |

## Public

| Surface | file | Before | Text | Chip h |
|---|---|---|---|---|
| Landing hero card attachments | marketing/HeroCard.tsx `.mk-lc-att span` | DocIcon / SynIcon / PagesIcon 11–12px | 9.5px mono | 24 |
| "First 3 chapters" (sent, ok tone) | HeroCard.tsx `.mk-ok` | tick replaces icon | 9.5px | 24 |
| "Full manuscript" | HeroCard.tsx:683 | own svg — keeps it | 9.5px | 24 |

## Not materials (no icon)

Book word counts (`bookChips`, `book-chip`, `qc164-bkl`, manuscript tags), synopsis-length steppers and values, the
manuscript's own synopsis field, `sampleApprox` spans, and the sent-by-email envelope beside a bubble date.
