# Retired and rewritten with Corkboard v1 (12 Oct)

The Noteboard was renamed the Corkboard (`/todo/corkboard`; `/todo/noteboard` redirects) and redrawn as a cork pinboard: a number panel header, an "Add to your board" row, a framed cork board with freely pinned notes, and a "Your tasks" card. The masonry board, the tool row and the fixed-header chassis it stood on are gone.

The new suite is `tests/e2e/corkboardV1.measure.ts` (CB1: A1–A2, B1–B3, C1–C7, D1–D2, L1) with `cbLib.ts`, `cbStore.ts`, `seedCorkboard.mjs` (the `cbseed-*` fixture) and `corkboardShots.measure.ts`. Unit locks: `src/lib/corkboard.test.ts`.

The sweep was by **selector**, not by filename: every e2e file that names a class or control the pack retired (`nb-ghost`, `nb-viewtog`, `nb-search`, `nb-chipset`, `nb-col1`, `nb-empty-search`, "Pin a note", the masonry's `column-width`) or the Noteboard's `.tpl-zone`.

## Deleted files

Five lock files, two recon files and five screenshot files. All of them opened the old page and read the old board.

- `noteboardLook.measure.ts`, `nbPaper.measure.ts`, `nbFinish.measure.ts`, `nbWorkflow.measure.ts`, `nbEmpty.measure.ts`
- `nbRecon.measure.ts`, `nbPaperRecon.measure.ts` (one-off recon for two earlier runs)
- `noteboardShot.measure.ts`, `nbFinShot.measure.ts`, `nbPaperShot.measure.ts`, `nbWorkflowShot.measure.ts`, `nbEmptyShot.measure.ts` (they wrote into `reports/noteboard*`)

`seedNotes.mjs` (the `nbseed-*` probe notes) is kept: the account still holds them and nothing here depends on them.

## Case by case

| File · case | What it held | Now |
|---|---|---|
| `noteboardLook` · the masonry packs and reflows | CSS multicol packed notes of different heights into columns. | **Retired.** There is no multicol. Tidy's column flow is CB1 C6 and the unit lock on `arrange`. |
| `noteboardLook` · pre-wrap | A newline in a note makes it taller. | **Uncovered on the rendered page.** `.nb-body` still declares `white-space: pre-wrap`. |
| `noteboardLook` · hover is a shadow, the card does not move | No lift on hover. | **Rewritten** as a unit lock (`noteboardCard.test.tsx`: no transform on `.nb-note` or on `:hover`). A pinned note has no hover shadow. |
| `noteboardLook` · three papers, three fills; a note wearing a colour renders it | The three paper rules resolve in the real cascade. | Partly CB1 B2 (the pink editor) and C2 (flat paper, no image). The three fills are not compared on the rendered board. **Partly uncovered.** |
| `noteboardLook` · nothing overlaps (negative space) | No two things on the board intersect. | **Retired by design.** A freely pinned board may overlap where the writer puts things. Unsaved notes never overlap: unit lock on `arrange`. |
| `noteboardLook` · the Examples drawer is opaque; nothing behind shows through | The drawer resolves its tokens. | **Uncovered on the rendered page.** The drawer is unchanged and is now reached from the empty state only. The scope rule stays unit-locked (`noteboardChrome.test.tsx`). |
| `nbPaper` · no gradient over a note; flat surfaces | Notes are flat paper. | **CB1 C2** (no note has a background image). |
| `nbPaper` · the hem is an affordance | The zone's fade showed only when it scrolled. | **Retired.** The page scrolls; there is no zone and no hem. |
| `nbPaper` · Keep this; the hint order; no examples under a search | The example papers on the board. | Already retired by the workflow run (the examples left the board); these cases were stale before this pack. |
| `nbPaper` · the third onto the first, then reload | Drag-to-reorder writes `order`. | **CB1 C6** (reorder in the tidy view writes `order` and not `layout`). The reload half is not repeated. |
| `nbPaper` · one anchor, no img, markup readable as text | Link-aware bodies. | Unit lock (`noteboardLinks.test.tsx`). **Not re-measured on the rendered page.** |
| `nbFinish` · 1a column width | Cards 300–420px wide. | **Retired.** A note is 204 wide (CB1 C2). |
| `nbFinish` · 1b the Pin button on one line; 1d the ghost matches a note | The pink "Pin a note" and the ghost tile. | **Retired** with both controls. |
| `nbFinish` · 1c no count at rest; "n of N notes" under a search | The filtered label. | **CB1 B3** (the label reads "2 of 8 notes"); the resting count is the header's (B1). |
| `nbFinish` · Edit on a mid-board note; Cancel; an empty save | The composer edits in the note's own slot. | Unit locks (`noteboardCompose.test.ts`). The editor opening at the note's place is in the shots, not a lock. **Uncovered on the rendered page.** |
| `nbFinish` · date a note → badge, still on the board, one To-do card; detach | "Turn into a task". | The fixture's `cbseed-n5` is that state: CB1 D1 holds that it is on the board as a note and not in the tasks card. The round trip through the menu is **not re-measured**. |
| `nbWorkflow` · (d) the empty board's panels and CTA order | The empty state. | Unit lock (`noteboardEmptyState.test.tsx`). **Not re-measured on the rendered page**; see the zero-notes shot. |
| `nbWorkflow` · (c) the workflow sits below the board | The populated arrangement. | Kept in the page, under the cork board. **Not re-measured.** |
| `nbWorkflow` · (c) Keep this from the drawer | Creates a real note. | **Not re-measured.** The drawer is unchanged. |
| `nbEmpty` · the three SVGs are painted; the examples left the board; each opener mounts the same composer | The empty state's art and doors. | Unit locks. **Not re-measured on the rendered page.** |

## Files that still name a retired selector, and why they are left

| File | What it names | Verdict |
|---|---|---|
| `calTint54`, `calGround54`, `stickyBand`, `listPort`, `chassis21`, `matrix`, `measure.ts` | `.tpl-zone` | The Calendar's (and the To-do list's) zone. The Corkboard no longer has one; these do not open it for that. Left alone. |
| `compactHeader` | "Pin a note" (in a comment) and the page as a COMPACT header | **Stale for this page.** The Corkboard's header is a full number panel. In RED-BACKLOG. |
| `surfaceCensus` | `.nb-search` in a control list | Harmless: a selector list; the control is gone. |
| `mastheadMatrix`, `barBinding`, `chromeGround`, `contentGeometry`, `headerFix`, `illoRules`, `handoff`, `washEdges`, `toolbarIsContent` | a per-page row for the Corkboard as a `tpl-wpg` masthead page | **Stale for this page**: it has no masthead and no toolbar row. These are masthead-era censuses; seven of the ten are in RED-BACKLOG, and `headerFix`, `handoff` and `toolbarIsContent` are not (the report's L2 table says how each ran on both builds). The route in their tables was moved to `/todo/corkboard` and nothing else. |
| `headerV3` | the page as a TITLE header | **Re-pointed**: the Corkboard is in `NUMBER`, with its words and `[data-note]` as its rows. |
| `hp2Lib`, `sh2Lib`, `pageHeaderV2Lib`, `inkShell`, `todoV2` and the route-shot files | the route | **Re-pointed** to `/todo/corkboard`. |
