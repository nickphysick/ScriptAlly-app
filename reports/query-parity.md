# Query Centre — Contact-list parity

Run of 8 Sep 2026 · refs `query-centre-v15-contact-parity.html` (`8198fe89…`) and `art/query-centre-masthead.png` (`cdbfcd99…`), both verified and enrolled (`41d8ada1`). Build `e608d526`, plus three files that landed in `01a5e8ab` — see the flag at the foot.

---

## ⚠️ False premises, before anything else

Eight. Four would have produced a wrong build if followed literally.

**1 · The artwork with the stated hash is INSIDE the ref, not the loose file beside it.** A `query-centre-masthead.png` sits in Downloads and hashes to `866e1a15…` against the brief's `cdbfcd99…` — a re-encoding of the same 100×100 drawing at 24K rather than 18.5K. The file carrying the stated hash is the base64 embedded in the ref, which is where this repo took `hero-illustration-placeholder.png` from too. Committing the loose copy would have passed every eye check and enrolled a hash nothing in the brief refers to.

**2 · The header was never page-local, so there was nothing to extract.** §1 says "recon it; if it is page-local, extract it to `shared/`". Both pages already mount the shared `PageHeader` from `shell/`. Parity is a matter of passing the same props — and "assert Contact list's rendered header is byte-identical before and after" is satisfied by Contact list not being touched at all, which the lock asserts positively rather than by silence.

**3 · The masthead's picture is `icon`, not `IlloSlot`/`ArtSlot`, and the prop is `src` not `art`.** Three separate things were conflated. `PageHeader.mark` no longer renders in the masthead at all (it survives for the collapsed bar); `illo` is an additive slot **between** the text and the primary, not the left-hand picture; and `ArtSlot`'s asset prop is `src`. What Contact list passes — and therefore what parity means — is `icon`, a URL rendered as `<img class="wsh-icon" alt="">`. Using the placeholder primitive would have put hatching and a mono caption on a finished asset.

**4 · "Title Playfair 34px" is a misread of an avatar.** There is no `font-size: 34px` anywhere in the ref. `width: 34px` belongs to `.chip`, the 34×34 monogram circle. The ref's own title is `.t { font-size: 25px }`, and the shared component renders **32px**. Since §4 asserts the two headers match, the component's size is what parity requires; a per-page override would break the very claim being asserted.

**5 · Two more of §1's numbers are the ref's drawing, not the shared format.** The artwork is `78px` in the ref against `--mast-icon: 72px`; the strap is Playfair *italic* 15px in the ref against `.wsh-sub`'s upright 14.5px. Both are single tokens shared by ten pages. Applying either per-page breaks parity; applying either globally restyles nine other pages on a Query Centre brief. Reported rather than done.

**6 · The hero band is a TWO-PAGE trial, not a Query Centre element.** `illustratedMasthead.css` serves Query Centre **and** Submission packages, and its own header says deleting it reverts both. "The old hero's own illustration is removed with the band" therefore means removing one page from five grouped selectors — the removal-that-serves-two hazard — so both directions are asserted: zero live `qc-wpg` selectors, all five `pkgw-wpg` rules present.

**7 · The ref declares `.lh` three times.** It is an options sheet, like the two before it. The sand band the brief names is the first; the other two are a 2px-ink-rule variant and a sage-gradient variant. The brief's own values identify which, but a reader taking "the `.lh` rule" would have a one-in-three chance.

**8 · `mastheadMatrix` is a loose name, and the claim attached to it was wrong.** The comment this run deleted said "`mastheadMatrix` counts the markless pages, so a third cannot drop its mark unnoticed". No such census exists — no e2e lock sweeps `.wsh-icon` across pages. What does exist is `compactHeader.measure.ts`, which includes Query Centre and derives from icon presence rather than pinning it to markless, so it absorbed this change without editing. Three other files still cite `mastheadMatrix` in comments; not this run's to fix.

---

## §1 · The shell header

Both pages mount the shared `PageHeader variant="workspace"`; Query Centre now passes `icon` as Contact list does, and the hero band is gone. The rest of §1's layout — Playfair title, strap beneath, ink pill right — was already what that component draws, so the parity is structural rather than copied: **the CTA already used `--btn-ink` with `#fdfaf5` text at `border-radius: 999px`**, which is the ref's `99px` pill by another spelling.

