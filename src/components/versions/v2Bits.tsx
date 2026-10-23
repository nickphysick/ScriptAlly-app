/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — the small shared pieces: the ref's three drawn marks, its date formats, a query's agent line and
 * status word, and the version disc. Every glyph a status needs is the app's own StatusDot, never a drawn dot.
 */
import React from "react";
import type { Agent, Query } from "../../types";
import { QueryStatus } from "../../types";
import type { V2Version } from "../../lib/bookVersions";
import { dayOfStored } from "../../lib/versionsV2";
import { MONTHS_SHORT } from "../../lib/dates";
import { STAGE_NAME } from "../../lib/qcSummary";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { StatusDot } from "../StatusDot";

export const XMark = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>
);
export const BookMark = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M3 4.5c2.5-1 5-1 7 .5v11c-2-1.5-4.5-1.5-7-.5z" /><path d="M17 4.5c-2.5-1-5-1-7 .5v11c2-1.5 4.5-1.5 7-.5z" />
  </svg>
);
export const DocMark = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M5 2.5h7l3 3v12H5z" /><path d="M8 9h5M8 12h5" />
  </svg>
);
export const Chevron = () => (
  <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" /></svg>
);

/** The version's disc content: Original's book, otherwise its number. */
export const Num: React.FC<{ v: Pick<V2Version, "original" | "num"> | null }> = ({ v }) => (v?.original ? <BookMark /> : <>{v ? v.num : ""}</>);
/** "Original manuscript" / "Version 3" (the ref's VL). */
export const versionLabel = (v: V2Version): string => (v.original ? "Original manuscript" : `Version ${v.num}`);

/* ── dates: the ref's two formats, read off the stored day so no zone can move it ── */
const parts = (day: string | null) => { const m = day ? /^(\d{4})-(\d{2})-(\d{2})/.exec(day) : null; return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null; };
/** "2 Sep" */
export const shortDay = (day: string | null): string => { const p = parts(day); return p ? `${p.d} ${MONTHS_SHORT[p.mo - 1]}` : ""; };
/** "2 Sep 2026" */
export const longDay = (day: string | null): string => { const p = parts(day); return p ? `${p.d} ${MONTHS_SHORT[p.mo - 1]} ${p.y}` : ""; };
export const sentDay = (q: Pick<Query, "dateSent">): string | null => dayOfStored(q.dateSent);
export const msDay = (ms: number | null): string | null => (ms == null ? null : new Date(ms).toISOString().slice(0, 10));
export const today = (): string => {
  /* the London calendar, as every other dated field in the app */
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
};

/** A number with thousands separators, the en-GB way. */
export const commas = (n: number): string => n.toLocaleString("en-GB");

/* ── a query's agent ── */
export interface AgentLine { initials: string; name: string; agency: string }
export function agentLine(q: Query, agents: Map<string, Agent>): AgentLine {
  const a = agents.get(q.agentId) ?? null;
  const name = a ? agentPrimary(a) : "Agent not on file";
  const agency = a ? agentSecondary(a) : "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return { initials, name, agency };
}

/** The status word the ref writes beside a query ("Passed", "Full requested"). */
export const statusWord = (q: Pick<Query, "status">): string => STAGE_NAME[q.status as QueryStatus] ?? String(q.status);

/** The app's StatusDot at the ref's size — never a drawn dot. */
export const Dot: React.FC<{ status: QueryStatus | string; size: number; ghost?: boolean }> = ({ status, size, ghost }) => (
  <StatusDot status={status} overrideSize={Math.max(12, size)} className="sdot" ghost={ghost} decorative />
);
