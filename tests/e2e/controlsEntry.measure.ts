/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 — the agent's reply that moves nothing, MEASURED on the rendered page (emulator, 1440 × 900), over
 * four `ce1-` queries (tests/e2e/seedCe1.mjs). Every surface is read BEFORE the entries are written and AFTER, and the
 * claim is the difference.
 *
 *   P3  the query card — Tracking: the small note (oc oc-note, the ref's #f6f3ee box, title, date line, words, date,
 *       in that order); band, track, Day N and status unchanged; the footer's date line follows the entry; the Agent
 *       tab's Last heard is the entry's day and says what it was; the Notes tab lists their words with the kind's phrase
 *   P4  the agent card — History draws the same note (built from the card's steps, not twice); Notes lists the words;
 *       the footer's date line as on the query card
 *   P5  verify, do not build — the Queries page card's "Next" date and the to-do task's date, before and after
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/controlsEntry.measure.ts --project=measure`. Self-cleaning.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openCard as openAgentCard, CARD as AGENT_CARD } from "./cl262Lib";

test.setTimeout(900_000);
const DIR = "reports/controls-entry-v1";
const VP = { width: 1440, height: 900 };
const KEYS = ["fr", "q", "n", "rm"] as const;
type Key = (typeof KEYS)[number];
const QCARD = "[data-qp='panel'] [data-qc152='card']";
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const seed = (arg = "") => { const out = execSync(`node tests/e2e/seedCe1.mjs ${arg}`.trim(), { encoding: "utf8", stdio: "pipe", timeout: 90_000 }); console.log(`  seed ${arg || "(write)"}: ${out.trim()}`); return out; };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); console.log(`  ${ok ? "✓" : "✗"} ${where} — ${detail}`); }
  save(readings: unknown) { mkdirSync(`${DIR}/ledger`, { recursive: true }); writeFileSync(`${DIR}/ledger/measure.json`, JSON.stringify({ rows: this.rows, readings }, null, 1)); }
}

/* ── the Queries page: each slip's Last heard and Next ─────────────────────────────────────────────────────────── */
async function readSlips(page: Page) {
  await page.addInitScript(() => { try { sessionStorage.setItem("qh.qc.view150", "list"); sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); sessionStorage.setItem("qh.qc.folds153", JSON.stringify(["quiet", "closed"])); localStorage.setItem("sa.guide.queries", "1"); } catch { /* */ } });
  await openRoute(page, "/queries", VP);
  await page.locator("[data-qc154='card']").first().waitFor({ timeout: 60_000 });
  await settle(page, 2000);
  console.log("  slips:", JSON.stringify(await page.evaluate(() => ({ all: document.querySelectorAll("[data-qc154='card']").length, ce1: [...document.querySelectorAll("[data-qc154='card']")].filter((s) => (s.getAttribute("data-id") ?? "").startsWith("ce1-")).map((s) => s.getAttribute("data-id")), folds: [...document.querySelectorAll("[data-qc153='fold']")].map((x) => x.getAttribute("data-k")), ms: document.querySelector("[aria-label^='Manuscript:']")?.getAttribute("aria-label") }))));
  await page.locator("[data-qc154='card'][data-id^='ce1-']").first().waitFor({ timeout: 30_000 });
  await settle(page, 900);
  return page.evaluate((keys) => Object.fromEntries(keys.map((k) => {
    const s = [...document.querySelectorAll<HTMLElement>(`[data-qc154='card'][data-id='ce1-${k}']`)].find((e) => e.getBoundingClientRect().height > 0);
    const fact = (f: string) => { const x = s?.querySelector<HTMLElement>(`[data-qc154='fact'][data-k='${f}']`); return x ? (x.innerText || "").replace(/\s+/g, " ").trim() : null; };
    return [k, s ? { status: s.dataset.status ?? null, heard: fact("heard"), next: fact("next") } : null];
  })), KEYS as unknown as string[]);
}

/* ── the query card, from its slip ─────────────────────────────────────────────────────────────────────────────── */
async function readQueryCard(page: Page, k: Key) {
  await page.evaluate((id) => {
    const s = [...document.querySelectorAll<HTMLElement>(`[data-qc154='card'][data-id='${id}']`)].find((e) => e.getBoundingClientRect().height > 0);
    s?.scrollIntoView({ block: "center" }); s?.click();
  }, `ce1-${k}`);
  await page.locator(`${QCARD}[data-id='ce1-${k}']`).waitFor({ timeout: 20_000 });
  await settle(page, 900);
  const C = `${QCARD}[data-id='ce1-${k}']`;
  const tracking = await page.evaluate((sel) => {
    const card = document.querySelector<HTMLElement>(sel)!;
    const t = (q: string) => (card.querySelector<HTMLElement>(q)?.innerText ?? "").replace(/\s+/g, " ").trim();
    const notes = [...card.querySelectorAll<HTMLElement>("[data-qc152='msg'][data-kind='reply']")].map((m) => {
      const bx = m.querySelector<HTMLElement>(".qc152-bx")!;
      const order = ["[data-qc152='msg-title']", ".oc-sub", "[data-qc152='quote']", "[data-qc152='msg-date']"]
        .map((q) => { const e = m.querySelector<HTMLElement>(q); return e ? e.getBoundingClientRect().top : null; });
      return {
        cls: m.className, title: m.querySelector<HTMLElement>("[data-qc152='msg-title']")?.innerText ?? "",
        sub: m.querySelector<HTMLElement>(".oc-sub")?.innerText.trim() ?? null,
        quote: m.querySelector<HTMLElement>("[data-qc152='quote']")?.innerText.trim() ?? null,
        stamp: m.querySelector<HTMLElement>("[data-qc152='msg-date']")?.innerText.trim() ?? null,
        bg: getComputedStyle(bx).backgroundColor, radius: getComputedStyle(bx).borderTopLeftRadius, shadow: getComputedStyle(bx).boxShadow,
        subFont: (() => { const e = m.querySelector<HTMLElement>(".oc-sub"); return e ? `${getComputedStyle(e).fontSize} ${getComputedStyle(e).color}` : null; })(),
        order, width: Math.round(m.getBoundingClientRect().width), threadWidth: Math.round((m.parentElement as HTMLElement).getBoundingClientRect().width),
      };
    });
    return {
      band: t("[data-qc152='band-word']"), stage: card.querySelector<HTMLElement>("[data-qc152='band']")?.dataset.stage ?? null,
      track: card.querySelector<HTMLElement>("[data-qc164='track']")?.innerHTML.length ?? 0, day: t("[data-qc164='day']"),
      footLead: t("[data-qc152='reply-lead']"), footSub: t("[data-qc152='reply-sub']"), notes,
      fullBubbles: card.querySelectorAll("[data-qc152='msg'][data-kind='reply']:not(.oc-note)").length,
    };
  }, C);
  await page.locator(`${C} [data-qc152='tab'][data-tab='agent']`).click(); await settle(page, 600);
  const heard = await page.locator(`${C} [data-qc158='box'][data-k='heard']`).first().innerText().catch(() => "");
  await page.locator(`${C} [data-qc152='tab'][data-tab='notes']`).click(); await settle(page, 600);
  const quotes = await page.locator(`${C} [data-qc158='quote']`).allInnerTexts().catch(() => [] as string[]);
  await page.locator(`${C} [data-qc152='tab'][data-tab='tracking']`).click(); await settle(page, 300);
  await page.screenshot({ path: `${DIR}/shots/${k}-card-${PHASE}.png`, clip: (await page.locator(C).boundingBox()) ?? undefined }).catch(() => {});
  await page.keyboard.press("Escape"); await settle(page, 600);
  return { ...tracking, heard: heard.replace(/\s+/g, " ").trim(), quotes: quotes.map((q) => q.replace(/\s+/g, " ").trim()) };
}

/* ── the agent card: History, Notes, the footer ────────────────────────────────────────────────────────────────── */
async function readAgentCard(page: Page, k: Key) {
  await openAgentCard(page, VP, { id: `ce1-ag-${k}` });
  const foot = await page.evaluate((sel) => {
    const c = document.querySelector<HTMLElement>(sel)!;
    const t = (q: string) => (c.querySelector<HTMLElement>(q)?.innerText ?? "").replace(/\s+/g, " ").trim();
    return { lead: t("[data-qc152='reply-lead']"), sub: t("[data-qc152='reply-sub']") };
  }, AGENT_CARD);
  await page.locator(`${AGENT_CARD} [data-cl262='tab'][data-tab='history']`).click(); await settle(page, 1200);
  const history = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(`${sel} [data-cl262='history'] [data-qc152='msg'][data-kind='reply']`)].map((m) => ({
    cls: m.className, title: m.querySelector<HTMLElement>("[data-qc152='msg-title']")?.innerText ?? "", bg: getComputedStyle(m.querySelector<HTMLElement>(".qc152-bx")!).backgroundColor,
  })), AGENT_CARD);
  const allMsgs = await page.locator(`${AGENT_CARD} [data-cl262='history'] [data-qc152='msg']`).count();
  await page.screenshot({ path: `${DIR}/shots/${k}-agent-history-${PHASE}.png`, clip: (await page.locator(AGENT_CARD).first().boundingBox()) ?? undefined }).catch(() => {});
  await page.locator(`${AGENT_CARD} [data-cl262='tab'][data-tab='notes']`).click(); await settle(page, 800);
  const quotes = (await page.locator(`${AGENT_CARD} [data-qc158='quote']`).allInnerTexts().catch(() => [] as string[])).map((q) => q.replace(/\s+/g, " ").trim());
  await page.keyboard.press("Escape"); await settle(page, 500);
  return { foot, history, allMsgs, quotes };
}

/* ── the To-do list: each ce1 task's title and figure ──────────────────────────────────────────────────────────── */
async function readTodo(page: Page) {
  await openRoute(page, "/todo", VP);
  await page.locator('[data-tws="list"]').first().waitFor({ timeout: 60_000 }).catch(() => {});
  await settle(page, 1500);
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!root) return { found: false, rows: [] as { key: string; title: string; due: string }[] };
    const rows = [...root.querySelectorAll<HTMLElement>("[data-tws-row]")].filter((r) => (r.getAttribute("data-tws-row") ?? "").includes("ce1-"))
      .map((r) => ({ key: r.getAttribute("data-tws-row") ?? "", title: (r.querySelector<HTMLElement>(".tws-tx b")?.innerText ?? "").trim(), due: (r.querySelector<HTMLElement>(".tws-du")?.innerText ?? "").replace(/\s+/g, " ").trim() }));
    return { found: true, rows };
  });
}

let PHASE = "before";
async function readAll(page: Page) {
  mkdirSync(`${DIR}/shots`, { recursive: true });
  const slips = await readSlips(page);
  const cards: Record<string, Awaited<ReturnType<typeof readQueryCard>>> = {};
  for (const k of KEYS) cards[k] = await readQueryCard(page, k);
  const agents: Record<string, Awaited<ReturnType<typeof readAgentCard>>> = {};
  for (const k of ["fr", "q"] as const) agents[k] = await readAgentCard(page, k);
  const todo = await readTodo(page);
  return { slips, cards, agents, todo };
}

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ahead = (d: number) => new Date(Date.now() + d * DAY);
const dm = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]}`;
const wdm = (d: Date) => `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;

test("Controls: entry v1 — the entry on the rendered page", async ({ page }) => {
  const L = new Ledger();
  /* the seed's queries are on seed-ms-1 (The Smoke Test); every page is scoped to the active manuscript */
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* */ } });
  seed("--clean"); seed();
  try {
    PHASE = "before";
    const before = await readAll(page);
    seed("--entries");
    PHASE = "after";
    const after = await readAll(page);
    L.save({ before, after });

    /* population: every surface found what it reads */
    for (const k of KEYS) L.check(`population · ${k}`, before.slips[k] && after.slips[k] && before.cards[k] && after.cards[k], `slip and card found for ce1-${k}`);

    /* P3 · Tracking: one small note per query, never a full bubble */
    const words = { fr: "Any news on the manuscript?", q: "Still on my pile", n: "away until 7 December", rm: "Reading now" } as Record<Key, string>;
    const titles = { fr: "Imogen chased the full", q: "Jules sent a holding reply", n: "Nadia sent a note", rm: "Rafe sent a holding reply" } as Record<Key, string>;
    const subs = { fr: `Send by ${wdm(ahead(10))}`, q: `Reply expected by ${dm(ahead(52))}`, n: null, rm: `Reply expected by ${dm(ahead(40))}` } as Record<Key, string | null>;
    for (const k of KEYS) {
      const b = before.cards[k], a = after.cards[k], n = a.notes[0];
      L.check(`P3 tracking · ${k} · no note before`, b.notes.length === 0, `${b.notes.length} reply steps before`);
      L.check(`P3 tracking · ${k} · one note after`, a.notes.length === 1 && a.fullBubbles === 0, `${a.notes.length} reply steps, ${a.fullBubbles} without oc-note`);
      if (!n) continue;
      L.check(`P3 tracking · ${k} · the note's class`, /\boc\b/.test(n.cls) && /\boc-note\b/.test(n.cls), n.cls);
      L.check(`P3 tracking · ${k} · the ref's box`, n.bg === "rgb(246, 243, 238)" && n.radius === "12px" && n.shadow === "none", `${n.bg} r${n.radius} ${n.shadow}`);
      L.check(`P3 tracking · ${k} · title`, n.title.trim() === titles[k], n.title);
      L.check(`P3 tracking · ${k} · date line`, (n.sub ?? null) === subs[k], String(n.sub));
      L.check(`P3 tracking · ${k} · their words`, (n.quote ?? "").includes(words[k]), String(n.quote));
      L.check(`P3 tracking · ${k} · stamp`, n.stamp === dm(new Date()), String(n.stamp));
      const o = n.order.filter((x): x is number => x != null);
      L.check(`P3 tracking · ${k} · order title, date line, words, date`, o.every((v, i) => i === 0 || v >= o[i - 1]), JSON.stringify(n.order));
      L.check(`P3 tracking · ${k} · narrower than a step`, n.width <= Math.ceil(n.threadWidth * 0.82) + 1, `${n.width} of ${n.threadWidth}`);
      L.check(`P3 band · ${k} · band, stage, track and Day unchanged`, a.band === b.band && a.stage === b.stage && a.track === b.track && a.day === b.day, `${b.band}/${b.stage}/${b.day} → ${a.band}/${a.stage}/${a.day}`);
      L.check(`P3 status · ${k} · the slip's status unchanged`, after.slips[k]?.status === before.slips[k]?.status, `${before.slips[k]?.status} → ${after.slips[k]?.status}`);
      L.check(`P3 agent tab · ${k} · Last heard is today`, a.heard.includes(dm(new Date())) && !b.heard.includes(dm(new Date())), `${b.heard} → ${a.heard}`);
      const what = { fr: "chased the full", q: "a holding reply", n: "a note", rm: "a holding reply" }[k];
      L.check(`P3 agent tab · ${k} · says what it was`, a.heard.includes(what), a.heard);
      const phrase = { fr: "when chasing the full", q: "in a holding reply", n: "in a note", rm: "in a holding reply" }[k];
      L.check(`P3 notes · ${k} · their words with the phrase`, a.quotes.some((x) => x.includes(phrase) && x.includes(words[k])) && !b.quotes.some((x) => x.includes(words[k])), a.quotes.join(" | "));
    }
    /* P3 · the footer: only the date line changes, and only where the entry gave a date */
    L.check("P3 footer · fr · Send by follows", after.cards.fr.footSub.includes(dm(ahead(10))) && !before.cards.fr.footSub.includes(dm(ahead(10))) && after.cards.fr.footLead === before.cards.fr.footLead, `${before.cards.fr.footLead} / ${before.cards.fr.footSub} → ${after.cards.fr.footLead} / ${after.cards.fr.footSub}`);
    L.check("P3 footer · q · Reply expected follows", after.cards.q.footSub.includes(dm(ahead(52))), `${before.cards.q.footLead} / ${before.cards.q.footSub} → ${after.cards.q.footLead} / ${after.cards.q.footSub}`);
    L.check("P3 footer · n · a note with no date moves no date (Gone quiet may end)", (before.cards.n.footSub.match(/\d{1,2} [A-Z][a-z]{2}/)?.[0] ?? "") === (after.cards.n.footSub.match(/\d{1,2} [A-Z][a-z]{2}/)?.[0] ?? "") && /\d{1,2} [A-Z][a-z]{2}/.test(after.cards.n.footSub), `${before.cards.n.footLead} / ${before.cards.n.footSub} → ${after.cards.n.footLead} / ${after.cards.n.footSub}`);

    /* P4 · the agent card */
    for (const k of ["fr", "q"] as const) {
      const b = before.agents[k], a = after.agents[k];
      L.check(`P4 history · ${k} · the same note`, a.history.length === 1 && /\boc-note\b/.test(a.history[0].cls) && a.history[0].title.trim() === titles[k] && b.history.length === 0,
        `${b.history.length} → ${a.history.length}: ${a.history.map((h) => `${h.title} [${h.cls}] ${h.bg}`).join(", ")}`);
      L.check(`P4 history · ${k} · one more step than before`, a.allMsgs === b.allMsgs + 1, `${b.allMsgs} → ${a.allMsgs}`);
      L.check(`P4 notes · ${k} · their words, read-only`, a.quotes.some((x) => x.includes(words[k])), a.quotes.join(" | "));
      L.check(`P4 footer · ${k} · the date as on the query card`, (k === "fr" ? a.foot.sub === `Send by ${wdm(ahead(10))}` : a.foot.sub === after.cards[k].footSub) && a.foot.sub.includes(dm(ahead(k === "fr" ? 10 : 52))) && after.cards[k].footSub.includes(dm(ahead(k === "fr" ? 10 : 52))), `${a.foot.lead} / ${a.foot.sub} vs card ${after.cards[k].footSub}`);
    }

    /* P5 · verify: the Queries page card's Next, and the to-do task's date (recorded either way; asserted where Phase 1 says) */
    for (const k of KEYS) L.check(`P5 next · ${k} · recorded`, true, `${before.slips[k]?.next} → ${after.slips[k]?.next}`);
    L.check("P5 next · q · follows the new reply date", (after.slips.q?.next ?? "").includes(dm(ahead(52))), String(after.slips.q?.next));
    L.check("P5 next · rm · follows the new reply date", (after.slips.rm?.next ?? "").includes(dm(ahead(40))), String(after.slips.rm?.next));
    L.check("P5 next · fr · follows Send by", (after.slips.fr?.next ?? "") !== (before.slips.fr?.next ?? ""), `${before.slips.fr?.next} → ${after.slips.fr?.next}`);
    L.check("P5 to-do · found the page", before.todo.found && after.todo.found, `before ${before.todo.rows.length} rows, after ${after.todo.rows.length}`);
    for (const r of after.todo.rows) {
      const was = before.todo.rows.find((x) => x.key === r.key);
      L.check(`P5 to-do · ${r.key} · recorded`, true, `${was ? `${was.title} · ${was.due}` : "(absent before)"} → ${r.title} · ${r.due}`);
    }
    for (const r of before.todo.rows.filter((x) => !after.todo.rows.some((y) => y.key === x.key))) L.check(`P5 to-do · ${r.key} · recorded`, true, `${r.title} · ${r.due} → (gone after)`);
    L.save({ before, after });
  } finally {
    seed("--clean");
  }
  for (const r of L.rows.filter((x) => !x.ok)) console.log(`  ✗ ${r.where} — ${r.detail}`);
  console.log(`[controls-entry-v1] ${L.rows.filter((r) => r.ok).length}/${L.rows.length} green`);
  expect(L.rows.length).toBeGreaterThan(60);
  expect(L.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
});
