# Overnight fixes v1: the "already done?" audit (Part 0)

Written before any edit, 15 Nov 2026, ~22:15.

- **Served line:** dev serves `index-CGBxi7UY.js` (curl of https://scriptally-dev.web.app/).
  - That matches the memory note for Workspace headers v1.1.
  - The served branch is `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11` @ `7792872ab`, as the prompt expected.
- **This worktree:** `overnight-fixes-v1` is cut from that tip in `../ScriptAlly-onf1`.
- **Worktrees besides the primary at the start:** 4 (co1, live, rsp6, tdf), so this one makes 5.
- **Disk:** 54 GiB free.

## Verdicts

| Part | Verdict | Evidence |
|---|---|---|
| 1 Template offers | **NEEDED** | The served line still offers it in several places: `ContactEmptyPage.tsx:120-122` ("Use our template" / "Download the template"), `ContactWays.tsx:34-42` ("Downloadable template."), `QcState155.tsx:33` (`TEMPLATE_HREF` download), `ImportDoorsPhone.tsx:41` (`TILE_TEMPLATE.download`), `ImportPage.tsx:157,188` (`onDownload`), `ImportFlow.tsx:737-740`, `articles.ts:236-239` (the "download-the-template" article, a draft) and `articles.ts:232` ("The template … always free"). No branch, report or worktree is named for it. |
| 2 Failed load | **PARTLY** | **Agents is done:** `db.tsx:624,845-858` (`agentsRead` "ok/failed/retrying", `retryAgents`) and `AgentList.tsx:386-394` (the Contact list's error frame, Contact list principles v1). **Queries and manuscripts are not:** `db.tsx:799-806` and `:861-868` mark the collection loaded on error and set nothing, so a failed read draws as an empty account on the QC, Dashboard and To-do. No branch or worktree. |
| 3 Two-door v1.1 | **ELSEWHERE** | Branch `two-door-import-finish` (local, tip `a08f202a1`, "Phase 0: recon and baseline"). It sits in worktree `/Users/nickphysick/ScriptAlly-tdf` (clean tree). That worktree is claimed by a live session (b2a1f517, pid 40306, running; claim last touched 18:34). The branch is cut from `dev/…-tdi` and is 54 commits behind the served line. Its recon is at `reports/two-door-import-finish/` in that worktree. **Not rebuilt, not merged.** To reach dev it needs Phases 1–4 finished, then a merge onto the served line. |
| 4 Card offers v1 | **ELSEWHERE** | Branch `card-offers-v1` (local only, not on origin), tip `97e7fa693` (11 Nov). It has all four phases (CO1–CO20). Worktree `/Users/nickphysick/ScriptAlly-co1` holds **uncommitted** `tests/e2e/cl262.measure.ts` and an untracked `reports/card-offers-v1/REPORT.md`. It is cut from `dev/…-aa1-laq11` @ `510c1cec3` and is 259 commits behind the served line. The ref `agent-card-edit-v8.html` exists only in that worktree (SHA256 matches). **Not rebuilt, not merged.** To reach dev: commit or close out that worktree's edits and report, push, merge onto the served line (expect conflicts in `AgentCard262*` / `SidePanel` against Contact list v1.1), then run its locks there. |
| 5 Settings headers v2 | **NEEDED, but the ref is ABSENT, so the part is SKIPPED** | `settingsHeadline.ts:56,75,77` still produce "All yours." / "Everything's included." The red gate failed: `design-refs/settings-header-v2.html` is not in the served tree, the primary, co1, `~/Downloads`, `~/Desktop` or `~/Documents`, and Spotlight finds neither the name nor the hash. Per the prompt, the part is skipped. |
| 7 Drawers a11y | **PARTLY (to be confirmed red-first by the DR locks)** | Roles and labels exist: `SidePanel.tsx:65` (`role="dialog"`, no `aria-modal`, as specified for non-modal), `HalfDrawer.tsx:50` and `DrawerShell.tsx:154` (`aria-modal`), and `MobileSheet.tsx:108-113` (inert on the page). Missing: none of SidePanel, HalfDrawer or DrawerShell moves focus on open, traps Tab, or returns focus on close (no `focus(` / `activeElement` / Tab handling in any of the three). No branch, worktree or report: `reports/` has no a11y or focus folder, and git history has no "focus trap" commit. |

Branches matched on origin by the name search: only `two-door-import` (merged into the served line, as the `tdi` in its name says). Nothing matched `card-offers`, `-co1`, `settings-header`, `template`, `load-error`, `drawer`, `a11y` or `focus`.

## R1–R3 (read only)

- **R1 Reserve list: built.**
  - Promotion is in `functions/src/waitlistRetention.ts:92-108`: a freed place runs a transaction that promotes the next confirmed waiting writer.
  - On an unsubscribe the same happens in `functions/src/waitlist.ts:128-135`, which calls `sendWelcome(...)` (email 2) after the commit.
  - The pure half is `functions/src/waitlistModel.ts` (tests: `waitlistModel.test.ts:353`, "PROMO-1"). It lives in `functions/src/`, not `src/lib/`.
  - The email they get is the same welcome or founding email a new writer gets. There is no separate "a place freed up" email.
- **R2 Photo import: built.**
  - "Use photos" opens the photos screen empty and never the file picker (`ImportFlow.tsx:79,228`, `PhotosScreen.tsx:13`, `CaptureFork.tsx:37`). The picker waits for the writer's own "Add a page".
  - The heading is "Ok. Let's turn your photos into a smart QueryHawk database." (`src/lib/photoImport.ts:44`, pinned by `photosScreen.test.tsx:28`).
  - "On one line" is not measured here.
- **R3 Contact list header: built.** It reads "{n} agents on file" (`AgentList.tsx:1089`, `agentsPage.ts:292`) and the subheader "{nq} not yet queried" (`AgentList.tsx:698`). With every agent queried it reads "All of them queried", or "Already queried" for a single agent (`src/lib/contactPrinciples.ts:46`). The slim bar carries the same lines (`ContactSlimBar.tsx:12`).
