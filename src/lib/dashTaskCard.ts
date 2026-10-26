/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v71 — THE TASK CARD'S MODEL (ref design-refs/dashboard-v71/).
 *
 * One card cycles through the plan's items (`lib/dashList`), in the plan's order. Each item is drawn
 * as one of four kinds:
 *   nudge  — the board's "Worth a nudge" items: the reply-window bar
 *   close  — the board's "Gone quiet" items: the reply-window bar with the close threshold marked
 *   send   — a request for pages (partial, full, revision; the full an offer asks for): step chips
 *   other  — everything else (an offer to answer, housekeeping, ready to query, coming up), drawn
 *            with v60.1's own label and title
 *
 * Every date is read from what the app already derives: the send and the stages from the Query
 * Centre's rows (`buildQcRows` → `stageHistory`, `expectedFor`), the close threshold from the To-do
 * board's own rule (`taskPrecedence`). Nothing here is stored and nothing here writes.
 *
 * ⚠️ NO "HE" OR "SHE". The agent is their first name, or "the agent".
 */
import { QueryStatus, type Agent, type Query } from "../types";
import type { ListItem } from "./dashList";
import type { QcRow } from "./qcSummary";
import { STAGE_NAME } from "./qcSummary";
import { closeAfterDays, NUDGE_GRACE_DAYS } from "./taskPrecedence";
import { numberWords } from "./livingHeaders";
import { dayMonth, formatDate } from "./dates";

export type TaskKind = "nudge" | "close" | "send" | "other";

export const DWELL_MS = 7000;
export const MAX_SEGMENTS = 12;

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/**
 * Dashboard v93 — THE KIND BAND (ref design-refs/dashboard-v93/, option A). The card's head is a full band like the
 * chart's: the kind is its title in sentence case ("other" uses the item's own label, e.g. "Housekeeping"), on the
 * kind's colour. `accent` colours the progress segments under the band. The v71 kicker pill and tinted head are
 * retired, with their `kicker` and `tint`.
 */
export const KIND_STYLE: Record<TaskKind, { title: string | null; band: string; bandInk: string; accent: string }> = {
  nudge: { title: "Time to nudge", band: "#2a3a52", bandInk: "#ffffff", accent: "#2a3a52" },
  close: { title: "Consider closing", band: "#e4dfd7", bandInk: "#1c130f", accent: "#7d7064" },
  send: { title: "Your move", band: "#a2452a", bandInk: "#ffffff", accent: "#a2452a" },
  other: { title: null, band: "#5f7591", bandInk: "#ffffff", accent: "#5f7591" },
};

/** The task types whose card is a request for pages, and the word for what was asked for. */
const SEND_MATERIAL: Record<string, "partial" | "full" | "revision"> = {
  partial_requested: "partial",
  full_requested: "full",
  offer_send_full: "full",
  revise_resubmit: "revision",
};
/** The step still to do, by material. */
const TODO_STEP: Record<"partial" | "full" | "revision", string> = { partial: "Partial sent", full: "Full sent", revision: "Resubmitted" };

export function kindOf(item: Pick<ListItem, "group" | "taskType">): TaskKind {
  if (item.group === "nudge") return "nudge";
  if (item.group === "quiet") return "close";
  if (item.group === "req" && item.taskType && SEND_MATERIAL[item.taskType]) return "send";
  return "other";
}

export interface TaskBar {
  /** the solid part: from the send to the expected date, as a share of send → today (0–1) */
  solid: number;
  /** close only: the threshold, as a share of send → today (0–1); null for a nudge */
  close: number | null;
  closeLabel: string | null;
  sentLabel: string;
  /** nudge only: "Expected 13 Sep", placed at `solid` */
  expectedLabel: string | null;
  todayLabel: string;
  /** the raw dates, for the locks */
  sentMs: number;
  expectedMs: number | null;
  closeMs: number | null;
  todayMs: number;
}

export interface TaskStep { label: string; date: string; done: boolean }

