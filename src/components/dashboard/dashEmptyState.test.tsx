/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashboard's empty state (empty-states pack, Phase 1; ref scriptally-empty-states-v2.html).
 *
 * ⚠️ THE POPULATED PAGE IS ASSERTED BYTE-IDENTICAL, NOT MERELY "still fine". The pack's boundary is
 * that a dashboard with one query on it may not change by a pixel, and the only assertion that
 * states that is a comparison of the whole rendered string against the same render before the
 * branch existed — which here is the same render with the branch's inputs held populated. So every
 * `empty`-gated class is ALSO asserted absent from the populated markup: a rule that cannot be
 * reached is the boundary expressed as a test rather than trusted.
 *
 * ⚠️ AND THE DERIVED TICKS ARE ASSERTED AGAINST THE RECORD, NEVER AGAINST A LITERAL. `gettingStartedRows`
 * is handed a manuscript and asked whether row one is done; a `toBe(true)` on a hand-written row
 * would pass the day the derivation stopped reading the record at all.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { cssRule } from "../../test/cssRule";
import { ComponentType, QueryStatus, UserPlan } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";
import {
  COMPS_TARGET, GETTING_STARTED, GETTING_STARTED_FOOT,
  gettingStartedOpen, gettingStartedRows,
} from "../../lib/dashEmpty";
import { PACKAGE_MATERIALS } from "../../lib/manuscriptPackages";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => cssRule(cssRules, sel, "oneScreen.css");

const NOW = new Date(2026, 8, 12, 11, 0, 0);
const q = (over: Record<string, unknown> = {}) =>
  ({ id: "q1", status: QueryStatus.QUERIED, manuscriptId: "m1", agentId: "a1", dateSent: "2026-08-01", ...over }) as any;
const MS = { id: "m1", title: "The Backpack on the Seat", genre: "Fantasy", wordCount: 90000 } as any;

const base = {
  agents: [] as any[],
  manuscripts: [MS],
  tasks: [], userTasks: [], activities: [], taskFlags: [],
  currentUser: { id: "u", name: "September Exampleton", plan: UserPlan.FREE } as any,
  activeManuscript: MS,
  onNavigate: () => {}, onTaskAction: () => {},
  updateUserProfile: async () => {},
  now: NOW,
};

/** zero queries for the scoped manuscript — the pack's branch */
const renderEmpty = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<OneScreenDashboard loading={false} {...base} queries={[]} {...over} />);
/** one query — the populated page the pack may not touch */
const renderFull = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<OneScreenDashboard loading={false} {...base} queries={[q()]} {...over} />);

/* ══════════════════════ the branch, and the boundary around it ══════════════════════ */

describe("Phase 1 · the zero-query branch", () => {
  it("is zero QUERIES, not runStage's day-one — the account with a book and no sends gets the pack", () => {
    /* ⚠️ THE PREMISE CHECK. `runStage` returns "day-one" only with no queries AND no manuscripts,
       so this fixture — a manuscript, nothing sent — is "early-days" to it. If the pack were gated
       on day-one this render would carry none of it, which is what the ref is drawn for. */
    const html = renderEmpty();
    expect(html).toContain('data-probe="chart-empty"');
    expect(html).toContain("os-tgs-list");
    expect(html).toContain("os-aghost");
  });

  it("renders none of the pack once a single query exists", () => {
    const html = renderFull();
    for (const cls of ["os-cempty", "os-cefade", "os-ceover", "os-tgs", "os-aghost", "os-ccav"]) {
      expect(html).not.toMatch(new RegExp(`["\\s\`]${cls}["\\s\`]`));
    }
    expect(html).not.toContain('data-probe="chart-empty"');
  });

  it("keeps the real chart on the populated page", () => {
    expect(renderFull()).toContain('data-probe="plot"');
    expect(renderEmpty()).not.toContain('data-probe="plot"');
  });
});

/* ══════════════════════ the faded example ══════════════════════ */

