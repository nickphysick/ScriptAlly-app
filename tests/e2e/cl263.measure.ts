/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.3 — the CL263 locks, at 1512 × 900 and 1280 × 800, over v26.2's helpers (cl262Lib.ts).
 * Mutations: `CL263_MUTATE=<lock>`, each a break applied in the page after it loads.
 *   K1  Remove exists only in edit-everything, at the foot of Contact details, and opens the existing confirmation
 *   K2  "Open the query →" only for an agent with a query; opens that query; hidden while editing
 *   K3  every Log a query on /agents opens the shared log drawer with the agent set; the v24 panel never mounts
 */
import { test, type Page } from "@playwright/test";
import { SIZES, openCard, shotDir as shotDir262, Ledger as Ledger262, CARD } from "./cl262Lib";

const DIR263 = "reports/contact-list-v26-3";
const shotDir = () => shotDir262(DIR263);
class Ledger extends Ledger262 { constructor(n: string) { super(n, DIR263); } }

const MUT = process.env.CL263_MUTATE ?? "";
test.describe.configure({ mode: "default" });

const vis = (page: Page, sel: string) => page.locator(sel).first().isVisible().catch(() => false);
const closeCard = async (page: Page) => {
  await page.locator(`${CARD} [data-cl262='cancel']`).click({ timeout: 2000 }).catch(() => {});
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
};

