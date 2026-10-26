/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.1 (design-refs/contact-list-v25-1/) — CL251 A1–E5 on the rendered page at 1512 × 900 and 1280 × 800
 * with the shell. The sort keys' exact orders are unit locks (src/lib/contactSort251.test.ts); here the page is held to
 * them through what each row SHOWS. L1 is the existing suites, run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO BEFORE IT ASSERTS ANYTHING.
 * ⚠️ RED FIRST: `CL251_BASE=1` against v25 (the base build); `CL251_MUTATE=<lock>` applies the lock's named break in the
 *    page (CSS or DOM), or, for C4 and E4, against a build carrying the break (see the report).
 * ⚠️ E2's "+n" and E3's stars are held to Firestore (cl251Agents.mjs), never to the page's own figures.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { BASE, Ledger, MUT, SIZES, box, mutate, openCl24, openQc149 } from "./cl251Lib";

const T = { timeout: 8000 };
/** every ledger writes its file before any of them fails the test, so one lock's red never hides another's reading */
function doneAll(...xs: [Ledger, number][]) {
  let err: unknown = null;
  for (const [L, floor] of xs) { try { L.done(floor); } catch (e) { err ??= e; } }
  if (err) throw err;
}
const near = (a: number | undefined | null, b: number | undefined | null, d = 1) => a != null && b != null && Math.abs(a - b) <= d;
const f1 = (n: number | undefined | null) => (n == null ? "—" : n.toFixed(1));
const LOG_LINE = "Another one out the door – good work. Let’s get the dates and materials added, then sit back and we’ll remind you if and when you need to nudge.";
const AGENT_LINE = "Fill out your agent profile with all the detail you can. A healthy list means better tracking, analysis, suggestions and reminders.";
const RECORD: Record<string, string> = {
  partial: "A partial request: they want to read more, and that’s a real step forward. Add the date they asked and the send goes on your to-do list.",
  full: "A full request. They’ve read enough to want the whole book – well done. Add the date and the send goes on your to-do list.",
  pass: "It stings, but every answer gets you closer to the right agent. Add the date and we’ll close the query for you.",
  offer: "An offer of representation. Huge news. Add the date it came in and we’ll set a decision date two weeks on and keep it in front of you.",
};

/** the list's rows by group (grouped by status) */
async function rowsByGroup(page: Page) {
  return page.evaluate(() => {
    const out: Record<string, number> = {};
    for (const g of document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='group']")) {
      if (!g.getBoundingClientRect().height) continue;
      out[g.dataset.k ?? ""] = g.querySelectorAll("[data-cl24='row']").length;
    }
    return out;
  });
}
/** the flow header's visible title and line, inside `scope` */
async function head(page: Page, scope: string) {
  return page.evaluate((s) => {
    const root = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0);
    const h = root?.querySelector<HTMLElement>("[data-flh='head']");
    const vis = (e: Element | null | undefined) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none";
    const line = h?.querySelector("[data-flh='line']");
    return root ? {
      title: h?.querySelector("[data-flh='title']")?.textContent ?? null,
      line: vis(line) ? line!.textContent : null,
      imgs: h ? h.querySelectorAll("img").length : -1,
      first: (root.innerText || "").trim().split("\n")[0] ?? "",
      text: root.innerText || "",
    } : null;
  }, scope);
}

