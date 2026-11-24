/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 — Part 1: the rulings on the v1 report, locked.
 *   · Others told: "You told {n} other agents about the offer from [X]" ("1 other agent"); the count is CARRIED on the
 *     feed row (`toldCount`), never read back out of its description.
 *   · Offer call: "You booked a call with [X] about [T]" ("You booked a call with [X]" with no title).
 *   · Open status Unknown has no sentence of its own: "You updated [X]'s details".
 *   · The collapsed headline has no line cap (source half; the rendered half is tests/e2e/feedWordingV11.measure.ts).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ActivityType, QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../types";
import { feedEntries, sayText } from "./dashFeed";
import { houseSay } from "./feedHouse";

const NOW = new Date(2026, 10, 24, 15, 0, 0);
const at = (minsAgo: number) => new Date(NOW.getTime() - minsAgo * 60_000).toISOString();
const agent = { id: "ag1", name: "Nadia Hussain", agency: "Hussain Literary" } as Agent;
const ms = { id: "m1", title: "Tidewrack" } as Manuscript;
const query = { id: "q1", agentId: "ag1", manuscriptId: "m1", status: QueryStatus.OFFER, dateSent: at(60 * 24 * 40) } as Query;
let seq = 0;
const row = (over: Partial<Activity>): Activity => ({
  id: `v11-${++seq}`, userId: "u", queryId: "q1", manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED, date: at(30),
  details: "", description: "stored words", ...over,
} as Activity);
const one = (a: Activity, manuscripts: Manuscript[] = [ms]) => {
  const e = feedEntries({ activities: [a], queries: [query], agents: [agent], manuscripts, now: NOW, seenAt: null });
  expect(e, "population: the row is on the feed").toHaveLength(1);
  return e[0];
};

describe("Part 1 — Others told", () => {
  it.each([
    [3, "You told 3 other agents about the offer from Nadia Hussain"],
    [1, "You told 1 other agent about the offer from Nadia Hussain"],
  ])("a count of %i", (n, want) => {
    const e = one(row({ eventKey: "offer_told", toldCount: n, description: `You told ${n} agents about Nadia’s offer` }));
    expect(sayText(e.say)).toBe(want);
    expect(e.say.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
  });
  it("the count is the carried field, not the description's figure", () => {
    const e = one(row({ eventKey: "offer_told", toldCount: 4, description: "You told 9 agents about Nadia’s offer" }));
    expect(sayText(e.say)).toBe("You told 4 other agents about the offer from Nadia Hussain");
  });
  it("the told write carries the count on the feed row, and the step's edit keeps it there", () => {
    const src = readFileSync("src/lib/qc152Write.ts", "utf8");
    const feedRow = src.slice(src.indexOf("const feedRow: DocumentData"), src.indexOf("return { queryId: q.id, set: [{ path: `queries/${q.id}/activity/${id}`, data: sub }"));
    expect(feedRow).toContain("toldCount: count");
    expect(src).toMatch(/s\.kind === "told" && typeof next\.toldCount === "number"\) \{[^}]*f\.toldCount = next\.toldCount/);
  });
  it("the rules allow the count on the feed row, on create and on the step's edit", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const top = rules.slice(rules.indexOf("function isValidActivity(data, userId)"), rules.indexOf("function isValidJournalEntry"));
    expect(top).toContain("(!data.keys().hasAny(['toldCount']) || (data.toldCount is int && data.toldCount >= 1 && data.toldCount <= 500))");
    const upd = rules.slice(rules.indexOf("match /activities/{activityId}"), rules.indexOf("// The top-level users/{uid}/activity store is RETIRED"));
    expect(upd).toMatch(/affectedKeys\(\)\.hasOnly\(\[[^\]]*'toldCount'/);
  });
});

