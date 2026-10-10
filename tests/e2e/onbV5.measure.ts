/**
 * Onboarding v5, part 1 — sign-up, sign-in and the set-up steps in the app's frame. Locks OB1.
 *
 * Measured on `#/onb-lab`, which mounts each screen over fixtures inside the real `SetupFrame`
 * (no sign-in, no writes). The two cases that need the real app — F1's comparison with the shell
 * on `/dashboard`, and A4's harness walk — sign in as the harness account and say so.
 *
 *   OB_MUTATE=<lock>  apply that lock's named break in the page, to prove it goes red
 *   OB_SHOTS=1        write the report's screenshots
 *
 * Every sweep states its population first. The e2e password is never printed.
 */
import { test, expect, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ensureSignedIn } from "./measure";

export const VPS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
const OUT = resolve("reports/onb-v5-setup");
const MUTATE = process.env.OB_MUTATE ?? "";
const SHOTS = !!process.env.OB_SHOTS;

/** Every screen and state this pack builds, by lab query. Later phases add to it. */
export const SCREENS: Array<{ id: string; q: string; form: "account" | "setup" }> = [
  { id: "frame-setup", q: "s=frame&form=setup&flow=B&at=list&ms=1", form: "setup" },
  { id: "frame-account", q: "s=frame&form=account&mode=signup", form: "account" },
];

const MUTATIONS: Record<string, string> = {
  F1: ".sf .sf-panel, .sf .sf-panel .ws-pin{width:260px!important}",
  F4: "@media (max-width:899.98px){.sf{position:fixed!important;inset:0!important;height:100vh!important;min-height:0!important;overflow:hidden!important}" +
      ".sf .sf-main{height:100vh!important;min-height:0!important;overflow:hidden!important}}",
};

async function mutate(page: Page) {
  if (!MUTATE) return;
  if (MUTATIONS[MUTATE]) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
  if (MUTATE === "F2") {
    await page.evaluate(() => {
      const bar = document.querySelector(".sf-bar");
      const img = document.createElement("img");
      img.src = "/scriptally-title-v2.png"; img.alt = "ScriptAlly";
      bar?.prepend(img);
    });
  }
  if (MUTATE === "F3") {
    await page.evaluate(() => {
      const ol = document.querySelector(".sf-steps");
      if (ol && ol.children.length === 2) ol.appendChild(ol.children[1].cloneNode(true));
    });
  }
}

export async function lab(page: Page, q: string, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.goto("/#/onb-lab?" + q, { waitUntil: "load" });
  /* The hash alone does not remount the app when only the query changes. */
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("[data-setup-frame]");
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await page.evaluate(() => (document as Document).fonts.ready);
  await mutate(page);
  await page.waitForTimeout(150);
}

export const shot = async (page: Page, name: string, fullPage = true) => {
  if (!SHOTS) return;
  mkdirSync(resolve(OUT, "shots"), { recursive: true });
  await page.screenshot({ path: resolve(OUT, "shots", name + ".png"), fullPage });
};

async function pixels(page: Page, points: Array<[number, number]>): Promise<number[][]> {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async ({ png, points }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + png;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const k = img.naturalWidth / window.innerWidth;
    return points.map(([x, y]) => Array.from(ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data).slice(0, 3));
  }, { png, points });
}
const near = (c: number[], want: number[], tol = 2) => [0, 1, 2].every((i) => Math.abs(c[i] - want[i]) <= tol);
const INK = [27, 36, 51];

/** The frame's geometry, read the same way on the lab and on the app. */
const geometry = (page: Page, root: string) => page.evaluate((root) => {
  /* Vertical positions are read from the shell's own top edge: the app carries a beta strip above
     its shell and the frame starts at the window's top, so viewport y would compare two origins. */
  const top = (document.querySelector(root) as HTMLElement).getBoundingClientRect().top;
  const r = (sel: string) => {
    const e = document.querySelector(root + " " + sel) as HTMLElement | null;
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return [b.x, b.y - top, b.width, b.height];
  };
  const win = document.querySelector(root + " .ws-window") as HTMLElement | null;
  const cs = win ? getComputedStyle(win) : null;
  const wb = win?.getBoundingClientRect();
  return {
    panel: r(".ws-panel"), mark: r(".ws-panel .ws-bmark"), word: r(".ws-panel .ws-bwm"),
    insetRight: wb ? window.innerWidth - wb.right : null,
    insetBottom: wb ? window.innerHeight - wb.bottom : null,
    sheetTop: wb ? wb.top - top : null,
    radii: cs ? [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius] : null,
    tab: r(".ws-ftab"),
  };
}, root);

