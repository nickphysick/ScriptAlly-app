/**
 * §9 — header type and icons, on the running page.
 *
 *   npx playwright test --project=measure qcType
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§9 — the card glyphs are ink and larger; the agency line is bigger and still subordinate", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(450);

  const read = await page.evaluate(() => {
    const px = (v: string) => parseFloat(v);
    const ink = (() => {
      const root = document.querySelector(".f12-root") ?? document.documentElement;
      const probe = document.createElement("span");
      probe.style.color = getComputedStyle(root).getPropertyValue("--ink").trim();
      document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); return c;
    })();
    const glyphs = [...document.querySelectorAll<SVGElement>(".qp-cardgl svg, .f12-chh > svg")].map((g) => {
      const c = getComputedStyle(g);
      return { w: Math.round(g.getBoundingClientRect().width), stroke: c.stroke };
    });
    const name = document.querySelector<HTMLElement>(".qc-mname");
    const sec = document.querySelector<HTMLElement>(".qc-msec");
    const mono = document.querySelector<HTMLElement>(".qc-mchiptx");
    return {
      ink, glyphs,
      nameSize: name ? px(getComputedStyle(name).fontSize) : 0,
      secSize: sec ? px(getComputedStyle(sec).fontSize) : 0,
      secFamily: sec ? getComputedStyle(sec).fontFamily.split(",")[0] : "",
      secWeight: sec ? getComputedStyle(sec).fontWeight : "",
      monoBase: mono ? px(getComputedStyle(mono).fontSize) : 0,
    };
  });

  console.log(`\n--ink = ${read.ink}`);
  read.glyphs.forEach((g) => console.log(`  card glyph ${g.w}px · stroke ${g.stroke}`));
  console.log(`  agent name ${read.nameSize}px · agency ${read.secSize}px ${read.secFamily} ${read.secWeight}`);

  expect(read.glyphs.length, "no card glyphs found").toBeGreaterThan(0);
  for (const g of read.glyphs) {
    /* ⚠️ NEAR-BLACK, NOT A TINT — asserted against the page's own `--ink`, not a hex. */
    expect(g.stroke, `a card glyph is drawn in ${g.stroke}, not the near-black ink`).toBe(read.ink);
    expect(g.w, `a card glyph is ${g.w}px — decoration at that size`).toBeGreaterThanOrEqual(16);
  }
  /* ⚠️ LARGER, AND STILL SUBORDINATE — both halves, because raising it past the name would make the
     card about the agency. Mono, and no heavier than it was. */
  expect(read.secSize, "the agency line is still at the mono base").toBeGreaterThan(9);
  expect(read.secSize, "the agency line is no longer subordinate to the name").toBeLessThan(read.nameSize);
  expect(read.secFamily.toLowerCase(), "the agency line changed face").toContain("mono");
  expect(Number(read.secWeight), "the agency line got heavier").toBeLessThanOrEqual(500);
});
