/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §2 (design-refs/query-centre-v152/) — THE QUERY CARD AS A CHAT THREAD. Pure derivations only:
 * the thread's messages and the waits between them (§2.3), the tips on a wait (§2.4), the reply box (§2.5), the
 * Agent tab's figures and profile (§2.6) and the Materials tab (§2.7). The card (QcQueryCard149's desktop layout)
 * draws them; nothing here reads the store or writes.
 *
 * ⚠️ WHOSE SIDE IS THE STEP'S, NOT THE COURT'S: the agent's are the requests, the offer, a pass and a holding reply;
 *    the writer's are every send, a nudge and every close the writer made (no response, withdrawn, signed).
 * ⚠️ A STEP'S MATERIALS ARE WHAT WAS RECORDED ON IT (Nick, v152 recon A). An older step carries none, so it shows none —
 *    except Query sent, which shows the query's own record. No chip is derived from a neighbouring step.
 * ⚠️ "THEIR USUAL" IS SAID ONLY WHEN THE AGENT STATES A REPLY TIME (Nick's ruling): their weeks for the query stage,
 *    the house 12 for a partial or a full. Without one, the tip states the days and nothing else.
 */
import { QueryStatus } from "../types";
import { MONTHS_SHORT } from "./dates";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";
import { STATUS_FILL, statusKind } from "./qc1512";
import { classifyMaterial } from "./agentMaterials";
import type { QueryState } from "./queryState";
import { waitWords } from "./qc1522";

const DAY = 86_400_000;
/** whole CALENDAR days from b to a (local midnights): a wait between two dated steps is the days between the dates, never
 *  the hours rounded — two steps 25 calendar days apart at different times of day must not read 26 */
const midnight = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const days = (a: number, b: number) => Math.round((midnight(a) - midnight(b)) / DAY);
/** "16 May", with the year when it is not the year of `nowMs` */
export function dayLabel(ms: number, nowMs: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}
const fullDay = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type Side = "them" | "me";
export interface ThreadChip { label: string; detail: string }
export interface ThreadStepIn {
  key: string;
  activityId?: string;
  status: QueryStatus | null;
  /** a step that is not a status: your nudge, their holding reply, and (v152.1 §2.5) telling other agents about an offer */
  kind: "nudge" | "holding" | "told" | null;
  ms: number | null;
  chips: ThreadChip[];
  /** Query sent's "by email"; a close's reason; told's "offer deadline 16 Oct" (v152.1 §2.5) */
  via?: string | null;
  /** v152.1 §2.6 — the one line the agent said, when there is one */
  quote?: string | null;
  /** v152.1 §2.5 — told other agents: how many */
  toldCount?: number | null;
  /** v152.2 §5 — "Something else": what they asked for ("Asked for a synopsis") */
  askedFor?: string | null;
  /** v152.2 §5 — a line under the bubble: "Form rejection · open to more work", "Resubmit by 12 Nov", "Answer by 9 Oct" */
  sub?: string | null;
  /** the step's event key, where the status alone cannot say what it was (a declined offer is Withdrawn) */
  event?: string | null;
}

const THEM = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED]);
export function sideOf(s: Pick<ThreadStepIn, "status" | "kind">): Side {
  if (s.kind === "holding") return "them";
  if (s.kind === "nudge" || s.kind === "told") return "me";
  return s.status && THEM.has(s.status) ? "them" : "me";
}
const TITLE: Record<string, string> = {
  [QueryStatus.QUERIED]: "Query sent", [QueryStatus.PARTIAL_REQUESTED]: "Asked for a partial", [QueryStatus.PARTIAL_SENT]: "Sent the partial",
  [QueryStatus.FULL_REQUESTED]: "Asked for the full", [QueryStatus.FULL_SENT]: "Sent the full", [QueryStatus.REVISE_RESUBMIT]: "Asked for a revision (R&R)",
  [QueryStatus.RESUBMITTED]: "Sent the revision", [QueryStatus.OFFER]: "Made an offer", [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "You closed it: no response", [QueryStatus.WITHDRAWN]: "You withdrew it", [QueryStatus.SIGNED]: "Signed",
};
export function stepTitle(s: Pick<ThreadStepIn, "status" | "kind"> & { toldCount?: number | null; askedFor?: string | null; event?: string | null }, first: string): string {
  if (s.kind === "nudge") return `You nudged ${first}`;
  /* v152.2 §6.1 — "You told 2 agents about the offer" */
  if (s.kind === "told") return s.toldCount ? `You told ${pl(s.toldCount, "agent")} about the offer` : "You told other agents about the offer";
  if (s.kind === "holding") return "Sent a holding reply";
  if (s.askedFor && s.status === QueryStatus.PARTIAL_REQUESTED) return `Asked for ${s.askedFor.charAt(0).toLowerCase()}${s.askedFor.slice(1)}`;
  if (s.status === QueryStatus.WITHDRAWN && s.event === "offer_declined") return "You declined the offer";
  if (s.status === QueryStatus.SIGNED) return `You accepted ${first}’s offer`;
  return (s.status && TITLE[s.status]) || "A step";
}
/**
 * To-do list v53 (D9) — THE THREAD READS AS MESSAGES. Each bubble says who did what, in the first person for the writer
 * and by first name for the agent ("the agent" when no first name is saved; never he or she):
 *   Queried · You sent {first} your query        Partial requested · {First} asked for a partial (or what they asked for)
 *   Partial sent · You sent {first} your partial  Full requested · {First} asked for your full manuscript
 *   Full sent · You sent {first} your full manuscript   R&R · {First} asked you to revise and resubmit
 *   Resubmitted · You sent {first} your revision  Offer · {First} offered   Rejected · {First} passed
 *   No response · You closed it: no reply         Withdrawn · You withdrew your query (an offer declined: You turned down
 *   {first}'s offer)   Signed · You accepted {first}'s offer   a nudge · You nudged {first}
 *   a holding reply · {First} sent a holding reply   told · You told {n} agents about the offer
 * `stepTitle` (the composer's and the step editor's headings) is unchanged.
 */
const capFirst = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
export function msgTitle(s: Pick<ThreadStepIn, "status" | "kind"> & { toldCount?: number | null; askedFor?: string | null; event?: string | null }, first: string): string {
  const F = capFirst(first);
  if (s.kind === "nudge") return `You nudged ${first}`;
  if (s.kind === "told") return s.toldCount ? `You told ${pl(s.toldCount, "agent")} about the offer` : "You told other agents about the offer";
  if (s.kind === "holding") return `${F} sent a holding reply`;
  switch (s.status) {
    case QueryStatus.QUERIED: return `You sent ${first} your query`;
    case QueryStatus.PARTIAL_REQUESTED: return s.askedFor ? `${F} asked for ${s.askedFor.charAt(0).toLowerCase()}${s.askedFor.slice(1)}` : `${F} asked for a partial`;
    case QueryStatus.PARTIAL_SENT: return `You sent ${first} your partial`;
    case QueryStatus.FULL_REQUESTED: return `${F} asked for your full manuscript`;
    case QueryStatus.FULL_SENT: return `You sent ${first} your full manuscript`;
    case QueryStatus.REVISE_RESUBMIT: return `${F} asked you to revise and resubmit`;
    case QueryStatus.RESUBMITTED: return `You sent ${first} your revision`;
    case QueryStatus.OFFER: return `${F} offered`;
    case QueryStatus.REJECTED: return `${F} passed`;
    case QueryStatus.NO_RESPONSE: return "You closed it: no reply";
    case QueryStatus.WITHDRAWN: return s.event === "offer_declined" ? `You turned down ${first}’s offer` : "You withdrew your query";
    case QueryStatus.SIGNED: return `You accepted ${first}’s offer`;
    default: return "A step";
  }
}
/** v53 (D9): a bubble's short stamp ("2 Apr"), and the day pill above each day's messages ("Today", "Yesterday", "2 April 2024") */
export const stampOf = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function dayPill(ms: number, nowMs: number): string {
  const n = days(nowMs, ms);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}
/** v53 (D9): how a writer's step went, read off the step's own method words ("by email", "by online form", "by post") */
export function viaKind(via: string | null | undefined): "email" | "form" | "post" | null {
  const v = (via ?? "").toLowerCase();
  return /email/.test(v) ? "email" : /form|querymanager/.test(v) ? "form" : /post/.test(v) ? "post" : null;
}

/**
 * v152.1 §2.2 — THE COLOUR RULE, like a messaging app: your bubbles are paper, always; the agent's are tinted by WHAT THE
 * REPLY WAS, the status pills' family, with a 1px inset edge. The glyphs inside are colourless; there is no navy in the
 * thread. A holding reply is the agent's but is not a reply in the table: white with the agent hairline (Nick — grey means
 * passed), its own glyph and its quoted note.
 */
export const MY_PAPER = "#f6f3ee";
export const AGENT_TINT: Record<string, { fill: string; edge: string }> = {
  [QueryStatus.PARTIAL_REQUESTED]: { fill: "#f8e7e0", edge: "#efd2c7" },
  [QueryStatus.FULL_REQUESTED]: { fill: "#e7edf4", edge: "#cfdae7" },
  [QueryStatus.REVISE_RESUBMIT]: { fill: "#e7edf4", edge: "#cfdae7" },
  [QueryStatus.OFFER]: { fill: "#e5eddf", edge: "#cddcc1" },
  [QueryStatus.REJECTED]: { fill: "#f1efec", edge: "#e3dfd9" },
};
/** a holding reply: white, the agent hairline */
export const HOLDING_TINT = { fill: "#ffffff", edge: "#e3dbd0" };
export function tintOf(s: Pick<ThreadStepIn, "status" | "kind">): { fill: string; edge: string } | null {
  if (sideOf(s) === "me") return null;
  return (s.kind === "holding" ? HOLDING_TINT : s.status ? AGENT_TINT[s.status] : null) ?? AGENT_TINT[QueryStatus.REJECTED];
}
/** a pass and your closes are drawn in grey ink (#8a8076); every other glyph in ink */
export const greyGlyph = (s: Pick<ThreadStepIn, "status" | "kind">): boolean =>
  !s.kind && (s.status === QueryStatus.REJECTED || s.status === QueryStatus.NO_RESPONSE || s.status === QueryStatus.WITHDRAWN);

/** the 34px disc's fill: the status's cap colour; Query sent and a nudge (and a holding reply) have none */
export function discFill(s: Pick<ThreadStepIn, "status" | "kind">): string {
  if (s.kind || !s.status || s.status === QueryStatus.QUERIED) return "transparent";
  return STATUS_FILL[statusKind(s.status)];
}

/** v152.1 §2.1 — the thread holds only things that happened: a message per step and the wait between each two */
export type ThreadItem =
  /** v152.2 §2.2 — "44 days later" / "1 day later" / "Same day", on the side of the next message */
  | { t: "wait"; key: string; label: string; tip: string | null; side: Side }
  | { t: "msg"; key: string; activityId?: string; side: Side; status: QueryStatus | null; kind: "nudge" | "holding" | "told" | null; title: string;
      /** "No date" when the step has none (§2.7) */
      date: string; dated: boolean; chips: ThreadChip[]; via: string | null;
      /** v53 (D9): the bubble's corner stamp ("2 Apr"), and its local midnight for the day pills; null when undated */
      stamp: string | null; dayMs: number | null;
      /** the agent's bubble tint (§2.2); null on your side */
      tint: { fill: string; edge: string } | null; grey: boolean;
      /** v152.2 §5 a line under the bubble */
      sub: string | null;
      /** §2.6 the agent's one quoted line */
      quote: string | null;
      /** §2.4 a nudge quotes the query it follows up, and counts itself from the 2nd */
      follows: string | null; nth: string | null };

export interface ThreadCtx {
  first: string;
  nowMs: number;
  state: QueryState;
  /** the stamped reply date (a nudge's window after a nudge) */
  replyMs: number | null;
  /** the agent's stated reply time, weeks; null when not stated */
  agentWeeks: number | null;
}

/** what the step before is called in a tip */
function prevPhrase(p: ThreadStepIn, first: string, forThem: boolean): string {
  if (p.kind === "nudge") return "your nudge";
  switch (p.status) {
    case QueryStatus.QUERIED: return forThem ? "your query" : "the query";
    case QueryStatus.PARTIAL_SENT: return "your partial";
    case QueryStatus.FULL_SENT: return "the full";
    case QueryStatus.RESUBMITTED: return "the revision";
    default: return sideOf(p) === "them" ? `${first} asked` : "your last step";
  }
}
/** the agent's usual for a reply to `prev`, in weeks, or null (said only when they state a reply time) */
export function usualWeeks(prev: ThreadStepIn, agentWeeks: number | null): number | null {
  if (agentWeeks == null) return null;
  if (prev.status === QueryStatus.PARTIAL_SENT) return STAGE_RESPONSE_WINDOWS.partial;
  if (prev.status === QueryStatus.FULL_SENT || prev.status === QueryStatus.RESUBMITTED) return STAGE_RESPONSE_WINDOWS.full;
  if (prev.status === QueryStatus.QUERIED || prev.kind === "nudge") return agentWeeks;
  return null;
}
/** §2.4 — a wait's tip, in facts */
export function waitTip(prev: ThreadStepIn, next: ThreadStepIn, n: number, c: Pick<ThreadCtx, "first" | "agentWeeks">): string {
  /* v152.2 §1.7 — never "0 days": the same day says so */
  const d = n === 0 ? "the same day" : pl(n, "day");
  if (sideOf(next) === "them") {
    const u = usualWeeks(prev, c.agentWeeks);
    const head = `${c.first} replied ${d} after ${prevPhrase(prev, c.first, true)}.`;
    if (u == null) return head;
    const cmp = n < u * 7 - 4 ? "quicker than usual" : n > u * 7 + 4 ? "longer than usual" : "about the same as usual";
    return `${head} Their usual is about ${pl(u, "week")}, so this was ${cmp}.`;
  }
  const what = next.kind === "nudge" ? `nudged ${c.first}`
    : next.status === QueryStatus.PARTIAL_SENT ? "sent the partial"
    : next.status === QueryStatus.FULL_SENT ? "sent the full"
    : next.status === QueryStatus.RESUBMITTED ? "sent the revision"
    : next.status === QueryStatus.NO_RESPONSE ? "closed it"
    : next.status === QueryStatus.WITHDRAWN ? "withdrew it"
    : next.status === QueryStatus.SIGNED ? "signed"
    : "took the next step";
  return `You ${what} ${d} after ${prevPhrase(prev, c.first, false)}.`;
}

const ORD = ["", "", "2nd", "3rd"];
const ordinal = (n: number) => ORD[n] ?? `${n}th`;
/** v152.1 §2.1 — the thread: each step and the wait between each two, from your Query sent to the last thing that
 *  happened. No "Day 1", no "today", no ending bubble: where it stands is the footer's (§3). */
/** a status's place in the pipeline, for placing a step that carries no date */
const STAGE_RANK: Partial<Record<string, number>> = {
  [QueryStatus.QUERIED]: 0, [QueryStatus.PARTIAL_REQUESTED]: 1, [QueryStatus.PARTIAL_SENT]: 2, [QueryStatus.FULL_REQUESTED]: 3,
  [QueryStatus.FULL_SENT]: 4, [QueryStatus.REVISE_RESUBMIT]: 5, [QueryStatus.RESUBMITTED]: 6, [QueryStatus.OFFER]: 7,
  [QueryStatus.REJECTED]: 8, [QueryStatus.NO_RESPONSE]: 8, [QueryStatus.WITHDRAWN]: 8, [QueryStatus.SIGNED]: 9,
};
/**
 * The steps in the order they happened (v152.1 §2.7): the dated ones by date, and each UNDATED step in its place in the
 * pipeline — before the first dated step further along — with "—" either side. An imported step with no date carries no
 * ordering key at all, so the stage is the only thing that can place it; v152 put it at the end of the thread, as
 * though it were the latest thing that happened. An undated step with no status (a nudge) goes last.
 */
export function orderSteps(steps: readonly ThreadStepIn[]): ThreadStepIn[] {
  const out = steps.filter((x) => x.ms != null).sort((a, b) => a.ms! - b.ms!);
  for (const u of steps.filter((x) => x.ms == null)) {
    const r = u.status && !u.kind ? STAGE_RANK[u.status] : undefined;
    const i = r == null ? -1 : out.findIndex((x) => !!x.status && !x.kind && (STAGE_RANK[x.status] ?? -1) > r);
    out.splice(i >= 0 ? i : out.length, 0, u);
  }
  return out;
}
export function buildThread(steps: readonly ThreadStepIn[], c: ThreadCtx): ThreadItem[] {
  const S = orderSteps(steps);
  const out: ThreadItem[] = [];
  const q0 = S.find((x) => x.status === QueryStatus.QUERIED && !x.kind) ?? null;
  let nudges = 0;
  S.forEach((s, i) => {
    if (i) {
      const p = S[i - 1];
      /* v152.2 §2.2 — one italic line on the next message's side; none when either neighbour has no date.
         v53 (D9): none for the same day either ("Same day" is dropped; the day pill says it) */
      if (p.ms != null && s.ms != null && days(s.ms, p.ms) > 0) {
        const n = Math.max(0, days(s.ms, p.ms));
        out.push({ t: "wait", key: `w-${s.key}`, label: waitWords(n), tip: waitTip(p, s, n, c), side: sideOf(s) });
      }
    }
    if (s.kind === "nudge") nudges += 1;
    out.push({
      t: "msg", key: s.key, activityId: s.activityId, side: sideOf(s), status: s.status, kind: s.kind,
      title: msgTitle(s, c.first), sub: s.sub ?? null, date: s.ms != null ? dayLabel(s.ms, c.nowMs) : "Not dated", dated: s.ms != null,
      stamp: s.ms != null ? stampOf(s.ms) : null, dayMs: s.ms != null ? midnight(s.ms) : null,
      chips: s.chips, via: s.via ?? null, tint: tintOf(s), grey: greyGlyph(s),
      quote: sideOf(s) === "them" && (s.quote ?? "").trim() ? s.quote!.trim() : null,
      follows: s.kind === "nudge" ? (q0?.ms != null ? `Query sent · ${dayLabel(q0.ms, c.nowMs)}` : "Query sent") : null,
      nth: s.kind === "nudge" && nudges >= 2 ? `${ordinal(nudges)} nudge` : null,
    });
  });
  return out;
}

/* ── §2.5 the reply box ─────────────────────────────────────────────────────────────────────────────────────── */

export type ReplyAct = "offer" | "sent" | "nudge" | "resp" | "close" | "reopen" | "tell";
/**
 * v152.1 §3 — THE FOOTER IS THE ONLY PLACE THAT SAYS WHERE THE QUERY STANDS: an icon (the stage's glyph on its tint, the
 * reply-time ring, a clock, or the closed grey glyph), two lines, and the action. Its button opens the record form and
 * never writes (as v152's reply box).
 */
export type FootIcon =
  | { k: "stage"; status: QueryStatus; tint: string }
  | { k: "ring"; p: number }
  | { k: "clock" }
  | { k: "grey"; status: QueryStatus };
export interface ReplyBox {
  icon: FootIcon; lead: string; sub: string; late: boolean; button: string; tone: "navy" | "outline"; act: ReplyAct;
  /** §3 the offer's second action, "Tell other agents", while no told step exists */
  second: { label: string; act: ReplyAct } | null;
}
export interface ReplyCtx {
  state: QueryState;
  status: QueryStatus | string;
  first: string;
  nowMs: number;
  /** the offer's deadline, or the send-by date (writer's turn) */
  dueMs: number | null;
  /** the stamped reply date (after a nudge: the nudge plus the quiet window) */
  replyMs: number | null;
  /** the day it closed */
  closedMs: number | null;
  /** the thread's steps: whether you nudged, when the agent asked, a told step, how far it got */
  steps?: readonly ThreadStepIn[];
  /** the quiet window, weeks (the ring's "Quiet after N weeks") */
  quietWeeks?: number;
  /** a close's reason ("an offer elsewhere") */
  reason?: string | null;
  /** you nudged, by the states' own rule (lib/queryState nudgeMsOf: `lastNudgeSentDate`, else `nudgeDate`) — a nudge need
   *  not be a step on the log, so the steps alone cannot say */
  nudged?: boolean;
}
function leftWords(dueMs: number | null, nowMs: number): { sub: string; late: boolean } {
  if (dueMs == null) return { sub: "No date set", late: false };
  const n = days(dueMs, nowMs);
  if (n < 0) return { sub: `${pl(-n, "day")} late`, late: true };
  if (n === 0) return { sub: `Due today · ${dayLabel(dueMs, nowMs)}`, late: false };
  return { sub: `${pl(n, "day")} left · by ${dayLabel(dueMs, nowMs)}`, late: false };
}
const FURTHEST: [QueryStatus, string][] = [
  [QueryStatus.RESUBMITTED, "the revision"], [QueryStatus.FULL_SENT, "the full"], [QueryStatus.FULL_REQUESTED, "the full request"],
  [QueryStatus.PARTIAL_SENT, "the partial"], [QueryStatus.PARTIAL_REQUESTED, "the partial request"],
];
export function replyBox(c: ReplyCtx): ReplyBox {
  const f = c.first;
  const S = orderSteps(c.steps ?? []);
  const lastOf = (st: QueryStatus) => [...S].reverse().find((x) => x.status === st && !x.kind) ?? null;
  const told = [...S].reverse().find((x) => x.kind === "told") ?? null;
  const base = { late: false, second: null };
  switch (c.state) {
    case "offer": {
      const w = leftWords(c.dueMs, c.nowMs);
      const by = c.dueMs != null ? ` · answer by ${dayLabel(c.dueMs, c.nowMs)}` : "";
      const sub = told ? `You told ${told.toldCount ? pl(told.toldCount, "other", "others") : "others"}${told.via ? ` · ${told.via.replace(/^offer deadline/, "deadline")}` : ""}`
        : w.late ? w.sub : `${w.sub.replace(/ · by .*$/, "")}${by}`;
      return { ...base, icon: { k: "stage", status: QueryStatus.OFFER, tint: AGENT_TINT[QueryStatus.OFFER].fill }, lead: `${f} made an offer`, sub, late: !told && w.late,
        button: "Answer the offer", tone: "navy", act: "offer", second: told ? null : { label: "Tell other agents", act: "tell" } };
    }
    case "materials": {
      if (c.status === QueryStatus.REVISE_RESUBMIT) {
        const rr = lastOf(QueryStatus.REVISE_RESUBMIT);
        return { ...base, icon: { k: "stage", status: QueryStatus.REVISE_RESUBMIT, tint: AGENT_TINT[QueryStatus.REVISE_RESUBMIT].fill }, lead: "Revise and resubmit",
          sub: rr?.ms != null ? `${f} asked on ${dayLabel(rr.ms, c.nowMs)}` : `${f} asked for a revision`, button: "Mark revision sent", tone: "navy", act: "sent" };
      }
      const full = c.status === QueryStatus.FULL_REQUESTED;
      const st = full ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED;
      const w = leftWords(c.dueMs, c.nowMs);
      return { ...base, icon: { k: "stage", status: st, tint: AGENT_TINT[st].fill }, lead: `Send the ${full ? "full" : "partial"}`, sub: w.sub, late: w.late,
        button: `Mark ${full ? "full" : "partial"} sent`, tone: "navy", act: "sent" };
    }
    case "nudge": {
      const ago = c.replyMs != null ? Math.max(0, days(c.nowMs, c.replyMs)) : null;
      return { ...base, icon: { k: "clock" }, lead: `No reply from ${f} yet`,
        sub: c.replyMs != null ? `Reply was due ${dayLabel(c.replyMs, c.nowMs)} · ${pl(ago!, "day")} ago` : "Reply is overdue", late: true, button: "Nudge", tone: "outline", act: "nudge" };
    }
    case "agent": {
      const nudged = c.nudged ?? S.some((x) => x.kind === "nudge" && x.ms != null && x.ms >= (Math.max(...S.filter((y) => !y.kind && y.ms != null).map((y) => y.ms!), 0)));
      const anchor = [...S].reverse().find((x) => x.ms != null && x.kind !== "told")?.ms ?? null;
      const p = anchor != null && c.replyMs != null && c.replyMs > anchor ? Math.max(0, Math.min(1, (c.nowMs - anchor) / (c.replyMs - anchor))) : 0;
      const left = c.replyMs != null ? Math.max(0, days(c.replyMs, c.nowMs)) : null;
      const sub = nudged && c.replyMs != null ? `Quiet after ${pl(c.quietWeeks ?? 4, "week")} · ${pl(left!, "day")} to go`
        : c.replyMs != null ? `Reply expected by ${dayLabel(c.replyMs, c.nowMs)}` : "No reply date";
      return { ...base, icon: { k: "ring", p }, lead: `Waiting on ${f}`, sub, button: "Record a response", tone: "outline", act: "resp" };
    }
    case "quiet":
      return { ...base, icon: { k: "clock" }, lead: `No reply from ${f}`,
        sub: `${c.replyMs != null ? `Quiet since ${dayLabel(c.replyMs, c.nowMs)}` : "No reply yet"} · close it, or keep waiting`, button: "Close it", tone: "outline", act: "close" };
    default: {
      const st = (c.status as QueryStatus) ?? QueryStatus.REJECTED;
      const on = c.closedMs != null ? dayLabel(c.closedMs, c.nowMs) : null;
      if (st === QueryStatus.WITHDRAWN) {
        return { ...base, icon: { k: "grey", status: st }, lead: "You withdrew", sub: [on, c.reason].filter(Boolean).join(" · ") || "Withdrawn", button: "Reopen", tone: "outline", act: "reopen" };
      }
      if (st === QueryStatus.NO_RESPONSE) {
        return { ...base, icon: { k: "grey", status: st }, lead: "Closed: no response", sub: on ? `On ${on}${c.reason ? ` · ${c.reason}` : ""}` : "Closed", button: "Reopen", tone: "outline", act: "reopen" };
      }
      const after = FURTHEST.find(([x]) => S.some((y) => y.status === x && !y.kind))?.[1] ?? "the query";
      return { ...base, icon: { k: "grey", status: QueryStatus.REJECTED }, lead: `${f} passed`, sub: on ? `On ${on} · after ${after}` : `After ${after}`, button: "Reopen", tone: "outline", act: "reopen" };
    }
  }
}

/* ── §2.6 the Agent tab ─────────────────────────────────────────────────────────────────────────────────────── */

type Mat = { kind: "letter" | "synopsis" | "sample" | "full" | "other"; unit?: "chapters" | "pages" | "words"; n?: number; text?: string };
/** a material label, read for comparing what was asked with what went */
export function readMat(label: string): Mat {
  const v = label.trim();
  const l = v.toLowerCase();
  if (/full manuscript|revised manuscript/.test(l)) return { kind: "full" };
  if (/letter/.test(l)) return { kind: "letter" };
  if (/synopsis/.test(l)) return { kind: "synopsis" };
  const c = classifyMaterial(v);
  if (c.unit) return { kind: "sample", unit: c.unit.toLowerCase() as Mat["unit"], n: c.count ? Number(c.count) : undefined };
  let m: RegExpMatchArray | null;
  if ((m = l.match(/(?:first\s+)?([\d,]+)\s+(pages?|chapters?|words?)/))) {
    const u = m[2].startsWith("page") ? "pages" : m[2].startsWith("chapter") ? "chapters" : "words";
    return { kind: "sample", unit: u, n: Number(m[1].replace(/,/g, "")) };
  }
  if (/opening sample|sample/.test(l)) return { kind: "sample" };
  return { kind: "other", text: l };
}
/** does what went cover what was asked? 10 pages covers a request for 5; a different unit cannot be compared, so it covers */
export function covers(sent: string, ask: string): boolean {
  const s = readMat(sent), a = readMat(ask);
  if (s.kind !== a.kind) return false;
  if (a.kind === "other") return s.text === a.text;
  if (a.kind !== "sample") return true;
  if (a.n == null || s.n == null || a.unit !== s.unit) return true;
  return s.n >= a.n;
}
export interface AskChip { label: string; sent: boolean }
export function askChips(asks: readonly string[], sent: readonly string[]): { chips: AskChip[]; missing: string[] } {
  const chips = asks.map((a) => ({ label: a, sent: sent.some((s) => covers(s, a)) }));
  return { chips, missing: chips.filter((c) => !c.sent).map((c) => c.label) };
}

/* ── §2.7 the Materials tab ─────────────────────────────────────────────────────────────────────────────────── */

export interface MatBlock { key: string; activityId?: string; status: QueryStatus; title: string; date: string; chips: ThreadChip[]; request: boolean; note: string | null; pkg: boolean }
const SEND_OF: Partial<Record<string, QueryStatus>> = {
  [QueryStatus.PARTIAL_REQUESTED]: QueryStatus.PARTIAL_SENT, [QueryStatus.FULL_REQUESTED]: QueryStatus.FULL_SENT, [QueryStatus.REVISE_RESUBMIT]: QueryStatus.RESUBMITTED,
};
const SENDS = new Set<string>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED]);
const REQ_NAME: Record<string, string> = { [QueryStatus.PARTIAL_REQUESTED]: "Partial", [QueryStatus.FULL_REQUESTED]: "Full", [QueryStatus.REVISE_RESUBMIT]: "Revision" };
export function materialsTab(steps: readonly ThreadStepIn[], c: { first: string; nowMs: number; dueMs: number | null; writerTurn: boolean }): { blocks: MatBlock[]; summary: { sent: number; requests: number } } {
  const S = [...steps].sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity));
  const blocks: MatBlock[] = [];
  let sent = 0, requests = 0;
  S.forEach((s, i) => {
    if (!s.status || s.kind) return;
    if (SENDS.has(s.status)) {
      sent += s.chips.length;
      blocks.push({ key: s.key, activityId: s.activityId, status: s.status, title: stepTitle(s, c.first), date: s.ms != null ? dayLabel(s.ms, c.nowMs) : "No date", chips: s.chips, request: false, note: null, pkg: s.status === QueryStatus.QUERIED });
      return;
    }
    const send = SEND_OF[s.status];
    if (!send) return;
    if (S.slice(i + 1).some((x) => x.status === send)) return;
    requests++;
    const due = c.writerTurn ? c.dueMs : null;
    const date = due != null ? (days(due, c.nowMs) < 0 ? `${pl(-days(due, c.nowMs), "day")} late` : `by ${dayLabel(due, c.nowMs)}`)
      : s.ms != null ? `asked ${dayLabel(s.ms, c.nowMs)}` : "";
    blocks.push({
      key: s.key, activityId: s.activityId, status: s.status, title: `${REQ_NAME[s.status]} to send`,
      date,
      chips: s.chips, request: true, pkg: false,
      note: `${c.first} asked${s.ms != null ? ` on ${dayLabel(s.ms, c.nowMs)}` : ""}. It moves here once you mark it sent.`,
    });
  });
  return { blocks, summary: { sent, requests } };
}
export function materialsSummary(s: { sent: number; requests: number }, first: string): string {
  const a = s.sent ? `${pl(s.sent, "thing")} sent to ${first}` : "Nothing sent yet";
  return s.requests ? `${a} · ${pl(s.requests, "request")} to send` : a;
}
/** a request block's date words: "8 days late" / "by 15 Oct" */
export const requestLate = (dueMs: number | null, nowMs: number) => leftWords(dueMs, nowMs);
