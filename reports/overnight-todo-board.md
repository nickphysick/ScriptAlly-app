# Overnight build — To-do workspace, Phases 2–4

Unattended run building on the landed Phase 1 (precedence + `taskFlags` + `clearedToday`).
Per-phase commits; gates (`tsc` + `vite build` + full Vitest) green before each.

---

## Step 0 — recon (no red-gate fired)

1. **`git status`** — clean but for this run's own additive tokens (`src/index.css`, `design-refs/themes.md`, carried from the pre-approved Phase-2 token add). No foreign WIP: the concurrent "interactions" stream's `NudgeModal.tsx` edit is now committed, and `App.tsx`/PaintMode is clean. ✓ (no RED-GATE #1)
2. **`.t-f12` board tokens** — `--pink-hero`, `--gold-t/b/i`, `--note-t/b/i` are **present** (added additively this run under the same concept as the mockup; `themes.md` updated). Consume. ✓ (no RED-GATE #2)
3. **NudgeModal** — `src/components/NudgeModal.tsx` present. A reusable nudge-**draft generator** appears **absent** (no `buildNudgeDraft`/`generateNudge`; the mockup hard-codes the draft string). Phase 3 will stub the draft with a marked `TODO` and report it (per Step 0 rule — not a stop). Re-confirmed in Phase 3 below.
4. **`tasks`/`UserTask` store** — the concurrent interactions stream has **already built** the `users/{uid}/tasks` store CRUD in `db.tsx` (`userTasks` + `addUserTask`/`updateUserTask`/`deleteUserTask` + snapshot) and extended `UserTask` with `dueDate?` (their reminders). Phase 2 therefore **consumes** it and only **adds `committedDate`** (the standing-decision Today's-list field) to `UserTask` + `isValidUserTask`. Not a mismatch → no RED-GATE #3.
5. **`queryPrimaryAction.ts`** — exports `getPrimaryAction` (status→action map) + `PrimaryAction`/`PrimaryMarkKind`. Phase 3 consumes it. ✓

Retirement targets confirmed safe (only self/old-page consumers): `todoFocus*`, `todoLedger*`, the `todoNotes` store (`db.tsx` + `types.TodoNote`), and `User.todoLastFocusedAt`. (`notesUtils.datedTodoNotes` is unrelated — it operates on the dashboard `Note[]`.)

---

## Phase 2 — F12 board shell, tasks store, retire Ledger

**Gates:** `tsc` clean · `vite build` OK · full Vitest **935** green.

**What landed:**
- **Tokens** — `--pink-hero`, `--gold-t/b/i`, `--note-t/b/i` added additively to `.t-f12` (`index.css`), values from `design-refs/todo-workspace-v10.html`. **Approved deviation** from "no theme changes": this is an *extension* (nothing consumed those tokens → zero blast radius), not a retokening. `themes.md` regenerated to document them (the `.t-f12` section). Consumed, not hardcoded — the board reads `var(--…)`.
- **Store** — the `users/{uid}/tasks` (`UserTask`) store was already built by the concurrent interactions stream; Phase 2 **consumes** it and adds **`committedDate`** (Today's-list state, the task's own scheduling) to the type, the `isValidUserTask` rule, and `updateUserTask` (null clears via `deleteField`).
- **Retired** — `todoNotes` store (db CRUD/state/snapshot/context + `isValidTodoNote` + the `/todoNotes/` route + `TodoNote` type) and `User.todoLastFocusedAt` (type + both rule clauses). `todoFocus*` / `todoLedger*` (+ tests) deleted. The old page never existed on `main` without the new one (single commit).
- **View-model** — `src/lib/todoBoard.ts` (+ test): pure assembly of the four columns. Do next & Housekeeping from the derived `tasks` memo; Your tasks from `UserTask`; Cleared today from the `clearedToday` union (`clearedTodayItems` added — count now derives from the same items, no desync). Commit state read per-kind: `TaskFlag.committedDate` for derived cards, `UserTask.committedDate` for user cards. Offer pinned top of Do-next; `querying_unstarted`/`dream_agent` excluded.
- **Page** — `ToDoPage.tsx` + `todo.css` rebuilt as the F12 board inside `F12Page` (`.t-f12 f12-root`): fixed ~344px shelf (pink hero + Today's-list box with always-rendered footer), four token-banded columns (pink/gold/note/sage), cards (due chip + warn + Snoozed×n → title with serif-italic burgundy agent name → subtitle → meta with real `StatusDot` + monogram + record → two pills). Commit pill writes `committedDate`; `✓ On today` + pink spine when committed; cap 5 (refuses the 6th with a toast). Mark-done ticks a UserTask immediately; on a derived card it opens the drawer (Phase 3).

**Stubbed for later phases (clearly marked in code):** the drawer body (`renderDrawerStub` → Phase 3), the Urgent / Work-the-list / Help-me-pick walkthroughs (→ Phase 4 toasts), Filter/Sort tools, and `addTask` uses a `window.prompt` placeholder (Phase 3's drawer replaces it). Housekeeping grouping is Phase 5 (cards render individually for now).

**Commit:** `feat(todo): F12 board shell, tasks store, retire Ledger` — see SHA in the final summary.

## Phase 3 — TaskDetail drawer (on-page capture)

**Gates:** `tsc` clean · `vite build` OK · full Vitest **935** green.

**What landed:** `src/components/todo/TaskDetail.tsx` — one component, drawer shell (Phase 4 reuses the same body for the walkthrough step). Right slide-over (~500px, scrim, Escape closes, `‹ ›` steps through the card's column). Card body-click and derived Mark-done open it.

- **Do next — Why → Do it → Done** (step rail): Why shows the reason + the agent's tracking timeline (real `StatusDot`s via `buildAgentTimeline`) + "Open the full query →". Do-it:
  - **mark-sent** (partial/full/rr): date + method + a materials tick-list (Save disabled until one ticked) + optional note → **`recordMaterialsSent`** (target/isResubmit derived from `queryPrimaryAction` — the shared map, no per-type re-branch).
  - **nudge**: the "ScriptAlly never sends for you" line + the draft + Copy + a check-back date + note → **`logNudge`**.
  - **offer / record**: reuses the proven **`RecordResponseFocusForm`**.
- **Housekeeping — fixed in the drawer (no bounce to EditAgent):** `data_quality_poor` → wish-list textarea / reply-window (weeks + "no reply means no") / materials ticks → **`updateAgent`** + `resolveTaskFlag` (feeds cleared-today). `no_response_close` → three-way: Close as no response (**`updateQueryStatus`** → `NO_RESPONSE`) / Still waiting (**`dismissTask`**) / Stop asking (`upsertTaskFlag` snoozed to `MUTED_UNTIL`).
- **Your task**: editable text + attached record + Save / Mark done / Delete (**`updateUserTask`** / **`deleteUserTask`**).

**Deliberate safety choice (for morning review):** every capture WRITE goes through the existing proven handlers rather than a re-implementation — so query history can't be invented. The mark-sent materials tick-list is a Save-gate (confirmation), not stored (`recordMaterialsSent` takes no materials list); it marks the query sent on the chosen date exactly as `MarkSentPopover` does.

**Stub reported:** no reusable nudge-**draft generator** exists (Step 0). `TaskDetail` uses a marked `TODO(nudge-draft)` placeholder draft; wire the real generator when it lands. The draft is display-only — nothing is sent.

**Commit:** `feat(todo): TaskDetail drawer with on-page capture`.

## Phase 4 (partial) — Today's-list rollover + Help me pick

**Gates:** `tsc` clean · `vite build` OK · full Vitest **940** green.

Built the two **pre-answered** pieces of Phase 4:
- **Rollover** — `BoardCard` now carries the raw `committedDate`; a committed item whose day has passed surfaces once in a gold **Keep / Clear** bar in the Today's-list box (`rolledOverCards`, `src/lib/todoWalk.ts`). Keep bumps `committedDate` to today; Clear uncommits (still on the board). "On today's list" is now `committedDate != null` (today *or* rolled), so the cap of 5 and the pill/spine count rolled items too.
- **Help me pick** (`choosePicks`, unit-tested) — the exact standing rule: ≤4 Do-next (the column is already pressing-first) + 1–2 Housekeeping, cap 5; ≤3 Housekeeping if nothing urgent; **never a UserTask**. Pulse-and-fade, card by card (ring→scale→fade, then commit), reduced-motion aware. No flying elements.
- Commit cap 5 (from Phase 2) and the drag path remain; the pill is the primary commit gesture.

## ⛔ STOP — the staged walkthroughs (remaining Phase 4)

Halted here rather than guess, per the run's prime directive. The walkthroughs (Urgent / Work the list) require **staging** — nothing writes until Save — but the pack's spec ("the Do-it step embeds the same `TaskDetail` capture") only cleanly covers the **stageable query captures** (mark-sent → `recordMaterialsSent`, nudge → `logNudge`, whose payloads are `{date, method, materials}` / `{checkBack, note}`). It does **not** say how the other card types get staged, and they can't stage as built:

- **Offer / record** — the record path is `RecordResponseFocusForm`, which **writes immediately**; there's no staged-payload variant.
- **Housekeeping** (`data_quality_poor` / `no_response_close`) — the fixes write immediately (`updateAgent` / `updateQueryStatus`); the pack itself says stale queries "stay individual… cannot be batched".
- **User tasks** — a committed user task in "Work the list" has no capture to stage.

**The question for Nick (un-pre-answered judgement call, RED-GATE #6):** should the walkthrough queue be **mark-sent + nudge only** (offer/housekeeping/user handled via the drawer, which already works), or should staging be extended to those types (requiring a staged variant of `RecordResponseFocusForm` + the housekeeping fixes)? Options:
- **(A)** Walkthrough = the stageable query captures only (mark-sent + nudge). Cleanest; offer/hk/user stay on the immediate-write drawer. *(My lean — matches "stale queries can't be batched" and keeps the "never invent history" guarantee.)*
- **(B)** Extend staging to every card type — larger; needs `RecordResponseFocusForm` and the housekeeping fixes to grow a "return payload, don't write" mode.

`TaskDetail` was deliberately built body-first so a staged mode drops in once this is answered.

---

## Finalise

**Phases completed this run + commit SHAs:**
- Phase 2 — `5693f74` — F12 board shell, tasks store, retire Ledger.
- Phase 3 — `ce8d33c` — TaskDetail drawer with on-page capture.
- Phase 4 (partial) — *this commit* — Today's-list rollover + Help me pick. Staged walkthroughs NOT built (stop above).

**Firestore rules to deploy (NOT deployed — Nick runs):** `firebase deploy --only firestore:rules --config firebase.dev.json --project dev` then prod. This run's rule changes: `isValidUserTask` gains `committedDate`; **removed** `isValidTodoNote` + the `/todoNotes/` route + the two `todoLastFocusedAt` clauses. (Plus the still-pending Phase-1 `taskFlags`/`tasks`/`mutedTaskRules` block if not yet on prod.)

**Token decision:** ADDED (additive extension), not consumed-existing — `.t-f12` gained `--pink-hero`, `--gold-t/b/i`, `--note-t/b/i` (values from the mockup `:root`). `themes.md` regenerated (the `.t-f12` section documents them). Approved deviation from "no theme changes" — extension, zero blast radius, not a retokening.

**NudgeModal / draft generator:** `NudgeModal.tsx` present; **no reusable nudge-draft generator exists**. `TaskDetail` uses a marked `TODO(nudge-draft)` placeholder draft (display-only — nothing is sent). Wire the real generator when it lands.

**Vestigial `dismissedTasks` (unchanged this run):** still-open debt from Phase 1 — the old collection + its state + listener remain live while `taskFlags` is the store. Once `migrateDismissedTasks()` is run + verified on dev, delete the collection, its `dismissedTasks` state, and its onSnapshot listener. Do not let it become permanent.

**Felt-off but didn't red-gate (for morning review):**
- Writer's-turn cards have **no real deadline** in the model, so the "due" chip reads `OVER TO YOU` rather than the mockup's "3 DAYS LEFT" (honest, not invented).
- The Do-next capture reuses the **proven write handlers** rather than a bespoke re-implementation (safety over pixel-fidelity to the mockup's tick-list). The materials tick-list is a Save-gate, not stored.
- `addTask` uses a `window.prompt` placeholder (the drawer's inline compose is a later refinement).
- Housekeeping renders **individually** (grouping/batch/mute + assisted-fill are Phase 5, out of scope tonight).
- The concurrent "interactions" stream had already built the `users/{uid}/tasks` store CRUD (with `dueDate`) — consumed, not duplicated.

**⚠ Layout is UNVERIFIED (jsdom-blind).** Nick must eyeball, logged in on dev, before trusting: the board in all four columns (empty + populated), the fixed 344px shelf, the Today's-list box (commit, cap-5 toast, rollover Keep/Clear, Help-me-pick pulse), and the drawer for every card type (mark-sent capture, nudge draft/copy, offer→RecordResponse, both housekeeping fixes, user-task edit) across sparse/rich data.