export interface TaskCardModel {
  key: string;
  kind: TaskKind;
  /** the band's title: the kind, or the item's own label for "other" */
  bandTitle: string;
  band: string;
  bandInk: string;
  accent: string;
  /** the title, split round the name so the name can be set bold */
  pre: string;
  who: string;
  post: string;
  /** the mono line under the title: the agency */
  sub: string;
  initials: string;
  date: { dow: string; day: string } | null;
  /** the one plain-English line; null for "other" where the item carries none */
  line: string | null;
  bar: TaskBar | null;
  steps: TaskStep[] | null;
  /** the title as plain words, lowercased where it opens on a verb ("Then: send your partial to …") */
  plain: string;
  queryId: string | null;
}

export interface TaskCtx {
  queries: readonly Query[];
  agents: readonly Agent[];
  /** the Query Centre's rows for the scoped queries */
  qcRows: readonly QcRow[];
  nowMs: number;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const long = (ms: number) => formatDate(ms, { day: "numeric", month: "long" });
/** "six weeks", "one week", "four days" — a span said in words, never a figure in a sentence */
export function spanWords(ms: number): string {
  const days = Math.max(0, Math.round(ms / DAY));
  if (days < 14) return `${days === 0 ? "less than a day" : `${words(days)} ${days === 1 ? "day" : "days"}`}`;
  const w = Math.round(days / 7);
  return `${words(w)} ${w === 1 ? "week" : "weeks"}`;
}
const words = (n: number) => (n < 100 ? numberWords(n) : String(n));
const weeksRound = (ms: number) => Math.max(0, Math.round(ms / WEEK));
const firstName = (a: Agent | undefined): string | null => {
  const n = (a?.name ?? "").trim();
  return n ? n.split(/\s+/)[0] : null;
};

/** The verb for the last send, by the stage a waiting query stands at. */
const SENT_LABEL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
};
const SENT_VERB: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "queried",
  [QueryStatus.PARTIAL_SENT]: "sent the partial",
  [QueryStatus.FULL_SENT]: "sent the full",
  [QueryStatus.RESUBMITTED]: "resubmitted",
};

/**
 * ⚠️ THE CLOSE THRESHOLD IS THE BOARD'S OWN RULE (`replyTask` in taskPrecedence), read back as a
 * date: the writer's "Consider closing" plan when there is one; for an agent whose silence is a
 * stated pass, the window plus the grace; otherwise the earlier of a nudge ignored for another
 * full window and the hard ceiling from the original send.
 */
