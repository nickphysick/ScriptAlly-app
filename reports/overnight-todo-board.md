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
