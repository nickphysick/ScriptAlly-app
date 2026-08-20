# Submission packages — the ecosystem flow (modals, gating, tiles, tracking)

Built on the shipped restructure (`82aa623a`→`7ee240c6`, `62d0ae2e`) and this morning's F7/F8 fixes.
Design authority: `design-refs/submission-packages-flow.html`.
Report is append-only, one section per phase.

---

## Phase 0 — Recon gate

### The design ref — found in Downloads again

Not in `design-refs/`; present at `~/Downloads/submission-packages-flow.html` (51,517 bytes,
20 Aug 10:51) — the documented hand-off path, third time running. Copied in byte-identical and
committed with this phase. **Gate not tripped.**

The mockup renders its seeded working state on load (verified in a browser: six materials with
source labels, three package tiles, tracking strip). Its `<script>` is the behavioural spec and is
what the phases below are built against — I read it in full rather than inferring from screenshots.

### Baseline gates (recorded BEFORE any edit)

| Gate | Baseline |
|---|---|
| `tsc --noEmit` | **exit 0**, clean |
| `vitest run` | **6 files / 24 tests FAILED**; 333 files / 5757 tests passed (339 / 5783) |

**⚠️ The baseline is RED and none of it is mine.** The six failing files all belong to other streams
mid-flight:

```
src/components/todo/tasksAuditBoundary.test.tsx     (to-do)
src/lib/todoCalendar.test.ts                        (calendar)
src/lib/todoGroups.test.ts                          (to-do)
src/lib/queryAmbient.test.ts                        (Query Centre)
src/lib/queryCentreWaiting.test.ts                  (Query Centre)
src/marketing/marketingLinks.test.tsx               (marketing)
```

This morning's run was 336/336 green, so all 24 failures arrived in the last few hours. The gate for
every phase below is **no worse than 6 files / 24 tests**, and the load-bearing evidence stays what
it was last night: a targeted run of the suites covering files I actually touch.

*(The tsc baseline had to be taken twice — the first background run was killed when the session was
interrupted and left an empty artefact. An empty log is not a green one; it was re-run rather than
assumed.)*

Baseline `git diff --name-only HEAD`: **63 paths**, all other streams' report PNGs and run-artifacts,
plus their in-flight `src/` work. Recorded to `/tmp/baseline-dirty.txt` and compared at close.

---

### R1 — Packages already reference real material IDs. **No migration.**

Re-verified independently rather than trusting my own earlier report: `queryLetterDetails` /
`synopsisDetails` / `samplePagesDetails` appear **nowhere** in `src/` or `firestore.rules`.
`SubmissionPackage` holds `queryLetterVersionId` / `synopsisVersionId` / `samplePagesVersionId` with
the `UNFILLED_SLOT = ""` sentinel.

So D1's migration branch is **not invoked**, and Phase 1 is an additive model extension rather than a
data migration.

### R2 — The materials model, and the primitives the modal must call

| | |
|---|---|
| Collection | `users/{uid}/versions` |
| Type | `ManuscriptVersion` (`src/types.ts:232`) |
| Fields | `id, manuscriptId, userId, componentType, versionName, fileAttached, fileName?, createdDate, contentDraft?, notes?, contentType?: "text"\|"link"\|"file", contentLink?` |
| Create | `addVersion(v: Omit<ManuscriptVersion, "id"\|"userId"\|"createdDate">)` → `Promise<string>` |
| Update | `updateVersion(id, fields: Partial<Pick<…, "versionName"\|"contentDraft"\|"fileAttached"\|"fileName"\|"notes"\|"contentType"\|"contentLink">>)` |
| Delete | `deleteVersion(id)` — **not used** (D11) |

All three come from `useScriptAllyDb()`. **The new modal calls these, and implements no persistence
of its own.**

