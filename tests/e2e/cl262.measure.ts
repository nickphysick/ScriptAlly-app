/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/) — the CL262 locks, at 1512 × 900 and 1280 × 800. Helpers:
 * cl262Lib.ts. Mutations: `CL262_MUTATE=<lock>`.
 */
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { SIZES, openCard, shotDir, Ledger, MUT, CARD, cssBreak, frameScroll } from "./cl262Lib";

test.describe.configure({ mode: "default" });

test("CL262 shots — the card", async ({ page }) => {
  test.setTimeout(240_000);
  for (const [name, stand] of [["01-card-you", "you"], ["02-card-none", "none"], ["xx-card-agent", "agent"], ["xx-card-closed", "closed"]] as const) {
    await openCard(page, SIZES[0], { stand });
    await page.screenshot({ path: `${shotDir()}/${name}-1512.png` });
  }
  await openCard(page, SIZES[0], { stand: "you" });
  await page.locator("[data-cl262='tab'][data-tab='history']").first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir()}/03-card-history-1512.png` });
  await openCard(page, SIZES[1], { stand: "you" });
  await page.screenshot({ path: `${shotDir()}/09-card-1280.png` });
});

test("CL262 shots — editing", async ({ page }) => {
  test.setTimeout(300_000);
  const pen = (k: string) => page.evaluate((key) => (document.querySelector(`[data-cl262='pen'][data-k='${key}']`) as HTMLElement | null)?.click(), k);
  await openCard(page, SIZES[0], { stand: "none" });
  await pen("genres"); await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/04-edit-genres-1512.png` });
  await openCard(page, SIZES[0], { stand: "you" });
  await pen("materials"); await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/05-edit-materials-1512.png` });
  await openCard(page, SIZES[0], { stand: "agent" });
  await pen("how"); await page.waitForTimeout(400);
  /* Add agent v1 — the response time is the app's WeekSlider: two steps from the keyboard */
  await page.locator("[data-cl262='sec'][data-k='how'] [data-aap='weeks'] input[type='range']").first().focus();
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shotDir()}/06-edit-how-also-1512.png` });
  await openCard(page, SIZES[0], { stand: "you" });
  await page.locator("[data-cl262='edit-all']").first().click(); await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/07-edit-all-1512.png` });
  await openCard(page, SIZES[0], { stand: "you" });
  await pen("wishlist"); await page.waitForTimeout(500);
  await page.keyboard.type(" and quiet ghost stories");
  await page.locator("[data-cl262='close']").first().click(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir()}/08-discard-guard-1512.png` });
});

