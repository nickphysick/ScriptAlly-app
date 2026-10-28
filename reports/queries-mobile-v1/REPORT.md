# Queries on a phone v1

Branch `queries-mobile-v1`, cut from the dev integration then served (`39c5768f`, the phone dashboard on top of the packages v39 / dashboard v116 stack, bundle `index-Cg9wZ_F1.js`, confirmed by building it). Refs: `design-refs/queries-mobile-v1/`, nine files. All nine hashes match the pack's list and are enrolled in `.refhashes.json`.

At 760px and narrower `/queries` is the phone page built to `queries-mobile-v1.html`. Above 760px the Query Centre is unchanged: pixel-identical and DOM-identical at 1512 × 900 (L1).

## 1. False premises, and what Step 0 found

1. **The phone shell existed only in part.**
   - **Top bar:** the phone dashboard pack built one (mark, manuscript, Search, Feedback, +), but on Home only. Every other route still showed the shell's generic phone bar.
   - **Tab bar:** that pack left the four-tab floating capsule (Home / Queries / Agents / Scripts) in place on purpose, and said a five-tab bar was its own pack.
   - **The two mocks disagree:** the dashboard mock's fourth tab is "Materials", this one's is "Analytics".
   - **Your rulings (asked mid-pack):** build the five-tab bar (Home · Queries · Agents · Analytics · More) on every phone page, and use this mock's own top bar on Queries (search, calendar, +), with the manuscript chosen from the header pill.
2. **The app's phone breakpoint is 768, not 760.** `useIsMobile` is `max-width: 767.98px`.
   - The phone page is gated at 760, as asked.
   - The tab bar is shell chrome and follows the shell's own 768 switch. So between 761 and 767px the old phone Query Centre shows above the new tab bar.
3. **The landing `HeroCard` is not a query card.** It is a decorative animation of hard-coded demo data (Eleanor Whitfield, Day 99), `aria-hidden`, with tabs that do nothing.
   - The in-app version is `QcQueryCard149` (Query Centre v149, built on the same `.mk-lc` styles).
   - It gained one opt-in prop, `layout="phone"`, plus `nextArt`. Desktop callers pass neither and render as before.
4. **No swipe library exists anywhere in the app.** The row's swipe is plain pointer events in `PhoneRow`.
5. **No celebration exists to reuse.** The nearest is the dashboard's founding-rank animation. The phone celebration is new, and fires when a query moves into Partial requested, Full requested or Offer while the page is on screen.
6. **The art brief contradicts L11.**
   - The pack puts the flying hawk on the Your-move card and in both + sheet tiles, while L11 forbids one source twice on a screen.
   - The app has exactly one flying-hawk drawing; the mock's two are it and its mirror.
   - **Resolved:**
     - the app holds that drawing as two files (`qc-list-flight.png`, `courier-cutout.png`), so the card and the first tile use one and the second tile the other;
     - the page under the sheet is `inert` while the sheet is open;
     - L11 counts each layer separately.
   - All art comes from one table, `qm1Art.ts`. The two new pieces are art slots: `agentReplied` (placeholder: flying hawk) and `cheer` (placeholder: hawk at desk).
7. **The mock's top card is the offer, although two rows are 8 days late.** "The most urgent item" is the desktop's own Your-move order (`statRows("you")`, earliest due first), so on real data the top card is the most overdue item.
8. **Nothing filters "to overdue".** Coming up's past-due card opens the list with a "N past their date ✕" filter: `pastDueRows`, the same set its count is built from.
9. **21 days spans three or four calendar weeks.** "This week" and "Next week" are joined by a third heading, "Later".
10. **The next step's second button.**
    - The mock says "She replied". The app never guesses an agent's pronouns, so it reads "{first} replied".
    - When the next move is itself "Record a response" (a query inside its reply window), the second button is "Close query" instead.
11. **The "next step" sentence is the card's own strip** (`stripOf`). It is word for word the mock's sentence shape ("{first} has had {thing} {for}." / "Nudge {first}, or close the query."), and L7 checks it against the desktop card for the same query.
12. **The phone page scopes by the shell's active manuscript**, as the phone dashboard does. The desktop Query Centre keeps its own scope (all manuscripts by default), so the two can show different counts on purpose.
13. **The mock's celebration also covers "a new query" and "a gentler version for passes".** The pack says request or offer only, and no passes in v1, so neither was built.

## 2. Commits