describe("Phase 1 · the faded example is inert", () => {
  it("hides the drawn layer from assistive tech and takes it out of hit testing", () => {
    const html = renderEmpty();
    /* the fade wrapper carries aria-hidden in the markup … */
    expect(html).toMatch(/class="os-cefade"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="os-cefade"/);
    /* … and pointer-events in the sheet. Both halves, because either alone leaves it reachable. */
    expect(rule(".os-cefade")).toContain("pointer-events: none");
    expect(rule(".os-ceg")).toContain("pointer-events: none");
  });

  it("draws no button inside the faded layer — structurally, not by tabindex", () => {
    const html = renderEmpty();
    const fade = html.slice(html.indexOf('class="os-cefade"'), html.indexOf('class="os-ceover"'));
    expect(fade.length).toBeGreaterThan(200);         // the slice found the layer
    expect(fade).not.toContain("<button");
    expect(fade).not.toContain("tabindex");
  });

  it("puts exactly one control in the panel, and it is the CTA", () => {
    const html = renderEmpty();
    const panel = html.slice(html.indexOf('data-probe="chart-empty"'));
    const upToPanelEnd = panel.slice(0, panel.indexOf('data-probe="todo-card"') + 1 || undefined);
    expect((upToPanelEnd.match(/<button/g) ?? []).length).toBe(1);
    expect(upToPanelEnd).toContain("Log your first query");
  });

  it("holds the real chart's aspect ratio, so the panel does not resize when the first query lands", () => {
    expect(rule(".os-ce-plot")).toContain("aspect-ratio: 1000 / 330");
    expect(rule(".os-chartwrap")).toContain("aspect-ratio: 1000 / 330");
  });

  it("fades the band's CHILDREN and never the band", () => {
    expect(rule(".os-ce-head > *")).toContain("opacity: 0.28");
    /* the band itself is `.os-ahead`, which the example reuses — it must carry no fade */
    expect(() => rule(".os-ce-head")).toThrow();
  });
});

/* ══════════════════════ the getting-started list ══════════════════════ */