for (const vp of SIZES) {
  const at = `${vp.width}`;

  test(`K1 remove · ${at}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`K1-${at}`);
    await openCard(page, vp, { stand: "agent" });
    if (MUT === "K1") await page.evaluate(() => {
      const b = document.createElement("button"); b.dataset.cl263 = "remove-btn"; b.textContent = "Remove";
      document.querySelector("[data-cl262='panel'] [data-cl262='profile']")?.prepend(b);
    });
    L.check("not on the card at rest", !(await vis(page, `${CARD} [data-cl263='remove-btn']`)), "");
    await page.locator(`${CARD} [data-cl262='sec'][data-k='wishlist']`).first().hover();
    await page.locator(`${CARD} [data-cl262='pen'][data-k='wishlist']`).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    L.check("not in a single section's edit", !(await vis(page, `${CARD} [data-cl263='remove-btn']`)), "");
    await page.locator(`${CARD} [data-cl262='cancel']`).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.locator(`${CARD} [data-cl262='edit-all']`).click();
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const sec = document.querySelector<HTMLElement>("[data-cl262='panel'] [data-cl262='sec'][data-k='contact']");
      const btn = sec?.querySelector<HTMLElement>("[data-cl263='remove-btn']");
      const grid = sec?.querySelector<HTMLElement>("[data-cl262='contact-form']");
      if (!btn || !grid) return null;
      const cells = [...grid.querySelectorAll<HTMLElement>(".cl262-cf")];
      const gridBottom = Math.max(...cells.map((c) => c.getBoundingClientRect().bottom));
      const cs = getComputedStyle(btn);
      return { text: btn.textContent ?? "", under: cells.length > 0 && btn.getBoundingClientRect().top >= gridBottom - 1,
        left: Math.abs(btn.getBoundingClientRect().left - grid.getBoundingClientRect().left) <= 2,
        font: cs.fontFamily, size: cs.fontSize, color: cs.color, deco: cs.textDecorationLine };
    });
    L.check("in Contact details", !!r, JSON.stringify(r));
    L.check("words: Remove {first} from your list", !!r && /^Remove \S+ from your list$/.test(r.text), r?.text ?? "");
    L.check("under the grid, left-aligned", !!r && r.under && r.left, JSON.stringify(r));
    L.check("Special Elite 14, #a2452a, underlined", !!r && /Special Elite/i.test(r.font) && r.size === "14px" && r.color === "rgb(162, 69, 42)" && r.deco === "underline", JSON.stringify(r));
    await page.locator(`${CARD} [data-cl263='remove-btn']`).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    L.check("opens the existing confirmation", await vis(page, `${CARD} [data-cl24='remove-confirm']`), "");
    L.check("the confirmation keeps", await vis(page, `${CARD} [data-cl24='remove-keep']`), "");
    await page.locator(`${CARD} [data-cl24='remove-keep']`).click({ timeout: 3000 }).catch(() => {});
    L.done(8);
  });

  test(`K2 open the query · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`K2-${at}`);
    for (const stand of ["you", "agent", "closed"]) {
      const id = await openCard(page, vp, { stand });
      L.check(`${stand} · the link shows`, await vis(page, `${CARD} [data-cl263='open-query']`), id);
      if (stand === "agent") {
        await page.locator(`${CARD} [data-cl262='sec'][data-k='how']`).first().hover();
        await page.locator(`${CARD} [data-cl262='pen'][data-k='how']`).first().click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(400);
        L.check("hidden while editing", !(await vis(page, `${CARD} [data-cl263='open-query']`)), "");
        await closeCard(page);
        await openCard(page, vp, { id });
        await page.locator(`${CARD} [data-cl263='open-query']`).click();
        await page.waitForTimeout(1500);
        const u = new URL(page.url());
        L.check("opens the query in the Query Centre", u.pathname === "/queries" && !!u.searchParams.get("q"), page.url());
      } else await closeCard(page);
    }
    await openCard(page, vp, { stand: "none" });
    if (MUT === "K2") await page.evaluate(() => {
      const d = document.createElement("div"); d.className = "cl263-oq";
      d.innerHTML = "<button type='button' data-cl263='open-query'>Open the query →</button>";
      document.querySelector("[data-cl262='panel'] [data-cl262='next']")?.after(d);
    });
    L.check("not for a not-queried agent", !(await vis(page, `${CARD} [data-cl263='open-query']`)), "");
    L.done(6);
  });

  test(`K3 log · ${at}`, async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger(`K3-${at}`);
    const v24 = "[data-cl24='panel'][data-agent-id='__log']";
    const drawer = "[data-qad-drawer='log']";
    await openCard(page, vp, { stand: "none" });
    if (MUT === "K3") await page.evaluate(() => document.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest("[data-cl262='next-btn'], .ws-capl, [aria-label='Log a query']")) return;
      const d = document.createElement("div"); d.dataset.cl24 = "panel"; d.dataset.agentId = "__log"; document.body.append(d);
    }, true));
    const name = (await page.locator(`${CARD} [data-apc='name']`).first().innerText()).trim();
    await page.locator(`${CARD} [data-cl262='next-btn']`).click();
    await page.waitForTimeout(900);
    L.check("card: the shared drawer opens", await vis(page, drawer), "");
    const txt = await page.locator(drawer).first().innerText().catch(() => "");
    L.check(`card: the agent is set (${name})`, txt.includes(name), txt.slice(0, 120));
    L.check("card: no v24 panel", (await page.locator(v24).count()) === 0, "");
    await page.screenshot({ path: `${shotDir()}/K3-log-drawer-${at}.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.locator("button:has-text('Discard')").first().click({ timeout: 1500 }).catch(() => {});
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator("[data-shell='capture'] .ws-capl:visible").first().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    L.check("top bar: the shared drawer opens on /agents", (await vis(page, drawer)) && new URL(page.url()).pathname === "/agents", page.url());
    L.check("top bar: no v24 panel", (await page.locator(v24).count()) === 0, "");
    L.done(5);
  });
}

/* the report's dev shots */
test("CL263 shots", async ({ page }) => {
  test.setTimeout(180_000);
  const vp = SIZES[0];
  await openCard(page, vp, { stand: "agent" });
  await page.screenshot({ path: `${shotDir()}/12-open-query-1512.png` });
  await page.locator(`${CARD} [data-cl262='edit-all']`).click(); await page.waitForTimeout(500);
  await page.locator(`${CARD} [data-cl263='remove-btn']`).evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir()}/13-contact-details-remove-1512.png` });
});
