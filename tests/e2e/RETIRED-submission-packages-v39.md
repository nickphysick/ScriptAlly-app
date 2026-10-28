# Submission packages v39 — locks retired, rewritten and retargeted

v39 (28 Oct; `design-refs/submission-packages-v39/`) replaces the navy header, the labels' markup, the builder's
one-panel-with-a-stepper layout, the old How it works dialog and the results rows' markup. Every lock below was read
against what it claims, not against its spelling. A **retarget** keeps the lock's law and changes only the class or
attribute it reaches the page through; a **rewrite** changes what the lock asserts, with the reason. Nothing was
weakened to make a run green: each retargeted file was run green on the v39 build, and every rewritten lock was proved
red by its named break first (ledgers in `reports/submission-packages-v39/ledger/`).

## Rewritten

| Lock | Was | Now | Why |
|---|---|---|---|
| `pk38.measure.ts` **L8** | no visible element on the page or its layers is mono AND uppercase | the same, **except exactly two** — "Build, view and edit" (`[data-pk39="kicker"]`) and the Pro stamp (`[data-pk39="pro"]`) — which are asserted present and mono capitals; the census also scans the guide (`.p9-hw2`) and the picker (`.p9-icp`), which render outside `.p6-layer` | the v39 pack names those two mono labels explicitly; v40's no-mono-capitals ruling stands everywhere else. Its break moved from the label's Active tab (which the page's own override out-ranks, so the break never applied and the lock stayed green under it) to the showcase sentence; proved red |
| `pk26.measure.ts` **PK26-W** | the header and the builder are 92 / 48 in from the sheet | the builder is 48 in | the header is the Contact list's card now, held to the Contact list's own boxes by `pk39.measure.ts` L1 |
| `pk26.measure.ts` **PK26-H** | "+ Add a note"; "the name and its pencil keep one line" | "Add a note: who is this for?" (the ref's words); "the name keeps one line" | v39 makes the note line itself the door, in the ref's words, and the pencil is gone (the name is edited in place). The law — no note offers one, opening Package details with the note focused — stands |

## Retargeted (law unchanged)

- `pk38.measure.ts` **L2, L5, L9, L10** and its breaks: the labels `.p8-pkl-*` → `.p9-pkl-*`; the showcases `.p8-ag2-v`, `.p8-ag3-d`, `.p8-ov-b`, `.p8-ag3-g` → `.p9-*`; the builder `.p6-po-nm`, `.p6-mr-ac`, `.p6-mr-x`, `.p6-exc`, `.p6-exa-b`, `.p6-lr*` → `.p9-*`. L9 now counts no Add button at all on a locked package (v39 renders none rather than a disabled one).
- `pk38.measure.ts` **L8**'s How it works door and layer: `.p6-hd-s` / `[data-pk26="hwm"]` → `[data-pk39="how"]` (and the brand-new hero's `.p6-pb-bt .p6-hd-s`) / `[data-pk39="hw"]`.
- `pk38.measure.ts` **L11**: "the builder renders" read v40's outer panel (`[data-pk40="wbf"]`), which v39 deletes; it reads `[data-pk39="builder"]`.
- `pk26.measure.ts` **PK26-R, PK26-B, PK26-M**: the same class moves (`.p8-pkl-*`, `.p6-slt`, `.p6-lr*`, `.p6-lib-tabs`, `.p6-dragging`, `.p6-ok`, `.p6-mr-tx` → `.p9-*`). PK26-M reads the name and its title off the row's `b` (v39's row has no `.p6-nm` span).
- `tests/e2e/sh2Lib.ts`: the packages header art moves from `.p6-hd-art img` to the shared card's `.phc-art img`.

## Retired outright

None. Every v38 lock's subject still exists in v39.

## New

`pk39.measure.ts` L1–L8 (see its header). Each was red against the base build (2f611e08, no v39) and red under its own named
break on the v39 build (`PK39_MUTATE=L1` … `L8`), then green. The rules half of L2 is `tests/rules/firestore.rules.test.ts`
(emulator), proved red by loosening the enum to `is string`.
