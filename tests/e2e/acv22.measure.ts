/**
 * Agent card v2.2 — the agent card edited the query card's one way (design-refs/agent-card-v2-2/agent-card-v2-2.html):
 * the same pencil, one section at a time with the question inside it, the head edited in place, the saved message in the
 * card, the band's ⋯. On the Contact list's own card. Fixtures: tests/e2e/seedAcv22.mjs (self-cleaning).
 *
 * Modes (ACV22_TAG):
 *   after  — (default) the locks, AC1–AC14.
 *   mutant — each lock under ITS OWN named mutation only (ACV22_MUT lists which, default all); every lock must go red.
 *            Code mutations are `window.__qc168mut = ["acN"]` (QcEdit168 `mut168`, off production only); AC1 and AC4
 *            are applied in the page. Ledgers: reports/agent-card-v2-2/ledger/{after,mutant}-AC*.json.
 * Frames (ACV22_ONLY=F): Chromium and WebKit at 1512.
 *
 * ⚠️ LAYOUT SIZES, NOT BOUNDING BOXES (the card leans): positions are offsetTop/Left summed up to the card.
 * ⚠️ EVERY WRITE IS PUT BACK IN THE SAME RUN through its own Undo, and read back.
 */
import { test, expect, webkit, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openCard } from "./cl262Lib";
import { openRoute } from "./measure";

