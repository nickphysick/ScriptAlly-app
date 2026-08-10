# Query Centre — create mode v3

Audit-first run against `main`. Scope was narrowed by Nick's five resolutions before any code was
written; this records what was audited, what was built, and what the audit got wrong.

**Commits** — `435fe45` P1 · `76a1923` P2 · *(P3 closed with no commit)* · `9355390` P4 ·
`27cbb90` P5 · `f5ac920` P6 · `61924e7` a correction (below). Gates green before each: `tsc
--noEmit`, `vite build`, full Vitest. Suite **3,523** at close, from 3,481 at P1.

**Not deployed.**

---

## Step 0 — ownership

Branch `main`, scope clean: `git status` on `src/components/queries/`, `src/lib/create*`,
`agentContext.ts`, `quickPicks.ts`, `queryDraft.ts`, `agentMaterials.ts` and `AgentSearchField.tsx`
returned nothing. No other stream held uncommitted work in create mode. Two other sessions were
live in this checkout throughout (dashboard, shell), in separate worktrees.

**The `+1,172 −895` diff could not be reproduced and no longer exists.** Nothing on `main` matches
it — `b4837c2` is +521/−797, `6cac331` +516/−56, the tree at audit time +94/−1675. It was almost
certainly a snapshot of the To-do stream's uncommitted work, which has since landed as `5864896`,
`7c82d07`, `1fb0f0e`, `f40d38c`. Accounted for by elimination, not verified.

**The design ref was already committed** (`3b62b3e`), so Step 1's first act was a no-op.

---

## The audit, and its dispositions

Only the eight areas that survived the five resolutions are listed. Everything else was resolved
ALREADY CORRECT without re-checking, per instruction.

### Phase 1 — collapsed rows and the panel column · `435fe45`

| behaviour | verdict | disposition |
|---|---|---|
| Row states its value once complete | ALREADY CORRECT | left alone |
| Value right-aligned, with chevron | MODIFY | implemented |
| `EDIT` affordance, hover-revealed | MODIFY | implemented, **plus `:focus-visible`** |
| Sage tick dot on completed rows | ALREADY CORRECT | left alone |
| Panel column fixed 322px | MODIFY | implemented |
| Panel column sticky on scroll | BUILD | **overturned — already true; see below** |

### Phase 2 — the picker · `76a1923`

| behaviour | verdict | disposition |
|---|---|---|
| Remove the combobox popup | BUILD | implemented (`AgentPicker`) |
| Autofocus opens nothing | MODIFY | implemented |
| Card grid `auto-fill` min 196px | BUILD | implemented |
| Card: tag + response time | MODIFY | implemented |
| Field filters in place | BUILD | implemented |
| ↓ · arrows · Enter · Esc | BUILD | implemented |
| Grid carries listbox ARIA | BUILD | implemented |
| Helper beside the field | MODIFY | implemented |
| State 1 heading, count, "See all →" | MODIFY | implemented |
| State 2 all-queried | BUILD | implemented |
| State 3 cold start | BUILD | implemented |
| No art in states 1 or 2 | MODIFY | implemented |

### Phase 3 — closed with no commit

Both its changes were withdrawn by Nick (the `FOR REFERENCE · NAME` caption, the "Not stated"
cell). The sticky column moved into P1. Everything else in the phase audited ALREADY CORRECT: the
component is extracted, the strip is two cells, captions wrap, the policy line omits, body rows
omit, the panel never renders an empty shell. **The footer's "Open full profile →" was read as out
of scope** — it isn't in the survivor list, and changing it would drop the freshness stamp.

### Phase 4 — the nudge · `9355390`

Every row implemented. The model changed shape: `{ kind: "suggested" }` → `{ kind: "preset",
weeks }`.

| behaviour | verdict | disposition |
|---|---|---|
| Presets 6 / 8 / 12 wks | MODIFY | implemented, + the agent's own figure as a fourth chip when it isn't one of the three |
| Custom-date chip inline | MODIFY | implemented |
| Custom deselects presets | BUILD | implemented |
| **Clear** in the popover foot | BUILD | **overturned — already existed**; `variant="hub"` has carried a Clear/Done footer since it was built |
| House 8-week fallback | BUILD | implemented (`HOUSE_NUDGE_WEEKS`) |
| Derived copy names it a default | BUILD | implemented |
| Never falls through to "no nudge" | BUILD | implemented |
| Derived line always reports the date | MODIFY | implemented |
| Custom reports the interval back | BUILD | implemented |
| Mono footnote in both popovers | BUILD | implemented (`BrandDatePicker.footnote`, additive) |
| Sent-date change recalcs presets only | BUILD (unconfirmed) | implemented — **free under the new model**, and tested |

