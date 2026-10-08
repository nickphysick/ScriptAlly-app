# Contact list v14 — report

Pack: `contact-list-v14-pack.zip` (oracle `design-refs/contact-list-v14.html`). Built 7–8 Oct, direct to `main`,
measured in `/private/tmp/sa-cl14` (dev build, `vite preview` on 127.0.0.1:4440). The pre-v14 baseline is `847b5f31`,
served from `/private/tmp/sa-cl14base` on :4441. **Nothing has been deployed** (hosting, functions or rules); Nick
deploys to dev himself.

## False premises (in the pack, checked against the repo)

1. **The `../ScriptAlly-ink` worktree does not exist.** The ink shell, its fix-ups and Query Centre v131 were already
   on `main` (`847b5f31` = origin/main on 7 Oct). The work went direct to main.
2. **The bar ink is `#2a3a52`, not the prompt's `#1f2b3a`.** `#2a3a52` is v131's compact card colour (`--phb-ink`).
   The ink shell itself is `#1b2433`. Ruling Q2 settled it, and the locks read `rgb(42, 58, 82)`.
3. **"Takes the book" read the manuscript's main genre only.** Ruling Q5 widened it to the main genre OR any subGenre,
   through one function, `fitsGenre`. `AgentCardHost` and `contactEdit` still use the main genre (see follow-ups).
4. **Discover cannot be "filtered to the book's genres".** It is gated off (`DISCOVER_LIVE = false`) and takes no route
   parameters. Its links are gated on the flag (ruling Q4), and both branches are locked.
5. **UK nations cannot be derived from the data.** A country is an ISO code plus a free-text city, so the Country
   grouping uses the country name, with "Not recorded" last (ruling Q3).
6. **`AgentQuickView` is not the mock's card.** It is a modal: an escape layer, a window key listener and
   `id="ac-name"`. The section's card is `AgentCarouselCard`, built from the quick view's own blocks.
7. **The two reminder wordings disagree.** The next-step section says "Remind me" / "✓ Reminder set", and Housekeeping
   says it differently. This was ruled a follow-up and is not changed here.
8. **The mock's 1280 next-step frame takes the well's height, not the card's.** There, the left well's text is taller
   than the card. The rule "the frame is card + 22" therefore holds at 1512 only; the 22px bottom gap holds at both.
   The card also stretches to its row, where the mock bottom-anchors it: our card is 338 against a 364 well, so a
   bottom-anchored card would leave 26px of air above it.

## Deviations from the mock (deliberate)

- **The section's card stretches to its row** (premise 8). It is locked against the natural-height alternative
  (P2, mutation 3).
- **The strip's fold is measured, not set at a breakpoint.** An inert copy of the unfolded row is compared with the
  bar's width. It folds at 1280 (969 > 926) and not at 1512.

## Commits

| Phase | Commit | What |
|---|---|---|
| 1/7 | `31a1af05` | the compact hero card, inert figures, no carousel, one meaning of "takes the book" |
| 2/7 | `57f72c9d` | the next-step section, all four states |
| 3/7 | `3c431280` | the "Your agents" workspace: the ink bar, two pills, the controls row |
| 4/7 | `bd7aaa5c` | the filter strip, Nick's grouping and sort set, versioned list memory |
| 5/7 | `17d93828` | group headers and rows, from v131's table grammar (`shell/listTable`) |
| 6/7 | `11bf47f5` | the touches: live count, A–Z rail, row keys, density, the dead end, reduced motion |
| 7/7 | this commit | the page guide lock, CLAUDE.md, this report |

Every phase was pushed after its gates and its measurement.

## Gate output

- **Baseline `847b5f31`:** `tsc` 0 · `vite build` clean · Vitest 532 files, 8,387 passed, 3 skipped.
- **Final (Phase 7 tree):**
  - `tsc --noEmit` exits 0 with 0 lines of output.
  - `vite build` exits 0, "3092 modules transformed", "built in 5.97s", and `grep -inE "error|\[WARNING\]"` finds
    nothing.
  - `vitest run` exits 0: **Test Files 535 passed (535) · Tests 8417 passed | 3 skipped (8420)**.
- **Rendered (Phase 6 tree, one worker):** contactV14 + contactV13 + contactV11 together, **41 passed (8.6m)**, 0
  failed. CL14-16 then passed on the Phase 7 tree.
