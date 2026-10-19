/**
 * Smart Import evaluation — the scorer. Pure: an expected answer and an assembled result in, a
 * per-fixture score out. No I/O, no model, no randomness.
 *
 * ROW ACCOUNTING FIRST. Every expected query is matched to at most one actual query; an expected
 * query with no partner is DROPPED, an actual query with no partner is INVENTED. Matching runs in
 * four passes, each looser about what it may assume, and each run over EVERY expected query before
 * the next begins:
 *   1. the same normalised agent name AND agency AND sent date;
 *   2. the same name and agency, any date;
 *   3. the same name OR the same agency (a name filed as an agency, an annotation kept in a name),
 *      with the sent date required where more than one row qualifies;
 *   4. neither name nor agency agrees, but the sent date and status do, uniquely.
 * Where the choice is not decided by the date the match is reported as AMBIGUOUS — the first
 * candidate is taken so the fields can still be compared, and the fixture cannot pass.
 * Nothing is ever guessed silently.
 *
 * THEN FIELDS, on every matched pair: agentName, agency, website (only where the expected answer
 * states one), status, sentDate, timeline (as a multiset of type+date), reasonsMissing (an expected
 * code not raised) and reasonsSpurious (a code raised that the truth does not call for). A dropped
 * query counts every one of its fields as compared and wrong.
 */
import type { ExpectedFile, ExpectedQuery } from "./types";

export const FIELDS = ["agentName", "agency", "website", "status", "sentDate", "timeline", "reasonsMissing", "reasonsSpurious"] as const;
export type Field = (typeof FIELDS)[number];

export interface ActualQuery {
  index: number;
  agentName: string;
  agency: string;
  website: string;
  status: string;
  sentDate: string | null;
  timeline: { type: string; date: string | null }[];
  reasons: string[];
}

export interface WrongField {
  query: string;
  field: Field;
  expected: unknown;
  actual: unknown;
}

export interface FixtureScore {
  pass: boolean;
  expectedCount: number;
  actualCount: number;
  matched: number;
  dropped: string[];
  invented: string[];
  ambiguous: string[];
  wrong: WrongField[];
  fieldsCompared: number;
  fieldsCorrect: number;
  byField: Record<Field, { compared: number; correct: number }>;
  /** For run-to-run comparison: each expected label → its actual field values (null when dropped). */
  values: Record<string, Partial<Record<Field, unknown>> | null>;
}

export const norm = (s: unknown): string =>
  String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");