/* ══ the locks ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

const GAPPY = "cl262fx-gappy";
/** the gappy agent as seeded: a saving lock (J11) fills its wishlist, so every reader starts from the seed */
const fresh = () => execFileSync("node", ["tests/e2e/seedCl262.mjs"], { stdio: "inherit" });
const pen = (page: Page, k: string) => page.locator(`${CARD} [data-cl262='pen'][data-k='${k}']`).first();
const sec = (page: Page, k: string) => page.locator(`${CARD} [data-cl262='sec'][data-k='${k}']`).first();
/** Add agent v1 — the response time is the shared WeekSlider (1 to 26): stepped from the keyboard, read off its readout */
const WEEKS = `${CARD} [data-aap='weeks'] input[type='range']`;
const stepWeeks = async (page: Page, key: "ArrowRight" | "ArrowLeft" | "End" | "Home", n = 1) => {
  await page.locator(WEEKS).first().focus();
  for (let i = 0; i < n; i++) await page.keyboard.press(key);
};
const weeksRead = (page: Page) => page.locator(`${CARD} [data-aap='weeks'] .sa-wk-read`).first().innerText();
const editingKeys = (page: Page) => page.$$eval(`${CARD} [data-cl262='sec'][data-editing]`, (els) => els.map((e) => (e as HTMLElement).dataset.k ?? ""));
const lean = (page: Page) => page.evaluate(() => {
  const el = document.querySelector<HTMLElement>("[data-cl262='lean']");
  if (!el) return NaN;
  const m = new DOMMatrix(getComputedStyle(el).transform === "none" ? undefined : getComputedStyle(el).transform);
  return Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI * 100) / 100;
});
const secTop = (page: Page, k: string) => page.evaluate((key) => {
  const sc = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-apc='scroll']");
  const el = sc?.querySelector<HTMLElement>(`[data-cl262='sec'][data-k='${key}']`);
  return sc && el ? el.getBoundingClientRect().top - sc.getBoundingClientRect().top : NaN;
}, k);
/** reveal a pen (it fades in on hover) and press it with the pointer */
async function pressPen(page: Page, k: string) {
  await sec(page, k).hover();
  await pen(page, k).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(450);
}
/** leave the card without its guard (a discard, or nothing to discard) */
async function closeCard(page: Page) {
  if (await page.locator(`${CARD} [data-cl262='save-bar']`).count()) {
    await page.locator(`${CARD} [data-cl262='cancel']`).click({ timeout: 4000 }).catch(() => {});
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

test.describe("CL262 locks", () => {
  test.beforeAll(() => { execFileSync("node", ["tests/e2e/seedCl262.mjs"], { stdio: "inherit" }); });
  test.afterAll(() => { execFileSync("node", ["tests/e2e/seedCl262.mjs", "--clean"], { stdio: "inherit" }); });

  for (const vp of SIZES) {
    const at = `${vp.width}`;

    test(`J1 the panel is the card · ${at}`, async ({ page }) => {
      test.setTimeout(240_000);
      const L = new Ledger(`J1-${at}`);
      for (const stand of ["you", "agent", "none", "closed"]) {
        await openCard(page, vp, { stand });
        if (MUT === "J1") await cssBreak(page, ".cl262-panel{background:#fff!important;padding:12px!important}.cl262-card .apc-band{background:#3e5170!important}");
        const r = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>("[data-cl262='panel']")!;
          const ps = getComputedStyle(p);
          const fr = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-apc='frame']");
          const band = document.querySelector<HTMLElement>("[data-cl262='panel'] .apc-band");
          const fs = fr ? getComputedStyle(fr) : null;
          return { bg: ps.backgroundColor, pad: ps.padding, frame: fs ? `${fs.borderTopColor}|${fs.boxShadow}|${fs.outlineColor}` : "", band: band ? getComputedStyle(band).backgroundColor : "" };
        });
        L.check(`${stand} · panel background`, r.bg === "rgba(0, 0, 0, 0)", r.bg);
        L.check(`${stand} · panel padding`, r.pad === "0px", r.pad);
        L.check(`${stand} · frame is #a5837b`, r.frame.includes("rgb(165, 131, 123)"), r.frame);
        L.check(`${stand} · band #5e7189`, r.band === "rgb(94, 113, 137)", r.band);
        await closeCard(page);
      }
      L.done(16);
    });

    test(`J2 the lean · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J2-${at}`);
      await openCard(page, vp, { stand: "you" });
      if (MUT === "J2") await cssBreak(page, ".cl262-lean{transform:none!important}");
      L.check("rest −1.2°", Math.abs((await lean(page)) + 1.2) < 0.05, String(await lean(page)));
      await pressPen(page, "wishlist");
      L.check("editing 0°", Math.abs(await lean(page)) < 0.05, String(await lean(page)));
      await page.locator(`${CARD} [data-cl262='cancel']`).click();
      await page.waitForTimeout(500);
      L.check("after editing −1.2°", Math.abs((await lean(page)) + 1.2) < 0.05, String(await lean(page)));
      await page.evaluate(() => { (document.querySelector("[data-cl262='panel']") as HTMLElement & { __mark?: number }).__mark = 1; });
      await page.locator(`${CARD} [data-cl262='next-agent']`).click();
      await page.waitForTimeout(120);
      const pg = await page.evaluate(() => {
        const p = document.querySelector("[data-cl262='panel']") as (HTMLElement & { __mark?: number }) | null;
        return { same: p?.__mark === 1, arrive: p?.hasAttribute("data-arrive") ?? true };
      });
      L.check("paging keeps the host", pg.same, JSON.stringify(pg));
      L.check("paging replays no arrival", !pg.arrive, JSON.stringify(pg));
      await page.waitForTimeout(500);
      L.check("paged card leans −1.2°", Math.abs((await lean(page)) + 1.2) < 0.05, String(await lean(page)));
      L.done(6);
    });

    test(`J3 type and the one colour · ${at}`, async ({ page }) => {
      test.setTimeout(240_000);
      const L = new Ledger(`J3-${at}`);
      for (const stand of ["you", "agent", "none"]) {
        await openCard(page, vp, { stand });
        if (MUT === "J3") await cssBreak(page, ".cl262-sec{background:#f6e3da!important}");
        const r = await page.evaluate(() => {
          const card = document.querySelector<HTMLElement>("[data-cl262='panel'] .cl262-card")!;
          const nm = card.querySelector<HTMLElement>("[data-apc='name']")!;
          const ns = getComputedStyle(nm);
          const tab = card.querySelector<HTMLElement>("[data-cl262='tab']");
          const skip = (el: Element) => !!el.closest(".apc-band, [data-cl262='next'], [data-cl262='tile'], [data-cl262='disc'], [data-cl262='ghost'], button, a, [data-cl262='genres'], [data-cl262='materials'], [data-cl262='links']");
          const odd: string[] = [];
          let seen = 0;
          for (const el of card.querySelectorAll<HTMLElement>("*")) {
            if (skip(el) || el.getBoundingClientRect().height === 0) continue;
            seen++;
            const bg = getComputedStyle(el).backgroundColor;
            if (bg !== "rgba(0, 0, 0, 0)" && bg !== "rgb(255, 255, 255)") odd.push(`${el.className || el.tagName}:${bg}`);
          }
          const next = card.querySelector<HTMLElement>("[data-cl262='next']");
          return { fam: ns.fontFamily, w: ns.fontWeight, size: ns.fontSize, tab: tab ? getComputedStyle(tab).fontFamily : "", odd, seen, nextBg: next ? getComputedStyle(next).backgroundColor : "", nexts: card.querySelectorAll("[data-cl262='next']").length };
        });
        L.check(`${stand} · name Source Serif`, /Source Serif/i.test(r.fam), r.fam);
        L.check(`${stand} · name 600`, r.w === "600", r.w);
        L.check(`${stand} · name 29px`, r.size === "29px", r.size);
        L.check(`${stand} · tabs Special Elite`, /Special Elite/i.test(r.tab), r.tab);
        L.check(`${stand} · one next box`, r.nexts === 1, String(r.nexts));
        L.check(`${stand} · nothing else coloured (${r.seen} read)`, r.seen > 20 && r.odd.length === 0, r.odd.slice(0, 4).join(", "));
        await closeCard(page);
      }
      L.done(18);
    });

    test(`J4 ghost lines · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J4-${at}`);
      fresh();
      await openCard(page, vp, { id: GAPPY });
      if (MUT === "J4") await cssBreak(page, ".cl262-addb{display:none!important}");
      const r = await page.evaluate(() => {
        const card = document.querySelector<HTMLElement>("[data-cl262='panel'] .cl262-card")!;
        const ghosts = [...card.querySelectorAll<HTMLElement>("[data-cl262='ghost']")].map((g) => ({ k: g.dataset.k, adds: [...g.querySelectorAll<HTMLElement>("[data-cl262='add']")].filter((b) => b.getBoundingClientRect().height > 0).length }));
        return { ghosts, old: card.querySelectorAll(".apc-add").length };
      });
      L.check("ghosts on genres, wishlist, materials", ["genres", "wishlist", "materials"].every((k) => r.ghosts.some((g) => g.k === k)), JSON.stringify(r.ghosts));
      for (const g of r.ghosts) L.check(`${g.k} · one + Add`, g.adds === 1, String(g.adds));
      L.check("no old + Add pill", r.old === 0, String(r.old));
      for (const k of ["genres", "wishlist", "materials"]) {
        const b = page.locator(`${CARD} [data-cl262='ghost'][data-k='${k}'] [data-cl262='add']`).first();
        if (await b.isVisible()) await b.click();
        await page.waitForTimeout(400);
        L.check(`${k} · + Add opens its section`, (await editingKeys(page)).includes(k), (await editingKeys(page)).join(","));
        await page.locator(`${CARD} [data-cl262='cancel']`).click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
      L.done(7);
    });

    test(`J5 one section at a time · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J5-${at}`);
      await openCard(page, vp, { stand: "you" });
      if (MUT === "J5") await cssBreak(page, "[data-cl262='pen']{pointer-events:none!important}");
      await pressPen(page, "genres").catch(() => {});
      L.check("genres pen → genres only", JSON.stringify(await editingKeys(page)) === '["genres"]', (await editingKeys(page)).join(","));
      await pressPen(page, "wishlist").catch(() => {});
      const two = (await editingKeys(page)).sort().join(",");
      L.check("second pen adds", two === "genres,wishlist", two);
      await page.locator(`${CARD} [data-cl262='cancel']`).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(300);
      await page.locator(`${CARD} [data-cl262='edit-all']`).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
      const all = (await editingKeys(page)).sort().join(",");
      L.check("band pen opens all + contact", all === "contact,genres,how,materials,wishlist", all);
      L.done(3);
    });

    test(`J6 the fields · ${at}`, async ({ page }) => {
      test.setTimeout(240_000);
      const L = new Ledger(`J6-${at}`);
      fresh();
      await openCard(page, vp, { id: GAPPY });
      if (MUT === "J6") await cssBreak(page, "[data-aap='door-closed']{display:none!important}");
      await pressPen(page, "genres");
      const g = await page.evaluate(() => {
        const s = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-cl262='sec'][data-k='genres']")!;
        /* v26.2's chips were the genres on offer: now the finder's suggestions ("+ Fantasy") beside any chosen chip */
        return { chips: s.querySelectorAll("[data-aap='genre-chip']").length, offer: s.querySelectorAll("[data-aap='genre-sugg'] [data-addg]").length };
      });
      L.check(`genres · chips to pick (${g.offer} offered, ${g.chips} chosen)`, g.offer + g.chips > 0, `${g.offer}+${g.chips}`);
      /* Add agent v1 — the genres take the journey's finder (typed to FIND a genre, or added through the new-genre
         check). v26.2's claim, restated: loose words typed and left are never a genre */
      await page.locator(`${CARD} [data-aap='genre-input']`).first().fill("zzq loose words");
      await page.locator(`${CARD} [data-cl262='sec'][data-k='genres']`).first().click({ position: { x: 4, y: 4 } }).catch(() => {});
      await page.waitForTimeout(250);
      const chips2 = await page.locator(`${CARD} [data-cl262='sec'][data-k='genres'] [data-aap='genre-chip']`).count();
      L.check("genres · typed words left unpicked are no genre", chips2 === g.chips, `${g.chips} → ${chips2}`);
      await pressPen(page, "materials");
      const smp = page.locator(`${CARD} [data-cl262='sec'][data-k='materials'] [data-aap='mats'] [data-mat='smp']`).first();
      if (await smp.count()) await smp.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
      const units = await page.$$eval(`${CARD} [data-aap='unit'] button[aria-checked='true']`, (e) => e.length);
      L.check("one sample unit chosen", units === 1, String(units));
      await pressPen(page, "how");
      await stepWeeks(page, "ArrowRight", 30);
      L.check("reply tops out at 26", /^26 weeks$/.test(await weeksRead(page)) && (await page.locator(WEEKS).first().inputValue()) === "26", await weeksRead(page));
      await stepWeeks(page, "ArrowLeft", 30);
      L.check("reply floors at 1", /^1 week$/.test(await weeksRead(page)) && (await page.locator(WEEKS).first().inputValue()) === "1", await weeksRead(page));
      await page.locator(`${CARD} [data-aap='door'] [data-door='closed']`).first().click();
      await page.waitForTimeout(300);
      L.check("door Closed reveals Reopens", await page.locator(`${CARD} [data-aap='door-closed']`).first().isVisible(), "");
      /* the reopens calendar opens on Closed: press Open on the element itself, so the calendar cannot take the click */
      await page.locator(`${CARD} [data-aap='door'] [data-door='open']`).first().evaluate((e) => (e as HTMLElement).click());
      await page.waitForTimeout(200);
      L.check("door Open hides Reopens", (await page.locator(`${CARD} [data-aap='door-closed']`).count()) === 0, "");
      L.done(7);
    });

    test(`J7 also changes · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J7-${at}`);
      await openCard(page, vp, { stand: "agent" });
      if (MUT === "J7") await cssBreak(page, ".cl262-also{display:none!important}");
      await pressPen(page, "how");
      await stepWeeks(page, "ArrowRight", 2);
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const c = document.querySelector<HTMLElement>("[data-cl262='panel'] .cl262-card")!;
        const lines = [...c.querySelectorAll<HTMLElement>("[data-cl262='also'] p")].filter((e) => e.getBoundingClientRect().height > 0).length;
        const sum = c.querySelector<HTMLElement>("[data-cl262='save-sum']");
        return { lines, moved: Number(sum?.dataset.moved ?? -1), text: sum?.textContent ?? "" };
      });
      L.check(`an Also note shows (${r.lines})`, r.lines > 0, r.text);
      /* Add agent v1 — the bar counts the NUDGES the reply note moves (the engine's own count), by name */
      L.check("the bar names the nudges the note moves", r.moved >= 1 && new RegExp(`moves ${r.moved} nudge`).test(r.text), `${r.moved} moved · ${r.lines} note lines · ${r.text}`);
      L.done(2);
    });

    test(`J8 no jump · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J8-${at}`);
      await openCard(page, vp, { stand: "you" });
      if (MUT === "J8") await page.evaluate(() => document.addEventListener("click", () => { const s = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-apc='scroll']"); if (s) window.setTimeout(() => { s.scrollTop = 0; }, 30); }, true));
      /* How open first, so the card is tall enough to sit 400 down; then every control is brought into view BEFORE its
         reading — Playwright's own scroll-into-view would otherwise be measured as the card's jump */
      await pressPen(page, "how");
      await page.evaluate(() => { const s = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-apc='scroll']"); if (s) s.scrollTop = 400; });
      await page.waitForTimeout(300);
      const start = await frameScroll(page);
      L.check(`the card sits scrolled (${start})`, start >= 200, String(start));
      const near = async (sel: string) => { await page.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: "nearest" })); await page.waitForTimeout(250); };
      await near(WEEKS);
      let top0 = await secTop(page, "how");
      await stepWeeks(page, "ArrowRight", 3);
      await page.waitForTimeout(300);
      L.check("stepping ×3 holds How", Math.abs((await secTop(page, "how")) - top0) <= 1, `${top0} → ${await secTop(page, "how")}`);
      const meth = `${CARD} [data-aap='method'] button[role='radio']:not([aria-checked='true'])`;
      await near(meth);
      top0 = await secTop(page, "how");
      await page.locator(meth).first().click();
      await page.waitForTimeout(300);
      L.check("Submit by holds How", Math.abs((await secTop(page, "how")) - top0) <= 1, `${top0} → ${await secTop(page, "how")}`);
      const mPen = `${CARD} [data-cl262='sec'][data-k='materials']`;
      await near(mPen);
      const howBefore = await secTop(page, "how");
      const mTop0 = await secTop(page, "materials");
      await pressPen(page, "materials");
      await page.waitForTimeout(500);
      const mTop1 = await secTop(page, "materials");
      L.check("opening Materials keeps it, or only reveals it (heading stays in view)", Math.abs(mTop1 - mTop0) <= 1 || (mTop1 < mTop0 && mTop1 >= 40), `${mTop0} → ${mTop1} (How ${howBefore} → ${await secTop(page, "how")})`);
      L.check("never sent to the top", (await frameScroll(page)) > 0, String(await frameScroll(page)));
      L.done(5);
    });

    test(`J9 focus is held · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J9-${at}`);
      fresh();
      await openCard(page, vp, { id: GAPPY });
      if (MUT === "J9") await page.evaluate(() => document.addEventListener("input", (e) => (e.target as HTMLElement).blur(), true));
      await pressPen(page, "wishlist");
      const focused = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.aap ?? "");
      L.check("wishlist takes focus", (await focused()) === "wishlist", await focused());
      await page.keyboard.type("Quiet literary fiction with a big heart.");
      const v = await page.locator(`${CARD} [data-aap='wishlist']`).inputValue();
      L.check("40 characters typed in one go", v.length === 40, String(v.length));
      L.check("focus still on the wishlist", (await focused()) === "wishlist", await focused());
      await page.locator(`${CARD} [data-cl262='cancel']`).click();
      await page.waitForTimeout(300);
      await page.locator(`${CARD} [data-cl262='edit-all']`).click();
      await page.waitForTimeout(500);
      const nm = await page.evaluate(() => { const e = document.activeElement as HTMLInputElement | null; return { k: e?.dataset.cl262 ?? "", at: e?.selectionStart ?? -1, len: e?.value.length ?? -2 }; });
      L.check("edit all focuses Name", nm.k === "name-input", JSON.stringify(nm));
      L.check("caret at the end", nm.at === nm.len, JSON.stringify(nm));
      L.done(5);
    });

    test(`J10 the discard guard · ${at}`, async ({ page }) => {
      test.setTimeout(240_000);
      const L = new Ledger(`J10-${at}`);
      const id0 = await openCard(page, vp, { stand: "you" });
      if (MUT === "J10") await cssBreak(page, "[data-cl262='save-bar'][data-guard]{display:none!important}");
      const dirty = async () => { await pressPen(page, "wishlist"); await page.keyboard.type(" x"); await page.waitForTimeout(150); };
      const guardUp = () => page.locator(`${CARD} [data-cl262='save-bar'][data-guard]`).isVisible();
      const keep = async () => { await page.locator(`${CARD} [data-cl262='keep']`).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200); };
      await dirty();
      await page.locator(`${CARD} [data-cl262='close']`).click();
      await page.waitForTimeout(300);
      L.check("✕ asks", (await guardUp()) && (await page.locator(CARD).count()) === 1, "");
      await keep();
      const n = await page.locator(`${CARD} [data-cl262='save-sum']`).getAttribute("data-n", { timeout: 4000 }).catch(() => null);
      L.check("Keep editing keeps the change", !!n && n !== "0", String(n));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      L.check("Esc asks", await guardUp(), "");
      await keep();
      await page.locator(`${CARD} [data-cl262='next-agent']`).click();
      await page.waitForTimeout(300);
      L.check("› asks", await guardUp(), "");
      await page.locator(`${CARD} [data-cl262='discard']`).click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(600);
      const id1 = await page.locator("[data-cl262='panel']").getAttribute("data-agent-id");
      L.check("Discard goes on to the next agent", !!id1 && id1 !== id0, `${id0} → ${id1}`);
      await dirty();
      const other = page.locator(`.aglist [data-cl26='row']:not([data-id='${id1}']) [data-cl26='name']`).first();
      await other.click({ force: false }).catch(() => {});
      await page.waitForTimeout(400);
      L.check("another row asks", (await guardUp()) && (await page.locator("[data-cl262='panel']").getAttribute("data-agent-id")) === id1, "");
      L.done(6);
    });

    test(`J11 save writes once · ${at}`, async ({ page }) => {
      test.setTimeout(180_000);
      const L = new Ledger(`J11-${at}`);
      fresh();
      await openCard(page, vp, { id: GAPPY });
      if (MUT === "J11") await cssBreak(page, ".sa-toast{display:none!important}");
      await pressPen(page, "wishlist");
      await page.keyboard.type("Ghost stories set by the sea.");
      await page.locator(`${CARD} [data-cl262='save']`).click();
      /* the write is the emulator's round trip: wait for the toast (up to 6s), then for the sections to close */
      await page.locator(".sa-toast", { hasText: "Saved" }).first().waitFor({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(400);
      const toasts = await page.$$eval(".sa-toast", (e) => e.filter((x) => (x as HTMLElement).getBoundingClientRect().height > 0 && /Saved/.test(x.textContent ?? "")).map((x) => x.textContent));
      L.check("one Saved toast", toasts.length === 1, JSON.stringify(toasts));
      L.check("sections closed", (await editingKeys(page)).length === 0, (await editingKeys(page)).join(","));
      L.check("the wishlist reads back", (await page.locator(`${CARD} [data-cl262='wishlist']`).innerText()).includes("Ghost stories"), "");
      L.check("rest lean back", Math.abs((await lean(page)) + 1.2) < 0.05, String(await lean(page)));
      L.done(4);
    });
  }
});