What the component gives against what the ref draws:

| | shared component | ref | shipped |
|---|---|---|---|
| artwork | `--mast-icon: 72px` | 78px | **72** — one token, ten pages |
| title | `--mast-title-size: 32px` | 25px (`.t`) | **32** — the brief's "34px" is `.chip`'s width |
| strap | `.wsh-sub` upright 14.5px | Playfair italic 15px | **upright 14.5** |
| CTA | `--btn-ink` · `#fdfaf5` · 999px | ink · `#fdfaf5` · 99px | unchanged |

Every divergence is the same decision: these are shared tokens, and §4 asserts the two headers match. A per-page override breaks the assertion; a token change restyles nine other pages on a Query Centre brief.

**The comment refusing a mark went with the band.** Its reasoning — *"the illustration bleeding across this band IS the page's picture, and a glyph beside the title is a second picture competing with the first"* — was right about the band and dies with it.

## §2 · The count

`PageTally` — the shared component Contact list and Analytics already mount — at the head of the toolbar row, fed by this page's own `gridRows` and `mastheadScopedQueries`: the same two figures the footer stated, moved rather than recomputed. The component's own rule is that every page supplies its own strings and there is no shared count function; this obeys it.

**`Export CSV` stays in the list footer**, where it was — it is an act on the filtered set and the foot is where that set ends. The foot gained `justify-content: flex-end`, because `space-between` with one remaining child would have slid Export to where the count used to be: a control moving because its *neighbour* was deleted. `.qcc-foot b` was deleted with the bold it styled.

## §3 · The list header

Sand band `--state-queried` `#f7efe3`, `1px #e4d9c9` beneath, names Playfair 14px ink, orderless names `#9c8878`. Sorting, the caret ladder, the shared sort state and the one-grid alignment contract are untouched.

**Why mono was right and is now wrong.** On a white header sharing the rows' ground, the typeface was the only thing that could separate a column name from an agent name — and a serif label an inch above serif data cannot be read as a label. The band does that job now, so the type is free to be the page's own voice. The lock therefore asserts the **separation** — the band and its rule, and that the rows do *not* take that ground — rather than a typeface, which is the term that has now flipped twice and would flip again.

**The hover colour is retired as a consequence, not an omission.** The mono header rested muted and darkened under the pointer; resting at ink there is nothing darker to go to, and the inherited `#3a1c14` would have *lightened* the label. The caret's 0 → .4 is the affordance, which is all the ref draws.

### ⚠️ And the header has not been in the face its stylesheet claimed

`.qlv-h--btn` carried **`font: inherit`** — the shorthand — declared after `.qlv-h` at equal specificity, so it reset the family and size to whatever the row inherits. Measured `"source sans 3"` where the sheet said Playfair. It has been wrong since long before this run: the mono header only *looked* like mono because `text-transform` and `letter-spacing` are not part of the `font` shorthand and came through on their own — **the face never did**, and the previous run's source lock read the declaration and passed.

This is the `background`-shorthand trap this repo already records, wearing `font`'s clothes. The fix is **no font declaration at all** on the modifier, not the same reset spelled longhand: `font-family: inherit` there does identical damage for the identical reason. The button needs no reset, because `.qlv-h` is an author rule on the same element and beats the UA sheet's `font: 400 13.333px Arial` unaided.

---

## §4 · Measured

`tests/e2e/queryViews.measure.ts` → `parity · one header component, one count, a sand band`, against a dev build of `e608d526` on a worktree preview bound to `127.0.0.1`.

**The two headers, same props shape:**

| | Query Centre | Contact list |
|---|---|---|
| element/class tree | *(compared whole — equal)* | *(equal)* |
| icon | `img` · 72px · `alt=""` | `img` · 72px · `alt=""` |
| title face | `"Playfair Display", Georgia, serif` | identical |
| CTA fill | `rgb(28, 19, 15)` | identical |
| placeholder hatching | **0** | — |
| `.art` slots in the masthead | **0** | — |

