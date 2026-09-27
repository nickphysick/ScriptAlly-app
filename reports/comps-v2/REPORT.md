# Comparable titles v2 — run report (27 Sep 2026)

Pack: `cc-materials-v2` (`00-shell-conformance.md` + `cc-prompt-comps-v2.md`), ref
`design-refs/materials/comps-v2.html`. Built on `main` from 770881f; twelve commits, each pushed after
its gates; **no deploys**.

## 1 · False premises (first, as asked)

1. **G0.2's "known stale items" are two; the G0 suites carry five.** Besides `mastheadMatrix`'s `/agents`
   row and `illustratedMasthead`'s `WITH_ART`, `pageHeaderV1` fails three v1 claims that page header
   v2 deliberately reversed — the bar now states the page name; the text block is ≤55% of the 920 frame,
   not ≤50% of the header; full headers centre in that frame, so they no longer share compact's left edge.
   The suites run; these are stale, not faults.
2. **More suites are red on `main` than the pack implies.** Run against an unmodified 770881f build, with
   identical messages before and after this work: `gapAudit` (a null rect), `headerFix` ×2 (Analytics'
   ground), `illustratedMasthead` (`/queries` art box 442 of 950), `mastheadMatrix` (`/queries`' header
   at 384 against a 294 column — v2's centred frame), `subWrap` ×2.
3. **"The house no-appraisal list" doesn't exist** as one artefact; nine suites each carry their own. C6
   uses a list written for this page, excluding "only" and "already", both of which the mock's own copy
   uses as facts ("Only the title is needed", "the comps you already have").
4. **Recon's "the row component" and "the query-line panel" were not components** — both were inline JSX
   in the 1,170-line `ComparableTitlesPage.tsx`, as were `CompInlineForm` and `ScoutPanel`.
5. **"The Scout teal" was not a usable existing token.** It existed only as `--msv12-scout`, scoped to the
   Manuscripts page. Promoted to `:root` as `--o-scout` beside `--o-ms`/`--o-pkg`, with four materials
   surfaces the mocks share (`--mat-parch-2/3`, `--mat-tray`, `--mat-soft`), mirrored in
   `designTokens.ts` and locked. Nothing else in the page's sheet is a new colour.
6. **`compositionLine` "extended as in the mock" changes its meaning:** v3 counted the switched-on comps
   (films in the denominator); the mock counts the whole library, books against books, screen comps as a
   separate clause.
7. **Where the prompt and the mock disagreed, the mock won:** the duplicate check runs when *adding* only;
   film/TV spines keep the initial and the year beside the media label; the empty state's example line
   card is marked by its caption ("Example · built from…"), only the example comps carry an Example tag.
8. **S4 cannot scroll 600 at 1920×1080** — the filled page scrolls 551 in all. The lock scrolls to
   min(600, max) and requires the panel's stick line to be passed, reporting both numbers.
9. **The mock's shell differs from `main`** (main wins, as G1 says): the mock has no beta strip (the app
   sits 42px lower on dev), a "Q" avatar for the hawk, no Calendar in the Tasks group, and a letter cover
   on the switcher.
10. **ContactRail is not a drop-in pattern for the mock's rail.** ContactRail sets a HEIGHT from its current
    top (it grows as the page scrolls); the mock caps the rail at the height it has when stuck and lets it
    hug. `PageRail` follows the mock through the same `railHeight` clamp, measured from the scroller's
    top, never `100vh`.
11. **"Revert" was already Firestore's.** At P4, C9's revert row passed: latency compensation rolls a
    refused write back by itself. What was missing was catching the rejection and saying so.
12. **`mastheadMatrix`'s and `illustratedMasthead`'s stale `/queries` rows throw first,** so the rows this
    run corrected there sit behind them, unproved *in those files*. The same claims are proved green in
    `pageHeaderV2` §2/§4 and `compsMat` S2/S6.

## 2 · G0 evidence and recon

