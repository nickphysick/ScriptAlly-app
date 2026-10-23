/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ BOOK VERSIONS — named orderings and revisions of the manuscript ═══════════════════════════
 *
 * Design authority: design-refs/manuscript-loop-design.html.
 *
 * ⚠️ NOT `ManuscriptVersion`, WHICH IS A MATERIAL. See the note on `BookVersion` in types.ts: the
 * word "version" already meant a query letter / synopsis / sample-pages record living in the
 * `versions` subcollection, and this module is about the BOOK — "Prologue-first",
 * "Worldbuilding-first", "Post-R&R". Every identifier here says `bookVersion` for that reason.
 *
 * ⚠️ SUPERSEDED — "PACKAGES NEVER REFERENCE A VERSION DIRECTLY" HAS NOT BEEN TRUE SINCE THE PACKAGES WORK.
 * A package states its own version (`SubmissionPackage.bookVersionId`, and each `PackageEdition`
 * carries one); the sample's `bookVersionId` is the older route. Versions v2 (design-refs/versions-v2,
 * D4) also stores the version on the QUERY. The one reader of "which version went with this query" is
 * `resolveQueryVersion` in lib/versionsV2.ts, in that order: the query's own, then its package's
 * (credited edition, then the package, then its sample), then Original by date, else unrecorded.
 *
 * ⚠️ AND `recomputeQuery` IS UNTOUCHED. A version is payload on an activity, never a determinant of
 * state. Nothing in this module is read by the derivation, and nothing in it may become so.
 *
 * ⚠️ COUNTS HERE, RATES ON THE VERSIONS PAGE (D15/D17, reversed in part by Versions v2 R5). The
 * functions in THIS module still return counts: they serve the Manuscripts and packages surfaces.
 * The Versions page shows "asked for more" percentages — but only from 5 sent, below which it shows
 * counts and "Too early to tell" — and that rule lives in lib/versionsV2.ts (`MIN_SENT_FOR_RATE`).
 *
 * ⚠️ AND `versionsActive` (two or more versions) IS NO LONGER THE FEATURE'S ONLY GATE. It still
 * governs the Query Centre's chips and the Manuscripts surfaces; the Versions page exists for every
 * Pro writer and shows its empty state with none (Versions v2, false premise d).
 */
import { QueryStatus, ComponentType } from "../types";
import type { Activity, BookVersion, BookVersionKind, Manuscript, ManuscriptVersion, Query } from "../types";

/**
 * The append cap, on the pattern `MAX_GOAL_ENTRIES` already ships.
 *
 * ⚠️ ARTEFACT-LOCKED TO `firestore.rules`, which caps the list at the same number. If this moves,
 * that moves in the same commit or every write past the old cap is denied with no message.
 */
export const MAX_BOOK_VERSIONS = 50;

/** The grey kind chip's wording (D7). Sentence case — these are labels, not system tags. */
export const KIND_LABEL: Record<BookVersionKind, string> = {
  initial: "Initial",
  reordering: "Reordering",
  revision: "Revision",
};

/** The kinds a writer may choose, in the order the ghost row offers them. */
export const BOOK_VERSION_KINDS: readonly BookVersionKind[] = ["initial", "reordering", "revision"];

/** Stored versions, oldest first, defended against a missing or malformed field. */
export const bookVersionsOf = (ms: Pick<Manuscript, "bookVersions"> | null | undefined): BookVersion[] =>
  Array.isArray(ms?.bookVersions) ? ms!.bookVersions.filter((v) => !!v && typeof v.id === "string") : [];

/**
 * ⚠️ THE GATE FOR THE MANUSCRIPTS AND QUERY CENTRE SURFACES (D8, D18, D22, and Part E's chips) — NOT
 * FOR THE VERSIONS PAGE, which since Versions v2 exists for every Pro writer with any number of versions.
 *
 * A writer with fewer than two versions sees NONE of this: no panel, no dropdown, no chip, no
 * column. One version is just the book, and a panel listing it teaches a vocabulary the writer has
 * no use for. Stated once here so a new surface cannot invent its own threshold — which is exactly
 * how two surfaces end up disagreeing about whether a feature is switched on.
 */
export const versionsActive = (ms: Pick<Manuscript, "bookVersions"> | null | undefined): boolean =>
  bookVersionsOf(ms).length >= 2;

/**
 * The newest version by date, ties broken by list order (append-only, so later is newer).
 *
 * ⚠️ "LATEST" IS A DATE FACT, NOT A VERDICT (D10). It says which one you made most recently and
 * nothing about which one is better, working, or the one to send. No caller may dress it as a
 * recommendation, and nothing in this module ranks versions.
 *
 * ⚠️ RANKING EXISTS — ON THE VERSIONS PAGE'S TRACKING & PERFORMANCE SECTION ONLY (Versions v2). There
 * versions are sorted, ranked in a league table, and one with 5 or more sent may be marked "Leading".
 * That lives in lib/versionsV2.ts; this module still ranks nothing.
 */
