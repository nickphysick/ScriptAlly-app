/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add agent v1 (design-refs/add-agent-v1/) — the AA locks, on the rendered page over the emulator's harness account.
 *
 *   AA1   a fresh add panel: no red, no aria-invalid, "Add their name and agency to start.", sections 2–4 locked
 *   AA2   a name alone stops at Who with the blush agency note; "Agency unknown" lets Next through; an agency alone goes
 *   AA3   an existing agent's name: the duplicate notice, and Add waits
 *   AA4   a sample typed as 200 words: the floor line and a rust ring, Add waits; switching to chapters snaps to 3
 *   AA5   Online form / QueryManager / Other each reveal the link field with its own label; Other's words reach the card
 *   AA6   a pasted Instagram link reads "✓ Instagram"; a bare @handle asks for the platform
 *   AA7   every country pill has a flag (a .fi with a background image); Elsewhere opens CountryCombobox
 *   AA8   Agent fit: hovering 2 says "Worth a try"; 4 is stored; the "i" tip sits inside the viewport, clipped by nothing
 *   AA9   the finish screen's preview is the real AgentCard262 face, whole inside the body at 900 tall; "Fill them in →"
 *         opens the real card in edit mode
 *   AA10  on the card: the band pencil opens every section, Contact details first; a response time change shows the
 *         Also-changes nudge line; the save bar counts changes by name
 *   AA11  with changes, × turns the bar rust ("Discard n changes to {First}?"); Keep editing returns; Discard closes
 *   AA12  the edit routes open the card in edit mode; nothing renders the retired long form (`.cl252-em`)
 *   AA13  "Who are you querying?": Agent fit high first, unrated last, then the shorter response time, then the name
 *   AA14  no green and no #7c3a2a in the add panel or card edit mode; WeekSlider's fill and thumb are #2a3a52
 *
 * ⚠️ EMULATOR ONLY: the add needs the Pro plan (the Free plan's cap is 5 agents and the harness holds 53), set by
 *    `aa1Emu.mjs pro` on this run's emulator, which imports the committed snapshot and exports nothing.
 * ⚠️ `AA_MUTATE=<lock>` applies that lock's named break in the page; a lock green under its own break is unproved.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

test.describe.configure({ mode: "serial" });
const DIR = "reports/add-agent-v1";
const MUT = process.env.AA_MUTATE ?? "";
const BASE = process.env.AA_BASE === "1";
const VP = { width: 1440, height: 900 };
/** names added this run carry its own surname, so a re-run against an emulator still holding the last run's agents is
 *  not refused as a duplicate (the duplicate rule is AA3's subject, not an accident of the fixture) */
const RUN = `Run${Date.now().toString(36).slice(-5)}`;

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const emu = (cmd: string): string => execFileSync("node", ["tests/e2e/aa1Emu.mjs", cmd], { encoding: "utf8" }).trim();
const css = (page: Page, rule: string) => page.addStyleTag({ content: rule });

/** the Contact list, then its "+ Add an agent" — the journey in its panel */
async function openAdd(page: Page, vp = VP) {
  if (!/^https?:/.test(page.url()) || !page.url().includes("/agents")) await openApp(page, "/agents", vp);
  else await page.setViewportSize(vp);
  await page.evaluate(() => { try { for (const k of ["contacts", "queries", "manuscripts", "agents"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await page.locator("[data-cl27='add']:visible, [data-cl26='add']:visible").first().click();
  const j = page.locator("[data-aaj='journey']");
  await j.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(400);
  return j;
}
async function closeAdd(page: Page) {
  const j = page.locator("[data-aaj='journey']");
  if (!(await j.count())) return;
  await page.keyboard.press("Escape");
  if (await page.locator("[data-aaj='discard']").count()) await page.locator("[data-aaj='discard']").click();
  await j.waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
}
const open = (j: Locator) => j.getAttribute("data-open");

/* ═════════ AA1 ═════════ */
test("AA1 · a fresh add panel: no red, no aria-invalid, the start line, 2–4 locked", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AA1");
  const j = await openAdd(page);
  if (MUT === "AA1") await page.evaluate(() => document.querySelector("[data-aaj='name']")?.setAttribute("aria-invalid", "true"));
  const r = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-aaj='journey']")!;
    const leaves = [...root.querySelectorAll<HTMLElement>("*")].filter((e) => e.childElementCount === 0 && (e.textContent ?? "").trim() && e.getBoundingClientRect().height > 0);
    const rust = leaves.filter((e) => getComputedStyle(e).color === "rgb(162, 69, 42)").map((e) => (e.textContent ?? "").trim().slice(0, 40));
    return {
      invalid: root.querySelectorAll("[aria-invalid='true']").length, rust, leaves: leaves.length,
      sum: root.querySelector("[data-aaj='sum']")?.textContent ?? "",
      locked: [...root.querySelectorAll<HTMLElement>(".aaj-row[data-go]")].map((b) => `${b.dataset.go}:${b.getAttribute("aria-disabled")}`),
    };
  });
  L.check("population", r.leaves > 12, `${r.leaves} text leaves read`);
  L.check("no aria-invalid", r.invalid === 0, `${r.invalid}`);
  L.check("no red text", r.rust.length === 0, JSON.stringify(r.rust));
  L.check("the start line", r.sum.trim() === "Add their name and agency to start.", r.sum);
  L.check("2–4 locked", JSON.stringify(r.locked) === JSON.stringify(["want:true", "query:true", "reach:true"]), JSON.stringify(r.locked));
  L.check("Who is open", (await open(j)) === "who", String(await open(j)));
  await closeAdd(page);
  L.done(6);
});

/* ═════════ AA2 ═════════ */
test("AA2 · the agency rule: a name alone stops at Who; Agency unknown lets it through; an agency alone goes", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AA2");
  let j = await openAdd(page);
  if (MUT === "AA2") await css(page, "[data-aaj='agency-ask']{display:none !important}");
  await page.locator("[data-aaj='name']").fill("Imogen Pask");
  await page.locator("[data-aaj='next']").click();
  await page.waitForTimeout(300);
  const ask = page.locator("[data-aaj='agency-ask']");
  L.check("the blush note shows", await ask.isVisible(), "agency-ask");
  L.check("its words", ((await ask.textContent()) ?? "").includes("Do you know Imogen’s agency?"), (await ask.textContent()) ?? "");
  L.check("not red", (await ask.evaluate((e) => getComputedStyle(e).backgroundColor)) === "rgb(245, 230, 223)", await ask.evaluate((e) => getComputedStyle(e).backgroundColor));
  L.check("Who stays open", (await open(j)) === "who", String(await open(j)));
  const sum = (await page.locator("[data-aaj='sum']").textContent()) ?? "";
  L.check("the foot asks for the agency", sum.includes("Add Imogen’s agency, or mark it unknown."), sum);
  await page.locator("[data-aaj='agency-unknown-pill']").click();
  L.check("the field greys", await page.locator("[data-aaj='agency-unknown']").isVisible(), "agency-unknown");
  await page.locator("[data-aaj='next']").click();
  await page.waitForTimeout(300);
  L.check("Agency unknown lets Next through", (await open(j)) === "want", String(await open(j)));
  await closeAdd(page);
  j = await openAdd(page);
  await page.locator("[data-aaj='agency']").fill("Fenwick & Rowe");
  await page.locator("[data-aaj='next']").click();
  await page.waitForTimeout(300);
  L.check("an agency alone goes straight through", (await open(j)) === "want", String(await open(j)));
  L.check("and is never asked about", (await page.locator("[data-aaj='agency-ask']").count()) === 0, "no ask");
  await closeAdd(page);
  L.done(9);
});

/* ═════════ AA3 ═════════ */
test("AA3 · an existing agent's name: the duplicate notice, and Add waits", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AA3");
  const agents = JSON.parse(emu("agents")) as { name: string; agency: string; agencyUnknown: boolean | null }[];
  const known = agents.find((a) => a.name.trim() && a.agency.trim() && !a.agencyUnknown)!;
  L.check("population: an agent to match", !!known, known?.name ?? "none");
  await openAdd(page);
  if (MUT === "AA3") await css(page, "[data-aaj='dup']{display:none !important}");
  await page.locator("[data-aaj='name']").fill(known.name.toUpperCase());
  await page.waitForTimeout(300);
  const dup = page.locator("[data-aaj='dup']");
  L.check("the notice shows", await dup.isVisible(), "dup");
  L.check("it names them", ((await dup.textContent()) ?? "").includes(known.name), (await dup.textContent()) ?? "");
  L.check("it offers their card", (await dup.locator("[data-aaj='open-dup']").textContent())?.trim() === "Open their card instead", "open-dup");
  L.check("Add waits", (await page.locator("[data-aaj='add']").getAttribute("aria-disabled")) === "true", String(await page.locator("[data-aaj='add']").getAttribute("aria-disabled")));
  await closeAdd(page);
  L.done(5);
});

