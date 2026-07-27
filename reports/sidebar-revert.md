# Sidebar revert — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Reverts `reports/one-sidebar.md`.

## What was reverted

**The pack expects three commits; there was ONE.** The one-sidebar run landed as a single
commit — a deviation flagged at the time in its own report and summary, because the merge *was*
the collapse contents and the popover was a child of a row that only existed after the merge:

| Reverted | Message |
|---|---|
| `5ee7fd7` | `shell: merge rail and panel into a single sidebar` (all three phases) |

**No mixed commit, so no halt.** Every file in `5ee7fd7` was sidebar work — the two shell
components, `AppShell`'s mount, `shellV2.css`, three lock files, the design ref and its mockup,
plus `index.css`/`designTokens.ts` carrying only the `--shell-side` token move. Nothing
non-sidebar rode along, so the revert is exact.

**Revert SHA:** `f012ade` — `shell: revert merged sidebar, restore rail and panel`.

## Gates

`tsc --noEmit` clean · `vite build` clean · **Vitest 1643/1643**. The suite drops 1645 → 1643
because the two locks the merge added (the one-capsule assertions) reverted with it; the
pre-merge locks — two-capsule frame, panel contents, flyouts — are all live again.

## The To-do rebuild was untouched — confirmed

It landed **before** the merge (`bd00db0` → `de88f10`, five commits plus its report) and shares
no commit with it. `git status` after the revert lists only the eleven sidebar files; no
`components/todo/**`, no `lib/todoTour.ts`, no `AssistantPromo.tsx`. The typographic sections,
the rows view, the featured review card, the two-action `PageHeader` and the Pro strip all stand.

One thing worth knowing: `PageHeader`'s new `disabled` support and the **house disabled
treatment** came from the To-do pack, not this one, so they survive and remain available to
every page.

## The verification list — all six restored

| Behaviour | State |
|---|---|
| Panel collapse/expand via `⌘\` and the tuck control | ✅ both live (`AppShell` chord, `aria-label="Hide the panel"`) |
| Rail selects a section, never navigates | ✅ `railClickPlan(rib.key, pathname, collapsed, openSection)` back on the ribs |
| Rail icon collapses when its section is already open | ✅ same call — the collapse branch is intact |
| Auto-collapse on navigation | ✅ the `[pathname]` effect is back, first render exempt |
| Hover flyouts, Dashboard exception, Setup flyout | ✅ `hasFly = rib.key !== "dashboard"`; Setup's Task-settings + Help rows intact |
| Stepped surfaces | ✅ ground `#e7e0d5` · rail `#f1ebe3` · **panel `#f8f4ee`** · content `#fdfbf8` · fill `#efe8df` |

The panel tone is worth calling out: the merge had moved `--shell-side` to `#f6f1ea`, so the
revert restores `#f8f4ee` — which is exactly the value the pack's verification list asks for.
The token, its JS twin and its lock all moved back together.

## Nothing failed to revert cleanly

`git revert` applied without conflict. The mockup `design-refs/scriptally-sidebar-final.html`
was deleted by the revert itself (the merge had added it), so no manual removal was needed.

## The record, so it is not proposed again

Two deliberate additions on top of the plain revert:

- **`design-refs/app-shell.md`** gains a short **"⛔ TRIED AND REVERTED"** section above the
  restored Rail/Panel sections, stating what was built and why it failed — *uniform row weight
  removed the grouping that made the panel legible, and the lower half read as a flat list of
  unrelated items* — with the lesson drawn out: **the problem was row weight and grouping, not
  the number of capsules.** The merge was structurally sound (glyphs held position, behaviours
  survived); what broke was flattening a nav item, a manuscript card, a Pro row and a user block
  into one shape. If two-capsule geometry is ever revisited, the panel's internal variety has to
  survive it.
- **`reports/one-sidebar.md`** keeps its content as the record of the attempt but gains a
  REVERTED banner at the head, so it can never be read as describing the live shell.
