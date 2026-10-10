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
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn } from "./measure";

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
  R2: ".sf .im-bare{position:fixed!important;inset:0!important;z-index:50!important;background:#f2eee8}",
  R4: ".sf .im-sc-tick{background:#e9ede6!important;color:#5a6e58!important}.sf .im-ldrcard.is-done .im-ldrdisc{background:#e6ebe3!important;color:#5a6e58!important}",
  H2: ".sf .im-ghost .d58-body{grid-template-columns:1fr 1fr 1fr!important}",
  N3: ".d58-notice{height:120px!important}",
  T1: ".sf .im-list, .sf .im-pop, .sf .im-ldrcard, .sf .im-ssl-bar{background:var(--im-nope)}",
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
  if (MUTATE === "V3") {
    /* Scroll to the next open row whenever a row is answered. */
    await page.evaluate(() => {
      let open = document.querySelectorAll('[data-asks="1"]').length;
      new MutationObserver(() => {
        const now = document.querySelectorAll('[data-asks="1"]');
        if (now.length < open) (now[0] as HTMLElement | undefined)?.scrollIntoView({ block: "start" });
        open = now.length;
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
  }
  if (MUTATE === "V4b") {
    /* Drop the saved agency: "Save agency" does nothing. (V4's named break — dropping agencyWaived —
       cannot redden V4: waiving an agency writes nothing into the result, so the baseline's result
       is the same with or without it. It reddens V3, which watches the row settle.) */
    await page.evaluate(() => {
      document.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest("button");
        if (b && b.textContent?.trim() === "Save agency") { e.stopImmediatePropagation(); e.preventDefault(); }
      }, true);
    });
  }
  if (MUTATE === "V4") {
    /* Drop agencyWaived from the agency fix: "Carry on without an agency" does nothing. */
    await page.evaluate(() => {
      document.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest("button");
        if (b && b.textContent?.trim() === "Carry on without an agency") { e.stopImmediatePropagation(); e.preventDefault(); }
      }, true);
    });
  }
  if (MUTATE === "V5") {
    /* Reset skips removed rows: with anything set aside, Reset is swallowed. */
    await page.evaluate(() => {
      document.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest('[data-im="reset"]');
        if (b && document.querySelector('[data-im="tray"]')) { e.stopImmediatePropagation(); e.preventDefault(); }
      }, true);
    });
  }
  if (MUTATE === "N2") {
    /* Show the second sentence always. */
    await page.evaluate(() => {
      const fix = () => document.querySelectorAll(".d58-noticetext").forEach((p) => {
        if (!/no agent or agency name/.test(p.textContent ?? "")) p.append(" They had no agent or agency name.");
      });
      new MutationObserver(fix).observe(document, { subtree: true, childList: true });
      fix();
    });
  }
  if (MUTATE === "H1") {
    /* Route onProceed to the old closing page: it is drawn over the sheet when the import completes. */
    await page.evaluate(() => {
      new MutationObserver(() => {
        if (!document.querySelector('[data-lab-flow="arrived"]') || document.querySelector("[data-old-done]")) return;
        const d = document.createElement("div"); d.setAttribute("data-old-done", "1");
        d.innerHTML = "<h1>That's everything captured</h1>";
        document.querySelector('[data-sf="scroll"]')?.prepend(d);
      }).observe(document, { subtree: true, childList: true, attributes: true });
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

      /* ── V3 · rows answer in place ───────────────────────────────────────────────────────── */
      test("V3 every open row is answered in its own row", async ({ page }) => {
        const row = (id: string) => page.locator(`[data-row-id="${id}"]`);
        const head = () => page.evaluate(() => ({
          ready: Number((document.querySelector('[data-im="chip-ready"]')?.textContent ?? "").replace(/\D/g, "")),
          open: Number((document.querySelector('[data-im="chip-open"]')?.textContent ?? "0").replace(/\D/g, "")),
        }));
        const state = (id: string) => page.evaluate((id) => {
          const r = document.querySelector(`[data-row-id="${id}"]`) as HTMLElement;
          const list = [...document.querySelectorAll('[data-im="rows"] > [data-row-id]')];
          const b = r.getBoundingClientRect();
          const controls = [...r.querySelectorAll('[data-im="row-fix"] button, [data-im="row-fix"] input, [data-im="row-fix"] select')] as HTMLElement[];
          const inside = controls.every((c) => { const cb = c.getBoundingClientRect(); return cb.top >= b.top - 0.5 && cb.bottom <= b.bottom + 0.5 && cb.left >= b.left - 0.5 && cb.right <= b.right + 0.5; });
          return {
            index: list.indexOf(r), top: Math.round(b.top), asks: r.getAttribute("data-asks"),
            /* textContent, not innerText: the chip is drawn upper-case by CSS, and the words are the claim */
            chip: ((r.querySelector('[data-im="row-chip"]') as HTMLElement).textContent ?? "").trim(),
            edge: getComputedStyle(r).boxShadow, controls: controls.length, inside,
          };
        }, id);
        const tally: Record<string, number> = {};
        let moved = 0; let held = 0;
        /** Answer one row and assert it settled where it stood. */
        const answer = async (id: string, code: string, act: () => Promise<void>, moreOpen = false) => {
          await row(id).scrollIntoViewIfNeeded();
          const before = await state(id); const h0 = await head();
          expect(before.asks, `${id} asks`).toBe("1");
          expect(before.controls, `${id}: the question's controls are in the row`).toBeGreaterThan(0);
          expect(before.inside, `${id}: every control sits inside the row's box`).toBe(true);
          expect(before.chip.toLowerCase(), `${id}: the chip is the reason's own label`).not.toBe("ready");
          expect(before.edge, `${id}: the rust edge`).toContain("rgb(162, 69, 42)");
          await act();
          await page.waitForTimeout(120);
          const after = await state(id); const h1 = await head();
          tally[code] = (tally[code] ?? 0) + 1;
          record(page, "V3", `${id} ${code}`, { before, after, h0, h1 });
          expect(after.index, `${id}: the same row, in the same place in the list`).toBe(before.index);
          /* The reader is not moved — unless the sheet has nothing left below to hold the row where it
             was (the last row's panel closing shortens the page, and the scroller ends at its end). */
          const atEnd = await page.evaluate(() => {
            const sc = document.querySelector('[data-sf="scroll"]') as HTMLElement;
            const own = sc.scrollHeight > sc.clientHeight + 1;
            const el = own ? sc : document.scrollingElement!;
            return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
          });
          if (!atEnd) held += 1;
          if (!atEnd) expect(Math.abs(after.top - before.top), `${id}: the reader is not moved`).toBeLessThanOrEqual(2);
          else record(page, "V3", `${id} at the sheet's end`, { moved: after.top - before.top });
          if (!moreOpen) {
            expect(after.asks).toBe("0");
            expect(after.chip).toBe("Ready");
            expect(after.edge).not.toContain("rgb(162, 69, 42)");
            expect(h1.ready, `${id}: the head's ready chip moved by one`).toBe(h0.ready + 1);
            expect(h1.open, `${id}: the head's open chip moved by one`).toBe(h0.open - 1);
          moved += 1;
          } else {
            expect(after.asks, `${id}: still asks its second question`).toBe("1");
            expect(h1).toEqual(h0);
          }
        };
        await lab(page, "s=review&fx=review");
        await page.waitForSelector('[data-im="review"][data-step="agents"]');
        await answer("a8", "agent-needs-agency:saved", async () => { await row("a8").getByLabel("Agency name").fill("Hale House"); await row("a8").getByRole("button", { name: "Save agency" }).click(); });
        await answer("a9", "agent-needs-agency:waived", async () => { await row("a9").getByRole("button", { name: "Carry on without an agency" }).click(); });
        await answer("a10", "agent-mapping", async () => { await row("a10").getByRole("button", { name: "Mark as checked" }).click(); });
        await page.locator('[data-im="primary"]').click();
        await page.waitForSelector('[data-im="review"][data-step="queries"]');
        await answer("q1", "two-dates", async () => { await row("q1").getByRole("button", { name: "Yes, that's right" }).click(); });
        await answer("q2", "status-direction", async () => { await row("q2").getByRole("button", { name: /I sent the full/ }).click(); });
        await answer("q3", "missing-day", async () => { await row("q3").getByRole("button", { name: "Keep as month" }).click(); });
        await answer("q4", "serial-outlier", async () => { await row("q4").getByRole("button", { name: "Leave undated" }).click(); });
        await answer("q5", "no-date", async () => { await row("q5").getByLabel("Date sent").fill("2024-06-01"); await row("q5").getByRole("button", { name: "Save date" }).click(); });
        await answer("q6", "status-wording", async () => { await row("q6").getByLabel("Query status").selectOption("Partial Sent"); await row("q6").getByRole("button", { name: "That's right" }).click(); });
        /* a row with two reasons: the first answer leaves it asking the second */
        await answer("q11", "no-date", async () => { await row("q11").getByRole("button", { name: "Leave undated" }).click(); }, true);
        await answer("q11", "status-wording", async () => { await row("q11").getByRole("button", { name: "That's right" }).click(); });
        record(page, "V3", "tally", { ...tally, rowsSettled: moved, positionsHeld: held });
        expect(held, "the reader's place was checked on rows with page left below them").toBeGreaterThan(5);
        for (const code of ["agent-needs-agency:saved", "agent-needs-agency:waived", "agent-mapping", "two-dates", "missing-day", "serial-outlier", "no-date", "status-direction", "status-wording"]) {
          expect(tally[code] ?? 0, `the ${code} branch was entered`).toBeGreaterThan(0);
        }
      });

      /* ── V5 · undo, restore and reset ────────────────────────────────────────────────────── */
      test("V5 undo, restore and reset", async ({ page }) => {
        await lab(page, "s=review&fx=review");
        await page.waitForSelector('[data-im="review"][data-step="agents"]');
        const ids = () => page.evaluate(() => [...document.querySelectorAll('[data-im="rows"] > [data-row-id]')].map((r) => r.getAttribute("data-row-id")));
        const chips = () => page.evaluate(() => [document.querySelector('[data-im="chip-ready"]')?.textContent, document.querySelector('[data-im="chip-open"]')?.textContent ?? null]);
        const first = await ids(); const chips0 = await chips();
        expect(first.length, "there are rows").toBeGreaterThan(5);
        /* remove, Undo: back in its place */
        await page.locator('[data-row-id="a3"] [data-im="row-remove"]').click();
        expect(await ids()).not.toContain("a3");
        await expect(page.locator('[data-im="toast"]')).toContainText("set aside");
        await page.locator('[data-im="toast-undo"]').click();
        expect(await ids(), "Undo puts the row back in its place").toEqual(first);
        /* remove, restore from the tray: back */
        await page.locator('[data-row-id="a4"] [data-im="row-remove"]').click();
        expect(await ids()).not.toContain("a4");
        await page.locator('[data-im="tray-head"]').click();
        await page.locator('[data-tray-id="a4"] [data-im="tray-restore"]').click();
        expect(await ids(), "the tray's Restore puts the row back in its place").toEqual(first);
        /* answer two rows and remove one, then Reset: every chip count is its first value */
        await page.locator('[data-row-id="a9"]').getByRole("button", { name: "Carry on without an agency" }).click();
        await page.locator('[data-row-id="a10"]').getByRole("button", { name: "Mark as checked" }).click();
        await page.locator('[data-row-id="a2"] [data-im="row-remove"]').click();
        expect(await chips(), "the changes moved the chips").not.toEqual(chips0);
        await page.locator('[data-im="reset"]').click();
        record(page, "V5", "afterReset", { ids: await ids(), chips: await chips(), chips0 });
        expect(await chips(), "Reset returns every chip count to its first value").toEqual(chips0);
        expect(await ids()).toEqual(first);
      });

      /* ── V4 · the same results (functional; one width) ───────────────────────────────────── */
      if (vp.width === 1440) {
        const snap = (f: string) => JSON.parse(readFileSync(resolve("tests/e2e/fixtures/onbV5Import", f), "utf8"));
        const result = (page: Page) => page.evaluate(() => (window as unknown as { __onbLab?: { result?: unknown } }).__onbLab?.result ?? null);
        test("V4 same result as the baseline (review fixture)", async ({ page }) => {
          const row = (id: string) => page.locator(`[data-row-id="${id}"]`);
          await lab(page, "s=review&fx=review");
          await page.waitForSelector('[data-im="review"][data-step="agents"]');
          await row("a1").getByTitle("Don't import").click();                                   // one removal
          await row("a8").getByLabel("Agency name").fill("Hale House");                         // agency saved
          await row("a8").getByRole("button", { name: "Save agency" }).click();
          await row("a9").getByRole("button", { name: "Carry on without an agency" }).click();  // agency waived
          await row("a10").getByRole("button", { name: "Mark as checked" }).click();            // mapping reason
          await page.getByRole("button", { name: /^Continue/ }).click();
          await page.waitForSelector('[data-im="review"][data-step="queries"]');
          await row("q1").getByRole("button", { name: "Yes, that's right" }).click();           // two-dates
          await row("q2").getByRole("button", { name: /I sent the full/ }).click();              // status-direction
          await row("q3").getByRole("button", { name: "Keep as month" }).click();                // missing-day
          await row("q4").getByRole("button", { name: "Leave undated" }).click();                // serial-outlier
          await row("q5").getByLabel("Date sent").fill("2024-06-01");                            // no-date
          await row("q5").getByRole("button", { name: "Save date" }).click();
          await row("q6").getByLabel("Query status").selectOption("Partial Sent");               // status-wording
          await row("q6").getByRole("button", { name: "That's right" }).click();
          await row("q11").getByRole("button", { name: "Leave undated" }).click();               // two reasons, both
          await row("q11").getByRole("button", { name: "That's right" }).click();
          await page.getByRole("button", { name: /^Import/ }).click();
          const got = await result(page);
          expect(got, "onImport was handed a result").toBeTruthy();
          record(page, "V4", "review", { agents: (got as { agents: unknown[] }).agents.length, queries: (got as { queries: unknown[] }).queries.length });
          expect(got).toEqual(snap("v4-review.json"));
        });
        test("V4 same result as the baseline (duplicates fixture)", async ({ page }) => {
          await lab(page, "s=review&fx=dupes");
          await page.waitForSelector('[data-im="review"][data-step="duplicates"]');
          await page.getByRole("button", { name: "Remove this one" }).nth(1).click();           // one merge: J. Carter
          const right = page.locator('[data-im="reconcile-right"]');
          await expect(right).toHaveCount(3);
          await right.first().click();                                                            // Carter pair: looks right
          await right.first().click();                                                            // Beth pair: looks right
          await page.getByRole("button", { name: /These are actually different submissions/ }).first().click();
          await page.getByRole("button", { name: "Keep both", exact: true }).first().click();   // Priya pair: split
          await page.getByRole("button", { name: "They're different — keep both" }).first().click(); // Finch pair: keep both
          await page.getByRole("button", { name: /^Review all agents/ }).click();
          await page.getByRole("button", { name: /^Continue/ }).click();
          await page.getByRole("button", { name: /^Import/ }).click();
          const got = await result(page);
          expect(got, "onImport was handed a result").toBeTruthy();
          record(page, "V4", "dupes", { agents: (got as { agents: unknown[] }).agents.length, queries: (got as { queries: unknown[] }).queries.length });
          expect(got).toEqual(snap("v4-dupes.json"));
        });
      }

      /* ── R2 + R4 · the importing loader ──────────────────────────────────────────────────── */
      test("R2 importing loader sits in the frame's sheet", async ({ page }) => {
        await lab(page, "s=importing");
        await page.waitForSelector('[data-im="loader-card"]');
        const sheet = await box(page, '[data-sf="sheet"]');
        const loader = await box(page, '[data-im="importing"]');
        const card = await box(page, '[data-im="loader-card"]');
        record(page, "R2", "importing", { sheet, loader, card });
        expect(sheet && loader && card).toBeTruthy();
        for (const b of [loader!, card!]) {
          expect(b.x).toBeGreaterThanOrEqual(sheet!.x - 0.5); expect(b.y).toBeGreaterThanOrEqual(sheet!.y - 0.5);
          expect(b.r).toBeLessThanOrEqual(sheet!.r + 0.5); expect(b.b).toBeLessThanOrEqual(sheet!.b + 0.5);
        }
        expect(await fixedOverFrame(page), "nothing fixed is drawn over the frame").toEqual([]);
        const exit = await page.evaluate(() => { const e = document.querySelector('[data-sf="exit"]') as HTMLElement | null; return e ? getComputedStyle(e).visibility : "absent"; });
        expect(["hidden", "absent"]).toContain(exit);
        if (vp.width >= 900) expect((await box(page, '[data-sf="panel"]'))!.w).toBeGreaterThan(200);
        if (vp.width === 1440) expect(Math.round(card!.w), "the card is 421 wide").toBe(421);
        if (SHOTS) { mkdirSync(resolve(OUT, "shots"), { recursive: true }); await page.screenshot({ path: resolve(OUT, "shots", `importing-${vp.width}.png`) }); }
      });
      test("R4 importing loader's finished disc is navy, and nothing is sage", async ({ page }) => {
        await lab(page, "s=importing&done=1");
        await page.waitForSelector('[data-im="loader-card"].is-done');
        await page.waitForTimeout(520); /* past the disc's colour transition, before the card lifts away */
        const disc = await page.evaluate(() => { const d = document.querySelector('[data-im="loader-disc"]') as HTMLElement; const cs = getComputedStyle(d); return { bg: cs.backgroundColor, ink: cs.color }; });
        record(page, "R4", "importingDisc", disc);
        expect(disc.bg).toBe("rgb(42, 58, 82)");
        const sage = await sageIn(page, '[data-im="loader-card"]');
        record(page, "R4", "importingSage", sage);
        expect(sage.population).toBeGreaterThan(5);
        expect(sage.hits).toEqual([]);
        const text = await page.locator('[data-im="loader-card"]').innerText();
        expect(text).toContain("You're all set");
        expect(text).toContain("Opening your dashboard…");
      });

      /* ── H1 · no closing page: the import ends on the dashboard ──────────────────────────── */
      test("H1 the import hands over to the dashboard", async ({ page }) => {
        await lab(page, "s=flow&fx=clear&floor=300");
        await page.waitForSelector('[data-im="summary"]');
        await page.locator('[data-im="primary"]').click();                 // Bring it in → the review
        await page.locator('[data-im="primary"]').click();                 // agents → queries
        await page.waitForSelector('[data-im="review"][data-step="queries"]');
        await page.locator('[data-im="primary"]').click();                 // Import and get started
        await page.waitForSelector('[data-im="importing"]');
        await page.waitForSelector('[data-lab-flow="arrived"]', { timeout: 20_000 });
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => ({
          text: (document.querySelector("[data-setup-frame]") as HTMLElement).innerText,
          calls: (window.__onbLab?.calls ?? []).filter((c) => c.name === "importComplete"),
          tab: (document.querySelector(".ws-ftab") as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
          ghost: !!document.querySelector('[data-im="ghost"] [data-d58="page"]'),
        }));
        record(page, "H1", "arrival", { calls: r.calls, tab: r.tab, ghost: r.ghost });
        expect(r.text).not.toMatch(/that's everything captured/i);
        expect(r.text).not.toMatch(/brought across/i);
        expect(r.calls.length, "onImportComplete is called once").toBe(1);
        expect(r.calls[0].arg).toBe("dashboard");
        expect(r.ghost, "what is on screen is the dashboard's page").toBe(true);
        if (vp.width >= 768) expect(r.tab.toLowerCase()).toContain("dashboard");
      });
      test("H1 nothing imported still shows its own card", async ({ page }) => {
        await lab(page, "s=flow&fx=clear&floor=300&none=1");
        await page.locator('[data-im="primary"]').click();
        await page.locator('[data-im="primary"]').click();
        await page.waitForSelector('[data-im="review"][data-step="queries"]');
        await page.locator('[data-im="primary"]').click();
        await page.waitForSelector('[data-screen="nothing"], [data-dead="nothing"], .sf-card', { timeout: 20_000 });
        await page.waitForFunction(() => !document.querySelector('[data-im="importing"]'), null, { timeout: 20_000 });
        const calls = await page.evaluate(() => (window.__onbLab?.calls ?? []).filter((c) => c.name === "importComplete").length);
        expect(calls, "a commit that imported nothing does not hand over").toBe(0);
      });

      /* ── H2 · seamless: the frame's last frame is the app's first ────────────────────────── */
      if (vp.width >= 1280) {
        test("H2 the loader's last frame matches the dashboard's first", async ({ page }) => {
          /* SIGNED IN, as the harness account: the app side of this is the real /dashboard, held in
             its own loading state by the dashboard's dev aid. Both sides run in one browser context,
             so they read the same remembered loading shape, as they do on a writer's device. */
          await page.addInitScript(() => { (window as unknown as { __SA_DASH_HOLD_MS: number }).__SA_DASH_HOLD_MS = 120_000; });
          await page.goto("/dashboard");
          await ensureSignedIn(page);
          await page.goto("/dashboard", { waitUntil: "load" });
          await page.waitForSelector('[data-d58="page"][data-loading="1"]', { timeout: 30_000 });
          await page.evaluate(() => (document as Document).fonts.ready);
          await page.waitForTimeout(600);
          const read = (root: string) => page.evaluate((root) => {
            const b = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
            const host = document.querySelector(root)!;
            const ghost: Record<string, unknown> = {};
            host.querySelectorAll("[data-d58]").forEach((e) => { const k = e.getAttribute("data-d58")!; if (!(k in ghost)) ghost[k] = b(e); });
            return {
              sidebar: b(document.querySelector(".ws-panel")), mark: b(document.querySelector(".ws-bmark")),
              tab: b(document.querySelector(".ws-ftab")), sheet: b(document.querySelector(".ws-window")), page: ghost,
            };
          }, root);
          const app = await read("body");
          await lab(page, "s=importing&done=1&handoff=1", { noMutate: true });
          await page.waitForSelector('[data-im="importing"][data-im-state="lifting"]', { timeout: 10_000 });
          await page.waitForTimeout(900); /* the 700ms hand-off has finished */
          await mutate(page);
          await page.waitForTimeout(150);
          const frame = await read('[data-im="ghost"]');
          record(page, "H2", "app", app); record(page, "H2", "frame", frame);
          const near = (a: { x: number; y: number; w: number; h: number } | null, b: typeof a, what: string) => {
            expect(a && b, `${what} is drawn on both`).toBeTruthy();
            for (const k of ["x", "y", "w", "h"] as const) expect(Math.abs(a![k] - b![k]), `${what}.${k}: frame ${a![k]} vs app ${b![k]}`).toBeLessThanOrEqual(1);
          };
          near(frame.sidebar, app.sidebar, "sidebar");
          near(frame.mark, app.mark, "brand mark");
          near(frame.tab, app.tab, "tab");
          near(frame.sheet, app.sheet, "sheet");
          /* "tab" is the dashboard's floating feed tab. The ghost does not draw it (it floats over the
             page, and the app's own arrives with the app), so it is not one of the page's boxes here. */
          const keys = Object.keys(app.page).filter((k) => k !== "tab");
          expect(keys.length, "the dashboard's loading page has named boxes").toBeGreaterThan(3);
          for (const k of keys) near((frame.page as Record<string, never>)[k], (app.page as Record<string, never>)[k], `page box "${k}"`);
        });
      }
    });
  }

  /* ── T1 · tokens resolve, and no primary is rust or burgundy ─────────────────────────────── */
  test.describe("T1", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    const SCREENS: Array<{ id: string; q: string; steps?: number }> = [
      { id: "reading", q: "s=reading&hold=work" }, { id: "importing", q: "s=importing" },
      { id: "overview", q: "s=overview&fx=review" }, { id: "dupes", q: "s=review&fx=dupes" },
      { id: "agents", q: "s=review&fx=review" }, { id: "queries", q: "s=review&fx=review", steps: 1 },
    ];
    for (const sc of SCREENS) {
      test(`T1 every token the import's rules read resolves (${sc.id})`, async ({ page }) => {
        await lab(page, sc.q, { noMutate: true });
        for (let i = 0; i < (sc.steps ?? 0); i++) await page.locator('[data-im="primary"]').click();
        await page.waitForTimeout(400);
        await mutate(page);
        const r = await page.evaluate(() => {
          const unresolved: string[] = []; let rules = 0; let reads = 0; let matched = 0;
          const walk = (list: CSSRuleList) => {
            for (const rule of Array.from(list)) {
              if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) { if (!(rule instanceof CSSMediaRule) || matchMedia(rule.conditionText).matches) walk(rule.cssRules); continue; }
              if (!(rule instanceof CSSStyleRule)) continue;
              if (!/\.im-|\.sf-strip|\.sf-navzone|\.sf-appnav|\.sf-stepsbox/.test(rule.selectorText)) continue;
              rules += 1;
              const names = new Set<string>();
              for (const m of rule.style.cssText.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) if (!m[2]) names.add(m[1]);
              if (names.size === 0) continue;
              let els: Element[] = [];
              try { els = Array.from(document.querySelectorAll(rule.selectorText.replace(/::?[\w-]+(\([^)]*\))?/g, (p) => (/^::|^:(before|after|hover|focus|focus-visible|first-child|last-child)/.test(p) ? "" : p)))); } catch { els = []; }
              if (els.length === 0) continue;
              matched += 1;
              for (const n of names) { reads += 1; if (!getComputedStyle(els[0]).getPropertyValue(n).trim()) unresolved.push(`${rule.selectorText} reads ${n}`); }
            }
          };
          for (const sheet of Array.from(document.styleSheets)) { try { walk(sheet.cssRules); } catch { /* a cross-origin sheet */ } }
          const primaries = Array.from(document.querySelectorAll(".sf .sf-btn")).map((b) => getComputedStyle(b).backgroundColor);
          return { rules, matched, reads, unresolved: [...new Set(unresolved)], primaries };
        });
        record(page, "T1", sc.id, r);
        expect(r.rules, "the import's rules were found").toBeGreaterThan(50);
        expect(r.reads, "rules on this screen read tokens").toBeGreaterThan(5);
        expect(r.unresolved).toEqual([]);
        for (const bg of r.primaries) { expect(bg).not.toBe("rgb(162, 69, 42)"); expect(bg).not.toBe("rgb(124, 58, 42)"); }
        if (sc.id !== "reading" && sc.id !== "importing") expect(r.primaries.length, "the screen has a primary").toBeGreaterThan(0);
      });
    }
  });

  /* ════ The dashboard's skipped-rows line. SIGNED IN, as the harness account: the notice is kept on
     the device under the account's own id, so these put one in this browser's storage, read the real
     /dashboard, and take it out again. Nothing is written to the account. ════ */
  const NO_NAME = "Row has no agent name or agency to identify it";
  const row = (reason: string, who = "", status = "Queried", sentDate: string | null = null) => ({ who, status, sentDate, reason });
  /** The signed-in account's id, from Firebase's own session store. */
  const uidOf = (page: Page) => page.evaluate(() => new Promise<string>((res) => {
    const open = indexedDB.open("firebaseLocalStorageDb");
    open.onerror = () => res("");
    open.onsuccess = () => {
      try {
        const get = open.result.transaction("firebaseLocalStorage", "readonly").objectStore("firebaseLocalStorage").getAll();
        get.onsuccess = () => res(((get.result as Array<{ value?: { uid?: string } }>).find((r) => r.value?.uid)?.value?.uid) ?? "");
        get.onerror = () => res("");
      } catch { res(""); }
    };
  }));
  const dash = async (page: Page, notice: unknown | null) => {
    await page.goto("/dashboard");
    await ensureSignedIn(page);
    const uid = await uidOf(page);
    expect(uid, "the harness account is signed in").toBeTruthy();
    await page.evaluate(({ uid, notice }) => {
      const k = `sa.importSkipped.${uid}`;
      if (notice) localStorage.setItem(k, JSON.stringify(notice)); else localStorage.removeItem(k);
    }, { uid, notice });
    await page.goto("/dashboard", { waitUntil: "load" });
    await page.waitForSelector('[data-d58="page"][data-loading="0"]', { timeout: 40_000 });
    await page.evaluate(() => (document as Document).fonts.ready);
    await page.waitForTimeout(500);
    await mutate(page);
    return uid;
  };
  const clear = (page: Page, uid: string) => page.evaluate((uid) => localStorage.removeItem(`sa.importSkipped.${uid}`), uid);
  const visibleNotice = (page: Page) => page.locator('[data-d58="notice"]:visible');

  test.describe("the dashboard's skipped-rows line", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("N2 one no-name row: the line, its row, and Dismiss", async ({ page }) => {
      const uid = await dash(page, { count: 1, rows: [row(NO_NAME, "", "Rejected", "2026-06-01")], at: 1 });
      try {
        const line = visibleNotice(page);
        await expect(line).toHaveCount(1);
        const text = ((await line.locator(".d58-noticetext").textContent()) ?? "").replace(/\s+/g, " ").trim();
        record(page, "N2", "oneRow", text);
        expect(text).toBe("1 row from your file wasn't imported. It had no agent or agency name.");
        expect(await line.getAttribute("role")).toBe("status");
        const first = await page.evaluate(() => { const p = [...document.querySelectorAll('[data-d58="page"]')].find((e) => (e as HTMLElement).offsetParent !== null)!; return p.firstElementChild?.getAttribute("data-d58"); });
        expect(first, "the line is the first thing on the page, above the header").toBe("notice");
        const toggle = line.locator('[data-d58="notice-toggle"]');
        expect(((await toggle.textContent()) ?? "").trim()).toBe("Show the row");
        await toggle.click();
        expect(((await toggle.textContent()) ?? "").trim()).toBe("Hide the row");
        const rows = await line.locator('[data-d58="notice-row"]').allInnerTexts();
        record(page, "N2", "rows", rows);
        expect(rows.length, "exactly the stored rows").toBe(1);
        expect(rows[0]).toContain("Rejected · 1 Jun 2026");
        expect(rows[0]).toContain(NO_NAME);
        await line.locator('[data-d58="notice-dismiss"]').click();
        await expect(visibleNotice(page)).toHaveCount(0);
        expect(await page.evaluate((uid) => localStorage.getItem(`sa.importSkipped.${uid}`), uid), "Dismiss removes the key").toBeNull();
        await page.reload({ waitUntil: "load" });
        await page.waitForSelector('[data-d58="page"][data-loading="0"]', { timeout: 40_000 });
        await expect(visibleNotice(page), "it does not come back").toHaveCount(0);
      } finally { await clear(page, uid); }
    });

    test("N2 two rows with different reasons: the count alone", async ({ page }) => {
      const uid = await dash(page, { count: 2, rows: [row(NO_NAME), row("Skipped a Queried query — its agent couldn't be saved.", "", "Queried")], at: 1 });
      try {
        const line = visibleNotice(page);
        const text = ((await line.locator(".d58-noticetext").textContent()) ?? "").replace(/\s+/g, " ").trim();
        record(page, "N2", "mixed", text);
        expect(text).toBe("2 rows from your file weren't imported.");
        await line.locator('[data-d58="notice-toggle"]').click();
        expect(await line.locator('[data-d58="notice-row"]').count()).toBe(2);
        expect(((await line.locator('[data-d58="notice-toggle"]').textContent()) ?? "").trim()).toBe("Hide the rows");
        /* an undated row says so */
        expect((await line.locator('[data-d58="notice-row"]').first().innerText())).toContain("Undated");
      } finally { await clear(page, uid); }
    });

    test("N2 no stored notice: the dashboard's first element is its header", async ({ page }) => {
      const uid = await dash(page, null);
      try {
        await expect(visibleNotice(page)).toHaveCount(0);
        const first = await page.evaluate(() => { const p = [...document.querySelectorAll('[data-d58="page"]')].find((e) => (e as HTMLElement).offsetParent !== null)!; return p.firstElementChild?.getAttribute("data-d58"); });
        record(page, "N2", "firstWithoutNotice", first);
        expect(first).toBe("header");
      } finally { await clear(page, uid); }
    });
  });

  /* N3 · one screen with the line showing, at the two smallest windows DB58 F1 holds at. */
  for (const vp of [{ width: 1366, height: 650 }, { width: 1280, height: 680 }, { width: 1440, height: 900 }]) {
    test.describe(`N3 ${vp.width}x${vp.height}`, () => {
      test.use({ viewport: vp });
      test("N3 one screen with the line showing, and the chart above its floor", async ({ page }) => {
        const uid = await dash(page, { count: 1, rows: [row(NO_NAME)], at: 1 });
        try {
          await expect(visibleNotice(page)).toHaveCount(1);
          const read = () => page.evaluate(() => {
            const vis = (sel: string) => [...document.querySelectorAll(sel)].find((e) => (e as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
            const sc = vis(".ws-wbody")!; const plot = vis('[data-d58="active"] .os-acplot');
            return { sh: sc.scrollHeight, ch: sc.clientHeight, plot: plot ? Math.round(plot.getBoundingClientRect().height) : -1, notice: Math.round(vis('[data-d58="notice"]')!.getBoundingClientRect().height) };
          });
          const closed = await read();
          record(page, "N3", "closed", closed);
          expect(closed.plot, "the chart is drawn").toBeGreaterThan(0);
          expect(closed.sh, `the page does not scroll: ${closed.sh} against ${closed.ch}`).toBeLessThanOrEqual(closed.ch + 1);
          expect(closed.plot, "the chart is at or above its 120px floor").toBeGreaterThanOrEqual(120);
          /* open: the page may scroll, and nothing else changes size */
          await visibleNotice(page).locator('[data-d58="notice-toggle"]').click();
          await page.waitForTimeout(200);
          const open = await read();
          record(page, "N3", "open", open);
          expect(open.plot, "opening the list does not shrink the chart").toBe(closed.plot);
        } finally { await clear(page, uid); }
      });
    });
  }
});
