# Submission packages v2.1: the run report (28 Sep, LIGHT profile)

- **Pack:** `cc-packages-v2-1.zip`. Every file matches `SHA256SUMS.txt`, and `00-shell-conformance.md` is byte-identical to the v2 run's copy.
- **Oracle:** `design-refs/materials/packages-v2-1.html`.
- **Worktree:** own detached worktree `ScriptAlly-pkg21`. Every commit was rebased on `origin/main` before its push.

## 1 · False premises

1. **V9 cannot see `.qad-pkg.on` "before any agent is chosen".**
   - `LogJourney` renders its "What you sent" step (the package cards) only inside `if (agent)`, so there is no `.qad-pkg` in the DOM before an agent is picked.
   - The written V9 picked an agent with no stated materials, so no guideline could match. It opened a package that isn't the used-for-new-queries one, so the selected card was exactly `req.packageId`.
   - V9 was then **dropped** (see 2).
2. **"Log a query with this" and V9 left this run (Nick, 28 Sep: "split by file").**
   - The card, including that button, belongs to the query-actions side's Part B.
   - The query-actions session relayed a ruling that the button stays with v2.1, and **the two instructions disagree**. I followed Nick's answer to me; that session agreed nobody builds it until he settles it.
   - V9 was written and proved red in commit 1 (`6e0d6b73`). The case can be recovered from there.
3. **Rename has an Undo in the mock, while the prompt says "no Undo".** The mock wins, so Rename gives "Renamed to {name}." with Undo, which writes the old name back.
4. **The Put away section is the mock's open list, not "today's collapsible header".** The mock draws a plain `Put away` header with a Restore on each row. The mock wins.
5. **A toggling Retired band holds a `span`, not the mock's `h2`.** A `<button>` may hold only phrasing content, and the mock's markup is invalid. The span wears the h2's look.
6. **Card order is v2's newest-first; the mock's is its data order.** Sorting is parked (E7), so I left it.

## 2 · G0 and recon

- **G0.**
  - `origin/main` was at `c4ed9ea8` and contained c4ed9ea, `c7cfa417`, `b82a2d6f` and `475b8482`.
  - No packages file had changed since `475b8482`.
  - The worktree was level with main.
