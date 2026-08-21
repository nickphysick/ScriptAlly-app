# Comparable Titles v2 — run report

**Commits** `403da8ee` §1 → `cc27a62e` §2 → `e0529341` §3 → `d141c771` §4 → `d3f5c93e` §5 → `3ec69b6e` §6
**Branch** `main`, direct. **Deployed to dev** 21 Aug — https://scriptally-dev.web.app (hosting-only; no rules, no functions).
**Ref** committed at `design-refs/comparable-titles-v2.html` (see false premise 1).

> **⚠️ CORRECTION — §1's alignment fix was wrong and has been reverted by another session (`39e6f458`). See *The alignment fix was a mistake* below. Everything else here stands, and is measured on the deployed site.**

---

## False premises in the brief

Five, and two of them changed the work.

| # | The brief says | Reality |
|---|---|---|
| 1 | ref at `design-refs/comparable-titles-v2.html` | **Absent.** It was in `~/Downloads`. Copied in and committed with §1 — the same pattern this repo has hit before ("the specified `design-refs/` dir was ABSENT again"). |
| 2 | "one **new** Pro feature (The Scout)" | **The Scout already ships**, and as a *different concept*: an AI "send it out" run (`RUN_STEPS`, `fetchCompRun`, `scoutLive`), not a community library. Landed in `3705e2d3` and `ef150c97`. **Nick's call: keep the run, re-skin it.** |
| 3 | "the Scout band renders sage" | **False, and already fixed** in `cbe4e64d`. `.ct-band.blue` exists and the markup carries the modifier; the CSS comment records that exact bug. |
| 4 | "the empty state shows two stacked add CTAs" | **False, and already fixed.** The code comment names it verbatim — *"a pink ADD A COMP directly above ADD A COMP MANUALLY"*. The add row stands down while the empty state is up. |
| 5 | Pro slate "may not yet be tokenised" (Phase 4 conditional) | **False.** `--slate` / `-deep` / `-tint` / `-line` have been in `index.css:43` all along. Phase 4's token work was not needed; `.ct-btn-slate` reads the app token so the tier colour cannot drift. |

Two premises **held**, and one was bigger than described:

- **The header plate sits 45px outside the sheet on each side** — the measurement was right, ~~and it is a fault~~ **but the verdict was wrong: this is the design.** See the correction below. Masthead resolves `min(--work-max, 100% − 2·--mast-gutter)` = `min(1660, W−70)`; the scroll column resolves `min(--wpg-measure ?? 100%, 100% − 2·(--wpg-gutter ?? --content-gutter))`, and this page declared neither token, so it came out `W−160`.
- **The hero had dead space to the right** — true of the masthead plate, which carries no tools and no toolbar on this page.

### The finding that is not in the brief at all

**"Letters using comps" and "Used in N query letters" are not derivable.** `SubmissionPackage` carries three version ids and no comps; `CompTitle` carries an `inQuery` intent and no usage record. Nothing in the model links a comp to a letter. The brief states both are derived *and* forbids a counter field; both cannot be true. Rendering `7` would have been a fabricated value — the fault this repo has recorded three separate times.

**Nick's call: drop both, flag as follow-up.** Requirements are at the end of this report.

---

## Per phase

### §1 — Hero and manuscript tile · `403da8ee`

Two-column hero: eyebrow `MATERIALS · POSITIONING`, standfirst, three-fact row left; active-manuscript tile right. The dead space beside the title is now the tile.

- **No `<h1>` in the hero** — Nick's call. `PageHeader` already renders "Comparable titles" on the plate; the ref draws its own only because it is a standalone mockup with no masthead. Building it as drawn would put the same words on screen twice.
- **The third fact is `Verified`, not "Letters using comps"** — real, derived by `isVerified` at render, and already on the page. See the premise note above.
- **~~Alignment fixed page-scoped~~ — REVERTED, and it was my mistake.** I set `--mast-gutter: var(--content-gutter)` alongside `--wpg-measure: var(--work-max)`. The `--wpg-measure` half survives and is right; the `--mast-gutter` half was wrong and is gone. Full account below.
- **The selector is `.ct-wpg.wpg`, not `.ct-wpg`, deliberately.** `WorkspacePageGrid` puts the page's class on its own root, so `.wpg` and `.ct-wpg` are both 0-1-0 on one element and the winner is whichever sheet the bundler emits last. 0-2-0 decides it instead of chance. (This part was sound and still stands.)

