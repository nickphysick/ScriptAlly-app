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

## Fix pass — board polish (partial; Fix 1 red-gated)

**Gates:** `tsc` clean · `vite build` OK · full Vitest **943** green. One fix landed (Fix 3); the rest are findings, not guesses.

### Step 0 — chrome ownership
`git status` clean (no PaintMode). The Queries Hub does **NOT** follow a content-only pattern — it renders `<F12Page>` (which draws its own `CrumbStrip` + `F12Account`). `ToDoPage` uses the **same** `F12Page`. So the fix pass's premise ("`ToDoPage` renders its own header row + footer") is **incorrect** — `ToDoPage` renders neither.

### ⛔ FIX 1 — RED-GATE (root cause is in `App.tsx`, which is out of bounds)
The double breadcrumb + the footer are **both produced by `App.tsx`**, not the page:
- **Footer** — `App.tsx:663` renders `<footer>…Crafted for fiction authors…` gated by `showFooter = routeKey !== "queries" && !manuscriptsPackages` (`App.tsx:582`). `/todo` isn't excluded → it shows. It is **NOT** a page-local component and **NOT** a mis-import — it's a literal `<footer>` in `App.tsx`.
- **Double crumb** — `ToDoPage`'s `<StagePage>` has **`contentVariant="work"`** (`App.tsx:624`), and `StagePage` renders a `CrumbStrip` whenever `contentVariant` is set (`AppShell.tsx:75-77`). Plus `F12Page` renders a second `CrumbStrip`. The Queries Hub's `<StagePage>` has **no** `contentVariant`, so it shows only `F12Page`'s crumb — that's why it looks right.

**The correct fix is two lines in `App.tsx`** — make `/todo` match `/queries`: (1) drop `contentVariant="work"` from the To-do `<StagePage>` (line 624), (2) add `"todo"` to the `showFooter` exclusion (line 582). Both are in `App.tsx`, which this pass forbids (RED-GATE). A page-side workaround (drop `F12Page` from `ToDoPage`) would remove one crumb but leaves the footer, drops the user cluster, and diverges from the Queries-Hub pattern — a guess at the intended architecture, so not taken.

### FIX 2 — stray "0 / 5" in the hero: layout escape, tied to Fix 1
The page renders **no** `0/5` node in the hero (only the Today-box header renders `{items.length} / {MAX_TODAY}`). So it's the Today-box pill escaping its container — a **layout** symptom, and the top-shelf grid is being disrupted by the Fix-1 chrome duplication (the extra `contentVariant` wrapper + `F12Page`). Not safely page-fixable before Fix 1; expected to resolve once Fix 1 lands. No change made (would be guessing).

### FIX 3 — Today's-list empty-state progress: FIXED
Real logic bug: `renderTodayBox` computed `total = items.length + clearedN` (global cleared-count in the denominator) → an empty list read "1 OF 1 DONE" with a full bar. Now a pure `todayProgress(committedOnList, doneFromList)` selector (`src/lib/todoWalk.ts`, unit-tested): denominator = items committed to **today's** list (still-on-list + completed-from-list); numerator = those completed; a globally-cleared item never committed to Today is excluded; empty → `total 0`, "NOTHING COMMITTED", bar hidden. `doneFromList` counts cleared items whose `committedDate === today`.

### FIX 4 — "Cleared today" hero vs column: already one source (no reproduction)
In the code the hero stat is `clearedN = columns.done.length` and the Cleared column renders that **same** `columns.done` array — they cannot disagree; there is no separate count. The `clearedToday` union also can't double-count a single completion (a nudge writes one `NUDGE_SENT` activity and does **not** set `resolvedAt`). The reported "hero 1 / column 2" doesn't reproduce from the current code — likely a stale screenshot or a specific data case. **Verify on the live board**; no change made (nothing to fix without a reproduction).

### FIX 5 — offer card's green ringed star: correct StatusDot, off-palette (judgement call)
The star **is** the real `StatusDot` for `OFFER` status (a star glyph), rendered on the offer card correctly. It shows off-palette (green) because **`.t-f12` does not define `--sd-hue` / `--sd-centre`**, so every board `StatusDot` falls back to the un-themed per-status spectrum — not just the offer's. It's neither a stray marker someone added nor a mis-selection (OFFER is the correct status), so **neither of Fix 5's two options applies** → judgement call, not covered. Options for Nick: **(a)** add `--sd-hue`/`--sd-centre` to `.t-f12` (a token add like the board bands, so all board dots read the F12 palette) — my lean; **(b)** a product decision to suppress the dot on offer cards (deviates from the StatusDot-everywhere invariant + inconsistent with the other cards' dots). Not guessed.