- **Recon 2 (today's page).**
  - Header art: `PACKAGES_HERO` in `lib/packagesPage.ts`.
  - Tray: `PageRail tray`, with the `.sum` line and `BE_HAWK_HEAD`.
  - Headings: the `.ppv-sech` divs.
  - Retired: `.ppv-retired-h`.
  - Card actions: `PkgCard.tsx`.
  - Chips and the collapsible Put away: `PkgMaterials.tsx`.
- **Recon 3 (material writes; signatures confirmed, nothing added to `db.tsx`).**
  - `updateVersion(id, { versionName })`, `archiveVersion(id)` and `restoreVersion(id)` in `db.tsx`.
  - `renameBookVersion(existing, id, name, note)` in `lib/bookVersions.ts`, persisted with `updateManuscript(id, { bookVersions })`.
  - The saved text is `contentDraft`, with `fileName` / `contentLink`.
  - ✓ `BookVersion` has **no** retired field, so versions get no Put away.
- **Recon 4 (the drawer).**
  - `openQueryDrawer(req: OpenRequest)` is exported, and `OpenRequest` has `manuscriptId` and `packageId`.
  - `LogJourney` starts from `again?.pkg ?? req.packageId ?? "custom"` and marks `.qad-pkg.on[data-qad-pkg]`.
  - Read only.
- **Recon 5 (all retired, today).** The list rendered empty with a collapsed Retired heading beneath it: no composer, no card. Confirmed by V4 on the tip, which stops at the composer's missing Cancel.

## 3 · Phases

| # | Commit | What | Locks |
|---|---|---|---|
| 1 | `6e0d6b73` | References + `.refhashes.json` (v2 marked superseded), the `pkg21-` fixture, V1–V9 | all red at `c4ed9ea8` |
| 2 | `0a4253be` | Boxes header art · slim tray (title + pile) · anthracite bands · Nothing in use (E4) | V1–V4 green |
| 3 | *(this commit)* | Material ⋯ menu · read-only drawer · Rename (label only) · Put away | V5–V8 green |

**Red before, at `c4ed9ea8`:**

- V1: the art is `packages-hero-archivist.png`, at 1440 and 1920.
- V2: the tray reads "Materials3 letters · 2 synopses · 3 versions", is 150 tall, and has `BE_HAWK_HEAD`.
- V3–V8: each stops at the missing element it measures (bands, `[data-more]`, the nothing-in-use composer).

**Mutations** (in the measurement worktree, each restored and verified with `cmp`):

| Lock | Mutation | Result |
|---|---|---|
| V3 | Side by side rendered as the old plain heading | red at 1440 and 1280 |
| V4 | `noneLive` forced false (the v2 list-only page) | red on 7 rows (its clicks are guarded, so it fails its rows rather than crashing) |
| V5 | Put away offered on a version | red: `["open","rename","away"]` |

**Final run** (a `vite preview` of `build:dev`, final tree):

- V1–V8: 67 of 67 rows.
- `pkgMat` S1–S7 (once: 1440, expanded, filled) and P1–P9: all green.
- 19 of 19 cases in total.

**Gates at each commit:** tsc clean, `build:dev` clean, and the full Vitest run green.

## 4 · App against mock

The screenshots are in `shots/`:

- `app-` / `mock-` for `filled`, `retired` and `none` at 1440 and 1280;
- `menu`, `drawer` and `putaway` at 1440.

What matches: the art, the bands, the tray and pile, the ⋯ buttons, the nothing-in-use card and composer, the drawer's blush header, its text and Used in. The differences are the ones listed in 1: no Log button, and the card order.

## 5 · Retired or rewritten tests

- **`pkgMat.measure.ts` P7:** Side by side is read by `[data-ppv="band"][data-band="sbs"]`. It used `[data-ppv="sbs-h"]`, the old heading.
- **`pkgMat.measure.ts` P8:** the Retired check reads `[data-band="retired"]`. It used `[data-ppv="retired-toggle"]`.
- **`materialsBand.test.ts`, "a put-away material still has a way back":** now asserts the open `data-ppv="putaway"` section and its `restore-mat` button, where it asserted `putaway-toggle`. The law is unchanged.
- **Nothing else read the tray summary line, `BE_HAWK_HEAD` on this page, or the old "is filled in" copy.** Checked by grep across `src/` and `tests/e2e/`.

## 6 · Rebase notes (query-actions landed during the run)

| Commit | What | Touched packages files? |
|---|---|---|
| `949e8f25`, `9a63dce0` | To-do cleanup and its report | no |
| `ec25a192` | "Packages through the journey" Phase 1 contract doc | no |
| `5577a6fe` | Phase 2 query-side fields, rules and migration | no |

Every rebase was clean.

## 7 · Deploy

See the follow-up line in the commit log and the session report: this file is committed before the deploy, so it can't carry the deployed bundle name.

## 8 · Deferred, with owners

- **"Log a query with this" on the card, and V9.** Owner: whichever side Nick settles on (he ruled the query-actions Part B to me; they report he ruled v2.1 to them).
- **Package editions, locked sent versions, results tiles, "Reuse as new".** Owner: the query-actions Part B, rebased onto this.
- **If their edition model generates version names**, this run's Rename does not override them. A clash goes to Nick.
- **The drawer's log path never sets `firstSentAt`.** Owner: query-actions; they are adding the same write `setQueryPackage` makes.
- **Unchanged from v2 and still open:**
  - the stale `pkgw-wpg` census suites, `illustratedMasthead` §3.1 and `mastheadMatrix` §3.3 (Nick's census pass);
  - the unreachable packages libs and stylesheets (the next packages pass).