describe("Phase 1 · the getting-started list is derived", () => {
  const rows = (over: Record<string, unknown> = {}) => gettingStartedRows({
    manuscripts: [MS], agentCount: 0, queryCount: 0, versions: [], activeManuscript: MS, ...over,
  } as any);

  it("ticks row one from the manuscript record, with no write to the to-do store", () => {
    /* the derivation is pure and takes no store — there is nowhere for it to write. The claim is
       that the tick FOLLOWS the record: same call, manuscript present vs absent. */
    const withBook = rows();
    const without = rows({ manuscripts: [], activeManuscript: null });
    expect(withBook.find((r) => r.key === "manuscript")!.done).toBe(true);
    expect(without.find((r) => r.key === "manuscript")!.done).toBe(false);
  });

  it("names the record in the done note rather than congratulating anybody", () => {
    const note = rows().find((r) => r.key === "manuscript")!.doneNote!;
    expect(note).toContain(MS.title);
    expect(note).not.toMatch(/\b(great|well done|nice|congratulations|good job|brilliant)\b/i);
  });

  it("reads PACKAGE_MATERIALS itself for the materials deed — never a list of its own", () => {
    const all = PACKAGE_MATERIALS.map((componentType, i) => ({ id: `v${i}`, manuscriptId: "m1", componentType })) as any[];
    expect(rows({ versions: all }).find((r) => r.key === "materials")!.done).toBe(true);
    /* one short is not done, whatever the constant's length happens to be */
    expect(rows({ versions: all.slice(0, -1) }).find((r) => r.key === "materials")!.done).toBe(false);
    /* and a type OUTSIDE the constant cannot satisfy it */
    const wrong = [{ id: "v9", manuscriptId: "m1", componentType: ComponentType.FULL_MANUSCRIPT }] as any[];
    expect(rows({ versions: wrong }).find((r) => r.key === "materials")!.done).toBe(false);
  });

  it("scopes the two book-bound deeds, and leaves them undone with no book", () => {
    const other = [{ id: "v1", manuscriptId: "OTHER-BOOK", componentType: PACKAGE_MATERIALS[0] }] as any[];
    expect(rows({ versions: other }).find((r) => r.key === "materials")!.done).toBe(false);
    expect(rows({ activeManuscript: null }).find((r) => r.key === "comps")!.done).toBe(false);
  });

  it("ticks comps at the stated target, and states the target once", () => {
    const comps = Array.from({ length: COMPS_TARGET }, (_, i) => ({ title: `Comp ${i}` }));
    const ms = { ...MS, comps };
    expect(rows({ activeManuscript: ms }).find((r) => r.key === "comps")!.done).toBe(true);
    expect(rows({ activeManuscript: { ...MS, comps: comps.slice(1) } }).find((r) => r.key === "comps")!.done).toBe(false);
    expect(GETTING_STARTED.find((s) => s.key === "comps")!.deed).toContain("three");
  });

  it("badges what is OUTSTANDING, so the number moves as the list is worked through", () => {
    const none = rows({ manuscripts: [], activeManuscript: null });
    expect(gettingStartedOpen(none)).toBe(GETTING_STARTED.length);
    expect(gettingStartedOpen(rows())).toBe(GETTING_STARTED.length - 1); // the manuscript is on file
  });

  it("renders the eyebrow, the five deeds and the foot line", () => {
    const html = renderEmpty();
    for (const s of GETTING_STARTED) expect(html).toContain(s.deed);
    expect(html).toContain("Getting started");
    expect(html).toContain(GETTING_STARTED_FOOT);
  });

  it("hides a finished row's chip rather than removing it, so the column holds its width", () => {
    expect(rule(".os-tgs-list li.done .os-tgs-go")).toContain("visibility: hidden");
    expect(rule(".os-tgs-list li.done .os-tgs-go")).not.toContain("display: none");
  });

  it("never strikes through the note that reports the outcome", () => {
    expect(rule(".os-tgs-list li.done .os-tgs-deed small")).toContain("text-decoration: none");
  });

  it("leaves the To-do page's own count untouched — nothing here reaches the board", () => {
    /* the getting-started rows are not Task/UserTask documents and are not passed to any board
       builder: the module imports no store and the page's badge reads `gettingStartedOpen`, which
       counts only these five. Asserted at the source, because the To-do page's count is out of
       this pack's scope to render. */
    const src = readFileSync(resolve(__dirname, "../../lib/dashEmpty.ts"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code).not.toContain("assembleBoardColumns");
    expect(code).not.toContain("boardFigures");
    expect(code).not.toContain("addUserTask");
    expect(code).not.toContain("todoCount");
  });
});

/* ══════════════════════ the stat tiles' caveats — retired with the tiles ══════════════════════ */

/* ⚠️ RETARGETED (dashboard header, stage 1). The three stat tiles and their handwritten caveats are
   deleted. The caveats' own condition — a line only where its figure is zero — has no subject left,
   so this asserts the retirement and what the header says in their place: on the empty page, the
   Getting Started line (Nick, 17 Sep), whose count is this pack's own list. The three old lines are
   named in the negative, so a tile reinstated with its wording fails here. */
describe("Phase 1 · the empty page's header points at the list, with no caveat", () => {
  it("says 'No queries out yet · N steps to get started', and renders none of the tiles' caveat lines", () => {
    const html = renderEmpty({ agents: [{ id: "a1", name: "Amara Osei", agency: "Osei Literary" }] as any[] });
    const open = gettingStartedOpen(gettingStartedRows({
      manuscripts: [MS], agentCount: 1, queryCount: 0, versions: [], activeManuscript: MS,
    }));
    expect(open).toBe(3);
    expect(html).toContain(`No queries out yet</span><span class="os-hdsep"> <span class="os-hddot">·</span> </span><span class="os-hdc"><b>${open}</b> steps to get started`);
    expect(html).not.toContain("tasks waiting on you");
    for (const line of ["starts with your first send", "build it in Contact list", "arrive once queries are out"]) {
      expect(html).not.toContain(line);
    }
    expect(html).not.toMatch(/["\s`]os-ccav["\s`]/);
  });
});

/* ══════════════════════ the feed's tail ══════════════════════ */

describe("Phase 1 · the feed keeps its real events", () => {
  it("adds the ghost tail below whatever the feed holds, and hides the lanes from assistive tech", () => {
    const html = renderEmpty();
    expect(html).toContain("os-aghost-lanes");
    expect(html).toMatch(/class="os-aghost-lanes" aria-hidden="true"/);
    expect(html).toContain("every send, reply and note you record lands here");
  });

  it("draws three lanes at the ref's descending opacities", () => {
    const html = renderEmpty();
    for (const o of ["0.7", "0.4", "0.2"]) expect(html).toContain(`opacity:${o}`);
  });
});

/* ══════════════════════ the panels that must not move ══════════════════════ */

describe("Phase 1 · layout is unchanged", () => {
  it("keeps every panel in place on the empty page", () => {
    const html = renderEmpty();
    /* `stats` left this list with the stat cards (stage 1); the header's own probe replaces it */
    for (const probe of ["hero", "toprow", "grid", "chart-card", "todo-card"]) {
      expect(html).toContain(`data-probe="${probe}"`);
    }
  });

  it("leaves the Community panel alone", () => {
    /* it is the one panel the pack names as unchanged — same markup either side of the branch */
    const grab = (h: string) => h.slice(h.indexOf("os-comtile"));
    expect(grab(renderEmpty()).slice(0, 400)).toBe(grab(renderFull()).slice(0, 400));
  });
});
