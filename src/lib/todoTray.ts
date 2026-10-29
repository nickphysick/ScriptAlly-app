/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoTray — the To-do list v5 page's model: the tray's five groups, its three counts, its sort and
 * filters, the due dial, the desk's facts and lede, and "Coming up". Pure; every figure is read
 * from a derivation that already exists (`cardBucket`, `taskDeed`, `listRowInputs`, `dueFor`,
 * `ticketFacts`, `stageHistory`, `expectedFor`). Nothing new is stored.
 *
 * ⚠️ THE GROUPS ARE `cardBucket`'s SIX, FOLDED TO FIVE, AND THE COUNTS FOLD THE SAME SIX TO THREE.
 *    One table each, both keyed on the bucket, so a row's group and the card's count row cannot
 *    disagree about which pile a task is in.
 * ⚠️ A LEDE STATES FACTS AND NOTHING ELSE. No appraisal, no urgency words, no pronoun for an agent:
 *    the agent's first name or the agency. A fact the record does not hold is left out of the
 *    sentence, never guessed into it. `LEDE_FORBIDDEN` is what the lock sweeps for.
 */
import { MUTED_UNTIL } from "./taskFlags";
import type { Agent, Manuscript, Query, SubmissionPackage, TaskFlag, UserTask, Activity } from "../types";
import { QueryStatus } from "../types";
import type { BoardCard } from "./todoBoard";
import { cardBucket, taskDeed, type Bucket } from "./todoBuckets";
import { listRowInputs, dueFor, type TaskData } from "./taskCardFacts";
import { ticketFacts } from "./ticketFacts";
import { elapsedPhrase } from "./elapsed";
import { agentPrimary } from "./agentDisplay";
import { dayMonth, formatDate } from "./dates";
import { expectedFor } from "./qcSummary";
import { isSweepCard } from "./todoColumns";
import type { HkGroup } from "./todoHousekeeping";

/* ── groups and counts ────────────────────────────────────────────────────────────────────────── */

export type TrayGroupId = "you" | "chase" | "quiet" | "tidy" | "mine";
export type TrayKind = "you" | "chase" | "tidy";

export interface TrayGroup {
  id: TrayGroupId;
  name: string;
  /** the group's note on the desk card's head band */
  note: string;
  buckets: Bucket[];
  tint: string;
  ink: string;
  /** v5.2 §D — the band's drawing, by its width on a 56px band (equal weight, not equal width). It stands 3px above the
   *  band's floor in a slot centred at x 31; compact bands scale the width (todoV52.css `--td5-artk`) */
  art: { src: string; w: number };
}

/** the table's order IS the tray's order */
export const TRAY_GROUPS: readonly TrayGroup[] = [
  { id: "you", name: "Your move", note: "Asked of you", buckets: ["send", "decide"], tint: "#f6e2d8", ink: "#a2452a",
    art: { src: "/images/query-centre/your-move-talon.webp", w: 42 } },
  { id: "chase", name: "Worth a nudge", note: "Past the reply date", buckets: ["chase"], tint: "#e2e7ef", ink: "#2a3a52",
    art: { src: "/images/query-centre/waiting-hourglass.webp", w: 49 } },
  { id: "quiet", name: "Gone quiet", note: "Time to decide", buckets: ["close"], tint: "#ece8e3", ink: "rgba(28, 19, 15, 0.6)",
    art: { src: "/images/packages/materials-tray-pile.png", w: 50 } },
  { id: "tidy", name: "Housekeeping", note: "Gaps worth filling", buckets: ["fix"], tint: "#e3e8e1", ink: "#4f6250",
    art: { src: "/images/contact/contact-index-hawk.webp", w: 53 } },
  { id: "mine", name: "Your tasks", note: "Your own", buckets: ["note"], tint: "#f4ecdc", ink: "#8a6a3c",
    art: { src: "/images/dash/quill.png", w: 44 } },
];