### Finalise
- **Landed:** Fix 3 only. Commit: `fix(todo): Today's-list progress ignores globally-cleared items`.
- **Fix 1:** footer is an `App.tsx` `<footer>` (not page-local, not a mis-import); the page already matches the Queries-Hub mount (both use `F12Page`) — the divergence is the `contentVariant`/`showFooter` wiring in `App.tsx`. 2-line `App.tsx` fix listed above.
- **Fix 2:** stray node vs escape → **escape** (no duplicate node; Today-box pill), tied to Fix 1.
- **Fix 4:** double-count vs under-count → **neither** — already single-source; doesn't reproduce in code.
- **Fix 5:** stray glyph vs StatusDot selection → **neither** — correct OFFER StatusDot, off-palette because `.t-f12` lacks `--sd-hue`.
- **Rules:** none changed this pass.
- **⚠ Layout unverified (jsdom-blind):** after Nick applies the 2-line `App.tsx` fix, re-eyeball — no double breadcrumb, no footer, single `0/5` in the Today header, empty Today reads empty (Fix 3), cleared count agrees hero↔column, and decide the offer-card dot (Fix 5).

## Chrome fix (App.tsx-safe) + StatusDot F12 tokens

**Gates:** `tsc` clean · `vite build` OK · full Vitest **943** green. Fixes A, B, C landed; D verified (no change).

**Step 0:** `git status` **clean** — no PaintMode in `App.tsx` this run (and `src/dev/PaintMode.tsx` absent), so the PaintMode-safe `-p` dance wasn't needed; `git diff src/App.tsx` was verified to contain **only** the two To-do edits before staging (no PaintMode lines). Targets confirmed by behaviour: `showFooter` at App.tsx:582; the To-do `<StagePage>` (line 624, `contentVariant="work"`) vs Queries (line 614, none); `.t-f12` lacked `--sd-hue`/`--sd-centre`; `StatusDot` reads `var(--sd-hue …)` (ring/glyph/pulse) + `var(--sd-centre …)` (fill) — a single pair.

- **FIX A — footer off To-do:** `showFooter = routeKey !== "queries" && routeKey !== "todo" && !manuscriptsPackages`. The `<footer>` no longer renders on `/todo`.
- **FIX B — double breadcrumb:** removed `contentVariant="work"` from the To-do `<StagePage>` so it matches the Queries mount. `StagePage` only renders its own `CrumbStrip` in the `contentVariant` branch (`AppShell.tsx`), so with it gone the crumb comes solely from `F12Page` → **single** `QUERYING / To-do`. Removing the `contentVariant` grid wrapper also removes the top-shelf grid disruption that let the Today-box pill escape into the hero: the only `0/5` in the render path is the Today-box header (`{items.length} / {MAX_TODAY}`) — the hero has no `0/5` node → **single `0/5`**. (Layout jsdom-unverified — Nick eyeballs.)
- **FIX C — StatusDot F12 palette:** added to `.t-f12` (ADDITIVE, no existing value changed) — `--sd-hue: #7c3a2a` (burgundy ring/glyph) · `--sd-centre: #f8e7dc` (pale-pink centre) = the F12 `--burg`/`--pinkC` pair as literals. `StatusDot` is one-hue-per-theme (direction by SHAPE, per its lock), so this is a single pair, not per-direction — the mockup's "sage for incoming" isn't a StatusDot capability without editing the locked component, so it's honoured as shape, not colour. `themes.md` updated (the `.t-f12` section). The component is untouched.
- **FIX D — cleared hero vs column (report only):** **same source.** Hero: `const clearedN = columns.done.length` (ToDoPage:126) → `<b>{clearedN}</b> cleared today` (145). Column: `const cards = columns[key]` (167), `key === "done"` → the same `columns.done`. They cannot disagree; the `clearedToday` union is the single upstream source. Consistent in code — any hero≠column Nick sees is live-data/stale-render and needs a live screenshot. No change made.

**Reminder — layout jsdom-unverified:** Nick must eyeball on dev: single breadcrumb, no footer on To-do, one `0/5` (Today header), and the offer-card dot now in the F12 burgundy/pale-pink palette.

## Scroll fix (Fix A landed) + glassy hero (Fix B RED-GATE)

**Gates:** `tsc` clean · `vite build` OK · full Vitest **943** green. `git status` clean (no PaintMode); `App.tsx` untouched this pass.

### Step 0 — scroll model + glass source
- **Scroll ownership:** `.f12-root` is a flex **column** (`height:100%`, no overflow) — header (`.f12-hdwrap`, `flex-shrink:0`) above the page content; whichever child is the content must be its own `flex:1; min-height:0; overflow-y:auto` scroller. The Queries Hub's F12Page child is exactly that shape (`className="… flex flex-col overflow-hidden" style={{flex:1, minHeight:0}}`), with its **panes** scrolling internally (`.f12-rows`, `.f12-dscroll`). `StagePage` for both `/queries` and `/todo` is `layout="fill" clip` → `height:100%; overflow:hidden`.
- **The bug:** `.tdb-wrap` was a plain block (`width/max-width/margin/padding`, no `flex`/overflow). So it grew past `.f12-root`'s bounded height and `StagePage`'s `overflow:hidden` clipped everything below the fold — no scroll. (No `100vh`/`overflow:hidden` clamp survived at the wrapper; the miss was the *absent* scroller, not a present clamp.)

