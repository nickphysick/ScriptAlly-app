# Query Centre — the drawer, second cut: tabs, the correction desk, the Agent tab

`ad082961` → `92bb1c9d`, seven commits on `main`, **UNDEPLOYED**. No `git stash`, no deploys.

---

## FALSE PREMISES, FIRST

**1. The previous-cut ref is nowhere.** `query-panel-v2-correction-timeline.html` (`5170d383…`),
cited for its notes column, is in neither `design-refs/` nor Downloads. Provenance was recon'd
from source instead — every surface it would have evidenced exists in the app and was read there.

**2. "Stacked `MountPanel`s" — the drawer never had one.** Its sections were hand-rolled
`.qpn-frame`/`.qpn-sband` boxes. The spirit held (they're gone); the lock asserts both the literal
(`MountPanel` absent) and the actual (`qpn-frame`/`qpn-sband`/`qpn-sect` absent from the render).

**3. §2's fixture is unrepresentable, and the spec says so.** "A packaged send and a loose send"
on one timeline cannot exist: D11 (a query holds a package OR its own list, never both) and
`materialsWanted` is one list on the QUERY, not per-send. Asserted instead: a packaged query
renders one strip and no loose row; a loose query one floating row and no strip; the extra hangs
off the send rung only. The ref's per-send materials split is drawn from a model this app does not
have.

**4. Decision 5's "Move stays unbuilt" — move IS built.** `MovePicker`, `MoveSheet`,
`correctionMove` and the fork's third branch were all live at the run's start. Following "two
branches, copy verbatim", the desk passes no `onMove` — so this run made a live, tested flow
**unreachable by instruction**. It is one prop from returning. *Open question 1.*

**5. Decision 1's "direct dotted-field edits" never called `editActivity`.** The withdrawn
shortcuts wrote to the QUERY (`sendMethod`, `materialsWanted`, `writerExpectedDate`). The
withdrawal still applied as UX and they are gone; the grep-assert was already satisfiable and is
now a lock (`editActivity` called exactly twice, both inside the desk).

**6. Two Agent-tab facts have no field.** The ref draws a role ("Senior agent, fiction") and a
founding year ("est. 2011"); the Agent document holds neither. Omitted-when-absent covers a field
the model cannot hold — neither renders, ever, and nothing was added to the model.

**7. "Save as package ›" is in the ref and stays retired.** The packages run removed that control
(D7); a ref does not reinstate a documented decision.

---

## Step 0 — findings

- **`TimelineRows`** — `reading-pane/QueryTimeline.tsx:370`; ⋯ = the additive `onMenuOpen`,
  rendered on rows with an `activityId`. **The FocusFlow lock** is `todoSheet.test.ts` (the bare
  `<TimelineRows rows={rows} />` string) — kept green throughout; FocusFlow untouched.
- **`CorrectionFork` / `CorrectionEdit` / `ConsequenceSheet`** — `reading-pane/CorrectionSheet.tsx`,
  all unanchored `role="dialog"` cards. **The red gate did not fire**: nothing binds them to a
  viewport sheet — `.cor-scrim` (fixed, inset-0, centring) was the HOST's wrapper, so re-hosting
  cost a new host element and desk-scoped CSS that neutralises the sheet chassis (border, shadow,
  sage strip) — the desk is the card, and a card-in-a-card would frame one question twice. Markup
  and copy untouched.
- **`previewCorrection`** — `lib/correctionPreview.ts`, driven through the page's `previewFor`.
- **Guards** — `rootGuard` surfaces as CorrectionEdit's `removable`/`removeBlockedReason`; the
  reorder preview IS the consequence sheet; date bounds live in the edit form. All inherited
  unchanged into the desk.
- **Sent-strip** — `PackageGroup` + `LooseMaterials` (`reading-pane/PackageGroup.tsx`); the
  window-provenance bar is QueryTimeline's `.tl-wbar` (solid) / `.tl-wbar--est` (dashed writer
  estimate), keyed on `windowSource`.
- **`useTodoToast`** — `todo/useTodoToast.ts:69`; the correction undo toast is untouched.
- **Agent fields** — `types.ts:573`. **Query-count-per-agent** — `queriesForAgent`
  (`lib/agentList.ts:39`), the Contact list's own reader.
- The dead record branch still holds `QueryTimeline`'s reference mount (sentExtra et al.) — the
  porting checklist for §2.

