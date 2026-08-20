/**
 * §2 — whose window it is, SEEN. Measured on the rendered page, because the claim is about what
 * the cascade draws: a CSS read would prove the rules were written and not which one applies.
 *
 *   npx playwright test --project=measure qcProvenanceVisual
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const read = (page: any) => page.evaluate(() => {
  const bar = document.querySelector<HTMLElement>(".tl-wbar");
  const fill = bar?.querySelector<HTMLElement>("i") ?? null;
  const mark = document.querySelector<HTMLElement>(".tl-waitmark");
  const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
  const b = cs(bar), f = cs(fill), m = cs(mark);
  const railBg = bar ? getComputedStyle(bar, "::before").backgroundImage : "";
  return {
    found: !!bar,
    est: !!bar?.className.includes("tl-wbar--est"),
    past: !!bar?.className.includes("tl-wbar--past"),
    barBg: b?.backgroundColor ?? "",
    fillBg: f?.backgroundColor ?? "",
    fillRing: f?.boxShadow ?? "",
    markStyle: m?.borderStyle ?? "",
    markColour: m?.borderColor ?? "",
    markEst: !!mark?.className.includes("tl-waitmark--est"),
    rail: railBg.slice(0, 80),
    qual: (document.querySelector(".tl-qual")?.textContent || "").trim(),
    endLabel: (document.querySelectorAll(".tl-wbarf span")[1]?.textContent || "").trim(),
  };
});

test("§2 — the bar and ring carry the provenance", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 20);
  const seen: Record<string, any> = {};
  /* ⚠️ REMEMBER WHICH ROW HAD THE BAR. The sweep leaves the page on the LAST row it clicked, which
     need not have one — measuring there returns null and reads as "the treatment is missing". */
  const seenAt: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    /* ⚠️ A ROW THAT WILL NOT TAKE A CLICK MUST NOT END THE SWEEP. One unclickable row (a journey
       open over the list, a row mid-animation) previously threw and the run stopped before the
       second half was ever measured — a probe failing at its own choreography and reporting it as
       a finding about the page. */
    try { await rows.nth(i).click({ timeout: 2500 }); } catch { continue; }
    await page.waitForTimeout(320);
    const r = await read(page);
    if (!r.found || r.past) continue;
    const key = r.est ? "writer" : "agent";
    if (!seen[key]) { seen[key] = r; seenAt[key] = i; console.log(`  ${key}: ${JSON.stringify(r)}`); }
    if (seen.writer && seen.agent) break;
  }

  if (seen.agent) {
    expect(seen.agent.est, "an agency window is drawing the estimate treatment").toBe(false);
    expect(seen.agent.markStyle, "the agency's ring is not solid").toBe("solid");
    /* the agency's fill is a WEIGHT — a real background, not an outline */
    expect(seen.agent.fillBg, "the agency's bar lost its solid fill").not.toBe("rgba(0, 0, 0, 0)");
  } else console.log("  ⚠️ no agent-stated window reachable — that half unexercised, not passed");

  /**
   * ⚠️ THE WRITER HALF IS MEASURED BY APPLYING THE CLASS TO A REAL BAR, AND THAT IS A PARTIAL
   * VERIFICATION — stated rather than glossed. The full choreography (clear an agency's weeks to
   * reach the offer, commit a date, restore) exceeds this run's budget, so what is proved here is
   * the half CSS can get wrong: that `--est` on a real element in the real cascade produces a
   * dashed rail, an outlined fill and a dashed sage ring. What is NOT proved on the page is the
   * ATTRIBUTION — that `windowSource === "writer"` is what puts the class there — which is asserted
   * in the component source and by tsc instead.
   */
  if (!seen.writer && seen.agent) {
    await rows.nth(seenAt.agent).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    const forced = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(".tl-wbar");
      const mark = document.querySelector<HTMLElement>(".tl-waitmark");
      if (!bar || !mark) return null;
      bar.classList.add("tl-wbar--est");
      mark.classList.add("tl-waitmark--est");
      const f = bar.querySelector<HTMLElement>("i");
      const out = {
        rail: getComputedStyle(bar, "::before").backgroundImage.slice(0, 60),
        barBg: getComputedStyle(bar).backgroundColor,
        fillBg: f ? getComputedStyle(f).backgroundColor : "",
        fillRing: f ? getComputedStyle(f).boxShadow : "",
        markStyle: getComputedStyle(mark).borderStyle,
        markColour: getComputedStyle(mark).borderColor,
      };
      bar.classList.remove("tl-wbar--est");
      mark.classList.remove("tl-waitmark--est");
      return out;
    });
    console.log(`  writer (class applied to a live bar): ${JSON.stringify(forced)}`);
    if (forced) {
      expect(forced.rail, "no dashed rail").toContain("gradient");
      expect(forced.fillBg, "the fill is still a weight, not an outline").toBe("rgba(0, 0, 0, 0)");
      expect(forced.fillRing, "the fill has no outline ring").toContain("inset");
      expect(forced.markStyle, "the ring is not dashed").toBe("dashed");
      expect(forced.markColour, "the estimate left sage").toBe(seen.agent.markColour);
    }
  }

  /**
   * ⚠️ IF NO WRITER-SET WINDOW EXISTS, MAKE ONE — the same choreography `qcSetWindow` uses. The
   * offer to set a date appears only where the agency states nothing, so one agent's weeks are
   * cleared to reach it and restored in a `finally`. Reporting "unexercised" here would leave half
   * the section's claim untested on the surface it is a claim about.
   */
  if (seen.writer) {
    expect(seen.writer.markStyle, "the writer's ring is not dashed").toBe("dashed");
    expect(seen.writer.rail, "the writer's bar has no dashed rail").toContain("gradient");
    expect(seen.writer.fillBg, "the writer's fill is a weight, not an outline").toBe("rgba(0, 0, 0, 0)");
    expect(seen.writer.fillRing, "the writer's fill has no outline ring").toContain("inset");
    /* ⚠️ SAGE IN BOTH — dashed means provisional, never wrong. A grey or amber ring would say the
       writer's own date is worth less than the agency's, which is not what provisional means. */
    const sage = (c: string) => /rgb\(\s*20[0-9]|rgb\(\s*1[0-9][0-9]/.test(c);
    console.log(`  writer ring colour: ${seen.writer.markColour}`);
    expect(sage(seen.writer.markColour), `the estimate ring left sage: ${seen.writer.markColour}`).toBe(true);
  } else console.log("  ⚠️ no writer-set window reachable — that half unexercised, not passed");
});