export const TRAY_KINDS: readonly { id: TrayKind; label: string; buckets: Bucket[] }[] = [
  { id: "you", label: "Your move", buckets: ["send", "decide"] },
  { id: "chase", label: "To chase", buckets: ["chase", "close"] },
  { id: "tidy", label: "To tidy", buckets: ["fix", "note"] },
];

export const groupOf = (c: BoardCard): TrayGroup => {
  const b = cardBucket(c);
  return TRAY_GROUPS.find((g) => g.buckets.includes(b))!;
};
export const kindOf = (c: BoardCard): TrayKind => {
  const b = cardBucket(c);
  return TRAY_KINDS.find((k) => k.buckets.includes(b))!.id;
};
export function kindCounts(cards: readonly BoardCard[]): Record<TrayKind, number> {
  const n: Record<TrayKind, number> = { you: 0, chase: 0, tidy: 0 };
  for (const c of cards) n[kindOf(c)] += 1;
  return n;
}

/* ── the deed ─────────────────────────────────────────────────────────────────────────────────── */

/** `taskDeed`, read for the desk. A revision is its own act: `taskDeed` reads every `decide` as an offer. */
export function trayDeed(c: BoardCard): string {
  if (c.taskType === "revise_resubmit") return "Send the revision";
  if (c.taskType === "data_quality_poor") return "Fill in their profile";
  /* ⚠️ `taskDeed` reads every other `fix` as "Fill in what you sent", which is the materials gap's deed
     alone. The rest of the bucket (the drawer's tell-the-agents tasks, a recheck, a hand-off) keep the
     card's own title, which names the act. */
  if (cardBucket(c) === "fix" && c.taskType !== "materials_unrecorded" && c.taskType !== "materials_unrecorded_bulk") return c.title;
  return taskDeed(c);
}

/* ── per-card facts ───────────────────────────────────────────────────────────────────────────── */

export interface TrayDb extends TaskData {
  packages: SubmissionPackage[];
  taskFlags: TaskFlag[];
  manuscripts: Manuscript[];
  /** the board's housekeeping groups, which a sweep card stands for (assembleBoardColumns' `hkGroups`) */
  hkGroups?: HkGroup[];
}

/* ⚠️ A PROFILE GAP NEVER REACHES THE TRAY AS ITS OWN CARD. `groupHousekeeping` folds every `data_quality_poor` card
   into one sweep card per NEED ("3 reply times"), so the desk reads a sweep by its rule: the deed is the act, the
   agents are its members, and with exactly one member the door is that agent's card at that field. */
export const SWEEP_DEED: Record<string, string> = {
  dq_responseTime: "Add their reply time", dq_materials: "Add what they want sent", dq_mswl: "Add their wishlist",
};
export const SWEEP_NEED: Record<string, "responseTime" | "materials" | "mswl"> = {
  dq_responseTime: "responseTime", dq_materials: "materials", dq_mswl: "mswl",
};
export const groupFor = (c: BoardCard, db: Pick<TrayDb, "hkGroups">): HkGroup | undefined =>
  isSweepCard(c) ? db.hkGroups?.find((g) => g.rule === c.sweepRule) : undefined;

const DAY = 86400000;
const ymdMs = (ymd: string | null | undefined): number => {
  if (!ymd) return NaN;
  const t = Date.parse(`${ymd}T12:00:00`);
  return Number.isFinite(t) ? t : NaN;
};
const anyMs = (v: unknown): number => {
  if (!v) return NaN;
  if (typeof v === "string") { const t = Date.parse(v.length === 10 ? `${v}T12:00:00` : v); return Number.isFinite(t) ? t : NaN; }
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === "function") return o.toMillis();
  if (typeof o.seconds === "number") return o.seconds * 1000;
  return NaN;
};
export const localYmd = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface Dial {
  kind: "late" | "run" | "none";
  /** share of the window elapsed, 0–1 (run only) */
  frac: number;
  day: number | null;
  mon: string;
  ymd: string | null;
  title: string;
}

