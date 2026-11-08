/**
 * v153.3 — the quiet window is set in Settings → Preferences → Queries now (it left the Query Centre header). One way in
 * for every e2e that needs a particular window: open the page, pick the weeks, wait for the receipt.
 * The caller re-opens whatever page it was measuring afterwards.
 */
import type { Page } from "@playwright/test";

export const QUIET_SELECT = "#account-quiet-weeks";

export async function setQuietWeeksInSettings(page: Page, weeks: number): Promise<boolean> {
  await page.goto("/account/preferences");
  const sel = page.locator(QUIET_SELECT);
  await sel.waitFor({ timeout: 20_000 });
  if ((await sel.inputValue()) === String(weeks)) return true;
  await sel.selectOption(String(weeks));
  await page.waitForFunction((v) => (document.querySelector<HTMLSelectElement>("#account-quiet-weeks")?.value ?? "") === v, String(weeks), { timeout: 10_000 });
  await page.waitForTimeout(900); // the leaf write settles
  return (await sel.inputValue()) === String(weeks);
}
