/**
 * /welcome — welcome page v1 (2 Nov; ref design-refs/welcome-page-v1.html): WEL-1 … WEL-6, on a
 * PRODUCTION build served locally, with the page's two API calls answered by `page.route`. The real
 * verify links are driven end to end by foundingWelcome.public.ts (opt-in, needs the emulator).
 *
 *   npm run build:prod && npx vite preview --host 127.0.0.1 --port 4410 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4410 npx playwright test --project public welcomePage
 *
 * `WEL_MUTATE=<name>` applies a named break in the page (see MUTATIONS), so each lock can be watched
 * going red against the build it guards.
 */
import { test, expect, Page } from "@playwright/test";

const SIZES = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];
const KINDS = ["verified", "already", "waiting", "expired", "unknown"] as const;
type Kind = (typeof KINDS)[number];

/** What the lookup answers in each state (the stored numbers). */
const DATA: Record<Kind, Record<string, unknown>> = {
  verified: { foundingNumber: 14 }, already: { foundingNumber: 14 }, waiting: { reserveNumber: 3 }, expired: {}, unknown: {},
};

/** Verbatim from the brief. Since launch readiness (2 Nov) the waiting lede carries the promotion promise. */
const COPY: Record<Kind, { heading: string; lede: string; pass: string[] }> = {
  verified: {
    heading: "Welcome, founding writer.",
    lede: "We're delighted to have you on board. You'll be one of the first writers to use QueryHawk, which means you'll shape its tools for all the writers who come after you. Your perks are locked in, and we'll be in touch.",
    pass: ["Founding writer pass", "No. 14", "of 50", "Confirmed", "2 November 2026"],
  },
  already: {
    heading: "You're already in.",
    lede: "That link had already done its job, usually because your email's security scanner opened it before you did. Nothing's wrong and nothing's changed: your founding place stands.",
    pass: ["Founding writer pass", "No. 14", "of 50", "Confirmed", "2 November 2026"],
  },
  waiting: {
    heading: "So close. You're third in line.",
    lede: "The last founding place went while your email sat in your inbox. You're confirmed and on the waiting list, in the order people confirmed. If a founding place frees up, it's offered to the next writer in line.",
    pass: ["Waiting list", "3rd", "in line", "Reserve", "2 November 2026"],
  },
  expired: {
    heading: "That link's 48 hours are up.",
    lede: "Your place wasn't held, but nothing's lost. Put your email in again and a fresh confirmation will be with you in a minute.",
    pass: ["Founding writer pass", "Not yet", "held", "One click away"],
  },
  unknown: {
    heading: "We don't recognise that link.",
    lede: "It may have been cut short by your email app. Put your email in again and you'll get a fresh confirmation.",
    pass: ["Founding writer pass", "Not yet", "held", "One click away"],
  },
};
const LINES: Partial<Record<Kind, string>> = {
  verified: "Your welcome email is on its way.",
  already: "Your welcome email is already with you.",
  waiting: "We've emailed you to say so.",
};

const MUTATIONS: Record<string, string | ((page: Page) => Promise<unknown>)> = {
  WEL1: ".mk-wpass-tx small{text-transform:uppercase!important}",
  WEL1b: async (page) => page.evaluate(() => { const h = document.querySelector(".mk-wel-h1")!; h.textContent = h.textContent!.replace("founding writer", "Founding Writer").replace("in line", "reserve"); }),
  WEL2: async (page) => page.evaluate(() => { const a = document.createElement("a"); a.href = "/about"; a.textContent = "About"; document.querySelector(".mk-foot--bare p")!.append(" · ", a); }),
  WEL2b: async (page) => page.evaluate(() => { const d = document.querySelector(".mk-nav .mk-brand")!; const b = document.createElement("button"); b.className = "mk-brand-link"; b.textContent = "Home"; d.append(b); }),
  WEL3: async (page) => page.evaluate(() => { const b = document.querySelector('[data-probe="pass-big"]'); if (b) b.textContent = "No. 15"; }),
  WEL4: ".mk-wpass-bird{right:-40px!important;bottom:-14px!important;width:230px!important}",
  WEL5: "@media (prefers-reduced-motion: reduce){.mk-wpass-stamp{animation:mk-wpass-stamp 4s 1s both!important}}",
  WEL6: async (page) => page.evaluate(() => { const l = document.querySelector(".mk-wel-lede"); if (l) l.textContent = l.textContent!.replace(" If a founding place frees up, it's offered to the next writer in line.", ""); }),
};
const mutate = async (page: Page, ...names: string[]) => {
  const m = process.env.WEL_MUTATE;
  if (!m || !names.includes(m)) return;
  const fix = MUTATIONS[m];
  if (typeof fix === "string") await page.addStyleTag({ content: fix });
  else await fix(page);
  await page.waitForTimeout(150);
};

