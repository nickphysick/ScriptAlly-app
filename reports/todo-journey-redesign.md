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

## 🔓 RED-GATE LIFTED — Nick supplied the refs (16 Jul, ~16:00)

All three missing mockups landed in Downloads and are committed: `todo-focus-flow.html`,
`todo-quick-actions-v2.html`, `todo-todaylist-placement-sketches.html`. Phases B–E resumed.

## PHASE B — the focus flow (replaces the drawer AND the walkthrough modal — and the batch drawer)

**Gates:** `tsc` clean · `vite build` OK · Vitest **1019** green (+6). Engine/write paths/App.tsx
untouched; no PaintMode.

**Surface choice (recon decided, as the pack asked):** a full-viewport OVERLAY hosted by ToDoPage
(`.tdb-ff`, fixed inset-0 on the oat ground) — NOT a route. The flow needs the board's live
data/handlers, exit is a state flip, and a transient route would need registering across the six
locked nav surfaces for no benefit.

**Built (per `todo-focus-flow.html`):** chrome ("✕ Back to the board" with a staged-count confirm
guard · progress dots, done=sage/current=burgundy · "N OF M"/"REVIEW" · the sage "N staged —
nothing saved yet" pill) → the stage (620px paper sheet, arrive/leave CSS animations, reduced-motion
kills them; 1–2 decorative queue sheets peeking behind, thinning as the queue drains) → per-type
journeys:
- **Send** (mark-sent incl. R&R): why (stream chip + due · serif question · subtitle · who row ·
  timeline chips with REAL `StatusDot`s · **"Open the full query →"** — the drawer's deep-dive job,
  exit-guarded then `onNavigate("queries", id)`) → what went out (tick-cards from
  `materialOptsForTask`; Save-gated) → when/how (+optional note) → **staged**. Skips: Leave it ·
  Snooze (a STAGED stance).
