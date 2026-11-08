/**
 * cspWalk — security headers v1 (audit 2026-11-07, High 3). Walks the site, records every request
 * origin per page, every Content Security Policy message, every securitypolicyviolation event and
 * every failed request, and writes them to one JSON file. Used three times: on dev with no policy
 * (to OBSERVE what the site loads), on dev with the policy report-only, and on dev enforcing.
 *
 *   node tests/e2e/cspWalk.mjs <baseUrl> <out.json> [--public-only] [--beacon]
 *
 * ⚠️ NO AI CALLS. Smart Import is walked only as far as choosing a file (the confirm screen and the
 * local photo previews); its read button is never pressed. Every Cloud Functions request is
 * intercepted IN THE BROWSER and aborted, so none reaches a server — the headers are read and the
 * request dies there. The Cloudflare beacon's POST is aborted the same way, so a dev walk never
 * counts a visit.
 *
 * ⚠️ Prod is refused: this walk signs in and submits the waitlist form.
 * The password is read from .env.local and never printed.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const [base, out] = process.argv.slice(2);
const PUBLIC_ONLY = process.argv.includes("--public-only");
const BEACON = process.argv.includes("--beacon");
if (!base || !out) { console.error("usage: cspWalk.mjs <baseUrl> <out.json> [--public-only] [--beacon]"); process.exit(2); }
for (const banned of ["queryhawk.net/", "scriptally-app.", "gen-lang-client-"]) {
  if (base.includes(banned) && !base.includes("dev.queryhawk.net")) { console.error(`refusing production: ${base}`); process.exit(2); }
}

const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const pw = (() => {
  for (const p of [".env.local", "/Users/nickphysick/ScriptAlly-app/.env.local"]) {
    try { const m = readFileSync(p, "utf8").match(/^SA_E2E_PASSWORD=(.*)$/m); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } catch { /* next */ }
  }
  return null;
})();

const report = { base, when: new Date().toISOString(), pages: {}, checks: {} };
let label = "boot";
const page0 = () => (report.pages[label] ??= { origins: {}, csp: [], violations: [], failed: [], errors: [] });

const browser = await chromium.launch({ headless: process.env.CSP_HEADED !== "1" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.exposeBinding("__cspReport", (_src, v) => { page0().violations.push(v); });
await context.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (e) => {
    // @ts-ignore
    window.__cspReport?.({ directive: e.effectiveDirective, blocked: e.blockedURI, disposition: e.disposition, source: e.sourceFile, line: e.lineNumber, sample: e.sample });
  });
});

const fnCalls = [];
await context.route(/cloudfunctions\.net|\.run\.app\//, async (route) => {
  const r = route.request();
  fnCalls.push({ page: label, url: r.url().replace(/\?.*$/, ""), method: r.method(), appCheckHeader: "x-firebase-appcheck" in r.headers(), authHeader: "authorization" in r.headers() });
  await route.abort();
});
const storageCalls = [];
await context.route(/firebasestorage\.googleapis\.com/, async (route) => {
  storageCalls.push({ page: label, method: route.request().method(), url: route.request().url().replace(/\?.*$/, "").slice(0, 120) });
  await route.abort();
});
const beaconPosts = [];
await context.route(/cloudflareinsights\.com\/cdn-cgi\/rum/, async (route) => {
  beaconPosts.push({ page: label, method: route.request().method() });
  await route.abort();
});

const wire = (p, tag = "") => {
  p.on("console", (m) => {
    const t = m.text();
    if (/Content[ -]Security[ -]Policy|Refused to (load|connect|frame|execute|apply)/i.test(t)) page0().csp.push(tag + t.slice(0, 400));
  });
  p.on("pageerror", (e) => page0().errors.push(tag + String(e).slice(0, 300)));
  p.on("request", (r) => {
    try { const o = new URL(r.url()).origin; if (o.startsWith("http")) { const k = tag + o; page0().origins[k] = (page0().origins[k] ?? 0) + 1; } else { const k = tag + r.url().slice(0, 5); page0().origins[k] = (page0().origins[k] ?? 0) + 1; } } catch { /* */ }
  });
  p.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (/cloudfunctions|cloudflareinsights\.com\/cdn-cgi/.test(r.url())) return; // our own aborts
    if (/ERR_ABORTED/.test(f) && /firestore\.googleapis\.com.*channel/.test(r.url())) return; // channel teardown on navigation
    page0().failed.push(`${tag}${f} ${r.url().slice(0, 160)}`);
  });
  p.on("response", (r) => { if (r.status() >= 400) page0().failed.push(`${tag}HTTP ${r.status()} ${r.url().slice(0, 160)}`); });
};

const page = await context.newPage();
wire(page);
const go = async (lbl, path, settle = 3500) => {
  label = lbl; page0();
  await page.goto(base + path, { waitUntil: "load", timeout: 60_000 }).catch((e) => page0().errors.push("goto: " + String(e).slice(0, 200)));
  await page.waitForTimeout(settle);
};

