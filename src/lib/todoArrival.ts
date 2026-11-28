/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 (design-refs/todo-arrival-v1/, 28 Nov) — WHAT THE TO-DO PAGE SHOWS WHEN IT OPENS, as pure functions,
 * so the locks call what the page calls:
 *   · the desk's mode on arrival: no task is open until the writer chooses one ("Where to start");
 *   · the task remembered for a return in the same visit (memory only: a module store, never localStorage);
 *   · the run-through's words and shapes: the hawk's line, the piles, the waiting line, the Start button;
 *   · a journey task's "steps ahead" lines.
 * ⚠️ THE HAWK NEVER SAYS IT WILL WATCH, CHECK OR KEEP AN EYE OUT (v53 D12): every line here states what is on the list.
 */
import type { StepMaterial } from "./qc152Write";
import { matLabel } from "./qc152Write";
import { QueryStatus } from "../types";
import { daysWaiting, trayFigure, type WsGroupId, type WsTask } from "./todoWs";

/* ── the desk's mode ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** the groups that need the writer: everything but Housekeeping (folded by default, never urgent) */
export const needsYou = (t: Pick<WsTask, "group">): boolean => t.group !== "house";

export type DeskMode = "outline" | "empty" | "caught-up" | "run" | "task";
/**
 * What the desk draws. ⚠️ NO TASK IS OPEN UNTIL THE WRITER CHOOSES ONE: with no task selected (no arrival key, nothing
 * remembered, or the remembered task has gone) the desk is "Where to start" — but only while something needs the writer.
 * Zero tasks keeps "Nothing to do yet"; only housekeeping keeps "You're all caught up." Nothing draws before the tasks
 * are in (To-do load v1's `tasksReady`).
 */
export function deskMode(s: { loaded: boolean; all: readonly Pick<WsTask, "group">[]; selected: boolean }): DeskMode {
  if (!s.loaded) return "outline";
  if (!s.all.length) return "empty";
  if (s.selected) return "task";
  return s.all.some(needsYou) ? "run" : "caught-up";
}

/** the selected task: the key's own row in the tray's order, else anywhere on the list — and never a fallback (v1 Phase 1) */
export function selectedTask<T extends { key: string }>(order: readonly T[], all: readonly T[], selKey: string | null): T | null {
  if (!selKey) return null;
  return order.find((t) => t.key === selKey) ?? all.find((t) => t.key === selKey) ?? null;
}

/* ── the task remembered for a return in the same visit ─────────────────────────────────────────────────────────────
   ⚠️ MEMORY ONLY. A reload starts the module again (so it is cleared); its scope is the account and the active book, so a
   sign-out or a manuscript switch reads nothing; `forgetTodoTask` is also called on sign-out. */
let remembered: { scope: string; key: string | null } | null = null;
export const todoTaskScope = (uid: string | null | undefined, manuscriptId: string | null | undefined): string => `${uid ?? ""}|${manuscriptId ?? ""}`;
export function rememberTodoTask(scope: string, key: string | null): void { remembered = { scope, key }; }
export function rememberedTodoTask(scope: string): string | null { return remembered && remembered.scope === scope ? remembered.key : null; }
export function forgetTodoTask(): void { remembered = null; }