### Phase 5 — materials and `CREATE_QTY` · `27cbb90`

| behaviour | verdict | disposition |
|---|---|---|
| `CREATE_QTY` forked; `MAT_QTY` untouched | BUILD | implemented, both asserted |
| `max(bound, statedRequirement)` | BUILD | implemented (`effectiveMax`) |
| Show the current step beside the field | BUILD | implemented (`stepLabel`) |
| ↑/↓ when focused | MODIFY | implemented |
| Off-step → next clean multiple | MODIFY | implemented (37 → 40) |
| Arrows disable at bounds | MODIFY | implemented (`canStep`) |
| Strip on focus / reformat on blur | BUILD | implemented |
| Typed values never snap | ALREADY CORRECT | left alone, re-asserted |
| Sub-label reports the requirement | BUILD | implemented |
| Requested / Not requested tag | BUILD | implemented |
| Unticked rows grey controls | MODIFY | implemented |
| Snap-not-convert | ALREADY CORRECT | left alone |
| Row: checkbox · name · sub-label · controls right | MODIFY | implemented |
| Other: Enter → removable chip | MODIFY | **deferred — see below** |
| Summary line + collapsed item count | MODIFY | **deferred — see below** |

### Phase 6 — the standing rule · `f5ac920`

| behaviour | verdict | disposition |
|---|---|---|
| Save keyed off validity + its test | ALREADY CORRECT | left alone |
| Three-state chips | ALREADY CORRECT | left alone |
| `CLAUDE.md` init-order rule | BUILD | implemented |
| Mount-renders-without-throwing test | BUILD | implemented (`createMount.test.tsx`) |

---

## The two open questions

**1 · Agent-as-stage — resolved by Nick, and it stands.** `b4837c2` holds; `7d1d7b1` was not
re-applied. The gating argument survives in `createSteps.ts`'s header: the nudge default and the
materials pre-tick both derive from the agent, so the stack cannot be entered until that question
is answered. It is a prerequisite of the stack, not a step inside it — a fact about CONTENT, not
about order — which is why `StepId` still has three members and `stackAvailable` names the gate.

**2 · `agentContext.ts` omit rules — already complete, bar one.** Handled: stat cells omit
individually and the strip omits when none survive; the policy line returns `null`; history returns
`null` and states "this is your first" rather than blanking; seeking chips, asks and the freshness
stamp all omit; `panelState` has a name-only branch. The single gap was the "Not stated" stat cell —
and Phase 3.2 was withdrawn precisely because it contradicted the baked omit rule.

---

## Three audit verdicts the work overturned

Recorded because in each case the audit checked for the presence of a thing rather than the
behaviour, which is the failure mode Step 1 warned against.

1. **"Sticky panel column" — BUILD → already true.** Marked BUILD on the absence of `position:
   sticky`. Behaviour check: `.qc-form` is the scroll container and the panel is its sibling, so the
   row never scrolls. Browser-measured — scrolling the flow 104px moved the panel 0.0px. There is no
   scrolling ancestor for a sticky element to stick within, so the property would resolve to
   `relative` and read as load-bearing when it is not. **Not added.** The lock asserts the structure
   that delivers the behaviour, and a comment says why the property is missing.
2. **"Clear in the popover foot" — BUILD → already existed.** `BrandDatePicker`'s `hub` variant has
   carried a Clear/Done footer since it was written.
3. **"The popup does not open on mount" — I told Nick this was false, and I was wrong.**
   `useState(false)` is only the initial value; `onFocus` calls `setOpen(true)`, and stage 1
   autofocuses. His diagnosis was right and mine was wrong, and I corrected it in writing before
   building.

## Two places the brief was wrong on the merits, and what happened instead

- **The mount test.** The brief asked it to assert "the initial materials summary and stepper
  state". Neither is in the first frame, and both absences are correct: only the ACTIVE step's body
  is mounted and the stack opens on `When`, so the stepper is not rendered; and an UPCOMING row
  states its hint rather than a value, so `What` reads "Manuscript and materials" until visited.
  Asserting them would have written a bug into the locks. The test asserts the frame the writer
  actually sees, plus that the seeding itself happened.