test.describe("OB1", () => {
  test("F1 the frame is the ink shell, and its geometry is the app's", async ({ page }) => {
    /* The app's own shell first, in this run: the frame is compared with a reading, not a number. */
    const app: Record<number, Awaited<ReturnType<typeof geometry>>> = {};
    await page.setViewportSize(VPS[0]);
    await page.goto("/dashboard");
    await ensureSignedIn(page);
    for (const vp of VPS.slice(0, 2)) {
      await page.setViewportSize(vp);
      await page.goto("/dashboard", { waitUntil: "load" });
      await page.waitForSelector(".ws-app .ws-window");
      await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
      await page.waitForTimeout(400);
      app[vp.width] = await geometry(page, ".ws-app:not(.sf)");
      expect(app[vp.width].panel, "the app's sidebar is on screen").toBeTruthy();
    }
    let read = 0;
    for (const sc of SCREENS) for (const vp of VPS) {
      await lab(page, sc.q, vp);
      const g = await page.evaluate(() => {
        const d = document.documentElement;
        return {
          frame: getComputedStyle(document.querySelector(".sf")!).backgroundColor,
          sheet: getComputedStyle(document.querySelector(".sf-sheet")!).backgroundColor,
          overflow: d.scrollWidth - d.clientWidth,
        };
      });
      expect(g.frame, `${sc.id} @${vp.width}: frame ground`).toBe("rgb(27, 36, 51)");
      expect(g.sheet, `${sc.id} @${vp.width}: sheet ground`).toBe("rgb(242, 238, 232)");
      expect(g.overflow, `${sc.id} @${vp.width}: horizontal overflow`).toBeLessThanOrEqual(0);
      /* Nothing light touches the frame's edge: the four edge midpoints are ink. */
      const w = vp.width, h = vp.height;
      const edge = await pixels(page, [[2, h / 2], [w - 3, h / 2], [w / 2, 2]]);
      edge.forEach((px, i) => expect(near(px, INK), `${sc.id} @${vp.width}: edge ${i} is ink, got ${px}`).toBe(true));
      if (vp.width >= 900 && sc.form === "setup") {
        const f = await geometry(page, ".sf");
        const a = app[vp.width];
        const same = (x: number[] | null, y: number[] | null, what: string) => {
          expect(x && y, `${what} is rendered on both`).toBeTruthy();
          x!.forEach((v, i) => expect(Math.abs(v - y![i]), `${sc.id} @${vp.width}: ${what}[${i}] ${v} vs the app's ${y![i]}`).toBeLessThanOrEqual(0.5));
        };
        same([f.panel![2]], [a.panel![2]], "sidebar width");
        same(f.mark, a.mark, "brand mark box");
        same([f.insetRight!, f.insetBottom!], [a.insetRight!, a.insetBottom!], "sheet inset");
        same([f.sheetTop!], [a.sheetTop!], "sheet top");
        expect(f.radii, `${sc.id} @${vp.width}: sheet radii`).toEqual(a.radii);
        same([f.tab![1], f.tab![3]], [a.tab![1], a.tab![3]], "folder tab");
        console.log(`OB1 F1 ${sc.id} @${vp.width} sidebar ${f.panel![2]} mark ${f.mark} inset ${f.insetRight}/${f.insetBottom} radii ${f.radii}`);
      }
      read++;
    }
    expect(read).toBe(SCREENS.length * VPS.length);
  });

  test("F2 no old name anywhere in the journey", async ({ page }) => {
    let read = 0;
    for (const sc of SCREENS) for (const vp of [VPS[0], VPS[2]]) {
      await lab(page, sc.q, vp);
      const f = await page.evaluate(() => ({
        text: (document.querySelector(".sf") as HTMLElement).innerText,
        imgs: Array.from(document.querySelectorAll(".sf img")).map((i) => i.getAttribute("src") ?? ""),
        brand: Array.from(document.querySelectorAll(".sf .ws-bwm")).filter((e) => (e as HTMLElement).offsetWidth > 0).map((e) => e.textContent),
      }));
      expect(f.text, `${sc.id}: no "ScriptAlly"`).not.toMatch(/scriptally/i);
      expect(f.imgs.filter((s) => /scriptally/i.test(s)), `${sc.id}: no old artwork`).toEqual([]);
      expect(f.brand, `${sc.id} @${vp.width}: one visible brand row`).toEqual(["QueryHawk"]);
      read++;
    }
    expect(read).toBeGreaterThan(0);
  });

  test("F3 the sidebar lists the branch's steps, one is current, and the tab names it", async ({ page }) => {
    const want: Array<[string, string, string[]]> = [
      ["", "you", ["You", "Your book", "Your list"]],
      ["A", "book", ["You", "Your book"]],
      ["B", "list", ["You", "Your book", "Your list"]],
    ];
    for (const [flow, at, steps] of want) {
      await lab(page, `s=frame&form=setup&flow=${flow}&at=${at}`, VPS[0]);
      const s = await page.evaluate(() => ({
        steps: Array.from(document.querySelectorAll(".sf-step .sf-steplab")).map((e) => e.textContent),
        current: Array.from(document.querySelectorAll('.sf-step[aria-current="step"] .sf-steplab')).map((e) => e.textContent),
        tab: document.querySelector(".sf .ws-ftn")?.textContent,
        group: document.querySelector(".sf .ws-ftg")?.textContent,
      }));
      expect(s.steps, `flow ${flow || "none"}`).toEqual(steps);
      expect(s.current.length, "exactly one current").toBe(1);
      expect(s.tab, "the tab names the current step").toBe(s.current[0]);
      expect(s.group).toBe("Getting set up");
    }
  });

  test("F4 on a phone the frame is a document: no sidebar, and the last control is reachable", async ({ page }) => {
    for (const sc of SCREENS) {
      await lab(page, sc.q + "&rows=40", VPS[2]);
      const f = await page.evaluate(() => {
        const vis = (sel: string) => Array.from(document.querySelectorAll(sel)).filter((e) => (e as HTMLElement).getBoundingClientRect().width > 0);
        const tab = document.querySelector(".sf .ws-ftab")!.getBoundingClientRect();
        const exit = document.querySelector(".sf .sf-exit")!.getBoundingClientRect();
        const brand = vis(".sf .ws-bwm")[0]?.getBoundingClientRect();
        const last = Array.from(document.querySelectorAll(".sf-scroll *")).pop()!.getBoundingClientRect();
        const d = document.documentElement;
        return {
          panels: vis(".sf .ws-panel").length, brandTop: brand?.top ?? null, brandBottom: brand?.bottom ?? null,
          tabTop: tab.top, tabBottom: tab.bottom, exitTop: exit.top, exitBottom: exit.bottom,
          lastBottom: last.bottom + window.scrollY, scrollH: d.scrollHeight, viewH: window.innerHeight,
          overflow: d.scrollWidth - d.clientWidth,
        };
      });
      expect(f.panels, "no sidebar").toBe(0);
      expect(f.brandTop, "the brand row is visible").not.toBeNull();
      expect(f.brandBottom!, "the brand row sits above the tab").toBeLessThanOrEqual(f.tabTop + 1);
      expect(f.exitTop < f.tabBottom && f.exitBottom > f.tabTop, "the tab and the exit share a row").toBe(true);
      expect(f.lastBottom, "the content is taller than the screen (the case is real)").toBeGreaterThan(f.viewH);
      expect(f.lastBottom, `${sc.id}: the last control is inside the scroll height (${f.lastBottom} vs ${f.scrollH})`).toBeLessThanOrEqual(f.scrollH);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const reached = await page.evaluate(() => {
        const last = Array.from(document.querySelectorAll(".sf-scroll *")).pop()!.getBoundingClientRect();
        return last.bottom <= window.innerHeight + 1 && last.top >= 0;
      });
      expect(reached, `${sc.id}: scrolling reaches it`).toBe(true);
      expect(f.overflow).toBeLessThanOrEqual(0);
    }
  });
});
