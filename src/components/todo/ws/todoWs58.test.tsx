/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v58 — THE LOCKS (design-refs/todo-list-v58/). The workspace is rendered (`renderToStaticMarkup`, the db
 * mocked) with a Partial requested, a Full requested and a Queried (nudge) task, and the markup is read:
 *   · each row carries its query's stage band and edge, read from STAGE_COLOURS (never a literal here);
 *   · the hawk's bubble on the desk carries the same band as the open task's row;
 *   · the desk chip says what the open task's row says (every kind with a figure, through lib/todoWs);
 *   · no figure the writer can read says "late";
 *   · every group heading renders the rule span, and todoWs58.css gives no heading a background.
 * Every population is asserted non-empty first, so no lock passes by having read nothing.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../../types";
import { STAGE_COLOURS, type Stage } from "../../../lib/stageColours";
import { dayBit, deskChip, dueChip, startReason, stripWords, trayFigure, wsTasks, type WsKind, type WsTask } from "../../../lib/todoWs";
import type { TrayItem } from "../../../lib/todoTray";

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const agent = (id: string, name: string): Agent => ({ id, userId: "u1", name, agency: `${name} Literary`, status: "Active", createdAt: iso(-200), updatedAt: iso(-200) } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", agentId, manuscriptId: "m1", status, dateSent: iso(-120).slice(0, 10), createdAt: iso(-120), updatedAt: iso(-10), ...extra,
} as unknown as Query);
const task = (id: string, taskType: string, relatedRecordId: string): Task => ({
  id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "",
} as Task);

const seed: { tasks: Task[]; queries: Query[]; agents: Agent[] } = { tasks: [], queries: [], agents: [] };
const AGENTS = [agent("a1", "Greg Panetta"), agent("a2", "Jonathan Marsh"), agent("a3", "William Fox")];
const QUERIES = [
  query("q1", "a1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: iso(-2).slice(0, 10) } as Partial<Query>),
  query("q2", "a2", QueryStatus.FULL_REQUESTED, { fullRequestedDate: iso(-4).slice(0, 10) } as Partial<Query>),
  query("q3", "a3", QueryStatus.QUERIED),
];
const TASKS = [task("t1", "partial_requested", "q1"), task("t2", "full_requested", "q2"), task("t3", "nudge_overdue", "q3")];
const STAGE_OF_ROW: Record<string, Stage> = { "Send Greg your partial": "partial", "Send Jonathan your full": "full", "Nudge William": "queried" };

vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true,
    tasks: seed.tasks, userTasks: [], queries: seed.queries, agents: seed.agents, manuscripts: [{ id: "m1", userId: "u1", title: "The Marsh" }], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }), updateUserPaths: async () => undefined,
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
afterEach(() => { seed.tasks = []; seed.queries = []; seed.agents = []; });
const populated = () => { seed.tasks = TASKS; seed.queries = QUERIES; seed.agents = AGENTS; return render(); };

