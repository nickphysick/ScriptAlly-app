/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's PURPOSE-BUILT FIXTURE — the cast every lock on this page measures against.
 *
 * ⚠️ IT EXISTS BECAUSE THE HARNESS ACCOUNT IS A MONOCULTURE ON EXACTLY THE FIELDS THIS PAGE
 * DRAWS. Measured on dev before this page was rebuilt, across its 22 agents: `mswlNotes` was
 * non-empty on ZERO of them, `genres` held ONE distinct value, `socials` was empty on all 22,
 * every country was GB, every method was Email, and `materialsWanted` held three distinct
 * strings with no free-text "Other" anywhere. Every agent had been queried.
 *
 * So the wishlist's overflow, its drift, the fade, the fourth material slot, the peek's socials
 * row, the genre tint's NEGATIVE case and the "Not yet queried" tile all had no subject. A lock
 * written against that account would have gone green having measured nothing — the documented
 * "every case is the same case" fault, five times over in one pass.
 *
 * ⚠️ AND IT IS A FIXTURE, NOT A SEED. Nothing here is ever written to dev. It is mounted through
 * `ContactListLab`'s stubbed `DbContext` at `#/contact-lab`, which renders the REAL page, so a
 * measurement over it is a measurement of what the app serves — not of a reconstruction.
 *
 * ⚠️ EVERY ROW IS HERE FOR A NAMED CASE, and `CONTACT_FIXTURE_CASES` states which. A fixture whose
 * rows are "some plausible agents" drifts into a monoculture the moment somebody edits one; a
 * fixture whose rows each answer a question fails visibly when a question stops being answered.
 * `contactFixture.test.ts` asserts the cases hold, so the fixture cannot quietly lose its variety.
 */
import { Agent, Manuscript, Query, QueryStatus, SubmissionMethod, SubmissionStatus } from "../../types";

/** The manuscript the page reads its primary genre from — the genre-match tint's subject. */
export const FIXTURE_GENRE = "Thriller";

const ms = (id: string, title: string, genre: string): Manuscript => ({
  id, userId: "fix", title, genre, subGenres: [], ageCategory: "Adult", wordCount: 90000,
  logline: "", comps: [], status: "Querying", statusChangedDate: "2026-01-01T00:00:00.000Z",
  notes: "", bookVersions: [],
} as unknown as Manuscript);

export const CONTACT_FIXTURE_MANUSCRIPTS: Manuscript[] = [ms("fix-ms1", "The Long Way Down", FIXTURE_GENRE)];

/* ── the wishlists, by length ───────────────────────────────────────────────────────────────
   ⚠️ THE LONG ONE IS THE INSTRUMENT, so its length is deliberate rather than decorative: it must
   overflow the SHORTEST card the three-column rule produces at the content cap (~401px), which is
   the width the overflow lock measures at. Shortening it silently disarms that lock. */
const MSWL_LONG =
  "Voice-led novels with an unreliable narrator, and anything set in a place I have never been. " +
  "I would love a family saga that isn't sentimental, and I am always looking for a comic novel " +
  "that earns its ending. I am drawn to books about work — what people do all day, and what it " +
  "costs them — and to novels that treat a marriage as seriously as they treat a murder. " +
  "Not for me: high fantasy, thrillers with a serial killer at the centre, anything that opens " +
  "with a dream, or a prologue in italics. If you are not sure, send it anyway; I would rather " +
  "read the first page of something surprising than the tenth of something safe.";

const MSWL_TWO_LINES = "High-concept suspense with a hook I can say in one sentence.";

const agent = (a: Partial<Agent> & Pick<Agent, "id" | "name">): Agent => ({
  userId: "fix", agency: "", email: "", website: "", genres: [], mswlNotes: "",
  submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [], dateAdded: "2026-08-01T00:00:00.000Z",
  lastCheckedDate: "2026-08-01T00:00:00.000Z", notes: "",
  ...a,
} as Agent);

