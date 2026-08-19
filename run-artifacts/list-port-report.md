# To-do task list — port to the final contract

## Premises that turned out false — read first

**1 · The contract was not in `design-refs/`.** It was in `~/Downloads/todo-tasklist-contract.html`
(as the brief's closing line said). Committed to `design-refs/todo-tasklist-contract.html` first,
md5 `6023ff2d992082bf953295222cba2872`, and every assertion reads it from there at run time.

**2 · §6 retires "chase" and "record" as user-facing words — and the contract itself uses both.**
Its markup ships `<span class="pill chase">Chase</span>` as the bucket's pill, and `no date` /
`on record` as the absent fragment in `.r-fig.absent`. Where brief and contract disagree the
contract wins, so both stand. Assertion 9 is therefore scoped to the **deed and meta** — which is
what §6's table is actually about — and the pill labels and right-hand fragments are exempt. Stated
here rather than silently narrowed.

**3 · §9.1 as written would have passed before the port.** There is no `<input type=checkbox>` in
the old list; the tick is a `<button class="tdg-tick">` labelled "Mark … done" — a checkbox in
everything but tag name. The assertion targets the *control*, not the tag.

**4 · §9.5 as written would also have passed.** The show-more control is data-dependent: this
account's groups do not overflow the slice threshold, so the DOM check was green over `groupSlice`
and `showMoreLabel` sitting untouched in the list. The brief says delete the mechanism, not its
trigger — so the assertion reads the source as well as the DOM.

**5 · §5's elapsed formatter exists, and its output shape did not fit.** `elapsedPhrase` returns
`"2¼ years"` as one string; the fragment needs the figure in Playfair and the unit in mono, on two
lines. Extended in its own file per §5: `elapsedParts(days) → { figure, unit }`, with
`elapsedPhrase` rebuilt from it so one place still decides days-vs-weeks-vs-quarters. Its 14
existing cases pass unchanged.

**6 · `card.record` is not the agency.** It is the rail's own meta line and already reads
"Ana Duarte · Duarte Words", so using it as `{Agency}` printed the agent twice —
*"Ana Duarte asked for it · Ana Duarte · Duarte Words"*. The agency is now looked up from the agent
record and passed in. **Found on the page; no source reading could have shown it**, because the
field's name is honest and its content is a pair.

**7 · The contract's card is 392px and the list's column was 340.** The row grammar is measured at
392 — a 56px pill column, a middle that must not wrap, a 78px right column — and at 340 the middle
was 52px short, which is exactly where the meta lines were wrapping. `.tdw-split`'s rail track is
`min(392px, 36%)` now, and the card fills its column rather than restating the number.

## The assertions — red before, green after

`run-artifacts/list-RED-before.txt` (against HEAD) → `run-artifacts/list-port.txt` (after).
**12 RED / 3 green before · 15 green after.**

| # | before | after |
|---|---|---|
| 1 no checkbox control | RED — 9 tick controls across 12 rows | green — 0 across 13 |
| 2 no controls on hover | RED — rest 2, hover 2 | green — 0 / 0 |
| 3 every task renders | green (regression guard) | green — rows 13 = groupSum 13 |
| 4 footer = that number, no "of" | RED — `13 outstanding · showing 13 of 12` | green — `13 tasks · 4 need you now` |
| 5 no show-more | RED — mechanism still in source | green — dom 0, source holds nothing |
| 6 meta never wraps @1440 | RED — 7 of 12 wrapped | green — 0 of 9 |
| 6b meta never wraps @392 | RED — 11 of 12 wrapped | **NOT PROVEN** — see below |
| 7a Playfair 15px figure | RED — no dated rows | green — 12 dated, Playfair Display 15px |
| 7b absent row has no figure | RED — no absent rows | green — 1 absent, 0 with figures |
| 7c fragment grammar | RED — 6 off-grammar, e.g. `You've waited9weeks` | green — 13 cells |
| 8 deeds are the contract's | RED — `Answer the offer`, `Log the close`, `12 wish lists` | green — 6 buckets checked |
| 9 no retired verb in deed/meta | RED — `record`, `chase` | green — 13 rows |
| 10 sticky group heads | RED — `position: static`, heads 0 | green — sticky, 3 visible after 400px |
| 11 body scrolls, doc does not | green (regression guard) | green — docOverflow 0, body 320/917 |
| 12 pill fills | green **and vacuous** — see below | green — 6 pills against the contract's hexes |

⚠️ **6b CANNOT BE PROVEN AND NOW SAYS SO.** §9.6 asks that a meta line fits on one line at 392px.
Setting the VIEWPORT to 392 made it pass — and measured on the deployed site, the list card is
**100px wide there**, every meta ellipsised to nothing and all nine deeds on three lines. Not
wrapping because there is no room to wrap in is not the claim. The assertion now requires the CARD
to be at its design width before the wrap check counts, and reports **NOT PROVEN** below it. The
cause is that `/todo` is not adapted below the shell's breakpoint — this repo's own notes record the
page as parked for mobile — which is outside this brief. **The 1440 result is unaffected: 0 of 9.**

⚠️ **Three assertions were green-before, and only one honestly.** §9 says a green-before assertion is
a broken one, so each was examined rather than accepted:

- **12 was vacuous.** The pill selector was composed by string-joining and expanded to
  `".tlc, .tdw-rail .pill, …"`, which matched the **card** and keyed the map on its entire text —
  so every `wantPill[key]` was `undefined` and the filter found nothing wrong *because nothing was
  compared*. Fixed to `.pill`; it now checks six pills and is green on its merits.
- **6 / 6b were vacuous.** `getClientRects().length > 1` is always 1 on a **block** element whatever
  its text does — it reported 0 wrapped over rows that visibly wrapped. Rewritten as height against
  line-height, which turned them red (7 of 12, then 11 of 12) and found the real fault.
- **3 and 11 are honestly green.** Both are properties the port must *preserve*, not introduce.
  Manufacturing a red for them would have been dishonest; they are regression guards and are
  labelled as such.

## What was deleted, not hidden

`TaskList.tsx` rewritten from 838 lines to 182 — the tick, the ⋯ menu, the hover cluster, the
snooze dial, the skeleton, the ring, `hkExpanded`/`onToggleHk`, `groupSlice`/`showMoreLabel` and the
row keyboard cluster all went with their code. `renderRailTools` is **deleted** (89 lines), and the
rail's `.tdw-tools` and `.tdw-foot` with it — that second footer was where "showing 13 of 12" was
written, and the fix is that there is no longer a second place a count can be written.

Two suites retired whole (**140 cases**): `tasksList.test.tsx` (the four/six-track row, the checkbox
lane) and `tasksStates.test.tsx` (the tick's spinner, the ring, the skeleton). Their subject is gone.

## Behaviour lost, and named rather than absorbed

- **The row's keyboard cluster** — `j`/`k` focus, space-to-tick, `s`/`x`/`.`/`o`. §8's "Nothing
  else" removes them with the controls they drove. The page keys (`⌘K`, `W`, `?`, typing
  stand-down) are untouched.
- **Snooze has two doors now, not three.** The rail's clock went with the hover cluster; the `s` key
  and the pane's own control remain. `tasksCarryover` says so in place of counting.
- **The tour had two stops pointing at retired classes** — `.tdw-search` and `.tdw-menuwrap`.
  Re-pointed to `.l-search` / `.l-menuwrap`. A tour stop whose selector misses is **dropped in
  silence**, so this is the kind of rename that costs a step with nothing going red.

## Data the row does not have (§10)

- **The partial's specific ask** — "the first 3 chapters" has no field on the request record.
  `listMeta` falls back to `{Agent} · {Agency}` per §6, and the contract's own rows show what it
  would look like when the data arrives.
- **The offer date** — `Query.offerDate` exists but the harness account's imported offers do not
  carry it, so Decide meta renders `{Agent} offered representation` without the date.

## Gates

tsc 0 · production build 0 (whole output grepped) · vitest **329 files, 5557 passed, 2 skipped**
· listPort **14 green / 1 not-proven** measured on the page (6b, above).

Screenshots: `reports/list-port/contract-{1440,390}.png` (the contract from disk) and
`reports/list-port/page-{1440,390}.png` (the page at the same widths).