/* ── words ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "Saturday 28 November" */
export const longDay = (d: Date): string => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** by local time: Morning before 12:00, Afternoon to 18:00, Evening after */
export const greetingFor = (d: Date): "Morning" | "Afternoon" | "Evening" => (d.getHours() < 12 ? "Morning" : d.getHours() < 18 ? "Afternoon" : "Evening");
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
/** a count as a sentence starts it: "Three", or the figure past twelve */
export const numberWord = (n: number): string => WORDS[n] ?? String(n);
const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const firstName = (n: string | null | undefined): string => (n ?? "").trim().split(/\s+/)[0] || "";
/** the agent's first name for a task, or null where it has none (an own task) */
export const agentFirst = (t: Pick<WsTask, "agent" | "agentName" | "first" | "kind">): string | null => {
  if (t.kind === "own" || (!t.agent && !t.agentName)) return null;
  return firstName(t.agent?.name) || t.first || null;
};
const ago = (n: number): string => (n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
/** a request for pages (a send or a revise-and-resubmit): what "waiting on you for pages" may say */
const forPages = (t: Pick<WsTask, "kind">) => t.kind === "send" || t.kind === "rr";

/* ── the waiting line's day count: the SAME number the tray row shows ──────────────────────────────────────────── */

/**
 * How long the task has been on the list, as its tray row counts it (`trayFigure`): "Today" is 0; a count back in time
 * ("waiting", "since your reminder", "past expected", "quiet", "since it came in", "past its date") is its number; a
 * count forward ("days left") and a row with no figure are not on the line (null).
 */
export function lineDays(t: WsTask, nowMs: number): number | null {
  const f = trayFigure(t, nowMs);
  if (!f) return null;
  if (f.n === "Today") return 0;
  if (/\bleft$/.test(f.words)) return null;
  const n = Number(f.n);
  return Number.isFinite(n) ? n : null;
}

/* ── the piles ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface Pile { id: WsGroupId | "rest"; name: string; sub: string; tasks: WsTask[]; quiet: boolean; groups: WsGroupId[] }
/** the category groups in the tray's order (lib/todoWs WS_GROUPS) — mirrored here so this module stays pure of the page */
const ORDER: readonly { id: WsGroupId; name: string }[] = [
  { id: "wait", name: "Agents are waiting" }, { id: "nudge", name: "Nudges" }, { id: "quiet", name: "Gone quiet" },
  { id: "house", name: "Housekeeping" }, { id: "yours", name: "Your tasks" },
];
export const PILE_MAX = 4;
/** each pile's one sub-line. Agents waiting / Nudges / Housekeeping are Nick's; the rest are written here (REPORT §copy) */
export function pileSub(id: WsGroupId | "rest", tasks: readonly WsTask[], restNames?: readonly string[]): string {
  switch (id) {
    case "wait": return tasks.every(forPages) ? "They asked for pages. Send them, then log it." : "They’re waiting on you. Answer each one, then log it.";
    case "nudge": return "Replies that are overdue. A short follow-up each.";
    case "quiet": return "No word for a while. Nudge each one, or close it.";
    case "house": return "Gaps in your records. None of it is urgent.";
    case "yours": return "The tasks you added yourself. Tick each one off when it’s done.";
    case "rest": return `${(restNames ?? []).join(" and ")}, together.`;
    default: { const unhandled: never = id; return unhandled; }
  }
}
/**
 * One pile per category group that has tasks, in the tray's order with Housekeeping last; at most four — past that the
 * fourth is "Everything else", holding the rest. `tasks` arrive already in the tray's order (`wsSections`, byDue).
 */
export function runPiles(sections: readonly { id: string; tasks: WsTask[] }[]): Pile[] {
  const byId = new Map(sections.map((x) => [x.id, x.tasks]));
  const live = ORDER.filter((g) => g.id !== "house" && (byId.get(g.id)?.length ?? 0) > 0);
  const house = (byId.get("house")?.length ?? 0) > 0 ? ORDER.filter((g) => g.id === "house") : [];
  const groups = [...live, ...house];
  const pile = (g: { id: WsGroupId; name: string }): Pile => {
    const tasks = byId.get(g.id) ?? [];
    return { id: g.id, name: g.name, sub: pileSub(g.id, tasks), tasks, quiet: g.id === "house", groups: [g.id] };
  };
  if (groups.length <= PILE_MAX) return groups.map(pile);
  const rest = groups.slice(PILE_MAX - 1);
  const names = rest.map((g, i) => (i === 0 ? g.name : g.name.toLowerCase()));
  return [
    ...groups.slice(0, PILE_MAX - 1).map(pile),
    { id: "rest", name: "Everything else", sub: pileSub("rest", [], names), tasks: rest.flatMap((g) => byId.get(g.id) ?? []), quiet: false, groups: rest.map((g) => g.id) },
  ];
}

/* ── the hawk's line ─────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * One line, from the data, in a person's voice: "{Greeting}, {first name}. {what comes first}." The first pile decides.
 * Agents waiting and Nudges are Nick's templates; Gone quiet and Your tasks are written here (REPORT §copy).
 */
export function hawkLine(piles: readonly Pile[], userFirst: string, now: Date): string {
  const hi = `${greetingFor(now)}${userFirst ? `, ${userFirst}` : ""}.`;
  const p = piles[0];
  if (!p || !p.tasks.length) return hi;
  const n = p.tasks.length, N = numberWord(n);
  switch (p.id) {
    case "wait": {
      const t = p.tasks[0];
      const who = agentFirst(t) ?? "The agent";
      const days = daysWaiting(t, now.getTime());
      if (p.tasks.every(forPages)) {
        return `${hi} ${N} ${s(n, "agent is", "agents are")} waiting on you for pages, so ${s(n, "that comes", "they come")} first.${days != null ? ` ${who} asked ${ago(days)}.` : ""}`;
      }
      return `${hi} ${N} ${s(n, "agent is", "agents are")} waiting on you, so ${s(n, "that comes", "they come")} first.${days != null && forPages(t) ? ` ${who} asked ${ago(days)}.` : ""}`;
    }
    case "nudge": {
      const nowMs = now.getTime();
      const longest = [...p.tasks].sort((a, b) => (lineDays(b, nowMs) ?? -1) - (lineDays(a, nowMs) ?? -1))[0];
      const who = longest ? agentFirst(longest) : null;
      return `${hi} ${N} ${s(n, "nudge is", "nudges are")} due.${who ? ` ${who} has waited longest.` : ""}`;
    }
    case "quiet": return `${hi} ${N} ${s(n, "query has", "queries have")} gone quiet. Each one needs a decision from you: a nudge, or closing it.`;
    case "yours": return `${hi} ${N} of your own tasks ${s(n, "is", "are")} on the list, so start there.`;
    case "house": return `${hi} Only housekeeping is left, and none of it is urgent.`;
    case "rest": return hi;
    default: { const unhandled: never = p.id; return unhandled; }
  }
}

/** the Start button: "Start with {agent first name} →", or "Start →" when the first task has no agent */
export const startLabel = (t: WsTask | null | undefined): string => {
  const who = t ? agentFirst(t) : null;
  return who ? `Start with ${who}` : "Start";
};

/* ── the waiting line ───────────────────────────────────────────────────────────────────────────────────────────── */

export interface LinePoint { task: WsTask; days: number; group: WsGroupId }
/** one disc per task in the needs-you groups that has a day count on its row (not housekeeping; not an own task without a date) */
export function linePoints(all: readonly WsTask[], nowMs: number): LinePoint[] {
  const out: LinePoint[] = [];
  for (const t of all) {
    if (!needsYou(t)) continue;
    const d = lineDays(t, nowMs);
    if (d == null) continue;
    out.push({ task: t, days: d, group: t.group });
  }
  return out.sort((a, b) => a.days - b.days);
}
/** the axis: Today to the oldest rounded up to the next 30 days (at least 30), a tick every 30 */
export function lineAxis(points: readonly { days: number }[]): { max: number; ticks: number[] } {
  const oldest = points.reduce((m, p) => Math.max(m, p.days), 0);
  const max = Math.max(30, Math.ceil(oldest / 30) * 30);
  const ticks: number[] = [];
  for (let d = 0; d <= max; d += 30) ticks.push(d);
  return { max, ticks };
}
export const LABEL_CLEAR_PX = 64;
export const BRACKET_SPAN_DAYS = 20;
/**
 * Which discs carry a label, given each disc's x (px): the agents-waiting discs for pages share one bracket when they sit
 * within 20 days of each other (and carry no label of their own); every other disc is labelled when it has at least 64px
 * clear of the next labelled disc. Read right to left, so the oldest keeps its label.
 */
export function lineLabels(points: readonly (LinePoint & { x: number })[]): { labelled: Set<string>; bracket: { from: number; to: number } | null } {
  const pages = points.filter((p) => p.group === "wait" && forPages(p.task));
  const span = pages.length ? Math.max(...pages.map((p) => p.days)) - Math.min(...pages.map((p) => p.days)) : Infinity;
  const bracket = pages.length > 1 && span <= BRACKET_SPAN_DAYS ? { from: Math.min(...pages.map((p) => p.x)), to: Math.max(...pages.map((p) => p.x)) } : null;
  const inBracket = new Set(bracket ? pages.map((p) => p.task.key) : []);
  const labelled = new Set<string>();
  let lastX = Infinity;
  for (const p of [...points].sort((a, b) => b.x - a.x)) {
    if (inBracket.has(p.task.key)) continue;
    if (lastX - p.x >= LABEL_CLEAR_PX) { labelled.add(p.task.key); lastX = p.x; }
  }
  /* a label never sits under the bracket's own line (it spans its discs, 16px beyond each end) */
  if (bracket) for (const p of points) if (labelled.has(p.task.key) && p.x > bracket.from - 16 - LABEL_CLEAR_PX / 2 && p.x < bracket.to + 16 + LABEL_CLEAR_PX / 2) labelled.delete(p.task.key);
  return { labelled, bracket };
}

/* ── steps ahead (a journey task on the desk) ───────────────────────────────────────────────────────────────────── */

const REQ: readonly string[] = [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT];
/**
 * What the agent asked for, as STORED: the request's own step on the log (its materials), else the query's request
 * fields (materialsRequestedType / Quantity, requestSynopsis). Null when nothing is stored — no default is invented.
 */
export function storedAsks(q: { materialsRequestedType?: unknown; materialsRequestedQuantity?: unknown; requestSynopsis?: unknown } | null | undefined,
  log: readonly { resultingStatus?: unknown; materials?: unknown }[]): StepMaterial[] | null {
  const row = [...log].reverse().find((x) => REQ.includes(String(x.resultingStatus ?? "")));
  const raw = row?.materials;
  const stored = Array.isArray(raw) ? raw.filter((x): x is StepMaterial => !!x && typeof x === "object" && "kind" in x) : [];
  if (stored.length) return stored;
  if (!q) return null;
  const u = String(q.materialsRequestedType ?? "").toLowerCase();
  const n = Number(q.materialsRequestedQuantity);
  const out: StepMaterial[] = [];
  if (u === "pages" || u === "chapters" || u === "words") out.push({ kind: "sample", unit: u, n: Number.isFinite(n) && n > 0 ? n : undefined });
  if (q.requestSynopsis) out.push({ kind: "synopsis" });
  return out.length ? out : null;
}
const lowerFirst = (x: string) => (x ? x[0].toLowerCase() + x.slice(1) : x);
/** "{First} asked for 10 pages and a synopsis", each item from the journey's own `matLabel` */
export function asksLine(first: string, asks: readonly StepMaterial[] | null): string | null {
  if (!asks || !asks.length) return null;
  const items = asks.map((m) => {
    if (m.kind === "synopsis" && !m.name) return m.pages ? `a ${m.pages}-page synopsis` : "a synopsis";
    if (m.kind === "letter" && !m.name) return "a query letter";
    if (m.kind === "full") return lowerFirst(`the ${lowerFirst(matLabel(m))}`);
    if (m.kind === "sample") return lowerFirst(matLabel(m));
    return matLabel(m);
  });
  const list = items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  return `${first} asked for ${list}`;
}
export interface AheadStep { key: string; text: string; strong?: string; sub?: string | null; done?: boolean }
/**
 * Each journey stage as one plain line. agent / went / sent / reply / log are Nick's; the offer's, close's and reopen's
 * own stages are written here (REPORT §copy). Nothing is answered on the desk: only the agent is "done".
 */
export function aheadSteps(stages: readonly string[], who: { name: string; first: string }, asks: string | null): AheadStep[] {
  return stages.map((k): AheadStep => {
    switch (k) {
      case "agent": return { key: k, strong: who.name, text: " · the agent", done: true };
      case "went": return { key: k, text: "What went", sub: asks };
      case "sent": return { key: k, text: "When you sent it" };
      case "reply": return { key: k, text: `When ${who.first} might reply` };
      case "log": return { key: k, text: "Check it, then log it" };
      case "answer": return { key: k, text: `Your answer to ${who.first}` };
      case "when": return { key: k, text: "When it happened" };
      case "others": return { key: k, text: "Telling the other agents" };
      case "why": return { key: k, text: "Why" };
      case "nudge": return { key: k, text: "Whether to plan a nudge" };
      default: return { key: k, text: k };
    }
  });
}

/* ── the list's figure, tucked (Phase 5) ─────────────────────────────────────────────────────────────────────────── */

/**
 * The tray figure in two lines at every width: the number and its "day"/"days" on the first, the rest of the approved
 * wording ("waiting", "since your reminder", "since it came in", "past its date", "past expected", "left", "quiet")
 * under it. The words are trayFigure's, unchanged — only the leading "days" moves up.
 */
export function tuckFigure(f: { n: string; words: string }): { n: string; unit: string; rest: string } {
  const m = /^(days?)(?:\s+(.*))?$/.exec(f.words.trim());
  return m ? { n: f.n, unit: m[1], rest: (m[2] ?? "").trim() } : { n: f.n, unit: "", rest: f.words.trim() };
}
