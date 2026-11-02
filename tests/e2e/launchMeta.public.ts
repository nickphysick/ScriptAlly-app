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

const TITLE = "QueryHawk: track every query to a literary agent";
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