/* ═════════ A · the ledger ═════════ */
test("CL251-A1 A2 · one ledger card of four cells; a press filters, pale with a navy bar; List health opens Housekeeping", async ({ page }) => {
  test.setTimeout(300_000);
  const A1 = new Ledger("A1"), A2 = new Ledger("A2");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "A1", ".cl251-led.cl251-led { gap: 14px !important; }");
    await mutate(page, "A2", ".cl251-led .cl251-cell[data-on] { box-shadow: none !important; }");
    const m = await page.evaluate(() => {
      const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
      const led = v("[data-cl251='ledger']");
      const cells = v("[data-cl251='cell']").map((c) => {
        const r = c.getBoundingClientRect();
        const lab = c.querySelector<HTMLElement>("[data-cl251='label-row']")!.getBoundingClientRect();
        const n = c.querySelector<HTMLElement>("[data-cl251='count']")!;
        const range = document.createRange(); range.selectNodeContents(n);
        const nb = Math.max(...[...range.getClientRects()].map((x) => x.bottom), n.getBoundingClientRect().bottom - 0);
        const right = c.querySelector<HTMLElement>("[data-cl251='ring'], [data-cl251='faces']")!;
        const faces = c.querySelector<HTMLElement>("[data-cl251='faces']");
        const discs = faces ? [...faces.querySelectorAll<HTMLElement>(".cl251-face")] : [];
        const rb = discs.length ? Math.max(...discs.map((d) => d.getBoundingClientRect().bottom)) : right.getBoundingClientRect().bottom;
        return {
          k: c.dataset.k ?? "", l: r.left, r: r.right, w: r.width, lt: lab.top, nb, rb, sh: getComputedStyle(c).boxShadow,
          count: Number((n.textContent ?? "").replace("%", "")), shown: discs.length, more: Number(faces?.dataset.more ?? 0), faces: !!faces,
        };
      });
      return { led: led.length, cells };
    });
    A1.check(`${at} population`, m.led === 1 && m.cells.length === 4, `${m.led} ledger card(s), ${m.cells.length} cells`);
    const c = m.cells;
    const ws = c.map((x) => x.w);
    A1.check(`${at} equal widths`, ws.length === 4 && Math.max(...ws) - Math.min(...ws) <= 1, `widths ${ws.map(f1).join(" / ")}`);
    A1.check(`${at} no gap`, c.slice(1).every((x, i) => near(x.l, c[i].r, 0.5)), c.slice(1).map((x, i) => f1(x.l - c[i].r)).join(" / "));
    /* the rule is the cell's own inset 1px shadow on its left edge (computed: "… 1px 0px 0px 0px inset"); the first cell has none */
    const rule = /rgba\(28, 19, 15, 0\.09\) 1px 0px 0px 0px inset/;
    A1.check(`${at} rules between`, c.slice(1).every((x) => rule.test(x.sh)) && !rule.test(c[0]?.sh ?? ""), c.map((x) => x.sh.slice(0, 44)).join(" | "));
    A1.check(`${at} label tops`, c.every((x) => near(x.lt, c[0].lt)), c.map((x) => f1(x.lt)).join(" / "));
    A1.check(`${at} count bottoms`, c.every((x) => near(x.nb, c[0].nb)), c.map((x) => f1(x.nb)).join(" / "));
    A1.check(`${at} right sits on the count`, c.every((x) => Math.abs(x.rb - x.nb) <= 8), c.map((x) => `${x.k} ${f1(x.rb - x.nb)}`).join(" / "));
    for (const x of c.filter((y) => y.faces)) A1.check(`${at} ${x.k} shown + N`, x.shown + x.more === x.count, `${x.shown} + ${x.more} against ${x.count}`);

    /* A2 — Querying shows exactly Your move + With the agent; pale, with a navy bar; again: everyone; List health opens Housekeeping */
    const groups = await rowsByGroup(page);
    const total = Object.values(groups).reduce((a, b) => a + b, 0);
    const want = (groups.you ?? 0) + (groups.agent ?? 0);
    A2.check(`${at} population`, total > 0 && want > 0, `${total} rows, ${want} querying`);
    await page.locator("[data-cl251='cell'][data-k='querying']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    const g2 = await rowsByGroup(page);
    const on = await page.evaluate(() => { const e = [...document.querySelectorAll<HTMLElement>("[data-cl251='cell'][data-k='querying']")].find((x) => x.offsetWidth); return e ? { bg: getComputedStyle(e).backgroundColor, sh: getComputedStyle(e).boxShadow } : null; });
    A2.check(`${at} querying rows`, Object.keys(g2).every((k) => k === "you" || k === "agent") && (g2.you ?? 0) + (g2.agent ?? 0) === want, `${JSON.stringify(g2)} want ${want}`);
    A2.check(`${at} pressed wash`, on?.bg === "rgb(242, 244, 248)", `background ${on?.bg}`);
    A2.check(`${at} pressed bar`, /rgb\(42, 58, 82\) 0px -3px 0px 0px inset/.test(on?.sh ?? ""), `shadow ${on?.sh}`);
    await page.locator("[data-cl251='cell'][data-k='querying']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    A2.check(`${at} all again`, Object.values(await rowsByGroup(page)).reduce((a, b) => a + b, 0) === total, "after a second press");
    await page.locator("[data-cl251='cell'][data-k='health']").first().click(T).catch(() => {});
    await page.waitForTimeout(900);
    const hk = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".hdr.is-in")].some((e) => e.getBoundingClientRect().width > 0));
    A2.check(`${at} List health opens Housekeeping`, hk, `Housekeeping ${hk ? "open" : "not open"}`);
  }
  doneAll([A1, BASE ? 0 : 20], [A2, BASE ? 0 : 12]);
});

