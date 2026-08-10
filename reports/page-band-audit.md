> **Renamed (Amendment 3):** the "page band" is the `workspace` variant of `PageHeader`; classes
> use a `wsh-` stem. This file keeps its filename so the history stays traceable.

# PageBand — Step 0 audit (written incrementally)

**Baseline at `93eb65c`, tree clean (0 dirty):** `tsc` CLEAN · **234 files / 3,778 passing, 2 skipped** ·
`vite build` ✓. The commit gate is *no worse than this*.

Rows are appended as each page is finished. If this file stops part-way, the next session resumes
from the last row rather than starting over.

| Page | File:line | Title markup | Actions | Rule/hairline | Page-level count | Duplicate count elsewhere | Other stream's WIP? | Verdict |
|---|---|---|---|---|---|---|---|---|
| Contact list | `agents/AgentList.tsx:809` | `<PageHeader variant="full" title="Your agent list" description=…>` in `.agl-head-slot` | `Add new agent` (primary) via PageHeader `actions` | PageHeader's own | none on the header; `AgentToolbar` takes `resultCount`/`total` | `AgentToolbar` renders the count line (view state — survives per the ownership rule) | no | **MODIFY** |
| Submission packages | `SubmissionPackages.tsx:191` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | **MODIFY** |
| Query Centre | `Queries.tsx:2644` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | ⚠️ create-mode stream live in this file | **MODIFY — red-gate check needed** |
| Discover | `DiscoverNewAgents.tsx:466` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | **MODIFY** |
| Settings | `AccountSettings.tsx:976` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | **MODIFY** |
| Manuscripts | `AllManuscripts.tsx:150` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | **MODIFY** (not in the pack's page list — reported) |
| Comparable titles | `manuscripts/ComparableTitlesPage.tsx:570` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | **MODIFY** (not in the pack's list — reported) |
| Import | `ImportCsv.tsx:662` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | **MODIFY** (not in the pack's list — reported) |
| Help centre | `HelpCentre.tsx:172` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | focus-tier page — **reported, likely out of scope** |
| Plans | `PlansPage.tsx:362` | `<PageHeader …>` | via PageHeader | PageHeader's own | tbd | tbd | no | focus-tier page — **reported, likely out of scope** |

## ⚠️ THE FINDING THAT CHANGES THE PACK

**A shared `PageHeader` primitive already exists** (`src/components/shell/PageHeader.tsx`) and is
mounted by **ten** pages, with its own test file (`shell/pageHeader.test.tsx`). The pack's premise —
"every workspace page currently rolls its own header" — is **false for these ten**. They already
share one header component with `variant`, `title`, `description` and `actions` props.

This makes PageBand largely a **restyle-and-extend of `PageHeader`**, not a new primitive plus ten
deletions:

- The 60px band, the sage fill, the mark slot and the count strip become PageHeader's new shape.
- The per-page "delete the old title block" work mostly **collapses to changing props**, since the
  title and actions are already passed in rather than hand-rolled.
- The pack's "never mounted by the shell" rule already holds — every mount is in a page file.
- Pages **not** in the pack's list also mount it: Manuscripts, Comparable titles, Import, Help
  centre, Plans. Restyling PageHeader changes those too, whether or not they are in scope.

**Calendar, Noteboard, To-do and Analytics do NOT appear in the PageHeader mount list** — they are
the genuinely bespoke ones and still need auditing individually.

---

# Amendment 1 — resumed audit (the four bespoke pages)

## The three recon items

**1. The variant union is `variant?: "full"` — a union of ONE.** The file's own comment records that
`compact` and `greeting` were *retired* by the flyouts pack, deliberately, because "one full layout"
was the conclusion. The prop survives only so existing `variant="full"` call sites keep compiling.
Nothing existing is band-like; the band is genuinely new. **Adding `"band"` re-opens a union that was
closed on purpose** — worth stating in the commit so it reads as a decision, not a regression.

**2. No page passes `description`.** Only the test file does (three cases). So the band variant
dropping the prose slot costs **nothing live**, and needs no decision from Nick. The `description`
prop stays supported for the default variant, which the contract requires anyway.

**3. PageHeader DOES render its own closing rule** — "a hairline rule closing the header… everything
below the rule is page content". The band variant must suppress it; the band's own 1px `#adb8aa`
bottom border replaces it.

## ⚠️ SECOND FINDING: the four "bespoke" pages share a primitive too

**Calendar, Noteboard and To-do all render `TasksPageLayout`** (`todo/TasksPageLayout.tsx`), which
owns `.tpl-head` — eyebrow, `<h1 className="tpl-title">`, an optional title-actions row, subtitle,
a `beneath` slot and a tools row whose bottom edge carries the hairline.

| Page | File | Header |
|---|---|---|
| To-do list | `todo/ToDoPage.tsx` | `TasksPageLayout` |
| Calendar | `todo/TodoCalendarPage.tsx` | `TasksPageLayout` |
| Noteboard | `todo/TodoNoteboardPage.tsx` | `TasksPageLayout` |
| Analytics | `packages/AnalyticsTab.tsx` | **none** — a tab inside Submission packages, not a routed page; its `<h2 class="gsec">` rows are section headings, i.e. view state |

So there are **two** header primitives app-wide, not ten bespoke headers: `PageHeader` (10 pages) and
`TasksPageLayout` (3 pages). Analytics has no page header at all.

**This sharpens the amendment's own goal** — "this pack should end with fewer header implementations
than it started with." The real target is 2 → 1, and the To-do family is where the work is.

⚠️ **`TasksPageLayout` is very heavily locked** — nine test files reference it
(`tasksLayout`, `tasksViewport`, `todoListChrome`, `todoTightening`, `artSlots`, `todoWorkbench`,
`todoShellPolish`, `todoPanelFinal`, `todoBoardMenu`). Migrating it is not a prop change; it is a
retargeting exercise across nine locks, and it is **the To-do stream's territory**.

## Verdicts

| Page | Verdict |
|---|---|
| Contact list, Submission packages, Query Centre, Discover, Settings | **MODIFY** — pass the band variant |
| Manuscripts, Comparable titles, Import | **ALREADY CORRECT** — keep default, never opt in |
| Help centre, Plans | **focus-tier — keep default.** Proposed list, per the amendment's instruction to name it rather than decide silently |
| Analytics | **ALREADY CORRECT** — no page header exists; it is a tab. Giving it one is new work, not a migration |
| To-do, Calendar, Noteboard | **BUILD** — migrate off `TasksPageLayout`'s head onto `PageHeader` band. Gated on the To-do stream, and it touches nine locks |