- **G0.1** — `origin/main` contains 770881f and 1ba1154 (the page header v2 report); the tree was level
  with it; `src/`, `tests/`, `design-refs/` clean (other sessions' report PNGs were dirty and untouched).
- **G0.2** — `shellV3` + `pageHeaderV2` + `pageHeaderV1` at 770881f: **31 passed, 3 failed** (the three
  `pageHeaderV1` claims above). `workspacePageGrid.test.tsx` + `mastheadFormat.test.tsx`: **52 passed**.
  Both named stale items confirmed present.
- **G0.3** — all nine pack files verified against `SHA256SUMS.txt`; five refs committed and enrolled on
  the watchlist (29988a38); `page-anatomy.md` marked superseded, re-recorded, kept.
  `comps-tray-archivist.png` matches its stated hash.
- **Baseline gates** — tsc clean · `build:dev` clean · Vitest 498 files, 8,282 passed, 3 skipped.
- **Recon 3** — `normalizeComp`, `withCompAdded/Removed/Moved/Edited`, `MAX_COMPS`, `queryLine`,
  `compositionLine`, `compCounts`, `compFacets`, `compMedia`, the duplicate check, Undo toasts, `N` and
  Alt+↑/↓ all present as described.
- **Recon 4** — the Contact list mounts `PageHeader variant="full"` as row 1 of `.clv-group` inside
  `WorkspacePageGrid masthead={null}`; `ContactRail` is `position: sticky; top: 16px` with its height
  written from its own measured top through `railHeight`.
- **Recon 5** — confirmed: line 572 was `void updateManuscript(…)`. Write paths: the switch, reorder (drag
  and Alt), add, edit, remove, and each Undo; plus the Scout's add-to-list.
- **Recon 6** — `SCOUT_LIVE = false`. One call path: page → `ScoutPanel.send` → `fetchCompRun`
  (`lib/suggestComps.ts`) → the `suggestComps` callable (europe-west2), reachable only from the Pro
  state's send button.
- **Recon 7** — see §5.
- A latent fault in v3, fixed by the rebuild: `useRef(comps)` sat below `if (!currentUser) return null`.

## 3 · Per phase

| Commit | Phase | Locks added | Red before | Rendered after |
|---|---|---|---|---|
| 29988a38 | G0.3 refs | — | — | — |
| 783ac854 | P1 harness | `compsMat`: S1–S7, C1–C9; fixture seeder with `--dump` | all 25 red on 770881f, on their rows | — |
| 2fcc2d42 | P1 follow-up | four harness faults the first rendered run exposed | — | — |
| 37862880 | P2 frame, header, line | lib copy (`compsPage.test`), token agreement, census 3 → 4 | — | S1, S5, S6, S7, S2 core green; primary and rail red by design |
| 5746b775 | P3 library | C3 form rules (unit), wiring and smoke grow | — | C1, C2, C3, C4, C6, C8 green; S2 wholly green |
| 340bb57f | PageRail | `pageRail.test` | — | — |
| 30f8a291 | P4 rail | C5 (unit) | — | all S, C5, C6 green (19/19) |
| 19607b7b | P5 saves | C9 (unit) | C9 red at P4: no toast, unhandled rejection | C1–C4, C9 green |
| 9c39531a | P6 empty | C7 (unit) | C7 red at P5 on 7 rows | 25/25 |
| 8ade405f | P7 enrolment | `pageHeaderV2` comps §2 ×3, three-way §4.4 | — | `pageHeaderV2` green; no worse than `main` elsewhere |
| 95c650ca | P7 parity | — | — | 25/25; every part identical to the mock |
| dadd2924 | retirements | — | — | — |

**Mutations, in a measurement worktree, restored by copying a pristine tree — never by `git`.**
Rendered (each red on its own lock's rows): S1 white child → 2 rows · S2 compact variant → 8 · S3 panel
in row 1 → 4 · S4 `position: fixed` → 2 · S5 `padding: 0 0 110px` → 4 · S6 an art prop → 2 · S7 a
`.ws-pname` rule in the page's sheet → 1 · C1 sort the line by title → 2 · C2 reorder in state only → 3
· C3 no duplicate check → 2 · C4 Undo pushes → 2 · C5 ScoutPanel mounted → 2 · C6 "dated" past five years
→ 2 · C7 examples made live → 1 · C8 `N` bound inside fields → 1 · C9 failure swallowed → 1.
Unit: C1, C6, C9 (helper and page), C5, C7, C3, PageRail `fixed`, and an unstyled class for the wiring
guard — all nine red.

Two mutation runs needed correcting, and are recorded rather than hidden: C3 first went red by
*crashing* on a click (guarded to fail on its rows), and C7's first mutation stayed **green** because it
dropped only the cards' `example` mode while the wrapper stayed `inert` — the cards were still
unclickable. A mutation that actually made them live turned C7 red.

## 4 · App against mock, same ruler

Vertical numbers (*) are relative to the bar's bottom. The mock is always read with its sidebar
expanded, so collapsed rows differ horizontally by design.

| State | Width | Sidebar | Header h (app / mock) | Header top* | Main column l, w (app / mock) | First box top* | Panel l, top*, w, h (app / mock) |
|---|---|---|---|---|---|---|---|
| filled | 1280 | expanded | 265.4 / 265.4 | 18.0 / 18.0 | 289.0, 582.1 / 289.0, 582.1 | 307.4 / 307.4 | 899.0, 307.4, 340.0, 662.2 / 899.0, 307.4, 340.0, 704.0 |
| empty | 1280 | expanded | 291.5 / 291.5 | 18.0 / 18.0 | 289.0, 582.1 / 289.0, 582.1 | 333.5 / 333.5 | 899.0, 333.5, 340.0, 662.2 / 899.0, 333.5, 340.0, 704.0 |
| filled | 1280 | collapsed | 265.4 / 265.4 | 18.0 / 18.0 | 109.0, 762.1 / 289.0, 582.1 | 307.4 / 307.4 | 899.0, 307.4, 340.0, 662.2 / 899.0, 307.4, 340.0, 704.0 |
| empty | 1280 | collapsed | 291.5 / 291.5 | 18.0 / 18.0 | 109.0, 762.1 / 289.0, 582.1 | 333.5 / 333.5 | 899.0, 333.5, 340.0, 662.2 / 899.0, 333.5, 340.0, 704.0 |
| filled | 1440 | expanded | 271.4 / 271.4 | 18.0 / 18.0 | 294.1, 731.8 / 294.1, 731.8 | 313.4 / 313.4 | 1053.9, 313.4, 340.0, 762.2 / 1053.9, 313.4, 340.0, 785.7 |
| empty | 1440 | expanded | 297.5 / 297.5 | 18.0 / 18.0 | 294.1, 731.8 / 294.1, 731.8 | 339.5 / 339.5 | 1053.9, 339.5, 340.0, 762.2 / 1053.9, 339.5, 340.0, 785.7 |
| filled | 1440 | collapsed | 271.4 / 271.4 | 18.0 / 18.0 | 120.1, 899.8 / 294.1, 731.8 | 313.4 / 313.4 | 1047.9, 313.4, 340.0, 762.2 / 1053.9, 313.4, 340.0, 785.7 |
| empty | 1440 | collapsed | 297.5 / 297.5 | 18.0 / 18.0 | 120.1, 899.8 / 294.1, 731.8 | 339.5 / 339.5 | 1047.9, 339.5, 340.0, 762.2 / 1053.9, 339.5, 340.0, 785.7 |
| filled | 1920 | expanded | 271.4 / 271.4 | 18.0 / 18.0 | 456.0, 888.0 / 456.0, 888.0 | 313.4 / 313.4 | 1372.0, 313.4, 340.0, 785.7 / 1372.0, 313.4, 340.0, 785.7 |
| empty | 1920 | expanded | 297.5 / 297.5 | 18.0 / 18.0 | 456.0, 888.0 / 456.0, 888.0 | 339.5 / 339.5 | 1372.0, 339.5, 340.0, 785.7 / 1372.0, 339.5, 340.0, 785.7 |
| filled | 1920 | collapsed | 271.4 / 271.4 | 18.0 / 18.0 | 366.0, 888.0 / 456.0, 888.0 | 313.4 / 313.4 | 1282.0, 313.4, 340.0, 785.7 / 1372.0, 313.4, 340.0, 785.7 |
| empty | 1920 | collapsed | 297.5 / 297.5 | 18.0 / 18.0 | 366.0, 888.0 / 456.0, 888.0 | 339.5 / 339.5 | 1282.0, 339.5, 340.0, 785.7 / 1372.0, 339.5, 340.0, 785.7 |

Every expanded row matches to 0.1px in header height, header top, main column and first box. The
panel's height differs only by dev's 42px beta strip at 1280 (704 − 42) and 1440 (a clamp on both), and
by 4.9px of rail content at 1920 — closed in 95c650ca. A part-by-part probe after that commit (query
card, heading, fact, add button, cards, form, how-it-works, examples, tray, steps, suggestions) is
**identical at 1280, 1440 and 1920 in both states**; the one reported difference is the rail body at
1280, where the mock's `.rbody` is itself the clamped scroller and the app's scroller is `PageRail`'s.

## 5 · Retired or rewritten tests

- **Retired (unit):** `compsPhase2.test.ts`, `compsPhase3.test.ts` — 45 source-string cases over v3's markup.
- **Retired (rendered):** `comps21`, `comps21Overflow`, `compsReorder`, `compsScout`, `compsV2`,
  `compsV2Card`, `compsV3`, `compsV31` — manifest in `tests/e2e/RETIRED-comps-v2.md`.
- **Rewritten:** `compsPage.test.ts` (queryLine, composition, age, ordinal, spine), `compsWiring.test.ts`
  (the new sheet across six components), `compsScoutPanel.test.ts` (relocation, one path),
  `materialsPageSmoke.test.tsx` (comps block), `workspacePageGrid.test.tsx` (census + four repointed
  locks), `mastheadFormat.test.tsx` (FULL_PAGES), `manuscriptSummary.test.ts` (token agreement),
  `optedOut.ts`, `mastheadMatrix`, `illustratedMasthead`, `pageHeaderV2` + its lib.
- **New:** `compsMat.measure.ts` + lib + fixture seeder, `compsV2.test.tsx`, `pageRail.test.tsx`.

## 6 · Deferred, with owners

- **Comps hero art (D6)** — Nick, when the illustration exists; the route moves to `WITH_ART` then.
- **ContactRail and QcRail onto PageRail** — the next shell pass (Nick to schedule); the two differences
  to reconcile are in §1.10.
- **Eleven masthead-era censuses** list the page by `ct-wpg` (and the Query Centre and Contact list by
  their old classes) — the next census pass; named in the manifest.
- **The seven reds on `main` and `pageHeaderV1`'s three** — the page header follow-up.
- **`comps.css`** now serves only the unmounted `ScoutPanel` and marketing blocks; its v3 page rules are
  dead — a CSS sweep. `compsMarketing.tsx`, `compRole`/`compAge` stay unmounted as instructed.
- **Every comp write appends a MANUSCRIPT_UPDATED activity** (pre-existing; `updateManuscriptQuiet`
  exists for field maintenance) — Nick's call whether comps edits belong in the feed.
- **The packages run** (`cc-prompt-packages-v2.md`) — next; `PageRail`, `--mat-*` and `OPTED_OUT` are
  ready for it.
- **Dev deploy** — not done (no deploys this run); on request.
