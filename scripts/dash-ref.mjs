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
export const REF_REL = "design-refs/dashboard-build-2026-09-17.html";
