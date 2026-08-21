# Calendar — FocusFlow feedback (silent completions)

**Session:** `calendar-toast` · 22 Aug 2026. One defect, self-contained.
Found during the peek pack's recon (`reports/calendar-peek.md`).

> # ⛔ NOT DEPLOYED — condition 3 of the standing rule.
>
> **Own gates green**: `tsc` **0**, Vitest **361 files / 6171 passed / 0 failed**, build exit 0,
> target guard *"bundle targets scriptally-dev (dev); gen-lang-client-0801391782 absent"*.
>
> **What failed: six files of the packages session's uncommitted source** would have been baked in
> — `MaterialsBand.tsx`, `RemovePopover.tsx`, `packagesBroadsheet.css`, `packagesOverview.ts` and
> two test files. The fix is committed and ready; deploy is one command once they commit.

---

## Step 0 — recon, and the fix was smaller than the defect looked

| # | Question | Answer |
|---|---|---|
| 1 | How `ToDoPage` wires it | `ToDoPage.tsx:2162` — `onNavigate={onNavigate}` (its own prop) and `onToast={flash}` from `useTodoToast()` at `:289` |
| 2 | Can the calendar call `useTodoToast` as-is? | **It already does** — `TodoCalendarPage.tsx:245`, held for tag-creation failures. No host needed, nothing to build |
| 3 | Does the calendar host the toast? | **Already does** — `:605-613`, the same markup `ToDoPage` renders at `:2155` |
| 4 | What `onNavigate` is for | Flows that route out (e.g. to a query). App.tsx **already passes** `handleNavigate` at `:708` |

**So both handlers were dead ends over live wires.** The page had the hook, the host and the
navigation prop; it simply passed `() => {}` to the flow instead of them.

### The host cannot be clipped, and sits above the flow

`.tdb-toast` is `position: fixed; left: 26px; bottom: 26px; z-index: 60` (`todo.css:962`, `:968`)
and the flow's scrim `.tdb-ff` is `z-index: 50` (`:1113`). So a receipt fired from inside the flow
renders **above** it, and no scroll container can clip it. Structural, not measured.

---

## Phase 1 — what changed

Three edits, all in `TodoCalendarPage.tsx`. Nothing shared touched.

1. **`onToast={flash}`** — the same `useTodoToast` instance the page already holds.
2. **`onNavigate={onNavigate}`** — the page's own prop, previously declared and never destructured.
3. **The prop's signature widened** to match `ToDoPage.tsx:275` and `FocusFlow.tsx:132` exactly:
   `(tab, subPageName?, opts?: { agentId?, manuscriptId? })`.

> **⚠️ THE THIRD ONE IS NOT TIDYING.** The calendar's prop was `(tab, subPageName?)` — narrower —
> and that **typechecks**, because a function taking fewer arguments satisfies one taking more.
> Which is exactly what made it dangerous: a flow routing to a named agent would have had its
> `agentId` dropped at this boundary with nothing failing. `handleNavigate` accepts it; only this
> declaration did not.

**No new toast, no new host, no new copy.** The receipts and their Undo are whatever the shared
hook and `FocusFlow` already produce — which is the only way the two pages can be relied on to say
the same thing.

### The lock, and it catches the original defect

Four assertions in `todoCalendar.test.ts`, **verified red** by restoring `onToast={() => {}}`:

- neither handler is a no-op, asserted on the mount's own slice;
- **the wiring is asserted against `ToDoPage.tsx` itself**, not against a literal — if that page
  ever stops passing its flash, this says so rather than quietly describing a page nobody matches;
- exactly one `useTodoToast()` instance on the page, feeding both the tag writes and the flow;
- no calendar-local toast copy was authored (`flash("…")` with a literal is forbidden here).

---

## Phase 2 — verification, and what it could NOT establish

**Toast copy parity is structural rather than measured, and that is a stronger claim than a
comparison would have been:** both pages mount **the same `FocusFlow`**, which authors the copy,
and both pass a `flash` from the same `useTodoToast`. There is no calendar-local copy — asserted.
So the copy cannot differ for the same action; what could differ was whether it appeared at all,
and that was the defect.

### ⚠️ Undo was NOT verified end to end. Flag 4's honest answer is "neither".

I could not drive the flow's controls from the harness at all — so I verified neither that Undo
works nor that the control renders. Four attempts, diagnosed rather than abandoned:

1. My primary-button locator matched nothing; the run hung for 7 minutes.
2. The flow opened on an **offer** card — a three-door journey with no single primary. Retargeted
   to a send card: the primary is `.tdb-ffpri` ("Record your resubmission →") and there is a
   `Snooze` beside it.
3. `Snooze` was found but every click timed out. **Diagnosed**, not guessed:

```
DIAG [{"rect":{"x":0,"y":0,"w":0,"h":0}, ... "stack":["body.","html."]},
      {"rect":{"x":504,"y":617,"w":66,"h":40}, ... "stack":["body.","html."]}]
```

- **There are TWO "Snooze" buttons, and one is ZERO-SIZED** — every workspace page stays mounted,
  so the DOM carries a collapsed duplicate. `.first()` grabs it, and a 0×0 button can never satisfy
  actionability. *(Same family as the `.tpl-body` reading that measured a hidden page two packs
  ago — my own report warned about it and I still walked into it.)*
- **But scoping to the visible one did not help**, and the real reason is the second column:
  `document.elementsFromPoint()` at the real button's centre returns **`body`**, not the button. The
  flow's subtree is not hit-testable at that coordinate, so Playwright's actionability check can
  never pass. Lifting motion suppression (`liftMotionSuppression`) did not change it.

**The rect was asserted on screen before asking what owns its pixels**, so this is not the vacuous
off-viewport case — the point is inside the viewport and the answer is genuinely `body`.

**What that means for confidence.** The wiring is correct by construction and locked: the hook, the
host and the handler are the To-do page's own, asserted against that page. What is unproven is the
end-to-end behaviour in a browser — and **the same obstacle would have blocked verifying this
defect before the fix**, so it is not evidence the fix is wrong; it is evidence the harness cannot
currently drive `FocusFlow`.

**No stray dev data.** No click ever landed, so nothing was written and nothing needs cleaning up.
The To-do badge read **17** before and was never moved.

---

## FLAGS FOR NICK

**1. Deployed or not —** not; the packages session had six uncommitted source files. Everything of
mine is green and committed.

**2. Did `useTodoToast` mount cleanly? —** it was already mounted. The calendar has called it since
the board-optimise pack (for tag-creation failures) and already renders the identical host. Nothing
was added; two dead props were connected to live wires.

**3. Remaining differences in receipts —** none that I can find in code, and the reason is
structural: same `FocusFlow`, same hook, no local copy. **Unverified in a browser** (below).

**4. Was Undo verified end to end? — NO, and neither was the control's rendering.** The harness
cannot click inside `FocusFlow`: `elementsFromPoint` returns `body` at the control's centre, and
there is a zero-sized duplicate control from mounted pages that captures naive locators. This is a
**harness gap worth its own small pack** — it blocks browser-verifying *any* flow interaction from
*any* page, not just this fix.

**5. Cross-session —** the `tasks-chassis` pack still has not run (checked again at Step 0; no
report, no `chassis:` commits). The packages session is active and its dirty source is what blocked
the deploy; `dist/` also went stale mid-run from its edits, costing a rebuild. Nothing of mine
moved under me, and the calendar page was untouched by anyone else throughout.
