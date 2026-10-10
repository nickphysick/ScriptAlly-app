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
  if (MUTATE === "V1") {
    /* Mount the old nav. */
    await page.evaluate(() => {
      const nav = document.createElement("nav");
      nav.innerHTML = '<img src="/scriptally-title-v2.png" alt="ScriptAlly" style="height:34px">';
      document.querySelector('[data-sf="scroll"]')?.prepend(nav);
    });
  }
  if (MUTATE === "V2") {
    /* Mount the guided walk's overlay on entry. */
    await page.evaluate(() => {
      const d = document.createElement("div");
      d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true");
      d.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(42,37,33,.5);display:grid;place-items:center";
      d.innerHTML = '<div style="background:#fff;padding:30px;border-radius:14px">One at a time</div>';
      document.querySelector("[data-setup-frame]")?.appendChild(d);
    });
  }
  if (MUTATE === "V6") {
    /* Leave on the first press: the confirm's own "Skip for now" is pressed for the writer. */
    await page.evaluate(() => {
      new MutationObserver(() => (document.querySelector('[data-im="ask-skip"]') as HTMLElement | null)?.click())
        .observe(document, { subtree: true, childList: true });
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

export async function lab(page: Page, q: string, opts: { reduced?: boolean; noMutate?: boolean } = {}) {
  if (opts.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/#/onb-lab?${q}`, { waitUntil: "load" });
  /* The lab reads its query once, at mount: a second visit that changes only the query needs a
     reload to take it. */
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("[data-setup-frame]", { timeout: 20_000 });
  await page.evaluate(() => (document as Document).fonts.ready);
  if (!opts.noMutate) await mutate(page);
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
  /* A lock that cannot find its subject fails in a minute, not seven. */
  test.setTimeout(90_000);
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

      /* ── the review: which lab query lands on which step ── */
      const STEPS: Array<{ step: "duplicates" | "agents" | "queries"; fx: string; path: string[]; firstQ: string; nQ: number; guide: string }> = [
        { step: "duplicates", fx: "dupes", path: [], firstQ: "What's a duplicate?", nQ: 4, guide: "Same agent, twice?" },
        { step: "agents", fx: "review", path: [], firstQ: "What does “needs a look” mean?", nQ: 5, guide: "Anything marked needs a quick look." },
        { step: "queries", fx: "review", path: ["agents"], firstQ: "What does “needs a look” mean?", nQ: 5, guide: "Dates drive your reminders." },
      ];
      const toStep = async (page: Page, t: (typeof STEPS)[number]) => {
        /* The break is applied once the step is reached: a break that covers the page would stop
           the walk to the step, and the test would wait out its timeout instead of going red. */
        await lab(page, `s=review&fx=${t.fx}`, { noMutate: true });
        await page.waitForSelector('[data-im="review"]');
        for (const _ of t.path) { await page.locator('[data-im="primary"]').click(); }
        await page.waitForSelector(`[data-im="review"][data-step="${t.step}"]`);
        await mutate(page);
      };

      /* ── V1 · the review's frame ─────────────────────────────────────────────────────────── */
      for (const t of STEPS) {
        test(`V1 review frame (${t.step})`, async ({ page }) => {
          await toStep(page, t);
          const r = await page.evaluate(() => {
            const frame = document.querySelector("[data-setup-frame]") as HTMLElement;
            const fonts = new Set<string>();
            frame.querySelectorAll<HTMLElement>("*").forEach((e) => { if (e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) fonts.add(getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim()); });
            const rail = document.querySelector('[data-im="rail"]') as HTMLElement;
            return {
              text: frame.innerText,
              oldArt: [...frame.querySelectorAll("img")].filter((i) => /scriptally/i.test(i.getAttribute("src") ?? "") || /scriptally/i.test(i.alt)).length,
              navs: frame.querySelectorAll("nav").length,
              fonts: [...fonts],
              head: getComputedStyle(document.querySelector('[data-im="list-head"]') as HTMLElement).backgroundColor,
              railKids: [...rail.children].map((c) => c.getAttribute("data-im")),
              guideHead: (rail.querySelector(".im-guideh") as HTMLElement).innerText,
              eyebrow: (rail.querySelector(".im-eyebrow") as HTMLElement).innerText,
              questions: [...rail.querySelectorAll('[data-im="faq-q"]')].map((b) => (b as HTMLElement).innerText.replace(/\s*\+$/, "").trim()),
              qHead: (rail.querySelector(".im-faqh") as HTMLElement).innerText,
              stepperIsControl: document.querySelectorAll('[data-im="steps"] button, [data-im="steps"] a').length,
            };
          });
          record(page, "V1", t.step, { ...r, text: undefined });
          expect(r.fonts.length, "the sweep read text").toBeGreaterThan(2);
          expect(r.text).not.toMatch(/ScriptAlly/);
          expect(r.oldArt, "no old wordmark").toBe(0);
          expect(r.navs, "no nav inside the frame").toBe(0);
          expect(r.fonts.filter((f) => /caveat/i.test(f)), "no Caveat face").toEqual([]);
          expect(r.head).toBe("rgb(27, 36, 51)");
          expect(r.railKids).toEqual(["guide", "questions"]);
          expect(r.eyebrow.toLowerCase()).toBe("how this step works");
          expect(r.guideHead).toBe(t.guide);
          expect(r.qHead).toBe("Questions");
          expect(r.questions.length).toBe(t.nQ);
          expect(r.questions[0]).toBe(t.firstQ);
          expect(r.stepperIsControl, "the stepper is not a control").toBe(0);
          if (SHOTS) await page.screenshot({ path: resolve(OUT, "shots", `review-${t.step}-${vp.width}.png`), fullPage: vp.width < 900 });
        });
      }

      /* ── V2 · no walk ─────────────────────────────────────────────────────────────────────── */
      for (const t of STEPS) {
        test(`V2 no walk on entry (${t.step})`, async ({ page }) => {
          await toStep(page, t);
          await page.waitForTimeout(900); /* the old intro arrived after a beat */
          const r = await page.evaluate(() => {
            const dialogs = document.querySelectorAll('[role="dialog"]').length;
            const rows = document.querySelector('[data-im="rows"]') as HTMLElement;
            const target = rows.querySelector("button") as HTMLElement | null;
            let reachable = false;
            if (target) {
              target.scrollIntoView({ block: "center" });
              const b = target.getBoundingClientRect();
              const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
              reachable = !!hit && (hit === target || target.contains(hit));
            }
            return { dialogs, hasControl: !!target, reachable, text: (document.querySelector("[data-setup-frame]") as HTMLElement).innerText };
          });
          record(page, "V2", t.step, { dialogs: r.dialogs, hasControl: r.hasControl, reachable: r.reachable });
          expect(r.hasControl, "the list has a control to reach").toBe(true);
          expect(r.dialogs, "entering a step opens no dialog").toBe(0);
          expect(await fixedOverFrame(page), "nothing is laid over the frame").toEqual([]);
          expect(r.reachable, "the list is interactive at once").toBe(true);
          expect(r.text).not.toMatch(/all sorted\b(?!\.)/i);
          expect(r.text).not.toMatch(/let's (do it|go)/i);
        });
      }

      /* ── V6 · leaving asks ───────────────────────────────────────────────────────────────── */
      for (const q of ["s=overview&fx=review", "s=review&fx=dupes", "s=review&fx=review"]) {
        test(`V6 leaving asks first (${q})`, async ({ page }) => {
          await lab(page, q);
          const calls = () => page.evaluate(() => (window.__onbLab?.calls ?? []).map((c) => c.name));
          const exit = page.locator('[data-sf="exit"]');
          await expect(exit).toBeVisible();
          await exit.click();
          await page.waitForTimeout(150);
          const afterFirst = await calls();
          record(page, "V6", `${q} afterFirstPress`, afterFirst);
          expect(afterFirst.filter((c) => c === "skip" || c === "exit"), "nothing leaves on the first press").toEqual([]);
          const ask = page.locator('[data-im="ask"]');
          await expect(ask).toBeVisible();
          const words = await ask.innerText();
          expect(words).toContain("Skip set-up for now?");
          expect(words).toContain("Nothing from this file has been saved yet");
          await page.keyboard.press("Escape");
          await expect(ask).toHaveCount(0);
          expect((await calls()).filter((c) => c === "skip")).toEqual([]);
          /* a press outside closes it too */
          await exit.click();
          await page.locator('[data-im="ask-dim"]').click({ position: { x: 6, y: 6 } });
          await expect(ask).toHaveCount(0);
          expect((await calls()).filter((c) => c === "skip")).toEqual([]);
          /* "Keep setting up" closes; "Skip for now" leaves, once */
          await exit.click();
          await page.locator('[data-im="ask-keep"]').click();
          await expect(ask).toHaveCount(0);
          await exit.click();
          await page.locator('[data-im="ask-skip"]').click();
          expect((await calls()).filter((c) => c === "skip").length, "the confirm's Skip for now leaves, once").toBe(1);
        });
      }
    });
  }
});
