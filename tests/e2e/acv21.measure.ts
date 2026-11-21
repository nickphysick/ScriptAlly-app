/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.1 (design-refs/agent-card-v2-1/) — THE AC21 LOCKS, on the rendered page (the Contact list's own card).
 * Mutations: `AC21_MUTATE=<name>[,<name>…]`, each a break in the page after it loads, named for the lock that must notice it.
 *
 *   AC21-1  the reading card: Profile's order; the email in the head (no "Copy email" pill), its quiet 28px copy button; the
 *           head's one flag, from the stored country (UK, Irish, US fixtures; none for no country)
 *           mutations: order (the list before the wishlist) · pill (the Copy email pill put back) · flagcity (every flag GB)
 *   AC21-2  editing by section: no band pencil, no "Edit these details"; an open section has no tint, no Close, no save bar
 *           and its heading holds still; How's controls in the boxes' order, the boxes showing the draft; the head showing
 *           Contact details' draft; the city offer; the opening sample's encoding; a tick saves its section only; each
 *           section's stored agent; the cross and its Undo; the rust bar's Save all and Discard; the pencils at rest, on
 *           hover and on focus; a value opens only its own section; Tab reaches every pencil, cross and tick; Based in as two
 *           lines (the country control, then the city) in the 580 and the 540 card
 *           mutations: bandpen · isedit · headerbar · oldorder · flagcity · label (expectation side) · wholedraft · hoveronly ·
 *           georow (Based in back on the pre-ruling wrapping row) · oneline (Based in all on one row)
 */
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openCard, SIZES } from "./cl262Lib";
import { applyPatch, cardPatch, draftOf, encodeMats, type CardDraft } from "../../src/lib/cardDraft";
import { MAT_OPS } from "../../src/lib/matOps";
import type { Agent } from "../../src/types";
import { BREATHE, BUMP, LIGHT, PRESS } from "../../src/components/queries/centre/qcMotion160";
import { STAGE_COLOURS } from "../../src/lib/stageColours";

export const DIR = "reports/agent-card-v2-1";
const MUT = process.env.AC21_MUTATE ?? "";
const MUTS = new Set(MUT.split(",").map((x) => x.trim()).filter(Boolean));
type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const AC = "[data-cl262='panel'] [data-acv2='card']";
const SEED = ["tests/e2e/seedAcv21.mjs"];
/* every seed call has a timeout: an emulator write that never lands must not hold the slot */
const seed = () => execFileSync("node", SEED, { stdio: "inherit", timeout: 60_000 });
const clean = () => execFileSync("node", [...SEED, "--clean"], { stdio: "inherit", timeout: 60_000 });
const dump = (id: string): Agent => { const out = execFileSync("node", [...SEED, "--dump", id], { timeout: 60_000 }).toString(); return (JSON.parse(out.slice(out.indexOf("{\"agent\""))) as { agent: Agent }).agent; };
const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

async function openAc(page: Page, id: string, vp: { width: number; height: number } = SIZES[0]) {
  await openCard(page, { ...vp }, { id });
  await page.locator(AC).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(300);
}
/** the visible card's own selector root, for page.evaluate */
const CARD_JS = `[...document.querySelectorAll("[data-cl262='panel'] [data-acv2='card']")].find((e) => e.offsetHeight > 0)`;
const openSecs = (page: Page) => page.evaluate((js) => { const c = eval(js) as HTMLElement | undefined; return [...(c?.querySelectorAll<HTMLElement>("[data-acv21='open']") ?? [])].map((e) => e.dataset.k ?? ""); }, CARD_JS);
async function pen(page: Page, k: string) {
  if (await page.locator(`${AC} [data-acv21='open'][data-k='${k}']`).count()) return;
  const sec = k === "contact" ? page.locator(`${AC} [data-acv2='head']`) : page.locator(`${AC} [data-cl262='sec'][data-k='${k}']`);
  await sec.first().hover();
  await page.locator(`${AC} [data-cl262='pen'][data-k='${k}']`).first().click();
  await page.waitForTimeout(350);
}
/** a control's box once the card has stopped scrolling (an opening's reveal is a smooth scroll) */
async function stableBox(page: Page, sel: string) {
  /* in view in the card's own scroller first: a section opened below can scroll this one's heading under the tabs */
  await page.locator(sel).evaluate((e) => { const sc = e.closest<HTMLElement>("[data-apc='scroll']"); if (!sc) return; const r = e.getBoundingClientRect(), b = sc.getBoundingClientRect(); if (r.top < b.top + 8 || r.bottom > b.bottom - 8) sc.scrollTop += r.top - b.top - 60; });
  let last = await page.locator(sel).boundingBox();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(100);
    const b = await page.locator(sel).boundingBox();
    if (b && last && Math.abs(b.y - last.y) < 0.5 && Math.abs(b.x - last.x) < 0.5) return b;
    last = b;
  }
  return last;
}
const tick = async (page: Page, k: string) => { await page.locator(`${AC} [data-acv21='tick'][data-k='${k}']`).click(); await page.waitForTimeout(1600); };
const cross = async (page: Page, k: string) => { await page.locator(`${AC} [data-acv21='cross'][data-k='${k}']`).click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); };
const toastUndo = async (page: Page) => { await page.locator(".sa-toast-undo:visible").last().click({ timeout: 8000 }); await page.waitForTimeout(1800); };
const toastText = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".sa-toast, [role='status']")].filter((e) => e.offsetHeight > 0).map((e) => (e.textContent ?? "").trim()).join(" | "));

test.describe.configure({ mode: "default" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { clean(); });

/* ══ AC21-1 · the reading card ══════════════════════════════════════════════════════════════════════════════════ */
test("AC21-1 · Profile's order, the contact line, the flag", async ({ page, context }) => {
  test.setTimeout(90_000 * 3);
  const L = new Ledger("AC21-1");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const vp of SIZES) {
    const w = vp.width;
    await openAc(page, "acv21fx-full", vp);
    if (MUTS.has("order")) await page.evaluate((js) => { const c = eval(js) as HTMLElement; const pro = c.querySelector("[data-acv2='profile']")!; pro.insertBefore(pro.querySelector("[data-acv2='asks']")!, pro.querySelector("[data-acv2='wishlist']")); }, CARD_JS);
    if (MUTS.has("pill")) await page.evaluate((js) => { const c = eval(js) as HTMLElement; const b = document.createElement("button"); b.className = "nx-btn"; b.textContent = "Copy email"; c.querySelector("[data-acv2='profile']")!.prepend(b); c.querySelector<HTMLElement>("[data-acv21='copy']")!.style.width = "120px"; }, CARD_JS);
    const r = await page.evaluate((js) => {
      const c = eval(js) as HTMLElement;
      const pro = c.querySelector("[data-acv2='profile']")!;
      const order = [...pro.children].map((e) => (e as HTMLElement).dataset.acv2 ?? "").filter(Boolean);
      const em = c.querySelector<HTMLElement>("[data-acv21='email']");
      const copy = c.querySelector<HTMLElement>("[data-acv21='copy']");
      const cs = copy ? getComputedStyle(copy) : null;
      return {
        order, email: em?.textContent ?? "", inHead: !!em?.closest("[data-acv2='head']"),
        pill: [...c.querySelectorAll<HTMLElement>("button, a, span")].filter((e) => /copy email/i.test(e.textContent ?? "") && e.offsetHeight > 0).length,
        copyW: copy?.getBoundingClientRect().width ?? 0, copyH: copy?.getBoundingClientRect().height ?? 0, copyCol: cs?.color ?? "", copyBg: cs?.backgroundColor ?? "",
        site: c.querySelector<HTMLAnchorElement>("[data-acv21='web']")?.getAttribute("target") ?? "",
      };
    }, CARD_JS);
    const want = ["facts-sec", "wishlist", "genres", "asks", "profile-foot"];
    const got = r.order.filter((x) => want.includes(x));
    L.check(`${w} · Profile: how they work, wishlist, genres, what they ask for, then Added`, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(r.order));
    L.check(`${w} · no contact row in Profile`, !r.order.includes("contact"), JSON.stringify(r.order));
    L.check(`${w} · the email's text is the stored address, inside the head`, r.email === "acv21fx-full@pryce.example" && r.inHead, `${r.email} · inHead ${r.inHead}`);
    L.check(`${w} · nothing reads "Copy email"`, r.pill === 0, String(r.pill));
    L.check(`${w} · the copy button is 28px ±1`, Math.abs(r.copyW - 28) <= 1 && Math.abs(r.copyH - 28) <= 1, `${r.copyW}×${r.copyH}`);
    L.check(`${w} · the copy glyph is #9a948b at rest, no fill`, r.copyCol === "rgb(154, 148, 139)" && /rgba\(0, 0, 0, 0\)|transparent/.test(r.copyBg), `${r.copyCol} · ${r.copyBg}`);
    L.check(`${w} · the website opens in a new tab`, r.site === "_blank", r.site);
  }
  /* the copy button copies the address and says so */
  await page.locator(`${AC} [data-acv21='copy']`).click();
  await page.waitForTimeout(500);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  L.check("copy · the clipboard holds the address", clip === "acv21fx-full@pryce.example", clip);
  L.check("copy · the snackbar reads “Email address copied”", (await toastText(page)).includes("Email address copied"), await toastText(page));
  /* the flag: one, from the stored country, for a UK, an Irish and a US agent; none with no country */
  for (const [id, iso] of [["acv21fx-full", "GB"], ["acv21fx-ie", "IE"], ["acv21fx-us", "US"], ["acv21fx-none", ""]] as const) {
    await openAc(page, id);
    if (MUTS.has("flagcity")) await page.evaluate((js) => { for (const f of (eval(js) as HTMLElement).querySelectorAll<HTMLElement>("[data-acv21='flag']")) { f.dataset.country = "GB"; f.className = "ag-flag fi fi-gb"; } }, CARD_JS);
    const f = await page.evaluate((js) => { const c = eval(js) as HTMLElement; const fl = [...c.querySelectorAll<HTMLElement>("[data-acv2='head'] [data-acv21='flag']")]; return { n: fl.length, c: fl[0]?.dataset.country ?? "", cls: fl[0]?.className ?? "", w: fl[0]?.getBoundingClientRect().width ?? 0, h: fl[0]?.getBoundingClientRect().height ?? 0, r: fl[0] ? getComputedStyle(fl[0]).borderTopLeftRadius : "" }; }, CARD_JS);
    if (iso) {
      L.check(`flag · ${id}: one flag, ${iso}`, f.n === 1 && f.c === iso && f.cls.includes(`fi-${iso.toLowerCase()}`), JSON.stringify(f));
      L.check(`flag · ${id}: 18 × 13.5, a 2px radius`, Math.abs(f.w - 18) <= 0.5 && Math.abs(f.h - 13.5) <= 0.5 && f.r === "2px", JSON.stringify(f));
    } else L.check(`flag · ${id}: no country, no flag`, f.n === 0, JSON.stringify(f));
  }
  L.done(23);
});

