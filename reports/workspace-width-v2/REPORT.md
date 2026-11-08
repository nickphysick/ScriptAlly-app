# Workspace width v2 — the workspace column, the To-do title row, actions that follow the content

Branch `workspace-width-v2`, cut from the branch dev served on 8 Nov (`dev/…-tdp1-aisg1` @ `114e70967`, bundle
`index-GtyhzUwl.js`). **Not deployed. Not merged. Not pushed.**

This replaces page width v1 (`page-width-v1`, 1256 / 40), which **had** been run: its rule is inside the branch dev
serves. Its 1256 cap is removed here (the prompt calls it "1320 centred"; what shipped was 1256 with a 40px gutter).

All measurements: the emulators (`npm run e2e:emu`), harness account, sidebar open and collapsed, at 1440×900,
1653×862, 1920×1080 and 2560×1440. Probe: `tests/e2e/workspaceWidth.measure.ts`. Raw readings: `before/readings.json`,
`before-panels/readings/`, `after/readings/`. Tables: `tables.md`.

## False premises

1. **There is no `TrayHeader`.** The navy "Your to-do list" card is `.tws-hd` in `components/todo/ws/TodoWorkspace.tsx`.
2. **Page width v1 was 1256 / 40, not 1320.**
3. **"At 1653 content is ~1560 (was ~1264)" depends on the sidebar.** With the sidebar open the sheet at 1653 is 1397,
   so the column is 1333 (was 1240–1256). Collapsed, the sheet is 1565 and the column 1501.
4. **"First task row y ≤ ~110 (was ~176)" cannot be met on this build.** The first task row was at **498**, not 176: the
   tray carries its To do / Snoozed / Done tabs, a search row, the "Start here" card and a group band above the first
   row. With the card gone the row is at **433** at every size (title row 146 → 125). See "Flagged".
5. **The Contact list has no "Fill in the gaps" button now**; Housekeeping opens from the List health card's "Open".
6. **"Log a query" opens a side panel** (`QcFlows149` in `.spanel`), not the action drawer `.qad-root`.
7. **Materials and Wall of no are not routes** (Materials is a sidebar section; Wall of no is part of Responses).

## Classification

| Kind | Routes |
|---|---|
| **WORKSPACE** (1660 / 32) | `/dashboard` · `/queries` · `/queries/analytics` · `/queries/responses` · `/queries/packages` · `/agents` · `/agents/discover` · `/manuscripts` · `/manuscripts/comps` · `/manuscripts/versions` · `/materials/letters` · `/todo` · `/todo/corkboard` |
| **READING** (unchanged) | `/account` · `/plans` · `/help` (FocusShell, own caps) · `/import` (keeps its 1256 / 40 column explicitly) |
| Not workspace | public pages (`/`, `/about`, `/pricing`, `/privacy`, `/terms`, `/contact`, `/founders`, `/welcome`) · `/goals` (a phone page; a computer is sent to the dashboard) |
| UNSURE | none |

## What changed

### §1 The workspace column
- `--work-gutter: 32px` added beside `--work-max: 1660px` in `src/index.css` (one place each).
- `workspacePageGrid.css`: the content column (`.wpg-scroll > *`), the toolband and the masthead read
  `max-width: var(--work-max); padding-inline: var(--work-gutter)`; the folded bar (`.wpg-barin`) and `.qc-cards`
  take the same two declarations, so their left edge is the content's. `--page-cap` / `--page-gutter` are retired;
  1256 / 40 survive only as `--read-cap` / `--read-gutter`, the reading column.
- `--mast-gutter` (35px) retired; `illustratedMasthead.css`'s inset is derived from the two workspace tokens.

Overrides removed or re-pointed, and why:

