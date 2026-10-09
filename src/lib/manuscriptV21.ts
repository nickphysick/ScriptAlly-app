/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v21 — the page's derivations (design-refs/manuscripts/manuscripts-v21.html). Pure: no
 * Firebase, no component, nothing written. Every count reuses the derivation that already owns it
 * (`versionTiles` → `versionUsage`, `owedRequests`, `manuscriptActivity`, `letterInUse`), so this
 * page cannot disagree with the pages those figures also appear on.
 */
import { ManuscriptStatus, QueryStatus } from "../types";
import type { BookVersion, CompTitle, Manuscript, Query } from "../types";
import type { FeedSeg } from "./dashFeed";
import { dayMonth, MONTHS_SHORT } from "./dates";
import type { ActivityRow, VersionTile } from "./manuscriptShelf";
import type { OwedRow } from "./manuscriptSummary";

/* ══ the book card's facts ════════════════════════════════════════════════════════════════════ */

/** The six statuses, in the enum's order, in the page's sentence case. */
export const STATUS_WORDS: Record<ManuscriptStatus, string> = {
  [ManuscriptStatus.DRAFTING]: "Drafting",
  [ManuscriptStatus.REVISING]: "Revising",
  [ManuscriptStatus.READY_TO_QUERY]: "Ready to query",
  [ManuscriptStatus.QUERYING]: "Querying",
  [ManuscriptStatus.SHELVED]: "Shelved",
  [ManuscriptStatus.ON_SUBMISSION]: "On submission",
};
export const STATUS_ORDER: readonly ManuscriptStatus[] = [
  ManuscriptStatus.DRAFTING, ManuscriptStatus.REVISING, ManuscriptStatus.READY_TO_QUERY,
  ManuscriptStatus.QUERYING, ManuscriptStatus.ON_SUBMISSION, ManuscriptStatus.SHELVED,
];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December",
];

/** "3 March 2026" from an ISO date or timestamp string — read by hand from the date part, never
 *  through `new Date()`, which shifts a date-only string a day west of Greenwich. */
export const longDay = (iso: string | null | undefined): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const month = MONTHS_LONG[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : null;
};

/** "2 Sep" from a date-only string (the version card's "Saved 2 Sep"). */
export const shortDay = (iso: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  const month = MONTHS_SHORT[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : "";
};

export interface BookFact {
  key: "status" | "genre" | "age" | "words" | "setting" | "series" | "author" | "since" | "version";
  label: string;
  value: string;
  /** a value that stands in for an unrecorded one — drawn muted */
  muted?: boolean;
  /** the querying glyph beside the status */
  querying?: boolean;
}

/** The nine facts, in the oracle's order. */
export const bookFacts = (i: {
  ms: Pick<Manuscript, "status" | "shelved" | "genre" | "ageCategory" | "wordCount" | "setting" | "series">;
  authorName: string | null | undefined;
  since: string | null;
  current: BookVersion | null;
}): BookFact[] => {
  const shelved = i.ms.status === ManuscriptStatus.SHELVED || i.ms.shelved === true;
  const status = shelved ? ManuscriptStatus.SHELVED : i.ms.status;
  const words = Number(i.ms.wordCount) || 0;
  const author = (i.authorName ?? "").trim();
  return [
    { key: "status", label: "Status", value: STATUS_WORDS[status] ?? String(status), querying: status === ManuscriptStatus.QUERYING },
    { key: "genre", label: "Genre", value: (i.ms.genre ?? "").trim() || "Not set", muted: !(i.ms.genre ?? "").trim() },
    { key: "age", label: "Age category", value: (i.ms.ageCategory ?? "").trim() || "Not set", muted: !(i.ms.ageCategory ?? "").trim() },
    { key: "words", label: "Word count", value: words > 0 ? words.toLocaleString("en-GB") : "Not set", muted: words <= 0 },
    { key: "setting", label: "Setting", value: (i.ms.setting ?? "").trim() || "Not set", muted: !(i.ms.setting ?? "").trim() },
    { key: "series", label: "Series", value: (i.ms.series ?? "").trim() || "Standalone", muted: !(i.ms.series ?? "").trim() },
    { key: "author", label: "Author name", value: author || "Not set", muted: !author },
    { key: "since", label: "Querying since", value: longDay(i.since) ?? "Not yet", muted: !longDay(i.since) },
    { key: "version", label: "Current version", value: i.current?.name ?? "Not saved yet", muted: !i.current },
  ];
};

/* ══ recent activity ══════════════════════════════════════════════════════════════════════════ */

/** How many rows the card draws. */
export const V21_ACTIVITY_MAX = 5;

export interface V21ActivityRow {
  id: string;
  at: number;
  date: string;
  glyph: ActivityRow["glyph"];
  say: FeedSeg[];
  sub: string | null;
  /** an owed request: the sub-line is the rust "your move" line, and the row opens the sent journey */
  yourMove: boolean;
  queryId: string | null;
}

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (typeof v === "string" || typeof v === "number") { const d = new Date(v); return Number.isFinite(d.getTime()) ? d : null; }
  const o = v as { toDate?: () => Date; seconds?: number };
  if (typeof o.toDate === "function") return o.toDate();
  if (typeof o.seconds === "number") return new Date(o.seconds * 1000);
  return null;
};

