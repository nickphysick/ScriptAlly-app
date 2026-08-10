# Dashboard polish round — run report

Base `b3394bf`. Run in the dedicated worktree, one commit per phase.

| Phase | Commit |
|---|---|
| 1 — `+ New` out of flow | `06200b4` |
| 2 — conditional fades (+ P7's foot clipping) | `bc47755` |
| 3 + 4 — micro-interactions, reduced motion | `3515e95` |
| 5 — timeline grammar + the name bug | `875e30a` |
| 6 — manuscript selector | `454cb5e` |
| 7 — pills, copy, goals | `e8e3fdf` |
| 8 — this report | *this commit* |

Final gates: `tsc` clean · **225 files / 3,518 passing, 2 skipped** · `npm run build` ✓.

---

## Step 0 — recon

**The `+ New` menu — in flow, confirmed.** `.ws-newwrap` already had `position: relative`, but
`.ws-newmenu` had **no rule at all**, so `.sp-card`'s static positioning applied.

**The missing agent name — a data bug, found.** `updateAgent` (`src/lib/db.tsx`) composed five
activity descriptions from `existingAgent.name` **raw**. An agent is valid with an agency and no
name, so the sentence lost its subject: `You updated details for  at Penhallow Literary`. The
canonical `agentPrimary()` helper existed and was **already imported in that file**.

**The goals card — the meter was never the problem.** `goalMeter` has always clamped `filled`. The
`2/1` came from the header rendering `{done}/{target}` raw.

**`Today` — deliberately retired**, 9 Aug, tasks-consolidation P1 (`todoRoutes.ts`): the ranked
order of the one list is the plan, and `/todo/today` redirects to the page that absorbed it. **Not
restored**, as instructed.

---

## Phase 1 — the menu does not displace content

Measured in a render harness against the **built** CSS at 1440×900:

| | window top | window height |
|---|---|---|
| **with the fix** | 68.25 → **68.25** | 811.75 → **811.75** |
| **without it** | 68.25 → **221.25** | — |

**153px of displacement, removed.** Menu measured 8px below the button, right edges both at 1412,
`position: absolute`, `z-index: 60`.

Keyboard: arrows cycle (with `preventDefault`, or the page scrolls under an open menu), Tab closes
rather than trapping — this is a menu, not a dialogue — focus lands on the first item and returns
to the button **only if it is still inside the menu**, since a selection that navigates has already
placed it.

**⚠️ Items: the ref draws six, four exist.** "Add a manuscript" is built (App.tsx intercepts that
exact sub-page name). **"New note" is not**: that composer opens via an event only the To-do *page*
listens for, so from the dashboard the row would do nothing. The shell renders what exists — it
waits for a real contract.

## Phase 2 — conditional fades

Both bodies ride **`EdgeFadeScroll`**, the app's one internal-scroll mechanism, rather than a second
implementation. **Deviation:** it uses 28px and a 3px threshold where the pack said 26px and 2px.
Matching those numbers meant forking the mechanism, which the house rule forbids.

Measured against the built CSS:

| | short list (2 rows) | long list (20 rows) |
|---|---|---|
| at rest | none | bottom only |
| mid-scroll | none | **both** |
| at end | none | top only |

A permanent fade at the end of a list is a lie; it does not appear.

## Phases 3 + 4 — micro-interactions and reduced motion

All `transform`/`opacity`. **The counter figures never move** — only the icon scales and tilts; a
headline number that shifts under the cursor reads as unreliable. Search focus is a `box-shadow`
ring, so the field cannot change width and shove the bar's flanks. Task rows keep their plain
hover; the rejected hover-revealed action button was not reintroduced.

The reduced-motion block collapses transitions **and** animations including delays, and switches
the entrance offsets off outright — a 0.01ms animation still paints its first keyframe. Nothing on
the page is hover- or animation-revealed, so disabling motion removes polish, never function.

**⚠️ The lock caught me one phase later.** Phase 6's CSS was appended *after* the reduced-motion
block, silently exempting every new transition. That is exactly why the test asserts the block is
**last** rather than merely present.

**⚠️ Two layout transitions predate this pack** — the panel's `width` collapse and the rail
stowables' `max-height`. Both are those components' documented mechanism, not decoration, so they
are allowed **by name** and the assertion still fails on a third.

## Phase 5 — timeline grammar, and the bug beneath it

Every row is now **pill = verb, line = subject, caption = context**.

**The root cause is fixed at source** (`agentPrimary` in `db.tsx`). ⚠️ **This string is written INTO
the activity record**, so descriptions composed before this fix keep their hole permanently — it
cannot be repaired at the render.

**The subject is looked up, not parsed.** `Activity` carries no `agentId`, and picking a name out
of the description with a regex is the string-parsing this codebase forbids. The **agent list** is
the authority: find the agent whose name or agency the description contains, longest match first
(or "Vane" claims "Vane-Coe"). **That lookup also repairs the legacy rows** — a description with a
hole still carries the agency, so the agency match recovers the subject.

The run verb pluralises with its subjects ("Agent updated ×6" reads as one agent six times), and
the caption names two then counts the rest — listing four and ellipsing the last loses a name
mid-word, the very truncation this phase removes.

## Phase 6 — manuscript selector

Full width, arrows at the right (20×24, aria-labelled, greyed **and** genuinely disabled at one
manuscript), dots beneath only when there is more than one. Arrows sit **outside** the card's
button — a button inside a button is invalid and the inner one never receives its click.

`stepManuscript` **wraps** rather than clamping: clamping would give the arrows a second disabled
state and turn a shortcut into something you must inspect before using. The selection became
**state** — it was read from `localStorage` during render, which no arrow press can invalidate;
storage remains the cross-mount source of truth. Stepping deliberately does not re-route.

## Phase 7 — pills, copy, goals

Pills: one pastille fill, measured `rgb(244,247,250)` on `rgb(221,230,238)`, text `rgb(74,90,107)`,
figures `rgb(44,63,82)` — exactly the spec. The per-kind fill rules are **deleted**, not overridden.

**Goals wording, as required to be stated: `{done} — done`.** So `25/25` → `25 — done` and the
reported `2/1` → `2 — done`. Completion is stated and the real number kept, rather than reporting
over-achievement as a fraction that looks like a miscount. Verified at 0/25, 21/25, 25/25 and 2/1.

**⚠️ Flagged, not changed:** the chart's early-days chip still reads `{n} awaiting a reply`
(`awaitingChip` — a separate string the pack did not name). **The screen now carries both
phrasings for one idea.** Unifying it is a one-line change; say the word.

## Phase 8 — verification

Automated and browser-measured as above. Locks added: `newMenu.test.ts` (10), `motionPolish.test.ts`
(11), `manuscriptStep.test.ts` (5), `goalFigure.test.ts` (5), plus feed-grammar assertions.

**Three locks were RETARGETED rather than deleted** — the header-pill copy, the WHITE-pill
assertion, and `oneScreenRail`'s subject assertion, which pinned the sentence grammar P5 replaces.

### ⚠️ NOT DONE — the 1440×900 screenshot, again

`/dashboard` is auth-gated and I will not enter credentials, so the only capture available is the
sign-in page. Everything above is verified by source, by the suite, and by browser measurement of
the built CSS in a harness — **but nobody has looked at the running dashboard**. Worth your eye:

1. The pastille pills against the pink tasks band — the one change most likely to be wrong by taste.
2. The timeline's new subject grammar on real data, including a legacy row whose name was lost.
3. The manuscript arrows and dots at one manuscript and at three.
4. The fades mid-scroll on a real feed.
5. The whole entrance, then again with Reduce Motion on.

Cappuccino only; Bold and Editorial remain unreviewed across this and the preceding packs.

### Gate integrity note

Another stream's **uncommitted** work sits in this worktree (files present in the working tree,
absent from `HEAD`). Nothing this pack touches is among them, so the pack's halt condition was not
met — but the green suite ran against a tree containing their in-progress code, not against `main`
as committed.