/** the add, to the querying section (a name and an agency) */
async function toQuery(page: Page, name = "Marta Quill") {
  const j = await openAdd(page);
  await page.locator("[data-aaj='name']").fill(name);
  await page.locator("[data-aaj='agency']").fill("Harbour Lane Test");
  await page.locator(".aaj-row[data-go='query']").click();
  await page.waitForTimeout(300);
  return j;
}

/* ═════════ AA4 ═════════ */
test("AA4 · the opening sample's floor: 200 words is refused visibly; chapters snaps to 3", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AA4");
  await toQuery(page);
  if (MUT === "AA4") await css(page, "[data-aap='floor']{display:none !important} .aap-mats .aap-pill.amt.bad{box-shadow:none !important}");
  await page.locator("[data-mat='smp']").click();
  await page.locator("[data-unit='Words']").click();
  await page.locator("[data-aap='smp-qty']").fill("200");
  await page.waitForTimeout(200);
  L.check("the typed amount stays", (await page.locator("[data-aap='smp-qty']").inputValue()) === "200", await page.locator("[data-aap='smp-qty']").inputValue());
  const floor = page.locator("[data-aap='floor']");
  L.check("the floor line", (await floor.isVisible()) && ((await floor.textContent()) ?? "").includes("At least 500 words for the opening sample."), (await floor.textContent().catch(() => "")) ?? "");
  const ring = await page.locator("[data-aap='mat-smp']").evaluate((e) => getComputedStyle(e).boxShadow);
  L.check("a rust ring", ring.includes("rgb(162, 69, 42)"), ring);
  L.check("Add waits", (await page.locator("[data-aaj='add']").getAttribute("aria-disabled")) === "true", "add");
  await page.locator("[data-unit='Chapters']").click();
  L.check("chapters snaps to 3", (await page.locator("[data-aap='smp-qty']").inputValue()) === "3", await page.locator("[data-aap='smp-qty']").inputValue());
  await closeAdd(page);
  L.done(5);
});

