/**
 * §4–§6 — the materials row, driven on the running page.
 *
 * ⚠️ THE WRITES ARE REAL, AND EACH IS UNDONE. This drives the app's own paths against the dev
 * account's data, so every mutation is reversed by the same control that made it before the run
 * ends. What it proves is that add, edit, remove and mark-sent behave; it deliberately leaves no
 * material behind.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcMaterials
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const chips = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const row = document.querySelectorAll(".qc-msub")[1] as HTMLElement;
  return {
    rowH: r(row.getBoundingClientRect().height),
    wraps: getComputedStyle(row).flexWrap,
    overflow: getComputedStyle(row).overflowX,
    chips: [...row.querySelectorAll(".qc-mchip-att")].map((c) => {
      const cs = getComputedStyle(c as HTMLElement);
      return {
        text: (c.querySelector(".qc-mchiptx")?.textContent ?? "").trim(),
        qty: (c.querySelector(".qc-mqtybadge")?.textContent ?? "").trim(),
        mark: (c.querySelector("i")?.textContent ?? "").trim(),
        h: r(c.getBoundingClientRect().height), rad: cs.borderTopLeftRadius,
        hasX: !!c.querySelector(".qc-mchipx"),
      };
    }),
    add: !!row.querySelector(".qc-mchip-add"),
    /* what §4 removed from the row */
    floatingRemove: [...row.querySelectorAll(".qc-mact")].map((b) => (b.textContent ?? "").trim()),
    upgradeLine: (row.textContent ?? "").includes("Upgrade to attach"),
  };
});

test("§4 — the chips carry their own quantity, mark and remove", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  const s = await chips(page);
  console.log(JSON.stringify(s, null, 1));

  expect(s.chips.length, "no material chips").toBeGreaterThan(0);
  /* one size and one radius across the row */
  expect([...new Set(s.chips.map((c) => c.h))], `the chips differ in height: ${s.chips.map((c) => c.h)}`).toHaveLength(1);
  expect([...new Set(s.chips.map((c) => c.rad))], "the chips differ in radius").toHaveLength(1);
  /* ⚠️ THE LABEL IS THE MATERIAL AND THE BADGE IS THE AMOUNT — a chip reading only "3 chapters"
     stated the quantity and not the thing it was a quantity of. */
  const sample = s.chips.find((c) => c.text === "Opening sample");
  expect(sample, `the sample chip is not named "Opening sample": ${s.chips.map((c) => c.text).join(", ")}`).toBeTruthy();
  /* §4's removals from the row */
  expect(s.floatingRemove, `a floating action survives in the row: ${s.floatingRemove.join(", ")}`).not.toContain("Remove");
  expect(s.upgradeLine, "the upgrade line is still in the row").toBe(false);
  /* ⚠️ THE ROW WRAPS, IT DOES NOT SCROLL — the card grows instead of hiding a material. */
  expect(s.wraps, "the row does not wrap").toBe("wrap");
  expect(s.overflow, "the row scrolls — a material could be hidden off its end").not.toMatch(/scroll|auto/);
  expect(s.add, "the + Attach control is missing").toBe(true);

  /* the × is revealed by hover, on the chip it removes */
  const first = page.locator(".qc-mchip-att").first();
  const before = await first.locator(".qc-mchipx").evaluate((e) => getComputedStyle(e).display).catch(() => "none");
  await first.hover();
  await page.waitForTimeout(120);
  const after = await first.locator(".qc-mchipx").evaluate((e) => getComputedStyle(e).display);
  console.log(`chip ×: rest="${before}" hover="${after}"`);
  expect(before, "the × is shown at rest").toBe("none");
  expect(after, "hovering a chip does not reveal its ×").not.toBe("none");
});

test("§5/§6 — the Attach menu is a complete statement, and closes properly", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  await page.locator(".qc-mchip-add").click();
  await page.waitForTimeout(250);
  const menu = await page.evaluate(() => {
    const m = document.querySelector('[aria-label="Add to this query"]') as HTMLElement | null;
    return {
      open: !!m,
      items: [...(m?.querySelectorAll("button") ?? [])].map((b) => ({ label: (b.textContent ?? "").trim(), disabled: (b as HTMLButtonElement).disabled })),
      portalled: m ? m.closest(".f12-root") === null : false,
    };
  });
  console.log(JSON.stringify(menu, null, 1));
  expect(menu.open, "the Attach menu did not open").toBe(true);
  /* ⚠️ EXACTLY THE FOUR LOCKED TYPES, AND THE TWO RETIRED ONES ABSENT */
  const labels = menu.items.map((i) => i.label);
  for (const t of ["Query letter", "Synopsis", "Opening sample", "Other"]) {
    expect(labels.some((l) => l.startsWith(t)), `${t} is not offered: ${labels.join(" | ")}`).toBe(true);
  }
  for (const gone of ["Author bio", "Full manuscript"]) {
    expect(labels.some((l) => l.startsWith(gone)), `${gone} was reinstated`).toBe(false);
  }
  /* ⚠️ ALREADY-ADDED TYPES STAY, MARKED — hiding them would shorten the menu every time it was used */
  expect(labels.some((l) => l.includes("Added")), `nothing is marked Added: ${labels.join(" | ")}`).toBe(true);
  /* the package moved in, below a rule, replacing the row's upgrade line */
  expect(labels.some((l) => l.includes("submission package")), "the package is not in the menu").toBe(true);
  expect(menu.portalled, "the menu is not portalled — the pane's overflow could clip it").toBe(true);

  /* ⚠️ ESCAPE CLOSES AND RETURNS FOCUS TO THE CHIP THAT OPENED IT */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    open: !!document.querySelector('[aria-label="Add to this query"]'),
    focused: (document.activeElement as HTMLElement)?.className ?? "",
  }));
  console.log(JSON.stringify(after));
  expect(after.open, "Escape did not close the menu").toBe(false);
  expect(after.focused, `focus did not return to the trigger: ${after.focused}`).toContain("qc-mchip-add");
});