/* ══ AC21-2 · editing by section ════════════════════════════════════════════════════════════════════════════════ */
test("AC21-2a · no band pencil; an open section looks like itself and holds still", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-2a");
  await openAc(page, "acv21fx-full");
  if (MUTS.has("bandpen")) await page.evaluate((js) => { const c = eval(js) as HTMLElement; const b = document.createElement("button"); b.dataset.cl262 = "edit-all"; b.className = "qc152-x"; b.textContent = "✎"; c.querySelector("[data-acv2='band']")!.append(b); }, CARD_JS);
  if (MUTS.has("isedit")) await page.addStyleTag({ content: ".acv2 .ag-sec.live { background: #f7f4ef !important; box-shadow: inset 0 0 0 1.5px #2a3a52; }" });
  if (MUTS.has("headerbar")) await page.addStyleTag({ content: ".acv2 .ag-sec.live > h4 { margin-top: 44px !important; }" });
  const band = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { pen: c.querySelectorAll("[data-acv2='band'] [data-cl262='edit-all'], [data-acv2='band'] [data-cl262='pen']").length, details: [...c.querySelectorAll("*")].filter((e) => /^Edit these details$/.test((e.textContent ?? "").trim())).length }; }, CARD_JS);
  L.check("the band holds no pencil", band.pen === 0, String(band.pen));
  L.check("no “Edit these details”", band.details === 0, String(band.details));
  for (const k of ["wishlist", "genres", "materials", "how"]) {
    const sel = `${AC} [data-cl262='sec'][data-k='${k}']`;
    /* each section brought to the top of the scroller first, so opening it needs no reveal scroll (a reveal is allowed
       "by only what the section needs", and is not this check's subject) */
    await page.locator(sel).first().evaluate((e) => { const sc = e.closest<HTMLElement>("[data-apc='scroll']")!; sc.scrollTop += e.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12; });
    await page.waitForTimeout(150);
    /* layout coordinates in the card's flow (offsets from the scroller's content top): the card straightens from its lean
       when a section opens, so a bounding rect moves with the rotation; and a section that grows past the view is revealed
       by a scroll "by only what it needs", which is allowed and is read separately below */
    const LY = `(e) => { const y = (n) => { let v = 0; for (let x = n; x; x = x.offsetParent) v += x.offsetTop; return v; }; const sc = e.closest("[data-apc='scroll']"); return (n) => y(n) - y(sc); }`;
    const before = await page.locator(sel).first().evaluate((e, ly) => { const at = (eval(ly) as (e: Element) => (n: HTMLElement) => number)(e); const h = (e.querySelector("h4") ?? e) as HTMLElement; return { top: at(e as HTMLElement), h: at(h) }; }, LY);
    await pen(page, k);
    const after = await page.locator(sel).first().evaluate((e, ly) => {
      const at = (eval(ly) as (e: Element) => (n: HTMLElement) => number)(e);
      const h = e.querySelector("h4") as HTMLElement; const cs = getComputedStyle(e);
      /* the declared outline width (Chrome snaps a 1.5px outline to whole device pixels at DPR 1) */
      const decl = [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules]; } catch { return []; } }).map((r) => r as CSSStyleRule).find((r) => r.selectorText === ".acv2 .ag-sec.live")?.style.outlineWidth ?? "";
      return { top: at(e as HTMLElement), h: at(h), bg: cs.backgroundColor, sh: cs.boxShadow, ol: cs.outlineStyle, olw: cs.outlineWidth, decl, olo: cs.outlineOffset, col: cs.outlineColor };
    }, LY);
    const r = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { close: c.querySelectorAll("[data-cl262='sec-close'], .cl262-done").length, isEdit: c.querySelectorAll(".is-edit").length, bar: c.querySelectorAll("[data-cl262='save-bar']").length }; }, CARD_JS);
    L.check(`${k} · no tinted box, a 1.5px navy outline 9px out`, after.bg === "rgba(0, 0, 0, 0)" && after.sh === "none" && after.ol === "solid" && after.decl === "1.5px" && ["1px", "1.5px"].includes(after.olw) && after.olo === "9px" && after.col === "rgb(42, 58, 82)", JSON.stringify(after));
    const seen = await page.locator(sel).first().evaluate((e) => { const sc = e.closest<HTMLElement>("[data-apc='scroll']")!.getBoundingClientRect(); const r = (e.querySelector("h4") ?? e).getBoundingClientRect(); return r.top >= sc.top - 1 && r.bottom <= sc.bottom + 1; });
    L.check(`${k} · its heading is in view after any reveal`, seen, "");
    L.check(`${k} · no Close, no is-edit box, no save bar`, r.close === 0 && r.isEdit === 0 && r.bar === 0, JSON.stringify(r));
    /* the heading and the top edge, against the top of the section when reading (a section heading-less in reading — the
       fact boxes — is measured by its top edge) */
    L.check(`${k} · the top edge holds still in the card's flow (±2px)`, Math.abs(after.top - before.top) <= 2, `${before.top.toFixed(1)} → ${after.top.toFixed(1)}`);
    if (k !== "how") L.check(`${k} · the heading holds still in the card's flow (±2px)`, Math.abs(after.h - before.h) <= 2, `${before.h.toFixed(1)} → ${after.h.toFixed(1)}`);
    await cross(page, k);
  }
  await pen(page, "wishlist");
  L.check("the footer stays in view while a section is open (measured)", await page.locator(`${AC} [data-acv2='foot']`).isVisible(), "");
  await cross(page, "wishlist");
  L.done(22);
});

