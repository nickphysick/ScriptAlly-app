# Query Centre — overnight run: two corrections, then §5–§7

`9332f9ca` → `e0fc9a01`, four commits on `main`, **UNDEPLOYED**. No `git stash`, no deploys.

---

## FALSE PREMISES, FIRST

**1. "Delete the legacy `EditQueryDrawer`." — it is not Queries' to delete.**
The brief treats it as Query Centre furniture. It is app-level chrome with three importers outside
this page: `App.tsx` mounts `EditQueryHost` at the root, and **`Dashboard.tsx` and
`EditAgentHost.tsx` both call `useOpenEditQuery`**. Deleting it removes editing from two surfaces
this pack never touched. Correction 2 did the reachable half — nothing on the Query Centre can
open it any more — and the component stays. *Not done, deliberately.*

**2. "`#/queries/new?agent=:id`" and "`#/queries/:id`" — those routes do not exist.**
This app addresses a query as `/queries?q=<id>` and creates through a `handleNavigate` bridge, not
hash routes. Nothing needed building: `pathFor` already maps the old manager aliases
(`Query database`, `Queries database`, `All queries`, `Hub`) to `/queries`, any other subpage value
to `?q=<id>`, and `Log a query` / `Send a query` to a seeded create. **The Contact list's
`Log query` already carries `{ agentId }` through that bridge** (`AgentList.tsx:747`). The wiring
Phase 6 asked for is the wiring that was there. *No route work was needed or done.*

**3. "Sticky controls" — the app already had a law for this, and it is not the obvious one.**
Quoted in full in Correction 1 below. The short version: a sticky bar that changes height must not
be driven by a `scrollY` threshold, and `overflow-anchor: none` is not a free fix.

---

## Correction 1 — the sticky controls obey the masthead rules · `9332f9ca` · 3 files

**The rules, quoted before anything was written** (CLAUDE.md, *The page masthead* / *Conventions*):

> **A STICKY BAR THAT CHANGES HEIGHT CANNOT BE TRIGGERED BY A `scrollY` THRESHOLD — AND A SENTINEL
> ALONE DOES NOT FIX IT EITHER.**
>
> **ON A PAGE WHERE NOTHING SCROLLS, `position: sticky` DOES NOT IDLE — IT CLAMPS.**
>
> **AND A STICKY CHILD OF A SCROLLER CAPS ITSELF TO THE SCROLLPORT, NEVER TO `100vh`.**
> `WorkspacePageGrid` publishes **`--wpg-stuck-h`** and **`--wpg-port-h`** for exactly these readers.

What that decided, and why each alternative was refused:

- **No second sticky mechanism.** The controls read `top: var(--wpg-stuck-h, 0px)` — the height the
  grid already publishes for its collapsed bar. A sentinel + `IntersectionObserver` of its own would
  be a *third* header behaviour on the page whose type law forbids a second.
- **No `calc(100vh - …)`.** The scroller starts below the shell's chrome, so `100vh` over-claims by
  exactly that offset — the Tasks chassis's unreachable 21px, one page along.
- **A use-site fallback, not more specificity.** `var(--wpg-stuck-h, 0px)`: the fallback applies only
  where nothing published the token, which is what "this page has no collapsing bar" means.

**Measured** (`queryCentreFinish.measure.ts`, 1440×900, §7): at rest the controls sit **126px** below
the scrollport with the bar uncollapsed (`--wpg-stuck-h: 0`); scrolled, they come to rest **44px**
below it with the bar collapsed (`--wpg-stuck-h: 44`). **The two figures are asserted against each
other**, never against `44`.

Also fixed here: `.qcc-controls` painted `var(--desk)` — the *page* ground, not the *window* ground,
so the band was a visibly different colour from the surface the cards sit on. It is `--ws-window`.

---

## Correction 2 — the legacy edit sheet is unreachable · `1c2d5814` · 8 files

The panel's two materials controls both opened `EditQueryDrawer` — the hole-punched `EDITING QUERY`
surface Phase 4 exists instead of. So the new panel quietly handed the reader back to the old one.
Four editors now work in place: send method cycles, materials toggle as four rows, the expected date
opens an anchored `BrandDatePicker`, notes stay in the panel.

Two small fixes shipped with it:

- **A material's value is never its own row label.** `cardMaterials` returned the label as the value
  when the label carried no digits, so a row read `Synopsis · Synopsis`. It reads `Sent`.
- **A closed query with no defining date keeps its send date.** `leafIso` fell through to
  `lastStatusChange` even when absent, producing **"replied after 0 days"** — a fabricated figure, the
  exact class this repo forbids. `hasDefiningDate` gates it.

---

## §5 — Log new query · `0a677cb9` · 4 files

**⚠️ THE FINDING OF THE RUN: Phase 4 broke create mode and I did not notice.**
Making the grid the page always left the log-a-query journey inside the record branch that stopped
rendering. The hero's CTA set `creating` and drew **nothing**.

> Measured before the fix: clicking it left the page byte-identical — **body text 7391 → 7391**, no
> create pane, no step stack. After: **7391 → 7967**.

It went through a clean typecheck, a green suite and a **deploy** — because nothing asserted that the
app's one creative verb does anything when pressed. That assertion exists now, and it matters more
than the fix.

**Moved, not rebuilt.** `QueryJourneySheet` is the app's journey chassis: its own scrim, Escape,
dirty guard, seal, motion. Re-hosting a 41KB form inside the panel would put a second journey chassis
on the one page that already has one. *Open question below.*