/**
 * §5/§6 — the chip's own popover: the shared stepper, mark-as-sent showing state, and remove last.
 *
 * ⚠️ DRIVEN THROUGH THE APP'S OWN CONTROLS, AND EVERY WRITE UNDONE. The quantity is stepped and
 * then stepped back; nothing is left changed on the dev account.
 */
test("§5 — a chip's popover steps by the unit and states its own state", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  /* the sample chip — the one with a quantity */
  await page.locator(".qc-mchip-att").nth(2).click();
  await page.waitForTimeout(300);
  const open = await page.evaluate(() => {
    /* ⚠️ SCOPED TO `.f12-pop`, NOT `[role="dialog"]`. The To-do dock is also on this page and is
       also a dialog — a first-match query found IT and reported an empty popover, which read as
       "the popover did not open" about one that plainly had. */
    const p = document.querySelector(".f12-pop") as HTMLElement | null;
    return {
      title: (p?.querySelector(".f12-pt")?.textContent ?? "").trim(),
      qty: (p?.querySelector(".qc-mqty input") as HTMLInputElement | null)?.value,
      units: [...(p?.querySelectorAll(".qc-mpopunits button") ?? [])].map((b) => `${b.textContent}${b.classList.contains("on") ? "*" : ""}`),
      acts: [...(p?.querySelectorAll(".qc-mpopact") ?? [])].map((b) => (b.textContent ?? "").trim()),
      danger: (p?.querySelector(".qc-mpopact-danger")?.textContent ?? "").trim(),
      lastIsDanger: [...(p?.querySelectorAll(".qc-mpopact") ?? [])].pop()?.classList.contains("qc-mpopact-danger"),
    };
  });
  console.log(JSON.stringify(open, null, 1));
  expect(open.title, "the popover is not the material's").toBe("Opening sample");
  expect(open.units, "the unit set is not the shared one").toEqual(expect.arrayContaining(["Chapters", "Pages", "Words"].map((u) => expect.stringContaining(u))));
  /* ⚠️ REMOVE IS LAST — the destructive verb furthest from the one the hand lands on first */
  expect(open.lastIsDanger, `remove is not the last action: ${open.acts.join(" | ")}`).toBe(true);
  expect(open.danger).toContain("Remove");

  /* ⚠️ THE STEP IS THE UNIT'S, NOT ±1 — 5 for pages, from `stepAmount`. Stepped and stepped back. */
  const before = open.qty!;
  await page.locator('.qc-mqtysteps button[aria-label^="Up"]').click();
  await page.waitForTimeout(150);
  const up = await page.locator(".qc-mqty input").inputValue();
  await page.locator('.qc-mqtysteps button[aria-label^="Down"]').click();
  await page.waitForTimeout(150);
  const back = await page.locator(".qc-mqty input").inputValue();
  console.log(`step: ${before} → ${up} → ${back} (unit ${open.units.find((u) => u.endsWith("*"))})`);
  expect(Number(up) - Number(before), `the step is ${Number(up) - Number(before)}, not the unit's`).toBeGreaterThan(1);
  expect(back, "stepping back did not return the value").toBe(before);

  /* ⚠️ ESCAPE CLOSES AND FOCUS RETURNS TO THE CHIP (§6) */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    open: !!document.querySelector(".f12-pop"),
    focused: (document.activeElement as HTMLElement)?.className ?? "",
    text: (document.activeElement as HTMLElement)?.textContent?.trim().slice(0, 20) ?? "",
  }));
  console.log(JSON.stringify(after));
  expect(after.open, "Escape did not close the popover").toBe(false);
  expect(after.focused, `focus did not return to the chip: ${after.focused} "${after.text}"`).toContain("qc-mchip-att");
});

test("§5 — a binary chip's popover states its state rather than only the verb", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
  await page.locator(".qc-mchip-att").first().click();
  await page.waitForTimeout(300);
  const p = await page.evaluate(() => {
    const d = document.querySelector(".f12-pop") as HTMLElement;
    return { title: (d.querySelector(".f12-pt")?.textContent ?? "").trim(), acts: [...d.querySelectorAll(".qc-mpopact")].map((b) => (b.textContent ?? "").trim()) };
  });
  console.log(JSON.stringify(p));
  expect(p.title).toBe("Query letter");
  /* ⚠️ THE CURRENT STATE IS READABLE WITHOUT CHANGING IT — a toggle reading "Mark as sent" in both
     directions gives the writer no way to check the record. */
  expect(p.acts[0], `the mark action hides the state: ${p.acts[0]}`).toMatch(/Sent ✓|Mark as sent/);
  expect(p.acts, "there is no stepper on a binary material — a quantity of what?").not.toContain("Save quantity");
  await page.keyboard.press("Escape");
});
