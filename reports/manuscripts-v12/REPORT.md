# Manuscripts v1 (the v12 mock) — run report

Build prompt: `cc-manuscripts-v1` (25 Sep). Mock: `design-refs/manuscripts/manuscripts-v12.html`,
hash-verified against the prompt's three SHA256s and enrolled in `.refhashes.json`. The mock is
the oracle; where this report says "deviation", the difference is deliberate and the reason is
beside it.

## 1 · False premises in the prompt (found before building)

1. **"Packages never reference a version directly" is the RETIRED model.** Part F moved the edge:
   `SubmissionPackage.bookVersionId` is the canonical package→version reference, and
   `lib/bookVersions.ts` documents the move in its own words ("THE AGGREGATION IS PACKAGE → QUERY
   NOW… the front hop is gone"). The prompt's Phase-2 rule ("package count = packages whose sample
   material points to that version") describes the sample-hop the app deleted. Built to the app's
   edge: query → `packageId` → the package's own `bookVersionId`. L3's substance (never fold
   unattributed queries into a version) is unchanged and locked on both halves.
2. **"Sample pages" is no longer a material type**, which the prompt half-knows (D4 says the
   sample is cut from a version) — but Step 0's inventory item "the sample material or version
   each one points to" has no per-query field: the version rides the package (above) and, on a
   send, `Activity.bookVersionId`.
3. **The mock's Free teaser states "£4.99 a month".** The product has no confirmed Pro price —
   `PRICING_TIERS.pro.price === "Price to be confirmed"` is LOCKED (`planComparison.test.ts`), and
   the marketing smoke sweeps rendered pages for any currency amount. The teaser button here says
   "See Pro" and routes to `/plans`; the price stays unstated everywhere until Nick sets the three
   constants. Same class as the pricing ref's invented £7/mo, recorded in CLAUDE.md.
4. **"Two other materials" cannot be seeded and the Other tiles cannot be drawn as specified** —
   there is no standalone other-material entity anywhere in the model. The app's "Other" is a
   package's own free-text line (`SubmissionPackage.otherMaterials`, deliberately NOT a fourth
   slot — its docstring says so). See Deviations for what the section renders instead.
5. **`note?` on a version already exists** (`BookVersion.note`), as do `CompTitle.publisher` and
   the named-in-letter flag (`CompTitle.inQuery`). Phase 2 added only what Step 0 found missing:
   `Manuscript.setting?` and `Manuscript.series?`.
6. **L10's number and the mock disagree.** The mock's rail is `position: sticky; top: 0`; the lock
   demands window-top + 28. The lock's value is built (top: 28px) and the mock difference is
   recorded here.
7. **The prompt's token names are the mock's, not the app's.** The values all exist:
   `--sp-anthracite`/`--qcv-navy` = #2a3a52, `--be-accent` = #e9c9b8, `--qcv-parchment` etc., and
   the five status fills are `--state-queried/-you/-agent/-offer/-closed` at `:root` (f12.css) —
   the mock's `--s-*` values match all five exactly. Rust existed only as five per-sheet copies;
   `--o-ms`/`--o-pkg` now sit at `:root` per the prompt.

## 2 · Step 0 findings

1. **Current page**: `/manuscripts` rendered `AllManuscripts` (App.tsx:785). It is locked; the new
   `src/components/manuscripts/v12/ManuscriptPage.tsx` now takes the route; `AllManuscripts.tsx`
   is untouched and unrouted (its direct-render suites still pass).
2. **Fonts**: Special Elite, Source Serif 4 and JetBrains Mono are all loaded (index.html; the
   marketing tier and dashboard already use the first two). Tokens: see false premise 7. ✓
3. **Object colours**: rust #8a4a3c existed as five per-sheet copies, ochre #9a7233 nowhere. Added
   once at `:root` as `--o-ms`/`--o-pkg` + JS mirrors `oMs`/`oPkg` in designTokens.ts, agreement
   locked in `manuscriptSummary.test.ts`.
