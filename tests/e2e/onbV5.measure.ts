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
import { mkdirSync, readFileSync } from "node:fs";
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
  { id: "signup", q: "s=signup", form: "account" },
  { id: "signin", q: "s=signin", form: "account" },
  { id: "reset", q: "s=reset", form: "account" },
  { id: "reset-sent", q: "s=reset-sent", form: "account" },
  { id: "welcome", q: "s=welcome", form: "setup" },
  { id: "fork", q: "s=fork&pick=smart", form: "setup" },
  { id: "fork-byhand", q: "s=fork&pick=byhand", form: "setup" },
  { id: "fork-pro", q: "s=fork&pick=template&plan=pro", form: "setup" },
  { id: "confirm", q: "s=confirm", form: "setup" },
  { id: "confirm-pro", q: "s=confirm&plan=pro", form: "setup" },
  { id: "used-free", q: "s=used-free", form: "setup" },
  { id: "used-pro", q: "s=used-pro", form: "setup" },
  { id: "unreadable", q: "s=unreadable", form: "setup" },
  { id: "nothing", q: "s=nothing&errs=1", form: "setup" },
  { id: "unloaded", q: "s=unloaded", form: "setup" },
];

/** Open-title screens later phases add. */
const EXTRA_OPEN: string[] = ["fork", "confirm"];

