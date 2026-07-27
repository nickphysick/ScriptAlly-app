# To-do page rebuild — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/tone-crumb-padding.md`.
Ref: `design-refs/scriptally-todo-sectioned.html` (copied in, Phase 1).

## Commits + gates

Every commit passed `tsc --noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — typographic sections, containers removed | `bd00db0` | 1637/1637 |
| 2 — rows view alongside cards | `0753a1a` | 1637/1637 |
| 3 — featured review card | `7feb169` | 1637/1637 |
| 4 — header actions | `f4220af` | 1642/1642 |
| 5 — pro strip at the foot | `bdd6b4d` | 1643/1643 |

**Not deployed** — dev runs `b903396` (the tone/crumb/padding build).

## Phase 0 — what the inventory found

**Nothing was shared.** Every container the pack deletes is To-do-only: `.tdb-mainc`/`.tdb-panel`
(board panel), `.spine-bench` (filter slab), `.tdb-lh2` (cards lane header), `.tdb-lsech` +
`.tdb-lsec` (the rows view's washed, foldable sections), `.tdb-benchseat`, `.tdb-dochead`/
`.tdb-items`, `.tdb-hsearch`, `.tdb-vseg`. No non-`todo/` file referenced any of them, so the
red gate did not trip and nothing needed preserving for another page.

**A rows view already existed** — the "ledger" (`view: "cards" | "ledger"`, persisted at
`sa.todoView`). Phase 2 therefore restyled the existing view rather than inventing a third; the
toggle's state mechanism is untouched.

**"Is a review waiting"** is `reviewWin = queries.length > 0 ? reviewWeek(queries, now) : null`,
composed with `reviewSeen` / `reviewDismissed` (localStorage `sa.todoReviewSeen` /
`sa.todoReviewDismissed`, no data writes). The card renders on
`reviewWin && !reviewSeen && !reviewDismissed`; the header action disables on `!reviewWin`.

## ⚠️ THE RED GATE — the focused session is now unreachable

**`setSession` had exactly one opening call site: the "Begin focused session" button.** Removing
it, as Phase 4 instructs, leaves `FocusedSession` — and the hero's title crossfade, ritual lines
and progress slot, which it drove through `setHeroSession` — with no way in.

Per the pack ("stop and report rather than deleting further"), **nothing further was deleted**.
`session`, `heroSession`, `HeroSession`, `FocusedSession`, `renderHero` and all their CSS are in
place and dormant, awaiting a new entry point. The lock asserts **both halves**: the button is
gone *and* the machinery survives, so a future pack can re-home it without archaeology.

Two related casualties of Baked 1's "a heading is a heading", also reported rather than chased:

- **The lane play button** ("Focus on {label}") lived on the deleted header bar. It was the only
  trigger for the per-lane *sweep* (`setFlow({..., mode: "sweep"})`), so that mode is now
  unreachable too. `FocusFlow` itself is unaffected — clicking a card still opens it.
- **The rows view's fold** (▸/▾, persisted per lane) lived on the same bar. `ledgerFold` /
  `toggleFold` are left dormant.

The page header did **not** previously use `PageHeader` — the pack's "the header stays as the
app-wide PageHeader" describes an end state, not the starting one. The bespoke hero *was* the
session apparatus, which is why earlier packs left it alone. Phase 4 adopts `PageHeader` properly.

## What each phase did

**P1 — sectioning.** Sections are a Playfair 27 heading with a mono count over a 2px rule whose
left 96px carries the family colour (46px above, 22px below), from **one** `SectionHead` shared
by both views — the cards/rows heading divergence is over. One control line: chips, spacer,
228px fill search, fill view toggle, 44px above, no container. The chips lost the deep-ink
selected fill for the Form 11 soft-pink, and zero-count chips became non-interactive as well as
faded. The grid answers to the capsule now (auto-fill, 272px floor), so the ≥1700 4-up tier went.
The "{n} items" line went with the items row — the All chip's struck total already carries the
narrowed count.

**P2 — rows.** The mockup's row anatomy: hairline card (card surface, radius 13) whose border
lifts with a soft shadow on hover; 42px tinted family tile; Playfair 16 title over an italic
Playfair 12.5 subtitle; mono tag pill right, then a chevron. **Two deliberate reconciles:** the
mockup's tile is decorative, but the live row's leading slot is the *completion control* (the dot
that becomes a tick on hover) — so the dot is **seated inside** the tile rather than replaced by
it; and the mockup draws no row actions, but Action-now / Today / Later are the row's working
surface, so the cluster stays.

**P3 — featured review card.** Directly beneath the header rule (26px), no section heading, warm
diagonal gradient, radius 16. Title + pink badge, 50ch body, exactly two actions (View pink
primary, Dismiss parchment ghost), the 288px art panel bottom-aligned and bleeding to the edge
(hidden below 780px), plus the close control top-right. Dismiss hides for that week without
marking read.

**P4 — header actions.** `PageHeader` (full) with exactly two actions. `PageHeaderAction` gained
`disabled`, rendered as a real `disabled` attribute (inert to click *and* Enter), and
`pageHeader.css` gained **the house disabled treatment** — paper fill, hairline border, faint
text, no shadow, `cursor: not-allowed`; never dashed, never opacity-only. That treatment is now
available to every page, not just this one.

**P5 — pro strip.** Full-width at the foot, 50px below the last section: card surface, hairline,
radius 14, slate PRO pill, Playfair title, one line of body, slate text link. No blue fill, no
heavy shadow — slate survives only as the pill fill and link ink. `ProSticker` is superseded by
`ProStrip`; the dead `.spine-pro*` tokens and rules were removed with it.

## Which view reads better at 44 items

**Rows, clearly — and cards remain the default, as instructed.** At 44 items the card grid runs
to roughly a dozen rows of tiles at typical widths: scanning means reading left-to-right and
wrapping, and the 42px monograms and coloured bands repeat until they stop carrying information.
The rows view puts one item per line with the title on a consistent left edge and the due pill on
a consistent right edge, so the eye travels down a single column and the tinted tiles become a
usable family index rather than decoration. Cards win at low volume — a sparse desk of six looks
considered, and the post-it language is the page's charm.

If you want the page to choose, the honest rule is volume-based: cards under ~15 items, rows
above. That is a one-line default with a persisted override, and I have not built it — say the
word.

## The dark-pill sweep (for a later pack — nothing fixed here)

Genuine dark-**filled** CTA buttons remaining, grouped. The To-do page's own chrome is now clear:
Phases 3–5 removed its last three (`tdb-rvopen2`, `tdb-herobegin`, and the chips' ink fill), but
its **flow and session sheets** still carry the majority.

| Page / area | Class | Where | Notes |
|---|---|---|---|
| To-do — focus flow | `.tdb-ffpri` | `FocusFlow.tsx`, **~21 buttons** | the biggest cluster by far ("Stage it →", "Record decision", "Save & continue →", …). `.tdb-ffpri.pink` already exists as the escape hatch, used once |
| To-do — focused session | `.tdb-ssb.bp` | `FocusedSession.tsx:472, 530` | "Action now", "Back to your desk" — currently unreachable (see the red gate) |
| To-do — empty desk | `.tdb-ndpri` | `ToDoPage.tsx` | "Start your first query →" |
| To-do — tour | `.tdb-coachnx` | `TodoTour.tsx:97` | "Next →" / "Done" |
| To-do — Today card | `.tdb-btnp sm` | `ToDoPage.tsx` | "Work the list" — the page's last ink pill |
| Agents | `.agl-btn-dark` | `AgentCard.tsx:190`, `AgentList.tsx:429` | "Log query", "Add your first agent" |
| Agents | `.agl-done` | `AgentEditor.tsx:161` | icon-only Done |
| Queries hub | `.tc-save` | `TimelineComposer.tsx:326` | "Save" |
| Queries hub | `.f12-done` | `F12Shell.tsx:123` | "DONE" in every popover footer (Filter, Sort) |
| App-wide | `.sa-confirm-ok` | `ToastProvider.tsx:140` | the confirm dialog's OK (the red `.sa-danger` variant is a separate concern) |
| Discover | `.dv-fr-cta` | `DiscoverNewAgents.tsx:373, 398` | dark **mocha** by default, and `#1d1712` under Bold |

