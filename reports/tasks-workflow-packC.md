# Pack C — the committer, and the calendar mounts the pane

**Session** `tasks-workflow` · `1a1fdc6f` → `7d1274ba` · **NOT DEPLOYED**

## 1. Deployed or not, and why

**Not deployed — condition 4.** Another session holds uncommitted shipping source in the tree
(`src/components/Queries.tsx`, `src/lib/packageAttach.ts`, `src/lib/detachPackage.test.ts`). A dev
deploy would ship their work-in-progress. **Fifth consecutive pack blocked on the same condition.**

## 2. Did any of `quickDone`'s four reaches prove load-bearing?

**None.** And the answer went further than the question.

`setOverlay` is called only after a completed write; `clearOverlay` only inside undo closures; and
`setFlowPrefill` + `openFlowCards` are reachable **only through the receipt's own `edit`**, which is
handed to `setOverlay` and nowhere else. With no sink, `edit` is built and never reachable — so a
quick mark-sent on the calendar has no *"Edit details"*, and nothing else differs.

**⚠️ AND THE SINK'S TARGET IS ALREADY UNRENDERED.** The pack was built on the ruling that `/todo`
draws a card receipt *in addition* to the toast. Measured on a rendered page: **it doesn't.**
`overlayCards` is the only reader of the `overlays` state and the only thing that renders
`.tdb-tile.receipt`, and it **lost its last caller on 6 Aug in `72f6138c`** — the commit that turned
the board into a grouped list. `setOverlay` has been writing into state nothing renders for
seventeen days.

So the sink is a **vestige, not a divergence**: the toast is already the sole receipt on both
surfaces, and they agree without anything being built. The optional-sink shape is unaffected —
`/todo` still passes one, so if `overlayCards` regains a caller the receipt returns by itself.
**Whether to delete the dead machinery is yours.**

## 3. Could toast-as-receipt be asserted without spending a fixture?

**Yes.** The check creates its own dated task and completes it from the calendar. A dateless note is
not a board card (`boardEligible` filters it), so it can never dock — the task must be dated, which
the composer enforces anyway. Measured: `Done — "…" Undo`, Undo control present, **no card receipt
attempted**, pane closes.

## 4. Locks retargeted, and those spanning the seam

**Ten path-bound locks across eight suites** broke on the Phase 1 move; none asserted anything that
had changed. Retargeted under the standing rule, each stating its law. **Three span the seam:**

- `paneCommit.test.ts` — `slice()` now searches page, session **and** committer, asserting it found
  exactly one, so the next relocation fails loudly rather than reading nothing.
- `todoFinishing.test.ts` — the strike case asserts the **page** keeps no strike state *and* that it
  still **reaches** the primitive; asserting only the second would pass on a page that had quietly
  stopped completing anything.
- `todoWorkbench.test.ts` — the scope's three blocking choices are counted across page + committer
  rather than narrowed to whichever half is convenient.

**⚠️ Two further locks were SUPERSEDED, which is a behaviour change and not a retarget.** *"A pip
opens the item sheet"* is now *"a pip opens the task pane"*, with the hand-off half asserted. And
the calendar's blanket ban on `role="dialog"` is **narrowed**: the law it protects is the *day*
modal's — a dialogue between the writer and the month — and that is untouched, five classes still
rendering nowhere with no rules. It now asserts there is exactly **one** dialog and it is the pane's,
which is stronger than the ban, because a second one fails.

## 5. Did the calendar keep a `FocusFlow` mount, and why?

**Yes, and it is load-bearing.** `offer` and `fix` reach it exactly as they do on `/todo` — through
the pane's own primary, past `paneCommits` — because those two ask questions this form does not
draw. Measured: an offer opens its sheet **and the pane closes behind it**, so the month never
carries two layers. `FocusFlow.tsx` is byte-identical in this pack.

## 6. What remains unverifiable

- **The jump could not be driven.** No card left on this account has an unanswered gate, so nothing
  reveals the missing bar. Its *scoping* is covered structurally: `cal-s-when` sits inside the
  calendar's window while `s-when` sits outside it, **in the same document** — the collision the
  prefix exists to prevent, demonstrated rather than argued.
- **Whether Undo reverts** is still unproven end-to-end. Standing harness gap, unrelated.
- **The weekly review was not walked.** Its nudge step is locked in *source* — the honest artefact
  for "the route was not disturbed" — plus `FocusFlow` being byte-identical.

### ⚠️ And a fixture was spent, which is mine to own

The jump's first version opened an **R&R** and pressed its primary, reasoning that `dockPrimary`
reveals the missing bar and returns before committing. True in general and **false for that card**:
an R&R's materials are pre-ticked, so the gate was already satisfied and the press wrote.
**`seed-query-11` went `Revise & Resubmit` → `Full Sent`, and the seeder cannot put it back.** The
precondition was assumed rather than asserted. The probe now reads the primary's label first and
presses only when it states an unanswered count.

## 7. Cross-session observations

- **The dev rules divergence is unchanged and still blocking** (`dev-rules-divergence.md`). It is
  what makes every spent fixture permanent, including mine.
- **`FocusFlow` completes user tasks inline** — `updateUserTask({ done: true })` at `FocusFlow.tsx`
  1289 and 1318, rather than through `quickDone`. Pre-existing and outside this pack's territory,
  but it is a second completion path, and *"one primitive, four entrances"* is the law it sits
  beside. Worth a look.
- An untracked `tests/e2e/restoreHarness.measure.ts` appeared in the tree during the run; not mine.
