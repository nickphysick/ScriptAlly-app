/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.2 (design-refs/query-centre-v151-2/) — the pure parts: the one colour scheme (status colours), the
 * group headers' colours, the Next-action groups, the Next column's big number, and the row's one action (the list's
 * button and Birds-eye's hover button are this one decision).
 *
 * ⚠️ COLOUR MEANS STATUS. A status's colour is `statusKind`; nothing else on the page picks a colour for a status.
 *    Requested and sent share a colour (the StatusDot's glyph tells them apart).
 * ⚠️ NAVY MEANS "YOURS TO DO" (the Your move tag, the action button, the headers of groups that are yours).
 */
import { QueryStatus } from "../types";
import { whereItStands, type QcRow, type WhereKey } from "./qcSummary";
import { nextDoor } from "./queryActions/entry";
import { nextAction } from "./qcCalView";
import { daysFrom, isClosedRow } from "./qc151";
import type { DrawerMode } from "./queryActions/drawerStore";

const DAY = 86_400_000;
const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── the colour scheme ─────────────────────────────────────────────────────────────────────────────────────────── */

export type StatusKind = "sand" | "pink" | "navy" | "sage" | "grey";
/** the status's colour family. R&R and Resubmitted are the full's family (a request for, and a send of, a whole
 *  manuscript); Signed is the offer's. Neither is in the brief's table. */
export function statusKind(s: QueryStatus | string): StatusKind {
  switch (s) {
    case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.PARTIAL_SENT: return "pink";
    case QueryStatus.FULL_REQUESTED: case QueryStatus.FULL_SENT: case QueryStatus.REVISE_RESUBMIT: case QueryStatus.RESUBMITTED: return "navy";
    case QueryStatus.OFFER: case QueryStatus.SIGNED: return "sage";
    case QueryStatus.REJECTED: case QueryStatus.NO_RESPONSE: case QueryStatus.WITHDRAWN: return "grey";
    default: return "sand";
  }
}
export const STATUS_FILL: Record<StatusKind, string> = { sand: "#e6d9c6", pink: "#f3d3c6", navy: "#d3dce7", sage: "#cbd9be", grey: "#f1f0ee" };
/** Birds-eye's watch-and-wait rows: paler versions (the offer's family has none in the brief, so it keeps its own) */
export const STATUS_PALE: Record<StatusKind, string> = { sand: "#eee5d7", pink: "#f7e2da", navy: "#e0e6ee", sage: "#cbd9be", grey: "#f1f0ee" };
export const CLOSED_TEXT = "#8a8076";

/* ── group headers ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type HeadTone = "navy" | "blue" | "stone" | "faded" | `st-${StatusKind}`;
export const HEAD_FILL: Record<"navy" | "blue" | "stone" | "faded", string> = { navy: "#2a3a52", blue: "#c5d0dd", stone: "#e3dbcf", faded: "#f1efec" };
const WHO_TONE: Record<WhereKey, HeadTone> = { you: "navy", quiet: "blue", agent: "stone", closed: "faded" };

/* the Next-action groups (v151.2 §3): their order, labels and header colours */
export type Act1512 = "offer" | "full" | "partial" | "revision" | "nudge" | "soon" | "wait" | "none";
export const ACTION_1512: readonly { key: Act1512; label: string; tone: HeadTone }[] = [
  { key: "offer", label: "Answer the offer", tone: "navy" },
  { key: "full", label: "Send your full", tone: "navy" },
  { key: "partial", label: "Send your partial", tone: "navy" },
  /* the app has a revision owed (R&R); the brief's mock has none. It is yours to do, so it is navy, after the partials */
  { key: "revision", label: "Send your revision", tone: "navy" },
  { key: "nudge", label: "Nudge", tone: "blue" },
  { key: "soon", label: "Reply due soon", tone: "stone" },
  { key: "wait", label: "Waiting to hear", tone: "stone" },
  { key: "none", label: "Nothing to do", tone: "faded" },
];
/**
 * A row's Next-action group. The writer's turn by status; with the agent by the nudge window (`nextAction`): past the
 * reply date — inside the nudge window or gone quiet alike — is Nudge; the last week before the reply date is "Reply
 * due soon" (the row lines' own "Reply due" rule, 0–6 days); anything later is "Waiting to hear"; closed is "Nothing
 * to do".
 */
export function actionGroup(r: QcRow, nowMs: number): Act1512 {
  if (isClosedRow(r) || r.court === "closed" || r.status === QueryStatus.SIGNED) return "none";
  const a = nextAction(r, nowMs);
  if (a === "offer" || a === "full" || a === "partial" || a === "revision") return a;
  if (a === "nudge" || a === "close") return "nudge";
  const left = r.expectedMs != null ? daysFrom(r.expectedMs, nowMs) : null;
  return left != null && left >= 0 && left <= 6 ? "soon" : "wait";
}
export interface Sect<T> { key: string; label: string; rows: T[] }
/** the Next-action sections, in the brief's order, empty ones dropped; rows keep their sort */
export function actionSections<T extends QcRow>(rows: readonly T[], nowMs: number): Sect<T>[] {
  return ACTION_1512.map((g) => ({ key: `na:${g.key}`, label: g.label, rows: rows.filter((r) => actionGroup(r, nowMs) === g.key) }))
    .filter((s) => s.rows.length > 0);
}

/** A section header's colour, by the grouping: who (by key), next action (by group), status (its status colour), the
 *  package grouping and anything ungrouped (stone). */
export function headTone(group: string, key: string): HeadTone {
  if (group === "attention" && key in WHO_TONE) return WHO_TONE[key as WhereKey];
  if (key.startsWith("na:")) return ACTION_1512.find((g) => `na:${g.key}` === key)?.tone ?? "stone";
  if (group === "status") return `st-${statusKind(key)}`;
  return "stone";
}
export const headFill = (t: HeadTone): string => (t.startsWith("st-") ? STATUS_FILL[t.slice(3) as StatusKind] : HEAD_FILL[t as keyof typeof HEAD_FILL]);

/* ── the row's tag ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type RowTag = "you" | "quiet" | null;
export const rowTag = (r: QcRow, nowMs: number): RowTag => { const w = whereItStands(r, nowMs); return w === "you" || w === "quiet" ? w : null; };

/* ── the Next column: a big number ─────────────────────────────────────────────────────────────────────────────── */

export type NumTone = "late" | "ink" | "faint";
export type NextNum =
  | { kind: "num"; n: number; label: [string, string]; tone: NumTone }
  | { kind: "text"; text: string; tone: NumTone }
  | { kind: "dash" };
const unit = (n: number): string => (n === 1 ? "day" : "days");

/**
 * The Next column (v151.2 §4), on v151.1's date logic: your own date gone → "8 days late"; still to come → "7 days
 * left" (ink); with the agent, the reply date gone → "37 days overdue" (late); still to come → "36 days to reply"
 * (faint); gone quiet with no reply date → "120 days no reply" (late; the brief names no label for it); no date at all
 * → the words alone; closed → "—".
 */
export function nextNum(r: QcRow, nowMs: number): NextNum {
  if (isClosedRow(r) || r.court === "closed") return { kind: "dash" };
  const due = r.expectedMs;
  if (r.court === "agent") {
    if (due == null) {
      const inStage = r.stageStartMs != null ? Math.max(0, Math.round((sod(nowMs) - sod(r.stageStartMs)) / DAY)) : null;
      return whereItStands(r, nowMs) === "quiet" && inStage != null
        ? { kind: "num", n: inStage, label: [unit(inStage), "no reply"], tone: "late" }
        : { kind: "text", text: "No reply date", tone: "faint" };
    }
    const d = daysFrom(due, nowMs);
    return d < 0 ? { kind: "num", n: -d, label: [unit(-d), "overdue"], tone: "late" } : { kind: "num", n: d, label: [unit(d), "to reply"], tone: "faint" };
  }
  if (due == null) return { kind: "text", text: "No date yet", tone: "faint" };
  const d = daysFrom(due, nowMs);
  return d < 0 ? { kind: "num", n: -d, label: [unit(-d), "late"], tone: "late" } : { kind: "num", n: d, label: [unit(d), "left"], tone: "ink" };
}

/* ── the row's one action: the list's button and Birds-eye's hover button ─────────────────────────────────────── */

export type ActTone = "navy" | "nudge" | "plain";
export interface RowAct { tone: ActTone; label: string; mode: DrawerMode }
const SEND_WORDS: Partial<Record<string, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Send your partial", [QueryStatus.FULL_REQUESTED]: "Send your full", [QueryStatus.REVISE_RESUBMIT]: "Send your revision",
};
/**
 * One decision, said in both views. Yours to send or answer → navy, in the Next-action groups' words. Past the reply
 * date (inside the nudge window, or gone quiet) → "Nudge", outlined, opening the nudge journey. Anything else live →
 * "Record a response" (Birds-eye draws it; the list draws no button for it). Closed or signed → none.
 */
export function rowAct(r: QcRow, nowMs: number): RowAct | null {
  if (isClosedRow(r) || r.court === "closed") return null;
  const door = nextDoor(r, nowMs);
  if (!door) return null;
  const w = whereItStands(r, nowMs);
  if (w === "quiet" || door.mode === "nudge") return { tone: "nudge", label: "Nudge", mode: "nudge" };
  if (door.mode === "offer") return { tone: "navy", label: "Answer the offer", mode: "offer" };
  if (door.mode === "sent") return { tone: "navy", label: SEND_WORDS[r.status] ?? door.label, mode: "sent" };
  return { tone: "plain", label: "Record a response", mode: "resp" };
}