/* ═════════ B · the flows' headers ═════════ */
test("CL251-B1 B2 B3 · the headers: Logging new query, Recording response and its four lines, Adding new agent", async ({ page }) => {
  test.setTimeout(400_000);
  const B1 = new Ledger("B1"), B2 = new Ledger("B2"), B3 = new Ledger("B3");
  const vp = SIZES[0];
  const breakB1 = async () => { if (MUT === "B1") await page.evaluate(() => { const h = [...document.querySelectorAll("[data-flh='head']")].find((e) => (e as HTMLElement).offsetWidth); if (h) { const i = document.createElement("img"); i.src = "/images/qc/courier-cutout.png"; i.width = 40; h.prepend(i); } }); };
  const checkLog = async (where: string) => {
    await breakB1();
    const h = await head(page, "[data-qc149f='log']");
    B1.check(`${where} population`, !!h, `the log flow ${h ? "open" : "missing"}`);
    if (!h) return;
    B1.check(`${where} first text`, h.first === "Logging new query", `first "${h.first}"`);
    B1.check(`${where} line`, h.line === LOG_LINE, `line "${h.line?.slice(0, 50)}…"`);
    B1.check(`${where} no art`, h.imgs === 0, `${h.imgs} img(s) in the header`);
    B1.check(`${where} no band label`, !/^New query$/m.test(h.text), "\"New query\" absent");
    await page.locator("[data-qc149f='agent']").first().click(T).catch(() => {});
    await page.waitForTimeout(600);
    const h2 = await head(page, "[data-qc149f='log']");
    B1.check(`${where} after an agent`, h2?.title === "Logging new query" && h2.line === LOG_LINE, `after choosing: "${h2?.title}"`);
  };
  /* the Contact list: the top bar's Log a query, in place */
  await openCl24(page, vp);
  await page.locator(".ws-cap--bar .ws-capl").first().click(T).catch(() => {});
  await page.waitForTimeout(1200);
  await checkLog("Contact list");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  /* the Query Centre: its header's door */
  await openQc149(page, vp);
  await page.locator("[data-qc149='log']").first().click(T).catch(() => {});
  await page.waitForTimeout(1200);
  await checkLog("Query Centre");

  /* B2 — Who replied: the title, no line; respond mode: each pick's line, changing with the pick */
  const recordLines = async (where: string) => {
    if (MUT === "B2") await page.evaluate(() => { const h = [...document.querySelectorAll("[data-qc149c='card'][data-mode='respond'] [data-flh='head'] .flh-tx")].find((e) => (e as HTMLElement).offsetWidth); if (h) { const p = document.createElement("p"); p.className = "flh-l"; p.dataset.flh = "line"; p.textContent = "A line"; h.appendChild(p); } });
    const h0 = await head(page, "[data-qc149c='card'][data-mode='respond']");
    B2.check(`${where} respond population`, !!h0, `respond mode ${h0 ? "open" : "missing"}`);
    if (!h0) return;
    B2.check(`${where} respond title, no line before a pick`, h0.title === "Recording response" && h0.line == null && !/Recording a response/.test(h0.text), `title "${h0.title}" line "${h0.line}"`);
    for (const k of ["partial", "full", "pass", "offer"]) {
      await page.locator(`[data-qc149c='resp-opt'][data-k='${k}']`).first().click(T).catch(() => {});
      await page.waitForTimeout(350);
      const h = await head(page, "[data-qc149c='card'][data-mode='respond']");
      B2.check(`${where} ${k} line`, h?.line === RECORD[k], `${k}: "${h?.line?.slice(0, 50)}…"`);
    }
  };
  await openQc149(page, vp);
  await page.locator("[data-qc149='record']").first().click(T).catch(() => {});
  await page.waitForTimeout(1200);
  const who = await head(page, "[data-qc149f='who']");
  B2.check("Who replied population", !!who, `Who replied ${who ? "open" : "missing"}`);
  B2.check("Who replied", who?.title === "Recording response" && who.line == null && who.imgs === 0, `title "${who?.title}" line "${who?.line}"`);
  await page.locator("[data-qc149f='who-item']").first().click(T).catch(() => {});
  await page.waitForTimeout(1300);
  await recordLines("via Who replied");
  /* from a query card */
  await openQc149(page, vp);
  await page.locator(".qc138-sheet [data-qcv='row']").first().click(T).catch(() => {});
  await page.waitForTimeout(1300);
  await page.locator("[data-qc149c='record']").first().click(T).catch(() => {});
  await page.waitForTimeout(900);
  await recordLines("from a query card");

  /* B3 — "+ Add an agent" on the Contact list */
  await openCl24(page, vp);
  await page.locator("[data-cl24='add']").first().click(T).catch(() => {});
  await page.waitForTimeout(1200);
  await mutate(page, "B3", ".apn [data-flh='line'] { display: none !important; }");
  const ag = await head(page, "[data-ap='panel-new']");
  B3.check("population", !!ag, `the new-agent panel ${ag ? "open" : "missing"}`);
  B3.check("title", ag?.title === "Adding new agent", `title "${ag?.title}"`);
  B3.check("line", ag?.line === AGENT_LINE, `line "${ag?.line?.slice(0, 50)}…"`);
  /* re-pointed (Contact list v25.2 C2): the new-agent state is the card's edit mode under its v25.1 header — the old
     editor's three tabs are its sections now (Who they are, What they're looking for, How to query them, How to reach
     them). What B3 guards is that the editor under the header is whole: the sections, and the name field first. */
  const tabs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-ap='panel-new'] [data-cl252='edit-mode'] [data-cl252='sec']")].map((t) => t.dataset.sec ?? ""));
  B3.check("the editor under the header is whole", ["who", "want", "work", "reach"].every((k) => tabs.includes(k)) && !!(await page.$("[data-ap='panel-new'] [data-ae='name']")), tabs.join(" · "));
  doneAll([B1, BASE ? 0 : 12], [B2, BASE ? 0 : 14], [B3, BASE ? 0 : 4]);
});