const TAG = (process.env.ACV22_TAG ?? "after") as "after" | "mutant";
const ONLY = process.env.ACV22_ONLY ?? "";
const run = (id: string) => (!ONLY && !id.startsWith("F")) || ONLY.split(",").includes(id);
const MUT = TAG === "mutant" ? (process.env.ACV22_MUT ?? "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16").split(",") : [];
const DIR = "reports/agent-card-v2-2";
const AC = "[data-cl262='panel'] [data-acv2='card']";
const A = (s: string) => `${AC} ${s}`;
const HEAD = A("[data-acv22='head-open']");
const TOAST = A("[data-acv22='toast']");
const VP = { width: 1512, height: 900 };
const ADA = "acv22fx-ada", WREN = "acv22fx-wren", NELL = "acv22fx-nell", VERA = "acv22fx-vera";
test.setTimeout(600_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });
const SEED = ["tests/e2e/seedAcv22.mjs"];
const seed = (...a: string[]) => execFileSync("node", [...SEED, ...a], { encoding: "utf8", timeout: 60_000 });
const dump = (id: string) => (JSON.parse(seed("--dump", id).trim().split("\n").pop()!) as { agent: Record<string, unknown> }).agent;
test.describe.configure({ mode: "default" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

let CUR = "";
class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) { CUR = id.slice(2); }
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${TAG}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    const bad = this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`);
    if (TAG === "mutant") expect(bad.length, `${this.id}: the mutation must turn the lock red`).toBeGreaterThan(0);
    else expect(bad).toEqual([]);
  }
}
const own = () => (MUT.includes(CUR) ? CUR : "");
async function openAc(page: Page, id: string) {
  page.setDefaultTimeout(30_000);
  await page.addInitScript((m) => { (window as unknown as { __qc168mut?: string[] }).__qc168mut = m && !["1", "4", "16"].includes(m) ? [`ac${m}`] : []; }, own());
  await openCard(page, VP, { id });
  await page.locator(AC).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await mutate(page);
}
/* the in-page mutations: AC1 (the pencil static on hover), AC4 (the rust bar put back), AC16 (More's old layout: the
   first field's 2px top against the next one's 20px, and the label "MSWL") */
async function mutate(page: Page) {
  const m = own();
  if (m === "1") await page.addStyleTag({ content: ".qc152 .qc168-pen { display: none !important; } .qc152 [data-qc168-host]:hover .qc168-pen { display: grid !important; position: static !important; translate: none !important; }" });
  if (m === "4") await page.evaluate((ac) => {
    const c = document.querySelector<HTMLElement>(`${ac} .qc152-in`);
    if (c && !c.querySelector("[data-m4]")) { const d = document.createElement("div"); d.dataset.m4 = "1"; d.className = "cl262-save is-guard"; d.setAttribute("data-cl262", "save-bar"); d.textContent = "Unsaved changes · Keep editing · Discard · Save all"; c.append(d); }
  }, AC);
  if (m === "16") await page.evaluate(() => {
    if (!document.getElementById("m16")) { const st = document.createElement("style"); st.id = "m16"; st.textContent = ".qc152 .ag-head .ag-hmore > .aap-f { margin-top: 20px !important; } .qc152 .ag-head .ag-hmore > .aap-f:first-child { margin-top: 2px !important; }"; document.head.append(st); }
    document.querySelectorAll<HTMLElement>("[data-acv22='head-more'] [data-f='mswl'] > .aap-l").forEach((l) => { l.textContent = "MSWL"; });
  });
}
const tab = async (page: Page, t: string) => { await page.locator(A(`[data-cl262='tab'][data-tab='${t}']`)).click(); await page.waitForTimeout(400); };
const selected = (page: Page) => page.locator(A("[data-cl262='tab'][aria-selected='true']")).getAttribute("data-tab");
async function pen(page: Page, k: string) {
  const host = k === "contact" ? page.locator(A("[data-acv2='head']")) : page.locator(A(`[data-cl262='sec'][data-k='${k}']`));
  await host.first().hover();
  await page.locator(A(`[data-cl262='pen'][data-k='${k}']`)).first().click();
  await page.waitForTimeout(450);
}
const openKeys = (page: Page) => page.locator(A("[data-acv21='open']")).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.k ?? ""));
const sec = (k: string) => A(`[data-acv21='open'][data-k='${k}']`);
const snack = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".sa-toast")].filter((e) => e.offsetHeight > 0).map((e) => (e.textContent ?? "").trim()).join(" | "));
async function layout(page: Page) {
  return page.evaluate((ac) => {
    const top = document.querySelector<HTMLElement>(`${ac} [data-acv2='qc']`)!;
    const pos = (e: HTMLElement) => { let x = 0, y = 0; for (let n: HTMLElement | null = e; n && n !== top; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; } return `${x},${y},${e.offsetWidth},${e.offsetHeight}`; };
    return [...top.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest(".qc168-pen") && !e.closest("svg") && e.offsetParent !== null)
      .map((e, i) => `${i}:${e.tagName}.${typeof e.className === "string" ? e.className.split(" ")[0] : ""}@${pos(e)}`);
  }, AC);
}
const offTop = (page: Page, sel: string) => page.locator(sel).first().evaluate((e, ac) => { const top = document.querySelector<HTMLElement>(`${ac} [data-acv2='qc']`)!; let y = 0; for (let n: HTMLElement | null = e as HTMLElement; n && n !== top; n = n.offsetParent as HTMLElement | null) y += n.offsetTop; return y; }, AC);

/* ══ AC1 — hovering each section and the head changes no offset size or position ══ */
if (run("1")) test("AC1 · hover moves nothing", async ({ page }) => {
  const L = new Ledger("AC1");
  await openAc(page, ADA);
  for (const [what, sel] of [["the head", "[data-acv2='head']"], ["how they work", "[data-cl262='sec'][data-k='how']"], ["the wishlist", "[data-cl262='sec'][data-k='wishlist']"], ["genres", "[data-cl262='sec'][data-k='genres']"], ["what they ask for", "[data-cl262='sec'][data-k='materials']"]] as const) {
    await page.mouse.move(2, 2); await page.waitForTimeout(300);
    const before = await layout(page);
    await page.locator(A(sel)).first().hover(); await page.waitForTimeout(450);
    const shown = await page.locator(A(`${sel} [data-qc168='pen']`)).first().evaluate((e) => getComputedStyle(e).opacity).catch(() => "none");
    const after = await layout(page);
    const d = before.filter((x, i) => x !== after[i]);
    L.check(`${what}: its pencil shows`, shown === "1", shown);
    L.check(`${what}: nothing moved or resized`, d.length === 0 && before.length === after.length, d.slice(0, 3).join(" | "));
  }
  L.done(10);
});

/* ══ AC2 — only one section is ever open; opening a second closes an unchanged first ══ */
if (run("2")) test("AC2 · one section at a time", async ({ page }) => {
  const L = new Ledger("AC2");
  await openAc(page, ADA);
  await pen(page, "wishlist");
  L.check("population: the wishlist is open", (await openKeys(page)).join() === "wishlist", (await openKeys(page)).join());
  await pen(page, "genres");
  const k = await openKeys(page);
  L.check("opening genres closed the unchanged wishlist", k.join() === "genres", k.join());
  await pen(page, "how");
  L.check("…and How then closed genres", (await openKeys(page)).join() === "how", (await openKeys(page)).join());
  L.done(3);
});

/* ══ AC3 — with a changed section, opening another asks inside the first and opens nothing ══ */
if (run("3")) test("AC3 · a changed section asks inside itself", async ({ page }) => {
  const L = new Ledger("AC3");
  await openAc(page, ADA);
  await pen(page, "wishlist");
  await page.locator(`${sec("wishlist")} textarea`).fill("Thrillers with a moral knot. ACV22-AC3");
  await pen(page, "genres");
  L.check("the question shows inside the wishlist", await page.locator(`${sec("wishlist")} [data-qc168='ask']`).count() === 1, "");
  L.check("…in its words", ((await page.locator(`${sec("wishlist")} [data-qc168='ask']`).textContent().catch(() => "")) ?? "").includes("Discard your changes to the wishlist?"), "");
  L.check("nothing else opened", (await openKeys(page)).join() === "wishlist", (await openKeys(page)).join());
  await page.locator(`${sec("wishlist")} [data-qc168='discard']`).click().catch(() => {});
  await page.waitForTimeout(500);
  L.check("Discard: the click goes on (genres opens)", (await openKeys(page)).join() === "genres", (await openKeys(page)).join());
  L.check("nothing was written", String(dump(ADA).mswlNotes) === "Thrillers with a moral knot at the centre.", String(dump(ADA).mswlNotes));
  L.done(5);
});

/* ══ AC4 — no rust bar and no "Save all", in any state ══ */
if (run("4")) test("AC4 · no rust bar, no Save all", async ({ page }) => {
  const L = new Ledger("AC4");
  await openAc(page, ADA);
  const read = async (state: string) => {
    await mutate(page);
    const r = await page.evaluate((ac) => { const c = document.querySelector<HTMLElement>(ac)!; return { bar: c.querySelectorAll("[data-cl262='save-bar'], [data-acv21='guard']").length, all: /Save all|Save it\b/.test(c.textContent ?? "") }; }, AC);
    L.check(`${state}: no rust bar`, r.bar === 0, String(r.bar));
    L.check(`${state}: no "Save all"`, !r.all, String(r.all));
  };
  await read("reading");
  await pen(page, "wishlist"); await read("a section open");
  await page.locator(`${sec("wishlist")} textarea`).fill("ACV22-AC4");
  await page.locator(A("[data-cl262='tab'][data-tab='history']")).click(); await page.waitForTimeout(400); await read("leaving with a change");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await read("Esc with a change");
  await page.locator(`${sec("wishlist")} [data-qc168='discard']`).click().catch(() => {});
  await pen(page, "contact"); await read("the head open");
  L.done(10);
});

/* ══ AC5 — the tick is disabled until its section changes ══ */
if (run("5")) test("AC5 · the tick waits for a change", async ({ page }) => {
  const L = new Ledger("AC5");
  await openAc(page, ADA);
  for (const k of ["wishlist", "genres", "how", "materials"]) {
    await pen(page, k);
    L.check(`${k}: the tick is disabled before a change`, await page.locator(`${sec(k)} [data-qc168='tick']`).isDisabled(), "");
  }
  await pen(page, "wishlist");
  await page.locator(`${sec("wishlist")} textarea`).fill("ACV22-AC5");
  L.check("wishlist: the tick is enabled after a change", await page.locator(`${sec("wishlist")} [data-qc168='tick']`).isEnabled(), "");
  await page.locator(`${sec("wishlist")} [data-qc168='cross']`).click();
  await pen(page, "contact");
  L.check("the head: the tick is disabled before a change", await page.locator(`${HEAD} [data-qc168='tick']`).isDisabled(), "");
  L.done(6);
});

/* ══ AC6 — the head opens from History and from Notes: the tab is unchanged; no Contact details section in the tab ══ */
if (run("6")) test("AC6 · the head opens where it is", async ({ page }) => {
  const L = new Ledger("AC6");
  await openAc(page, ADA);
  for (const t of ["history", "notes"]) {
    await tab(page, t);
    await pen(page, "contact");
    L.check(`${t}: the head is open`, await page.locator(HEAD).count() === 1, "");
    L.check(`${t}: the selected tab is unchanged`, (await selected(page)) === t, String(await selected(page)));
    L.check(`${t}: no Contact details section in the tab`, await page.locator(A("[data-acv2='body'] [data-acv21='open']")).count() === 0, "");
    await page.locator(`${HEAD} [data-qc168='cross']`).click(); await page.waitForTimeout(300);
  }
  L.done(6);
});

/* ══ AC7 — head open, More closed: the tabs row moves down by no more than 56px; pill, query box and footer drawn ══ */
if (run("7")) test("AC7 · the head grows by little and nothing else changes", async ({ page }) => {
  const L = new Ledger("AC7");
  await openAc(page, ADA);
  const tabs0 = await offTop(page, A("[data-acv2='tabs']"));
  const drawn0 = await page.locator(A("[data-acv2='qbox']")).count();
  await pen(page, "contact");
  await page.locator(`${HEAD} [data-acv22='more'][aria-expanded='true']`).click().catch(() => {});
  await page.waitForTimeout(300);
  const tabs1 = await offTop(page, A("[data-acv2='tabs']"));
  L.check("More is closed", await page.locator(`${HEAD} [data-acv22='head-more']`).count() === 0, "");
  L.check("the tabs row moved down by 56px or less", tabs1 - tabs0 <= 56 && tabs1 >= tabs0, `${tabs0} → ${tabs1} (${tabs1 - tabs0})`);
  for (const [w, s] of [["the status pill", "[data-acv2='pill']"], ["the query box", "[data-acv2='qbox']"], ["the footer", "[data-acv2='foot']"]] as const) {
    const h = await page.locator(A(s)).first().evaluate((e) => (e as HTMLElement).offsetHeight).catch(() => 0);
    /* the query box is drawn for a query on the active book: it must still be drawn if it was */
    if (w === "the query box") L.check(`${w} is still drawn (it was: ${drawn0 > 0})`, drawn0 === 0 ? true : h > 0, String(h));
    else L.check(`${w} is still drawn`, h > 0, String(h));
  }
  L.check("no Contact details section in the tab", await page.locator(A("[data-acv2='body'] [data-acv21='open']")).count() === 0, "");
  L.check("the tab below sits back (42%)", await page.locator(A("[data-acv2='body'] > *")).first().evaluate((e) => getComputedStyle(e).opacity) === "0.42", "");
  L.done(7);
});

/* ══ AC8 — each head field saves what the section saved, read back; Undo restores ══ */
if (run("8")) test("AC8 · the head's fields save, read back, and Undo", async ({ page }) => {
  const L = new Ledger("AC8");
  const was = dump(WREN);
  await openAc(page, WREN);
  await pen(page, "contact");
  L.check("More opened by itself (Wren has a wishlist page)", await page.locator(`${HEAD} [data-acv22='head-more']`).count() === 1, "");
  await page.locator(`${HEAD} input[data-ae='name']`).fill("Wren Larkin");
  await page.locator(`${HEAD} input[data-ae='agency']`).fill("Field Literary");
  await page.locator(`${HEAD} [data-aap='country'] [data-country='IE']`).click();
  await page.locator(`${HEAD} input[data-ae='city']`).fill("Cork");
  await page.locator(`${HEAD} input[data-ae='email']`).fill("wren@field.example");
  await page.locator(`${HEAD} input[data-ae='website']`).fill("field.example");
  await page.locator(`${HEAD} input[data-ae='mswl']`).fill("https://www.manuscriptwishlist.com/mswl-post/wren-larkin/");
  await page.locator(`${HEAD} input[data-aap='social']`).fill("@wrenlarkin");
  await page.locator(`${HEAD} input[data-ae='form']`).fill("https://field.example/submit");
  await page.locator(`${HEAD} [data-qc168='tick']`).click();
  const saved = await page.locator(TOAST).waitFor({ timeout: 20_000 }).then(() => true, () => false);
  await page.waitForTimeout(1200);
  const a = dump(WREN);
  const socials = JSON.stringify(a.socials ?? []);
  const exp: [string, boolean, string][] = [
    ["name", a.name === "Wren Larkin", String(a.name)], ["agency", a.agency === "Field Literary", String(a.agency)], ["country", a.country === "IE", String(a.country)],
    ["city", a.city === "Cork", String(a.city)], ["email", a.email === "wren@field.example", String(a.email)], ["website", /field\.example/.test(String(a.website)) && a.website !== was.website, String(a.website)],
    ["MSWL", socials.includes("wren-larkin"), socials], ["social", socials.includes("wrenlarkin"), socials], ["submission link", socials.includes("field.example/submit"), socials],
  ];
  L.check("population: the save landed (the card's toast)", saved, "");
  for (const [f, ok, got] of exp) L.check(`read back: ${f}`, ok, got);
  if (saved) { await page.locator(`${TOAST} [data-qc1522='undo']`).click(); await page.waitForTimeout(2500); }
  const back = dump(WREN);
  const keys = ["name", "agency", "country", "city", "email", "website", "socials"];
  L.check("Undo restored every field", keys.every((k) => JSON.stringify(back[k] ?? null) === JSON.stringify(was[k] ?? null)), keys.filter((k) => JSON.stringify(back[k] ?? null) !== JSON.stringify(was[k] ?? null)).join(","));
  L.done(12);
});

/* ══ AC9 — a known city abroad shows the built offer under the city, in the head ══ */
if (run("9")) test("AC9 · the city offer, in the head", async ({ page }) => {
  const L = new Ledger("AC9");
  await openAc(page, ADA);
  await pen(page, "contact");
  await page.locator(`${HEAD} input[data-ae='city']`).fill("Dublin"); await page.waitForTimeout(500);
  const offer = page.locator(`${HEAD} [data-acv21='city-offer']`);
  L.check("the offer shows in the head", await offer.count() === 1, "");
  L.check("…under the city", await offer.count() === 1 && (await offTop(page, `${HEAD} [data-acv21='city-offer']`)) > (await offTop(page, `${HEAD} input[data-ae='city']`)), "");
  await page.locator(`${HEAD} [data-qc168='cross']`).click();
  L.done(2);
});

/* ══ AC10 — "+ Add email" and "+ Add a website" land in their head fields ══ */
if (run("10")) test("AC10 · the head's doors land in their fields", async ({ page }) => {
  const L = new Ledger("AC10");
  await openAc(page, "acv22fx-nell");
  for (const k of ["email", "website"]) {
    await page.locator(A(`[data-acv2='add-${k}']`)).click(); await page.waitForTimeout(500);
    const f = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.ae ?? "");
    L.check(`+ Add ${k}: the head is open`, await page.locator(HEAD).count() === 1, "");
    L.check(`+ Add ${k}: the ${k} field has the focus`, f === k, f);
    await page.locator(`${HEAD} [data-qc168='cross']`).click(); await page.waitForTimeout(300);
  }
  L.done(4);
});

/* ══ AC11 — a section save, and the cross on a changed note, show the card's toast above the footer, no snackbar ══ */
if (run("11")) test("AC11 · the saved message is in the card", async ({ page }) => {
  const L = new Ledger("AC11");
  const was = String(dump(ADA).mswlNotes);
  await openAc(page, ADA);
  await pen(page, "wishlist");
  await page.locator(`${sec("wishlist")} textarea`).fill(`${was} ACV22-AC11`);
  await page.locator(`${sec("wishlist")} [data-qc168='tick']`).click();
  const t1 = await page.locator(TOAST).waitFor({ timeout: 20_000 }).then(() => true, () => false);
  const words1 = (await page.locator(TOAST).textContent().catch(() => "")) ?? "";
  const above = t1 ? (await offTop(page, TOAST)) < (await offTop(page, A("[data-acv2='foot']"))) : false;
  L.check("a section save: the card's toast", t1 && /Saved the wishlist for Ada/.test(words1), words1);
  L.check("…above the footer", above, "");
  L.check("…and no app snackbar", (await snack(page)) === "", await snack(page));
  if (t1) { await page.locator(`${TOAST} [data-qc1522='undo']`).click(); await page.waitForTimeout(2500); }
  L.check("its Undo restored the wishlist", String(dump(ADA).mswlNotes) === was, String(dump(ADA).mswlNotes));
  await tab(page, "notes");
  const n = page.locator(A("[data-qc158='note']")).first();
  await n.hover(); await n.locator("[data-qc168='pen']").click(); await page.waitForTimeout(300);
  await page.locator(A("[data-qc168='note-edit'] textarea")).fill("Met Ada at the Bath festival. ACV22-AC11");
  await page.locator(A("[data-qc168='note-edit'] [data-qc168='cross']")).click(); await page.waitForTimeout(400);
  const words2 = (await page.locator(TOAST).textContent().catch(() => "")) ?? "";
  L.check("the cross on a changed note: the card's toast", /Changes discarded/.test(words2), words2);
  L.check("…with Undo", await page.locator(`${TOAST} [data-qc1522='undo']`).count() === 1, "");
  L.check("…and no app snackbar", (await snack(page)) === "", await snack(page));
  L.done(7);
});

/* ══ AC12 — the cross on a changed head discards; Undo reopens it with the typed values ══ */
if (run("12")) test("AC12 · the head's cross, and Undo", async ({ page }) => {
  const L = new Ledger("AC12");
  await openAc(page, ADA);
  await pen(page, "contact");
  await page.locator(`${HEAD} input[data-ae='name']`).fill("Ada Quillon");
  await page.locator(`${HEAD} input[data-ae='city']`).fill("Leith");
  await page.locator(`${HEAD} [data-qc168='cross']`).click(); await page.waitForTimeout(400);
  L.check("the head is closed", await page.locator(HEAD).count() === 0, "");
  L.check("the card's toast says so", /discarded/.test((await page.locator(TOAST).textContent().catch(() => "")) ?? ""), "");
  await page.locator(`${TOAST} [data-qc1522='undo']`).click().catch(() => {}); await page.waitForTimeout(700);
  L.check("Undo reopened the head", await page.locator(HEAD).count() === 1, "");
  const v = [await page.locator(`${HEAD} input[data-ae='name']`).inputValue().catch(() => ""), await page.locator(`${HEAD} input[data-ae='city']`).inputValue().catch(() => "")];
  L.check("…with the typed values", v[0] === "Ada Quillon" && v[1] === "Leith", JSON.stringify(v));
  await page.locator(`${HEAD} [data-qc168='cross']`).click().catch(() => {});
  L.check("nothing was written", dump(ADA).name === "Ada Quill", String(dump(ADA).name));
  L.done(5);
});

/* ══ AC13 — ⋯ → Delete this agent reaches the existing gate (not confirmed) ══ */
if (run("13")) test("AC13 · Delete this agent reaches the existing gate", async ({ page }) => {
  const L = new Ledger("AC13");
  await openAc(page, ADA);
  await page.locator(A("[data-acv22='band-more']")).click();
  const items = await page.locator(A("[data-qc168='band-menu'] [role='menuitem']")).allTextContents();
  L.check("⋯ holds Delete this agent", items.map((x) => x.trim()).join() === "Delete this agent", JSON.stringify(items));
  await page.locator(A("[data-qc168='band-menu'] [data-act='delete']")).click().catch(() => {}); await page.waitForTimeout(400);
  const gate = page.locator(A("[data-acv22='remove'] [data-cl24='remove-confirm']"));
  L.check("the existing gate opens", await gate.count() === 1, "");
  L.check("…asking for the typed name (Ada has a query)", await gate.locator("[data-cl24='remove-typed']").count() === 1 && await page.locator(A("[data-cl24='remove-go']")).isDisabled().catch(() => false), "");
  await page.locator(A("[data-cl24='remove-keep']")).click().catch(() => {});
  L.check("not confirmed: Ada is still there", !!dump(ADA).name, "");
  L.done(4);
});

/* ══ AC14 — the add journey's finish screen (p.preview) shows no pencil and no ⋯ ══ */
if (run("14")) test("AC14 · the preview carries no pencil and no ⋯", async ({ page }) => {
  const L = new Ledger("AC14");
  page.setDefaultTimeout(30_000);
  await page.addInitScript((m) => { (window as unknown as { __qc168mut?: string[] }).__qc168mut = m ? [`ac${m}`] : []; }, own());
  await openRoute(page, "/agents", VP);
  await page.evaluate(() => { try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await page.locator("[data-cl27='add']:visible, [data-cl26='add']:visible").first().click();
  await page.locator("[data-aaj='journey']").waitFor({ timeout: 20_000 });
  await page.locator("[data-aaj='name']").fill(`Acv22 Preview ${Date.now().toString(36).slice(-4)}`);
  await page.locator("[data-aaj='agency']").fill("Preview Literary");
  await page.locator("[data-aaj='add']").click();
  await page.locator("[data-aaj='fit'] [data-cl262='profile']").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const c = document.querySelector("[data-aaj='fit'] .cl262-card")!; return { face: !!c.querySelector("[data-acv2='band']"), pens: c.querySelectorAll("[data-qc168='pen']").length, more: c.querySelectorAll("[data-qc168='band-more']").length }; });
  L.check("population: the preview face", r.face, "");
  L.check("no pencil", r.pens === 0, String(r.pens));
  L.check("no ⋯", r.more === 0, String(r.more));
  L.done(3);
});

/* ══ AC15 — v2.2.1: the delete confirm says what the menu says, for 0, 1 and 3 queries; no "Remove", no "their"; the
   gate still waits for the typed name (never confirmed) ══ */
if (run("15")) test("AC15 · the delete confirm's words", async ({ page }) => {
  const L = new Ledger("AC15");
  const norm = (t: string) => t.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
  const cases = [
    { id: NELL, n: 0, words: "Delete Nell Post? This can't be undone.", keep: "Keep Nell" },
    { id: ADA, n: 1, words: "Delete Ada Quill? Your query to Ada goes too, and every step in it. Type Ada Quill to confirm.", keep: "Keep Ada" },
    { id: VERA, n: 3, words: "Delete Vera Lark? Your 3 queries to Vera go too, and every step in them. Type Vera Lark to confirm.", keep: "Keep Vera" },
  ];
  for (const c of cases) {
    await openAc(page, c.id);
    await page.locator(A("[data-acv22='band-more']")).click();
    await page.locator(A("[data-qc168='band-menu'] [data-act='delete']")).click().catch(() => {}); await page.waitForTimeout(400);
    const gate = page.locator(A("[data-acv22='remove'] [data-cl24='remove-confirm']"));
    const r = await gate.evaluate((g) => ({
      p: (g.querySelector("p")?.textContent ?? ""), keep: (g.querySelector("[data-cl24='remove-keep']")?.textContent ?? ""), go: (g.querySelector("[data-cl24='remove-go']")?.textContent ?? ""),
      all: `${g.textContent ?? ""} ${[...g.querySelectorAll("[aria-label], [placeholder]"), g].map((e) => `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("placeholder") ?? ""}`).join(" ")}`,
      typed: !!g.querySelector("[data-cl24='remove-typed']"), disabled: !!(g.querySelector("[data-cl24='remove-go']") as HTMLButtonElement | null)?.disabled,
    })).catch(() => null);
    L.check(`${c.n} queries: the gate opens`, !!r, "");
    L.check(`${c.n} queries: its words`, !!r && norm(r.p) === c.words, r ? norm(r.p) : "");
    L.check(`${c.n} queries: "${c.keep}" and "Delete"`, !!r && norm(r.keep) === c.keep && norm(r.go) === "Delete", r ? `${norm(r.keep)} | ${norm(r.go)}` : "");
    L.check(`${c.n} queries: no "Remove", no "their"`, !!r && !/remove|\btheir\b/i.test(r.all), r ? norm(r.all) : "");
    if (c.n) L.check(`${c.n} queries: Delete waits for the typed name`, !!r && r.typed && r.disabled, r ? `typed ${r.typed} disabled ${r.disabled}` : "");
    await page.locator(A("[data-cl24='remove-keep']")).click().catch(() => {});
    L.check(`${c.n} queries: not confirmed (the agent is still there)`, !!dump(c.id).name, "");
  }
  L.done(17);
});

/* ══ AC16 — v2.2.1: with More open, its two labels share a line and its two fields share the line beneath; the first reads
   "Wishlist page" ══ */
if (run("16")) test("AC16 · More contact details lines up", async ({ page }) => {
  const L = new Ledger("AC16");
  await openAc(page, WREN);
  await pen(page, "contact");
  if (!(await page.locator(`${HEAD} [data-acv22='head-more']`).count())) await page.locator(`${HEAD} [data-acv22='more']`).click().catch(() => {});
  await page.waitForTimeout(400);
  await mutate(page);
  const M = `${HEAD} [data-acv22='head-more']`;
  L.check("population: More is open", await page.locator(M).count() === 1, "");
  const tops = { l1: await offTop(page, `${M} [data-f='mswl'] > .aap-l`).catch(() => -1), l2: await offTop(page, `${M} [data-f='social'] > .aap-l`).catch(() => -2),
    f1: await offTop(page, `${M} input[data-ae='mswl']`).catch(() => -1), f2: await offTop(page, `${M} input[data-aap='social']`).catch(() => -2) };
  L.check("the two labels share an offsetTop", tops.l1 >= 0 && tops.l1 === tops.l2, `${tops.l1} / ${tops.l2}`);
  L.check("the two fields share an offsetTop", tops.f1 >= 0 && tops.f1 === tops.f2, `${tops.f1} / ${tops.f2}`);
  L.check("the fields sit beneath their labels", tops.f1 > tops.l1, `${tops.l1} → ${tops.f1}`);
  const lab = ((await page.locator(`${M} [data-f='mswl'] > .aap-l`).textContent().catch(() => "")) ?? "").trim();
  L.check("the label reads \"Wishlist page\"", lab === "Wishlist page", lab);
  await page.locator(`${HEAD} [data-qc168='cross']`).click().catch(() => {});
  L.done(5);
});

/* ══ F2 — v2.2.1 frames (Chromium): the delete confirm for 0, 1 and 3 queries; More open ══ */
if (run("F2")) test("ACV22-F2 · the confirm and More, framed", async ({ page }) => {
  const clip = () => page.evaluate(() => { const r = document.querySelector<HTMLElement>("[data-cl262='panel']")!.getBoundingClientRect(); return { x: Math.max(0, r.left - 24), y: Math.max(0, r.top - 16), width: Math.min(window.innerWidth - Math.max(0, r.left - 24), r.width + 48), height: Math.min(window.innerHeight - Math.max(0, r.top - 16), r.height + 32) }; });
  for (const [id, n] of [[NELL, 0], [ADA, 1], [VERA, 3]] as const) {
    await openAc(page, id);
    await page.locator(A("[data-acv22='band-more']")).click();
    await page.locator(A("[data-qc168='band-menu'] [data-act='delete']")).click(); await page.waitForTimeout(600);
    await page.locator(A("[data-acv22='remove']")).scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${DIR}/frames/chromium-1512-delete-confirm-${n}.png`, clip: await clip() });
    await page.locator(A("[data-cl24='remove-keep']")).click();
  }
  await openAc(page, WREN);
  await pen(page, "contact");
  if (!(await page.locator(`${HEAD} [data-acv22='head-more']`).count())) await page.locator(`${HEAD} [data-acv22='more']`).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/frames/chromium-1512-head-more-open.png`, clip: await clip() });
  await page.locator(`${HEAD} [data-qc168='cross']`).click();
});

/* ══ F — frames ══ */
async function frames(page: Page, eng: string, dom: boolean) {
  const press = async (sel: string) => { const l = page.locator(sel).first(); if (dom) await l.evaluate((e) => (e as HTMLElement).click()); else await l.click(); await page.waitForTimeout(450); };
  const clip = () => page.evaluate(() => { const r = document.querySelector<HTMLElement>("[data-cl262='panel']")!.getBoundingClientRect(); return { x: Math.max(0, r.left - 24), y: Math.max(0, r.top - 16), width: Math.min(window.innerWidth - Math.max(0, r.left - 24), r.width + 48), height: Math.min(window.innerHeight - Math.max(0, r.top - 16), r.height + 32) }; });
  const shot = async (n: string) => { await page.waitForTimeout(450); await page.screenshot({ path: `${DIR}/frames/${eng}-1512-${n}.png`, clip: await clip() }); };
  await shot("reading");
  if (!dom) { await page.locator(A("[data-cl262='sec'][data-k='genres']")).hover(); await shot("hover-section"); await page.mouse.move(2, 2); }
  await press(A("[data-cl262='pen'][data-k='wishlist']")); await shot("section-open");
  await page.locator(`${sec("wishlist")} textarea`).fill("Thrillers with a moral knot at the centre, and a long road. (draft)");
  await press(A("[data-cl262='pen'][data-k='genres']")); await shot("section-asks");
  await press(`${sec("wishlist")} [data-qc168='discard']`);
  await press(A("[data-acv21='open'] [data-qc168='cross']"));
  await press(A("[data-cl262='pen'][data-k='contact']")); await shot("head-open");
  await page.locator(`${HEAD} input[data-ae='city']`).fill("Dublin"); await shot("head-city-offer");
  await press(`${HEAD} [data-acv22='more']`); await shot("head-more");
  await press(`${HEAD} [data-qc168='cross']`); await shot("toast-discarded");
  await press(A("[data-acv22='band-more']")); await shot("band-menu");
  await press(A("[data-qc168='band-menu'] [data-act='delete']")); await shot("remove-gate");
  await press(A("[data-cl24='remove-keep']"));
}
if (run("F")) test("ACV22-F · frames, Chromium and WebKit", async ({ page, baseURL }) => {
  test.setTimeout(900_000);
  await openAc(page, ADA);
  await frames(page, "chromium", false);
  const b = await webkit.launch();
  try {
    const ctx = await b.newContext({ baseURL: baseURL ?? process.env.SA_E2E_BASE_URL, viewport: VP });
    /* ⚠️ desktop WebKit cannot click the harness's Sign in, and a launched context has no action timeout (pc3 PC3-W) */
    ctx.setDefaultTimeout(45_000);
    const p = await ctx.newPage();
    const pw = process.env.SA_E2E_PASSWORD ?? (/^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/m.exec(readFileSync(".env.local", "utf8"))?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
    await p.goto("/#/signin");
    await p.locator("#au-email").fill(process.env.SA_E2E_EMAIL ?? "harness@scriptally.test");
    await p.locator("#au-pw").fill(pw);
    await p.locator("#au-pw").press("Enter");
    await p.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "attached", timeout: 60_000 });
    await p.goto("/agents"); await p.waitForTimeout(2500);
    await p.evaluate((id) => (document.querySelector<HTMLElement>(`.aglist [data-cl26='row'][data-id='${id}'] [data-cl26='name']`))?.click(), ADA);
    await p.locator(AC).first().waitFor({ timeout: 30_000 }); await p.waitForTimeout(800);
    await frames(p, "webkit", true);
  } finally { await b.close(); }
});
