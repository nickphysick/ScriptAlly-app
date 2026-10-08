/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY CENTRE v132 §3 — WHAT A LIST ROW SAYS: the "Where it stands" sub-line, the "Next move" phrase
 * and its dated line, and the "What you sent" cell (the package slot and the four tiles).
 *
 * ⚠️ PURE, AND READ BY THE ROW ONLY. Every figure comes from the row (`QcRow`), the board's card for
 * the query (`comingUp`) and the package as stored; nothing here reads the clock but `nowMs`.
 *
 * ⚠️ A PACKAGE SEND'S TILES LIGHT FROM THE PACKAGE EDITION THAT WENT, never from the agent's wish list
 * (§0.4). The edition is the one `sentRecordOf` names; an edition the package no longer lists falls
 * back to the package's current contents, which `editionsOf` guarantees is the last edition.
 */
import { QueryStatus, type SubmissionPackage } from "../types";
import { MONTHS_SHORT } from "./dates";
import { editionsOf, contentsOf } from "./packageEditions";
import { sentRecordOf } from "./queryActions/sentRecord";
import { MATERIAL_SLOTS } from "./queryCardFacts";
import { MATERIAL_ROW_NAMES, type MaterialKind } from "./agentMaterials";
import { tileCourt, STAGE_NAME, type QcRow } from "./qcSummary";
import type { ComingUp } from "./qcComingUp";

