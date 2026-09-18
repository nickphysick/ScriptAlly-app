/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE DASHBOARD REF'S PATH, STATED ONCE (v33).
 *
 * It was stated twice — `REF_REL` in `dash-refdiff.mjs` and a restated `join(ROOT, "design-refs",
 * "dashboard-cappuccino-vNN.html")` in `dash-plotdiff-v31.mjs` — so every version bump needed two
 * edits and the second was remembered by hand. `REF_REL` exists in the first place because the ref
 * filename is the one thing in this harness that changes on a schedule; a copy of it in the file
 * that draws the PIXEL comparison would eventually diff a new app against an old mockup and report
 * the difference as the app's.
 */
/*
 * ⚠️ SINCE 17 SEP IT POINTS AT A SNAPSHOT OF THE BUILD, NOT A DRAWN MOCKUP. Stage 1 of the dashboard
 * rebuild replaced v34's header (its stat cards are gone by design), so v34 could no longer be the
 * oracle for the whole page. `dash-ref-snapshot.mjs` made this file from e3c63f60; it is a regression
 * baseline between stages — a green run means nothing moved since that build, never that the page is
 * right. v34 stays on the design-ref watchlist as the authority for what is not yet rebuilt, and
 * stages 2 and 3 bring their own refs.
 */
/*
 * ⚠️ AND SINCE STAGES 2–3 (17 Sep, later the same day) IT POINTED AT THE SECOND SNAPSHOT, `…-17b`,
 * taken after the breakdown, the three-card row and the new chart replaced the top row. Both
 * snapshots stay in design-refs/ as the record of those pages; nothing reads either now.
 */
/*
 * ⚠️ SINCE v16 (18 Sep) IT IS A DRAWN MOCKUP AGAIN, WHICH CHANGES WHAT A GREEN RUN MEANS. A snapshot
 * matches its own build by construction — a regression baseline, nothing more. `dashboard-v16.html`
 * is the approved design, so the harness is back to answering "does the page match the design"
 * rather than "has anything moved since Thursday". The pixel comparison in `dash-plotdiff-v31.mjs`
 * is live again for the same reason: it skipped itself on a build reference.
 *
 * ⚠️ THE MOCKUP CARRIES NO MEDIA QUERIES — it draws 1440 and nothing else, at a fixed 224px sidebar.
 * So 1440 IS THE ORACLE and every other width is Nick's prose (1280: the closed tile drops beneath
 * the chart; 1000: everything stacks). A probe reporting a "miss" at 1280 against this ref is
 * reporting that the ref does not respond, which is a fact about a drawing rather than about the app
 * — the widths the ref cannot speak for are named in `dash-refdiff.mjs`, not inferred from it.
 */
/*
 * ⚠️ AND THE FILENAME CARRIES A DATE BECAUSE THE PLAIN NAME WAS ALREADY TAKEN. The mockup arrived as
 * `dashboard-v16.html`, and `design-refs/` already held a `dashboard-v16.html` from an earlier series
 * ("Dashboard v16 (restructured)") which `OneScreenPro.tsx` still cites. Writing the new one to that
 * path replaced the file WITHOUT replacing anything written against it — the anchor-replacement fault
 * this repo records — so the older ref is back at its own name and the new one is dated.
 */
export const REF_REL = "design-refs/dashboard-v16-2026-09-18.html";