export interface TrayItem {
  card: BoardCard;
  key: string;
  group: TrayGroup;
  kind: TrayKind;
  bucket: Bucket;
  deed: string;
  query?: Query;
  agent?: Agent;
  userTask?: UserTask;
  /** the row's italic line */
  sub: string;
  /** the disc's initials, or null for an own task (a quill) */
  initials: string | null;
  who: string;
  whoSub: string;
  dial: Dial;
  /** the clock's anchor (ms) — what "oldest" sorts on */
  anchorMs: number;
  /** a search haystack: deed, agent, agency */
  hay: string;
  /** the due bucket for the Due filter */
  due: "past" | "week" | "later" | "none";
  sweep: boolean;
}

const initialsOf = (name: string): string => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "··";
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase();
};
const firstName = (a?: Agent): string => {
  if (!a) return "The agent";
  const n = (a.name || "").trim();
  if (n) return n.split(/\s+/)[0];
  return (a.agency || "The agent").trim();
};

/** the end of this week (Sunday), local */
const weekEndYmd = (now: number): string => {
  const d = new Date(now);
  const wd = (d.getDay() + 6) % 7; // Mon 0
  return localYmd(now + (6 - wd) * DAY);
};

export function dialFor(dueYmd: string | null, anchorMs: number, now: number): Dial {
  if (!dueYmd) return { kind: "none", frac: 0, day: null, mon: "", ymd: null, title: "No date" };
  const due = ymdMs(dueYmd);
  const d = new Date(due);
  const day = d.getDate();
  const mon = dayMonth(due).split(" ")[1] ?? "";
  const today = localYmd(now);
  if (dueYmd < today) return { kind: "late", frac: 1, day, mon, ymd: dueYmd, title: `Past ${dayMonth(due)}` };
  const span = due - anchorMs;
  const frac = Number.isFinite(span) && span > 0 ? Math.max(0.06, Math.min(1, (now - anchorMs) / span)) : 0.5;
  return { kind: "run", frac, day, mon, ymd: dueYmd, title: dueYmd === today ? "Today" : formatDate(due, { day: "numeric", month: "long" }) };
}

export function trayItem(card: BoardCard, db: TrayDb, now: number): TrayItem {
  const bucket = cardBucket(card);
  const query = card.relatedRecordId ? db.queries.find((q) => q.id === card.relatedRecordId) : undefined;
  const userTask = card.userTaskId ? db.userTasks.find((t) => t.id === card.userTaskId) : undefined;
  const sweepGroup = groupFor(card, db);
  const agentId = query?.agentId ?? card.agentId ?? userTask?.agentId
    ?? (sweepGroup && sweepGroup.members.length === 1 ? sweepGroup.members[0].agentId : undefined)
    ?? (card.taskType === "data_quality_poor" && !isSweepCard(card) ? card.relatedRecordId : undefined);
  const agent = agentId ? db.agents.find((a) => a.id === agentId) : undefined;
  const inp = listRowInputs(card, db);
  const due = dueFor(card, db, db.taskFlags);
  const anchorMs = typeof inp.days === "number" ? now - inp.days * DAY : NaN;
  const dial = dialFor(due.ymd, anchorMs, now);
  const own = !!card.userTaskId;
  const name = agent ? agentPrimary(agent) : "";
  const agency = (agent?.agency ?? "").trim();
  const onBoard = own && userTask?.colour !== undefined;
  let who = name || agency || card.who || "";
  let whoSub = agency && name ? agency : "";
  let sub = [name, agency].filter(Boolean).join(" · ");
  if (own) {
    who = "Your own task";
    whoSub = agent ? `With ${agentPrimary(agent)}` : onBoard ? "Pinned to your corkboard" : "Added by you";
    sub = onBoard ? "Pinned to your corkboard" : agent ? `With ${agentPrimary(agent)}` : "Your own task";
  } else if (isSweepCard(card)) {
    const m = sweepGroup?.members ?? [];
    const names = m.map((x) => x.agentName);
    if (m.length === 1) { who = names[0]; whoSub = m[0].agency ?? ""; sub = [names[0], m[0].agency].filter(Boolean).join(" · "); }
    else {
      who = `${m.length || card.sweepOf} agents`;
      whoSub = names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : "");
      sub = whoSub || card.record || "";
    }
  } else if (!sub) {
    sub = card.record || card.subtitle || "";
  }
  const today = localYmd(now);
  const dueKey: TrayItem["due"] = !dial.ymd ? "none" : dial.ymd < today ? "past" : dial.ymd <= weekEndYmd(now) ? "week" : "later";
  const deed = isSweepCard(card) && SWEEP_DEED[card.sweepRule] ? SWEEP_DEED[card.sweepRule] : trayDeed(card);
  return {
    card, key: card.key, group: groupOf(card), kind: kindOf(card), bucket, deed, query, agent, userTask, sub,
    initials: own ? null : initialsOf(name || agency || (isSweepCard(card) ? `${card.sweepOf} ` : card.title)),
    who, whoSub, dial, anchorMs: Number.isFinite(anchorMs) ? anchorMs : (userTask?.createdAt ? Date.parse(userTask.createdAt) : now),
    hay: `${deed} ${name} ${agency} ${card.title}`.toLowerCase(), due: dueKey, sweep: isSweepCard(card),
  };
}

