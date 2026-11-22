/*
 * Consistency fixes v1 — the rule probe. Runs in the page (page.evaluate) after the audit's collector.
 *
 * Lists every RENDERED instance of the four settled rules and the burgundy census:
 *   R1  text under 12px             (an element with its own text, computed font-size < 12)
 *   R2  filled primary buttons      (a dark filled button; more than one per view, or one that is not navy)
 *   R3  a blush-filled button
 *   R4  red text
 *   R5  burgundy / rust text        (#7c3a2a and its neighbours — report only)
 *
 * "A view" is the page, or each open dialog on top of it, judged separately (an element inside a dialog belongs to
 * the dialog's view; the page's view excludes every dialog).
 *
 * Each instance carries: its class chain, own text, the computed value, its rect, whether it sits inside artwork
 * (svg / img / canvas / a class naming art, illustration, illo, hero art) or inside a scaled-down copy of a component
 * (an ancestor with a transform scale < 1, or a class naming example / mini / preview / demo / thumb), and a
 * data-cf-id so the spec can crop it.
 */
(() => {
  const doc = document;
  doc.querySelectorAll("[data-cf-id]").forEach((e) => e.removeAttribute("data-cf-id"));
  const vis = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };
  const rgba = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hex = (c) => { const p = rgba(c); if (!p) return c; if (p.a === 0) return "transparent"; const h = "#" + [p.r, p.g, p.b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join(""); return p.a >= 0.999 ? h : `${h}/${Math.round(p.a * 100)}`; };
  const hsl = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return { h, s, l }; };
  const lab = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [R, G, B] = [f(r), f(g), f(b)]; let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883; const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); [x, y, z] = [g3(x), g3(y), g3(z)]; return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; };
  const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const lum = (c) => { const p = rgba(c); if (!p) return 1; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b); };
  const BURG = { r: 124, g: 58, b: 42 };
  const isBurgLike = (c) => { const x = hsl(c); return dE(c, BURG) < 3 || (x.h <= 30 && x.s >= 0.3 && x.l >= 0.18 && x.l <= 0.42 && dE(c, BURG) < 14); };
  const isRed = (c) => { const x = hsl(c); return (x.h <= 10 || x.h >= 345) && x.s >= 0.45 && x.l >= 0.25 && x.l <= 0.65 && dE(c, BURG) >= 3; };
  const isBlush = (c) => { const x = hsl(c); return (x.h <= 30 || x.h >= 340) && x.s >= 0.3 && x.l >= 0.82 && x.l <= 0.96; };
  const isNavy = (c) => { const x = hsl(c); return x.h >= 200 && x.h <= 235 && x.l <= 0.3; };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
  const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70);
  const chain = (el) => { const out = []; let e = el; for (let i = 0; e && e.nodeType === 1 && i < 6; i++) { const c = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(".") : (e.getAttribute && e.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 3).join("."); out.push(`${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${c ? "." + c : ""}`); e = e.parentElement; } return out; };
  const dialogs = [...doc.querySelectorAll("[role='dialog'], [aria-modal='true'], dialog[open]")].filter(vis);
  const viewOf = (el) => { const d = dialogs.find((x) => x.contains(el)); return d ? `dialog:${chain(d)[0]}` : "page"; };
  const inArt = (el) => !!el.closest("svg, picture, canvas, figure[class*='art'], [class*='illo'], [class*='illus'], [class*='-art'], [class*='art-'], [aria-hidden='true'][class*='hero']");
  const scaledCopy = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cls = typeof e.className === "string" ? e.className : "";
      if (/(^|[-_\s])(example|mini|preview|demo|thumb|sample-card|mock)([-_\s]|$)/i.test(cls)) return `class ${cls.split(/\s+/)[0]}`;
      const t = getComputedStyle(e).transform;
      const m = /matrix\(([^,]+),/.exec(t || "");
      if (m && Math.abs(+m[1]) < 0.98) return `transform scale ${(+m[1]).toFixed(2)} on ${chain(e)[0]}`;
      const z = parseFloat(getComputedStyle(e).zoom || "1");
      if (z && z < 0.98) return `zoom ${z} on ${chain(e)[0]}`;
    }
    return null;
  };
  let n = 0;
  const tag = (el) => { const id = `cf${++n}`; el.setAttribute("data-cf-id", id); return id; };
  const base = (el) => { const r = el.getBoundingClientRect(); return { id: tag(el), view: viewOf(el), chain: chain(el), text: text(el), rect: { x: Math.round(r.left), y: Math.round(r.top + (doc.querySelector("#app-stage-scroll")?.scrollTop || window.scrollY)), w: Math.round(r.width), h: Math.round(r.height) } }; };

  const els = [...doc.querySelectorAll("body *")].filter(vis);
  const out = { r1: [], r2: [], r3: [], r4: [], r5: [] };

  /* R1, R4, R5: every element with its own text */
  for (const el of els) {
    const t = ownText(el);
    if (!t) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const col = rgba(cs.color);
    if (fs < 12) out.r1.push({ ...base(el), fontSize: fs, inArt: inArt(el), scaledCopy: scaledCopy(el), own: t.slice(0, 50) });
    if (col && col.a > 0.15 && isRed(col)) out.r4.push({ ...base(el), color: hex(cs.color), own: t.slice(0, 50), inArt: inArt(el) });
    if (col && col.a > 0.15 && isBurgLike(col)) out.r5.push({ ...base(el), color: hex(cs.color), exact: dE(col, BURG) < 0.5, dE: Math.round(dE(col, BURG) * 10) / 10, tagName: el.tagName.toLowerCase(), fontSize: fs, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, isLink: !!el.closest("a"), inButton: !!el.closest("button, [role='button']"), inHeading: !!el.closest("h1,h2,h3,h4,h5,h6"), inArt: inArt(el), rotated: /matrix\((?!1, 0, 0, 1)/.test(getComputedStyle(el).transform || "") || false, own: t.slice(0, 50) });
  }

  /* R2, R3: buttons — the same "filled dark = primary" rule the audit used */
  const btns = els.filter((e) => e.matches("button, [role='button'], a.btn, a[class*='btn'], a[class*='button'], input[type='submit'], input[type='button']"));
  const views = {};
  for (const el of btns) {
    const cs = getComputedStyle(el);
    const bg = rgba(cs.backgroundColor);
    if (!bg || bg.a <= 0.5) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    const t = text(el);
    const iconOnly = !t && !!el.querySelector("svg, img");
    if (lum(cs.backgroundColor) < 0.08 && !iconOnly) {
      const rec = { ...base(el), bg: hex(cs.backgroundColor), color: hex(cs.color), navy: isNavy(bg), disabled: !!(el.disabled || el.getAttribute("aria-disabled") === "true"), inShell: !!(el.closest("#ws-sidebar, .ws-pagebar, .ws-bright, header.ws-pagebar") && !el.closest("#app-stage-scroll")), label: t.slice(0, 40), height: Math.round(r.height), radius: cs.borderTopLeftRadius };
      (views[rec.view] = views[rec.view] || []).push(rec);
    }
    if (isBlush(bg)) out.r3.push({ ...base(el), bg: hex(cs.backgroundColor), label: t.slice(0, 40) });
  }
  for (const [view, list] of Object.entries(views)) {
    const counted = list.filter((b) => !b.disabled && !b.inShell);
    for (const b of list) out.r2.push({ ...b, viewCount: counted.length, notNavy: !b.navy });
  }
  return { out, dialogs: dialogs.map((d) => chain(d)[0]) };
})();
