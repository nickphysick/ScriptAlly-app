# Retired or rewritten by Submission packages v39.2 (29 Oct)

Each lock below asserted something v39.2 changes on purpose. Every rewrite was proved red against the v39.1 build and
under its own named break (reports/submission-packages-v39-2/).

| Lock | Asserted | Now |
|---|---|---|
| `pk391.measure.ts` **L2** | exactly two typewriter elements (the title, the open package's name) | **Retired**, rewritten as `pk392.measure.ts` L2: three typewriter headings (the title, "Your packages", the open package's name), with the materials tab's label as the one named exception |
| `pk391.measure.ts` **L7** | the materials header is #fbf9f5 with a 4px #5e2f3a top edge, the package header's height | **Retired**, rewritten as `pk392.measure.ts` L7: a 40px #5e2f3a folder tab level with the package card's top; names never cut off; the in-package row; Add on hover or focus |
| `pk26.measure.ts` **PK26-M** | every material name is one line, with the full name as its title | **Rewritten**: every name shows in full (scrollWidth ≤ clientWidth) and is never ellipsised; "no type for a summary" unchanged. Break `PK26_MUTATE=PK26-M` |
| `pk39.measure.ts` **L4** | the two card headers are the same height with equal tops; Your materials 320 / 280 wide | **Rewritten**: the materials tab's top is the package card's top (±1); Your materials 340 / 300 wide. New break `PK39_MUTATE=L4tab` |
