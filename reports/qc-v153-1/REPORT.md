# Query Centre v153.1 — report

Compact header with the stage ring, faint pattern throughout, slimmer slips with their policy and a materials strip.
Reference: `design-refs/query-centre-v153-1.html` (sha256 `340cc43c…325ddb`, verified, enrolled in `.refhashes.json`).

## False premises found in Step 0

1. **The quiet-window setting is not a text control.** It is a 46px gear button (`QcQuietSetting`) that opens a
   pop-over. It survives as that button, after Record a response. It was white on the navy banner, so it is
   re-inked for a light ground: ink icon, white fill, a 1px `#d9d0c3` ring.
2. **The reference does not wrap the facts to 2 × 2.** At 1200 it keeps four 172px boxes. The prompt wins, so the
   wrap is built (see below).
3. **No field records the size of a sent partial.** A partial chip uses the asked portion
   (`materialsRequestedType` / `materialsRequestedQuantity`, through the existing `partialAsked`), solid once sent.
   Where no portion was recorded it reads "Partial", which is the case on the whole harness account.

## Base

`query-centre-v153` had **not** landed on `main`. `query-centre-v153-1` is cut from its tip, **`28911ee2f`**.

## Step 0 findings

- **The page before:** v151.2's navy banner ("Your queries", "x sent · y active · z% heard back", the gear, Record a
  response, + Log a query); v153's slim "This week" strip (`QcSummary1511`); v150's doodle tile stopping at 280px;
  the rail's sand header band; slips with a 48px seal, a 42px current step and four facts ending in Sent with.
- **Reply policy:** `Agent.responseTimeWeeks` and `Agent.noResponseMeansNo` (`src/types.ts`). A query carries only
  `agentId`; `Queries.tsx` now passes `agentOf(row)` through the existing `qcLivingAgents` map. Nothing is stored.
- **Materials:** `materialsWanted` (what went with the query), `materialsRequestedType` / `Quantity` and
  `requestFrom` (the partial asked for), `partialSentDate` / `fullSentDate` and the status (what has gone),
  `sentRecordOf` → `packageNameOf` (the package's name as sent).
- **The "for" line:** the old count line took `qcLineTitle` — the scoped manuscript, else the only one. With more than
  one manuscript and no scope it named none. The "for" line does the same, so it is **absent on the harness
  account** (several manuscripts, none scoped) and present for a writer with one book or a scoped page.
- **Stand rows:** `STAND_ROWS` toggle status sets in `f.stages`. The ring's buckets toggle their own status sets in
  the same field. "Passed or closed" includes Withdrawn, which has no stand row and shows as its own rail chip.

## Phases

| phase | commit | what landed |
| --- | --- | --- |
| 1 | `38303fc0a` | The banner and the This week line removed; `QcHeader1531` (hawk, title, "for" line, buttons, gear) and `QcStageRing1531`; `lib/qc1531.ts` (buckets, arcs, `toggleRing`). |
| 2 | `c3f371126` | The doodle tile down the whole page (override in `qcv1531.css`); the rail's header white with a 2px navy rule. |
| 3 | `8d57f11e4` | The compact slip header, the Their policy box (Sent with removed), the materials strip, the 2 × 2 wrap. |
| 4 | `6f78f694d` | A zero bucket's legend row disabled (as the rail's zero rows are); `tests/e2e/qc1531.measure.ts`. |

`QcHeader151` and `QcSummary1511` were deleted with their mount in phase 1.

## Gates against baseline

| gate | baseline (`28911ee2f`) | after phase 4 | dev line after the merge |
| --- | --- | --- | --- |
| `tsc` | 0 errors | 0 errors | 0 errors |
| build | clean | clean | clean |
| Vitest | 3 failed · 11,470 passed · 3 skipped (+1 timeout under load) | 3 failed · 11,490 passed · 3 skipped | 3 failed · 11,511 passed · 3 skipped |

The three failures are the same in every run: `emuGuard` (1) and `firestoreTarget` (2), which were red on the base.
One phase 1 run under heavy load also timed out nine sweeps (277s against a normal 55–65s); all 129 of those tests
passed when re-run alone, and the next full run was back to the three.

**Unit tests** (each written red first by breaking the fix): every status in exactly one bucket; the buckets sum to the
total; a ring click equals the rail rows' toggle and a second click clears it; the policy's four forms and the
no-policy dash; the materials for a package only, a partial asked, a partial sent, a full asked after a partial, and
nothing; the slip renders the policy box, no Sent with box, and the strip.

