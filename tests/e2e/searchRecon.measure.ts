/**
 * Search recon v1 — a READ-ONLY reproduction on the emulator harness: the Query Centre draws Noah Bright's Offer card
 * while search's agent row for him says "Not queried". Then the shell's book is set to the one his query is on and the
 * same search is read again. Nothing is written to Firestore; the localStorage key is put back as it was found.
 * Writes reports/search-recon-v1/repro.json and two frames.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/search-recon-v1";
const DESK = { width: 1512, height: 950 };
const KEY = "scriptally_active_manuscript_id";

async function searchAgentRow(page: Page, term: string, agentId: string) {
  await page.locator('[data-probe="search"]').click();
  const INPUT = '.sp-pal--ink [role="combobox"]';
  await expect(page.locator(INPUT)).toBeFocused();
  await page.locator(INPUT).fill(term);
  await page.waitForTimeout(600);
  const row = page.locator(`.sv1-row[data-id="agent:${agentId}"]`).first();
  const found = await row.count();
  const right = found ? (await row.locator(".sv1-rt").innerText()).trim() : null;
  const peek = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[class*='sv1-pk']")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText).join(" | ").slice(0, 600));
  return { found, right, peek };
}

test("search recon v1: Noah Bright on both paths", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(OUT, { recursive: true });
  await openRoute(page, "/queries", DESK);
  const before = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const barBook = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-probe*='switch'], [class*='switcher'], [class*='Switcher']")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 3));
  const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc154-card")].filter((c) => c.getBoundingClientRect().width > 0 && /Noah Bright/.test(c.innerText)).map((c) => c.innerText.replace(/\s+/g, " ").slice(0, 200)));
  const s1 = await searchAgentRow(page, "Noah", "seed-agent-12");
  await page.screenshot({ path: `${OUT}/search-default-book.png` });
  await page.keyboard.press("Escape");

  /* the shell's book set to The Smoke Test (seed-ms-1), where Noah's query is */
  await page.evaluate((k) => localStorage.setItem(k, "seed-ms-1"), KEY);
  await openRoute(page, "/queries", DESK);
  const s2 = await searchAgentRow(page, "Noah", "seed-agent-12");
  await page.screenshot({ path: `${OUT}/search-smoke-test-book.png` });
  await page.keyboard.press("Escape");
  /* put the key back as found */
  await page.evaluate(([k, v]) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [KEY, before] as const);

  const res = { storedBefore: before, barBook, noahCardsOnQueryCentre: cards, searchOnDefaultBook: s1, searchWithSmokeTestStored: s2 };
  writeFileSync(`${OUT}/repro.json`, JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  expect(cards.length).toBeGreaterThan(0);
  expect(s1.right).toBe("Not queried");
  expect(s2.right).not.toBe("Not queried");
});