export const latestVersion = (versions: readonly BookVersion[]): BookVersion | null => {
  if (versions.length === 0) return null;
  /* ⚠️ THE ACCUMULATOR IS `newest`, AND THE FIRST NAME IT HAD WAS A VERDICT WORD — caught by this
     module's own lock on its first run, inside the one function whose entire point is that it ranks
     nothing. A reader skimming `latestVersion` for what "latest" means would have found a ranking
     word in its body. The lock reads prose as well as code (see bookVersions.test.ts), so this note
     cannot quote the word it is about. */
  return versions.reduce((newest, v) => (v.createdDate >= newest.createdDate ? v : newest));
};

/** Look one up by id. Returns null for an unknown id rather than throwing — a stored reference can
 *  outlive nothing here (versions are append-only) but an imported or hand-edited record can. */
export const bookVersionById = (
  versions: readonly BookVersion[],
  id: string | undefined | null,
): BookVersion | null => (id ? versions.find((v) => v.id === id) ?? null : null);

/**
 * ⚠️ SAMPLE PAGES ONLY (D2), ENFORCED HERE RATHER THAN TRUSTED AT EVERY CALL SITE. A letter or a
 * synopsis does not excerpt an ordering of the book, so a `bookVersionId` on one is meaningless —
 * and a stored one (an import, a component type changed after the fact) is IGNORED rather than
 * rendered. Every reader goes through this function; none reads `m.bookVersionId` directly.
 */
export const bookVersionOf = (m: Pick<ManuscriptVersion, "componentType" | "bookVersionId">): string | null =>
  m.componentType === ComponentType.SAMPLE_PAGES && m.bookVersionId ? m.bookVersionId : null;

/**
 * The R&R this version came out of, if the activity is still there (D10).
 *
 * ⚠️ IT DEGRADES TO NOTHING. A link to an event that has been deleted or re-filed renders no chip
 * rather than a dead one — the correction pack can move an activity to another query, so the id is
 * a pointer to a fact that may since have moved. The version itself is unaffected: it is a real
 * version whether or not the app can still show what prompted it.
 */
export const rrLink = (
  v: Pick<BookVersion, "fromActivityId">,
  activities: readonly Activity[],
): Activity | null =>
  v.fromActivityId ? activities.find((a) => a.id === v.fromActivityId) ?? null : null;

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE WRITES — append-only, and one module owns the shape
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Append one version, bounded.
 *
 * ⚠️ APPEND-ONLY IS THE MODEL, NOT A PRECAUTION (D9). There is no remove: a sample or a send that
 * references a version must keep resolving, and "this ordering was never real" and "I stopped using
 * it in May" are different histories. A revision is a NEW version, never an edit of an old one.
 */
/**
 * The id for a new ordering.
 *
 * ⚠️ ONE GENERATOR. This lived privately in `BookVersionsPanel` and the packages builder needed the
 * same thing; a second copy is a second answer to what a version id looks like, and the `bv-` prefix
 * is what makes one recognisable in a document by eye.
 */