| File | Was | Now | Why |
|---|---|---|---|
| `manuscripts/v27/msv27.css` | `.ms27` opted out: `max-width: none`, own 24 / 36 gutters | takes the shared rule | it ran nearly the full sheet (2183px of ink at 2560) |
| `dashboard/v2/dash2.css` | `max-width: calc(1360px + 64px)`, padding 32 | `--work-max`, `--work-gutter` | the Dashboard isn't in the grid; it reads the tokens |
| `shell/workspaceShell.css` | `--dash-page-max: 1440px; --dash-page-pad: 22px` | from the two tokens | same measure for the older dashboard sheet |
| `packages/v41/pk41.css` | `max-width: 1288px`, padding `30 150 96 40`; ≤1400 left 36; strip inner 1288 / 40 | `--work-max`, left `--work-gutter`, right `--work-gutter + 118` | the 1288 cap. **The 150 right clearance stays** (now 32 + 118): it keeps content clear of the fixed corner hawk |
| `letters/queryLetters.css` | `--page-gutter`, `--page-cap`, band `clamp(20px, 2vw, 32px)`, `.qlb-in` 1328 | the two tokens | the 1328 band cap; the band's inset now matches the page's |
| `import/importPage.css` | (shared rule) | sets `--work-max` / `--work-gutter` from `--read-cap` / `--read-gutter` | Import is a reading page; it measures exactly as before |

Not removed, deliberately: To-do's `--tdb-col-max` / `--tdb-col-gutter` (read only by the phone To-do page's
`.tdb-col`, not the desktop), `contentColumn.css` (`--content-max-work` 1600 has no reader on a workspace route),
`pageHeroFrame.css`'s `--hero-w` (a header frame; see Flagged).

Reading caps inside pages: the To-do desk body and the add-task form stop at **680px**
(`.tws-wq > *, .tws-addcard > *`). The long prose on these pages already carries its own `ch` caps (44–80ch); the
letter text lives in its half drawer. Tables, lists, boards and the address book's list column are untouched.

### §2 To-do title row (To-do only)
The navy card is gone. One light row on the page: the book's title in Special Elite 23px (`data-page-title`), a rust
"● n late" pill (absent at 0), a plain "n to do" pill, and a solid navy "+ Add a task" (same `setAdding(true)` as
before; `n` still opens the same composer). "Cleared this week" left the header; the Done tab and its intro still say
it. Padding 14 / 12; the workspace card starts directly beneath. "Nothing yet" and "All caught up" are inside the desk
and unchanged.

**Title, a judgement call:** the prompt says "manuscript name". To-do tasks span every book, so the row shows the book's
name when the account has **one** book and "To-do list" otherwise — the rule the Query Centre's subheader already uses.
The harness account has several books, so the screenshots read "To-do list".

### §3 Actions follow the content
Every body below loses `flex: 1` (grow to fill) for `flex: 0 1 auto` (hug, shrink and scroll when taller), so the
footer sits directly under short content and pins to the foot of tall content. Same visible behaviour as
"footer sticky inside the scroll area", with no DOM moved:

| Surface | Body | Footer |
|---|---|---|
| To-do desk (every journey: send, nudge, closing, response) | `.tws-wq` | `.tws-wf` |
| To-do add a task | `.tws-addcard` | `.tws-wf` |
| Query Centre card (reading) | `.qc152-body`, and the card is `height: auto; max-height` its old 700 (journeys in the slot keep the full height) | `.qc152-rb` |
| QC card v149 (the To-do preview; its record/edit modes) | `.qc149c-pane`, `.qc149c-md`; the strip's `margin-top: auto` → 14px | `.qc149c-strip`, `.qc149c-mft` |
| Log a query (step 2) | `.qc149f-pg2` | `.qc149c-mft` |
| Shared action drawer (Record a response etc.) | `.qad-body` | `.qad-foot` |
| Contact list agent card (view / edit) | `.cl262-scroll`, frame and card hug (`max-height: 100%`) | `.cl262-foot` |
| Half drawers (Housekeeping, the letter drawer, …) | `.hdr-body` | `.hdr-foot` |
| Responses drawer | `.rsp5-dbody` | `.rsp5-dfoot` |