test("AC21-2b · How: the controls follow the boxes, and the boxes show the draft", async ({ page }) => {
  test.setTimeout(90_000);
  const L = new Ledger("AC21-2b");
  await openAc(page, "acv21fx-full");
  await pen(page, "how");
  if (MUTS.has("oldorder")) await page.evaluate((js) => { const f = (eval(js) as HTMLElement).querySelector("[data-cl262='how-form']")!; f.prepend(f.querySelector("[data-f='door']")!); }, CARD_JS);
  const order = await page.evaluate((js) => [...(eval(js) as HTMLElement).querySelectorAll<HTMLElement>("[data-cl262='how-form'] > [data-f]")].map((e) => e.dataset.f), CARD_JS);
  L.check("the order: Response time, If they don’t reply, How they take queries, Open to queries?", JSON.stringify(order) === JSON.stringify(["weeks", "nrn", "method", "door"]), JSON.stringify(order));
  const boxes = await page.evaluate((js) => (eval(js) as HTMLElement).querySelectorAll("[data-acv21='open'][data-k='how'] [data-qc158='box']").length, CARD_JS);
  L.check("the three boxes stay while How is open", boxes === 3, String(boxes));
  /* the slider: one step, and the box's words in the same frame (read before the next frame) */
  const same = await page.evaluate((js) => {
    const c = eval(js) as HTMLElement;
    const box = () => c.querySelector("[data-acv21='open'][data-k='how'] [data-qc158='box'][data-k='reply'] [data-qc158='value']")?.textContent ?? "";
    const r = c.querySelector<HTMLInputElement>("[data-acv21='open'][data-k='how'] [data-aap='weeks'] input[type='range']")!;
    const was = box();
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(r, String(Number(r.value) + 2));
    r.dispatchEvent(new Event("input", { bubbles: true }));
    r.dispatchEvent(new Event("change", { bubbles: true }));
    return { was, now: box() };
  }, CARD_JS);
  L.check("changing the slider changes “Replies in” in the same frame", same.was !== same.now && /About 8 weeks/.test(same.now), JSON.stringify(same));
  await cross(page, "how");
  L.done(3);
});

test("AC21-2c · Contact details: the head shows the draft; the city offer", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-2c");
  await openAc(page, "acv21fx-full");
  if (MUTS.has("flagcity")) await page.evaluate(() => {
    /* the mutation: the flag set from the city */
    document.addEventListener("input", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset?.ae !== "city") return;
      const m: Record<string, string> = { dublin: "IE", york: "GB", "new york": "US" };
      const iso = m[t.value.trim().toLowerCase()];
      if (iso) for (const f of document.querySelectorAll<HTMLElement>("[data-acv21='flag']")) { f.dataset.country = iso; }
    }, true);
  });
  await pen(page, "contact");
  L.check("the name's pencil opens Contact details", JSON.stringify(await openSecs(page)) === JSON.stringify(["contact"]), JSON.stringify(await openSecs(page)));
  const live = (field: string, value: string) => page.evaluate(({ js, field, value }) => {
    const c = eval(js) as HTMLElement;
    const inp = c.querySelector<HTMLInputElement>(`input[data-ae='${field}']`)!;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(inp, value);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    return { name: c.querySelector("[data-acv2='name']")?.textContent ?? "", flag: c.querySelector<HTMLElement>("[data-acv2='head'] [data-acv21='flag']")?.dataset.country ?? "" };
  }, { js: CARD_JS, field, value });
  const n = await live("name", "Fiona Q Fullcard");
  L.check("typing the name changes the head's name in the same frame", n.name === "Fiona Q Fullcard", JSON.stringify(n));
  /* choosing a country: the flag in the same frame */
  const fr = await page.evaluate(async (js) => {
    const c = eval(js) as HTMLElement;
    let frames = 0; const count = () => { frames++; }; requestAnimationFrame(count);
    c.querySelector<HTMLElement>("[data-aap='country'] [data-country='IE']")!.click();
    for (let i = 0; i < 4; i++) await Promise.resolve();
    return { flag: c.querySelector<HTMLElement>("[data-acv2='head'] [data-acv21='flag']")?.dataset.country ?? "", frames };
  }, CARD_JS);
  L.check("choosing a country changes the head's flag in the same frame", fr.flag === "IE" && fr.frames === 0, JSON.stringify(fr));
  await page.evaluate((js) => { (eval(js) as HTMLElement).querySelector<HTMLElement>("[data-aap='country'] [data-country='GB']")!.click(); }, CARD_JS);
  const c1 = await live("city", "York");
  L.check("typing a city never changes the flag", c1.flag === "GB", JSON.stringify(c1));
  const c2 = await live("city", "Dublin");
  L.check("typing “Dublin” with the UK chosen leaves the flag GB", c2.flag === "GB", JSON.stringify(c2));
  await page.waitForTimeout(400);
  const offer = page.locator(`${AC} [data-acv21='city-offer']`);
  L.check("the offer shows: “Dublin is in Ireland. Change the country?”", (await offer.count()) === 1 && /Dublin is in Ireland\. Change the country\?/.test(await offer.innerText()), await offer.innerText().catch(() => "none"));
  await page.locator(`${AC} [data-acv21='city-set']`).click();
  await page.waitForTimeout(200);
  const set = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { pill: c.querySelector("[data-aap='country'] [data-country='IE']")?.getAttribute("aria-checked"), flag: c.querySelector<HTMLElement>("[data-acv2='head'] [data-acv21='flag']")?.dataset.country, offer: c.querySelectorAll("[data-acv21='city-offer']").length }; }, CARD_JS);
  L.check("“Change to Ireland” sets the control and the head's flag", set.pill === "true" && set.flag === "IE" && set.offer === 0, JSON.stringify(set));
  /* Keep: back to the UK, the offer again, Keep the UK; it stays away for that city */
  await page.evaluate((js) => { (eval(js) as HTMLElement).querySelector<HTMLElement>("[data-aap='country'] [data-country='GB']")!.click(); }, CARD_JS);
  await page.waitForTimeout(300);
  L.check("back on the UK, the offer returns", (await offer.count()) === 1, String(await offer.count()));
  L.check("its keep reads “Keep the UK”", (await page.locator(`${AC} [data-acv21='city-keep']`).innerText().catch(() => "")) === "Keep the UK", "");
  await page.locator(`${AC} [data-acv21='city-keep']`).click();
  await page.waitForTimeout(200);
  L.check("“Keep the UK” removes the offer", (await offer.count()) === 0, String(await offer.count()));
  await live("city", "");
  await live("city", "Dublin");
  await page.waitForTimeout(300);
  L.check("…and it stays away for that city", (await offer.count()) === 0, String(await offer.count()));
  await live("city", "Lyon");
  await page.waitForTimeout(300);
  L.check("a city the table doesn't know: no offer", (await offer.count()) === 0, String(await offer.count()));
  await cross(page, "contact");
  L.check("the cross puts the head back", (await page.locator(`${AC} [data-acv2='name']`).innerText()) === "Fiona Fullcard", await page.locator(`${AC} [data-acv2='name']`).innerText());
  L.done(13);
});

/** what the same edit stores through the card's own patch, for a section's fields */
function expectedAfter(before: Agent, edit: (d: CardDraft) => CardDraft): Agent {
  const base = draftOf(before, []);
  return applyPatch(before, cardPatch(before, base, edit(base), new Date().toISOString()));
}
const pickA = (a: Agent, keys: (keyof Agent)[]) => JSON.stringify(Object.fromEntries(keys.map((k) => [k, a[k] ?? null])));

