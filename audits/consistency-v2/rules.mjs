/**
 * Consistency audit v2 — the rules check (Phase 2). Reads a run directory written by audit2.measure.ts and asserts
 * the eleven settled rulings (CLAUDE.md "Design rules (settled)") on every page, after the exceptions in
 * exceptions.json. Prints a pass / fail per rule per page and writes <run>/rules-result.json.
 *
 *   node audits/consistency-v2/rules.mjs <run dir>        (npm run audit:rules runs the harness, then this)
 *
 * A rule that does not apply to a page (no navy header, no view switch) is "n/a", never "pass". A page that failed
 * to load is listed as FAILED TO LOAD, never as passing. An exception with no reason stops the check.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN = resolve(process.argv[2] || resolve(HERE, ".run-rules"));
const EXC = JSON.parse(readFileSync(resolve(HERE, "exceptions.json"), "utf8")).exceptions;
for (const e of EXC) if (!e.reason || !String(e.reason).trim()) throw new Error(`exceptions.json: an exception for ${e.rule} has no reason — not allowed`);

/* ── the standards, from shell/primitives.css (:root) and index.css ─────────────────────────────── */
export const STD = {
  navy: "#2a3a52", oldNavy: "#2d3a50", rust: "#7a3f31", burgundy: "#7c3a2a", oat: "#f2eee8",
  header: { titleTop: 40, gapBelow: 40, tol: 1 },
  headings: {
    "headings/section": { font: "Special Elite", size: 24, weight: "400", lh: 28.8 },
    "headings/card": { font: "Special Elite", size: 20, weight: "400", lh: 25 },
    "headings/small": { font: "Source Serif 4", size: 16, weight: "600", lh: 20.8 },
  },
  button: { height: 40, radius: "10", font: "Source Serif 4", size: 15, weight: "600" },
  /* consistency wrap-up v1 (rulings v4, item 4): the SMALL OUTLINE BUTTON, the agreed kind for a button inside a header band —
     30 high, radius 8, Source Serif 4 600 14, a 1.5px navy edge. `in` names the agreed ones; anything else is held to `button`. */
  smallOutline: { height: 30, radius: "8", font: "Source Serif 4", size: 14, weight: "600", in: ["tws-qfb"] },
  card: { padding: "8 8 8 8", radius: "20", shadow: "#1c130f/4 0px 1px 2px 0px, #1c130f/7 0px 6px 18px 0px", innerRadius: "13", innerEdge: "1px solid #e9e3d9" },
  field: { height: 44, radius: "10", size: 16, edge: "#1c130f/18 0px 0px 0px 1px inset", focusEdge: "#2a3a52 0px 0px 0px 1.5px inset" },
  viewSwitch: { radius: "12", optHeight: 34, optRadius: "9" },
  /* consistency wrap-up v1 (rulings v4, item 2, as amended 22 Nov): the query card's and agent card's action footer is measured
     by its PADDING — 14 above and below the reply box, 24 at the sides — whatever height that gives (about 90); every other
     slide-out action footer stays 72 high. `cardFooter` names those two footers. */
  panel: { close: 36, footer: 72, cardFooterPad: "14 24 14 24", cardFooter: ["qc152-rb"] },
  /* consistency roll-out v2 (rulings v3) */
  danger: "#a63d2f", muted: "#5b4f47", quiet: "#6b6058", retiredGreys: ["#4d443d", "#7d7067", "#8a7a6c", "#8a8076"],
  body: { off: [14.5, 15, 15.5, 16.5, 17] },
  tag: { height: 28, radius: "999", font: "Source Serif 4", size: 14, weight: "600" },
  panelTitle: { font: "Special Elite", size: 24, weight: "400", lh: 28.8 },
  ring: ["2px solid rgb(42, 58, 82)", "2px solid rgb(244, 238, 229)"],
};
/* a slide-out panel's title (ruling 3): read against the panel title standard, not the card heading */
export const PANEL_TITLE = /(flh-t|qcrr-head|qc1522-ch|cp30-dtl|k62-hdr-head)/;
/* status-tag records that are not text tags (ruling 4): they hold a mark, a person, a figure or an icon, or are a public page's */
export const NOT_TAGS = /(qc152-pill|d22-fstat|cl26-pct|ms29-bk-f|k62-sb-tag|pl3-pill|plt-chip|tws-dchip|mk-)/;
export const RULES = {
  R1: "No rendered text under 12px (artwork, scaled-down previews and the manuscript spine title exempt)",
  R2: "No #2d3a50; no green; red only on the agreed destructive actions; burgundy #7c3a2a only as a MountCard frame border",
  R3: "Page ground is oat (#f2eee8) on workspace and public pages",
  R4: "Navy header: title 40px (±1) from its top, 40px (±1) to the content below, the same distance from the sheet's top on every page",
  R5: "Section, card and small headings match the three settled styles",
  R6: "Action buttons in a page body match the filled or outline standard (or, inside a header band, the small outline button); at most one filled per view",
  R7: "Framed cards match the standard (rim 8 / 20 / shadow; inner 13 / 1px #e9e3d9)",
  R8: "Boxed text fields match the standard (44 high, radius 10, 1px ink edge, 16px)",
  R9: "View switches are boxed; slide-out close buttons are 36px; slide-out action footers are 72px (the query card's and agent card's: padded 14 / 24)",
  R10: "No user-visible \"late\" or \"overdue\"",
  R11: "Small warm accents use --sp-rust (#7a3f31)",
  R12: "Running text in Source Serif 4 is 16 (body) or 14 (secondary) on workspace pages, the Dashboard and panels",
  R13: "Muted text uses --sp-muted (#5b4f47) or --sp-quiet (#6b6058), not a retired grey",
  R14: "Text tags match the standard (28 high, fully rounded, Source Serif 4 600 14)",
  R15: "One focus ring: 2px navy, or cream on dark grounds",
};
/* which families each rule reads (the rulings' own scope) */
const SCOPE = {
  R1: null, R2: null, R10: null, R11: null,
  R12: ["workspace", "dashboard", "overlays"], R13: ["workspace", "dashboard", "non-workspace", "overlays", "onboarding"],
  R14: ["workspace", "dashboard", "non-workspace", "overlays"], R15: ["workspace", "dashboard", "non-workspace", "overlays", "onboarding"],
  R3: ["workspace", "public"],
  R4: ["workspace", "dashboard", "non-workspace"],
  R5: ["workspace", "dashboard", "non-workspace", "overlays"],
  R6: ["workspace", "dashboard"],
  R7: ["workspace", "dashboard", "overlays"],
  R8: ["workspace", "dashboard", "overlays"],
  R9: ["workspace", "dashboard", "overlays"],
};

