# Manuscripts v13 — the dashboard shelf · run report (3 Oct)

Ref: `design-refs/manuscripts/manuscripts-v13.html` + `manuscripts-v13-geometry.json`. Both refs are
committed as supplied, match the pack's SHA256SUMS, and are hash-enrolled. `manuscripts-v12.html` is
kept and marked superseded. Profile LIGHT. Worktree `/private/tmp/sa-ms13`. Commits:

| Phase | Commit | What |
|---|---|---|
| 1 | `f84800d5` | refs, the `ms13-` fixture and seeder, M1–M8, shown red against the tip |
| 2–3 | `110e4a80` | the hero's facts row and Edit details; one column; the shelf; version tiles; Recent activity |
| 4 | this commit | the v12 suite folded in and retired by name, this report, the CLAUDE.md record |

No deploys. Every lock is green at the end: **21/21, 190 assertions** (floor 175).

---

## 1 · False premises, and where the mock and the text disagree

1. **`feedSentence.ts` does not exist.** The feed's sentence builder is `describeEvent` in
   `src/lib/dashFeed.ts`, with `feedPill` there and `eventShape` in `lib/feedConversation.ts`.
   Recent activity uses all three, so a row reads the same here as on the dashboard. I could not
   reuse `feedEntries`: it reads a 30-day window, and this card lists a book's own history.
2. **The bands are 52 tall, except Recent activity's, which is 56.125 — in the mock as well as here.**
   Its "Query Centre ›" link is a flex item, so it is blockified and its 5px padding counts. Built
   to the mock. M3 compares every band against the mock in the same browser rather than against a
   flat 52.
3. **There is no per-version word count.** `BookVersion` has no field for it and this pass adds no
   model fields. So the tile's line reads `SAVED 2 SEP 2026` without "· 50,000 words", and the New
   version dialog has no word count field. This is v12's rule, carried over.
4. **There is no per-version panel.** Clicking a tile opens `Msv12NewVersion` in **edit mode**, which
   renames the version and changes its note through `renameBookVersion`, the only edit the model
   permits.
5. **The Packages pill counts live packages (3 in the fixture), as the text says.** The mock draws 2
   beside three rows: its own fact line says "across 2 packages", so its pill counts packages that
   have been sent. I followed the text, because the Comps pill counts every comp, including the one
   not in the letter. **Nick's ruling wanted.**
6. **"The facts read in one row" only holds where the hero gives them room.** Keeping v12's desk
   hero (F5) leaves the facts a **459px** text column at 1440, against the mock's 591. So Status ·
   Current version / Setting · Series take two rows at 1440 and at 1280, and one row from roughly
   1535px. Matching the mock at 1440 would need the mock's hero tracks (280/168, gap 30) in place of
   v12's (360/200, gap 40), which F5 rules out.
7. **M2 at 1280: the mock wins.** The text says the first card is wider at both widths. The mock's
   `@media (max-width: 1360px)` makes the three columns equal, and the shelf at a 1280 viewport is
   inside that breakpoint. The lock asserts equal thirds at 1280.
8. **The New version dialog has no Kind field**, because the mock draws none. The first version is
   `initial` and every later one is `revision`.
9. **Some of the mock's activity rows have no record behind them.**
   - A version save is narrated as **"You updated a manuscript's details"**: every manuscript write
     produces `MANUSCRIPT_UPDATED`, and that record names no version. The mock's "Saved Fast-paced
     opening and made it current" cannot be produced, so the row shows the record's own words beside
     the rust square.
   - A comps-only write narrates nothing (Nick, 27 Sep), so no comp-change row can occur and no
     ochre square is drawn.
10. **The comps fact names a letter, which v12 deliberately refused to do.** `inQuery` is a bare flag
    tied to no particular letter. v13's text asks for "named in *{current letter name}*", so the fact
    names the **letter in use**: the same letter the Materials card rings, taken from the most
    recently sent query's package. Where no letter resolves, it says "your query letter".
    **Flagged for Nick.**
11. **Nothing else imported the retired components** — `CompsRail`, the four sections and `msv12Materials` — so they were deleted.

**Two faults already on main, found by measuring and fixed in `110e4a80`:**

- **The page had no gutter from 26 Sep.**
  - The shared column puts its gutter on `.wpg-scroll > *` as `padding-inline`.
  - `.msv12-root` is that element, and it declared `padding: 28px 0 120px` at equal specificity,
    later in the bundle.
  - Page header v1 P3 (`1866419c`, 26 Sep) moved the gutter into padding. From then on, the page ran
    from 248 to 1440 instead of from 294 to 1393.
  - Every card still agreed with the hero, so no comparison of the page with itself could see it.
  - Now the rule sets block padding only. M1 asserts the gutter, computed from the grid's own
    formula; mutating it back reads 0 against 46.08.