**The ghost** — a live preview at grid index 0 while the journey is open, built from `createDraft`
through the same `cardFacts` every real card uses, so it cannot drift from what saving produces.
`aria-hidden`, not focusable, outside the grouping, and **never counted**: the footer tally and the
quick pills read `gridRows`, which it is deliberately not part of. Asserted — the footer's number is
identical before and after while the rendered card count rises by one.

Proved red: ghost removed · ghost not first · ghost rendered as a real card.

---

## §6 — NOT DONE, and the reason is the most useful thing in this report

The wiring half needed nothing (false premise 2). The **deletion** half was attempted, completed,
gated, and **reverted**.

The dead record branch is **lines 5816–7614 of `Queries.tsx`, 1,800 lines**, bounded by the
TypeScript parser rather than by indentation — three separate hand-scans disagreed with each other
and two of them were wrong, so the boundary came from `ts.createSourceFile` and the AST. With it
removed, plus `GRID_IS_THE_PAGE` and **77 imports it orphaned**:

- `npx tsc --noEmit` → **0 errors**
- `npx vite build` → **clean**
- `npx vitest run` → **99 failures across 30 spec files**

**Those 30 files assert the Query Centre's behaviour by reading the record view's source.** They are
green today because the code is still in the file, not because the feature works — and the reader has
been unable to reach that surface since Phase 4. This is the *landed in code ≠ landed on the page*
fault at suite scale.

It is **not** the vacuous-anchor shape: `queryCentreRest.test.ts` guards its anchors
(`expect(at, "…is missing").toBeGreaterThan(-1)`), which is why they went red loudly rather than
quietly. It is the *wrong artefact* shape — 99 truthful assertions about source with no reader.

**Reverted, because the gate is "no worse than baseline" and this is 99 worse.** Retargeting each
assertion to the panel — or retiring it with the surface it describes — is a judgement per
assertion and a pack of its own, not a tail-end step at 3am. The work is saved at
`/tmp/queries-p6-deleted.tsx`, and with the line range above it is a short job with the file open.

*Conservative option taken: leave inert dead code standing rather than land a red suite.*

---

## §7 — the measurement · `e0fc9a01` · 7 files

Four widths, because a law that holds at one is a coincidence. The interesting boundary is where the
cap **binds**: below it symmetric margins are true by construction.

| width | column | margins L/R | columns | sideways overflow |
|------:|-------:|:-----------:|:-------:|:-----------------:|
| 1280 | 1010 | 0 / 0 | 3 | 0 |
| 1440 | 1170 | 0 / 0 | 3 | 0 |
| 1920 | 1360 | **145 / 145** | 3 | 0 |
| 2560 | 1360 | **465 / 465** | 3 | 0 |

The cap is asserted as a **relation** (`colWidth ≤ its own declared max-width`), not as `1360`.

**⚠️ And my first sticky reading was wrong in the flattering direction.** I read `--wpg-stuck-h` off
`document.documentElement`; the grid publishes it on its own element, so it came back **0** — a
plausible number about the wrong element, which I would have quoted here as *"the collapsed bar
contributes nothing"*. It is **44**, and it agrees exactly with where the controls come to rest.

Proved red by sticking the controls to the port (`top: 0`) instead of to the bar.

Shots: `reports/query-centre-shots/finish-{1280,1440,1920,2560}.png` and `finish-1440-scrolled.png`
— the last showing the collapsed bar with the controls held beneath it on an opaque ground and the
cards passing under. Both were **looked at**, not merely written: a per-element probe cannot see a
composition fault.

---

## Gate

Baseline at the start of the run was one red (`datePickerHub`, another stream's). **It is two now,
and the second is not mine:** `calendarTokens.test.ts` fails in the primary tree at HEAD and belongs
to another session's `calendar v63 §D` (`957865fb`). Established by **reading and running, never by
moving** — no stash, no checkout of anyone's files.

Every commit: `tsc` 0 · `vite build` clean · `vitest` **2 failed / 7530 passed (7535)**, both
another stream's. `functions/src/email.test.ts` fails only in the measurement worktree — it has no
`functions/node_modules`.

Measurements ran against a clean `build:dev` of the committed tip in a **detached worktree**, not the
primary tree, which is holding another session's calendar work.

---

## Open questions — each with the conservative option already taken

1. **Should the create journey move inside the panel at 660px?** The brief implies it. I kept
   `QueryJourneySheet` as its own chassis — a second journey shell on this page is a real cost and
   the gain is visual. *Taken: restore the feature, don't rebuild its host.*
2. **When does the record branch go?** It needs the 30-file retarget above first. *Taken: leave it.*
3. **`EditQueryDrawer`'s future.** Unreachable from Queries, still Dashboard's and the agent host's.
   Retiring it is a decision about those two pages. *Taken: leave it mounted.*
4. **`.refhashes.json` — the v5 ref is still not enrolled.** Another session had committed to that
   file within 12h at the start of the run, so per the brief I left it. It has now been quiet
   longer; enrolling `query-centre-v5-sticky-hero-cta.html` is one `--update` when the tree is yours.
5. **A fixture fault, reported not patched:** `seed-query-16` is dated sent **19 Jul** and rejected
   **3 Jul**. Rejections before their sends will make any elapsed figure on that row nonsense.