const MUTATIONS: Record<string, string> = {
  F1: ".sf .sf-panel, .sf .sf-panel .ws-pin{width:260px!important}",
  S1: ".sf-open{background:#2d3a50!important;padding:24px!important;border-radius:14px!important}",
  A1: "",
  A3: "",
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
  if (MUTATE === "S2") await page.evaluate(() => document.querySelectorAll(".sf-opt").forEach((b) => { b.removeAttribute("role"); b.setAttribute("aria-pressed", b.getAttribute("aria-checked") ?? "false"); b.removeAttribute("aria-checked"); }));
  if (MUTATE === "S3") await page.evaluate(() => { const dd = document.querySelectorAll(".sf-card .sa-dd")[1]; if (dd) dd.outerHTML = '<input type="text" class="sf-in" placeholder="Genre">'; });
  if (MUTATE === "S4") await page.evaluate(() => { const c = document.querySelector(".sf-stepcard"); if (c && !c.querySelector('[data-sf="still-writing"]')) { const p = document.createElement("p"); p.className = "sf-note"; p.dataset.sf = "still-writing"; p.textContent = "Still writing?"; c.appendChild(p); } });
  if (MUTATE === "K1") await page.evaluate(() => {
    /* "Upload my sheet" wired to the Smart import picker: the press records the wrong handler. */
    const b = document.querySelector('[data-act="upload"]') as HTMLElement | null;
    const wrong = document.querySelector('[data-act="smart"]') as HTMLElement | null;
    if (b && wrong) b.addEventListener("click", (e) => { e.stopImmediatePropagation(); wrong.click(); }, true);
  });
  if (MUTATE === "K2") await page.evaluate(() => { const f = document.querySelector('[data-fact="smart"]'); if (f) f.textContent = "Uses your one Smart Import"; });
  if (MUTATE === "K3") await page.evaluate(() => (document.querySelector('[data-act="read"]') as HTMLElement | null)?.click());
  if (MUTATE === "E1") await page.evaluate(() => {
    const p = document.querySelector('[data-dead="used-free"] [data-act="template"]');
    if (p) p.textContent = "Upgrade to Pro";
  });
  if (MUTATE === "T1") await page.addStyleTag({ content: ".sf .sf-btn{background:var(--onb-missing)}" });
  if (MUTATE === "A1") {
    await page.evaluate(() => {
      const d = document.createElement("div"); d.className = "preview-wrap"; d.textContent = "Dashboard preview";
      document.querySelector(".sf-offer")?.appendChild(d);
    });
  }
  if (MUTATE === "A3") await page.evaluate(() => { const e = document.querySelector("#au-pw"); if (e) e.id = "au-password"; });
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
      /* The two filler screens are padded past the fold so the scrolling half is really exercised;
         a real screen may fit, and is then reachable without scrolling. */
      if (sc.id.startsWith("frame-")) expect(f.lastBottom, "the content is taller than the screen (the case is real)").toBeGreaterThan(f.viewH);
      console.log(`OB1 F4 ${sc.id}: last control at ${Math.round(f.lastBottom)} of ${f.scrollH} (viewport ${f.viewH})`);
      expect(f.lastBottom, `${sc.id}: the last control is inside the scroll height (${f.lastBottom} vs ${f.scrollH})`).toBeLessThanOrEqual(f.scrollH);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const reached = await page.evaluate(() => {
        const last = Array.from(document.querySelectorAll(".sf-scroll *")).pop()!.getBoundingClientRect();
        return last.bottom <= window.innerHeight + 1;
      });
      expect(reached, `${sc.id}: scrolling reaches it`).toBe(true);
      expect(f.overflow).toBeLessThanOrEqual(0);
    }
  });

  test("A1 two tabs, one raised; the other switches mode and keeps the typed email", async ({ page }) => {
    for (const vp of VPS) {
      await lab(page, "s=signup", vp);
      const read = () => page.evaluate(() => ({
        raised: document.querySelector(".sf .ws-ftn")?.textContent,
        group: document.querySelector(".sf .ws-ftg")?.textContent,
        other: Array.from(document.querySelectorAll(".sf .ws-ftsibs:not(.ws-ftmeasure) .ws-ftsib")).map((e) => e.textContent),
        panel: getComputedStyle(document.querySelector(".sf-offer")!).backgroundColor,
        title: document.querySelector(".sf-offerh")?.textContent,
        email: (document.querySelector("#au-email") as HTMLInputElement).value,
        old: document.querySelectorAll(".seg-opt, .preview-wrap, .col-feature").length,
      }));
      await page.fill("#au-email", "writer@example.com");
      const up = await read();
      expect(up.group).toBe("Your account");
      expect(up.raised).toBe("Create account");
      expect(up.other, `@${vp.width}: exactly one recessed tab`).toEqual(["Sign in"]);
      expect(up.panel).toBe("rgb(45, 58, 80)");
      expect(up.title).toBe("The hunt begins.");
      expect(up.old, "the preview and the segmented control are gone").toBe(0);
      await page.click(".sf .ws-ftsibs:not(.ws-ftmeasure) .ws-ftsib");
      await page.waitForFunction(() => document.querySelector(".sf .ws-ftn")?.textContent === "Sign in");
      const inn = await read();
      expect(inn.other).toEqual(["Create account"]);
      expect(inn.title).toBe("Welcome back.");
      expect(inn.email, "the typed email survives the switch").toBe("writer@example.com");
      expect(inn.panel).toBe("rgb(45, 58, 80)");
    }
  });

  test("A3 fields: typewriter on a dashed rule, mono labels, and a rust sentence for an error", async ({ page }) => {
    for (const vp of VPS) {
      for (const s of ["signup", "signin", "reset"]) {
        await lab(page, "s=" + s, vp);
        const fields = await page.evaluate(() => Array.from(document.querySelectorAll(".sf-card input")).map((el) => {
          const c = getComputedStyle(el);
          const lab = document.querySelector(`label[for="${el.id}"]`);
          const lc = lab ? getComputedStyle(lab) : null;
          return {
            id: el.id, family: c.fontFamily, size: parseFloat(c.fontSize), style: c.borderBottomStyle, width: c.borderBottomWidth,
            labFamily: lc?.fontFamily ?? "", labCase: lc?.textTransform ?? "",
          };
        }));
        expect(fields.length, `${s} @${vp.width}: inputs measured`).toBeGreaterThan(0);
        for (const f of fields) {
          expect(f.family, `${f.id} is the typewriter face`).toMatch(/Special Elite/);
          expect(Math.abs(f.size - 18), `${f.id} size ${f.size}`).toBeLessThanOrEqual(0.5);
          expect(f.style, `${f.id} rule`).toBe("dashed");
          expect(f.labFamily, `${f.id} label is mono`).toMatch(/JetBrains Mono/);
          expect(f.labCase).toBe("uppercase");
        }
      }
      await lab(page, "s=signin", vp);
      expect(await page.locator("#au-email").count()).toBe(1);
      expect(await page.locator("#au-pw").count()).toBe(1);
      await page.fill("#au-email", "not-an-address");
      await page.fill("#au-pw", "x");
      await page.locator(".sf-card").getByRole("button", { name: /^Sign in$/ }).click();
      await page.waitForSelector(".sf-card .sf-err");
      const err = await page.evaluate(() => {
        const e = document.querySelector(".sf-card .sf-err")!;
        const i = getComputedStyle(document.querySelector("#au-email")!);
        return { text: e.textContent, color: getComputedStyle(e).color, rule: [i.borderBottomStyle, i.borderBottomColor] };
      });
      expect(err.text).toBe("That doesn’t look like a valid email address.");
      expect(err.color).toBe("rgb(162, 69, 42)");
      expect(err.rule).toEqual(["solid", "rgb(162, 69, 42)"]);
    }
    await lab(page, "s=signup&invite=1", VPS[0]); await shot(page, "signup-invite-on-1440");
    await lab(page, "s=signup&invite=0", VPS[0]); await shot(page, "signup-invite-off-1440");
  });

  /** Screens whose first thing on the sheet is an open title. Phase 4 adds the fork and the confirm. */
  /* Onboarding v9 retired the open title from set-up's first two steps: the welcome is an ink panel
     and the book step is a title page (held by OB9 W1, T1 and B1). The fork and the confirm keep it. */
  const OPEN: string[] = [];

  test("S1 every step opens on a typewriter title on the sheet, with no box round it and no picture", async ({ page }) => {
    const want: Record<number, number> = { 1440: 44, 1280: 39.68, 390: 30 };
    let read = 0;
    for (const id of OPEN.concat(EXTRA_OPEN)) for (const vp of VPS) {
      await lab(page, SCREENS.find((s) => s.id === id)!.q, vp);
      const t = await page.evaluate(() => {
        const col = document.querySelector(".sf-scroll .sf-col")!;
        const first = col.firstElementChild as HTMLElement;
        const h = first.querySelector("h1") as HTMLElement | null;
        const boxed = (el: HTMLElement | null) => {
          for (let n = el; n && !n.classList.contains("sf-scroll"); n = n.parentElement) {
            const c = getComputedStyle(n);
            const bg = c.backgroundColor;
            if ((bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0) return n.className;
          }
          return null;
        };
        return {
          first: first.className, tag: h?.tagName ?? null,
          family: h ? getComputedStyle(h).fontFamily : "", size: h ? parseFloat(getComputedStyle(h).fontSize) : 0,
          boxed: boxed(h), imgs: document.querySelectorAll(".sf-scroll img, .sf-scroll svg.sf-art").length,
          color: h ? getComputedStyle(h).color : "",
        };
      });
      expect(t.first, `${id}: the first element on the sheet is the open title`).toBe("sf-open");
      expect(t.family, `${id}: typewriter`).toMatch(/Special Elite/);
      expect(Math.abs(t.size - want[vp.width]), `${id} @${vp.width}: title ${t.size}px`).toBeLessThanOrEqual(1);
      expect(t.boxed, `${id}: no navy, white or bordered box round the title`).toBeNull();
      expect(t.imgs, `${id}: no image on the screen`).toBe(0);
      expect(t.color).toBe("rgb(28, 19, 15)");
      read++;
    }
    expect(read).toBeGreaterThanOrEqual(OPEN.length * VPS.length);
  });

  test("S2 options are radios: one or none checked, a navy ring on the checked one, Continue waits", async ({ page }) => {
    /* v9: the readiness question moved onto the title card (OB9 T2 holds it). */
    for (const [q, n] of [["s=welcome", 4]] as const) for (const vp of VPS) {
      await lab(page, q, vp);
      const read = () => page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.sf-opts[role="radiogroup"] [role="radio"]')) as HTMLElement[];
        return {
          rows: rows.length, checked: rows.filter((r) => r.getAttribute("aria-checked") === "true").length,
          pressed: document.querySelectorAll(".sf-opts [aria-pressed]").length,
          ring: rows.filter((r) => r.getAttribute("aria-checked") === "true").map((r) => getComputedStyle(r).boxShadow),
          disabled: (Array.from(document.querySelectorAll(".sf-stepcard .sf-btn")).pop() as HTMLButtonElement).disabled,
        };
      });
      const before = await read();
      expect(before.rows, `${q}: a radio group of ${n}`).toBe(n);
      expect(before.checked).toBe(0);
      expect(before.pressed, "never aria-pressed").toBe(0);
      expect(before.disabled, "Continue is disabled until one is chosen").toBe(true);
      await page.locator(".sf-opts [role=radio]").nth(1).click();
      const after = await read();
      expect(after.checked).toBe(1);
      expect(after.ring[0], "a 2px inset navy ring").toMatch(/rgb\(42, 58, 82\) 0px 0px 0px 2px inset/);
      expect(after.disabled).toBe(false);
      await page.locator(".sf-opts [role=radio]").nth(0).click();
      expect((await read()).checked, "still exactly one").toBe(1);
    }
  });

  /* S3 and S4 are retired by onboarding v9. S3 held the set-up book step to the v5 baseline's two
     pick-lists; that step is now the title page with genre pills, an age row and a word count (OB9
     B2, B3, B4). S4 held the still-writing note on the retired readiness screen; the note now sits
     on the title card (OB9 T2). The Import page's book step keeps the pick-lists (IP1 F2). */

  const calls = (page: Page) => page.evaluate(() => (window.__onbLab?.calls ?? []).map((c) => c.name));
  const reset = (page: Page) => page.evaluate(() => { window.__onbLab = { calls: [] }; });

  test("K1 three tiles, each button to its own handler, no ring, and a drop that works", async ({ page }) => {
    for (const vp of VPS) {
      for (const pick of ["smart", "template", "byhand"]) {
        await lab(page, "s=fork&pick=" + pick, vp);
        const t = await page.evaluate(() => ({
          tiles: document.querySelectorAll(".sf-tile").length,
          radios: document.querySelectorAll('.sf-col [role="radio"], .sf-col [role="radiogroup"]').length,
          ringed: Array.from(document.querySelectorAll('.sf-tile[data-ringed="true"]')).map((e) => (e as HTMLElement).dataset.tile),
          ring: Array.from(document.querySelectorAll(".sf-tile.is-ringed")).map((e) => getComputedStyle(e).boxShadow),
          cols: new Set(Array.from(document.querySelectorAll(".sf-tile")).map((e) => Math.round(e.getBoundingClientRect().left))).size,
        }));
        expect(t.tiles, `@${vp.width}: three tiles`).toBe(3);
        expect(t.radios, "no radio").toBe(0);
        /* RE-POINTED (onboarding v9): no tile is pre-selected (OB9 F1 holds the tiles' new shape). */
        expect(t.ringed, "no tile is ringed").toEqual([]);
        expect(t.ring, "no ring class").toEqual([]);
        expect(t.cols, `@${vp.width}: three across from 1080, stacked below`).toBe(vp.width >= 1080 ? 3 : 1);
      }
      await lab(page, "s=fork&pick=smart", vp);
      const presses: Array<[string, string]> = [
        ['[data-act="smart"]', "picker"], ['[data-act="download"]', "download"],
        ['[data-act="upload"]', "templatePicker"], ['[data-act="byhand"]', "byhand"],
        ['[data-act="later"]', "skip"], ['[data-act="desk"]', "importDesk"],
      ];
      for (const [sel, want] of presses) {
        await reset(page);
        await page.locator(sel).click();
        expect(await calls(page), `@${vp.width}: ${sel} calls ${want} and nothing else`).toEqual([want]);
      }
      /* A real drop event carrying a real File. */
      await reset(page);
      await page.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(["Agent,Agency\nA,B\n"], "my agents.csv", { type: "text/csv" }));
        dt.items.add(new File(["x"], "second.csv", { type: "text/csv" }));
        document.querySelector('[data-tile="smart"]')!.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      });
      const dropped = await page.evaluate(() => window.__onbLab!.calls);
      expect(dropped.map((c) => c.name), "one call to pickFile").toEqual(["pickFile"]);
      expect((dropped[0].arg as { file: string }).file, "with the first file").toBe("my agents.csv");
      await reset(page);
      await page.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(["x"], "notes.pdf", { type: "application/pdf" }));
        document.querySelector('[data-tile="smart"]')!.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      });
      expect(await calls(page), "a type the picker would not offer is ignored").toEqual([]);
    }
  });

  test("K2 the fact lines state cost from the tier, and nothing recommends", async ({ page }) => {
    for (const [q, smart] of [["s=fork", "Uses your one Smart Import"], ["s=fork&plan=pro", "Uses this month's Smart Import"]] as const) {
      await lab(page, q, VPS[0]);
      const f = await page.evaluate(() => ({
        facts: Array.from(document.querySelectorAll(".sf-fact")).map((e) => e.textContent),
        text: (document.querySelector(".sf-col") as HTMLElement).innerText,
      }));
      expect(f.facts).toEqual([smart, "Always free", "Always free · Ends set-up"]);
      expect(f.text).not.toMatch(/recommended|best for/i);
    }
  });

  test("K3 the confirm names the file twice, Change updates both, and nothing is read before the press", async ({ page }) => {
    for (const vp of VPS) {
      await lab(page, "s=confirm", vp);
      const read = () => page.evaluate(() => ({
        row: document.querySelector('[data-sf="file-name"]')?.textContent,
        lead: document.querySelector('[data-sf="confirm-lead"] strong')?.textContent,
        text: (document.querySelector(".sf-col") as HTMLElement).innerText,
      }));
      const a = await read();
      expect(a.row).toBe("my agents FINAL v3.csv");
      expect(a.lead, "the sentence names the same file").toBe(a.row);
      /* v9: the screen says "QueryHawk reads every row"; what it must not state is a COUNT of rows. */
      expect(a.text).not.toMatch(/\d[\d,]*\s+rows?\b/i);
      expect(await calls(page), "nothing is read on arrival").not.toContain("runMapping");
      const chooser = page.waitForEvent("filechooser");
      await page.locator('[data-act="change"]').click();
      await (await chooser).setFiles({ name: "second list.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("PK") });
      await page.waitForFunction(() => document.querySelector('[data-sf="file-name"]')?.textContent === "second list.xlsx");
      const b = await read();
      expect(b.lead, "Change updates the sentence too").toBe("second list.xlsx");
      expect(await calls(page), "choosing a file reads nothing").not.toContain("runMapping");
      await page.locator('[data-act="read"]').click();
      expect((await calls(page)).filter((c) => c === "runMapping").length, "one read, on the press").toBe(1);
    }
  });

  test("E1 the dead ends: chip, title and actions per state, each press to its own handler", async ({ page }) => {
    const want: Record<string, { chip: string; fail: boolean; title: string; presses: Array<[string, string]> }> = {
      "used-free": { chip: "Smart Import already used", fail: false, title: "You've used your Smart Import.",
        presses: [[".sf-dead .sf-link:not([data-act])", "back"], ['[data-act="byhand"]', "byhand"], ['[data-act="template"]', "useTemplate"]] },
      "used-pro": { chip: "Smart Import already used", fail: false, title: "Next Smart Import next month",
        presses: [[".sf-dead .sf-link:not([data-act])", "back"], ['[data-act="byhand"]', "byhand"]] },
      unreadable: { chip: "File couldn't be read", fail: true, title: "We couldn't read that one.",
        presses: [[".sf-dead .sf-link:not([data-act])", "back"], ['[data-act="byhand"]', "byhand"], ['[data-act="download"]', "download"]] },
      nothing: { chip: "Nothing imported", fail: true, title: "That didn't work.", presses: [['[data-act="review"]', "review"]] },
      unloaded: { chip: "Step didn't load", fail: false, title: "That step didn't load.",
        presses: [['[data-act="byhand"]', "byhand"], ['[data-act="restart"]', "restart"]] },
    };
    let states = 0;
    for (const [id, w] of Object.entries(want)) for (const vp of VPS) {
      await lab(page, SCREENS.find((s) => s.id === id)!.q, vp);
      const d = await page.evaluate(() => {
        const card = document.querySelector(".sf-dead") as HTMLElement;
        const chip = card.querySelector('[data-sf="chip"]') as HTMLElement;
        const h = card.querySelector("h1") as HTMLElement;
        return {
          cards: document.querySelectorAll(".sf-dead").length, open: document.querySelectorAll(".sf-scroll .sf-open").length,
          chip: chip.textContent, chipBg: getComputedStyle(chip).backgroundColor, chipCase: getComputedStyle(chip).textTransform,
          title: h.textContent, family: getComputedStyle(h).fontFamily, size: parseFloat(getComputedStyle(h).fontSize),
          width: card.getBoundingClientRect().width, text: card.innerText,
          controls: Array.from(card.querySelectorAll("button")).map((b) => b.textContent ?? ""),
        };
      });
      expect(d.cards, `${id}: one card`).toBe(1);
      expect(d.open, `${id}: no open title above it`).toBe(0);
      expect(d.chip).toBe(w.chip);
      expect(d.chipBg, `${id}: chip tone`).toBe(w.fail ? "rgb(243, 221, 210)" : "rgb(244, 239, 233)");
      expect(d.chipCase).toBe("uppercase");
      expect(d.title).toBe(w.title);
      expect(d.family).toMatch(/Special Elite/);
      expect(Math.abs(d.size - 23)).toBeLessThanOrEqual(0.5);
      expect(d.width, `${id} @${vp.width}: 480 at most`).toBeLessThanOrEqual(480.5);
      expect(d.controls.length, `${id}: its actions`).toBe(w.presses.length);
      if (id === "used-free") expect(d.controls.filter((c) => /upgrade/i.test(c)), "no control named Upgrade").toEqual([]);
      if (id === "unreadable") expect(d.text).not.toMatch(/hasn.t been used/i);
      for (const [sel, name] of w.presses) {
        await reset(page);
        await page.locator(sel).first().click();
        expect(await calls(page), `${id}: ${sel} calls ${name}`).toEqual([name]);
      }
      states++;
    }
    expect(states).toBe(5 * VPS.length);
  });

  test("T1 every token the set-up sheet reads resolves here, and no primary is rust or burgundy", async ({ page }) => {
    const sheet = readFileSync(resolve("src/components/onboarding/onboarding.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const read = [...new Set([...sheet.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]))].sort();
    expect(read.length, "tokens read by the sheet").toBeGreaterThan(15);
    let primaries = 0;
    for (const sc of SCREENS) {
      await lab(page, sc.q, VPS[0]);
      const r = await page.evaluate((names) => {
        /* A token set on `.sf` is read from an element inside the sheet; an unset one reads empty. */
        const probe = (document.querySelector(".sf-scroll") ?? document.querySelector(".sf")) as HTMLElement;
        const cs = getComputedStyle(probe);
        return {
          empty: names.filter((n) => cs.getPropertyValue(n).trim() === ""),
          primaries: Array.from(document.querySelectorAll(".sf .sf-btn:not(.sf-btn--line)")).map((b) => getComputedStyle(b).backgroundColor),
        };
      }, read);
      expect(r.empty, `${sc.id}: tokens that resolve to nothing`).toEqual([]);
      for (const bg of r.primaries) {
        primaries++;
        expect(bg, `${sc.id}: a primary is navy (or navy disabled), never empty`).toMatch(/^rgb\((42, 58, 82|170, 178, 192)\)$/);
        expect(["rgb(162, 69, 42)", "rgb(124, 58, 42)", "rgba(0, 0, 0, 0)"], `${sc.id}: never rust, burgundy or unpainted`).not.toContain(bg);
      }
    }
    console.log(`OB1 T1 ${read.length} tokens × ${SCREENS.length} screens; ${primaries} primaries`);
    expect(primaries).toBeGreaterThan(10);
  });

  test("A4 the harness: a cold sign-in reaches the app, and set-up opens in the frame and skips back to it", async ({ browser, baseURL }) => {
    /* A context with NO saved session, so the sign-in screen is really walked. */
    /* ⚠️ AN EXPLICITLY EMPTY STATE. `browser.newContext()` inherits the project's `storageState`, so
       a context made without one is NOT cold — the first version of this case signed in from the
       saved session and stayed green with the submit button renamed. */
    const ctx = await browser.newContext({ baseURL, viewport: VPS[0], storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    if (MUTATE === "A4") {
      /* The named break: the submit no longer reads "Sign in", so the harness cannot find it. */
      await ctx.addInitScript(() => {
        new MutationObserver(() => {
          document.querySelectorAll(".sf-card button[type=submit]").forEach((b) => { if (b.textContent === "Sign in") b.textContent = "Log in"; });
        }).observe(document, { childList: true, subtree: true });
      });
      page.setDefaultTimeout(15_000);
    }
    await page.goto("/dashboard");
    await page.waitForSelector("#au-email", { timeout: 30_000 });
    expect(await page.locator("#ws-sidebar").count(), "the context really is signed out: the sign-in screen is up").toBe(0);
    await ensureSignedIn(page);
    await expect(page.locator("#ws-sidebar").first(), "the cold sign-in reached the app").toBeVisible({ timeout: 30_000 });
    /* App opens set-up for a signed-in user when this key is "true": the way into the real thing. */
    await page.evaluate(() => sessionStorage.setItem("scriptally_new_signup", "true"));
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector('[data-setup-frame="setup"]', { timeout: 30_000 });
    const s = await page.evaluate(() => ({
      screen: document.querySelector(".sf [data-screen]")?.getAttribute("data-screen"),
      tab: document.querySelector(".sf .ws-ftn")?.textContent,
      steps: Array.from(document.querySelectorAll(".sf-steplab")).map((e) => e.textContent),
      old: document.querySelectorAll(".sa-onb-card, .ob-head").length,
    }));
    expect(s.screen, "set-up opens on the welcome step").toBe("welcome");
    expect(s.tab).toBe("You");
    expect(s.steps).toEqual(["You", "Your book", "Your list"]);
    expect(s.old, "inside the new frame, not the old card").toBe(0);
    /* The real thing, so the branch claim is made here too: "Just getting started" shows two steps. */
    await page.getByRole("radio", { name: /Just getting started/ }).click();
    await page.locator(".sf-stepcard .sf-btn").click();
    await page.waitForFunction(() => document.querySelector(".sf [data-screen]")?.getAttribute("data-screen") === "ack");
    expect(await page.locator(".sf-steplab").allTextContents(), "choosing it never adds a step").toEqual(["You", "Your book"]);
    await page.locator(".sf-exit").click();
    await expect(page.locator("#ws-sidebar").first(), "Skip for now returns to the app").toBeVisible({ timeout: 30_000 });
    expect(await page.locator("[data-setup-frame]").count()).toBe(0);
    await ctx.close();
  });

  test("shots: every screen and state, at 1440 and 390", async ({ page }) => {
    test.skip(!SHOTS, "on request");
    for (const sc of SCREENS.filter((s) => !s.id.startsWith("frame-"))) for (const vp of [VPS[0], VPS[2]]) {
      await lab(page, sc.q, vp);
      await shot(page, `${sc.id}-${vp.width}`);
    }
  });
});
