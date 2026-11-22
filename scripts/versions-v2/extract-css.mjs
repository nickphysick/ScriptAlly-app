// Extract the CSS rules of design-refs/versions-v2/versions-v2.html that match its Versions DOM, in source order.
// node extract.mjs <ref.html> <out.json>   (run from the worktree, so @playwright/test resolves)
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [, , refPath, outPath] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
await page.goto(pathToFileURL(refPath).href);
await page.waitForTimeout(1500);

/* every rule, flattened with an id: style rules (with their @media chain), keyframes kept whole */
await page.evaluate(() => {
  const out = []; let id = 0;
  const walk = (rules, media) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) out.push({ id: id++, kind: "style", sel: r.selectorText, text: r.cssText, media, rule: r });
      else if (r instanceof CSSMediaRule) walk(r.cssRules, [...media, r.conditionText]);
      else if (r instanceof CSSKeyframesRule) out.push({ id: id++, kind: "kf", name: r.name, text: r.cssText, media });
      else if (r instanceof CSSSupportsRule) walk(r.cssRules, [...media, "@supports " + r.conditionText]);
      /* the ref's sheet is a named size container ("sheet"); its @container blocks are kept with their query verbatim */
      else if (typeof CSSContainerRule !== "undefined" && r instanceof CSSContainerRule) walk(r.cssRules, [...media, r.cssText.slice(0, r.cssText.indexOf("{")).trim()]);
      else if (r instanceof CSSFontFaceRule) { /* the app loads its own fonts */ }
      else out.push({ id: id++, kind: "other", text: r.cssText, media });
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules, []); } catch { /* cross-origin (Google Fonts) */ } }
  /* ⚠️ THE BODY COMES FROM THE RAW SOURCE, NOT cssText. The CSSOM re-serialises a shorthand holding a var()
     (`font: 600 8px var(--mono)`) as a row of EMPTY longhands, which the browser then drops whole — every such font
     would silently vanish from the port. So the <style> text is parsed here and each style rule takes its own body
     back, aligned by selector (a rule the browser dropped as invalid is skipped, never mis-paired). */
  const raw = [];
  const src = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  const block = () => { let d = 0, j = i; for (; j < src.length; j++) { const ch = src[j]; if (ch === '"' || ch === "'") { const q = ch; j++; while (j < src.length && src[j] !== q) { if (src[j] === "\\") j++; j++; } continue; } if (ch === "{") d++; else if (ch === "}") { d--; if (d === 0) break; } } const body = src.slice(i, j + 1); i = j + 1; return body; };
  const parse = (end) => {
    while (i < end) {
      while (i < end && /[\s;]/.test(src[i])) i++;
      if (i >= end) return;
      const open = src.indexOf("{", i), semi = src.indexOf(";", i);
      if (src[i] === "@" && semi >= 0 && (open < 0 || semi < open)) { i = semi + 1; continue; }
      if (open < 0) return;
      const pre = src.slice(i, open).trim();
      i = open;
      const b = block();
      if (/^@(media|supports|container)\b/.test(pre)) { const save = i; const inner = b.slice(1, -1); const k = save - b.length + 1; i = k; parse(k + inner.length); i = save; }
      else if (pre.startsWith("@")) { /* keyframes, font-face: taken whole from the CSSOM */ }
      else raw.push({ sel: pre, body: b.slice(1, -1).trim() });
    }
  };
  parse(src.length);
  const norm = (x) => x.replace(/\s+/g, "").replace(/["']/g, "").replace(/::(before|after)/g, ":$1").toLowerCase();
  let k = 0, aligned = 0, missed = 0;
  for (const r of out) {
    if (r.kind !== "style") continue;
    let j = k; while (j < raw.length && j < k + 40 && norm(raw[j].sel) !== norm(r.sel)) j++;
    if (j < raw.length && norm(raw[j].sel) === norm(r.sel)) { r.raw = raw[j].body; k = j + 1; aligned++; } else missed++;
  }
  window.__ALIGN = { raw: raw.length, aligned, missed };
  window.__R = out; window.__HIT = new Set(); window.__HEAD = new Set();
});

const EXCL = "html, body, .app, .side, .side *, .main, .bar, .bar *, .scroll, .stsw, .stsw *, .gd-pop, .gd-pop *, .gd-spot, .gd-spot *, .gd-note, .gd-note *, .pck-pill, .pck-pill *";
const collect = async (label) => {
  const n = await page.evaluate((EXCL) => {
    const dyn = /::?(hover|focus-visible|focus-within|focus|active|before|after|placeholder|marker|selection|-webkit-[a-z-]+|-moz-[a-z-]+)(\([^)]*\))?/g;
    const ex = new Set(document.querySelectorAll(EXCL));
    let added = 0;
    for (const r of window.__R) {
      if (r.kind !== "style" || (window.__HIT.has(r.id) && window.__HEAD.has(r.id))) continue;
      const parts = r.sel.split(/,(?![^(]*\))/).map((p) => p.replace(dyn, "").trim() || "*");
      /* a :root block only declares tokens; it matches <html>, which is excluded, so it is kept by name */
      let hit = r.sel.trim() === ":root", head = false;
      for (const p of parts) {
        let els; try { els = document.querySelectorAll(p); } catch { continue; }
        for (const e of els) if (!ex.has(e)) { hit = true; if (/^H[1-6]$/.test(e.tagName)) { head = true; break; } }
        if (head) break;
      }
      if (hit && !window.__HIT.has(r.id)) { window.__HIT.add(r.id); added++; }
      if (head) window.__HEAD.add(r.id);
    }
    return added;
  }, EXCL);
  console.log(`${label}: +${n}`);
};
const click = async (sel, opts = {}) => { const l = page.locator(sel).first(); if (await l.count()) { await l.click({ force: true, timeout: 3000, ...opts }).catch(() => {}); await page.waitForTimeout(350); return true; } console.log("  (missing)", sel); return false; };
const esc = async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(300); };
const state = async (s) => { await page.evaluate(() => { document.querySelector(".gd-pop")?.remove(); }); await click(`.stsw [data-st="${s}"]`); await page.waitForTimeout(500); };

