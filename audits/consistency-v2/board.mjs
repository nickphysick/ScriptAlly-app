/**
 * Consistency audit v2 — Phase 3: measure what has not been ruled. Reads an audit run (CA2_MODE=audit) and writes
 * audits/consistency-v2/board-data.json, the data for the next rulings board.
 *
 *   node audits/consistency-v2/board.mjs <run dir> [--crops <dir>]
 *
 * Ten groups, one shape each: { group, line, measure, styles: [{ id, values, instances, pages, families, example,
 * source, crop }] }. `values` is the measured style; `example.text` follows the public-repo rule (textsafe.mjs);
 * `source` is the stylesheet rule found by the example's classes (file:line), or why none was found; `crop` names a
 * real-size crop in the backups folder (taken at 1512; a style seen only at 1920 has none).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { safeText } from "./textsafe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const RUN = resolve(process.argv[2]);
const CROPS = process.argv.includes("--crops") ? process.argv[process.argv.indexOf("--crops") + 1] : null;
const hash = (o) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 10);
const GRID = [8, 16, 24, 32, 40, 48];
const onGrid = (n) => typeof n === "number" && GRID.includes(Math.round(n));

/* an element's fill is its own: a colour that only shows through from behind is not part of its style */
const ownBg = (r) => { if (r.sig && r.sig.bgFrom && r.sig.bgFrom !== "own" && !r.role.startsWith("surfaces/")) r.sig = { ...r.sig, bg: "none" }; return r; };
const views = readdirSync(RUN).filter((f) => /@\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(resolve(RUN, f), "utf8"))).filter((v) => v.records).map((v) => (v.family === "workspace" && /^\/dashboard/.test(v.finalUrl || "") ? { ...v, family: "dashboard", redirected: true } : v)).map((v) => { v.shotsBySig = v.shots; v.records = v.records.map((r) => { const h = hash(r.sig); const o = ownBg({ ...r }); o.cropKey = `${r.role}|${h}`; return o; }); return v; });
const SETTINGS = (k) => /^account-|^plans$|^help$|^your-notes$/.test(k);

/* ── the stylesheet index: every innermost rule in src/**.css with its line ────────────────────── */
const rules = [];
(function index(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f); const st = statSync(p);
    if (st.isDirectory()) { if (f !== "node_modules") index(p); continue; }
    if (!f.endsWith(".css")) continue;
    const src = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
    const re = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(src))) {
      const selText = m[1].trim(); if (!selText || selText.startsWith("@")) continue;
      const startIdx = m.index + m[1].search(/\S/);
      const line = src.slice(0, startIdx).split("\n").length;
      const props = Object.fromEntries(m[2].split(";").map((x) => x.split(":")).filter((x) => x.length >= 2).map(([k, ...v]) => [k.trim(), v.join(":").trim()]));
      rules.push({ file: relative(ROOT, p), line, sel: selText.replace(/\s+/g, " "), props });
    }
  }
})(resolve(ROOT, "src"));
const PROPS = {
  text: ["font", "font-size", "font-weight", "line-height", "color", "font-family"],
  box: ["height", "min-height", "padding", "border-radius", "background", "background-color", "border", "box-shadow"],
  gap: ["gap", "row-gap", "margin", "margin-top", "margin-bottom", "padding", "padding-top"],
  state: [":hover", ":focus", ":focus-visible", ":focus-within"],
};
function sourceOf(sel, kind) {
  if (!sel) return "no selector";
  const classes = [...sel.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]).filter((c) => !/^(is-|on$|hi$|sel$)/.test(c));
  const tag = (/([a-z0-9]+)(?:\.[^\s>]*)?$/.exec(sel.trim()) || [])[1];
  const want = PROPS[kind] || PROPS.box;
  const hit = (r, c) => new RegExp(`\\.${c.replace(/[-]/g, "\\-")}(?![a-zA-Z0-9_-])`).test(r.sel);
  const cands = [];
  for (const r of rules) {
    const n = classes.filter((c) => hit(r, c)).length;
    if (!n) continue;
    const declares = kind === "state" ? /:(hover|focus)/.test(r.sel) : want.some((p) => p in r.props);
    if (!declares) continue;
    const tagOk = !tag || /\./.test(sel.split(/\s|>/).pop()) || new RegExp(`(^|[\\s>])${tag}([\\s:.\\[]|$)`).test(r.sel);
    cands.push({ r, score: n * 10 + (tagOk ? 1 : 0) });
  }
  if (!cands.length) return "not set by a class rule (inline style, inherited, or a shared element rule)";
  cands.sort((a, b) => b.score - a.score);
  const top = cands.filter((c) => c.score === cands[0].score);
  const best = top[top.length - 1].r;
  return `${best.file}:${best.line}${top.length > 1 ? ` (+${top.length - 1} more rules on the same classes)` : ""}`;
}

