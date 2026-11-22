/* QueryHawk — sidebar rail v1: BEHAVIOUR REFERENCE, 5 Nov 2026.
   This is the approved live mock's script. It drove the real app by clicking a hidden copy of today's sidebar —
   that wiring (real(), realNav(), side, watchSide/ensure, the MutationObservers on #ws-sidebar, window.__* hooks,
   the note panel, the "mock.*" localStorage keys) is MOCK-ONLY and must not be ported. What IS normative:
   the sections and their order, the labels, the three states (rail / float / pinned) and every transition
   (setWide, openFloat, pin, glidePage, toRail, applyPinned, snapMargin), the timings, the close rules,
   the focus rules, the narrow-window rule, the migration rule and the last-page-per-section rule. */
/* Mock only: the new labelled rail, driving the real app's pages. The app's own sidebar stays mounted
   (hidden) so every existing control — navigation, the manuscript menu, feedback, the account menu —
   still runs through the app's own handlers. */
(() => {
  const I = {
    dash: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
    replies: '<path d="M3 7h18v11H3z"/><path d="m3.5 8 8.5 6 8.5-6"/><path d="M9 3.5 6.5 5.5 9 7.5"/>',
    people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
    library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    books: '<path d="M2 16V4a2 2 0 0 1 2-2h11"/><path d="M22 18H11a2 2 0 1 0 0 4h10.5a.5.5 0 0 0 .5-.5v-15a.5.5 0 0 0-.5-.5H11a2 2 0 0 0-2 2v12"/><path d="M5 14H4a2 2 0 1 0 0 4h1"/>',
    folder: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    check: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    note: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
    panel: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    stack: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  };
  const svg = (k, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  // the app's own page names, so we can drive its own buttons
  const R = {
    dash: { full: "Dashboard", short: "Dashboard", icon: "dash" },
    qc: { full: "Query Centre", short: "Query Centre", icon: "send" },
    re: { full: "Responses", short: "Responses", icon: "replies" },
    an: { full: "Analytics", short: "Analytics", icon: "chart" },
    cl: { full: "Contact list", short: "Contact list", icon: "people" },
    di: { full: "Discover", short: "Discover", icon: "compass" },
    ms: { full: "Manuscripts", short: "Manuscripts", icon: "library" },
    co: { full: "Comparable titles", short: "Comps", icon: "books" },
    pk: { full: "Submission packages", short: "Packages", icon: "folder" },
    td: { full: "To-do list", short: "To-do list", icon: "check" },
    ca: { full: "Calendar", short: "Calendar", icon: "calendar" },
    cb: { full: "Corkboard", short: "Corkboard", icon: "note" },
  };
  const SECTIONS = {
    dash: { label: "Dashboard", icon: "dash", pages: ["dash"] },
    queries: { label: "Queries", icon: "send", pages: ["qc", "re", "an"] },
    agents: { label: "Agents", icon: "people", pages: ["cl", "di"] },
    manuscript: { label: "Manuscript", icon: "library", pages: ["ms", "co"] },
    materials: { label: "Materials", icon: "folder", pages: ["pk"] },
    tasks: { label: "Tasks", icon: "check", pages: ["td", "ca", "cb"] },
  };
  const SETTINGS = [["profile","Profile","Profile","user"],["security","Sign-in & security","Security","shield"],["plan","Plan & billing","Plan","card"],["notifications","Notifications","Alerts","bell"],["preferences","Preferences","Settings","sliders"],["tasks","Tasks","Tasks","check"],["data","Your data","Your data","db"]];
  const fmtCount = (n) => n > 99 ? "99+" : String(n);
  const ORDER = [["dash"], ["queries", "agents", "manuscript", "materials", "tasks"]];
  const secOf = (p) => Object.keys(SECTIONS).find(k => SECTIONS[k].pages.includes(p));
  const byLabel = Object.fromEntries(Object.entries(R).map(([k, v]) => [v.full, k]));
  const lastPage = {};
  const S = { page: null, wide: false, pinned: false };

  let side, rail;
  const real = (sel) => side && side.querySelector(sel);
  const realNav = (p) => side && [...side.querySelectorAll(".ws-ni")].find(b => b.getAttribute("aria-label") === R[p].full);
  const currentPage = () => { const on = side && side.querySelector(".ws-ni.on"); return on ? byLabel[on.getAttribute("aria-label")] || null : null; };
  const inSettings = () => location.pathname.startsWith("/account");

  function go(p) { if (!p) return; const cur = S.page && secOf(S.page); if (cur) lastPage[cur] = S.page; realNav(p)?.click(); }

  function build() {
    const msTitle = (real(".ws-ms-t")?.textContent || "").trim();
    const allBooks = /^(all|every)\b/i.test(msTitle) || window.__mockAllBooks;
    const msInit = msTitle.replace(/^(the|a|an)\s+/i, "").split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    const tile = allBooks ? `<span class="qr-init qr-stack">${svg("stack", 1.6)}</span>` : msInit ? `<span class="qr-init">${msInit}</span>` : `<span class="qr-init qr-blank">${svg("library", 1.6)}</span>`;
    const markSrc = real(".ws-bmark")?.getAttribute("src") || "";
    const who = real(".ws-n")?.textContent || "", plan = real(".ws-pl")?.textContent || "", initials = real(".ws-av")?.textContent || "";

    const nav = ORDER.map(b => b.map(id => {
      const sec = SECTIONS[id], multi = sec.pages.length > 1;
      const head = `<button class="qr-ni" data-sec="${id}"${multi ? ' aria-expanded="false"' : ` data-tip="${R[sec.pages[0]].full}"`} aria-label="${sec.label}"><span class="qr-ic">${svg(sec.icon)}</span><span class="qr-lbl">${sec.label}</span><span class="qr-ct" hidden></span></button>`;
      const tray = !multi ? "" : `<div class="qr-tray"><div class="qr-tray-in">` + sec.pages.map(p => `<button class="qr-sp" data-go="${p}" tabindex="-1" aria-label="${R[p].full}"><span class="qr-spl">${R[p].short}</span></button>`).join("") + `</div></div>`;
      return `<div class="qr-grp${multi ? " qr-multi" : ""}" data-sec="${id}">${head}${tray}</div>`;
    }).join("")).join('<div class="qr-sep" aria-hidden="true"></div>');

    const wideNav = ORDER.flat().map(id => {
      const sec = SECTIONS[id];
      return (id === "dash" ? "" : `<div class="qw-gl">${sec.label}</div>`) + sec.pages.map(p => `<button class="qw-row" data-go="${p}"><span class="qw-ic">${svg(R[p].icon)}</span><span class="qw-l">${R[p].full}</span><span class="qw-ct" hidden></span></button>`).join("");
    }).join("");

    rail.innerHTML = `
      <div class="qr-c">
        <div class="qr-lgo"><a class="qr-home" data-tip="QueryHawk · go to Dashboard" aria-label="QueryHawk, go to Dashboard"><img src="${markSrc}" alt=""></a><button class="qr-tog" data-tip="Expand sidebar  [" aria-label="Expand sidebar">${svg("panel", 1.7)}</button></div>
        <button class="qr-ms" data-act="ms" data-tip="${msTitle} · switch manuscript">${tile}</button>
        <div class="qr-nav">${nav}</div>
        <div class="qr-setnav"><button class="qr-ni qr-back" data-act="back" aria-label="Back to the app"><span class="qr-ic">${svg("back")}</span><span class="qr-lbl">Back</span></button><div class="qr-sep"></div>${SETTINGS.map(([id, full, short, ic]) => `<button class="qr-ni qr-setni" data-set="${full}" aria-label="${full}"><span class="qr-ic">${svg(ic)}</span><span class="qr-lbl">${short}</span></button>`).join("")}</div>
        <button class="qr-fb" data-act="fb" data-tip="Give feedback"><span class="qr-fbi">${svg("msg", 1.8)}<i></i></span><span class="qr-t">Feedback</span></button>
        <div class="qr-foot"><button class="qr-av" data-act="acct" data-tip="${who} · ${plan}">${initials}</button></div>
      </div>
      <div class="qr-w" inert>
        <div class="qw-top"><a class="qw-brand" data-go="dash"><img src="${markSrc}" alt=""><b>QueryHawk</b></a><span class="qw-acts"><button class="qw-pin" aria-pressed="false" aria-label="Keep the sidebar open">${svg("pin", 1.7)}</button><button class="qr-tog qw-tog" aria-label="Close sidebar">${svg("panel", 1.7)}</button></span></div>
        <button class="qw-ms" data-act="ms">${tile}<span class="qw-mst"><b>${msTitle}</b><small>Querying</small></span></button>
        <nav class="qw-nav">${wideNav}</nav>
        <div class="qw-fbk">
          <div class="qw-fbc"><span class="qw-fbm">FOUNDING MEMBER</span><b class="qw-fbh">Shape QueryHawk</b><span class="qw-fbl">A snag, or a wish? Tell us.</span><button class="qw-fbtn" data-act="fb">${svg("msg", 1.8)}<span>Give feedback</span></button></div>
          <button class="qw-fbb" data-act="fb">${svg("msg", 1.8)}<span>Give feedback</span></button>
        </div>
        <div class="qw-foot" data-act="acct"><span class="qr-av">${initials}</span><span class="qw-who"><b>${who}</b><small>${plan}</small></span></div>
      </div>`;
  }

  let animT;
  function sync() {
    const p = currentPage();
    const changed = p !== S.page;
    S.page = p;                                  // off-nav pages light nothing
    const set = inSettings();
    rail.classList.toggle("qr-settings", set);
    if (set) rail.querySelectorAll(".qr-setni").forEach(b => { const on = [...side.querySelectorAll(".set-railitem")].some(x => x.getAttribute("aria-selected") === "true" && x.textContent.trim() === b.dataset.set); b.classList.toggle("qr-on", on); });
    const cur = S.page && secOf(S.page);
    if (cur) lastPage[cur] = S.page;
    const n = window.__mockCount ?? (parseInt(real(".ws-ct")?.textContent || "0", 10) || 0);
    rail.querySelectorAll(".qr-grp").forEach(g => {
      const on = g.dataset.sec === cur, multi = g.classList.contains("qr-multi");
      const head = g.querySelector(".qr-ni");
      g.classList.toggle("open", on && multi);
      head.classList.toggle("qr-on", on);
      on ? head.setAttribute("aria-current", multi ? "true" : "page") : head.removeAttribute("aria-current");
      if (multi) head.setAttribute("aria-expanded", String(on));
      const ct = head.querySelector(".qr-ct"); const c = g.dataset.sec === "tasks" ? n : 0; ct.hidden = !c; ct.textContent = c ? fmtCount(c) : "";
      g.querySelectorAll(".qr-sp").forEach(sp => { const here = sp.dataset.go === S.page; sp.classList.toggle("qr-cur", here); sp.tabIndex = on ? 0 : -1; here ? sp.setAttribute("aria-current", "page") : sp.removeAttribute("aria-current"); });
    });
    rail.querySelectorAll(".qw-row").forEach(r => {
      const on = r.dataset.go === S.page; r.classList.toggle("qw-cur", on);
      const ct = r.querySelector(".qw-ct"); const c = r.dataset.go === "td" ? n : 0; ct.hidden = !c; ct.textContent = c ? fmtCount(c) : ""; r.classList.toggle("qw-att", !!c);
    });
    if (changed) { rail.classList.remove("qr-anim"); void rail.offsetWidth; rail.classList.add("qr-anim"); clearTimeout(animT); animT = setTimeout(() => rail.classList.remove("qr-anim"), 450); }
  }

  // three states: the rail; the full sidebar floating over the page; the full sidebar pinned beside it
  let settleT;
  const snapMargin = (m) => { rail.classList.add("qr-nomargin-anim"); rail.style.marginRight = m; void rail.offsetWidth; rail.classList.remove("qr-nomargin-anim"); };
  const narrow = matchMedia("(max-width: 1099px)");
  let lastVar = null;
  const setVar = () => { const v = (S.wide && S.pinned && !narrow.matches ? 248 : 80) + "px"; if (v !== lastVar) { lastVar = v; document.documentElement.style.setProperty("--shell-side-w", v); } };
  function paint() {
    setVar();
    rail.classList.toggle("qr-wide", S.wide);
    rail.classList.toggle("qr-float", S.wide && !S.pinned);
    rail.querySelector(".qr-c").inert = S.wide;
    rail.querySelector(".qr-w").inert = !S.wide;
    const pin = rail.querySelector(".qw-pin");
    pin.setAttribute("aria-pressed", String(S.pinned));
    pin.setAttribute("aria-label", S.pinned ? "Unpin: back to the rail" : "Keep the sidebar open");
    pin.title = S.pinned ? "Unpin" : narrow.matches ? "Pinning needs a wider window" : "Pin open";
    pin.disabled = narrow.matches && !S.pinned;
  }
  let opener = null;
  function openFloat() {            // slides over the page: width and a negative margin move together, so the page never moves
    clearTimeout(settleT); S.wide = true; S.pinned = false; paint();
    rail.style.width = "248px"; rail.style.marginRight = "-168px";
    opener = document.activeElement;
    setTimeout(() => (rail.querySelector(".qw-row.qw-cur") || rail.querySelector(".qw-row"))?.focus({ preventScroll: true }), 60);
  }
  function pin() {                  // already open over the page: the page makes room once, now
    if (narrow.matches) return;
    clearTimeout(settleT); S.wide = true; S.pinned = true; paint();
    if (parseFloat(rail.style.width) !== 248) { rail.style.width = "248px"; rail.style.marginRight = "-168px"; settleT = setTimeout(() => snapMargin("0px"), 260); }
    else glidePage();
    store();
  }
  function toRail() {
    clearTimeout(settleT);
    if (S.pinned) snapMargin("-168px");   // pinned: the page takes the space back underneath first (one re-layout, hidden)
    const hadFocus = rail.querySelector(".qr-w").contains(document.activeElement);
    S.wide = false; S.pinned = false; paint();
    rail.style.width = "80px"; rail.style.marginRight = "0px";
    if (hadFocus) (rail.querySelector(".qr-c .qr-tog"))?.focus({ preventScroll: true });
    store();
  }
  // the page makes room in one re-layout, then slides into its new place (a transform, so nothing re-lays out while it moves)
  function glidePage() {
    const main = document.querySelector(".ws-main");
    snapMargin("0px");
    if (!main || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    main.style.transition = "none"; main.style.transform = "translateX(-168px)"; void main.offsetWidth;
    main.style.transition = "transform .26s cubic-bezier(.2,.9,.3,1)"; main.style.transform = "";
    setTimeout(() => { main.style.transition = ""; }, 300);
  }
  const store = () => { try { localStorage.setItem("mock.railPinned", S.pinned ? "1" : "0"); } catch (e) {} };
  const setWide = (w) => w ? openFloat() : toRail();
  function applyPinned() {           // the remembered pin, shown only where there is room for it
    rail.style.transition = "none";
    if (narrow.matches) { rail.classList.remove("qr-wide", "qr-float"); rail.style.width = "80px"; rail.style.marginRight = "0px"; rail.querySelector(".qr-c").inert = false; rail.querySelector(".qr-w").inert = true; S.wide = false; S.pinned = true; }
    else { S.wide = true; S.pinned = true; paint(); rail.style.width = "248px"; rail.style.marginRight = "0px"; }
    setVar(); void rail.offsetWidth; rail.style.transition = "";
  }

  // tooltips
  const tip = document.createElement("div"); tip.className = "qr-tip";
  let tipT;
  const showTip = (el, text) => { clearTimeout(tipT); tipT = setTimeout(() => { if (S.wide) return; const r = el.getBoundingClientRect(); tip.textContent = text; tip.style.left = (r.right + 10) + "px"; tip.style.top = (r.top + r.height / 2 - 14) + "px"; tip.classList.add("show"); }, 350); };
  const hideTip = () => { clearTimeout(tipT); tip.classList.remove("show"); };

  function wire() {
    rail.addEventListener("click", e => {
      if (e.target.closest(".qw-pin")) { S.pinned ? toRail() : pin(); return; }
      if (e.target.closest(".qr-tog")) { hideTip(); setWide(!S.wide); return; }
      const act = e.target.closest("[data-act]");
      if (act) {
        hideTip();
        if (act.dataset.act === "fb") real(".ws-fbtn")?.click();
        if (act.dataset.act === "acct") real(".ws-uacct")?.click();
        if (act.dataset.act === "ms") real(".ws-ms-btn")?.click();
        if (act.dataset.act === "back") (real(".set-backrail") || realNav("dash"))?.click();
        return;
      }
      const sr = e.target.closest(".qr-setni"); if (sr) { [...side.querySelectorAll(".set-railitem")].find(x => x.textContent.trim() === sr.dataset.set)?.click(); return; }
      if (e.target.closest(".qr-home")) { go("dash"); return; }
      const t = e.target.closest("[data-go]"); if (t) { hideTip(); go(t.dataset.go); if (S.wide && !S.pinned) setTimeout(toRail, 120); return; }
      const h = e.target.closest(".qr-ni"); if (h) { hideTip(); const id = h.dataset.sec; go(lastPage[id] || SECTIONS[id].pages[0]); }
    });
    rail.addEventListener("mouseover", e => { const t = e.target.closest("[data-tip]"); if (t && !t.contains(e.relatedTarget)) showTip(t, t.dataset.tip); });
    rail.addEventListener("mouseout", e => { const t = e.target.closest("[data-tip]"); if (t && !t.contains(e.relatedTarget)) hideTip(); });
    // floating: a click on the page or Escape puts it away
    // menus that open from the sidebar sit outside it: clicks inside them are not "the page"
    const MENUS = '[role="menu"], [role="listbox"], [role="dialog"], .ws-ms-menu--port, .rv, .rv-open';
    document.addEventListener("pointerdown", e => { if (S.wide && !S.pinned && !rail.contains(e.target) && !e.target.closest(MENUS)) toRail(); }, true);
    // a dialog opening (search, logging a query…) puts the floating sidebar away
    const dialogUp = () => [...document.querySelectorAll('[role="dialog"]')].some(d => !rail.contains(d) && d.offsetWidth > 0 && d.offsetHeight > 0 && !d.closest('.ws-ms-menu--port'));
    new MutationObserver(() => { if (S.wide && !S.pinned && dialogUp()) toRail(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    // narrow windows: a pinned sidebar shows as the rail until there is room again
    narrow.addEventListener("change", () => { if (S.pinned) { const keep = true; applyPinned(); } paint(); });
    window.addEventListener("keydown", e => { if (e.key === "Escape" && S.wide && !S.pinned) toRail(); });
    // [ toggles the new sidebar (and no longer the hidden one)
    window.addEventListener("keydown", e => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const a = document.activeElement; if (a && (/input|textarea|select/i.test(a.tagName) || a.isContentEditable)) return;
      e.preventDefault(); e.stopImmediatePropagation(); setWide(!S.wide);
    }, true);
    // follow the app: any change in the hidden sidebar's state re-syncs the rail
    watchSide();
  }

  // the app sometimes rebuilds its shell (settings pages): keep the rail in place and keep following the app's sidebar
  let sideObs;
  function watchSide() {
    sideObs?.disconnect();
    sideObs = new MutationObserver(() => { clearTimeout(watchSide.t); watchSide.t = setTimeout(sync, 0); });
    sideObs.observe(side, { subtree: true, attributes: true, attributeFilter: ["class", "aria-current", "aria-selected"], childList: true, characterData: true });
  }
  function ensure() {
    const s2 = document.getElementById("ws-sidebar");
    if (!s2) return;
    if (s2 !== side) { side = s2; watchSide(); }
    if (!rail.isConnected || rail.nextElementSibling !== side) side.parentNode.insertBefore(rail, side);
    sync();
  }

  // a small note panel (not part of the design)
  function panel() {
    const rv = document.createElement("div"); rv.className = "rv";
    rv.innerHTML = `<button class="rv-x" aria-label="Hide">×</button><h4>Slides over, pin to keep it open</h4>
      <p>Every page is real. Press [ or use the panel icon on the hawk: the full sidebar slides over the page. Pick a page, click the page or press Escape and it slides away.</p>
      <p>Press the pin at its top to keep it open: the page moves across to make room, and it stays pinned when you come back.</p>`;
    document.body.appendChild(rv);
    const reopen = document.createElement("button"); reopen.className = "rv-open"; reopen.textContent = "Notes"; document.body.appendChild(reopen);
    rv.querySelector(".rv-x").onclick = () => { rv.style.display = "none"; reopen.style.display = "block"; };
    reopen.onclick = () => { rv.style.display = ""; reopen.style.display = "none"; };
  }

  function mount() {
    side = document.getElementById("ws-sidebar");
    if (!side || document.querySelector(".qr")) return false;
    document.documentElement.classList.add("qr-mock");
    rail = document.createElement("aside");
    rail.className = "qr qr-sections qr-pill qr-rules f-serif qr-heavy qr-ground qr-quiet";
    rail.setAttribute("aria-label", "Main");
    side.parentNode.insertBefore(rail, side);
    document.body.appendChild(tip);
    build(); wire(); sync(); panel();
    new MutationObserver(() => { if (!rail.isConnected || document.getElementById("ws-sidebar") !== side) ensure(); }).observe(document.body, { childList: true, subtree: true });
    window.__railSync = sync; window.__railRebuild = () => { build(); sync(); paint(); };
    let w = false; try { w = localStorage.getItem("mock.railPinned") === "1"; } catch (e) {}
    // existing users: anyone who kept today's sidebar expanded starts pinned
    if (!w) { try { w = localStorage.getItem("mock.railPinned") === null && localStorage.getItem("scriptally:sidebar-collapsed") === "0"; } catch (e) {} }
    if (w) applyPinned();
    return true;
  }
  if (!mount()) {
    const mo = new MutationObserver(() => { if (mount()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