**Measured** (`tests/e2e/qc1531.measure.ts`, 61 readings, all green, on the dev line's build): the ring's legend sums
to the title's figure (**88 = 88** on the live data, 70 still in play); hover fades the other segments to exactly
0.3; a click narrows the list from 35 to 12 slips and presses the rail's Partial requested and Partial sent rows;
the tile is visible at the foot of a 9,124px list (2,291 stroke pixels; 0 with the override removed, proved on the
v153.1 build); seals 40px, current steps 34px, no policy value cut off at any width swept. v153's own measurement
(`qc153.measure.ts`, 198 readings) is still green.

## Screenshots

All in `reports/qc-v153-1/`, ours beside the ref's:

| ours | ref |
| --- | --- |
| `list-top-1440.png`, `list-top-1920.png` | `ref-list-top-1440.png`, `ref-list-top-1920.png` |
| `ring-hover-1440.png`, `ring-hover-1920.png` | `ref-ring-hover-1920.png` |
| `slip-hover-1440.png`, `slip-hover-1920.png` | `ref-slip-hover-1440.png`, `ref-slip-hover-1920.png` |
| `slip-asked-1440.png`, `slip-asked-1920.png` | `ref-slip-asked-1440.png`, `ref-slip-asked-1920.png` |
| `slip-1200.png` (2 × 2) | — (the ref does not wrap) |
| `list-foot-2560.png` (the tile at the foot) | — |

## Where the build departs from the reference, and why

1. **No "for" line on the harness account.** See Step 0: it names what the old count line named, and nothing when
   several manuscripts are in view unscoped.
2. **The tooltip is one line**, "**Partial requested** — 14 of 88 queries", the prompt's wording. The ref's is two lines
   with no dash. It follows the pointer and is dark, as the ref's is, and flips to the pointer's left past the
   card's middle so it never runs off the card. On keyboard focus it sits at the row's right end.
3. **The segments are pointer targets only; the legend rows are the keyboard buttons.** The prompt asks for both to
   be buttons and for the SVG to be `aria-hidden`; a control inside an `aria-hidden` SVG is unreachable, so the
   legend carries the names ("Partial requested, 14 of 88") and focusing a row highlights its segment.
4. **The pile takes no pointer, and the counts are drawn over it.** In the ref the pile's overhang blocks the
   segments beneath it, and a two-digit count at the ring's side ("16") sits under the pile's edge. The pile is
   still drawn after the segments.
5. **A picked bucket shows as picked** (its legend row tinted and underlined). The ref has no picked state.
6. **The ring card's column is `minmax(400px, 560px)`**, as the prompt says; the ref's is a fixed 560.
7. **"Covering letter", not "Query letter", on the chips.** `materials.ts` has one display map and the app's UK copy
   shows the stored token "Query letter" as "Covering letter". The ref's sample data uses the token.
8. **The slip header keeps v153's status word over the track**, as the prompt says, so it is 78px tall where the
   ref's one-line arrangement is 67.
9. **The facts wrap at a slip under 858px** (about a 1318px viewport), not exactly 1280. Measured: "Replies to
   everyone" needs a 183px box, so four boxes need 858px. Swept at 1440 / 1366 (four boxes, nothing cut) and 1300 /
   1280 / 1240 / 1200 (two by two).
10. **A long package name ellipsises** at the strip's right ("Sent with The Complete Autumn Submission Bundle…").
11. **Agents with no recorded policy show "—"** in Their policy, with no line under. On the harness account that is
    some of the agents; the value is never guessed.

## Where the quiet-window setting ended up

After Record a response, in the header's button row: the same gear button and pop-over, re-inked for the light
ground; its pop-over now opens to the right of the button rather than the left.

## Deferred, named

- **`qcv151.css` still carries the banner's rules** (`.qc1512-ban`, `.qc151-hd`, the gear's white-on-navy rules) and
  `qcv153.css` the `.qc153-slim` rules. Both sheets were on the do-not-touch list; nothing renders those classes now.
- **`weekSummary` in `lib/qc1511.ts`** has no reader in the app now (its unit tests still run).
- **v150's A1 tile rule** in `qcv150.css` is overridden, not removed (do-not-touch).
- **`tests/e2e/qc1521.measure.ts`** selects v151's table rows and groups (`data-qc1512="cap"`, `data-qc1511="group"`),
  stale since v153 retired them; it was not on v153's retirement list. Its quiet-gear selectors still match.
- **The phone page** is unchanged; every rule here is 768px and up.

## Dev

Dev served `dev/qc153-tl1-ww2` at `deff83314` (`index-WICYce58.js`, confirmed by a clean build). The deploy line is
`dev/qc153-tl1-ww2-qc1531`: that commit with `query-centre-v153-1` merged in (no conflicts). The newer local
`dev/qc153-tl1-ww2-undo1` (Undo and bulk close) was not deployed and is not included.

https://scriptally-dev.web.app/queries