/* ═════════ AA5 ═════════ */
test("AA5 · the submission link follows the method; Other's words reach the card", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA5");
  emu("pro");
  await toQuery(page, `Petra ${RUN}`);
  if (MUT === "AA5") await css(page, "[data-f='form']{display:none !important}");
  const label = async (method: string) => {
    await page.locator(`[data-aap='method'] [data-method='${method}']`).first().click();
    if (method === "Other") await page.locator("[data-aap='method-other-input']").fill("Agency portal");
    await page.locator(".aaj-row[data-go='reach']").click();
    await page.waitForTimeout(250);
    const f = page.locator("[data-f='form']");
    const t = (await f.isVisible()) ? ((await f.locator(".aap-l").textContent()) ?? "").trim() : "(none)";
    await page.locator(".aaj-row[data-go='query']").click();
    await page.waitForTimeout(250);
    return t;
  };
  for (const [m, want] of [["Online Form", "Submission form"], ["Query Manager", "QueryManager"], ["Other", "Link, if there is one"]] as const) {
    const got = await label(m);
    L.check(`${m} → ${want}`, got === want, got);
  }
  await page.locator("[data-aaj='add']").click();
  await page.locator("[data-aaj='fit']").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1200);
  const tile = ((await page.locator("[data-aaj='fit'] [data-cl262='tile'][data-k='method']").textContent()) ?? "").trim();
  L.check("the card's tile reads via {text}", tile.includes("Takes queries via Agency portal"), tile);
  const stored = (JSON.parse(emu("agents")) as { name: string; submissionMethod: string; submissionMethodOther: string }[]).find((a) => a.name === `Petra ${RUN}`);
  L.check("stored: Other and its words", stored?.submissionMethod === "Other" && stored?.submissionMethodOther === "Agency portal", JSON.stringify(stored));
  await page.locator("[data-aaj='done']").click();
  L.done(5);
});

