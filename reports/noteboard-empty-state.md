# Noteboard — illustrated empty state

23 Aug 2026, unattended. **Stopped at the Step 0.2 red gate. No source was edited, nothing
committed, nothing pushed, nothing deployed.**

---

## 0 — The gate

> **0.2** … Nowhere → RED GATE, stop.

`design-refs/noteboard-empty-state.html` does not exist, in the tree or anywhere else on this
machine. Searched:

| Where | Result |
|---|---|
| `design-refs/` | absent — the noteboard refs there are `noteboard-mockup.html` and `noteboard-sparse-mockup.html`, both from earlier runs |
| `~/Downloads/` | absent by that name; **nothing new in the last 24 hours at all** — the newest files are `176-empty-pane-final.html` and `174-onload-state.html`, both 22 Aug 18:49 |
| `~/Desktop`, repo tree, depth 3 | absent |

Three files matched a loose `*empty*state*` search and **none is this mockup** — checked by
content, not by name, against every distinctive string the prompt quotes (`Write it down`,
`Colour and tag it`, `Your board is empty`, `What writers keep here`, `Pin your first note`,
`Give it a date`). All six strings return **zero matches** in every candidate:

- `design-refs/empty-states-ref.html` (also in Downloads, ×2)
- `design-refs/todo-empty-states.html` (also in Downloads)
- `design-refs/community-empty-state-v1.html`

The two newest Downloads files were checked the same way, in case a browser had renamed the
download. Neither contains any of them.

**Why this is a stop and not a degrade.** The prompt's own instruction is the reason:

> Port the illustrations and layout class for class and path for path — **the SVGs are hand-drawn
> geometry, not decoration to re-derive.**

Three panels' worth of hand-drawn SVG geometry cannot be recovered from a description. Anything I
drew would be my invention wearing the mockup's aria-labels, and the first Noteboard run already
recorded what that costs — it hit the same gate, found the file in `~/Downloads`, and its rule was
explicit: *"Nowhere → RED GATE, stop. Do not build from description."* Phase 2 depends on Phase 1's
CTA, so it cannot proceed independently either.

**To unblock:** put `noteboard-empty-state.html` in `~/Downloads` or `design-refs/` and re-run.
Everything below is already done and will not need repeating.

---

## 1 — Recon completed anyway (0.1, 0.3, 0.4, 0.5)

### 0.1 — Baseline

`npx vitest run` — **375 files, 6375 passed, 2 skipped, 0 failed.** Fully green; **no
other-session failures to name.** `SA_E2E_BASE_URL` is explicit (`playwright.config.ts` throws
when unset; there is no default). `git log --oneline origin/main..main | wc -l` = **61**. Not
pushed.

