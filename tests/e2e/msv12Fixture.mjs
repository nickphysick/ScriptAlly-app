/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS-v12 FIXTURE — ids and expected values, stated once ═══════════════════════
 *
 * One module, imported by BOTH `seedManuscriptsV12.mjs` (which writes it) and
 * `manuscriptsV12.measure.ts` (which asserts against it). Two copies of these ids is how a seeder
 * and a lock come to describe different accounts — the drift this file forecloses.
 *
 * ⚠️ EVERY ID IS `msv12-` PREFIXED and matches the rules' `isValidId` charset (^[a-zA-Z0-9_-]+$).
 * The shared harness fixture (`seed-*`, `thin-*`, `cor-*`) is NOT touched: this fixture is a
 * separate manuscript on the same account, selected by the shell's own
 * `scriptally_active_manuscript_id` key at measurement time.
 *
 * ⚠️ NAMES ARE INVENTED. No real agent, agency or author appears here (house rule).
 */

export const MS_ID = "msv12-ms";
export const MS_TITLE = "Harbour of Glass";
export const MS_LOGLINE =
  "A ferry skipper has one Saturday to find his missing brother before the tide, and the men who took him, carry the evidence out to sea.";
export const MS_SETTING = "West Cork, today";
// ⚠️ NO SERIES on the fixture — L9 (honest-missing) depends on its absence.

/** Book versions — the page's "Versions" section. Oldest first (append-only order). */
export const BV = [
  { id: "msv12-bv-1", name: "Prologue first, wilderness world building", kind: "initial", createdDate: "2026-03-03", note: "The original draft." },
  { id: "msv12-bv-2", name: "Dual timeline edit", kind: "revision", createdDate: "2026-06-14", note: "1998 chapters interleaved from chapter 3." },
  { id: "msv12-bv-3", name: "Fast-paced opening", kind: "revision", createdDate: "2026-09-02", note: "Cut the prologue; opens on the ferry." },
];
export const CURRENT_BV = "msv12-bv-3";

/** Materials — `users/{uid}/versions`. Three letters, two synopses; NO 2-page synopsis
 *  (the "Some agents ask for 2 pages" note depends on that absence). */
export const LETTERS = [
  { id: "msv12-let-1", versionName: "Query letter v1", wordCount: 402, createdDate: "2026-03-01T09:00:00.000Z" },
  { id: "msv12-let-2", versionName: "Query letter v2", wordCount: 355, createdDate: "2026-06-02T09:00:00.000Z" },
  { id: "msv12-let-3", versionName: "Query letter v3", wordCount: 310, createdDate: "2026-08-30T09:00:00.000Z" },
];
export const SYNOPSES = [
  { id: "msv12-syn-1", versionName: "Synopsis, 1 page", wordCount: 480, createdDate: "2026-08-28T09:00:00.000Z" },
  { id: "msv12-syn-3", versionName: "Synopsis, 3 pages", wordCount: 1420, createdDate: "2026-06-14T09:00:00.000Z" },
];

/** Packages. pkg-0 states NO book version — the permanent "Not recorded" bucket L3 exercises. */
export const PKGS = [
  { id: "msv12-pkg-1", packageName: "Autumn round", letter: "msv12-let-3", synopsis: "msv12-syn-1", bookVersionId: "msv12-bv-3", otherMaterials: "Author bio", firstSentAt: "2026-09-05T09:00:00.000Z" },
  { id: "msv12-pkg-2", packageName: "Agents with MSWL", letter: "msv12-let-3", synopsis: "msv12-syn-3", bookVersionId: "msv12-bv-2", firstSentAt: "2026-07-01T09:00:00.000Z" },
  { id: "msv12-pkg-0", packageName: "First round", letter: "msv12-let-1", synopsis: "", bookVersionId: null, firstSentAt: "2026-03-03T09:00:00.000Z" },
];

/** Agents — invented. Two state a response window, the rest none. */
export const AGENTS = [
  { id: "msv12-agent-1", name: "Mira Kovic", agency: "Old Harbour Literary", responseTimeWeeks: 8 },
  { id: "msv12-agent-2", name: "Douglas Renner", agency: "Renner & Frost" },
  { id: "msv12-agent-3", name: "Edda Voss", agency: "Voss Literary", responseTimeWeeks: 6 },
  { id: "msv12-agent-4", name: "Theo Abara", agency: "Abara Grant Agency" },
  { id: "msv12-agent-5", name: "Sun-hee Park", agency: "Meridian Line" },
  { id: "msv12-agent-6", name: "Rosa Quintana", agency: "Quintana Books" },
];

