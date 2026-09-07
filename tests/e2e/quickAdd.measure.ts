/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUICK ADD, on a rendered page.
 *
 * ⚠️ "EVERY SURFACE RE-RENDERS FROM THE STORE" IS A CLAIM NO SOURCE LOCK CAN MAKE. That each view
 * reads the same array is a property of the PARTS; what matters is that a value typed in one of
 * them appears in the other three without a reload, and only a browser can answer that.
 *
 * ⚠️ AND THE KEYBOARD IS THE SAME. Enter, Tab and Escape are three different writes — one, one and
 * none — and the difference between them is what a reader loses if it is wrong.
 *
 * It runs against the LAB, which holds the cast in state and implements `updateAgent` over its own
 * copy. Nothing here touches an account.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; }`;
const SPARSE = "fx-sparse";

async function openList(page: import("@playwright/test").Page) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const slot = (page: import("@playwright/test").Page, field: string) =>
  page.locator(`[data-add-slot="${field}"][data-agent="${SPARSE}"]`);

test.describe("the popover", () => {
  test("opens anchored, heads with the first name and the field, and saves on Enter", async ({ page }) => {
    await openList(page);
    await slot(page, "email").click();
    const pop = page.locator(".agl-qa");
    await expect(pop).toBeVisible({ timeout: 4_000 });

    const head = await page.evaluate(() => {
      const p = document.querySelector(".agl-qa") as HTMLElement;
      const anchor = document.querySelector('[data-add-slot="email"][data-agent="fx-sparse"]') as HTMLElement;
      const pr = p.getBoundingClientRect();
      const ar = anchor.getBoundingClientRect();
      return {
        name: p.querySelector(".agl-qa-head b")?.textContent ?? "",
        field: p.querySelector(".agl-qa-head span")?.textContent ?? "",
        foot: (p.querySelector(".agl-qa-kbd")?.textContent ?? "").trim(),
        width: Math.round(pr.width),
        parentIsBody: p.parentElement === document.body,
        onScreen: pr.top >= 0 && pr.bottom <= window.innerHeight && pr.left >= 0 && pr.right <= window.innerWidth,
        nearAnchor: Math.abs(pr.left - ar.left) < 340 && Math.abs(pr.top - ar.bottom) < 420,
        slotOpen: anchor.className.includes("agl-gap-on"),
        focused: document.activeElement?.id ?? "",
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[pop] "${head.name}" / "${head.field}" w=${head.width} body=${head.parentIsBody} onScreen=${head.onScreen} anchored=${head.nearAnchor} slotOpen=${head.slotOpen} focus=${head.focused} foot="${head.foot}"`);

    /* the FIRST name — the row already says who they are */
    expect(head.name, "the head shows the full name, or none").toBe("Ottoline");
    expect(head.field).toBe("Email");
    expect(head.width).toBe(308);
    expect(head.parentIsBody, "the popover is not portalled — a row's overflow will clip it").toBe(true);
    expect(head.onScreen, "the popover hangs off the viewport").toBe(true);
    expect(head.nearAnchor, "the popover is not anchored to the slot that opened it").toBe(true);
    expect(head.slotOpen, "the slot does not wear its open state").toBe(true);
    expect(head.focused, "the field is not focused — a popover that needs a click to type in is a dialog").toBe("agl-qa-in");
    expect(head.foot).toContain("save");

    /* ── Enter saves and closes ─────────────────────────────────────────────────────────── */
    await page.keyboard.type("ottoline@frayn.co.uk");
    await page.keyboard.press("Enter");
    await expect(pop).toHaveCount(0, { timeout: 4_000 });

    const after = await page.evaluate(() => {
      const row = document.querySelector('[data-agent="fx-sparse"]')?.closest(".agl-lrow")
        ?? [...document.querySelectorAll(".agl-lrow")].find((r) => (r.textContent ?? "").includes("Ottoline"));
      return {
        text: (row as HTMLElement)?.innerText.replace(/\n/g, " | ") ?? "",
        stillASlot: !!row?.querySelector('[data-add-slot="email"]'),
        flashed: !!row?.querySelector(".agl-just"),
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[saved] flash=${after.flashed} slotGone=${!after.stillASlot} row="${after.text.slice(0, 90)}"`);
    expect(after.text, "the value did not reach the row").toContain("ottoline@frayn.co.uk");
    expect(after.stillASlot, "the cell still offers a slot after it was filled").toBe(false);
    /* ⚠️ THE FLASH MARKS WHERE IT LANDED — sage, brief, and the only colour used. */
    expect(after.flashed, "nothing marked where the value landed").toBe(true);
  });

  /* ⚠️ ONE STORE, FOUR SURFACES. A value typed in the list must be in the grid, the board and the
     drawer's read view without a reload — which is the claim "nothing keeps its own copy" makes. */
  test("the saved value is in every view within one render", async ({ page }) => {
    await openList(page);
    await slot(page, "email").click();
    await page.keyboard.type("ottoline@frayn.co.uk");
    await page.keyboard.press("Enter");
    await expect(page.locator(".agl-qa")).toHaveCount(0, { timeout: 4_000 });

    const seen: Record<string, boolean> = {};
    seen.list = (await page.locator(".agl-list").innerText()).includes("ottoline@frayn.co.uk");

    await page.getByRole("button", { name: "Grid", exact: true }).click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.locator(`[data-agent-card="${SPARSE}"] .agl-body`).click();
    await expect(page.locator(".slo")).toBeVisible({ timeout: 4_000 });
    seen.drawer = (await page.locator(".slo").innerText()).includes("ottoline@frayn.co.uk");
    await page.locator(".slo").getByRole("button", { name: "Close" }).click();

    /* the card's own back face renders the peek — the same rows, the third container */
    await page.locator(`[data-agent-card="${SPARSE}"]`).getByRole("button", { name: /^Contact details for/ }).click();
    await expect(page.locator(`[data-agent-card="${SPARSE}"] .agl-peek`)).toBeVisible({ timeout: 4_000 });
    seen.card = (await page.locator(`[data-agent-card="${SPARSE}"] .agl-faceb`).innerText()).includes("ottoline@frayn.co.uk");

    // eslint-disable-next-line no-console
    console.log(`[one store] list=${seen.list} drawer=${seen.drawer} card=${seen.card}`);
    for (const [where, ok] of Object.entries(seen)) {
      expect(ok, `the ${where} did not show the value — that surface is keeping its own copy`).toBe(true);
    }
  });
});

test.describe("the keyboard", () => {
  /* ⚠️ TAB SAVES AND MOVES ON, WITHIN THE ROW. It never carries into the next agent: you would be
     three fields into somebody else's details before anything on screen told you. */
  test("Tab saves and opens the next empty slot in the SAME row", async ({ page }) => {
    await openList(page);
    await slot(page, "email").click();
    await page.keyboard.type("ottoline@frayn.co.uk");
    await page.keyboard.press("Tab");

    await expect(page.locator(".agl-qa")).toBeVisible({ timeout: 4_000 });
    const next = await page.evaluate(() => {
      const p = document.querySelector(".agl-qa") as HTMLElement;
      const open = document.querySelector(".agl-gap-on") as HTMLElement;
      return {
        field: p.querySelector(".agl-qa-head span")?.textContent ?? "",
        agent: open?.getAttribute("data-agent") ?? "",
        slotField: open?.getAttribute("data-add-slot") ?? "",
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[tab] now on ${next.agent}/${next.slotField} ("${next.field}")`);
    expect(next.slotField, "Tab did not move to the next empty field").toBe("website");
    expect(next.agent, "Tab carried into another agent's row").toBe(SPARSE);
    /* and the email it saved on the way is on the page */
    expect(await page.locator(".agl-list").innerText()).toContain("ottoline@frayn.co.uk");
  });

  /* ⚠️ ESCAPE ABANDONS WITHOUT WRITING — the one of the three that must leave no trace. */
  test("Escape writes nothing", async ({ page }) => {
    await openList(page);
    await slot(page, "email").click();
    await page.keyboard.type("discard@me.example");
    await page.keyboard.press("Escape");
    await expect(page.locator(".agl-qa")).toHaveCount(0, { timeout: 4_000 });

    const r = await page.evaluate(() => ({
      wrote: (document.querySelector(".agl-list") as HTMLElement).innerText.includes("discard@me.example"),
      slotBack: !!document.querySelector('[data-add-slot="email"][data-agent="fx-sparse"]'),
    }));
    // eslint-disable-next-line no-console
    console.log(`[escape] wrote=${r.wrote} slotStillThere=${r.slotBack}`);
    expect(r.wrote, "Escape wrote the value it was told to abandon").toBe(false);
    expect(r.slotBack, "the slot did not come back after abandoning").toBe(true);
  });
});

