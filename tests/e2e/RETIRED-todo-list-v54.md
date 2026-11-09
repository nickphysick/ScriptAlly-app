# To-do list v54 — older cases retired or re-pointed

| Suite · case | What happened | Why |
| --- | --- | --- |
| `todoV53.measure.ts` L1 | **Re-pointed.** "The page's scrollHeight equals its clientHeight" → "the page scrolls by no more than the header's height", on the first read and after every kind. Its named break now makes the workspace 80px taller than the window. | D2: the header scrolls away and the workspace pins; the page may scroll by the header's height. `todoV54.measure.ts` L1 holds the rest (once scrolled, the frame fills the window). |
| `todoV53.measure.ts` L1 + L2 + L4 walk | **Re-pointed.** The "Fill in what you sent" batch is left out of the every-kind walk. | D5: the batch is two steps ending "Log it for {n} queries", not "Check it, then log it". `todoV54.measure.ts` L7 and L8 hold it. |
| `todoV53.measure.ts` L9 | **Re-pointed.** "The page did not scroll" read `scrollTop + overflow === 0`; it now reads "the click left the page's scroll where it was". | D2: the page has the header's height of scroll; the claim was always that a bar part scrolls the TRAY. |
| `todoV52.measure.ts` L1 | **Re-pointed.** "The page itself does not scroll" → "scrolls by no more than the header's height". | D2. |
| `todoV52.measure.ts` L6 + L8, L7 (`primaryReading`) | **Re-pointed.** The primary's place is read with the header scrolled away. | D2: before the header has gone, the pinned workspace's foot is below the fold by design. |
| `todoWs.measure.ts` "the workspace at" | **Re-pointed.** "The page does not scroll" → "scrolls by no more than the header's height". | D2. (This case was already red on v53's record for another reason; see the report.) |
