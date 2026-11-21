/*
 * Consistency audit v2 — the in-page collector. Runs inside the page (page.evaluate) with the role map set on
 * window.__ca2Roles (audits/consistency-v2/roles.json) before it.
 *
 * v1 guessed each element's role from how it looked (a dark fill was a "primary" button, so a selected filter pill
 * or a to-do row counted as a button). v2 finds CANDIDATES by what an element is (clickable, a control, a row, a
 * small mark, an edged or filled box, a heading) and gives each the first role in the map whose class selector or
 * named test it passes. A candidate nothing claims is returned in `unclassified` with its selector — never grouped.
 * Variants (filled / outline / text, selected / rest) are measured inside a role.
 *
 * It also returns the facts the rules check reads (`facts`): small text, the colour census with examples, words,
 * the page ground and the header metrics. Every value is getComputedStyle / getBoundingClientRect of a drawn box.
 *
 * ⚠️ Every workspace page stays mounted (display-toggled): checkVisibility() drops hidden pages' elements.
 */
(() => {
  const ROLES = (window.__ca2Roles && window.__ca2Roles.roles) || [];
  const MAX_PER_ROLE = 400;
  const vw = window.innerWidth, vh = window.innerHeight, doc = document;
  doc.querySelectorAll("[data-ca2]").forEach((e) => e.removeAttribute("data-ca2"));

  /* ── helpers ─────────────────────────────────────────────────────────────────────────────────── */
  const vis = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };
  const rgba = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");
  const colour = (c) => { const p = rgba(c); if (!p) return c || ""; if (p.a === 0) return "transparent"; const h = `#${hex2(p.r)}${hex2(p.g)}${hex2(p.b)}`; return p.a >= 0.999 ? h : `${h}/${Math.round(p.a * 100)}`; };
  const lum = (c) => { const p = rgba(c); if (!p) return 1; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b); };
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : v; };
  const opaque = (cs) => { const p = rgba(cs.backgroundColor); return (p && p.a > 0.05) || (cs.backgroundImage && /gradient/.test(cs.backgroundImage)); };
  const bgOf = (el) => {
    let e = el, own = true;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e); const p = rgba(cs.backgroundColor);
      if (p && p.a > 0.05) return { bg: colour(cs.backgroundColor), bgFrom: own ? "own" : "behind" };
      if (own && /gradient/.test(cs.backgroundImage || "")) return { bg: "gradient", bgFrom: "own" };
      e = e.parentElement; own = false;
    }
    return { bg: colour(getComputedStyle(doc.body).backgroundColor), bgFrom: "body" };
  };
  const border = (cs) => {
    const s = ["Top", "Right", "Bottom", "Left"].map((k) => {
      const w = parseFloat(cs[`border${k}Width`]) || 0, st = cs[`border${k}Style`];
      if (!w || st === "none" || st === "hidden") return "none";
      const c = colour(cs[`border${k}Color`]); if (c === "transparent") return "none";
      return `${px(cs[`border${k}Width`])}px ${st} ${c}`;
    });
    return s.every((x) => x === s[0]) ? s[0] : s.join(" | ");
  };
  const radius = (cs) => { const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px); return r.every((x) => x === r[0]) ? `${r[0]}` : r.join(" "); };
  const pad = (cs) => [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).join(" ");
  const shadow = (cs) => (cs.boxShadow === "none" ? "none" : cs.boxShadow.replace(/rgba?\([^)]+\)/g, (m) => colour(m)));
  const fam = (cs) => (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim();
  const typeSig = (cs) => ({ font: fam(cs), size: px(cs.fontSize), weight: cs.fontWeight, lh: cs.lineHeight === "normal" ? "normal" : px(cs.lineHeight), ls: cs.letterSpacing === "normal" ? "normal" : px(cs.letterSpacing), tt: cs.textTransform === "none" ? "" : cs.textTransform, color: colour(cs.color) });
  const boxSig = (el, cs, withW) => { const r = el.getBoundingClientRect(); const b = bgOf(el); return { bg: b.bg, bgFrom: b.bgFrom, border: border(cs), radius: radius(cs), shadow: shadow(cs), padding: pad(cs), height: px(r.height), ...(withW ? { width: px(r.width) } : {}) }; };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
  const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const clsStr = (e) => (typeof e.className === "string" ? e.className : (e.getAttribute && e.getAttribute("class")) || "");
  const one = (e) => { const c = clsStr(e).trim().split(/\s+/).filter(Boolean).slice(0, 4).join("."); return `${e.tagName.toLowerCase()}${c ? "." + c : ""}`; };
  const chain = (el) => { const out = []; let e = el; for (let i = 0; e && e.nodeType === 1 && i < 5; i++) { out.push(one(e)); e = e.parentElement; } return out; };
  /* a selector a person can paste into devtools: the element's own classes, and its parent's when it has none */
  const selector = (el) => {
    const own = one(el);
    if (/\./.test(own)) return own;
    let a = el.parentElement;
    for (let i = 0; a && i < 4; i++, a = a.parentElement) if (/\./.test(one(a))) return `${one(a)}${i === 0 ? " >" : ""} ${own}`;
    return el.parentElement ? `${one(el.parentElement)} > ${own}` : own;
  };
  const safeMatch = (el, sel) => { try { return el.matches(sel); } catch { return false; } };
  const safeClosest = (el, sel) => { try { return el.closest(sel); } catch { return null; } };

  /* ── scopes ──────────────────────────────────────────────────────────────────────────────────── */
  const sidebar = doc.querySelector("#ws-sidebar");
  const dialogs = [...doc.querySelectorAll(`[role='dialog'], [aria-modal='true'], dialog[open]${window.__ca2ExtraDialog || ""}`)].filter(vis);
  const dialogOf = (el) => dialogs.find((d) => d.contains(el)) || null;
  const stage = [...doc.querySelectorAll("#app-stage-scroll")].filter(vis)[0] || null;
  const pageRoot = stage || [...doc.querySelectorAll(".mk-sheet, main, .sf-sheet, .au-shell, [class*='auth']")].filter(vis).sort((a, b) => b.getBoundingClientRect().height * b.getBoundingClientRect().width - a.getBoundingClientRect().height * a.getBoundingClientRect().width)[0] || doc.body;
  const inShell = (el) => !!(sidebar && sidebar.contains(el)) || (stage ? !stage.contains(el) && !dialogOf(el) : false);
  const pr = pageRoot.getBoundingClientRect();
  const scrollY = stage ? stage.scrollTop : window.scrollY;
  const rel = (r) => ({ x: px(r.left - pr.left), y: px(r.top - pr.top + scrollY), w: px(r.width), h: px(r.height) });
  const all = [...doc.querySelectorAll("body *")];
  const els = all.filter(vis);

  /* ── the page header (as v1: a navy box near the sheet's top, else the h1's block) ─────────────── */
  let sheet = [...doc.querySelectorAll(".ws-window, .mk-sheet")].filter(vis)[0] || null;
  const pageEls = els.filter((el) => pageRoot.contains(el) && el !== pageRoot && !dialogOf(el));
  if (!sheet) sheet = pageEls.find((el) => { const r = el.getBoundingClientRect(); return opaque(getComputedStyle(el)) && r.width >= pr.width * 0.6 && r.height >= vh * 0.5; }) || null;
  const sheetRect = (sheet || pageRoot).getBoundingClientRect();
  const isNavy = (cs) => { const p = rgba(cs.backgroundColor); return p && p.a > 0.5 && lum(cs.backgroundColor) < 0.06 && p.b >= p.r; };
  let header = pageEls.find((el) => { const r = el.getBoundingClientRect(); return isNavy(getComputedStyle(el)) && r.width >= Math.min(500, pr.width * 0.5) && r.top - sheetRect.top < 260 && r.height >= 60 && r.height <= Math.min(560, vh * 0.7) && !(sheet && el.contains(sheet)); });
  const headerKind = header ? "navy" : "plain";
  const navyHeader = header || null;
  const h1s = pageEls.filter((e) => e.tagName === "H1");
  if (!header && h1s.length) { let e = h1s[0]; for (let i = 0; i < 3 && e.parentElement && pageRoot.contains(e.parentElement); i++) { if (e.parentElement.getBoundingClientRect().height > 320) break; e = e.parentElement; } header = e; }
  let headerRec = null, titleEl = null;
  if (header) {
    const r = header.getBoundingClientRect(), cs = getComputedStyle(header);
    titleEl = header.querySelector("h1") || [...header.querySelectorAll("*")].filter(vis).filter((e) => ownText(e)).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0] || null;
    const tr = titleEl ? titleEl.getBoundingClientRect() : null;
    const below = pageEls.filter((e) => !header.contains(e) && !e.contains(header) && e.getBoundingClientRect().top >= r.bottom - 1 && e.getBoundingClientRect().height > 8).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
    headerRec = { kind: headerKind, sel: selector(header), topFromSheet: px(r.top - sheetRect.top), height: px(r.height), bg: bgOf(header).bg, radius: radius(cs), padding: pad(cs), titleTop: tr ? px(tr.top - r.top) : null, titleLeft: tr ? px(tr.left - r.left) : null, title: titleEl ? { ...typeSig(getComputedStyle(titleEl)), sel: selector(titleEl) } : null, gapBelow: below ? px(below.getBoundingClientRect().top - r.bottom) : null, belowSel: below ? selector(below) : null };
  }

  /* ── named tests ─────────────────────────────────────────────────────────────────────────────── */
  const isClick = (el) => el.matches("button, [role='button'], [role='tab'], [role='switch'], [role='option'], [role='menuitem'], a[class*='btn'], a[class*='button'], input[type='submit'], input[type='button']")
    || (el.getAttribute("tabindex") === "0" && getComputedStyle(el).cursor === "pointer" && !el.matches("input, select, textarea"));
  const iconOnly = (el) => !text(el) && !!el.querySelector("svg, img");
  const selected = (el) => ["aria-selected", "aria-pressed", "aria-checked"].some((a) => el.getAttribute(a) === "true") || /(^|\s)(on|is-on|is-sel|sel|is-active|active|cb15-on|is-now)(\s|$)/.test(clsStr(el));
  const isDialogClose = (el) => !!dialogOf(el) && el.matches("button") && /close|dismiss|×|✕/i.test(`${el.getAttribute("aria-label") || ""} ${(el.textContent || "").trim().length <= 2 ? el.textContent : ""}`);
  const isDialogFooter = (el) => { const d = dialogOf(el); if (!d || el === d) return false; if (!el.querySelector("button")) return false; const r = el.getBoundingClientRect(), dr = d.getBoundingClientRect(); return el.parentElement === d && Math.abs(r.bottom - dr.bottom) <= 2 && r.height <= 140; };
  const isDialogHeader = (el) => { const d = dialogOf(el); if (!d || el.parentElement !== d) return false; const kids = [...d.children].filter(vis); return kids[0] === el && !!el.querySelector("h1, h2, h3, [class*='title'], [class*='-t']"); };
  /* StatusDot (src/components/StatusDot.tsx): a square span holding one UNCLASSED svg, viewBox 0 0 24 24, stroke currentColor
     (lucide icons share the viewBox but always carry class "lucide") */
  const statusDot = (el) => { if (el.tagName !== "SPAN") return false; const s = el.querySelector(":scope > svg"); if (!s || s.getAttribute("class") || s.getAttribute("viewBox") !== "0 0 24 24" || s.getAttribute("stroke") !== "currentColor") return false; const r = el.getBoundingClientRect(); return r.width <= 28 && r.width >= 6 && Math.abs(r.width - r.height) < 1; };
  const queryCardOf = (el) => safeClosest(el.parentElement || el, ".qc154-card, .qc-card");
  const TESTS = { iconOnly, dialogRoot: (el) => dialogs.includes(el), dialogClose: isDialogClose, dialogFooter: isDialogFooter, dialogHeader: isDialogHeader, statusDot };
  const WITHIN = { navyHeader: (el) => !!(navyHeader && navyHeader.contains(el)), queryCard: (el) => !!queryCardOf(el), dialog: (el) => !!dialogOf(el) };
  /* which candidate kinds each group may claim */
  const KINDS = { panels: ["click", "box", "control", "row", "mark"], nav: ["click", "box", "row", "control"], lists: ["row", "click", "box"], controls: ["control", "click", "box"], buttons: ["click"], marks: ["mark", "click"], cards: ["box", "click"], surfaces: ["box"] };
  const classify = (el, kind) => {
    for (const r of ROLES) {
      const g = r.role.split("/")[0];
      if (g === "headings" || (g === "surfaces" && (!r.sel || r.test))) continue;
      if (!(KINDS[g] || []).includes(kind)) continue;
      if (r.within && !WITHIN[r.within](el)) continue;
      if (r.role === "cards/part-of-component") return { role: r.role, by: "within queryCard" };
      if (r.sel) for (const s of r.sel) if (safeMatch(el, s)) return { role: r.role, by: s };
      if (r.test && TESTS[r.test] && TESTS[r.test](el)) return { role: r.role, by: `test:${r.test}` };
    }
    return null;
  };

  /* ── records ─────────────────────────────────────────────────────────────────────────────────── */
  const records = [], unclassified = [], perRole = {};
  let n = 0;
  const tag = (el) => { if (!el.getAttribute("data-ca2")) el.setAttribute("data-ca2", `c${++n}`); return el.getAttribute("data-ca2"); };
  const scopeOf = (el) => (dialogOf(el) ? "overlay" : inShell(el) ? "shell" : "page");
  const add = (el, role, by, sig, extra = {}) => {
    perRole[role] = (perRole[role] || 0) + 1;
    if (perRole[role] > MAX_PER_ROLE) return;
    records.push({ id: tag(el), role, by, sel: selector(el), rect: rel(el.getBoundingClientRect()), sig, text: text(el), scope: scopeOf(el), view: dialogOf(el) ? one(dialogOf(el)) : "page", ...extra });
  };
  const claimed = new Set();
  const unclass = (el, kind, why) => { if (unclassified.length < 300) unclassified.push({ id: tag(el), kind, sel: selector(el), chain: chain(el).slice(0, 3), rect: rel(el.getBoundingClientRect()), text: text(el).slice(0, 40), scope: scopeOf(el), why: why || "" }); };

  /* surfaces */
  add(doc.body, "surfaces/page-background", "test:body", { bg: bgOf(doc.body).bg });
  if (stage) add(stage, "surfaces/stage", "#app-stage-scroll", { bg: bgOf(stage).bg, bgFrom: bgOf(stage).bgFrom });
  if (sheet) add(sheet, "surfaces/sheet", sheet.matches(".ws-window, .mk-sheet") ? ".ws-window/.mk-sheet" : "test:largest opaque box", { ...boxSig(sheet, getComputedStyle(sheet), false), height: undefined });
  if (sidebar && vis(sidebar)) add(sidebar, "surfaces/sidebar", "#ws-sidebar", { ...boxSig(sidebar, getComputedStyle(sidebar), true), height: undefined });
  for (const el of els) {
    if (dialogOf(el)) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!opaque(cs)) continue;
    if (r.left <= 1 && r.top <= 1 && r.height >= vh * 0.9 && r.width >= 40 && r.width <= 110) add(el, "surfaces/rail", "test:position", { ...boxSig(el, cs, true), height: undefined });
    else if (r.top <= 1 && r.height >= 28 && r.height <= 110 && r.width >= vw * 0.5 && !(stage && stage.contains(el))) add(el, "surfaces/top-bar", "test:position", boxSig(el, cs, false));
  }
  if (headerRec) add(header, `surfaces/page-header-${headerKind}`, "test:header", headerRec);

  /* candidates, in document order */
  const CONTROL = "input:not([type='hidden']), select, textarea, [role='switch'], [role='checkbox'], [role='radio'], [role='combobox']";
  for (const el of els) {
    if (el === doc.body || el === stage || el === sheet || el === sidebar || el === header) continue;
    if (inShell(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    let kind = null;
    if (dialogs.includes(el)) kind = "box";
    else if (el.matches(CONTROL)) kind = "control";
    else if (isClick(el)) kind = "click";
    else if (el.matches("tr, th, [role='row'], [role='listitem'], [role='columnheader']") || (el.tagName === "LI" && r.height >= 28)) kind = "row";
    else {
      const t = text(el);
      const filled = (() => { const p = rgba(cs.backgroundColor); return p && p.a > 0.05; })();
      const edged = border(cs) !== "none" || cs.boxShadow !== "none";
      if (r.height >= 12 && r.height <= 30 && r.width <= 260 && t && t.length <= 32 && (filled || border(cs) !== "none") && !el.querySelector("button, input")) kind = "mark";
      else if (statusDot(el)) kind = "mark";
      else if (r.width >= 140 && r.height >= 40 && r.width < pr.width * 0.985 && (filled || edged) && (edged || parseFloat(cs.borderTopLeftRadius) >= 4 || r.width >= pr.width * 0.7)) kind = "box";
      else if (/(^|\s)(sp-rc|os-card|sp-card|art-box|sband)(\s|$)/.test(clsStr(el))) kind = "box";
    }
    if (!kind) continue;
    /* a box inside a button, a row or a claimed atomic part belongs to it */
    if (kind === "box" && !dialogs.includes(el) && (el.parentElement && el.parentElement.closest("button, [role='button'], a[class*='btn'], li, tr"))) continue;
    if (kind === "mark" && el.parentElement && el.parentElement.closest("kbd")) continue;
    const c = classify(el, kind);
    if (!c) {
      /* a selected toggle, tab, segment, filter pill or row is never a button: say so rather than guess */
      unclass(el, kind, kind === "click" && selected(el) ? "selected state, no role in the map" : "");
      continue;
    }
    if (c.role === "cards/part-of-component") { claimed.add(el); continue; }
    claimed.add(el);
    const g = c.role.split("/")[0];
    let sig, extra = {};
    if (g === "buttons" || g === "nav" || g === "lists" || g === "marks" || g === "panels") {
      const own = rgba(cs.backgroundColor);
      const ring = /inset/.test(cs.boxShadow) || border(cs) !== "none";
      const variant = c.role.startsWith("buttons/") ? (own && own.a > 0.5 ? (lum(cs.backgroundColor) < 0.2 ? "filled" : "light-filled") : ring ? "outline" : "text") : selected(el) ? "selected" : "rest";
      sig = { ...typeSig(cs), ...boxSig(el, cs, g === "marks" || c.role === "buttons/icon-only" || c.role === "panels/close") };
      if (c.role === "panels/shell") sig = { ...boxSig(el, cs, true), height: undefined };
      extra = { variant, disabled: !!(el.disabled || el.getAttribute("aria-disabled") === "true") };
    } else if (g === "controls") {
      sig = { ...typeSig(cs), ...boxSig(el, cs, ["controls/checkbox", "controls/radio", "controls/switch"].includes(c.role)) };
      extra = { placeholder: (el.getAttribute("placeholder") || "").slice(0, 40), focused: doc.activeElement === el };
    } else if (g === "cards" || g === "surfaces") {
      sig = { ...boxSig(el, cs, false), height: undefined };
    }
    add(el, c.role, c.by, sig, extra);
  }

  /* headings */
  const heroLike = (el) => !!safeClosest(el, "[class*='hero'], .mk-hero, [class*='-hero']");
  for (const el of els) {
    if (inShell(el)) continue;
    const isTag = /^H[1-6]$/.test(el.tagName);
    const cls = clsStr(el);
    const byCls = /(^|\s)sp-h-section(\s|$)/.test(cls) ? "headings/section" : /(^|\s)(sp-card-h|sp-h-card)(\s|$)/.test(cls) ? "headings/card" : /(^|\s)sp-h-small(\s|$)/.test(cls) ? "headings/small" : null;
    if (!isTag && !byCls && el !== titleEl) continue;
    if (!text(el)) continue;
    let role;
    if (el === titleEl) role = "headings/page-title";
    else if (byCls) role = byCls;
    else if (el.closest("footer")) role = "headings/footer-heading";
    else if (el.tagName === "H1" || ((el.tagName === "H2") && heroLike(el))) role = "headings/hero-line";
    else if (el.tagName === "H2") role = "headings/section";
    else if (el.tagName === "H3") role = "headings/card";
    else role = "headings/small";
    add(el, role, el === titleEl ? "test:header title" : byCls ? "class" : `tag:${el.tagName.toLowerCase()}`, typeSig(getComputedStyle(el)), { headerKind: header && header.contains(el) ? headerKind : "" });
    claimed.add(el);
  }

  /* text for Phase 3: own-text leaves not inside a claimed clickable / control / mark */
  const page = (doc.querySelector("#app-stage-scroll") || doc.body);
  const firstP = pageEls.find((e) => e.tagName === "P" && ownText(e).length > 20);
  const bodyInk = firstP ? colour(getComputedStyle(firstP).color) : null;
  const bodyLum = firstP ? lum(getComputedStyle(firstP).color) : null;
  for (const el of els) {
    if (inShell(el) || claimed.has(el)) continue;
    const t = ownText(el);
    if (!t) continue;
    if (el.closest("button, [role='button'], [role='tab'], a[class*='btn'], h1, h2, h3, h4, h5, h6, kbd, svg")) continue;
    const cs = getComputedStyle(el);
    let anc = el.parentElement, inMark = false;
    while (anc && anc !== page) { if (claimed.has(anc) && /^(SPAN|I|EM|B|SMALL)$/.test(anc.tagName) === false && anc.getBoundingClientRect().height <= 30) { inMark = true; break; } anc = anc.parentElement; }
    if (inMark) continue;
    const size = parseFloat(cs.fontSize);
    let role;
    if (/^[£$€]?[+−-]?\d[\d,.:%]*[kKmM%]?$/.test(t)) role = "text/numeral";
    else if (el.tagName === "LABEL" || cs.textTransform === "uppercase" || (parseFloat(cs.letterSpacing) || 0) >= 0.5) role = "text/label";
    else if (el.matches("figcaption, small, caption") || size < 13) role = "text/caption";
    else if (el.tagName === "P" && (!bodyInk || colour(cs.color) === bodyInk)) role = "text/body";
    else if (bodyLum != null && lum(cs.color) > bodyLum + 0.03) role = "text/secondary";
    else role = "text/body";
    add(el, role, "text", typeSig(cs), { headerKind: header && header.contains(el) ? headerKind : "" });
  }

  /* ── facts for the rules check ───────────────────────────────────────────────────────────────── */
  const inArt = (el) => !!el.closest("svg, picture, canvas, figure[class*='art'], [class*='illo'], [class*='illus'], [class*='-art'], [class*='art-'], [aria-hidden='true'][class*='hero']");
  const scaledCopy = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cls = clsStr(e);
      if (/(^|[-_\s])(example|mini|preview|demo|thumb|sample-card|mock)([-_\s]|$)/i.test(cls)) return `class ${cls.split(/\s+/)[0]}`;
      const m = /matrix\(([^,]+),/.exec(getComputedStyle(e).transform || "");
      if (m && Math.abs(+m[1]) < 0.98) return `scale ${(+m[1]).toFixed(2)} on ${one(e)}`;
      const z = parseFloat(getComputedStyle(e).zoom || "1"); if (z && z < 0.98) return `zoom ${z} on ${one(e)}`;
    }
    return null;
  };
  const spine = (el) => !!el.closest(".ms29-bk-t, .ct-spine, .spine-root, .ms-spine-btn, [class*='spine']");
  const small = [], words = [];
  const LATE = /\b(late|overdue)\b/i;
  for (const el of els) {
    const t = ownText(el);
    const ph = el.getAttribute && (el.getAttribute("placeholder") || "");
    if (!t && !ph) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (t && fs < 12 && small.length < 400) small.push({ id: tag(el), sel: selector(el), chain: chain(el).slice(0, 4), size: px(fs), text: t.slice(0, 40), inArt: inArt(el), scaled: scaledCopy(el), spine: spine(el), scope: scopeOf(el), rect: rel(el.getBoundingClientRect()), box: (() => { const p = el.parentElement; if (!p) return null; const pr2 = p.getBoundingClientRect(); return { sel: selector(p), w: px(pr2.width), h: px(pr2.height), ownW: px(el.getBoundingClientRect().width), ownH: px(el.getBoundingClientRect().height), overflow: getComputedStyle(p).overflow, ws: cs.whiteSpace }; })() });
    for (const s of [t, ph]) if (s && LATE.test(s) && words.length < 200) words.push({ id: tag(el), sel: selector(el), chain: chain(el).slice(0, 4), text: s.slice(0, 80), scope: scopeOf(el), placeholder: s === ph && s !== t });
  }
  /* colour census, with up to 6 examples per value, each saying whether it is a destructive control or a MountCard frame */
  const DESTRUCT = ".acct-btn--danger, [data-red], .f11-discard, [data-destructive], [data-qc1522='discard'], [data-qls='leave-discard']";
  const mountFrame = (el, cs) => cs.position === "absolute" && el.getAttribute("aria-hidden") === "true" && px(cs.top) === 6 && px(cs.left) === 6;
  const census = {};
  const note = (prop, c, el, cs) => {
    if (!c || c === "transparent") return;
    const k = `${prop} ${c}`;
    const e = (census[k] = census[k] || { prop, colour: c, n: 0, ex: [] });
    e.n++;
    if (e.ex.length < 6) e.ex.push({ id: tag(el), sel: selector(el), chain: chain(el).slice(0, 3), text: (ownText(el) || text(el)).slice(0, 30), destructive: !!safeClosest(el, DESTRUCT), mountFrame: mountFrame(el, cs), scope: scopeOf(el), art: !!el.closest("picture, canvas, img, figure[class*='art'], [class*='illo'], [class*='illus'], [class*='-art'], [class*='art-'], .art-box, [aria-hidden='true'][class*='hero']"), smallAccent: (() => { const r = el.getBoundingClientRect(); return r.width <= 260 && r.height <= 40; })() });
  };
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (ownText(el) || el.matches("svg, svg *")) note("color", colour(cs.color), el, cs);
    note("bg", colour(cs.backgroundColor), el, cs);
    for (const s of ["Top", "Right", "Bottom", "Left"]) { if ((parseFloat(cs[`border${s}Width`]) || 0) > 0 && cs[`border${s}Style`] !== "none") { note("border", colour(cs[`border${s}Color`]), el, cs); break; } }
    if (cs.boxShadow !== "none") for (const m of cs.boxShadow.match(/rgba?\([^)]+\)/g) || []) { const p = rgba(m); if (p && p.a > 0.15) note("shadow", colour(m), el, cs); }
    if (el.matches("svg, svg *")) { if (cs.fill && cs.fill !== "none" && /rgb/.test(cs.fill)) note("fill", colour(cs.fill), el, cs); if (cs.stroke && cs.stroke !== "none" && /rgb/.test(cs.stroke)) note("stroke", colour(cs.stroke), el, cs); }
    if (/gradient/.test(cs.backgroundImage || "")) for (const m of cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []) { const p = rgba(m); if (p && p.a > 0.15) note("gradient", colour(m), el, cs); }
  }

  /* spacing (Phase 3): the vertical gaps between the page's sections (the children of the deepest box that holds
     the page's content in a column), and the gaps between neighbouring cards that share a parent */
  const spacing = { sections: [], grid: [] };
  {
    /* go down into the widest child until a level whose children are mostly stacked (three or more, each below the last) */
    let col = pageRoot;
    const flowKids = (c) => [...c.children].filter(vis).filter((k) => !/absolute|fixed/.test(getComputedStyle(k).position) && k.getBoundingClientRect().height > 8);
    for (let i = 0; i < 16; i++) {
      const kids = flowKids(col);
      if (!kids.length) break;
      const sorted = [...kids].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      let stacked = 0; for (let j = 1; j < sorted.length; j++) if (sorted[j].getBoundingClientRect().top >= sorted[j - 1].getBoundingClientRect().bottom - 1) stacked++;
      if (kids.length >= 3 && stacked >= (kids.length - 1) * 0.6) break;
      const widest = [...kids].sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
      if (widest.getBoundingClientRect().width < pr.width * 0.4) break;
      col = widest;
    }
    const kids = [...col.children].filter(vis).filter((k) => !/absolute|fixed/.test(getComputedStyle(k).position) && k.getBoundingClientRect().height > 8);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
      if (b.top >= a.bottom - 1) spacing.sections.push({ gap: px(b.top - a.bottom), above: selector(kids[i - 1]), below: selector(kids[i]), column: selector(col) });
    }
    const cardIds = new Set(records.filter((r) => /^cards\/(framed|plain-card|stat-tile|journey-card|side-panel)$/.test(r.role)).map((r) => r.id));
    const cards = [...doc.querySelectorAll("[data-ca2]")].filter((e) => cardIds.has(e.getAttribute("data-ca2")));
    for (const c of cards) {
      const sibs = cards.filter((o) => o !== c && o.parentElement === c.parentElement);
      const r = c.getBoundingClientRect();
      const right = sibs.map((o) => o.getBoundingClientRect()).filter((o) => o.left >= r.right - 1 && Math.abs(o.top - r.top) < 4).sort((x, y) => x.left - y.left)[0];
      const down = sibs.map((o) => o.getBoundingClientRect()).filter((o) => o.top >= r.bottom - 1 && Math.abs(o.left - r.left) < 4).sort((x, y) => x.top - y.top)[0];
      if (right) spacing.grid.push({ axis: "x", gap: px(right.left - r.right), sel: selector(c), parent: selector(c.parentElement) });
      if (down) spacing.grid.push({ axis: "y", gap: px(down.top - r.bottom), sel: selector(c), parent: selector(c.parentElement) });
    }
  }

  return {
    records, unclassified, perRole, spacing,
    facts: { small, words, census: Object.values(census), header: headerRec, ground: { stage: stage ? bgOf(stage).bg : null, sheet: sheet ? bgOf(sheet).bg : null, body: bgOf(doc.body).bg, sheetSel: sheet ? selector(sheet) : null } },
    meta: { vw, vh, url: location.href, pageRoot: one(pageRoot), sheet: sheet ? one(sheet) : null, header: headerRec ? { kind: headerKind, sel: headerRec.sel } : null, stage: !!stage, dialogs: dialogs.map(one), candidates: records.length + unclassified.length, bodyText: (doc.body.innerText || "").slice(0, 120).replace(/\s+/g, " ") },
  };
})();
