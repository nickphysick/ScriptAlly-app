/**
 * The public site downloads the public site (split v1, 1 Nov): SPLIT-1 … SPLIT-5, on builds served
 * locally (the `public` project, no sign-in).
 *
 *   Production build (queryhawk.net, landing-only):
 *     npx vite build --mode production --outDir <p> && npx vite preview --outDir <p> --host 127.0.0.1 --port 4473 --strictPort
 *     SPLIT_DIST=<p> SA_E2E_BASE_URL=http://127.0.0.1:4473 npx playwright test --project=public landingSplit -g "SPLIT-[1235]"
 *   Whole-app build (dev.queryhawk.net):
 *     npx vite build --mode development --outDir <d> && npx vite preview --outDir <d> --host 127.0.0.1 --port 4474 --strictPort
 *     SA_E2E_BASE_URL=http://127.0.0.1:4474 npx playwright test --project=public landingSplit -g SPLIT-4
 *
 * ⚠️ SPLIT-4 IS SKIPPED, AND THE SKIP IS THE DEBT. Phase 5 (lazy workspace routes) was set aside by Nick
 * (1 Nov): the public build is what visitors download, and dev is internal. Lazy loading reorders the
 * whole app's stylesheet and changes mount timing, which needs changes inside workspace pages. The
 * attempt is reports/landing-perf-v1/phase5-attempt.patch; "Found, not fixed" in that REPORT says why.
 * Un-skip it with that work, and it must go red on today's build first (it does: 1.8 MB, five markers).
 *
 * SPLIT-5 compares two live builds: `SPLIT_REF_URL` (a preview of the build before the split, 43c0b8e4)
 * against `SA_E2E_BASE_URL`. No reference images are committed: sixteen full pages would be tens of MB.
 *
 * ⚠️ THE WORKSPACE IS RECOGNISED BY STRINGS THAT SURVIVE MINIFYING, NOT BY COMPONENT NAMES, which a
 * production build renames. `SIGNATURES` names each one and the file it comes from; a signature that
 * stops existing in the source must be replaced, or its check goes vacuous (SPLIT-2 asserts each is
 * still in the source first).
 */
import { test, expect, Page, BrowserContext } from "@playwright/test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

test.describe.configure({ timeout: 240_000 });

const PATHS = ["/", "/pricing", "/about", "/contact", "/founders", "/welcome", "/terms", "/privacy"] as const;
const LAYOUTS = [{ name: "390", vp: { width: 390, height: 844 } }, { name: "1440", vp: { width: 1440, height: 900 } }] as const;

/** The fixed list, each as a string the minifier keeps. */
const SIGNATURES = [
  { name: "Dashboard", sig: "d58-header", from: "src/components/dashboard/v58/Dash58Header.tsx" },
  { name: "ToDoPage", sig: "tdb-nc-body", from: "src/components/todo/ToDoPage.tsx" },
  { name: "xlsx", sig: "sheet_to_json", from: "node_modules/xlsx/xlsx.mjs" },
  { name: "jspdf", sig: "jsPDF", from: "node_modules/jspdf/dist/jspdf.es.min.js" },
  { name: "lottie", sig: "bodymovin", from: "node_modules/lottie-web/build/player/lottie.js" },
] as const;
const workspaceIn = (code: string) => SIGNATURES.filter((s) => code.includes(s.sig)).map((s) => s.name);

/** Named breaks, so each lock can be watched going red. */
const MUTATIONS: Record<string, string> = {
  /* SPLIT-5: the page's heading 3px down (geometry), and the footer a different colour (pixels). */
  SPLIT5: ".mk-scope h1{translate:0 3px!important}",
  SPLIT5b: "footer{background:#3b2a20!important}",
  SPLIT3: ".mk-betamsg--ok{display:none!important}",
};
const mutate = async (page: Page, name: string) => {
  if (process.env.SPLIT_MUTATE === name) { await page.addStyleTag({ content: MUTATIONS[name] }); await page.waitForTimeout(150); }
};

const COUNT = { count: 13, cap: 50, visible: true };
async function quiet(page: Page) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.route("**/api/waitlist", (r) => r.request().method() === "GET"
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(COUNT) })
    : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, count: 14, cap: 50 }) }));
}

