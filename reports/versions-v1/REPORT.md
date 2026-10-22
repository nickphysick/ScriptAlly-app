# Versions v1: the Versions page (Pro, and founding members in full)

Branch `versions-v1` (worktree `../ScriptAlly-ver1`), cut from **e54396d8**, the tip of
`dev/css1-pv3-ms27-ms28-ms281`, which dev served as `index-BmbaNVwq.js` (Manuscripts v28.1). The worktree was level with
it (`git rev-list --count HEAD..base` = 0).

## False premises

1. **"`Query.sentVersions` records what was sent", and the resolution sentVersions → edition → sample → `bookVersionId`.**
   `sentVersions` holds the letter and synopsis versions that went, not a book version. Since the packages work a
   **package states its own version** (`SubmissionPackage.bookVersionId`, and each `PackageEdition` carries one).
   - The route is now: `sentRecordOf(q)` gives the package and edition credited → that edition's `bookVersionId`. That
     is `packageReplies.creditedSlot(q, "version", packages)`, the edge the packages page's "What's getting replies"
     sheet already uses, and this page uses it unchanged.
   - `manuscriptSummary.queryVersionId` (the Manuscripts page) reads the package's *current* version instead. The two
     agree unless a package's version changed between editions.
   - `queryVersions.openingRead` still goes through the sample. It is stale, and this pack doesn't touch it.