- **`.qc-form-ask`'s 52% basis** was introduced in P1 to preserve stage 1 while the panel column
  became fixed, then removed in P2 when stage 1 became a single column. A one-phase bridge, noted so
  its disappearance is not read as a regression.

## Deferred, with reasons

- **Other: Enter → removable chip**, and **the summary line + collapsed item count.** Both are
  MODIFY rows in Phase 5 that were not reached. Today `Enter` in the Other field blurs it, and the
  collapsed `What` row carries `materialsPhrase` without a count. Neither is wrong, both are less
  than specified. They are the whole of the outstanding work.
- **The panel footer's "Open full profile →"** — out of scope by reading, see Phase 3.

## Where things live

- **`CREATE_QTY`** — `src/lib/createQty.ts`, with `effectiveMax`, `stepQty`, `canStep`, `stepLabel`,
  `parseQty`, `formatQty`. Its own module so a UI convenience is never coupled to `MAT_QTY`'s
  validation rule.
- **The conversion constants — deliberately absent.** Nick withdrew 250-words-per-page and
  10-pages-per-chapter along with unit conversion: converting 3 chapters to 7,500 words writes a
  figure the writer never chose into a record of what they actually sent. Better not to have them
  sitting there inviting reuse.
- **`HOUSE_NUDGE_WEEKS`, `NUDGE_PRESETS`, `initialReminder`, `nudgeDerivedLine`** —
  `src/lib/queryDraft.ts`, beside `resolveReminder`.
- **The picker** — `src/components/queries/AgentPicker.tsx` over the pure `src/lib/agentPicker.ts`.

## Ref versus prompt

The ref (`63-qc-create-stepper.html`) draws a **four-step** stack with the agent as step 1, a "Step
n of 4" counter and a Continue/Back footer per step. **The prompt won on all three**, and Nick's
resolution 1 settled it: agent-as-stage stands, so there is no counter and no per-step footer. The
ref's mockup hexes were not lifted anywhere — the picker, chips and tags read existing tokens
(`--pink-t/b/i`, `--burg`, `--hairline`, `--line`), and the two literals that do appear (`#cdbfa9`
on the panel edge, `#cfc7bb` on the muted ring) were specified in prose.

## Test dispositions

No suite was deleted. `createStageOne`'s quick-picks block was rewritten to the picker's truth;
`createStack`, `createColumnHeight`, `createColumns`, `queryDraft`, `queryCreateFixes2` and
`agentContext` had individual assertions rewritten where the new spec made them false. New:
`agentPicker.test.ts` (21), `createQty.test.ts` (24), `createMount.test.tsx` (3).

## ⚠️ One incident

`61924e7`. P6's one-line `CLAUDE.md` insertion was written on top of a stale read: the dashboard
stream committed its audit notes to the same file (`85be33d`) between my read and my write, and
seven of their lines were deleted. Restored from `85be33d` with my rule re-applied. **Explicit-path
staging is race-proof against another stream's index, but not against its commits** — a
read-modify-write of a shared document wants re-reading immediately before the write.

---

## Browser checklist — jsdom cannot verify these

Verified during the run, at 1440×900 and 1240×860, against the **built** `dist/assets/index-*.css`:

- [x] Stage 1 single column; grid renders `auto-fill`; helper beside the field
- [x] Mount state — no `.sa-ag-menu` anywhere in the document; `aria-expanded` true only on the picker field
- [x] All three stage-1 states; ring border `rgb(207,199,187)` with no sage; art count 1, cold start only
- [x] Panel 322px; does not move when the flow scrolls 104px
- [x] Panel clearance — no clip at 558/900/1400/1900px panel height; clips at 2100 as predicted

**Still to check by hand** (needs interaction or a real account):

- [ ] Step ordering across all four rows, and one expanded at a time, by clicking
- [ ] Picker filter typed live; ↓ into the grid, arrows, Enter, Esc back to the field
- [ ] "See all →" and the two route cards actually navigate, and discard through the dirty-confirm
- [ ] Panel for an agent with **no stated response time** — no numeric stat, no policy line
- [ ] Nudge defaulting for a stated agent and an unstated one; the "a default" copy on the latter
- [ ] Custom nudge date: presets deselect, chip relabels, Clear returns to presets
- [ ] Stepper: arrows, ↑/↓, bounds disabling, 37 → 40, and unit switch **snapping** (not converting)
- [ ] Materials pre-tick for a query-letter-only agent, and for an agent stating **more than the
      create bound** (500 pages) — her figure must survive un-clamped
- [ ] The three-state chips on a seeded agent (outlined, not solid)
