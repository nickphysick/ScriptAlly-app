# Living page headers, and the empty state that exhibits the page — report

Ref: `design-refs/page-header/living-headers-v2.html`, SHA256 `f0976dfc…a52c5a266`, verified and enrolled in `design-refs/.refhashes.json`.
Branch `living-headers`, worktree `/private/tmp/sa-lh`. **No deploys.**

## False premises and ref-over-text differences (read these first)
1. **The ref moves the buttons and the art on the empty page; the brief says "the same boxes".** Measured in the ref at 1440: on State Empty the buttons sit **19.1px higher** (254 vs 273.1) and the art **9.1px higher** (52 vs 61.1), because the 29px heading is shorter than the title. The ref wins.
   - LH5 asserts the same **x and size**.
   - It also asserts the ref's **spacing**, measured at each width: heading under eyebrow 23 · subline under heading 14 · buttons under subline 22 · art 26 below the content box.
2. **The ref's art (286 tall) rises 40px above its header, into room our page does not have.** Our header sits 18px under the bar, and `.ws-window` clips, so at 286 the Contact list's hawk lost the top 14px of its quill.
   - The brief also says "never cropped", and the two cannot both hold.
   - The art box is capped at **264px**, the room under the smallest frame (206 + 26 + 14 + 18). It is contained, never cropped, and it is a constant in both states.
   - Its width is the ref's exactly (46%).
3. **"you haven't queried her yet" reads "them".** The app never guesses an agent's pronoun (CLAUDE.md).
4. **The ref's Contact "many" subline carries counts** ("13 queried, and 3 still to go. 46 details are missing"). §7's baked decision (no count in the subline) was followed: the Contact list takes the pressing sentence.
5. **Eyebrow → title is the ref's 23, not page-header v2's 24.** The top pad is 14, not 26. The ref wins. `pageHeaderV2`'s locks are retargeted for the two living pages only.
6. **The ref's exhibition draws tiles and a rail the Contact page does not have** ("Details missing", "Who owes you"). §4 says the page's *own* components, so the band shows the real count cards and the real Housekeeping rail.
7. **The ref's `.pg` reads `var(--rgap)`, which it never defines**, so its column gap is 0. The band uses the page's own 28px.
8. **QcRail and ContactRail measure the window and pin themselves.** Mounting either in a picture would be the page's behaviour, not a picture of it. So the Birds-eye view and Housekeeping sit in a static rail box inside the band.
9. **Reduced motion is instant, not a fade.** The shell's reduced-motion rule (`.ws-app *` at 0.01ms `!important`) already governs every animation in the app. A fade-only override would fight it.
10. **The empty state needs the pages wired**, so each page's opt-in happened in C3 (empty) and C1–C2 (living), not all in C5.

## §0 — the baseline, measured before any edit
The hero's shape before this pass was identical on both pages, 1440×900:

| Part | Before |
|---|---|
| Padding | 26 top and bottom |
| `min-height` | 232 |
| Rule | 1px `rgba(28,19,15,.16)` |
| Frame min-height | 180 |
| Text block | ≤ 55% |
| h1 | Special Elite 56px (50 at 1280), line-height = size, `nowrap` |
| Intro | 18/26.1, max 460, `min-height: 0`, margin-top 14 |
| Actions | margin-top 22, buttons 48 tall |
| Art | 48% × 276, right 0, bottom −26 |

Left edges (eyebrow = h1 = intro = actions = first tile = first row):

| Width | Left x |
|---|---|
| 1280 | 289 |
| 1440 | 294.1 |
| 1512 | 296.4 |
| 1920 | 456 |

**Hero right = rail right:** 1239 / 1393.9 / 1463.6 / 1712 at those four widths.

**Gates before any edit:** tsc 0 · Vitest **8,233 passed | 3 skipped** · build clean.

## Commits

| Commit | What it did |
|---|---|
| `04cf479b` C1 | `PageHeader` takes `living={{count, copy, empty?}}`: the fixed shape, and empty lines while `count` is null. |
| `1cecd861` C2 | `lib/livingHeaders.ts` holds the two copy functions and the pressing sentence. They are built only from `buildQcRows`, `replyTaskFor` and `lib/dates`. 19 cases (LH9). |
| `efae446f` C3 | The empty page on both routes (`QcEmpty`, `ContactEmpty`), and the Contact list's living header. Retired: `QueryEmptyFeatures` and `ContactListEmptyState` with their sheets, tests and orphaned tokens. Six locks retargeted, each stating its law. |
| `be1fc527` C4 | The exhibitions (`QcExhibit`, `ContactExhibit`, `LivingExhibition`) over sample constants run through the pages' real derivations at a fixed clock. LH6 unit lock, source and render halves. |
| `21bbab0e` C5 | `src/components/shell/LIVING_HEADERS.md`; two measured fixes (below); zero on a populated account reads "No queries out". |
| (this) C6 | Rendered locks LH1–LH8 (`tests/e2e/livingHeaders.measure.ts`), `pageHeaderV2` retargets, screenshots, this report. |

