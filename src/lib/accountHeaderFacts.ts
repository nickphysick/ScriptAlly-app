/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountHeaderFacts — the three lines the account header states about you.
 *
 * ⚠️ EVERY FACT COMES FROM SOMETHING THE CLIENT ALREADY HOLDS. No new read, no new field, no
 * rules change: the plan is on the user document, the joined date is on `auth.currentUser`'s
 * metadata (which settings already reads for providers and verification), and the querying counts
 * are the manuscripts and queries the db context has loaded for every page. A fact that needed
 * fetching would be a database read added for decoration, and it would be dropped instead.
 *
 * Pure, so the wording and the edge cases are testable without a browser.
 */

/** One row of the header's fact panel. */
export interface AccountFact {
  key: string;
  value: string;
}

/**
 * ⚠️ THE DATE COMES FROM FIREBASE AUTH, NOT FROM A STORED FIELD. `User.createdDate` exists on the
 * manuscript type but there is no equivalent on the account, and inventing one would mean
 * backfilling every existing writer with a guess. `metadata.creationTime` is the real thing and it
 * is already in memory.
 *
 * An unparseable or absent value returns null and the caller DROPS THE ROW — a header that says
 * "Joined —" states nothing, and "Joined Invalid Date" states something false.
 */
export function joinedLabel(creationTime: string | null | undefined): string | null {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * "1 manuscript · 9 out".
 *
 * ⚠️ "OUT" IS QUERIES WITH A `dateSent`, NOT EVERY QUERY ON FILE. The field is optional and the
 * type says why — "absent for provisional (undated) imported queries" — so a total would count
 * letters that have never been sent as though they were in the post. The distinction is the whole
 * meaning of the word.
 */
export function queryingLabel(manuscriptCount: number, sentCount: number): string {
  const ms = `${manuscriptCount} manuscript${manuscriptCount === 1 ? "" : "s"}`;
  return `${ms} · ${sentCount} out`;
}

/** Queries that have actually gone out. */
export function sentCount(queries: { dateSent?: string }[]): number {
  return queries.filter((q) => !!q.dateSent).length;
}

/**
 * The panel's rows, in order, with anything unavailable OMITTED rather than shown empty.
 *
 * ⚠️ THE ROWS ARE BUILT HERE SO THE OMISSION RULE HAS ONE HOME. A component deciding per-row
 * whether to render is a component that will one day render a fourth row and forget.
 */
export function accountFacts(input: {
  plan: string;
  creationTime: string | null | undefined;
  manuscriptCount: number;
  sentCount: number;
}): AccountFact[] {
  const rows: AccountFact[] = [{ key: "Plan", value: input.plan }];
  const joined = joinedLabel(input.creationTime);
  if (joined) rows.push({ key: "Joined", value: joined });
  rows.push({ key: "Querying", value: queryingLabel(input.manuscriptCount, input.sentCount) });
  return rows;
}