const fonts = async () => page.evaluate(async () => {
  await document.fonts.ready;
  const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, ""));
  const h = document.querySelector("h1, h2");
  const b = document.querySelector("p") ?? document.body;
  return {
    loadedFamilies: [...new Set(loaded)].sort(),
    headingStack: h ? getComputedStyle(h).fontFamily : null,
    bodyStack: getComputedStyle(b).fontFamily,
    playfair: document.fonts.check('600 32px "Playfair Display"'),
    sourceSans3: document.fonts.check('400 16px "Source Sans 3"'),
  };
});

// ─── Public pages ────────────────────────────────────────────────────────────────────────────────
await go("landing", "/", 14_000); // let the hero story run
report.checks.fontsLanding = await fonts();
if (BEACON) {
  // The beacon only loads on queryhawk.net (src/lib/cfAnalytics.ts). Inject the same tag the app
  // would, so the policy is tested against it on dev; the POST it makes is aborted above.
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.defer = true; s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", '{"token": "ee52cb1f15964230836ca4f32696fbfb"}');
    document.head.appendChild(s);
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("pagehide")); });
  await page.waitForTimeout(2000);
}
for (const [l, p] of [["pricing", "/pricing"], ["about", "/about"], ["contact", "/contact"], ["founders", "/founders"], ["terms", "/terms"], ["privacy", "/privacy"], ["welcome", "/welcome"], ["welcome-verified", "/welcome?verified=verified"]]) await go(l, p);

// The waitlist: one +test address, from the landing page's form.
await go("waitlist", "/", 4000);
{
  const wl = { submitted: false, status: null, appCheckHeader: null, recaptchaLoaded: false };
  const email = page.locator('form input[type="email"]').first();
  if (await email.count()) {
    await email.scrollIntoViewIfNeeded();
    await email.fill(`csp-walk+test-${Date.now()}@scriptally.test`);
    await page.waitForTimeout(2500); // the honeypot timer wants a human pause
    const respP = page.waitForResponse((r) => r.url().includes("/api/waitlist") && r.request().method() === "POST", { timeout: 30_000 }).catch(() => null);
    await email.press("Enter");
    const resp = await respP;
    if (resp) { wl.submitted = true; wl.status = resp.status(); wl.appCheckHeader = "x-firebase-appcheck" in resp.request().headers(); }
    await page.waitForTimeout(3000);
  }
  wl.recaptchaLoaded = Object.keys(page0().origins).some((o) => o.includes("google.com") || o.includes("gstatic.com"));
  report.checks.waitlist = wl;
}

// The Contact form: filled and sent, its callable aborted in the browser (no message is sent).
await go("contact-submit", "/contact", 3000);
if (await page.locator("#cf-email").count()) {
  await page.locator("#cf-name").fill("CSP walk");
  await page.locator("#cf-email").fill("csp-walk+test@scriptally.test");
  await page.locator("#cf-msg").fill("CSP walk: aborted in the browser, never sent.");
  await page.waitForTimeout(2500);
  await page.locator('button[type="submit"]').filter({ hasText: /send/i }).first().click().catch(() => {});
  await page.waitForTimeout(5000);
}