4. **Data model inventory** (types.ts at 49070a24):
   - Manuscript: title/genre/subGenres/ageCategory/wordCount/logline ✓ · `elevatorPitch?`,
     `backCoverBlurb?`, `synopsis?` ✓ · `comps: CompTitle[]` ✓ (title/author/publisher?/year?/
     note?/media?/matchAxis?/`inQuery?`/source/verification) · `bookVersions?: BookVersion[]`
     (id/name/kind/createdDate/note?/fromActivityId?) · **no `author`/pen-name field anywhere**
     (the byline uses `User.name`; gap reported) · `setting`/`series` ADDED (additive, optional).
   - `users/{uid}/versions` (ManuscriptVersion): componentType/versionName/createdDate/notes?/
     wordCount?/bookVersionId? (sample-pages only, via `bookVersionOf`)/status? (Active|Retired).
   - Query: packageId ✓ · partial/fullRequestedDate ✓ · materialsRequestedType/Quantity ✓ (the
     owed row's "the first 50 pages") · sends dated by partial/fullSentDate + `Activity.bookVersionId`.
   - SubmissionPackage: packageName ✓ · three slots ("" = unfilled) ✓ · `bookVersionId?` (the
     edge) ✓ · `otherMaterials?` free text ✓ · recipients derived from queries (no stored list).
   - Plan flag: `User.plan === UserPlan.PRO` (`isProUser` precedent in lib/suggestComps).
5. **Existing flows reused**: create manuscript = the App-level `AddManuscriptFocusForm`
   interception (`onNavigate("manuscripts", "Add a manuscript")`); materials = `MaterialModal` +
   `materialDraft.createPayload` + `db.addVersion` (the packages page's own `saveMaterial` steps);
   book versions = `lib/bookVersions`' writers (`newBookVersionId`/`appendBookVersion`) through
   `updateManuscript`; send partial/full = `TaskModal` + `DashTaskCommit` + `useTaskCommit`, the
   dashboard's own host machinery on the query's own BOARD CARD. Edit details: the old dialog's
   JSX lives INSIDE the locked `AllManuscripts.tsx` and cannot be imported, so the page mounts its
   own dialog over the same single writer (`updateManuscript`) with the same field set, extended
   by setting/series.
6. **Harness**: Playwright renders both the mock (file://) and the app at 1280×800 and 1920×1080
   with fonts; `manuscriptsV12.measure.ts` measures both by one ruler.

### The rules window (for Nick — one line, when convenient)

`setting`/`series` are accepted on CREATE (isValidManuscript has no trailing hasOnly) and denied
on UPDATE until the manuscript-update allowlist gains them. The edit dialog therefore writes them
as a SEPARATE second write and reports a denial in the dialog rather than letting the base save
fail. Draft for `firestore.rules` (the update allowlist, ~line 765) — **not applied; the file is
on the prompt's do-not-touch list**:

```
'title', 'genre', …, 'elevatorPitch', 'synopsis',
// Manuscripts v12 — the hero's two facts; optional-when-present, cleared by omitting the key
'setting', 'series'
```

plus the optional-when-present clauses in `isValidManuscript`:

```
&& (!data.keys().hasAny(['setting']) || (data.setting is string && data.setting.size() <= 512))
&& (!data.keys().hasAny(['series'])  || (data.series  is string && data.series.size()  <= 512))
```

## 3 · The fixture and its accounts

`firestore.rules` denies any client changing its own `plan` (`incoming().plan == existing().plan`
— a billing event belongs to a server), so a Free/Pro fixture cannot be flipped in place and the
shared harness account was left alone entirely. `seedManuscriptsV12.mjs` owns two accounts:
`msv12-pro@scriptally.test` (the filled fixture — manuscript "Harbour of Glass", 3 book versions,
3 letters, 2 synopses, 3 packages (one versionless), 8 queries across Queried / Partial Requested
/ Full Requested / Full Sent / Rejected / No Response, 6 agents, 3 comps) and
`msv12-empty@scriptally.test` (nothing). A plan "flip" recreates the owned account's user doc with
the plan wanted, which is the one legal route. Each account seeds on its own Firebase app
instance — one connection serving two sign-ins retries in-flight streams under the wrong token,
which presented as PERMISSION_DENIED on writes whose shapes probed valid.

The seeder's read-back proves `setting` landed ("West Cork, today" ACCEPTED); `series` is
deliberately absent (L9's subject).

## 4 · Phases (commits on `main`)

| Phase | Commit | What landed |
|---|---|---|
| Step 0 | 3f7f45f8 | The three refs, byte-exact, enrolled in the hash manifest |
| Phase 1 | 86f53c48 | Fixture module, two-account seeder, the eleven locks — proven red against a main-equivalent build (".msv12-wpg found 0", serial fail-fast) |
| Phase 2 | 49070a24 | `setting?`/`series?` (additive), `--o-ms`/`--o-pkg` at :root + JS mirrors, `lib/manuscriptSummary.ts` + 21 unit cases; the one-edge lock proved red by a fold mutation (2 tests red), restored |
| Phases 3–6 | 13833845 | The page, whole — see §5 (19 files, 1,963 insertions) |
| Phase 7 | (this commit) | The definitive run, the mock side-by-side, the mutation table, the neighbour-suite sweep, this report |

**Deviation from the prompt's commit cadence, and why:** phases 3–6 landed as ONE commit. The
build FOLLOWED the phase order (route+grid+hero, then empty, then the column, then the rail), but
this repo is direct-to-main and deployable from any commit — a commit whose routed page renders
half its sections is a broken intermediate, and holding the route repoint back to the last phase
would have made phases 3–5 commits of dead code. The locks partition the phases' acceptance
regardless (L1/L2/L9 = P3, L6 = P4, L3/L4/L5/L7/L11 = P5, L8 = P6).

## 5 · What the page is

*(structure, decisions and deviations — see §6 for the full deviation list)*

- `ManuscriptPage` renders `WorkspacePageGrid` with `masthead={null}` — the page joins the
  OPTED-OUT register ("Query Centre", "Contact list", "Manuscripts") in BOTH homes
  (`tests/e2e/optedOut.ts`, `workspacePageGrid.test.tsx`), per the register's own law: a page opts
  out everywhere at once. The hero is the head.
- The scoped manuscript is the shell's own `scriptally_active_manuscript_id` (or the route's
  `openId`), resolved by `scopedManuscript` — stored-if-valid, else most recently moved. D1
  stands: one manuscript, and "More manuscripts: coming soon" renders ONLY while the account
  holds ≤ 1 (copy asserts what the code does; a writer with three books beside a live switcher
  must not read "coming soon").
- Owed rows open `TaskModal` on the query's own BOARD CARD (`assembleBoardColumns`, live +
  snoozed), commit through `DashTaskCommit` → `useTaskCommit` — the app's one writing path, with
  the duplicate-send guard's banner riding `warn` exactly as the dashboard's host does. No card on
  the board → the button routes to the Query Centre; no card is ever hand-built.
- Sections derive everything through `lib/manuscriptSummary` (pure): version usage by the package
  edge, letter-in-use from the latest send, per-material query counts by slot, owed asks in the
  record's own quantities, packages-in-use, other-material tiles, comp tallies.

## 6 · Deviations from the mock (each deliberate)

1. **No price in the Free teaser** — "See Pro", not "See Pro, £4.99 a month" (false premise 3).
2. **"pins {version}"** on an owed row: a REQUEST records no version; the nearest true fact is the
   version the query's package states (what a send from it would carry), so the clause renders
   from `package.bookVersionId` and is OMITTED where the package states none. The prompt asked for
   omission + a report; this is the report.
3. **The tray sentence names no letter** — "2 of 3 are named in your query letter", not "…in query
   letter v3": `inQuery` is a bare flag bound to no letter (the prompt anticipated this).
4. **Version rows carry no word count** — a `BookVersion` stores none, and restating the
   manuscript's count per version would claim per-version figures nobody recorded. "Saved {date}"
   stands alone. (The mock draws 50,000/53,200/58,900.)
5. **Other materials** — tiles derive from the writer's own `otherMaterials` package lines
   (deduplicated, with query counts); no word counts, no dates. The "Add other material" tile is
   `aria-disabled` with a tooltip, because no flow exists to create a standalone other material
   (false premise 4). Proposed owner: a product decision (fourth slot vs. entity) before any UI.
6. **Count clusters are per-status** — the mock's four coarse rings (q/r/s/c) become the app's own
   StatusDot statuses in pipeline order, with the three closed statuses folded to ONE entry (the
   StatusDot law: the closed set collapses to one mark; a summed bucket names its count, not an
   outcome it doesn't have).
7. **StatusDot renders at 12px** — the component's floor — where the mock draws 10px rings.
8. **The Edit details button lives at the window's top-right inside the page** (`.msv12-topline`):
   the mock puts it in ITS top bar, which in this app is the shell's — pages don't own it.
9. **The hero title's line-height is 1.15, not the mock's 1.0** — the mock's value is tuned to a
   drawn title with no descenders; the house law (mixed-case display faces crop descenders below
   ~1.15–1.3) wins. Measured: "Harbour of Glass" carries a descender.
10. **L10's sticky offset is 28px** (the lock's number); the mock says `top: 0` (false premise 6).
11. **The status fact's glyph** — "Querying since {date}" draws a QUERIED StatusDot per the
    prompt's mapping table; with no sent queries the fact reads "Not yet querying" with no glyph
    (a glyph with no queries would be a status about nothing).
12. **The empty state's ghost rings** are plain tinted circles in the ghost's own style, not
    StatusDots and not the mock's `.dot` class — the ghosts are furniture (aria-hidden), and a
    real StatusDot inside them would put status semantics on invented examples.

## 7 · Geometry — app and mock by one ruler

All positions `[x, y, w × h]` relative to the CONTENT WINDOW's measured box (`.ws-window` in the
app, `.window` in the mock), both rendered in the same Chromium at the same viewport. The app's
window is narrower than the mock's at every viewport (the shell's sidebar is 288px against the
mock's 236, plus the window insets): 1012 vs 1044 at 1280, 1652 vs 1684 at 1920. That one
difference explains every x/width delta below; y agrees within 1px throughout.

| element | app @1280 | mock @1280 | app @1920 | mock @1920 |
|---|---|---|---|---|
| hero | 29, 29, 954×358 | 28, 28, 988×352 | 86, 29, 1480×378 | 102, 28, 1480×378 |
| hero art | 29, 57, 280×300 | 28, 53, 280×300 | 86, 37, 360×360 | 102, 36, 360×360 |
| hero text | 337, 37, 458×340 | 336, 36, 492×334 | 486, 43, 840×349 | 502, 45, 840×342 |
| cover | 823, 87, 160×240 | 856, 83, 160×240 | 1366, 67, 200×300 | 1382, 66, 200×300 |
| first owed | 29, 409, 586×55 | 28, 402, 620×55 | 86, 429, 1112×55 | 102, 428, 1112×55 |
| rail | 643, 409, 340×600 | 676, 402, 340×688 | 1226, 429, 340×828 | 1242, 428, 340×828 |
| tray | 643, 409, 340×215 | 676, 402, 340×215 | 1226, 429, 340×215 | 1242, 428, 340×215 |
| tray art | 811, 463, 172×160 | 844, 456, 172×160 | 1394, 484, 172×160 | 1410, 483, 172×160 |

Differences over 2px, each explained:
- **Every x and every fluid width** — the window-width difference above; at 1920 the 1480 cap
  binds in both and the app centres at (1652−1480)/2 = 86 exactly as the mock centres in its own
  window. The construction is identical; the frame is the app's.
- **hero/owed/rail y at 1280: 409 vs 402 (+7)** — the app's hero is 6px taller (358 vs 352):
  `.msv12-title` holds `line-height: 1.15` against the mock's 1.0, the house descender floor
  (deviation 9). The row gap (22) and everything beneath shift by the same amount, which is the
  difference moving with its cause.
- **rail height @1280: 600 vs 688** — the rail caps to the SCROLLPORT (`--wpg-port-h` − 56), the
  house viewport law; the mock caps to `100vh − 112` in a frame whose window is taller at 1280.
  At 1920 both resolve 828 and agree exactly.
- **Prompt table vs both renders**: the prompt's reference table was measured with web fonts
  BLOCKED (its own caveat) and shows e.g. hero 988×351 at 1280 — our mock render with fonts
  agrees with the app's construction, so the relational rules (all asserted, all green) carry the
  claim: hero one row at 1024/1280/1440/1920 · cover right = rail right ±1 · rail left = col
  right + 28 ±1.5 · tray art seated on both tray edges ±1 · art clear of the tray text.

Two structural notes behind those numbers, both the house's own laws:
- The page hands the grid its inset (`--wpg-gutter: 28px; --wpg-measure: 1480px` — the
  `.qc-wpg--v11` pattern). A first cut also padded the root, and the double inset measured 109px
  from the window's edge; one owner now.
- The Edit details control floats at the page's top-right out of flow (the mock hosts it in ITS
  top bar, which in this app is the shell's), so the hero keeps the mock's y = 28.

## 8 · Mutations — each named mutation, the lock it turned red, and the restore

| Lock | Mutation applied | Red? | Restored green |
|---|---|---|---|
| L1 | `.msv12-hero` dropped to two columns (the v8 fault) | e2e: see log | ✓ |
| L2 | a white fill painted on the art's column | e2e: see log | ✓ |
| L3 | `versionUsage` folded unattributed queries into every version's count | ✓ 2 unit tests red | ✓ 21/21 |
| L4 | the owed button's onClick calls `updateQueryStatus(...)` before opening | ✓ 2 unit tests red | ✓ 9/9 |
| L5 | the hero's StatusDot replaced by `<span class="dot" />` | ✓ 1 unit test red | ✓ 9/9 |
| L6 | a `<button>` planted inside the Versions ghost | ✓ 1 unit test red | ✓ 9/9 |
| L7 | `pro ?` hardened to `true ?` — cards shown on Free | e2e: see log | ✓ |
| L8 | the tray art anchored `left: 0` | e2e: see log | ✓ |
| L9 | the unset series rendered as `{ms.series ?? ""}` | ✓ 1 unit test red | ✓ 9/9 |
| L10 | the rail made `position: fixed` | e2e: see log | ✓ |
| L11 | "strong" added to the letters caption | ✓ 1 unit test red | ✓ 9/9 |

**A finding from the mutation pass, worth more than the pass:** the FIRST L5 mutation swapped the
OWED row's StatusDot — and 9/9 stayed green, because the unit smoke's seeded fixture raises no
owed request, so the mutated branch never rendered. The monoculture trap, caught doing exactly
what the house record says it does. The mutation was re-aimed at the hero's always-rendered dot
(red ✓); the e2e half of L5 runs against the full fixture, whose owed rows are real.

**Also proven in passing:** running `mastheadMatrix` concurrently with source mutations tripped
`bundleGuard` mid-run (a stale bundle, correctly refused) — the run was voided and re-done
serially. The guard's verdict was about the harness, not the page.

## 9 · Deferred, with owners

- **Rules line for setting/series** — Nick (draft in §2); until it lands, the edit dialog reports
  the denial and saves everything else.
- **Standalone other materials** — product decision (Nick) before any flow exists; the section
  states the writer's real package lines meanwhile.
- **Author / pen name** — no field in the model; the byline uses `User.name`. If a pen name is
  wanted it is a User field + settings control, not a manuscripts-page invention.
- **Cover upload** — D9; the placeholder is wired to nothing and says so. Needs Storage
  provisioning + `coverUrl` allowlisting (its TODO already sits on the type).
- **The asset weight** — the two PNGs total ~2.1MB bundled; the house PNG-8 quantiser note
  (memory) applies if launch perf wants them smaller. Owner: whoever runs the next asset pass.

## 10 · Final verification (Phase 7, on main at 13833845)

- **The page suite**: `manuscriptsV12.measure.ts` — **19/19** against the built page at a local
  preview (127.0.0.1:4583), assertion floor 60 satisfied; L1 at 1024/1280/1440/1920, L2–L11, the
  geometry table (§7's numbers are this run's), and the mock rendered by the same ruler.
- **Unit gates at the commit**: tsc 0 errors · build:dev green (refs check ✓ 80) · Vitest
  **503 files / 8,399 passed / 3 skipped** — the full suite, including the new page smoke (9),
  manuscriptSummary (23), the grid census with the three-page opted-out set, and marketing's
  family register with its seventh owner.
- **Neighbour suites re-proved**: `mastheadMatrix` — Manuscripts reads as DECLINED and the
  register equality passes; its one remaining red is **Analytics' masthead height
  (109.4 vs derived 69.4)**, the pre-existing masthead-derivation red CLAUDE.md already records
  on main (v34 era), naming a page this pass never touched. `headerFix` — green after two honest
  recalibrations: the census row's grid class follows the routed page (`msv12-wpg`), and the
  toolbar-population floor moved 3 → 2 because Manuscripts' toolbar genuinely left the treatment
  (the floor still refuses zero and one).
- **The affected-suite manifest**: `tests/e2e/RETIRED-manuscripts-v12.md` — scoped by SELECTOR
  and route per the house retirement rule; the register-covered censuses are live, the
  book-profile-bound suites are named as stale-until-repointed rather than silently left.
- **Harness incidents recorded** (both the guard's wins): `bundleGuard` voided a matrix run that
  overlapped source mutations (stale bundle, correctly refused; re-run serially); the first L5
  mutation demonstrated the monoculture trap on the smoke fixture and was re-aimed.