## §1 — tabs · `dc9c2b6d` · 4 files

Three tabs (Playfair 15, underline in `--stage-accent`), the manuscript line into the header
(title asserted EXACTLY once), the scroller moved to the tab body — band/identity/ms-line/rail are
chrome outside it, which satisfies "sticky under the identity row" structurally. The Tracking tab
mounts the **shared `QueryTimeline`**; the Notes tab is `NotesThread` — whose only live mount had
been in the dead branch, so the drawer's Notes had shown the empty fallback for every query since
Phase 4, whatever the writer had written. Accent = decision 3 (deepest step per family), and the
mapping lands on real ink: in-3 is `#e8c9bb`, the exact hex the ref names.
Red-then-green: a second title (2 ≠ 1) · the underline unbound · the tracking node dropped.

## §2 — the timeline as the ref shows it · `cc665d2a` · 5 files

Confirmed from the shared renderer (nothing rebuilt): chapter labels, the waiting rung with the
provenance bar, `Sent / Expected by · your date`. Titles take the ref's 19px by a token override
AT THE USE SITE (`.qpn-track { --tl-title: 19px }`) — FocusFlow keeps the :root 16.
New: **`SentMaterials`** (own file — a spec importing Queries.tsx pulls Firebase and dies): three
read-only states — strip / loose chips / dashed prompt (a STATEMENT, no buttons). The dotted
method routes to the fork, and only when the send rung is a real activity — a synthesised root has
no record to correct.
Red-then-green: the extra leaked onto every rung (2 ≠ 1) · the packaged case forced to also draw
loose · a real status gate on the mount.
One retarget: `closedRecoverable`'s 9000-char slice had begun reading an unrelated close-menu;
same law, right artefact (no status guard in SentMaterials; the mount unconditional).

## §3 + §4 — the desk, and the Agent tab · `43890707` · 13 files

One commit for two phases, stated: §4 was built in the same shared files while §3's measurement
ran, and splitting afterwards would need the forbidden stash.

**The desk**: 440px at `right: 592px`, top = rung centre − 42 clamped to 12px, notch at the
centre, 5px accent strip, 260ms slide honouring reduced motion, Escape CAPTURED (the drawer
behind must not close with it), focus returned to the ⋯. It hosts fork → edit (with the collapsed
"What's wrong? · The record is false — change" row) → consequence, verbatim; `.cor-scrim` deleted.
**It cannot live inside the drawer** — `.qpn` carries a transform even at rest, and a transform
makes an ancestor the containing block for `position: fixed` — so it mounts beside it and wears
the stage class itself, which moved the accent map into `queryCard.css`, folded into each stage
class's ONE rule.

**Measured** (`queryDrawerDesk.measure.ts`, 4/4 in 17s): notch centre 537.42 = rung centre 537.42;
strip `rgb(199,208,194)` = the drawer's accent = `--stage-out-3` (a Full Sent query — decision 3
end to end); the clamp holds at both ends; the reorder preview renders the full ledger IN the desk
and Cancel costs nothing.

**⚠️ My first notch assertion was VACUOUS and its own mutation proved it**: the arrow is derived
as `centre − top − 8`, so `cardTop + arrow + 8` equals the centre whatever the card does — a card
pinned at a constant top passed green. The claim that can fail is the CARD's anchor
(top = centre − 42 when unclamped); asserted so, the same mutation fails with "the card is not
anchored to the rung". The composed-result trap, caught in my own probe by running the mutation
the brief demanded.

**⚠️ And the first harness run cost 14 minutes on an ambiguous name**:
`.qcc:has-text("Rachel Lin")` matched a plain seeded query with no activity docs — three cases
waited 420s for a ⋯ that could never render, on a working page. Cards carry `data-qcc-id`; the
helper now refuses to guess, and the ⋯ count is WAITED for (the docs arrive by subscription after
the synthesised root has drawn).

**The Agent tab** (layout A): hero, door pill in the two-systems vocabulary, action chips —
**a social links only when the stored handle is already a URL** (no derivation in this app turns
"@priyareads" into an address; inventing one would fabricate a fact); four tiles (silence keeps
its three states — unstated is an origin, `—`); wishlist pull-quote absent entirely when empty;
asks from `materialRowsFromAgent` — the ONE reader, whose display name for the letter is
"Covering letter" (the spec asserted the stored token and learned the difference); history rows
with the query's own band tint as swatch (a second sanctioned `--band-a` reader — the ladder lock
names both and still refuses chrome). The grey "not looking for" treatment ships UNWORN, with a
lock asserting no chip wears it.
Red-then-green: onMove reinstated · Escape uncaptured · the wishlist rendered empty · a bare
handle given an invented URL · the card unanchored (measured).

