/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — the pure rules behind the pre-query dashboard and its empty states
 * (ref design-refs/dashboard-first-visit-v1/; desktop only).
 *
 *  · `campaignEyebrow` — the header's live eyebrow: GETTING READY · QUERYING · BETWEEN ROUNDS.
 *  · `dashPrefsOf` and the path builders — the set-up answer, the tip position, the stamps already shown
 *    and whether Getting started was hidden. ⚠️ ONE SUB-MAP, `todoPrefs.dash`: `todoPrefs` is `is map` and
 *    unconstrained in the rules (the Noteboard, Manuscripts and Contact list precedent), so this ships with NO
 *    rules change, and every write is ONE dotted leaf so it never clobbers another page's prefs.
 *  · `gsOrder` / `GS_COPY` — the desktop Getting started card: its order follows the answer, and its wording is
 *    the card's own (the phone keeps `GETTING_STARTED`'s, untouched).
 *  · `nextTip` — each visit opens on the next tip.
 *  · the first-win stamp's copy.
 *
 * ⚠️ THE ANSWER ONLY CHOOSES A PATH. It changes no data, so a writer who picked "Not yet" and then imports a
 * tracker has lost nothing.
 */
import { QueryStatus, type Query, type User } from "../types";
import type { UserPaths } from "./userPaths";
import type { GettingStartedKey } from "./dashEmpty";
import { MONTHS_SHORT } from "./dates";

/* ── the header's eyebrow ───────────────────────────────────────────────────────────────────────── */

const CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]);

export type CampaignStage = "ready" | "querying" | "between";

export const CAMPAIGN_EYEBROW: Record<CampaignStage, string> = {
  ready: "GETTING READY",
  querying: "QUERYING",
  between: "BETWEEN ROUNDS",
};

/** Before the first query on this manuscript; while any is active; queries exist and none is active. */
export const campaignStage = (scopedQueries: readonly Pick<Query, "status">[]): CampaignStage =>
  scopedQueries.length === 0 ? "ready" : scopedQueries.some((q) => !CLOSED.has(q.status)) ? "querying" : "between";

/** "— QUERYING —" — the header's established element, now read from the campaign rather than the stored status. */
export const campaignEyebrow = (scopedQueries: readonly Pick<Query, "status">[]): string =>
  `— ${CAMPAIGN_EYEBROW[campaignStage(scopedQueries)]} —`;

/* ── the stored preferences ─────────────────────────────────────────────────────────────────────── */

export type StartPath = "yes" | "notyet";
export type WinKind = "query" | "agent" | "import";

export interface DashPrefs {
  /** the set-up answer per manuscript; absent → "yes" */
  start: Record<string, StartPath>;
  /** the index of the tip shown on the last visit; null before the first */
  tip: number | null;
  /** stamps already shown, keyed by `winKey` */
  wins: Record<string, true>;
  /** Getting started hidden per manuscript (the band's "Hide") */
  gsHidden: Record<string, true>;
}

const ROOT = "todoPrefs.dash";

/** A manuscript id as a field-path segment: only the characters a generated id ever carries. */
export const seg = (id: string): string => id.replace(/[^A-Za-z0-9_-]/g, "_");

/** Total reader: whatever is stored (or nothing), a well-formed value comes back. */
export function dashPrefsOf(user: Pick<User, "todoPrefs"> | null | undefined): DashPrefs {
  const raw = ((user?.todoPrefs as { dash?: Record<string, unknown> } | undefined)?.dash ?? {}) as {
    start?: Record<string, unknown>; tip?: unknown; wins?: Record<string, unknown>; gsHidden?: Record<string, unknown>;
  };
  const start: Record<string, StartPath> = {};
  for (const [k, v] of Object.entries(raw.start ?? {})) if (v === "yes" || v === "notyet") start[k] = v;
  const flags = (m: Record<string, unknown> | undefined) => {
    const out: Record<string, true> = {};
    for (const [k, v] of Object.entries(m ?? {})) if (v === true) out[k] = true;
    return out;
  };
  return {
    start,
    tip: typeof raw.tip === "number" && Number.isInteger(raw.tip) && raw.tip >= 0 ? raw.tip : null,
    wins: flags(raw.wins),
    gsHidden: flags(raw.gsHidden),
  };
}

/** The answer for a manuscript — "yes" when nothing is stored (the pack's default). */
export const startPathOf = (prefs: DashPrefs, msId: string | null): StartPath =>
  (msId ? prefs.start[seg(msId)] : undefined) ?? "yes";

