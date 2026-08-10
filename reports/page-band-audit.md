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
