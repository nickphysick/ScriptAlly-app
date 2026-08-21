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