Excluded as not-CTAs: toasts, scrims, tooltips, avatars, progress fills, badges/ticks, selected
states on segmented toggles, text/border-only colours, marketing + auth, and dev-only lab routes.

**Bonus find, out of scope:** `src/components/agents/agentsV2.css` appears to be imported by
nothing and referenced by no `.agv2` markup — several ink fills in it never render. Worth a
separate look before anyone "fixes" the buttons inside it.

## The illustration is a PLACEHOLDER

The featured card's teacup-and-envelopes SVG is the mockup's, carried over verbatim and marked
as such in the source. It is decorative (`aria-hidden`), sized to the 288px panel and bottom-
aligned. **This slot would suit a commissioned illustration** — it is the largest piece of
artwork on any workspace page and currently the only one drawn from a wireframe.

## Needs a browser check

jsdom cannot verify flex chains, grid reflow or viewport sizing, so every spatial result is
asserted structurally only:

1. **Section rhythm at short viewports** — 46/22 was set for a tall window; with three sections
   plus the featured card, check the first section heading is not pushed below the fold.
2. **Grid reflow at narrow widths** — auto-fill on a 272px floor now decides the column count
   with no breakpoint. Check the one-column case and the panel-expanded case (the capsule is
   ~288px narrower then).
3. **The featured card's height above the first task** — the 288px art panel sets the card's
   height; on a sparse desk it may dominate everything beneath it.
4. **Disabled-button legibility** — `#bcb0a3` on the paper fill is deliberately faint; confirm
   it reads as "not yet" rather than "broken", and that the icon at `#cfc4b7` is still visible.
5. **Rows vs cards at your real volume** — the judgement above is mine from the structure; yours
   is the one that counts.
6. **The tour**, whose anchors moved: stop 3 now points at `.tdb-bsearch` and stop 4 at
   `.tdb-ctrl`. Note stop 1 still targets `.spine-rail`, which died in the shell follow-up —
   pre-existing, not introduced here, but it will silently skip.