/* ── collect instances per group ───────────────────────────────────────────────────────────────── */
function cropFor(v, rec) {
  if (!rec) return null;
  const k = rec.cropKey || `${rec.role}|${hash(rec.sig)}`;
  for (const x of views) if (x.shots && x.shots[k]) return x.shots[k];
  return null;
}
function styles(items, keyOf, valuesOf, srcKind) {
  const m = {};
  for (const it of items) {
    const k = JSON.stringify(keyOf(it));
    const s = (m[k] = m[k] || { values: valuesOf(it), instances: 0, pages: new Set(), families: new Set(), widths: new Set(), ex: null, crop: null });
    s.instances++; s.pages.add(it.v.key); s.families.add(it.v.family); s.widths.add(it.v.vw);
    if (!s.ex || (it.v.vw === 1512 && s.ex.v.vw !== 1512)) s.ex = it;
    if (!s.crop && it.rec) s.crop = cropFor(it.v, it.rec);
  }
  return Object.values(m).sort((a, b) => b.instances - a.instances).map((s, i) => ({
    id: `S${i + 1}`, values: s.values, instances: s.instances, pages: [...s.pages].sort(), families: [...s.families].sort(), widths: [...s.widths].sort(),
    example: { page: s.ex.v.key, vw: s.ex.v.vw, sel: s.ex.sel, text: safeText(s.ex.text || "", s.ex.rec ? s.ex.rec.role : "") },
    source: srcKind ? sourceOf(s.ex.sel, srcKind) : null, crop: s.crop,
  }));
}
const all = (pred) => views.flatMap((v) => v.records.filter((r) => r.scope !== "shell" && pred(r, v)).map((r) => ({ v, rec: r, sel: r.sel, text: r.text })));
const pagesOf = (st) => new Set(st.flatMap((s) => s.pages)).size;
const line = (n, what, st) => `${st.length} ${n} in use for ${what}, across ${pagesOf(st)} pages and states.`;
const groups = [];
const T = (r) => ({ font: r.sig.font, size: r.sig.size, weight: r.sig.weight, lh: r.sig.lh, color: r.sig.color, ...(r.sig.ls !== "normal" ? { ls: r.sig.ls } : {}), ...(r.sig.tt ? { tt: r.sig.tt } : {}) });