/**
 * The cast. Each row's comment is the case it exists to carry; `CONTACT_FIXTURE_CASES` is the
 * machine-readable form of the same list, and the two are asserted against each other.
 */
export const CONTACT_FIXTURE_AGENTS: Agent[] = [
  /* THE OVERFLOW CASE — the longest wishlist, three genres of which one is the manuscript's, a
     non-empty Other, two socials, and a stated response window. The Phase 2 lock's subject. */
  agent({
    id: "fx-long", name: "Aisha Kapoor", agency: "The Lantern Agency",
    email: "aisha@lanternagency.co.uk", website: "lanternagency.co.uk/submissions",
    city: "Bristol", country: "GB",
    genres: [FIXTURE_GENRE, "Literary fiction", "Historical fiction"],
    mswlNotes: MSWL_LONG, starRating: 4, responseTimeWeeks: 6, noResponseMeansNo: true,
    materialsWanted: ["Query letter", "Synopsis (1 pages)", "First 50 pages", "Comparable titles"],
    socials: [{ platform: "X / Twitter", handle: "@aishareads" }, { platform: "Bluesky", handle: "@aishakapoor.bsky.social" }],
  }),
  /* THE TWO-LINE CASE — a wishlist that does not overflow, so the fade and the drift must BOTH
     stay off. Without it the overflow lock could pass on a card that always shows a fade. */
  agent({
    id: "fx-two", name: "Sophie Dunn", agency: "Curtis Vane",
    email: "sdunn@curtisvane.com", website: "curtisvane.com",
    city: "New York", country: "US", /* the non-GB country */
    genres: [FIXTURE_GENRE, "Commercial fiction"],
    mswlNotes: MSWL_TWO_LINES, starRating: 4, responseTimeWeeks: 12,
    submissionMethod: SubmissionMethod.POST, /* the Post method */
    materialsWanted: ["Query letter", "First 1 chapters"],
    socials: [],
  }),
  /* THE ABSENT CASE — no wishlist at all, so the empty line renders; a SINGLE matching genre;
     no Other, so exactly three material slots; no socials, so the peek's empty row renders. */
  agent({
    id: "fx-none", name: "Eleanor Whitfield", agency: "Greenfield Literary",
    email: "queries@greenfieldliterary.co.uk", website: "greenfieldliterary.co.uk",
    city: "Edinburgh", country: "GB",
    genres: [FIXTURE_GENRE],
    mswlNotes: "", starRating: 3, responseTimeWeeks: 4, noResponseMeansNo: false,
    materialsWanted: ["Query letter", "Synopsis"],
    socials: [],
  }),
  /* THE NEVER-QUERIED CASE — no query references this id, so "Never queried" and the
     "Not yet queried" tile have a subject. Also the Form method, and NO matching genre at all,
     which is the tint's negative case. */
  agent({
    id: "fx-fresh", name: "Priya Raman", agency: "Halcyon Literary",
    email: "hello@halcyonliterary.com", website: "halcyonliterary.com",
    city: "London", country: "GB",
    genres: ["Book club fiction", "Saga"],
    mswlNotes: "Multi-generational stories about migration, food, and inheritance in every sense.",
    starRating: 5, responseTimeWeeks: 12, noResponseMeansNo: true,
    submissionMethod: SubmissionMethod.ONLINE_FORM, /* the Form method */
    materialsWanted: ["Query letter", "Synopsis", "First 3 chapters", "A one-page author note"],
    socials: [{ platform: "Instagram", handle: "@halcyonlit" }],
  }),
  /* THE CLOSED DOOR, NOTHING LIVE — the dim, the grey band, the disabled Log query. */
  agent({
    id: "fx-shut", name: "Marcus Ilve", agency: "Rookery & Vale",
    email: "", website: "rookeryvale.co.uk", city: "Cardiff", country: "GB",
    submissionStatus: SubmissionStatus.CLOSED,
    genres: ["Speculative fiction"], mswlNotes: "", starRating: 2, responseTimeWeeks: 6,
    materialsWanted: ["Query letter"], socials: [],
  }),
  /* ⚠️ THE CLOSED DOOR WITH A LIVE QUERY — THE CASE THE REF DOES NOT DRAW. Its two closed agents
     are both terminal, so the ref cannot say what happens here, and the app's own rule can:
     `agentCardDims` holds that a card with an active query never dims whatever the door is doing.
     Without this row that carve-out has no subject and the rule is unproved. */
  agent({
    id: "fx-shut-live", name: "Fenella Str", agency: "Brightwater Books",
    email: "fenella@brightwaterbooks.com", website: "", city: "London", country: "GB",
    submissionStatus: SubmissionStatus.CLOSED,
    genres: [FIXTURE_GENRE, "Romance"], mswlNotes: "Sweeping historicals with a romance at the centre.",
    starRating: 3, responseTimeWeeks: 6,
    materialsWanted: ["Query letter", "Synopsis"],
    socials: [{ platform: "Publishers Marketplace", handle: "Publishers Marketplace" }],
  }),
  /* THE UNRATED, UNSTATED AGENT — absence is a first-class state: no stars, no window, no
     agency. The card must say nothing rather than invent a zero. */
  agent({
    id: "fx-bare", name: "Penhallow Literary", agency: "",
    email: "submissions@penhallow.co.uk", website: "penhallowliterary.co.uk",
    city: "London", country: "GB",
    genres: ["Crime", FIXTURE_GENRE], mswlNotes: "",
    materialsWanted: ["Query letter", "Synopsis", "First 3 chapters"],
    socials: [{ platform: "X / Twitter", handle: "@penhallowlit" }],
  }),
];