test("AC21-2d · a tick saves its section only, as the built save stores it", async ({ page }) => {
  test.setTimeout(90_000 * 4);
  const L = new Ledger("AC21-2d");
  const id = "acv21fx-edit";
  await openAc(page, id);
  /* the opening sample: tick it, choose Words, step once — the encoder's answer for the same choices */
  let before = dump(id);
  await pen(page, "materials");
  await page.locator(`${AC} [data-acv21='mtick'][data-k='smp']`).click();
  await page.locator(`${AC} [data-acv21='unit'] [data-unit='Words']`).click();
  await page.locator(`${AC} [data-acv21='step'][data-k='smp'] [data-acv21='more']`).click();
  const label = await page.locator(`${AC} [data-acv21='smp-label']`).innerText();
  await tick(page, "materials");
  let after = dump(id);
  const mats = (d: CardDraft) => ({ ...d, mats: MAT_OPS.smpMore(MAT_OPS.smpUnit(MAT_OPS.smpOn(d.mats), "Words")) });
  const want = MUTS.has("label") ? [...(before.materialsWanted ?? []), label] : expectedAfter(before, mats).materialsWanted;
  L.check("the opening sample stores the encoder's answer (Words, one step)", JSON.stringify(after.materialsWanted) === JSON.stringify(want), `${JSON.stringify(after.materialsWanted)} vs ${JSON.stringify(want)}`);
  L.check("its label reads as on the card", /^First \d[\d,]* words$/.test(label), label);
  L.check("the reading list shows it after the tick", (await page.locator(`${AC} [data-acv2='asks']`).innerText()).includes(label), "");
  /* wishlist and genres both changed: the wishlist's tick stores the wishlist only, and the genre draft stays on screen */
  before = dump(id);
  if (MUTS.has("wholedraft")) await page.evaluate(() => {
    document.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-acv21='tick'][data-k='wishlist']");
      if (t) document.querySelector<HTMLElement>("[data-acv21='tick'][data-k='genres']")?.click();
    }, true);
  });
  await pen(page, "wishlist");
  await pen(page, "genres");
  const wl = page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`);
  await wl.fill("Thrillers with a moral knot, and AC21.");
  const gi = page.locator(`${AC} [data-acv21='open'][data-k='genres'] [data-aap='genre-input']`);
  await gi.fill("Romance");
  await gi.press("Enter");
  await page.waitForTimeout(200);
  await tick(page, "wishlist");
  after = dump(id);
  L.check("the wishlist's tick stores the wishlist", after.mswlNotes === "Thrillers with a moral knot, and AC21.", String(after.mswlNotes));
  L.check("…and leaves the stored genres alone", JSON.stringify(after.genres) === JSON.stringify(before.genres), `${JSON.stringify(after.genres)} vs ${JSON.stringify(before.genres)}`);
  const g = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { open: !!c.querySelector("[data-acv21='open'][data-k='genres']"), chips: [...c.querySelectorAll<HTMLElement>("[data-acv21='open'][data-k='genres'] [data-aap='genre-chip']")].map((e) => e.dataset.g) }; }, CARD_JS);
  L.check("…and the genre draft is still on screen", g.open && g.chips.includes("Romance"), JSON.stringify(g));
  await cross(page, "genres");
  /* each section stores what the same edit stored before this pack: the card's own patch for the same draft */
  before = dump(id);
  await pen(page, "contact");
  await page.locator(`${AC} input[data-ae='email']`).fill("eda.new@pryce.example");
  await tick(page, "contact");
  after = dump(id);
  L.check("Contact details · stored as the patch stores it", pickA(after, ["email", "name", "agency", "country", "city", "website"]) === pickA(expectedAfter(before, (d) => ({ ...d, email: "eda.new@pryce.example" })), ["email", "name", "agency", "country", "city", "website"]), pickA(after, ["email"]));
  before = dump(id);
  await pen(page, "how");
  await page.locator(`${AC} [data-aap='method'] [data-method]:not([aria-checked='true']):not([data-method='Other'])`).first().click();
  const chosen = await page.locator(`${AC} [data-aap='method'] [aria-checked='true']`).first().getAttribute("data-method");
  await tick(page, "how");
  after = dump(id);
  L.check("How · stored as the patch stores it", pickA(after, ["submissionMethod", "responseTimeWeeks", "noResponseMeansNo", "submissionStatus"]) === pickA(expectedAfter(before, (d) => ({ ...d, method: chosen as CardDraft["method"] })), ["submissionMethod", "responseTimeWeeks", "noResponseMeansNo", "submissionStatus"]), `${pickA(after, ["submissionMethod"])} (${chosen})`);
  before = dump(id);
  await pen(page, "genres");
  await gi.fill("Horror");
  await gi.press("Enter");
  await tick(page, "genres");
  after = dump(id);
  L.check("Genres · stored as the patch stores it", JSON.stringify(after.genres) === JSON.stringify(expectedAfter(before, (d) => ({ ...d, genres: [...d.genres, "Horror"] })).genres), JSON.stringify(after.genres));
  L.check("the snackbar names the section", /Saved genres for Eda/.test(await toastText(page)), await toastText(page));
  /* the cross: that section's fields back, another open section's draft untouched; Undo brings the draft back */
  await pen(page, "wishlist");
  await pen(page, "genres");
  await wl.fill("Crossed out.");
  await gi.fill("Satire");
  await gi.press("Enter");
  await cross(page, "wishlist");
  const x1 = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { wishOpen: !!c.querySelector("[data-acv21='open'][data-k='wishlist']"), quote: c.querySelector("[data-cl262='wishlist']")?.textContent ?? "", chips: [...c.querySelectorAll<HTMLElement>("[data-acv21='open'][data-k='genres'] [data-aap='genre-chip']")].map((e) => e.dataset.g) }; }, CARD_JS);
  L.check("the cross closes its section with its fields as stored", !x1.wishOpen && x1.quote === "Thrillers with a moral knot, and AC21.", JSON.stringify(x1));
  L.check("…and leaves the other open section's draft alone", x1.chips.includes("Satire"), JSON.stringify(x1.chips));
  L.check("…the snackbar: “Changes to the wishlist discarded”", /Changes to the wishlist discarded/.test(await toastText(page)), await toastText(page));
  await toastUndo(page);
  const x2 = await page.evaluate((js) => (eval(js) as HTMLElement).querySelector<HTMLTextAreaElement>("[data-acv21='open'][data-k='wishlist'] textarea")?.value ?? null, CARD_JS);
  L.check("its Undo reopens the section with the changes back", x2 === "Crossed out.", String(x2));
  await cross(page, "wishlist");
  await cross(page, "genres");
  L.done(14);
});

test("AC21-2e · leaving with two sections changed: the rust bar, Save all, Discard", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-2e");
  const id = "acv21fx-edit";
  await openAc(page, id);
  const change = async (w: string, g: string) => {
    await pen(page, "wishlist");
    await pen(page, "genres");
    await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill(w);
    const gi = page.locator(`${AC} [data-acv21='open'][data-k='genres'] [data-aap='genre-input']`);
    await gi.fill(g);
    await gi.press("Enter");
    await page.waitForTimeout(150);
  };
  let before = dump(id);
  await change("Saved by Save all.", "Western");
  await page.locator(`${AC} [data-cl262='tab'][data-tab='history']`).click();
  await page.waitForTimeout(300);
  const bar = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { n: c.querySelectorAll("[data-acv21='guard']").length, names: c.querySelector("[data-acv21='guard-names']")?.textContent ?? "", tab: c.querySelector("[data-cl262='tab'][aria-selected='true']")?.getAttribute("data-tab"), foot: c.querySelectorAll("[data-acv2='foot']").length, btn: c.querySelector("[data-acv21='save-all']")?.textContent }; }, CARD_JS);
  L.check("the rust bar takes the footer's place", bar.n === 1 && bar.foot === 0, JSON.stringify(bar));
  L.check("it names both sections", /the wishlist/.test(bar.names) && /genres/.test(bar.names), bar.names);
  L.check("nothing else happened (still on Profile)", bar.tab === "profile", String(bar.tab));
  L.check("its button reads “Save all”", bar.btn === "Save all", String(bar.btn));
  await page.locator(`${AC} [data-acv21='save-all']`).click();
  await page.waitForTimeout(2200);
  let after = dump(id);
  L.check("Save all stores both", after.mswlNotes === "Saved by Save all." && (after.genres ?? []).includes("Western"), `${after.mswlNotes} · ${JSON.stringify(after.genres)}`);
  L.check("…and lands on the tab asked for", (await page.locator(`${AC} [data-cl262='tab'][aria-selected='true']`).getAttribute("data-tab")) === "history", "");
  L.check("…one snackbar for both: “Saved 2 sections for Eda”", /Saved 2 sections for Eda/.test(await toastText(page)), await toastText(page));
  await page.locator(`${AC} [data-cl262='tab'][data-tab='profile']`).click();
  await page.waitForTimeout(300);
  before = dump(id);
  await change("Thrown away.", "Fantasy");
  await page.locator(`${AC} [data-cl262='next-agent']`).click();
  await page.waitForTimeout(300);
  L.check("the arrows ask too", (await page.locator(`${AC} [data-acv21='guard']`).count()) === 1, "");
  await page.locator(`${AC} [data-cl262='discard']`).click();
  await page.waitForTimeout(1200);
  after = dump(id);
  L.check("Discard stores neither", after.mswlNotes === before.mswlNotes && JSON.stringify(after.genres) === JSON.stringify(before.genres), `${after.mswlNotes} · ${JSON.stringify(after.genres)}`);
  L.check("…and carries on (the next agent)", (await page.locator(AC).first().getAttribute("data-agent-id")) !== id, String(await page.locator(AC).first().getAttribute("data-agent-id")));
  L.done(10);
});

test("AC21-2f · the pencils, the values as doors, and Tab", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-2f");
  await openAc(page, "acv21fx-full");
  if (MUTS.has("hoveronly")) await page.addStyleTag({ content: ".acv2 .ag-sec:focus-within .cl262-pen, .acv2 .ag-head:focus-within .cl262-pen, .acv2 .cl262-pen:focus-visible { opacity: 0 !important; }" });
  for (const k of ["contact", "how", "wishlist", "genres", "materials"]) {
    const p = page.locator(`${AC} [data-cl262='pen'][data-k='${k}']`).first();
    const sec = k === "contact" ? page.locator(`${AC} [data-acv2='head']`) : page.locator(`${AC} [data-cl262='sec'][data-k='${k}']`);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(250);
    const rest = await p.evaluate((e) => getComputedStyle(e).opacity);
    await sec.first().hover();
    await page.waitForTimeout(250);
    const hov = await p.evaluate((e) => getComputedStyle(e).opacity);
    await page.mouse.move(2, 2);
    await p.focus();
    await page.waitForTimeout(250);
    const foc = await p.evaluate((e) => getComputedStyle(e).opacity);
    const size = await p.evaluate((e) => e.getBoundingClientRect().width);
    L.check(`${k} · the pencil: 0 at rest, 1 on hover, 1 on focus; 28px`, rest === "0" && hov === "1" && foc === "1" && Math.abs(size - 28) <= 1, `${rest} · ${hov} · ${foc} · ${size}`);
  }
  /* a value opens only its own section */
  const doors: [string, string][] = [["how", "[data-acv2='facts'] [data-qc158='box'][data-k='method']"], ["wishlist", "[data-cl262='wishlist']"], ["genres", "[data-cl262='genres'] [data-cl262='genre']"], ["materials", "[data-acv2='asks'] [data-acv2='ask']"]];
  for (const [k, sel] of doors) {
    await page.locator(`${AC} ${sel}`).first().click();
    await page.waitForTimeout(350);
    L.check(`clicking the ${k} value opens only ${k}`, JSON.stringify(await openSecs(page)) === JSON.stringify([k]), JSON.stringify(await openSecs(page)));
    await cross(page, k);
  }
  /* Tab reaches every pencil, and every open section's cross and tick */
  const reach = async () => {
    await page.locator(`${AC} [data-cl262='close']`).focus();
    const seen = new Set<string>();
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press("Tab");
      const k = await page.evaluate(() => { const e = document.activeElement as HTMLElement | null; return e ? `${e.dataset.cl262 ?? e.dataset.acv21 ?? ""}:${e.dataset.k ?? ""}` : ""; });
      seen.add(k);
    }
    return seen;
  };
  let seen = await reach();
  for (const k of ["contact", "how", "wishlist", "genres", "materials"]) L.check(`Tab reaches the ${k} pencil`, seen.has(`pen:${k}`), [...seen].filter((s) => s.startsWith("pen")).join(" "));
  await pen(page, "wishlist");
  await pen(page, "genres");
  seen = await reach();
  for (const k of ["wishlist", "genres"]) L.check(`Tab reaches ${k}'s cross and tick`, seen.has(`cross:${k}`) && seen.has(`tick:${k}`), [...seen].filter((s) => /cross|tick/.test(s)).join(" "));
  await cross(page, "wishlist");
  await cross(page, "genres");
  L.done(16);
});