/* 1 · body and secondary text, by role and family */
{
  const roles = ["text/body", "text/secondary", "text/label", "text/caption", "text/numeral"];
  const sub = roles.map((role) => {
    const st = styles(all((r) => r.role === role), (it) => ({ ...T(it.rec), fam: it.v.family }), (it) => ({ ...T(it.rec), family: it.v.family }), "text");
    return { role, line: line("styles", role.split("/")[1], st), byFamily: Object.fromEntries(["workspace", "dashboard", "non-workspace", "onboarding", "public", "overlays"].map((f) => [f, st.filter((s) => s.values.family === f).length])), styles: st };
  });
  const total = sub.reduce((s, x) => s + x.styles.length, 0);
  groups.push({ group: "1 · Body and secondary text", line: `${total} text styles in use across ${new Set(sub.flatMap((x) => x.styles.flatMap((s) => s.pages))).size} pages and states (${sub.map((x) => `${x.role.split("/")[1]} ${x.styles.length}`).join(", ")}), counted per family.`, measure: "font, size, weight, line height and colour (letter spacing and case where set) of every own-text leaf not in a heading, button, mark or control", roles: sub });
}
/* 2 · marks */
{
  const roles = ["marks/status-tag", "marks/count-badge", "marks/pro-tag", "marks/initials-disc", "marks/chip", "marks/key-cap", "marks/statusdot"];
  const sub = roles.map((role) => { const st = styles(all((r) => r.role === role), (it) => { const g = it.rec.sig; if (role === "marks/statusdot") return { h: g.height, w: g.width, c: g.color }; return { h: g.height, w: role === "marks/initials-disc" ? g.width : undefined, p: g.padding, r: g.radius, bg: g.bg, b: g.border, c: g.color, fs: g.size, fw: g.weight }; }, (it) => { const g = it.rec.sig; if (role === "marks/statusdot") return { height: g.height, width: g.width, ink: g.color }; return { height: g.height, ...(role === "marks/initials-disc" ? { width: g.width } : {}), padding: g.padding, radius: g.radius, background: g.bg, border: g.border, color: g.color, size: g.size, weight: g.weight, font: g.font }; }, "box"); return { role, line: line("styles", role.split("/")[1], st), styles: st }; });
  groups.push({ group: "2 · Marks", line: sub.map((x) => `${x.role.split("/")[1]}: ${x.styles.length} styles on ${pagesOf(x.styles)} pages`).join("; ") + ".", measure: "height (and width for discs and dots), padding, radius, fill, edge, text colour, size and weight", roles: sub });
}
/* 3 · filter pills */
{
  const st = styles(all((r) => r.role === "nav/filter-pill"), (it) => { const g = it.rec.sig; return [it.rec.variant, g.height, g.padding, g.radius, g.bg, g.border, g.shadow, g.color, g.size, g.weight, g.font]; }, (it) => { const g = it.rec.sig; return { state: it.rec.variant, height: g.height, padding: g.padding, radius: g.radius, background: g.bg, border: g.border, shadow: g.shadow, color: g.color, font: g.font, size: g.size, weight: g.weight }; }, "box");
  groups.push({ group: "3 · Filter pills", line: line("styles", "filter pills (rest and selected counted apart)", st), measure: "state, height, padding, radius, fill, edge, shadow and type", styles: st });
}
/* 4 · list and table rows, with their headers */
{
  const roles = ["lists/list-row", "lists/table-row", "lists/group-header", "lists/column-header", "lists/table-head", "lists/group-section"];
  const hov = {}; for (const v of views) for (const h of v.hover || []) hov[h.key] = h;
  const sub = roles.map((role) => { const st = styles(all((r) => r.role === role), (it) => { const g = it.rec.sig; return [it.rec.variant, g.height, g.padding, g.border, g.bg, g.radius, g.size, g.weight, g.font, g.color]; }, (it) => { const g = it.rec.sig; const h = hov[it.rec.cropKey]; return { state: it.rec.variant, height: g.height, padding: g.padding, divider: g.border, background: g.bg, radius: g.radius, font: g.font, size: g.size, weight: g.weight, color: g.color, hover: h ? diff(h.rest, h.hover) : "not read" }; }, "box"); return { role, line: line("styles", role.split("/")[1], st), styles: st }; });
  groups.push({ group: "4 · List and table rows", line: sub.map((x) => `${x.role.split("/")[1]}: ${x.styles.length}`).join("; ") + ` styles, across ${new Set(sub.flatMap((x) => x.styles.flatMap((s) => s.pages))).size} pages and states.`, measure: "height, padding, divider (the row's own edge), fill, type; selected state from aria/selected classes; hover read on the first instance of each style", roles: sub });
}
/* 5 · Settings, onboarding and public: buttons and form fields */
{
  const fam = (v) => (v.family === "non-workspace" && SETTINGS(v.key) ? "settings" : v.family === "onboarding" ? "onboarding" : v.family === "public" ? "public" : v.family === "non-workspace" ? "settings" : null);
  const btn = styles(all((r, v) => fam(v) && r.role === "buttons/action" && r.scope === "page"), (it) => { const g = it.rec.sig; return [fam(it.v), it.rec.variant, g.height, g.padding, g.radius, g.bg, g.border, g.shadow, g.color, g.font, g.size, g.weight]; }, (it) => { const g = it.rec.sig; return { family: fam(it.v), kind: it.rec.variant, height: g.height, padding: g.padding, radius: g.radius, background: g.bg, border: g.border, shadow: g.shadow, color: g.color, font: g.font, size: g.size, weight: g.weight }; }, "box");
  const fld = styles(all((r, v) => fam(v) && /^controls\/(text-field|textarea|select|headline-field|bare-input|search-field)$/.test(r.role)), (it) => { const g = it.rec.sig; return [fam(it.v), it.rec.role, g.height, g.padding, g.radius, g.bg, g.border, g.shadow, g.size, g.font]; }, (it) => { const g = it.rec.sig; return { family: fam(it.v), role: it.rec.role.split("/")[1], height: g.height, padding: g.padding, radius: g.radius, background: g.bg, border: g.border, shadow: g.shadow, font: g.font, size: g.size }; }, "box");
  groups.push({ group: "5 · Settings, onboarding and public pages: buttons and fields", line: `${btn.length} button styles (${["filled", "outline", "text", "light-filled"].map((k) => `${btn.filter((s) => s.values.kind === k).length} ${k}`).join(", ")}) and ${fld.length} field styles, across ${pagesOf([...btn, ...fld])} pages.`, measure: "per family (settings, onboarding, public): action buttons by kind (filled, outline, text, light fill) and form fields", buttons: btn, fields: fld });
}
/* 6 · spacing */
{
  const sec = []; const grid = []; const cardPad = []; const panelPad = [];
  for (const v of views) {
    for (const s of (v.spacing && v.spacing.sections) || []) sec.push({ v, sel: s.below, text: "", gap: s.gap, ctx: s.column });
    for (const s of (v.spacing && v.spacing.grid) || []) grid.push({ v, sel: s.sel, text: "", gap: s.gap, axis: s.axis, ctx: s.parent });
    for (const r of v.records.filter((r) => /^cards\/(framed|plain-card|stat-tile|journey-card|side-panel)$/.test(r.role) && r.scope !== "shell")) cardPad.push({ v, rec: r, sel: r.sel, text: r.text, pad: r.sig.padding, role: r.role });
    for (const r of v.records.filter((r) => r.role === "panels/shell")) panelPad.push({ v, rec: r, sel: r.sel, text: "", pad: r.sig.padding });
  }
  const gapStyles = (items, extra) => styles(items, (it) => [it.gap, ...(extra ? [it[extra]] : [])], (it) => ({ gap: it.gap, onGrid: onGrid(it.gap), ...(extra ? { [extra]: it[extra] } : {}) }), "gap");
  const padStyles = (items) => styles(items, (it) => [it.pad, it.role || ""], (it) => ({ padding: it.pad, ...(it.role ? { role: it.role.split("/")[1] } : {}), onGrid: String(it.pad).split(" ").every((x) => onGrid(+x) || +x === 0) }), "box");
  const S = { sections: gapStyles(sec), grid: gapStyles(grid, "axis"), cardPadding: padStyles(cardPad), panelPadding: padStyles(panelPad) };
  const off = (st) => st.filter((s) => !s.values.onGrid).length;
  groups.push({ group: "6 · Spacing", line: `Section gaps: ${S.sections.length} values (${off(S.sections)} off the 8-point grid); card-to-card gaps: ${S.grid.length} (${off(S.grid)} off); padding inside cards: ${S.cardPadding.length} (${off(S.cardPadding)} off); padding inside panels: ${S.panelPadding.length} (${off(S.panelPadding)} off).`, measure: "vertical gaps between the page column's sections; gaps between neighbouring cards in one parent (x and y); padding inside framed, plain, stat, journey and side-panel cards and inside overlay panels; each marked on or off 8 / 16 / 24 / 32 / 40 / 48", grid: GRID, ...S });
}
/* 7 · small text that needs room */
{
  const items = [];
  for (const v of views) for (const s of v.facts.small) {
    if (s.inArt || s.scaled || s.spine) continue;
    const k = 12 / s.size;
    const b = s.box || {};
    const needW = b.ownW != null ? Math.ceil(b.ownW * (k - 1)) : null, needH = b.ownH != null ? Math.ceil(b.ownH * (k - 1)) : null;
    items.push({ v, sel: s.sel, text: s.text, size: s.size, container: b.sel, cw: b.w, ch: b.h, needW, needH, ws: b.ws, scope: s.scope });
  }
  const st = styles(items, (it) => [it.sel, it.size], (it) => ({ size: it.size, scope: it.scope, container: it.container, containerBox: `${it.cw}×${it.ch}`, toReach12: `about ${it.needW}px more width${it.ws === "nowrap" ? " (it does not wrap)" : ""} and ${it.needH}px more height in ${it.container}` }), "text");
  groups.push({ group: "7 · Small text that needs room", line: `${st.length} places still draw text under 12px outside the exemptions, across ${pagesOf(st)} pages and states.`, measure: "each own-text element under 12px that is not artwork, a scaled-down preview or the spine title; what it would take to reach 12px, scaled from its own box (12 ÷ size), and the container that would have to give", styles: st });
}
/* 8 · slide-out panels */
{
  const items = [];
  for (const v of views) {
    const shells = v.records.filter((r) => r.role === "panels/shell" && /(^|[.\s])(spanel|hdr|k62-hdr|cl262-panel)([.\s]|$)/.test(r.sel));
    for (const sh of shells) {
      const inView = v.records.filter((r) => r.view === sh.view);
      const title = inView.find((r) => /^headings\//.test(r.role));
      const fields = inView.filter((r) => /^controls\/(text-field|textarea|select|headline-field)$/.test(r.role)).sort((a, b) => a.rect.y - b.rect.y);
      const gaps = []; for (let i = 1; i < fields.length; i++) { const g = Math.round((fields[i].rect.y - (fields[i - 1].rect.y + fields[i - 1].rect.h)) * 10) / 10; if (g >= 0 && g < 200) gaps.push(g); }
      const header = inView.find((r) => r.role === "panels/header");
      items.push({ v, rec: sh, sel: sh.sel, text: "", pad: sh.sig.padding, headerPad: header ? header.sig.padding : null, title: title ? { role: title.role, ...T(title) } : null, gaps: [...new Set(gaps)].sort((a, b) => a - b) });
    }
  }
  const st = styles(items, (it) => [it.pad, it.headerPad, it.title && JSON.stringify(it.title), it.gaps.join(",")], (it) => ({ panel: it.v.key, padding: it.pad, headerPadding: it.headerPad, title: it.title, fieldGaps: it.gaps, fieldGapsOnGrid: it.gaps.map(onGrid) }), "box");
  groups.push({ group: "8 · Slide-out panels", line: `${st.length} panel layouts in use across ${pagesOf(st)} slide-outs and steps.`, measure: "each slide-out panel (spanel, hdr, k62-hdr, cl262-panel): its padding, its header's padding, its first heading's style, and the vertical gaps between consecutive fields", styles: st });
}
/* 9 · public page headers */
{
  const items = [];
  for (const v of views.filter((v) => v.family === "public")) {
    const h = v.facts.header; if (!h) { items.push({ v, sel: "(no header found)", text: "", h: null }); continue; }
    items.push({ v, rec: v.records.find((r) => r.role === "headings/page-title") || null, sel: h.title ? h.title.sel : h.sel, text: "", h });
  }
  const st = styles(items, (it) => [it.v.key, it.v.vw], (it) => it.h ? ({ page: it.v.key, width: it.v.vw, titleSize: it.h.title && it.h.title.size, titleFont: it.h.title && it.h.title.font, titleWeight: it.h.title && it.h.title.weight, fromSheetTop: it.h.topFromSheet, titleFromHeaderTop: it.h.titleTop, hero: !!(it.h.title && it.h.title.size >= 44) }) : { page: it.v.key, width: it.v.vw, header: "none found" }, "text");
  const sizes = new Set(st.map((s) => s.values.titleSize).filter(Boolean));
  groups.push({ group: "9 · Public page headers", line: `${sizes.size} title sizes and ${new Set(st.map((s) => s.values.fromSheetTop)).size} distances from the top across ${new Set(st.map((s) => s.values.page)).size} public pages (${st.filter((s) => s.values.hero && s.values.width === 1512).length} hero pages at 1512).`, measure: "per public page and width: the title's size, face and weight, its header's distance from the sheet's top, and whether it is a hero (title 44px or larger)", styles: st });
}
/* 10 · hover and focus */
function diff(a, b) {
  if (!a || !b) return "not read";
  const ch = Object.keys(a).filter((k) => !["focused", "focusVisible"].includes(k) && a[k] !== b[k]).map((k) => `${k}: ${a[k]} → ${b[k]}`);
  return ch.length ? ch.join("; ") : "none";
}
{
  const items = [];
  for (const v of views) for (const h of v.hover || []) {
    const rec = v.records.find((r) => r.id === h.id);
    items.push({ v, rec, sel: rec ? rec.sel : h.id, text: rec ? rec.text : "", role: h.role, hover: diff(h.rest, h.hover), focus: h.focus && h.focus.focused ? diff(h.rest, h.focus) : "could not focus" });
  }
  const st = styles(items, (it) => [it.role, it.hover, it.focus], (it) => ({ role: it.role, hover: it.hover, focus: it.focus, hasHover: it.hover !== "none" && it.hover !== "not read", hasFocus: !/^(none|could not focus|not read)$/.test(it.focus) }), "state");
  const by = (role) => st.filter((s) => s.values.role.startsWith(role));
  const say = (role, name) => { const x = by(role); return `${name}: ${x.length} treatments (${x.filter((s) => !s.values.hasHover).length} with no hover change, ${x.filter((s) => !s.values.hasFocus).length} with no focus change)`; };
  groups.push({ group: "10 · Hover and focus", line: `${say("buttons/", "buttons")}; ${say("controls/", "fields")}; ${say("lists/", "rows")}.`, measure: "on the first instance of each distinct action button, field and list row per page: what changes on hover, and on keyboard focus (focus-visible), against rest", styles: st });
}

/* the crops: each style's example crop is copied to board/<group>--<role>--<style>.png beside the run's crops, and
   the data names that copy. A style with no crop says why. */
const BOARD = CROPS ? resolve(CROPS, "..", "board") : null;
if (BOARD) mkdirSync(BOARD, { recursive: true });
const names = []; let none = 0;
for (const g of groups) {
  const gn = g.group.split(" · ")[0].trim();
  const lists = g.roles ? g.roles.map((r) => [r.role.split("/")[1], r.styles]) : Object.entries(g).filter(([, x]) => Array.isArray(x) && x.length && x[0] && x[0].id).map(([k, x]) => [k, x]);
  for (const [sub, st] of lists) for (const s of st) {
    if (s.crop && BOARD && existsSync(resolve(CROPS, s.crop))) {
      const name = `g${gn}--${sub}--${s.id}.png`;
      copyFileSync(resolve(CROPS, s.crop), resolve(BOARD, name));
      s.crop = `board/${name}`; names.push(s.crop);
    } else { s.crop = null; s.noCrop = s.widths.includes(1512) ? "no element crop for this style (a gap, a page-level reading, or the crop cap was reached)" : "seen only at 1920 (crops are taken at 1512)"; none++; }
  }
}
const out = { generated: new Date().toISOString(), run: RUN.replace(/^\/Users\/[^/]+/, "~"), crops: { folder: "~/ScriptAlly-backups/consistency-audit-v2/board", count: names.length, stylesWithoutCrop: none, names: names.sort() }, groups };
writeFileSync(resolve(HERE, "board-data.json"), JSON.stringify(out, null, 1));
for (const g of groups) console.log(`${g.group}: ${g.line}`);
console.log(`crops copied and named: ${names.length}; styles without a crop: ${none}`);
