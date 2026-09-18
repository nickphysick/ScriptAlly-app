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
import { sliceBetween } from "../../test/sliceBetween";
import { ComponentType, QueryStatus, UserPlan } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";
import {
  COMPS_TARGET, GETTING_STARTED, GETTING_STARTED_FOOT,
  gettingStartedOpen, gettingStartedRows, FEED_FIRST_RUN_LINE,
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
  });

  it("renders none of the pack once a single query exists", () => {
    const html = renderFull();
    for (const cls of ["os-cempty", "os-cefade", "os-ceover", "os-tgs", "os-ccav"]) {
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

  /* ⚠️ THE PANEL ENDS AT THE CLOSED TILE NOW (stage 3) — the next card in its row, with a control of its
     own ("All →"), so the slice is bounded by that card rather than by the to-do card further down. */
  it("puts exactly one control in the panel, and it is the CTA", () => {
    const html = renderEmpty();
    const panel = sliceBetween(html, 'data-probe="chart-empty"', 'data-probe="closed-tile"', "the empty chart panel");
    expect((panel.match(/<button/g) ?? []).length).toBe(1);
    expect(panel).toContain("Log your first query");
  });

  /* ⚠️ RETARGETED (stage 3): the chart has no aspect ratio to match any more — its plot takes what the row
     leaves above a floor. So the example sits in the REAL plot's box, by class, and the two cannot size
     differently. */
  it("draws the example in the real chart's own boxes, so the panel does not resize when the first query lands", () => {
    const html = renderEmpty();
    const panel = sliceBetween(html, 'data-probe="chart-empty"', 'data-probe="closed-tile"', "the empty chart panel");
    for (const cls of ["os-achead os-ce-head", "os-acbody", "os-acplot os-ce-plot", "os-acx os-ce-x"]) {
      expect(panel, cls).toContain(`class="${cls}"`);
    }
    expect(rule(".os-acplot")).toContain("min-height: 150px");
    expect(rule(".os-ce-plot")).toContain("opacity: 0.28");
    expect(cssRules).not.toMatch(/\.os-chartwrap\s*\{/);
  });

  it("fades the header's CHILDREN and never the header", () => {
    expect(rule(".os-ce-head > *")).toContain("opacity: 0.28");
    /* the header itself is `.os-achead`, which the example reuses — it must carry no fade */
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

/**
 * ⚠️ THE GHOST TAIL IS RETIRED WITH THE ACTIVITY COLUMN IT SAT IN (v16, 18 Sep), and the claim
 * inverts rather than lapsing. It drew three fading lanes under whatever the feed held, as a picture
 * of what the column becomes. The v16 feed is a dated list in a scroller with a real empty line, and
 * a drawn example beneath live entries reads as more entries — the exact fault the community tile's
 * own note records about sitting a strip under a long card.
 *
 * ⚠️ WHAT SURVIVES IS THE HALF THAT MATTERED: the feed states its emptiness in words, and says
 * nothing that could be mistaken for an event.
 */
describe("Phase 1 · the feed states its own emptiness", () => {
  it("the empty feed is one honest line, and the retired ghost lanes are gone", () => {
    const html = renderEmpty();
    expect(html).toContain("os-fempty");
    /* ⚠️ THE FIRST-RUN LINE, NOT A COUNT OF EMPTY DAYS. "Nothing logged in the last 30 days" is true
       and useless on an account that has never logged anything; this says what the feed is for. */
    expect(html).toContain(FEED_FIRST_RUN_LINE);
    expect(html).not.toContain("Nothing logged in the last");
    for (const gone of ["os-aghost", "os-aghost-lanes", "FEED_GHOST"]) {
      expect(html, gone).not.toContain(gone);
    }
    /* a drawn lane would be an entry with no date and no source — the two things every real one has */
    expect(html).not.toMatch(/opacity:0\.[247]\b/);
    /* and the populated feed still counts its window */
    expect(renderFull()).not.toContain(FEED_FIRST_RUN_LINE);
  });
});

/* ══════════════════════ the panels that must not move ══════════════════════ */

describe("Phase 1 · layout is unchanged", () => {
  it("keeps every panel in place on the empty page", () => {
    const html = renderEmpty();
    /* `stats` left this list with the stat cards (stage 1); the header's own probe replaces it. The
       top row left with the manuscript tile (stage 3), and `breakdown` and `grid` left with v16 —
       the page is a header and two rows. */
    for (const probe of ["hero", "row1", "row2", "quick-actions", "chart-card", "closed-tile",
                         "activity-card", "todo-card"]) {
      expect(html).toContain(`data-probe="${probe}"`);
    }
  });

  /* ⚠️ THE COMMUNITY PANEL IS OFF THE DASHBOARD (Nick, 18 Sep) — the component is kept and mounted
     nowhere, so "unchanged either side of the branch" has no subject. The claim that replaces it is
     the one that matters to this pack: the branch changes the three surfaces it names and NOTHING
     else, so the two renders differ only where the pack says they do. */
  it("⚠️ the branch touches three surfaces and leaves the rest of the page alone", () => {
    const empty = renderEmpty();
    const full = renderFull();
    for (const gone of ["os-comtile", "os-comstrip", "os-comm "]) {
      expect(empty, gone).not.toContain(gone);
      expect(full, gone).not.toContain(gone);
    }
    /* the quick actions and the closed tile are the same markup on both sides */
    const grab = (h: string, probe: string) => {
      const i = h.indexOf(`data-probe="${probe}"`);
      expect(i, probe).toBeGreaterThan(-1);
      return h.slice(i, i + 400);
    };
    expect(grab(empty, "quick-actions")).toBe(grab(full, "quick-actions"));
    expect(grab(empty, "closed-tile")).toBe(grab(full, "closed-tile"));
  });
});