const DAY = 86_400_000;
const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** "2 SEP", with the year where it is not this year's. */
export const upDate = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  const y = d.getFullYear() !== new Date(nowMs).getFullYear() ? ` ${d.getFullYear()}` : "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${y}`.toUpperCase();
};
/** "FRI 9 OCT". */
export const upWeekDate = (ms: number): string => {
  const d = new Date(ms);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`.toUpperCase();
};
/** "2 Sep" — the popups' own case. */
export const dayMon = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const whole = (a: number, b: number) => Math.round((b - a) / DAY);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ── "Where it stands" ─────────────────────────────────────────────────────────────────────────── */

/** The verb that dates the current status — "REQUESTED 2 SEP". One per status; the type requires all. */
export const STAND_VERB: Record<QueryStatus, string> = {
  [QueryStatus.QUERIED]: "queried",
  [QueryStatus.PARTIAL_REQUESTED]: "requested",
  [QueryStatus.PARTIAL_SENT]: "sent",
  [QueryStatus.FULL_REQUESTED]: "requested",
  [QueryStatus.FULL_SENT]: "sent",
  [QueryStatus.REVISE_RESUBMIT]: "requested",
  [QueryStatus.RESUBMITTED]: "sent",
  [QueryStatus.OFFER]: "offered",
  [QueryStatus.SIGNED]: "signed",
  [QueryStatus.REJECTED]: "passed",
  [QueryStatus.NO_RESPONSE]: "closed",
  [QueryStatus.WITHDRAWN]: "withdrawn",
};

const isClosed = (r: QcRow) => r.court === "closed";

/**
 * "REQUESTED 2 SEP · DAY 98": when the current status began, then the day count from the date queried.
 * Closed rows drop the day count. A status with no date says so rather than inventing one.
 */
export function standLine(r: QcRow, nowMs: number): string {
  const verb = STAND_VERB[r.status].toUpperCase();
  const when = r.stageStartMs != null ? `${verb} ${upDate(r.stageStartMs, nowMs)}` : `${verb} · NOT DATED`;
  if (isClosed(r) || r.sentMs == null) return when;
  return `${when} · DAY ${Math.max(0, whole(r.sentMs, nowMs))}`;
}

/* ── "Next move" ───────────────────────────────────────────────────────────────────────────────── */

export interface NextLine {
  /** the phrase in Special Elite: "Send partial", "Decide on offer", "Nudge", "Waiting", "Passed" */
  phrase: string;
  /** the mono line beneath: "8 DAYS OVER", "BY FRI 9 OCT · 1 DAY LEFT", "REPLY BY 23 NOV" */
  line: string;
  /** rust: a your-move row that is over, or has two days or fewer left */
  hot: boolean;
}

/** A year of silence past the date: the reference's own threshold for "Consider closing". */
export const CLOSE_AFTER_DAYS = 365;

const sendPhrase = (r: QcRow, c: ComingUp | null): string => {
  if (c && /partial/i.test(c.verb)) return "Send partial";
  if (c && /full/i.test(c.verb)) return "Send full";
  return r.status === QueryStatus.PARTIAL_REQUESTED ? "Send partial" : r.status === QueryStatus.FULL_REQUESTED ? "Send full" : "Send revision";
};

/**
 * ⚠️ THE PHRASE IS THE APP'S OWN NEXT STEP — `comingUp` where the board has a card for the query, and
 * the same vocabulary read from the status and the query's own expected date where it has none, so a
 * query with nothing raised still says what is next.
 */
export function nextLine(r: QcRow, c: ComingUp | null, nowMs: number): NextLine {
  const court = tileCourt(r.status);
  const exp = r.expectedMs;
  const left = exp != null ? whole(nowMs, exp) : null;
  const over = exp != null && exp < nowMs;

  if (isClosed(r) || court == null) {
    const when = r.stageStartMs != null ? ` ${upDate(r.stageStartMs, nowMs)}` : "";
    return { phrase: STAGE_NAME[r.status], line: `${STAND_VERB[r.status].toUpperCase()}${when}`, hot: false };
  }

  if (court === "you") {
    const hot = left != null && (over || left <= 2);
    if (r.status === QueryStatus.OFFER) {
      const line = exp == null ? "NO DATE SET" : over ? `WAS DUE ${upWeekDate(exp)}` : `BY ${upWeekDate(exp)} · ${plural(left!, "DAY", "DAYS")} LEFT`;
      return { phrase: "Decide on offer", line, hot };
    }
    const phrase = sendPhrase(r, c);
    const line = exp == null ? "NO DATE SET" : over ? plural(-left!, "DAY OVER", "DAYS OVER") : `BY ${upDate(exp, nowMs)} · ${plural(left!, "DAY", "DAYS")}`;
    return { phrase, line, hot };
  }

  /* with the agent */
  if (c?.bucket === "fix") return { phrase: c.verb, line: exp != null ? `REPLY BY ${upDate(exp, nowMs)}` : "NO REPLY DATE", hot: false };
  if (over && (c?.bucket === "close" || -left! > CLOSE_AFTER_DAYS)) {
    const yrs = r.sentMs != null ? (whole(r.sentMs, nowMs) / 365).toFixed(1).replace(/\.0$/, "") : null;
    return { phrase: "Consider closing", line: yrs ? `NO REPLY · ${yrs} ${yrs === "1" ? "YEAR" : "YEARS"}` : "NO REPLY", hot: false };
  }
  if (over) return { phrase: "Nudge", line: `OVERDUE SINCE ${upDate(exp!, nowMs)}`, hot: false };
  if (left != null && left <= 6) return { phrase: "Reply due", line: `BY ${upWeekDate(exp!)}`, hot: false };
  return { phrase: "Waiting", line: exp != null ? `REPLY BY ${upDate(exp, nowMs)}` : "NO REPLY DATE", hot: false };
}

/* ── "What you sent" ───────────────────────────────────────────────────────────────────────────── */

export type TileState = "sent" | "not" | "unrecorded";
export interface Tile { kind: MaterialKind; name: string; state: TileState; line: string }
export interface SentCellModel {
  slot: { kind: "package"; name: string; title: string; line: string; packageId: string | null } | { kind: "empty" } | { kind: "add"; title: string; line: string };
  tiles: Tile[];
  /** false for a package send whose package (and so its edition) cannot be found: its pieces are not known */
  known: boolean;
}

const PACK_SLOT: Record<MaterialKind, "ql" | "syn" | "bv" | "other"> = { queryLetter: "ql", synopsis: "syn", sample: "bv", other: "other" };
const IN_WORDS: Record<MaterialKind, string> = { queryLetter: "query letter", synopsis: "synopsis", sample: "opening sample", other: "other material" };

const listWords = (xs: string[]): string => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * The cell for one row. `pkg` is the stored package the send names, when it can be found.
 *
 * ⚠️ THREE SLOT ANSWERS, `sentRecordOf`'s three: a package (the chip), an individual send (an EMPTY slot
 * that keeps its width — never the word "individually", 1 Oct ruling) and unrecorded ("+ Add", four
 * unlit tiles). A send the model calls unrecorded but which carries pieces in `materialsWanted` is an
 * individual send in all but name, so it shows those pieces in an empty slot.
 */
export function sentCell(r: QcRow, pkg: SubmissionPackage | null, nowMs: number): SentCellModel {
  const rec = sentRecordOf(r.query);
  const sentDate = r.sentMs != null ? dayMon(r.sentMs) : null;
  const q = r.query;
  const partialMs = q.partialSentDate ? Date.parse(q.partialSentDate) : NaN;
  const fullMs = q.fullSentDate ? Date.parse(q.fullSentDate) : NaN;
  /* the sample went on request where a partial or a full was sent after the query */
  const onRequestMs = Number.isFinite(fullMs) ? fullMs : Number.isFinite(partialMs) ? partialMs : null;

  if (rec.how === "unrecorded" && !r.materialsRecorded) {
    return {
      slot: { kind: "add", title: "Nothing recorded", line: "Add what you sent: attach the package, or tick the pieces" },
      tiles: MATERIAL_SLOTS.map((k) => ({ kind: k, name: MATERIAL_ROW_NAMES[k], state: "unrecorded" as const, line: "Not recorded" })),
      known: false,
    };
  }

  /* which slots went with the query itself */
  let lit: Record<MaterialKind, boolean>;
  let slot: SentCellModel["slot"];
  let known = true;
  if (rec.how === "package") {
    const eds = pkg ? editionsOf(pkg) : [];
    const ed = eds.find((e) => e.n === rec.edition) ?? eds[eds.length - 1] ?? null;
    const c = ed ? contentsOf(ed) : pkg ? contentsOf(pkg) : null;
    known = !!c;
    lit = { queryLetter: false, synopsis: false, sample: false, other: false };
    if (c) for (const k of MATERIAL_SLOTS) lit[k] = !!c[PACK_SLOT[k]];
    const name = rec.packageName ?? pkg?.packageName ?? "Package";
    const words = MATERIAL_SLOTS.filter((k) => lit[k]).map((k) => IN_WORDS[k]);
    const contents = !c ? "This package is no longer on file" : ed?.summary?.trim() || (words.length ? listWords(words).replace(/^./, (s) => s.toUpperCase()) : "Contents not recorded");
    slot = { kind: "package", name, title: `${name} package`, line: `${sentDate ? `Attached ${sentDate} · ` : ""}${contents}`, packageId: rec.packageId };
  } else {
    lit = { queryLetter: false, synopsis: false, sample: false, other: false };
    slot = { kind: "empty" };
  }
  /* anything recorded against the query lights too: a package's pieces, and what went later on request */
  for (const k of MATERIAL_SLOTS) if (r.materials[k] != null) lit[k] = true;
  if (onRequestMs != null) lit.sample = true;

  const tiles: Tile[] = MATERIAL_SLOTS.map((k) => {
    const value = r.materials[k];
    const name = k === "sample" && value && /\d/.test(value) ? value.split(" · ")[0] : MATERIAL_ROW_NAMES[k];
    /* ⚠️ A PACKAGE WE CANNOT FIND IS NOT A PACKAGE THAT SENT NOTHING: its unlit pieces are not recorded */
    if (!lit[k]) return known ? { kind: k, name, state: "not", line: "Not sent" } : { kind: k, name, state: "unrecorded", line: "Not recorded" };
    const req = k === "sample" && onRequestMs != null;
    const when = req ? dayMon(onRequestMs!) : sentDate;
    return { kind: k, name, state: "sent", line: `${when ? `Sent ${when}` : "Sent"}${req ? " · on request" : ""}` };
  });
  void nowMs;
  return { slot, tiles, known };
}