/* ══ AC21-2g · Based in: two lines at every card width (ruling, 21 Nov) ═══════════════════════════════════════════════
   line 1 the country control (the pills, Elsewhere's search beside them); line 2 the city, full width.
   mutations: georow (the pre-ruling row: the pills and the city side by side, wrapping by width) · oneline (all of it on
   one row, never wrapping) */
test("AC21-2g · Based in: the country control, then the city beneath it, at 580 and 540", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-2g");
  const widths: number[] = [];
  for (const vp of SIZES) {
    await openAc(page, "acv21fx-full", vp);
    if (MUTS.has("georow")) await page.addStyleTag({ content: `
      .acv2 .acv21-geo { display: flex !important; flex-wrap: wrap !important; align-items: center; gap: 8px; }
      .acv2 .acv21-geo > .aap-pills { flex: none; flex-wrap: wrap !important; }
      .acv2 .acv21-geo > input[data-ae="city"] { flex: 1 1 180px; min-width: 160px; width: auto !important; }
      .acv2 .acv21-geo > .aap-cty { flex-basis: auto; }` });
    if (MUTS.has("oneline")) await page.addStyleTag({ content: `
      .acv2 .acv21-geo { display: flex !important; flex-wrap: nowrap !important; align-items: center; gap: 8px; }
      .acv2 .acv21-geo > * { flex: 0 1 auto; min-width: 0; }
      .acv2 .acv21-geo > input[data-ae="city"] { flex: 1 1 0; width: auto !important; }` });
    await pen(page, "contact");
    const geo = () => page.evaluate((js) => {
      const c = eval(js) as HTMLElement;
      const g = c.querySelector<HTMLElement>("[data-acv21='geo']")!;
      const box = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, w: b.width }; };
      const pills = box(g.querySelector("[data-aap='country']"));
      const cty = box(g.querySelector("[data-aap='country-more']"));
      const ctl = cty && pills ? { t: Math.min(pills.t, cty.t), b: Math.max(pills.b, cty.b) } : pills;
      const tops = [...g.querySelectorAll<HTMLElement>("[data-aap='country'] .aap-pill")].map((e) => Math.round(e.getBoundingClientRect().top));
      return { card: Math.round(c.getBoundingClientRect().width), geo: box(g), pills, cty, ctl, city: box(g.querySelector("input[data-ae='city']")), tops };
    }, CARD_JS);
    const read = (state: string, g: Awaited<ReturnType<typeof geo>>) => {
      const at = `${g.card}px card, ${state}`;
      L.check(`${at}: the city's top is below the country control's bottom`, !!g.ctl && !!g.city && g.city.t >= g.ctl.b - 0.5,
        g.ctl && g.city ? `control ${g.ctl.t.toFixed(1)}–${g.ctl.b.toFixed(1)} · city top ${g.city.t.toFixed(1)}` : "none");
      L.check(`${at}: the city runs the full width`, !!g.city && !!g.geo && Math.abs(g.city.w - g.geo.w) <= 1, g.city && g.geo ? `${g.city.w.toFixed(1)} of ${g.geo.w.toFixed(1)}` : "none");
      L.check(`${at}: the pills are one line`, g.tops.length >= 4 && g.tops.every((t) => Math.abs(t - g.tops[0]) <= 1), JSON.stringify(g.tops));
    };
    const g1 = await geo();
    widths.push(g1.card);
    read("a country of the three", g1);
    await page.evaluate((js) => { (eval(js) as HTMLElement).querySelector<HTMLElement>("[data-aap='country'] [data-country='elsewhere']")!.click(); }, CARD_JS);
    await page.waitForTimeout(250);
    const g2 = await geo();
    read("Elsewhere chosen", g2);
    L.check(`${g2.card}px card, Elsewhere chosen: its search sits on the pills' line, after them`,
      !!g2.cty && !!g2.pills && g2.cty.l >= g2.pills.r - 0.5 && g2.cty.t < g2.pills.b && g2.pills.t < g2.cty.b,
      g2.cty && g2.pills ? `pills ${g2.pills.t.toFixed(1)}–${g2.pills.b.toFixed(1)} r ${g2.pills.r.toFixed(1)} · search ${g2.cty.t.toFixed(1)}–${g2.cty.b.toFixed(1)} l ${g2.cty.l.toFixed(1)} w ${g2.cty.w.toFixed(1)}` : "none");
    mkdirSync("reports/agent-card-v2-1/shots", { recursive: true });
    const geoClip = async () => { const b = await page.locator(`${AC} [data-acv21='geo']`).first().boundingBox(); return b ? { x: b.x - 24, y: b.y - 40, width: b.width + 48, height: b.height + 300 } : undefined; };
    await page.screenshot({ path: `reports/agent-card-v2-1/shots/${vp.width}-20-based-in-elsewhere.png`, clip: await geoClip() }).catch(() => {});
    /* the open list: inside the card, at a usable width */
    await page.locator(`${AC} [data-aap='country-more'] .sa-cc-control`).first().click();
    await page.waitForTimeout(250);
    const m = await page.evaluate((js) => {
      const c = eval(js) as HTMLElement; const cb = c.getBoundingClientRect();
      const e = c.querySelector<HTMLElement>("[data-acv21='geo'] .sa-cc-menu"); if (!e) return null; const b = e.getBoundingClientRect();
      return { w: b.width, l: b.left - cb.left, r: cb.right - b.right };
    }, CARD_JS);
    L.check(`${g2.card}px card, Elsewhere's list: 280px wide and inside the card`, !!m && Math.abs(m.w - 280) <= 1 && m.l >= 0 && m.r >= 0, JSON.stringify(m));
    await page.screenshot({ path: `reports/agent-card-v2-1/shots/${vp.width}-21-based-in-elsewhere-list.png`, clip: await geoClip() }).catch(() => {});
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    await cross(page, "contact");
  }
  L.check("the two cards are 580 and 540 wide", JSON.stringify(widths) === JSON.stringify([580, 540]), JSON.stringify(widths));
  L.done(17);
});

