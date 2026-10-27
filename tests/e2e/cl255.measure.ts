/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.5 (design-refs/contact-list-v25-5/) — CL255 G1–G6 on the rendered page at 1512 × 900 and 1280 × 800
 * with the shell. L1 is the existing suites, run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO FIRST. The harness account carries every case the pack names: waiting
 *    queries past their reply time, your-move queries with three or more stored steps, agents with no reply time and
 *    agents never queried. No fixture is written.
 * ⚠️ INDEPENDENT FIGURES: the reply weeks, contact fields and each query's dated stages come from Firestore
 *    (cl255Data.mjs, read-only), never from the page's own derivation.
 * ⚠️ RED FIRST: `CL255_BASE=1` against v25.4 (the base build); `CL255_MUTATE=<lock>` applies the lock's break in the page.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { BASE, Ledger, SIZES, mutateJs, openCl24 } from "./cl255Lib";

const T = { timeout: 8000 };
const WEEK = 7 * 86_400_000;
type Ag = { stars: number | null; genres: number; mswl: string; email: string; weeks: number | null; agency: string; website: string; form: string };
type Q = { id: string; agentId: string; manuscriptId: string; status: string; sent: number | null; pr: number | null; ps: number | null; fr: number | null; fs: number | null; of: number | null };
type Data = { agents: Record<string, Ag>; queries: Q[] };
const data = (): Data => JSON.parse(execFileSync("node", ["tests/e2e/cl255Data.mjs"], { encoding: "utf8" }));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dm = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const near = (shown: string, ms: number) => [ms - 86_400_000, ms, ms + 86_400_000].some((t) => dm(t) === shown);
/** the pipeline's order, restated here (never imported) */
const RANK: Record<string, number> = {
  Queried: 0, "Partial Requested": 1, "Partial Sent": 2, "Full Requested": 3, "Full Sent": 4, "Revise & Resubmit": 5, Resubmitted: 6, Offer: 7, Signed: 8,
  Rejected: 9, "No Response": 9, Withdrawn: 9,
};
const WAITING = new Set(["Queried", "Partial Sent", "Full Sent"]);
const CLOSED = new Set(["Rejected", "No Response", "Withdrawn"]);
const WRITER = new Set(["Partial Requested", "Full Requested", "Revise & Resubmit", "Offer"]);

async function toList(page: Page) {
  await page.evaluate(() => {
    const t = document.querySelector("[data-cl25='title']");
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
    if (t && sc) sc.scrollBy(0, t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10);
  });
  await page.waitForTimeout(300);
}
/** open the agent's card in the panel (its row's name) and choose a tab */
async function openCard(page: Page, id: string, tab: "profile" | "history" = "profile") {
  const row = page.locator(`[data-cl24='row'][data-id='${id}']`).first();
  await row.scrollIntoViewIfNeeded();
  await row.locator("[data-cl252='name']").click(T);
  await page.locator("[data-cl24='panel'] [data-cl24='agent-card']").first().waitFor(T);
  if (tab === "history") { await page.locator("[data-cl24='panel'] [data-cl24='tab'][data-tab='history']").first().click(T); }
  await page.waitForTimeout(400);
}
const pane = "[data-cl24='panel'] [data-cl24='pane']";

