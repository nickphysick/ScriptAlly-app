# To-do — the grouping pass (expand / collapse for batch items)

Run against HEAD `8b348c0` (the hero-pair pass, deployed to dev). The one ref fresh in
Downloads (`todo-fix15.html`, 23 Jul 15:52), read in full, committed with P1 as
`design-refs/todo-grouping.html`; **§3 (the spotlight opening demo + its canvas script) is
fenced out** — it belongs to the focused-session work and none of it is built here
(grep-locked: no veil/canvas machinery exists in the To-do scope).

## Phase 0 — the data-shape recon

The derivation already yields the members: `HkGroup.members: HkMember[]` where each
`HkMember` carries **`card: BoardCard`** (plus `agentName` / `agency` / `agentId` /
`queried`). The expansion renders from `g.members[].card` through the one `renderCard` /
row contract — **never a second query path** (locked: the expanded renderer's slice contains
no `queries.` / `agents.` reference; its member list is `groupMembers(g)`, a pure view of
`g.members`).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — cards: the group bar | `aff0bf7` | 1351 |
| P2 — ledger: nested rows | `53796c3` | 1354 |
| P3 — persistence + interplay | `1f4b2c7` | 1358 |
| P4 — sweep + tour | `82014b4` | 1360 |
| report | `<this commit>` | 1360 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — batch cards gain the one rest affordance below the roundels: **"Expand {n} ▾"**
  (centred, hairline-topped; it replaces neither the hover expansion nor Action now — the
  card click still opens Batch fix). The batch cell re-heights to its own `--tdb-cardh-g`
  token to hold it — a scoped supersede of v4 P4's level-at-rest trim. Expanded, the batch
  card is replaced in the grid by the **group bar** spanning all columns (`grid-column:
  1 / -1`; family band colours; the Playfair title from the same G3 grammar; mono
  `SHOWING ALL {n}`; the emphasised-hairline **Collapse ▴** right) — the members flow
  beneath as **standard unit cards** with full behaviour (hover stack, Action now → the
  member's journey, Today, snooze). The first **5** render; a dashed **"+ {remaining}
  more…"** cell pages in the rest in one click. Expansion animates in at 200ms
  (reduced-motion instant); collapse restores the batch card in place, its return scoped
  by `recentG` so page loads never flash. The bar + members occupy the batch's original
  grid position; following cards flow after.
- **P2** — the ledger batch row's head becomes a **rotating chevron** (22px roundel, 90°
  open); the row's non-action click now **toggles** the nest (Action now keeps its
  Batch-fix opener — a scoped supersede of the doc-pass "same as row-click" clause for
  batch rows only). Member rows indent 40px with the family-tinted 3px spine and a smaller
  title, each carrying the standard trio; the same 5 + dashed paging; the parent row stays
  fully rendered while open (progress + meta intact) as the collapse control.
- **P3** — expansion persists per-batch under **`sa.todoGroupsOpen`** and is one state:
  expand in cards, arrive expanded in the ledger. Search narrows an expanded batch's
  members through the same `matchesSearch`, the bar standing with **`SHOWING {matched} OF
  {n}`** (the ledger parent gains the same mono note when narrowed). Member
  completions/snoozes re-derive every count automatically — the bar reads
  `g.members.length` straight off the one derivation. A batch that truly empties prunes
  its open flag (keyed off the **unfiltered** `hkGroups`, so a merely filtered-out group
  keeps its state); **n = 1 renders as its unit** in both views.
- **P4** — the tour's card stop gains "Batches expand in place to show every agent.";
  sweep + orphan scan clean.

## In-browser checklist (dev)

1. **Expand 16 materials**: the batch card becomes the full-width latte bar, five member
   cards flow beneath, and the dashed **"+ 11 more…"** cell pages in the rest with one
   click.
2. **Collapse from the bar**: the batch card returns in its original grid position with a
   brief fade; following cards reflow after it.
3. The **ledger chevron**: click the batch row (anywhere off the buttons) — the chevron
   rotates, spined member rows nest beneath; Action now still opens Batch fix from the
   parent; a member's Action now opens that agent's journey.
4. **State survives a view switch**: expand in cards, flip ▦ → ☰ — the row arrives
   expanded (and survives a reload).
5. **A member completion decrements the bar's count**: fill one member's materials through
   its journey — the bar and the batch headline re-derive everywhere.
6. Type a search matching one member: the group bar stays with **SHOWING 1 OF 16** and
   just that member's card beneath.
7. The tour's card stop mentions expanding.

## Deviations

- **The batch cell re-heights** (`--tdb-cardh-g: 150px`) — the rest affordance needs the
  room; v4 P4's "batch cells match units" is formally superseded (the old `--tdb-cardh-b`
  name stays dead). The 150 figure is an estimate against the type scale — eyeball that
  the affordance clears the cell without overflow.
- **The ledger row-click now toggles** (was: opens Batch fix) — the pack's baked
  behaviour; Action now keeps the opener, so the acting surface is one click away either
  way. Unit rows unchanged.
- **The ledger's SHOWING note** is my translation of the pack's "keeps its group bar
  visible with SHOWING {matched} OF {n}" — the ledger has no bar, so the parent row
  carries the same mono string while narrowed.
- **Member rows have no head checkbox** — the ref draws none, and a dq member's
  quick-complete would be a silent no-op (`quickDone` has no dq arm; a member completes
  through its journey, which re-derives the group).
- **The lane maps went explicit lambdas** (`(c) => renderCard(c)`) — `renderCard` gained
  the member-mount flag as a second parameter, and a bare `.map(renderCard)` would have
  leaked the array index into it.
- **The member-row titles are the real card titles** — the ref's "Materials — Aisha
  Kapoor, The Lantern Agency" is its demo shorthand; the true `BoardCard` title + subtitle
  carry the same information.
- jsdom limits as ever: the grid reflow, the bar morph, the chevron rotation and the
  paint order are source/rule-text locks — the browser walk confirms the pixels.

## Close

**Grouping done; the focused-session sequence is the next design-in-progress; the deploy
checkpoint is unchanged** (dev deploy → prod sequencing pass, then Correction UI).
