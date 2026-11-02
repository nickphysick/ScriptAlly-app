/**
 * EM-5 (founding emails v1, phase 2): the ticket's bird lies wholly inside the stub, at 390 and 430, in
 * the numbered and the "All fifty taken" states — and in the second, the big line stays clear of it.
 *
 *   SA_E2E_BASE_URL=<a preview of a production build> npx playwright test --project=public foundingTicket
 * `EM_MUTATE=EM5` puts the bird back where it hung over the stub's edge (v2's right −40px, bottom −14px).
 *
 * Welcome page v1, phase 2: the label "Founding writer pass" is sentence case, in the serif at 600,
 * #7a3420 — no small capitals on the pass. `EM_MUTATE=EM5b` puts the capitals back.
 */
import { test, expect, Page } from "@playwright/test";

const MUTATIONS: Record<string, string> = {
  EM5: ".mk-tkt-stub img{right:-40px!important;bottom:-14px!important;width:230px!important}",
  EM5b: ".mk-tkt-st small{text-transform:uppercase!important;letter-spacing:.14em!important}",
};

async function open(page: Page, vp: { width: number; height: number }, count: { count: number; cap: number }) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.route("**/api/waitlist", (r) => r.request().method() === "GET"
    ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...count, visible: true }) })
    : r.continue());
  await page.setViewportSize(vp);
  await page.goto("/");
  await expect(page.locator(".mk-tkt")).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  if (process.env.EM_MUTATE) await page.addStyleTag({ content: MUTATIONS[process.env.EM_MUTATE] });
  await page.evaluate(() => document.querySelector(".mk-tkt")!.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(1500);
}

for (const vp of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  for (const state of [{ name: "numbered", count: { count: 13, cap: 50 } }, { name: "places gone", count: { count: 50, cap: 50 } }]) {
    test(`EM-5 · ${vp.width}, ${state.name}: the bird is wholly inside the stub`, async ({ page }) => {
      await open(page, vp, state.count);
      const r = await page.evaluate(() => {
        const box = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
        const stub = document.querySelector(".mk-tkt-stub"), img = stub?.querySelector("img") as HTMLImageElement | null;
        return { stub: box(stub), img: box(img), loaded: !!img && img.complete && img.naturalWidth > 0,
                 text: (document.querySelector(".mk-tkt-st")?.textContent ?? "").trim(), full: box(document.querySelector(".mk-tkt-full")),
                 label: (() => { const l = document.querySelector(".mk-tkt-st small"); if (!l) return null; const c = getComputedStyle(l);
                   return { tt: c.textTransform, ls: c.letterSpacing, fw: c.fontWeight, colour: c.color, family: c.fontFamily }; })() };
      });
      console.log(`EM-5 ${vp.width} ${state.name}`, JSON.stringify(r));
      expect(r.stub && r.img, "the stub and its bird are on the page").toBeTruthy();
      expect(r.loaded, "the bird loaded").toBe(true);
      expect(r.label, "the pass label is drawn").toBeTruthy();
      expect(r.label!.tt, "the label is sentence case, never capitals").toBe("none");
      expect(r.label!.ls, "no letter-spacing").toBe("normal");
      expect(r.label!.fw, "600 weight").toBe("600");
      expect(r.label!.colour, "#7a3420").toBe("rgb(122, 52, 32)");
      expect(r.label!.family, "in the serif").toMatch(/Source Serif/);
      const s = r.stub!, i = r.img!;
      expect(i.l, "left edge inside").toBeGreaterThanOrEqual(s.l - 0.5);
      expect(i.t, "top edge inside").toBeGreaterThanOrEqual(s.t - 0.5);
      expect(i.r, "right edge inside").toBeLessThanOrEqual(s.r + 0.5);
      expect(i.b, "bottom edge inside").toBeLessThanOrEqual(s.b + 0.5);
      if (state.name === "numbered") {
        expect(r.text).toBe("Founding writer passNo. 14of 50");
      } else {
        expect(r.text).toBe("Founding writer passAll fifty taken");
        const f = r.full!;
        expect(f, "the big line is drawn").toBeTruthy();
        expect(f.b - f.t, "on two lines").toBeGreaterThan(40);
        expect(f.r <= i.l || f.b <= i.t, `the big line (right ${f.r}) stays clear of the bird (left ${i.l})`).toBe(true);
      }
    });
  }
}