/* ── colour helpers (hex as the collector writes it: #rrggbb or #rrggbb/aa) ─────────────────────── */
const parse = (h) => { const m = /^#([0-9a-f]{6})(?:\/(\d+))?$/.exec(h || ""); if (!m) return null; const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: m[2] ? +m[2] / 100 : 1 }; };
const hsl = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return { h, s, l }; };
const lab = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [R, G, B] = [f(r), f(g), f(b)]; let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883; const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); [x, y, z] = [g3(x), g3(y), g3(z)]; return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const base = (h) => (h || "").split("/")[0];
export const isGreen = (p) => { const x = hsl(p); return x.h >= 75 && x.h <= 165 && x.s >= 0.22 && x.l >= 0.12 && x.l <= 0.88; };
export const isRed = (p) => { const x = hsl(p); return (x.h <= 12 || x.h >= 345) && x.s >= 0.45 && x.l >= 0.25 && x.l <= 0.65 && dE(p, parse(STD.burgundy)) >= 3 && dE(p, parse(STD.rust)) >= 3; };
/* a rust-like accent: warm hue, mid lightness. Dark brown ink (lightness under 0.2, e.g. the beta strip's #3a1c14) is ink, not an accent */
export const isWarmAccent = (p) => { const x = hsl(p); return x.h >= 4 && x.h <= 36 && x.s >= 0.3 && x.l >= 0.2 && x.l <= 0.46; };
export const SLIDE = /(^|[.\s])(spanel|hdr|k62-hdr|cl262-panel)([.\s]|$)/;
const near = (a, b, tol) => typeof a === "number" && Math.abs(a - b) <= tol;