## §5 — cleanup, funnel, shots · `92bb1c9d` · 17 files

Deleted: the withdrawn direct editors, the rung PortalMenu, the drawer's expected-date picker,
`panelRungs`, the `PanelRung` interface, 46 orphaned CSS rules. **The funnel is a lock**:
`editActivity` is called exactly twice — the desk's commit and its undo — both inside
`<CorrectionDesk>`; the withdrawn shortcuts are asserted absent by name.

Two of my own instruments failed first and are in the commit: the CSS block cutter removed a
reduced-motion rule serving two LIVE selectors (`.qpn, .qpn-scrim, .qpn-more`) — restored minus
the dead member; and the orphan grep reported `qpn-b` as live off `qpn-band` prefix matches — the
bounded-token rule, violated by the sweep enforcing cleanliness.

Kept, deliberately: `queryPanelRungs.ts` (`rungEntry` still reads `rungFacts` for the entry's
label) and `commitExpectedDate` (*open question 2*).

Shots — `reports/query-drawer-2-shots/`, 1440 + 1920, all looked at: each tab at rest, the desk
at the fork on a clamped rung, the edit form, the consequence ledger.

## Deleted paths

Nothing left the tree as a whole file. Deleted from within: the record branch is UNTOUCHED (it
still stands from the earlier run's reverted §6, with its 30-file lock dependency); the removals
were the drawer's withdrawn machinery listed above.

## NOT RUN, with cause

- **The future-date and kind-within-direction guards were not separately re-proven in the desk.**
  They are CorrectionEdit/preview internals, inherited unchanged, and the do-not-touch list keeps
  this run out of them. The root guard and the reorder preview WERE exercised (measured).
- **Decision 2's edit-form materials fields are NOT BUILT** — the run's one genuine gap, below.

## Open questions — conservative option taken on each

1. **Move is now unreachable.** Built, tested, live at the run's start; decision 5 said two
   branches. *Taken: follow the brief; one `onMove` prop restores it.*
2. **The writer's expected date stays editable in place** (QueryTimeline's SetWindow →
   `commitExpectedDate`, with undo). It is a statement about the future, not a correction of the
   record, so I did not route it through a fork built to protect records. *Taken: keep in place.*
3. **⚠️ Materials on a send are VIEW-ONLY from the drawer this run.** Decision 2 wants the strip's
   contents as fields on the edit form; the do-not-touch list forbids touching the Correction UI's
   internals, and any honest implementation extends `CorrectionEdit` (an additive `extraFields`
   slot — one prop, defaulted off, plus a host block). The old toggle rows are gone (decision 1),
   so recording materials currently routes through the packages attach and the To-do materials
   journey, not the drawer. This is a real capability gap and the first thing to sanction.
   *Taken: report rather than breach the do-not-touch.*
4. **The strip's Change/Remove package footer is not offered in the drawer** — the strip renders
   read-only with `onView` only; attachment management stays on the packages surfaces. *Taken:
   read-only; PackageGroup's optional handlers are one wiring away.*
5. **`Open in Contact list ›` cannot select the agent** — no route or param exists for agent
   deep-selection; it navigates to `/agents` plain. Building one is routing work outside this run.
6. **The ring's box includes the rung's 22px gap padding** (`.tl-ev` pays `--tl-gap` in
   padding-bottom), so the ring extends below the row's ink. Cosmetic; the ref rings a tighter
   box. One `outline-offset`-style refinement if wanted.

## Gate

Baseline moved twice during the run, neither mine: it opened at two other-stream reds
(`datePickerHub`, `calendarTokens`) and closed at four — the To-do session committed
`todoPageSmoke` + `todoTokenResolution` reds beneath this run mid-flight (established by
`git log` per file; nothing moved). Every commit: tsc 0 · `vite build` clean (whole log, not the
tail) · vitest at that baseline with zero additions. Measurements ran against clean `build:dev`s
of the working set in a detached worktree, seeded by `seedCorrection.mjs` (idempotent; the one
committing case cancels instead).
