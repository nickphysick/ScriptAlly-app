/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 §3.2 (design-refs/query-centre-v152-2/card-journeys.html, screens 10–60) — THE CARD'S FOOTER: two
 * lines and the action, per state, and the quieter link beside it. Supersedes v152.1's reply box (lib/qcThread152
 * `replyBox`). Pure: it says what the footer reads and which composer each control opens; the card draws it and the
 * page opens the composer.
 *
 * ⚠️ NEVER "0 days" (§1.7): a reply due today says "today", a nudge sent today "Nudged today".
 * ⚠️ THE CLOSE RULE IS lib/queryState `closeLeads` (stamped on the row): nudged, or 8+ weeks past the reply date → Close
 *    it leads and Nudge is the link; otherwise the other way round. The list row reads the same stamp (lib/qc1512 rowAct).
 */
import { QueryStatus } from "../types";
import { MONTHS_SHORT } from "./dates";
import { AGENT_TINT, type FootIcon } from "./qcThread152";
import type { QueryState } from "./queryState";

const DAY = 86_400_000;
const midnight = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** whole calendar days from b to a */
export const calDays = (a: number, b: number) => Math.round((midnight(a) - midnight(b)) / DAY);
const day = (ms: number, nowMs: number) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
};
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** what a control opens */
export type FootAct = "offer" | "tell" | "sent" | "nudge" | "close" | "resp" | "reopen";
/** where an offer stands: answered with time taken (Deciding), or accepted */
export type OfferPhase = "offer" | "deciding" | "signed";
export interface Foot1522 {
  icon: FootIcon;
  lead: string;
  sub: string;
  late: boolean;
  /** the main button, or none (Offer accepted) */
  button: { label: string; tone: "navy" | "outline"; act: FootAct } | null;
  /** the quieter link beside it */
  link: { label: string; act: FootAct } | null;
}
export interface FootCtx {
  state: QueryState;
  status: QueryStatus | string;
  /** the agent's first name, or "the agent" */
  first: string;
  /** the agent's full name, for "Signed with Tom Ellery" */
  fullName: string;
  nowMs: number;
  phase: OfferPhase | null;
  /** the offer's answer-by date, or the send-by / resubmit-by date on your turn */
  dueMs: number | null;
  /** the reply date (before any nudge) */
  replyMs: number | null;
  /** the latest nudge, if any (lib/queryState nudgeMsOf) */
  nudgeMs: number | null;
  /** the quiet window, weeks */
  quietWeeks: number;
  /** Close it leads on a gone-quiet query (lib/queryState closeLeads) */
  closeLeads: boolean;
  /** agents still to tell about the offer (Deciding), or after accepting */
  toTell: number;
  /** "Something else": what was asked for */
  askedFor: string | null;
  /** when it closed, and how */
  closedMs: number | null;
  closedHow: "passed" | "noresp" | "withdrawn" | "declined" | null;
}

