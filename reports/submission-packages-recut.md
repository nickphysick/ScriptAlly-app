# Submission packages — visual re-cut

Design authority: `design-refs/submission-packages-recut-v2.html` (visual treatment only).
Every behavioural decision from `cc-prompt-submission-packages-broadsheet.md` and
`cc-prompt-broadsheet-resumed.md` still governs — modal flows, gating, the archive-vs-delete model,
derived counts, the do-not-touch list and the concurrency boundary.

---

## Step 0 — recon

### R1 (F-J) — **STALE BUILD, not a live defect.** Checked three ways, not guessed.

Nick's screenshot showed the Packages rail panel floating left of the bands. It is not there.

**On the running page at HEAD**, measured rather than grepped:

| probe | result |
|---|---|
| `.pkgo-rail` elements | **0** |
| `.pkgo-row` register rows | **0** |
| `.pkgo-grid` / `.pkgo-stage` | **0 / 0** |
| all four bands | **x=342, w=980** — identical, no ~380px offset |
| leftmost boxes in the scroller | `wpg-chrome`, `wpg-reclaim`, `wpg-mast`, `wsh` — all shell chrome |

**In the deployed dev bundle**, fetched and grepped:

| marker | deployed JS | deployed CSS |
|---|---|---|
| `pkgo-rail` | **0** | 1 (dead selector, see below) |
| `pkgb-matcol` · `pkgb-pkgcard` · `pkgb-sheet` | present | present |
| `pkgb-lrow` · `pkgb-hncell` · "No longer available" | present | present |

**And the timing settles it.** Dev hosting's live channel was released **2026-08-21 15:48**; Phase 4
landed at **13:57** and Phase 2 at **12:02**. So at the moment Nick looked, dev was serving a build
that predated the bands — and his description matches a specific intermediate state exactly: a rail
holding *only* a Packages panel is what the code was between Phase 2 (which deleted the Materials
register) and Phase 4 (which deleted the rail).

⚠️ **This also retires a constraint this build has been carrying since Phase 3.** "Dev rules are
ahead of dev hosting" is **no longer true** — hosting caught up at 15:48, so the archive model is
now deployed. Phase 5's hold is unaffected (it is about the header session's shell), but 5C's
end-to-end verification is newly possible.

**One genuine leftover, not a defect:** `.pkgo-rail` still has a rule in `packagesOverview.css`.
Nothing renders the class, so it paints nothing — a dead selector awaiting a cleanup commit, listed
here so it is not rediscovered as evidence of a rail.

### R2 — the slot component is single, and one homonym is not it

`packages/IllustrationSlot.tsx` is the only implementation this page uses; changing it changes every
slot, which is how all thirteen call sites moved from Caveat text to line art in one edit.

⚠️ **There is a second, unrelated `IllustrationSlot` in `components/analytics/`**, used by
QueryAnalytics, StatStrip, FullsPanel and JourneyFunnel. Different props (`art`/`size`), different
feature, no shared code. Recorded so nobody "unifies" two components that only share a name.

### R3 (F-K) — the PRO marker was **this page's own code**, and is gone

The wax seal was written in `packages/IllustrationSlot.tsx` and passed into the shared `PageHeader`
through its existing `titleAdornment` prop. **`PageHeader` renders no Pro marker of its own** —
checked before removing. So D1's first case applies: deleting the seal took **no shared header
edit**, and nothing survives in the shell to flag. Measured after: `0` Pro markers and `0`
occurrences of the string "PRO" anywhere on the page.

---

## The slot inventory — the artist's commission

⚠️ **THIS TABLE IS THE DELIVERABLE (D5).** The re-cut replaced the written briefs with line-art
placeholders, so the commission exists nowhere on the page any more. Every brief below is quoted
verbatim from `design-refs/submission-packages-broadsheet.html`, which is kept on disk for exactly
this reason. Losing this table loses the brief, and nothing in the code would show that it had been.

Sizes are the mark's rendered px at 1440, with the plate in brackets.

