/**
 * CF-2, the served half (2 Nov): a PRODUCTION build served on 127.0.0.1 asks Cloudflare for nothing,
 * and the same build under the live name asks once (and not after `?notrack`).
 *
 *   npm run build:prod && npx vite preview --host 127.0.0.1 --port 4410 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4410 npx playwright test --project public cfAnalytics
 *
 * ⚠️ NOTHING HERE REACHES LIVE OR CLOUDFLARE. Every request the page makes is routed: a request to
 * cloudflareinsights.com is RECORDED and then aborted (so no visit is ever counted, including the
 * harness's own); Google Fonts passes; a request to queryhawk.net is answered by the local build (that is how the page
 * runs "on" the live hostname without touching it); any other outside host is aborted.
 *
 * The self-check is what makes the zeros mean something: in the same run a tag injected by hand is
 * recorded, so a harness that could not see such a request cannot report a clean pass.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const BASE = process.env.SA_E2E_BASE_URL ?? "";
const CF = /cloudflareinsights\.com/;
const LIVE = /^https:\/\/(www\.)?queryhawk\.net(\/|$)/;

/** Routes the context and returns the list every Cloudflare request is written to. */
async function record(ctx: BrowserContext) {
  const seen: string[] = [];
  const local = new URL(BASE);
  await ctx.route("**/*", async (route) => {
    const url = route.request().url();
    if (CF.test(url)) { seen.push(url); return route.abort(); }
    if (LIVE.test(url)) {
      const u = new URL(url);
      const r = await route.fetch({ url: `${local.origin}${u.pathname}${u.search}` });
      return route.fulfill({ response: r });
    }
    const host = new URL(url).hostname;
    if (host === local.hostname) return route.continue();
    /* The page's own fonts. Aborted, Vite's CSS preload for the public chunk fails and nothing renders. */
    if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") return route.continue();
    if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    return route.abort();
  });
  return seen;
}

const settle = async (page: Page) => {
  await page.waitForLoadState("load");
  await page.waitForTimeout(1200);
};

test.describe.configure({ mode: "serial" });

test("CF-2 C1 · on 127.0.0.1, /, /privacy and /welcome make no request to Cloudflare; a hand-injected tag is seen", async ({ browser }) => {
  expect(BASE, "a local build, never live").toMatch(/^http:\/\/(127\.0\.0\.1|localhost)[:/]/);
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const seen = await record(ctx);
  const page = await ctx.newPage();
  const readings: Record<string, number> = {};
  for (const path of ["/", "/privacy", "/welcome"]) {
    const before = seen.length;
    await page.goto(path);
    await settle(page);
    expect(await page.locator("#root *").count(), `${path} rendered`).toBeGreaterThan(0);
    readings[path] = seen.length - before;
  }
  /* The self-check: put the old tag in by hand and the harness must see the request. */
  const before = seen.length;
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", '{"token": "ee52cb1f15964230836ca4f32696fbfb"}');
    document.head.appendChild(s);
  });
  await page.waitForTimeout(800);
  readings["injected by hand"] = seen.length - before;
  console.log("CF-2 C1 readings", JSON.stringify(readings));
  expect(readings["injected by hand"], "the harness sees a Cloudflare request").toBeGreaterThan(0);
  expect([readings["/"], readings["/privacy"], readings["/welcome"]], "no Cloudflare request on 127.0.0.1").toEqual([0, 0, 0]);
  await ctx.close();
});

test("CF-2 C2 · the same build under the live name asks for the beacon once; ?notrack stops it and leaves the URL clean", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const seen = await record(ctx);
  const page = await ctx.newPage();
  const readings: Record<string, unknown> = {};
  for (const url of ["https://queryhawk.net/", "https://www.queryhawk.net/privacy"]) {
    const before = seen.length;
    await page.goto(url);
    await settle(page);
    readings[url] = {
      requests: seen.slice(before).filter((u) => u.includes("beacon.min.js")).length,
      tags: await page.locator('script[src="https://static.cloudflareinsights.com/beacon.min.js"]').count(),
      config: await page.locator('script[src*="cloudflareinsights"]').first().getAttribute("data-cf-beacon"),
    };
  }
  const before = seen.length;
  await page.goto("https://queryhawk.net/welcome?utm_source=instagram&notrack");
  await settle(page);
  readings["?notrack"] = { requests: seen.length - before, url: page.url(), flag: await page.evaluate(() => localStorage.getItem("qh_notrack")) };
  const later = seen.length;
  await page.goto("https://queryhawk.net/");
  await settle(page);
  readings["after ?notrack"] = seen.length - later;
  const back = seen.length;
  await page.goto("https://queryhawk.net/?track");
  await settle(page);
  readings["?track"] = { requests: seen.slice(back).filter((u) => u.includes("beacon.min.js")).length, url: page.url() };
  console.log("CF-2 C2 readings", JSON.stringify(readings));
  for (const url of ["https://queryhawk.net/", "https://www.queryhawk.net/privacy"]) {
    expect(readings[url], url).toEqual({ requests: 1, tags: 1, config: '{"token": "ee52cb1f15964230836ca4f32696fbfb"}' });
  }
  expect(readings["?notrack"]).toEqual({ requests: 0, url: "https://queryhawk.net/welcome?utm_source=instagram", flag: "1" });
  expect(readings["after ?notrack"]).toBe(0);
  expect(readings["?track"]).toEqual({ requests: 1, url: "https://queryhawk.net/" });
  await ctx.close();
});