/* ═════════ G1 · Profile is the contact card ═════════ */
test("CL255-G1 · Profile holds How, Reach (and Also at with colleagues), nothing about the query; the scale fills {reply weeks} of 12", async ({ page }) => {
  test.setTimeout(420_000);
  const G1 = new Ledger("G1");
  const D = data();
  const queried = new Set(D.queries.map((q) => q.agentId));
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await toList(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => r.dataset.id ?? ""));
    const pick = [
      ...ids.filter((i) => D.agents[i]?.weeks && queried.has(i)).slice(0, 3),
      ...ids.filter((i) => D.agents[i] && !D.agents[i].weeks).slice(0, 2),
      ...ids.filter((i) => D.agents[i]?.weeks && D.agents[i].weeks! > 12).slice(0, 1),
      ...ids.filter((i) => { const a = D.agents[i]; return a && a.agency && Object.entries(D.agents).some(([k, b]) => k !== i && b.agency === a.agency); }).slice(0, 2),
    ];
    G1.check(`${at} population`, pick.length >= 6 && pick.some((i) => queried.has(i)) && pick.some((i) => !D.agents[i].weeks), `${pick.length} agents`);
    for (const id of [...new Set(pick)]) {
      await openCard(page, id);
      await mutateJs(page, "G1", () => { const p = document.querySelector("[data-cl24='panel'] [data-cl24='pane'] > .qc149c-pg"); if (p) { const d = document.createElement("div"); d.innerHTML = "<span class='qc149c-k'>You and them</span>"; p.appendChild(d); } });
      const r = await page.evaluate((sel) => {
        /* the Profile tab's own page — the call box below it is the card's, not the tab's */
        const p = document.querySelector<HTMLElement>(`${sel} > .qc149c-pg`)!;
        const secs = [...p.querySelectorAll<HTMLElement>("[data-cl255='section']")].map((s) => s.dataset.k ?? "");
        const sc = p.querySelector<HTMLElement>("[data-cl255='scale']");
        const glyphs = [...p.querySelectorAll("[role='img'][aria-label]")].map((g) => g.getAttribute("aria-label"));
        /* textContent, not innerText: innerText applies text-transform, so an uppercase "You and …" label reads "YOU AND" */
        return { pane: p.closest<HTMLElement>("[data-cl24='pane']")?.dataset.pane ?? "", secs, also: !!p.querySelector("[data-cl24='also-at']"), text: p.textContent ?? "",
          blocks: sc ? sc.querySelectorAll("[data-cl255='block']").length : -1, filled: sc ? sc.querySelectorAll("[data-cl255='block'].f").length : -1,
          scaleText: sc?.innerText.replace(/\s+/g, " ").trim() ?? "", glyphs };
      }, pane);
      const a = D.agents[id];
      const colleagues = !!a.agency && Object.entries(D.agents).some(([k, b]) => k !== id && b.agency === a.agency);
      G1.check(`${at} ${id} sections`, r.pane === "profile" && r.secs.join(",") === "how,reach" && r.also === colleagues, `${r.secs.join(",")} also ${r.also} (colleagues ${colleagues})`);
      G1.check(`${at} ${id} nothing about the query`, !/you and /i.test(r.text) && r.glyphs.length === 0 && !/\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(r.text) && !/since you sent/.test(r.text),
        `${r.glyphs.length} stage glyphs; "You and" ${/you and /i.test(r.text)}`);
      if (a.weeks) G1.check(`${at} ${id} scale`, r.blocks === 12 && r.filled === Math.min(12, Math.round(a.weeks)) && r.scaleText.includes(`about ${a.weeks} week`), `${r.filled}/${r.blocks} for ${a.weeks} — "${r.scaleText}"`);
      else G1.check(`${at} ${id} no reply time`, r.blocks === 0 && /Reply time not known yet/.test(r.scaleText), `"${r.scaleText}"`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    }
  }
  G1.done(30);
});