/**
 * Queries. Statuses cover Queried / Partial Requested (owed, "the first 50 pages") /
 * Full Requested (owed) / Full Sent / Rejected — plus the two L3 subjects:
 * q7 rides pkg-0 (no book version) and q8 rides no package at all. Neither may appear in any
 * version row's counts.
 *
 * Earliest dateSent is 2026-03-03 → "Querying since 3 Mar".
 */
export const QUERIES = [
  { id: "msv12-q-1", agent: "msv12-agent-1", pkg: "msv12-pkg-1", status: "Queried", dateSent: "2026-09-05T09:00:00.000Z" },
  { id: "msv12-q-2", agent: "msv12-agent-2", pkg: "msv12-pkg-1", status: "Queried", dateSent: "2026-09-08T09:00:00.000Z" },
  { id: "msv12-q-3", agent: "msv12-agent-3", pkg: "msv12-pkg-1", status: "Partial Requested", dateSent: "2026-09-06T09:00:00.000Z", partialRequestedDate: "2026-09-12T09:00:00.000Z", materialsRequestedType: "pages", materialsRequestedQuantity: 50 },
  { id: "msv12-q-4", agent: "msv12-agent-4", pkg: "msv12-pkg-1", status: "Full Requested", dateSent: "2026-09-07T09:00:00.000Z", fullRequestedDate: "2026-09-19T09:00:00.000Z" },
  { id: "msv12-q-5", agent: "msv12-agent-5", pkg: "msv12-pkg-2", status: "Full Sent", dateSent: "2026-07-01T09:00:00.000Z", fullRequestedDate: "2026-07-20T09:00:00.000Z", fullSentDate: "2026-07-24T09:00:00.000Z" },
  { id: "msv12-q-6", agent: "msv12-agent-6", pkg: "msv12-pkg-2", status: "Rejected", dateSent: "2026-03-03T09:00:00.000Z", rejectedDate: "2026-05-01T09:00:00.000Z" },
  { id: "msv12-q-7", agent: "msv12-agent-1", pkg: "msv12-pkg-0", status: "Queried", dateSent: "2026-03-10T09:00:00.000Z" },
  { id: "msv12-q-8", agent: "msv12-agent-2", pkg: "", status: "No Response", dateSent: "2026-03-05T09:00:00.000Z" },
];

/** Comps on the manuscript — two named in the letter, one with no note (the "Add a note" case). */
export const COMPS = [
  { title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, note: "A single day on the water, told close to one narrator.", inQuery: true, source: "user" },
  { title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, note: "Coastal setting, a missing brother, short chapters.", inQuery: true, source: "user" },
  { title: "Kestrel Hour", author: "D. Lindqvist", publisher: "Orion", year: 2019, inQuery: false, source: "user" },
];

/**
 * The two fixture ACCOUNTS — both created and wholly owned by the seeder, neither shared.
 *
 * ⚠️ WHY NOT THE HARNESS ACCOUNT: `firestore.rules` holds `incoming().plan == existing().plan`
 * on every user UPDATE — a client may never change its own plan (a billing event belongs to a
 * server). The only legal way to a chosen plan is to CREATE the user doc with it, so the plan
 * "flip" is delete-and-recreate of a user doc this fixture owns outright. The shared harness
 * account's doc carries months of prefs and is never recreated — so the filled fixture lives on
 * its own account instead.
 */
export const PRO_EMAIL = "msv12-pro@scriptally.test";
export const PRO_NAME = "Ashe Merren";
export const EMPTY_EMAIL = "msv12-empty@scriptally.test";
export const EMPTY_NAME = "Rowan Voss";

/** Expected per-version query counts through the package edge (see manuscriptSummary.ts):
 *  bv-3 ← pkg-1 ← q1,q2 (Queried ×2), q3 (Partial Requested), q4 (Full Requested)
 *  bv-2 ← pkg-2 ← q5 (Full Sent), q6 (Rejected → closed)
 *  bv-1 ← nothing (no package states it)
 *  q7 (pkg-0, no version) and q8 (no package) belong to NO version row. */
export const EXPECT = {
  bv3: { queried: 2, partialRequested: 1, fullRequested: 1, packages: 1 },
  bv2: { fullSent: 1, closed: 1, packages: 1 },
  bv1: { packages: 0 },
  outsideAllVersions: ["msv12-q-7", "msv12-q-8"],
};