- **Both v12 dialogs had been unusable since the day they shipped (`13833845`, 25 Sep).**
  - `useOverlay` makes `#root` inert. Its comment says overlays portal out of it, but v12 rendered
    Edit details and New version inside the page.
  - A probe found every button under a `div[inert]`; Playwright clicks waited forever.
  - Both dialogs now portal to the body. The portal host carries `msv12-layer`, which declares the
    page's tokens: a portal leaves `.msv12-wpg`'s scope, and a `var()` outside its defining scope
    paints nothing.
  - A unit lock holds both halves. It is red against v12's dialog file.

## 2 · Recon

- **Starting state.** Level with `main`, a clean tree. Baseline at `da30cf1a`: tsc clean, build clean,
  Vitest 511 files / 8,237 passed / 3 skipped.

**Signatures read (shared and read-only; none changed):**
- `describeEvent(status: QueryStatus | null, who: string, msTitle: string, elapsedMs: number | null, activityType?: string, autoCloseArmed?: boolean): FeedSeg[] | null`.
  `FeedSeg = { t; em?; who? }`. Also `feedPill(a)`, `queriedTimes(activities)` and
  `trustedElapsed(anchor, eventAt, nowAt)`.
- `versionUsage(versionId, packages, queries): { versionId, counts: CountEntry[], total, packages }`.
  This is the one version edge: query → package → `bookVersionId`.
- `compLetterTally(comps) → { total, inLetter }`.
- `letterInUse(packages, queries) → id | null`.
- `materialsOf(msId, type, versions)`.
- `otherMaterialTiles(packages, queries) → { label, queries }[]`.
- `owedRequests(queries) → OwedRow[]`.
- `scopedManuscript(manuscripts, storedId)`.
- `renameBookVersion(existing, id, name, note)`, `appendBookVersion`, `newBookVersionId`, and
  `latestVersion` (the newest `createdDate`; on a tie, the later one in the list).
- `updateManuscript(id, fields)`. It stamps `statusChangedDate` when the status changes. It narrates
  `MANUSCRIPT_UPDATED` unless the write is exactly `{ comps }`. It throws on a denied write.
- `updateUserProfile(fields: Partial<User>)`. `name` is in the user update allowlist.
- `openQueryDrawer({ mode: "sent", queryId })`.
- `packagesUnlocked(user)`. `PACKAGES_OPEN_TO_ALL` is true.
- `AGE_CATEGORIES` (`lib/manuscripts`).
- `londonDay` (`lib/queryingGoals`).

- **The PkgBand question: no.** PkgBand's colours are `--ppv-*` tokens declared on `.ppv-page`, an
  ancestor this page does not have, so mounted here every one would resolve to nothing. I built
  **`MsCard`** (with `BandLink`) in `v12/Msv13Shelf.tsx` instead. It is a **merge candidate** for the
  packages and comps redesign. `PkgBand` and `packagesV2.css` are untouched.
- **The shelf's breakpoints, measured.**
  - The mock's 1360 and 1180 are viewport queries, written for a frame whose sidebar never collapses.
    Here they are **container queries on the shelf's own width**.
  - Measured: **1025.0** at 1360 against **1025.9** at 1361, and **856.5** at 1180 against **857.4**
    at 1181.
  - The thresholds (**1025.4 / 856.9**) sit between each pair. The first estimate, 856, left 1180
    three-up.

## 3 · Per phase

### Phase 1 — `f84800d5`

The locks are in `tests/e2e/manuscriptsV13.measure.ts`. The fixture is two dedicated accounts,
`ms13-filled@` and `ms13-empty@`, which the seeder wipes and rewrites whole. The filled account holds
two books. The second book's record is the **newest** on the account, so a page that forgot to scope
its activity would lead with it.

The red run against `da30cf1a` ran every case with none skipped: **11 failed**. Each failed for the
right reason:

| Lock | Failure |
|---|---|
| M1 (both widths) | "a rail is still in the DOM" |
| M2 (both widths) | "three shelf cards" |
| M3 | "five containers" |
| M4 | the comps card is absent |
| M5 | the versions card is absent |
| M6 | the activity card is absent |
| M7 | "the button sits below the facts" — it sat at the top right |
| M8 | "hero, owed list and shelf all render" — the shelf is absent |
| floor | 0 < 70 |

The suite does not use serial mode. Instead, each account signs in once per port and the session is
saved with `indexedDB: true`. A red lock therefore restarts its worker without a second password
sign-in, and the next lock still runs.

### Phases 2–3 — `110e4a80`

- **Gates:** tsc clean; `build:dev` clean, with no CSS diagnostics in the full log; Vitest
  512 files / 8,257 passed / 3 skipped.
