# Noteboard — illustrated empty state

23 Aug 2026, unattended. Commit-only; nothing pushed, nothing deployed. The v1 run stopped at the
mockup gate (`139a740c`); this one had the file and built.

---

## 1 — Premises that turned out false

### 1.1 — The ref's own panel-three heading is not what v1 quoted, and it ships neither way

v1 said the mockup's third panel reads *"Give it a date."* It actually reads **"Give it a date, if
it needs one"** — with a qualifier that changes its meaning, since the whole point of the panel is
that dating is optional. Either way it does **not** ship: the phrase was retired with the
`give-date` menu id when the projection model gave one note two contradictory doors, and the
retirement is locked. Panel three reads **"Turn into a task"**, per the baked decision (§3).

Worth recording: the ref's panel-three **body** is accurate to the current model — *"stays here on
the board. One note, not a copy"* is date-on-note exactly — so only its heading verb was stale.
That is why the body and aside port unchanged and only the heading was substituted.

### 1.2 — A class collision *inside* the `nb-` prefix, invisible to every measurement

The instruction is "where a class name collides, prefix `nb-` and say so". Both names were already
prefixed. **The Examples drawer already owns `.nb-exhead`** for its group headings (mono,
uppercase, 10px, `.14em`) — so the examples' new intro block, reusing that name, inherited
`text-transform` and `letter-spacing` onto its paragraph and rendered the sentence in **shouting
mono**.

Every probe passed: the block was present, correctly ordered, and painted. None of them reads
casing. **The screenshot is what found it.** Renamed `.nb-exintro`. A prefix is not a namespace —
the collision the instruction guards against can happen entirely within it.

### 1.3 — Probe (e)'s first draft was satisfied by SVG's default

The spec asks for "a known fill inside it computes to a real colour string". The first draft took
the first `rect|path` with any fill and got **`rgb(0, 0, 0)`** — from the desk-line path, which
declares no fill and inherits SVG's default black. That is a real colour string, and it is
evidence of nothing: **artwork that was never painted at all would pass it.** The probe now
requires one of the three papers' own fills, which only the ported geometry can produce —
`rgb(251,243,217)` / `rgb(245,226,218)` / `rgb(233,237,230)`, one per panel.

*(The desk-line path's default fill is harmless — a straight `H` line has zero area — and it is
the ref's own geometry, so it stays.)*

### 1.4 — The comment-stripping helper ate `role="img"`

`decls()` strips `//` line comments. `xmlns="http://www.w3.org/2000/svg"` contains `//`, so every
SVG's opening tag was truncated from `http:` onward — taking `role="img"` with it and reporting
**three correctly-labelled illustrations as zero**. The house law's own tool, biting the house
law's own check. Fixed with a lookbehind that spares a scheme.

### 1.5 — Two probe helpers matched `nb-opening` inside `nb-opening-cta`

Both this run's section-sequence helpers used `\b` boundaries. A hyphen **is** a word boundary, so
`nb-opening` matched inside `nb-opening-cta` and `nb-exhead` inside `nb-exhead-h`, double-counting
sections and failing correct pages. The prefix trap this repo has been bitten by twice, wearing a
regex instead of a `toContain`. Both now split the class list and compare member by member.

### 1.6 — Two locks matched their own explanatory prose

`tasksNoteboard`'s new case read `noteboardEmptyState.tsx` raw and matched *"Give it a date"* — in
the docstring explaining why that phrase is substituted. The comment-stripping law, met on its own
doorstep for the second time this month. And `.nb-empty`'s check found a live `ArtSlot` **import**
that was genuinely dead — one prose match, one real finding, from the same red.

### 1.7 — The workflow first replaced the board rather than sitting above it

The obvious port put the workflow in `.nb-empty`'s ternary branch — which meant at zero notes the
**board never mounted and the examples could not render at all.** Precisely the fault the paper run
had found and fixed from the other direction. The workflow renders *above* a board that always
mounts.

---

## 2 — Coexistence: shipped as specified

**The workflow and the example papers coexist**, and the fallback was not needed. Measured on a
rendered page, not inferred:

```
[coexist] {"opening":true,"steps":true,"cta":true,"exintro":true,"exs":3} · ordered=true
```

`ordered=true` is a geometric check — each section's box sits below the previous one and every
example below the header — because DOM order alone would not have caught the multicol flow problem
that bit the hint line one run earlier.

The condition is **zero notes, full stop**, overriding the inherited *"empty AND every example
dismissed"*. `.nb-empty`'s heading, paragraph, CTA and ArtSlot are **retired**, not demoted — so
the page teaches twice at most (workflow + examples) and never three times. The case the old
condition got wrong is asserted explicitly: with every example dismissed the workflow **still
renders**, alone.

## 3 — The constant extraction

`MAKE_TASK_LABEL = "Turn into a task"` lives in **`src/lib/todoMenu.ts`**, beside `noteMenu()`.
Both surfaces read it:

- the kebab renders `` `${MAKE_TASK_LABEL}…` `` — the ellipsis is the *control's*, because it opens
  a popover;
- panel three renders the bare constant — a heading opens nothing.

**The retirement test is untouched.** `tasksNoteboard.test.tsx`'s `expect(page).not.toContain("give-date")`
is unchanged, and the new lock asserts the *module* carries neither `give-date` nor the retired
phrase.

## 4 — Illustration precedent

Followed **`manuscriptMarks.tsx`** — inline SVG, baked fills, no `currentColor`, no token, no
`var()`, so a scene renders identically in all three themes. Locked: `noteboardEmptyArt.tsx`
contains no gradient, filter, shadow or partial opacity, carries exactly three `role="img"` and
three `aria-label`s.

**`ArtSlot` was not used**, and its `"noteboard-empty"` slot is **left registered and unused** —
it renders `<img src>` and `src` is absent for every slot it holds, so adopting it would have put
a raster dependency in an illustrated state that has none. `artSlots.test.tsx` now records that as
the decision rather than asserting a mount (its old trigger case is skipped in place, with the
reason).

---

## 5 — Phase by phase

### P1 — the empty-state component · `a538f931`
`todoMenu.ts` · `noteboardEmptyArt.tsx` (new) · `noteboardEmptyState.tsx` (new) ·
`noteboardEmptyState.test.tsx` (new) · `TodoNoteboardPage.tsx` · `todoNoteboard.css` ·
five locks repointed

**Red first, then green.** Unit: 8/8 after (the module did not exist, so every case was red).
Browser, red against dev then green on the worktree build:

| Probe | Red (dev) | Green |
|---|---|---|
| (a) ordered sequence, zero notes | — | `heading steps cta examples-header example example example` |
| (b) zero notes, all dismissed | — | `heading steps cta`, no examples |
| (c) one note | — | `examples-header example×3`, no workflow |
| (d) three notes | — | `""` — neither |
| (e) painted SVGs | *"the three illustrations are not on the page"* | 250×130 each, palette fills, `gradients=0`, three distinct labels |
| coexistence | `{"opening":false,…}` | `{"opening":true,…,"exs":3} ordered=true` |
| (f) panel three = the constant | — | `NOTEBOARD_STEPS[2].heading === MAKE_TASK_LABEL` |

Every panel's body and aside are asserted **against the ref itself** (tags stripped — panel two's
sentence is split by a styled `<span>` around `#agents`, so the contiguous string exists only once
the markup is gone).