/* ═════════ C · the tidy-ups ═════════ */
test("CL251-C1 C2 C3 C4 C5 · headings one size; no list health in the count line; the window fold; log in place; Group", async ({ page }) => {
  test.setTimeout(360_000);
  const C1 = new Ledger("C1"), C2 = new Ledger("C2"), C3 = new Ledger("C3"), C4 = new Ledger("C4"), C5 = new Ledger("C5");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp, { grouped: false });
    await mutate(page, "C1", ".cl25-hd .cl251-glance h3.cl251-gh.cl251-gh.cl251-gh { font-size: 19px !important; line-height: 20px !important; }");
    await mutate(page, "C3", ".cl24-sheet .cl24-ch .cl24-cl.cl24-cl { display: none !important; }");
    if (MUT === "C2") await page.evaluate(() => { const p = [...document.querySelectorAll("[data-cl25='count-line']")].find((e) => (e as HTMLElement).offsetWidth); if (p) p.append(" · 69% list health"); });
    if (MUT === "C5") await page.evaluate(() => { const b = [...document.querySelectorAll("[data-cl24='group'] b")].find((e) => (e as HTMLElement).offsetWidth); if (b) b.textContent = "None"; });
    const m = await page.evaluate(() => {
      const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
      const a = v("[data-cl251='glance-title']"), b = v("[data-cl25='title-text']");
      const fs = (e?: HTMLElement) => (e ? `${getComputedStyle(e).fontSize}/${getComputedStyle(e).lineHeight}` : null);
      const fl = v("[data-cl24='filters'] .cl24-cl");
      return { a: fs(a), b: fs(b), line: v("[data-cl25='count-line']")?.innerText ?? null, filters: fl ? fl.innerText.trim() : null, group: v("[data-cl24='group'] b")?.innerText ?? null };
    });
    C1.check(`${at} population`, !!m.a && !!m.b, `${m.a} · ${m.b}`);
    C1.check(`${at} same size`, m.a === m.b, `At a glance ${m.a} · Every agent on file ${m.b}`);
    C2.check(`${at} population`, !!m.line, `line "${m.line}"`);
    C2.check(`${at} no list health`, !!m.line && !/list health/i.test(m.line), `line "${m.line}"`);
    C5.check(`${at} population`, m.group != null, `pill "${m.group}"`);
    C5.check(`${at} Group`, m.group === "Group", `pill "${m.group}"`);
    /* C3 — Filters in words at a 1512 window, the icon at 1280, on both pages */
    const wantText = vp.width > 1440;
    C3.check(`${at} Contact list`, wantText ? m.filters === "Filters" : m.filters == null, `Filters label "${m.filters}"`);
    await openQc149(page, vp);
    const qf = await page.evaluate(() => { const e = [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qc140='filters'] .qc140-cl")].find((x) => x.getBoundingClientRect().width > 0); return e ? e.innerText.trim() : null; });
    C3.check(`${at} Query Centre`, wantText ? qf === "Filters" : qf == null, `Filters label "${qf}"`);
  }
  /* C4 — the top bar's Log a query stays on /agents and opens the panel */
  await openCl24(page, SIZES[0]);
  await page.locator(".ws-cap--bar .ws-capl").first().click(T).catch(() => {});
  await page.waitForTimeout(1300);
  const path = new URL(page.url()).pathname;
  const panel = await box(page, "[data-cl24='panel'] [data-qc149f='log']");
  C4.check("population", true, "the top bar's Log a query pressed");
  C4.check("stays on /agents", path === "/agents", `path ${path}`);
  C4.check("opens the panel", !!panel, `the log flow in the panel ${panel ? "open" : "missing"}`);
  doneAll([C1, BASE ? 0 : 4], [C2, BASE ? 0 : 4], [C3, BASE ? 0 : 4], [C4, BASE ? 0 : 3], [C5, BASE ? 0 : 4]);
});