export const startPathWrite = (msId: string, v: StartPath): UserPaths => ({ [`${ROOT}.start.${seg(msId)}`]: v });
export const tipWrite = (i: number): UserPaths => ({ [`${ROOT}.tip`]: i });
export const gsHideWrite = (msId: string): UserPaths => ({ [`${ROOT}.gsHidden.${seg(msId)}`]: true });

/** The key a stamp is remembered by: per kind and manuscript (an agent is the writer's, so it has none). */
export const winKey = (kind: WinKind, msId: string | null): string => (kind === "agent" ? "agent" : `${kind}_${seg(msId ?? "none")}`);
export const winWrite = (key: string): UserPaths => ({ [`${ROOT}.wins.${key}`]: true });

/* ── the tips ───────────────────────────────────────────────────────────────────────────────────── */

/** Each visit opens on the tip after the last one shown; the first visit opens on the first. */
export const nextTip = (last: number | null, n: number): number => (n <= 0 ? 0 : last === null ? 0 : (last + 1) % n);
/** ‹ › loop round. */
export const stepTip = (i: number, d: number, n: number): number => (n <= 0 ? 0 : ((i + d) % n + n) % n);

/* ── Getting started, on the desktop task card ──────────────────────────────────────────────────── */

/** The answer decides the order: an existing querier brings their queries in before building a contact list. */
export const gsOrder = (path: StartPath): GettingStartedKey[] =>
  path === "yes" ? ["manuscript", "query", "agent", "materials", "comps"] : ["manuscript", "agent", "query", "materials", "comps"];

export type GsLink = "manuscript" | "agent" | "import" | "log" | "materials" | "comps";

export interface GsRowCopy { deed: string; note: string; link: string; go: GsLink }

/**
 * The card's own wording (the ref's). ⚠️ THE MATERIALS ROW SAYS "LETTER AND SYNOPSIS" because that is what its
 * tick checks (`PACKAGE_MATERIALS`, two since D9) — the shared deed still names an opening sample the tick no
 * longer asks for, and is the phone's to change.
 */
export const gsCopy = (key: GettingStartedKey, path: StartPath): GsRowCopy => {
  switch (key) {
    case "manuscript": return { deed: "Add your first manuscript", note: "Even a working title and a word count is enough to start.", link: "Add a manuscript", go: "manuscript" };
    case "agent": return { deed: "Add an agent to your contact list", note: "Even one is enough to start. Discover has UK agents to browse.", link: "Add an agent", go: "agent" };
    case "query": return path === "yes"
      ? { deed: "Import or log your queries", note: "Bring your tracker across, or log each query as you send it.", link: "Import your tracker", go: "import" }
      : { deed: "Log your first query", note: "When you've sent it, log the date and what went with it.", link: "Log a query", go: "log" };
    case "materials": return { deed: "Add your query letter and synopsis", note: "So each query records exactly what was sent.", link: "Add materials", go: "materials" };
    case "comps": return { deed: "Add three comparable titles", note: "Most agents ask for them; they go straight into your packages.", link: "Add comps", go: "comps" };
    default: {
      const unhandled: never = key;
      return unhandled;
    }
  }
};

/* ── the first-win stamp ────────────────────────────────────────────────────────────────────────── */

const dayMonth = (iso: string | null | undefined): string => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1] ?? ""}` : "";
};

/** "{agent} · {agency}", never the same words twice (a nameless agent is called by its agency). */
const whoLine = (name: string, agency: string): string => {
  const n = name.trim(), a = agency.trim();
  return [n, a && a.toLowerCase() !== n.toLowerCase() ? a : ""].filter(Boolean).join(" · ");
};

export interface WinCopy { title: string; sub: string }

/** The stamp records the event; it never congratulates. */
export const winCopy = {
  query: (name: string, agency: string, sentIso: string | null | undefined): WinCopy => ({
    title: "First query logged",
    sub: [whoLine(name, agency), dayMonth(sentIso)].filter(Boolean).join(" · "),
  }),
  agent: (name: string, agency: string): WinCopy => ({ title: "First agent added", sub: whoLine(name, agency) }),
  import: (n: number): WinCopy => ({
    title: `${n.toLocaleString("en-GB")} ${n === 1 ? "query" : "queries"} imported`,
    sub: "Your campaign is on the dashboard",
  }),
};

/** How long the stamp holds before it fades (the ref's 2.2s). */
export const STAMP_HOLD_MS = 2200;