/** each tray row's opening tag and its title, from the markup */
interface Row { tag: string; title: string; body: string }
function rowsOf(html: string): Row[] {
  const out: Row[] = [];
  const re = /<div([^>]*class="tws-ti"[^>]*data-tws-row="[^"]*"[^>]*)>([\s\S]*?)(?=<div[^>]*class="tws-ti"|<div class="tws-gbw"|<button type="button" class="tws-(?:addt|more)"|$)/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const title = /class="tws-tx"><b>([^<]*)<\/b>/.exec(m[2])?.[1] ?? "";
    out.push({ tag: m[1], title: title.replace(/&#x27;|&#39;/g, "’"), body: m[2] });
  }
  return out;
}
/** React writes an inline custom property as `--name:value` inside style="" (HTML-escaped) */
const styleOf = (tag: string): Record<string, string> => {
  const s = /style="([^"]*)"/.exec(tag)?.[1] ?? "";
  return Object.fromEntries(s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").split(/;(?![^(]*\))/).filter(Boolean).map((d) => { const i = d.indexOf(":"); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }));
};

describe("v58 phase 2 — the glyph's disc is the query's stage", () => {
  it("a Partial requested, a Full requested and a Queried row carry STAGE_COLOURS' band and edge", () => {
    const rows = rowsOf(populated()).filter((r) => r.title in STAGE_OF_ROW);
    expect(rows.map((r) => r.title).sort()).toEqual(Object.keys(STAGE_OF_ROW).sort());
    for (const r of rows) {
      const st = STAGE_OF_ROW[r.title];
      expect(r.tag, r.title).toContain(`data-tws58-stage="${st}"`);
      const v = styleOf(r.tag);
      expect(v["--tws58-band"], r.title).toBe(STAGE_COLOURS[st].band);
      expect(v["--tws58-edge"], r.title).toBe(STAGE_COLOURS[st].edge);
    }
  });
  it("an offer row's band is the offer's flat navy, its ink the paper (Plumage colours v1)", () => {
    seed.tasks = [task("t9", "offer_received", "q9")]; seed.agents = [agent("a9", "Marcus Hale")];
    seed.queries = [query("q9", "a9", QueryStatus.OFFER)];
    const rows = rowsOf(render());
    expect(rows.length).toBeGreaterThan(0);
    expect(styleOf(rows[0].tag)["--tws58-band"]).toBe(STAGE_COLOURS.offer.band);
    expect(styleOf(rows[0].tag)["--tws58-ink"]).toBe("#f4eee5");
  });
});

describe("v58 phase 7 — the hawk's bubble takes the stage colour", () => {
  it("the open task's hawk note carries the same band and edge as its row, for each of the three", () => {
    const html = populated();
    const open = rowsOf(html).filter((r) => /aria-current="true"/.test(r.tag));
    expect(open.length).toBe(1);
    const hawk = /<div([^>]*class="tws-mnote"[^>]*data-tws="hawk"[^>]*)>/.exec(html);
    expect(hawk).not.toBeNull();
    const st = STAGE_OF_ROW[open[0].title];
    expect(st).toBeDefined();
    expect(hawk![1]).toContain(`data-tws58-stage="${st}"`);
    expect(styleOf(hawk![1])["--tws58-band"]).toBe(STAGE_COLOURS[st].band);
    expect(styleOf(hawk![1])["--tws58-edge"]).toBe(STAGE_COLOURS[st].edge);
  });
  it("…and over the model for all three (the desk opens one at a time)", () => {
    const tasks = modelTasks().filter((t) => t.query && ["send", "nudge"].includes(t.kind));
    expect(tasks.length).toBe(3);
    const src = readFileSync("src/components/todo/ws/TodoWorkspace.tsx", "utf8");
    expect(src).toMatch(/className="tws-mnote" data-tws="hawk" data-tws58-stage=\{deskStage \?\? undefined\} style=\{stageVars\(deskStage\)/);
  });
});

describe("v58 phase 5 — the row and the desk say the same thing, and nothing says \"late\"", () => {
  it("for every task kind with a figure, the desk chip's text equals the tray row's", () => {
    const tasks = modelTasks();
    const now = Date.now();
    const withFig = tasks.filter((t) => trayFigure(t, now));
    expect(withFig.length).toBeGreaterThan(0);
    const kinds = new Set<WsKind>(withFig.map((t) => t.kind));
    expect(kinds.size).toBeGreaterThan(3);
    for (const t of tasks) {
      const f = trayFigure(t, now), c = deskChip(t, now);
      expect(c ? `${c.b} ${c.s}`.trim() : null, `${t.kind} ${t.title}`).toBe(f ? `${f.n} ${f.words}`.trim() : null);
    }
  });
  it("the desk reads deskChip, never dueChip", () => {
    const src = readFileSync("src/components/todo/ws/TodoWorkspace.tsx", "utf8");
    expect(src).toContain("const chip = deskChip(t, now);");
    expect(src).not.toMatch(/\bdueChip\(/);
  });
  it("no string from dayBit, dueFigure (through trayFigure), dueChip or trayFigure matches /\\blate\\b/", () => {
    const now = Date.now();
    const words: string[] = [];
    for (const base of modelTasks()) for (const d of [-30, -1, 0, 1, 9, null]) {
      const t = { ...base, dueDays: d } as WsTask;
      const b = dayBit(t); words.push(`${b.big ?? ""} ${b.small}`);
      const c = dueChip(t); if (c) words.push(`${c.b} ${c.s}`);
      const f = trayFigure(t, now); if (f) words.push(`${f.n} ${f.words}`);
      words.push(startReason({ task: t, urgent: true }), stripWords(t).when);
    }
    expect(words.filter((w) => /past expected/.test(w)).length).toBeGreaterThan(0);
    expect(words.filter((w) => /\blate\b/i.test(w))).toEqual([]);
  });
});

describe("v58 phase 1 — group headings are a ruled line", () => {
  it("every heading renders the rule span", () => {
    const html = populated();
    const heads = html.match(/<button type="button" class="tws-gb"[\s\S]*?<\/button>/g) ?? [];
    expect(heads.length).toBeGreaterThan(1);
    for (const h of heads) expect(h).toMatch(/<span class="tws58-rule" data-tws58="rule" aria-hidden="true"><\/span><span class="tws-cv"/);
  });
  it("todoWs58.css takes every heading's background away, whatever its band, and sets none", () => {
    const css = readFileSync("src/components/todo/ws/todoWs58.css", "utf8");
    expect(css).toContain(".tws .tws-gb, .tws .tws-gb[data-band] { height: 32px; padding: 0 2px; background: none; box-shadow: none;");
    const gbRules = css.match(/[^{}]*\.tws-gb[^{}]*\{[^}]*\}/g) ?? [];
    expect(gbRules.length).toBeGreaterThan(0);
    for (const r of gbRules) for (const m of r.matchAll(/background(?:-color)?:\s*([^;]+);/g)) {
      if (/tws58-rule/.test(r.split("{")[0])) continue;
      expect(m[1].trim(), r.split("{")[0].trim()).toBe("none");
    }
    /* imported last, so it wins at equal specificity */
    const src = readFileSync("src/components/todo/ws/TodoWorkspace.tsx", "utf8");
    expect(src.indexOf('import "./todoWs58.css";')).toBeGreaterThan(src.indexOf('import "./todoWs57.css";'));
    expect(src.indexOf('import "./todoWs57.css";')).toBeGreaterThan(0);
  });
});

/* ── the model's tasks, every kind (lib/todoWs's own fixture shape) ── */
function modelTasks(): WsTask[] {
  const NOW = Date.now();
  const ymd = (d: number) => { const x = new Date(NOW + d * DAY); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  const GROUP = { you: { id: "you" }, chase: { id: "chase" }, quiet: { id: "quiet" }, tidy: { id: "tidy" }, mine: { id: "mine" } } as const;
  const item = (o: { key: string; bucket: string; group: keyof typeof GROUP; taskType?: string; query?: Query; agent?: Agent; userTask?: unknown; due?: number | null; anchorDays?: number; sweep?: boolean; sweepRule?: string }): TrayItem => ({
    key: o.key, bucket: o.bucket, group: GROUP[o.group], card: { key: o.key, taskType: o.taskType, sweepRule: o.sweepRule }, query: o.query, agent: o.agent, userTask: o.userTask,
    deed: "Do the thing", sweep: !!o.sweep, dial: { kind: o.due == null ? "none" : "run", frac: 0, day: null, mon: "", ymd: o.due == null ? null : ymd(o.due), title: "" },
    anchorMs: NOW - (o.anchorDays ?? 0) * DAY, waitMs: o.anchorDays == null ? null : NOW - o.anchorDays * DAY,
  } as unknown as TrayItem);
  const [g, j, w] = AGENTS;
  const items = [
    item({ key: "offer", bucket: "decide", group: "you", taskType: "offer_received", query: query("q9", "a1", QueryStatus.OFFER), agent: g, due: -3, anchorDays: 5 }),
    item({ key: "send", bucket: "send", group: "you", taskType: "partial_requested", query: QUERIES[0], agent: g, due: -8, anchorDays: 2 }),
    item({ key: "full", bucket: "send", group: "you", taskType: "full_requested", query: QUERIES[1], agent: j, due: 5, anchorDays: 4 }),
    item({ key: "rr", bucket: "decide", group: "you", taskType: "revise_resubmit", query: query("q8", "a2", QueryStatus.REVISE_RESUBMIT), agent: j, anchorDays: 9 }),
    item({ key: "nudge", bucket: "chase", group: "chase", taskType: "nudge_overdue", query: QUERIES[2], agent: w, due: -12, anchorDays: 40 }),
    item({ key: "quiet", bucket: "close", group: "quiet", taskType: "no_response_close", query: query("q7", "a3", QueryStatus.QUERIED), agent: w, anchorDays: 110 }),
    item({ key: "sweep", bucket: "fix", group: "tidy", sweep: true, sweepRule: "dq_responseTime" }),
    item({ key: "own", bucket: "note", group: "mine", userTask: { id: "u1t", text: "Tighten the synopsis", dueDate: ymd(-2) }, due: -2 }),
  ];
  return wsTasks(items, AGENTS, (i) => (i.sweep ? "responseTime" : null), (i) => (i.sweep ? ["a1", "a2"] : []), NOW);
}