/* ── read the run ──────────────────────────────────────────────────────────────────────────────── */
export function loadRun(dir) {
  const log = JSON.parse(readFileSync(resolve(dir, "_log.json"), "utf8"));
  const views = [];
  for (const f of readdirSync(dir).filter((f) => /@\d+\.json$/.test(f))) {
    const j = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
    if (!j.records) continue;
    /* /goals, /materials and /you are listed as workspace in v1's routes but redirect to the Dashboard: read them as the Dashboard */
    if (j.family === "workspace" && /^\/dashboard/.test(j.finalUrl || "")) { j.family = "dashboard"; j.redirected = true; }
    views.push(j);
  }
  return { log, views };
}

/* ── the eleven rules: each returns the failing instances for one view ─────────────────────────── */
function check(v, ctx) {
  const out = {}; const fail = (rule, inst) => (out[rule] = out[rule] || []).push(inst);
  const applies = {}; const mark = (rule) => (applies[rule] = true);
  const fam = v.family;
  const inScope = (rule) => !SCOPE[rule] || SCOPE[rule].includes(fam);
  const recs = (role) => v.records.filter((r) => (role instanceof RegExp ? role.test(r.role) : r.role === role));
  const f = v.facts;

  /* R1 */
  mark("R1");
  for (const s of f.small) if (!s.inArt && !s.scaled && !s.spine) fail("R1", { sel: s.sel, chain: s.chain, text: s.text, detail: `${s.size}px` });

  /* R2 */
  mark("R2");
  for (const c of f.census) {
    const p = parse(c.colour); if (!p || p.a < 0.15) continue;
    const ex = (fn) => c.ex.filter(fn);
    if (base(c.colour) === STD.oldNavy) for (const e of c.ex) fail("R2", { sel: e.sel, chain: e.chain, text: e.text, detail: `${c.prop} ${c.colour} (#2d3a50)` });
    if (isGreen(p)) for (const e of ex((e) => !e.art)) fail("R2", { sel: e.sel, chain: e.chain, text: e.text, detail: `${c.prop} ${c.colour} (green)` });
    /* ruling 10: red only on the three named actions, in --sp-danger (the Settings danger button, the To-do's red go and warning) */
    if (isRed(p)) for (const e of ex((e) => !e.art && !(base(c.colour) === STD.danger && (e.destructive || /tws-po/.test([e.sel, ...(e.chain || [])].join(" ")))))) fail("R2", { sel: e.sel, chain: e.chain, text: e.text, detail: `${c.prop} ${c.colour} (red${e.destructive ? ", on a destructive control" : ""})`, destructive: e.destructive });
    if (dE(p, parse(STD.burgundy)) < 3) for (const e of ex((e) => !(c.prop === "border" && e.mountFrame) && !e.art)) fail("R2", { sel: e.sel, chain: e.chain, text: e.text, detail: `${c.prop} ${c.colour} (burgundy, not a MountCard frame border)` });
  }

  /* R3 */
  if (inScope("R3") && v.state !== "journey step") {
    mark("R3");
    const ground = fam === "workspace" ? f.ground.stage : f.ground.sheet || f.ground.body;
    if (base(ground) !== STD.oat) fail("R3", { sel: fam === "workspace" ? "#app-stage-scroll" : f.ground.sheetSel || "body", text: "", detail: `ground ${ground}` });
  }

  /* R4 */
  if (inScope("R4") && f.header && f.header.kind === "navy" && v.state !== "journey step") {
    mark("R4");
    const h = f.header;
    if (!near(h.titleTop, STD.header.titleTop, STD.header.tol)) fail("R4", { sel: h.sel, text: "", detail: `title ${h.titleTop}px from the header's top` });
    if (!near(h.gapBelow, STD.header.gapBelow, STD.header.tol)) fail("R4", { sel: h.sel, text: "", detail: `${h.gapBelow}px to the content below (${h.belowSel})` });
    const m = ctx.headerTop[v.vw];
    if (m != null && !near(h.topFromSheet, m, 1)) fail("R4", { sel: h.sel, text: "", detail: `${h.topFromSheet}px from the sheet's top; most pages ${m}px` });
  }

  /* R5 */
  if (inScope("R5")) for (const r of recs(/^headings\/(section|card|small)$/)) {
    if (r.scope === "shell") continue;
    mark("R5");
    const s = PANEL_TITLE.test(r.sel) ? STD.panelTitle : STD.headings[r.role], g = r.sig, why = [];
    if (g.font !== s.font) why.push(`font ${g.font}`);
    if (!near(g.size, s.size, 0.5)) why.push(`${g.size}px`);
    if (String(g.weight) !== s.weight) why.push(`weight ${g.weight}`);
    if (g.lh !== "normal" && !near(g.lh, s.lh, 1)) why.push(`line ${g.lh}`);
    if (why.length) fail("R5", { sel: r.sel, text: r.text, role: r.role, detail: `${r.role.split("/")[1]}: ${why.join(", ")}` });
  }

  /* R6 */
  if (inScope("R6")) {
    const btns = recs("buttons/action").filter((r) => r.scope === "page" && !r.disabled);
    if (btns.length) mark("R6");
    const b = STD.button;
    for (const r of btns) {
      const g = r.sig, why = [];
      const so = STD.smallOutline, small = so.in.some((c) => (r.sel || "").includes(c));
      if (small) {
        if (!(r.variant === "outline" || (r.variant === "light-filled" && base(g.bg) === "#ffffff")) || !(/inset/.test(g.shadow) && g.shadow.includes(STD.navy) && /1\.5px/.test(g.shadow))) why.push(`small outline: edge ${g.shadow !== "none" ? g.shadow : g.border}`);
        if (!near(g.height, so.height, 1)) why.push(`${g.height} high`);
        if (g.radius !== so.radius) why.push(`radius ${g.radius}`);
        if (g.font !== so.font || !near(g.size, so.size, 0.5) || String(g.weight) !== so.weight) why.push(`${g.font} ${g.weight} ${g.size}px`);
        if (why.length) fail("R6", { sel: r.sel, text: r.text, detail: `small outline: ${why.join(", ")}` });
        continue;
      }
      if (r.variant === "filled") { if (base(g.bg) !== STD.navy) why.push(`fill ${g.bg}`); }
      else if (r.variant === "outline") { if (!(/inset/.test(g.shadow) && g.shadow.includes(STD.navy)) && !(g.border && g.border.includes(STD.navy))) why.push(`edge ${g.shadow !== "none" ? g.shadow : g.border}`); }
      else why.push(r.variant === "text" ? "a text button (neither filled nor outline)" : `a light fill ${g.bg}`);
      if (!near(g.height, b.height, 1)) why.push(`${g.height} high`);
      if (g.radius !== b.radius) why.push(`radius ${g.radius}`);
      if (g.font !== b.font || !near(g.size, b.size, 0.5) || String(g.weight) !== b.weight) why.push(`${g.font} ${g.weight} ${g.size}px`);
      if (why.length) fail("R6", { sel: r.sel, text: r.text, detail: `${r.variant}: ${why.join(", ")}` });
    }
    const filled = btns.filter((r) => r.variant === "filled");
    if (filled.length > 1) fail("R6", { sel: filled.map((r) => r.sel).join(" + "), text: filled.map((r) => r.text).join(" | "), detail: `${filled.length} filled buttons in one view` });
  }

  /* R7 */
  if (inScope("R7")) {
    for (const r of recs("cards/framed")) {
      mark("R7");
      const g = r.sig, s = STD.card, why = [];
      if (g.padding !== s.padding) why.push(`padding ${g.padding}`);
      if (g.radius !== s.radius) why.push(`radius ${g.radius}`);
      if (g.shadow !== s.shadow) why.push(`shadow ${g.shadow}`);
      if (why.length) fail("R7", { sel: r.sel, text: r.text, detail: `rim: ${why.join(", ")}` });
    }
    for (const r of recs("cards/framed-inner")) {
      mark("R7");
      const g = r.sig, s = STD.card, why = [];
      if (g.radius !== s.innerRadius) why.push(`radius ${g.radius}`);
      if (g.border !== s.innerEdge) why.push(`edge ${g.border}`);
      if (why.length) fail("R7", { sel: r.sel, text: r.text, detail: `inner frame: ${why.join(", ")}` });
    }
  }

  /* R8 */
  if (inScope("R8")) for (const r of recs("controls/text-field")) {
    if (r.scope === "shell") continue;
    mark("R8");
    const g = r.sig, s = STD.field, why = [];
    if (!near(g.height, s.height, 1)) why.push(`${g.height} high`);
    if (g.radius !== s.radius) why.push(`radius ${g.radius}`);
    /* a field that has focus when the panel opens is read against the focus standard (--sp-fld-focus), not the rest edge */
    const edgeOk = r.focused ? g.shadow === s.focusEdge : g.shadow === s.edge || g.border === "1px solid #1c130f/18";
    if (!edgeOk) why.push(`edge ${g.shadow !== "none" ? g.shadow : g.border}`);
    if (!near(g.size, s.size, 0.5)) why.push(`${g.size}px text`);
    if (why.length) fail("R8", { sel: r.sel, text: r.placeholder || r.text, detail: `${r.focused ? "(focused) " : ""}${why.join(", ")}` });
  }

  /* R9 */
  if (inScope("R9")) {
    for (const r of recs("nav/view-switch")) {
      mark("R9");
      const g = r.sig, why = [];
      const boxed = (g.bg && g.bgFrom === "own") || g.border !== "none" || g.shadow !== "none";
      if (!boxed) why.push("not boxed");
      if (g.radius !== STD.viewSwitch.radius) why.push(`radius ${g.radius}`);
      if (why.length) fail("R9", { sel: r.sel, text: r.text, detail: `view switch: ${why.join(", ")}` });
    }
    for (const r of recs("nav/view-switch-option")) {
      mark("R9");
      const g = r.sig, why = [];
      if (!near(g.height, STD.viewSwitch.optHeight, 1)) why.push(`${g.height} high`);
      if (g.radius !== STD.viewSwitch.optRadius) why.push(`radius ${g.radius}`);
      if (why.length) fail("R9", { sel: r.sel, text: r.text, detail: `view switch button: ${why.join(", ")}` });
    }
    /* slide-outs only: the panel components that slide in from the side (spanel, hdr, k62-hdr, cl262-panel), named like the
       role map, not guessed from size (Record a response's panel is 700 high, under three quarters of the viewport) */
    const slide = (v.dialogBoxes || []).filter((d) => SLIDE.test(d.sel)).map((d) => d.sel);
    const inSlide = (r) => slide.some((s) => r.view === s);
    for (const r of recs("panels/close").filter(inSlide)) {
      mark("R9");
      if (!near(r.sig.width, STD.panel.close, 1) || !near(r.sig.height, STD.panel.close, 1)) fail("R9", { sel: r.sel, text: r.text, detail: `close ${r.sig.width}×${r.sig.height}` });
    }
    for (const r of recs("panels/footer").filter(inSlide)) {
      mark("R9");
      if (STD.panel.cardFooter.some((c) => (r.sel || "").includes(c))) {
        if (r.sig.padding !== STD.panel.cardFooterPad) fail("R9", { sel: r.sel, text: r.text, detail: `card footer padding ${r.sig.padding} (want ${STD.panel.cardFooterPad})` });
      } else if (!near(r.sig.height, STD.panel.footer, 1)) fail("R9", { sel: r.sel, text: r.text, detail: `footer ${r.sig.height} high (want ${STD.panel.footer})` });
    }
  }

  /* R12 — body sizes (ruling 1) */
  if (inScope("R12")) for (const r of recs(/^text\/(body|secondary)$/)) {
    if (r.scope === "shell" || !r.sig || r.sig.font !== "Source Serif 4") continue;
    mark("R12");
    if (STD.body.off.includes(+r.sig.size)) fail("R12", { sel: r.sel, text: r.text, detail: `${r.sig.size}px` });
  }
  /* R13 — muted text (ruling 2) */
  if (inScope("R13")) for (const r of recs(/^text\//)) {
    if (!r.sig || !r.sig.color) continue;
    mark("R13");
    if (STD.retiredGreys.includes(base(r.sig.color))) fail("R13", { sel: r.sel, text: r.text, detail: `colour ${r.sig.color}` });
  }
  /* R14 — text tags (ruling 4) */
  if (inScope("R14")) for (const r of recs("marks/status-tag")) {
    if (NOT_TAGS.test(r.sel)) continue;
    mark("R14");
    const g = r.sig, t = STD.tag, why = [];
    if (!near(g.height, t.height, 1)) why.push(`${g.height} high`);
    if (g.radius !== t.radius) why.push(`radius ${g.radius}`);
    if (g.font !== t.font || !near(g.size, t.size, 0.5) || String(g.weight) !== t.weight) why.push(`${g.font} ${g.weight} ${g.size}px`);
    if (why.length) fail("R14", { sel: r.sel, text: r.text, detail: why.join(", ") });
  }
  /* R15 — one focus ring (ruling 11), from the focus readings (1512): a ring that is drawn must be the standard one */
  if (inScope("R15")) for (const h of v.hover || []) {
    if (!h.focus || !/^(buttons|lists|nav)\//.test(h.role)) continue;
    const o = h.focus.outline || ""; if (/\bnone\b/.test(o) || /^0px/.test(o)) continue;
    mark("R15");
    const rec = v.records.find((r) => r.id === h.id);
    if (!STD.ring.some((x) => o.startsWith(x))) fail("R15", { sel: rec ? rec.sel : h.id, text: rec ? rec.text : "", detail: `focus ${o}` });
  }

  /* R10 */
  mark("R10");
  for (const w of f.words) fail("R10", { sel: w.sel, chain: w.chain, text: w.text, detail: w.placeholder ? "placeholder" : "text" });

  /* R11 */
  mark("R11");
  for (const c of f.census) {
    if (!["color", "fill", "stroke"].includes(c.prop)) continue;
    const p = parse(c.colour); if (!p || p.a < 0.3) continue;
    if (!isWarmAccent(p) || isRed(p)) continue;
    if (base(c.colour) === STD.rust) continue;
    for (const e of c.ex.filter((e) => e.smallAccent && !e.art)) fail("R11", { sel: e.sel, chain: e.chain, text: e.text, detail: `${c.prop} ${c.colour}` });
  }
  return { out, applies };
}

/* ── exceptions ───────────────────────────────────────────────────────────────────────────────── */
const pageMatch = (e, key) => !e.pages || e.pages.includes("*") || e.pages.includes(key) || e.pages.some((p) => p.endsWith("*") && key.startsWith(p.slice(0, -1)));
const instMatch = (e, inst) => {
  const m = e.match || {};
  const hay = [inst.sel, ...(inst.chain || [])].join(" ");
  if (m.sel && !hay.includes(m.sel)) return false;
  if (m.text && !new RegExp(m.text, "i").test(inst.text || "")) return false;
  if (m.detail && !new RegExp(m.detail, "i").test(inst.detail || "")) return false;
  if (m.role && inst.role !== m.role) return false;
  return true;
};

export function evaluate(dir) {
  const { log, views } = loadRun(dir);
  /* R4's "same distance on every page": the most common topFromSheet among navy headers, per width */
  const headerTop = {};
  for (const vw of [...new Set(views.map((v) => v.vw))]) {
    const tops = views.filter((v) => v.vw === vw && v.facts.header && v.facts.header.kind === "navy" && v.state !== "journey step").map((v) => v.facts.header.topFromSheet);
    const counts = {}; for (const t of tops) counts[t] = (counts[t] || 0) + 1;
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    headerTop[vw] = best ? +best[0] : null;
  }
  const used = new Map(EXC.map((e, i) => [i, 0]));
  const rows = [];
  for (const v of views.sort((a, b) => a.key.localeCompare(b.key) || a.vw - b.vw)) {
    v.dialogBoxes = (v.records || []).filter((r) => r.role === "panels/shell").map((r) => ({ sel: r.view, w: r.sig.width, h: r.rect.h }));
    const { out, applies } = check(v, { headerTop });
    const row = { page: v.key, vw: v.vw, family: v.family, state: v.state, rules: {} };
    for (const rule of Object.keys(RULES)) {
      if (!applies[rule]) { row.rules[rule] = { status: "n/a" }; continue; }
      const fails = [], exempt = [];
      for (const inst of out[rule] || []) {
        const i = EXC.findIndex((e) => e.rule === rule && pageMatch(e, v.key) && instMatch(e, inst));
        if (i >= 0) { used.set(i, used.get(i) + 1); exempt.push({ ...inst, exception: i }); } else fails.push(inst);
      }
      row.rules[rule] = { status: fails.length ? "fail" : "pass", fails, exempt: exempt.length };
    }
    rows.push(row);
  }
  const failedToLoad = log.filter((e) => e.failed).map((e) => ({ page: e.key, vw: e.vw, why: e.failed }));
  const unusedExceptions = EXC.map((e, i) => ({ i, rule: e.rule, match: e.match, reason: e.reason, used: used.get(i) })).filter((e) => !e.used);
  return { rows, failedToLoad, unusedExceptions, headerTop };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = evaluate(RUN);
  writeFileSync(resolve(RUN, "rules-result.json"), JSON.stringify(res, null, 1));
  const ids = Object.keys(RULES);
  const lines = [`Consistency audit v2 — rules check · ${RUN}`, "", ...ids.map((r) => `${r}  ${RULES[r]}`), "", `page@width`.padEnd(40) + ids.map((r) => r.padEnd(5)).join("")];
  for (const row of res.rows) lines.push(`${row.page}@${row.vw}`.padEnd(40) + ids.map((r) => { const s = row.rules[r]; return (s.status === "n/a" ? "·" : s.status === "pass" ? "ok" : `✗${s.fails.length}`).padEnd(5); }).join(""));
  for (const f of res.failedToLoad) lines.push(`${`${f.page}@${f.vw}`.padEnd(40)}FAILED TO LOAD — ${f.why}`);
  const tot = Object.fromEntries(ids.map((r) => [r, res.rows.filter((x) => x.rules[r].status === "fail").length]));
  lines.push("", `Pages failing each rule: ${ids.map((r) => `${r} ${tot[r]}`).join(" · ")}`, `Exceptions that matched nothing: ${res.unusedExceptions.length}`);
  console.log(lines.join("\n"));
  process.exitCode = res.rows.some((x) => Object.values(x.rules).some((s) => s.status === "fail")) || res.failedToLoad.length ? 1 : 0;
}