The comparison is the **class skeleton**, not the text — the two pages state different words, so what must match is the tree of elements and class names the shared component builds. Two pages drawing one shape produce the same skeleton; a page that grew its own header would not, whatever its copy said.

**The band and the count, at three widths** — identical at 1280, 1440 and 1920:

| reading | value |
|---|---|
| band `background-color` | `rgb(247, 239, 227)` — `#f7efe3` |
| band rule | `1px solid rgb(228, 217, 201)` — `#e4d9c9` |
| header names | `"Playfair Display", Georgia, serif` · `14px` · `rgb(20, 20, 18)` |
| orderless names | `rgb(156, 136, 120)` — `#9c8878` |
| `.wpg-tally` elements | **1** |
| `"N of M"` in the page's text | **1** — `54 of 54` |
| tally · toolbar row · list header, left edge | **identical** — 247/247/247 at 1280 and 1440, 392/392/392 at 1920 |

Both halves of the count matter: one tally *element* and one `N of M` *string*. The footer used to state the same figure, so an element-only check would pass on a page saying it twice in two different shapes.

**The alignment lock was re-run, not rewritten**, and passes unchanged after the header change — 0.00px worst delta at all three widths. Red-then-green: giving `.qlv-head` its own `padding-left: 32px` reddens it by 6px at 1440, so the lock is still live rather than merely still green.

### ⚠️ A layout bug I reported to myself and then disproved

Reading the 1280 screenshot, the tally appeared clipped — `4 of 54`, with the leading `5` cut at the column edge — and I began diagnosing the flex row. Cropping and enlarging that exact region shows **`54 of 54` in full, clear of the window's edge**. The "clipping" was downscaling, in a 1280-wide image shown small.

That is this repo's own rule about asserting a colour from a glance, arriving from a different direction: a screenshot read at a glance is evidence of nothing, and thirty seconds of `sips -c` settled what several paragraphs of reasoning about `margin-right: auto` did not. The containment assertion I added while chasing it **stays, and is now proved both ways** — not because the bug was real, but because it converts that glance into a measurement, and the next person reading a small screenshot will have an answer instead of a suspicion.

It was written after the last green run, and every attempt to exercise it died in `auth.setup` while the machine sat at load 15–22 from other sessions — four runs, 1.7 to 4.1 minutes each, against a 30-second wait for the workspace shell. **On a quiet machine (load 4.9) it runs in 19.8 seconds and passes**, and pulling the tally 20px left of its row reddens it by exactly 20. Every one of those earlier failures was contention; none was the page.

The reading is stronger than "inside its row": **the tally, the toolbar row and the list header all start on the same x at every width — Δ 0 at 1280, 1440 and 1920.** The count is flush with the column it counts.

---

## Where `Export CSV` sits

Unchanged: the **list footer**, right-aligned. The brief asked me to say where — it is an act on the filtered set, and the foot is where that set ends. The only edit is `justify-content: flex-end` on the foot, which is what stops it sliding left now that the count it was paired with is gone.

## Flags

1. **⚠️ Three of this change's files are in another session's commit.** `01a5e8ab` ("dash: type scale") contains `Queries.tsx`, `illustratedMasthead.css` and the new masthead asset — swept in by a broad `git add` while they were uncommitted. Content verified line by line and correct; recorded rather than repaired, because amending a ref another session is standing on is forbidden here and rewriting history to tidy a message is worse than a message that needs a paragraph. It is the one concurrency shape explicit-path staging cannot prevent.
2. **The masthead artwork is 100×100 for a 72px slot** — 1.28×, adequate rather than crisp, and there is no larger source on this machine.
3. **Three files still cite `mastheadMatrix`** (`TasksPageLayout.tsx`, `comps21.measure.ts`, `contentGeometry.measure.ts`) for a census that does not exist as named. Not this run's to fix.
4. **The machine sat at load 15–22 for most of this run** from other sessions' builds and test runs. Measurements that take ~20s took 1.7–4.1 minutes and several timed out in `auth.setup`. **Proved to be contention rather than a page fault: the same suites run green in 19.8s at load 4.9.** Stated so a future reader does not diagnose the app from those failures.
5. **`main` is unpushed and far ahead of `origin`.**