test.describe("a dangerous address cannot become a live link", () => {
  /* ⚠️ THE STORED-XSS PATH, MEASURED ON THE PAGE. The unit lock proves the normaliser; this proves
     that what the normaliser produced is what the anchor actually got. */
  test("javascript: typed into the popover is saved, shown, and inert", async ({ page }) => {
    await openList(page);
    await slot(page, "website").click();
    await page.keyboard.type("javascript:alert(1)");

    const warned = await page.locator(".agl-qa-warn").innerText();
    await page.keyboard.press("Enter");
    await expect(page.locator(".agl-qa")).toHaveCount(0, { timeout: 4_000 });

    const r = await page.evaluate(() => {
      const row = [...document.querySelectorAll(".agl-lrow")].find((x) => (x.textContent ?? "").includes("Ottoline"));
      const a = row?.querySelector("a.agl-lk") as HTMLAnchorElement | null;
      return { href: a?.getAttribute("href") ?? null, shown: a?.textContent ?? "", anyJs: (document.body.innerHTML.match(/href="javascript:/gi) ?? []).length };
    });
    // eslint-disable-next-line no-console
    console.log(`[xss/popover] warned="${warned.slice(0, 44)}…" href=${JSON.stringify(r.href)} liveJsHrefs=${r.anyJs}`);

    expect(warned, "the rewrite happened without telling the reader").toContain("Only web addresses");
    /* saved, not refused — and visible, so the writer can see what became of it */
    expect(r.shown, "the value was silently discarded rather than stored").toContain("javascript:alert(1)");
    expect(r.href, "a dangerous scheme reached an href").toMatch(/^https:\/\//i);
    expect(r.anyJs, "a javascript: href exists somewhere on the page").toBe(0);
  });

  /**
   * ⚠️ AND THE SAME VALUE FROM THE OTHER WRITE PATH, WHICH IS THE ONE THAT MATTERS.
   *
   * The popover normalises on the way IN, so by the time the list renders one of its values the
   * danger is already gone — which means a render site that built its own raw href would pass a
   * check that only ever created values through the popover. Proved: reverting `hrefFor` to a bare
   * `href={site}` left all six cases green.
   *
   * The DRAWER does not normalise, and neither does an import or a legacy record. That is the case
   * the render-site guard exists for, so it is the case measured — typed into the editor's own
   * field, saved through the editor's own button, and read off the row it lands in.
   */
  test("javascript: stored by the DRAWER never reaches an href", async ({ page }) => {
    await openList(page);
    await page.locator(`[data-add-slot="website"][data-agent="${SPARSE}"]`).click();
    await page.keyboard.press("Escape");

    /* the pencil goes straight to Contact in edit — no normaliser anywhere on this path */
    await page.getByRole("button", { name: "Grid", exact: true }).click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.locator(`[data-agent-card="${SPARSE}"]`).getByRole("button", { name: /^Edit / }).click({ timeout: 8_000 });
    const site = page.locator('input[data-field="website"]');
    await expect(site).toBeVisible({ timeout: 4_000 });
    await site.fill("javascript:alert('stored')");
    /* ⚠️ THE COMMIT BUTTON IS "Done", NOT "Save" — the buffered-editing law: opening clones the
       agent into a draft, every keystroke mutates the draft alone, and Done validates, diffs and
       commits ONE `updateAgent`. A probe written for "Save" matches nothing and waits out the
       whole test timeout, which reads as a hung page rather than a wrong selector. */
    await page.locator(".slo").getByRole("button", { name: "Done", exact: true }).click({ timeout: 8_000 });
    await expect(page.locator('input[data-field="website"]')).toHaveCount(0, { timeout: 6_000 });

    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const r = await page.evaluate(() => {
      const row = [...document.querySelectorAll(".agl-lrow")].find((x) => (x.textContent ?? "").includes("Ottoline"));
      const a = row?.querySelector("a.agl-lk") as HTMLAnchorElement | null;
      return {
        stored: (row as HTMLElement)?.innerText.includes("javascript:alert('stored')") ?? false,
        href: a?.getAttribute("href") ?? null,
        anyJs: (document.body.innerHTML.match(/href="javascript:/gi) ?? []).length,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[xss/drawer] storedOnPage=${r.stored} href=${JSON.stringify(r.href)} liveJsHrefs=${r.anyJs}`);

    expect(r.stored, "the drawer did not store the value — this case is not being exercised").toBe(true);
    expect(r.anyJs, "a javascript: href reached the page from the drawer's write path").toBe(0);
    if (r.href !== null) expect(r.href, "the rendered link kept a dangerous scheme").toMatch(/^https?:\/\//i);
  });
});
