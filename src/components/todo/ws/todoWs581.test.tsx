/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v58.1 — THE LOCKS (design-refs/todo-list-v58-1/). The workspace is rendered (`renderToStaticMarkup`, the db
 * mocked) with one task at a time, so the desk opens each kind in turn, and the markup and todoWs58.css are read:
 *   · every desk header, whatever its band (send, nudge, quiet, own, the housekeeping batch, "A new task"), is matched
 *     by a v58.1 rule that grounds it in navy, and no rule after it in todoWs58.css paints a header another colour;
 *   · the desk chip on a task past expected (data-late) is matched by a rule that takes its edge away, the last word;
 *   · a row holding focus from a pointer click shows its figure and hides its quick actions; keyboard focus shows them.
 * The browser half (computed colours, a real click, a real Tab) is tests/e2e/todoV581.measure.ts.
 * Every population is asserted non-empty first, so no lock passes by having read nothing.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan, type Agent, type Query, type Task, type UserTask } from "../../../types";

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const agent = (id: string, name: string, extra: Partial<Agent> = {}): Agent => ({ id, userId: "u1", name, agency: `${name} Literary`, status: "Active", createdAt: iso(-200), updatedAt: iso(-200), ...extra } as unknown as Agent);
const query = (id: string, agentId: string, status: QueryStatus, extra: Partial<Query> = {}): Query => ({
  id, userId: "u1", agentId, manuscriptId: "m1", status, dateSent: iso(-120).slice(0, 10), createdAt: iso(-120), updatedAt: iso(-10), ...extra,
} as unknown as Query);
const task = (id: string, taskType: string, relatedRecordId: string): Task => ({
  id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId, taskType, actionLabel: "", actionPath: "",
} as Task);

const seed: { tasks: Task[]; queries: Query[]; agents: Agent[]; userTasks: UserTask[] } = { tasks: [], queries: [], agents: [], userTasks: [] };
const AGENTS = [agent("a1", "Greg Panetta"), agent("a3", "William Fox", { responseTimeWeeks: 4 } as Partial<Agent>), agent("a4", "Priya Nair", { responseTimeWeeks: 4 } as Partial<Agent>)];
/** one case per desk header: the task the desk opens, and the band its header carries */
const CASES: Record<string, () => void> = {
  send: () => { seed.queries = [query("q1", "a1", QueryStatus.PARTIAL_REQUESTED, { partialRequestedDate: iso(-2).slice(0, 10) } as Partial<Query>)]; seed.tasks = [task("t1", "partial_requested", "q1")]; },
  nudge: () => { seed.queries = [query("q3", "a3", QueryStatus.QUERIED)]; seed.tasks = [task("t3", "nudge_overdue", "q3")]; },
  quiet: () => { seed.queries = [query("q4", "a4", QueryStatus.QUERIED, { dateSent: iso(-300).slice(0, 10) } as Partial<Query>)]; seed.tasks = [task("t4", "no_response_close", "q4")]; },
  own: () => { seed.userTasks = [{ id: "u-own", userId: "u1", text: "Reread the opening", done: false, createdAt: iso(-5), updatedAt: iso(-5), dueDate: iso(-3).slice(0, 10) } as unknown as UserTask]; },
};

vi.mock("../../../lib/firebase", () => ({ db: {}, auth: {}, OperationType: { GET: "GET", WRITE: "WRITE", DELETE: "DELETE" }, handleFirestoreError: () => {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), onSnapshot: () => () => {}, orderBy: () => ({}), query: () => ({}), doc: () => ({}), setDoc: async () => undefined,
  deleteField: () => ({}), getDocs: async () => ({ docs: [] }), where: () => ({}), deleteDoc: async () => undefined, writeBatch: () => ({ set() {}, update() {}, delete() {}, commit: async () => undefined }),
}));
vi.mock("../../../lib/db", () => ({
  useScriptAllyDb: () => ({
    collectionsReady: true,
    tasks: seed.tasks, userTasks: seed.userTasks, queries: seed.queries, agents: seed.agents, manuscripts: [{ id: "m1", userId: "u1", title: "The Marsh" }], packages: [], versions: [], activities: [], taskFlags: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
    addUserTask: async () => undefined, updateUserTask: async () => undefined, deleteUserTask: async () => undefined, restoreUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined, dismissTask: async () => undefined, restoreTaskFlag: async () => undefined, updateUserProfile: async () => undefined,
    resolveTaskFlag: async () => undefined, reconcileStamps: async () => ({ lifted: [], stamped: [] }), updateUserPaths: async () => undefined,
  }),
}));

import { TodoWorkspace } from "./TodoWorkspace";

const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}><TodoWorkspace onNavigate={() => {}} /></MemoryRouter>);
afterEach(() => { seed.tasks = []; seed.queries = []; seed.agents = []; seed.userTasks = []; });
const open = (k: string) => { seed.agents = AGENTS; CASES[k](); return render(); };

/* ── todoWs58.css, read as rules (comments stripped, the @media wrapper's inner rules flattened) ── */
const RAW = readFileSync("src/components/todo/ws/todoWs58.css", "utf8");
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, "");
interface Rule { sel: string[]; body: string; at: number }
const RULES: Rule[] = [...CSS.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean), body: m[2], at: m.index ?? 0 }));
const decl = (r: Rule, prop: string) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(r.body)?.[1].trim() ?? null;
/** the navy rule sits in the v58.1 block, under its own comment */
const V581 = RAW.indexOf("v58.1 · 1") >= 0 && RAW.indexOf(".tws .tws-wh[data-band]") > RAW.indexOf("v58.1 · 1") ? 1 : -1;