/* ── sort and filters ─────────────────────────────────────────────────────────────────────────── */

export type TraySort = "urgent" | "oldest" | "agent";
export const SORT_LABEL: Record<TraySort, string> = { urgent: "most urgent first", oldest: "oldest first", agent: "by agent" };

const dueRank = (i: TrayItem): [number, number] => {
  if (i.dial.kind === "late") return [0, ymdMs(i.dial.ymd)];
  if (i.dial.kind === "run") return [1, ymdMs(i.dial.ymd)];
  return [2, 0];
};
export function sortItems(items: readonly TrayItem[], sort: TraySort): TrayItem[] {
  const urgent = (a: TrayItem, b: TrayItem) => {
    const [ra, ta] = dueRank(a); const [rb, tb] = dueRank(b);
    return ra - rb || ta - tb || a.anchorMs - b.anchorMs;
  };
  const out = [...items];
  if (sort === "urgent") out.sort(urgent);
  else if (sort === "oldest") out.sort((a, b) => a.anchorMs - b.anchorMs || urgent(a, b));
  else out.sort((a, b) => (a.agent ? agentPrimary(a.agent) : "￿").localeCompare(b.agent ? agentPrimary(b.agent) : "￿") || urgent(a, b));
  return out;
}

export interface TrayFilters {
  find: string;
  /** a count row (Your move · To chase · To tidy) or a group */
  type: TrayKind | TrayGroupId | null;
  agentId: string | null;
  due: TrayItem["due"] | null;
  linked: boolean;
  pinned: boolean;
}
export const NO_FILTERS: TrayFilters = { find: "", type: null, agentId: null, due: null, linked: false, pinned: false };
export const filtersOn = (f: TrayFilters): boolean => !!(f.find.trim() || f.type || f.agentId || f.due || f.linked || f.pinned);

export function matches(i: TrayItem, f: TrayFilters, hasPin: (i: TrayItem) => boolean): boolean {
  const q = f.find.trim().toLowerCase();
  if (q && !i.hay.includes(q)) return false;
  if (f.type) {
    if (f.type === "you" || f.type === "chase" || f.type === "tidy") { if (f.type !== i.kind && i.group.id !== f.type) return false; }
    else if (i.group.id !== f.type) return false;
  }
  if (f.agentId && i.agent?.id !== f.agentId) return false;
  if (f.due && i.due !== f.due) return false;
  if (f.linked && !i.query) return false;
  if (f.pinned && !hasPin(i)) return false;
  return true;
}
/** `type` names a count row first: "you" is the count row (send + decide), which is also the group */
export function matchesType(i: TrayItem, t: TrayFilters["type"]): boolean {
  if (!t) return true;
  if (t === "you" || t === "chase" || t === "tidy") return i.kind === t;
  return i.group.id === t;
}