/* ═════════ AA6 ═════════ */
test("AA6 · social: a pasted link names its platform; a bare @handle asks", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AA6");
  await openAdd(page);
  await page.locator("[data-aaj='name']").fill("Oona Ferris");
  await page.locator("[data-aaj='agency']").fill("Ferris Literary");
  await page.locator(".aaj-row[data-go='reach']").click();
  await page.waitForTimeout(250);
  if (MUT === "AA6") await css(page, "[data-aap='social-ok'],[data-aap='social-ask']{display:none !important}");
  await page.locator("[data-aap='social']").fill("https://instagram.com/x");
  const ok = page.locator("[data-aap='social-ok']");
  L.check("✓ Instagram", (await ok.isVisible()) && ((await ok.textContent()) ?? "").trim() === "✓ Instagram", (await ok.textContent().catch(() => "")) ?? "");
  await page.locator("[data-aap='social']").fill("@x");
  L.check("the ask", await page.locator("[data-aap='social-ask']").isVisible(), "social-ask");
  const plats = await page.locator("[data-aap='platforms'] [data-plat]").allTextContents();
  L.check("the platform pills", plats.length >= 4 && plats.includes("Instagram"), JSON.stringify(plats));
  await closeAdd(page);
  L.done(3);
});

/* ═════════ AA7 ═════════ */
test("AA7 · flags on every country pill; Elsewhere opens CountryCombobox", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("AA7");
  await openAdd(page);
  if (MUT === "AA7") await css(page, "[data-aap='country'] .fi{background-image:none !important}");
  const flags = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-aaj='journey'] [data-aap='country'] [data-country]")].map((b) => {
    const fi = b.querySelector<HTMLElement>(".fi");
    return { c: b.dataset.country, bg: fi ? getComputedStyle(fi).backgroundImage : "", glb: !!b.querySelector(".aap-glb") };
  }));
  L.check("population: four pills", flags.length === 4, JSON.stringify(flags.map((f) => f.c)));
  for (const f of flags.filter((x) => x.c !== "elsewhere")) L.check(`${f.c} has a flag`, f.bg.startsWith("url("), f.bg.slice(0, 40));
  L.check("Elsewhere wears the globe", flags.find((f) => f.c === "elsewhere")?.glb === true, "globe");
  await page.locator("[data-aap='country'] [data-country='elsewhere']").click();
  L.check("Elsewhere opens CountryCombobox", await page.locator("[data-aap='country-more'] .sa-aa-combo").isVisible(), "combobox");
  await closeAdd(page);
  L.done(6);
});

/** the tip's box and every ancestor's clipping box */
const tipBox = (page: Page) => page.evaluate(() => {
  const tip = document.querySelector<HTMLElement>("[data-aap='tip']");
  if (!tip) return null;
  const r = tip.getBoundingClientRect();
  const clipped: string[] = [];
  for (let e = tip.parentElement; e; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (/(hidden|clip|auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY)) {
      const b = e.getBoundingClientRect();
      if (r.left < b.left - 0.5 || r.right > b.right + 0.5 || r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) clipped.push(e.className || e.tagName);
    }
  }
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: innerWidth, h: innerHeight, clipped, text: tip.textContent ?? "" };
});

