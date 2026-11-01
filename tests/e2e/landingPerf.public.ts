/**
 * The landing page's "Every query tracked" card, kept light (landing perf fix v1, 1 Nov): PERF-1 … PERF-5,
 * measured on a PRODUCTION build served locally (the `public` project, no sign-in).
 *
 *   npx vite build && npx vite preview --host 127.0.0.1 --port 4471 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4471 npx playwright test --project=public landingPerf
 *
 * PERF-5 compares the card at rest with a reference captured from the build before the fix (5b3a6e2d):
 *   PERF_CAPTURE=1 SA_E2E_BASE_URL=<a preview of 5b3a6e2d> npx playwright test --project=public landingPerf -g PERF-5
 * writes tests/e2e/fixtures/landingPerf/. `PERF_MUTATE=<name>` applies a named break (see `MUTATIONS`).
 *
 * ⚠️ EACH LOCK ASSERTS ITS POPULATION OR ITS POSITIVE CONTROL FIRST, so none can pass on an empty set.
 */
import { test, expect, Page, BrowserContext } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

test.describe.configure({ timeout: 180_000 });

const LAYOUTS = [
  { name: "desk", vp: { width: 1440, height: 900 }, dsf: 2, frame: ".mk-trkd", maxLayers: 60 },
  { name: "phone", vp: { width: 390, height: 844 }, dsf: 3, frame: ".mk-trk", maxLayers: 40 },
] as const;
const FIX = resolve(process.cwd(), "tests/e2e/fixtures/landingPerf");

/** Named breaks: each undoes something a lock guards, so the lock can be watched going red. */
const MUTATIONS: Record<string, string> = {
  /* PERF-5: the hawk 3px to the right, and the card's band a different colour. */
  PERF5: ".mk-trk-hawk{translate:3px 0!important}",
  PERF5b: '.mk-lc[data-hc="front"] .mk-lc-band{background:#d7e0e8!important}',
};
const mutate = async (page: Page, ...names: string[]) => {
  const m = process.env.PERF_MUTATE;
  if (m && names.includes(m)) { await page.addStyleTag({ content: MUTATIONS[m] }); await page.waitForTimeout(150); }
};

async function open(ctx: BrowserContext, frame: string) {
  const page = await ctx.newPage();
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.goto("/");
  await expect(page.locator(frame)).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  return page;
}
const centre = (page: Page, frame: string) => page.evaluate((f) => {
  const el = document.querySelector(f)!, r = el.getBoundingClientRect();
  window.scrollTo({ top: r.top + scrollY - (innerHeight - r.height) / 2, behavior: "instant" as ScrollBehavior });
}, frame);
/** Wait for the story to rest: "Play again" is offered once it has. */
const rest = async (page: Page, frame: string) => {
  await page.waitForSelector(frame + " .mk-trk-again.mk-on", { timeout: 120_000 });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
};
const inFrame = (page: Page, frame: string) => page.evaluate((f) => {
  const fr = document.querySelector(f)!;
  return document.getAnimations().filter((a) => { const t = (a.effect as KeyframeEffect | null)?.target; return !!t && fr.contains(t); }).map((a) => ({
    state: a.playState, fill: (a.effect as KeyframeEffect).getTiming().fill, infinite: (a.effect as KeyframeEffect).getTiming().iterations === Infinity,
  }));
}, frame);