describe("Part 1 — Offer call", () => {
  it("with a title", () => {
    const e = one(row({ eventKey: "offer_call", description: "Offer call booked with Nadia Hussain" }));
    expect(sayText(e.say)).toBe("You booked a call with Nadia Hussain about Tidewrack");
    expect(e.say.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
    expect(e.say.filter((s) => s.em).map((s) => s.t)).toEqual(["Tidewrack"]);
  });
  it("without one", () => {
    const e = one(row({ eventKey: "offer_call", manuscriptId: "", description: "Offer call booked with Nadia Hussain" }), []);
    expect(sayText(e.say)).toBe("You booked a call with Nadia Hussain");
  });
});

describe("Part 1 — open status Unknown has no sentence of its own", () => {
  const P = { t: "Nadia Hussain", who: true } as const;
  it("a change to Unknown reads as the details sentence", () => {
    expect(sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["open"], changedTo: "Unknown" }, P)!)).toBe("You updated Nadia Hussain's details");
  });
  it("Open and Closed keep theirs", () => {
    expect(sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["open"], changedTo: "Open" }, P)!)).toBe("You marked Nadia Hussain as open to queries");
    expect(sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["open"], changedTo: "Closed" }, P)!)).toBe("You marked Nadia Hussain as closed to queries");
  });
  it("no sentence says 'not known'", () => {
    expect(readFileSync("src/lib/feedHouse.ts", "utf8")).not.toContain("not known");
  });
});

describe("Part 1 — the collapsed headline has no line cap", () => {
  const css = readFileSync("src/components/dashboard/v2/dash2Feed.css", "utf8") + readFileSync("src/components/dashboard/f1/df1.css", "utf8");
  it("no line clamp and no ellipsis anywhere in the feed's headline rules", () => {
    const feedRules = css.split("}").filter((r) => /df1-(ctx|hl|crow)/.test(r));
    expect(feedRules.length, "population: the collapsed row's rules").toBeGreaterThan(0);
    for (const r of feedRules.filter((x) => /df1-(ctx b|hl)/.test(x))) {
      expect(r, r).not.toMatch(/line-clamp/);
      expect(r, r).not.toMatch(/text-overflow:\s*ellipsis/);
    }
  });
});

/* ═══ Part 2 — one voice (source half; the rendered half is tests/e2e/feedWordingV11.measure.ts FW2) ══════════════════
   `FW11_REF=<commit>` reads every file below at that commit instead of the working tree, which is how the red-first
   proof runs against the tree before this part without moving a file. */
import { execSync } from "node:child_process";
import { bigCard, type F1Big } from "./dashF1Feed";
const REF = process.env.FW11_REF ?? "";
const src = (p: string) => (REF ? execSync(`git show ${REF}:${p}`, { encoding: "utf8" }) : readFileSync(p, "utf8"));
const feedCss = () => src("src/components/dashboard/v2/dash2Feed.css");
const df1Css = () => src("src/components/dashboard/f1/df1.css");
const ruleOf = (css: string, sel: string) => { const i = css.indexOf(`${sel} {`); return i < 0 ? "" : css.slice(i, css.indexOf("}", i)); };

