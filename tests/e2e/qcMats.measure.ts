/**
 * §2 — materials, on the running page.
 *
 * ⚠️ THE CLAIM IS AN ABSENCE — no pill in a pending or ghost state — and an absence is exactly what
 * a source lock cannot settle: the markup can be right and the cascade still paint a muted pill.
 * This reads every pill the page draws.
 *
 *   npx playwright test --project=measure qcMats
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — every pill is attached, removal is immediate and undoable, the menu states all four", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);

  const pills = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc-sentmat .qc-mchip-att")].map((p) => {
    const c = getComputedStyle(p);
    return {
      text: (p.textContent || "").replace(/\s+/g, " ").trim(),
      colour: c.color, background: c.backgroundColor, border: `${c.borderTopStyle} ${c.borderTopWidth}`,
      opacity: c.opacity,
      /* the ✓/○ marker the not-sent state used */
      marker: p.querySelector("i") ? (p.querySelector("i")!.textContent || "").trim() : "",
      hasX: !!p.querySelector(".qc-mchipx"),
    };
  }));
  console.log(`\n${pills.length} material pills on this send:`);
  pills.forEach((p) => console.log(`  "${p.text}" · ${p.colour} on ${p.background} · border ${p.border} · opacity ${p.opacity} · marker "${p.marker}" · ×: ${p.hasX}`));
  expect(pills.length, "no materials on this query to read").toBeGreaterThan(0);

  /* ⚠️ NO GHOSTS. A dashed rim, a faded pill or a `○` marker are the three shapes the retired
     not-yet-sent state took; all three are absences now, so all three are asserted. */
  const faint = await page.evaluate(() => {
    const root = document.querySelector(".f12-root") ?? document.documentElement;
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(root).getPropertyValue("--qc-tx-off").trim();
    document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); return c;
  });
  for (const p of pills) {
    expect(p.marker, `"${p.text}" still draws a sent/not-sent marker`).toBe("");
    expect(p.border, `"${p.text}" is dashed — a pending pill`).not.toContain("dashed");
    expect(Number(p.opacity), `"${p.text}" is faded`).toBeGreaterThan(0.9);
    expect(p.colour, `"${p.text}" is drawn in the muted ink — a ghost`).not.toBe(faint);
    expect(p.hasX, `"${p.text}" has no remove control`).toBe(true);
  }

  /* ── the Attach menu states the complete set, with attached ones inert ── */
  await page.locator(".qc-mchip-add").click();
  await page.waitForTimeout(350);
  const menu = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="menu"] .f12-menu-item')].map((b) => ({
    label: (b.textContent || "").trim(),
    disabled: (b as HTMLButtonElement).disabled,
  })));
  console.log(`\nattach menu:`);
  menu.forEach((m) => console.log(`  "${m.label}"${m.disabled ? "  [inert]" : ""}`));
  for (const want of ["Query letter", "Synopsis", "Opening sample", "Other"]) {
    const row = menu.find((m) => m.label.startsWith(want));
    expect(row, `the menu does not list ${want}`).toBeTruthy();
  }
  /* ⚠️ ATTACHED ONES ARE LISTED AND INERT — hiding them would make the menu shorter every time it
     was used, and leave a writer unable to see that a type exists at all. */
  for (const m of menu.filter((x) => /Attached/.test(x.label))) {
    expect(m.disabled, `"${m.label}" is marked Attached and still clickable`).toBe(true);
  }
  const attachedInMenu = menu.filter((m) => /Attached/.test(m.label)).length;
  expect(attachedInMenu, "no menu row reflects what is already on the send").toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  /* ── removal is immediate, and the undo puts it back ── */
  const target = page.locator(".qc-sentmat .qc-mchip-att").first();
  const label = (await target.innerText()).replace(/\s+/g, " ").trim();
  /* ⚠️ COUNTED AT THE MOMENT OF THE ACTION, not from the earlier read. The first version compared
     against a count taken before the menu was opened and closed, and reported "1 → 2" — a removal
     that appeared to ADD a pill. The list is live; a stale `before` measures two different pages. */
  const before = await page.locator(".qc-sentmat .qc-mchip-att").count();
  console.log(`\nbefore removing: ${before} pills (first read saw ${pills.length})`);
  await target.hover();
  await page.waitForTimeout(150);
  const xVisible = await target.locator(".qc-mchipx").evaluate((el) => getComputedStyle(el).display);
  console.log(`\nhovering "${label}": × display ${xVisible}`);
  expect(xVisible, "the × does not appear on hover").not.toBe("none");
  await target.locator(".qc-mchipx").click();
  await page.waitForTimeout(900);

  const after = await page.locator(".qc-sentmat .qc-mchip-att").count();
  /* ⚠️ THE TOAST'S OWN CLASS, NOT A `has-text` SWEEP. A document-wide search for "Undo" found a
     HIDDEN theme-editor button — "⏪ Undo Style (Classic)" — and waited seven minutes for it to
     become clickable. The same first-match family that has cost this suite time before. */
  const toast = (await page.locator(".sa-toast").first().innerText({ timeout: 4000 }).catch(() => "")).replace(/\s+/g, " ").trim();
  console.log(`  removed: ${before} → ${after} pills · toast "${toast}"`);
  expect(after, "the pill did not leave the row").toBe(before - 1);
  expect(toast, "removal fired no toast").not.toBe("");
  /* ⚠️ AND IT SAYS "removed", NOT "unmarked" — marking was the vocabulary of the state §2 retires. */
  expect(toast.toLowerCase(), `the toast still speaks of marking: "${toast}"`).not.toContain("unmark");
  expect(toast.toLowerCase(), "the toast does not say what happened").toContain("removed");
  expect(await page.locator(".sa-toast-undo").count(), "the toast offers no undo").toBeGreaterThan(0);

  /* put it back through the undo, so the walk changes nothing */
  await page.locator(".sa-toast-undo").first().click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const restored = await page.locator(".qc-sentmat .qc-mchip-att").count();
  console.log(`  undone: ${restored} pills`);
  expect(restored, "undo did not restore the material").toBe(before);
});