for (const L of LAYOUTS) {
  test.describe(`${L.name} ${L.vp.width}×${L.vp.height}`, () => {
    test.use({ viewport: L.vp, deviceScaleFactor: L.dsf });

    test("PERF-1 · after the story rests, few compositor layers", async ({ context }) => {
      const page = await open(context, L.frame);
      const cdp = await context.newCDPSession(page);
      let layers: { width: number; height: number }[] = [];
      cdp.on("LayerTree.layerTreeDidChange", (e: { layers?: { width: number; height: number }[] }) => { if (e.layers) layers = e.layers; });
      /* ⚠️ ENABLED AFTER THE PAGE LOADS: enabled before, no event ever arrives in this Chromium. */
      await cdp.send("DOM.enable"); await cdp.send("LayerTree.enable");
      await centre(page, L.frame); await rest(page, L.frame);
      await page.evaluate(() => window.scrollBy(0, 1)); await page.waitForTimeout(600);
      const day = await page.evaluate((f) => document.querySelector<HTMLElement>(`${f} [data-hc="day"]`)?.dataset.n, L.frame);
      console.log(`PERF-1 ${L.name}`, JSON.stringify({ layers: layers.length, day }));
      expect(layers.length, "the layer tree was read").toBeGreaterThan(3);
      expect(day, "the story ran to its end").toBe("99");
      expect(layers.length, `composited layers ≤ ${L.maxLayers}`).toBeLessThanOrEqual(L.maxLayers);
    });

    test("PERF-2 · at load, with the row off screen, nothing in the frame is animating", async ({ context }) => {
      const page = await open(context, L.frame);
      await page.waitForTimeout(1500);
      const r = await page.evaluate((f) => ({ top: document.querySelector(f)!.getBoundingClientRect().top, vh: innerHeight }), L.frame);
      expect(r.top, "the row starts below the first screen").toBeGreaterThan(r.vh);
      const a = await inFrame(page, L.frame);
      console.log(`PERF-2 ${L.name}`, JSON.stringify({ inFrame: a.length }));
      expect(a.length).toBe(0);
      /* The positive control: once seen, the story does animate. */
      await centre(page, L.frame); await page.waitForTimeout(2500);
      const started = await page.evaluate((f) => Number(document.querySelector<HTMLElement>(`${f} [data-hc="day"]`)?.dataset.n ?? 0), L.frame);
      expect((await inFrame(page, L.frame)).length + started > 1, "the story starts once seen").toBe(true);
    });

    test("PERF-3 · no finished animation keeps filling, and nothing loops off screen", async ({ context }) => {
      const page = await open(context, L.frame);
      await centre(page, L.frame); await page.waitForTimeout(4000);
      const playing = await inFrame(page, L.frame);
      expect(playing.length, "the positive control: the story is animating").toBeGreaterThan(0);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })); await page.waitForTimeout(500);
      const away = (await inFrame(page, L.frame)).filter((a) => a.infinite && a.state === "running");
      await centre(page, L.frame); await rest(page, L.frame);
      const atRest = await inFrame(page, L.frame);
      const filled = atRest.filter((a) => a.state === "finished" && a.fill !== "none");
      console.log(`PERF-3 ${L.name}`, JSON.stringify({ playing: playing.length, infiniteRunningAway: away.length, atRest: atRest.length, finishedFilled: filled.length }));
      expect(away.length, "no infinite animation runs with the frame out of view").toBe(0);
      expect(filled.length, "no finished animation keeps a fill").toBe(0);
    });

    if (L.name === "desk") test("PERF-4 · the pile root's box lies within the frame (±24px)", async ({ context }) => {
      const page = await open(context, L.frame);
      await page.waitForTimeout(600);
      const r = await page.evaluate((f) => {
        const a = document.querySelector(f)!.getBoundingClientRect(), b = document.querySelector(f + " .mk-hc-pile--feature")!.getBoundingClientRect();
        return { frame: [a.left, a.top, a.right, a.bottom], root: [b.left, b.top, b.right, b.bottom] };
      }, L.frame);
      console.log("PERF-4", JSON.stringify(r));
      expect(r.root[2] - r.root[0], "the root has a box").toBeGreaterThan(100);
      expect(r.root[0], "left").toBeGreaterThanOrEqual(r.frame[0] - 24);
      expect(r.root[1], "top").toBeGreaterThanOrEqual(r.frame[1] - 24);
      expect(r.root[2], "right").toBeLessThanOrEqual(r.frame[2] + 24);
      expect(r.root[3], "bottom").toBeLessThanOrEqual(r.frame[3] + 24);
    });
  });

  /* PERF-5 reads at reading size (DPR 1). Nothing moves, appears, disappears, or changes colour or size. */
  test.describe(`${L.name} at reading size`, () => {
    test.use({ viewport: L.vp, deviceScaleFactor: 1 });
    test("PERF-5 · the card at rest is the card it was (geometry ±1px; pixels ≤0.5% outside the back cards)", async ({ context }) => {
      const page = await open(context, L.frame);
      await centre(page, L.frame); await rest(page, L.frame);
      await mutate(page, "PERF5", "PERF5b");
      const read = await page.evaluate((f) => {
        const fr = document.querySelector(f)!, box = fr.getBoundingClientRect();
        const M = 60, clip = { x: Math.max(0, Math.round(box.left - M)), y: Math.round(box.top - M), width: 0, height: Math.round(box.height + 2 * M) };
        clip.width = Math.min(innerWidth, Math.round(box.right + M)) - clip.x;
        const rel = (r: DOMRect) => [r.left - box.left, r.top - box.top, r.width, r.height].map((v) => Math.round(v * 10) / 10);
        /* Every element, keyed by its path; the pile root is excluded (its box is meant to change, PERF-4). */
        /* Only what a reader can see: an element whose effective opacity is 0 (itself or an ancestor) is not
           compared — the waiting dots, the folded-away popover. */
        const geo: Record<string, number[]> = {};
        const walk = (el: Element, key: string, op: number) => [...el.children].forEach((c, i) => {
          const k = key + "/" + i + c.tagName.toLowerCase(), cs = getComputedStyle(c);
          const o = op * (cs.display === "none" || cs.visibility === "hidden" ? 0 : Number(cs.opacity));
          if (o > 0.01 && !c.classList.contains("mk-hc-pile--feature")) geo[k] = rel(c.getBoundingClientRect());
          walk(c, k, o);
        });
        walk(fr, "", 1);
        const backs = [...fr.querySelectorAll(".mk-lc--back")].map((c) => { const r = c.getBoundingClientRect(); return [r.left - clip.x, r.top - clip.y, r.right - clip.x, r.bottom - clip.y]; });
        const fc = fr.querySelector('[data-hc="front"]')!.getBoundingClientRect();
        return { clip, geo, backs, front: [fc.left - clip.x, fc.top - clip.y, fc.right - clip.x, fc.bottom - clip.y] };
      }, L.frame);
      const shot = await page.screenshot({ clip: read.clip });
      if (process.env.PERF_CAPTURE) {
        mkdirSync(FIX, { recursive: true });
        writeFileSync(resolve(FIX, `${L.name}-rest.png`), shot);
        writeFileSync(resolve(FIX, `${L.name}-rest.json`), JSON.stringify({ geo: read.geo, backs: read.backs, front: read.front }, null, 0));
        console.log(`PERF-5 ${L.name}: reference captured (${Object.keys(read.geo).length} elements)`);
        return;
      }
      expect(existsSync(resolve(FIX, `${L.name}-rest.json`)), "the reference exists").toBe(true);
      const ref = JSON.parse(readFileSync(resolve(FIX, `${L.name}-rest.json`), "utf8"));
      const keys = Object.keys(ref.geo);
      expect(keys.length, "the reference holds the card's elements").toBeGreaterThan(100);
      const moved = keys.filter((k) => !read.geo[k] || read.geo[k].some((v: number, i: number) => Math.abs(v - ref.geo[k][i]) > 1));
      const added = Object.keys(read.geo).filter((k) => !ref.geo[k]);
      /* The pixels: a 2px neighbourhood forgives anti-aliasing and rasterisation (sharper glyphs in the same
         place pass); the back cards (outside the front card) are masked for their removed blur. */
      const px = await page.evaluate(async ([a, b, backs, front]) => {
        const load = async (x: string) => { const i = new Image(); i.src = "data:image/png;base64," + x; await i.decode(); return i; };
        const [ia, ib] = [await load(a as string), await load(b as string)];
        if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height], pct: 100, n: 0 };
        const c = document.createElement("canvas"); c.width = ia.width; c.height = ia.height; const g = c.getContext("2d")!;
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
        g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
        const B = backs as number[][], F = front as number[];
        const inR = (x: number, y: number, r: number[]) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
        const lum = (d: Uint8ClampedArray, j: number) => d[j] * .3 + d[j + 1] * .59 + d[j + 2] * .11;
        const edge = (d: Uint8ClampedArray, x: number, y: number) => {
          let lo = 255, hi = 0;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= c.width || yy >= c.height) continue;
            const v = lum(d, (yy * c.width + xx) * 4); lo = Math.min(lo, v); hi = Math.max(hi, v);
          }
          return hi - lo > 48;
        };
        let n = 0, diff = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          if (B.some((r) => inR(x, y, r)) && !inR(x, y, F)) continue;
          n++;
          const i = (y * c.width + x) * 4; let best = 999;
          for (let oy = -2; oy <= 2 && best > 8; oy++) for (let ox = -2; ox <= 2 && best > 8; ox++) {
            const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= c.width || yy >= c.height) continue;
            const j = (yy * c.width + xx) * 4;
            best = Math.min(best, Math.max(Math.abs(da[i] - db[j]), Math.abs(da[i + 1] - db[j + 1]), Math.abs(da[i + 2] - db[j + 2])));
          }
          /* Anti-aliasing is ignored: a pixel on an edge in BOTH images (its 3×3 neighbourhood spans more than
             48 levels of luminance) is a glyph or outline's rendering, not a change of content. */
          if (best > 8 && !(edge(da, x, y) && edge(db, x, y))) diff++;
        }
        return { n, diff, pct: +(100 * diff / n).toFixed(3) };
      }, [readFileSync(resolve(FIX, `${L.name}-rest.png`)).toString("base64"), shot.toString("base64"), ref.backs, ref.front] as const);
      console.log(`PERF-5 ${L.name}`, JSON.stringify({ elements: keys.length, movedCount: moved.length, moved: moved.slice(0, 6).map((k) => [k, ref.geo[k], read.geo[k]]), added: added.slice(0, 6), px }));
      expect(px.n, "the comparison read pixels").toBeGreaterThan(10_000);
      expect(moved, "nothing moved or changed size by more than 1px").toEqual([]);
      expect(added, "nothing appeared").toEqual([]);
      expect(px.pct, "pixels outside the back cards").toBeLessThanOrEqual(0.5);
    });
  });
}
