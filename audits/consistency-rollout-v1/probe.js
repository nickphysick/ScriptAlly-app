/*
 * Consistency fixes v1 — the per-fix check. Runs in the page with `window.__cfSelectors` set to { id: selector }.
 *
 * For every VISIBLE element each selector matches: its font-size, its box, its line count (height ÷ line-height),
 * its container's box (the parent element), whether it or a clipping ancestor (within 4 levels) is clipped
 * (scroll size > client size), and whether it overlaps a visible sibling. The spec writes the result; compare.mjs
 * diffs before against after.
 */
(() => {
  const sels = window.__cfSelectors || {};
  const vis = (el) => { if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1; };
  const box = (r) => ({ x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 });
  const out = {};
  for (const [id, sel] of Object.entries(sels)) {
    const list = [];
    let els = [];
    try { els = [...document.querySelectorAll(sel)].filter(vis); } catch { out[id] = { error: "bad selector" }; continue; }
    for (const el of els.slice(0, 60)) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const fs = parseFloat(cs.fontSize);
      const lh = cs.lineHeight === "normal" ? fs * 1.2 : parseFloat(cs.lineHeight);
      const lines = cs.display.includes("inline") && !cs.display.includes("block") ? Math.round(el.getClientRects().length) : Math.max(1, Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh));
      let clipped = null;
      for (let e = el, i = 0; e && i < 4; e = e.parentElement, i++) {
        const c = getComputedStyle(e);
        const hides = /hidden|clip/.test(c.overflowX + c.overflowY) || c.textOverflow === "ellipsis";
        if (hides && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) { clipped = `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} ${e.scrollWidth}x${e.scrollHeight} > ${e.clientWidth}x${e.clientHeight}`; break; }
      }
      const p = el.parentElement;
      const sib = p ? [...p.children].filter((s) => s !== el && vis(s)) : [];
      const overlaps = sib.filter((s) => { const q = s.getBoundingClientRect(); const ix = Math.min(r.right, q.right) - Math.max(r.left, q.left), iy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); return ix > 1 && iy > 1 && getComputedStyle(s).position !== "absolute" && cs.position !== "absolute"; }).map((s) => `${s.tagName.toLowerCase()}.${String(s.className).split(" ")[0]}`);
      list.push({ text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), fontSize: fs, family: cs.fontFamily.split(",")[0].replace(/["']/g, ""), weight: cs.fontWeight, lh: cs.lineHeight, radius: cs.borderTopLeftRadius, pad: cs.padding, border: cs.borderTopWidth + " " + cs.borderTopStyle + " " + cs.borderTopColor, pcolor: p ? getComputedStyle(p).color : null, box: box(r), lines, parent: p ? box(p.getBoundingClientRect()) : null, clipped, overlaps, bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow });
    }
    out[id] = list;
  }
  /* rollout v1: every visible text node or label saying late/overdue (Phase A1's rendered sweep) */
  const W = /\b(late|overdue)\b/i, hits = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!W.test(n.nodeValue)) continue;
    const el = n.parentElement; if (!el || !vis(el)) continue;
    hits.push({ text: n.nodeValue.replace(/\s+/g, " ").trim().slice(0, 120), cls: `${el.tagName.toLowerCase()}.${String(el.className).split(" ").join(".")}`.slice(0, 120) });
  }
  for (const el of document.querySelectorAll("[aria-label],[title],[data-tip]")) {
    const t = [el.getAttribute("aria-label"), el.getAttribute("title"), el.getAttribute("data-tip")].filter(Boolean).join(" | ");
    if (W.test(t) && vis(el)) hits.push({ text: t.slice(0, 120), cls: `attr ${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}` });
  }
  out.__late = hits;
  /* rollout v1: every visible element painting the old navy rgb(45, 58, 80) in any colour property (Phase 3's target) */
  const OLD = /rgba?\(45, 58, 80/, navy = {};
  for (const el of document.querySelectorAll("body *")) {
    const c = getComputedStyle(el);
    const props = ["color", "backgroundColor", "borderTopColor", "borderBottomColor", "outlineColor", "boxShadow", "backgroundImage", "fill", "stroke"].filter((k) => OLD.test(c[k]) && (k !== "borderTopColor" || parseFloat(c.borderTopWidth) > 0) && (k !== "borderBottomColor" || parseFloat(c.borderBottomWidth) > 0) && (k !== "outlineColor" || c.outlineStyle !== "none"));
    if (!props.length || !vis(el)) continue;
    const k = `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(" ").filter(Boolean).slice(0, 2).join(".")} [${props.join(",")}]`;
    navy[k] = (navy[k] || 0) + 1;
  }
  out.__navy = navy;
  /* rollout v1 (Phase 5/6): the header on screen — the navy workspace header, else a plain page header — with its
     title and the first visible element below it, and the margins that set the gap */
  const cn = (e) => `${e.tagName.toLowerCase()}.${String(e.className.baseVal ?? e.className).split(" ").filter(Boolean).join(".")}`.slice(0, 90);
  const hd = [...document.querySelectorAll(".qc1531-hd, header.sc-ttl, header.hc-top, .yn-hdw")].filter(vis)[0];
  if (hd) {
    /* v1-5: every scroller above the header back to its top first, so `top` is the header's distance from the sheet's
       top and not wherever the crops left the page */
    for (let e = hd.parentElement; e; e = e.parentElement) if (e.scrollTop) e.scrollTop = 0;
    const r = hd.getBoundingClientRect(), cs = getComputedStyle(hd);
    const t = hd.querySelector("h1") || null, tr = t && t.getBoundingClientRect();
    const sheet = hd.closest(".ws-window") || document.querySelector(".ws-window");
    const els = [...(hd.closest(".wpg-scroll, .ws-wbody, main") || document.body).querySelectorAll("*")].filter((e) => !hd.contains(e) && !e.contains(hd) && vis(e));
    const below = els.filter((e) => e.getBoundingClientRect().top >= r.bottom - 1 && e.getBoundingClientRect().height > 8).sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top)[0];
    const bcs = below && getComputedStyle(below);
    /* rollout v1-5 (Phase 5): the first PAINTED element below the header — text, a fill, an edge, a shadow or an image —
       not an empty wrapper, so the gap is the one the eye reads */
    const paints = (e) => { const c = getComputedStyle(e); return (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent") || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0 || /^(IMG|SVG|CANVAS|svg)$/.test(e.tagName) || [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()); };
    const content = els.filter((e) => e.getBoundingClientRect().top >= r.bottom - 1 && paints(e)).sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top)[0];
    out.__hdr = { hd: cn(hd), parent: cn(hd.parentElement), h: Math.round(r.height * 10) / 10,
      content: content ? { cls: cn(content), text: (content.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40), gap: Math.round((content.getBoundingClientRect().top - r.bottom) * 10) / 10, w: Math.round(content.getBoundingClientRect().width) } : null, top: Math.round((r.top - (sheet ? sheet.getBoundingClientRect().top : 0)) * 10) / 10, bottom: Math.round(r.bottom * 10) / 10, pt: cs.paddingTop, mb: cs.marginBottom, mt: cs.marginTop, display: getComputedStyle(hd.parentElement).display,
      title: t ? { cls: cn(t), top: Math.round((tr.top - r.top) * 10) / 10, font: getComputedStyle(t).font.slice(0, 80), mt: getComputedStyle(t).marginTop, prev: t.previousElementSibling ? cn(t.previousElementSibling) : null, parent: cn(t.parentElement) } : null,
      below: below ? { cls: cn(below), parent: cn(below.parentElement), gap: Math.round((below.getBoundingClientRect().top - r.bottom) * 10) / 10, mt: bcs.marginTop, pt: getComputedStyle(below.parentElement).paddingTop } : null };
  }
  /* rollout v1 (Phases 7–12): inventories. Each lists visible elements with what the phase reads. */
  const st = (e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { cls: cn(e), text: (e.innerText || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, x: Math.round(r.left), y: Math.round(r.top), fam: c.fontFamily.split(",")[0].replace(/["']/g, ""), fs: c.fontSize, fw: c.fontWeight, lh: c.lineHeight, rad: c.borderTopLeftRadius, pad: c.padding, bg: c.backgroundColor, sh: c.boxShadow.slice(0, 120), bd: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, col: c.color,
    ctx: e.closest("[role=dialog], aside, .qc152, footer, header, .qc1531-hd") ? cn(e.closest("[role=dialog], aside, .qc152, footer, header, .qc1531-hd")).slice(0, 50) : "" }; };
  const V = (q) => [...document.querySelectorAll(q)].filter(vis);
  out.__heads = V("h2, h3, h4, h5, [role=heading]").slice(0, 80).map(st);
  out.__btns = V("button, a[role=button], a.btn, a[class*=btn]").filter((e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return r.height >= 28 && r.width >= 60 && (e.innerText || "").trim() && (c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0); }).slice(0, 80).map(st);
  out.__fields = V("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]), select, textarea, [contenteditable=true]").slice(0, 60).map(st);
  out.__close = V("[role=dialog] button, aside button, .qad button, [class*=drawer] button, [class*=panel] button").filter((e) => /close|×|✕/i.test(`${e.getAttribute("aria-label") || ""} ${e.innerText || ""}`) && e.getBoundingClientRect().width <= 48).slice(0, 20).map(st);
  out.__foot = V("[role=dialog] footer, aside footer, [class*=foot]").filter((e) => e.closest("[role=dialog], aside, [class*=drawer]")).slice(0, 12).map(st);
  out.__cards = V("body *").filter((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width >= 160 && r.height >= 80 && /255, 255, 255/.test(c.backgroundColor) && parseFloat(c.borderTopLeftRadius) >= 14 && c.boxShadow !== "none" && e.firstElementChild && parseFloat(getComputedStyle(e.firstElementChild).borderTopLeftRadius) >= 8 && (getComputedStyle(e.firstElementChild).boxShadow !== "none" || parseFloat(getComputedStyle(e.firstElementChild).borderTopWidth) > 0); }).slice(0, 40).map((e) => ({ ...st(e), inner: st(e.firstElementChild) }));
  out.__switch = V("[role=tablist], [class*=seg], [class*=switch], [class*=toggle]").filter((e) => e.children.length >= 2 && e.children.length <= 5).slice(0, 12).map((e) => ({ ...st(e), kids: [...e.children].slice(0, 4).map(st) }));
  return out;
})();
