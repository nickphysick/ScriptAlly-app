/**
 * PAPER-RUN RECON (0.4) — what actually paints the fade. Walks the note card, the composer, and
 * every pseudo-element of each, plus every ANCESTOR carrying a background-image or a masked
 * overlay, and names what it finds.
 *   SA_E2E_BASE_URL=dev npx playwright test nbPaperRecon
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const walk = (page: import("@playwright/test").Page, selector: string) =>
  page.evaluate((sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return null;
    const read = (e: Element, pseudo?: string) => {
      const cs = getComputedStyle(e, pseudo);
      return {
        bgImage: cs.backgroundImage, content: pseudo ? cs.content : undefined,
        mask: cs.maskImage || (cs as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage,
        pos: cs.position, opacity: cs.opacity,
      };
    };
    const out: Record<string, unknown> = {
      self: read(el), before: read(el, "::before"), after: read(el, "::after"),
    };
    /* the ancestors — a fade can be a wrapping element's, not the card's */
    const chain: Array<Record<string, unknown>> = [];
    let n: HTMLElement | null = el.parentElement;
    for (let i = 0; i < 6 && n; i++) {
      const cs = getComputedStyle(n);
      const b = getComputedStyle(n, "::before"), a = getComputedStyle(n, "::after");
      if (cs.backgroundImage !== "none" || b.backgroundImage !== "none" || a.backgroundImage !== "none"
          || (b.content !== "none" && b.content !== "normal") || (a.content !== "none" && a.content !== "normal")) {
        chain.push({ cls: n.className, bgImage: cs.backgroundImage.slice(0, 90),
          beforeBg: b.backgroundImage.slice(0, 90), beforeContent: b.content,
          afterBg: a.backgroundImage.slice(0, 90), afterContent: a.content });
      }
      n = n.parentElement;
    }
    /* and any child of the card that carries one */
    const kids = Array.from(el.querySelectorAll<HTMLElement>("*"))
      .map((k) => ({ cls: k.className, cs: getComputedStyle(k), b: getComputedStyle(k, "::before"), a: getComputedStyle(k, "::after") }))
      .filter((k) => k.cs.backgroundImage !== "none" || k.b.backgroundImage !== "none" || k.a.backgroundImage !== "none")
      .map((k) => ({ cls: String(k.cls).slice(0, 50), bg: k.cs.backgroundImage.slice(0, 90), before: k.b.backgroundImage.slice(0, 90), after: k.a.backgroundImage.slice(0, 90) }));
    return { out, chain, kids };
  }, selector);

test("0.4 — what paints the fade, on the card and the composer", async ({ page }) => {
  await openRoute(page, "/todo/noteboard", { width: 1440, height: 900 });
  const card = await walk(page, ".nb-note");
  expect(card, "no note card").toBeTruthy();
  console.log("CARD  self/::before/::after:", JSON.stringify(card!.out));
  console.log("CARD  ancestors with paint:", JSON.stringify(card!.chain));
  console.log("CARD  children with paint:", JSON.stringify(card!.kids));

  await page.locator(".nb-ghost").click();
  await page.waitForTimeout(300);
  const comp = await walk(page, ".nb-compose");
  expect(comp, "no composer").toBeTruthy();
  console.log("COMP  self/::before/::after:", JSON.stringify(comp!.out));
  console.log("COMP  ancestors with paint:", JSON.stringify(comp!.chain));
  console.log("COMP  children with paint:", JSON.stringify(comp!.kids));
  await page.locator(".nb-ccancel").click();
});
