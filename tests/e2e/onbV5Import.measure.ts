/**
 * Onboarding v5, part 2 — the import, from "Read my file" to the dashboard. Locks OB2.
 *
 * Measured on `#/onb-lab`, which mounts each import step over fixtures inside the real
 * `SetupFrame` (no sign-in, no writes). The cases that need the real dashboard (H2, N2, N3) sign in
 * as the harness account and say so.
 *
 *   OB2_MUTATE=<lock>  apply that lock's named break in the page, to prove it goes red
 *   OB2_SHOTS=1        write the report's screenshots
 *
 * Every sweep states its population first. The e2e password is never printed.
 */
import { test, expect, Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const VPS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
const OUT = resolve("reports/onb-v5-import");
const MUTATE = process.env.OB2_MUTATE ?? "";
const SHOTS = !!process.env.OB2_SHOTS;
const READINGS = resolve(OUT, MUTATE ? `readings-mutated-${MUTATE}.jsonl` : "readings.jsonl");
mkdirSync(OUT, { recursive: true });

const vpName = (page: Page) => { const v = page.viewportSize(); return v ? `${v.width}x${v.height}` : "?"; };
/** One line per reading, so the report quotes what was measured rather than what was hoped. */
function record(page: Page, lock: string, name: string, value: unknown) {
  appendFileSync(READINGS, JSON.stringify({ lock, vp: vpName(page), name, value }) + "\n");
}

/** CSS-only breaks, injected after the page settles. DOM breaks are in `mutate`. */
const MUTATIONS: Record<string, string> = {
  R2: ".sf .im-bare{position:fixed!important;inset:0!important;z-index:50!important}",
  R4: ".sf .im-sc-tick{background:#e9ede6!important;color:#5a6e58!important}",
};

async function mutate(page: Page) {
  if (!MUTATE) return;
  if (MUTATIONS[MUTATE]) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
  if (MUTATE === "R3") {
    /* Restore the old last line whenever the loader says it is ready. */
    await page.evaluate(() => {
      const fix = () => document.querySelectorAll('[data-im="status"]').forEach((e) => {
        if (e.textContent === "Ready") e.textContent = "ready — here's what we found";
      });
      new MutationObserver(fix).observe(document, { subtree: true, childList: true, characterData: true });
      fix();
    });
  }
}

export async function lab(page: Page, q: string, opts: { reduced?: boolean } = {}) {
  if (opts.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/#/onb-lab?${q}`, { waitUntil: "load" });
  /* The lab reads its query once, at mount: a second visit that changes only the query needs a
     reload to take it. */
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("[data-setup-frame]", { timeout: 20_000 });
  await page.evaluate(() => (document as Document).fonts.ready);
  await mutate(page);
}

const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = document.querySelector(s) as HTMLElement | null;
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel);

/** Every fixed element drawn over the frame, other than the frame itself. */
const fixedOverFrame = (page: Page) => page.evaluate(() => {
  const frame = document.querySelector("[data-setup-frame]") as HTMLElement;
  const fr = frame.getBoundingClientRect();
  const out: string[] = [];
  document.querySelectorAll<HTMLElement>("body *").forEach((e) => {
    if (e === frame) return;
    const cs = getComputedStyle(e);
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    const overlap = Math.max(0, Math.min(r.right, fr.right) - Math.max(r.left, fr.left)) * Math.max(0, Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top));
    if (overlap > 0) out.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)}`);
  });
  return out;
});

const OLD_SAGE = ["rgb(233, 237, 230)", "rgb(230, 235, 227)", "rgb(90, 110, 88)", "rgb(138, 158, 136)"];
/** Every element inside the loader whose colour, background or border is one of the old sages. */
const sageIn = (page: Page, root: string) => page.evaluate(({ root, sage }) => {
  const host = document.querySelector(root);
  if (!host) return { population: 0, hits: ["no root"] };
  const all = [host, ...host.querySelectorAll("*")] as HTMLElement[];
  const hits: string[] = [];
  for (const e of all) {
    const cs = getComputedStyle(e);
    for (const p of ["color", "backgroundColor", "borderTopColor", "stroke", "fill"] as const) {
      const v = (cs as unknown as Record<string, string>)[p];
      if (sage.includes(v)) hits.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)} ${p}=${v}`);
    }
  }
  return { population: all.length, hits };
}, { root, sage: OLD_SAGE });

