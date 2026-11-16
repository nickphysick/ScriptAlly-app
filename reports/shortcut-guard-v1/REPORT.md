# Shortcut guard — the closed "How it works" dialog no longer counts as an open modal

16 Nov 2026. Branch `shortcut-guard-v1`, cut from the line dev serves (`dev/msp1-st2-rar1` @ 7b98b65f8, `index-B8GmFPmc.js`). Not deployed (quick lane: it goes out with the next deploy batch).

## False premises

- **"An existing worktree that no other session is using."** There was none on this line. `ScriptAlly-st21` sits at the same tip but is locked by a live session; `rsp6` and `tdf` are on other branches. This pass made its own worktree, `ScriptAlly-sg1`, and removes it at the end.
- **"Unit tests … stub the rect, since jsdom lays nothing out."** This repo has no jsdom (Vitest runs in `node`). The modalOpen tests stub `document` with a small element tree: attributes, a parent and a rect. Its `closest` answers only the selector the guard asks and throws on any other. The Dash105How test renders through `react-dom/server` with `createPortal` passed through.
- Otherwise the premise held: before the fix, `modalOpen()` was true on all three pages.

## Step 0: what was found

**The element.** On the rendered page (1512×982, emulator harness, How it works never opened), `modalOpen()` counted exactly one element on the Dashboard, Queries and Letters alike:

```
[SG1] /dashboard census [{"el":"DIV.d105-how[d105h=modal]","ariaModal":"true","width":510,"hiddenOrInert":true,"oldCounts":true,"newCounts":false}]
[SG1] /queries census   [ …the same… ]
[SG1] /materials/letters census [ …the same… ]
```

M did nothing on all three pages (`menus open 0`).

**Why it is on every page.** `App.tsx:679` mounts the Dashboard as a keep-alive `StagePage` (`active={routeKey === "dashboard"}`), so it is mounted on every route. It renders `Dash2Founding` (`Dash58.tsx:649`), which renders `Dash105How` (`Dash2Founding.tsx:247`), portalled to `<body>`. Your notes also mounts `Dash2Founding`, but only on its own route (`App.tsx:817`, "Mounted on demand"). `Dash105Founding.tsx:294` is the other mount; on this line no route renders it. `dash105.css:460` hides the closed dialog with `opacity: 0; pointer-events: none` and a 0.22s opacity/transform transition, which keeps its box (510 wide while closed, under the `scale(0.98)`).

**Callers of the guard** (`src/lib/shortcuts.ts`):
- `shortcutBlocked` (isEditableTarget ‖ modalOpen):
  - `BarSwitcher.tsx:226` (M)
  - `ShortcutsSheet.tsx:91` (?)
  - `TodoNoteboardPage.tsx:487` (corkboard new)
  - `DvPicks.tsx:166`
- `modalOpen` directly: `useQcListKeys.ts:48, 64, 71`. The Query Centre list keys and its Escape handler were blocked by the same dialog.

**The aria-modal sweep** (every element in `src` that can be in the DOM while closed):