if (!PUBLIC_ONLY) {
  // ─── Sign-in / sign-up ──────────────────────────────────────────────────────────────────────────
  await go("signup", "/#/signup");
  await go("signin", "/#/signin");
  {
    const g = page.getByRole("button", { name: /google/i }).first();
    const popup = { opened: false, url: null };
    if (await g.count()) {
      const pp = context.waitForEvent("page", { timeout: 20_000 }).catch(() => null);
      await g.click();
      const pop = await pp;
      if (pop) {
        wire(pop, "[popup] ");
        await pop.waitForLoadState("load").catch(() => {});
        await pop.waitForTimeout(4000);
        popup.opened = true; popup.url = new URL(pop.url()).origin;
        await pop.close();
      }
      await page.waitForTimeout(2000);
    }
    report.checks.googlePopup = popup;
  }
  label = "signin-email";
  await page.goto(base + "/#/signin");
  await page.locator("#au-email").fill(EMAIL);
  if (!pw) throw new Error("no SA_E2E_PASSWORD in .env.local");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.waitForSelector("#ws-sidebar, .ws-work", { timeout: 60_000 }).catch((e) => page0().errors.push("no shell: " + String(e).slice(0, 120)));
  await page.waitForTimeout(4000);
  report.checks.signedIn = (await page.locator("#ws-sidebar, .ws-work").count()) > 0;

  // ─── The signed-in app ─────────────────────────────────────────────────────────────────────────
  const ROUTES = [
    ["dashboard", "/dashboard"], ["queries", "/queries"], ["queries-full", "/queries?full=1"], ["birds-eye", "/queries?view=calendar"],
    ["analytics", "/queries/analytics"], ["responses", "/queries/responses"], ["packages", "/queries/packages"],
    ["contacts", "/agents"], ["discover", "/agents/discover"], ["manuscripts", "/manuscripts"], ["versions", "/manuscripts/versions"],
    ["comps", "/manuscripts/comps"], ["letters", "/materials/letters"], ["todo", "/todo"], ["corkboard", "/todo/corkboard"],
    ["goals", "/goals"], ["help", "/help"], ["settings", "/account/profile"], ["settings-prefs", "/account/preferences"], ["plans", "/plans"],
  ];
  for (const [l, p] of ROUTES) await go(l, p, 5000);
  report.checks.fontsApp = await fonts();

  // A query drawer: open the first row, then its first action.
  await go("query-drawer", "/queries", 5000);
  {
    const row = page.locator('[data-qcv="row"]').first();
    let opened = false;
    if (await row.count()) {
      await row.click().catch(() => {});
      await page.waitForTimeout(2500);
      const act = page.locator('[data-qcv="open-action"], .qpn-act').first();
      if (await act.count()) { await act.click().catch(() => {}); await page.waitForTimeout(2500); }
      opened = (await page.locator('[data-qad-drawer], .qad-root.is-open, [data-qp="panel"]').count()) > 0;
      await page.keyboard.press("Escape"); await page.waitForTimeout(500); await page.keyboard.press("Escape");
    }
    report.checks.queryDrawer = opened;
  }
  // The Edit manuscript drawer.
  await go("edit-manuscript", "/manuscripts", 5000);
  {
    const b = page.locator("role=button[name=/^edit (details|manuscript|the book)/i] >> visible=true").first();
    let opened = false;
    if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(2500); opened = (await page.locator('[role="dialog"]').count()) > 0; await page.keyboard.press("Escape"); }
    report.checks.editManuscript = opened;
  }
  // Smart Import, up to choosing a file — a sheet, then photos. Nothing is read.
  await go("import-sheet", "/import", 4000);
  {
    const sheet = page.locator('input[data-picker="smart"]');
    const res = { sheetChosen: false, screenAfterSheet: null, photosChosen: false, previews: 0 };
    if (await sheet.count()) {
      await sheet.setInputFiles("tests/fixtures/csp/sheet.csv");
      await page.waitForTimeout(2500);
      res.sheetChosen = true;
      res.screenAfterSheet = (await page.locator("h1, h2").first().textContent().catch(() => null))?.trim().slice(0, 80) ?? null;
    }
    await go("import-photo", "/import", 4000);
    const photos = page.locator('input[data-picker="photos"]');
    if (await photos.count()) {
      await photos.setInputFiles("tests/fixtures/csp/page.png");
      await page.waitForTimeout(4000);
      res.photosChosen = true;
      res.previews = await page.locator('img[src^="blob:"]').count();
    }
    report.checks.smartImport = res;
  }
  // Token refresh: expire the stored ID token, reload, and the SDK refreshes it (securetoken).
  label = "token-refresh";
  await page.evaluate(() => new Promise((res) => {
    const open = indexedDB.open("firebaseLocalStorageDb");
    open.onsuccess = () => {
      const tx = open.result.transaction("firebaseLocalStorage", "readwrite"); const st = tx.objectStore("firebaseLocalStorage");
      const all = st.getAll(); all.onsuccess = () => {
        for (const row of all.result) if (row?.value?.stsTokenManager) { row.value.stsTokenManager.expirationTime = Date.now() - 60_000; st.put(row); }
      };
      tx.oncomplete = () => res(true); tx.onerror = () => res(false);
    };
    open.onerror = () => res(false);
  }));
  await go("token-refresh", "/dashboard", 6000);
  // The feedback dock with a screenshot: its Storage upload and callable are both aborted above.
  await go("feedback-dock", "/dashboard", 4000);
  {
    const res = { opened: false, sent: false };
    const open = page.locator("role=button[name=/give feedback/i] >> visible=true").first();
    if (await open.count()) {
      await open.click(); await page.waitForTimeout(1500);
      res.opened = (await page.locator('[data-fb="kind"]').count()) > 0;
      if (res.opened) {
        // The kind that takes a screenshot (so the Storage upload runs).
        for (const k of await page.locator('[data-fb="kind"]').all()) { await k.click(); await page.waitForTimeout(300); if (await page.locator("#fb-file").count()) break; }
        await page.locator('[data-fb="message"]').fill("CSP walk: aborted in the browser, never sent.");
        await page.locator("#fb-file").setInputFiles("tests/fixtures/csp/page.png").catch(() => {});
        await page.waitForTimeout(1200);
        const send = page.locator('[data-fb="send"]');
        if (await send.isEnabled().catch(() => false)) { await send.click(); res.sent = true; res.withScreenshot = (await page.locator('[data-fb="thumb"]').count()) > 0 || storageCalls.length > 0; await page.waitForTimeout(4000); }
      }
    }
    report.checks.feedbackDock = res;
  }
}
report.checks.storageCalls = storageCalls;
report.checks.functionCalls = fnCalls;
report.checks.beaconPosts = beaconPosts;
await browser.close();

const summary = Object.fromEntries(Object.entries(report.pages).map(([k, v]) => [k, { csp: v.csp.length, violations: v.violations.length, failed: v.failed.length, errors: v.errors.length }]));
report.summary = summary;
const all = {};
for (const v of Object.values(report.pages)) for (const [o, n] of Object.entries(v.origins)) all[o] = (all[o] ?? 0) + n;
report.allOrigins = all;
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary, allOrigins: all, checks: report.checks }, null, 1));