for (const s of ["pro", "many", "pre", "fresh", "free"]) {
  await state(s);
  await collect(`${s} base`);
  if (s === "free") continue;
  if (s === "pre" || s === "fresh") {
    await click("[data-new]"); await collect(`${s} first-save form`); await esc();
    continue;
  }
  /* list: search + sort + show all + archived */
  await page.fill("#dbQ", "ferry").catch(() => {}); await page.waitForTimeout(300); await collect(`${s} search`);
  await page.fill("#dbQ", "zzzz").catch(() => {}); await page.waitForTimeout(300); await collect(`${s} search none`);
  await page.fill("#dbQ", "").catch(() => {}); await page.waitForTimeout(300);
  await click("#dbSort"); await collect(`${s} sort`); await click("#dbSort");
  if (s === "many") { await click("[data-dball]"); await collect("many show all"); }
  /* hover an icon for its label */
  await page.locator("#tiles .da").first().hover().catch(() => {}); await page.waitForTimeout(200); await collect(`${s} icon hover`);
  /* drawer on the in-use card, funnel hover */
  await click("#tiles .db-r.use"); await page.waitForTimeout(400); await collect(`${s} drawer`);
  const band = page.locator(".hfC-b").nth(1);
  if (await band.count()) { const b = await band.boundingBox(); if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(250); } await collect(`${s} funnel hover`); }
  await click("#cxDrw .chg"); await collect(`${s} change picker`); await click("#cxPk [data-vp]"); await collect(`${s} change picker open`); await esc();
  /* drawers on every card (too early, unsent, original) */
  const ids = await page.$$eval("#tiles .db-r", (rs) => rs.map((r) => r.id));
  for (const id of ids.slice(0, 6)) { await click(`#${id}`); await collect(`${s} drawer ${id}`); await esc(); }
  /* forms: new, edit (dup name), edit original */
  await click("[data-new]"); await page.fill("#vName", "Dual timeline").catch(() => {}); await page.fill("#cgIn", "A change").catch(() => {}); await page.keyboard.press("Enter"); await page.waitForTimeout(200); await collect(`${s} new form`); await esc();
  await click("#tiles .db-r:not(.orig) [data-editv]"); await collect(`${s} edit form`); await esc();
  await click("#tiles .db-r.orig [data-editv]"); await collect(`${s} edit original`); await esc();
  /* archive and delete confirms */
  const arch = page.locator("#tiles .da.x");
  for (let i = 0; i < Math.min(await arch.count(), 3); i++) { await arch.nth(i).click({ force: true }).catch(() => {}); await page.waitForTimeout(300); await collect(`${s} confirm ${i}`); await esc(); }
  /* picker */
  if (await page.locator("[data-fill]").count()) {
    await click(".wb [data-fill], [data-fill]"); await collect(`${s} picker`);
    await click("#cxPk [data-vp]"); await collect(`${s} picker open`);
    await click('#cxPk [data-late="1"]'); await collect(`${s} picker late`); await esc();
  }
  /* explainer */
  await click(".mh-b [data-hw]"); await collect(`${s} how`); await esc();
  /* archive one, so the archived row exists; then open it */
  if (s === "pro") {
    const sentArch = page.locator('#tiles .da.x[data-tip="Archive this version"]').first();
    if (await sentArch.count()) { await sentArch.click({ force: true }); await page.waitForTimeout(300); await click("[data-archgo]"); await page.waitForTimeout(400); await collect("pro archived"); await page.evaluate(() => document.querySelector(".vret")?.setAttribute("open", "")); await collect("pro archived open"); }
    /* the toast */
    await collect("pro toast");
  }
  /* carousel sorts and league sorts */
  for (const k of ["sent", "fast", "rate"]) { await click(`[data-cs="${k}"]`); await collect(`${s} carousel ${k}`); }
  for (const k of ["n", "rep", "rate", "avg", "req"]) { await click(`[data-ls="${k}"]`); }
  await collect(`${s} league`);
}

const res = await page.evaluate(() => {
  const hit = window.__HIT;
  const kept = window.__R.filter((r) => r.kind === "style" && hit.has(r.id)).map((r) => ({ id: r.id, sel: r.sel, text: r.raw != null ? `${r.sel}{${r.raw}}` : r.text, raw: r.raw != null, media: r.media, head: window.__HEAD.has(r.id) }));
  const kf = window.__R.filter((r) => r.kind === "kf").map((r) => ({ id: r.id, name: r.name, text: r.text, media: r.media }));
  return { total: window.__R.length, kept, kf, align: window.__ALIGN };
});
writeFileSync(outPath, JSON.stringify(res));
console.log(`kept ${res.kept.length} of ${res.total}; source alignment ${JSON.stringify(res.align)}; kept without raw body: ${res.kept.filter((r) => !r.raw).length}`);
await browser.close();