export const normUrl = (s: unknown): string =>
  norm(s).replace(/^<|>$/g, "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

/** Flatten an assembled result's agents + queries into one row per query. */
export function actualQueries(result: any): ActualQuery[] {
  if (!result || !Array.isArray(result.queries)) return [];
  const agents = new Map<string, any>((Array.isArray(result.agents) ? result.agents : []).map((a: any) => [a?.ref, a]));
  return result.queries.map((q: any, index: number) => {
    const a = agents.get(q?.agentRef) ?? {};
    return {
      index,
      agentName: String(a.name ?? ""),
      agency: String(a.agency ?? ""),
      website: String(a.website ?? ""),
      status: String(q?.status ?? ""),
      sentDate: q?.sentDate ?? null,
      timeline: (Array.isArray(q?.timeline) ? q.timeline : []).map((t: any) => ({ type: String(t?.type ?? ""), date: t?.date ?? null })),
      reasons: (Array.isArray(q?.reasons) ? q.reasons : []).map(String),
    };
  });
}

const statusOk = (e: ExpectedQuery, s: string) => [e.status, ...(e.statusAccept ?? [])].includes(s);
const eventKeys = (t: { type: string; date: string | null }[]) => t.map((x) => `${x.type}|${x.date ?? ""}`).sort();
const sameMultiset = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function fieldsFor(e: ExpectedQuery): Field[] {
  return FIELDS.filter((f) => f !== "website" || e.website !== undefined);
}

export function scoreFixture(expected: ExpectedFile, result: any | null): FixtureScore {
  const actual = actualQueries(result);
  const free = new Set(actual.map((a) => a.index));
  const pairs = new Map<number, ActualQuery>(); // expected index → actual
  const ambiguous: string[] = [];
  const key = (name: string, agency: string) => `${norm(name)}|${norm(agency)}`;

  /** Take one of `cands`. Several candidates are narrowed by sent date, then status; if that does not
   *  leave exactly one, the match is reported AMBIGUOUS (the first is still taken so fields compare). */
  const take = (ei: number, cands: ActualQuery[], e: ExpectedQuery): boolean => {
    if (!cands.length) return false;
    let pool = cands;
    if (pool.length > 1) { const d = pool.filter((a) => a.sentDate === e.sentDate); if (d.length) pool = d; }
    if (pool.length > 1) { const s = pool.filter((a) => statusOk(e, a.status)); if (s.length) pool = s; }
    if (pool.length > 1 || (cands.length > 1 && pool[0].sentDate !== e.sentDate)) ambiguous.push(e.label);
    pairs.set(ei, pool[0]);
    free.delete(pool[0].index);
    return true;
  };
  const open = () => actual.filter((a) => free.has(a.index));
  const unpaired = () => expected.queries.map((e, ei) => ({ e, ei })).filter(({ ei }) => !pairs.has(ei));

  // Pass 1 — the same name AND agency AND sent date. Done for EVERY expected query before anything
  // looser, so one query can never take another's row just because it was listed first.
  for (const { e, ei } of unpaired()) {
    take(ei, open().filter((a) => key(a.agentName, a.agency) === key(e.agentName, e.agency) && a.sentDate === e.sentDate), e);
  }
  // Pass 2 — the same name and agency, any date. Several left to choose from is reported ambiguous.
  for (const { e, ei } of unpaired()) {
    take(ei, open().filter((a) => key(a.agentName, a.agency) === key(e.agentName, e.agency)), e);
  }
  // Pass 3 — the name OR the agency agrees (and is not blank), and so does the date — or it is the
  // only such row.
  for (const { e, ei } of unpaired()) {
    const cands = open().filter((a) =>
      (norm(e.agentName) && norm(a.agentName) === norm(e.agentName)) || (norm(e.agency) && norm(a.agency) === norm(e.agency)));
    if (cands.length > 1) {
      const dated = cands.filter((a) => a.sentDate === e.sentDate);
      if (dated.length) take(ei, dated, e);
    } else take(ei, cands, e);
  }
  // Pass 4 — nothing about the agent agrees, but the date and status do, uniquely.
  for (const { e, ei } of unpaired()) {
    if (!e.sentDate) continue;
    const cands = open().filter((a) => a.sentDate === e.sentDate && statusOk(e, a.status));
    if (cands.length === 1) take(ei, cands, e);
  }

  const byField = Object.fromEntries(FIELDS.map((f) => [f, { compared: 0, correct: 0 }])) as FixtureScore["byField"];
  const wrong: WrongField[] = [];
  const dropped: string[] = [];
  const values: FixtureScore["values"] = {};
  let fieldsCompared = 0, fieldsCorrect = 0;
  const mark = (f: Field, ok: boolean, e: ExpectedQuery, exp: unknown, act: unknown) => {
    byField[f].compared++; fieldsCompared++;
    if (ok) { byField[f].correct++; fieldsCorrect++; } else wrong.push({ query: e.label, field: f, expected: exp, actual: act });
  };

  expected.queries.forEach((e, ei) => {
    const a = pairs.get(ei);
    if (!a) {
      dropped.push(e.label);
      values[e.label] = null;
      for (const f of fieldsFor(e)) { byField[f].compared++; fieldsCompared++; }
      return;
    }
    const tolerated = new Set([...e.reasons, ...(e.reasonsTolerated ?? [])]);
    const missing = e.reasons.filter((r) => !a.reasons.includes(r));
    const spurious = a.reasons.filter((r) => !tolerated.has(r));
    values[e.label] = {
      agentName: norm(a.agentName), agency: norm(a.agency), website: normUrl(a.website), status: a.status,
      sentDate: a.sentDate, timeline: eventKeys(a.timeline), reasonsMissing: missing, reasonsSpurious: spurious,
    };
    mark("agentName", norm(a.agentName) === norm(e.agentName), e, e.agentName, a.agentName);
    mark("agency", norm(a.agency) === norm(e.agency), e, e.agency, a.agency);
    if (e.website !== undefined) mark("website", normUrl(a.website) === normUrl(e.website), e, e.website, a.website);
    mark("status", statusOk(e, a.status), e, e.statusAccept ? [e.status, ...e.statusAccept] : e.status, a.status);
    mark("sentDate", a.sentDate === e.sentDate, e, e.sentDate, a.sentDate);
    mark("timeline", sameMultiset(eventKeys(a.timeline), eventKeys(e.timeline)), e, e.timeline, a.timeline);
    mark("reasonsMissing", missing.length === 0, e, e.reasons, missing);
    mark("reasonsSpurious", spurious.length === 0, e, [], spurious);
  });

  const invented = open().map((a) => `actual #${a.index} ${a.agentName || "(no name)"} / ${a.agency || "(no agency)"}`);
  return {
    pass: dropped.length === 0 && invented.length === 0 && ambiguous.length === 0 && wrong.length === 0,
    expectedCount: expected.queries.length,
    actualCount: actual.length,
    matched: pairs.size,
    dropped, invented, ambiguous, wrong,
    fieldsCompared, fieldsCorrect, byField, values,
  };
}

/** How many of each fixture's fields disagreed across repeated runs of the same fixture. */
export function disagreements(runs: FixtureScore[]): { field: Field; query: string; values: string[] }[] {
  if (runs.length < 2) return [];
  const out: { field: Field; query: string; values: string[] }[] = [];
  for (const label of Object.keys(runs[0].values)) {
    for (const f of FIELDS) {
      const seen = runs.map((r) => {
        const v = r.values[label];
        return v === null ? "<dropped>" : v === undefined ? "<missing>" : JSON.stringify(v[f]);
      });
      if (seen.every((s) => s === "undefined")) continue;
      const distinct = [...new Set(seen)];
      if (distinct.length > 1) out.push({ field: f, query: label, values: distinct });
    }
  }
  return out;
}
