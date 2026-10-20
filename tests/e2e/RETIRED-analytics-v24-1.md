# Retired and rewritten by Analytics v24.1 (17 Oct)

Analytics v24.1 (`design-refs/analytics-v24-1/analytics-v24-1.html`) replaces desk card 3, "Your typical reply time",
with "Replies due", and makes a request count as a reply. Every case below was run against the base (`c6505699`, the
v24 dev build, `vite preview` on its own port) and against v24.1 (`reports/analytics-v24-1/redfirst/`).

## Retired from AN24-B1 (`tests/e2e/analyticsV24.measure.ts`)

| Reading | Why it goes | What holds the new card |
|---|---|---|
| B1 card 3's title starts 'Your' | the card is "Replies due" | B1 card 3's title is 'Replies due' |
| B1 card 3's figure is the typical in weeks | the typical moves out of the desk; it stays as S4's third reading | B1 card 3's figure and unit follow the state table |
| B1 one dot per reply (against `model.replies`) | the dots are open queries, and `model.replies` is no longer the page's reply count | B1 one dot per open query not past its time |
| B1 the TYPICAL mark sits at the typical (±1px) | no typical mark on the card | B1 today's mark at 22% (±1px) |
| B1 the longest dot sits at the strip's end (±1px) | the strip is the next eight weeks, dots beyond sit at the end | B1 each dot sits at 22% + min(days, 56)/56 × 78% (±1px) |

## Rewritten

- **AN24-B1** — card 3 is checked by `checkDue`, shared with B2: the state table, the rows (zeros as "0"), the stamp,
  the dots and today's mark, the past pill, and two anchors on what S5 itself draws (its past reading, and its waiting
  rows = past + soon + later + no stated time). Pressing it scrolls to S5 (was S4). Cards 1 and 2 as v24.
- **AN21-A1** — the title's reply count is v24's tally (a request is a reply), not the model's dated first replies.

## New

AN24-B2 (thin and nothing-due fixtures), AN24-R1 (replies ≥ asked, replies = asked + said no to the letter, on the
harness account and four fixtures), AN24-R2 (bad reply dates left out of the timings and counted). Fixtures:
`tests/e2e/seedAn24.mjs thin | pass | baddate | notime`, seeded in `beforeAll`, restored in `afterAll`.