Another session is live in this checkout (its Query Centre work is at `HEAD`, and its calendar
report PNGs are the tree's only dirt). `src/` is clean.

### 0.3 — The date verb: **the mockup is out of date, and the kebab wins**

**The kebab says `"Turn into a task…"`** — `src/lib/todoMenu.ts:226`:

```ts
hasTask ? leaf("detach-task", "Detach from tasks") : leaf("make-task", "Turn into a task…")
```

The mockup's *"Give it a date."* is **not current wording**. The history is exactly as the prompt
suspected, and the conclusion is the opposite of the one it floated:

- `"Give it a date…"` was the original in-place conversion's label.
- It was **retired** when the projection model shipped, because two doors then meant two
  contradictory conversions — the `give-date` menu id was deleted from `MenuItemId` outright, not
  deprecated, so a dead id could not read as a live capability.
- Date-on-note (Branch A) later made the projection redundant — but it **kept the projection's
  wording**. `"Turn into a task…"` is the label the one surviving door has carried since, and the
  retirement of the old phrase is explicitly locked: `tasksNoteboard.test.tsx` asserts
  `expect(page).not.toContain("give-date")` with the note *"the RETIRED door stays retired — this
  is not it back"*.

So panel three would ship as **"Turn into a task"**, not "Give it a date" — and per probe (e) it
must read that from the exported constant rather than a duplicated literal. **The label is not
currently exported**: `leaf("make-task", "Turn into a task…")` inlines it inside `noteMenu()`.
Extracting it additively (e.g. `MAKE_TASK_LABEL`) would be a one-line change, and the probe would
then compare panel three's heading against the same constant the kebab renders. Flagged here so
the decision is on the record before any code moves.

*(Note the ellipsis: the kebab's label ends `…` because it opens a popover. A panel heading is not
an opener, so the heading would be the phrase without it — "Turn into a task". Stated so the
probe's comparison is deliberate rather than accidentally strict.)*

### 0.4 — What the board renders at zero notes today

| | |
|---|---|
| Owner | `src/components/todo/TodoNoteboardPage.tsx:523` |
| Condition | `notes.length === 0 && !compose && examplePapers.length === 0` |
| What renders | `.nb-empty` — an `ArtSlot`, an `<h3>Nothing pinned yet</h3>`, a teaching paragraph, and a `+ Pin your first note` button |
| Threshold constant | `sparseExamples(realCount, dismissed)` in `src/lib/noteboard.ts:195` — `realCount < 3` |

**The sparse example-paper state is live** and shipped yesterday. Note the condition above: the
first-run panel **already yields to the example papers** — it renders only when the board is empty
*and every example has been dismissed*. That was itself a measured finding (with the papers
suppressed by the panel, the sparse state was unreachable).

This matters for the baked decisions: *"at zero notes both are visible"* describes a board where
the workflow renders **above** the papers and the old `.nb-empty` panel is superseded by it. The
existing panel's copy ("Nothing pinned yet" + its paragraph + its own `+ Pin your first note`)
would be **replaced**, not stacked — otherwise the page teaches the same thing three times, which
is the exact fault the panel-yields-to-papers change fixed.

### 0.5 — Illustration precedent: one exists, and it is a **raster** slot

`src/components/todo/ArtSlot.tsx` is the app's illustration component — `ART_SLOTS` is a registry
of named briefs, and **`"noteboard-empty"` is already one of them** (brief: *"A corkboard with one
blank card and a pin."*). But it renders `<img src=…>`, and **`src` is absent for every slot
today** — the component's own comment says so, and it degrades to caption-only by design.

There are **two** precedents, and they point in different directions:

1. **`ArtSlot`** — the named-slot registry, raster, currently unfilled. Following it would mean
   supplying a raster asset, which contradicts the baked decision that the illustrations are flat
   inline SVG with `role="img"` and per-panel `aria-label`s.
2. **`manuscriptMarks.tsx`** — five **inline SVGs with baked fills**, no `currentColor`, no
   `var()`, no token, so a mark renders identically in all three themes. This is the closer
   precedent for hand-drawn flat geometry, and it is the one the prompt's fallback describes.

**Recommendation for the re-run:** follow `manuscriptMarks`' inline-SVG shape (a module of named
components with baked palette fills), not `ArtSlot`. It needs no asset pipeline and no dependency,
and it satisfies the flat-illustration law by construction. Worth stating explicitly in the report
because `ArtSlot` *looks* like the obvious precedent — it even has a `noteboard-empty` slot — and
taking it would quietly reintroduce a raster dependency the baked decisions rule out.

---

## 2 — What remains

Nothing was built. When the mockup lands, Phases 1–3 run as written, with three adjustments this
recon has already settled:

1. **Panel three reads "Turn into a task"** (0.3), from an additively-exported constant.
2. **The workflow replaces `.nb-empty`** rather than stacking above it (0.4).
3. **Illustrations follow `manuscriptMarks`, not `ArtSlot`** (0.5).

Baseline to beat: **375 files / 6375 passed / 0 failed**. Nothing is owed to Nick beyond the
mockup file itself.
