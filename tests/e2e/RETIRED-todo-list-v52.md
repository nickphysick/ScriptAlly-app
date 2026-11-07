# Retired and re-pointed by To-do list v52 (Part E)

Each line names the check, the file, and why it changed. Nothing here was loosened to make a red go green: every
retired assertion asserted behaviour v52 removes on purpose.

## Retired

- `todoWs.measure.ts` › "the workspace at {w}": `header.h < 62` (and `> 50`). The v51 header was one 56px line; v52's
  slim navy header holds a title and a stats line (~97px). Re-pointed to `> 80`; its contents are TD52 L2.
- `todoWs.measure.ts` › "the workspace at {w}": `wsH ≈ max(560, port − 104)`. The workspace no longer has a formula
  height: it takes the column under the header, with a 520 floor. Re-pointed to `wsH ≥ 520` and
  `scrollHeight === clientHeight` (the page does not scroll); TD52 L1 holds it at three sizes.
- `todoWs.measure.ts` › "the workspace at {w}": the `priority` reading (the header's priority line). The line is gone;
  its task is the tray's Start here card (TD52 L2, L3).
- `todoWs.measure.ts` › "a send, answered to the summary": "Check it on the card first" → the review drawer, its
  "Yes, log it" and "Change something", and "nothing in the workspace sits under the drawer". The review drawer is
  retired (Part C). Re-pointed to assert the link and the drawer are absent (TD52 L10).
- `todoWorkspaceSmoke.test.tsx` › "the previewed card is inert…": the CSS rule hiding QcOpenCard's footer
  (`[data-qcv="open-foot"]`, `.qsc-links`). The preview no longer draws QcOpenCard; the rule asserted now is the one
  hiding the live card's footer, reply box, pencil and ✕.

## Re-pointed (same claim, new selector)

- `todoWs.measure.ts`: `[data-tws="next"]` → `[data-tws="primary"][data-next]`, `[data-tws="log"]` →
  `[data-tws="primary"][data-log]` — the footer's one primary button (Part C).
- `todoWs.measure.ts` › "the preview is read-only": `[data-qcv="open-foot"]` / `.qsc-link` → the live card's
  `[data-qc1522="footer"]` and `[data-qc152="reply"]`, `[data-qc152="pencil"]`.
