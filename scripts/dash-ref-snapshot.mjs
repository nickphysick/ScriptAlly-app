#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE DASHBOARD REFERENCE, TAKEN FROM THE BUILD (17 Sep) ══════════════════════════════════════
 *
 * `dash-refdiff.mjs` compared the app against a DRAWN mockup (`dashboard-cappuccino-v34.html`) until
 * stage 1 of the dashboard rebuild replaced the mockup's header — its stat cards are gone from the
 * app by design — so the mockup could no longer be the oracle for the page as a whole, and stages 2
 * and 3 will each bring their own. Until they do, the reference is the page itself, taken from a
 * known build, and the harness answers the question worth asking between stages: has anything moved
 * since that build.
 *
 * ⚠️ A SNAPSHOT IS A REGRESSION BASELINE, NOT A DESIGN. It agrees with the build it was taken from by
 * construction, so a green run proves nothing moved since then — never that the page is right. The
 * design authority for what is not yet rebuilt is still v34, which stays on the ref watchlist.
 *
 * ⚠️ WHAT IT CANNOT CARRY IS THE CHART'S DATA. The plot is frozen at the moment of capture while the
 * app's chart is a rolling window, so the plot's pixel diff SKIPS on a build reference (it needs a
 * mockup whose fixture it can substitute — `dash-plotdiff-v31.mjs` reads the `dash-ref-source` meta)
 * and the chart is held by the standing structural gates until stage 3 brings a chart ref.
 *
 * WHAT IT IS: the signed-in dashboard's DOM — without the other workspace pages, which the shell keeps
 * mounted and hidden and which draw no box — with scripts, iframes and preloads removed; the built
 * stylesheet inlined, PRUNED to the rules whose selector matches something on the captured page
 * (every flag icon and most of the app's utilities are dead weight here — 1.45MB unpruned); every
 * drawn same-origin image inlined as a data URI; the Google Fonts links kept. Static, responsive —
 * the kept rules still carry their media queries — and loadable from `file://`.
 *
 * ⚠️ PRUNING IS SAFE FOR THIS HARNESS AND FOR NOTHING MORE AMBITIOUS. A rule is kept when its
 * selector, with dynamic pseudo-classes and pseudo-elements stripped, matches an element in the
 * captured DOM — so everything that can style a captured element at any width survives, and what
 * goes are rules for elements that are not in the snapshot at all (open drawers, hover popovers,
 * other pages). The harness only reads captured elements on the ref side. A selector the browser
 * cannot query is KEPT, never guessed at.
 *
 * USAGE
 *   SA_REFDIFF_APP_URL=http://127.0.0.1:<port> node scripts/dash-ref-snapshot.mjs \
 *     --out design-refs/dashboard-build-<yyyy-mm-dd>.html [--width 1710]
 *   then point `scripts/dash-ref.mjs` at it and enrol it:
 *     node scripts/check-design-refs.mjs --update design-refs/dashboard-build-<yyyy-mm-dd>.html
 *
 * ENV   SA_REFDIFF_APP_URL (default http://127.0.0.1:4173) · SA_E2E_PASSWORD (from .env.local)
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const APP = (process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
/* 1710 is where Nick works, and one of the harness's four widths */
const WIDTH = Number(flag("--width", "1710"));
/* the harness's own height, so the captured page is the one it measures */
const HEIGHT = 1456;
const OUT_ARG = flag("--out", "");
if (!OUT_ARG) {
  console.error("dash-ref-snapshot: --out <design-refs/dashboard-build-<date>.html> is required");
  process.exit(1);
}
const OUT = resolve(ROOT, OUT_ARG);
if (existsSync(OUT)) {
  /* a reference is regenerated under a NEW name; the manifest guards the old one against exactly this */
  console.error(`dash-ref-snapshot: ${OUT_ARG} exists — a new reference takes a new name, never an old one's`);
  process.exit(1);
}

/* ── the build being captured must be this tree's, and current (the harness's own two checks) ── */
const newest = (dir) => {
  let t = 0;
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    const st = statSync(f);
    t = Math.max(t, st.isDirectory() ? newest(f) : st.mtimeMs);
  }
  return t;
};
const DIST = join(ROOT, "dist", "assets");
if (!existsSync(DIST)) { console.error("dash-ref-snapshot: no dist/ — run `npm run build:dev` first"); process.exit(1); }
if (newest(join(ROOT, "src")) > newest(DIST)) {
  console.error("dash-ref-snapshot: dist/ is older than src/ — rebuild before capturing a reference");
  process.exit(1);
}
const served = await (await fetch(`${APP}/dashboard`)).text();
const entry = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(served);
if (!entry || !existsSync(join(DIST, entry[1]))) {
  console.error(`dash-ref-snapshot: ${APP} is not serving this tree's build (${entry ? entry[1] : "no entry bundle"})`);
  process.exit(1);
}
if (readdirSync(DIST).filter((f) => f.endsWith(".js")).some((f) => readFileSync(join(DIST, f), "utf8").includes("gen-lang-client-0801391782"))) {
  console.error("dash-ref-snapshot: dist/ is a PRODUCTION bundle — capture from `npm run build:dev`");
  process.exit(1);
}

/* ── sign in: the harness's own sequence, copied for the same reason it copies it ── */
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
function envLocal(key) {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`).exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}
async function signIn(page) {
  const settled = await Promise.race([
    page.locator(SHELL).first().waitFor({ state: "attached", timeout: 60000 }).then(() => "shell").catch(() => null),
    page.locator("#au-email").waitFor({ state: "attached", timeout: 60000 }).then(() => "form").catch(() => null),
  ]);
  if (settled === "shell") return;
  const pw = process.env.SA_E2E_PASSWORD || envLocal("SA_E2E_PASSWORD");
  if (!pw) throw new Error("No SA_E2E_PASSWORD — see tests/e2e/auth.setup.ts");
  await page.goto(`${APP}/#/signin`);
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL || envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 90000 });
  await page.goto(`${APP}/dashboard`, { waitUntil: "domcontentloaded" });
}

