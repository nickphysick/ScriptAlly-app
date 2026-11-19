/*
 * Consistency audit v1 — the in-page collector.
 *
 * Runs inside the page (page.evaluate). Walks the RENDERED, VISIBLE DOM, sorts elements into the parts
 * the audit compares, and returns one record per element with its computed values. Nothing here reads
 * a declaration: every value is getComputedStyle / getBoundingClientRect of a box the browser drew.
 *
 * ⚠️ HIDDEN STAGE PAGES. Every workspace page stays mounted (display-toggled), so a querySelectorAll on
 * `document` returns every page at once. `checkVisibility()` drops anything under a display:none
 * ancestor, and every record carries its rect, so a zero box can never be compared.
 *
 * ⚠️ A TRANSPARENT SURFACE HAS NO COLOUR OF ITS OWN. `bg` is the element's own fill when it has one, else
 * the first opaque fill behind it (walking up), flagged `bgFrom: "behind"`.
 *
 * Returns { records, meta }. Each record: { id, part, role, page-relative rect, sig, cls, text }.
 * `id` is also written to the element as data-ca-id so the spec can crop a screenshot of it.
 */
(() => {
  const MAX_PER_PART = 160;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document;
  doc.querySelectorAll("[data-ca-id]").forEach((e) => e.removeAttribute("data-ca-id"));

  const vis = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };

  const parseRgba = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || "");
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");
  const colour = (c) => {
    const p = parseRgba(c);
    if (!p) return c || "";
    if (p.a === 0) return "transparent";
    const h = `#${hex2(p.r)}${hex2(p.g)}${hex2(p.b)}`;
    return p.a >= 0.999 ? h : `${h}/${Math.round(p.a * 100)}`;
  };
  const lum = (c) => {
    const p = parseRgba(c);
    if (!p) return 1;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
  };
  const opaque = (cs) => {
    const p = parseRgba(cs.backgroundColor);
    return (p && p.a > 0.05) || (cs.backgroundImage && cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage));
  };
  const bgOf = (el) => {
    let e = el;
    let own = true;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const p = parseRgba(cs.backgroundColor);
      if (p && p.a > 0.05) return { bg: colour(cs.backgroundColor), bgFrom: own ? "own" : "behind", bgImage: own && cs.backgroundImage !== "none" ? "image" : "" };
      if (own && cs.backgroundImage && /gradient/.test(cs.backgroundImage)) return { bg: "gradient", bgFrom: "own", bgImage: cs.backgroundImage.slice(0, 120) };
      e = e.parentElement;
      own = false;
    }
    return { bg: colour(getComputedStyle(doc.body).backgroundColor), bgFrom: "body", bgImage: "" };
  };
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : v;
  };
  const border = (cs) => {
    const sides = ["Top", "Right", "Bottom", "Left"].map((s) => {
      const w = parseFloat(cs[`border${s}Width`]) || 0;
      const st = cs[`border${s}Style`];
      if (!w || st === "none" || st === "hidden") return "none";
      const c = colour(cs[`border${s}Color`]);
      if (c === "transparent") return "none";
      return `${px(cs[`border${s}Width`])}px ${st} ${c}`;
    });
    return sides.every((s) => s === sides[0]) ? sides[0] : sides.join(" | ");
  };
  const radius = (cs) => {
    const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
    return r.every((x) => x === r[0]) ? `${r[0]}` : r.join(" ");
  };
  const pad = (cs) => {
    const p = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    return p.join(" ");
  };
  const fam = (cs) => (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim();
  const typeSig = (cs) => ({
    fontFamily: fam(cs),
    fontSize: px(cs.fontSize),
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight === "normal" ? "normal" : px(cs.lineHeight),
    letterSpacing: cs.letterSpacing === "normal" ? "normal" : px(cs.letterSpacing),
    textTransform: cs.textTransform === "none" ? "" : cs.textTransform,
    color: colour(cs.color),
  });
  const boxSig = (el, cs, withWidth) => {
    const r = el.getBoundingClientRect();
    const b = bgOf(el);
    return {
      bg: b.bg,
      bgFrom: b.bgFrom,
      border: border(cs),
      radius: radius(cs),
      shadow: cs.boxShadow === "none" ? "none" : cs.boxShadow,
      padding: pad(cs),
      height: px(r.height),
      ...(withWidth ? { width: px(r.width) } : {}),
    };
  };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
  const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const clsOf = (el) => {
    const out = [];
    let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 4; i++) {
      const c = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(".") : "";
      out.push(`${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${c ? "." + c : ""}`);
      e = e.parentElement;
    }
    return out;
  };

  /* ── the scopes ─────────────────────────────────────────────────────────────────────────────── */
  const sidebar = doc.querySelector("#ws-sidebar");
  const shellRoots = [...doc.querySelectorAll("#ws-sidebar, [class*='rail'], header, nav")].filter(vis);
  const dialogs = [...doc.querySelectorAll("[role='dialog'], [aria-modal='true'], dialog[open]")].filter(vis);
  const inDialog = (el) => dialogs.some((d) => d.contains(el));
  const stage = [...doc.querySelectorAll("#app-stage-scroll")].filter(vis)[0] || null;
  /* the page root: the visible StagePage slot, else the stage, else main, else body */
  /* the page root: the stage scroller holds only the visible page (hidden StagePage slots are display:none) */
  const pageRoot = stage || [...doc.querySelectorAll(".mk-sheet, main, .sf-sheet, .au-shell, [class*='auth']")].filter(vis).sort((a, b) => b.getBoundingClientRect().height * b.getBoundingClientRect().width - a.getBoundingClientRect().height * a.getBoundingClientRect().width)[0] || doc.body;
  const inShell = (el) => !!(sidebar && sidebar.contains(el)) || (stage ? !stage.contains(el) && !inDialog(el) : false);
  const pr = pageRoot.getBoundingClientRect();
  const rel = (r) => ({ x: px(r.left - pr.left), y: px(r.top - pr.top + (stage ? stage.scrollTop : window.scrollY)), w: px(r.width), h: px(r.height) });

  const records = [];
  const perPart = {};
  let n = 0;
  const add = (el, part, role, sig, extra = {}) => {
    const key = `${part}/${role}`;
    perPart[key] = (perPart[key] || 0) + 1;
    if (perPart[key] > MAX_PER_PART) return;
    const id = `ca${++n}`;
    el.setAttribute("data-ca-id", id);
    records.push({ id, part, role, rect: rel(el.getBoundingClientRect()), sig, cls: clsOf(el), text: text(el), scope: inDialog(el) ? "overlay" : inShell(el) ? "shell" : "page", ...extra });
  };

  /* ── surfaces ───────────────────────────────────────────────────────────────────────────────── */
  add(doc.body, "surfaces", "page-background", { bg: bgOf(doc.body).bg, bgImage: getComputedStyle(doc.body).backgroundImage === "none" ? "" : "image" });
  if (stage) add(stage, "surfaces", "stage", { bg: bgOf(stage).bg, bgFrom: bgOf(stage).bgFrom });
  if (sidebar && vis(sidebar)) {
    const cs = getComputedStyle(sidebar);
    add(sidebar, "surfaces", "sidebar", { ...boxSig(sidebar, cs, true), height: undefined });
  }
  /* rail / top bar: the shell's own boxes, found by position — never by a class someone renamed */
  const allEls = [...doc.querySelectorAll("body *")];
  const visEls = allEls.filter(vis);
  for (const el of visEls) {
    if (inDialog(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!opaque(cs)) continue;
    if (r.left <= 1 && r.top <= 1 && r.height >= vh * 0.9 && r.width >= 40 && r.width <= 110) add(el, "surfaces", "rail", { ...boxSig(el, cs, true), height: undefined });
    else if (r.top <= 1 && r.height >= 28 && r.height <= 110 && r.width >= vw * 0.5 && !(stage && stage.contains(el))) add(el, "surfaces", "top-bar", boxSig(el, cs, false));
  }
  /* the sheet and section bands: opaque boxes inside the page root */
  const pageEls = visEls.filter((el) => pageRoot.contains(el) && el !== pageRoot && !inDialog(el));
  /* the sheet: the workspace window the stage sits in (it holds the stage, so it is not inside the page root) */
  let sheet = [...doc.querySelectorAll(".ws-window, .mk-sheet")].filter(vis)[0] || null;
  if (sheet) add(sheet, "surfaces", "sheet", { ...boxSig(sheet, getComputedStyle(sheet), false), height: undefined });
  for (const el of pageEls) {
    const cs = getComputedStyle(el);
    if (!opaque(cs)) continue;
    const r = el.getBoundingClientRect();
    if (!sheet && r.width >= pr.width * 0.6 && r.height >= vh * 0.5) { sheet = el; add(el, "surfaces", "sheet", { ...boxSig(el, cs, false), height: undefined }); continue; }
    if (r.width >= pr.width * 0.7 && r.height >= 24 && r.height <= 420 && lum(cs.backgroundColor) > 0.2) add(el, "surfaces", "section-band", { bg: bgOf(el).bg, border: border(cs), radius: radius(cs), shadow: cs.boxShadow });
  }
  const sheetRect = (sheet || pageRoot).getBoundingClientRect();

  /* ── page header ───────────────────────────────────────────────────────────────────────────── */
  const isNavy = (cs) => { const p = parseRgba(cs.backgroundColor); return p && p.a > 0.5 && lum(cs.backgroundColor) < 0.06 && p.b >= p.r; };
  let header = pageEls.find((el) => {
    const r = el.getBoundingClientRect();
    return isNavy(getComputedStyle(el)) && r.width >= Math.min(500, pr.width * 0.5) && r.top - sheetRect.top < 260 && r.height >= 60 && r.height <= Math.min(560, vh * 0.7) && !(sheet && el.contains(sheet));
  });
  let headerKind = header ? "navy" : "plain";
  const h1s = pageEls.filter((e) => /^H1$/.test(e.tagName));
  if (!header && h1s.length) {
    /* a plain header: the h1's nearest ancestor that also holds its subheader (≤ 3 levels up) */
    let e = h1s[0];
    for (let i = 0; i < 3 && e.parentElement && pageRoot.contains(e.parentElement); i++) {
      if (e.parentElement.getBoundingClientRect().height > 320) break;
      e = e.parentElement;
    }
    header = e;
  }
  if (header) {
    const r = header.getBoundingClientRect();
    const cs = getComputedStyle(header);
    const title = header.querySelector("h1") || [...header.querySelectorAll("*")].filter(vis).filter((e) => ownText(e)).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
    const tr = title ? title.getBoundingClientRect() : null;
    /* the subheader is words, never a control's label */
    const textEls = [...header.querySelectorAll("*")].filter(vis).filter((e) => ownText(e) && e !== title && !(title && title.contains(e)) && !e.closest("button, a, [role='button'], [role='tab'], label"));
    const sub = tr ? textEls.find((e) => e.getBoundingClientRect().top >= tr.bottom - 2 && e.getBoundingClientRect().left < tr.left + 40) : null;
    const illus = [...header.querySelectorAll("img, svg, picture, canvas")].filter(vis).filter((e) => e.getBoundingClientRect().height >= 56).sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    const kids = [...header.querySelectorAll("button, a, [role='button'], input, select")].filter(vis);
    const right = kids.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0];
    /* the gap below: the first visible page element that starts below the header and is not inside it */
    const below = pageEls.filter((e) => !header.contains(e) && !e.contains(header) && e.getBoundingClientRect().top >= r.bottom - 1 && e.getBoundingClientRect().height > 8).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
    add(header, "page-header", headerKind, {
      kind: headerKind,
      topFromSheet: px(r.top - sheetRect.top),
      leftFromSheet: px(r.left - sheetRect.left),
      height: px(r.height),
      bg: bgOf(header).bg,
      radius: radius(cs),
      padding: pad(cs),
      titleLeft: tr ? px(tr.left - r.left) : null,
      titleTop: tr ? px(tr.top - r.top) : null,
      subGap: sub && tr ? px(sub.getBoundingClientRect().top - tr.bottom) : null,
      illusBox: illus ? `${px(illus.getBoundingClientRect().width)}x${px(illus.getBoundingClientRect().height)}` : null,
      illusRight: illus ? px(r.right - illus.getBoundingClientRect().right) : null,
      rightItemInset: right ? px(r.right - right.getBoundingClientRect().right) : null,
      gapBelow: below ? px(below.getBoundingClientRect().top - r.bottom) : null,
    });
    if (title) add(title, "type", "page-title", typeSig(getComputedStyle(title)), { headerKind });
    if (sub) add(sub, "type", "page-subheader", typeSig(getComputedStyle(sub)), { headerKind });
  }

  /* ── buttons ────────────────────────────────────────────────────────────────────────────────── */
  const btnEls = visEls.filter((e) => e.matches("button, [role='button'], a.btn, a[class*='btn'], a[class*='button'], input[type='submit'], input[type='button']") && !e.closest("[data-ca-skip]"));
  const buttons = new Set(btnEls);
  for (const el of btnEls) {
    if (inShell(el) && !inDialog(el)) continue; // the shell is one component; measured once as surfaces
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    const t = text(el);
    const hasIcon = !!el.querySelector("svg, img");
    const disabled = el.disabled || el.getAttribute("aria-disabled") === "true";
    const own = parseRgba(cs.backgroundColor);
    const filled = own && own.a > 0.5;
    const b = border(cs);
    let role;
    if (!t && hasIcon) role = "icon-only";
    else if (filled && lum(cs.backgroundColor) < 0.08) role = "primary";
    else if (filled) role = "filled-light";
    else if (b !== "none") role = "secondary";
    else role = "ghost";
    /* a bare text link styled as nothing is not a button the audit can compare — skip zero-padding ghosts */
    if (role === "ghost" && parseFloat(cs.paddingLeft) < 2 && parseFloat(cs.paddingTop) < 2) continue;
    add(el, "buttons", `${role}/${disabled ? "disabled" : "rest"}`, { ...typeSig(cs), ...boxSig(el, cs, role === "icon-only") }, { label: t.slice(0, 30) });
  }

  /* ── cards and frames ───────────────────────────────────────────────────────────────────────── */
  const mountParents = new Set();
  for (const el of pageEls.concat(visEls.filter(inDialog))) {
    const cs = getComputedStyle(el);
    if (cs.position === "absolute" && el.getAttribute("aria-hidden") === "true" && px(cs.top) === 6 && px(cs.left) === 6 && radius(cs) === "10" && el.parentElement) {
      mountParents.add(el.parentElement);
      add(el.parentElement, "cards", "mountcard", { ...boxSig(el.parentElement, getComputedStyle(el.parentElement), false), height: undefined, frameBorder: border(cs), frameRadius: radius(cs) });
    }
  }
  for (const el of pageEls.concat(visEls.filter(inDialog))) {
    if (mountParents.has(el) || buttons.has(el) || el === sheet || el === header) continue;
    if (el.matches("input, select, textarea, img, svg, button, a, li, tr, td, th, [role='row']")) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 140 || r.height < 56 || r.width >= pr.width * 0.97) continue;
    if (!opaque(cs)) continue;
    const hasEdge = border(cs) !== "none" || cs.boxShadow !== "none";
    if (!hasEdge || parseFloat(cs.borderTopLeftRadius) < 4) continue;
    add(el, "cards", "card", { ...boxSig(el, cs, false), height: undefined });
  }

  /* ── form controls ──────────────────────────────────────────────────────────────────────────── */
  for (const el of visEls) {
    if (inShell(el) && !inDialog(el)) continue;
    let role = null;
    if (el.matches("input[type='checkbox'], [role='checkbox']")) role = "checkbox";
    else if (el.matches("input[type='radio'], [role='radio']")) role = "radio";
    else if (el.matches("[role='switch'], input[type='checkbox'][role='switch']")) role = "toggle";
    else if (el.matches("select, [role='combobox']:not(input)")) role = "select";
    else if (el.matches("textarea")) role = "textarea";
    else if (el.matches("input:not([type]), input[type='text'], input[type='search'], input[type='email'], input[type='number'], input[type='url'], input[type='date'], input[type='password']")) role = "input";
    if (!role) continue;
    const cs = getComputedStyle(el);
    add(el, "form-controls", role, { ...typeSig(cs), ...boxSig(el, cs, ["checkbox", "radio", "toggle"].includes(role)) });
  }

  /* ── tags and status ────────────────────────────────────────────────────────────────────────── */
  for (const el of visEls) {
    if (buttons.has(el) || (inShell(el) && !inDialog(el))) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 12 || r.height > 30 || r.width > 260) continue;
    const cs = getComputedStyle(el);
    const t = text(el);
    if (!t || t.length > 32) continue;
    const ownBg = parseRgba(cs.backgroundColor);
    const filled = ownBg && ownBg.a > 0.05;
    const b = border(cs);
    if (!filled && b === "none") continue;
    const rad = parseFloat(cs.borderTopLeftRadius) || 0;
    const cls = typeof el.className === "string" ? el.className : "";
    let role = null;
    if (rad >= r.height / 2 - 1) role = "pill";
    else if (/badge|count/i.test(cls)) role = "badge";
    else if (/tag|chip/i.test(cls) || rad >= 3) role = "tag";
    if (!role) continue;
    if (el.querySelector("button, input")) continue;
    add(el, "tags-status", role, { ...typeSig(cs), ...boxSig(el, cs, false) });
  }
  /* StatusDot: its root is a span holding one svg with circles, ≤ 28px square */
  for (const el of visEls) {
    if (el.tagName !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (r.width > 28 || r.height > 28 || r.width < 6) continue;
    if (!el.querySelector("circle")) continue;
    const host = el.parentElement;
    if (!host || host.tagName !== "SPAN") continue;
    if (!/dot|sd|status/i.test(`${host.className} ${el.getAttribute("class") || ""} ${host.getAttribute("aria-label") || ""}`)) continue;
    add(host, "tags-status", "statusdot", { width: px(r.width), height: px(r.height), stroke: (el.querySelector("circle") && getComputedStyle(el.querySelector("circle")).stroke) || "" });
  }

  /* ── lists ─────────────────────────────────────────────────────────────────────────────────── */
  for (const el of visEls) {
    if (inShell(el) && !inDialog(el)) continue;
    let role = null;
    if (el.matches("tr, [role='row']")) role = el.querySelector("th, [role='columnheader']") ? "table-head" : "row";
    else if (el.matches("[role='listitem'], ul > li, ol > li") && el.getBoundingClientRect().height >= 28) role = "list-item";
    else if (el.matches("th, [role='columnheader']")) role = "column-header";
    else if (el.matches("[role='rowgroup'] > [role='heading'], [class*='group-head'], [class*='grp-h'], [class*='groupHead']")) role = "group-header";
    if (!role) continue;
    const cs = getComputedStyle(el);
    add(el, "lists", role, { ...typeSig(cs), ...boxSig(el, cs, false) });
  }

  /* ── navigation inside pages ───────────────────────────────────────────────────────────────── */
  for (const el of visEls) {
    if (inShell(el) && !inDialog(el)) continue;
    let role = null;
    if (el.matches("[role='tab']")) role = el.getAttribute("aria-selected") === "true" ? "tab/selected" : "tab/rest";
    else if (el.matches("[role='tablist']")) role = "tablist";
    else if (el.matches("[role='radiogroup'] > button, [role='group'] > button[aria-pressed]")) role = el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true" ? "segment/selected" : "segment/rest";
    if (!role) continue;
    const cs = getComputedStyle(el);
    add(el, "in-page-nav", role, { ...typeSig(cs), ...boxSig(el, cs, false) });
  }

  /* ── type (everything not already named): leaf text elements in the page ───────────────────── */
  const bodyInk = (() => { const p = pageEls.find((e) => e.tagName === "P" && ownText(e).length > 20); return p ? colour(getComputedStyle(p).color) : null; })();
  for (const el of pageEls.concat(visEls.filter(inDialog))) {
    if (buttons.has(el) || el.closest("button, [role='button'], a[class*='btn']")) continue;
    if (el.hasAttribute("data-ca-id") && el.closest("[data-ca-id]") === el && records.some((x) => x.id === el.getAttribute("data-ca-id") && x.part === "type")) continue;
    const t = ownText(el);
    if (!t || t.length < 1) continue;
    const cs = getComputedStyle(el);
    const tag = el.tagName;
    let role;
    if (tag === "H1") role = "h1";
    else if (tag === "H2") role = "section-heading";
    else if (tag === "H3" || tag === "H4") role = "card-heading";
    else if (/^[£$€]?\d[\d,.:%]*[kKmM%]?$/.test(t)) role = "numerals";
    else if (tag === "LABEL" || cs.textTransform === "uppercase" || (parseFloat(cs.letterSpacing) || 0) >= 0.5) role = "labels";
    else if (tag === "P" && (!bodyInk || colour(cs.color) === bodyInk)) role = "body";
    else if (bodyInk && colour(cs.color) !== bodyInk && lum(cs.color) > lum(getComputedStyle(pageEls.find((e) => e.tagName === "P") || doc.body).color) + 0.03) role = "secondary";
    else role = "body";
    add(el, "type", role, typeSig(cs), { headerKind: header && header.contains(el) ? headerKind : "" });
  }

  /* ── overlays ──────────────────────────────────────────────────────────────────────────────── */
  for (const d of dialogs) {
    const cs = getComputedStyle(d);
    const r = d.getBoundingClientRect();
    const kids = [...d.children].filter(vis);
    const head = kids[0];
    const foot = kids.length > 1 ? kids[kids.length - 1] : null;
    const close = [...d.querySelectorAll("button")].filter(vis).find((b) => /close|dismiss|cancel|×/i.test(`${b.getAttribute("aria-label") || ""} ${b.textContent}`));
    const kind = r.height >= vh * 0.75 && r.width < vw * 0.8 ? "drawer" : r.height >= vh * 0.75 ? "full-screen" : "modal";
    add(d, "overlays", `${kind}/shell`, { ...boxSig(d, cs, kind === "drawer-right"), height: kind === "modal" ? undefined : undefined });
    if (head) add(head, "overlays", `${kind}/header`, { ...boxSig(head, getComputedStyle(head), false) });
    if (kids[1] && kids[1] !== foot) add(kids[1], "overlays", `${kind}/body`, { padding: pad(getComputedStyle(kids[1])), bg: bgOf(kids[1]).bg });
    if (foot && foot.querySelector("button")) add(foot, "footers", `${kind}-action-footer`, { ...boxSig(foot, getComputedStyle(foot), false) });
    if (close) add(close, "overlays", `${kind}/close`, { ...typeSig(getComputedStyle(close)), ...boxSig(close, getComputedStyle(close), true) });
    /* the backdrop: a fixed full-viewport sibling under the dialog */
    const bd = visEls.find((e) => { const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return c.position === "fixed" && b.width >= vw - 2 && b.height >= vh - 2 && !e.contains(d) && parseRgba(c.backgroundColor) && parseRgba(c.backgroundColor).a > 0.05; });
    if (bd) add(bd, "overlays", `${kind}/backdrop`, { bg: colour(getComputedStyle(bd).backgroundColor), backdropFilter: getComputedStyle(bd).backdropFilter });
  }

  /* ── footers (page) and small parts ────────────────────────────────────────────────────────── */
  for (const el of visEls.filter((e) => e.tagName === "FOOTER" && !inDialog(e))) {
    const cs = getComputedStyle(el);
    add(el, "footers", "page-footer", { ...typeSig(cs), ...boxSig(el, cs, false) });
  }
  for (const el of visEls) {
    let role = null;
    if (el.matches("[role='tooltip']")) role = "tooltip";
    else if (el.matches("[role='status'], [role='alert'], [class*='toast'], [class*='snack']") && text(el)) role = "snackbar";
    else if (el.matches("[class*='empty']") && !el.parentElement.closest("[class*='empty']") && el.getBoundingClientRect().height > 60) role = "empty-state";
    if (!role) continue;
    const cs = getComputedStyle(el);
    add(el, "small-parts", role, { ...typeSig(cs), ...boxSig(el, cs, false), height: undefined });
  }

  /* ── colour census: every rendered colour on the page, for the green / red / burgundy checks ── */
  const census = {};
  for (const el of visEls) {
    const cs = getComputedStyle(el);
    for (const [k, v] of [["color", cs.color], ["bg", cs.backgroundColor], ["border", cs.borderTopColor]]) {
      if (k === "border" && (parseFloat(cs.borderTopWidth) || 0) === 0) continue;
      const c = colour(v);
      if (c === "transparent") continue;
      const key = `${k} ${c}`;
      if (!census[key]) census[key] = { n: 0, ex: clsOf(el)[0] };
      census[key].n++;
    }
  }

  return {
    records,
    meta: {
      vw, vh, url: location.href,
      scrollbar: window.innerWidth - doc.documentElement.clientWidth,
      pageRoot: clsOf(pageRoot)[0],
      sheet: sheet ? clsOf(sheet)[0] : null,
      header: header ? { kind: headerKind, el: clsOf(header)[0] } : null,
      stage: !!stage,
      perPart,
      dialogs: dialogs.length,
      bodyText: (doc.body.innerText || "").slice(0, 160).replace(/\s+/g, " "),
    },
    census,
  };
})();