### P2 — CTA wiring · `b4e8b22b`
`noteboardEmptyState.test.tsx`

The wiring landed with P1 (the component takes `onPin` as a prop); this commit is the **evidence it
cannot drift**. Structural: the empty state holds no composer state, imports no composer, renders
no textarea — a lookalike second composer would pass a presence check and **cannot exist** if the
component has no way to build one. Measured, all three doors:

```
[composer] cta      count=1 focused=true classes="nb-c-yellow nb-compose"
[composer] toolbar  count=1 focused=true classes="nb-c-yellow nb-compose"
[composer] ghost    count=1 focused=true classes="nb-c-yellow nb-compose"
```

Identity by **class set**, not by count — the count is what a lookalike passes. The toolbar
selector needed scoping to the visible row: pages stay mounted, so `.tpl-tools .tdb-addb` matches
the To-do list's and Calendar's buttons too. Playwright's strict mode caught the default-subject
trap rather than letting the probe answer about the wrong page.

### P3 — sweep · this commit

```
tokens read: 27 · dangling: none
rendered but unstyled: none
styled but never rendered: none
gradient on a note surface: none
gradient/filter/shadow inside the SVGs: none
display:contents / mix-blend-mode / transform on a note: none
```

The paper rules sit **after** `.nb-note`'s transparent border (re-checked after every CSS edit).
`.nb-empty`'s rules were deleted with the panel; `.nb-empty-search` is a different thing and stays.
**The sweep itself was widened** — it scanned only the page file, so it reported the whole workflow
as "styled but never rendered"; it reads all three rendering files now.

---

## 6 — Degraded, skipped, and what remains

1. **Nothing was skipped.** All six Phase 1 probes, Phase 2's identity probe and all eight
   screenshots landed.
2. **`artSlots.test.tsx`'s old trigger case is `it.skip`**, not deleted — the slot still exists and
   its brief is still right; only its mount is gone. Skipping in place with the reason keeps the
   record where the next reader will look. This is the one `skipped` count above baseline.
3. **The `nb-scope` sweep** was not re-run in this phase because no floating surface changed; the
   paper run's lock (all four surfaces carry the scope) still passes in the suite.

## 7 — Baseline vs final

| | Files | Tests |
|---|---|---|
| Baseline (Step 0.2, re-measured) | 375 passed | 6375 passed · 2 skipped · **0 failed** |
| Final | **376 passed** | **6384 passed** · 3 skipped · **0 failed** |

**No other-session failures at either end.** Another session is live in this checkout (its Query
Centre and calendar work is in `HEAD`); `src/` was clean at Step 0 and every gate was attributed by
`git diff --name-only HEAD` before being believed.

**Do-not-touch:** thirteen files across the three commits — the ref, the Noteboard's own sources
and locks, and `todoMenu.ts` (additive: one exported constant, one template substitution). Grep
against every protected name returns nothing.

## 8 — Left for Nick

- **Nothing to deploy from this run**, and no rules change. The behaviour ships with the next
  ordinary dev deploy:
  `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`
- **The harness account's example dismissals are set** and three `SHOTNOTE` notes exist — the
  dismissed-state and three-note screenshots created them through the real UI. Reset with the
  seeder's clean flag plus a prefs reset if you want a fresh sparse board:
  `node tests/e2e/seedNotes.mjs --clean`