/* ═════════ E · the rows and the heading sorts ═════════ */
test("CL251-E1 E2 E3 · no Submissions; Closed to queries; genres on one line, matches first and ticked; Your rating", async ({ page }) => {
  test.setTimeout(300_000);
  const E1 = new Ledger("E1"), E2 = new Ledger("E2"), E3 = new Ledger("E3");
  const truth = JSON.parse(execFileSync("node", ["tests/e2e/cl251Agents.mjs"], { encoding: "utf8" }).trim().split("\n").pop() ?? "{}") as Record<string, { stars: number | null; genres: number }>;
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    if (MUT === "E1") await page.evaluate(() => { const h = [...document.querySelectorAll("[data-cl24='heads']")].find((e) => (e as HTMLElement).offsetWidth); if (h) { const s = document.createElement("span"); s.setAttribute("role", "columnheader"); s.textContent = "Submissions"; h.appendChild(s); } });
    await mutate(page, "E2", ".cl24-gen.cl24-gen { flex-wrap: wrap !important; width: 80px !important; }");
    if (MUT === "E3") await page.evaluate(() => { const h = [...document.querySelectorAll("[data-cl24='heads'] [data-key='rating'] button > span")].find((e) => (e as HTMLElement).offsetWidth); if (h) h.textContent = "Added"; });
    const m = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none";
      const heads = [...document.querySelectorAll<HTMLElement>("[data-cl24='heads'] [role='columnheader']")].filter(vis).map((h) => h.innerText.replace(/[↓↑]/g, "").trim().toLowerCase());
      const rows = [...document.querySelectorAll<HTMLElement>("[data-cl24='row']")].filter(vis).map((r) => {
        const g = r.querySelector<HTMLElement>("[data-cl24='genres']")!;
        /* re-pointed (Contact list v25.2 A3): the genres are the shared pills (data-cl252="pill"/"pill-more"); the law —
           one line, matches first and ticked, shown + n = the agent's genres — is unchanged */
        const tags = [...g.querySelectorAll<HTMLElement>("[data-cl252='pill']")];
        const more = g.querySelector<HTMLElement>("[data-cl252='pill-more']");
        const rate = r.querySelector<HTMLElement>("[data-cl251='rating']");
        return {
          id: r.dataset.id ?? "", k: r.dataset.k ?? "",
          tagTops: tags.map((t) => Math.round(t.getBoundingClientRect().top)), tagH: tags[0]?.getBoundingClientRect().height ?? 0, cellH: g.getBoundingClientRect().height,
          hits: tags.map((t) => t.hasAttribute("data-hit")), ticks: tags.map((t) => /✓/.test(t.textContent ?? "")),
          shown: tags.length, more: Number(more?.dataset.n ?? 0), add: !!g.querySelector("[data-cl24='add-genres']"),
          closed: !!r.querySelector("[data-cl251='closed-tag']"), log: !!r.querySelector("[data-cl24='log']"), door: !!r.querySelector("[data-cl24='door']"),
          /* re-pointed (v25.2 A7): the rating is the tally — lit bars, and "—" when unrated (was stars and "Not rated") */
          /* re-pointed again (v25.3): an unrated agent's rating cell is blank — no tally at all */
          stars: rate ? rate.querySelectorAll("[data-cl252='bar'].on").length : null, unrated: rate ? !rate.querySelector("[data-cl252='tally']") : null,
        };
      });
      return { heads, rows };
    });
    const r = m.rows;
    E1.check(`${at} population`, r.length > 0 && m.heads.length > 0 && r.some((x) => x.closed), `${r.length} rows, ${m.heads.length} headings, ${r.filter((x) => x.closed).length} closed-to-queries`);
    E1.check(`${at} no Submissions`, !m.heads.includes("submissions"), m.heads.join(" · "));
    E1.check(`${at} the tag and no Log a query`, r.filter((x) => x.closed).every((x) => !x.log && x.k === "none"), `${r.filter((x) => x.closed && x.log).length} tagged rows with a Log a query`);
    E1.check(`${at} no door text`, r.every((x) => !x.door), `${r.filter((x) => x.door).length} rows with a door`);
    E1.check(`${at} last column`, m.heads[m.heads.length - 1] === (vp.width > 1440 ? "your rating" : "your query"), `last heading "${m.heads[m.heads.length - 1]}"`);

    const withTags = r.filter((x) => x.shown > 0);
    E2.check(`${at} population`, withTags.length > 0 && withTags.some((x) => x.hits.some(Boolean)), `${withTags.length} rows with genres, ${withTags.filter((x) => x.hits.some(Boolean)).length} with a match`);
    E2.check(`${at} one line`, withTags.every((x) => new Set(x.tagTops).size === 1 && x.cellH <= x.tagH + 2), `${withTags.filter((x) => new Set(x.tagTops).size > 1 || x.cellH > x.tagH + 2).length} rows wrap`);
    E2.check(`${at} matches first, ticked`, withTags.every((x) => x.hits.every((h, i) => !h || x.hits.slice(0, i).every(Boolean)) && x.hits.every((h, i) => h === x.ticks[i])), "order and ticks");
    const bad2 = withTags.filter((x) => truth[x.id] && x.shown + x.more !== truth[x.id].genres);
    E2.check(`${at} shown + n`, bad2.length === 0, `${bad2.length} rows where shown + n is not the agent's genres (Firestore)`);

    if (vp.width > 1440) {
      const rated = r.filter((x) => truth[x.id]?.stars);
      E3.check(`${at} population`, rated.length > 0 && r.some((x) => truth[x.id] && truth[x.id].stars == null), `${rated.length} rated rows`);
      E3.check(`${at} last heading`, m.heads[m.heads.length - 1] === "your rating", `last "${m.heads[m.heads.length - 1]}"`);
      const bad3 = r.filter((x) => truth[x.id] && (truth[x.id].stars ? x.stars !== truth[x.id].stars : !x.unrated));
      E3.check(`${at} stars = starRating`, bad3.length === 0, `${bad3.length} rows disagree with Firestore`);
    }
  }
  doneAll([E1, BASE ? 0 : 10], [E2, BASE ? 0 : 8], [E3, BASE ? 0 : 3]);
});