/** Opens /welcome in a state. `lookup` answers the number lookup: data, a failure, or HTML. */
async function open(page: Page, kind: Kind, opts: { lookup?: "ok" | "500" | "html"; data?: Record<string, unknown>; settle?: number } = {}) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.route(/\/api\/waitlist\/welcome\?/, (r) => {
    const how = opts.lookup ?? "ok";
    if (how === "500") return r.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false}' });
    if (how === "html") return r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html></html>" });
    return r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, confirmedOn: "2026-11-02", ...(opts.data ?? DATA[kind]) }) });
  });
  await page.goto(`/welcome?v=${kind}&r=REF-TEST-123`);
  await expect(page.locator(`[data-welcome="${kind}"]`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(opts.settle ?? 1600);
}
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

for (const vp of SIZES) {
  test.describe(`at ${vp.width}`, () => {
    test.use({ viewport: vp });

    for (const kind of KINDS) {
      test(`WEL-1 · ${kind}: heading, lede and pass verbatim; nothing in capitals`, async ({ page }) => {
        await open(page, kind);
        await mutate(page, "WEL1", "WEL1b");
        const r = await page.evaluate(() => ({
          h1: document.querySelector(".mk-wel-h1")?.textContent ?? "",
          lede: document.querySelector(".mk-wel-lede")?.textContent ?? "",
          line: document.querySelector(".mk-wel-line")?.textContent ?? null,
          pass: (document.querySelector('[data-probe="pass"]') as HTMLElement | null)?.innerText ?? "",
          ghost: !!document.querySelector(".mk-wpass--ghost"),
          n: document.querySelectorAll("body *").length,
          upper: Array.from(document.querySelectorAll<HTMLElement>("body *"))
            .filter((e) => getComputedStyle(e).textTransform === "uppercase")
            .map((e) => e.className || e.tagName),
        }));
        console.log(`WEL-1 ${kind}@${vp.width}`, JSON.stringify({ h1: r.h1, pass: flat(r.pass), upper: r.upper }));
        expect(r.h1).toBe(COPY[kind].heading);
        expect(r.lede).toBe(COPY[kind].lede);
        if (LINES[kind]) expect(r.line?.replace("✉", "")).toBe(LINES[kind]);
        else expect(r.line, "no line on a link that held nothing").toBeNull();
        expect(r.ghost, "the ghost pass on expired and unknown only").toBe(kind === "expired" || kind === "unknown");
        let at = -1;
        for (const piece of COPY[kind].pass) {
          const i = flat(r.pass).indexOf(piece, at + 1);
          expect(i, `the pass reads "${piece}", in order (${flat(r.pass)})`).toBeGreaterThan(at);
          at = i;
        }
        expect(r.n, "the sweep found the page").toBeGreaterThan(30);
        expect(r.upper, "no element on the page is set in capitals").toEqual([]);
      });

      test(`WEL-4 · ${kind}: the fledgling lies wholly inside the stub`, async ({ page }) => {
        await open(page, kind);
        await mutate(page, "WEL4");
        const r = await page.evaluate(() => {
          const stub = document.querySelector(".mk-wpass-stub")!, img = stub.querySelector("img") as HTMLImageElement;
          /* Read without the pass's rotation: a rotated element's rect is its axis-aligned box. */
          const pass = document.querySelector(".mk-wpass") as HTMLElement;
          pass.style.animation = "none"; pass.style.transform = "none"; void pass.offsetHeight;
          const s = stub.getBoundingClientRect(), i = img.getBoundingClientRect();
          return { s: { l: s.left, t: s.top, r: s.right, b: s.bottom }, i: { l: i.left, t: i.top, r: i.right, b: i.bottom }, loaded: img.complete && img.naturalWidth > 0 };
        });
        console.log(`WEL-4 ${kind}@${vp.width}`, JSON.stringify(r));
        expect(r.loaded, "the fledgling loaded").toBe(true);
        expect(r.i.l).toBeGreaterThanOrEqual(r.s.l - 0.5);
        expect(r.i.t).toBeGreaterThanOrEqual(r.s.t - 0.5);
        expect(r.i.r, "right edge inside").toBeLessThanOrEqual(r.s.r + 0.5);
        expect(r.i.b, "bottom edge inside").toBeLessThanOrEqual(r.s.b + 0.5);
      });
    }

    test("WEL-2 · the only link is Privacy (and the fresh-link form's own controls)", async ({ page }) => {
      for (const kind of ["verified", "expired"] as const) {
        await open(page, kind, { settle: 400 });
        await mutate(page, "WEL2", "WEL2b");
        const r = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
            .filter((a) => !a.classList.contains("mk-skip"))
            .map((a) => ({ text: (a.textContent ?? "").trim(), href: a.getAttribute("href"), inForm: !!a.closest(".mk-wel-form") }));
          const chromeButtons = Array.from(document.querySelectorAll(".mk-navwrap button, .mk-foot button")).map((b) => b.textContent);
          return { links, chromeButtons, brandIsButton: !!document.querySelector(".mk-nav button.mk-brand, .mk-nav .mk-brand-link") };
        });
        console.log(`WEL-2 ${kind}@${vp.width}`, JSON.stringify(r));
        expect(r.links.length, "the footer's Privacy is found").toBeGreaterThan(0);
        for (const l of r.links) expect(l.text, `${l.href}: only Privacy links anywhere`).toBe("Privacy");
        expect(r.links.filter((l) => !l.inForm).length, "one Privacy outside the form").toBe(1);
        expect(r.brandIsButton, "the logo goes nowhere").toBe(false);
        expect(r.chromeButtons, "no buttons in the bar or the footer").toEqual([]);
      }
    });

    test("WEL-3 · the pass number is the stored one; a failed lookup shows none and no error", async ({ page }) => {
      await open(page, "verified", { data: { foundingNumber: 37 } });
      await mutate(page, "WEL3");
      await expect(page.locator('[data-probe="pass-big"]')).toHaveText("No. 37");
      await expect(page.locator(".mk-wel-steps")).toContainText("Hello, founding writer number 37.");
      for (const how of ["500", "html"] as const) {
        await page.unrouteAll({ behavior: "wait" });
        await open(page, "verified", { lookup: how });
        const r = await page.evaluate(() => ({
          pass: (document.querySelector('[data-probe="pass"]') as HTMLElement).innerText,
          body: document.body.innerText,
          alerts: document.querySelectorAll('[role="alert"]').length,
        }));
        console.log(`WEL-3 ${how}@${vp.width}`, JSON.stringify({ pass: flat(r.pass) }));
        expect(r.pass, `${how}: no number on the pass`).not.toMatch(/No\.\s*\d|of 50/);
        expect(r.body, `${how}: no number anywhere`).not.toMatch(/number \d|No\. \d/);
        expect(r.body, `${how}: no error`).not.toMatch(/error|went wrong|try again/i);
        expect(r.alerts, `${how}: no alert`).toBe(0);
        expect(r.body).toContain("Hello, founding writer. We're honoured to have you on board.");
      }
    });

    test("WEL-5 · reduced motion: the pass and the stamp are drawn at rest", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page, "verified", { settle: 100 });
      await mutate(page, "WEL5");
      const r = await page.evaluate(() => {
        const pass = document.querySelector(".mk-wpass")!, stamp = document.querySelector(".mk-wpass-stamp")!;
        return { anims: [...pass.getAnimations(), ...stamp.getAnimations()].length,
                 passT: getComputedStyle(pass).transform, passO: getComputedStyle(pass).opacity,
                 stampT: getComputedStyle(stamp).transform, stampO: getComputedStyle(stamp).opacity };
      });
      console.log(`WEL-5 @${vp.width}`, JSON.stringify(r));
      expect(r.anims, "nothing animates").toBe(0);
      expect(r.passO).toBe("1");
      expect(r.stampO).toBe("1");
      /* rotate(2deg) and rotate(-5deg): the final frames. */
      expect(r.passT).toMatch(/^matrix\(0\.999/);
      expect(r.stampT).toMatch(/^matrix\(0\.996/);
      /* And with motion the stamp does land: a positive control that the animation exists. */
      /* (Opened again, not reloaded: the page took `v` and `r` out of the address, so a reload is a
         bare /welcome, which draws the ghost pass and no stamp.) */
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.unrouteAll({ behavior: "wait" });
      await open(page, "verified", { settle: 100 });
      await expect(page.locator(".mk-wpass-stamp")).toBeVisible();
      const moving = await page.locator(".mk-wpass-stamp").evaluate((e) => e.getAnimations().length);
      expect(moving, "with motion allowed the stamp animates").toBe(1);
    });

    /* WEL-6, THE PROMOTION BRANCH (launch readiness, 2 Nov): a freed place goes to the next writer in line
       and they are emailed (PROMO-1), so the waiting page promises it in three places. */
    test("WEL-6 · the waiting copy promises the next freed place, in the lede, the steps and the note", async ({ page }) => {
      await open(page, "waiting");
      await mutate(page, "WEL6");
      const body = await page.evaluate(() => (document.querySelector(".mk-wel") as HTMLElement).innerText);
      expect(body).toContain("in the order people confirmed. If a founding place frees up, it's offered to the next writer in line.");
      expect(body).toMatch(/If a place frees up\s+It's offered to the next writer in line, and you'll hear by email straight away\./);
      expect(body).toContain("Sorry we couldn't fit you in this time, and thank you for signing up. You're confirmed and in the queue, so if a place frees up, it's yours to take.");
      expect(body).toContain("Third in line, in the order writers confirmed.");
      for (const banned of [/What you get/, /Get ready for day one/]) expect(body, `waiting does not say ${banned}`).not.toMatch(banned);
    });
  });
}
