# To-do Phase 6 — deletion cascade + interim mobile pass

## ⛔ RED-GATE — Phase 6B (mobile) STOPPED: design ref missing

`design-refs/todo-mobile-sketches.html` is absent from `design-refs/` AND `~/Downloads` at build
time (16 Jul, ~17:00). The pack binds 6B to the six frames — including the **chosen option-B
mini-rail vs the rejected option-A swipe-cards distinction**, the bottom-sheet anatomy and the
sweep-swipe grammar — so building it blind is the guessing the red-gate forbids. **To unblock: drop
the file into `~/Downloads` and re-issue; 6B is otherwise fully specified by the pack text and will
be quick.** 6A proceeded: its dialog is completely specified in prose (frame 5 was only the visual
aid — the built dialog follows the app's existing delete-dialog grammar + the pack's spec verbatim;
if the sketch differs visually it's a small CSS follow-up, flagged).

## STEP 0 — recon

1. **Tree clean**; all five journey-redesign commits present (`f286b06`→`d997286`).
2. **The pack's premise is STALE — both deletes are ALREADY true cascades** (an earlier audit
   stream, "D1/D2" in the comments): `deleteManuscript` removes versions → packages → the
   manuscript's notes subcollection → each query's activity subcollection + the query → the
   global-feed projections → **the manuscript LAST**; `deleteAgent` mirrors it (agent notes,
   queries + activity + projections, agent last). Both via `commitDeletesInBatches` (chunked ≤450 —
   under Firestore's 500 hard limit). Call sites: `AllManuscripts.tsx` and `Agents.tsx` only —
   each behind a bespoke confirm modal **plus a 7-second deferred-delete undo window**
   (pendingDelete + timer + commit-on-unmount). **The REAL 6A gaps:** (a) `taskFlags` stances were
   NOT cascaded (query-keyed flags on all paths; the agent's own dq stance on agent deletes) —
   left as inert junk; (b) no type-to-confirm / "Goes with it" manifest; (c) the deferred-undo
   pattern contradicts the pack's "no undo — type-to-confirm IS the safety".
3. **Subcollections:** query → `activity` (fetched + deleted ✓), manuscript → `notes` ✓, agent →
   `notes` ✓. Client-side chunked batches are live and sufficient — **no Cloud Function needed, no
   red-gate**. Packages reference manuscripts + versions, never agents (the pack's "any package
   references" for agents = none).
4. **Responsive state** (for 6B, parked): the app's convention is the `md` breakpoint (~768px —
   AppShell's mobile slim bar / BottomTabBar / help-FAB hide). The board at ~380px: ribbon
   flex-wraps, lanes already scroll horizontally, but cards are 322px fixed (near-full-bleed),
   the quick rail is hover-only (unreachable on touch), the FAB/pop-up fit but sit tight, and the
   focus sheet is `min(620px, 86vw)` (usable). Verdict: **usable-but-ugly, and quick actions are
   effectively desktop-only** — exactly 6B's scope.

## PHASE 6A — confirm-before-destroy cascade ✓

**Gates:** `tsc` clean · `vite build` OK · Vitest **1040** green (+13, `cascade.test.ts`).
`App.tsx` untouched → no PaintMode. No schema/store change — deletions only.

**The pure layer** (`src/lib/cascade.ts`, extending the existing cascade helpers):
- `flagIdsForCascade` — the stance docs that die with their records (query-keyed + agent-keyed).
- `destroyManifest` — the "Goes with it" counts (queries **with M fulls/partials OUT called out**
  via `MATERIALS_OUT_STATUSES` = Partial/Full Sent · activity records · packages · versions ·
  to-do stances). ONE source with the plan, so the dialog can never promise less than the delete
  removes (unit-locked: plan ⊇ manifest per collection).
- `cascadePlan` — the ordered top-level doc list, **children first, the parent ALWAYS last**
  (unit-locked: the parent is the final doc; a partial batch failure can strand children but never
  orphan them — the parent survives and a retry re-plans). db.tsx maps it to refs, splicing each
  query's live-fetched activity subcollection before its query doc.
- `canDestroy` — the type-to-confirm gate (exact trimmed match; light mode passes; a nameless
  record can't be confirm-typed) + `chunkArray` (chunking unit-locked at 1101 docs → 450/450/201,
  nothing lost).

**db.tsx:** `deleteManuscript` + `deleteAgent` now consume `cascadePlan` — behaviour identical to
the shipped cascades PLUS the taskFlags cleanup; `commitDeletesInBatches` consumes `chunkArray`.
**`deleteQuery` got the same stances-die-with-records fix** (its flags were also stranded — a
small principled extension, flagged). On batch failure the existing error path reports and the
parent survives (ordering guarantee above).

**`ConfirmDestroy`** (`src/components/ConfirmDestroy.tsx`, shared, desktop+mobile-ready): serif
"Delete “{name}”?" · plain-English consequence · the "Goes with it" panel from `destroyManifest` ·
type-to-confirm with **"Delete forever" (warm red `#b3452f`) disabled until the exact name is
typed** · **"Keep it" is the safe default (autofocused)** · "This can't be undone." — no undo
window anywhere. **Light mode** (nothing depends on the record): consequence + Delete/Keep only.

**Wiring — every bare/immediate-delete path replaced:**
- **AllManuscripts:** the bespoke modal → `ConfirmDestroy` (light when truly nothing depends on
  it); the **7s deferred-delete window, its undo toast, the optimistic plate-hide and the
  commit-on-unmount effect are all DELETED** — confirm runs the cascade immediately.
- **Agents:** the existing **steer step is KEPT** (a queried agent first sees "Mark closed
  instead / Set aside instead" — a non-destructive escape the pack didn't cover but shouldn't
  lose; flagged): "Delete anyway" now opens `ConfirmDestroy` (full guard); a zero-query agent goes
  straight to the **light** guard. The deferred window/undo machinery is deleted; the
  neighbour-reselect happens before the cascade commits so the pane never points at a ghost.
- No `window.confirm` deletes existed in scope; none remain.

**Ordering guarantee, stated:** children (versions, packages, per-query activity, queries,
projections, stances) delete before the parent in ≤450-doc batches committed in order; the parent
is in the final batch's final position, so any earlier failure aborts before it — `deleteManuscript`
/ `deleteAgent` **cannot orphan**, and a retry re-plans from live state.

**Commit:** `fix(delete): confirm-before-destroy cascade for manuscripts + agents`.

**Nick eyeballs (after a deploy):** both dialogs — a queried manuscript (counts panel + type-to-
confirm + disabled-until-match red button), a zero-query agent (light), a queried agent (steer →
Delete anyway → full guard) — and that deletes land immediately with no undo toast.

## PHASE 6B — parked at the red-gate

Not started (see the top). When the sketches land: header stack + tile-tap-scrolls, always-visible
22px mini rail (option B), Today bottom sheet (presentation wrapper over the pop-up content), full-
viewport focus sheet + slim chrome, sweep-swipe (right ✓ / left ⏸ / up skip), 380px spacing pass,
plus the logic tests (tile targets, swipe→key mapping). The "deferred for the proper mobile pass"
list will ride that commit.