**⚠️ THE COLLECTION STAYS `versions`, AND THAT IS A STANDING RULING, not an implementation
convenience.** The repo records it explicitly: *"Reuse, don't fork the data model (Nick's ruling):
keep `users/{uid}/versions` … 'materials' is UI vocabulary only … do NOT create
`users/{uid}/materials` or rename fields."* D1 describes the model in UI terms
(`type/name/contentMode/contentText/fileName/wordCount`); every one of those maps onto an existing
field, so the ruling and the brief agree:

| D1 | Existing |
|---|---|
| `type: letter\|synopsis\|sample` | `componentType: ComponentType` (the three `BUILDER_TYPES`) |
| `name` | `versionName` |
| `contentText` | `contentDraft` |
| `fileName` | `fileName` |
| `contentMode: text\|file\|ref` | `contentType: "text"\|"link"\|"file"` — **needs `"ref"` adding** |
| `wordCount` | **not stored** — currently derived per-read by `versionMeta()` |

So Phase 1 is exactly two additive changes plus their rules: **`wordCount?: number`**, and **`"ref"`**
on the `contentType` union. `"ref"` is a genuinely new mode (NAME ONLY) and is not the same thing as
the existing `"link"`, which was for URLs.

### R3 — F7 is live on dev. **Verified, not assumed.**

`node tests/e2e/rulesProbe.mjs` against the deployed rules:

```
database: (default) · project: scriptally-dev
  ✅ packageId (attach)   (F7, 33b52b6)   ACCEPTED
```

So Phase 5 can attach a package to an existing query for real.

### R4 — How a reply and a request are represented

**Not as activity types to be re-parsed.** `Activity` carries `resultingStatus`, and `recomputeQuery`
is the single writer that turns the log into the query's derived state — the repo's standing
single-writer rule. The canonical representation a dashboard should read is therefore the **query**,
not the log:

| Concept | Derivation (already exists, in the locked `packageMetrics`) |
|---|---|
| a **request** | `isRequest(q)` — status in `{Partial Requested, Partial Sent, Full Requested, Full Sent, Revise & Resubmit, Offer}` **or** `partialRequestedDate` **or** `fullRequestedDate` |
| a **reply** | `isResponse(q)` — `hasAgentResponded === true` **or** `isRequest(q)` (requests ⊆ replies, deliberately) |
| a **send** | `q.packageId` matching the package |

**The adapter derives from queries, and re-implements none of this.** Reading the activity log
directly would be a second derivation of something `recomputeQuery` already owns — exactly the
divergence that had the dashboard and the board disagreeing about "urgent". It also satisfies D8's
constraint for free: `packageMetrics.ts` is a **lib**, not a Query Centre component, so the adapter
imports nothing from those files.

### R5 — Every entry point into WorkshopTab / AnalyticsTab from this page

Phase 4 retires these. The components stay on disk (D9) — `#/pkg-lab` still mounts them.

| # | Site | Goes to |
|---|---|---|
| 1 | header `New package` (`SubmissionPackages.tsx:250`) | workshop + `newPkgSignal` |
| 2 | overview `onAddMaterial` (281) | workshop + `openMatSignal` |
| 3 | overview `onOpenMaterial` (282) | workshop + `openMat` |
| 4 | overview `onNewPackage` (283) | workshop + `newPkgSignal` |
| 5 | overview `onOpenPackage` (284) | workshop + `openPkg` |
| 6 | overview `onOpenTracking` (285) | analytics |
| 7 | `AnalyticsTab.onOpenPackage` (327) | workshop |
| 8 | `AnalyticsTab.onNewPackage` (328) | workshop |

Plus the two `BackToOverview` controls and the `view` state itself.

### RED GATES — all clear

| Condition | Status |
|---|---|
| Ref missing from both locations | **No** — in `~/Downloads`, copied in |
| No writable materials model / no migration shape | **No** — `versions` is writable and R1 needs no migration |
| A required edit lands in a do-not-touch file | **No** — `types.ts` and `db.tsx` are additive-only by the brief; `firestore.rules` has an authorised Phase 1 deploy; `App.tsx`, `index.css`, Query Centre files and locked components are untouched |
| Another session has the same files staged | **No** — the index is clean, and all five files I need are clean in the working tree |
