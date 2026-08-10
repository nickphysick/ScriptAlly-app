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

---

# Fix pack 1

Four items from Nick's browser walkthrough. **Commits** — ref `1d17ecb` · §1 `46f516b` · §2
`c0be0ed` · §3 `48628b2` · §4 `d095bf9`. Gates green before each. **Not deployed.**

## §1c — what it turned out to be, and which selector was wrong

The panel was right and **the rows were wrong**, and the cause was neither component: the pane
passed `queriedAgentIds={new Set<string>()}` to `AgentSearchField`. An empty set, so no row could
ever look queried, while `queriedCount` read the real `queries` array beside it. Two components
answering one question from two sources — one of them a literal that could never be right.

Fixed at the source rather than at the call site: `queriedAgentIds(queries)` is now exported from
`lib/agentPicker.ts` and is the single derivation behind the panel's count, the grid's un-queried
filter, the dropdown's history label, and the legacy field's rows. The lock asserts the panel count
against **the selector's own size** rather than against a literal, so the two cannot drift apart
again by anyone editing one of them.

Two more defects fell out of the same area. **§1a**: the pane mounted the whole of
`AgentSearchField` to reach its quick-add form, which put a second search input on stage 1 whose
popup opens on focus — the reason "Add a new agent" appeared to open a list of existing agents.
`startInQuickAdd` now mounts the form and nothing else. **§1b**: the result row's stars are gone,
and so is the rating-descending sort behind them — a search result ordered by how highly you rated
someone is a recommendation wearing a search's clothes, and the writer typed a name. The rating
input survives in the quick-add *form*, where the writer is recording a judgement rather than the
app making one.

## §2 — the two picker configurations, and where the bounds live

Both live in `QueryCreatePane`, beside the fields they govern, because they are facts about *those
two fields* rather than about dates in general.