/* ═════════ G2 · Reach ═════════ */
test("CL255-G2 · one row per contact field, in order; a missing one is dashed and opens its inline edit; Copy copies the email", async ({ page }) => {
  test.setTimeout(420_000);
  const G2 = new Ledger("G2");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const D = data();
  const vp = SIZES[0];
  await openCl24(page, vp);
  await toList(page);
  const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => r.dataset.id ?? ""));
  const withMail = ids.filter((i) => D.agents[i]?.email).slice(0, 3), noMail = ids.filter((i) => D.agents[i] && !D.agents[i].email).slice(0, 3);
  G2.check("population", withMail.length >= 1 && noMail.length >= 1, `${withMail.length} with an email, ${noMail.length} without`);
  for (const id of [...withMail, ...noMail]) {
    await openCard(page, id);
    await mutateJs(page, "G2", () => { for (const r of document.querySelectorAll<HTMLElement>("[data-cl255='reach']")) { const s = document.createElement("span"); s.textContent = r.textContent; r.replaceWith(s); } });
    const rows = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-cl255='reach']`)].map((r) => ({
      k: r.dataset.k ?? "", missing: r.hasAttribute("data-missing"), border: getComputedStyle(r).borderTopStyle, text: (r.textContent ?? "").trim() })), pane);
    const a = D.agents[id];
    G2.check(`${id} rows in order`, rows.map((r) => r.k).join(",") === "email,website,form,social", rows.map((r) => r.k).join(","));
    const em = rows.find((r) => r.k === "email"), web = rows.find((r) => r.k === "website");
    G2.check(`${id} email row`, !!em && em.missing === !a.email && (em.missing ? em.border === "dashed" && em.text === "+ Add email" : em.text.startsWith(a.email)), em ? `${em.missing ? "missing" : em.text} ${em.border}` : "none");
    G2.check(`${id} website row`, !!web && web.missing === !a.website && (!web.missing || web.border === "dashed"), web ? `${web.missing ? "missing" : web.text}` : "none");
    if (a.email && em && !em.missing) {
      await page.locator(`${pane} [data-cl255='reach'][data-k='email']`).first().click(T);
      await page.waitForTimeout(250);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
      G2.check(`${id} Copy copies the email`, clip === a.email, `"${clip}"`);
    }
    if (!a.email && em) {
      await page.locator(`${pane} [data-cl255='reach'][data-k='email']`).first().click(T).catch(() => {});
      await page.waitForTimeout(400);
      const open = await page.evaluate((sel) => !!document.querySelector(`${sel} [data-cl255='reach-edit'][data-k='email'] input`), pane);
      G2.check(`${id} + Add email opens the inline edit`, open, String(open));
    }
    await openCl24(page, vp); await toList(page);
  }
  G2.done(10);
});

/* ═════════ G3 · History is the query story ═════════ */
test("CL255-G3 · each block's steps are the query's stored stages in order, the next step last in rust; the waiting bar only while waiting, rust = weeks past", async ({ page }) => {
  test.setTimeout(600_000);
  const G3 = new Ledger("G3");
  const D = data();
  const now = Date.now();
  const byAgent = new Map<string, Q[]>();
  for (const q of D.queries) (byAgent.get(q.agentId) ?? byAgent.set(q.agentId, []).get(q.agentId)!).push(q);
  const vp = SIZES[0];
  await openCl24(page, vp);
  await toList(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => ({ id: r.dataset.id ?? "", k: r.dataset.k ?? "" })));
  const pastWait = rows.filter((r) => (byAgent.get(r.id) ?? []).some((q) => WAITING.has(q.status) && D.agents[r.id]?.weeks && q.sent && (now - q.sent) / WEEK > D.agents[r.id].weeks!)).slice(0, 3);
  const yours = rows.filter((r) => r.k === "you").slice(0, 3);
  const offers = rows.filter((r) => (byAgent.get(r.id) ?? []).some((q) => q.status === "Offer")).slice(0, 1);
  const closed = rows.filter((r) => r.k === "closed").slice(0, 2);
  const noWeeks = rows.filter((r) => r.k === "agent" && !D.agents[r.id]?.weeks).slice(0, 1);
  const pick = [...new Map([...pastWait, ...yours, ...offers, ...closed, ...noWeeks].map((r) => [r.id, r])).values()];
  G3.check("population", pastWait.length >= 1 && yours.length >= 1 && offers.length >= 1 && closed.length >= 1, `${pastWait.length} waiting past, ${yours.length} your move, ${offers.length} offer, ${closed.length} closed`);
  let threeSteps = 0, rustSeen = 0;
  for (const r of pick) {
    await openCard(page, r.id, "history");
    await mutateJs(page, "G3", () => {
      for (const b of document.querySelectorAll<HTMLElement>("[data-cl255='block']")) {
        if (b.querySelector("[data-cl255='step'][data-status='Offer']") && !b.querySelector("[data-cl255='wait']")) { const w = document.createElement("div"); w.dataset.cl255 = "wait"; w.dataset.past = "0"; w.dataset.blocks = "4"; b.insertBefore(w, b.querySelector("ol")); }
      }
    });
    const blocks = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-cl255='block']`)].map((b) => ({
      id: b.dataset.id ?? "",
      steps: [...b.querySelectorAll<HTMLElement>("[data-cl255='step']")].map((s) => ({ status: s.dataset.status ?? "", date: s.dataset.date ?? "" })),
      kinds: [...b.querySelectorAll<HTMLElement>("ol > li")].map((li) => li.dataset.cl255 ?? ""),
      next: (() => { const n = b.querySelector<HTMLElement>("[data-cl255='next']"); return n ? getComputedStyle(n.querySelector("b")!).color : null; })(),
      wait: (() => { const w = b.querySelector<HTMLElement>("[data-cl255='wait']"); return w ? { past: Number(w.dataset.past), n: Number(w.dataset.blocks), rust: w.querySelectorAll("[data-b='rust']").length, weeks: Number(w.dataset.weeks) } : null; })(),
    })), pane);
    const qs = byAgent.get(r.id) ?? [];
    G3.check(`${r.id} one block per query`, blocks.length === qs.length && blocks.every((b) => qs.some((q) => q.id === b.id)), `${blocks.length} blocks, ${qs.length} queries`);
    for (const b of blocks) {
      const q = qs.find((x) => x.id === b.id);
      if (!q) continue;
      const ranks = b.steps.map((s) => RANK[s.status] ?? -1);
      G3.check(`${b.id} steps in order, Query sent first, current last`, b.steps.length >= 1 && b.steps[0].status === "Queried" && ranks.every((x, i) => i === 0 || x >= ranks[i - 1]) && b.steps[b.steps.length - 1].status === q.status,
        b.steps.map((s) => `${s.status}@${s.date}`).join(" → ") + ` (now ${q.status})`);
      if (b.steps.length >= 3) threeSteps += 1;
      const FIELD: Record<string, number | null> = { Queried: q.sent, "Partial Requested": q.pr, "Partial Sent": q.ps, "Full Requested": q.fr, "Full Sent": q.fs, Offer: q.of };
      for (const s of b.steps) {
        const f = FIELD[s.status];
        if (f != null) G3.check(`${b.id} ${s.status} dated as stored`, near(s.date, f), `"${s.date}" vs ${dm(f)}`);
      }
      const nextIdx = b.kinds.indexOf("next");
      if (CLOSED.has(q.status)) G3.check(`${b.id} closed: no next step`, nextIdx < 0, b.kinds.join(","));
      else if (WRITER.has(q.status)) G3.check(`${b.id} writer's move: the next step last, in rust`, nextIdx === b.kinds.length - 1 && b.next === "rgb(162, 69, 42)", `${b.kinds.join(",")} ${b.next}`);
      else if (nextIdx >= 0) G3.check(`${b.id} a next step is last and rust`, nextIdx === b.kinds.length - 1 && b.next === "rgb(162, 69, 42)", `${b.kinds.join(",")} ${b.next}`);
      const waiting = WAITING.has(q.status);
      G3.check(`${b.id} the waiting bar only while waiting`, waiting === !!b.wait, `${q.status}: bar ${!!b.wait}`);
      const n = D.agents[r.id]?.weeks;
      const from = q.status === "Queried" ? q.sent : q.status === "Partial Sent" ? q.ps : q.status === "Full Sent" ? q.fs : null;
      if (b.wait && n && from != null) {
        const w = Math.floor((now - from) / WEEK);
        const want = Math.max(0, Math.min(w, 2 * Math.round(n)) - Math.round(n));
        G3.check(`${b.id} rust blocks = weeks past the reply time`, b.wait.rust === want && Math.abs(b.wait.weeks - w) <= 1, `${b.wait.rust} rust, ${b.wait.weeks}w vs ${want} (${w}w, usual ${n})`);
        if (want > 0) rustSeen += 1;
      }
      if (b.wait && !n) G3.check(`${b.id} no reply time: the caption alone`, b.wait.n === 0, `${b.wait.n} blocks`);
    }
    await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  }
  G3.check("branches: a story of three or more steps, a bar with rust", threeSteps >= 1 && rustSeen >= 1, `${threeSteps} long stories, ${rustSeen} bars past`);
  G3.done(25);
});