### FIX A — the board scrolls (landed)
Made `.tdb-wrap` the page scroll region: added `flex: 1; min-height: 0; overflow-y: auto` (kept `max-width`/`margin:0 auto`/padding). Now it fills `.f12-root`'s remaining height below the crumb header and scrolls when the shelf + four columns exceed it. **Page-scoped** — a single `todo.css` rule; `.f12-root`/`StagePage`/other pages untouched (the clamp was never shared; the fix is purely additive to the To-do wrapper). The **~344px shelf** (`.tdb-toprow height:344px`) and the **Today-box internal fade-scroll** (`.tdb-tb overflow-y:auto` + mask) are inside `.tdb-wrap` and unchanged, so both survive; the whole page now scrolls to reach the columns. (Layout jsdom-unverified — Nick eyeballs.)

### ⛔ FIX B — RED-GATE: the diary container is NOT glassy
The "Dates for the diary / Fortnight in Focus" container is `.dc-panel` (`src/components/dashboard/diaryCarousel.css`), and it is a **solid, opaque raised panel** — **not** frosted glass:
- Cappuccino: `--dc-panel-bg: #f4efe7` (opaque hex, **no alpha**), `--dc-panel-bd: 1px solid #e9ded0`, `--dc-panel-rad: 22px`, `--dc-panel-sh: 0 10px 34px rgba(58,28,20,0.09)`.
- **No `backdrop-filter`, no translucency** — and there is **no `backdrop-filter` anywhere** in the app (only a decorative `blur(4px)` rim in `heroRim.css`, unrelated).

Fix B's core instruction — "reuse the diary's translucency + `backdrop-filter`/blur… **do not invent a new glass recipe**" — is impossible: there's no glass recipe on the diary (or anywhere) to reuse, and inventing the blur/translucency values is explicitly forbidden. So I stopped rather than guess a glass recipe.

