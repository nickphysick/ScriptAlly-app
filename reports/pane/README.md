# The pane's report shots

`npx playwright test tests/e2e/reportShot.measure.ts` — one card, deployed dev, 1920. **Run it with
every report and attach `report-card-1920.png`.**

Why it is a standing rule rather than a nicety: three reports in one week said an item had landed
while the page showed otherwise, and every one of them was backed by a real measurement. The
failures were not sloppy numbers — they were accurate numbers about the wrong element. `.tdk` and
`.wpg-plate` are both "the padding" until someone looks; a card's body having 184px of overflow is
true whether or not a writer can see it. An image cannot be true of the wrong element.

The other files here are the recon runs kept beside their reports: `recon-*` (before a pass),
`item3-*` / `item4-*` (the two that needed before-and-after), `overflow-620` (the clipped case).