/* ══ AC21-3 · the genre editor ═══════════════════════════════════════════════════════════════════════════════════
   mutation: suggap (the Suggested row flush with the field) */
test("AC21-3 · one field, the matches beneath, a Suggested row; Enter, Backspace and focus", async ({ page }) => {
  test.setTimeout(90_000);
  const L = new Ledger("AC21-3");
  await openAc(page, "acv21fx-full");
  if (MUTS.has("suggap")) await page.addStyleTag({ content: ".acv2 .ag-sug { margin-top: 0 !important; }" });
  await pen(page, "genres");
  const G = `${AC} [data-acv21='open'][data-k='genres']`;
  const geo = () => page.evaluate((sel) => {
    const root = document.querySelector(sel)!;
    const r = (q: string) => { const e = root.querySelector<HTMLElement>(q); if (!e || !e.offsetHeight) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, h: b.height }; };
    const hs = [...root.querySelectorAll<HTMLElement>("[data-aap='genre-chip'], .ag-sug .nx-btn")].map((e) => e.getBoundingClientRect().height);
    const rows = [...root.querySelectorAll<HTMLElement>("[data-aap='genre-list'] button")].map((e) => e.getBoundingClientRect().height);
    const cs = root.querySelector<HTMLElement>(".ag-gfield");
    return { field: r(".ag-gfield"), list: r("[data-aap='genre-list']"), label: r("[data-acv21='sugg-label']"), sug: r(".ag-sug"), hs, rows, radius: cs ? getComputedStyle(cs).borderRadius : "", ph: root.querySelector<HTMLInputElement>("[data-aap='genre-input']")?.placeholder ?? "" };
  }, G);
  const over = (a: { t: number; b: number } | null, b: { t: number; b: number } | null) => !!a && !!b && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  let g = await geo();
  L.check("the field: 52px tall at rest at least, a 12px radius", !!g.field && g.field.h >= 51.5 && g.radius === "12px", JSON.stringify({ f: g.field, r: g.radius }));
  L.check("its placeholder reads “Add another” once a genre is chosen", g.ph === "Add another", g.ph);
  L.check("the Suggested row's label is 14px ±2 beneath the field", !!g.field && !!g.label && Math.abs(g.label.t - g.field.b - 14) <= 2, `${g.field && g.label ? (g.label.t - g.field.b).toFixed(1) : "none"}`);
  L.check("field and suggestions don't overlap", !over(g.field, g.sug), "");
  L.check("no chip or pill under 32px", g.hs.length > 0 && g.hs.every((h) => h >= 32), JSON.stringify(g.hs));
  const input = page.locator(`${G} [data-aap='genre-input']`);
  await input.click();
  await page.keyboard.type("Hor", { delay: 40 });
  await page.waitForTimeout(250);
  g = await geo();
  L.check("typing: the matches sit 8px beneath the field, not over it", !!g.field && !!g.list && g.list.t >= g.field.b - 0.5 && Math.abs(g.list.t - g.field.b - 8) <= 2, `${g.field && g.list ? (g.list.t - g.field.b).toFixed(1) : "none"}`);
  L.check("typing: each row at least 38px", g.rows.length > 0 && g.rows.every((h) => h >= 37.5), JSON.stringify(g.rows));
  L.check("typing: the list, the field and the suggestions don't overlap", !over(g.field, g.list) && !over(g.list, g.sug) && !over(g.field, g.sug), "");
  const first = await page.locator(`${G} [data-aap='genre-list'] button`).first().getAttribute("data-addg");
  const before = await page.locator(`${G} [data-aap='genre-chip']`).count();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const chips = await page.locator(`${G} [data-aap='genre-chip']`).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.g));
  L.check("Enter adds the first match", chips.length === before + 1 && chips[chips.length - 1] === first, `${first} → ${JSON.stringify(chips)}`);
  L.check("…and leaves focus in the input", await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.aap === "genre-input"), "");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(200);
  const after = await page.locator(`${G} [data-aap='genre-chip']`).evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.g));
  L.check("Backspace in the empty input removes the last chip", after.length === before && !after.includes(first ?? "∅"), JSON.stringify(after));
  L.check("…and focus stays in the input", await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.aap === "genre-input"), "");
  await cross(page, "genres");
  L.done(12);
});

/* ══ AC21-4 · motion, with the harness's motion suppression lifted ═══════════════════════════════════════════════
   mutations: frame (the frame itself scales) · popfrom1 (the pop starts at 1) · navy (every border navy) · lightall (a
   light on a star) · leaveon (the breath left running on the cross) */
async function liftMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addStyleTag({ content: "*, *::before, *::after { animation-play-state: running !important; }" }).catch(() => {});
}
/** what is running on the card's frame, its ::before and its border layer, now */
const motionNow = (page: Page) => page.evaluate((js) => {
  const c = eval(js) as HTMLElement | undefined;
  if (!c) return null;
  const all = c.getAnimations({ subtree: true }).filter((a) => a.playState === "running" || a.playState === "paused");
  const fx = (a: Animation) => a.effect as KeyframeEffect;
  const on = (a: Animation) => fx(a).target === c && !fx(a).pseudoElement ? "frame" : fx(a).target === c && fx(a).pseudoElement === "::before" ? "before" : (fx(a).target as Element | null)?.closest?.(".qc163-rim") ? "rim" : "inside";
  const rim = c.querySelector<HTMLElement>(":scope > .qc163-rim");
  const tint = rim?.querySelector<HTMLElement>(":scope > b");
  return {
    anims: all.map((a) => ({ id: a.id, on: on(a), inf: fx(a).getTiming().iterations === Infinity, dur: Number(fx(a).getTiming().duration), peak: Math.max(...fx(a).getKeyframes().map((k) => parseFloat(String(k.scale ?? "1")) || 1)), state: a.playState })),
    scale: parseFloat(getComputedStyle(c).scale) || 1, before: parseFloat(getComputedStyle(c, "::before").scale) || 1,
    tintBg: tint ? getComputedStyle(tint).backgroundColor : "", tintOp: tint ? parseFloat(getComputedStyle(tint).opacity) : 0,
  };
}, CARD_JS);
/** sample, every frame for `ms`: the frame's scale, and every landing light seen on the border (its id, start, keyframes) */
const trace = (page: Page, ms: number) => page.evaluate(({ js, ms }) => new Promise<{ s: { t: number; s: number }[]; lights: { t0: number; end: number; turn: string; mirror: string }[] }>((res) => {
  const c = eval(js) as HTMLElement;
  const out: { t: number; s: number }[] = [];
  const lights = new Map<Animation, { t0: number; end: number; turn: string; mirror: string }>();
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now() - t0;
    out.push({ t: now, s: parseFloat(getComputedStyle(c).scale) || 1 });
    for (const a of c.getAnimations({ subtree: true })) if (a.id === "qc163-light") {
      const k = (a.effect as KeyframeEffect).getKeyframes();
      const l = lights.get(a) ?? { t0: now, end: now, turn: `${k[0].rotate} → ${k[k.length - 1].rotate}`, mirror: ((a.effect as KeyframeEffect).target as HTMLElement).style.scale };
      if (a.playState === "running") l.end = now;
      lights.set(a, l);
    }
    /* only lights that start inside the trace: the tail of one already running (a landing just before) is not this one */
    if (now < ms) requestAnimationFrame(tick); else res({ s: out, lights: [...lights.values()].filter((l) => l.t0 > 50) });
  };
  requestAnimationFrame(tick);
}), { js: CARD_JS, ms });
const breathing = (m: Awaited<ReturnType<typeof motionNow>>) => (m?.anims ?? []).filter((a) => a.on === "before" && a.inf && a.state === "running");
const FULL_CANDIDATES = ["rj-agent-1", "seed-agent-9", "rj-agent-2", "seed-cal-passed865", "seed-agent-3", "msv12-agent-4", "cv25-agent-09"];

