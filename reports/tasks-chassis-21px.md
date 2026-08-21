# Tasks chassis — the unreachable 21px

**Session:** `tasks-chassis` · 22 Aug 2026. One defect, measured before and after.
Found and measured by the `calendar` session (`reports/calendar-peek.md`), correctly not fixed there.

---

## Step 0 — gates

- **Red gate — anyone editing `src/components/todo/` or the Tasks pages:** `git status --porcelain
  src/components/todo/` → **empty**. Clear.
- `main`, HEAD `aa4bcb9e`. Baseline **`tsc` 0 errors**.
- Other sessions active in `src/lib/db.tsx` and QC measure files — not the Tasks pages.

---

## Phase 0 — MEASURED: the chain, and where it first exceeds the viewport

Instrument: `tests/e2e/chassis21.measure.ts` (new; `calLook.measure.ts` untouched). It walks the
ancestry **up from `.wpg-scroll`**, never querying by class — every workspace page stays mounted,
so a bare query can return a hidden page's copy, which has already produced one false finding here.

**It reproduces exactly, and identically on all three pages** (1440 × 900):

| element | top | bottom | height | padding ↑/↓ |
|---|---|---|---|---|
| `div.t-capp.sa-shellframe` | 0 | 900 | 900 | 0/0 |
| `div.sv2-app.ws-host` | **41.75** | 900 | 858.25 | 0/0 |
| `div.ws-app` | 41.75 | 900 | 858.25 | 0/0 |
| **`div.ws-main`** | **41.75** | **941.75** | **900** | **0/20** ⚠️ |
| `div.ws-window` | 110 | 921.75 | 811.75 | (1px border) |
| `div.wpg-scroll` | 111 | **920.75** | 809.75 | 0/0 |

`.wpg-scroll` bottom **920.75** against a 900px viewport = **20.75px unreachable**, document
overflow **0**. That is the calendar session's 21px, confirmed.

### The rule responsible, quoted

`src/components/shell/workspaceShell.css:678`:

```css
.ws-main {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  height: 100vh; overflow: hidden; padding: 0 22px 20px; background: var(--ws-ground);
}
```

### The arithmetic, and the class of mistake

**`100vh` is the viewport's height — not "the height remaining from here down".** `.ws-main` starts
at **y = 41.75**, because the beta strip (`src/components/shell/BetaStrip.tsx`) sits above the
shell, and it still claims a full `100vh`. So:

```
  41.75  (top, pushed down by the strip)
+ 900    (height: 100vh — asks for the WHOLE viewport, from wherever it happens to start)
= 941.75  bottom
−  20    (its own padding-bottom)
= 921.75  content bottom  →  .wpg-scroll ends 920.75, i.e. 20.75px past the fold
```

**The constant offset was the clue and it points exactly here.** The overflow is
`stripHeight − paddingBottom` = `41.75 − 20` ≈ 21 — fixed, because both terms are fixed, which is
why it did not vary with viewport height or page.

> **⚠️ IT IS REDUNDANT AS WELL AS WRONG.** `.ws-app` is `display: flex` (a row) with
> `min-height: 0`, and `.ws-main` is `flex: 1` inside it. With the default `align-items: stretch`,
> `.ws-main` would fill its parent's height **on its own**. The `height: 100vh` overrides that
> correct sizing with an absolute claim about the viewport.
>
> **⚠️ AND `.sa-shellframe` HAS THE SAME DECLARATION AND IS CORRECT**, because it sits at `y = 0`.
> That is what makes this class of fault survive review: the identical line is right one element up
> and wrong one element down, and nothing distinguishes them but where they happen to start.

### ⚠️ The bug is dismissible, which is why nobody saw it

`BetaStrip` returns `null` when dismissed (`BETA_STRIP_DISMISSED_KEY` in `sessionStorage`). Dismiss
the strip and `.ws-main` starts at 0, `100vh` is momentarily correct, and the page is whole. **The
harness gets a fresh session every run, so it always saw the strip — and always saw the bug.**
Anyone who clicked the × once saw a correct page and would never reproduce it.

**This also means the offset is not a property of the chassis at all.** It is
`whatever sits above the shell − 20`. Any future banner of a different height changes it silently.

---

# ⛔ NOT DEPLOYED — and the reason is a consequence of the fix, not a gate

The fix is **correct and committed**, and the 21px is genuinely recovered. But measuring afterwards
found something the pack could not have anticipated, and it is Nick's call rather than mine:

> **The chassis fix pushes the Calendar's fold into a 5px overflow**, because the page previously
> drew into 42px of space that did not exist. Deploying the chassis fix alone would trade an
> *unreachable* 21px for a *visible* overflow on busy calendar days.

Details in "The consequence" below. Also: the packages/comps sessions have uncommitted and staged
source in the tree, so the standing deploy condition would fail regardless.

---

## Phase 1 — the fix

`workspaceShell.css:678`. **The fix is a deletion**, because the declaration was redundant as well
as wrong:

```css
/* before */
.ws-main { flex: 1; min-width: 0; display: flex; flex-direction: column;
           height: 100vh; overflow: hidden; padding: 0 22px 20px; … }
/* after */
.ws-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;
           overflow: hidden; padding: 0 22px 20px; … }
```

`.ws-app` is a flex **row** with `min-height: 0`, and `.ws-main` is `flex: 1` inside it — default
`align-items: stretch` already sized it correctly from wherever it starts. **No 21px appears
anywhere in the fix**, which was the trap the pack named.

## Phase 2 — measured, all nine combinations

| page | 800 | 900 | 1000 |
|---|---|---|---|
| `/todo` | −21 | −21 | −21 |
| `/todo/calendar` | −21 | −21 | −21 |
| `/todo/noteboard` | −21 | −21 | −21 |