describe("Part 2 — one voice: every row's sentence, sub-line and time", () => {
  it("the sentence: Source Serif at the body size, 1.35, regular — in a small row, a collapsed card and an open card's top", () => {
    const r = ruleOf(feedCss(), ".d58.d2 .d2-feed :is(.df1-mtx, .df1-hl)");
    expect(r).toContain("font-family: var(--d58-serif) !important");
    expect(r).toContain("font-size: var(--sp-body-size)");
    expect(r).toContain("line-height: 1.35");
    expect(r).toContain("font-weight: 400");
    expect(ruleOf(feedCss(), ".d58.d2 .d2-feed :is(.df1-mtx, .df1-hl) b")).toContain("font-weight: 600");
  });
  it("sub-lines: 14 in the caption colour, one line; times: JetBrains Mono 12 in the caption colour", () => {
    const sub = ruleOf(feedCss(), ".d58.d2 .d2-feed .df1-sub");
    expect(sub).toContain("font-size: var(--sp-sec-size)");
    expect(sub).toContain("color: var(--sp-quiet)");
    expect(sub).toContain("white-space: nowrap");
    const t = ruleOf(feedCss(), ".d58.d2 .d2-feed .df1-t");
    expect(t).toContain("font-family: var(--d58-mono) !important");
    expect(t).toContain("font-size: 12px");
    expect(t).toContain("color: var(--sp-quiet)");
  });
  it("the time sits under the sentence: no right-hand time column on a collapsed card", () => {
    expect(ruleOf(feedCss(), ".d58.d2 .d2-feed .df1-crow")).toContain("grid-template-columns: 22px minmax(0, 1fr) 16px");
    expect(ruleOf(feedCss(), ".d58.d2 .d2-feed .df1-mtx > .df1-t")).toContain("display: block");
  });
  it("day headings: 14, the day in 600", () => {
    expect(ruleOf(df1Css(), ".df1-day > b")).toContain("font-weight: 600");
  });
  it("the writer's housekeeping is a quiet line: no card, no shadow, 14 in --sp-muted", () => {
    const q = ruleOf(feedCss(), '.d58.d2 .d2-feed .df1-mini[data-glyph="house"]');
    expect(q).toContain("box-shadow: none");
    expect(q).toContain("background: none");
    expect(q).toContain("border: 0");
    const t = ruleOf(feedCss(), '.d58.d2 .d2-feed .df1-mini[data-glyph="house"] .df1-mtx');
    expect(t).toContain("font-size: var(--sp-sec-size)");
    expect(t).toContain("color: var(--sp-muted)");
  });
  it("small rows and collapsed cards share one outline", () => {
    const mini = ruleOf(df1Css(), ".df1-mini");
    expect(mini).toContain("border: 1px solid #ece2d8");
    expect(mini).toContain("box-shadow: 0 1px 2px rgba(28, 19, 15, 0.05)");
    expect(mini).toContain("align-items: flex-start");
  });
  it("'Open query' is the small outline button: 30 high, radius 8, Source Serif 600 14", () => {
    const b = ruleOf(feedCss(), ".d58.d2 .d2-feed .df1-btn.sp-btn");
    expect(b).toContain("height: 30px");
    expect(b).toContain("border-radius: 8px");
    expect(b).toContain("font: 600 var(--sp-sec-size)/1 var(--sp-serif) !important");
    expect(src("src/components/dashboard/f1/F1Feed.tsx")).toContain('className="sp-btn sp-btn--line df1-btn"');
  });
  it("nothing in the feed's rules is under 12px", () => {
    const css = df1Css();
    const feed = css.slice(css.indexOf(".df1-sw {"), css.indexOf("/* ── Part E: \"Your next task\""));
    const all = feed + feedCss();
    const sizes = [...all.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length, "population: feed font sizes").toBeGreaterThan(5);
    expect(sizes.filter((n) => n < 12)).toEqual([]);
  });
  it("Special Elite in the feed only on an open card's figures and journey labels", () => {
    const css = df1Css();
    const feed = css.slice(css.indexOf(".df1-sw {"), css.indexOf("/* ── Part E: \"Your next task\""));
    const rules = (feed + feedCss()).replace(/\/\*[\s\S]*?\*\//g, "").split("}").filter((r) => /--d58-type|--sp-type|Special Elite/.test(r)).map((r) => r.trim().split("{")[0].trim());
    expect(rules.length, "population").toBeGreaterThan(0);
    expect(rules.sort()).toEqual([".d58 .df1-figs b", ".d58 .df1-trk b"]);
  });
  it("the open card starts with its own row: no disc, no name line, no separate headline", () => {
    const tsx = src("src/components/dashboard/f1/F1Feed.tsx");
    expect(tsx).toContain('data-df1="big-top"');
    expect(tsx).not.toMatch(/df1-disc|df1-ehw|df1-eh3/);
  });
});

describe("Part 2 — the card's sentence is runs, and its sub-line never repeats a name", () => {
  const NOWC = new Date(2026, 10, 24, 15, 0);
  const card = (ag: Partial<Agent>, status = QueryStatus.FULL_SENT, dir: "in" | "out" = "out") => {
    const q = { id: "q1", agentId: "a1", manuscriptId: "m1", status, dateSent: "2026-09-28T10:00:00.000Z" } as unknown as Query;
    const e = { id: "e", at: new Date(2026, 10, 24, 9, 40).getTime(), status, dir, app: false, queryId: "q1", who: ag.name || ag.agency || "", agency: ag.agency ?? "" } as never;
    return bigCard({ entry: e, say: [], tag: "", meta: "" }, status === QueryStatus.OFFER ? "offer" : dir === "out" ? "sent" : "request", {
      queries: [q], agents: [{ id: "a1", name: "", agency: "", ...ag } as Agent], manuscripts: [{ id: "m1", title: "Tidewrack" } as Manuscript], qcRows: [], userName: "", now: NOWC,
    }) as F1Big;
  };
  it("the headline and the top are runs with the person as the `who` run", () => {
    const c = card({ name: "Nadia Hussain", agency: "Hussain Literary" });
    expect(Array.isArray(c.headline)).toBe(true);
    expect(c.headline.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia"]);
    expect(c.top.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
  });
  it("an offer's title is the italic run; the sub-line does not repeat it", () => {
    const c = card({ name: "", agency: "Penhallow Literary" }, QueryStatus.OFFER, "in");
    expect(c.top.filter((s) => s.em).map((s) => s.t)).toEqual(["Tidewrack"]);
    expect(c.sub).toEqual([]);
  });
});

/* ═══ Part 3 — names are links (logic half; the rendered half is tests/e2e/feedWordingV11.measure.ts FW3) ════════════ */
import { renderToString } from "react-dom/server";
import React from "react";
import { FeedSay } from "../components/shared/FeedSay";
import { agentSubject, agentUpdateActivity } from "./feedHouse";
import { f1Days, type F1Ctx, type F1Mini } from "./dashF1Feed";
import { drawerEvents } from "./dashFeedDrawer";

describe("Part 3 — every person run for a live agent links to that agent's card, by the event's id", () => {
  const twinA = { id: "ag-a", name: "Sam Lee", agency: "North Books" } as Agent;
  const twinB = { id: "ag-b", name: "Sam Lee", agency: "South Books" } as Agent;
  const qA = { id: "qa", agentId: "ag-a", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: at(60 * 24 * 3) } as Query;
  const qB = { id: "qb", agentId: "ag-b", manuscriptId: "m1", status: QueryStatus.REJECTED, dateSent: at(60 * 24 * 3) } as Query;
  const rows: Activity[] = [
    row({ id: "r1", queryId: "qa", activityType: ActivityType.STATUS_CHANGED, resultingStatus: QueryStatus.PARTIAL_REQUESTED, date: at(50) }),
    row({ id: "r2", queryId: "qb", activityType: ActivityType.STATUS_CHANGED, resultingStatus: QueryStatus.REJECTED, date: at(49) }),
    row({ id: "act-added-agent-ag-b", queryId: "", manuscriptId: "", activityType: ActivityType.AGENT_ADDED, subjectName: "Sam Lee", subjectAgency: "South Books", date: at(48) }),
    row({ id: "r4", queryId: "", manuscriptId: "", activityType: ActivityType.AGENT_UPDATED, subjectName: "Sam Lee", subjectAgency: "North Books", subjectId: "ag-a", changed: ["fit"], date: at(47) }),
    /* a deleted agent: its id is no longer on the list, so its name is plain text */
    row({ id: "r5", queryId: "", manuscriptId: "", activityType: ActivityType.AGENT_DELETED, subjectName: "Ruth Gone", subjectAgency: "Gone Ltd", subjectId: "ag-gone", date: at(46) }),
    /* written before v1.1: no id carried, so no link — never found by the name */
    row({ id: "r6", queryId: "", manuscriptId: "", activityType: ActivityType.AGENT_UPDATED, subjectName: "Sam Lee", subjectAgency: "North Books", changed: ["wishlist"], date: at(25) }), // > 10 min from r4: not a burst
  ];
  const entries = feedEntries({ activities: rows, queries: [qA, qB], agents: [twinA, twinB], manuscripts: [ms], now: NOW, seenAt: null });
  const href = (id: string) => entries.find((e) => e.id === id)!.say.find((s) => s.who)!.to;
  it("population: every row is on the feed", () => expect(entries).toHaveLength(rows.length));
  it("two agents share a name: each row links to its own agent", () => {
    expect(href("r1")).toBe("/agents?agent=ag-a");
    expect(href("r2")).toBe("/agents?agent=ag-b");
    expect(href("act-added-agent-ag-b")).toBe("/agents?agent=ag-b");
    expect(href("r4")).toBe("/agents?agent=ag-a");
  });
  it("an agent no longer on the contact list is plain text; so is a row that carries no id", () => {
    expect(href("r5")).toBeUndefined();
    expect(href("r6")).toBeUndefined();
  });
  it("the manuscript title links to the Manuscripts page while the manuscript exists", () => {
    const e = entries.find((x) => x.id === "r1")!;
    expect(e.say.find((s) => s.em)).toEqual({ t: "Tidewrack", em: true, to: "/manuscripts" });
    const gone = feedEntries({ activities: [row({ id: "g", queryId: "", activityType: ActivityType.MANUSCRIPT_DELETED, manuscriptId: "m-gone", subjectName: "Saltmarsh" })],
      queries: [], agents: [], manuscripts: [ms], now: NOW, seenAt: null });
    expect(gone[0].say.find((s) => s.em)?.to).toBeUndefined();
    const live = feedEntries({ activities: [row({ id: "l", queryId: "", activityType: ActivityType.MANUSCRIPT_UPDATED, manuscriptId: "m1", subjectName: "Tidewrack", changed: ["details"] })],
      queries: [], agents: [], manuscripts: [ms], now: NOW, seenAt: null });
    expect(live[0].say.find((s) => s.em)?.to).toBe("/manuscripts");
  });
  it("the sweep's '{n} agents' details' goes to the Contact list; the import's counts to the Contact list and the Query Centre", () => {
    const sw = feedEntries({ activities: [row({ id: "s", queryId: "", manuscriptId: "", activityType: ActivityType.AGENT_UPDATED, batchCount: 3 })], queries: [], agents: [], manuscripts: [], now: NOW, seenAt: null });
    expect(sw[0].say).toEqual([{ t: "You updated " }, { t: "3 agents' details", to: "/agents" }]);
    const imp = feedEntries({ activities: [row({ id: "i", queryId: "", activityType: "Imported" as never, eventKey: "imported" as never, manuscriptId: "m1",
      importCounts: { agents: 2, queries: 3, withAgents: 1, withYou: 1, closed: 1 }, importRoute: "smart" } as never)], queries: [], agents: [], manuscripts: [ms], now: NOW, seenAt: null });
    expect(imp, "population: the import row").toHaveLength(1);
    expect(imp[0].say.filter((s) => s.to).map((s) => [s.t, s.to])).toEqual([["2 agents", "/agents"], ["3 queries", "/queries"], ["Tidewrack", "/manuscripts"]]);
  });
  it("a small row about one query opens it; housekeeping, the import and several-queries rows have no row click", () => {
    const evs = drawerEvents(entries, []);
    const ctx: F1Ctx = { queries: [qA, qB], agents: [twinA, twinB], manuscripts: [ms], qcRows: [], userName: "", now: NOW };
    const minis = f1Days(evs, "all", ctx).flatMap((d) => d.items).filter((x): x is F1Mini => x.type === "mini");
    expect(minis.length).toBeGreaterThan(0);
    for (const m of minis) expect(m.go, m.id).toBe(m.glyph === "status" ? `/queries?q=${m.queryId}` : null);
    expect(minis.some((m) => m.go)).toBe(true);
  });
  it("several queries sent on one day: each agent's name carries its own link, and the row has none", () => {
    const sends = [qA, qB].map((q, k) => row({ id: `send${k}`, queryId: q.id, activityType: ActivityType.STATUS_CHANGED, resultingStatus: QueryStatus.QUERIED, date: at(20 + k) }));
    const qs = [{ ...qA, status: QueryStatus.QUERIED }, { ...qB, status: QueryStatus.QUERIED }] as Query[];
    const ev2 = drawerEvents(feedEntries({ activities: sends, queries: qs, agents: [twinA, twinB], manuscripts: [ms], now: NOW, seenAt: null }), []);
    const it2 = f1Days(ev2, "all", { queries: qs, agents: [twinA, twinB], manuscripts: [ms], qcRows: [], userName: "", now: NOW })[0].items[0] as F1Mini;
    expect(it2.say.filter((s) => s.who).map((s) => s.to)).toEqual(["/agents?agent=ag-a", "/agents?agent=ag-b"]);
    expect(it2.go).toBeNull();
  });
});

describe("Part 3 — the writes carry the agent's id", () => {
  it("agentSubject and agentUpdateActivity carry subjectId", () => {
    expect(agentSubject({ id: "ag1", name: "Nadia Hussain", agency: "Hussain Literary" })).toEqual({ subjectName: "Nadia Hussain", subjectAgency: "Hussain Literary", subjectId: "ag1" });
    expect(agentUpdateActivity({ ...agent, starRating: 3 } as Agent, { starRating: 4 }, at(1))?.subjectId).toBe("ag1");
  });
  it("addAgent and deleteAgent pass the whole agent (with its id) to agentSubject", () => {
    const db = readFileSync("src/lib/db.tsx", "utf8");
    expect(db).toContain("...agentSubject(newAg),");
    expect(db).toContain("const goneSubject = agentSubject(gone);");
  });
  it("the rules allow subjectId on both stores", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const nested = rules.slice(rules.indexOf("function isValidActivityNested(data)"), rules.indexOf("// (isValidTopLevelActivity is gone"));
    const top = rules.slice(rules.indexOf("function isValidActivity(data, userId)"), rules.indexOf("function isValidJournalEntry"));
    expect(nested).toMatch(/hasOnly\(\[[\s\S]*'subjectId'[\s\S]*\]\)/);
    for (const v of [nested, top]) expect(v).toContain("(!data.keys().hasAny(['subjectId']) || (data.subjectId is string && data.subjectId.size() <= 128))");
  });
});

describe("Part 3 — the renderer", () => {
  it("a run with a link is a real <a> with its href; a run without one is plain", () => {
    const html = renderToString(React.createElement(FeedSay, { say: [{ t: "You added " }, { t: "Nadia", who: true, to: "/agents?agent=ag1" }, { t: " and " }, { t: "Ruth", who: true }, { t: " for " }, { t: "Tidewrack", em: true, to: "/manuscripts" }] }));
    expect(html).toContain('<b><a href="/agents?agent=ag1" class="fs-lk" data-feed-link="who">Nadia</a></b>');
    expect(html).toContain("<b>Ruth</b>");
    expect(html).toContain('<i><a href="/manuscripts" class="fs-lk" data-feed-link="em">Tidewrack</a></i>');
    expect(html).not.toContain("target=");
  });
  it("no link sits inside a button: the collapsed card is a container, its toggle a sibling of the sentence", () => {
    const tsx = readFileSync("src/components/dashboard/f1/F1Feed.tsx", "utf8");
    const col = tsx.slice(tsx.indexOf("const Collapsed = React.forwardRef"), tsx.indexOf('Collapsed.displayName'));
    expect(col).toContain('<div className="df1-crow" data-df1="collapsed"');
    expect(col).toMatch(/<button ref=\{ref\}[^>]*aria-expanded="false"[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>\n\s*<\/div>/);
    const btn = col.slice(col.indexOf("<button"), col.indexOf("</button>"));
    expect(btn).not.toMatch(/Segs|FeedSay|SubLine/);
  });
  it("the feed, the drawer and the cards draw sentences through FeedSay", () => {
    for (const f of ["src/components/dashboard/f1/F1Feed.tsx", "src/components/dashboard/v58/Dash58Feed.tsx"]) expect(readFileSync(f, "utf8")).toContain("<FeedSay say={say} />");
  });
});
