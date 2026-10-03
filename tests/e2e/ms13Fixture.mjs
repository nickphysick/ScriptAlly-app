/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS-v13 FIXTURE — stated once, read by the seeder and by the locks ═════════════
 *
 * `seedManuscriptsV13.mjs` writes it; `manuscriptsV13.measure.ts` asserts against it. Two copies of
 * these ids is how a seeder and a lock come to describe different accounts.
 *
 * ⚠️ TWO DEDICATED ACCOUNTS, `ms13-` PREFIXED (the v13 prompt's parallel-sessions rule). Nothing
 * else ever signs in as them, so the seeder WIPES their collections and rewrites them whole — the
 * only way a run's own writes (M5's new version, M7's saved details — both narrate a feed row)
 * cannot accumulate into the next run's Recent activity.
 *
 * ⚠️ NAMES ARE INVENTED (house rule). The mock's own sample title and author are not used.
 *
 * WHAT EACH PIECE IS FOR
 *   · three book versions, newest current ............ M5 (tiles, Current ring, footer counts)
 *   · three letters + two synopses .................... the Materials card (in-use letter first)
 *   · three comps, two in the letter, one a film ...... M4 (tags, fact numbers, the faded tab)
 *   · three packages: two sent, one unsent, one active  the Packages card (tags, faded row)
 *   · fourteen feed records on THIS book .............. M6 (seven newest, mixed types, scoped)
 *   · a second manuscript with the NEWEST record ...... M6's witness: drop the filter and it leads
 *   · a partial and a full request, unsent ............ M8 (OwedList between hero and shelf)
 */

export const FILLED_EMAIL = "ms13-filled@scriptally.test";
export const FILLED_NAME = "Isla Morven";
export const EMPTY_EMAIL = "ms13-empty@scriptally.test";
export const EMPTY_NAME = "Rowan Hale";

export const MS_ID = "ms13-ms";
export const MS_TITLE = "Harbour of Glass";
export const MS = {
  genre: "Thriller",
  ageCategory: "Adult",
  wordCount: 50000,
  logline:
    "A ferry skipper has one Saturday to find his missing brother before the tide, and the men who took him, carry the evidence out to sea.",
  setting: "West Cork, today",
  // ⚠️ NO `series` — the hero must say "Standalone", muted (v13 Phase 2).
  status: "Querying",
  statusChangedDate: "2026-03-10T12:00:00.000Z",
};

/** The second book on the account — it exists for M6 and nothing else. */
export const OTHER_MS_ID = "ms13-ms-b";
export const OTHER_MS_TITLE = "The Lantern Year";

/** Book versions, oldest first (append-only order). The newest is the current one. */
export const BV = [
  { id: "ms13-bv-1", name: "Prologue first, wilderness world building", kind: "initial", createdDate: "2026-03-03", note: "The original draft as first queried." },
  { id: "ms13-bv-2", name: "Dual timeline edit", kind: "revision", createdDate: "2026-06-14", note: "1998 chapters interleaved from chapter 3." },
  { id: "ms13-bv-3", name: "Fast-paced opening", kind: "revision", createdDate: "2026-09-02", note: "Cut the prologue; opens on the ferry." },
];
export const CURRENT_BV = "ms13-bv-3";

/**
 * Materials. Dates chosen so "the letter in use first, then newest first" (v13 §3c) produces the
 * mock's own three chips: Query letter v3 · Query letter v2 · Synopsis, 1 page.
 */
export const LETTERS = [
  { id: "ms13-let-1", versionName: "Query letter v1", wordCount: 402, createdDate: "2026-03-01T12:00:00.000Z" },
  { id: "ms13-let-2", versionName: "Query letter v2", wordCount: 355, createdDate: "2026-08-29T12:00:00.000Z" },
  { id: "ms13-let-3", versionName: "Query letter v3", wordCount: 310, createdDate: "2026-09-01T12:00:00.000Z" },
];
export const SYNOPSES = [
  { id: "ms13-syn-1", versionName: "Synopsis, 1 page", wordCount: 480, createdDate: "2026-08-20T12:00:00.000Z" },
  { id: "ms13-syn-3", versionName: "Synopsis, 3 pages", wordCount: 1420, createdDate: "2026-06-14T12:00:00.000Z" },
];

/** Packages. pkg-1 is `activePackageId`; pkg-3 has never gone out. */
export const PKGS = [
  { id: "ms13-pkg-1", packageName: "Autumn round", letter: "ms13-let-3", synopsis: "ms13-syn-1", bookVersionId: "ms13-bv-3", firstSentAt: "2026-08-05T12:00:00.000Z" },
  { id: "ms13-pkg-2", packageName: "Agents with MSWL", letter: "ms13-let-2", synopsis: "ms13-syn-3", bookVersionId: "ms13-bv-2", firstSentAt: "2026-07-01T12:00:00.000Z" },
  { id: "ms13-pkg-3", packageName: "Winter draft", letter: "ms13-let-3", synopsis: "ms13-syn-1", bookVersionId: "ms13-bv-3", firstSentAt: null },
];
export const ACTIVE_PKG = "ms13-pkg-1";

export const AGENTS = [
  { id: "ms13-agent-1", name: "Mira Kovic", agency: "Old Harbour Literary", responseTimeWeeks: 8 },
  { id: "ms13-agent-2", name: "Douglas Renner", agency: "Renner & Frost" },
  { id: "ms13-agent-3", name: "Edda Voss", agency: "Voss Literary", responseTimeWeeks: 6 },
  { id: "ms13-agent-4", name: "Theo Abara", agency: "Abara Grant Agency" },
  { id: "ms13-agent-5", name: "Sun-hee Park", agency: "Meridian Line" },
  { id: "ms13-agent-6", name: "Rosa Quintana", agency: "Quintana Books" },
  { id: "ms13-agent-7", name: "Ilse Brandt", agency: "Brandt Literary" },
];

/**
 * Queries. `steps` is each query's journey — the seeder writes it to BOTH stores (the query's own
 * log and the global feed), so the drawer, the timeline and this page's Recent activity all read
 * one history. A step with `version` carries that `bookVersionId` on its feed record.
 */
export const QUERIES = [
  { id: "ms13-q-1", ms: MS_ID, agent: "ms13-agent-1", pkg: "ms13-pkg-1", status: "Queried",
    steps: [{ status: "Queried", day: "2026-08-05" }] },
  { id: "ms13-q-2", ms: MS_ID, agent: "ms13-agent-2", pkg: "ms13-pkg-1", status: "Queried",
    steps: [{ status: "Queried", day: "2026-08-06" }] },
  { id: "ms13-q-3", ms: MS_ID, agent: "ms13-agent-3", pkg: "ms13-pkg-1", status: "Partial Requested",
    materialsRequestedType: "pages", materialsRequestedQuantity: 50,
    steps: [{ status: "Queried", day: "2026-08-07" }, { status: "Partial Requested", day: "2026-09-28" }] },
  { id: "ms13-q-4", ms: MS_ID, agent: "ms13-agent-4", pkg: "ms13-pkg-1", status: "Full Requested",
    steps: [{ status: "Queried", day: "2026-08-08" }, { status: "Full Requested", day: "2026-09-19" }] },
  { id: "ms13-q-5", ms: MS_ID, agent: "ms13-agent-5", pkg: "ms13-pkg-2", status: "Full Sent",
    steps: [{ status: "Queried", day: "2026-07-01" }, { status: "Full Requested", day: "2026-07-20" },
      { status: "Full Sent", day: "2026-09-03", version: "ms13-bv-2" }] },
  { id: "ms13-q-6", ms: MS_ID, agent: "ms13-agent-6", pkg: "ms13-pkg-2", status: "Rejected",
    steps: [{ status: "Queried", day: "2026-07-02" }, { nudge: true, day: "2026-09-10" }, { status: "Rejected", day: "2026-09-12" }] },
  /* no package: a query no version row may count (the one edge) */
  { id: "ms13-q-7", ms: MS_ID, agent: "ms13-agent-7", pkg: "", status: "Queried",
    steps: [{ status: "Queried", day: "2026-03-10" }] },
  /* ⚠️ THE OTHER BOOK'S QUERY, and its send is the NEWEST record on the account — so a page that
     forgot to scope Recent activity would lead with it (M6's mutation proves exactly that). */
  { id: "ms13-q-8", ms: OTHER_MS_ID, agent: "ms13-agent-1", pkg: "", status: "Queried",
    steps: [{ status: "Queried", day: "2026-10-01" }] },
];

/** The version save, narrated the way the app narrates every manuscript write (no version named). */
export const MS_UPDATED = { id: "ms13-act-msupd", day: "2026-09-02" };

export const COMPS = [
  { title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021,
    note: "A single day on the water, told close to one narrator.", inQuery: true, source: "user" },
  { title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023,
    note: "Coastal setting, a missing brother, short chapters.", inQuery: true, source: "user" },
  { title: "Kestrel Hour", media: "film", year: 2019, inQuery: false, source: "user" },
];

/** What the page must show — derived by hand from the above, and asserted against the render. */
export const EXPECT = {
  /* versionUsage through the package edge — queried · requested · sent, and the package count */
  usage: {
    "ms13-bv-3": { queried: 2, requested: 2, sent: 0, packages: 2 },
    "ms13-bv-2": { queried: 0, requested: 0, sent: 1, packages: 1 },
    "ms13-bv-1": { queried: 0, requested: 0, sent: 0, packages: 0 },
  },
  versionOrder: ["ms13-bv-3", "ms13-bv-2", "ms13-bv-1"],
  compFact: { inLetter: 2, total: 3 },
  /* the seven newest records on THIS book, newest first, by query (null = the manuscript write) */
  activityTop7: ["ms13-q-3", "ms13-q-4", "ms13-q-6", "ms13-q-6", "ms13-q-5", null, "ms13-q-4"],
  activityTotal: 14,
  owed: ["ms13-q-3", "ms13-q-4"],
};