| Where | While closed | Hidden by | Action |
|---|---|---|---|
| `dashboard/v105/Dash105How.tsx:53` | mounted | `inert` + `aria-hidden` + opacity 0 | **fixed**: aria-modal only while open |
| `versions/V2Overlays.tsx:59` `DrawerShell` (#cxDrw) | mounted | `aria-hidden={!open}` + CSS | **fixed**, one line: aria-modal only while open |
| `versions/V2Overlays.tsx:72` `ModalShell` (#cxModal / #cxPk) | mounted | CSS only (no inert, no aria-hidden: the new guard rule would NOT have caught it) | **fixed**, one line: aria-modal only while open |
| `marketing/PlanSheetPhone.tsx:137` | mounted (public pages, not the app) | `inert` + `aria-hidden` | left alone: the guard rule now covers it, and no app shortcut runs there |
| `packages/PkgMaterialDrawer.tsx:77` | would stay mounted | CSS only | left alone: nothing in `src` imports `PkgMaterialDrawer`, so it is mounted nowhere (owned follow-up below) |
| `Pk26Drawer`, `Pk38Drawer`, `Pk26Dialog`, `QcBirdsDrawer`, `HalfDrawer`, `QueryJourneySheet`, `Dash58Feed` | removed when closed | — | none needed |
| the remaining ~45 sites (Tour, ConfirmDestroy, phone sheets, to-do dialogs, …) | rendered only while open (conditional at the call site or `return null`) | — | none needed |

The rendered census found no other aria-modal element in the DOM on the three pages. No other session had `V2Overlays.tsx` open: `rsp6`'s dirty files are all in `responses/`, and `st21` and `tdf` are clean.

**The spine measure's workaround** was on this line: `tests/e2e/manuscriptSpine.measure.ts` MSP4, the `stale` block that set `aria-modal="false"` on `.d105-how:not(.on)`. It is removed in this commit.

**Existing tests** for the guard: none (no unit test named `modalOpen` or `shortcutBlocked`; only MSP4 logged it). For Dash105How: `tests/e2e/dashV105*.measure.ts` and `dashV118*.measure.ts` (look and slides); no component test.

## The change

- `Dash105How.tsx`: `aria-modal={open ? "true" : undefined}`. `role="dialog"`, `aria-hidden`, `inert`, its look, slides, focus trap, Escape layer and focus return are unchanged.
- `shortcuts.ts` `modalOpen()`: a candidate also has to pass `!e.closest('[inert], [aria-hidden="true"]')`. Nothing else in the file changed.
- `V2Overlays.tsx`: the same one-attribute fix on `DrawerShell` and `ModalShell`.
- `manuscriptSpine.measure.ts`: the workaround is removed, and its logged `modal` list now applies the new rule.

What M does on this line: the harness account holds seven manuscripts, so M opens the manuscript menu (`[role="menu"][aria-label="Your manuscripts"][data-open="true"]`).

## Gates: baseline against final

Baseline taken on the untouched tree (7b98b65f8, my edits set aside).

| | Baseline | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0, 0 `error TS` | exit 0, 0 `error TS` |
| `npm run build` | `✓ 417 modules transformed.` `✓ built in 2.16s`, no error/warning lines | `✓ 417 modules transformed.` `✓ built in 1.70s`, no error/warning lines |
| `npx vitest run` | `Test Files  2 failed \| 876 passed \| 1 skipped (879)` / `Tests  3 failed \| 12650 passed \| 4 skipped (12657)` | `Test Files  2 failed \| 878 passed \| 1 skipped (881)` / `Tests  3 failed \| 12660 passed \| 4 skipped (12667)` |

The 3 failures are identical before and after: the known guard tests naming `tests/e2e/cb21Emu.sh` (`emuGuard.test.ts` ×1, `firestoreTarget.test.ts` ×2).

## Locks and their red-before proofs

| Lock | Green | Red-before |
|---|---|---|
| `src/lib/shortcutGuard.test.ts` (8 cases: open counts; inert, aria-hidden and inert-ancestor do not; open `<dialog>` counts; none → false; no box → false; a hidden one does not mask an open one) | 8/8 | guard rule removed alone: `Tests  3 failed \| 7 passed` (inert, aria-hidden, inert ancestor) |
| `src/components/dashboard/v105/dash105HowModal.test.tsx` (closed: no aria-modal, still dialog + aria-hidden + inert; open: `aria-modal="true"`) | 2/2 | dialog fix removed alone: `Tests  1 failed \| 9 passed` (the closed case) |
| `tests/e2e/shortcutGuard.measure.ts` SG1: the How dialog is counted in the DOM (≥1) and closed; it carries no aria-modal; M opens the menu on the Dashboard, Queries and Letters | passed | before the fix (both removed): red on all three pages, `Received: "true"` and `menus open 0`. With `SG_MUTATE=dialog` (dialog fix removed in-page): the attribute check is red on all three pages while M still opens the menu, so the guard rule holds on its own on the rendered page |
| SG2: open How it works → M does nothing and the dialog stays open; Escape closes it (still mounted); M opens the menu | passed | before the fix: `M works again — Expected: 1, Received: 0` |
| MSP4 (spine measure), workaround removed | passed: `"modal":[]`, M opens the manuscript's page | (before the fix it needed the workaround) |

On the rendered page, the guard rule's lock can only go red with the dialog fix also gone, because either fix alone makes M work. Its isolated red-before is the unit lock.

## Seen, not mine

- **`manuscriptSpine.measure.ts` MSP1 is red on this line** ("the first nav row starts where the slot did", `Received: 4` at both sizes):
  - The nav row reads 103.75, as it did when the spine landed.
  - The expected slot top, which is derived from the logo's box, now reads 99.75.
  - The logo moved in `4f615409a` (Shell tabs v2, Phase 1, "the logo on the bar's centre line"), which came onto this line in merge `ea5eb11c9`.
  - This diff contains no CSS or layout change. I inferred the cause from the readings and the commit, and did not re-run MSP1 on the base.
- SR2.4 and the three `cb21Emu.sh` guard tests are known reds, untouched.

## Owned follow-ups

1. **MSP1 and Shell tabs v2.** In `tests/e2e/manuscriptSpine.measure.ts`, `SLOT_GAP` and the `oldSlotTop` derivation (around line 62 and the MSP1 assertion) need re-basing on the moved logo. Alternatively, the rail nav's margin-top in `sidebarRail.css` needs to follow the logo. That decision belongs to whoever owns Shell tabs v2 and the spine.
2. **`src/components/packages/PkgMaterialDrawer.tsx:77`** carries an always-on `aria-modal="true"` but is mounted nowhere. Delete the file, or apply the same one-attribute fix before anything mounts it.
