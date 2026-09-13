import { test } from "@playwright/test";
import { openRoute } from "./measure";

/** what actually paints behind the content — walk up from a card and report every painted layer */
const LAYERS = (sel: string) => {
  const live = [...document.querySelectorAll<HTMLElement>(".wpg")].filter((e) => e.getBoundingClientRect().height > 0);
  const root = live.find((e) => e.querySelector(sel)) ?? live[0];
  const start = root?.querySelector<HTMLElement>(sel);
  if (!start) return { error: "no " + sel, roots: live.map((e) => e.className) };
  const out: { tag: string; cls: string; bg: string; shadow: string; radius: string }[] = [];
  let e: HTMLElement | null = start;
  while (e && out.length < 14) {
    const cs = getComputedStyle(e);
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.boxShadow !== "none") {
      out.push({
        tag: e.tagName.toLowerCase(),
        cls: String(e.className).trim().split(/\s+/).slice(0, 3).join("."),
        bg: cs.backgroundColor, shadow: cs.boxShadow.slice(0, 76), radius: cs.borderRadius,
      });
    }
    e = e.parentElement;
  }
  return { layers: out };
};

test("ground — Query Centre grid", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await page.waitForTimeout(1200);
  console.log("QC " + JSON.stringify(await page.evaluate(LAYERS, ".qcc")));
});

test("ground — Contact list (the page that already does it)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 1000 });
  await page.waitForTimeout(1200);
  console.log("AG " + JSON.stringify(await page.evaluate(LAYERS, ".agl-card, .agl-grid > *, [class*='card']")));
});