/** the tray's order: the groups in table order, each sorted */
export function trayOrder(items: readonly TrayItem[], sort: TraySort): { group: TrayGroup; items: TrayItem[] }[] {
  const sorted = sortItems(items, sort);
  return TRAY_GROUPS.map((g) => ({ group: g, items: sorted.filter((i) => i.group.id === g.id) })).filter((x) => x.items.length > 0);
}

/* ── the desk: facts, lede, where it stands ───────────────────────────────────────────────────── */

export interface Fact { label: string; value: string; pkg?: boolean; muted?: boolean }

const stageWord = (s: QueryStatus | string | undefined): string => {
  switch (s) {
    case QueryStatus.PARTIAL_SENT: return "partial";
    case QueryStatus.FULL_SENT: return "full";
    case QueryStatus.RESUBMITTED: return "revision";
    default: return "query";
  }
};
const lastSendMs = (q?: Query): number => {
  if (!q) return NaN;
  const t = [q.dateSent, q.partialSentDate, q.fullSentDate].map(anyMs).filter(Number.isFinite);
  return t.length ? Math.max(...t) : NaN;
};
const pkgOf = (q: Query | undefined, db: TrayDb): string | null => {
  if (!q) return null;
  if (q.sentHow === "package" && q.sentPackageName) return q.sentPackageName;
  const pid = q.sentPackageId || q.packageId;
  return pid ? (db.packages.find((p) => p.id === pid)?.packageName ?? null) : null;
};
const longDay = (t: number) => formatDate(t, { day: "numeric", month: "long" });

/** other live queries for the same manuscript whose agent holds the full */
export function othersHoldingFull(q: Query | undefined, db: TrayDb): number {
  if (!q) return 0;
  return db.queries.filter((x) => x.id !== q.id && x.manuscriptId === q.manuscriptId && x.status === QueryStatus.FULL_SENT).length;
}

const NEED_WORDS: Record<string, string> = { responseTime: "Usual reply time", materials: "What to send", mswl: "Manuscript wishlist" };
export function profileNeeds(a?: Agent): string[] {
  if (!a) return [];
  const out: string[] = [];
  if (a.responseTimeWeeks === 0) out.push("responseTime");
  const mw = (a as { materialsWanted?: unknown }).materialsWanted;
  if (!Array.isArray(mw) || mw.length === 0) out.push("materials");
  if (!((a as { mswlNotes?: string }).mswlNotes ?? "").trim()) out.push("mswl");
  return out;
}

