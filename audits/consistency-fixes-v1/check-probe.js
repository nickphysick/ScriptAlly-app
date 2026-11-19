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
    for (const el of els.slice(0, 40)) {
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
      list.push({ text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), fontSize: fs, box: box(r), lines, parent: p ? box(p.getBoundingClientRect()) : null, clipped, overlaps, bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow });
    }
    out[id] = list;
  }
  return out;
})();