test("AC21-4a · the breath: on the rim only, still under the pointer, resting while typing", async ({ page }) => {
  test.setTimeout(90_000);
  const L = new Ledger("AC21-4a");
  await openAc(page, "acv21fx-full");
  await liftMotion(page);
  if (MUTS.has("frame")) await page.evaluate((js) => { document.addEventListener("click", (e) => { if ((e.target as Element).closest("[data-cl262='pen']")) (eval(js) as HTMLElement).animate([{ scale: "1" }, { scale: "1.01" }, { scale: "1" }], { duration: 3200, iterations: Infinity }); }, true); }, CARD_JS);
  /* reading the card and changing tab start nothing */
  await page.waitForTimeout(1200);
  let m = await motionNow(page);
  L.check("reading: nothing runs on the frame, its rim or its border", (m?.anims ?? []).filter((a) => a.on !== "inside").length === 0, JSON.stringify(m?.anims));
  await page.locator(`${AC} [data-cl262='tab'][data-tab='history']`).click();
  await page.waitForTimeout(600);
  await page.locator(`${AC} [data-cl262='tab'][data-tab='profile']`).click();
  await page.waitForTimeout(600);
  m = await motionNow(page);
  L.check("a tab change: nothing runs on the frame, its rim or its border", (m?.anims ?? []).filter((a) => a.on !== "inside").length === 0, JSON.stringify(m?.anims));
  await pen(page, "how");
  await page.waitForTimeout(1000);
  m = await motionNow(page);
  const br = breathing(m);
  L.check("a section open 1s: exactly one never-ending animation, on the frame's ::before", br.length === 1, JSON.stringify(m?.anims));
  L.check("…and none on the frame itself", (m?.anims ?? []).filter((a) => a.on === "frame").length === 0, JSON.stringify(m?.anims.filter((a) => a.on === "frame")));
  L.check(`…its peak ${BREATHE.peak} and duration ${BREATHE.ms}ms are BREATHE's`, br[0] && Math.abs(br[0].peak - BREATHE.peak) < 0.0005 && br[0].dur === BREATHE.ms, JSON.stringify(br[0]));
  const t0 = Date.now();
  await page.locator(`${AC} [data-acv21='open'][data-k='how'] [data-nrn='yes']`).click({ timeout: 5000 });
  L.check("an ordinary click on a control in the open section lands while it runs", Date.now() - t0 < 5000 && (await page.locator(`${AC} [data-nrn='yes']`).getAttribute("aria-checked")) === "true", `${Date.now() - t0}ms`);
  /* typing rests it within 300ms; it is back within 3s of the last key */
  await pen(page, "wishlist");
  await page.waitForTimeout(1000);
  const ta = page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`);
  await ta.focus();
  await page.keyboard.type(" and so on", { delay: 30 });
  await page.waitForTimeout(300);
  L.check("typing: the breath is gone within 300ms", breathing(await motionNow(page)).length === 0, JSON.stringify((await motionNow(page))?.anims));
  let back = -1;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(100); if (breathing(await motionNow(page)).length === 1) { back = (i + 1) * 100; break; } }
  L.check("…and back within 3s of the last key", back > 0 && back <= 3000, `${back}ms`);
  await cross(page, "wishlist");
  await cross(page, "how");
  L.done(8);
});

test("AC21-4b · the press, the pop, the light, the undo", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-4b");
  await openAc(page, "acv21fx-edit");
  await liftMotion(page);
  if (MUTS.has("popfrom1")) await page.evaluate(() => {
    const look = () => { for (const a of document.getAnimations()) if (a.id === "qc160-bump" && !(a as Animation & { __m?: boolean }).__m) { (a as Animation & { __m?: boolean }).__m = true; const k = (a.effect as KeyframeEffect).getKeyframes(); k[0].scale = "1"; (a.effect as KeyframeEffect).setKeyframes(k); } requestAnimationFrame(look); };
    requestAnimationFrame(look);
  });
  if (MUTS.has("lightall")) await page.evaluate((js) => {
    document.addEventListener("click", (e) => {
      if (!(e.target as Element).closest("[data-cl262='stars'] [data-star]")) return;
      const c = eval(js) as HTMLElement;
      window.setTimeout(() => { const i = c.querySelector<HTMLElement>(":scope > .qc163-rim > i"); if (i) i.animate([{ rotate: "-40deg", opacity: 0 }, { rotate: "320deg", opacity: 0 }], { duration: 1300 }).id = "qc163-light"; }, 500);
    }, true);
  }, CARD_JS);
  /* hold the pointer down on a tick: the frame presses in to PRESS.to */
  await pen(page, "wishlist");
  await pen(page, "genres");
  await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill(`Motion ${Date.now() % 1000}.`);
  await page.waitForTimeout(400);
  const tk = await stableBox(page, `${AC} [data-acv21='tick'][data-k='wishlist']`);
  await page.mouse.move(tk!.x + tk!.width / 2, tk!.y + tk!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  const pressed = (await motionNow(page))?.scale ?? 0;
  L.check(`holding the tick: the frame at PRESS.to (${PRESS.to}) ±0.003`, Math.abs(pressed - PRESS.to) <= 0.003, String(pressed));
  const tr = trace(page, 3400);
  await page.mouse.up();
  const t = await tr;
  const closed = await page.evaluate((js) => { const c = eval(js) as HTMLElement; return { wish: !!c.querySelector("[data-acv21='open'][data-k='wishlist']"), err: c.querySelector("[data-acv21='err']")?.textContent ?? "", toast: [...document.querySelectorAll<HTMLElement>(".sa-toast")].map((e) => e.textContent).join(" | ") }; }, CARD_JS);
  L.check("the tick saved and closed the wishlist", !closed.wish, JSON.stringify(closed));
  const peak = Math.max(...t.s.map((x) => x.s));
  const iPeak = t.s.findIndex((x) => x.s === peak);
  const rise = t.s.findIndex((x) => x.s > PRESS.to + 0.002);
  const before = t.s.slice(0, Math.max(0, rise));
  L.check(`the pop peaks at BUMP.peak (${BUMP.peak}) ±0.005`, Math.abs(peak - BUMP.peak) <= 0.005, String(peak));
  L.check("…from where the press left it (held at the press until the rise, and the first frame of the rise still under 1)", rise > 0 && before.every((x) => x.s < 0.995) && t.s[rise].s < 0.999, `${before.length} frames before the rise; first rising frame ${rise > 0 ? t.s[rise].s.toFixed(4) : "none"}`);
  L.check("…and returns to 1", Math.abs(t.s[t.s.length - 1].s - 1) < 0.001 && iPeak > 0, String(t.s[t.s.length - 1].s));
  const rises = t.s.filter((x, i) => i > 0 && x.s > 1.001 && t.s[i - 1].s <= 1.001).length;
  L.check("two sections open, one ticked: it pops once", rises === 1, `${rises} rises`);
  L.check("the light runs exactly once round the agent card's border", t.lights.length === 1, JSON.stringify(t.lights));
  L.check("…clockwise", t.lights[0] && t.lights[0].turn === "-40deg → 320deg" && ["1", "1 1"].includes(t.lights[0].mirror), JSON.stringify(t.lights[0]));
  L.check(`…and is gone within its own ${LIGHT.ms}ms + 200`, t.lights[0] && t.lights[0].end - t.lights[0].t0 <= LIGHT.ms + 200, t.lights[0] ? `${(t.lights[0].end - t.lights[0].t0).toFixed(0)}ms` : "none");
  /* the breath is back within 2.5s of the light finishing (genres is still open) */
  let back = -1;
  for (let i = 0; i < 30; i++) { if (breathing(await motionNow(page)).length === 1) { back = i * 100; break; } await page.waitForTimeout(100); }
  L.check("the rim's breath is back within 2.5s of the light finishing", back >= 0 && back <= 2500, `${back}ms after the trace`);
  /* Undo of the saved section: the light the other way (a fresh save, so its snackbar is still up) */
  await pen(page, "wishlist");
  const docBefore = JSON.stringify(dump("acv21fx-edit"));
  await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill(`Undo me ${Date.now() % 1000}.`);
  await tick(page, "wishlist");
  const trU = trace(page, 2600);
  await page.locator(".sa-toast-undo:visible").last().click({ timeout: 8000 });
  const u = await trU;
  L.check("Undo of a saved section: the light runs once, the other way", u.lights.length === 1 && u.lights[0].turn === "40deg → -320deg" && u.lights[0].mirror === "-1 1", JSON.stringify(u.lights));
  L.check("…and the card sinks back (never above 1)", Math.min(...u.s.map((x) => x.s)) < 0.99 && Math.max(...u.s.map((x) => x.s)) <= 1.0005, `${Math.min(...u.s.map((x) => x.s)).toFixed(4)} … ${Math.max(...u.s.map((x) => x.s)).toFixed(4)}`);
  await page.waitForTimeout(600);
  const docUndone = JSON.stringify(dump("acv21fx-edit"));
  L.check("…and the agent is exactly as it was before the save", docUndone === docBefore, docUndone === docBefore ? "" : `${docBefore.slice(0, 160)} … vs … ${docUndone.slice(0, 160)}`);
  /* Undo of a discard: no light */
  await page.waitForTimeout(800);
  const gi = page.locator(`${AC} [data-acv21='open'][data-k='genres'] [data-aap='genre-input']`);
  await gi.fill("Gothic");
  await gi.press("Enter");
  await cross(page, "genres");
  const trD = trace(page, 1800);
  await page.locator(".sa-toast-undo:visible").last().click({ timeout: 8000 });
  L.check("Undo of a discard: no light", (await trD).lights.length === 0, JSON.stringify((await trD).lights));
  await cross(page, "genres");
  await page.waitForTimeout(600);
  /* drag off the tick: eases back with no pop */
  await pen(page, "wishlist");
  await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill(`Drag ${Date.now() % 1000}.`);
  const tk2 = await stableBox(page, `${AC} [data-acv21='tick'][data-k='wishlist']`);
  await page.mouse.move(tk2!.x + tk2!.width / 2, tk2!.y + tk2!.height / 2);
  const trG = trace(page, 1800);
  await page.mouse.down();
  await page.mouse.move(tk2!.x - 200, tk2!.y + 200, { steps: 4 });
  await page.mouse.up();
  const gx = await trG;
  L.check("dragging off the tick: eases back, no pop, no light", Math.max(...gx.s.map((x) => x.s)) <= 1.0005 && gx.lights.length === 0 && Math.abs(gx.s[gx.s.length - 1].s - 1) < 0.001, `max ${Math.max(...gx.s.map((x) => x.s)).toFixed(4)}, lights ${gx.lights.length}`);
  /* nothing changed: pressBack — no light, and the tint at 0 within 200ms */
  await cross(page, "wishlist");
  await pen(page, "wishlist");
  await page.waitForTimeout(900);
  const trN = trace(page, 1200);
  await page.locator(`${AC} [data-acv21='tick'][data-k='wishlist']`).click();
  const n = await trN;
  await page.waitForTimeout(200);
  const mN = await motionNow(page);
  L.check("a tick with nothing changed: no pop, no light, the tint at 0", Math.max(...n.s.map((x) => x.s)) <= 1.0005 && n.lights.length === 0 && (mN?.tintOp ?? 1) < 0.01, `max ${Math.max(...n.s.map((x) => x.s)).toFixed(4)} · lights ${n.lights.length} · tint ${mN?.tintOp}`);
  /* a star and Add note pop with no light */
  const star = page.locator(`${AC} [data-cl262='stars'] [data-star]`).nth(2);
  const trS = trace(page, 2600);
  await star.click();
  const st = await trS;
  L.check("a star pops with no light", Math.max(...st.s.map((x) => x.s)) > 1.01 && st.lights.length === 0, `max ${Math.max(...st.s.map((x) => x.s)).toFixed(4)} · lights ${st.lights.length}`);
  await page.locator(".sa-toast-undo:visible").last().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.locator(`${AC} [data-cl262='tab'][data-tab='notes']`).click();
  await page.waitForTimeout(400);
  await page.locator(`${AC} [data-qc158='note-input'], ${AC} .acv2-notes textarea`).first().fill("AC21 note.");
  const trA = trace(page, 2600);
  await page.locator(`${AC} [data-qc158='add-note']`).click();
  const an = await trA;
  L.check("Add note pops with no light", Math.max(...an.s.map((x) => x.s)) > 1.01 && an.lights.length === 0, `max ${Math.max(...an.s.map((x) => x.s)).toFixed(4)} · lights ${an.lights.length}`);
  L.done(18);
});

test("AC21-4c · the border's colour; the rest after the last section, by every route; reduced motion", async ({ page }) => {
  test.setTimeout(90_000 * 2);
  const L = new Ledger("AC21-4c");
  if (MUTS.has("navy")) await page.addInitScript(() => {
    new MutationObserver(() => { for (const c of document.querySelectorAll<HTMLElement>("[data-acv2='card']")) if (c.dataset.qc163Rim !== "#2a3a52") { c.dataset.qc163Rim = "#2a3a52"; c.dataset.qc163RimHi = "#c3cedb"; } }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-qc163-rim"] });
  });
  if (MUTS.has("leaveon")) await page.addInitScript(() => {
    document.addEventListener("click", (e) => {
      if (!(e.target as Element).closest?.("[data-acv21='cross']")) return;
      const c = [...document.querySelectorAll<HTMLElement>("[data-cl262='panel'] [data-acv2='card']")].find((x) => x.offsetHeight > 0);
      window.setTimeout(() => { c?.animate([{ scale: "1" }, { scale: "1.01" }, { scale: "1" }], { duration: 3200, iterations: Infinity, pseudoElement: "::before" }); }, 400);
    }, true);
  });
  /* an agent whose query is at Full requested */
  let full = "";
  for (const id of FULL_CANDIDATES) {
    await openAc(page, id).catch(() => {});
    if ((await page.locator(AC).first().getAttribute("data-tone").catch(() => "")) === "full") { full = id; break; }
  }
  L.check("population: an agent whose query is at Full requested", !!full, full);
  await liftMotion(page);
  const tintAt = async (k: string) => {
    await pen(page, k);
    await page.waitForTimeout(2000);
    const m = await motionNow(page);
    return { bg: m?.tintBg ?? "", running: (m?.anims ?? []).some((a) => a.id === "qc163-tint" && a.on === "rim" && a.state === "running") };
  };
  let r = await tintAt("how");
  L.check(`Full requested: the border breathes in v163's rim for Full (${STAGE_COLOURS.full.rim})`, r.bg === hexRgb(STAGE_COLOURS.full.rim) && r.running, JSON.stringify(r));
  await cross(page, "how");
  await openAc(page, "acv21fx-full");
  await liftMotion(page);
  r = await tintAt("how");
  L.check("no query: the border breathes in slate, rgb(94, 113, 137)", r.bg === "rgb(94, 113, 137)" && r.running, JSON.stringify(r));
  /* the last section closing, by each route: the rim at rest, the tint at 0, nothing running on the border */
  const atRest = async (route: string) => {
    await page.waitForTimeout(700);
    const m = await motionNow(page);
    const live = (m?.anims ?? []).filter((a) => (a.on === "before" || a.on === "rim") && a.state === "running");
    L.check(`${route}: after the last section closes, the rim rests, the tint at 0, nothing on the border`, live.length === 0 && (m?.tintOp ?? 1) < 0.01 && Math.abs((m?.before ?? 0) - 1) < 0.0005, JSON.stringify({ live, tint: m?.tintOp, before: m?.before }));
  };
  await cross(page, "how"); await atRest("the cross");
  await pen(page, "how"); await page.waitForTimeout(1200);
  await page.locator(`${AC} [data-acv21='tick'][data-k='how']`).click(); await atRest("a tick with nothing changed");
  await pen(page, "how"); await page.waitForTimeout(1200);
  await page.keyboard.press("Escape"); await atRest("Esc");
  await pen(page, "wishlist"); await page.waitForTimeout(1200);
  await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill("To be discarded.");
  await page.locator(`${AC} [data-cl262='tab'][data-tab='notes']`).click();
  await page.locator(`${AC} [data-cl262='discard']`).click(); await atRest("the rust bar's Discard");
  await page.locator(`${AC} [data-cl262='tab'][data-tab='profile']`).click();
  /* reduced motion: nothing runs on the card */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await pen(page, "wishlist");
  await page.waitForTimeout(1200);
  await page.locator(`${AC} [data-acv21='open'][data-k='wishlist'] textarea`).fill(`Reduced ${Date.now() % 1000}.`);
  await page.locator(`${AC} [data-acv21='tick'][data-k='wishlist']`).click();
  await page.waitForTimeout(120);
  const red = await motionNow(page);
  L.check("reduced motion: no animation on the card", (red?.anims ?? []).filter((a) => a.state === "running").length === 0, JSON.stringify(red?.anims));
  await page.locator(".sa-toast-undo:visible").last().click().catch(() => {});
  await page.waitForTimeout(1500);
  L.done(8);
});