export function footer1522(c: FootCtx): Foot1522 {
  const f = c.first;
  const none = { late: false, link: null };
  switch (c.state) {
    case "offer": {
      if (c.phase === "deciding") {
        const by = c.dueMs != null ? `Answer by ${day(c.dueMs, c.nowMs)}` : "No answer-by date";
        return { ...none, icon: { k: "stage", status: QueryStatus.OFFER, tint: AGENT_TINT[QueryStatus.OFFER].fill }, lead: "Deciding",
          sub: `${by} · ${c.toTell ? `${c.toTell} to tell` : "all agents told"}`,
          button: { label: "Accept or decline", tone: "navy", act: "offer" }, link: c.toTell ? { label: "Tell them", act: "tell" } : null };
      }
      let sub: string, late = false;
      if (c.dueMs == null) sub = `${f} hasn’t given an answer-by date`;
      else {
        const n = calDays(c.dueMs, c.nowMs);
        const by = `${f} wants an answer by ${day(c.dueMs, c.nowMs)}`;
        sub = n < 0 ? `${pl(-n, "day")} late · ${by}` : n === 0 ? `Due today · ${by}` : `${pl(n, "day")} left · ${by}`;
        late = n < 0;
      }
      return { ...none, late, icon: { k: "stage", status: QueryStatus.OFFER, tint: AGENT_TINT[QueryStatus.OFFER].fill }, lead: `${f} made an offer`, sub,
        button: { label: "Answer the offer", tone: "navy", act: "offer" } };
    }
    case "materials": {
      const rr = c.status === QueryStatus.REVISE_RESUBMIT;
      const full = c.status === QueryStatus.FULL_REQUESTED;
      const st = rr ? QueryStatus.REVISE_RESUBMIT : full ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED;
      const icon: FootIcon = { k: "stage", status: st, tint: AGENT_TINT[st].fill };
      if (rr) {
        return { ...none, icon, lead: "Revise and resubmit", sub: c.dueMs != null ? `by ${day(c.dueMs, c.nowMs)}` : `${f} hasn’t set a date`,
          button: { label: "Mark resubmitted", tone: "navy", act: "sent" } };
      }
      const what = c.askedFor ? c.askedFor.charAt(0).toLowerCase() + c.askedFor.slice(1) : null;
      const lead = what ? `Send ${what}` : full ? "Send the full" : "Send the partial";
      const label = what ? "Mark sent" : full ? "Mark full sent" : "Mark partial sent";
      let sub = "No date set", late = false;
      if (c.dueMs != null) {
        const n = calDays(c.dueMs, c.nowMs);
        sub = n < 0 ? `${pl(-n, "day")} late · was due ${day(c.dueMs, c.nowMs)}` : n === 0 ? `Due today · ${day(c.dueMs, c.nowMs)}` : `by ${day(c.dueMs, c.nowMs)}`;
        late = n < 0;
      }
      return { ...none, late, icon, lead, sub, button: { label, tone: "navy", act: "sent" } };
    }
    case "nudge": {
      const ago = c.replyMs != null ? Math.max(0, calDays(c.nowMs, c.replyMs)) : null;
      const when = ago == null ? "" : ago === 0 ? " · today" : ` · ${pl(ago, "day")} ago`;
      return { ...none, icon: { k: "clock" }, lead: `No reply from ${f} yet`,
        sub: c.replyMs != null ? `Reply was due ${day(c.replyMs, c.nowMs)}${when}` : "Reply is overdue",
        button: { label: "Nudge", tone: "navy", act: "nudge" }, link: { label: "Close it", act: "close" } };
    }
    case "agent": {
      let sub: string;
      if (c.nudgeMs != null) {
        const quiet = c.nudgeMs + c.quietWeeks * 7 * DAY;
        const nd = calDays(c.nowMs, c.nudgeMs) === 0 ? "Nudged today" : `Nudged ${day(c.nudgeMs, c.nowMs)}`;
        sub = `${nd} · goes quiet on ${day(quiet, c.nowMs)}`;
      } else sub = c.replyMs != null ? `Reply expected by ${day(c.replyMs, c.nowMs)}` : "No reply date";
      return { ...none, icon: { k: "clock" }, lead: `Waiting on ${f}`, sub, button: { label: "Record a response", tone: "outline", act: "resp" } };
    }
    case "quiet": {
      const lead = `No reply from ${f}`;
      if (c.nudgeMs != null) {
        const since = c.nudgeMs + c.quietWeeks * 7 * DAY;
        return { ...none, icon: { k: "clock" }, lead, sub: `Nudged ${day(c.nudgeMs, c.nowMs)} · quiet since ${day(since, c.nowMs)}`,
          button: { label: "Close it", tone: "navy", act: "close" }, link: { label: "Nudge again", act: "nudge" } };
      }
      const was = c.replyMs != null ? `Reply was due ${day(c.replyMs, c.nowMs)}` : "No reply date";
      if (c.closeLeads) {
        const wk = c.replyMs != null ? Math.floor(calDays(c.nowMs, c.replyMs) / 7) : null;
        return { ...none, icon: { k: "clock" }, lead, sub: wk != null ? `${was} · quiet for ${pl(wk, "week")}` : `${was} · not nudged yet`,
          button: { label: "Close it", tone: "navy", act: "close" }, link: { label: "Nudge", act: "nudge" } };
      }
      return { ...none, icon: { k: "clock" }, lead, sub: `${was} · not nudged yet`,
        button: { label: "Nudge", tone: "navy", act: "nudge" }, link: { label: "Close it", act: "close" } };
    }
    default: {
      if (c.phase === "signed" || c.status === QueryStatus.SIGNED) {
        const on = c.closedMs != null ? ` · ${day(c.closedMs, c.nowMs)}` : "";
        /* one card on the To-do list, however many agents it names */
        const todo = c.toTell ? " · 1 to-do left" : "";
        return { ...none, icon: { k: "stage", status: QueryStatus.SIGNED, tint: AGENT_TINT[QueryStatus.OFFER].fill }, lead: "You have an agent",
          sub: `Signed with ${c.fullName}${on}${todo}`, button: null };
      }
      const how = c.closedHow === "passed" ? `${f} passed` : c.closedHow === "withdrawn" ? "You withdrew it" : c.closedHow === "declined" ? "You declined" : "No response";
      const on = c.closedMs != null ? ` · ${day(c.closedMs, c.nowMs)}` : "";
      const st = (c.status as QueryStatus) || QueryStatus.REJECTED;
      return { ...none, icon: { k: "grey", status: st }, lead: "Closed", sub: `${how}${on}`, button: { label: "Reopen", tone: "outline", act: "reopen" } };
    }
  }
}

/* ── §2.1 the band ────────────────────────────────────────────────────────────────────────────────────────────── */

export const BAND_NAVY = "#2a3a52";
export const BAND_CLOSED = "#f1efec";
/** every band is navy with white text, except Gone quiet (the stone-to-white gradient) and Closed (`#f1efec`), in ink */
export function band1522(state: QueryState, phase: OfferPhase | null, quietBg: string): { bg: string; dark: boolean; word: string } {
  if (phase === "signed") return { bg: BAND_NAVY, dark: true, word: "OFFER ACCEPTED" };
  if (state === "quiet") return { bg: quietBg, dark: false, word: "GONE QUIET" };
  if (state === "closed") return { bg: BAND_CLOSED, dark: false, word: "CLOSED" };
  const word = state === "offer" ? (phase === "deciding" ? "DECIDING" : "OFFER")
    : state === "materials" ? "MATERIALS REQUESTED" : state === "nudge" ? "NUDGE DUE" : "WITH THE AGENT";
  return { bg: BAND_NAVY, dark: true, word };
}