- **Pre-existing reds on the baseline, not touched:** `pageHeaderV2` §4.5 (the harness account's add-manuscript item is
  disabled) and `bandHairline` (it reads the retired `.wsh`).

## The locks, and the proof each was red first

All rendered locks are in `tests/e2e/contactV14.measure.ts` (helpers in `cl14Lib.ts`), run at 1512 × 900 and
1280 × 800, each with an assertion floor (`L.done(n)`).

"Baseline" means the lock was run against the pre-v14 build, `847b5f31`. "Mutations" means a named break was applied
in the measurement worktree and the lock went red at the assertion it names. The records are in
`mutation-proofs-p1…p7.jsonl` and `REDFIRST.md`.

| Lock | Holds | Red before green |
|---|---|---|
| CL14-1 | order and rhythm: hero card in rgb(42,58,82) → strip → 44 → section → 56 → workspace; no carousel | baseline (carousel present, full-bleed band) · P3: 40 instead of 56 |
| CL14-2 | the five figures are inert — clicking changes no markup, rows, scroll, URL or overlay | baseline (three figures pressable) |
| CL14-3 | the next-step section: four states, the card is `AgentCarouselCard`, stretched, "See all" keeps the genre | baseline · forked card · natural-height card · genre dropped |
| lock 4 (unit) | the ready set (open, not queried, takes the book) and the DISCOVER_LIVE gate | not-queried dropped · DISCOVER_LIVE ignored |
| CL14-5 | the white panel 20 wider than the strip each side, 24px corners, the bar rgb(42,58,82), the hawk raised | baseline · margin 0 · #1f2b3a · hawk at top 0 |
| CL14-6 | each pill's number equals the rows it leaves | baseline · "waiting on you" bound to the wrong set |
| CL14-7 | the filter strip and its measured fold | baseline · fold never folds · Always toggling Missing |
| CL14-8 | grouping orders and the powder band | baseline · Status reversed · YOUR MOVE kept · band grey |
| CL14-9 | versioned memory: restored, validated, v13's key ignored, a fresh session restores nothing | baseline · restored unvalidated (first stayed green; strengthened to read the list's grouping) |
| CL14-10 | the genre field: suggestions, any/all, Enter adds no free text, Escape clears | baseline · free-text add · "all" ignored · no escape layer |
| CL14-11 | rows: clipped panel, lifting labels, dividers, height, no edge, discs, add pills, marquee | baseline · `hidden` not `clip` · ink disc when closed · edge back · labels never lift · no marquee · labels off the columns |
| CL14-12 | the A–Z rail: hidden at top and under other groupings, 26 wide in the letter panel, a jump lands under the labels | baseline (no rail) · always shown · centred jump (gap 375) |
| CL14-13 | row keys: J/K move the ring, the tray shows, L starts the action, they stand down in Find, Esc lets go | baseline (no ring) · keys work while typing · L does nothing |
| CL14-14 | the dead end: each drop's number is the rows it brings back | baseline · drops counted without the other filters (37 vs 31) |
| CL14-15 | reduced motion: count, reflow and marquee all still; all three run without it | baseline · count animates · reflow runs · marquee runs (−32px) |
| CL14-16 | the page guide: four steps in the pack's words, each ringing exactly its subject, on screen | baseline (v13's words, missing subjects) · step 2 on the strip · v13's words · no scroll on steering · Housekeeping rings nothing |

**Retired:** CL13-5, CL13-6, CL13-7, CL13-8, CL13-F, CL13-B, CL13-SB and contactV11 §10.2. CL13-11, -12, -13 and -14
were repointed. Details are in `tests/e2e/RETIRED-contact-list-v14.md`.

## Follow-ups (for Nick)

1. **The Query Centre adopting `shell/listTable`.** Until it does, v131's table grammar exists twice, deliberately
   (ruling Q1).
2. **`AgentCardHost` and `contactEdit` still match on the main genre only.** The Contact list uses `fitsGenre` (the main
   genre or any subGenre), so the card's fit line can disagree with the list for a subGenre-only match.
3. **The reminder wording:** "Remind me" / "✓ Reminder set" here against Housekeeping's wording (premise 7).
4. **Discover's genre filter:** once Discover takes parameters, "and N more in Discover" can carry the book's genres.