**Gate** tsc clean · build clean · 417 comps tests green.

### §2 — Field notes infographic · `cc27a62e`

Two five-cell panels behind a segmented control, collapse control in the band, ref copy verbatim, ten named illustration slots.

- **`repeat(5, minmax(0, 1fr))`, not `auto-fit`** — auto-fit with a zero minimum is the declaration that grew a hundred phantom `0px` tracks on the stat block.
- **Collapse persists to `localStorage["sa.compsFieldNotes"]`**, the house convention. A new `User` field would need a Firestore allowlist entry and therefore a **prod rules deploy** (yours), leaving the control silently denied until it landed. A fold state does not warrant that.
- **The recency claim stays soft** — "broadly the last three to five years", plus an attribution line saying agents differ. The attribution is part of the claim, not a footnote to trim: it is what stops five cells reading as house rules.
- **Every cell describes comps in general.** None refers to the writer's own list — this card sits three inches above the comps it would otherwise be appraising.

**Slots for the illustrator:** `comp-job-shelf` · `comp-job-readership` · `comp-job-sales` · `comp-job-tone` · `comp-job-current` · `comp-miss-giants` · `comp-miss-age` · `comp-miss-unread` · `comp-miss-shelf` · `comp-miss-count` · `comp-empty` · `scout-empty`.

**Gate** tsc clean · build clean · 413 comps tests green.

### §3 — Query line builder and comp cards · `e0529341`

- **The tick moved off the card into the line's own chip row.** A chip under the sentence it changes makes ticking read as composition, not as a property set on a record three sections down. `role="switch"` + `aria-checked` + the comp's name on each; position roundel **only when ticked**, because position is a fact about the line.
- **The age chip stopped flagging — this is the phase's point.** `compAge` returns null unless a book is *more* than five years old, so its chip appeared on some rows and not others; `compRole` sorted comps into "Market comp"/"Tone comp" on the same boundary. A mark that lands on *some* of a writer's comps is an appraisal delivered by presence, whatever its wording. New `compAgeLine` has no cutoff.
- **Facets are split, not classified.** The ref draws Structure/Tone/Audience/Premise as if a fixed vocabulary; the model has one free-text `matchAxis`. `compFacets` splits on the documented separator and shows the writer's own words.
- **The aside omits what is not stored** — no reading date, no letter-usage count. Absent, not dashed or guessed.
- **`writing-mode`, not `transform: rotate()`** on the spine — a rotated transform does not change the layout box, so the 44px track would still have to hold the year's full horizontal width.
- **`.ct-thead` retired** — it labelled a five-track row whose Query column was the tick.

**Five locks retargeted, none weakened.** `sliceBetween` failed loudly naming its missing anchor rather than silently widening. The alignment lock's claim became structural (three independent tracks) because the failure it guarded is no longer reachable across separate grid cells. The hover lock **gained a case it never had**: `(hover: none)`, where neither `:hover` nor `:focus-within` can reveal anything on a touch device.

**Gate** tsc clean · build clean · 417 comps tests green.

### §4 — The Scout, re-skinned · `d141c771`

Per Nick: keep the AI run, re-skin the surface. `fetchCompRun`, the run steps and `SCOUT_LIVE = false` are untouched.

- **The suggestion takes the comp card's grid.** "Add to comps" turns a suggestion *into* a comp; a card that changes shape when accepted makes the writer re-find it. Only the spine's colour differs.
- **"Matched on" names facts, never a score.** No ranking, no percentage, no "Strong fit" — swept and clean; the only occurrences of that vocabulary in the page are the warnings forbidding it.
- **A lock caught a real regression rather than needing retargeting.** The re-skin had replaced the Scout's verified chip with a fact row; `compsScoutPanel.test.ts` failed on it. Fixed in the *code* — both cards now carry the same chip naming its catalogue, so a comp added from the Scout does not watch the claim reword itself on the way into the list.
- **The upgrade is slate, the verb stays pink.** Two jobs: pink is the writer's action inside a feature they have; slate is the tier.
- **The free teaser is `inert`, not just `aria-hidden`** — `aria-hidden` alone hides it from a screen reader while leaving it in the tab order.
- **No count, no quota, no "up to N".** Free comps are unlimited and the Pro boundary is the Scout itself.