**For Nick — pick one:**
- **(A)** Approve **inventing** a frosted-glass recipe for the hero (e.g. translucent pink fill + `backdrop-filter: blur(…) saturate(…)` + the diary's hairline/shadow/22px radius). This is new material, needs your sign-off on the blur/alpha values.
- **(B)** Reuse the diary's **actual** material — the solid raised-panel treatment (`--dc-panel-*`: hairline + `0 10px 34px …09` shadow + 22px radius), **pink-tinted** (a pink fill instead of `#f4efe7`). No glass, but it's the real "diary container surface" reused, no invention. *(My lean — it honours "reuse the diary's material, don't invent" literally.)*
- **(C)** Something else.

Either way it's a small `todo.css` (+ maybe a `.t-f12` token) change once you choose.

**Reminder — layout jsdom-unverified:** Nick eyeballs — the page now scrolls to the bottom of all four columns, the ~344px shelf stays put at the top of the scroll, and the Today box still scrolls internally.

**Commit (Fix A):** `fix(todo): board scrolls — .tdb-wrap owns the page scroll region`.

## FIX B — glassy hero resolved as option B (diary panel material, pink-filled)

**Gates:** `tsc` clean · `vite build` OK · full Vitest **943** green. `App.tsx` untouched.

Nick chose **option B**: reuse the diary container's **real** material (it's a solid raised panel, not glass), pink-tinted.
- **Lifted the diary panel material into `.t-f12` tokens** (`--float-hairline #e9ded0` · `--float-rad 22px` · `--float-sh 0 10px 34px rgba(58,28,20,0.09)`) — the `.dc-panel` values from `diaryCarousel.css`, as tokens so the hexes aren't duplicated in `todo.css` and any F12 raised panel can reuse them. `themes.md` documents them. **Additive** — no existing value changed.
- **`.tdb-hero`** now: `background: var(--pink-hero)` (solid pale-pink fill, replacing the `linear-gradient` + `#f4dcd4`), `border: 1px solid var(--float-hairline)`, `border-radius: var(--float-rad)`, `box-shadow: var(--float-sh)`. The diary's material, the hero's pink.
- **Corner circle: DROPPED.** The diary panel is a clean flat surface, so the decorative white corner circle (`.tdb-hero::after`) is removed (it was a gradient-era flourish; no translucency to read through). The `.tdb-hero > *` z-index lift went with it (no longer needed).
- **Contrast:** the ink/burgundy content (`--ink`, `--pink-i`) over the light `--pink-hero` (#f9e8e2) stays legible — no need to deepen the tint.
- Hero content styling (serif headline, burgundy italic emphasis, mono stat strip, the two buttons) unchanged.

**Commit:** `feat(todo): hero as diary raised-panel material, pink-filled`. Layout jsdom-unverified — Nick eyeballs the hero reads as a soft raised pink panel (not a gradient), legible.

## PHASE 4 completion — staged walkthroughs + nudge draft

**Gates:** `tsc` clean · `vite build` OK (targets `scriptally-dev`) · full Vitest **952** green (up from 943; +9 across the two new lib test files). `git status` shows only the ten Phase-4 files; **`App.tsx` untouched** (no bridge edit needed — the Urgent/Work-the-list buttons already lived in `ToDoPage`), **no PaintMode**.

### The settled principle — "stage only what can be un-staged"
The walkthrough queue is one-at-a-time. A step either **stages** (a deferrable payload; nothing persists until Save, so **← Back genuinely reverses it**) or **Opens** (an immediate side-effecting write, handled in the real drawer with its own undo toast, never entering the staged set). The split is pure and unit-locked:
- **`walkStepKind(card)`** (`src/lib/todoWalk.ts`) → `"mark-sent" | "nudge" | "open"`. `nudge_overdue` → nudge; `partial_requested`/`full_requested`/`revise_resubmit` → mark-sent; **everything else → open** (offer_received, housekeeping `data_quality_poor`/`no_response_close`, UserTask). `isStageable = kind !== "open"`.
- Rationale: mark-sent and nudge are the only cards whose write is a *fresh* record with no prior history to corrupt — safe to hold and batch. Offer/housekeeping/task all mutate existing state (status recompute, agent fields, task done/delete) where a staged-then-abandoned write would be a lie; those go through the proven drawer immediately.

### apply — per-item error isolation
**`applyStaged(items, handlers)`** loops the staged payloads, `try/catch` **per item**, returns `{ ok: string[]; failed: string[] }` (card keys). The walkthrough's `save()` wires `markSent → recordMaterialsSent` (throws on failure) and `nudge → logNudge(...).then(r => { if (!r.success) throw })` (logNudge resolves `{success}` rather than throwing, so the handler converts a `false` into a throw — otherwise a failed nudge would be miscounted as saved). Partial failure is reported honestly: `Saved N; M failed — check those items.` — never a silent partial success.

### One capture form, two shells (no drift)
**`src/components/todo/TaskCaptureForm.tsx`** (NEW) is the single mark-sent/nudge capture, `mode: "write" | "stage"`:
- **write** (drawer): calls `recordMaterialsSent` / `logNudge` immediately, then `onDone`. Buttons: "Mark sent" / "Log the nudge".
- **stage** (walkthrough): calls `onStage(payload)` — nothing persists. Buttons: "Stage →" / "Stage nudge →".
- Target status + `isResubmit` come from `getPrimaryAction(query.status)` (the shared `queryPrimaryAction` map — no per-type re-branching). mark-sent Save gated on `anyTicked`.
- `TaskDetail`'s Do-it step was rewritten to render this same form in write mode (dropped its own inline capture/`saveMarkSent`/`saveNudge`/draft state) — so the drawer and the walkthrough physically share one form.

### Nudge draft — shared helper (real de-dup, not a new copy)
Recon confirmed `NudgeModal.tsx` carried a **real inline draft**. Extracted verbatim to **`src/lib/nudgeDraft.ts`** (`nudgeDraft({ agentName?, dateSent? })` → the follow-up letter string, en-GB long date, "Dear {firstName}"/"Dear there" fallback). `NudgeModal` now imports it (inline draft deleted; `firstName` still used elsewhere). `TaskCaptureForm` uses the same helper. Draft is **display-only** — copy-to-clipboard; ScriptAlly never sends. Locked in `nudgeDraft.test.ts` (4 tests).

### The shell
**`src/components/todo/Walkthrough.tsx`** (NEW): centred modal (`.tdb-walk`, reuses `.tdb-scrim`). `index` cursor over `cards`; `staged` keyed by `cardKey`; `phase` walk→review. `goPrev` un-stages the previous step. An **Open** step renders the real `<TaskDetail>` (writes immediately, advances on close). A **stage** step renders `<TaskCaptureForm mode="stage">`. **Review** lists only staged rows (each ✕-removable) + one `Save N changes`. Close with staged items → `window.confirm` guard. `ToDoPage` wires **Urgent → `columns.do`** and **Work the list → today's cards**; CSS added under `todo.css` (`.tdb-walk*`, `.tdb-review*`).

### Files (10)
NEW: `src/lib/nudgeDraft.ts` (+ `.test.ts`), `src/components/todo/TaskCaptureForm.tsx`, `src/components/todo/Walkthrough.tsx`. EDITED: `src/lib/todoWalk.ts` (+ `.test.ts`), `src/components/NudgeModal.tsx`, `src/components/todo/TaskDetail.tsx`, `src/components/todo/ToDoPage.tsx`, `src/components/todo/todo.css`.

**Layout jsdom-unverified** — Nick eyeballs: the Urgent / Work-the-list buttons open the centred walkthrough; Stage → advances, ← Back un-stages, Open → launches the drawer and resumes on close, Review lists staged-only, Save reports honestly.

**Commit:** `feat(todo): staged walkthroughs + nudge draft`. **STOP for review** before Phase 5.

## PHASE 5 — housekeeping at scale (grouping · batch · mute · Pro assisted fill)

**Gates:** app `tsc` clean · **functions `tsc` clean** · `vite build` OK (targets `scriptally-dev`) · full Vitest **993** green (up from 952; +41 across three new suites). `git status` = 13 Phase-5 files; **`App.tsx` untouched**, **no PaintMode**.

### The rule model — finer than the task type
A "rule" is a single fixable gap, one level below the engine task type. The `data_quality_poor` task (one per agent) spans up to THREE rules; `no_response_close` is its own. Four total, in `src/lib/todoHousekeeping.ts` (`HK_RULES`):

| rule | from | agent/query field | assistable |
|---|---|---|---|
| `dq_responseTime` | data_quality gap | `responseTimeWeeks` | ✓ |
| `dq_materials` | data_quality gap | `materialsWanted` | ✓ |
| `dq_mswl` | data_quality gap | `mswlNotes` | ✓ |
| `no_response_close` | stale-query task | `updateQueryStatus(NO_RESPONSE)` | ✗ (a decision, not a fact) |

Grouping by the fine gap (not the task type) is what makes a batch homogeneous — every row in a pile needs the SAME field — which is also what makes assisted fill coherent (one field type per call).

### Grouping — expand, don't partition
`groupHousekeeping(hkCards, agents, muted)` expands each flat per-record card into per-RULE groups: a triple-gap agent joins all three `dq_*` groups; a no_response card joins the stale-query group. **`assembleBoard`/`todoBoard.ts` are UNCHANGED** — `columns.hk` stays the flat per-record list (so Today's-list + Help-me-pick keep working on individual items); grouping is a pure view computed on top and consumed only by the Housekeeping COLUMN, which now renders one card per pile (headline + member faces + "Fix these →").

### Two mute scopes, matching the two stores
- **Item** — "mute just this one" (per row in the batch drawer) → a `TaskFlag` snoozed to `MUTED_UNTIL` via the existing `upsertTaskFlag` (per-agent / per-query). Unchanged machinery.
- **Rule** — "Stop asking" (drawer footer) → the rule key appended to `User.mutedTaskRules` via `updateUserProfile`. Applied at ONE point — the engine's `activeTasks` filter in `db.tsx` (`taskSurvivesMute`) — so muting silences the reminder **everywhere** (board + dashboard attention chip read the same `tasks`). `data_quality_poor` dies only when ALL its remaining gaps are muted; every non-housekeeping task type is untouched. **Zero behaviour change when `mutedTaskRules` is empty** (the guard short-circuits).

### Batch-fix drawer (`HousekeepingBatch.tsx`)
One rule → all its records, one homogeneous field per row, one Save. Writes go through the EXISTING paths (`updateAgent` / `updateQueryStatus`) with **per-row error isolation** — a partial failure is reported (`Saved N; M failed — check those rows.`), never swallowed. Field editors per rule: weeks input · the four-material tick set · MSWL textarea · (no_response) a per-query "Close as no response" tick.

### ⚠️ Pro assisted fill — BUILT LIVE, gated OFF (the one deviation)
"Find these for me" is fully wired end-to-end: free → the Pro affordance (button reads "(Pro)", click → `/plans`); Pro → `fetchAssistedFill` → pre-fills each row's value AND shows its **provenance** ("✨ via web · {source}" + confidence). Assisted fill PROPOSES; the writer reviews every value before Save — it never writes.

- **Function BUILT:** `functions/src/assistAgentData.ts` (callable, europe-west2, **server-side Pro gate**, writes nothing) + pure core `assistAgentDataCore.ts` (web-search prompt, per-rule value shaping, provenance-mandatory validation, retry-once) + exported in `index.ts`. Mirrors `suggestComps` exactly. Anti-hallucination is hard-wired: the prompt insists omitting an agent beats inventing a value, and both the function core AND the client `validateAssistPayload` **drop any value with no `source`**.
- **NOT DEPLOYED, gated OFF (`ASSIST_LIVE=false`, `src/lib/assistFill.ts`).** This is the deliverable I could not make live, by two hard constraints: (1) **prod function deploys are Nick's only** — a brand-new callable can't exist server-side until Nick deploys it, so "Pro→runs" is impossible from here; (2) the **`ANTHROPIC_API_KEY` rotation is still unverified** (CLAUDE.md loose end) and must be confirmed before any Functions work. Until then a real Pro click lands on a graceful "Assisted fill isn't switched on yet" — never a fabricated value.
- **Go-live (Nick, in order):** ① confirm the `ANTHROPIC_API_KEY` rotation; ② `cd functions && npm install && npm run build && firebase deploy --only functions:assistAgentData`; ③ confirm the `web_search_20250305` tool version string is current for the SDK (the one thing I couldn't verify against the live API); ④ flip `ASSIST_LIVE` to `true` (or ship with the `__SA_ASSIST_LIVE` override). **Dev demo without deploying:** set `window.__SA_ASSIST_FILL_MOCK = { found: [{ agentId: "<id>", value: "6", source: "agency site", confidence: "high" }] }` in the console, then click — the prefill + provenance UX renders from canned data.

### Rules — NONE new
Everything Phase 5 writes is already in `firestore.rules` and **dev-deployed** (per memory, To-do rules landed on dev 9 Jul; **prod still pending — Nick's call**): `mutedTaskRules` in the user-update allowlist (line 465), `taskFlags.rule` (line 440), and the agent fields `responseTimeWeeks`/`materialsWanted`/`mswlNotes` (lines 513–515). The `assistAgentData` function writes nothing, so it needs no rule. No `firestore:rules` deploy is required for this phase.

### Files (13)
NEW: `src/lib/todoHousekeeping.ts` (+ `.test.ts`), `src/lib/assistFill.ts` (+ `.test.ts`), `src/components/todo/HousekeepingBatch.tsx`, `functions/src/assistAgentDataCore.ts` (+ `.test.ts`), `functions/src/assistAgentData.ts`. EDITED: `src/lib/db.tsx` (one-point rule-mute filter), `src/components/todo/ToDoPage.tsx` (Housekeeping column → groups + batch drawer), `src/components/todo/todo.css`, `functions/src/index.ts`.

### Known follow-ups (out of scope, flagged)
- **Help-me-pick still operates per-record on housekeeping** (it reads the flat `columns.hk`), so a picked hk item shows individually in Today and opens the per-record drawer — coherent, but a future pass could let it pick a whole pile.
- **Hero strip vs column badge:** the hero "N housekeeping" counts records; the column badge counts piles — locally consistent, deliberately not reconciled.

**Layout jsdom-unverified** — Nick eyeballs on dev: the Housekeeping column shows one card per rule with member faces; "Fix these →" opens the batch drawer; weeks/materials/MSWL editors save through the existing paths; "Mute" (row) and "Stop asking" (footer) both silence correctly; free users get the Pro affordance on "Find these for me".

**Commit:** `feat(todo): housekeeping grouping + batch + Pro assisted fill`.

## RE-LAYOUT — columns → three horizontal lanes (design ref: todo-lanes-full-cards.html)

**Gates:** `tsc` clean · `vite build` OK (targets `scriptally-dev`) · full Vitest **997** green (+4 view-model cases). **Presentation + `todoBoard.ts` view-model only** — the task engine, `taskFlags`, `recomputeQuery` and every write path are UNTOUCHED (`git status` = design-ref + `todoBoard.ts` (+`.test`) + `ToDoPage.tsx` + `todo.css`; no `db.tsx`, no rules, no functions). **`App.tsx` untouched → no PaintMode risk; `git diff --cached` carried no PaintMode.**

### ⚠️ Sequencing — this ran AFTER Phases 4 & 5, not before
The pack was written to run *before* `todo-phase-4-5.md`, but those already shipped (`c7175da`, `b3885a8`). Not a blocker — the pack pre-answers it: grouped housekeeping renders grouped cards into the **Housekeeping lane** (done — `renderGroupCard` now draws the mockup's `.gcard`: big count + blurb + monogram stack + "Fix together →"/"Review →"), and the Phase-4 walkthroughs are modals, unaffected. I adapted the already-built Phase 5 cards into the lane rather than the reverse.

### Board — three lanes, cleared-lane removed
Four-column grid → three stacked horizontal lanes (`Do next` pink · `Housekeeping` gold · `Your tasks` note-yellow, in that order — Do-next on top at load). Each lane = coloured header band (title + count, `＋` on Your tasks) over a horizontal card scroller. A module-level `Lane` component owns the scroller ref + a `ResizeObserver`/scroll-listener overflow check that toggles the right-edge fade (`.tdb-track.more`) and a header **chevron** that scrolls the lane right. The **"Cleared today" column is gone** — completions now live in the Today's-list done-band.

### Card — full detail, clip-safe (the recurring spill bug, called out)
The full-detail card is restored (tags → serif-italic-burgundy title → subtitle → StatusDot+monogram+record meta → two pills). **Clip-safety is structural, not hopeful:** `.tdb-tile` is a fixed 176px `overflow:hidden` flex column where **`.tdb-tags`/`.tdb-tt`/`.tdb-tmeta`/`.tdb-tacts` are all `flex:none` and only `.tdb-tsub` is `flex:1 1 auto; min-height:0` (2-line clamp)** — the subtitle is the sole flexible element, so it absorbs and clips any overflow. The pills (`.tdb-tacts` `flex:none`, each pill `flex:1`, `white-space:nowrap`) are structurally unable to be pushed out or wrapped. **Same treatment on `.tdb-gcard`** (count/`.tdb-gt` `flex:none`, `.tdb-gs` blurb `flex:1` clamp, `.tdb-gstack` pinned). The two pills still do exactly what they did — commit / mark-done; body-click still opens the drawer. No behaviour change.

### Today's list — committed band + done band (the day's record)
Header carries two pills: **`N committed`** (pink) + **`N done`** (sage) — independent counts. **Committed band** = lane cards with `committedDate === today` (internal scroll, capped; a dashed "commit up to 5" prompt when there's room; each row has its StatusDot/dot + record + ✕ release). **Done band** = the existing `clearedToday` union, **struck-through, newest-first**, each row showing what-it-was + source + time (`fmtTime`, "just now"/"9:12am"), the full log with internal scroll. Footer keeps **Help me pick** + **Work the list** (disabled with nothing committed). The panel is fixed-height with internal scroll in *both* bands — it never grows the shelf. The 5-cap governs committed only; done is uncapped.

### Scroll model (not regressed)
`.tdb-wrap` keeps `flex:1; min-height:0; overflow-y:auto` — the page scrolls **vertically** in the shell when three lanes exceed the viewport, Do-next pinned on top. **No `height:100vh`/`overflow:hidden` clamp** was reintroduced (the earlier bug). Lane scrollers are `overflow-x:auto; overflow-y:hidden` (horizontal only) — different axis from the page, so no nested/trapped vertical scroll. The Today panel's two internal vertical scrollers are bounded by the fixed shelf.

### View-model reshape (`todoBoard.ts`)
`assembleBoard` now returns `{ do, hk, nt, cleared }` (renamed from `BoardColumns.done` → `AssembledBoard.cleared`) — three lanes + the cleared union re-projected (same reads, no new store, no write), newest-first, each cleared card carrying a `whenMs` for the done-band. New pure `todaySplit(board, today)` → `{ committed, done }` (committed = lane cards `committedDate === today`, the 5-cap set; done = the cleared union) so the two bands + counts are testable data. **Tests (logic, not pixels):** three lanes + `cleared` is not a lane; the cleared union equals the prior union (one completion → one item) and is whenMs-stamped newest-first; committed = today-only (excludes rolled-over + uncommitted); the two counts are independent.

### Bonus fix — a CSS collision I introduced in Phase 4
`.tdb-walk` was doing double duty: the Today-footer **"Work the list" button** AND the **walkthrough modal** (added in `c7175da`) — so the button silently inherited modal styles (`width:560px; display:flex`…). Renamed the button to **`.tdb-worklist`** (component + CSS); the modal keeps `.tdb-walk` (Walkthrough.tsx untouched). Collision gone.

### Judgement calls (flagged, not silently taken)
- **Hero:** kept the **solid pink option-B material** (`--pink-hero` + `--float-*`), slimmed for the 280px shelf. Did NOT reintroduce the mockup's `backdrop-filter` glass — a prior RED-GATE locked the hero to solid-not-glass ("no glass recipe to reuse"). "Keep the pink-glass hero" read as "keep the existing pink hero". Say the word if you want the glass back.
- **Shelf height 214 → 280px:** the mockup's 214px only fits its shown state (1 committed row). With a full committed band (5) capped + the done band, 214 squeezes done to nothing. 280 keeps both bands usable while still slimming from the old 344. Flagged.

### Note for Phase 6 (mobile — do NOT build here)
The parked mobile plan was a segmented control designed for *columns*. With lanes, reconsider: lanes could collapse to a stacked single-column carousel per lane, or the segmented control could still apply. **Nick's call** — not built.

**Layout jsdom-unverified** (auth-gated F12 board; the preview harness can't log in) — **Nick eyeballs:** three lanes with Do-next on top, full-detail cards with pills sitting cleanly inside, horizontal lane scroll with the fade+chevron on overflow, the Today's-list committed/done bands, and that the page scrolls vertically without the old clamp.

**Commit:** `refactor(todo): board columns → three horizontal lanes + Today done-band`.

## RE-LAYOUT 2 — ribbon header + corner Today's-list pop-up (design ref: todo-board-final.html)

**Gates:** `tsc` clean · `vite build` OK (targets `scriptally-dev`) · full Vitest **1001** green (+4). One commit. **Presentation + view-model only** — the task engine, `taskFlags`, `recomputeQuery`, the `UserTask` schema and every write path are UNTOUCHED; **renames are UI labels only** (`UserTask`/`tasks`, task types, enums unchanged in code). `App.tsx` untouched → **no PaintMode; `git diff --cached` carried none.**

### STEP 0 recon findings
1. Tree clean at `a2ab259`. 2. `todoBoard.ts` yields **three lanes + the cleared union** (not four columns — the lanes pass had already landed; this pack layers the ribbon + corner pop-up on top); committed = `taskFlags.committedDate === today`; `clearedToday` = the computed union. 3. The hero was the **solid pink option-B raised-panel material** (`--pink-hero` + `--float-*`) — "the pink-glass treatment" in this codebase IS that material (the earlier RED-GATE established there is no `backdrop-filter` glass anywhere; Nick chose solid; twice re-flagged since without objection). The ribbon reuses it. 4. **The corner is occupied by the AppShell's global help "?"** — `fixed; bottom:20; right:20; 38×38; z-30`, desktop-only (AppShell.tsx ~line 174). 5. Card actions confirmed (pills → commit / mark-done with derived→drawer + note→instant-tick; body-click → drawer) — restyled only, behaviour identical.

### What changed
- **Ribbon** (`.tdb-ribbon`, ~64px): "What's on your desk?" (Playfair) · three lane-coloured metric tiles (**urgent** pink / **housekeeping** gold / **notes to self** note-yellow, serif count + mono label) · one primary **"Work through priorities now"** → the walkthrough over the Urgent set (the old Urgent action, renamed; disabled when empty). **Removed: the tall hero, "See all queries", and the global "＋ Add a task"** — the tools row is Filter/Sort only; the Notes lane's header ＋ (plus its empty-state ghost) is the only add path.
- **Lanes renamed:** Urgent · Housekeeping · **Notes to self**, Urgent pinned top. **Counts are GAPS, not piles** — the ribbon tile and the Housekeeping lane badge both read `hkGapCount(hkGroups)` (sum of group members; the mockup's 25 = 12+9+4), resolving the records-vs-piles inconsistency flagged in the last pass. Both tile and lane header read ONE `tiles` object (`ribbonTiles`) — equality by construction, pure parts unit-locked.
- **Note cards** picked up the mockup's treatment: `Note · 6 Jul` tag (due date, else jotted date — `userCard` copy in the view-model), note-tinted border/tag/dot (`.tdb-tile.nt`, defined before `.today` so a committed note still shows the pink committed edge).
- **Today's list → corner pop-up.** Collapsed: a fixed dark FAB — conic progress ring (inner `done/total`, "–" when empty) + "Today's list" + `N committed · M done`, plus a small gold ● when items have rolled over (they'd otherwise be invisible until the panel opens). Ring/footer share = the pack's **M ÷ (open-committed + M)** — `todayProgress(committedN, doneN)`, so the FAB ring and the panel footer can't disagree; the old committed-only `doneFromList` computation is gone from the page. Expanded: the panel rises from the corner (180ms, `transform-origin: bottom right`, reduced-motion off) — header pills (pink committed / sage done, independent counts) + ✕ · the **rollover Keep/Clear bar** (relocated here) · committed band (internal scroll, dashed commit-up-to-5 prompt, ✕ release, 5-cap on committed only) · "Done today" divider · **done band** (the full `clearedToday` union log, struck-through, newest-first, what + source + time, internal scroll, uncapped) · footer (Help me pick / Work the list, disabled when nothing committed).
- **FAB collision handling:** the Today FAB sits at **`right:70; bottom:20; z-30`** — left of the help "?" (`right:20`), same bottom line, no overlap. The expanded panel anchors `right:20; bottom:20; z-40`, deliberately covering the corner (help included) only while open; drawer/walkthrough scrims (z-50) still cover the panel. `.tdb-wrap` bottom padding grew to 88px so the last lane clears the corner controls.

### Clip-safety (the recurring spill bug — unchanged discipline, re-asserted)
Cards stay fixed-height (174px per this mockup, was 176) `overflow:hidden` flex columns: tags/title/meta/pills all `flex:none`, **only the subtitle is `flex:1 1 auto; min-height:0`** (2-line clamp) — it absorbs and clips any overflow; the pills are `flex:none`, `white-space:nowrap`, each `flex:1`, structurally unable to wrap or be pushed out. Same on the grouped card (`.tdb-gcard`: count/title pinned, blurb clips, stack+action row pinned).

### Scroll model (not regressed)
`.tdb-wrap` keeps `flex:1; min-height:0; overflow-y:auto` — vertical page scroll in the shell, Urgent on top, **no `100vh`/`overflow:hidden` clamp**. Lanes scroll horizontally (`overflow-x:auto; overflow-y:hidden`) — different axis, no nesting/trapping. The pop-up's two bands scroll internally within its fixed height; the FAB/panel are `position:fixed`, out of flow. (Known transient: during StagePage's ~250ms enter animation the stage transform makes fixed elements slot-relative — pre-existing, shared with the help "?", self-clears.)

### View-model
`ribbonTiles(board, housekeepingGaps)` in `todoBoard.ts` (urgent/notes = lane lengths; housekeeping = the gap count passed in — `todoHousekeeping` imports `BoardCard` from `todoBoard`, so the counter lives in `todoHousekeeping.hkGapCount` to avoid a circular import; **that file's diff is the additive 9-line helper only — `taskSurvivesMute`/engine bits untouched**). Tests: tiles equal lane counts + gap passthrough (`todoBoard.test.ts`), gaps-not-piles + muted-rules-reduce (`todoHousekeeping.test.ts` — Ann 3 + Bo 1 + stale 1 = 5 over 4 piles). Prior invariants re-locked: three lanes/no cleared column · union unchanged (one completion → one item) · committed = today-only · counts independent.

### Judgement calls (flagged)
- **`todo-todaylist-placement-sketches.html` was ABSENT** (not in Downloads) — the expanded pop-up is built from the pack's §4 prose + the carried-over band internals (which already matched that anatomy). Only `todo-header-final.html` is committed (as `design-refs/todo-board-final.html`). Supply the sketches file if the pop-up needs restyling to match sketch 1 exactly.
- **"Pink-glass" = the locked solid material** (see recon 3) — the ribbon does not introduce `backdrop-filter`. Radius `--r-lg` (12px, per the mockup's bar) rather than the hero's 22px.
- **Grouped housekeeping cards KEPT** (the pack's "individual cards for now" pre-dates Phase 5, which shipped; the pack's own finalise note names grouped-in-lane as the end state and the mockup draws grouped cards). No grouping code was built or changed here.
- **Rollover bar** lives inside the pop-up (its old shelf home is gone) + the FAB gold ● so rolled items aren't invisible while collapsed.
- **Drag-to-commit: not built** (the pack marks it optional; the ＋ pill is the commit gesture).

### Notes forward
- **Phase 4/5 pack:** grouped housekeeping already renders into the Housekeeping lane; walkthroughs (modals) unaffected — nothing to redo.
- **Phase 6 (mobile):** the old segmented-control plan was designed for columns — with lanes + a corner pop-up it needs a rethink (per-lane carousels vs the segmented control; where the FAB sits above the BottomTabBar). **Nick's call — not built.** (Below `md` the help "?" hides; the FAB currently keeps `right:70` regardless — fold into the mobile pass.)

**Layout jsdom-unverified** (auth-gated F12 board) — **Nick eyeballs:** the ribbon + tiles, three renamed lanes with Urgent on top, clip-safe cards (pills inside), the corner FAB collapsed (ring + counts) and expanded (committed/done bands), no collision with the help "?", and vertical page scroll without the old clamp.

**Commit:** `refactor(todo): ribbon header + corner Today's-list pop-up`.
