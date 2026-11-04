/**
 * Launch readiness (2 Nov): META-1, the share preview and page meta, read from the served index.html AS
 * TEXT. Share crawlers do not run scripts, so a tag injected by JavaScript would not count: these read the
 * HTML exactly as a crawler receives it.
 *
 *   npm run build:prod && npx vite preview --host 127.0.0.1 --port 4410 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4410 npx playwright test --project public launchMeta
 *
 * `META_MUTATE=META1` serves the page with one tag's value changed, so the lock can be seen to fail.
 */
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const TITLE = "QueryHawk: Your smart querying companion";
const DESC = "Agents. Queries. Materials. Tasks. QueryHawk tracks your entire querying campaign and gives your manuscript the best chance of success. We're bringing 50 founding writers on board to test it. In return, they'll get the full package, free for their whole journey.";
const IMG = "https://queryhawk.net/images/og-share.png";

const unesc = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
/** Every `<meta>` in the head as [key, content], the key being its property or name. */
const metas = (html: string) => [...html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g)].map((m) => [m[1], unesc(m[2])] as const);

test("META-1 · the title, description and share tags are in the served HTML itself", async ({ request }) => {
  let html = await (await request.get("/")).text();
  if (process.env.META_MUTATE === "META1") html = html.replace('content="1200"', 'content="1000"');
  const m = metas(html);
  const one = (k: string) => { const v = m.filter(([key]) => key === k); expect(v.length, `exactly one ${k}`).toBe(1); return v[0][1]; };
  expect(unesc(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""), "<title>").toBe(TITLE);
  expect(html.match(/<title>/g)?.length, "one <title>").toBe(1);
  expect(one("description")).toBe(DESC);
  expect(one("og:description")).toBe(DESC);
  expect(one("twitter:description")).toBe(DESC);
  expect(one("og:title")).toBe(TITLE);
  expect(one("og:type")).toBe("website");
  expect(one("og:url")).toBe("https://queryhawk.net/");
  expect(one("og:site_name")).toBe("QueryHawk");
  expect(one("og:locale")).toBe("en_GB");
  expect(one("og:image")).toBe(IMG);
  expect(one("og:image:width")).toBe("1200");
  expect(one("og:image:height")).toBe("630");
  expect(one("og:image:alt")).toBe("QueryHawk: Hunting for a literary agent? No more winging it.");
  expect(one("twitter:card")).toBe("summary_large_image");
  expect(html, "the old share image is no longer referenced").not.toContain("og-image.jpg");
  expect(html, "the old title is gone").not.toContain("Query With Confidence");
  /* The image itself: committed, served, and 1200×630 by its own PNG header. */
  const file = join(process.cwd(), "public/images/og-share.png");
  expect(existsSync(file), "public/images/og-share.png is committed").toBe(true);
  const png = readFileSync(file);
  expect(png.subarray(1, 4).toString(), "a PNG").toBe("PNG");
  expect([png.readUInt32BE(16), png.readUInt32BE(20)], "1200×630").toEqual([1200, 630]);
  const served = await request.get("/images/og-share.png");
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toContain("image/png");
});

/* CF-1, the served half, RETARGETED 2 Nov: the HTML carries NO Cloudflare beacon. It used to be written into
   the built page, so every production build counted visits from wherever it ran (127.0.0.1 included);
   src/lib/cfAnalytics.ts now adds it at app start on queryhawk.net only (CF-2, unit and
   tests/e2e/cfAnalytics.measure.ts). `META_MUTATE=CF1` puts the old static tag back. */
test("CF-1 · no Cloudflare beacon in the served HTML, and no cookie banner", async ({ request, page }) => {
  let html = await (await request.get("/")).text();
  if (process.env.META_MUTATE === "CF1") html = html.replace("</head>", `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "ee52cb1f15964230836ca4f32696fbfb"}'></script></head>`);
  expect(html, "the page reached is the app's own HTML").toContain('<div id="root">');
  expect(html.split("cloudflareinsights.com").length - 1, "no beacon in the HTML").toBe(0);
  /* No cookie, no banner: the page sets no cookie of its own and draws no consent prompt. */
  await page.route(/cloudflareinsights\.com/, (r) => r.abort());
  await page.goto("/");
  await page.waitForTimeout(800);
  expect((await page.context().cookies()).length, "no cookies").toBe(0);
  expect(await page.getByText(/accept (all )?cookies|cookie (settings|choices)/i).count(), "no banner").toBe(0);
});

/* ROBOTS-1 (2 Nov): /robots.txt is the real file, served as text, never the SPA's HTML. `META_MUTATE=ROBOTS1`
   reads a path with no file behind it, which is what the site did before. */
test("ROBOTS-1 · /robots.txt is served as plain text, allowing everything", async ({ request }) => {
  const r = await request.get(process.env.META_MUTATE === "ROBOTS1" ? "/robots-missing.txt" : "/robots.txt");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"], "text, not the app's HTML").toMatch(/^text\/plain/);
  expect(await r.text()).toBe("User-agent: *\nAllow: /\n");
});
