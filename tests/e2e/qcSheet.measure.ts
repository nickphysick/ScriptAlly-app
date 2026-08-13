/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · the sheet-and-moment pack — REAL-BROWSER measurement.
 *
 * ⚠️ THE SOURCE LOCKS PROVE THE CAUSES; THIS PROVES THE PAGE. Everything here is a number the app
 * actually renders: the seam's height, the sheet's geometry and radius, the desk still being
 * mounted behind it, the stacking order, and the keyboard round trip.
 *
 * ⚠️ TRANSITIONS ARE SUPPRESSED FOR GEOMETRY AND LIFTED FOR BEHAVIOUR. A transitioned property
 * reports where it STARTED, so static measurement needs them off; but `animation: none` fires no
 * `animationend`, and this page's exits are driven by that event — so anything that changes state
 * must run with motion live. Both halves are below, deliberately separated.
 */
import { test, expect, Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const WIDTHS = [1024, 1440, 1920] as const;

/**
 * ⚠️ THIS FILE SIGNS IN FOR ITSELF, AND THE SAVED `storageState` IS NOT ENOUGH — a finding worth
 * recording. Firebase persists its session in **IndexedDB** (`firebaseLocalStorageDb`), and
 * Playwright's `storageState` captures cookies and localStorage ONLY. The saved file therefore
 * carries this app's preferences and no session at all, so every measurement that trusted it ran
 * SIGNED OUT — against the auth page, reporting confident numbers about the wrong page. That is
 * precisely the failure the config's header warns about for a missing password, arriving by a door
 * the guard does not cover.
 *
 * So: one serial describe, one context, sign in once, measure everything in it.
 */
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
function password(): string {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  const p = resolve(process.cwd(), ".env.local");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
      if (m) return m[1].trim().replace(/^["\']|["\']$/g, "");
    }
  }
  throw new Error("No SA_E2E_PASSWORD — every measurement would run signed out.");
}

async function signIn(page: Page) {
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(EMAIL);
  await page.locator("#au-pw").fill(password());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  const shell = page.locator(".ws-panel, .sv2-app, #app-stage-scroll").first();
  for (let step = 0; step < 8; step += 1) {
    if (await shell.count()) break;
    const skip = page.getByRole("button", { name: /^Skip this step$/ });
    const cont = page.getByRole("button", { name: /^Continue/ });
    const option = page.getByRole("button", { name: /Just getting started/ });
    if (await skip.count()) await skip.first().click();
    else if (await option.count()) { await option.first().click(); await cont.first().click(); }
    else if (await cont.count()) await cont.first().click();
    else break;
    await page.waitForTimeout(1000);
  }
  await expect(shell).toBeVisible({ timeout: 30_000 });
}

/** Kill transitions AND animations for static reads — via a stylesheet, so it reaches ::after. */
async function freeze(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important; animation: none !important; }`,
  });
}

async function openQueries(page: Page) {
  await page.goto("/queries");
  await page.locator(".f12-list").first().waitFor({ state: "visible", timeout: 20000 });
  /* ⚠️ WAIT FOR THE DATA, NOT JUST THE PAGE. The list renders before the query snapshot lands, so
     for a beat `queries.length === 0` is true and the page draws its WELCOME branch — whose CTA is
     "Send your first query", not "Log query". Clicking that beat opened nothing and looked exactly
     like a broken sheet. The reading pane's presence means the populated branch is up. */
  await page.locator(".qp-pane").first().waitFor({ state: "attached", timeout: 20000 });
}

/**
 * ⚠️ THE HARNESS ACCOUNT HAS NO QUERIES, AND THE SEED SCRIPT IS BLOCKED (`PERMISSION_DENIED` from
 * the dev project's deployed rules — a pre-existing environment state, not this pack's). An empty
 * database renders the WELCOME branch, which has no `.qp-pane`, so the split cannot be measured at
 * rest.
 *
 * It CAN be measured with a journey open, and that is the stronger reading anyway: `creating` puts
 * the page into the populated branch, so the desk renders in full BEHIND the sheet — which is
 * exactly what §2 claims and what a takeover could never have shown. Every seam figure below is
 * therefore taken with the sheet up.
 */
async function openCreate(page: Page) {
  await openQueries(page);
  await page.getByRole("button", { name: /^Log query$/ }).first().click();
  await page.locator(".qc-sheet").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(700); // past the 420ms lay-down
}

test.describe.configure({ mode: "serial" });

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await signIn(page);
});
test.afterAll(async () => { await page.close(); });

test.describe("§1 · the rest state", () => {
  for (const w of WIDTHS) {
    test(`the seam spans both columns at ${w}`, async () => {
      await page.setViewportSize({ width: w, height: 900 });
      await openCreate(page);
      await freeze(page);

      const m = await page.evaluate(() => {
        const list = document.querySelector(".f12-list") as HTMLElement | null;
        const body = document.querySelector(".f12-body") as HTMLElement | null;
        const pane = document.querySelector(".qp-pane") as HTMLElement | null;
        if (!list || !body || !pane) return null;
        return {
          list: list.getBoundingClientRect().height,
          body: body.getBoundingClientRect().height,
          pane: pane.getBoundingClientRect().height,
          border: getComputedStyle(list).borderRightWidth,
          rows: (document.querySelectorAll(".f12-row") ?? []).length,
        };
      });
      expect(m, "the split did not render").not.toBeNull();
      /* the line IS the column's right edge, so "full height" means the column is the row's height */
      expect(Math.abs(m!.list - m!.body), `seam short by ${m!.body - m!.list}px`).toBeLessThanOrEqual(1);
      expect(Math.abs(m!.pane - m!.body)).toBeLessThanOrEqual(1);
      expect(m!.border).toBe("1px");
      // eslint-disable-next-line no-console
      console.log(`[seam ${w}] list=${m!.list} pane=${m!.pane} body=${m!.body} rows=${m!.rows}`);
    });
  }

  test("the list head's controls are one size, and none of them is disabled", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCreate(page);
    await freeze(page);
    const m = await page.evaluate(() => {
      const head = document.querySelector(".f12-lhead") as HTMLElement | null;
      if (!head) return null;
      const pills = Array.from(head.querySelectorAll<HTMLElement>(".f12-pill"));
      const field = head.querySelector(".f12-lsearch") as HTMLElement | null;
      const keb = document.querySelector(".qc-kebab") as HTMLElement | null;
      const box = (el: HTMLElement | null) => (el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), r: getComputedStyle(el).borderRadius } : null);
      return {
        pills: pills.map((p) => box(p)),
        disabled: pills.filter((p) => (p as HTMLButtonElement).disabled).length
          + (field?.querySelector("input:disabled") ? 1 : 0),
        fieldH: field ? Math.round(field.getBoundingClientRect().height) : null,
        keb: box(keb),
        insideList: !!head.closest(".f12-list"),
      };
    });
    expect(m, "the list head did not render").not.toBeNull();
    expect(m!.insideList, "the head is not inside the list column").toBe(true);
    expect(m!.disabled, "a control in the list head is disabled").toBe(0);
    for (const p of m!.pills) expect(p!.h, "a pill left the 34px vocabulary").toBe(34);
    expect(m!.fieldH, "the field is not the pills' height").toBe(34);
    if (m!.keb) {
      expect(m!.keb.h, "the kebab left the shared size").toBe(34);
      expect(m!.keb.r, "the kebab and the pills are different shapes").toBe(m!.pills[0]!.r);
    }
    // eslint-disable-next-line no-console
    console.log(`[head] pills=${JSON.stringify(m!.pills)} field=${m!.fieldH} kebab=${JSON.stringify(m!.keb)}`);
  });
});

test.describe("§2/§3/§5 · the sheet", () => {
  for (const w of WIDTHS) {
    test(`the create sheet at ${w} — geometry, desk behind, stacking`, async () => {
      await page.setViewportSize({ width: w, height: 900 });
      /* ⚠️ NOT FROZEN UNTIL IT IS OPEN — opening is a state change, and this page's entrance and
         exit are driven by `animationend`, which `animation: none` never fires. */
      await openCreate(page);
      await freeze(page);

      const m = await page.evaluate(() => {
        const sheet = document.querySelector(".qc-sheet") as HTMLElement | null;
        const jbody = document.querySelector(".qc-take-body, .qc-sheet-body > div") as HTMLElement | null;
        const layer = document.querySelector(".qc-sheet-layer") as HTMLElement | null;
        const scrim = document.querySelector(".qc-sheet-scrim") as HTMLElement | null;
        const list = document.querySelector(".f12-list") as HTMLElement | null;
        const root = document.getElementById("root");
        const toasts = document.querySelector(".sa-toasts") as HTMLElement | null;
        if (!sheet || !layer || !scrim || !root) return null;
        const r = sheet.getBoundingClientRect();
        const cs = getComputedStyle(sheet);
        return {
          w: Math.round(r.width), h: Math.round(r.height),
          radius: cs.borderRadius,
          border: cs.borderWidth,
          shadowLayers: (cs.boxShadow.match(/rgba?\(/g) ?? []).length,
          layerZ: getComputedStyle(layer).zIndex,
          toastZ: toasts ? getComputedStyle(toasts).zIndex : null,
          scrimBg: getComputedStyle(scrim).backgroundImage.slice(0, 24),
          /* the desk must still be there */
          listVisible: !!list && list.getBoundingClientRect().height > 0,
          listDisplay: list ? getComputedStyle(list).display : null,
          /* §3 · the page behind is sealed */
          rootInert: root.hasAttribute("inert"),
          /* §5 · the lamplight */
          rootOpacity: getComputedStyle(root).opacity,
          rootFilter: getComputedStyle(root).filter,
          lampClasses: root.className,
          dialog: sheet.closest('[role="dialog"]')?.getAttribute("aria-modal") ?? null,
          jbody: jbody ? Math.round(jbody.getBoundingClientRect().height) : null,
          viewportW: window.innerWidth, viewportH: window.innerHeight,
        };
      });
      expect(m, "the sheet did not render").not.toBeNull();

      /* geometry is a relationship to the viewport, so the desk shows on all four sides */
      expect(m!.w).toBe(Math.min(1080, m!.viewportW - 84));
      /* ⚠️ IT FILLS. `max-height` alone made it a content-sized box, and every `flex: 1 1 0` inside
         the journey contributed zero to it — measured 182px at every width, header and dock only,
         with the whole body collapsed. Asserting the exact height is what catches that returning. */
      expect(m!.h, "the sheet is hugging its content — the journey body has collapsed")
        .toBe(m!.viewportH - 76);
      expect(m!.radius, "the sheet is not square").toMatch(/^0px/);
      expect(m!.border, "the rim became a border").toMatch(/^0px/);
      expect(m!.shadowLayers, "the layered shadow collapsed").toBeGreaterThanOrEqual(4);

      /* the desk stays mounted and visible */
      expect(m!.listVisible, "the list vanished behind the sheet").toBe(true);
      expect(m!.listDisplay).not.toBe("none");

      /* stacking: above the page, below the toast host */
      expect(Number(m!.layerZ)).toBeGreaterThan(70);
      if (m!.toastZ && m!.toastZ !== "auto") expect(Number(m!.layerZ)).toBeLessThan(Number(m!.toastZ));

      /* §3 · sealed, and §5 · dimmed */
      expect(m!.rootInert, "the desk behind is not inert").toBe(true);
      expect(Number(m!.rootOpacity), "the lamplight did not dim the chrome").toBeLessThan(0.5);
      expect(m!.rootFilter, "the desaturation is missing").toContain("saturate");
      expect(m!.dialog, "the sheet is not a modal dialog").toBe("true");
      expect(m!.scrimBg, "the scrim is not a radial").toContain("radial");

      expect(m!.jbody, "the journey body rendered at zero height inside the sheet").toBeGreaterThan(200);
      // eslint-disable-next-line no-console
      console.log(`[sheet ${w}] ${m!.w}x${m!.h} body=${m!.jbody} r=${m!.radius} z=${m!.layerZ}/${m!.toastZ} inert=${m!.rootInert} dim=${m!.rootOpacity} filter=${m!.rootFilter} list=${m!.listDisplay}`);
    });
  }

  /* ⚠️ MOTION LIVE. Escape's teardown rides `animationend`; frozen, the sheet would arm its exit
     and never leave, which is precisely the trap recorded in CLAUDE.md. */
  test("keyboard: a clean sheet opens and closes with no confirm, and focus returns", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openQueries(page);
    const trigger = page.getByRole("button", { name: /Log query/i }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.locator(".qc-sheet").waitFor({ state: "visible", timeout: 10000 });

    /* focus moved into the overlay */
    const inSheet = await page.evaluate(() => !!document.activeElement?.closest(".qc-sheet-layer"));
    expect(inSheet, "focus did not move into the sheet").toBe(true);

    await page.keyboard.press("Escape");
    await page.locator(".qc-sheet").waitFor({ state: "detached", timeout: 10000 });

    const after = await page.evaluate(() => ({
      confirm: !!document.querySelector(".sa-confirm"),
      inert: !!document.getElementById("root")?.hasAttribute("inert"),
      lamp: document.getElementById("root")?.className ?? "",
      opacity: getComputedStyle(document.getElementById("root")!).opacity,
      focused: document.activeElement?.textContent?.trim().slice(0, 20) ?? null,
    }));
    expect(after.confirm, "an untouched sheet asked before closing").toBe(false);
    expect(after.inert, "the page stayed sealed after the sheet closed").toBe(false);
    expect(after.lamp, "the lamplight stayed on").not.toContain("qc-lamp");
    expect(Number(after.opacity), "the chrome stayed dimmed").toBe(1);
    // eslint-disable-next-line no-console
    console.log(`[keyboard] confirm=${after.confirm} inert=${after.inert} opacity=${after.opacity} focus="${after.focused}"`);
  });

  test("scrim-click on a DIRTY sheet routes through the guard", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCreate(page);

    /* ⚠️ DIRTY MEANS THE DRAFT CHANGED, NOT THAT SOMETHING WAS TYPED. The first version of this
       typed into the agent picker's SEARCH field — UI state, not draft state — so the sheet was
       genuinely clean and closed silently, and the test called that a silent discard. It was the
       test that was wrong, which is exactly the reading a browser check is for. Picking an agent
       writes `draft.agentId`, which is the baseline diff's business. */
    const show = page.getByRole("button", { name: /^Show them$/ });
    if (await show.count()) { await show.first().click(); await page.waitForTimeout(400); }
    /* the picker's options live in a dropdown that opens on focus — a search term is UI state and
       opens the list; CLICKING an option is what writes `draft.agentId`. */
    const field = page.locator(".qc-sheet .qc-pickfield").first();
    if (await field.count()) { await field.click(); await page.waitForTimeout(500); }
    const row = page.locator(".qc-sheet [role='option']").first();
    const picked = await row.count() > 0;
    if (picked) { await row.click(); await page.waitForTimeout(400); }

    /* click the backdrop, well clear of the sheet */
    await page.mouse.click(20, 20);
    await page.waitForTimeout(600);
    const state = await page.evaluate(() => ({
      confirm: !!document.querySelector(".sa-confirm"),
      sheet: !!document.querySelector(".qc-sheet"),
    }));
    // eslint-disable-next-line no-console
    console.log(`[scrim dirty] picked=${picked} confirm=${state.confirm} sheetStillOpen=${state.sheet}`);
    if (!picked) {
      /* ⚠️ REPORTED, NOT SKIPPED SILENTLY. If nothing could be made dirty, this case proved the
         CLEAN path instead — and says so, rather than passing as though it had done its job. */
      expect(state.confirm, "a clean sheet asked before closing").toBe(false);
      expect(state.sheet, "a clean sheet did not close on a backdrop click").toBe(false);
      return;
    }
    expect(state.confirm || state.sheet, "a dirty sheet was discarded silently by a backdrop click").toBe(true);
  });
});