/** the opening tag of the desk's header, from the markup */
const headerTag = (html: string) => /<div class="(tws-wh[^"]*)" data-band="([^"]*)"/.exec(html);

describe("v58.1 fix 1 — the desk header is navy on every task", () => {
  it("each task kind opens a desk header with a band, and the bands seen cover more than one band", () => {
    const seen = Object.keys(CASES).map((k) => ({ k, h: headerTag(open(k)) }));
    expect(seen.length).toBe(4);
    for (const s of seen) expect(s.h, s.k).not.toBeNull();
    expect(new Set(seen.map((s) => s.h![2])).size).toBeGreaterThan(1);
  });
  it("a todoWs58.css rule matches every .tws-wh[data-band] — the batch band and \"A new task\" too — and grounds it in --tw-navy with white ink", () => {
    const bands = Object.keys(CASES).map((k) => headerTag(open(k))![2]);
    /* the two headers the workspace's render does not reach: read from their own source */
    const batch = /className="tws-wh tws54-band" data-band="([^"]+)"/.exec(readFileSync("src/components/todo/ws/WsBatch54.tsx", "utf8"));
    const fresh = /<div className="tws-wh" data-band="([^"]+)"><h2>A new task<\/h2>/.exec(readFileSync("src/components/todo/ws/TodoWorkspace.tsx", "utf8"));
    expect(batch).not.toBeNull();
    expect(fresh).not.toBeNull();
    bands.push(batch![1], fresh![1]);
    expect(bands.length).toBe(6);
    const navy = RULES.filter((r) => decl(r, "background") === "var(--tw-navy)" && r.sel.some((s) => /\.tws-wh(\.tws54-band)?\[data-band\]$/.test(s)));
    expect(navy.length).toBe(1);
    expect(navy[0].sel).toContain(".tws .tws-wh[data-band]");
    /* the batch band's own rule is `.tws .tws-wh.tws54-band` (todoWs54.css): the navy rule must out-rank it */
    expect(navy[0].sel).toContain(".tws .tws-wh.tws54-band[data-band]");
    expect(decl(navy[0], "color")).toBe("#fff");
    for (const p of ["--wh-mut", "--wh-chip", "--wh-ring"]) expect(decl(navy[0], p), p).not.toBeNull();
    /* nothing after it paints a header another colour */
    const later = RULES.filter((r) => r.at > navy[0].at && r.sel.some((s) => /\.tws-wh(\.[\w-]+)?(\[[^\]]*\])?$/.test(s)) && (decl(r, "background") ?? decl(r, "background-color")));
    expect(later).toEqual([]);
    expect(V581).toBeGreaterThan(0);
  });
});

describe("v58.1 fix 3 — no edge on the desk chip", () => {
  it("a task past expected renders a chip with data-late, and the last rule on that chip sets box-shadow: none", () => {
    const html = open("nudge");
    const chip = /<span class="tws-dchip"([^>]*)>/.exec(html);
    expect(chip).not.toBeNull();
    expect(chip![1]).toContain("data-late");
    const onChip = RULES.filter((r) => r.sel.some((s) => /\.tws-dchip(\[data-late\])?$/.test(s)) && decl(r, "box-shadow") !== null);
    expect(onChip.length).toBeGreaterThan(0);
    const last = onChip[onChip.length - 1];
    expect(last.sel).toContain(".tws .tws-dchip[data-late]");
    expect(decl(last, "box-shadow")).toBe("none");
  });
});

describe("v58.1 fix 2 — a clicked row looks like an open row", () => {
  const POINTER = ".tws .tws-ti:focus-within:not(:hover):not(:focus-visible):not(:has(:focus-visible))";
  it("every rendered row has a figure and the two quick actions to swap", () => {
    const html = open("send");
    const rows = html.match(/<div[^>]*class="tws-ti"[\s\S]*?<span class="tws-qact">[\s\S]*?aria-label="Dismiss"/g) ?? [];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) { expect(r).toContain('class="tws-du"'); expect(r).toContain('aria-label="Snooze"'); }
  });
  it("pointer focus (focus-within, no hover, nothing focus-visible) hides the quick actions and shows the figure", () => {
    const hide = RULES.find((r) => r.sel.includes(`${POINTER} .tws-qact`));
    const show = RULES.find((r) => r.sel.includes(`${POINTER} :is(.tws-du, .tws-qf)`));
    expect(hide && decl(hide, "display")).toBe("none");
    expect(show && decl(show, "visibility")).toBe("visible");
  });
  it("keyboard focus keeps them: nothing in todoWs58.css hides the actions on :focus-visible, and the row's ring is navy", () => {
    const hiders = RULES.filter((r) => decl(r, "display") === "none" && r.sel.some((s) => /\.tws-qact$/.test(s)));
    expect(hiders.length).toBeGreaterThan(0);
    for (const r of hiders) for (const s of r.sel) if (/\.tws-qact$/.test(s)) expect(s, s).toContain(":not(:focus-visible):not(:has(:focus-visible))");
    const ring = RULES.find((r) => r.sel.includes(".tws .tws-ti:focus-visible"));
    expect(ring && decl(ring, "outline")).toBe("2px solid var(--tw-navy)");
    const click = RULES.find((r) => r.sel.includes(".tws .tws-ti:focus"));
    expect(click && decl(click, "outline")).toBe("none");
  });
});
