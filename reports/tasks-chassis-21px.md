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