*(`past` = scroller bottom − viewport. Was **+20.75** everywhere; now **−21**, i.e. inside the fold
by the 20px `.ws-main` padding plus the window's 1px border.)* Document overflow **0** throughout;
`overflow-y: auto` preserved.

**The Calendar's foot control is reachable again** — `"Open the list"` bottom **868** of 900, on
screen, and `elementsFromPoint` at its centre returns `button.cal-fpfootb` rather than `body`.
That was the defect's whole cost.

**The viewport lock needed nothing**: `tasksViewport.test.tsx` passes unchanged, **76 tests**.

> **⚠️ THE SCROLL LAW IS ASSERTED ON THE ELEMENT THAT ACTUALLY SCROLLS, AND IT TOOK THREE TRIES.**
> `.wpg-scroll` never overflows on a `fill` page **by design** (measured 328/328); `.tpl-zone`
> resolved to a mounted-but-hidden page's **0/0** copy. `/todo` really scrolls **`.l-body`**
> (516/306), the Calendar **`.cal-fpbody`** (1278/433) — both took a 120px scroll with document
> overflow 0. The probe now **finds** the deepest visible descendant of `.ws-main` that declares a
> scroller and genuinely overflows, rather than naming a class someone remembered.
>
> On **`/todo/noteboard` nothing overflows at all**, so the probe **reports the precondition as
> unreachable** and asserts only the weaker true thing — the document stays put — instead of going
> green having tested nothing.

## Phase 3 — STOPPED, per the pack's own instruction

`calFoldCap` and `calFoldCapFolded` live in **`src/lib/todoCalendar.ts`** (`:305`, `:320`), and the
only caller is `TodoCalendarPage.tsx` — both **calendar-owned**. The pack says to stop and flag
rather than force it, so it is stopped.

### The consequence — and this is why the deploy is Nick's call

Measured before and after, at 1440:

| | rowPx | cell available | fold draws | cushion |
|---|---|---|---|---|
| before the chassis fix | 96.50 | 63.25px | 2 pills + counter = 61px | **+2.25px** |
| **after** | **89.50** | **56.25px** | 2 pills + counter = 61px | **−4.75px ⚠️** |

`rowPx` fell **7px per row × 6 rows = 42px** — exactly the `.ws-main` overclaim. Of that 42, ~21px
was below the fold and unusable, and ~20px is the padding that now sits inside the viewport where
it belongs. **The page was drawing into space that did not exist**; it now draws only into space
that does, and there is less of it.

**The conflict is with Nick's own ruling, not with the fold's arithmetic.** `CAL_CELL_FLOOR = 2`
guarantees two occupants; the corrected row affords 56.25px and two pills plus a counter need 61.
Without the floor the honest cap would be **1** — which the density ruling forbids. Measured:
`day 12` and `day 13` overflow by 5px (`scrollHeight 94 vs clientHeight 89`).

**Three ways out, all Nick's to choose:**

1. **Run Phase 3 in the calendar session** — make the fold measure the pill instead of assuming it.
   That fixes the arithmetic but *cannot* create the 5px; it would honestly report a cap of 1 and
   so still collides with the floor.
2. **Give the calendar the room** — a `min-height` on `.cal-grid` at full width, as it already has
   at the collapsed width. Calendar-owned.
3. **Revisit the floor of 2** at this chassis height.

**I have not chosen.** The chassis fix stands on its own merits and is committed; the calendar
consequence is recorded rather than absorbed, because absorbing it would mean editing another
session's files to hide a fact Nick should see.

---

## FLAGS FOR NICK

**1. The rule, quoted, and the class of mistake** — `.ws-main { … height: 100vh … }`
(`workspaceShell.css:678`). The class is **`100vh` on an element that is not at the top of the
viewport**. `100vh` is the viewport's height, never "the height remaining from here down"; anything
above — here `BetaStrip` at 41.75px — displaces it without shrinking it.

Two details make it CLAUDE.md-worthy:

- **`.sa-shellframe` carries the identical declaration and is correct**, because it sits at `y = 0`.
  One element up it is right, one element down it is wrong, and nothing distinguishes them but
  where they begin.
- **The fault was dismissible.** `BetaStrip` returns `null` once dismissed (`sessionStorage`), so
  the strip goes, `.ws-main` starts at 0, and `100vh` is momentarily right. **The harness gets a
  fresh session every run and therefore always saw it; anyone who clicked the × once never could.**
  The offset was never a property of the chassis — it is `(whatever sits above the shell) − 20`,
  and a banner of a different height would have changed it silently.

**2. Pages whose layout changes beyond gaining the 21px** — all three Tasks pages are **42px
shorter in what they draw**, of which ~21px was never visible. That is the correction, not a
regression — but it is what pushes the Calendar's fold over (flag 4).

**3. Did the viewport-lock test need anything?** — **No.** 76 tests, unchanged. My own *browser*
probe needed three attempts to find the element the law is about; the unit lock did not.

**4. The cushion after the fold change** — the fold change did not happen (Phase 3 stopped on
territory). The cushion **after the chassis fix** is **−4.75px at 1440/1280/1920** and the cells
measurably overflow. **The fold does not survive a chassis height change without hand-editing a
constant** — which is precisely what Phase 3 was for, and precisely why it should run next.

**5. Cross-session** — the comps session has `ComparableTitlesPage.tsx` **staged** in the shared
index, and its masthead change fails `workspacePageGrid.test.tsx`'s census (verified: the file no
longer contains `variant="workspace"`). Not mine, not fixed. `git commit --only` correctly excluded
their staged files from both of my commits — twice. The `dist/` race also returned; measurement was
done in an isolated worktree (`/Users/nickphysick/ScriptAlly-chassis`, port 4192), now removed.
