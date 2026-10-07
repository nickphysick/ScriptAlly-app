/**
 * Ink shell v1 — shared harness for inkShell.measure.ts.
 *
 * ⚠️ MUTATIONS ARE APPLIED IN THE PAGE, NOT BY REBUILDING. `INK_MUTATE=<name>` injects the named break
 * (a stylesheet, or a DOM edit) after the route has settled, so each lock can be shown to go red on the
 * break the brief names for it. A CSS mutation enters the same cascade the shipped rule is in; a DOM
 * mutation stands in for a component change. The report says which kind each one is.
 */
import { Page, expect } from "@playwright/test";
import { openRoute } from "./measure";

export const WIDTHS = [1280, 1440, 1710];
export const INK = "rgb(27, 36, 51)";
export const TERRA = "rgb(217, 150, 122)";
export const MUTATE = process.env.INK_MUTATE ?? "";

/** CSS mutations, by name — injected as a stylesheet after load. */
const CSS_MUTATIONS: Record<string, string> = {
  "ink1-stone": ".ws-panel { background: #e6e4e0 !important; }",
  "ink2-literal": ".ws-ftab { background: #f4f2ef !important; }",
  "ink3-overlap": ".ws-ftab { bottom: 0 !important; }",
  "ink4-gradient": `.ws-ftfl { display: none !important; }
    .ws-ftab::after { content: ""; position: absolute; right: -12px; bottom: 0; width: 12px; height: 12px;
      background: radial-gradient(circle at 100% 0, transparent 11.5px, var(--ink-sheet) 12px); }`,
  "ink5-inset": ".ws-ftab { left: 24px !important; }",
  "ink7-centre": ".ws-pagebar .ws-bright > .ws-appctl:first-child { position: absolute !important; left: 50% !important; }",
  "ink11-anthracite": ".ws-ni.on { background: #2a3a52 !important; }",
  "ink12-plain": ".ws-ct { background: transparent !important; color: inherit !important; }",
  "ink13-filled": ".ws-fbb { background: #d9967a !important; color: #1b2433 !important; box-shadow: none !important; }",
  "hc1-bleed": ".ph--full.ph--band.ph--card { margin-left: -60px !important; margin-right: -60px !important; }",
  "hc2-nogap": ".ph--full.ph--card { margin-top: 0 !important; }",
  "hc3-square": ".ph--full.ph--band.ph--card { border-radius: 0 !important; }",
  "hc4-figure": "[data-probe='band-disc'] img { transform: translateX(60px) !important; }",
  "hc6-ring": ".ws-pagebar .ws-help { box-shadow: none !important; }",
  "hc6-rule": ".ws-pagebar .ws-helpwrap::before { display: none !important; }",
  "hc7-filled": ".ws-fbb { background: #d9967a !important; color: #1b2433 !important; box-shadow: none !important; }",
  "ink14-motion": "@media (prefers-reduced-motion: reduce) { .ws-panel.sb-ready { transition: width 0.24s ease !important; } }",
  "ink15-fade": ".sv2-fade { display: block !important; opacity: 1 !important; }",
  "ink16-full": ":root .bvd { top: 0 !important; bottom: 0 !important; right: 0 !important; }",
  "ink17-window": ".bvd-tab { right: 20px !important; bottom: 20px !important; }",
  "ink18-left": ":root .sa-toasts { left: 20px !important; right: auto !important; margin: 0 !important; }",
  "ink19-ink": "@media (max-width: 767px) { .ws-app, .ws-main { background: #1b2433 !important; } }",
  /* follow-up 2 — the menus, search and Settings */
  "ms3-cream": ".sa-mi, .sa-mi * { color: #f4eee5 !important; }",
  "ms5-sans": ".sa-mi, .sa-mi * { font-family: Arial, sans-serif !important; }",
  "ms6-offset": ".sa-pop { margin-top: 20px !important; }",
  "ms7-window": ".sp-pal--ink { left: calc(50vw - 330px) !important; }",
  "ms11-lilac": ".am-iplan { background: var(--slate-tint) !important; }",
  "ms13-centre": ".acct-page .acct-work { margin-inline: auto !important; max-width: 760px !important; }",
  "ms14-green": ".acct-page .acct-toggle[aria-checked=\"true\"] { background: #5a8a5a !important; }",
  "ms15-desktop": "@media (max-width: 767px) { .acct-page .acct-plane { padding: 44px 56px 40px !important; } }",
};