| | Date sent | Nudge |
|---|---|---|
| bound | `max={todayInputDate()}` | `min={nudgeFloor}` = **sent date + 1 day** |
| shortcuts | Today · Yesterday · Last Monday (the picker's default) | In 4 / 8 / 12 weeks, from `nudgeChips` |
| anchored to | today | **the sent date**, not today |

The floor is the send **plus one day**, not the send: a reminder to chase something you have this
moment sent is not a reminder. `quickChips` is additive on `BrandDatePicker` — absent, the
backward-looking chips render exactly as the twenty Form 11 call sites and the sent field expect.
`isoPlusDays` parses as **local** midnight; `new Date("2026-08-10")` is UTC midnight, so west of
Greenwich every derived bound would land a day early.

Moving the sent date past a chosen nudge date **clears that choice back to the preset**. Keeping it
would leave a reminder scheduled before the query existed; silently correcting it would move a day
the writer picked on purpose without saying so. The derived line — which always states the
resulting task date — is what tells them.

## §3 — the provenance rule, and where the "untouched" bit is held

The clause explains where a **default** came from. It was flagged off *"the selected preset differs
from the agent's figure"*, so a writer who picked 12 weeks for an agent stating 6 was told no
response time was listed while the panel beside it showed six.

It now requires two facts, neither of them a comparison: the agent has **no** figure
(`responseTimeWeeks` absent, not merely different), **and** the interval is still the one we seeded.

**The "untouched" bit lives on the choice** — `{ kind: "preset", weeks, seeded?: true }` — so it
cannot drift from the value it describes. Every chip in the pane omits it, which means choosing 8
weeks by hand is a different *value* from arriving at 8 weeks by default even though both resolve
to the same date. Holding that bit in separate state would have let the two disagree.

| situation | line |
|---|---|
| agent states a figure, untouched | "A task appears on {date}." |
| agent states nothing, untouched | "… — a default, as no response time is listed for them." |
| writer chose anything | "A task appears on {date}." (custom adds "— 9 weeks after sending") |

## §4 — raised, not decided

The trailing whisper beneath the stack was to be deleted **only if** it duplicates the derived
line. It does not, quite:

> "We'll nudge you on 5 Oct if it's gone quiet." · "A task appears on 5 October 2026."

Same date, different claim — and the whisper is the **less honest** of the two: reminder
persistence is still stubbed (CLAUDE.md), nothing schedules a notification from that date, and the
derived line describes what actually happens. They also differ in reach: the whisper shows on every
step, the derived line only while `When` is open. **Left in place pending Nick's call.**

## Still deferred, carried forward

Unchanged from the main run, and not in fix pack 1's scope:

- **Other's `Enter` → removable chip.** Today `Enter` blurs the field.
- **The materials summary line + the collapsed row's item count.** Today the collapsed `What` row
  carries `materialsPhrase` with no count.

## Browser checklist — fix pack 1

- [ ] **One** search field on stage 1; "Add a new agent" opens the add *form*, not a list of agents
- [ ] Dropdown opens on the first keystroke — not on mount, not on focus; closes on clear, Esc, outside click, selection
- [ ] The grid does **not** reshuffle while typing
- [ ] Dropdown rows include already-queried contacts and state their history
- [ ] No stars on any row, in the dropdown or on a card
- [ ] The all-queried count and the rows agree
- [ ] Sent picker refuses tomorrow; its chips still read Today · Yesterday · Last Monday
- [ ] Nudge picker refuses the sending day and everything before it; its chips read In 4 / 8 / 12 weeks **from the send**
- [ ] Move the sent date past a chosen nudge date — the choice clears back to the preset
- [ ] Provenance line across all three cases, especially: agent stating 6 weeks + writer picks 12 → **no** default clause
- [ ] `Next: …` / `← Back` through every step, values intact on the way back, and Enter still advancing

---

# Fix pack 2

**Commits** — refs `d09a531` · §1 `063fcc5` · §2 `edb8d65` · §3 `812d3fa` · §4 `07f0119` ·
§5 `a4fe8ca`. Gates green before each. **Not deployed.**

`68-panel-tone.html` was **not** in `~/Downloads` and is not committed. It was cited only for §4's
spacing, which the prompt specifies in full, and its panel tones were superseded by 69 anyway — so
nothing was built from a ref I had not seen.

## §1 — how quick-add was extracted, and what else was mounting `AgentSearchField`

Two earlier attempts to delete the duplicate field failed for one structural reason, which fix
pack 1's own note identified without acting on: **the quick-add form lived inside
`AgentSearchField`**, so reaching it meant mounting a combobox whose popup opens on focus. That is
why the panel's "Add a new agent" appeared to open a list of existing agents — it was scrolling to
that second field.

`AgentQuickAdd` is the lift: name · agency · email · response weeks · the writer's own rating, with
"Add and select" and Cancel, and **no search**. Every field the old form collected is kept —
dropping any would quietly reduce what an inline add records — and `onCreateAgent` is the same
contract the popup called, so an agent added here is born with the shape it always had. The rating
survives the no-stars rule because that rule banned the app *ordering* agents, not the writer
rating one.

One open state serves both entry points; two states would let one be open while the other thought
it was closed, and the second click would appear to do nothing. It opens inline beneath the field,
where the link already pointed. Esc and Cancel both close it and return focus to the field — and
**Esc is stopped there**, because the pane behind it discards the whole draft on Escape.

**What else was mounting `AgentSearchField`: nothing.** Create mode was its only consumer. With the
legacy mount gone the component is **dead code app-wide** — every remaining mention in `src/` is a
comment. Not deleted here: that is a separate change and three sessions are live in this checkout.
**Carried forward as a cleanup**, alongside the already-dead `.qc-qrow` and `.sa-ag-stars` rules.

## §3 — the dropdown's open-state machine

**Opens on** — a click/tap on the field · `↓` · the first keystroke.
**Does not open on** — mount · programmatic focus · *any* focus. There is deliberately no
`onFocus` handler on the field, and the lock bans a focus handler that calls `setOpen` rather than
banning `onFocus` outright, because the grid's cards legitimately use it to track the highlight.
**Closes on** — `Esc` · an outside click · selection · clearing back to empty.

The distinction the whole model rests on is **focus versus intent**: the field takes focus on mount
so typing works immediately, but programmatic focus is the *app's* act, and opening on it is
exactly what put an expanded empty popup under the field on arrival in the first place.

An empty query lists **every** contact with its history, because opening the list is an act of
browsing as much as of searching. Ordering is **alphabetical** — newest-first is a recommendation
about which contact matters, and rating-descending is the same recommendation wearing a search's
clothes. The standing grid still does not filter while typing.

## §4 — and the measurement that caught it

The first attempt **measured 0px of clearance while every declaration read as correct.** I gave the
footer negative margins to escape a padding it does not have: it is a *sibling* of `.qc-body`, not
a child, and its actual parent `.qc-sec` has no padding at all — so `-26px` hung it past the card
and the compensating `26px` brought the primary back to exactly flush. The rule now runs the card's
full width with the buttons inset by the body's own 16px.

Browser-measured after the fix, at **1440 and 1024**: 17px from the card's right edge at both, rule
`1px solid`, `touching: false`. Before: 0px and touching at both.

## §5 — where the marginalia tokens live, and how they are scoped

`--qc-ref-rim` · `--qc-ref-rule` · `--qc-ref-plate`, defined **under `.t-capp` in `index.css`** and
consumed by a `.t-capp`-scoped block in `f12.css`. Putting them in the theme scope rather than the
base sheet is what keeps Bold Pastille and Editorial out of it **without a single override of their
own** — both keep the base sheet's dotted rim, and a lock asserts they gained nothing. The law is
in `design-refs/themes.md`.

The grounding, recorded so it survives future edits: read-only surfaces recede by dropping their
**affordance signals**, not by taking a new hue, and the **text colour does not change** — a
reference panel that is harder to read has failed at the only thing it does. Fills say "surface";
rules say "record". The dashed rim is the one sanctioned exception to dashed-means-provisional, and
it is scoped to a single component in a single theme so it cannot spread.

## Still deferred, carried forward again

- **Other's `Enter` → removable chip.** Today `Enter` blurs the field.
- **The materials summary line + the collapsed row's item count.**
- **Dead code awaiting a cleanup commit:** `AgentSearchField.tsx` (now unmounted), `.qc-qrow` and
  `.sa-ag-stars` rules.

## Browser checklist — fix pack 2

- [ ] **One** field on stage 1; no second "Search by name or agency…" anywhere
- [ ] Both add-agent routes — the link beside the field, and the all-queried panel's action — open the **same** inline form beneath the field; nothing scrolls
- [ ] Esc and Cancel close it and put the caret back in the search field; Esc does **not** discard the draft
- [ ] Dropdown **closed on arrival** despite the field holding focus; opens on click, on ↓, and on the first keystroke
- [ ] Open with an empty field lists every contact, alphabetically, each stating its history
- [ ] The standing grid does not reshuffle while typing; the all-queried panel is capped and its actions sit on one row
- [ ] Footer spacing at **1440 and 1024** — rule visible, neither button against the card edge
- [ ] The reference panel read against the step beside it at **100% and 125% zoom**: does it recede without becoming harder to read?
- [ ] Bold Pastille and Editorial panels unchanged

---

# Sage header, and the step footer gutter

**Commits** — §1 `0b3598e` · §2 `be4e4d5`. Gates green before each. **Not deployed.**

## §1 — where the band and rim tokens live

All in the `.t-capp` scope in `index.css`, never the base sheet, consumed by a `.t-capp` block in
`f12.css`: `--qc-ref-band-a` `#dde3da` · `--qc-ref-band-b` `#d6dcd3` · `--qc-ref-band-rule`
`#cbd3c8`, alongside the existing `--qc-ref-rim` / `--qc-ref-rule` / `--qc-ref-plate`.

**The band is the dashboard's own sage**, not a new green — the same stops and rule colour as
`.os-ahead` in `oneScreen.css`, under the house rule *sage for a container's header, pink reserved
for a surface asking something of you*. A reference panel asks nothing. They are tokenised here
because the dashboard holds them as literals; if that sheet retunes, this is the one place to
follow. A lock asserts the dashboard's gradient string still matches.

Bold Pastille and Editorial gain nothing — asserted for the ring as well as the panel and the band.

## Whether the dashed rim survived the move

**It did, unchanged.** Browser-verified at 3× magnification: `dashed`, `1px`,
`rgba(124, 58, 42, 0.28)`, `border-radius: inherit` at 16px, `pointer-events: none`, and **even
through both top corner arcs** with no thinning or bunching. It draws *over* the sage band, which
is the whole point of the move.

The mechanics: the host takes `position: relative` and **`border: 0`**, so `inset: 0` on the ring
means exactly the panel's outline rather than 1px inside it. The band relies on the panel's
existing `overflow: hidden` for its corners and does **not** round itself — two radii that can
disagree is one radius too many.

**One observation, flagged not fixed:** the sage status pill now sits sage-on-sage. It stays
legible on its border, and the brief said to leave it alone as a state signal — but it is a real
change in contrast and worth your eye.

## §2 — measured clearance, all four edges

The cause was the one found last time and only half-fixed: the footer is a sibling of `.qc-body`
whose real parent has no padding, so **vertical margin was added by hand while the bottom was left
at zero** — and the footer is the card's last child, so the buttons sat flush on the card's bottom
edge with the CSS reading as correct.

Measured on **every step** (the footer's markup cloned into all three cards, since the static
render only opens `When` and all three go through one renderer), at both widths:

| | top | right | bottom | left | rule |
|---|---|---|---|---|---|
| when / what / notes @ 1440 | 20 | 17 | 16 | 17 | full-bleed |
| when / what / notes @ 1024 | 20 | 17 | 16 | 17 | full-bleed |

Before: **bottom 0** at both. `Back`'s left edge is 17px and the "Date sent" label's left edge is
17px — **aligned**. The lock derives the footer's padding *from* the body's rather than pinning
literals, so the two cannot drift apart.

## Which treatment the rule takes

**Full-bleed divider.** `margin: 20px 0 0` keeps the rule edge to edge while the padding insets the
buttons. A rule stopping short of the card's edges reads as an underline of the last field; running
it through says "content above, actions below", which is what it is for. Both were defensible — the
choice is recorded so it does not drift into an accidental mixture.

## Browser checklist

- [ ] The panel at **100% and 125% zoom** — does the sage band read as a header rather than a second subject?
- [ ] **All four rim edges present at rest and on any hover** — the ring is an overlay now, so a hover state that repaints a child must not appear to cut it
- [ ] The band **clipped cleanly to the panel's corners**, with no fill past the radius
- [ ] Footer buttons **aligned with the field labels above them, on every step** — open When, What and Notes in turn
- [ ] The sage status pill on the sage band — legible enough, or does it need its own call?
- [ ] Bold Pastille and Editorial panels unchanged

---

# Fix pack 3

**Commits** — ref `d3b0c5c` · §1 `64c511d` · §2 `5d01ced` · §3 `152a2b9`. Gates green before each.
**Not deployed.**

## Which selector supplies the already-queried outcomes

**`queryBucket` (`lib/queryAmbient.ts`)**, wrapped as `queryOutcome` — derived from it, not beside
it. That is the app's one split of a status into whose turn it is, and the Queries filter bar, the
command bar and the agent list all read it; a second opinion here would eventually disagree with
all three. The lock asserts `queryOutcome` against `queryBucket` itself rather than against
literals.

The single thing it adds is **OFFER**, which `queryBucket` deliberately folds into `closed` because
the CTA engine has nothing further to ask of it. On a card reporting *what happened*, calling an
offer closed would be plainly wrong — it is the best outcome there is and the one a writer scanning
this list is looking for.

Ordering is **date sent, descending** — never outcome, never rating. The test puts a five-star offer
behind a one-star rejection and requires the rejection first.

## What §3 turned out to be

**`.qc-ghosts { margin-top: auto }`** — a spacer, not a viewport-height chain.

The ghost rows were pinned to the foot of the column so they sat where the real stack would appear.
That was sound when stage 1 held one question and nothing else; the column now holds a picker, a
panel and a grid, so an auto margin opens a hole exactly as large as whatever is left over — which
is why it showed in one state and not another.

**Proved rather than assumed:** at a 1400px column, toggling only that declaration moved the gap
between **514.3px** and **12px**. There is no `vh` anywhere in this height chain and no bar-offset
arithmetic; a lock now asserts that across `.qc-two`, `.qc-form`, `.qc-pick`, `.qc-stack` and
`.qc-ghosts`. Measured after the fix, all three conditions at 1440 and 1024: a constant **12px**,
the column's own flex gap. Six measurements, one value.

Fixed even though §1's grid now fills that space in the state where it was reported — the cold
start is exactly the case where content stops covering it.

## ⚠️ Two process faults in this pack, both mine

1. **A duplicate search field, reintroduced by copy-paste.** Folding the all-queried panel in from
   its early-return form carried a second `{field}` with it — the exact fault fix pack 2 §1a
   existed to remove. Caught by a screenshot, not by a test; there is now a lock requiring the field
   to be mounted exactly once.
2. **`git commit --amend` without `--only <paths>` amends from the whole index.** Rewriting a
   commit message that way swept another stream's 49 staged files into my commit. Recovered with
   `reset --soft` and re-committed by path. In this checkout, **never amend without restricting
   paths** — the same hazard as `git add .`, in a command that looks like it only touches a message.

## Browser checklist — fix pack 3

- [ ] The all-queried grid at **1440 and 1024** — every contact, with outcome and date, most recent first
- [ ] **Select a previously-queried agent** and confirm the flow proceeds normally into the stack
- [ ] Chips show **dash, not tick**, on arrival; the tick appears only after that step is opened
- [ ] Chips carry **no value strings**
- [ ] **No dead space** beneath the panel in any stage-1 condition — especially the cold start, where no grid covers it

---

# Fix pack 3 (revised)

**Commits** — ref `0c86e47` · §1 `1ce2d3d` · §2 `ae63b09`. §3 and §4 were **already built** and needed no
work (below). Gates green before each.

## §1 — which selector supplies the two states

**`isTerminalStatus` (`lib/agentList.ts`)** — the app's existing split, not a second one. Active =
not terminal; previously queried = terminal. **Offer counts as ACTIVE**, per the agent-list law
already in `CLAUDE.md`: a live offer is the most open a conversation gets, and calling it concluded
would be plainly wrong. `foldedLine` counts off the same list the plates render from, so the
sentence and the set cannot disagree.

This **withdraws `64c511d`**, the grid of already-queried cards. A grid is the shape this component
uses to *recommend*, and nothing in this set is being recommended.

## §2 — what the date failures turned out to be

**The rendering fault is found and fixed; the data fault I cannot see from here.**

`new Date(junk)` returns an Invalid Date whose `toLocaleDateString` is the literal string
`"Invalid Date"` and whose `getFullYear()` is `NaN` — so an unparseable value walks through an
unguarded formatter and lands on screen as an error message aimed at the writer. That is exactly
the string reported.

**A second instance existed.** `queryHistoryLabel` — the dropdown's row label — had the same
unguarded parse and would have printed `Queried Invalid Date NaN` on the same records. Found by
looking for siblings rather than fixing only what was reported. `shortDate` in `createSummary` was
already guarded.

The missing year was **not a bug** but the same rule applied in the wrong context: the app drops the
year for the current year, which is right for a list you work through this week and wrong here,
where the point is how long ago something went.

**What I could not determine, and how to check it.** The underlying values need your dev account —
I have no read path to that data. The suspects, in order:

1. **CSV import.** `dateSent` arriving as `14/03/2024` (UK order) rather than ISO. `new Date()`
   rejects that outright, which matches the symptom exactly.
2. **A missing value written as `""` or `null`** rather than the key being omitted.
3. **A pre-`isoPlusDays` record** written before local-midnight parsing landed.

To identify it: open the two entries in the reading pane and check their `dateSent` in the record,
or query the collection for `dateSent` values failing `/^\d{4}-\d{2}-\d{2}$/`.

**Marcus Reed — reported, not merged.** I have no way to tell two people from one duplicated record
without the data. If it is a duplicate, you are right that it is a data fix and not a display one:
the contact count is inflated by one and the **all-queried condition itself** could be wrong, since
it is derived from that count. Worth checking before trusting either.

## §3 and §4 — already built, no commit

Both landed before this revision arrived and match its wording:

- **§3** is `5d01ced`. Chips are labels only, `.qch-v` retired; pre-filled renders a **dash in a
  muted ring**, sage reserved for confirmed; the tick gates on the step having been **opened**, not
  on the value having moved. The save-with-unticked-chips assertion is intact.
- **§4** is `152a2b9`. Not a viewport chain — **`.qc-ghosts { margin-top: auto }`**, a spacer whose
  reasoning expired when the column gained a picker, a panel and a grid. Proved by toggling that
  one declaration at a 1400px column: **514.3px with it, 12px without**. Measured after: a constant
  **12px** across all three conditions at 1440 and 1024. A lock bans `vh` from the whole height
  chain.

## Browser checklist — revised pack

- [ ] The folded block **closed on arrival**, one line stating the counts; "Show them" opens the nameplates
- [ ] **Select a plate** and confirm the flow proceeds into the stack normally
- [ ] The dimmed set **legible at rest** at 100% and 125% zoom — if it reads as unreadable rather than quiet, lift the opacity rather than adding weight
- [ ] Tab into the set and confirm it **comes forward on keyboard focus**, not only on hover
- [ ] The two states differ **by dot only** — no size, weight or colour difference
- [ ] Chips show **dash, not tick**, on arrival; no value strings
- [ ] **No dead space** in any stage-1 condition, especially the cold start
- [ ] The two bad-date entries now show **no date at all** rather than "Invalid Date NaN"

---

# Fix pack 3 (revised, second pass)

**Commits** — ref `db37aab` · §1 `b198471`. §2, §3 and §4 were unchanged from the first revision and are
already on `main`. Gates green. **Not deployed.**

## §1 — what changed from the first revision

The first revision folded the state but left **two containers**: the compact panel above, the fold
block below, 18px apart. This revision merges them, and the reason is the interesting part — **four
things were stating one fact.** The panel heading ("Every contact queried"), the count ring, the
section heading naming the manuscript and counting the contacts, and the fold line all told the
writer that every contact had been queried, for this book, and how many there were.

All of it is gone except the sentence: *"You've queried all 16 contacts for Murphy's Day Out — 12
still waiting, 4 concluded."* with **Show them** as a link at its end rather than a fourth button
competing with the three routes.

**The spacing problem disappears rather than getting solved.** The 18px gap existed because two
boxes stated one fact; merged, there is nothing to space against. The plates open *inside* the
block, above the actions, so the routes stay at the foot in both states.

The count also comes off "Review your contacts" — the sentence gives it, and the same number in two
places is how two numbers start disagreeing. `queriedCount` is no longer rendered anywhere.

**Which selector supplies the two states:** unchanged — `isTerminalStatus` (`lib/agentList.ts`),
with **Offer counting as active** per the agent-list law. The counts derive from the same plate list
the block renders.

## §2, §3, §4 — already answered

Unchanged from the first revision and recorded above:

- **§2** — the rendering fault is fixed in two places (`plateDate`, and the sibling
  `queryHistoryLabel` found by looking rather than waiting to be told). The **data** fault is
  diagnosed but unconfirmed: I have no read path to your dev account. Suspects and how to check are
  in the previous section. **Marcus Reed is reported, not merged.**
- **§3** — `5d01ced`. Labels only, dash for pre-filled, tick gated on the step being opened.
- **§4** — `152a2b9`. `.qc-ghosts { margin-top: auto }`, not a viewport chain. 514.3px → 12px,
  then constant across all three conditions at both widths.

## ⚠️ One item in the carried-forward list is already done

The brief lists the `AgentSearchField` dead-code cleanup as out of scope. It was done at your
explicit instruction after the first revision — `AgentSearchField.tsx` deleted (376 lines) with
`.qc-qrow` and `.sa-ag-stars`, and five suites **re-pointed rather than deleted**. Noted so the
list does not carry an item that no longer exists.

**Still genuinely outstanding:** Other's `Enter` → chip; the materials summary line + collapsed
item count.