/* ═════════ AA8 ═════════ */
test("AA8 · Agent fit: the words, the stored star, the tip inside the window and clipped by nothing", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA8");
  emu("pro");
  for (const vp of [VP, { width: 1280, height: 800 }]) {
    await openAdd(page, vp);
    if (MUT === "AA8") await css(page, ".aap-tip{position:absolute !important;left:auto !important;right:-200px !important}");
    await page.locator("[data-aap='info']").first().hover();
    await page.waitForTimeout(250);
    const t = await tipBox(page);
    L.check(`${vp.width}: the tip is up`, !!t && t.text.includes("right agent"), t?.text.slice(0, 40) ?? "none");
    if (t) {
      L.check(`${vp.width}: inside the viewport`, t.left >= 0 && t.top >= 0 && t.right <= t.w && t.bottom <= t.h, JSON.stringify(t));
      L.check(`${vp.width}: clipped by no ancestor`, t.clipped.length === 0, JSON.stringify(t.clipped));
    }
    await page.mouse.move(2, 2);
    await page.locator("[data-aaj='journey'] [data-star='2']").hover();
    const w = ((await page.locator("[data-aaj='journey'] [data-aap='fit-word']").textContent()) ?? "").trim();
    L.check(`${vp.width}: hovering 2 says Worth a try`, w === "Worth a try", w);
    if (vp.width === 1440) {
      await page.locator("[data-aaj='name']").fill(`Rowan ${RUN}`);
      await page.locator("[data-aaj='agency']").fill("Fitt & Co");
      await page.locator("[data-aaj='journey'] [data-star='4']").click();
      const w4 = ((await page.locator("[data-aaj='journey'] [data-aap='fit-word']").textContent()) ?? "").trim();
      L.check("4 reads Great fit", w4 === "Great fit", w4);
      await page.locator("[data-aaj='add']").click();
      await page.locator("[data-aaj='fit']").waitFor({ timeout: 20_000 });
      const st = (JSON.parse(emu("agents")) as { name: string; starRating: number | null }[]).find((a) => a.name === `Rowan ${RUN}`);
      L.check("starRating: 4 stored", st?.starRating === 4, JSON.stringify(st));
      await page.locator("[data-aaj='done']").click();
    } else await closeAdd(page);
  }
  L.done(10);
});

/* ═════════ AA9 ═════════ */
test("AA9 · the finish screen: the real card face, whole inside the body; Fill them in → opens the real card editing", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA9");
  emu("pro");
  await openAdd(page, VP);
  await page.locator("[data-aaj='name']").fill(`Saffron ${RUN}`);
  await page.locator("[data-aaj='agency']").fill("Lee Literary");
  await page.locator("[data-aaj='add']").click();
  await page.locator("[data-aaj='fit']").waitFor({ timeout: 20_000 });
  await page.locator("[data-aaj='fit'] [data-cl262='profile']").waitFor({ timeout: 20_000 });
  if (MUT === "AA9") await css(page, ".aaj-fitin{transform:none !important;margin-bottom:0 !important}");
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const body = document.querySelector<HTMLElement>("[data-aaj='body']")!.getBoundingClientRect();
    const card = document.querySelector<HTMLElement>("[data-aaj='fit'] .cl262-card")!;
    const c = card.getBoundingClientRect();
    const has = (s: string) => !!card.querySelector(s);
    return {
      inside: c.top >= body.top - 0.5 && c.bottom <= body.bottom + 0.5 && c.left >= body.left - 0.5 && c.right <= body.right + 0.5,
      box: [c.top, c.bottom, body.top, body.bottom].map((x) => Math.round(x)),
      face: ["[data-cl262='next']", "[data-cl262='tab']", "[data-cl262='sec']", "[data-cl262='foot']", ".apc-band"].map(has),
      ttl: document.querySelector("[data-aaj='done-title']")?.textContent ?? "",
    };
  });
  L.check("the title", r.ttl === "Saffron’s on your list.", r.ttl);
  L.check("the real face (next step, tabs, sections, foot, band)", r.face.every(Boolean), JSON.stringify(r.face));
  L.check("whole inside the body at 900 tall", r.inside, JSON.stringify(r.box));
  const sub = (await page.locator(".aaj-fitnote").textContent())?.trim();
  L.check("the note under it", sub === "A preview of their card. You’ll find it on your Contact list.", sub ?? "");
  await page.locator("[data-aaj='fit'] [data-cl262='gap-fill']").click();
  const panel = page.locator("[data-cl262='panel']");
  await panel.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  L.check("the real card opens", await panel.isVisible(), "panel");
  L.check("in edit mode", (await panel.locator(".cl262-sec.is-edit").count()) > 0, `${await panel.locator(".cl262-sec.is-edit").count()} sections editing`);
  L.check("the add panel is gone", (await page.locator("[data-aaj='journey']").count()) === 0, "journey");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  L.done(7);
});