**Not built, deliberately** — keeping the AI run means these describe something that does not exist: the library fact line, the four-cell "Where the library draws from" strip, and the ref's library provenance lines.

**Also fixed in passing:** `.ct-upsell` and `.ct-upsell .ghost` were each declared twice with different blur and opacity. (This consolidation missed their *children* — see §6.)

**Gate** tsc clean · build clean · 435 comps tests green.

### §5 — Empty state and sweep · `d3f5c93e`

Ref copy verbatim; "Add your first comp".

- **The real sketch stays.** The ref draws a dashed placeholder because it is a mockup with no artwork; this page has artwork in a slot already 200×150 and already dashed. The slot gains a **name** instead.
- **The slot's stamp reads its own name** via `attr(data-slot)`. The retargeted lock counts named slots against rendered slots, asserts the population first — and **immediately found one**: the Scout's empty slot had no name.
- **The appraisal helpers got a lock, not a comment.** `compsPhase3.test.ts` fails if `compAge` or `compRole` is imported or called, and asserts `compAgeLine` *is* present so it cannot pass by the page losing its age chip. **Verified red before it was believed** — reinstating `compRole(c, now)` fails by name; restoring turns it green. The lock strips comments (the page's own prose names both functions) and bounds its tokens (`toContain("compAge")` would match `compAgeLine`, the replacement).

**Sweep — five of six clean, one reported not fixed:**

| Check | Result |
|---|---|
| burgundy `<em>` in a heading | none — `.ct-estate .em` is a *class*, rendering in `var(--ct-ink)` |
| "overdue" | none |
| gendered possessives | none |
| `StatusDot` recreated locally | not used on this page |
| `display: contents` | none |
| `var()` inside a keyframe | **one, pre-existing** — `@keyframes ct-flash` reads `var(--ct-sect)` |

The keyframe `var()` is in a keyframe *block*, not a selector, and resolves at the element, so the themed row-landed flash works. Left alone: the only fixes are hardcoding a colour (breaks the three-theme contract) or restructuring a decorative flash for no visible gain.

**Gate** tsc clean · build clean · **full suite 361 files / 6166 tests green.**

### §6 — Measured on the page · `3ec69b6e`

Six measurements against the real signed-in app, from a throwaway worktree (`dist/` and port 4180 were both held by another session — the case CLAUDE.md says a worktree is the only way to finish).

| Claim | Measured |
|---|---|
| ~~plate and sheet share both edges~~ | Measured true in the worktree — **on a build carrying a change since reverted.** The live relationship is plate x297 · sheet x342, and that is correct. |
| hero is two columns | tile 268×296 beside the text, 3 facts, same row |
| comp card geometry | spine 44×165 filling full height · aside 214px · tracks in order · year inside its track |
| age chip is neutral | 2019 book → `"Published 2019 · seven years ago"` on `rgb(246,240,232)`, no warning treatment |
| facets split | `"structure · tone"` → two chips |
| no overlapping text | 51 leaves scanned, 0 overlaps |

**And the screenshot found what none of them could: the Scout's free card was clipping its own CTA** — paragraph cut mid-sentence, upgrade button gone, 77px past the card's edge.

**Cause:** `.ct-upsell .lockwrap` was declared **twice**, and the later one was `position: absolute; inset: 0`. An absolute overlay contributes nothing to its parent's height, so `.ct-upsell` measured the 82px teaser while hosting 155px of content, and `.ct-panel`'s `overflow: hidden` ate the difference. It had worked only while the ghost was three skeleton rows — tall enough to host the overlay *by accident*. The v2 teaser is one card, and the accident stopped holding.

**It survived two passes of this same file.** §4 consolidated the duplicated `.ct-upsell` and `.ct-upsell .ghost` rules and did not check whether their *children* were duplicated too — so I spent §6 editing the in-flow rule while a later absolute one quietly won. **A duplicate selector is not one mistake; it is a standing invitation to edit the wrong half.** Three further duplicate pairs went with it.

**Two earlier fixes were real but not the cause**, and both looked like progress: clamping the ghost and making the lockwrap a flex column took the overflow 77 → 44. The number moved because those genuinely were faults (a negative margin tuned for the old three-row ghost; margins collapsing out of a block so the box measured 88px around 181px). Neither touched the absolute positioning. **When one measurement improves and the claim still fails, the remaining gap is a different fault, not the same one half-fixed.**

Card height now 422px against 420px of content; the CTA sits 23px inside its own card.

---

## The alignment fix was a mistake

**What I did (§1):** read the 45px step between the masthead and the content column as a fault and closed it page-scoped with `.ct-wpg.wpg { --wpg-measure: var(--work-max); --mast-gutter: var(--content-gutter) }`.

**Why it was wrong:** `--mast-gutter: 35px` is a **cross-page constant**. The masthead's left edge is the same on all ten pages by design — the masthead left-constant pack's §A, which states it in as many words: *"35px, defined once. Every page uses it. No page overrides it"*, and names the consequence in the same breath: *"At 35px the masthead aligns exactly with Query Centre and Tasks and SITS OUTSIDE the wider pages' content. That's intended: the masthead is a constant, and constants don't bend to each page."* **The 45px step is the design, not a bug.**

**How it was caught:** another session's `contentGeometry.measure.ts` asserts that constant at 1280, 1440 and 2300. It found Comparable titles' masthead at **342 where every other page measured 297**, and `39e6f458` reverted the override. The `--wpg-measure` half survives — that one *is* a legitimate per-page opt-in and is still right.

**The reasoning error, which is the part worth keeping.** I read `workspacePageGrid.css`'s own comment saying the two measures *"differ deliberately"* — and overrode it anyway, reasoning from Query Centre's `--wpg-measure` precedent. That precedent does not transfer, and their note says exactly why: **the grid reads `var(--wpg-measure, 100%)`, with a fallback, precisely so a page may cap its own content; `--mast-gutter` has no fallback and no page scope.** My test was "is it a token the page can set". The real test is **"does the component offer it as a knob"** — a fallback in the `var()` is the component saying yes, and its absence is the component saying no.

**And my own verification missed it**, which is the second lesson. §6's measurement passed at 1440 in a worktree built *before* the revert landed, so it measured a build that no longer existed by the time I reported it. The deployed site is what caught the divergence — the third time in this pack that looking at the real thing beat reasoning about it.

**Now locked:** `compsV2.measure.ts` asserts the *lesson* rather than the mistake — `--mast-gutter` must read `35px` on this page, and the content cap must equal `--work-max`'s own resolved value (two derivations against each other, so pinning a literal `1660px` fails too). The cross-page geometry stays in `contentGeometry.measure.ts` and is deliberately not restated here; two suites asserting one law is how they come to disagree.

---

## Reused rather than built

- **`.ct-panel`, the page's own themed card** — not `MountCard` as the brief asks. `MountCard` hardcodes `parchment` (`#fdfaf5`) as an inline style *by design*, so it renders a cream card in all three themes; Editorial is white cards on a near-white desk and would clash. `.ct-panel` is the same object done per-theme and is what every other card on this page already is.
- **`--slate` from `index.css`** for the Pro CTA — the tier colour is one colour app-wide.
- **`manuscript-icon.png`** for the tile — the same asset `ManuscriptPlate`, `ManuscriptLibraryCard` and `OneScreenAuthor` render. One asset, one home.
- **`genreDisplay`**, **`compCounts`**, **`isVerified`**, **`SCOUT_LIVE`/`scoutLive()`**, **`sa.` localStorage**, **`sliceBetween`**.

## Built rather than reused, and why

- **A local manuscript tile.** `ManuscriptLibraryCard` is a *clickable shelf book* requiring `PlateStats` and `PitchMeter`, with a logline and a pitch meter — a different object, not size-parameterisable. The tile reuses the shared asset and genre helper.
- **`compAgeLine` and `compFacets`** in `compsPage.ts`. `compAge` could not be reused: its five-year cutoff is the thing being removed.

## The Scout's data shape

The brief asked for an exported type for the eventual library. **Written here rather than as code** — an exported type with no implementation implies a library exists, which is the same fault as copy shipped ahead of its behaviour. What a real community library would have to supply, beyond today's `CompSuggestion` (`title`, `author`, `publisher?`, `year`, `media`, `matchAxis?`, `why`, `verification`, `links?`, `agentMatch?`):

- **`libraryId`** — stable id in the shared library, so "already on your shelf" is an id comparison rather than a case-folded title match (today's check is the latter).
- **`addedToLibraryAt`** — the ref's "Verified · added 2024" line.
- **`matchedOn: string[]`** — the *facts the query ran against* (`Thriller`, `Adult`, `Comparable length`, `UK setting`, `Recent`), as a real array rather than a split of free text. **Never a score, never an order.**
- **`provenance: { kind: "trade-press" | "agent-wishlist" | "reader-data" | "community"; statement: string; sourceUrl?: string }[]`** — what makes "Named on 3 agent wish lists" sayable. Each entry must be a *fact with a source*, not a summary.
- **`libraryTotals: { verified: number; inCategory: number; category: string }`** — the header's library fact line, which today has no data.

---

## Decisions the brief did not cover

1. **The third hero fact.** Brief's was unbacked; I kept the three-fact shape with `Verified`, which is real and derived. *(Confirmed with Nick.)*
2. **`MountCard` vs `.ct-panel`.** Chose the page's themed card — see above.
3. **The grip survives** against a two-action ref aside. The list's order *is* the query line's order, and the grip is the only reorder reachable without a pointer. Dropping it would be a functional and accessibility regression.
4. **"Send to package" not drawn.** *Not* because the field is missing — `contentDraft` holds a letter's text. Because there is no unambiguous target (a manuscript may have several packages, each with its own `queryLetterVersionId`) and no safe write (that draft is the writer's own prose; appending blindly is a mangling). That is a flow with a picker, not a button.
5. **Dead symbols retained, not swept.** `CompsSavedMark` / `InYourQueryMark` / `VerifiedMark` (unused since §1) and `compAge` / `compRole` (unused since §3). All page-only and all now dead — but they became dead through *this* redesign rather than being found dead in recon, and they are finished work with passing tests. The pair that could do harm by returning is locked against.
6. **Band colours.** The ref's sage/pink/slate reads as Cappuccino-specific; the page's band token is themed (Capp sage · Bold pink · Editorial grey). Kept the themed band for all three free cards and the Scout's blue for the tier, rather than adding a third band colour that would collide with Bold's already-pink default and breach Editorial's value-not-hue rule.

## Follow-ups

1. **The comp → letter link.** Needed for "Letters using comps" and "Used in N query letters", and for "Send to package". Minimum: a record of which comps were in the line when a letter was written. Touches the data model and needs a **Firestore rules change — a prod deploy, yours.**
2. **`/manuscripts/comps` is scheduled to retire** per CLAUDE.md, in favour of the Manuscripts card's comps tab. This pack improves the page the note says will go. Worth reconciling that decision explicitly — the two surfaces have now diverged further.
3. **`@keyframes ct-flash`** reads a `var()` — see the sweep table.
4. **Illustration slots** — twelve named, dashed, awaiting artwork.
5. **`.ct-upsell` duplicate-rule family** is cleared, but the file is worth one pass for any other duplicated selector: its own invariant is one rule per selector, and §6 shows what a duplicate costs.

## Deployment

**Dev, hosting-only, 21 Aug** — `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`, from a `npm run build:dev` at `07f36ac8`. Pre-flight: 0 behind `origin/main`, no uncommitted source, all seven commits reachable from HEAD. The served bundle was confirmed byte-identical to the built one, and all six measurements re-run green against the live site. **No rules and no functions were touched, and prod was not touched.** No Firestore rules were touched. The harness comps added during measurement were removed in a `finally`; the worktree, its copied `.env.local` and its copied `tests/e2e/.auth/state.json` are deleted.