/**
 * The "your move" line: what to send, and by when where the writer set a date.
 * "Send the first 50 pages by 12 Oct" · "Send the full manuscript" · "Send the partial by 19 Oct".
 * A quantity or a date the record does not carry is left out, never guessed.
 */
export const yourMoveLine = (row: Pick<OwedRow, "kind" | "query">): string => {
  const q = row.query;
  let what = row.kind === "full" ? "the full manuscript" : "the partial";
  if (row.kind === "partial") {
    const qty = q.materialsRequestedQuantity;
    const type = q.materialsRequestedType;
    if (qty && type && ["pages", "words", "chapters"].includes(type)) {
      const n = typeof qty === "number" ? qty.toLocaleString("en-GB") : String(qty).trim();
      if (n) what = `the first ${n} ${type}`;
    }
  }
  const by = toDate(q.expectedSendDate);
  return by ? `Send ${what} by ${dayMonth(by)}` : `Send ${what}`;
};

/**
 * The row's sentence, short enough for a 380px card: the agent and what happened. The feed's own
 * sentence also names the book and counts the days since the query; here the page IS the book, so
 * those are left out. A record the table below does not name keeps the feed's sentence whole.
 */
const SHORT: Partial<Record<QueryStatus, (who: FeedSeg) => FeedSeg[]>> = {
  [QueryStatus.QUERIED]: (w) => [{ t: "You queried " }, w],
  [QueryStatus.PARTIAL_REQUESTED]: (w) => [w, { t: " requested a partial" }],
  [QueryStatus.FULL_REQUESTED]: (w) => [w, { t: " requested the full" }],
  [QueryStatus.PARTIAL_SENT]: (w) => [{ t: "You sent the partial to " }, w],
  [QueryStatus.FULL_SENT]: (w) => [{ t: "You sent the full to " }, w],
  [QueryStatus.REJECTED]: (w) => [w, { t: " passed" }],
  [QueryStatus.OFFER]: (w) => [w, { t: " offered representation" }],
};
export const shortSay = (r: Pick<ActivityRow, "glyph" | "say">): FeedSeg[] => {
  const who = r.say.find((s) => s.who);
  const make = r.glyph.kind === "status" ? SHORT[r.glyph.status] : undefined;
  return who && make ? make({ t: who.t, who: true }) : r.say;
};

const REQUEST_STATUS: Record<OwedRow["kind"], QueryStatus> = {
  partial: QueryStatus.PARTIAL_REQUESTED,
  full: QueryStatus.FULL_REQUESTED,
};

/**
 * The five rows. `rows` is every activity row on this book, newest first (lib/manuscriptShelf's
 * derivation, unsliced). Each owed request marks its own request row as "your move"; an owed request
 * with no such row (an imported query, say) gets a row made from the request's own date.
 *
 * ⚠️ AN OWED REQUEST IS NEVER PUSHED OUT BY NEWER EVENTS: the owed rows are kept first, the rest of
 * the five are the newest others, and the five are then shown newest first.
 */
export const v21Activity = (i: {
  rows: readonly ActivityRow[];
  owed: readonly OwedRow[];
  agentName: (agentId: string) => string;
  now: Date;
}): V21ActivityRow[] => {
  const all: V21ActivityRow[] = i.rows.map((r) => ({
    id: r.id, at: r.at, date: r.date, glyph: r.glyph, say: shortSay(r), sub: r.sub, yourMove: false, queryId: r.queryId,
  }));
  const thisYear = i.now.getFullYear();
  for (const o of i.owed) {
    const want = REQUEST_STATUS[o.kind];
    const hit = all.find((r) => r.queryId === o.query.id && r.glyph.kind === "status" && r.glyph.status === want);
    const line = yourMoveLine(o);
    if (hit) { hit.yourMove = true; hit.sub = line; continue; }
    const d = toDate(o.requestedIso);
    if (!d) continue;
    all.push({
      id: `owed-${o.query.id}`, at: d.getTime(),
      date: d.getFullYear() === thisYear ? dayMonth(d) : `${dayMonth(d)} ${d.getFullYear()}`,
      glyph: { kind: "status", status: want },
      say: [{ t: i.agentName(o.query.agentId), who: true }, { t: o.kind === "full" ? " requested the full" : " requested a partial" }],
      sub: line, yourMove: true, queryId: o.query.id,
    });
  }
  all.sort((a, b) => b.at - a.at);
  const mine = all.filter((r) => r.yourMove).slice(0, V21_ACTIVITY_MAX);
  const rest = all.filter((r) => !r.yourMove).slice(0, V21_ACTIVITY_MAX - mine.length);
  return [...mine, ...rest].sort((a, b) => b.at - a.at);
};

/* ══ versions ═════════════════════════════════════════════════════════════════════════════════ */