The To-do side card: the cream rail stays the desk's height; the card in it now ends at its last item.
`WsPreview`'s `ScaledCard` gives the card the rail's space as a **maximum** (measured from the rail, never from the
slot, which would report the card's own height back) and the card scrolls inside only when taller.

Gaps between the last content and the footer (BEFORE → AFTER):

| Surface | 1653×862 | 1920×1080 | 2560×1440 |
|---|---|---|---|
| To-do desk ("Send Marcus your full") | 57.5 → **22** | 275.5 → **22** | 635.5 → **22** |
| Query Centre card | 108.7 → **21.6** | 108.7 → **21.6** | 108.7 → **21.6** |
| Contact list agent card | 0.1 → 0.1 (tall: pinned) | 127.9 → **24.2** | 487.9 → **24.2** |
| Log a query (after picking an agent) | 25.0 → **10.3** | 243.0 → **10.3** | 603.0 → **10.3** |
| Housekeeping (tall: pinned) | 5.7 → 5.7 | 7.4 → 7.4 | 4.1 → 4.1 |
| Add an agent (tall: pinned) | 60.9 → 60.9 | 59.9 → 59.9 | 28.2 → 28.2 |

"Add an agent" is long at every size, so its footer pins and the content scrolls beneath; the 60 is the form's own
trailing padding above the pinned footer, not empty space under short content.

## AFTER, in short (sidebar open, ink width)

| Page | 1653 B → A | 2560 B → A |
|---|---|---|
| Query Centre | 1242 → 1319 | 1242 → 1582 |
| Contact list | 1204 → 1281 | 1204 → 1544 |
| Manuscripts | 1300 → 1284 | 2183 → 1547 |
| To-do | 1196 → 1315 | 1196 → 1578 |

(Ink is what is drawn, so it sits a little inside the 1596 column where a page's cards have their own inset.)

Full tables for every page, both sidebar states and all four sizes: `tables.md`. The column measures
`min(sheet, 1660) − 64` and is centred on every workspace page at every size (the gate in the probe), with the three
known exceptions below.

## Screenshots
- `before/` and `after/`: every page at 1653 and 2560, and the To-do list at all four sizes (sidebar open).
- `before-panels/` and `after/panel-*-1920.png`: the To-do desk, add a task, the QC card, the Contact list card, Log a
  query, Add an agent, Housekeeping at 1920.
- Reading pages at 1653: `before/account-1653.png` … `after/import-1653.png` (identical; all 32 readings +0.0 / +0.0).

## Flagged, not fixed
1. **Analytics' light header doesn't sit on its content's left edge.** It was already off before (title pinned at 516
   from 1920 up while the content started at 772 at 2560); now 86px off instead of 256. It is the page's header frame
   (`pageHeroFrame` / a24), a header design this pass may not change.
2. **Comparable titles scrolls sideways at 1280 with the sidebar open** — 112px on the base, 104px now. Pre-existing.
3. **Responses' "Agents who want to read on" carousel runs past the column** to the sheet's edge, as it did before.
4. **Submission packages' content stops 118px short on the right** to keep clear of the fixed corner hawk (it did
   before, at 150 from a 1288 cap). Moving the hawk would let the page take the full column.
5. **Versions' header card sits ~25px inside its content edges** at 2560 (the page's own header design).
6. **The To-do first task row is at 433, not ≤110** (false premise 4). Reaching 110 would mean moving the tray's tabs,
   search and "Start here" card, which the prompt keeps.
7. **Panels that fill the window height** (the side panel for Log a query, the To-do desk, drawers) now show paper
   below a short form's buttons rather than space above them. That is the requested behaviour; flagging it because it
   is visible at 2560.

## Locks
- New: `tests/e2e/workspaceWidth.measure.ts` (the BEFORE / AFTER probe; `WW2_GATES=1` asserts the column, centring and
  no ink outside it).
- Re-pointed: `src/test/pageWidth.test.ts` and `src/components/shell/workspacePageGrid.test.tsx` (1256 / 40 → the
  workspace tokens; Manuscripts now locked onto the rule); `tests/e2e/pageWidth.measure.ts` (1596 / 32; Comparable
  titles' root is `.cp30` since comps v30 — the lock was already stale on the base and died there);
  `tests/e2e/todoV52.measure.ts` L2 (the title row) and L14 (the cleared count is the Done tab's, no longer the header's).
- Gates: tsc clean; `npm run build:dev` clean (no errors or warnings); Vitest 11,491 passed, 3 failed — `emuGuard`
  (`tests/e2e/cb21Emu.sh`) and two `firestoreTarget` cases (28 fixture scripts), the same 3 red on the base build.
- e2e: `workspaceWidth` panels 3/3; pages red only on the flagged exceptions above (now marked known in the probe);
  `pageWidth` red only on flag 2 (W6 at 1280); `todoV52` L2 + L14 green.
- Not run: a mutation proof for each new gate (the gates went red on real, natural cases — Manuscripts' full width,
  Packages, Analytics, Responses — before they were understood).
