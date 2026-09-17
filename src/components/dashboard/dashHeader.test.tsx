/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashboard header (stage 1, 17 Sep) — the greeting, the counts line, and the hawk.
 *
 * ⚠️ THE TWO FIGURES ARE ASSERTED AGAINST THEIR CARDS, NOT ONLY AGAINST LITERALS. The header sits
 * directly above the chart ("Active queries") and the to-do card (its badge), so the claim that
 * matters is that the page states one number for each thing. A `toBe(3)` on both sides would go
 * green the day both derivations moved in the same wrong direction; rendering the page and reading
 * the header beside the card cannot.
 *
 * ⚠️ WHERE THE CLAIM IS A BOX — the illustration whole, nothing below moved sideways — it is made by
 * `tests/e2e/dashHeader.measure.ts` on a rendered page. This file proves the markup, the rules and
 * the file were written.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, UserPlan, type Agent, type Query, type Task } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";
import { OneScreenHeader } from "./OneScreenHeader";
import { greetingText, HEADER_ART, lineClauses, queriesOutCount, startingStepsCount, tasksWaitingCount } from "../../lib/dashHeader";
import { dailyLedger, sentAt } from "../../lib/oneScreen";
import { cssRule } from "../../test/cssRule";
import { sliceBetween } from "../../test/sliceBetween";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const baseCss = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
const rule = (sel: string) => cssRule(baseCss, sel, "oneScreen.css");
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** the declarations for `sel` inside a media block whose condition is exactly `cond` */
const inMedia = (cond: string, sel: string): string | null => {
  for (const m of css.matchAll(/@media ([^{]*)\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
    if (m[1].trim() !== cond) continue;
    /* anchored at a LINE START — `.os-colL, .os-colR {` also sits inside `.os-greet, .os-colL, …` */
    const hit = new RegExp(`(?:^|\\n)[ \\t]*${escRe(sel)}\\s*\\{([^}]*)\\}`).exec(m[2]);
    if (hit) return hit[1];
  }
  return null;
};

/* ══ fixtures ══════════════════════════════════════════════════════════════════════════════ */

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
const q = (id: string, status: QueryStatus, over: Record<string, unknown> = {}): Query =>
  ({ id, userId: "u", agentId: "a1", manuscriptId: "m1", manuscriptTitle: "Tidewrack", status,
     dateSent: iso(20), ...over } as unknown as Query);
const agent = (id: string, name: string): Agent =>
  ({ id, userId: "u", name, agencyName: `${name} Lit`, submissionStatus: "Open" } as unknown as Agent);
const task = (id: string, taskType: string, relatedRecordId: string): Task =>
  ({ id, priority: "urgent", title: "t", description: "d", manuscriptTitle: "Tidewrack", context: "",
     relatedRecordId, taskType, actionLabel: "Send", actionPath: "" } as Task);

/** every state "out" has to decide about, so no branch of the derivation goes unentered */
const MIX: Query[] = [
  q("q1", QueryStatus.QUERIED),                                        // out
  q("q2", QueryStatus.PARTIAL_REQUESTED, { agentId: "a2" }),           // out — the writer's move, still out
  q("q3", QueryStatus.FULL_REQUESTED, { agentId: "a3" }),              // out
  q("q4", QueryStatus.REJECTED, { lastStatusChange: iso(5) }),         // came back
  q("q5", QueryStatus.OFFER, { lastStatusChange: iso(2) }),            // closed by the ledger's law
  q("q6", QueryStatus.WITHDRAWN, { lastStatusChange: iso(3) }),        // closed
  q("q7", QueryStatus.NO_RESPONSE, { lastStatusChange: iso(1) }),      // closed
  q("q8", QueryStatus.QUERIED, { dateSent: undefined }),               // a draft — never sent
];
const AGENTS = [agent("a1", "Ada"), agent("a2", "Bo"), agent("a3", "Cy")];
const TASKS = [task("t2", "partial_requested", "q2"), task("t3", "full_requested", "q3")];
const MS = { id: "m1", title: "Tidewrack", genre: "Fantasy", wordCount: 90000 } as any;

const base = {
  queries: MIX, agents: AGENTS, manuscripts: [MS],
  tasks: TASKS, userTasks: [] as any[], activities: [] as any[], taskFlags: [] as any[],
  currentUser: { id: "u", name: "Nick Physick", plan: UserPlan.FREE } as any,
  activeManuscript: MS,
  onNavigate: () => {}, onTaskAction: () => {}, updateUserProfile: async () => {},
  now: NOW,
};
const page = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<OneScreenDashboard loading={false} {...base} {...over} />);
const headerOf = (html: string) =>
  sliceBetween(html, '<div class="os-greet" data-probe="hero">', 'class="os-toprow"', "the page's header");
const figures = (hdr: string) => [...hdr.matchAll(/<b>([\d,]+)<\/b>/g)].map((m) => Number(m[1].replace(/,/g, "")));

/* ══ the two figures ═══════════════════════════════════════════════════════════════════════ */

describe("queries out — the chart's own figure", () => {
  it("is the daily ledger's closing position today, by the ledger itself", () => {
    const daily = dailyLedger(MIX, NOW);
    expect(daily.length, "the fixture must reach the ledger").toBeGreaterThan(1);
    expect(queriesOutCount(MIX, NOW)).toBe(daily[daily.length - 1].active);
  });

  it("counts what is still out there: not a rejection, an offer, a withdrawal, a stated no, or a draft", () => {
    expect(queriesOutCount(MIX, NOW)).toBe(3);
    /* the branch tally — every kind in the fixture was actually decided, not skipped */
    expect(MIX.filter((x) => sentAt(x) === null)).toHaveLength(1);
    expect(queriesOutCount([], NOW)).toBe(0);
  });

  it("⚠️ the header states the SAME number the chart's headline does, on the rendered page", () => {
    const html = page();
    const [out] = figures(headerOf(html));
    const chart = /<span class="os-n">([\d,]+)<\/span>/.exec(html);
    expect(chart, "the chart's headline must render for this comparison to mean anything").not.toBeNull();
    expect(out).toBe(Number(chart![1].replace(/,/g, "")));
  });
});

describe("tasks waiting — the to-do card's own figure", () => {
  it("is the board's live card count, by the call every Tasks surface makes", () => {
    const n = tasksWaitingCount({
      tasks: TASKS, userTasks: [], queries: MIX, agents: AGENTS, manuscripts: [MS], taskFlags: [],
      activities: [], now: NOW.getTime(), today: "2026-09-17",
    });
    expect(n, "the fixture must raise real cards").toBeGreaterThan(0);
  });

  it("⚠️ the header states the SAME number as the to-do card's badge, on the rendered page", () => {
    const html = page();
    const [, waiting] = figures(headerOf(html));
    const badge = /<span class="os-tbadge" data-probe="todo-badge"><b>([\d,]+)<\/b><\/span>/.exec(html);
    expect(badge, "the badge must render at rest for this comparison to mean anything").not.toBeNull();
    expect(waiting).toBeGreaterThan(0);
    expect(waiting).toBe(Number(badge![1].replace(/,/g, "")));
  });

  /* the other book has one query of its own and none of m1's tasks — so both figures move with the
     scope, and neither can be satisfied by the empty-state line (which states one figure, not two) */
  it("⚠️ both figures follow the manuscript scope, as the cards beneath them do", () => {
    const other = { id: "m2", title: "Saltmarsh" } as any;
    const mine = q("q9", QueryStatus.QUERIED, { manuscriptId: "m2", manuscriptTitle: "Saltmarsh" });
    const hdr = headerOf(page({ queries: [...MIX, mine], manuscripts: [MS, other], activeManuscript: other }));
    expect(figures(hdr)).toEqual([1, 0]);
    expect(hdr).toContain("<b>1</b> query out");
  });
});

/* ══ the words ═════════════════════════════════════════════════════════════════════════════ */

describe("the words", () => {
  it("the greeting ends in a full stop, and never in two", () => {
    expect(greetingText("Nick")).toBe("Hello, Nick.");
    expect(greetingText("J.")).toBe("Hello, J.");
  });

  it("singulars agree, and without figures the plural stands", () => {
    expect(lineClauses({ kind: "counts", queriesOut: 1, tasksWaiting: 1 }).map((c) => c.noun))
      .toEqual(["query out", "task waiting on you"]);
    expect(lineClauses({ kind: "counts", queriesOut: 0, tasksWaiting: 2 }).map((c) => c.noun))
      .toEqual(["queries out", "tasks waiting on you"]);
    expect(lineClauses({ kind: "starting", steps: 1 }).map((c) => c.noun))
      .toEqual(["No queries out yet", "step to get started"]);
    expect(lineClauses(null)).toEqual([
      { n: null, noun: "queries out" },
      { n: null, noun: "tasks waiting on you" },
    ]);
  });

  it("renders the line as the brief writes it — two figures, a dot, nothing else", () => {
    const hdr = headerOf(page());
    expect(hdr).toContain('<h1 class="os-hello" data-probe-text="greeting">Hello, Nick.</h1>');
    const line = sliceBetween(hdr, '<p class="os-hdcounts"', "</p>", "the counts line");
    const text = line.replace(/<[^>]+>/g, "");
    expect(text).toBe(`${figures(hdr)[0]} queries out · ${figures(hdr)[1]} tasks waiting on you`);
    expect(line).toContain('<span class="os-hdsep"> <span class="os-hddot">·</span> </span>');
    /* nothing else on the line — the tour chip lives beside the greeting */
    expect(line).not.toContain("os-tourchip");
  });

  /* ⚠️ A ZERO IS STATED WHERE IT IS TRUE — the tasks figure on a page that has queries. (A page with
     NO queries takes the Getting Started line instead; see below.) */
  it("⚠️ a zero is stated, because zero is true", () => {
    const hdr = headerOf(page({ tasks: [] }));
    expect(figures(hdr)[0]).toBeGreaterThan(0);
    expect(hdr).toContain("<b>0</b> tasks waiting on you");
  });

  it("⚠️ while loading: the words, no figures — never a zero, never a skeleton", () => {
    const hdr = headerOf(page({ loading: true }));
    expect(hdr).not.toContain("<b>");
    expect(hdr).not.toContain("os-skel");
    expect(hdr).not.toContain("isload");
    expect(hdr).toContain(">queries out</span>");
    expect(hdr).toContain(">tasks waiting on you</span>");
  });

  it("the tour launcher sits beside the greeting, and the ghost copy carries no probe", () => {
    const html = renderToStaticMarkup(<OneScreenHeader firstName="Nick" line={null} tour={{ onStart: () => {} }} />);
    const row = sliceBetween(html, '<div class="os-hdrow">', '<p class="os-hdcounts"', "the greeting row");
    expect(row).toContain('class="os-tourchip"');
    const ghost = renderToStaticMarkup(<OneScreenHeader ghost firstName="Nick" line={null} />);
    expect(ghost).not.toContain("data-probe");
    /* React 19 hoists an image preload `<link>` ahead of the markup, so the ROOT is the first div */
    expect(/<div[^>]*>/.exec(ghost)?.[0]).toBe('<div class="os-greet">');
  });
});

/* ══ a new account ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ NICK'S RULE (17 Sep): while there are no queries, the line is "No queries out yet · N steps to
 * get started", N from the Getting Started list — and the moment a query is logged, the normal line.
 * The switch is the SAME flag that turns the to-do card into that list, so the two are asserted
 * together: N against the card's own badge, on the rendered page.
 */
describe("a new account — the Getting Started line", () => {
  const badgeOf = (html: string) => {
    const m = /<span class="os-tbadge" data-probe="todo-badge"><b>([\d,]+)<\/b><\/span>/.exec(html);
    expect(m, "the card's badge must render for this comparison to mean anything").not.toBeNull();
    return Number(m![1]);
  };
  const lineOf = (hdr: string) =>
    sliceBetween(hdr, '<p class="os-hdcounts"', "</p>", "the counts line").replace(/<[^>]+>/g, "");

  it("⚠️ no queries: 'No queries out yet · N steps to get started', N being the card's own count", () => {
    const html = page({ queries: [], tasks: [] });
    const hdr = headerOf(html);
    const n = badgeOf(html);
    expect(html, "the card must be showing the Getting Started list").toContain("Getting started");
    expect(lineOf(hdr)).toBe(`No queries out yet · ${n} steps to get started`);
    expect(figures(hdr)).toEqual([n]);
    expect(hdr).not.toContain("tasks waiting on you");
  });

  it("the count moves with the records — a bare account has all five, a book and an agent take two off", () => {
    const bare = page({ queries: [], tasks: [], agents: [], manuscripts: [], activeManuscript: null });
    expect(figures(headerOf(bare))).toEqual([5]);
    expect(badgeOf(bare)).toBe(5);
    const started = page({ queries: [], tasks: [] });   // a manuscript and three agents on file
    expect(figures(headerOf(started))).toEqual([3]);
    expect(startingStepsCount({ manuscripts: [MS], agentCount: 3, queryCount: 0, versions: [], activeManuscript: MS })).toBe(3);
  });

  it("⚠️ the first query switches it to the normal line", () => {
    const hdr = headerOf(page({ queries: [q("q1", QueryStatus.QUERIED)], tasks: [] }));
    expect(lineOf(hdr)).toBe("1 query out · 0 tasks waiting on you");
    expect(hdr).not.toContain("No queries out yet");
  });

  it("⚠️ while loading it states neither — the plain words, because the answer is not known yet", () => {
    const hdr = headerOf(page({ queries: [], tasks: [], loading: true }));
    expect(hdr).not.toContain("No queries out yet");
    expect(hdr).not.toContain("<b>");
    expect(lineOf(hdr)).toBe("queries out · tasks waiting on you");
  });
});

/* ══ the illustration ══════════════════════════════════════════════════════════════════════ */

describe("the illustration", () => {
  const file = resolve(__dirname, "../../..", "public" + HEADER_ART.src);
  const png = readFileSync(file);

  it("is decorative, versioned by its own bytes, and sized by its own header", () => {
    const hdr = headerOf(page());
    expect(hdr).toContain(`src="${HEADER_ART.src}?v=${HEADER_ART.version}"`);
    expect(hdr).toMatch(/<img class="os-hdart"[^>]*alt=""/);
    expect(HEADER_ART.version, "the version IS the file").toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
    expect(png.toString("latin1", 12, 16), "the header was read").toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(HEADER_ART.width);
    expect(png.readUInt32BE(20)).toBe(HEADER_ART.height);
    expect(png[25], "RGBA — the artwork is transparent").toBe(6);
  });

  it("⚠️ is under the brief's 300KB", () => {
    expect(statSync(file).size).toBeLessThanOrEqual(300 * 1024);
  });
});

/* ══ the rules ═════════════════════════════════════════════════════════════════════════════ */

describe("the rules", () => {
  it("one flex row, bottom edges level, the two ends apart by 40", () => {
    const r = rule(".os-greet");
    for (const d of ["display: flex", "align-items: flex-end", "justify-content: space-between", "gap: 40px", "box-sizing: border-box"]) {
      expect(r, d).toContain(d);
    }
  });

  it("⚠️ ~34px below it: 12 + the column's 22, and 20 + 14 once the lock releases", () => {
    expect(rule(".os-greet")).toContain("margin: 0 0 12px");
    expect(rule(".os-colL")).toContain("gap: 22px");
    expect(inMedia("(max-width: 1024px)", ".os-greet")).toContain("margin-bottom: 20px");
    expect(inMedia("(max-width: 1024px)", ".os-colL, .os-colR")).toContain("gap: 14px");
  });

  it("⚠️ the greeting: Special Elite, important, two classes — the runtime brand rule is 0-1-1", () => {
    const h = rule(".os-greet .os-hello");
    expect(h).toMatch(/font-family:\s*"Special Elite",[^;]*!important/);
    expect(h).not.toContain("cursive");
    expect(h).toContain("font-weight: 400");
    expect(h).toContain("font-size: var(--os-hd-title)");
    expect(h).toContain("line-height: 1.05");
    expect(h).toContain("letter-spacing: -0.01em");
    expect(rule(".os-greet")).toContain("--os-hd-title: 44px");
  });

  it("the line: 19px, 1.5, 12px under the name, figures at 600, the dot muted with 8px either side", () => {
    const c = rule(".os-hdcounts");
    expect(c).toContain("font-size: var(--os-hd-counts)");
    expect(c).toContain("line-height: 1.5");
    expect(c).toContain("margin: 12px 0 0");
    expect(rule(".os-greet")).toContain("--os-hd-counts: 19px");
    expect(rule(".os-hdcounts b")).toContain("font-weight: 600");
    expect(rule(".os-hdsep")).toContain("font-size: 0");
    const dot = rule(".os-hddot");
    expect(dot).toContain("font-size: var(--os-hd-counts)");
    expect(dot).toContain("margin: 0 8px");
    expect(dot, "muted, not the line's ink").not.toContain("#2a1f18");
    expect(c).toContain("color: #2a1f18");
  });

  it("the hawk: 150 tall, whole, and nothing on it", () => {
    const a = rule(".os-greet .os-hdart");
    for (const d of ["height: 150px", "width: auto", "max-width: none", "object-fit: contain", "border: 0",
                     "border-radius: 0", "background: none", "box-shadow: none", "flex: none"]) {
      expect(a, d).toContain(d);
    }
    expect(a).not.toMatch(/object-fit:\s*cover|clip-path|overflow/);
  });

  it("⚠️ the steps: 110 at 1200, stacked and hidden at 900, 32/17 at 560 — and each can WIN", () => {
    expect(inMedia("(max-width: 1200px)", ".os-greet .os-hdart")).toContain("height: 110px");
    const stack = inMedia("(max-width: 900px)", ".os-greet");
    expect(stack).toContain("flex-direction: column");
    expect(stack).toContain("align-items: flex-start");
    expect(inMedia("(max-width: 900px)", ".os-greet .os-hdart")).toContain("display: none");
    const small = inMedia("(max-width: 560px)", ".os-greet");
    expect(small).toContain("--os-hd-title: 32px");
    expect(small).toContain("--os-hd-counts: 17px");
    /* a media query confers no specificity — every step must come after the rule it overrides */
    const baseAt = css.indexOf(".os-greet .os-hdart {");
    expect(baseAt).toBeGreaterThan(-1);
    for (const step of ["@media (max-width: 1200px) {\n  .os-greet .os-hdart", "@media (max-width: 900px) {\n  .os-greet {",
                        "@media (max-width: 560px) {\n  .os-greet {", "@media (max-width: 1024px) {\n  .os-greet {"]) {
      expect(css.indexOf(step), step).toBeGreaterThan(baseAt);
    }
  });

  it("⚠️ the retired steps cannot fight the new ones: no other rule sizes the greeting", () => {
    expect(css).not.toMatch(/\.os-greet h1\s*\{/);
    expect(css).not.toMatch(/\.os-greet > h1\s*\{/);
    expect(css).not.toMatch(/\.os-greet\s*\{[^}]*grid-template/);
  });
});
