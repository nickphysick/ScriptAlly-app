/**
 * §4 — Nudge, on the running page.
 *
 * ⚠️ THE FAULT WAS THAT THE BUTTON WAS ALWAYS GREY, so the only reading that settles it is the
 * rendered control's own state across the queries the account actually holds. A unit lock proves
 * the standing; it cannot prove the button read it.
 *
 *   npx playwright test --project=measure qcNudge
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const NUDGE = '.qc-phead button:has(span:text-is("Nudge")), .qc-phead button:has(span:text-is("Nudged"))';

test("§4a/§4b — availability follows the turn, and a disabled one says why", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  const seen: { row: number; status: string; label: string; disabled: boolean; why: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(240);
    const read = await page.evaluate(() => {
      const btn = [...document.querySelectorAll<HTMLElement>(".qc-phead button")]
        .find((b) => /^Nudged?\b/.test((b.querySelector("span")?.textContent || "").trim()));
      if (!btn) return null;
      /* the status the pane is showing, so the button can be checked against the query it acts on */
      const status = (document.querySelector(".qc-mstx")?.textContent || "").trim();
      return {
        label: (btn.textContent || "").trim().replace(/\s+/g, " "),
        disabled: btn.getAttribute("aria-disabled") === "true",
        /* ⚠️ `disabled` DISPATCHES NO MOUSE EVENTS, so a `title` on one can never be read. This is
           the assertion that the reason is reachable at all, not merely present in the markup. */
        hardDisabled: (btn as HTMLButtonElement).disabled,
        why: btn.getAttribute("title") || "",
        status,
      };
    });
    if (read) seen.push({ row: i, ...read } as any);
  }

  for (const s of seen) console.log(`  row ${s.row} · ${s.status.padEnd(20)} · "${s.label}" · disabled=${s.disabled} · "${s.why}"`);
  expect(seen.length, "no Nudge control found on any query").toBeGreaterThan(3);

  /* ⚠️ THE ORIGINAL SYMPTOM. Before this section every one of these was disabled; a run where they
     all still are is the bug, whatever the unit locks say. */
  const enabled = seen.filter((s) => !s.disabled);
  console.log(`\n${enabled.length} of ${seen.length} queries can be nudged`);
  expect(enabled.length, "Nudge is disabled on every query — the old condition is still in force").toBeGreaterThan(0);

  for (const s of seen as any[]) {
    expect(s.hardDisabled, `row ${s.row} uses the disabled attribute, so its reason can never be hovered`).toBe(false);
    if (s.disabled) {
      expect(s.why.length, `row ${s.row} is unavailable and says nothing`).toBeGreaterThan(10);
      expect(s.why, `row ${s.row}'s reason appraises: "${s.why}"`).not.toMatch(/should|recommend|annoy|too soon|patient/i);
    }
  }
});

test("§4c — a nudge inside the window asks first, and states facts", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  let opened = 0;
  for (let i = 0; i < 14 && !opened; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(240);
    const btn = page.locator(NUDGE).first();
    if (!(await btn.count()) || (await btn.getAttribute("aria-disabled")) === "true") continue;
    await btn.click();
    await page.waitForTimeout(320);
    const ask = page.locator(".qc-nask");
    if (!(await ask.count())) {
      /* the window has closed — the pack says nudge proceeds directly, so the modal is what opens */
      const modal = await page.locator('[role="dialog"], .fs-shell').count();
      console.log(`  row ${i}: no confirm (window closed) · a dialogue opened: ${modal > 0}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      continue;
    }
    const text = (await ask.innerText()).replace(/\s+/g, " ").trim();
    const geo = await ask.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const edge = getComputedStyle(el, "::before");
      return { w: Math.round(r.width), onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, edge: `${edge.height} ${edge.backgroundColor}` };
    });
    console.log(`\n  row ${i} confirm · ${geo.w}px · on screen ${geo.onScreen} · top edge ${geo.edge}`);
    console.log(`  "${text}"`);
    /* ⚠️ ON SCREEN BEFORE ANYTHING ELSE IS ASKED OF IT — a rect outside the viewport makes every
       reading below a statement about something the browser never showed. */
    expect(geo.onScreen, "the confirm opened off screen").toBe(true);
    expect(text, "the confirm carries a verdict").not.toMatch(/may annoy|are you sure|recommend|too soon|advise/i);
    expect(text, "the confirm does not offer both answers").toContain("Nudge anyway");
    expect(text).toContain("Cancel");
    await page.locator(".qc-nask-x").click();
    await page.waitForTimeout(200);
    expect(await page.locator(".qc-nask").count(), "Cancel left the confirm open").toBe(0);
    opened = 1;
  }
  console.log(`\nconfirm exercised: ${opened === 1}`);
  expect(opened, "no nudgeable query was inside its window — the confirm was never exercised").toBe(1);
});