- **Locks:** M1–M8 all green.
- **Locks amended in this commit:**
  - M1 gained the gutter claim.
  - M3 compares each band with the mock (see §1, item 2).
  - M8 waits for `.qad-root.is-open` before pressing Escape. The drawer mounts off-screen, which
    Playwright counts as visible, but its Escape listener only attaches once it has opened. A key
    pressed in between does nothing, so the first run read that as "Escape doesn't close the drawer".
- The seeder marks the dashboard tour finished: the tour's scrim covered every page.

**Mutations.** Each ran in a separate measurement worktree (`/private/tmp/sa-ms13-mut` at
`110e4a80`) against a rebuilt bundle. Each file was backed up under a name derived from its path,
restored afterwards, and checked with `cmp` against `git show HEAD:<path>`: identical every time.
The worktree was clean at the end.

| Lock | Mutation | Result |
|---|---|---|
| **M2** | `.msv13-shelf` first track `1.1fr` → `1fr` | **red @1440**: "the first card is wider"; @1280 stays green, where the mock's own thirds apply |
| **M3** | Versions rendered as a plain `<section>` + `<h2>` instead of `MsCard` | **red**: "versions has the band" |
| **M5** | every tile ringed (base `.msv13-vtile` shadow at 1.5px rust) | **red**: "exactly one ringed". It fails before the save step, so nothing is written |
| **M6** | `onThisBook = i.activities` (the `manuscriptId` filter dropped) | **red**: "the seven newest on this book, in order" |
| M1 (added) | `.msv12-root` back to `padding: 28px 0 120px` | **red at both widths**: "the shared gutter applies on the left (0 vs 46.08)" / "(0 vs 40.96)" |
| unit | the five new dialog cases run against v12's `Msv12EditDetails.tsx` (`f84800d5`) | **all five red**: the fields, the new-version fields, the author-name write order, the portal, and the London day |

**Shell check (shellV3) on `/manuscripts`, once, at 1440 expanded:**
- The matrix case wrote 208 ledger rows, **36 of them on Manuscripts** (L1 1 · L2 7 · L3 3 · L4 3 ·
  L5 2 · L6 3 · L7 4 · L8 12 · L9 1), with **0 failed** anywhere.
- L6, the palette opener, wrote 3 Manuscripts rows, 0 failed.
- L10 (themes) and L12 (surfaces) ran green but have no Manuscripts subject.
- L11 (the settings save failure) and L13 (the Contact list title against the Query Centre's) are
  not about this route.

### Phase 4 — this commit

- **The v12 suite.** `manuscriptsV12.measure.ts` is deleted, with its fixture and seeder (their only
  reader). The hero locks that still hold now live in the v13 file. The rest are retired by name; see §5.
- **Assertion floor.** 190 assertions; the floor is 175.
- **Enrolment.** Unchanged: `masthead={null}`, and `OPTED_OUT` still lists Manuscripts. Its count of
  7 is held by `workspacePageGrid.test.tsx`, which is green.
- **Census.** No census names the rail. The selector sweep found one reader, the v12 suite itself.

## 4 · The app against the mock

The figures below are measured by one ruler in one browser (the "geometry vs mock" case), shown as
`[x, y, w, h]`. The page column matches the mock **to a tenth of a pixel** in x and width at both
widths. The hero is v12's (F5); at 1440 it is 77px taller, which moves every y below it.

| @1440 | app | mock |
|---|---|---|
| hero | 294.1, 133.8, 1099.8, 428.6 | 294.1, 70, 1099.8, 352 |
| shelf | 294.1, 731.9, 1099.8, 260.4 | 294.1, 448, 1099.8, 260.4 |
| first shelf card | 294.1, …, 378.9, 260.4 | 294.1, …, 378.9, 260.4 |
| band | …, 378.9, 52.1 | …, 378.9, 52.1 |
| versions | 294.1, …, 1099.8, 261.9 | 294.1, …, 1099.8, 261.9 |
| version tile | 314.1, …, 256, 175.9 | 314.1, …, 256, 175.9 |
| New version tile | 1118, …, 256, 175.9 | 1118, …, 256, 175.9 |
| activity | 294.1, …, 1099.8, 488.3 | 294.1, …, 1099.8, 495.8 |
| Edit details | 694.1, …, 108.5, 34 | 604.1, …, 108.5, 34 |

| @1280 | app | mock |
|---|---|---|
| shelf | 289, …, 950.1, 282.7 | 289, …, 950.1, 282.7 |
| first shelf card | 289, …, 306, 282.7 (equal thirds) | 289, …, 306, 282.7 |
| versions | 289, …, 950.1, 404.3 | 289, …, 950.1, 404.3 |
| version tile | 309, …, 295.4, 156.3 | 309, …, 295.4, 156.3 |
| activity | 289, …, 950.1, 488.3 | 289, …, 950.1, 495.8 |

**Differences, all accounted for:**
- **Hero height and the Edit details x.** v12's desk hero (360/200 tracks against the mock's 280/168, F5).
- **Activity height, −7.5px.** The rows hold the feed's own sentences, not the mock's samples.
- **The Packages pill.** 3 here against the mock's 2 (§1, item 5).
- **"More manuscripts: coming soon" is hidden.** The fixture account holds two books, and v12's rule
  shows the tag only at one or none.