/** DOM mutations, by name — run in the page after load. */
const DOM_MUTATIONS: Record<string, string> = {
  /* a copy of the capture control left in the sidebar */
  "ink8-copy": `(() => { const c = document.querySelector('[data-shell="capture"]'); const p = document.querySelector('#ws-sidebar .ws-pin');
    if (c && p) p.insertBefore(c.cloneNode(true), p.querySelector('nav')); })()`,
  /* "Give feedback" put back in the bar */
  "ink9-feedback": `(() => { const b = document.querySelector('.ws-pagebar .ws-bright'); if (!b) return;
    const x = document.createElement('button'); x.className = 'ws-fb'; x.textContent = 'Give feedback'; b.insertBefore(x, b.lastElementChild); })()`,
  /* the old book-tile cover in place of the title page */
  "ink10-tile": `(() => { document.querySelectorAll('#ws-sidebar .ws-tp').forEach((e) => { e.className = 'ws-ms-cov ws-ms-cov--tile'; e.setAttribute('data-cover', 'tile'); e.innerHTML = ''; }); })()`,
  /* the empty state rendered outside the card (its modifier taken away) */
  "hc5-outside": `(() => { document.querySelectorAll('[data-qcv-empty] [data-probe="page-header"]').forEach((e) => e.classList.remove('ph--card')); })()`,
  /* the card removed, leaving only the bar's (absent) route */
  "ink13-nocard": `(() => { document.querySelectorAll('.ws-fbk').forEach((e) => e.remove()); })()`,
  /* the arrow and "?" swap handlers: each click is stopped before React sees it and the OTHER is pressed */
  "ms1-swap": `(() => { const a = document.querySelector('.ws-cap--bar .ws-capr'); const h = document.querySelector('[data-shell="help"]');
    a && a.addEventListener('click', (e) => { if (e.isTrusted) { e.stopImmediatePropagation(); h && h.click(); } }, true); })()`,
  "ms2-swap": `(() => { const a = document.querySelector('.ws-cap--bar .ws-capr'); const h = document.querySelector('[data-shell="help"]');
    h && h.addEventListener('click', (e) => { if (e.isTrusted) { e.stopImmediatePropagation(); a && a.click(); } }, true); })()`,
  /* Add a manuscript re-enabled: the disabled mark taken off every entry as it appears */
  "ms4-enable": `(() => { const strip = () => document.querySelectorAll('[data-cap="manuscript"], [data-ms="add"], .sp-res--soon').forEach((e) => e.removeAttribute('aria-disabled'));
    strip(); new MutationObserver(strip).observe(document.body, { subtree: true, childList: true, attributes: true }); })()`,
  /* "Queries Hub" put back in search */
  "ms8-hub": `(() => { const fix = () => document.querySelectorAll('.sp-pal .sp-t1').forEach((e) => { if (e.textContent === 'Query Centre') e.textContent = 'Queries Hub'; });
    new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); })()`,
  /* the generic grid on every Go-to row */
  "ms9-grid": `(() => { const G = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>';
    const fix = () => document.querySelectorAll('.sp-res[data-kind="page"] .sp-ic').forEach((e) => { if (!e.hasAttribute('data-mut')) { e.setAttribute('data-mut', '1'); e.innerHTML = G; } });
    new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); })()`,
  /* a keycap for a key nothing binds */
  "ms10-j": `(() => { const fix = () => { const r = document.querySelector('.sp-res .sp-k'); if (r && !r.querySelector('[data-mut]')) { const k = document.createElement('span'); k.className = 'sp-kc'; k.setAttribute('data-mut', '1'); k.textContent = '⌘J'; r.appendChild(k); } };
    new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); })()`,
  /* the sidebar's own "Back to app" restored */
  "ms12-back": `(() => { const r = document.querySelector('#ws-sidebar .set-rail'); if (!r) return; const b = document.createElement('button'); b.className = 'set-backrail'; b.textContent = 'Back to app'; b.style.cssText = 'display:block;color:#f4eee5;font-family:Playfair Display,serif'; r.insertBefore(b, r.firstChild); })()`,
};