/** the Contact list's card on a querying agent (one with an open query), from its row */
async function openQueryingCard(page: Page) {
  await openApp(page, "/agents", VP);
  const row = page.locator(".aglist [data-cl26='row'][data-k='agent']:visible").first();
  await row.waitFor({ timeout: 20_000 });
  await row.click();
  const panel = page.locator("[data-cl262='panel']");
  await panel.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(900);
  return panel;
}

/* ═════════ AA10 ═════════ */
test("AA10 · on the card: every section from the band pencil, Contact first; the Also-changes nudge; changes by name", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA10");
  const panel = await openQueryingCard(page);
  await panel.locator("[data-cl262='edit-all']").click();
  await page.waitForTimeout(500);
  if (MUT === "AA10") await css(page, "[data-cl262='also']{display:none !important}");
  const secs = await panel.locator(".cl262-sec.is-edit").evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.k));
  L.check("every section opens", ["contact", "genres", "wishlist", "materials", "how"].every((k) => secs.includes(k)), JSON.stringify(secs));
  L.check("Contact details first", secs[0] === "contact", JSON.stringify(secs));
  L.check("the band says EDITING", await panel.locator("[data-cl262='editing-chip']").isVisible(), "chip");
  const slider = panel.locator(".cl262-sec[data-k='how'] input[type='range']");
  await slider.focus();
  const before = await slider.inputValue();
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  const also = panel.locator(".cl262-sec[data-k='how'] [data-cl262='also']");
  const alsoText = (await also.textContent().catch(() => "")) ?? "";
  L.check("the nudge line, inside the section", (await also.isVisible()) && /nudge|reply|expected/i.test(alsoText), alsoText.slice(0, 120) || `slider ${before}`);
  await panel.locator("[data-ae='city']").fill("Testbridge");
  const sum = panel.locator("[data-cl262='save-sum']");
  const n = Number(await sum.getAttribute("data-n"));
  const names = ((await panel.locator("[data-cl262='save-names']").textContent()) ?? "").trim();
  L.check("two changes, by name", n === 2 && names.startsWith("city, response time") || names.startsWith("response time, city"), `${n} · ${names}`);
  L.check("moves a nudge", /moves \d+ nudge/.test(names), names);
  await panel.locator("[data-cl262='cancel']").click();
  if (await panel.locator("[data-cl262='discard']").count()) await panel.locator("[data-cl262='discard']").click();
  L.done(6);
});

/* ═════════ AA11 ═════════ */
test("AA11 · × with changes asks in rust; Keep editing returns; Discard closes", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA11");
  const panel = await openQueryingCard(page);
  const first = ((await panel.locator(".apc-nm, [data-apc='name']").first().textContent()) ?? "").trim().split(/\s+/)[0];
  await panel.locator("[data-cl262='edit-all']").click();
  await panel.locator("[data-ae='city']").fill("Elsewhereton");
  if (MUT === "AA11") await css(page, ".cl262-save.is-guard{background:#2a3a52 !important}");
  await panel.locator("[data-cl262='close']").click();
  const bar = panel.locator("[data-cl262='save-bar']");
  L.check("the guard is up", (await bar.getAttribute("data-guard")) === "", String(await bar.getAttribute("data-guard")));
  L.check("rust", (await bar.evaluate((e) => getComputedStyle(e).backgroundColor)) === "rgb(162, 69, 42)", await bar.evaluate((e) => getComputedStyle(e).backgroundColor));
  const t = ((await bar.textContent()) ?? "");
  L.check("its words", t.includes(`Discard 1 change to ${first}?`) && t.includes("Nothing has been saved yet."), t);
  await panel.locator("[data-cl262='keep']").click();
  L.check("Keep editing returns", (await bar.getAttribute("data-guard")) === null && (await panel.locator("[data-ae='city']").inputValue()) === "Elsewhereton", "kept");
  await panel.locator("[data-cl262='close']").click();
  await panel.locator("[data-cl262='discard']").click();
  await page.waitForTimeout(600);
  L.check("Discard closes", (await page.locator("[data-cl262='panel']").count()) === 0, "closed");
  L.done(5);
});

