/**
 * Main green v1, Part 3 — the spacing and list-row probe (reads only).
 *
 * Evaluated on the page by audit2.measure.ts when CA_SR=1, at every width, after collect2.js has tagged the page's
 * elements (`data-ca2`) and the harness has put `window.__ca2Recs` = [{ id, role, sel }] (the collector's records).
 * It never changes the page except to add a `data-casr` tag to the elements it reports, so the harness can look up the
 * CSS rule behind a value (CDP) and crop an example.
 *
 * Every block it measures is one the collector already classified — section headings, framed cards, card headings,
 * list rows, panels, fields — so a gap is between two things of a known kind, never between parts of one block.
 *
 * Returns { spacing: Item[], rows: Row[], headers: Header[] }, where an Item is
 *   { group, scope, value (number or "t r b l"), a, b, src: [{ tag, prop }], ct: [tags to crop], ck: crop key }.
 */
(() => {
  document.querySelectorAll("[data-casr]").forEach((e) => e.removeAttribute("data-casr"));
  const R = (window.__ca2Recs || []).map((r) => ({ ...r, el: document.querySelector(`[data-ca2="${r.id}"]`) })).filter((r) => r.el);
  const role = (re) => R.filter((r) => re.test(r.role));
  let n = 0;
  const tag = (el) => { if (!el.getAttribute("data-casr")) el.setAttribute("data-casr", `s${++n}`); return el.getAttribute("data-casr"); };
  const px = (v) => Math.round((parseFloat(v) || 0) * 10) / 10;
  const rc = (el) => el.getBoundingClientRect();
  const cs = (el) => getComputedStyle(el);
  const vis = (el) => { const r = rc(el), c = cs(el); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && +c.opacity !== 0; };
  const sel = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "");
  const pad = (c) => [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(px).join(" ");
  const xOverlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 * Math.min(a.width, b.width);
  const panelOf = (el) => el.closest("[role='dialog'], [aria-modal='true'], dialog[open]");
  const scopeOf = (el) => (panelOf(el) ? "panel" : "page");
  const common = (a, b) => { let x = a; while (x && !x.contains(b)) x = x.parentElement; return x; };
  const font = (el) => { const c = cs(el); return { font: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), size: px(c.fontSize), weight: c.fontWeight, color: c.color, lh: c.lineHeight }; };

  /* what sets a vertical gap between two blocks: the common container's row gap, else the margins on the way up */
  function gapSrc(prev, next, axis = "y") {
    const ca = common(prev, next); const out = [];
    if (ca) {
      const c = cs(ca);
      const g = axis === "y" ? px(c.rowGap) : px(c.columnGap);
      if (g > 0 && /flex|grid/.test(c.display)) out.push({ tag: tag(ca), prop: axis === "y" ? "row-gap" : "column-gap", v: g });
    }
    const [mA, mB] = axis === "y" ? ["marginBottom", "marginTop"] : ["marginRight", "marginLeft"];
    const [pA, pB] = axis === "y" ? ["margin-bottom", "margin-top"] : ["margin-right", "margin-left"];
    for (let x = prev; x && x !== ca; x = x.parentElement) { const v = px(cs(x)[mA]); if (v) out.push({ tag: tag(x), prop: pA, v }); }
    for (let x = next; x && x !== ca; x = x.parentElement) { const v = px(cs(x)[mB]); if (v) out.push({ tag: tag(x), prop: pB, v }); }
    if (!out.length && ca) out.push({ tag: tag(ca), prop: "(unattributed)", v: null });
    return out;
  }
  const between = (a, b, skip) => {
    /* a classified element (not a surface, not inside either block) lying between a's bottom and b's top in their column */
    const ra = rc(a), rb = rc(b);
    return R.some((r) => { if (/^surfaces\//.test(r.role) || skip.some((s) => s.contains(r.el) || r.el.contains(s))) return false; const x = rc(r.el); return x.height > 0 && x.top >= ra.bottom - 0.5 && x.bottom <= rb.top + 0.5 && xOverlap(x, ra); });
  };

  const spacing = [];
  const item = (o) => { spacing.push(o); return o; };

  /* ── 1. section to section, in a page's main column (and a panel's body) ── */
  const heads = role(/^headings\/section$/).map((r) => r.el).filter(vis);
  const framed = role(/^cards\/framed$/).map((r) => r.el).filter(vis);
  const blockOf = (el, markers) => { let b = el; while (b.parentElement && b.parentElement !== document.body) { const p = b.parentElement; if (markers.some((m) => m !== el && !el.contains(m) && p.contains(m))) break; if (/^(MAIN|BODY)$/.test(p.tagName) || p.matches("[data-ca2]") && R.some((r) => r.el === p && /^surfaces\//.test(r.role))) break; b = p; } return b; };
  const hb0 = heads.map((h) => blockOf(h, heads));
  const lone = framed.filter((f) => !hb0.some((b) => b.contains(f)) && !heads.some((h) => f.contains(h)));
  const markers = [...heads, ...lone];
  const blocks = [...new Set(markers.map((m) => blockOf(m, markers)))].filter(vis);
  /* each block's gap is measured from the LOWEST block above it that shares its column, so a short column beside a
     taller one is not read as a gap */
  for (const below of blocks) {
    const rb = rc(below);
    const above = blocks.filter((a) => a !== below && !a.contains(below) && !below.contains(a) && scopeOf(a) === scopeOf(below) && rc(a).bottom <= rb.top + 1 && xOverlap(rc(a), rb)).sort((x, y) => rc(y).bottom - rc(x).bottom)[0];
    if (!above) continue;
    if (between(above, below, [above, below])) continue;
    const v = Math.round(rb.top - rc(above).bottom);
    item({ group: "section-gap", scope: scopeOf(below), value: v, a: sel(above), b: sel(below), src: gapSrc(above, below), ct: [tag(above), tag(below)], ck: `section-gap|${v}` });
  }

  /* ── 2 and 5. a heading to the first thing under it (section headings; card headings inside their card) ── */
  const nextAfter = (h, stop) => { let n = h; while (n && n !== stop && n !== document.body) { let s = n.nextElementSibling; while (s && !vis(s)) s = s.nextElementSibling; if (s) return [n, s]; n = n.parentElement; } return [null, null]; };
  const recEls = new Set(R.filter((r) => !/^surfaces\//.test(r.role)).map((r) => r.el));
  const ownText = (e) => [...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim());
  /* a short text line in a smaller size straight after the heading is its subtitle, part of the heading */
  const isSubtitle = (e, h) => /^(P|SPAN|SMALL|DIV)$/.test(e.tagName) && ![...e.querySelectorAll("*")].some((c) => /^(DIV|P|UL|OL|SECTION|BUTTON|INPUT|TABLE|IMG|SVG)$/i.test(c.tagName)) && px(cs(e).fontSize) < px(cs(h).fontSize) && rc(e).height <= 3 * (parseFloat(cs(e).lineHeight) || px(cs(e).fontSize) * 1.5) + 2;
  const firstContent = (e) => { if (recEls.has(e) && e.childElementCount === 0 || ownText(e) || /^(IMG|SVG|INPUT|TEXTAREA|SELECT|BUTTON|CANVAS)$/i.test(e.tagName)) return e; for (const c of e.children) { if (!vis(c)) continue; const f = firstContent(c); if (f) return f; } return recEls.has(e) ? e : null; };
  const headGap = (group, h, stop) => {
    let [line, next] = nextAfter(h, stop); if (!next) return;
    let subtitle = null;
    if (line === h && isSubtitle(next, h)) { subtitle = { sel: sel(next), gap: Math.round(rc(next).top - rc(h).bottom) }; const after = nextAfter(next, stop); if (!after[1]) return; line = next; next = after[1]; }
    const rl = rc(line), rn = rc(next);
    if (rn.top < rl.bottom - 1 || !xOverlap(rl, rn) && rn.left > rl.right) return;
    const target = firstContent(next) || next;
    const v = Math.round(rc(target).top - rl.bottom);
    const src = gapSrc(line, next);
    for (let x = target; x && x !== next.parentElement; x = x.parentElement) { const c = cs(x); if (px(c.paddingTop)) src.push({ tag: tag(x), prop: "padding-top", v: px(c.paddingTop) }); if (px(c.borderTopWidth)) src.push({ tag: tag(x), prop: "border-top", v: px(c.borderTopWidth) }); if (x !== target && px(c.marginTop) && x !== next) src.push({ tag: tag(x), prop: "margin-top", v: px(c.marginTop) }); }
    item({ group, scope: scopeOf(h), value: v, boxGap: Math.round(rn.top - rl.bottom), subtitle, a: sel(h), line: sel(line), b: sel(next), first: sel(target), src: src.filter((s) => s.prop !== "(unattributed)" || src.length === 1), ct: [tag(line), tag(target)], ck: `${group}|${v}` });
  };
  for (const h of heads) headGap("section-heading-gap", h, blockOf(h, markers).parentElement);
  const cardRoles = /^cards\/(framed|framed-inner|plain-card|stat-tile|journey-card|note|query-card|band)$/;
  const cardEls = role(cardRoles).map((r) => r.el).filter(vis);
  for (const h of role(/^headings\/card$/).map((r) => r.el).filter(vis)) {
    const card = cardEls.filter((c) => c.contains(h)).sort((x, y) => rc(x).height - rc(y).height)[0];
    headGap("card-heading-gap", h, card || h.parentElement);
  }

  /* ── 3. card to card in one grid or stack ── */
  const units = new Map();
  for (const c of role(/^cards\/(framed|plain-card|stat-tile|journey-card|note)$/).map((r) => r.el).filter(vis)) {
    let u = c; while (u.parentElement && [...u.parentElement.children].filter(vis).length === 1 && u.parentElement !== document.body) u = u.parentElement;
    const p = u.parentElement; if (!p) continue;
    if (!units.has(p)) units.set(p, new Set()); units.get(p).add(u);
  }
  for (const [p, set] of units) {
    const us = [...set]; if (us.length < 2) continue;
    for (const a of us) {
      const ra = rc(a);
      const right = us.filter((b) => b !== a && Math.abs(rc(b).top - ra.top) <= 4 && rc(b).left >= ra.right - 1).sort((x, y) => rc(x).left - rc(y).left)[0];
      if (right) { const v = Math.round(rc(right).left - ra.right); item({ group: "card-gap", axis: "across", scope: scopeOf(a), value: v, a: sel(a), b: sel(right), grid: sel(p), src: gapSrc(a, right, "x"), ct: [tag(a), tag(right)], ck: `card-gap|across|${v}` }); }
      const down = us.filter((b) => b !== a && rc(b).top >= ra.bottom - 1 && xOverlap(rc(b), ra)).sort((x, y) => rc(x).top - rc(y).top)[0];
      if (down) { const v = Math.round(rc(down).top - ra.bottom); item({ group: "card-gap", axis: "down", scope: scopeOf(a), value: v, a: sel(a), b: sel(down), grid: sel(p), src: gapSrc(a, down), ct: [tag(a), tag(down)], ck: `card-gap|down|${v}` }); }
    }
  }

  /* ── 4. inside a framed card's inner frame ── */
  /* value = the visual inset from the frame's inner edge to the content box of what it holds (the union of its visible
     children), because a frame with no padding of its own is often inset by its first child's; cssPadding is the frame's own */
  for (const f of role(/^cards\/framed-inner$/).map((r) => r.el).filter(vis)) {
    const c = cs(f), rf = rc(f);
    const kids = [...f.children].filter(vis); if (!kids.length) continue;
    const content = (k) => { const r = rc(k), kc = cs(k); return { top: r.top + px(kc.paddingTop) + px(kc.borderTopWidth), left: r.left + px(kc.paddingLeft) + px(kc.borderLeftWidth), right: r.right - px(kc.paddingRight) - px(kc.borderRightWidth), bottom: r.bottom - px(kc.paddingBottom) - px(kc.borderBottomWidth) }; };
    /* one child: its content box against the frame. Several (a band heading the frame, then its body): the BODY — the
       largest child — its content box against the frame at the sides and bottom, and its own top padding under the band */
    const bw = (s) => px(c[`border${s}Width`]);
    const body = kids.length === 1 ? kids[0] : kids.slice().sort((x, y) => rc(y).width * rc(y).height - rc(x).width * rc(x).height)[0];
    const u = content(body), rb = rc(body);
    const topInset = kids.length === 1 || body === kids[0] ? u.top - rf.top - bw("Top") : u.top - rb.top;
    const v = [topInset, rf.right - u.right - bw("Right"), rf.bottom - u.bottom - bw("Bottom"), u.left - rf.left - bw("Left")].map((x) => Math.round(x)).join(" ");
    const src = ["padding-top", "padding-right", "padding-bottom", "padding-left"].map((prop) => ({ tag: tag(f), prop }));
    for (const prop of ["padding-top", "padding-right", "padding-bottom", "padding-left"]) src.push({ tag: tag(body), prop });
    const band = kids.length > 1 && body !== kids[0] ? sel(kids[0]) : null;
    item({ group: "framed-inner-padding", scope: scopeOf(f), value: v, cssPadding: pad(c), a: sel(f), b: sel(body), band, src, ct: [tag(f)], ck: `framed-inner-padding|${v}` });
  }

  /* ── 6. a slide-out panel's body padding, and field to field in it ── */
  for (const shell of role(/^panels\/shell$/).map((r) => r.el).filter(vis)) {
    const scrollers = [shell, ...shell.querySelectorAll("*")].filter((e) => vis(e) && /(auto|scroll)/.test(cs(e).overflowY) && e.scrollHeight > 0 && rc(e).height > 120).sort((x, y) => rc(y).width * rc(y).height - rc(x).width * rc(x).height);
    const body = scrollers[0] || shell;
    let padEl = body; if (pad(cs(body)) === "0 0 0 0" && body.firstElementChild && vis(body.firstElementChild)) padEl = body.firstElementChild;
    const v = pad(cs(padEl));
    item({ group: "panel-body-padding", scope: "panel", value: v, a: sel(padEl), panel: sel(shell), src: ["padding-top", "padding-right", "padding-bottom", "padding-left"].map((prop) => ({ tag: tag(padEl), prop })), ct: [tag(padEl)], ck: `panel-body-padding|${v}` });
    const controls = R.filter((r) => /^controls\/(text-field|textarea|select|bare-input|headline-field|search-field)$/.test(r.role) && shell.contains(r.el) && vis(r.el)).map((r) => r.el);
    const fields = [];
    for (const c of controls) {
      const input = c.matches("input, textarea, select") ? c : c.querySelector("input, textarea, select") || c;
      let label = (input.labels && input.labels[0]) || c.closest("label");
      if (!label || !vis(label)) {
        /* the nearest label-ish element just above the control in the same column */
        const rcC = rc(c);
        label = [...shell.querySelectorAll("label, legend, [class*='lab'], [class*='lbl']")].filter((l) => vis(l) && !l.contains(c) && rc(l).bottom <= rcC.top + 1 && rcC.top - rc(l).bottom <= 24 && xOverlap(rc(l), rcC)).sort((x, y) => rc(y).bottom - rc(x).bottom)[0] || null;
      }
      if (!label) continue;
      const field = common(label, c);
      if (!field || field === shell) continue;
      fields.push({ field: label.contains(c) ? label : field, label, control: c });
    }
    fields.sort((x, y) => rc(x.label).top - rc(y.label).top);
    for (let i = 0; i + 1 < fields.length; i++) {
      const A = fields[i], B = fields[i + 1];
      if (!xOverlap(rc(A.control), rc(B.control)) || rc(B.label).top < rc(A.control).bottom - 1) continue;
      const v = Math.round(rc(B.label).top - rc(A.control).bottom);
      const pitch = Math.round(rc(B.label).top - rc(A.label).top);
      item({ group: "panel-field-gap", scope: "panel", value: v, pitch, a: sel(A.label), b: sel(B.label), panel: sel(shell), src: gapSrc(A.field, B.field), ct: [tag(A.field), tag(B.field)], ck: `panel-field-gap|${v}` });
    }
  }

  /* ── 7. the page's gutters ── */
  const stage = role(/^surfaces\/stage$/).map((r) => r.el).filter(vis)[0];
  const sheet = role(/^surfaces\/sheet$/).map((r) => r.el).filter(vis)[0];
  /* the gutter: the sheet's edge to the outermost edges of the page's own content (headings, cards, lists, text),
     below the navy header; the elements that hold those edges are named so their padding can be traced */
  if (stage) {
    const rh = sheet ? rc(sheet) : rc(stage);
    const content = R.filter((r) => /^(headings|cards|lists|text|controls|nav)\//.test(r.role) && stage.contains(r.el) && !panelOf(r.el) && vis(r.el) && !r.el.closest("header, [class*='wsnh'], [class*='navy']")).map((r) => r.el).filter((e) => { const x = rc(e); return x.width > 40 && x.right > rh.left && x.left < rh.right; });
    if (content.length) {
      const leftEl = content.slice().sort((x, y) => rc(x).left - rc(y).left)[0], rightEl = content.slice().sort((x, y) => rc(y).right - rc(x).right)[0];
      const L = Math.round(rc(leftEl).left - rh.left), Rr = Math.round(rh.right - rc(rightEl).right);
      const chain = (e) => { const out = []; for (let x = e; x && x !== (sheet || stage).parentElement; x = x.parentElement) { const c = cs(x); if (px(c.paddingLeft) || px(c.paddingRight) || px(c.marginLeft) || px(c.marginRight)) out.push(x); } return out; };
      const src = [...chain(leftEl).flatMap((x) => [px(cs(x).paddingLeft) ? { tag: tag(x), prop: "padding-left" } : null, px(cs(x).marginLeft) ? { tag: tag(x), prop: "margin-left" } : null]), ...chain(rightEl).flatMap((x) => [px(cs(x).paddingRight) ? { tag: tag(x), prop: "padding-right" } : null, px(cs(x).marginRight) ? { tag: tag(x), prop: "margin-right" } : null])].filter(Boolean);
      item({ group: "page-gutter", scope: "page", value: `${L} ${Rr}`, left: L, right: Rr, a: sel(leftEl), b: sel(rightEl), sheet: sheet ? sel(sheet) : sel(stage), sheetWidth: Math.round(rh.width), src, ct: [tag(sheet || stage)], ck: `page-gutter|${L} ${Rr}|${innerWidth}` });
    }
  }

  /* ── list rows ── */
  const SELECTED = /(^|[\s_-])(on|sel|selected|active|is-active|current|is-current|picked|chosen)($|[\s_-])/;
  const rowRecs = role(/^(lists\/(list-row|list-item|table-row)|cards\/query-card)$/).filter((r) => vis(r.el));
  const marks = R.filter((r) => /^(marks|buttons)\//.test(r.role)).map((r) => r.el);
  const rowEls = new Set(rowRecs.map((r) => r.el));
  const leaves = (row) => [...row.querySelectorAll("*")].filter((e) => vis(e) && [...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim()) && !marks.some((m) => m !== row && m.contains(e)));
  const rows = [];
  for (const r of rowRecs) {
    const el = r.el, c = cs(el), b = rc(el);
    let nx = el.nextElementSibling; while (nx && !vis(nx)) nx = nx.nextElementSibling;
    const gapNext = nx && rowEls.has(nx) ? Math.round(rc(nx).top - b.bottom) : null;
    const bt = px(c.borderTopWidth), bb = px(c.borderBottomWidth);
    const after = getComputedStyle(el, "::after"), before = getComputedStyle(el, "::before");
    const pseudoRule = [after, before].some((p) => p.content !== "none" && (px(p.height) > 0 && px(p.height) <= 2 || px(p.borderTopWidth) > 0 || px(p.borderBottomWidth) > 0));
    const insetLine = /inset/.test(c.boxShadow) && /0px -?1px 0px 0px/.test(c.boxShadow);
    const divider = bb > 0 ? `border-bottom ${bb}px ${c.borderBottomColor}` : bt > 0 ? `border-top ${bt}px ${c.borderTopColor}` : pseudoRule ? "pseudo-element rule" : insetLine ? `inset line ${c.boxShadow}` : gapNext > 0 ? `gap ${gapNext}` : gapNext === 0 ? "nothing" : null; /* null: the last row, separator read from its siblings */
    const ls = leaves(el);
    const fonts = ls.map((e) => ({ e, f: font(e) }));
    /* Primary is the first WORDS in reading order, secondary the next words in another face. Not words:
       text without two letters together (a star rating), one to three capitals (an avatar's initials),
       and text on its own filled ground inside the row (a chip, a pill, an avatar disc). Hand check,
       main-green v1: the largest-font rule read the Contact list's stars as its primary type and the
       Record a response picker's avatar initials as its secondary. */
    const ownText = (e) => [...e.childNodes].filter((t) => t.nodeType === 3).map((t) => t.textContent).join("").trim();
    const onFill = (e) => { for (let n = e; n && n !== el; n = n.parentElement) { const s = cs(n); if ((s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") || s.backgroundImage !== "none") return true; } return false; };
    const words = fonts.filter((x) => { const t = ownText(x.e); return /\p{L}{2}/u.test(t) && !/^\p{Lu}{1,3}$/u.test(t) && !onFill(x.e); });
    const primary = words[0] || fonts.slice().sort((x, y) => y.f.size - x.f.size || +y.f.weight - +x.f.weight)[0];
    const pk = primary ? JSON.stringify(primary.f) : null;
    const sec = words.find((x) => JSON.stringify(x.f) !== pk);
    const secondary = sec ? [JSON.stringify(sec.f)] : null;
    const selected = el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-current") || el.getAttribute("aria-pressed") === "true" || SELECTED.test(typeof el.className === "string" ? el.className : "");
    const style = { height: px(b.height), minHeight: c.minHeight, padding: pad(c), bg: c.backgroundColor, bgImage: c.backgroundImage === "none" ? null : c.backgroundImage.slice(0, 80), radius: c.borderRadius, divider: divider && divider.replace(/^gap \d+$/, "gap"), primary: primary ? primary.f : null, secondary: secondary ? JSON.parse(secondary[0]) : null };
    rows.push({ id: r.id, role: r.role, sel: r.sel, scope: scopeOf(el), list: sel(el.parentElement), selected: !!selected, gapNext, divider, style, text: (el.textContent || "").trim().slice(0, 60), tag: tag(el) });
  }
  const headers = role(/^lists\/(group-header|column-header|table-head)$/).filter((r) => vis(r.el)).map((r) => { const c = cs(r.el); const f = leaves(r.el)[0]; return { id: r.id, role: r.role, sel: r.sel, scope: scopeOf(r.el), height: px(rc(r.el).height), padding: pad(c), bg: c.backgroundColor, border: `${px(c.borderBottomWidth)} ${c.borderBottomColor}`, type: f ? font(f) : font(r.el), text: (r.el.textContent || "").trim().slice(0, 40), tag: tag(r.el) }; });
  return { vw: innerWidth, vh: innerHeight, spacing, rows, headers };
})()