/** Every same-origin script and stylesheet a cold load of `url` fetches before the network is idle. */
async function coldLoad(ctx: BrowserContext, url: string) {
  const page = await ctx.newPage();
  await quiet(page);
  const got: { url: string; type: string; raw: number; gz: number; body: Buffer }[] = [];
  const pending: Promise<void>[] = [];
  page.on("response", (res) => {
    const u = new URL(res.url());
    if (u.origin !== new URL(url).origin || res.status() !== 200) return;
    pending.push(res.body().then((b) => {
      const type = /\.js$/.test(u.pathname) ? "js" : /\.css$/.test(u.pathname) ? "css" : u.pathname.split(".").pop() || "html";
      got.push({ url: u.pathname, type, raw: b.length, gz: gzipSync(b, { level: 9 }).length, body: b });
    }).catch(() => {}));
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await Promise.all(pending);
  return { page, got };
}

for (const L of LAYOUTS) {
  test.describe(`at ${L.name}`, () => {
    test.use({ viewport: L.vp, deviceScaleFactor: 1 });

    test("SPLIT-1 · a cold load of / fetches ≤250 KB of JS and ≤70 KB of CSS, gzipped", async ({ context, baseURL }) => {
      const { got } = await coldLoad(context, baseURL + "/");
      const js = got.filter((f) => f.type === "js"), css = got.filter((f) => f.type === "css");
      const sum = (a: typeof got) => a.reduce((s, f) => s + f.gz, 0);
      const largest = [...got].sort((a, b) => b.raw - a.raw).slice(0, 5).map((f) => `${f.url} ${f.raw}B raw, ${f.gz}B gz`);
      console.log(`SPLIT-1 ${L.name}`, JSON.stringify({ jsGz: sum(js), cssGz: sum(css), files: got.length, largest }));
      expect(js.length, "the page fetched its scripts").toBeGreaterThan(0);
      expect(css.length, "the page fetched its stylesheet").toBeGreaterThan(0);
      expect(sum(js), "JS gzipped").toBeLessThanOrEqual(250 * 1024);
      expect(sum(css), "CSS gzipped").toBeLessThanOrEqual(70 * 1024);
    });

    test("SPLIT-3 · every public path renders, and the founding sign-up round-trips", async ({ context, baseURL }) => {
      for (const path of PATHS) {
        const page = await context.newPage();
        await quiet(page);
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(baseURL + path, { waitUntil: "load" });
        await expect(page.locator(".mk-scope"), `${path}: the public shell`).toBeVisible();
        await expect(page.locator("h1").first(), `${path}: a heading`).toBeVisible();
        expect(new URL(page.url()).pathname, `${path}: not redirected`).toBe(path);
        expect(errors, `${path}: no page errors`).toEqual([]);
        await page.close();
      }
      /* The round trip, on the landing page's first visible form: the count arrives, the POST carries the
         address and its source, and the sent message replaces the field. */
      const page = await context.newPage();
      await quiet(page);
      const posts: Record<string, unknown>[] = [];
      page.on("request", (r) => { if (r.url().endsWith("/api/waitlist") && r.method() === "POST") posts.push(JSON.parse(r.postData() || "{}")); });
      await page.goto(baseURL + "/", { waitUntil: "load" });
      await expect(page.getByText(/places left/i).first(), "the places count arrived").toBeVisible({ timeout: 15_000 });
      const field = page.locator("input[type=email]:visible").first();
      await field.scrollIntoViewIfNeeded();
      await field.fill("split-check@example.com");
      await field.press("Enter");
      await mutate(page, "SPLIT3");
      await expect(page.locator(".mk-betamsg--ok").first(), "the sent message").toBeVisible({ timeout: 15_000 });
      expect(posts.length, "one POST").toBe(1);
      expect(posts[0].email, "the POST carried the address").toBe("split-check@example.com");
      expect(typeof posts[0].source, "the POST carried its source").toBe("string");
    });

    /* SPLIT-5: judged like PERF-5 — every visible element within ±1px, nothing added or removed, and the
       pixels at reading size within 0.5% (a 2px neighbourhood; anti-aliased edges ignored). */
    for (const path of PATHS) {
      test(`SPLIT-5 · ${path} looks as it did`, async ({ browser }) => {
        const ref = process.env.SPLIT_REF_URL;
        test.skip(!ref, "SPLIT_REF_URL names the build before the split");
        const read = async (base: string, mut: boolean) => {
          const ctx = await browser.newContext({ viewport: L.vp, deviceScaleFactor: 1, reducedMotion: "reduce" });
          const page = await ctx.newPage();
          await quiet(page);
          await page.goto(base + path, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          /* Scroll through once so every lazy image and seen-once section is drawn, then back to the top. */
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }); await new Promise((r) => setTimeout(r, 120)); }
            window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          });
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(1200);
          if (mut) { await mutate(page, "SPLIT5"); await mutate(page, "SPLIT5b"); }
          const geo = await page.evaluate(() => {
            const out: Record<string, number[]> = {};
            const walk = (el: Element, key: string, op: number) => [...el.children].forEach((c, i) => {
              const k = key + "/" + i + c.tagName.toLowerCase(), cs = getComputedStyle(c);
              const o = op * (cs.display === "none" || cs.visibility === "hidden" ? 0 : Number(cs.opacity));
              const r = c.getBoundingClientRect();
              if (o > 0.01 && r.width > 0 && r.height > 0) out[k] = [r.left, r.top + scrollY, r.width, r.height].map((v) => Math.round(v * 10) / 10);
              walk(c, k, o);
            });
            walk(document.body, "", 1);
            return out;
          });
          const shot = await page.screenshot({ fullPage: true });
          await ctx.close();
          return { geo, shot };
        };
        const a = await read(ref!, false), b = await read(test.info().project.use.baseURL || process.env.SA_E2E_BASE_URL!, true);
        const keys = Object.keys(a.geo);
        expect(keys.length, "the reference holds the page's elements").toBeGreaterThan(30);
        const moved = keys.filter((k) => b.geo[k] && b.geo[k].some((v, i) => Math.abs(v - a.geo[k][i]) > 1));
        const gone = keys.filter((k) => !b.geo[k]), added = Object.keys(b.geo).filter((k) => !a.geo[k]);
        const page = await (await browser.newContext()).newPage();
        const px = await page.evaluate(async ([x, y]) => {
          const load = async (s: string) => { const i = new Image(); i.src = "data:image/png;base64," + s; await i.decode(); return i; };
          const [ia, ib] = [await load(x), await load(y)];
          if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height], pct: 100, n: 0, diff: 0 };
          const c = new OffscreenCanvas(ia.width, ia.height), g = c.getContext("2d")!;
          g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
          g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
          const W = c.width, H = c.height;
          const lum = (d: Uint8ClampedArray, j: number) => d[j] * .3 + d[j + 1] * .59 + d[j + 2] * .11;
          const edge = (d: Uint8ClampedArray, x: number, y: number) => {
            let lo = 255, hi = 0;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
              const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
              const v = lum(d, (yy * W + xx) * 4); lo = Math.min(lo, v); hi = Math.max(hi, v);
            }
            return hi - lo > 48;
          };
          const near = (i: number, j: number) => Math.max(Math.abs(da[i] - db[j]), Math.abs(da[i + 1] - db[j + 1]), Math.abs(da[i + 2] - db[j + 2]));
          let diff = 0;
          for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
            const i = (yy * W + xx) * 4;
            if (near(i, i) <= 8) continue;
            let best = 999;
            for (let oy = -2; oy <= 2 && best > 8; oy++) for (let ox = -2; ox <= 2 && best > 8; ox++) {
              const x2 = xx + ox, y2 = yy + oy; if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue;
              best = Math.min(best, near(i, (y2 * W + x2) * 4));
            }
            if (best > 8 && !(edge(da, xx, yy) && edge(db, xx, yy))) diff++;
          }
          return { n: W * H, diff, pct: +(100 * diff / (W * H)).toFixed(3), size: [W, H] };
        }, [a.shot.toString("base64"), b.shot.toString("base64")] as const);
        console.log(`SPLIT-5 ${L.name} ${path}`, JSON.stringify({ elements: keys.length, moved: moved.slice(0, 5).map((k) => [k, a.geo[k], b.geo[k]]), gone: gone.slice(0, 5), added: added.slice(0, 5), px }));
        expect(px.n, "the comparison read pixels").toBeGreaterThan(100_000);
        expect(moved, "nothing moved or changed size by more than 1px").toEqual([]);
        expect(gone, "nothing disappeared").toEqual([]);
        expect(added, "nothing appeared").toEqual([]);
        expect(px.pct, "pixels").toBeLessThanOrEqual(0.5);
      });
    }
  });
}