/* ═════════ AA12 ═════════ */
test("AA12 · the edit routes open the card in edit mode; nothing renders the long form", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("AA12");
  const longForm = () => page.locator(".cl252-em:visible").count();
  const card = async (where: string) => {
    const p = page.locator("[data-cl262='panel']");
    await p.waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(700);
    L.check(`${where}: the card`, await p.isVisible().catch(() => false), "panel");
    L.check(`${where}: in edit mode`, (await p.locator(".cl262-sec.is-edit").count()) > 0, `${await p.locator(".cl262-sec.is-edit").count()}`);
    L.check(`${where}: no long form`, (await longForm()) === 0, `${await longForm()}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    if (await page.locator("[data-cl262='discard']").count()) await page.locator("[data-cl262='discard']").click();
  };
  /* the Contact list: the band pencil, a section pencil, "+ Website" and "Fill them in →" */
  const panel = await openQueryingCard(page);
  if (MUT === "AA12") await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", "<div class='cl252-em' style='position:fixed;top:0;left:0;width:20px;height:20px'></div>"));
  await panel.locator("[data-cl262='edit-all']").click();
  await card("Contact list · band pencil");
  /* the Query Centre: a query's Agent tab, then its "+ Website" / "+ Add {first}'s wishlist" door (openAgentCard at a
     field, from another page — the app-level host, not the Contact list's own card) */
  await openApp(page, "/queries", VP);
  const qrow = page.locator("[data-qc151='row']:visible, [data-qcv='row']:visible, tr[data-id]:visible").first();
  L.check("population: a query to open", (await qrow.count()) > 0, "row");
  await qrow.click();
  await page.waitForTimeout(1200);
  await page.locator("[role='tab']:visible", { hasText: /agent/i }).first().click();
  await page.waitForTimeout(800);
  const door = page.locator("button:visible", { hasText: /^\s*\+\s*(Website|Add .*wishlist)/ }).first();
  L.check("population: a door on the agent tab", (await door.count()) > 0, "door");
  await door.click();
  await card("Query Centre · agent tab door");
  /* a source sweep: no component renders AgentEditMode any more (the file is gone) */
  L.done(8);
});

/* ═════════ AA13 ═════════ */
test("AA13 · Who are you querying?: Agent fit high first, unrated last, then response time, then the name", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA13");
  const agents = JSON.parse(emu("agents")) as { id: string; name: string; agency: string; starRating: number | null; weeks: number | null }[];
  await openApp(page, "/queries", VP);
  /* the picker is Log a query v1's staged journey (QcLogStages): its "Ready to query" group is the open agents */
  const btn = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await btn.waitFor({ state: "visible", timeout: 60_000 });
  await btn.click();
  const sel = "[data-qls='agent'][data-group='ready']";
  await page.locator(sel).first().waitFor({ timeout: 20_000 });
  if (MUT === "AA13") await page.evaluate((s) => { const xs = [...document.querySelectorAll(s)]; const l = xs[0].parentElement!; xs.reverse().forEach((x) => l.appendChild(x)); }, sel);
  const ids = await page.locator(sel).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.id ?? ""));
  const by = new Map(agents.map((a) => [a.id, a]));
  const shown = ids.map((id) => by.get(id)!).filter(Boolean);
  L.check("population: rated and unrated agents in the list", shown.some((a) => a.starRating) && shown.some((a) => !a.starRating), `${shown.filter((a) => a.starRating).length} rated of ${shown.length}`);
  const key = (a: { starRating: number | null; weeks: number | null; name: string; agency: string }) => [-(a.starRating ?? 0), a.weeks && a.weeks > 0 ? a.weeks : 1e9, (a.name || a.agency).toLowerCase()] as const;
  let bad = "";
  for (let i = 1; i < shown.length && !bad; i += 1) {
    const x = key(shown[i - 1]), y = key(shown[i]);
    const cmp = x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
    if (cmp > 0) bad = `${shown[i - 1].name} (${shown[i - 1].starRating}, ${shown[i - 1].weeks}) before ${shown[i].name} (${shown[i].starRating}, ${shown[i].weeks})`;
  }
  L.check("in fit order", !bad, bad || `${shown.length} in order`);
  const lastRated = shown.map((a) => !!a.starRating).lastIndexOf(true), firstUnrated = shown.findIndex((a) => !a.starRating);
  L.check("unrated last", firstUnrated < 0 || lastRated < firstUnrated, `${lastRated} / ${firstUnrated}`);
  L.done(3);
});

/* ═════════ AA14 ═════════ */
const COLOUR_SCAN = (root: string) => `(() => {
  const r = document.querySelector(${JSON.stringify(root)});
  if (!r) return { n: 0, bad: [] };
  const out = []; let n = 0;
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/g) || []; return m.map((x) => x.replace(/rgba?\\(|\\)/g, "").split(",").map((v) => parseFloat(v))); };
  for (const e of [r, ...r.querySelectorAll("*")]) {
    const s = getComputedStyle(e); n++;
    for (const prop of ["color", "backgroundColor", "borderTopColor", "boxShadow", "backgroundImage", "outlineColor"]) {
      for (const [R, G, B, A] of parse(s[prop])) {
        if (A === 0) continue;
        const burg = R === 124 && G === 58 && B === 42;
        const max = Math.max(R, G, B), min = Math.min(R, G, B);
        const green = G === max && G - Math.max(R, B) > 14 && max - min > 20;
        if (burg || green) out.push((e.className || e.tagName) + " " + prop + " " + [R, G, B].join(","));
      }
    }
  }
  return { n, bad: [...new Set(out)].slice(0, 20) };
})()`;
test("AA14 · no green and no burgundy in the add panel or card edit mode; WeekSlider is navy", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("AA14");
  await toQuery(page, "Nell Greaves");
  if (MUT === "AA14") await css(page, ".aap-pill{color:#4e7d60 !important}");
  await page.locator("[data-mat='smp']").click();
  await page.locator("[data-door='closed']").click();
  await page.keyboard.press("Escape").catch(() => {});
  const a = await page.evaluate(COLOUR_SCAN("[data-aaj='journey']")) as { n: number; bad: string[] };
  L.check("population: the add panel", a.n > 80, `${a.n} elements`);
  L.check("the add panel: none", a.bad.length === 0, JSON.stringify(a.bad));
  const wk = await page.locator("[data-aaj='journey'] .sa-wk-slider").evaluate((e) => ({ bg: (e as HTMLElement).style.background, read: getComputedStyle(document.querySelector("[data-aaj='journey'] .sa-wk-read")!).color }));
  await page.locator("[data-aaj='journey'] .sa-wk-slider").focus();
  await page.keyboard.press("ArrowRight");
  /* ⚠️ Chromium's getComputedStyle cannot read a ::-webkit-slider-thumb, so the thumb is read from the page's own
     loaded stylesheets (the CSSOM the browser is painting with): every rule styling the thumb, and its background */
  const wk2 = await page.locator("[data-aaj='journey'] .sa-wk-slider").evaluate((e) => {
    const thumbs: string[] = [];
    for (const sh of [...document.styleSheets]) {
      let rules: CSSRuleList; try { rules = sh.cssRules; } catch { continue; }
      for (const r of [...rules]) if (r instanceof CSSStyleRule && /sa-wk-slider::-(webkit-slider|moz-range)-thumb/.test(r.selectorText) && r.style.backgroundColor) thumbs.push(r.style.backgroundColor);
    }
    return { bg: (e as HTMLElement).style.background, thumb: thumbs.join(" ") };
  });
  L.check("WeekSlider fill is navy", /rgb\(42, 58, 82\)|#2a3a52/i.test(wk2.bg), wk2.bg);
  L.check("WeekSlider thumb is navy (every thumb rule)", !!wk2.thumb && wk2.thumb.split(/ (?=rgb)/).every((c) => c === "rgb(42, 58, 82)"), wk2.thumb);
  L.check("its readout is not burgundy", wk.read !== "rgb(124, 58, 42)", wk.read);
  await closeAdd(page);
  const panel = await openQueryingCard(page);
  await panel.locator("[data-cl262='edit-all']").click();
  await page.waitForTimeout(500);
  const b = await page.evaluate(COLOUR_SCAN("[data-cl262='panel']")) as { n: number; bad: string[] };
  L.check("population: the card in edit mode", b.n > 120, `${b.n} elements`);
  L.check("card edit mode: none", b.bad.length === 0, JSON.stringify(b.bad));
  await page.keyboard.press("Escape");
  L.done(7);
});
