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
  if (MUTATE === "S1") {
    /* Count offers in neither group: the offer leaves "with you" and joins nothing. */
    await page.evaluate(() => {
      const offer = document.querySelector('[data-im="card-queries"] [data-status="Offer"]');
      if (!offer) return;
      const court = offer.closest("[data-court]")!;
      const n = court.querySelector('[data-im="court-n"]')!;
      const k = Number(offer.querySelector('[data-im="status-n"]')!.textContent);
      n.textContent = String(Number(n.textContent) - k);
      offer.remove();
    });
  }
  if (MUTATE === "S2") {
    /* Render the stepper's first step always. */
    await page.evaluate(() => {
      const ol = document.querySelector('[data-im="steps"]');
      if (!ol || ol.querySelector('[data-step="duplicates"]')) return;
      const li = document.createElement("li"); li.className = "im-st"; li.setAttribute("data-step", "duplicates"); li.innerHTML = "<i>1</i>Duplicates";
      ol.prepend(li);
    });
  }
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

      /* ── S1 · the summary's numbers sum ──────────────────────────────────────────────────── */
      for (const fx of ["review", "dupes", "clear"]) {
        test(`S1 summary sums (${fx})`, async ({ page }) => {
          await lab(page, `s=overview&fx=${fx}`);
          await page.waitForSelector('[data-im="summary"]');
          const r = await page.evaluate(() => {
            const num = (e: Element | null) => Number((e?.textContent ?? "").trim());
            const card = (sel: string) => {
              const c = document.querySelector(sel)!;
              return {
                total: num(c.querySelector('[data-im="total"]')),
                tiers: [...c.querySelectorAll('[data-im="tier-n"]')].map(num),
                key: [...c.querySelectorAll('[data-im="key-n"]')].map(num),
                courts: [...c.querySelectorAll("[data-court]")].map((g) => ({
                  key: g.getAttribute("data-court"), n: num(g.querySelector('[data-im="court-n"]')),
                  statuses: [...g.querySelectorAll('[data-im="status-n"]')].map(num),
                })),
              };
            };
            return { agents: card('[data-im="card-agents"]'), queries: card('[data-im="card-queries"]') };
          });
          record(page, "S1", fx, r);
          const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
          /* populations first */
          expect(r.agents.total, "there are agents").toBeGreaterThan(0);
          expect(r.queries.total, "there are queries").toBeGreaterThan(0);
          expect(r.agents.key.length, "the key line has clauses").toBeGreaterThanOrEqual(2);
          expect(r.queries.courts.length, "the queries card has groups").toBeGreaterThan(0);
          expect(sum(r.agents.key), "live + closed + not queried = agents").toBe(r.agents.total);
          expect(sum(r.agents.tiers), "agent tiers = agents").toBe(r.agents.total);
          expect(sum(r.queries.courts.map((c) => c.n)), "with agents + with you + closed = queries").toBe(r.queries.total);
          expect(sum(r.queries.tiers), "query tiers = queries").toBe(r.queries.total);
          for (const c of r.queries.courts) {
            expect(c.statuses.length, `${c.key} names its statuses`).toBeGreaterThan(0);
            expect(sum(c.statuses), `${c.key}: per-status counts = the group`).toBe(c.n);
          }
        });
      }

      /* ── S2 · the summary's shape ────────────────────────────────────────────────────────── */
      for (const fx of ["review", "dupes", "clear"]) {
        test(`S2 summary shape (${fx})`, async ({ page }) => {
          await lab(page, `s=overview&fx=${fx}`);
          await page.waitForSelector('[data-im="summary"]');
          const r = await page.evaluate(() => {
            const sheet = document.querySelector('[data-sf="scroll"]') as HTMLElement;
            /* the first element in the sheet that draws text */
            const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
            let first: HTMLElement | null = null;
            while (walker.nextNode()) { const t = walker.currentNode; if ((t.textContent ?? "").trim()) { first = t.parentElement; break; } }
            const num = (e: Element | null) => Number((e?.textContent ?? "").trim());
            const tier = (card: string, t: string) => num(document.querySelector(`[data-im="card-${card}"] [data-tier="${t}"] [data-im="tier-n"]`)) || 0;
            return {
              cards: document.querySelectorAll('[data-im="summary"] .im-pop').length,
              firstTag: first?.tagName, firstFont: first ? getComputedStyle(first).fontFamily : "", firstText: first?.textContent,
              text: sheet.innerText,
              controls: [...sheet.querySelectorAll("button, a")].map((b) => (b as HTMLElement).innerText.trim()),
              primary: (document.querySelector('[data-im="primary"]') as HTMLElement).innerText.trim(),
              open: tier("agents", "fix") + tier("agents", "sharp") + tier("queries", "sharp"),
              fix: tier("agents", "fix"),
              steps: [...document.querySelectorAll('[data-im="steps"] [data-step]')].map((e) => e.getAttribute("data-step")),
              dots: [...document.querySelectorAll('[data-im="steps"] [data-step] i')].map((e) => e.textContent),
            };
          });
          record(page, "S2", fx, { ...r, text: undefined });
          expect(r.cards).toBe(2);
          expect(r.firstTag).toBe("H1");
          expect(r.firstFont).toContain("Special Elite");
          expect(r.firstText).toBe("We've read your file.");
          expect(r.text).not.toMatch(/top tip/i);
          expect(r.text).not.toMatch(/why sharpen/i);
          expect(r.controls.length, "the sheet has controls").toBeGreaterThan(0);
          expect(r.controls.filter((c) => /skip/i.test(c)), "no control named Skip in the sheet").toEqual([]);
          expect(r.primary).toBe(r.open === 0 ? "Bring it in" : "Let's work through it");
          expect(r.steps.includes("duplicates"), "Duplicates is a step only when sets exist").toBe(r.fix > 0);
          expect(r.dots).toEqual(r.steps.map((_, i) => String(i + 1)));
          if (SHOTS) await page.screenshot({ path: resolve(OUT, "shots", `overview-${fx}-${vp.width}.png`), fullPage: vp.width < 900 });
        });
      }
    });
  }
});
