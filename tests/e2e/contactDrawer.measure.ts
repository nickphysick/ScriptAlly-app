/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PEEK AND THE DRAWER, on a rendered page.
 *
 * ⚠️ THE UNIT LOCKS PROVE WHAT IS WRITTEN; THIS PROVES IT RUNS. `renderToStaticMarkup` cannot
 * flip a card, cannot open a drawer and cannot see a portal, so "the back face carries no form"
 * and "the drawer opens in read" are both settled there while "turning the card over actually
 * shows the peek" is not settled anywhere until a browser does it.
 *
 * ⚠️ AND THE FULL-BLEED CLAIM IS ONLY MEANINGFUL AS A MEASUREMENT. `max-width: 100vw` in a
 * stylesheet is a declaration; whether the drawer ends up occupying the viewport depends on the
 * cascade, on the inline width the caller passes, and on which of the two actually binds — which
 * is the whole reason the rule overrides `max-width` rather than `width`.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; animation: none !important; }`;
const SUBJECT = "fx-long";

async function openCast(page: import("@playwright/test").Page, width: number, height = 900) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width, height });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator(`[data-agent-card="${SUBJECT}"]`)).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

test.describe("the card turns over to the contact peek", () => {
  test("the contact button shows the peek, and the peek carries no form", async ({ page }) => {
    await openCast(page, 1440);
    const card = page.locator(`[data-agent-card="${SUBJECT}"]`);

    expect(await card.locator(".agl-peek").count(), "the peek is mounted before it is asked for").toBe(0);
    await card.getByRole("button", { name: /^Contact details for/ }).click();
    await expect(card.locator(".agl-peek")).toBeVisible({ timeout: 4_000 });

    const read = await page.evaluate((id) => {
      const scene = document.querySelector(`[data-agent-card="${id}"]`)!;
      const rotor = scene.querySelector(".agl-rotor") as HTMLElement;
      const back = scene.querySelector(".agl-faceb") as HTMLElement;
      return {
        flipped: rotor.classList.contains("flipped"),
        rotorH: rotor.getBoundingClientRect().height,
        backH: back.getBoundingClientRect().height,
        controls: back.querySelectorAll("input, textarea, select, form").length,
        rows: back.querySelectorAll(".agl-prow").length,
        rotorOverflow: getComputedStyle(rotor).overflow,
      };
    }, SUBJECT);
    // eslint-disable-next-line no-console
    console.log(`[peek] flipped=${read.flipped} rotor=${read.rotorH} back=${read.backH} rows=${read.rows} controls=${read.controls}`);

    expect(read.flipped).toBe(true);
    /* ⚠️ NO FORM, MEASURED ON THE PAGE — the unit lock asserts the component; this asserts what
       the card actually mounted, which is the half a child component could break. */
    expect(read.controls, "a form control reached the rendered back face").toBe(0);
    expect(read.rows, "the peek's rows did not render").toBeGreaterThan(3);

    /* the rotor keeps ONE height, so turning the card over does not move the grid row */
    expect(Math.abs(read.rotorH - 400), "the rotor resized on flip — the row jumps under the pointer").toBeLessThan(1);
    expect(Math.abs(read.backH - read.rotorH), "the back face is not the front's height").toBeLessThan(1);
    /* the flip's own physics: any overflow value on the rotor flattens 3D and mirrors the back */
    expect(read.rotorOverflow, "the rotor gained an overflow — the back face will render mirrored").toBe("visible");
  });
});

test.describe("the drawer", () => {
  test("opens in READ from the card body, edits, cancels back, and steps only when it may", async ({ page }) => {
    await openCast(page, 1440);
    await page.locator(`[data-agent-card="${SUBJECT}"] .agl-body`).click();

    const drawer = page.locator(".slo");
    await expect(drawer).toBeVisible({ timeout: 4_000 });

    const readState = await page.evaluate(() => {
      const d = document.querySelector(".slo")!;
      return {
        inputs: d.querySelectorAll("input, textarea, select").length,
        rows: d.querySelectorAll(".agl-prow").length,
        tabs: [...d.querySelectorAll(".agl-dtab")].map((t) => t.textContent),
        hasEdit: !!d.querySelector(".agl-dfoot")?.textContent?.includes("Edit"),
        width: d.getBoundingClientRect().width,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[drawer read] w=${readState.width} rows=${readState.rows} inputs=${readState.inputs} tabs=${readState.tabs.join("/")}`);

    expect(readState.inputs, "the drawer opened into a form — read is the default").toBe(0);
    expect(readState.rows, "the read view has no rows").toBeGreaterThan(6);
    expect(readState.tabs).toEqual(["Contact", "Wishlist", "Materials", "Notes"]);
    expect(readState.hasEdit).toBe(true);

    /* ── into edit ─────────────────────────────────────────────────────────────────────── */
    await drawer.getByRole("button", { name: /^Edit$/ }).click();
    /* ⚠️ NAME THE FIELD. `locator("input").first()` resolves to the avatar's hidden file picker —
       an element that is invisible by design — and then waits four seconds to report that a
       correctly-mounted editor is not there. A `.first()` on a generic locator answers a question
       you did not ask, in the format of the one you did. */
    await expect(drawer.locator("#agl-city")).toBeVisible({ timeout: 4_000 });

    const editState = await page.evaluate(() => {
      const d = document.querySelector(".slo")!;
      /* visible text fields only — the avatar's hidden file input is not what "the editor mounted" means */
      const visible = [...d.querySelectorAll("input")].filter((i) => (i as HTMLInputElement).type !== "file");
      return {
        inputs: visible.length,
        chevrons: d.querySelectorAll('button[aria-label$="agent"]').length,
        tablists: d.querySelectorAll('[role="tablist"]').length,
        heads: d.querySelectorAll(".agl-dhead").length,
        names: [...d.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent?.trim() === "Aisha Kapoor").length,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[drawer edit] inputs=${editState.inputs} chevrons=${editState.chevrons} tablists=${editState.tablists} heads=${editState.heads} names=${editState.names}`);
    expect(editState.inputs, "Edit did not mount the editor").toBeGreaterThan(3);
    /* ⚠️ ONE OF EACH. The drawer used to wrap a complete form in a second head, a second tab row
       and a second pair of commit buttons: the agent's name appeared twice and a role-based query
       for a tab was ambiguous, which is the accessibility tree reporting the duplication. */
    expect(editState.tablists, "two tab rows — the form brings its own and the drawer added another").toBe(1);
    expect(editState.heads, "the drawer kept its own head over the form's").toBe(0);
    expect(editState.names, "the agent's name is drawn twice while editing").toBe(1);
    /* the chevrons are not merely disabled mid-edit — they are not there to press */
    expect(editState.chevrons, "a chevron survives mid-edit — stepping would commit or discard unasked").toBe(0);

    /* ⚠️ THE DRAFT SURVIVES A TAB SWITCH. Typed here, looked away from, and still there — the
       claim the unit lock can only make about where the draft is OWNED. */
    const field = drawer.locator("#agl-city");
    await field.fill("Measured-on-page");
    await drawer.getByRole("tab", { name: "Materials" }).click();
    await drawer.getByRole("tab", { name: "Contact" }).click();
    await expect(drawer.locator("#agl-city"), "the draft was discarded by a glance at another tab").toHaveValue("Measured-on-page");

    /* ── discard returns to read, and writes nothing. It is the FORM's own control now, and a
       dirty draft asks first — which is the behaviour this editor has always had. ───────────── */
    await drawer.getByRole("button", { name: "Discard" }).click();
    await drawer.getByRole("button", { name: /^Discard$/ }).last().click();
    await expect(drawer.locator("#agl-city")).toHaveCount(0, { timeout: 6_000 });
    const afterCancel = await page.evaluate(() => {
      const d = document.querySelector(".slo");
      const chev = d ? ([...d.querySelectorAll('button[aria-label$="agent"]')] as HTMLButtonElement[]) : [];
      return { text: d?.textContent ?? "", chevrons: chev.length, anyDisabled: chev.some((c) => c.disabled), open: !!d && d.getAttribute("data-on") === "true" };
    });
    expect(afterCancel.text, "Discard kept the typed value — it should have thrown it away").not.toContain("Measured-on-page");
  });

  /* ⚠️ FULL BLEED IS A MEASUREMENT, NOT A DECLARATION. `max-width: 100vw` in a stylesheet says
     nothing about which of the cap and the caller's inline width actually binds. */
  test("takes the whole width below md, and 580 above it", async ({ page }) => {
    await openCast(page, 1440);
    await page.locator(`[data-agent-card="${SUBJECT}"] .agl-body`).click();
    await expect(page.locator(".slo")).toBeVisible({ timeout: 4_000 });
    const wide = await page.evaluate(() => document.querySelector(".slo")!.getBoundingClientRect().width);
    expect(Math.round(wide), "the drawer stopped being 580 on desktop").toBe(580);

    await page.setViewportSize({ width: 390, height: 780 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const narrow = await page.evaluate(() => ({
      w: document.querySelector(".slo")!.getBoundingClientRect().width,
      vw: window.innerWidth,
    }));
    // eslint-disable-next-line no-console
    console.log(`[bleed] desktop=${wide} mobile=${narrow.w}/${narrow.vw}`);
    expect(Math.round(narrow.w), "the drawer leaves a sliver of scrim below md — full bleed is not binding").toBe(narrow.vw);
  });
});