test("SPLIT-2 · the production build's scripts hold no workspace code", async () => {
  const dist = resolve(process.cwd(), process.env.SPLIT_DIST || "dist");
  for (const s of SIGNATURES) {
    const src = resolve(process.cwd(), s.from);
    expect(existsSync(src) && readFileSync(src, "utf8").includes(s.sig), `${s.name}'s signature "${s.sig}" is still in ${s.from}`).toBe(true);
  }
  const files = readdirSync(resolve(dist, "assets")).filter((f) => f.endsWith(".js"));
  expect(files.length, "the build has scripts").toBeGreaterThan(0);
  const found = files.flatMap((f) => workspaceIn(readFileSync(resolve(dist, "assets", f), "utf8")).map((n) => `${n} in ${f}`));
  console.log("SPLIT-2", JSON.stringify({ files: files.length, found }));
  expect(found, "no workspace code in any chunk, not even a lazy one").toEqual([]);
});

test.describe("whole-app build", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("SPLIT-4 · a cold load of / signed out fetches no workspace code", async ({ browser, baseURL }) => {
    test.skip(true, "Phase 5 deferred (Nick, 1 Nov): lazy workspace routes need workspace-page fixes. See reports/landing-perf-v1/phase5-attempt.patch and REPORT.md, \"Found, not fixed\".");
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const { page, got } = await coldLoad(ctx, baseURL + "/");
    await expect(page.locator(".mk-scope"), "the landing page rendered").toBeVisible();
    const js = got.filter((f) => f.type === "js");
    expect(js.length, "the page fetched its scripts").toBeGreaterThan(0);
    const found = js.flatMap((f) => workspaceIn(f.body.toString("utf8")).map((n) => `${n} in ${f.url}`));
    console.log("SPLIT-4", JSON.stringify({ scripts: js.map((f) => `${f.url} ${f.gz}B gz`), found }));
    expect(found, "no workspace chunk before sign-in").toEqual([]);
    await ctx.close();
  });
});