export function closeThresholdMs(q: Query, agent: Agent | undefined, sentMs: number, expectedMs: number | null): number | null {
  const at = (iso?: string) => { const t = iso ? Date.parse(iso) : NaN; return Number.isNaN(t) ? null : t; };
  const plan = at(q.closePlan);
  if (plan != null) return plan;
  const weeks = agent?.responseTimeWeeks ?? 0;
  if (agent?.noResponseMeansNo && expectedMs != null) return expectedMs + NUDGE_GRACE_DAYS * DAY;
  const out: number[] = [];
  const nudged = at(q.lastNudgeSentDate);
  if (nudged != null && weeks > 0) out.push(nudged + weeks * WEEK);
  const sentAt = at(q.dateSent) ?? sentMs;
  if (weeks > 0) out.push(sentAt + closeAfterDays(weeks) * DAY);
  return out.length ? Math.min(...out) : null;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function taskCardModel(item: ListItem, label: string, ctx: TaskCtx): TaskCardModel {
  const kind = kindOf(item);
  const style = KIND_STYLE[kind];
  const queryId = item.action.kind === "drawer" && item.action.request.mode !== "log" ? item.action.request.queryId ?? null : null;
  const q = queryId ? ctx.queries.find((x) => x.id === queryId) : undefined;
  const agent = q ? ctx.agents.find((a) => a.id === q.agentId) : undefined;
  const qc = queryId ? ctx.qcRows.find((r) => r.id === queryId) : undefined;
  const who = item.who;
  const first = firstName(agent);
  const agency = (agent?.agency ?? "").trim();
  const base = {
    key: item.key, kind, bandTitle: style.title ?? label, band: style.band, bandInk: style.bandInk, accent: style.accent,
    sub: item.agency || item.fact, initials: item.initials, date: item.date, queryId,
  };

  if (kind === "nudge" || kind === "close") {
    const status = qc?.status ?? q?.status as QueryStatus | undefined;
    const sentMs = qc?.stageStartMs ?? qc?.sentMs ?? null;
    const expectedMs = qc?.expectedMs ?? null;
    const pre = kind === "nudge" ? "Nudge " : "Close your query to ";
    const post = kind === "nudge" ? "" : "?";
    let line: string;
    let bar: TaskBar | null = null;
    if (sentMs != null) {
      const span = Math.max(1, ctx.nowMs - sentMs);
      const closeMs = kind === "close" && q ? closeThresholdMs(q, agent, sentMs, expectedMs) : null;
      const pastWeeks = closeMs != null && expectedMs != null ? weeksRound(closeMs - expectedMs) : null;
      bar = {
        solid: expectedMs != null ? clamp01((expectedMs - sentMs) / span) : 0,
        close: closeMs != null ? clamp01((closeMs - sentMs) / span) : null,
        closeLabel: pastWeeks != null ? `CLOSE AFTER ${pastWeeks} ${pastWeeks === 1 ? "WK" : "WKS"} PAST` : null,
        sentLabel: `${(status && SENT_LABEL[status]) || "Sent"} ${dayMonth(sentMs)}`,
        expectedLabel: kind === "nudge" && expectedMs != null ? `Expected ${dayMonth(expectedMs)}` : null,
        todayLabel: `Today · ${weeksRound(ctx.nowMs - sentMs)} wks`,
        sentMs, expectedMs, closeMs, todayMs: ctx.nowMs,
      };
    }
    if (kind === "nudge") {
      const verb = (status && SENT_VERB[status]) || "queried";
      const w = agent?.responseTimeWeeks;
      const whose = first ? `${first}’s` : "The agent’s";
      const since = sentMs != null ? `No reply since you ${verb} on ${long(sentMs)}.` : "No reply yet.";
      line = typeof w === "number" && w > 0 ? `${since} ${whose} usual reply time is ${words(w)} ${w === 1 ? "week" : "weeks"}.` : `${since} ${whose} reply window has passed.`;
    } else {
      const waited = sentMs != null ? `${cap(spanWords(ctx.nowMs - sentMs))} without a reply` : "No reply";
      const past = expectedMs != null && ctx.nowMs > expectedMs ? weeksRound(ctx.nowMs - expectedMs) : 0;
      line = `${waited}${past > 0 ? `, ${words(past)} past the expected date` : ""}. Closing it keeps your pipeline honest, and you can reopen it any time.`;
    }
    return { ...base, pre, who, post, line, bar, steps: null, plain: `${pre.toLowerCase()}${who}${post}` };
  }

  if (kind === "send") {
    const material = SEND_MATERIAL[item.taskType as string];
    const pre = `Send your ${material} to `;
    const asked = qc?.stageStartMs ?? null;
    const asker = agency || first || "The agent";
    const line = asked != null
      ? `${asker} asked for the ${material} on ${long(asked)}. ${ctx.nowMs - asked < DAY ? "It came in today." : `It’s been with you ${spanWords(ctx.nowMs - asked)}.`}`
      : `${asker} asked for the ${material}.`;
    const done = (qc?.history.spans ?? []).slice(-2).map((s) => ({ label: STAGE_NAME[s.status], date: dayMonth(s.startMs), done: true }));
    const steps: TaskStep[] = [...done, { label: TODO_STEP[material], date: "—", done: false }];
    return { ...base, pre, who, post: "", line, bar: null, steps, plain: `${pre.toLowerCase()}${who}` };
  }

  /* every other kind: v60.1's own title and sentence */
  const plain = `${item.pre ? item.pre.charAt(0).toLowerCase() + item.pre.slice(1) : ""}${item.who}${item.post}`;
  return { ...base, pre: item.pre, who, post: item.post, line: item.note, bar: null, steps: null, plain };
}

/** The window of at most twelve progress segments, keeping the current one in view. */
export function segmentWindow(n: number, index: number): { start: number; count: number } {
  const count = Math.min(n, MAX_SEGMENTS);
  const start = Math.min(Math.max(0, index - Math.floor(count / 2)), n - count);
  return { start, count };
}