export interface VersionCard {
  v: BookVersion;
  current: boolean;
  queried: number;
  requested: number;
  sent: number;
  /** every query that went out with this version, closed ones included */
  total: number;
  packages: number;
  /** "50,000 words" — only where the version itself carries a count */
  words: string | null;
}

/** The deck's cards, newest first — `versionTiles`' order and counts, plus the version's own words. */
export const versionCards = (tiles: readonly VersionTile[]): VersionCard[] =>
  tiles.map((t) => {
    const n = Number(t.v.wordCount);
    return {
      v: t.v, current: t.current, queried: t.queried, requested: t.requested, sent: t.sent,
      total: t.queried + t.requested + t.sent + t.closed, packages: t.packages,
      words: Number.isFinite(n) && n > 0 ? `${n.toLocaleString("en-GB")} words` : null,
    };
  });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The line under "Versions", in runs. "with {q} queries and {r} requests so far" counts every query
 * sent with the current version, and the requests among them (asked for, or already sent on); the
 * clause is dropped when nothing has gone out with it.
 */
export const versionsLede = (cards: readonly VersionCard[], title: string): FeedSeg[] => {
  if (cards.length === 0) return [{ t: "No versions saved yet. Save one when the book changes." }];
  const cur = cards.find((c) => c.current) ?? cards[0];
  const out: FeedSeg[] = [
    { t: "You've saved " }, { t: plural(cards.length, "version", "versions"), who: true }, { t: " of " },
    { t: title, em: true }, { t: ". " }, { t: cur.v.name, who: true }, { t: " is the one going out now" },
  ];
  if (cur.total > 0) {
    const r = cur.requested + cur.sent;
    out.push({ t: `, with ${plural(cur.total, "query", "queries")} and ${plural(r, "request", "requests")} so far` });
  }
  out.push({ t: "." });
  return out;
};

/* ══ your materials: three doors ══════════════════════════════════════════════════════════════ */

export interface Door {
  key: "comps" | "letters" | "packages";
  name: string;
  n: number;
  unit: string;
  sentence: string;
  go: string;
}

export const materialDoors = (i: {
  comps: readonly Pick<CompTitle, "inQuery">[];
  letters: number;
  synopses: number;
  /** the letter in use, by name; null when no sent query resolves to one */
  letterName: string | null;
  /** packages on this book that are not retired */
  livePackages: number;
  /** queries sent with a package */
  packageQueries: number;
}): Door[] => {
  const k = i.comps.filter((c) => c.inQuery === true).length;
  const saved = i.letters + i.synopses;
  return [
    {
      key: "comps", name: "Comparable titles", n: i.comps.length, unit: i.comps.length === 1 ? "comp" : "comps",
      sentence: i.comps.length === 0
        ? "Books and films like yours. None yet."
        : `Books and films like yours. ${k === 0 ? "None are in your query letter yet." : `${k} ${k === 1 ? "is" : "are"} in your query letter.`}`,
      go: "Open comparable titles",
    },
    {
      key: "letters", name: "Letters & synopses", n: saved, unit: "saved",
      sentence: saved === 0
        ? "Query letters and synopses. None yet."
        : `${plural(i.letters, "query letter", "query letters")} and ${plural(i.synopses, "synopsis", "synopses")}.${i.letterName ? ` You're using ${i.letterName}.` : ""}`,
      go: "Open letters & synopses",
    },
    {
      key: "packages", name: "Submission packages", n: i.livePackages, unit: "in use",
      sentence: i.livePackages === 0
        ? "The letter, synopsis and pages you send together. None yet."
        : `The letter, synopsis and pages you send together. ${i.packageQueries === 0 ? "No queries sent yet." : `${plural(i.packageQueries, "query", "queries")} sent so far.`}`,
      go: "Open submission packages",
    },
  ];
};

/* ══ the deck ═════════════════════════════════════════════════════════════════════════════════ */

export interface DeckPose {
  /** px right, px up, scale, opacity, z-index; `hidden` cards are not drawn */
  x: number; y: number; scale: number; opacity: number; z: number; hidden: boolean;
}

/**
 * Where card `index` sits when `focus` is at the front. Behind: k × step right, k × 14 up,
 * 6% smaller and 18% fainter each, to three deep. Passed: out to the left, gone.
 */
export const deckPose = (index: number, focus: number, step: number): DeckPose => {
  const k = index - focus;
  if (k < 0) return { x: -40, y: 0, scale: 0.96, opacity: 0, z: 1, hidden: true };
  if (k === 0) return { x: 0, y: 0, scale: 1, opacity: 1, z: 50, hidden: false };
  const kk = Math.min(k, 3);
  return { x: kk * step, y: -kk * 14, scale: 1 - kk * 0.06, opacity: k > 3 ? 0 : 1 - kk * 0.18, z: 50 - k, hidden: k > 3 };
};

/** Which query a row's click should open, and in which journey. */
export const rowDoor = (r: Pick<V21ActivityRow, "yourMove" | "queryId">): { mode: "sent" | "edit"; queryId: string } | null =>
  r.queryId ? { mode: r.yourMove ? "sent" : "edit", queryId: r.queryId } : null;

export type { Query };