export const newBookVersionId = (): string =>
  `bv-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

export const appendBookVersion = (
  existing: readonly BookVersion[],
  entry: BookVersion,
): BookVersion[] => {
  const next = [...existing, entry];
  return next.length <= MAX_BOOK_VERSIONS ? next : next.slice(next.length - MAX_BOOK_VERSIONS);
};

/**
 * Rename, and re-note. The ONLY permitted edit (D9, and the fence).
 *
 * ⚠️ AN EMPTY NOTE OMITS THE KEY rather than storing `""` — absent means unwritten, which is the
 * convention `elevatorPitch` and friends already follow. Storing an empty string would make "I
 * cleared the note" and "I never wrote one" indistinguishable.
 *
 * ⚠️ AND IT TOUCHES NOTHING ELSE. `kind`, `createdDate` and `fromActivityId` are facts about when
 * the version was made and why; a rename is a change to its label. A caller wanting to correct a
 * kind is asking for an edit this model does not have — say so rather than widening this.
 */
export const renameBookVersion = (
  existing: readonly BookVersion[],
  id: string,
  name: string,
  note: string,
): BookVersion[] =>
  existing.map((v) => {
    if (v.id !== id) return v;
    const trimmed = note.trim();
    const { note: _drop, ...rest } = v;
    return trimmed ? { ...rest, name: name.trim(), note: trimmed } : { ...rest, name: name.trim() };
  });

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE DERIVATIONS — nothing below is stored
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Sample materials carrying this version. The panel's "N samples" (D7). */
export const samplesOfVersion = (
  versionId: string,
  materials: readonly ManuscriptVersion[],
): ManuscriptVersion[] => materials.filter((m) => bookVersionOf(m) === versionId);

/**
 * ⚠️ THE AGENT IS HOLDING WHEN THE SEND IS THE LAST THING THAT HAPPENED. `Partial Sent` and
 * `Full Sent` are precisely the two statuses meaning "it is with them and they have not come back";
 * the moment they do, the status moves to R&R, Offer or a close. So this is the status pair and not
 * a hand-kept list of "active" statuses that would drift from the pipeline.
 */
export const HOLDING_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_SENT,
  QueryStatus.RESUBMITTED,
]);

export interface Holding {
  query: Query;
  /** `FULL` or `PARTIAL` — what they have, from the status alone. */
  what: "FULL" | "PARTIAL";
  /** The version they hold, or null when the send predates the feature or carries none. */
  versionId: string | null;
}

/**
 * Who currently holds a full or a partial, and which version each holds (D16).
 *
 * ⚠️ DERIVED FROM THE ACTIVITY LOG, NOTHING STORED. The version is read off the LATEST send event
 * for that query — a query can be sent a partial and later a full, and what they hold is the last
 * thing that went. Reading the first would answer a question nobody asked.
 */
export const holdings = (
  queries: readonly Query[],
  activities: readonly Activity[],
): Holding[] =>
  queries
    .filter((q) => HOLDING_STATUSES.has(q.status))
    .map((q) => {
      const sends = activities
        .filter((a) => a.queryId === q.id && !!a.bookVersionId && isSendStatus(a.resultingStatus))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const last = sends[sends.length - 1];
      return {
        query: q,
        what: q.status === QueryStatus.FULL_SENT || q.status === QueryStatus.RESUBMITTED ? ("FULL" as const) : ("PARTIAL" as const),
        versionId: last?.bookVersionId ?? null,
      };
    });

/** The two send statuses a version may ride on (D3). No other activity takes one. */
export const isSendStatus = (s: QueryStatus | undefined): boolean =>
  s === QueryStatus.PARTIAL_SENT || s === QueryStatus.FULL_SENT || s === QueryStatus.RESUBMITTED;

/**
 * How many holders hold something other than the latest version (D17).
 *
 * ⚠️ A COUNT AND NOTHING MORE. No prompt to chase anyone, no recommended opening, no verb. Whether
 * to send an update is a judgement about a relationship and the app does not make it — which is why
 * this returns a number rather than a sentence.
 *
 * ⚠️ A HOLDER WITH NO RECORDED VERSION IS NOT COUNTED. "I do not know what they have" is not the
 * same fact as "they have an older one", and folding the two would state something untrue about a
 * send that simply predates the feature.
 */
export const holdingEarlier = (hs: readonly Holding[], latestId: string | null): number =>
  latestId === null ? 0 : hs.filter((h) => h.versionId !== null && h.versionId !== latestId).length;

export interface VersionRequests {
  versionId: string;
  /** Packages stating this version — read from the package, never inherited through a sample. */
  packages: number;
  /** Queries sent with any of those packages. */
  sent: number;
  /** Those sends where the agent asked for more — an event count, never a rate (D15). */
  requests: number;
}

/**
 * "Requests by opening" (D15) — the question that started all this, answered as counts.
 *
 * ⚠️ THE AGGREGATION IS PACKAGE → QUERY NOW. It used to be sample → package → query, because a
 * package carried no version and the only thing that knew was whichever sample happened to be in
 * its sample slot. A package states its own version (D1), so the front hop is gone: a package's
 * scorecard IS its version's scorecard for that letter and synopsis.
 *
 * ⚠️ AND THE `samples` FIGURE WENT WITH IT, rather than being kept at zero. Sample pages is not a
 * material type any more, so "2 samples" would be a count of archived documents nothing sends —
 * a true number about a thing that no longer participates, which is worse than an absent one
 * because it looks like a live figure.
 */
export const requestsByVersion = (
  version: BookVersion,
  packages: readonly { id: string; bookVersionId?: string }[],
  queries: readonly Query[],
  isRequestFn: (q: Query) => boolean,
): VersionRequests => {
  const pkgIds = new Set(packages.filter((p) => p.bookVersionId === version.id).map((p) => p.id));
  const mine = queries.filter((q) => !!q.packageId && pkgIds.has(q.packageId));
  return {
    versionId: version.id,
    packages: pkgIds.size,
    sent: mine.length,
    requests: mine.filter(isRequestFn).length,
  };
};

/**
 * The packages that state NO version — D3's permanent bucket, as a row of its own.
 *
 * ⚠️ IT IS NOT FOLDED INTO A KNOWN VERSION AND IT IS NOT A ZERO. Every package written before the
 * version slot has none, and a sent package can never gain one, so this row is permanent rather
 * than transitional — and the sends it holds are real sends whose opening nobody can name. Adding
 * them to a version would attribute requests that arrived on something else; dropping them would
 * make the panel's totals disagree with the writer's own list of packages.
 */
export const unrecordedVersion = (
  packages: readonly { id: string; bookVersionId?: string }[],
  queries: readonly Query[],
  isRequestFn: (q: Query) => boolean,
): Omit<VersionRequests, "versionId"> => {
  const pkgIds = new Set(packages.filter((p) => !p.bookVersionId).map((p) => p.id));
  const mine = queries.filter((q) => !!q.packageId && pkgIds.has(q.packageId));
  return { packages: pkgIds.size, sent: mine.length, requests: mine.filter(isRequestFn).length };
};

/**
 * The panel's meta line: `2 SAMPLES · HELD BY 4 AGENTS` (D7).
 *
 * ⚠️ A ZERO IS STATED, NOT OMITTED. "0 samples" is a true count and the fact the writer needs when
 * they have named a version and not yet attached anything to it; a row that silently drops the
 * clause reads as though the number were unknown.
 */
export const versionMeta = (samples: number, held: number): string[] => [
  `${samples} sample${samples === 1 ? "" : "s"}`,
  `held by ${held} agent${held === 1 ? "" : "s"}`,
];

/**
 * ⚠️ VERSIONS NEVER COUNT AGAINST THE MANUSCRIPT LIMIT (D6). Stated as a function so the claim is
 * testable rather than being an absence somebody has to notice: whatever the tier check counts, it
 * counts manuscripts, and this is the identity that says so.
 */
export const manuscriptsForTier = (mss: readonly Manuscript[]): number => mss.length;

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE TWO TRACKING PANELS (Part D) — both derived, nothing stored
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

export interface OpeningRow {
  id: string;
  name: string;
  /** `2 samples · 3 packages` — where this opening has travelled. */
  where: string;
  /** `2 requests from 18 sent` — an event count, never a rate. */
  meta: string;
  /** Bar geometry, mirroring `requestsByMaterial`'s: a share of the busiest row. */
  sentPct: number;
  inPct: number;
}

const pct = (n: number, d: number): number => (d <= 0 ? 0 : Math.round((n / d) * 100));

/**
 * ⚠️ ONE VOCABULARY FOR ONE STATE. The rail's chip and the `Requests by opening` row both describe
 * a version nothing has sent, and they said it in two different ways — the chip in words, the row
 * as `0 packages`. Stated once here so a third surface cannot invent a third.
 */
export const NOT_IN_A_PACKAGE = "not yet in a package";
export const NOT_YET_SENT = "not yet sent";
/**
 * ⚠️ ONE FACT, TWO REGISTERS, AND THEY MOVE TOGETHER. The panel's cell is prose in a table — `not
 * yet in a package` — while the builder card's foot is a two-slot grammar whose right-hand column
 * reads `In 2` / `In 1` / `Not in a package`. A sentence fragment in that column is what put
 * `Latest · not yet in a package` into one slot and made it the only card on the page that wrapped.
 * They are declared adjacent so that changing what the app calls this state changes both.
 */
export const NOT_IN_A_PACKAGE_USE = "Not in a package";


/**
 * "Requests by opening" (D15).
 *
 * ⚠️ THE BAR IS A PROPORTION OF THE BUSIEST ROW, NOT A RATE, and the number beside it is the claim.
 * It exists so the eye can rank three openings at a glance. The same construction as
 * `requestsByMaterial` one level down, deliberately — two ways of drawing the same kind of count
 * would eventually disagree about what a full bar means.
 *
 * ⚠️ AND EVERY VERSION IS LISTED, INCLUDING ONES NOTHING HAS GONE OUT WITH. `requestsByMaterial`
 * drops its empty rows; this must not. "Nothing has been sent with this opening yet" is the single
 * most useful thing the panel can say to somebody who has just made a version, and a row that
 * vanishes says nothing at all.
 */
export const openingRows = (
  versions: readonly BookVersion[],
  packages: readonly { id: string; bookVersionId?: string }[],
  queries: readonly Query[],
  isRequestFn: (q: Query) => boolean,
): OpeningRow[] => {
  const raw = versions.map((v) => ({ v, r: requestsByVersion(v, packages, queries, isRequestFn) }));
  /**
   * ⚠️ THE UNRECORDED ROW IS PART OF THE SET, NOT AN APPENDIX (D3/D15) — so it scales against the
   * same maximum as every named version. Computing it afterwards, against its own max, would draw a
   * full-width bar beside a named version's half-width one on a smaller number.
   *
   * ⚠️ AND IT RENDERS ONLY WHEN IT HOLDS SOMETHING. A `Not recorded` row on a manuscript where
   * every package states its version is a row about nothing; the bucket is permanent, its ROW is
   * conditional on there being packages in it.
   */
  const un = unrecordedVersion(packages, queries, isRequestFn);
  const all = un.packages > 0
    ? [...raw, { v: { id: UNRECORDED_VERSION_ID, name: UNRECORDED_VERSION }, r: { ...un, versionId: UNRECORDED_VERSION_ID } }]
    : raw;
  const max = Math.max(...all.map((x) => x.r.sent), 1);
  return all.map(({ v, r }) => ({
    id: v.id,
    name: v.name,
    /* ⚠️ NO SAMPLE COUNT. It used to read `2 samples · 1 package`; sample pages is not a material
       any more, so the samples half would be counting archived documents nothing sends. */
    /**
     * ⚠️ AN ABSENCE IS STATED IN WORDS, NEVER AS A ZERO — and in the SAME words the rail's chip
     * uses, so the two surfaces cannot come to describe one state differently. The row read
     * `0 packages · 0 requests from 0 sent`: three true figures which together say a version has
     * been tried and drew nothing, about one that has never been in a package.
     *
     * ⚠️ AND THE TWO CLAUSES FAIL SEPARATELY. A version can be in a package that has not gone out
     * — `1 package · not yet sent` is a real and different state from `not yet in a package`, and
     * collapsing them would hide the fact that something is ready and waiting.
     */
    where: r.packages > 0
      ? `${r.packages} package${r.packages === 1 ? "" : "s"}`
      : NOT_IN_A_PACKAGE,
    meta: r.sent > 0
      ? `${r.requests} request${r.requests === 1 ? "" : "s"} from ${r.sent} sent`
      : NOT_YET_SENT,
    sentPct: pct(r.sent, max),
    inPct: pct(r.requests, r.sent),
  }));
};

/** The row a versionless package lands in. A name the writer reads, and an id nothing else uses. */
export const UNRECORDED_VERSION = "Not recorded";
export const UNRECORDED_VERSION_ID = "__unrecorded__";

export interface HoldingRow {
  queryId: string;
  agent: string;
  /** `FULL · sent 02 Aug` — what they have and when it went, as one string. */
  what: string;
  /**
   * The two halves of `what`, separately — the book profile's Overview tables them as their own
   * columns and the packages panel keeps the joined string.
   *
   * ⚠️ ADDITIVE, AND DERIVED HERE RATHER THAN SPLIT BY THE CALLER. Parsing `what` back apart on
   * `·` would be a second derivation of the same two facts, and it would break the day a date
   * format contained one.
   *
   * ⚠️ AND `holds` SAYS `Full manuscript` OR `Partial` AND NOTHING MORE. The ref writes
   * `Partial · 50 pp`; the page count of what was sent is not on the holding — the status is all
   * the record carries — so stating one would be inventing a quantity.
   */
  holds: "Full manuscript" | "Partial";
  /** The send date, already formatted, or null where the send is undated. */
  sentDay: string | null;
  /**
   * The ASK that led to this send — `Full requested` / `Partial requested`, and when it came.
   *
   * ⚠️ `askedOn` IS NULL WHERE THE LOG DOES NOT CARRY THE REQUEST, and the caller then states the
   * ask without a date rather than dating it from the send. They are different events: an agent
   * asked in May and the writer sent in June, and stamping one with the other's date is the shape
   * of fabrication this file already refuses for an unrecorded version.
   */
  askedFor: "Full requested" | "Partial requested";
  askedOn: string | null;
  /** The version they hold, or null where the send predates the feature. */
  versionName: string | null;
}

/**
 * "Who holds what" (D16) — the six-months-later question, and on its own reason enough to build the
 * feature. When an agent surfaces after months of silence, this answers "what exactly are they
 * reading?"
 *
 * ⚠️ THE SENTENCE ABOVE IS WRITTEN AROUND A WORD, and that is the module's verdict-word ban working
 * rather than failing. It reads comments as well as code — deliberately, because prose telling a
 * future reader which opening to prefer is as much a verdict as code returning one — so the price
 * is that this file cannot use those words even about ITSELF. Second time it has bitten; both times
 * the fix was the prose.
 *
 * ⚠️ ENTIRELY DERIVED. Nothing here is stored: the holders come from query status, the version from
 * the latest send event on the log, and the agent's name from the agent record. There is no field
 * anywhere in the app that says "R. Osei has the prologue-first full".
 *
 * ⚠️ AND IT IS SORTED NEWEST FIRST, by the send that put the material in their hands — which is the
 * order the question is asked in. Undated sends sort last rather than to the top, where a missing
 * date would otherwise read as "just now".
 */
export const holdingRows = (
  queries: readonly Query[],
  activities: readonly Activity[],
  versions: readonly BookVersion[],
  agentName: (agentId: string) => string,
  formatDay: (iso: string) => string,
): HoldingRow[] =>
  holdings(queries, activities)
    .map((h) => {
      const sent = sendDate(h.query, activities);
      const sentDay = sent ? formatDay(sent) : null;
      /* The EARLIEST matching request rung — an arrival, so a re-recorded event must not move it. */
      const askStatus = h.what === "FULL" ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED;
      const asks = activities
        .filter((a) => a.queryId === h.query.id && a.resultingStatus === askStatus && !!a.date)
        .map((a) => a.date)
        .sort();
      return {
        queryId: h.query.id,
        agent: agentName((h.query as { agentId?: string }).agentId ?? ""),
        what: sentDay ? `${h.what} · sent ${sentDay}` : h.what,
        holds: h.what === "FULL" ? ("Full manuscript" as const) : ("Partial" as const),
        sentDay,
        askedFor: h.what === "FULL" ? ("Full requested" as const) : ("Partial requested" as const),
        askedOn: asks[0] ? formatDay(asks[0]) : null,
        versionName: bookVersionById(versions, h.versionId)?.name ?? null,
        _sort: sent ?? "",
      };
    })
    .sort((a, b) => (a._sort < b._sort ? 1 : a._sort > b._sort ? -1 : 0))
    .map(({ _sort, ...row }) => row);

/** The date of the send that put the material in the agent's hands — the LATEST one, as above. */
const sendDate = (q: Query, activities: readonly Activity[]): string | null => {
  const sends = activities
    .filter((a) => a.queryId === q.id && isSendStatus(a.resultingStatus))
    .map((a) => a.date)
    .sort();
  return sends[sends.length - 1] ?? null;
};

/**
 * D17 — "four of five hold a version earlier than your latest", as a COUNT and nothing more.
 *
 * ⚠️ NO VERB, NO PROMPT, NO RECOMMENDED ACTION. Whether to send an update is a judgement about a
 * relationship and the app does not make it. Returns null when there is nothing to say, so the
 * caller renders no line rather than a line saying zero.
 */
export const earlierLine = (
  queries: readonly Query[],
  activities: readonly Activity[],
  versions: readonly BookVersion[],
): string | null => {
  /* ⚠️ IT COUNTS THROUGH `holdingEarlier`, NOT BY COMPARING NAMES. An earlier draft of this
     compared each row's version NAME against the latest one's — which is wrong the moment two
     versions share a name, and names are writer-supplied and renameable. Ids are the identity;
     the name is a label. Reusing the tested function also means the panel's sentence and the
     count it states can never come apart. */
  const hs = holdings(queries, activities);
  const earlier = holdingEarlier(hs, latestVersion(versions)?.id ?? null);
  if (earlier === 0) return null;

  /**
   * ⚠️ THE DENOMINATOR EXCLUDES UNRECORDED HOLDERS, AND THIS WAS WRONG UNTIL REAL DATA SHOWED IT.
   *
   * `holdingEarlier` already refuses to count a holder whose version is unknown — "I do not know
   * what they have" is not "they have an older one". That rule was applied to the numerator and NOT
   * to the denominator, so on the live fixture the panel read **"2 of 4 hold a version earlier than
   * your latest"** when only two of the four had any version recorded at all. Arithmetically true;
   * read as "the other two hold the latest", which is false. The other two are unknown.
   *
   * Where every holder is recorded the sentence is the ref's, unchanged. Where some are not, the
   * unrecorded ones get their own clause rather than being folded into a total they cannot support.
   */
  const unknown = hs.filter((h) => h.versionId === null).length;
  if (unknown === 0) return `${earlier} of ${hs.length} hold a version earlier than your latest.`;
  return `${earlier} hold a version earlier than your latest; ${unknown} ${unknown === 1 ? "is" : "are"} unrecorded.`;
};

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   UNRECORDED — the samples and holders that name no version
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * How many agents hold a sample whose opening was never recorded.
 *
 * ⚠️ ITS OWN FIGURE, NEVER ADDED TO A NAMED VERSION'S. `holdingEarlier` already refuses to count an
 * unrecorded holder as holding an EARLIER version — "I do not know what they have" is not "they
 * have an older one" — and this is the other half of that rule: the page has to be able to SAY how
 * many it does not know about, or the silent alternative is a versions list that names two holders
 * and says nothing about the third.
 *
 * The failure this exists to prevent is always flattering and always silent: folding makes a
 * version look busier than it is, dropping makes the page state fewer samples than exist, and both
 * leave every total looking sane.
 */
export const unrecordedHolders = (
  queries: readonly Query[],
  activities: readonly Activity[],
): number => holdings(queries, activities).filter((h) => h.versionId === null).length;

export interface UnattributedOpening {
  /** Sample materials carrying no book version at all. */
  samples: number;
  /** Packages built from any of them. */
  packages: number;
  /** Queries sent with any of those packages. */
  sent: number;
}

/**
 * ⚠️ `unattributedOpening` IS RETIRED (D15), AND ITS SUBJECT IS WHAT WENT — not its usefulness.
 *
 * It reconciled the SAMPLES whose ordering was never recorded against the ones that named a
 * version, so the panel could say `2 recorded · 1 unrecorded sample` without implying every sample
 * belonged to an opening. Sample pages is no longer a material type, so there are no samples to
 * reconcile; and the aggregation no longer walks materials at all.
 *
 * The question it answered has moved up a level and is answered by `unrecordedVersion` above: the
 * PACKAGES that state no version. Same honesty, one hop shorter — and it is a permanent bucket now
 * rather than a backlog, because a sent package can never gain a version (D3).
 */

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   VERSIONS v2 — the tree, Original, In use, archive and delete (design-refs/versions-v2, §DATA D1–D9)
   ══════════════════════════════════════════════════════════════════════════════════════════════

   ⚠️ THIS SECTION REVERSES THREE OF THE HEADER'S RULES FOR THE VERSIONS PAGE, by the Versions v2 ruling:
   - "append-only, there is no remove" (D9 above): a version can now be ARCHIVED (sent) or DELETED (never sent), each
     with Undo. A delete never orphans: its children start from its parent instead.
   - "a revision is a NEW version, never an edit of an old one": a version's name, changes and word count can be
     edited; where it starts from can be edited only while it has never gone out.
   - `kind` and the single `note` are retired from the UI; "What changed" is a list (1–8 × 1–80 characters).
   Every function below is pure and returns the manuscript fields to write, so the page writes them in ONE batch and
   its Undo is a snapshot of the same three fields (`versionSnapshot`). */

export const ORIGINAL_NAME = "Original";
export const MAX_VERSION_NAME = 40;
export const MAX_CHANGES = 8;
export const MAX_CHANGE_LEN = 80;

/** One version as every Versions v2 surface reads it: numbered, parented, with its changes as a list. */
export interface V2Version {
  id: string;
  num: number;
  name: string;
  /** null only on the root (Original, or a pre-v2 first version) */
  parentId: string | null;
  changes: string[];
  original: boolean;
  archived: boolean;
  archivedDate: string | null;
  createdDate: string;
  wordCount: number | null;
  raw: BookVersion;
}

/**
 * Every version, in save order, read the v2 way (D1's legacy read). A record with no `num` takes its save order
 * (Original 0; the rest from 1), no `parentId` the version saved before it, and a `note` with no `changes` reads as
 * `changes: [note]`. Nothing here rewrites a stored record.
 */
export function readVersions(ms: Pick<Manuscript, "bookVersions"> | null | undefined): V2Version[] {
  const list = bookVersionsOf(ms);
  let next = 1;
  return list.map((v, i) => {
    const original = v.original === true;
    const num = typeof v.num === "number" ? v.num : original ? 0 : next;
    if (!original) next = Math.max(next, num) + 1;
    const prev = i > 0 ? list[i - 1] : null;
    const parentId = original ? null : v.parentId ?? (typeof v.num === "number" ? null : prev?.id ?? null);
    const changes = Array.isArray(v.changes) ? v.changes.filter((c) => typeof c === "string") : v.note ? [v.note] : [];
    return {
      id: v.id, num, name: v.name, parentId, changes, original,
      archived: v.archived === true, archivedDate: v.archivedDate ?? null,
      createdDate: v.createdDate, wordCount: typeof v.wordCount === "number" ? v.wordCount : null, raw: v,
    };
  });
}

/** The highest number ever given, so the next is one more and a deleted number is never handed out again (R9). */
export const versionSeq = (ms: Pick<Manuscript, "bookVersions" | "bookVersionSeq">): number =>
  Math.max(typeof ms.bookVersionSeq === "number" ? ms.bookVersionSeq : 0, ...readVersions(ms).map((v) => v.num), 0);

/** Every version that starts, directly or not, from `id`. */
export function descendantsOf(versions: readonly V2Version[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (p: string) => { for (const v of versions) if (v.parentId === p && !out.has(v.id)) { out.add(v.id); walk(v.id); } };
  walk(id);
  return out;
}

const norm = (s: string) => s.trim().toLowerCase();

/** R10 — 1–40 characters, unique within the manuscript ignoring case and surrounding spaces. */
export function nameProblem(name: string, versions: readonly V2Version[], selfId?: string | null): "empty" | "long" | "taken" | null {
  const t = name.trim();
  if (!t) return "empty";
  if (t.length > MAX_VERSION_NAME) return "long";
  return versions.some((v) => v.id !== selfId && norm(v.name) === norm(t)) ? "taken" : null;
}

/** R3 — trimmed, empties dropped. Validated by `changesProblem`; never silently cut to fit. */
export const cleanChanges = (list: readonly string[]): string[] => list.map((c) => c.trim()).filter(Boolean);

export function changesProblem(list: readonly string[]): "none" | "many" | "long" | null {
  const c = cleanChanges(list);
  if (!c.length) return "none";
  if (c.length > MAX_CHANGES) return "many";
  return c.some((x) => x.length > MAX_CHANGE_LEN) ? "long" : null;
}

/** The three manuscript fields a version change writes. `null` clears a key. */
export interface VersionFields {
  /** null: the key was absent and an Undo removes it again */
  bookVersions: BookVersion[] | null;
  inUseBookVersionId: string | null;
  bookVersionSeq: number | null;
}

/** The state an Undo puts back exactly — absent stays absent. */
export const versionSnapshot = (ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">): VersionFields => ({
  bookVersions: Array.isArray(ms.bookVersions) ? bookVersionsOf(ms).map((v) => ({ ...v })) : null,
  inUseBookVersionId: ms.inUseBookVersionId ?? null,
  bookVersionSeq: typeof ms.bookVersionSeq === "number" ? ms.bookVersionSeq : null,
});

export interface NewVersionInput { name: string; changes: readonly string[]; wordCount?: number | null; parentId?: string | null }

/** Where a refused write says why — the page shows the same reason the form already shows, never a silent no-op. */
export type VersionRefusal = "name" | "changes" | "parent" | "original" | "inUse" | "missing" | "cap";

/**
 * Save a version (D2, D5). With no versions on the manuscript this is the FIRST SAVE: Original is created in the
 * same write (num 0, today's date, no word count of its own — it always shows the manuscript's), and the new version
 * is num 1, starts from Original, and becomes in use. Otherwise the new version takes the next number, starts from
 * `parentId` (default: the in-use version), and becomes in use.
 */
export function saveNewVersion(
  ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">,
  input: NewVersionInput,
  today: string,
  ids: { version: string; original?: string },
): VersionFields | VersionRefusal {
  const vs = readVersions(ms);
  if (nameProblem(input.name, vs)) return "name";
  if (changesProblem(input.changes)) return "changes";
  const wc = typeof input.wordCount === "number" && input.wordCount > 0 ? Math.round(input.wordCount) : null;
  const entry = (num: number, parentId: string): BookVersion => ({
    id: ids.version, name: input.name.trim(), kind: "revision", createdDate: today, num, parentId,
    changes: cleanChanges(input.changes), ...(wc ? { wordCount: wc } : {}),
  });
  if (!vs.length) {
    const origId = ids.original ?? `${ids.version}-o`;
    const original: BookVersion = { id: origId, name: ORIGINAL_NAME, kind: "initial", createdDate: today, num: 0, original: true };
    return { bookVersions: [original, entry(1, origId)], inUseBookVersionId: ids.version, bookVersionSeq: 1 };
  }
  if (vs.length + 1 > MAX_BOOK_VERSIONS) return "cap";
  const parent = input.parentId ?? ms.inUseBookVersionId ?? vs[vs.length - 1].id;
  const p = vs.find((v) => v.id === parent);
  if (!p || p.archived) return "parent";
  const num = versionSeq(ms) + 1;
  return { bookVersions: [...bookVersionsOf(ms), entry(num, parent)], inUseBookVersionId: ids.version, bookVersionSeq: num };
}

export interface EditVersionInput { name?: string; changes?: readonly string[]; wordCount?: number | null; parentId?: string }

/**
 * Edit one version (P9). Original's name and word count are locked and it has no changes or parent (R1), so an
 * edit of Original changes nothing. `parentId` moves only while the version has never gone out (`sent` false), and
 * never to itself or a descendant (R2).
 */
export function editVersion(
  ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">,
  id: string,
  input: EditVersionInput,
  sent: boolean,
): VersionFields | VersionRefusal {
  const vs = readVersions(ms);
  const self = vs.find((v) => v.id === id);
  if (!self) return "missing";
  const snap = versionSnapshot(ms);
  if (self.original) return snap;
  if (input.name !== undefined && nameProblem(input.name, vs, id)) return "name";
  if (input.changes !== undefined && changesProblem(input.changes)) return "changes";
  if (input.parentId !== undefined && input.parentId !== self.parentId) {
    if (sent) return "parent";
    const p = vs.find((v) => v.id === input.parentId);
    if (!p || p.archived || p.id === id || descendantsOf(vs, id).has(p.id)) return "parent";
  }
  const out = vs.map((v) => {
    /* a pre-v2 record keeps reading the same: its derived number and parent are written down the first time it is edited */
    if (v.id !== id) return v.raw;
    const { note: _n, ...rest } = v.raw;
    const wc = input.wordCount === undefined ? v.wordCount : typeof input.wordCount === "number" && input.wordCount > 0 ? Math.round(input.wordCount) : null;
    const { wordCount: _w, ...base } = rest;
    return {
      ...base, num: v.num,
      name: input.name !== undefined ? input.name.trim() : v.name,
      changes: input.changes !== undefined ? cleanChanges(input.changes) : v.changes,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : v.parentId ? { parentId: v.parentId } : {}),
      ...(wc ? { wordCount: wc } : {}),
    } as BookVersion;
  });
  return { ...snap, bookVersions: out };
}

/** R7 — exactly one in use, in one write that replaces the previous value. An archived version can't be in use. */
export function setInUse(ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">, id: string): VersionFields | VersionRefusal {
  const v = readVersions(ms).find((x) => x.id === id);
  if (!v) return "missing";
  if (v.archived) return "parent";
  return { ...versionSnapshot(ms), inUseBookVersionId: id };
}

/** R8 — archive a sent version. Never Original (R1), never the one in use (R7). */
export function archiveVersion(ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">, id: string, today: string, inUseId: string | null): VersionFields | VersionRefusal {
  const v = readVersions(ms).find((x) => x.id === id);
  if (!v) return "missing";
  if (v.original) return "original";
  if (v.id === inUseId) return "inUse";
  const snap = versionSnapshot(ms);
  return { ...snap, bookVersions: bookVersionsOf(ms).map((x) => (x.id === id ? { ...x, archived: true as const, archivedDate: today } : x)) };
}

/** Bring an archived version back to the list and the comparisons. */
export function bringBackVersion(ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">, id: string): VersionFields {
  const snap = versionSnapshot(ms);
  return {
    ...snap,
    bookVersions: bookVersionsOf(ms).map((x) => {
      if (x.id !== id) return x;
      const { archived: _a, archivedDate: _d, ...rest } = x;
      return rest;
    }),
  };
}

/**
 * R8 — delete a never-sent version (the caller has checked no query resolves to it). Its children start from its
 * parent instead, so the versions stay a tree; the number it had is not given out again (R9: `bookVersionSeq` keeps
 * the highest).
 */
export function deleteVersion(ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "bookVersionSeq">, id: string, inUseId: string | null): VersionFields | VersionRefusal {
  const vs = readVersions(ms);
  const v = vs.find((x) => x.id === id);
  if (!v) return "missing";
  if (v.original) return "original";
  if (v.id === inUseId) return "inUse";
  const seq = versionSeq(ms);
  const out = vs.filter((x) => x.id !== id).map((x) => {
    const parentId = x.parentId === id ? v.parentId : x.parentId;
    /* write down the derived number and parent of every survivor, so removing one cannot renumber or re-parent the
       others under the legacy read */
    const { parentId: _p, ...rest } = x.raw;
    return { ...rest, num: x.num, ...(parentId ? { parentId } : {}) } as BookVersion;
  });
  return { bookVersions: out, inUseBookVersionId: ms.inUseBookVersionId ?? null, bookVersionSeq: seq };
}

/** The children of a version, for the delete confirm's dynamic line (S05). */
export const childrenOf = (versions: readonly V2Version[], id: string): V2Version[] => versions.filter((v) => v.parentId === id);
