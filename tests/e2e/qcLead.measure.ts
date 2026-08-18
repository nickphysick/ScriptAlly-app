/**
 * §3 — the agent header's profile mark, on the running page.
 *
 * ⚠️ THE CLAIM IS A CENTRE, so only a rect can settle it. A `grid-row` span and an `align-self` can
 * both be present and the mark still sit on the first line if a sub-row is placed outside the grid.
 *
 *   npx playwright test --project=measure qcLead
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ SUPERSEDED BY §5's RESET — THE BARE GLYPH IS A MONOGRAM DISC NOW. The clause this file was
 * written for (a mark centred on the whole left block rather than on its first line) survives the
 * change and is the reason it is not deleted: the disc has three rows to sit against, not two.
 */
test("§5 — the monogram disc leads the header, centred on the whole block", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(450);

  const read = await page.evaluate(() => {
    const av = document.querySelector<HTMLElement>(".qc-mav");
    const name = document.querySelector<HTMLElement>(".qc-mval");
    const agency = document.querySelector<HTMLElement>(".qc-magency");
    const pills = document.querySelector<HTMLElement>(".qc-mailrows .qc-msub");
    if (!av || !name) return null;
    const a = av.getBoundingClientRect(), n = name.getBoundingClientRect();
    const boxes = [n, agency?.getBoundingClientRect(), pills?.getBoundingClientRect()].filter(Boolean) as DOMRect[];
    const top = Math.min(...boxes.map((b) => b.top));
    const bottom = Math.max(...boxes.map((b) => b.bottom));
    const c = getComputedStyle(av);
    return {
      size: Math.round(a.width), initials: (av.textContent || "").trim(),
      bg: c.backgroundColor, radius: c.borderTopLeftRadius,
      markCentre: a.top + a.height / 2, blockCentre: (top + bottom) / 2, nameCentre: n.top + n.height / 2,
      rows: boxes.length,
      leadsName: Math.round(a.left) < Math.round(n.left),
      onScreen: a.top >= 0 && a.bottom <= innerHeight,
    };
  });
  console.log(`\nmonogram "${read?.initials}" ${read?.size}px · ${read?.bg} r${read?.radius}`);
  console.log(`  centre ${read?.markCentre.toFixed(1)} · block (${read?.rows} rows) ${read?.blockCentre.toFixed(1)} · name-only ${read?.nameCentre.toFixed(1)}`);

  expect(read, "no monogram on the header").not.toBeNull();
  expect(read!.onScreen, "the header is off screen, so these centres describe nothing").toBe(true);
  expect(read!.initials.length, "the disc carries no initials").toBeGreaterThan(0);
  expect(read!.bg, "the disc lost its pink").not.toMatch(/rgba\(0, 0, 0, 0\)/);
  expect(read!.radius, "the disc is not round").toBe("50%");
  expect(read!.leadsName, "the disc does not lead the block").toBe(true);
  /* the block has three rows now — name, agency, pills — so "centred on the block" is a real claim */
  expect(read!.rows, "the left block has fewer rows than the disc is spanning").toBe(3);
  expect(Math.abs(read!.markCentre - read!.blockCentre), "the disc is not centred on the block").toBeLessThanOrEqual(2);
  expect(Math.abs(read!.markCentre - read!.nameCentre), "the disc is centred on the name alone").toBeGreaterThan(2);
});

test("§5 — a missing contact opens the shared editor, and the chassis is unchanged", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  /* the card's chassis, read before anything is opened */
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(400);
  const chassis = await page.locator(".qc-mail").evaluate((el) => {
    const c = getComputedStyle(el);
    const edge = getComputedStyle(el, "::before");
    return { bg: c.backgroundColor, radius: c.borderTopLeftRadius, shadow: c.boxShadow.slice(0, 30), edge: `${edge.height} ${edge.backgroundColor}` };
  });
  console.log(`\ncard chassis: ${chassis.bg} r${chassis.radius} · shadow ${chassis.shadow} · top edge ${chassis.edge}`);
  /* ⚠️ THE SECTION CHANGES THE ARRANGEMENT INSIDE THE CARD, NOT THE CARD. */
  expect(chassis.bg, "the card left white").toBe("rgb(255, 255, 255)");
  expect(chassis.radius, "the card grew a radius").toBe("0px");
  expect(chassis.shadow, "the card lost its lift").not.toBe("none");
  expect(chassis.edge, "the card lost its sage top edge").toMatch(/^5px rgb\(180, 193, 176\)/);

  /* find a query whose agent is missing a contact */
  let opened = 0;
  for (let i = 0; i < 14 && !opened; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(260);
    const add = page.locator('.qc-mail button:has-text("+ Add")').first();
    if (!(await add.count())) continue;
    const label = (await add.innerText()).trim();
    await add.click();
    await page.waitForTimeout(400);
    const ed = await page.evaluate(() => {
      const p = document.querySelector<HTMLElement>(".f12-panel");
      if (!p) return null;
      const c = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      return {
        eyebrow: (p.querySelector(".f12-panel-eyebrow")?.textContent || "").trim(),
        bg: c.backgroundColor,
        fields: p.querySelectorAll("input").length,
        buttons: [...p.querySelectorAll("button")].map((b) => (b.textContent || "").trim()),
        focused: document.activeElement?.tagName.toLowerCase(),
        onScreen: r.top >= 0 && r.bottom <= innerHeight,
      };
    });
    console.log(`  "${label}" → panel "${ed?.eyebrow}" · ${ed?.bg} · ${ed?.fields} field(s) · buttons ${JSON.stringify(ed?.buttons)} · focus ${ed?.focused}`);
    expect(ed, `"${label}" opened no editor`).not.toBeNull();
    /* ⚠️ THE SAME SURFACE AS THE MATERIALS EDITORS — not a bespoke form. */
    expect(ed!.bg, "the contact editor is not on the shared white panel").toBe("rgb(255, 255, 255)");
    expect(ed!.onScreen, "the contact editor opened off screen").toBe(true);
    expect(ed!.fields, "the editor is not a single field").toBe(1);
    expect(ed!.focused, "the field is not focused on open").toBe("input");
    /* ⚠️ NO SAVE — the conventions are the panel's: Enter commits, Esc closes. */
    for (const b of ed!.buttons) expect(b.toLowerCase(), `the editor carries a "${b}" control`).not.toMatch(/save|done/);
    expect(ed!.eyebrow.toLowerCase(), "the eyebrow does not say whose record this changes").toMatch(/email|website/);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    expect(await page.locator(".f12-panel").count(), "Esc left the editor open").toBe(0);
    opened = 1;
  }
  console.log(`  add-contact editor exercised: ${opened === 1}`);
  expect(opened, "no agent in this account is missing a contact — the editor is unexercised").toBe(1);
});