export async function applyMutation(page: Page, scope: string): Promise<void> {
  if (!MUTATE || !MUTATE.startsWith(`${scope}-`)) return;
  if (CSS_MUTATIONS[MUTATE]) await page.addStyleTag({ content: CSS_MUTATIONS[MUTATE] });
  if (DOM_MUTATIONS[MUTATE]) await page.evaluate(DOM_MUTATIONS[MUTATE]);
}

export async function inkOpen(
  page: Page, route: string, width: number,
  opts: { collapsed?: boolean; height?: number; scope?: string } = {},
): Promise<void> {
  const collapsed = !!opts.collapsed;
  await page.addInitScript((v) => {
    try { localStorage.setItem("scriptally:sidebar-collapsed", v ? "1" : "0"); } catch { /* */ }
  }, collapsed);
  await openRoute(page, route, { width, height: opts.height ?? 900 });
  await page.evaluate(() => document.fonts.ready);
  /* the shell must be the ink shell's, in the state asked for — a precondition, not a reading */
  await expect(page.locator("#ws-sidebar")).toBeVisible();
  const shut = await page.locator("#ws-sidebar.sb-collapsed").count();
  expect(shut, `sidebar should be ${collapsed ? "collapsed" : "expanded"}`).toBe(collapsed ? 1 : 0);
  if (opts.scope) await applyMutation(page, opts.scope);
}

export interface R { x: number; y: number; w: number; h: number; r: number; b: number }
export async function rect(page: Page, sel: string): Promise<R | null> {
  return page.evaluate((s) => {
    const all = [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().width > 0);
    const e = all[0];
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom };
  }, sel);
}

export async function css(page: Page, sel: string, props: string[], pseudo?: string): Promise<Record<string, string> | null> {
  return page.evaluate(({ s, p, ps }) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().width > 0) ?? document.querySelector<HTMLElement>(s);
    if (!e) return null;
    const cs = getComputedStyle(e, ps ?? null);
    return Object.fromEntries(p.map((k) => [k, cs.getPropertyValue(k)]));
  }, { s: sel, p: props, ps: pseudo });
}

/**
 * Decode two PNGs in the page (no image library is installed) and compare them pixel by pixel.
 * Returns the share of pixels whose largest channel difference exceeds `tol`.
 */
export async function pngDiff(page: Page, a: Buffer, b: Buffer, tol = 10, region?: { x: number; y: number; w: number; h: number }): Promise<{ share: number; w: number; h: number; wb: number; hb: number; bad: number }> {
  return page.evaluate(async ({ a64, b64, tol, region }) => {
    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(`data:image/png;base64,${a64}`), load(`data:image/png;base64,${b64}`)]);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const px = (img: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d")!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    let bad = 0;
    const r = region ?? { x: 0, y: 0, w, h };
    for (let y = r.y; y < Math.min(h, r.y + r.h); y++) for (let x = r.x; x < Math.min(w, r.x + r.w); x++) {
      const i = (y * w + x) * 4;
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > tol) bad++;
    }
    return { share: bad / (r.w * r.h), w: ia.width, h: ia.height, wb: ib.width, hb: ib.height, bad };
  }, { a64: a.toString("base64"), b64: b.toString("base64"), tol, region });
}

/** Pixel rows of a PNG, decoded in the page: returns every distinct colour seen in the given rows. */
export async function rowColours(page: Page, png: Buffer, rows: number[], x0: number, x1: number): Promise<string[]> {
  return page.evaluate(async ({ b64, rows, x0, x1 }) => {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${b64}`; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
    const seen = new Set<string>();
    /* ⚠️ CLAMPED TO THE DECODED IMAGE: a read past its edge returns transparent black, which reads as a
       black pixel on the page and is not one (found on the first run). */
    const hi = Math.min(x1, img.width);
    for (const y of rows.filter((r) => r < img.height)) {
      const d = x.getImageData(x0, y, hi - x0, 1).data;
      for (let i = 0; i < d.length; i += 4) seen.add(`rgb(${d[i]}, ${d[i + 1]}, ${d[i + 2]})`);
    }
    return [...seen];
  }, { b64: png.toString("base64"), rows, x0, x1 });
}