/**
 * Runs IN THE PAGE (a real function, never a template literal). Returns the serialised document and
 * a tally of what was kept, so the log can say what the reference is made of.
 */
async function serialise() {
  const origin = location.origin;
  const same = (u) => { try { return new URL(u, location.href).origin === origin; } catch { return false; } };

  /* 0 · the other workspace pages are mounted and hidden (the shell never unmounts a page), and they
     are not the dashboard's. A StagePage slot is a direct child of `.ws-work` whose INLINE style says
     `display: none`; the mobile bar is hidden by a media rule instead, so it is not one of them. */
  const work = document.querySelector(".ws-work");
  const workKids = work ? [...work.children] : [];
  const hiddenSlots = workKids.filter((c) => c.style && c.style.display === "none" && !c.querySelector(".os-root"));
  const outsideHidden = (el) => !hiddenSlots.some((h) => h.contains(el));

  /* 1 · prune one stylesheet to the rules that can reach a captured element */
  const DYNAMIC = [":hover", ":focus-visible", ":focus-within", ":focus", ":active", ":visited", ":link",
    ":checked", ":disabled", ":enabled", ":placeholder-shown", ":autofill", ":-webkit-autofill", ":target"];
  const matches = (selectorText) => {
    for (const part of selectorText.split(",")) {
      let s = part;
      const pe = s.indexOf("::");
      if (pe >= 0) s = s.slice(0, pe);
      for (const d of DYNAMIC) s = s.split(d).join("");
      s = s.trim();
      if (!s) return true;
      try {
        const first = document.querySelector(s);
        if (!first) continue;
        if (outsideHidden(first)) return true;
        if ([...document.querySelectorAll(s)].some(outsideHidden)) return true;
      } catch { return true; }
    }
    return false;
  };
  const tally = { kept: 0, dropped: 0 };
  const walk = (rules) => {
    let out = "";
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        if (matches(rule.selectorText)) { out += rule.cssText + "\n"; tally.kept++; } else tally.dropped++;
      } else if ("cssRules" in rule && rule.cssRules && !(rule instanceof CSSKeyframesRule)) {
        const inner = walk(rule.cssRules);
        if (inner) {
          const head = rule.cssText.slice(0, rule.cssText.indexOf("{"));
          out += head + "{\n" + inner + "}\n";
        }
      } else {
        out += rule.cssText + "\n";   /* @font-face, @keyframes, @property, @layer statements, @import */
      }
    }
    return out;
  };

  const doc = document.documentElement.cloneNode(true);
  const workClone = doc.querySelector(".ws-work");
  if (workClone) {
    const cloneKids = [...workClone.children];
    workKids.forEach((k, i) => { if (hiddenSlots.includes(k) && cloneKids[i]) cloneKids[i].remove(); });
  }
  for (const n of doc.querySelectorAll(
    "script, noscript, iframe, style[data-dash-ref-harness], link[rel='modulepreload'], link[rel='preload'], " +
    "link[rel='prefetch'], link[rel='icon'], link[rel='apple-touch-icon'], link[rel='manifest']",
  )) n.remove();

  const liveLinks = [...document.querySelectorAll("link[rel='stylesheet']")];
  const cloneLinks = [...doc.querySelectorAll("link[rel='stylesheet']")];
  const sheets = [];
  for (let i = 0; i < liveLinks.length; i++) {
    if (!same(liveLinks[i].href)) continue;          /* Google Fonts stays a link */
    const sheet = liveLinks[i].sheet;
    const before = tally.kept;
    const css = sheet ? walk(sheet.cssRules) : "";
    const style = document.createElement("style");
    style.setAttribute("data-from", new URL(liveLinks[i].href).pathname);
    style.textContent = css;
    cloneLinks[i].replaceWith(style);
    sheets.push({ from: new URL(liveLinks[i].href).pathname, rules: tally.kept - before, bytes: css.length });
  }

  /* 2 · every drawn same-origin image, inlined */
  const dataUrl = async (u) => {
    const blob = await (await fetch(u)).blob();
    return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(blob); });
  };
  /* the clone no longer holds the hidden slots, so the live side is filtered the same way to keep the
     two lists index-aligned */
  const liveImgs = [...document.querySelectorAll("img")].filter(outsideHidden);
  const cloneImgs = [...doc.querySelectorAll("img")];
  if (liveImgs.length !== cloneImgs.length) throw new Error(`image lists disagree: ${liveImgs.length} live, ${cloneImgs.length} cloned`);
  let inlined = 0;
  for (let i = 0; i < liveImgs.length; i++) {
    const src = liveImgs[i].currentSrc || liveImgs[i].src;
    cloneImgs[i].removeAttribute("srcset");
    cloneImgs[i].removeAttribute("loading");
    if (src && same(src) && !src.startsWith("data:")) { cloneImgs[i].setAttribute("src", await dataUrl(src)); inlined++; }
  }

  /* 3 · provenance, and the marker the plot diff reads */
  const meta = document.createElement("meta");
  meta.setAttribute("name", "dash-ref-source");
  meta.setAttribute("content", "build");
  doc.querySelector("head").prepend(meta);

  /* each dropped slot is named by its first classed descendant, so the log says which pages went */
  const droppedSlots = hiddenSlots.map((h) => String((h.querySelector("[class]") || {}).className || "?").split(" ")[0]);
  return { html: doc.outerHTML, tally, sheets, inlined, images: liveImgs.length, droppedSlots };
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120_000);
  await page.goto(`${APP}/dashboard`, { waitUntil: "domcontentloaded" });
  await signIn(page);
  await page.waitForSelector(".ws-app.dash-mode", { state: "attached" });
  await page.waitForSelector(".os-skelpage", { state: "detached" });
  await page.waitForSelector('[data-probe="plot"]', { state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2600);
  /* the harness's own suppression, marked by its handle so the serialiser drops exactly this element */
  const quiet = await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await quiet.evaluate((el) => el.setAttribute("data-dash-ref-harness", ""));
  await page.waitForTimeout(400);

  const probes = await page.evaluate(() => document.querySelectorAll("[data-probe]").length);
  if (probes < 12) throw new Error(`dash-ref-snapshot: only ${probes} probes on the page — not the signed-in dashboard`);

  const snap = await page.evaluate(serialise);
  const sha = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  const subject = execSync("git log -1 --format=%s", { cwd: ROOT }).toString().trim();
  /* ⚠️ A CAPTURE FROM A DIRTY TREE SAYS SO. The served build is this tree's (checked above), which is
     HEAD plus whatever is uncommitted — so a header naming HEAD alone would misstate what was
     measured. The commit that adds the reference is the one that carries those changes. */
  const dirtyPaths = execSync("git status --porcelain -- src public", { cwd: ROOT }).toString().trim();
  const source = dirtyPaths
    ? `${sha} plus uncommitted changes to ${dirtyPaths.split("\n").length} paths under src/ and public/ — the commit that adds this file carries them`
    : `${sha} (${subject.replace(/--/g, "-")})`;
  const when = new Date().toISOString();
  /* root-relative urls left in the kept css (flag icons, if any survived) resolve against the server */
  const html = snap.html.split("url(/").join(`url(${APP}/`).split('url("/').join(`url("${APP}/`);
  const header =
    "<!doctype html>\n" +
    "<!-- ══ DASHBOARD REFERENCE — TAKEN FROM THE BUILD, NOT DRAWN ══\n" +
    `     Source: ${source}, served bundle ${entry[1]}, ${when},\n` +
    `     at ${WIDTH}x${HEIGHT}, signed in as the harness account.\n` +
    "     Made by scripts/dash-ref-snapshot.mjs. A regression baseline between design stages, not a\n" +
    "     design: it agrees with its own build by construction. Regenerate under a NEW name, point\n" +
    "     scripts/dash-ref.mjs at it, and enrol it with scripts/check-design-refs.mjs --update. -->\n";
  writeFileSync(OUT, header + html + "\n");
  console.log(`✓ ${OUT_ARG} — ${Math.round((header.length + html.length) / 1024)}KB`);
  console.log(`  from ${source} · ${entry[1]} · ${WIDTH}x${HEIGHT} · ${probes} probes`);
  console.log(`  css: ${snap.tally.kept} rules kept, ${snap.tally.dropped} dropped · ${JSON.stringify(snap.sheets)}`);
  console.log(`  images: ${snap.inlined} of ${snap.images} inlined`);
  console.log(`  hidden page slots dropped: ${snap.droppedSlots.length} (${snap.droppedSlots.join(", ")})`);
} finally {
  await browser.close();
}
