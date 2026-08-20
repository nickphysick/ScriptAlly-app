/**
 * §4 — the writer-estimate attribution, reached PROPERLY.
 *
 * ⚠️ §2's WRITER HALF WAS VERIFIED BY APPLYING THE CLASS TO A REAL BAR, which proves the CSS and
 * not the attribution — that `windowSource === "writer"` is what puts it there. This makes the real
 * state instead: clear an agency's stated weeks so the offer appears, commit a date through the
 * card's own control, and read the four surfaces together. The agency is restored in a `finally`.
 *
 *   npx playwright test --project=measure qcWriterWindow
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§4 — sentence, ring, bar and end label all read writer-attributed", async ({ page }) => {
  test.setTimeout(180000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);

  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(500);
  const agentName = await page.evaluate(() =>
    ((document.querySelector(".f12-row.f12-sel")?.textContent || "").match(/[A-Z][a-z]+ [A-Z][a-z]+/) || [""])[0]);
  expect(agentName, "could not read an agent name to clear").toBeTruthy();

  let cleared: string | null = null;
  try {
    /* make the state: an agency stating nothing is the only one the offer appears on */
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    await page.waitForTimeout(1500);
    await page.locator(".agl-acard", { hasText: agentName }).first().locator(".agl-pencil").click({ timeout: 10000 });
    await page.waitForTimeout(900);
    const weeks = (await page.locator("#agl-weeks").inputValue()).trim();
    await page.locator("#agl-weeks").fill("");
    await page.locator(".agl-done").click({ timeout: 10000 });
    await page.waitForTimeout(2200);
    cleared = weeks;
    console.log(`  cleared "${agentName}"'s stated ${weeks} weeks`);

    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await page.locator(".f12-row", { hasText: agentName }).first().click({ timeout: 10000 });
    await page.waitForTimeout(900);

    /**
     * ⚠️ IDEMPOTENT, AND THE FIRST VERSION WAS NOT. It set a writer date and never removed one, so
     * the second run found the offer absent — the offer appears only where nothing is stated — and
     * reported "the offer did not appear" as a fault. If the date is ALREADY set, that IS the state
     * under test; measure it rather than insisting on the path that creates it.
     */
    let setHere = false;
    if (!(await page.locator(".tl-wbar--est").count())) {
      expect(await page.locator(".tl-ask-a").count(), "the offer to set a date did not appear").toBeGreaterThan(0);
      await page.locator(".tl-ask-a").first().click();
      await page.waitForTimeout(500);
      /* commit through the control's OWN Save — §1's button, the route a writer takes */
      await page.locator(".tl-setwin input[type=range]").focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      await page.locator(".tl-setwin .qn-send").click({ timeout: 8000 });
      await page.waitForTimeout(3500);
      setHere = true;
    } else {
      console.log("  a writer date is already set on this query — measuring it as found");
    }

    const r = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(".tl-wbar");
      const fill = bar?.querySelector<HTMLElement>("i") ?? null;
      const mark = document.querySelector<HTMLElement>(".tl-waitmark");
      const labels = Array.from(document.querySelectorAll(".tl-wbarf span")).map((s) => (s.textContent || "").trim());
      return {
        /* ⚠️ SCOPED TO THE WAITING ROW. `.tl-qual` is the qualifier on ANY timeline row — the first
           in the document is "· Email" on the Query-sent row — so a bare selector read the send
           method and reported the attribution as missing. Walk up from the waiting mark instead. */
        sentence: (() => {
          let el: HTMLElement | null = document.querySelector<HTMLElement>(".tl-waitmark");
          while (el && !el.querySelector(".tl-qual")) el = el.parentElement;
          return (el?.querySelector(".tl-qual")?.textContent || "").replace(/\s+/g, " ").trim();
        })(),
        barEst: !!bar?.className.includes("tl-wbar--est"),
        markEst: !!mark?.className.includes("tl-waitmark--est"),
        markStyle: mark ? getComputedStyle(mark).borderStyle : "",
        markColour: mark ? getComputedStyle(mark).borderColor : "",
        rail: bar ? getComputedStyle(bar, "::before").backgroundImage.slice(0, 46) : "",
        fillBg: fill ? getComputedStyle(fill).backgroundColor : "",
        fillRing: fill ? getComputedStyle(fill).boxShadow : "",
        endLabel: labels[labels.length - 1] ?? "",
        startLabel: labels[0] ?? "",
      };
    });
    console.log(`  ${JSON.stringify(r, null, 1)}`);

    /* ⚠️ ALL FOUR TOGETHER — the point of §4 is that they agree, not that each is reachable. */
    expect(r.sentence, "the sentence is not the writer's").toMatch(/you expect/i);
    expect(r.barEst, "the bar did not take the estimate treatment from the data").toBe(true);
    expect(r.markEst, "the ring did not take it").toBe(true);
    expect(r.markStyle, "the ring is not dashed").toBe("dashed");
    expect(r.rail, "the bar has no dashed rail").toContain("gradient");
    expect(r.fillBg, "the fill is a weight, not an outline").toBe("rgba(0, 0, 0, 0)");
    expect(r.fillRing, "the fill has no outline ring").toContain("inset");
    expect(r.endLabel, "the end label does not name the estimate as the writer's").toMatch(/^Your estimate/);
    expect(r.markColour, "the estimate left sage").toBe("rgb(200, 208, 197)");
    /* ⚠️ PUT THE QUERY BACK TOO, not just the agency. The toast's own Undo is the writer's route
       and the one the app already supports; leaving the date behind is what broke the second run. */
    if (setHere && await page.locator(".sa-toast-undo").count()) {
      await page.locator(".sa-toast-undo").first().click();
      await page.waitForTimeout(1500);
      console.log("  writer date undone — the query is back as it was found");
    }
  } finally {
    if (cleared) {
      await openRoute(page, "/agents", { width: 1440, height: 900 });
      await page.waitForTimeout(1500);
      await page.locator(".agl-acard", { hasText: agentName }).first().locator(".agl-pencil").click({ timeout: 10000 });
      await page.waitForTimeout(900);
      await page.locator("#agl-weeks").fill(cleared);
      await page.locator(".agl-done").click({ timeout: 10000 });
      await page.waitForTimeout(1800);
      console.log(`  restored "${agentName}" to ${cleared} weeks`);
    }
  }
});