export function deskFacts(i: TrayItem, db: TrayDb, now: number): Fact[] {
  const inp = listRowInputs(i.card, db);
  const tf = ticketFacts(i.card, { days: inp.days, dateLabel: inp.anchorDate, elapsed: typeof inp.days === "number" ? elapsedPhrase(inp.days) : null });
  const first: Fact = { label: tf.dateKey, value: tf.dateValue };
  const second: Fact = { label: tf.spanKey, value: tf.spanValue };
  const q = i.query;
  switch (i.bucket) {
    case "send": {
      const pkg = pkgOf(q, db);
      return [{ label: "Asked for", value: inp.ask || (inp.partial ? "A partial" : "The full manuscript") }, first,
        pkg ? { label: "Package", value: pkg, pkg: true } : { label: "Package", value: "None recorded", muted: true }];
    }
    case "decide": {
      if (i.card.taskType === "offer_received") {
        const by = anyMs(q?.offerResponseDeadline);
        return [first, { label: "Answer by", value: Number.isFinite(by) ? longDay(by) : "Not set", muted: !Number.isFinite(by) },
          { label: "Holding your full", value: String(othersHoldingFull(q, db)) }];
      }
      return [first, second, { label: "Package", value: pkgOf(q, db) ?? "None recorded", pkg: !!pkgOf(q, db), muted: !pkgOf(q, db) }];
    }
    case "chase": {
      const w = i.agent?.responseTimeWeeks;
      return [first, second, { label: "Their window", value: w ? `${w} weeks` : "Not stated", muted: !w }];
    }
    case "close": {
      const n = i.agent?.noResponseMeansNo;
      return [first, second, { label: "No reply means no", value: n === true ? "Yes" : n === false ? "No" : "Not stated", muted: n === undefined }];
    }
    case "fix": {
      const g = groupFor(i.card, db);
      if (g && SWEEP_NEED[g.rule]) {
        return [{ label: "Missing", value: NEED_WORDS[SWEEP_NEED[g.rule]] }, { label: g.members.length === 1 ? "Agent" : "Agents", value: g.members.length === 1 ? g.members[0].agentName : String(g.members.length) },
          { label: "Queried", value: String(g.members.filter((m) => m.queried).length) }];
      }
      const needs = profileNeeds(i.agent);
      if (i.card.taskType === "data_quality_poor" && needs.length) {
        return [{ label: "Missing", value: needs.map((n) => NEED_WORDS[n]).join(", ") }, { label: "Agent", value: i.agent ? agentPrimary(i.agent) : "—" }, first];
      }
      return [first, second, { label: "Agent", value: i.agent ? agentPrimary(i.agent) : "—", muted: !i.agent }];
    }
    case "note":
    default: {
      const t = i.userTask;
      const due = t?.dueDate ? ymdMs(t.dueDate) : NaN;
      const added = t?.createdAt ? Date.parse(t.createdAt) : NaN;
      return [{ label: "Due", value: Number.isFinite(due) ? (t!.dueDate === localYmd(now) ? "Today" : dayMonth(due)) : "No date" },
        { label: "Linked to", value: i.agent ? agentPrimary(i.agent) : "Nothing", muted: !i.agent },
        { label: "Added", value: Number.isFinite(added) ? dayMonth(added) : "—" }];
    }
  }
}

/** words a lede must never use: appraisal, urgency, and gendered pronouns */
export const LEDE_FORBIDDEN = /\b(overdue|late|honest|fair|oldest|he|she|him|her|his|hers|himself|herself)\b/i;

export function lede(i: TrayItem, db: TrayDb, now: number): string {
  const q = i.query;
  const first = firstName(i.agent);
  const agency = (i.agent?.agency ?? "").trim() || first;
  const inp = listRowInputs(i.card, db);
  switch (i.bucket) {
    case "send": {
      const material = inp.ask ? inp.ask.charAt(0).toLowerCase() + inp.ask.slice(1) : inp.partial ? "a partial" : "your full manuscript";
      const by = anyMs(q?.expectedSendDate);
      if (!inp.anchorDate) return `${first} asked for ${material}. It hasn’t gone yet.`;
      return `${first} asked for ${material} on ${inp.anchorDate}. ${Number.isFinite(by) ? `Your send-by date is ${longDay(by)}.` : "No date was agreed."}`;
    }
    case "decide": {
      if (i.card.taskType === "revise_resubmit") {
        const t = anyMs(q?.lastStatusChange);
        return Number.isFinite(t) ? `${first} asked for a revision on ${longDay(t)}.` : `${first} asked for a revision.`;
      }
      const on = anyMs(q?.offerDate);
      const by = anyMs(q?.offerResponseDeadline);
      const k = othersHoldingFull(q, db);
      const s1 = `${first} offered representation${Number.isFinite(on) ? ` on ${longDay(on)}` : ""}${Number.isFinite(by) ? ` and asked for an answer by ${longDay(by)}` : ""}.`;
      return k > 0 ? `${s1} ${k === 1 ? "One other agent holds" : `${k} other agents hold`} your full.` : s1;
    }
    case "chase": {
      const sent = lastSendMs(q);
      const w = i.agent?.responseTimeWeeks;
      const win = w ? `${agency}’s stated window is ${w} weeks.` : `${agency} doesn’t state a reply time.`;
      if (!Number.isFinite(sent)) return win;
      const days = Math.max(0, Math.floor((now - sent) / DAY));
      const span = days >= 14 ? `${Math.floor(days / 7)} weeks` : days === 1 ? "1 day" : `${days} days`;
      return `${span} since your ${stageWord(q?.status)} went to ${first}. ${win}`;
    }
    case "close": {
      const sent = lastSendMs(q);
      const nudge = anyMs(q?.lastNudgeSentDate);
      const s1 = Number.isFinite(sent)
        ? `No reply since ${longDay(sent)}${Number.isFinite(nudge) ? `, and nothing since your nudge on ${longDay(nudge)}` : ""}.`
        : "No reply on record.";
      return i.agent?.noResponseMeansNo ? `${s1} ${agency} says no reply means no.` : s1;
    }
    case "fix": {
      const g = groupFor(i.card, db);
      if (g && SWEEP_NEED[g.rule]) {
        const need = NEED_WORDS[SWEEP_NEED[g.rule]].toLowerCase();
        const n = g.members.length;
        const queried = g.members.filter((m) => m.queried).length;
        const s1 = n === 1 ? `${g.members[0].agentName}’s profile has no ${need} on record.` : `${n} agents’ profiles have no ${need} on record.`;
        return queried ? `${s1} ${n === 1 ? "You have queried this agent." : `You have queried ${queried} of them.`}` : s1;
      }
      if (i.card.taskType === "data_quality_poor") {
        const needs = profileNeeds(i.agent).map((n) => NEED_WORDS[n].toLowerCase());
        if (!needs.length) return "";
        const list = needs.length === 1 ? needs[0] : `${needs.slice(0, -1).join(", ")} or ${needs[needs.length - 1]}`;
        return `${i.agent ? `${agentPrimary(i.agent)}’s` : "This"} profile has no ${list} on record.`;
      }
      /* a card's own subtitle is not written to this page's rule, so it is only used where it keeps it */
      const sub = (i.card.subtitle || "").trim();
      return sub && !LEDE_FORBIDDEN.test(sub) ? sub : "";
    }
    case "note":
    default:
      return (i.userTask?.detail || i.card.detail || "").trim(); // the writer's own words
  }
}