| Commit | What |
|---|---|
| `cc739af7` | Refs: the mock and its seven screens, enrolled |
| `8d5c6305` | §2–§3 data: `lib/queriesPhone` (chips, header line, groups, stamps, the reply-window bar, All's sections, Coming up, the celebration's trigger and words, the badge); 13 unit cases through the real `buildQcRows` |
| `c85291f0` | §4 card: `QcQueryCard149 layout="phone"` (next step above the tabs, no ×, footer = due line + ‹ N / M ›) |
| `af60ed72` | §2–§7 page: `QueriesPhone` (the tab, Coming up, a query, the + sheet, the ⋯ sheet, the celebration, `qm1Art`), returned by `Queries` at ≤760 after every hook |
| `2d28c318` | §1 shell: the five-tab bar on every phone page; the capsule's unit locks rewritten |
| `a99f193c` | Three faults the locks found: a swipe snapped shut on its own trailing click; "Record a response" did nothing (the desktop page still claimed the response picker it no longer drew); the due line read 10.5px |
| `40a8cb89` | The celebration covered the undo bar (both at z-index 90); the page's layers are 89 now |
| `8e269830` | The query panel opened from other pages (the phone dashboard's View task, the agent panel, search) did nothing on a phone: the one host is now built once and placed by both returns. Also "23th" → "23rd", the agent's name in serif 22px, and room for the quill |
| (this commit) | QM1 locks, shots, this report; dashboard A1/B1 re-pointed |

§2, §3, §5, §6 and §7 share `QueriesPhone.tsx`, so they land in one commit rather than five.

## 3. Locks: QM1, red then green

`tests/e2e/queriesMobileV1.measure.ts` (+ `qm1Lib.ts`), at 390 × 844 and 360 × 780; L1 at 1512 × 900. The helper injects motion suppression and any stylesheet mutation on every document, so a lock that navigates still reads the mutated page.

- **RED 1, the base:** all eight cases fail at their population check, because the phone page never renders (`red-base.txt`).
- **RED 2, each lock's named mutation** (`mutation-proofs.jsonl`, `mut-*.txt`): run against the dev server in this worktree, restored from path-named backups, never `git checkout`.
- **GREEN:** the finished build `index-BxuqUGkz.js` (`run-final.txt`). 9 passed; the two skipped are L1's capture and compare, which run on request.

| Lock | Mutation | Red reading |
|---|---|---|
| L1 desktop untouched | the breakpoint dropped (`max-width: 9999px`), built to its own folder | 795,185 of 1,360,800 pixels differ, DOM differs (green: 0 and identical) |
| L2 colour rules | `QM1_MUTATE=plus-rust` | "rust/red fill on button.qm1-ib.solid (rgb(180, 85, 63))" on every chip |
| L3 header line | the sent figure bound to the chip's rows | "sent equals All — 16 vs 52"; the line follows every chip |
| L4 chips filter | Gone quiet left unfiltered | "quiet: rows shown = the chip's count — 52 vs 17" |
| L5 All view | search and sort on Gone quiet | "quiet: search and sort absent — 1/1" |
| L6 rows | a StatusDot put back in the row | "you: no StatusDot in any row — 15" |
| L7 query card | next step moved below the tabs | "band, agent, book block, next step, tabs, in that order — [-13, 41.6, 100, 278.5, 237]" |
| L8 Coming up | 22 days | "every day is today to day 20" and "an entry on day 21 is not shown" both red |
| L9 + sheet | the tiles' flows swapped | both tiles open the wrong journey |
| L10 celebration | cheer on a pass; and `QM1_MUTATE=cheer-over-undo` | "after recording a pass, no celebration — 1"; "Undo is on top of the celebration — false" |
| L11 illustrations | the header uses the flying hawk too | "you: no image twice — [qc-list-flight.png, qc-list-flight.png]" |

**Three locks were wrong before they were right**, all found by a mutation that stayed green or crashed:

- **L11 was vacuous.** The "Show N more" clicks scrolled the list, and the sweep counted only images in the viewport, so it saw no art at all on Your move. It now counts every image the layer renders and starts from the top.
- **L3's first mutation proved nothing.** It read state before its declaration and crashed the page; it was rewritten at the render site.
- **L10's stylesheet mutation never applied.** L10 navigates, and a style added after load does not survive navigation; it is now injected on every document.

**L8 never writes.** It moves the clock (`page.clock.setFixedTime`), never the data: once to put the first entry on "today", once to put the last entry on day 21.

**L10 writes and undoes in the same run.** It records a partial request and a pass on a live Queried query through the card, and presses Undo each time.

### ⚠️ An incident, and what changed

Two L10 mutation runs left a recorded pass on the shared fixture `probe-dangling-pkg`.

- **First run:** a 2.5-second wait plus a dismissal outlived the undo bar's 8 seconds.
- **Second run:** the celebration was on top of the undo bar (the real fault fixed in `40a8cb89`).
- **Detection:** both times the lock refused to finish and named the query.
- **Restore:**
  - The card's Edit mode would not remove the entry; its guards refuse it.
  - So I restored it directly as the harness user: deleted the one activity and its feed row, set the status back to Queried, and removed the five reply fields the pass added.
  - `fadRender` re-plants this document from scratch on each of its runs anyway.
- **Checked afterwards:** status Queried, 0 activity, 0 feed, original fields only.
- **What changed in the lock:** L10 now reads within 1.2 seconds and asserts that Undo is on top of the celebration.

## 4. L12: the other suites, on the finished build

| Suite | Result |
|---|---|
| dashboard phone (`dashMobileV1`) | **8/8.** Two re-points, both stating why at the line: **B1** counts the phone page's rows (`[data-qm1="row"]`) after a card's `?ids=`, same claim (red on the base: 0 rows against 39/29/12); **A1** accepts the drawer's response journey ("Record a response") as well as the panel picker ("Query"), because the phone page does not draw the panel the old phone Query Centre did. C1 went red mid-pack on a real regression (fixed in `8e269830`) |
| QC150 | 25/25 |
| QC1501 | 15/15 |
| QC142 L8 | **red, and red identically on the base** (`toMatchSnapshot` on the front card): not this pack's |

## 5. Gates

| Gate | Baseline (`39c5768f`) | Final |
|---|---|---|
| tsc (root, functions) | clean, clean | clean, clean |
| `build:dev` | clean | clean, no warnings |
| Vitest | 682 files · 10,653 passed · 3 skipped | 683 files · 10,684 passed · 3 skipped |

The baseline's first Vitest run showed three red files under `functions/`: the worktree had no `functions/node_modules`. With it linked they pass, so the baseline is all green.

## 6. Shots

- **`shots/`:** every screen at 390 × 844 (2×): Your move, All, Waiting, Coming up, a query (top and scrolled), the + sheet, the celebration (taken inside L10), Gone quiet, Closed, and Your move at 360.
- **`pairs/`:** the mock's screen on the left, the app on the right, for screens 01–06.
- **Data:** the account's own (52 sent · 40 active on The Smoke Test), not the mock's sample.
- **What the pairs show that isn't this pack's:** the shell's beta strip above the bar.

## 7. Dev

- **Dev moved during the pack** from `39c5768f` (`index-Cg9wZ_F1.js`) to `1f694e78` (`index-BzLemNDD.js`: dashboard v118 + submission packages v39.1), confirmed by building that tip.
- **The integration branch** is `dev/pk391-qm1` = `1f694e78` + this branch, merge `07cec344`, pushed. The only conflict was `.refhashes.json` (both sides added entries).
- **Gates there:** tsc clean (root, functions); Vitest 686 files · 10,704 passed · 3 skipped; build clean.
- **Locks there:** QM1 9/9, dashboard phone 8/8, QC150 25/25, QC1501 15/15.
- **Deployed:** hosting only, to `scriptally-dev`, after a check that refused to run unless dev still served `index-BzLemNDD.js`. **Dev now serves `index-DRG_02T1.js`**, and QM1's tab case passes against the live site. Prod is untouched; nothing is merged to main.
- **On a phone:** open https://scriptally-dev.web.app/queries signed in. On a desktop browser, use the device toolbar at 390 × 844 (the page needs 760px or narrower) and reload.

## 8. Not done, and why

- **Pass celebration ("Wall of no") and a new-query celebration:** the pack says request or offer only.
- **The two commissioned illustrations:** they are art slots in `qm1Art.ts` and will be a one-line change when the art arrives.
- **Tablet-ish 761–767px:** the old phone Query Centre with the new tab bar, because the shell switches at 768. Moving the shell's breakpoint is a shell decision.
- **Edit mode refuses to remove a lone response entry** on a query whose only other step is the send (found while restoring the fixture). This was not investigated; it is outside this pack.
