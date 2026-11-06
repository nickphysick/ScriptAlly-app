# Sidebar materials v1 — report

**On dev:** https://scriptally-dev.web.app serves `index-MbVlloVR.js` (6 Nov, hosting only). It is built from the local
branch `dev/…-qc1521-sr1-qc1522-td51-td511-cb2-sm1`, which is the branch dev was serving (`…-td511-cb2`, rebuilt
first and matched to `index-yuVLXxZt.js`) with `sidebar-rail-v1-dev` merged in. The merge had no conflicts.

**Nothing pushed. Prod untouched.**

## Commits (on `sidebar-rail-v1-dev`)

| Commit | What |
|---|---|
| `e976cda59` | Part A: Your book and Materials as two sections; the Query letters route |
| `a1df10df8` | Part B: the Pro marks; one `materials` entitlement |
| `f40f5b1ae` | Part C: spacing, the height lock, the new e2e cases and screenshots |
| this commit | this report and the five screenshots |

## The nav now

| Section | Rows (full sidebar) | Rail card |
|---|---|---|
| Dashboard | (none) | (none) |
| Queries | Queries, Responses, Analytics | Queries, Responses, Analytics |
| Agents | Contact list, Discover | Contact list, Discover |
| Your book | Manuscripts, Versions | Manuscripts, Versions |
| Materials (Pro) | Query letters, Comparable titles, Submission packages | Query letters, Comps, Packages |
| Tasks | To-do list, Corkboard | To-do list, Corkboard |

- **Icons:** Library for Your book, Mail for Materials, FilePenLine for Query letters.
- **Query Centre** still reads "Queries" (your 6 Nov ruling).
- **"Query letters" fits the rail card on one line** (screenshot 1). SR2.1 measures every rail label.

## Recon answers

- **Do Comps and Packages move to `/materials/…`?** No. Both keep their addresses: `/manuscripts/comps` and
  `/queries/packages`. Moving Comps would edit Manuscripts-owned files, and moving Packages would edit Packages v42's.
  Only the nav regroups them, and everything that reads the nav follows on its own:
  - the folder tabs: on Query letters they show Comparable titles and Submission packages;
  - the crumbs and the ⌘K palette;
  - last-used memory: a stored Your-book entry under the old `materials` key is dropped, and Your book opens on
    Manuscripts.
- **Is Packages' gate folded into `materials`?** No. `PACKAGES_OPEN_TO_ALL` has other readers besides the nav:
  - `MaterialsField`, `Queries`, `db.tsx` (the package writers), `packageAttach` and `entitlements`.
  - Folding it in would let a Materials switch change who can write a package.

  `MATERIALS_OPEN_TO_ALL = true` sits beside it. `navLockedFor(user)` is the one place that decides which marks to
  draw.
- **Your book's internal id** changed from `materials` to `book`. The new section took the id `materials`.

## Pro marks

Marks appear only for a writer missing the entitlement, so today nobody sees them. Screenshot 4 shows a Free writer
through the dev-only switch `window.__SA_NAV_FREE = true`, which is dropped from production builds.

- **Rail:**
  - a "Pro" tag on the Materials section head;
  - a 5px outlined dot (named "Pro") on Versions, and on Discover in Agents' card.
- **Full sidebar:**
  - a PRO tag after the MATERIALS heading;
  - a PRO tag on the Versions and Discover rows;
  - none on the three Materials rows, because the heading already marks them.
- **Nothing is gated.**
- **Tests:** a Vitest file covers a founding writer (no marks), a Free writer (the marks above) and a Pro writer (no
  marks). It goes red if either section tag is removed.

## The height lock (Part C)

Group labels sit 13px under the row above and 5px over their first row, and rows are 32px. Pinned at 1512×982:

| | Measured |
|---|---|
| Headings / rows | 5 / 13 |
| Nav height used | 617 of 617px, no scroll |
| Rows outside the nav's box | none |
| Give feedback card | whole, bottom at 906 of 982 |

It fits, so the card wasn't touched.

## The phone bar, before and after

**Before:** Home · Queries · + · Packages · Agents
**After:** Home · Queries · + · Packages · Agents (unchanged; screenshot 5)

The phone's tab bar has its own model and doesn't read the workspace sections. No phone file is in this diff.

## Gates

| | Result |
|---|---|
| tsc | clean |
| `vite build` / `build:dev` | clean, no warnings |
| Vitest | 11,433 passed, 2 failed |
| Rail e2e (emulators) | 24 of 24 |

- The two Vitest failures are the known pair in `src/test/firestoreTarget.test.ts`, already red on dev's line.
- In the deploy worktree, `functions/` tests failed to load because that checkout had no `functions/node_modules`.
  With it linked, 382 of 382 pass. The merge changes no `functions/` file.

**New e2e cases:**
- **SR6.1:** Materials opens with three rows, and Your book with two.
- **SR6.2:** the full sidebar's five headings and thirteen names, in order.
- **SR1.1:** the folder tabs on Query letters.

**Screenshots** (`reports/sidebar-materials-v1/`, 1512×982 at 2×):
1. `1-rail-query-letters-materials-open.png`
2. `2-rail-versions-your-book-open.png`
3. `3-pinned-comparable-titles.png`
4. `4-pinned-free-writer-marks.png`
5. `5-phone-bar.png`

## Left alone

- **The settings sidebar** keeps 33px rows. They're its own rail (`.set-railitem`); this pack only asked for the main
  nav.
- **The Query letters page** is the placeholder header only. Query letters v1 builds it.
- **The worktree `ScriptAlly-rail2` is gone.** Another session removed it mid-run while it sat clean on a detached
  checkout. Nothing was lost; every part was committed. The deploy and this report used scratchpad worktrees, and I
  removed both afterwards.
- **One mistake on my side, cleaned up:** my first e2e run passed a stray `--`, so Playwright ran the whole suite. Its
  writes to `reports/` and `run-artifacts/` in my worktree were restored before anything was committed, and its
  leftover emulator on port 8186 was stopped.