test("CL251-E4 E5 · every heading sorts, both ways; the pill and the count line say it; one sort for List and Cards", async ({ page }) => {
  test.setTimeout(400_000);
  const E4 = new Ledger("E4"), E5 = new Ledger("E5");
  const truth = JSON.parse(execFileSync("node", ["tests/e2e/cl251Agents.mjs"], { encoding: "utf8" }).trim().split("\n").pop() ?? "{}") as Record<string, { stars: number | null; genres: number }>;
  const vp = SIZES[0];
  await openCl24(page, vp);
  /* what each row SHOWS: its weeks, its stars (Firestore), its shown matches, its stage */
  const read = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='group']")].filter((g) => g.offsetHeight).map((g) => ({
    k: g.dataset.k ?? "",
    rows: [...g.querySelectorAll<HTMLElement>("[data-cl24='row']")].map((r) => {
      /* re-pointed (v25.2 A4/A3/A5): "~6 wks" (was "About 6 weeks"), the shared pills, the status pill — same facts read */
      const wk = /~(\d+) wks?/.exec(r.querySelector<HTMLElement>("[data-col='3']")?.innerText ?? "");
      return { id: r.dataset.id ?? "", name: r.querySelector(".cl24-whot b")?.textContent ?? "", weeks: wk ? Number(wk[1]) : null, hits: r.querySelectorAll("[data-cl252='pill'][data-hit]").length, stage: r.querySelector("[data-cl252='qpill']")?.textContent?.trim() ?? "" };
    }),
  })));
  const pillAndLine = () => page.evaluate(() => {
    const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
    return { pill: v("[data-cl24='sort'] [data-sc='field']")?.innerText ?? null, line: v("[data-cl25='count-line']")?.innerText ?? "", on: v("[data-cl24='heads'] button.on")?.dataset.key ?? null };
  });
  const words: Record<string, [string, string, string, string]> = {
    surname: ["Name A–Z", "Name Z–A", "A to Z", "Z to A"],
    fit: ["Best genre fit", "Weakest genre fit", "best genre fit first", "weakest genre fit first"],
    reply: ["Quickest reply", "Slowest reply", "quickest reply first", "slowest reply first"],
    urgency: ["Most urgent", "Least urgent", "most urgent first", "least urgent first"],
    rating: ["Highest rated", "Lowest rated", "highest rated first", "lowest rated first"],
  };
  const mono = (xs: (number | null)[], dir: 1 | -1) => { const k = xs.filter((x): x is number => x != null); return k.every((x, i) => i === 0 || dir * (x - k[i - 1]) >= 0); };
  const unknownsLast = (xs: (number | null)[]) => { const f = xs.findIndex((x) => x == null); return f < 0 || xs.slice(f).every((x) => x == null); };
  const STAGE: Record<string, number> = { "Full sent": 0, "Partial sent": 1, "Queried": 2 };
  for (const key of ["surname", "fit", "reply", "urgency", "rating"] as const) {
    for (const second of [false, true]) {
      if (!second && key === "surname") {
        /* A to Z is the page's default: press another heading first, then Agent */
        await page.locator("[data-cl251='head'][data-key='fit']").first().click(T).catch(() => {});
        await page.waitForTimeout(250);
      }
      await page.locator(`[data-cl251='head'][data-key='${key}']`).first().click(T).catch(() => {});
      await page.waitForTimeout(450);
      const gs = await read();
      const pl = await pillAndLine();
      const at = `${key} ${second ? "reversed" : "first"}`;
      E4.check(`${at} population`, gs.length > 0 && gs.some((g) => g.rows.length > 1), `${gs.length} groups`);
      E4.check(`${at} pill`, pl.pill === words[key][second ? 1 : 0], `pill "${pl.pill}"`);
      E4.check(`${at} count line`, pl.line.includes(words[key][second ? 3 : 2]), `line "${pl.line}"`);
      E4.check(`${at} heading`, pl.on === key, `sorted heading ${pl.on}`);
      const dir = second ? -1 : 1;
      let ok = true; let why = "";
      for (const g of gs) {
        if (key === "reply") { const w = g.rows.map((x) => x.weeks); if (!mono(w, dir as 1 | -1) || !unknownsLast(w)) { ok = false; why = `${g.k}: ${w.join(",")}`; } }
        if (key === "rating") { const s = g.rows.map((x) => truth[x.id]?.stars ?? null); if (!mono(s, (-dir) as 1 | -1) || !unknownsLast(s)) { ok = false; why = `${g.k}: ${s.join(",")}`; } }
        if (key === "fit") { const h = g.rows.map((x) => x.hits); if (!mono(h, (-dir) as 1 | -1)) { ok = false; why = `${g.k}: ${h.join(",")}`; } }
        if (key === "urgency" && g.k === "agent") { const s = g.rows.map((x) => STAGE[x.stage] ?? 2.5); if (!mono(s, dir as 1 | -1)) { ok = false; why = `${g.k}: ${g.rows.map((x) => x.stage).join(",")}`; } }
        if (key === "surname") { const n = g.rows.map((x) => x.name.trim().split(/\s+/).pop()!.toLowerCase()); const o = n.every((x, i) => i === 0 || dir * x.localeCompare(n[i - 1], "en", { sensitivity: "base" }) >= 0); if (!o) { ok = false; why = `${g.k}: ${n.join(",")}`; } }
      }
      E4.check(`${at} order within groups`, ok, why || "in order");
    }
  }
  /* E5 — the pill's "Quickest reply" marks the Replies in heading; Cards then draw the List's order */
  await page.locator("[data-cl24='sort']").first().click(T).catch(() => {});
  await page.waitForTimeout(300);
  await page.locator("[data-cl24='sort-menu'] [role='menuitemradio'], [data-cl24='sort-menu'] button").filter({ hasText: "Reply time" }).first().click(T).catch(() => {});
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape").catch(() => {});
  if (MUT === "E5") await page.evaluate(() => { for (const b of document.querySelectorAll("[data-cl24='heads'] button.on")) b.classList.remove("on"); });
  const p5 = await pillAndLine();
  E5.check("population", p5.pill != null, `pill "${p5.pill}"`);
  E5.check("the pill marks the heading", p5.on === "reply" && /reply/i.test(p5.pill ?? ""), `pill "${p5.pill}", heading ${p5.on}`);
  const listIds = (await read()).flatMap((g) => g.rows.map((x) => x.id));
  await page.locator("[data-cl25='view-tab'][data-v='cards']").first().click(T).catch(() => {});
  await page.waitForTimeout(700);
  const cardIds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='card']")].filter((c) => c.offsetWidth).map((c) => c.dataset.id ?? ""));
  E5.check("Cards follow the List", cardIds.length > 0 && cardIds.join() === listIds.join(), `cards ${cardIds.length} · rows ${listIds.length}`);
  await page.locator("[data-cl25='view-tab'][data-v='list']").first().click(T).catch(() => {});
  doneAll([E4, BASE ? 0 : 50], [E5, BASE ? 0 : 3]);
});