**Found by measurement and fixed in C5:**
- **The Contact list's headline and subline were rendering in Source Sans 3** inside a Special Elite h1. brand.tsx names bare spans as the body sans, and the Query Centre escaped only because `.qcv-own` resets spans. The title box measured 61.3 against the ref's 55.9. `.ph-live` / `.ph-swap` now take their parent's face.
- **The cropped hawk** (item 2 above).

## Gates

| Gate | Baseline | After (C5, C6 is test-only) |
|---|---|---|
| tsc | 0 | 0 |
| Vitest | 8,233 passed \| 3 skipped | **8,195 passed \| 3 skipped** (507 files) |
| Production build | clean | clean |

The Vitest count falls by 38 and it is accounted for:
- +19 LH9;
- +5 empty-page render;
- +4 LH6 render;
- +2 LH6 source;
- +1 zero-copy case;
- minus the retired feature pages' own suites.

**Production bundle:** `__SA_LH_COUNT` appears in **0** production files (it is in the dev bundle).

## Red-first evidence (each lock under its brief's mutation)
Every mutation was run in the measurement worktree, restored from a path-derived backup, and rebuilt. Logs are in `ledgers/run-LH*.log`.

| Lock | Mutation | Red reading |
|---|---|---|
| LH1 | drop the subline's `min-height` | 14 box failures, e.g. `/queries 1280 acts [0,148.2] vs [0,174.3]` |
| LH2 | a flat 56px headline | `"148 queries out" scroll 450 client 437` at 1280 |
| LH3 | re-centre the text block | lefts `545.5 … 289` at 1280, all four widths × both pages |
| LH4 | art `src` varies by count | `1 vs 27 — diff at 691`, all four widths on /queries |
| LH5 | render the populated hero at 0 | `living empty h1 [0,36.3,437,49.7] h2 null` + the three spacing rows `absent` |
| LH6 (unit) | import `useScriptAllyDb` into QcExhibit | `QcExhibit.tsx reaches data: /useScriptAllyDb/` |
| LH6 (unit) | one ledger row pointed at a live record | `['Rachel Lin', …] ≠ ['Fenella Stroud', …]` |
| LH6 (rendered) | first row from the live store | `stray ["Tom Ellery"]` |
| LH7 | key the empty state off visible rows | `/agents find-empty — living empty "" rule 0` |
| LH8 | count 0 while loading | `["No queries out","83 queries out"]` (a second headline flashed) |
| LH9 | a date around the formatter (`toLocaleDateString`) | "Sat 26 Sept", 5 failures |

LH5 first went red by **crashing** (a null dereference). Its reads were guarded so an absent heading records as a failure, and it was re-proved.

## Rendered results (all green after the retargets)
- `livingHeaders.measure.ts`: 4 cases.
  - lh-shape covers 1280/1440/1512/1920 × both pages: LH0–LH5, with 80 reads against a floor of 80.
  - lh-exhibit, lh-filtered and lh-flash make up the rest.
- `pageHeaderV2`, `quietBar` and `contactV11`: **53 passed.**

**Retargets in `pageHeaderV2`:**
- The living pair takes the ref's eyebrow +14, title +23 and clamped size.
- The v5-mock height applies to the v2 pages only.
- §4.4 still holds the header's top on all four pages; eyebrow and title are compared within each pair. On the two living pages the eyebrow and title sit 12px higher than on Comparable titles and Packages. That is a consequence to know about, not a fault.

**⚠️ Red on `main` before this pass, identical messages on an unmodified build of `bebf63a0`, not touched** (all `qcV65`):
- top bar "Give feedback is anthracite" (reads transparent);
- head and control row / loading ("`head-cta` not found": the page-header pass retired it);
- the rail's right edge 46.1 off the group;
- the expanded view's right 1440 vs 1393.9.

## Pages
- **Opted in:** the Query Centre (`/queries`) and the Contact list (`/agents`).
- **Untouched:** Comparable titles, Submission packages, every compact page, the Dashboard, Settings, and Manuscripts (out of scope). How a page adopts the pattern: `src/components/shell/LIVING_HEADERS.md`.

## Screenshots (`shots/`)
- **At 1440:** `qc-1440-{empty,one,many}.png` and `contact-1440-{empty,one,many}.png`.
- **The hero at the longest count** ("148 …", one line): `{qc,contact}-{1280,1920}-hero-148.png`.
- **Counts are driven by the dev aid, which changes the count only.** The harness account holds 83 queries and 37 agents. So "one" shows the one-headline over the account's real pressing sentence, not a one-query account's sentence. The single-item branches are covered by LH9.

## Standing, not done in this pass
- **The `.qcc-plain` rule in `queryCentreGrid.css` has no emitter** now that the empty page is unwrapped. It is left for the CSS pass with the retired toolbar's rules.
- **The "No queries out" branch cannot be reached today:** the scope menu lists only books that have queries.
- **The Contact empty state's Discover line** pluralises a small set of counted genres (thriller, mystery, western, memoir) and lowercases the rest.
