/**
 * Landing-only, measured on a PRODUCTION build served locally (never live).
 *
 *   npx vite build && npx vite preview --host 127.0.0.1 --port 4719 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4719 npx playwright test --project public
 *
 * A stranger's view, so no sign-in (the `public` project). Signed out, the build reads nothing
 * from live: no listeners attach and App Check is inert. `/api/waitlist` is the SPA fallback here,
 * so the counter is simply absent.
 *
 * ⚠️ "NEVER VISIBLE" IS SAMPLED DURING THE NAVIGATION, NOT READ AT THE END. An init script watches
 * the DOM from before the app's first line runs and records whether the sign-in screen (`sf-`) or
 * the workspace (`ws-app`) ever appeared. A redirect that flashed the sign-in screen for one frame
 * passes a check of the final page; it fails this one.
 */
import { test, expect, Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";

const readings: Record<string, unknown> = {};

const watchForApp = async (page: Page) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __saw: { auth: boolean; shell: boolean; frames: number } };
    w.__saw = { auth: false, shell: false, frames: 0 };
    const check = () => {
      w.__saw.frames++;
      if (document.querySelector('[class*="sf-"]')) w.__saw.auth = true;
      if (document.querySelector(".ws-app")) w.__saw.shell = true;
    };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
    const tick = () => { check(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
};
const saw = (page: Page) => page.evaluate(() => (window as unknown as { __saw: { auth: boolean; shell: boolean; frames: number } }).__saw);

test.afterAll(() => {
  mkdirSync("reports/landing-live", { recursive: true });
  writeFileSync("reports/landing-live/partC-readings.json", JSON.stringify(readings, null, 2) + "\n");
});

test.describe("C1 · the public pages render, and nothing else ever does", () => {
  for (const path of ["/", "/founders", "/pricing", "/about", "/contact"]) {
    test(`${path} renders`, async ({ page }) => {
      await watchForApp(page);
      await page.goto(path);
      await expect(page.locator(".mk-scope")).toBeVisible();
      await page.waitForTimeout(400);
      const s = await saw(page);
      const url = new URL(page.url());
      readings[`render ${path}`] = { path: url.pathname, ...s };
      expect(url.pathname).toBe(path);
      expect(s.frames, "the watcher ran").toBeGreaterThan(3);
      expect(s.auth, "sign-in screen appeared").toBe(false);
      expect(s.shell, "workspace appeared").toBe(false);
    });
  }

  for (const target of ["/dashboard", "/agents", "/x", "/#/login", "/#/signup"]) {
    test(`${target} ends on / and never shows the app`, async ({ page }) => {
      await watchForApp(page);
      await page.goto(target);
      await expect(page.locator(".mk-scope")).toBeVisible();
      await page.waitForTimeout(600);
      const s = await saw(page);
      const url = new URL(page.url());
      readings[`redirect ${target}`] = { final: url.pathname + url.hash, ...s };
      expect(url.pathname).toBe("/");
      expect(url.hash, "the sign-in hash is cleared").toBe("");
      expect(s.frames, "the watcher ran").toBeGreaterThan(3);
      expect(s.auth, "sign-in screen appeared").toBe(false);
      expect(s.shell, "workspace appeared").toBe(false);
    });
  }
});

test("C2 · /founders?verified=already shows the already state, then drops the parameter", async ({ page }) => {
  await page.goto("/founders?verified=already");
  const state = page.locator('[data-verified="already"]');
  await expect(state).toBeVisible();
  await expect(state.locator("h1")).toHaveText("You're already in.");
  await page.waitForTimeout(300);
  const url = new URL(page.url());
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? null);
  readings["verified=already"] = { search: url.search, focused };
  expect(url.pathname).toBe("/founders");
  expect(url.searchParams.has("verified"), "the parameter is removed").toBe(false);
  expect(focused, "focus is on the headline").toBe("You're already in.");
});

test.describe("C3 · no way into the app in the public chrome", () => {
  for (const width of [1440, 390]) {
    test(`at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const found: Record<string, string[]> = {};
      for (const path of ["/", "/founders", "/pricing", "/about", "/contact"]) {
        await page.goto(path);
        await expect(page.locator(".mk-scope")).toBeVisible();
        const burger = page.locator(".mk-burger");
        if (await burger.isVisible()) await burger.click();
        const text = await page.evaluate(() => document.body.textContent ?? "");
        found[path] = ["Log in", "Open dashboard", "Open QueryHawk"].filter((d) => text.includes(d));
        expect(text, `${path} has the founding CTA`).toContain("Become a Founding Writer");
      }
      readings[`chrome ${width}`] = found;
      for (const [path, doors] of Object.entries(found)) expect(doors, path).toEqual([]);
    });
  }
});