/* ═════════ G4 · not queried ═════════ */
test("CL255-G4 · History for a not-queried agent is the dashed panel and no timeline", async ({ page }) => {
  test.setTimeout(300_000);
  const G4 = new Ledger("G4");
  const D = data();
  const queried = new Set(D.queries.map((q) => q.agentId));
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await toList(page);
    const ids = (await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='table'] [data-cl24='row']")].filter((r) => r.offsetHeight).map((r) => r.dataset.id ?? ""))).filter((i) => D.agents[i] && !queried.has(i)).slice(0, 3);
    G4.check(`${at} population`, ids.length >= 2, `${ids.length} never queried`);
    for (const id of ids) {
      await openCard(page, id, "history");
      await mutateJs(page, "G4", () => { document.querySelector("[data-cl255='not-queried']")?.remove(); });
      const r = await page.evaluate((sel) => {
        const p = document.querySelector<HTMLElement>(sel)!;
        const n = p.querySelector<HTMLElement>("[data-cl255='not-queried']");
        return { panel: !!n, dashed: n ? getComputedStyle(n).borderTopStyle : "", text: n?.innerText.replace(/\s+/g, " ").trim() ?? "", tl: p.querySelectorAll("[data-cl255='timeline'], [data-cl24='history-entry']").length };
      }, pane);
      G4.check(`${at} ${id} the dashed panel, no timeline`, r.panel && r.dashed === "dashed" && /^You haven’t queried \S+ yet\. When you do, every step lands here\.$/.test(r.text) && r.tl === 0, `${r.panel} ${r.dashed} "${r.text}" ${r.tl}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(250);
    }
  }
  G4.done(6);
});

/* ═════════ G5 · the wide card ═════════ */
test("CL255-G5 · in full screen, column 2 holds How and Reach and column 3 the story — the panel's own pieces", async ({ page }) => {
  test.setTimeout(300_000);
  const G5 = new Ledger("G5");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp, { full: true });
    await mutateJs(page, "G5", () => { const b = document.querySelector("[data-cl24='col'][data-col='b']"); if (b) b.innerHTML = "<div data-cl24='facts' class='qc149c-facts'><div><span>Replies in</span><b>~6 wks</b></div></div>"; });
    const r = await page.evaluate(() => {
      const col = (c: string) => document.querySelector<HTMLElement>(`[data-cl24='wide-card'] [data-cl24='col'][data-col='${c}']`);
      const b = col("b"), c = col("c");
      const secs = (el: HTMLElement | null) => (el ? [...el.querySelectorAll<HTMLElement>(":scope > .cl255-sec")].map((s) => s.dataset.k ?? "") : []);
      return { b: secs(b), c: secs(c), facts: !!document.querySelector("[data-cl24='wide-card'] [data-cl24='facts']"), cls: b?.querySelector(".cl255-sec")?.className ?? "",
        story: !!c?.querySelector("[data-cl255='timeline'], [data-cl255='not-queried']") };
    });
    G5.check(`${at} population (a wide card)`, r.b.length + r.c.length > 0 || r.facts, JSON.stringify(r));
    G5.check(`${at} column 2: How and Reach`, r.b.join(",") === "how,reach" && !r.facts, `[${r.b}] facts ${r.facts}`);
    G5.check(`${at} column 3: the story`, r.c[0] === "you-and" && r.story, `[${r.c}] story ${r.story}`);
    G5.check(`${at} the panel's pieces`, r.cls.includes("cl255-sec"), r.cls);
  }
  G5.done(8);
});

/* ═════════ G6 · Your move is the "!" ═════════ */
test("CL255-G6 · every Your move group head and the band's key are the rust ! disc; single-stage glyphs unchanged", async ({ page }) => {
  test.setTimeout(300_000);
  const G6 = new Ledger("G6");
  const half = () => { for (const m of document.querySelectorAll<HTMLElement>("[data-cl255='ym']")) { const s = document.createElement("span"); s.setAttribute("role", "img"); s.setAttribute("aria-label", "Partial Requested"); m.replaceWith(s); } };
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    for (const view of ["list", "cards"] as const) {
      await openCl24(page, vp, { view });
      await mutateJs(page, "G6", half);
      const r = await page.evaluate((v) => {
        const head = document.querySelector<HTMLElement>(v === "list" ? "[data-cl24='group-head'][data-k='you']" : "[data-cl24='card-head'][data-k='you']");
        const ym = head?.querySelector<HTMLElement>("[data-cl255='ym']");
        const cs = ym ? getComputedStyle(ym) : null;
        const rows = [...document.querySelectorAll<HTMLElement>(v === "list" ? "[data-cl24='table'] [data-cl24='row']" : "[data-cl24='card']")].filter((e) => e.offsetHeight);
        return { head: !!head, ym: !!ym, bg: cs?.backgroundColor ?? "", w: ym ? ym.getBoundingClientRect().width : 0, text: ym?.textContent ?? "",
          stageInHead: head ? head.querySelectorAll("[role='img'][aria-label]").length : -1,
          queried: rows.filter((e) => e.dataset.k !== "none").length, rowGlyphs: rows.reduce((n, e) => n + (e.querySelector("[data-cl254='query-line'] [role='img'][aria-label]") ? 1 : 0), 0) };
      }, view);
      G6.check(`${at} ${view} population`, r.head, String(r.head));
      G6.check(`${at} ${view} Your move is the ! disc`, r.ym && r.bg === "rgb(201, 118, 93)" && r.text === "!" && Math.abs(r.w - 17) <= 0.6 && r.stageInHead === 0, `ym ${r.ym} ${r.bg} "${r.text}" ${r.w.toFixed(1)}px; ${r.stageInHead} stage glyphs`);
      if (view === "list") G6.check(`${at} single-stage glyphs unchanged`, r.queried > 0 && r.rowGlyphs === r.queried, `${r.rowGlyphs} glyphs over ${r.queried} queried rows`);
    }
    await openCl24(page, vp, { full: true });
    await mutateJs(page, "G6", half);
    const b = await page.evaluate(() => {
      const seg = document.querySelector<HTMLElement>("[data-cl24='band-seg'][data-k='you']");
      const ym = seg?.querySelector<HTMLElement>("[data-cl255='ym']");
      return { seg: !!seg, ym: !!ym, w: ym ? ym.getBoundingClientRect().width : 0, sw: seg ? getComputedStyle(seg.querySelector("span")!, "::before").display : "" };
    });
    G6.check(`${at} full screen band key`, b.seg && b.ym && Math.abs(b.w - 14) <= 0.6 && b.sw === "none", `${b.seg} ${b.ym} ${b.w.toFixed(1)}px swatch ${b.sw}`);
  }
  G6.done(12);
});

if (BASE) console.log("[CL255] measuring the BASE build (v25.4): every lock should be red");