/* the report's frame strips: the arrival, and "How they work" opened mid-card (the card does not move) */
test("CL262 shots — frame strips", async ({ page }) => {
  test.setTimeout(240_000);
  const vp = SIZES[0];
  const strip = async (frames: Buffer[], name: string) => {
    const imgs = frames.map((b) => `<img src="data:image/png;base64,${b.toString("base64")}" style="width:${Math.floor(1500 / frames.length)}px;margin:0 2px">`).join("");
    const p2 = await page.context().newPage();
    await p2.setViewportSize({ width: 1520, height: 600 });
    await p2.setContent(`<body style="margin:0;background:#222;display:flex;align-items:flex-start">${imgs}</body>`);
    await p2.screenshot({ path: `${shotDir()}/${name}.png`, fullPage: true });
    await p2.close();
  };
  const clip = async () => {
    const r = await page.locator("[data-cl262='panel']").boundingBox();
    return page.screenshot({ clip: r ? { x: Math.max(0, r.x - 30), y: Math.max(0, r.y - 10), width: Math.min(vp.width - Math.max(0, r.x - 30), r.width + 60), height: r.height + 20 } : undefined });
  };
  await openCard(page, vp, { stand: "you", settle: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const row = page.locator(".aglist [data-cl26='row'][data-k='agent']").first();
  await row.locator("[data-cl26='name']").click();
  const arrival: Buffer[] = [];
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(110); arrival.push(await page.screenshot()); }
  await strip(arrival, "10-strip-arrival-1512");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.querySelector<HTMLElement>("[data-cl262='scroll']"); if (s) s.scrollTop = 220; });
  await page.waitForTimeout(300);
  const editing: Buffer[] = [await clip()];
  await page.locator("[data-cl262='sec'][data-k='how']").first().hover();
  await page.locator("[data-cl262='pen'][data-k='how']").first().click();
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(140); editing.push(await clip()); }
  await page.locator("[data-aap='weeks'] input[type='range']").first().focus(); await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  editing.push(await clip());
  await strip(editing, "11-strip-edit-how-1512");
});
