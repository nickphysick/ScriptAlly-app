# To-do — Journey Redesign (focus flow + quick actions + ink header)

Pack: supersedes `todo-phase-4-5.md` (its walkthrough → the focus flow; its housekeeping → Phase E).
Base: the board re-layout — lanes `a2ab259` → ribbon + corner pop-up `7b2492c` → the P4/P5 re-issue
deltas `abfa1fd`/`33f8d61` (all on `main`, dev-deployed 16 Jul).

## ⛔ RED-GATE — Phases B, C, D, E STOPPED: design refs missing

The pack's first red-gate is explicit: *"Any design ref above missing from `design-refs/` "*
("commit these to `design-refs/` first — red-gate if missing"). At build time (16 Jul, ~16:00):

| Ref | Phase(s) it governs | design-refs/ | ~/Downloads |
|---|---|---|---|
| `todo-focus-flow.html` | **B** (the focus flow — source of truth) | absent | **absent** |
| `todo-quick-actions-v2.html` | **C** (quick rail) + **D** (sweep-bar placement) | absent | **absent** |
| `todo-header-ink.html` | **A** (header) | absent → **committed this pass** | present ✓ |
| `todo-todaylist-placement-sketches.html` | Today pop-up ("unchanged") | absent | absent (absent across all three packs) |

**Phase A proceeded** (its source of truth in hand, self-contained, presentational). **Phases B–E did
not start**: the focus flow's sheet-on-desk surface, per-type journey layouts, celebration screen,
review sheet, quick-rail anatomy, receipts, card-flip, never-fork and sweep bar are all defined by
the two missing mockups the pack names as source of truth — building them from prose alone is
exactly the guessing the red-gate forbids. **To unblock: drop `todo-focus-flow.html` and
`todo-quick-actions-v2.html` (and ideally the sketches file) into `~/Downloads` and re-issue.**
Nothing from the superseded pack was un-built — the drawer/walkthrough/batch surfaces stay live and
working until the focus flow replaces them.

## STEP 0 — recon (all items, reported before touching)

1. **Tree clean** at `33f8d61`; the re-layout base is fully landed — three lanes (`a2ab259`), ribbon
   header + corner Today FAB/pop-up (`7b2492c`).
2. **Surfaces + launch sites** (all become focus-flow launches in Phase B): `TaskDetail` (side
   drawer) ← ToDoPage card click, committed-row click in the pop-up, Mark-done-on-derived, and the
   Walkthrough's "Open" step; `Walkthrough` (centre modal) ← the ribbon's "Work through priorities
   now" (Urgent set) + the pop-up's "Work the list" (committed set); `HousekeepingBatch` (centre
   modal) ← the grouped hk cards' "Fix together →". No other importers exist. *(Phase E note: the
   pack's "do not build a third batch surface" means `HousekeepingBatch` also folds into the Phase
   B/C surfaces when they land.)*
3. **Capture/apply primitives confirmed:** `StagedPayload` (mark-sent carries date/method/materials;
   nudge carries checkBack/note) + `applyStaged` per-item error isolation (`src/lib/todoWalk.ts`);
   the ONE capture form `TaskCaptureForm` (write | stage modes — drawer + walkthrough share it);
   `editActivity` + `deleteActivity` live in `db.tsx` (:250/:252) — undo-by-deletion is available.
4. **Nudge draft: REAL, not a stub** — `src/lib/nudgeDraft.ts` (extracted from NudgeModal's real
   generator; consumed by NudgeModal + TaskCaptureForm; unit-locked). No red-gate. *(Phase B
   enrichment noted: it drafts from agent name + dateSent; the pack also wants materials woven in.)*
5. **Housekeeping keys/fields:** `agentDataQualityNeeds` → responseTime (the `===0` stub only;
   absence = deliberate "Unknown") / materials / mswl; stale = `no_response_close`. Agent fields:
   `mswlNotes`, `materialsWanted`, `responseTimeWeeks` + `noResponseMeansNo`. **Pro hook =
   `isProUser`** (suggestComps.ts, re-exported by assistFill.ts) + the canonical PRO pill →
   `/plans`. **Functions entry = `assistAgentData`** (europe-west2; built + exported; client live
   behind `ASSIST_LIVE=true` with a 25s timeout; **the function deploy itself is still Nick's — not
   yet run**). Provenance persistence (`Agent.fieldSources`) is in types + rules; rules deployed to
   DEV 16 Jul, prod pending.
6. **`#/pkg-lab`**: fenced behind `import.meta.env.DEV` (App.tsx:466) — noted, no action.

## PHASE A — ink header ✓ (built this pass)

Per `design-refs/todo-header-ink.html` (committed): `.tdb-ribbon` → **white ground · 1.5px solid
ink border · FLAT (shadow removed) · radius 14 · padding 17/24 (~86px)**; left = the new mono date
line ("Thu 16 Jul", `shortHeaderDate`) over "What's on your desk?" at **Playfair 23/600**; tiles
gain the **soft lane fills** (pink-t/gold-t/note-t + matching 1px borders, serif values 17px);
the "Work through priorities now" button untouched (already ink fill). **Scope honoured: this bar
only** — lanes/cards/FAB keep the F12 hairline grammar (no other selector touched). The pink-glass
material is removed from this bar only; the `--pink-hero`/`--float-*` tokens stay defined (shared
utility) — this bar just stops consuming them. **No token changes → `themes.md` untouched (per the
pack's "expect no change").**

**Gates:** `tsc` clean · `vite build` OK · Vitest **1013** green. `App.tsx` untouched → no
PaintMode. Files: `design-refs/todo-header-ink.html` (NEW), `ToDoPage.tsx` (askwrap + date line),
`todo.css` (the ribbon block only), this report.

**Commit:** `feat(todo): ink header`.

**Nick eyeballs (dev, after a deploy):** the white ink-bordered bar with the date line + 23px
question + tinted tiles; confirm the ink border appears nowhere else (lanes/cards/FAB unchanged).

## Phase 6 / forward notes (from recon, for when B–E unblock)

- The focus flow's "queue of one" replaces the drawer; the drawer's deep-dive job is carried by the
  why-screen's "Open the full query →" link — `onNavigate("queries", queryId)` already exists on
  the drawer's why step, so the link is a lift, not new wiring.
- Quick-✓'s "one write path" assertion can be tested at the `StagedPayload`/`recordMaterialsSent`-
  args level (the capture payload builders are already pure).
- Mobile (Phase 6): the rail needs always-visible/swipe treatment; sweep needs a touch grammar; the
  corner FAB sits at `right:70` beside the (desktop-only) help "?" — fold into the mobile pass.
