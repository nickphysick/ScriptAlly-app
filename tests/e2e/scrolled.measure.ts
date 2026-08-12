/**
 * ⚠️ SCROLL THE PAGE, DO NOT FORCE THE CLASS. Every earlier header reading toggled
 * `wsh--scrolled` on by hand, which measures what the RULES would do — not what the page does.
 * If a page never receives the class, forcing it reports a correct strip that no user ever sees.
 */
import { test } from "@playwright/test";
import { openRoute } from "./measure";

const PAGES: [string, string][] = [
  ["Contact list", "/agents"],
  ["Submission packages", "/manuscripts/packages"],
];

for (const [label, route] of PAGES) {
  test(`scrolled · ${label}`, async ({ page }) => {
    await openRoute(page, route);
    const out = await page.evaluate(async () => {
      const r = (n: number) => Math.round(n * 10) / 10;
      const grid = [...document.querySelectorAll(".wpg")].find((g) => g.getBoundingClientRect().height > 0) as HTMLElement;
      if (!grid) return { error: "no visible .wpg" };
      const sc = grid.querySelector(".wpg-scroll") as HTMLElement;
      const before = { overflow: sc.scrollHeight - sc.clientHeight };
      sc.scrollTop = 400;
      /* the observer is async — give it frames to fire, and do not force anything */
      await new Promise((res) => setTimeout(res, 900));
      const rd = (sel: string) => {
        const el = grid.querySelector(sel) as HTMLElement | null;
        if (!el) return null;
        const c = getComputedStyle(el);
        return {
          classes: el.className,
          h: r(el.getBoundingClientRect().height),
          border: c.borderTopWidth + " " + c.borderTopStyle + " " + c.borderTopColor,
          radius: c.borderTopLeftRadius,
          padding: c.padding,
          display: c.display,
        };
      };
      const sub = grid.querySelector(".wsh-sub") as HTMLElement | null;
      return {
        scrollTop: sc.scrollTop,
        overflow: before.overflow,
        plate: rd(".wpg-plate"),
        wrap: rd(".wsh-wrap"),
        wsh: rd(".wsh"),
        description: sub ? { display: getComputedStyle(sub).display, opacity: getComputedStyle(sub).opacity, maxHeight: getComputedStyle(sub).maxHeight, h: r(sub.getBoundingClientRect().height) } : "NOT RENDERED",
      };
    });
    console.log(`\n══ ${label} — SCROLLED, classes NOT forced`);
    console.log(JSON.stringify(out, null, 2).split("\n").map((l) => "  " + l).join("\n"));
  });
}