| id | band | icon | size @1440 | brief (verbatim) |
|---|---|---|---|---|
| `hero` | Hero | `desk` | 92 (330×168) | desk scene — letters sorted into a wrapped parcel |
| `mat-Query Letter` | Materials | `envelope` | 40 (76×76 disc) | sealed envelope |
| `mat-Synopsis` | Materials | `scroll` | 40 (76×76 disc) | rolled synopsis, ribbon |
| `mat-Sample Pages` | Materials | `pages` | 40 (76×76 disc) | sample pages, paperclip |
| `stamp-<pkg>` (a) | Packages | `parcel` | 36 (62×72) | stamp: parcel |
| `stamp-<pkg>` (b) | Packages | `typewriter` | 36 (62×72) | stamp: typewriter |
| `stamp-<pkg>` (c) | Packages | `inkwell` | 36 (62×72) | stamp: inkwell |
| `pkg-ghost` | Packages | `parcelOpen` | 54 (88×88) | open parcel, empty |
| `stat-sent` | Tracking | `outgoing` | 40 (70×70) | outgoing post |
| `stat-replies` | Tracking | `opened` | 40 (70×70) | opened envelope |
| `stat-requests` | Tracking | `bookmark` | 40 (70×70) | page with bookmark |
| `ghost-replies` | Tracking (pre-sent) | `chart` | 52 (86×86) | bar chart sketch |
| `ghost-requests` | Tracking (pre-sent) | `tally` | 52 (86×86) | tally marks on paper |
| `hn-sent` | Footnote | `postbox` | 34 (64×64 disc) | postbox |
| `hn-replies` | Footnote | `doormat` | 34 (64×64 disc) | letter on doormat |
| `hn-requests` | Footnote | `magnifier` | 34 (64×64 disc) | magnifying glass over page |

**Retired:** `postmark` ("postmark"), the ledger head's disc. The re-cut ref drops it and the
measurement showed why — a 34px plate with 12px of padding left **8px of mark**, which is a smudge
rather than a placeholder.

**Count.** Sixteen rows, not the prompt's thirteen: the three stamps are one call site with three
outcomes, and the two tracking ghosts appear only before anything has been sent. Instances on any
given page depend on the data — two stamps with two packages, three with three.

⚠️ **They are placeholders and the dashed border says so.** Every plate keeps its dash, which is
this page's grammar for provisional. When real artwork lands the dash goes with it.

---

## What was built, and what driving found

| phase | outcome |
|---|---|
| §1 hero + PRO removal | left column now SETS the band height — 241/168 at 1440, 187/168 at 1920 (was 136 against 246, stretched). 0 Pro markers, 0 "PRO" strings. |
| §2 icons + slots | seventeen marks ported verbatim, one library, one slot component `(icon, px)`. Every plate enlarged per the ref. |
| §3 materials grid | three-row columns: heads share a top, ghosts share a bottom, columns equal — by construction, verified in both data states. One-line meta with a real separator. |
| §4 sweep | one filled control, zero horizontal overflow, four bands on one measure, at 1440 and 1920, sparse and full. |

**F-I is closed by §1.** Alignment was never the fault — nothing had been promoted to fill what the
title left. Promoting the Caveat question did it; the measurements above are the proof.

### Two real faults, both found only by driving

**The stamps were half-changed.** `packageStamp` still returned `"stamp:\ntypewriter"` while every
plate had moved to icon names, so `PACKAGE_ICONS[that]` was `undefined` and the stamp plates
rendered as empty dashed boxes. Nothing errored; the page looked deliberate.

**⚠️ A `transform` ON THE BIN'S WRAPPER PUT THE CONFIRMATION OFF SCREEN.** Centring the delete
control with `translateY(-50%)` made that wrapper the **containing block for `position: fixed`
descendants** — and the removal popover is one. `useFixedMenu`'s coordinates then resolved against a
24px box instead of the viewport. Every declaration in the popover's own stylesheet was correct;
Playwright named it exactly: *"element is outside of the viewport"*. Same mechanism as the transform
that isolates a `mix-blend-mode` group — the rule applies, the browser honours it, and a different
thing silently stops working. Centring is now done with the box (`top: 0; bottom: 0` + flex), which
cannot establish a containing block, and a lock forbids a transform there because a comment would
not have stopped the next person re-centring it the same way.

### Five probes were wrong before the page was

Recorded as a pattern, because each named a **proxy** instead of the thing:

1. `textContent` cannot tell "correctly spaced" from "jammed" when the separator is an empty
   element — it reads `TextIn 1 package` on a line that renders perfectly. **This is where the
   standing parent-textContent rule stops:** the claim was about spacing, so it is measured as
   spacing.