export interface Stop { status: string; ms: number; nudge?: boolean }
/** the dated stops on "Where it stands": the stage spans, and each nudge as a plain dot */
export function whereItStands(q: Query | undefined, spans: readonly { status: string; startMs: number }[], acts: readonly Activity[]): Stop[] {
  if (!q) return [];
  const out: Stop[] = spans.filter((s) => Number.isFinite(s.startMs) && s.startMs > 0).map((s) => ({ status: s.status, ms: s.startMs }));
  for (const a of acts) {
    if (a.queryId !== q.id || a.eventKey !== "nudge_sent") continue;
    const t = Date.parse(a.date);
    if (Number.isFinite(t)) out.push({ status: "Nudged", ms: t, nudge: true });
  }
  return out.sort((a, b) => a.ms - b.ms);
}

/* ── Coming up (all caught up) ────────────────────────────────────────────────────────────────── */

/** v12 — what lands: a planned nudge, the check-back after a nudge, an agent's reply date, an own task, a snooze's return */
export type UpcomingKind = "nudge" | "check" | "reply" | "own" | "back";
export interface Upcoming { ms: number; ymd: string; name: string; line: string; anchorMs: number; kind: UpcomingKind; queryId?: string; agentId?: string }
/**
 * The next three dates a task will land: an agent's reply date passing, a nudge check-back, and an
 * own task's date. Read from `expectedFor` (the Query Centre's own clock) and the stored dates.
 */