const q = (id: string, agentId: string, status: QueryStatus, dateSent: string): Query => ({
  id, userId: "fix", manuscriptId: "fix-ms1", agentId, packageId: "", status, dateSent,
  personalisationNotes: "", sendMethod: SubmissionMethod.EMAIL,
} as unknown as Query);

/**
 * The queries behind the cast. Deliberately spread across the journey so the board's columns and
 * the "furthest along" derivation have variety, and deliberately SILENT on `fx-fresh`, which is
 * the never-queried case.
 */
export const CONTACT_FIXTURE_QUERIES: Query[] = [
  q("fq-1", "fx-long", QueryStatus.QUERIED, "2026-08-10T00:00:00.000Z"),
  q("fq-2", "fx-two", QueryStatus.FULL_SENT, "2026-05-02T00:00:00.000Z"),
  q("fq-3", "fx-two", QueryStatus.REJECTED, "2026-03-02T00:00:00.000Z"),
  q("fq-4", "fx-none", QueryStatus.PARTIAL_REQUESTED, "2026-08-20T00:00:00.000Z"),
  q("fq-5", "fx-shut", QueryStatus.REJECTED, "2026-02-01T00:00:00.000Z"),
  /* the live query at a closed agency — the carve-out's subject */
  q("fq-6", "fx-shut-live", QueryStatus.FULL_REQUESTED, "2026-07-01T00:00:00.000Z"),
  q("fq-7", "fx-bare", QueryStatus.OFFER, "2026-06-01T00:00:00.000Z"),
];

/**
 * The cases this fixture claims to carry, as data. `contactFixture.test.ts` re-derives each one
 * FROM THE FIXTURE and fails when a case stops being covered — so the fixture cannot lose its
 * variety to a well-meaning edit, which is the only way this file goes quietly wrong.
 */
export const CONTACT_FIXTURE_CASES = [
  "wishlist: long enough to overflow the narrowest card",
  "wishlist: two lines, no overflow",
  "wishlist: absent",
  "genres: three, one of them the manuscript's",
  "genres: a single matching genre",
  "genres: none matching",
  "materials: a non-empty Other",
  "materials: no Other",
  "socials: two",
  "socials: none",
  "history: never queried",
  "door: closed with nothing live",
  "door: closed with a live query",
  "location: a non-GB country",
  "method: Online Form",
  "method: Post",
  "absence: no stars and no stated window",
] as const;
