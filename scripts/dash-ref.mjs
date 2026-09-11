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
export const REF_REL = "design-refs/dashboard-cappuccino-v34.html";