- **The status mark.** Mine is a StatusDot ring; the mock draws a stand-in half dot.

**The empty state** is v12's, unchanged (F8), and matches v12's empty mock section for section. The
one difference is that it now sits in the shared column: x 294 at 1440, where v12's own frame put
it at 264. Before the gutter fix it sat at 248.

Screenshots in this folder:
- `app-1440.png` / `mock-1440.png`
- `app-1280.png` / `mock-1280.png`
- `app-empty-1440.png` / `app-empty-1280.png` / `mock12-empty-1440.png`
- `edit-details-1440.png`

## 5 · Retired or rewritten tests

**E2E — `manuscriptsV12.measure.ts`** (full table in `tests/e2e/RETIRED-manuscripts-v13.md`):

| Disposition | Cases |
|---|---|
| Kept | L2, L5 (its population now includes the tiles and the activity rows), L6 (on `ms13-empty@`), L11 |
| Rewritten | **L1** — the cover now meets the column's right edge, not the rail's; runs at 1440 and 1280. **L9** — "Standalone" for series; "Not recorded" + Add shown on the second book, where both Add buttons open their dialogs |
| Folded in | **L3 → M5**, **L4 → M8** |
| Retired | **L7** (no reachable Pro teaser; `PACKAGES_OPEN_TO_ALL`), **L8** (no tray on the filled page), **L10** (no rail), the rail half of the geometry cases |
| Replaced | the mock render, by "geometry vs mock" |

**Fixture.** `msv12Fixture.mjs` and `seedManuscriptsV12.mjs` are deleted.

**Unit — `msv12Smoke.test.tsx`:**
- **Rewritten:**
  - "filled: the hero states the seeded book" asserted the rail. It now asserts there is no rail,
    that the five cards each sit under their band, and that Edit details sits under the facts.
  - "L9 · an unset series is 'Not recorded'…" is now "an unset series reads 'Standalone'…". The
    setting keeps "Not recorded".
- **Added:** five dialog cases, covering the nine fields, the new-version fields, the author-name
  write order, the portal plus the token host, and the London day.
- **Kept:** the L4 source halves, the L5, L6 and L11 halves, and the one-write and rules-pairing locks.

**Elsewhere:**
- **New:** `src/lib/manuscriptShelf.test.ts`, 16 cases. Each builds its inputs in an order that
  matches none of the orders under test.
- **Repointed:** a comment in `manuscriptSummary.test.ts` that named the deleted suite. No assertion
  changed.

## 6 · Deferred, each with an owner

| Item | Owner |
|---|---|
| **The hero title renders Playfair, not Special Elite.** brand.tsx's forced `h1` outranks `.msv12-title`'s single class. It has done so since v12 shipped, on both the filled and the empty hero. One selector fixes it (`.msv12-hero .msv12-title`). Not done, because F5 keeps the hero as it is | Nick |
| The facts in one row at 1440 need the mock's hero tracks (§1, item 6) | Nick (F5) |
| The Packages pill: live packages or packages sent (§1, item 5) | Nick |
| The comps fact names the letter in use, although `inQuery` is tied to no particular letter (§1, item 10) | Nick |
| A version-save activity row ("Saved X and made it current") needs a record that names the version: a field on the `MANUSCRIPT_UPDATED` write in `db.tsx`, which is shared, or a new event | Nick / a future pass |
| A per-version word count and a per-version panel (the mock's tile click) | Nick (model and product) |
| Author name is the account's name: there is no pen-name field, so editing it here renames the account everywhere | Nick |
| Nudge rows draw no mark: StatusDot has no nudge glyph, and a mark would claim a status | Nick (design) |
| Merge `MsCard` and `PkgBand` | the next packages / comps pass |
| **The `useOverlay` portal contract is a comment for every other caller.** `HousekeepingSweep` (the To-do page) calls it and renders inline inside `ToDoPage`, so it is probably inert when open — the same fault. Not verified and not touched; filed as a separate task with a general lock | To-do owner (task chip) |
| Narrow widths (below ~1100) were not measured (profile LIGHT) | next pass |
| The dev accounts `msv12-pro@` and `msv12-empty@` still hold v12 fixture data that nothing reads | Nick (optional) |
| Deploy hosting to dev (v13 changes no rules) | Nick |
