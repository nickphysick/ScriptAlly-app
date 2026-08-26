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
 * ⚠️ ONE EDGE, SO THE TWO CAN NEVER DISAGREE. A sample material references a book version; a
 * package references materials. **Packages never reference a version directly** — they inherit it
 * through the sample. That is the ref's held decision, and it is what makes "which package carries
 * which opening" a derivation rather than a second field to keep in step.
 *
 * ⚠️ AND `recomputeQuery` IS UNTOUCHED. A version is payload on an activity, never a determinant of
 * state. Nothing in this module is read by the derivation, and nothing in it may become so.
 *
 * ⚠️ COUNTS, NEVER RATES (D15/D17). Two requests from eighteen sends against none from six is not a
 * result, and no function here returns a percentage — `materialUsage` next door returns a
 * `replyRate` and this deliberately does not. The app reports; the writer decides when the numbers
 * are big enough to mean anything.
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
 * ⚠️ THE FEATURE'S ONE GATE, AND EVERY SURFACE READS IT (D8, D18, D22, and Part E's chips).
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
        what: q.status === QueryStatus.FULL_SENT ? ("FULL" as const) : ("PARTIAL" as const),
        versionId: last?.bookVersionId ?? null,
      };
    });

/** The two send statuses a version may ride on (D3). No other activity takes one. */
export const isSendStatus = (s: QueryStatus | undefined): boolean =>
  s === QueryStatus.PARTIAL_SENT || s === QueryStatus.FULL_SENT;

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
  /** Sample materials carrying this version. */
  samples: number;
  /** Packages that include any of those samples — the inherited edge, never a stored one. */
  packages: number;
  /** Queries sent with any of those packages. */
  sent: number;
  /** Those sends where the agent asked for more — an event count, never a rate (D15). */
  requests: number;
}

/**
 * "Requests by opening" (D15) — the question that started all this, answered as counts.
 *
 * ⚠️ THE AGGREGATION IS SAMPLE → PACKAGE → QUERY, and the package hop is a LOOKUP rather than a
 * field. `materialUsage` next door does the same walk one level down (material → package → query);
 * this is that shape with one hop added at the front, deliberately mirroring it rather than
 * inventing a second way to count the same sends.
 */
export const requestsByVersion = (
  version: BookVersion,
  materials: readonly ManuscriptVersion[],
  packages: readonly { id: string; samplePagesVersionId?: string }[],
  queries: readonly Query[],
  isRequestFn: (q: Query) => boolean,
): VersionRequests => {
  const sampleIds = new Set(samplesOfVersion(version.id, materials).map((m) => m.id));
  const pkgIds = new Set(
    packages.filter((p) => !!p.samplePagesVersionId && sampleIds.has(p.samplePagesVersionId)).map((p) => p.id),
  );
  const mine = queries.filter((q) => !!q.packageId && pkgIds.has(q.packageId));
  return {
    versionId: version.id,
    samples: sampleIds.size,
    packages: pkgIds.size,
    sent: mine.length,
    requests: mine.filter(isRequestFn).length,
  };
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
  materials: readonly ManuscriptVersion[],
  packages: readonly { id: string; samplePagesVersionId?: string }[],
  queries: readonly Query[],
  isRequestFn: (q: Query) => boolean,
): OpeningRow[] => {
  const raw = versions.map((v) => ({ v, r: requestsByVersion(v, materials, packages, queries, isRequestFn) }));
  const max = Math.max(...raw.map((x) => x.r.sent), 1);
  return raw.map(({ v, r }) => ({
    id: v.id,
    name: v.name,
    where: `${r.samples} sample${r.samples === 1 ? "" : "s"} · ${r.packages} package${r.packages === 1 ? "" : "s"}`,
    meta: `${r.requests} request${r.requests === 1 ? "" : "s"} from ${r.sent} sent`,
    sentPct: pct(r.sent, max),
    inPct: pct(r.requests, r.sent),
  }));
};

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
      return {
        queryId: h.query.id,
        agent: agentName((h.query as { agentId?: string }).agentId ?? ""),
        what: sentDay ? `${h.what} · sent ${sentDay}` : h.what,
        holds: h.what === "FULL" ? ("Full manuscript" as const) : ("Partial" as const),
        sentDay,
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