test.describe("OB2", () => {
  for (const vp of VPS) {
    test.describe(`${vp.width}x${vp.height}`, () => {
      test.use({ viewport: vp });

      /* ── R2 · the reading loader is inside the frame ─────────────────────────────────────── */
      test("R2 reading loader sits in the frame's sheet", async ({ page }) => {
        await lab(page, "s=reading&hold=work");
        await page.waitForSelector('[data-im="reading"]');
        const sheet = await box(page, '[data-sf="sheet"]');
        const loader = await box(page, '[data-im="reading"]');
        const tab = await box(page, ".ws-ftab");
        expect(sheet && loader && tab, "sheet, loader and tab are all drawn").toBeTruthy();
        record(page, "R2", "sheet", sheet); record(page, "R2", "loader", loader);
        expect(loader!.x).toBeGreaterThanOrEqual(sheet!.x - 0.5);
        expect(loader!.y).toBeGreaterThanOrEqual(sheet!.y - 0.5);
        expect(loader!.r).toBeLessThanOrEqual(sheet!.r + 0.5);
        expect(loader!.b).toBeLessThanOrEqual(sheet!.b + 0.5);
        /* the tab is visible: what is at its centre is the tab, not something laid over it */
        const tabOnTop = await page.evaluate(() => {
          const t = document.querySelector(".ws-ftab") as HTMLElement; const r = t.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && (hit === t || t.contains(hit));
        });
        expect(tabOnTop, "the folder tab is not covered").toBe(true);
        if (vp.width >= 900) {
          const side = await box(page, '[data-sf="panel"]');
          expect(side && side.w > 200, "the sidebar is drawn").toBeTruthy();
          const sideOnTop = await page.evaluate(() => {
            const s = document.querySelector('[data-step="list"]') as HTMLElement; const r = s.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!hit && (hit === s || s.contains(hit));
          });
          expect(sideOnTop, "the current step in the sidebar is not covered").toBe(true);
        }
        const fixed = await fixedOverFrame(page);
        record(page, "R2", "fixedOverFrame", fixed);
        expect(fixed, "nothing fixed is drawn over the frame").toEqual([]);
        const exit = await page.evaluate(() => {
          const e = document.querySelector('[data-sf="exit"]') as HTMLElement | null;
          return e ? getComputedStyle(e).visibility : "absent";
        });
        record(page, "R2", "exit", exit);
        expect(["hidden", "absent"], "the frame shows no exit while the loader runs").toContain(exit);
        if (SHOTS) { mkdirSync(resolve(OUT, "shots"), { recursive: true }); await page.screenshot({ path: resolve(OUT, "shots", `reading-work-${vp.width}.png`) }); }
      });

      /* ── R3 · "Ready" ─────────────────────────────────────────────────────────────────────── */
      test("R3 reading loader ends on Ready", async ({ page }) => {
        await lab(page, "s=reading&hold=done", { reduced: vp.width < 900 });
        await page.waitForSelector('[data-im-state="done"]', { timeout: 15_000 });
        await page.waitForTimeout(250);
        const status = await page.locator('[data-im="status"]').innerText();
        record(page, "R3", "finalStatus", status);
        expect(status).toBe("Ready");
        const body = (await page.locator("body").innerText()).toLowerCase();
        expect(body).not.toContain("what we found");
        if (SHOTS) await page.screenshot({ path: resolve(OUT, "shots", `reading-done-${vp.width}.png`) });
      });

      /* ── R4 · no sage (the reading loader's half; the importing loader's is below) ───────── */
      test("R4 reading loader's finished mark is navy, and nothing is sage", async ({ page }) => {
        await lab(page, "s=reading&hold=done", { reduced: vp.width < 900 });
        await page.waitForSelector('[data-im="tick"]', { timeout: 15_000 });
        await page.waitForTimeout(900);
        const mark = await page.evaluate(() => getComputedStyle(document.querySelector('[data-im="tick"]') as HTMLElement).backgroundColor);
        record(page, "R4", "readingMark", mark);
        expect(mark).toBe("rgb(42, 58, 82)");
        const sage = await sageIn(page, '[data-im="reading"]');
        record(page, "R4", "readingSage", sage);
        expect(sage.population, "the sweep covered the loader").toBeGreaterThan(10);
        expect(sage.hits).toEqual([]);
      });
    });
  }
});