export function comingUp(db: TrayDb, now: number, limit = 3): Upcoming[] {
  const today = localYmd(now);
  const out: Upcoming[] = [];
  for (const q of db.queries) {
    const a = db.agents.find((x) => x.id === q.agentId);
    const name = a ? agentPrimary(a) : "An agent";
    const nudgeAt = anyMs(q.nudgeDate);
    const nudged = anyMs(q.lastNudgeSentDate);
    if (Number.isFinite(nudgeAt) && Number.isFinite(nudged) && localYmd(nudgeAt) > today) {
      out.push({ ms: nudgeAt, ymd: localYmd(nudgeAt), name, line: "The check-back after your nudge.", anchorMs: nudged, kind: "check", queryId: q.id, agentId: a?.id });
      continue;
    }
    /* v12 — before any nudge, `nudgeDate` is the writer's planned nudge: the day `replyTask` raises the nudge task on
       (taskDue's "chase" case reads it the same way) */
    if (Number.isFinite(nudgeAt) && !Number.isFinite(nudged) && localYmd(nudgeAt) > today) {
      out.push({ ms: nudgeAt, ymd: localYmd(nudgeAt), name, line: "The nudge you planned.", anchorMs: lastSendMs(q), kind: "nudge", queryId: q.id, agentId: a?.id });
      continue;
    }
    const e = expectedFor(q, a);
    if (e.kind === "reply" && e.ms != null && localYmd(e.ms) > today) {
      out.push({ ms: e.ms, ymd: localYmd(e.ms), name, line: `${(q.status as string) === QueryStatus.QUERIED ? "Query" : String(q.status)} with the agent. The reply date passes.`, anchorMs: lastSendMs(q), kind: "reply", queryId: q.id, agentId: a?.id });
    }
  }
  /* v5.1 §I.6 — an own dated task lands on the day it SURFACES (its due day less its surface offset), not its due day */
  for (const t of db.userTasks) {
    if (t.done || !t.dueDate) continue;
    const lead = t.surfaceOffset === "week-before" ? 7 : t.surfaceOffset === "day-before" ? 1 : 0;
    const d = new Date(ymdMs(t.dueDate)); d.setDate(d.getDate() - lead);
    const joins = localYmd(d.getTime());
    if (joins <= today) continue;
    out.push({ ms: ymdMs(joins), ymd: joins, name: t.text || "Your task", line: lead ? "Your own task joins your tray." : "Your own task is due.", anchorMs: Date.parse(t.createdAt || ""), kind: "own" });
  }
  /* v5.1 §G — a snooze coming back on its day */
  for (const f of db.taskFlags) {
    if (!f.snoozedUntil || f.snoozedUntil === MUTED_UNTIL || f.skippedAt || f.taskType === "offer_received") continue;
    const ms = Date.parse(f.snoozedUntil);
    if (!Number.isFinite(ms) || localYmd(ms) <= today) continue;
    const q = f.queryId ? db.queries.find((x) => x.id === f.queryId) : undefined;
    const a = db.agents.find((x) => x.id === (q ? q.agentId : f.agentId));
    const own = f.taskType === "user_task" ? db.userTasks.find((t) => t.id === f.queryId) : undefined;
    out.push({ ms, ymd: localYmd(ms), name: own ? own.text || "Your task" : a ? agentPrimary(a) : "A task", line: "A snooze comes back.", anchorMs: NaN, kind: own ? "own" : "back", queryId: q?.id, agentId: a?.id });
  }
  return out.sort((a, b) => a.ms - b.ms).slice(0, limit);
}

/* ── the action words ─────────────────────────────────────────────────────────────────────────── */

export function actionWords(i: TrayItem): string {
  switch (i.bucket) {
    case "send": return `Mark the ${i.card.taskType === "partial_requested" ? "partial" : "full"} sent`;
    case "decide": return i.card.taskType === "revise_resubmit" ? "Mark the revision sent" : "Open the offer";
    case "chase": return "Record a nudge";
    case "close": return "Decide what to do";
    case "fix":
      if (i.card.taskType === "data_quality_poor" && (!i.sweep || (isSweepCard(i.card) && i.card.sweepOf === 1))) return "Add it to their profile";
      if (i.sweep && SWEEP_DEED[(i.card as BoardCard & { sweepRule?: string }).sweepRule ?? ""]) return "Fill them in";
      if (i.card.taskType === "offer_send_full") return "Mark the full sent";
      if (i.sweep || (i.card.taskType ?? "").startsWith("materials_unrecorded")) return "Fill it in";
      return "Open it";
    case "note":
    default: return "Tick it off";
  }
}
