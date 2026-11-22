# Retired or rewritten by Submission packages v39.3 (29 Oct)

v39.3 replaces v39's two-card builder (Your materials, and the package card with its packing list) with Steps + preview,
and retires drag and drop. These locks measured the retired parts. Every rewrite was proved red: against the v39.2
build (`reports/submission-packages-v39-3/redfirst-rewritten-on-v39-2.txt`), or under a break.

| Lock | Asserted | Now |
|---|---|---|
| `pk26.measure.ts` **PK26-B** | only the matching row takes a drop; Add does the same by keyboard | **Retired**: drag and drop is retired. A pick in the steps, and its one write, is pk393 L10 |
| `pk26.measure.ts` **PK26-M** | Your materials' rows show names in full, never the type as a summary | **Retired**: the rows are retired (a pass would be vacuous over no rows). The steps' choice rows show name and summary |
| `pk39.measure.ts` **L4** | two cards 24 apart, the materials tab level with the package card, one status pill, no stepper | **Retired**: the two cards are retired. The builder is pk393 L10–L14; "one status pill" is pk391 L3 |
| `pk392.measure.ts` **L7** | Your materials' folder tab and its rows | **Retired**: pk393 L14 asserts the card is gone |
| `pk392.measure.ts` **L9** (its builder halves) | the packing list's first slot is the version; Your materials leads with Versions | **Builder halves retired**; the drawer, the pieces row, the pieces list's tabs and the stored-fields check stay. The steps' order (version first) is pk393 L10 |
| `pk391.measure.ts` **L3** | the open package's one status pill: "Draft · needs …", 28 tall at 1280, the padlock in it when sent | **Rewritten**: the Steps header's pill — "{n} of 2 needed" / "Ready to send" / "Out with agents · {n} sent", 30 tall (the v39.3 ref's), never a padlock: a sent package's lock is the sent note |
| `pk391.measure.ts` **L4** | BUILD label → the two cards 24; the status pill 32 at 1512 | **Rewritten**: BUILD label → the Steps + preview builder 24; the pill's height is L3's |
| `pk39.measure.ts` **L5** (its padlock half) | a sent package has one padlock, in the stage, with its words | **Rewritten**: a sent package says it is locked in its note (Nick, 29 Oct); no padlock in the pill or by the name |
| `pk392.measure.ts` **L2** | three typewriter headings, the materials tab's label the one exception | **Rewritten**: three typewriter headings and no exception (the tab is retired) |
| `pk392.measure.ts` **L8** | the panel holds the labels and both builder cards | **Retargeted**: the panel holds the labels and the builder |
| `pk38.measure.ts` **L1** | `?tab=syn` opens Your materials on Synopses | **Rewritten**: `?tab=syn` opens the Synopsis step (on a live package; a sent package's steps never open) |
| `pk38.measure.ts` **L8** (its material-drawer step) | a Your materials row's Edit opens the material drawer | **Path re-pointed**: the letter step's Edit pencil opens it, on a live package (the active one is sent and read-only). The mono-capitals claim is unchanged |
| `pk26.measure.ts` **PK26-D** (its first step) | opened the material drawer from a Your materials row | **Path re-pointed**: the letter step's Edit pencil, on `?pkg=pk26-pkg-open`. The drawer's geometry claim is unchanged |

New: `pk393.measure.ts` **L10** (steps), **L11** (preview), **L12** (linking), **L13** (primary, and the sent package),
**L14** (retired).
