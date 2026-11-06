# Retired by Corkboard v2 (6 Nov 2026; ref design-refs/corkboard-v13/)

Corkboard v2 replaces v1's framed cork board (free pinning, tidy, the "Your tasks" card, the add bar, the examples
drawer and the workflow panels) with a wall of post-its and piles. Cases that held v1's subject are listed here with
where their law went, if anywhere. Unit cases retargeted in place say so in a comment at the case.

## Part B — the header and the tool row

| Case | File | Why | Where the law went |
|---|---|---|---|
| the Note control is three paper buttons | src/components/todo/noteboardToolbar.test.tsx | v1's add bar is retired | the header's Pick a colour swatches (corkboardV2Page.test.tsx) |
| the subline is the Corkboard (v4) ref's sentence | src/components/todo/noteboardChrome.test.tsx | v4's subline is not drawn | rewritten in place: the header's v13 sentence (`boardSentence`) |
