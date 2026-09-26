/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell v3 — THE LOCKS (L1–L12), measured on the rendered, signed-in app.
 * Ref: design-refs/shell/app-shell-v3.html (+ geometry json + screens). Prompt and rulings:
 * reports/app-shell-v3/.
 *
 *   npm run build:dev && npx vite preview --port 4431 --host 127.0.0.1 &
 *   SA_E2E_BASE_URL=http://127.0.0.1:4431 npx playwright test shellV3
 *
 * ⚠️ EVERY CHECK IS RECORDED, NOT THROWN AT THE FIRST MISS. A case whose first assertion fails
 * leaves every assertion below it unproved — so each check lands in a ledger row
 * (`lock · route · size · state · ok · detail`), the ledger is written to
 * `reports/app-shell-v3/ledger-<case>.json`, and only THEN does the case assert that no row failed.
 * That is also what makes "red against main" a per-lock statement rather than a per-case one.
 *
 * ⚠️ A LOCK THAT FINDS NO SUBJECT HAS FAILED, NOT SKIPPED. Each probe returns `null` for an element
 * it cannot find, and a null is a failed row naming what was missing. Each case also asserts a floor
 * on the number of rows it wrote, so a run that quietly measured nothing cannot come back green.
 *
 * ⚠️ READS ONLY. The fixture account is never written: the collapsed state is set through
 * localStorage (the app's own persistence key), the themes are swapped on the DOM, and L11's forced
 * failure is a write the server DENIES — the request is re-addressed to a document the signed-in
 * user may not touch, so nothing lands.
 */
import { expect, test } from "@playwright/test";
import { openRoute } from "./measure";
import { COLLAPSE_KEY, Ledger, ROUTES, SIZES, SURFACE, judge, openShell, probeShell } from "./shellV3Lib";

for (const vp of SIZES) {
  for (const collapsed of [false, true]) {
    const state = collapsed ? "collapsed" : "expanded";
    test(`shell v3 · ${vp.width} · ${state}`, async ({ page }) => {
      const L = new Ledger(`${vp.width}-${state}`);
      for (const r of ROUTES) {
        await openShell(page, r.path, vp, collapsed);
        const p = await probeShell(page);
        judge(L, p, { route: r.name, size: `${vp.width}`, state }, collapsed, vp.width === 1280);
        /* L9 tooltip: collapsed, hovering a link shows the rail tip carrying its name */
        if (collapsed && !("settings" in r)) {
          const item = page.locator("#ws-sidebar nav .ws-ni").nth(1);
          const name = await item.getAttribute("aria-label");
          await item.hover();
          const tip = page.locator(".dk-tip--rail");
          const shown = await tip.first().waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
          const text = shown ? ((await tip.first().textContent()) ?? "").trim() : "";
          L.check("L9 collapse · tooltip on hover", { route: r.name, size: `${vp.width}`, state }, shown && !!name && text.startsWith(name), `tip ${JSON.stringify(text)} name ${JSON.stringify(name)}`);
          await page.mouse.move(vp.width - 5, vp.height - 5);
        }
      }
      L.write();
      expect(L.rows.length, "population floor").toBeGreaterThan(ROUTES.length * 20);
      expect(L.failures().map((f) => `${f.lock} · ${f.route} — ${f.detail}`)).toEqual([]);
    });
  }
}

/* ── L6 behaviour: the icon opens the same palette, and ⌘K is unchanged ── */
test("L6 search · click and ⌘K both open the palette", async ({ page }) => {
  const L = new Ledger("L6-open");
  for (const r of ROUTES.filter((x) => !("settings" in x))) {
    await openShell(page, r.path, { width: 1440, height: 900 }, false);
    const ctx = { route: r.name, size: "1440", state: "expanded" };
    const pal = page.locator(".sp-pal");
    const btn = page.locator('[data-probe="navrow"] [aria-label="Search (⌘K)"]');
    const has = (await btn.count()) === 1;
    L.check("L6 search · icon button present", ctx, has, `count ${await btn.count()}`);
    if (has) {
      await btn.click();
      await page.waitForTimeout(250);
      L.check("L6 search · click opens palette", ctx, await pal.isVisible(), "click");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
    await page.keyboard.press("ControlOrMeta+k");
    await page.waitForTimeout(250);
    L.check("L6 search · ⌘K opens palette (guard)", ctx, await pal.isVisible(), "keyboard");
    await page.keyboard.press("Escape");
  }
  L.write();
  expect(L.rows.length).toBeGreaterThan(9);
  expect(L.failures().map((f) => `${f.lock} · ${f.route}`)).toEqual([]);
});

/* ── L9 persistence (guard): the toggle's state survives a reload, both ways, on the same key ── */
test("L9 collapse · persistence behaves as before (guard)", async ({ page }) => {
  const L = new Ledger("L9-persist");
  const ctx = { route: "Query Centre", size: "1440", state: "toggle" };
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.evaluate((k) => localStorage.setItem(k, "0"), COLLAPSE_KEY);
  await page.reload(); await page.waitForTimeout(1500);
  const toggle = page.locator('[aria-controls="ws-sidebar"]');
  L.check("L9 persist · toggle present", ctx, (await toggle.count()) === 1, "");
  const w0 = await page.evaluate(() => document.getElementById("ws-sidebar")!.getBoundingClientRect().width);
  await toggle.click(); await page.waitForTimeout(400);
  const stored1 = await page.evaluate((k) => localStorage.getItem(k), COLLAPSE_KEY);
  await page.reload(); await page.waitForTimeout(1500);
  const w1 = await page.evaluate(() => document.getElementById("ws-sidebar")!.getBoundingClientRect().width);
  const exp1 = await toggle.getAttribute("aria-expanded");
  L.check("L9 persist · collapse survives reload", ctx, stored1 === "1" && w1 < w0 && exp1 === "false", `stored ${stored1} w ${w0}→${w1} expanded ${exp1}`);
  await toggle.click(); await page.waitForTimeout(400);
  await page.reload(); await page.waitForTimeout(1500);
  const w2 = await page.evaluate(() => document.getElementById("ws-sidebar")!.getBoundingClientRect().width);
  const stored2 = await page.evaluate((k) => localStorage.getItem(k), COLLAPSE_KEY);
  L.check("L9 persist · expand survives reload", ctx, stored2 === "0" && Math.abs(w2 - w0) < 1, `stored ${stored2} w ${w2}`);
  L.write();
  expect(L.rows.length).toBe(3);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

/* ── L10 themes: under .t-bold and .t-edn the shell's colours are non-transparent and come from tokens ── */
test("L10 themes · bold and editorial resolve the shell tokens", async ({ page }) => {
  const L = new Ledger("L10-themes");
  await openShell(page, "/queries", { width: 1440, height: 900 }, false);
  for (const theme of ["t-capp", "t-bold", "t-edn"]) {
    const ctx = { route: "Query Centre", size: "1440", state: theme };
    const r = await page.evaluate((t) => {
      const root = document.querySelector(".t-capp, .t-bold, .t-edn");
      if (!root) return null;
      root.classList.remove("t-capp", "t-bold", "t-edn");
      root.classList.add(t);
      const side = document.getElementById("ws-sidebar")!;
      const act = side.querySelector('nav [aria-current="page"]');
      const s = getComputedStyle(side);
      const tok = (n: string) => s.getPropertyValue(n).trim();
      /* resolve a token to a computed colour through a scratch element under the sidebar */
      const probe = document.createElement("i");
      side.appendChild(probe);
      const res = (n: string) => { probe.style.color = `var(${n})`; return getComputedStyle(probe).color; };
      const out = {
        tokens: { side: tok("--shell-side"), rule: tok("--shell-rule"), activeBg: tok("--shell-active-bg"), activeFg: tok("--shell-active-fg") },
        resolved: { side: res("--shell-side"), rule: res("--shell-rule"), activeBg: res("--shell-active-bg"), activeFg: res("--shell-active-fg") },
        sideBg: s.backgroundColor, sideShadow: s.boxShadow,
        activeBg: act ? getComputedStyle(act).backgroundColor : null, activeFg: act ? getComputedStyle(act).color : null,
      };
      probe.remove();
      return out;
    }, theme);
    const transparent = (v: string | null | undefined) => !v || v === "transparent" || /rgba\([^)]*,\s*0\)$/.test(v);
    L.check("L10 themes · root found", ctx, !!r, "");
    if (!r) continue;
    L.check("L10 themes · tokens declared", ctx, Object.values(r.tokens).every((v) => v !== ""), JSON.stringify(r.tokens));
    L.check("L10 themes · surface from token", ctx, !transparent(r.sideBg) && r.sideBg === r.resolved.side, `bg ${r.sideBg} token ${r.resolved.side}`);
    L.check("L10 themes · rule from token", ctx, !transparent(r.resolved.rule) && r.sideShadow.includes(r.resolved.rule), `shadow ${r.sideShadow} token ${r.resolved.rule}`);
    L.check("L10 themes · active from tokens", ctx, !transparent(r.activeBg) && r.activeBg === r.resolved.activeBg && r.activeFg === r.resolved.activeFg,
      `active ${r.activeBg}/${r.activeFg} tokens ${r.resolved.activeBg}/${r.resolved.activeFg}`);
    console.log(`THEME ${theme} ${JSON.stringify(r)}`);
  }
  L.write();
  expect(L.rows.length).toBe(15);
  expect(L.failures().map((f) => `${f.lock} · ${f.state} — ${f.detail}`)).toEqual([]);
});

/* ── L11 save-failure (guard): a forced failed save still shows the writer an error ──
   ⚠️ THE FAILURE IS REAL AND WRITES NOTHING. The Firestore write stream is re-addressed from the
   signed-in user's own document to one they may not touch, so the server answers PERMISSION_DENIED
   and the SDK rejects the write — the same rejection a rules denial or a stale deploy produces. */
test("L11 save-failure · a denied display-name save shows an error (guard)", async ({ page }) => {
  const L = new Ledger("L11-save-failure");
  const ctx = { route: "Settings", size: "1440", state: "denied write" };
  await openShell(page, "/account/profile", { width: 1440, height: 900 }, false);
  const input = page.locator("#account-name");
  const saved = await input.inputValue();
  let rewrote = 0;
  await page.route(/google\.firestore\.v1\.Firestore\/Write\/channel/, async (route) => {
    const body = route.request().postData();
    if (body && /documents(%2F|\/)users(%2F|\/)/.test(body)) {
      rewrote++;
      await route.continue({ postData: body.replace(/(documents(?:%2F|\/)users(?:%2F|\/))([A-Za-z0-9]+)/g, "$1sa-e2e-denied-probe") });
    } else await route.continue();
  });
  await input.fill(saved + " x");
  await page.locator('#acct-panel button:has-text("Save")').click();
  const err = page.locator("#account-name-error");
  const shown = await err.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
  L.check("L11 save-failure · write was re-addressed", ctx, rewrote > 0, `rewrote ${rewrote}`);
  L.check("L11 save-failure · error shown", ctx, shown, shown ? (await err.textContent()) ?? "" : "no error element");
  await page.unroute(/google\.firestore\.v1\.Firestore\/Write\/channel/);
  await page.locator('#acct-panel button:has-text("Discard")').click().catch(() => {});
  await page.reload(); await page.waitForTimeout(2500);
  L.check("L11 save-failure · nothing was written", ctx, (await page.locator("#account-name").inputValue()) === saved, "name unchanged after reload");
  L.write();
  expect(L.rows.length).toBe(3);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

/* ── L12 surfaces (ruling 1): splitting the window token moves no card or control surface ──
   ⚠️ TODAY'S EXACT COLOUR, STATED. The one LIVE surface reading the old token is the settings bar's
   "Back to app" hover (`.qc-card` has no renderer; `.sa-inline` and the Manuscripts cards render
   only inside the unrouted AllManuscripts). It is read, and must equal what it painted before. */
test("L12 surfaces · card and control surfaces keep today's colour", async ({ page }) => {
  const L = new Ledger("L12-surfaces");
  await openShell(page, "/account/profile", { width: 1440, height: 900 }, false);
  const back = page.locator(".ws-backapp");
  L.check("L12 surfaces · back-to-app present", { route: "Settings", size: "1440", state: "hover" }, (await back.count()) === 1, "");
  await back.hover();
  await page.waitForTimeout(150);
  const hoverBg = await back.evaluate((e) => getComputedStyle(e).backgroundColor);
  L.check("L12 surfaces · back-to-app hover", { route: "Settings", size: "1440", state: "hover" }, hoverBg === SURFACE, `bg ${hoverBg}`);
  L.write();
  expect(L.rows.length).toBeGreaterThan(1);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

/* ── L13 page title (Phase 6, D8): the Contact list's title is Special Elite at the Query Centre's size ──
   ⚠️ THE TWO ARE MEASURED AGAINST EACH OTHER, NEVER A LITERAL ON BOTH SIDES, so a change to one title
   without the other goes red. Each page's narrow state (the QC's `--narrow` head, the Contact hero's
   stack) steps its title down on its own condition, so equality is asserted when both are in the same
   state and the pair is REPORTED otherwise. The Query Centre is confirmed, not changed. */
test("L13 page title · the Contact list's title matches the Query Centre's", async ({ page }) => {
  const L = new Ledger("L13-title");
  const read = (sel: string, narrowSel: string) => page.evaluate(([s, n]) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const parent = el.parentElement!;
    return {
      fam: cs.fontFamily, size: cs.fontSize, narrow: !!el.closest(n),
      overflow: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right, parentRight: parent.getBoundingClientRect().right,
      hero: (el.closest(".clv-hero") as HTMLElement | null)?.getBoundingClientRect().width ?? 0,
    };
  }, [sel, narrowSel]);
  for (const vp of SIZES) for (const collapsed of [false, true]) {
    const ctx = { route: "Contact list", size: `${vp.width}`, state: collapsed ? "collapsed" : "expanded" };
    await openShell(page, "/queries", vp, collapsed);
    const qc = await read(".qcv-title", ".qcv-page--narrow");
    await openShell(page, "/agents", vp, collapsed);
    const cl = await read(".clv-hero-t", ".clv-hero--stack");
    L.check("L13 title · both found", ctx, !!qc && !!cl, `qc ${JSON.stringify(qc)} cl ${JSON.stringify(cl)}`);
    if (!qc || !cl) continue;
    L.check("L13 title · Special Elite", ctx, /^"?Special Elite"?/.test(cl.fam), `contact ${cl.fam}`);
    L.check("L13 title · QC confirmed Special Elite", ctx, /^"?Special Elite"?/.test(qc.fam), `qc ${qc.fam}`);
    /* ⚠️ THE QC'S SIZE IS A CEILING, REACHED WHEREVER THE HERO CAN HOLD IT. Beside the Archivist the Contact
       hero caps its text column at about a third of its width, so the title scales with the hero
       (contactV11.css) — never above the QC's, and equal to it from a 962px hero up. */
    const q = parseFloat(qc.size), c2 = parseFloat(cl.size);
    L.check("L13 title · never above the QC's size", ctx, c2 <= q + 0.1, `qc ${qc.size} contact ${cl.size}`);
    if (!qc.narrow && !cl.narrow && cl.hero >= 962) L.check("L13 title · the QC's size where the hero holds it", ctx, Math.abs(c2 - q) < 0.1, `qc ${qc.size} contact ${cl.size} hero ${cl.hero}`);
    console.log(`L13 ${vp.width} ${ctx.state}: qc ${qc.size} narrow=${qc.narrow} · contact ${cl.size} stacked=${cl.narrow} hero ${cl.hero}`);
    L.check("L13 title · never overflows its column", ctx, cl.overflow <= 0.5 && cl.right <= cl.parentRight + 0.5, `overflow ${cl.overflow} right ${cl.right} parent ${cl.parentRight}`);
  }
  L.write();
  expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(26);
  expect(L.rows.filter((r) => r.lock === "L13 title · the QC's size where the hero holds it").length, "the equality branch ran").toBeGreaterThan(1);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} ${f.state} — ${f.detail}`)).toEqual([]);
});