2. **"The banner's count equals `unrecordedVersion`'s."** `unrecordedVersion` counts only queries sent in a package
   that states no version. It misses queries with no package at all, and queries with nothing recorded about what went.
   - On the harness account (live queries, no version through `creditedSlot`, against `unrecordedVersion`'s `sent`):
     - `seed-ms-1`: 37 against 7
     - `msv12-ms`: 1 against 1
     - `ms21-ms`: 1 against 0
   - The banner counts every live query that reaches no version (`versionsPage.unversionedLive`), and lock B3 checks it
     against a count read straight from Firestore. Locks B3 and D3 could not both hold with `unrecordedVersion`.
3. **"Non-retired versions", "Retire or Delete".** `BookVersion` has no retired state, and no writer deletes one;
   `renameBookVersion` (name and note) is the only edit the model allows. So the list shows every saved version, and
   the ••• menu offers **Edit** and **Add to a package** only.
4. **"Add the route and the sidebar row."** Both already existed: v27 Part E added `/manuscripts/versions` (an
   interim page) and the "Versions" row with its PRO tag. Part A **replaced the mounted page**. The interim
   `manuscripts/v27/VersionsPage.tsx` stays in the tree, mounted nowhere. Every route register already lists the path.
5. **"A founding member is recognised by…"** Nothing on the account marks one. During the beta every account is a
   founding member (the sidebar's feedback card says so to everyone), and packages' founding access is one constant.
   - Ruling (Nick, 22 Oct): *"it's a Pro feature but will be fully accessible to founding members"*. So
     `versionsUnlocked(user) = VERSIONS_FOUNDING_ACCESS || plan === Pro`, with the constant on.
   - **No real account sees the lock today.** The Free state is reachable on dev builds only, through
     `sessionStorage["sa.dev.versionsFree"] = "1"`. That review aid sits behind `import.meta.env.MODE`, so production
     carries none of it.
6. **"`VersionsPane.tsx` and `BookVersionsPanel.tsx`."** Both are mounted only by the retired `AllManuscripts`, which
   no route renders. Nothing here reuses them.
7. **"Change opens the package drawer's new-package form with that version chosen."** That drawer (`PkgDrawer4`)
   belongs to Submission packages and reads no URL parameters. Opening it from here would mean editing the packages
   page, which is out of bounds. So **Change** and **Add to a package** go to `/manuscripts/packages` when no live
   package states the version (see Open items).
8. **"Assign versions opens the Query Centre filtered to those queries."** No such filter exists, so the button opens
   the first such query's panel. **Recording a version on a query from this page is a rules question; it is not built.**
   - The query drawer's flat fields would need a new key, for example `sentBookVersionId`. Draft rule (not applied):
     `&& (!incoming().keys().hasAny(['sentBookVersionId']) || (incoming().sentBookVersionId is string && incoming().sentBookVersionId.size() <= 64))`
     inside the query-update allowlist, with the key added to its `hasOnly()` list.
   - A sent package's version is frozen by the rules, so the record would have to sit on the query.
9. **The mock's lock card lists "Head to head" and "Fix the record. Say which version went, even after it's sent."**
   Neither exists, and the second is the rules question above. Copy states only what the code does, so the three
   items read: *Version by version · Every query, by version · A league table*.
10. **Colours.** The mock draws "Landing best" in rust, a rust edge on the "doing well" sentence, and rust for
    requested statuses in the drawer. All three mean good, and the prompt says rust never means good, so all three are
    navy.

## Step 0

- **Hashes:** all 17 files match, including `versions-v1.html` (`4055aaea…6beb`). Enrolled in `.refhashes.json`.
- **Version model:** `bookVersions`, `BookVersion` (`id`, `name`, `kind`, `createdDate`, `note?`, `fromActivityId?`,
  `wordCount?`) and every `bookVersions.ts` export named in the prompt are present. Two differences: no retired
  state, and versions now live on packages.
- **How a query reaches a version:** see false premise 1.
  - A query reaches at most one version (its credited edition's).
  - `requestsByVersion` counts by the package's current version (package → queries); this page counts by edition.
- **Active version:** `resolveActivePackage(ms, packages)?.bookVersionId`. No field is added.
  - **Change** calls `setActivePackage` with the newest live package stating the chosen version.
  - **Undo** puts back the previous `activePackageId` exactly, deleting the key if there was none (a snapshot, not an
    inverse).
- **The gate:** `versionsUnlocked`, see false premise 5.
- **Writers:** new and edit go through `appendBookVersion` / `renameBookVersion` + `updateManuscript`, as
  `Msv21Version` does.
  - The mock's form is built on the HalfDrawer: kind, name, note, word count.
  - "Start from" is left out: nothing on a version stores where it came from.
  - Editing changes the name and note only.

## What was built

- `src/components/versions/VersionsV1Page.tsx` + `versionsV1.css`, mounted at `/manuscripts/versions` in `App.tsx`.
- `src/lib/versionsPage.ts`: every figure. "Asked for more" is `packageResults.firstAnswer(...) === "request"`
  (request or offer) through `packageReplies.tally`, the classification Analytics and the packages page use.
- `src/lib/entitlements.ts`: `VERSIONS_FOUNDING_ACCESS`, `versionsUnlocked`.
- **Header:** the `ms27-mh` grammar with "of {title}", and the active-version card with no figures.
  - At a narrow sheet (1280) the card is 240px wide, the Manuscripts page's own answer at that width, so the title,
    held at the shared hero size, is never covered.
  - The mock shrinks the title instead.
- **Change menu:** portalled to `<body>`, placed from the button, with literal colours. It closes on an outside press,
  Escape (`ESC_LEVEL.page`), Tab away or a pick (`shell/useDismissable`).
- **The rest:** the banner, the list, the insights drawer (it takes focus on open and returns it to the row on close),
  the thin banner, the cards, the league, the first-version state, and the lock card over an inert, blurred page.
- **"From {parent}"** names the version saved before (versions store no parent).
- **The "?" button** goes to `/help`: there is no versions article in the Help Centre.

## Locks (VER1)

`tests/e2e/versionsV1.measure.ts`, on the `ms21-filled` account. Expected values are read straight from Firestore
(`tests/e2e/ver1Fixture.mjs`), or from the page's data attributes compared with what it draws, never from
`lib/versionsPage`. **21 of 21 green** at 1512 × 900 and 1280 × 800.

| Lock | Green reading (1512) | Named mutation → red (1512) |
|---|---|---|
| A1 route | `filled`, the Versions row is `aria-current="page"` with its own arrow icon; smoke file present | drop the icon → "the row carries its icon" false |
| A2 gate | Pro: no lock. Free (review aid): `locked`, inert, `blur(4px)`, the card under the blur; presses under the lock open nothing; the manuscript document unchanged; See plans → `/plans` | invert the predicate → "Pro: no lock" 1 |
| B1 card | the name equals the derived active version (*Fast-paced opening*); no `%`, no digit in the body or foot | the stat restored → "no % on the card" |
| B2 change | portalled to BODY, in view; a pick moved the derived active version (*Fast-paced opening* → *Dual timeline edit*); Undo restored the manuscript document byte-for-byte; outside press, Escape and Tab each close it | outside-press handler removed → the menu stayed open |
| B3 banner | shown with count 1, matching Firestore; no row reads "Not recorded" | folded into the latest version → banner absent |
| C1 list | glyph counts 4/4, 2/2, 0/0; heading and row columns at identical x | one track changed → column 1 off by 15.9px |
| C2 drawer | opens on `ms21-bv-3` with its 4 queries; focus moves into the drawer; Escape closes it; focus returns to the row | focus return dropped → focus on BODY |
| D1 cards | the ranking (requests, then rate, then newest), unsent last; 9 positive figures, none rust | the leading figure rust → 4 rust hits |
| D2 league | every heading sorts; thin rows (under 4 answered) last; rate = replies ÷ answered on every row | divide by sent → 50% where 100% |
| D3 sums | lead "3 requests from 6 queries" = the rows' sums; banner 1 + versions' live 5 = Firestore's live 6 | one version dropped → 2 against 6 |

**Natural reds:** the whole file against dev's current build (`index-BmbaNVwq.js`, the interim page) fails all 20
cases at both widths (no `[data-ver1="page"]`). The named mutations are the lock-specific reds.

**Three mutations first stayed green, and each exposed a weak lock** (the first readings are kept in
`mutation-proofs.jsonl`):
- **A1:** the sidebar falls back to the section's icon when a row has none, so "the row has an svg" was always true.
  It now checks for the row's own icon.
- **B2:** a real click also moves focus, and the Tab-away handler closed the menu anyway. The lock now dispatches a
  bare pointer press.
- **C2:** the drawer never took focus, so it never needed returning. The drawer now takes focus on open, as the mock's
  does, and the lock asserts it.

All three are red now.

**L1 (this build):** VER1 21 · packages (`pk4`) 39 · MSV27 23 · MSV28 23 · MSV28.1 7, all green. There is no Responses
suite in this base (Responses v2 sits on its own unmerged branch).

**Changed deliberately:** MSV27-E1 and `openAt` asserted the interim page's header. They now wait on, and check, the new
page's eyebrow and "+ New version"; the rest moved to VER1, and MSV27's floor drops from 110 to 104.

**Gates:** tsc clean; build with no CSS warnings; Vitest 646 files pass, with the same three `functions/` reds as
baseline. `dates.test` caught a second month table on the page before commit; the page uses `MONTHS_SHORT` now.

## Shots

In `shots/`, beside each `design-refs/versions-v1/screens/*` file, at both widths, on the harness account.
- **07 (no versions)** is taken on `ms21-filled`'s second manuscript, which has none.
- **08 (Free)** uses the dev review aid.

## Open items

- **"Add to a package" with the version chosen** needs the packages page to take a link (for example
  `/manuscripts/packages?new=1&version=…`). Until then it lands on Submission packages.
- **Recording a version on a sent query**: the draft rule is in false premise 8.
- **TODO(illustration):** "A hawk with a trophy" in the league.
- **The mock's "Versions guide" pill** (1 of 4) isn't in the prompt and isn't built.
- **The sidebar's PRO tag** still shows to everyone (v27's choice; the shell is out of bounds). The mock shows it on
  Free only.
- **Commits:** parts A–D landed as one commit, because they share one component and one stylesheet; splitting them
  would commit intermediate files that never existed. Then one commit for the locks and this report.

## Integration and deploy

- Dev served `index-BmbaNVwq.js` from `dev/css1-pv3-ms27-ms28-ms281` at e54396d8, this branch's base. So the
  integration branch **`dev/css1-pv3-ms27-ms28-ms281-ver1`** is a fast-forward to **40080ff6**, the commit the gates
  and locks ran on.
- Built from a clean checkout of 40080ff6. The served hash was re-checked in the same command, then deployed (hosting
  only, `--project scriptally-dev`). **Dev now serves `index-wDx05B0j.js`.**
- VER1 against the deployed site: 21 of 21 green at both widths, with the fixture unchanged afterwards.
- Not merged to `main`. Prod untouched. No rules or functions changed.
