# Retired by Corkboard v2 (6 Nov 2026; ref design-refs/corkboard-v13/)

Corkboard v2 replaces v1's framed cork board (free pinning, tidy, the "Your tasks" card, the add bar, the examples
drawer and the workflow panels) with a wall of post-its and piles. Cases that held v1's subject are listed here with
where their law went, if anywhere. Unit cases retargeted in place say so in a comment at the case.

## Part B — the header and the tool row

| Case | File | Why | Where the law went |
|---|---|---|---|
| the Note control is three paper buttons | src/components/todo/noteboardToolbar.test.tsx | v1's add bar is retired | the header's Pick a colour swatches (corkboardV2Page.test.tsx) |
| the subline is the Corkboard (v4) ref's sentence | src/components/todo/noteboardChrome.test.tsx | v4's subline is not drawn | rewritten in place: the header's v13 sentence (`boardSentence`) |

## Part C — the wall

Components deleted (no other importer): `CorkBoard.tsx`, `CorkTasksCard.tsx`, `noteboardEmptyState.tsx` (the
workflow panels), `noteboardEmptyArt.tsx`. The examples drawer (inline in the page) is gone; its data
(`NOTE_EXAMPLES`) stays and feeds the empty page (Part G). v1's pure board layer in `lib/corkboard.ts` (the cork
texture, tilt and pins from the id, free placement and `arrange`, `corkPrefs`, `ownTaskRows`, the header copy, the
add bar's labels) is deleted with its cases; recoverable at ce8aa34ee.

| Retired | Why | Where the law went |
|---|---|---|
| tests/e2e/corkboardV1.measure.ts (CB1 A1–D2, L1), corkboardShots.measure.ts, cbLib.ts, cbStore.ts, seedCorkboard.mjs | v1's board, header and add bar are gone | tests/e2e/corkboardV2.measure.ts (CB1–CB14), cb2Lib.ts, seedCorkboardV2.mjs |
| src/components/todo/noteboardCard.test.tsx | v1's note card and `arrange` | CbPostIt (corkboardV2Page.test.tsx; CB4, CB5) |
| src/components/todo/noteboardDrawer.test.tsx | the examples drawer | the empty page (CB11) |
| src/components/todo/noteboardEmptyState.test.tsx | the workflow panels | the empty page (CB11) |
| src/lib/corkboard.test.ts — every case but the chip counts and the review aid | v1's pure board layer | corkboardV2.test.ts |
| noteboardCompose.test.ts — three cases on v1's inline composer | the composer is replaced by the note pop-up | Part E's cases |
| noteboardExamples.test.ts — the drawer's two cases | the drawer is gone | CB11 |
| tasksNoteboard.test.tsx — the shared PortalMenu seat; the workflow empty state | the ⋯ is CbWall's; the empty page is v13's | Part F; CB11 |
| tasksViewport.test.tsx — the empty state's own SVGs | noteboardEmptyArt.tsx is deleted | — |

Retargeted in place, each saying so at the case: artSlots, noteboardChrome (two), noteboardTask (the panel's
sentence), noteboardToolbar (filtering fades), tasksNoteboard (two), tasksTags, todoPageSmoke (two).