- **Nudge**: why (days silent + the agent's stated window when known) → the REAL draft — the shared
  `nudgeDraft` generator, now ENRICHED (manuscript title + requested-material prose from the query's
  status, e.g. "you kindly requested the full manuscript"; base case byte-identical, unit-locked) +
  Copy + "ScriptAlly never sends anything for you" + date/method (audit fields) → **staged**
  (check-back defaults +14 days — the mockup surfaces date/method, not check-back; noted).
- **Offer**: celebration (confetti glyphs · italic serif "X wants to represent you." · Caveat aside)
  → next-steps (notify-the-others copy) → "Record the offer & notify the others" launches the
  EXISTING `RecordResponseFocusForm` (immediate write) or "I'll deal with this outside the flow".
  **Offers are never staged.** (Micro-deviation: "Before you answer…" not the mockup's gendered
  "…him".)
- **Housekeeping grouped**: payoff framing (+ the ported "n muted — show"/Unmute) → rapid batch
  rows in-sheet (chips per rule · other-input · queried pip · skip freely) → "Save N & continue" =
  IMMEDIATE write (data entry, not a stance) with per-row isolation + the Undo-all toast. The
  **assisted fill (Pro) was CARRIED OVER here** from the batch drawer rather than parked until
  Phase E — the pack's E assumed assist wasn't live yet; regressing a shipped live feature for
  three phases would be worse (flagged as a deliberate phase-boundary deviation). "Never ask"
  stages a rule-mute.
- **Housekeeping single-agent** (a committed dq card in Work-the-list): payoff → the agent's own
  missing fields → Save & continue (immediate `updateAgent` + flag resolve — the old
  DataQualityBody, reborn as a sheet).
- **Stale query**: why → choices: Close as no response (IMMEDIATE `updateQueryStatus`, toast Undo =
  `undoQueryStatus` — the existing delete-the-activity path) · Still waiting (staged snooze) ·
  Stop asking (staged item-mute).
- **Note**: single screen — editable note, Keep it (saves an edit) / ✓ Mark it done (immediate).
- **Review**: staged-only list with verb chips (**Done/Snoozed/Noted**), ✕ per row, one Save →
  `applyStaged` (per-item isolation; failures stay listed + toast, never silent) → "N saved. Desk
  cleared." Empty-handed: **"Desk walked."**

**Staged model extended (pure, unit-locked):** `StagedPayload` gains the STANCE kinds — `snooze`
(→ `dismissTask` fixed 7-day), `mute-item` (→ `upsertTaskFlag` MUTED_UNTIL), `mute-rule`
(→ `mutedTaskRules`) — all deferrable, so Back genuinely un-stages them; Back across an item
boundary un-stages that item. **One write path anchored in code:** `markSentWriteArgs` /
`nudgeWriteArgs` produce the EXACT `recordMaterialsSent`/`logNudge` args (audit fields stripped
identically for every caller) — the quick paths (Phase C) will feed the same builders.

**RETIRED (deleted, not stubbed):** `TaskDetail.tsx` (the drawer), `Walkthrough.tsx` (the centre
modal — the clipped-checkbox bug dies with it), `TaskCaptureForm.tsx` (its capture logic lives on
as `materialOptsForTask` + the payload builders), **and `HousekeepingBatch.tsx`** (the pack's "do
not build a third batch surface", brought forward — the sheet is the batch surface; the card-flip
follows in C). Every launch site now opens the flow: card click (queue of one), the ribbon's "Work
through priorities now" (Urgent set, lane order), the pop-up's "Work the list" (committed set),
committed-row click, the grouped card. All the retired components' CSS blocks were pruned
(`tdb-drawer-x`/`tdb-pip`/`tdb-propill` kept — the pop-up ✕, the queried pip, the Pro pill).

**Commit:** `feat(todo): focus flow replaces drawer + walkthrough`.

## PHASE C — quick rail + Mark-done retirement

**Gates:** `tsc` clean · `vite build` OK · Vitest **1027** green (+8). Engine untouched; no PaintMode.

**The rail** (per `todo-quick-actions-v2.html`): hover top-right of every card AND grouped card —
two 30px shadowed buttons ✓/⏸, keyboard-reachable (`:focus-within` shows the rail). **Offers get
no rail** (they always take the moment).

**✓ per type — one write path, stated defaults:** send/nudge quick-✓ builds
`quickSendPayload`/`quickNudgePayload` (today · the query's own `sendMethod` else Email ·
everything they asked for · check-back +14d) and writes through the SAME
`markSentWriteArgs → recordMaterialsSent` / `nudgeWriteArgs → logNudge` as the journey —
**byte-identical write args unit-locked**. The card flips to a sage RECEIPT whose line derives
from the actual payload (`receiptLine`, unit-locked: "Logged: today (16 Jul) · via email ·
everything they asked for." — a subset lists what was really logged) + "Wrong? Fix it before you
move on." + **Edit details** (undoes the quick write, re-opens the focus sheet PRE-FILLED with
what was logged — save writes once, honestly) + **Undo**; the toast carries Undo too. Stale-query
✓ → "closed — no response" receipt ("not a rejection, so your response rate stays honest").
Grouped ✓ → the card flips to the inline rapid chip-fill (rows × chips · "X OF N" · Cancel /
Save N) — **the SAME batch save as the sheet**: both call the new `saveHkRows` (`src/lib/hkSave.ts`,
extracted from the Phase-B sheet — no third write path). Note ✓ ticks immediately + receipt.
**Undos are deletions/unwinds, never compensating entries:** send/stale → `undoQueryStatus` (the
existing delete-the-activity path); nudge → `deleteActivity` on the created NUDGE_SENT (recon:
that primitive already fully unwinds a nudge — twins, `nudgeDate` re-derive with `deleteField`,
flag release); note → `done:false`; batch → the captured previous values.

**⏸ per type:** Urgent cards → snooze 7 days (`dismissTask`); **Notes** → the stance store covers
them too — a `user_task` TaskFlag (NEW: `USER_TASK_FLAG_TYPE`; `assembleBoard` now filters
suppressed notes, unit-locked — no schema change, the flag store is the stance store). Dismissed
card state: "Snoozed — back in a week." + Undo + **Never ask** (→ MUTED_UNTIL). Housekeeping ⏸
**forks in-card**: Not now (a week) / Never — this one (item flags) / Never — any agent missing
this (`mutedTaskRules`); the muted toast states plainly "nothing deleted, the gap still shows on
the profile", and the lane's muted-rules strip remains the rule-unmute recovery.

**Receipts/dismissed render as STANDALONE cards** — a quick write makes the live derived card
vanish on recompute, so the receipt persists independently in its lane (the mockup's flip,
translated to a live-derived board). Fork/flip replace a still-live card's body.

**Card face:** the **Mark-done pill is GONE everywhere**; ＋ Today's list is full-width.
Completion = rail or sheet; committing = the visible button.

**Commit:** `feat(todo): quick rail; retire Mark done pill`.

## PHASE D — sweep mode

**Gates:** `tsc` clean · `vite build` OK · Vitest **1027** green (no new pure logic — sweep
orchestrates the already-locked Phase-C builders). Engine untouched; no PaintMode.

**The speed grammar, inside the focus-flow frame** (`mode="sweep"` on FocusFlow): one card-summary
per screen with BIG one-tap actions + kbd hints. **Keyboard:** `D` done · `S` snooze · `→` skip
(Urgent + Notes); Housekeeping: `F` fix (drills into the SAME in-sheet chip-fill as the journey —
`setStep(1)` on the journey renderer, no parallel surface) · `S` · `N` never (the fork: just these
agents / any agent missing this) · `→`; keys are inert while typing. **Sweep quick-✓s use the
Phase-C defaults + write IMMEDIATELY** through the same builders
(`quickSendPayload`/`quickNudgePayload` → the one write path); a **brief inline receipt**
(`receiptLine`, ~900ms) shows before advancing, and **Undo rides the toast** (undoQueryStatus /
deleteActivity-unwinds-the-nudge / done:false). Nothing stages in sweep — the end screen reads
**"Lane swept."** **Offers in a swept lane** render "This one needs the moment — no quick anything
for an offer" with `Enter` opening the full offer journey (never quick-actioned).

**Entry:** a QUIET mono "Sweep ⇥" affordance in each lane header (the pack said per-lane-header +
keep-it-quiet; the ref's standalone sweep bar was louder — the header placement wins, flagged).
Urgent sweeps `board.do`; Housekeeping sweeps the grouped piles + individual stale cards; Notes
sweeps the notes.

**Commit:** `feat(todo): sweep mode`.