2. Child `top` values differ on a centred row, so a tops probe reported "wrapped to three lines"
   about one line. Centres coincide; tops do not.
3. The filled-control check **enumerated whites** and flagged the manuscript chip at `#fffefb`. It
   now asks whether a fill is a **tint** — distance from white — which needs no list to maintain.
4. A brief sweep matched `TYPE_LABEL` and demanded the report protect a display string. Bounded to
   the declaration with `sliceBetween`.
5. A regex inside a template literal lost its backslashes before the browser saw it:
   `/rgba?((d+), (d+), (d+)/` — "Unterminated group". Replaced with a split.

The page was right in all five.

### One wording became two, and was collapsed back

The re-cut took the ref's shorter `Not in a package` and rendered it **inline** in the band, leaving
`usageLine` in the lib saying `Not in a package yet` with nobody reading it — two sentences for one
fact, differing by a word, on a page whose whole claim is single-sourced figures. The band reads
`usageLine` again; the shorter wording won because the ref chose it.

---

## §5C — the archive path, proven end to end on the deployed site

Never possible before: dev rules had been ahead of dev hosting since Phase 3. **5 measurements green
against `https://scriptally-dev.web.app`**, driving the real UI:

- a material a package holds → **archived**, leaves the type columns, still resolves inside the
  package, excluded from `N held`
- a material nothing holds → **deleted**, and it goes
- a package slot whose material is gone → reads **"No longer available"**, not blank
- the popover's copy is the archive wording, and the ref's struck "take it out first" sentence is
  asserted absent
- **Latest activity** renders real rows from the seeded log, agents resolved through
  `Activity.queryId → Query.agentId → Agent.name`

**The account is left as found** — 4 materials, 2 packages, no status fields set. Verified by direct
read after the run.

⚠️ **AND A TEST THAT CREATES STATE MUST REMOVE IT ON THE FAILING PATH.** The delete drive creates a
material and removes it through the UI at the end, which does nothing when the drive fails half way.
Three failed runs left **three identically-named materials** on the harness account — and then
poisoned every later run, because the probe that finds "the one called X" had three to choose from
and the counts other tests assert were off by three. There is now a module register and an
`afterEach` sweep, and the name carries a timestamp so a leak can never be ambiguous.

---

## Deploy record

| | |
|---|---|
| target | `scriptally-dev` — hosting only |
| command | `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` |
| built from | a **clean checkout at HEAD**, not the working tree |
| bundle | `scriptally-dev` present · `gen-lang-client-0801391782` **absent** · this build's markers present in JS and CSS · `pkgb-wax` absent |
| rules | **not** redeployed — `firestore.rules` unchanged since `98ceebf8` (Phase 3) |

⚠️ **BUILT FROM HEAD BECAUSE `build:dev` BUILDS THE WORKING TREE.** The tree held four sessions'
uncommitted edits including `WorkspacePageGrid.tsx`, `WorkspaceShell.tsx` and both shell
stylesheets — the shell the whole app renders through. Deploying from there would have shipped the
header session's mid-design work to dev without their knowing.

---

## Flags

| flag | status |
|---|---|
| **F-J** | **CLOSED — stale build.** Evidence in Step 0. Dev is now current. |
| **F-K** | **CLOSED — no shell involvement.** `PageHeader` renders no Pro marker of its own; the seal was this page's code riding an existing prop. Nothing to remove app-wide. |
| **F-I** | **CLOSED by the re-cut.** The left column sets the band's height at both widths. |
| **F-A** | **MOOT for this page** — the wax seal is deleted. Whether the app's Pro marker should become a seal elsewhere was never decided and nothing here depends on it. |
| **F-B** | open — no guard on deleting a sent package *from the Workshop's own surfaces*. This page's package bin routes through `removalChoice` and archives a sent package correctly. |
| **F-C** | open — unchanged by this pass. |
| **F-H** | **open, and now the most visible gap.** There is no un-archive surface. A material or package archived on this page leaves the working lists with no way back through the UI; the record survives and the packages that hold it still resolve it. No `unarchiveVersion` writer exists either — deliberately, because a writer no surface can reach is a claim that the feature exists. |

**Phase 5 of the broadsheet pack remains held** — that hold is about the header session's shell, and
none of it is in this deploy.
