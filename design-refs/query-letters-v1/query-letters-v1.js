/* Mock only: the Query letters page (new) and a stand-in for Versions, shown inside the real app's page sheet,
   plus the folder tabs for the Materials and Your book groups and the mock's notes panel. */
(() => {
  const QV = { page: null };
  window.__qv = QV;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ic = {
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    pen: '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    star: '<path d="M11.5 2.6a.6.6 0 0 1 1 0l2.6 5.3 5.8.8a.6.6 0 0 1 .3 1l-4.2 4.1 1 5.8a.6.6 0 0 1-.8.6L12 17.5l-5.2 2.7a.6.6 0 0 1-.8-.6l1-5.8-4.2-4.1a.6.6 0 0 1 .3-1l5.8-.8z"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
    folder: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  };
  const svg = (k, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[k]}</svg>`;

  /* ── the writer's letters (mock data, for the seed account's Murphy's Day Out) ── */
  const BODY = {
    v1: `Dear [Agent],

I am seeking representation for MURPHY'S DAY OUT, an adult thriller complete at 50,000 words. I am querying you because you represent crime fiction with a strong sense of place.

Harbour pilot Tess Murphy hasn't taken a day off in eleven years. When she finally does, the ferry she should have been steering comes into Kilmore harbour with no one at the wheel and one passenger fewer than it left with.

The coastguard calls it an accident. Tess knows the water too well to believe it, and by nightfall she has twelve hours, a borrowed boat and a list of everyone who knew she wouldn't be on board.

I grew up in a fishing town on the Antrim coast and worked for six years on the Larne crossing. This is my first novel.

Thank you for your time and consideration.`,
    v2: `Dear [Agent],

The one day harbour pilot Tess Murphy takes off in eleven years, her ferry comes home with no one at the wheel.

MURPHY'S DAY OUT is an adult thriller complete at 50,000 words, and will appeal to readers of THE TIDEWATER LINE and viewers of NINE MILES OUT.

The coastguard calls it an accident. Tess knows the water too well to believe it. By nightfall she has twelve hours, a borrowed boat and a list of everyone who knew she wouldn't be on board, and the list starts with her brother.

I grew up in a fishing town on the Antrim coast and spent six years crewing the Larne crossing, which is where this book began.

Thank you for your time and consideration.`,
    v3: `Dear [Agent],

The one day harbour pilot Tess Murphy takes off in eleven years, her ferry comes home with no one at the wheel.

The coastguard calls it an accident. Tess knows the water too well to believe it. By nightfall she has twelve hours, a borrowed boat and a list of everyone who knew she wouldn't be on board, and the list starts with her brother.

MURPHY'S DAY OUT is an adult thriller complete at 50,000 words: for readers of THE TIDEWATER LINE and SALT ROAD.

I spent six years crewing the Larne crossing. This is my first novel.

Thank you for your time and consideration.`,
    v4: `Dear [Agent],

Tess Murphy has piloted every ship into Kilmore harbour for eleven years. On her one day off, the ferry comes home empty.

`,
  };
  const LETTERS = [
    { id: "v3", name: "Query letter v3", note: "Comps moved under the pitch; shorter bio", saved: "25 Sep", words: 182, sent: 9, replies: 4, more: 2, inUse: true, comps: [["The Tidewater Line", "book"], ["Salt Road", "book"]], pkgs: ["Coastal"], from: "v2",
      changes: ["Comps now follow the pitch", "Bio cut to one line"] },
    { id: "v2", name: "Query letter v2", note: "Opens on the hook; comps added", saved: "20 May", words: 176, sent: 22, replies: 11, more: 3, comps: [["The Tidewater Line", "book"], ["Nine Miles Out", "film"]], pkgs: ["Light", "Standard"], from: "v1",
      changes: ["Hook moved to the first line", "Added two comps", "Brother named in the stakes"] },
    { id: "v1", name: "Query letter v1", note: "The first letter", saved: "1 Mar", words: 171, sent: 18, replies: 9, more: 1, comps: [], pkgs: ["Original"], from: null, changes: [] },
    { id: "v4", name: "Open on the harbour", note: "Draft, not sent yet", saved: "3 Nov", words: 31, sent: 0, replies: 0, more: 0, draft: true, comps: [], pkgs: [], from: "v3", changes: ["New opening line"] },
  ];
  const AGENTS = [
    ["Clara Beaumont", "Harbour Lane", "Partial requested", "2 Nov", "more"],
    ["Wren Ashcombe", "Ashcombe Literary", "Waiting", "28 Oct", ""],
    ["George Ashworth", "Ashworth Literary", "Passed", "20 Oct", "no"],
    ["Hester Blaine", "Blaine & Vole", "Full requested", "14 Oct", "more"],
    ["Noah Bright", "Bright Literary", "Waiting", "9 Oct", ""],
    ["Cormac Bligh", "Bligh & Sons", "Passed", "2 Oct", "no"],
  ];
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const L = (id) => LETTERS.find(l => l.id === id);

  /* ── the page ── */
  function sheetLines(l) {
    const paras = BODY[l.id].split("\n\n").slice(0, 4);
    return paras.map(p => `<p>${esc(p)}</p>`).join("");
  }
  function card(l) {
    const rate = pct(l.more, l.sent);
    const foot = l.draft
      ? `<span class="qv-cf-draft">Not sent yet</span>`
      : `<span class="qv-cf-n"><b>${l.sent}</b> sent</span><span class="qv-cf-n"><b>${l.more}</b> asked for more</span><span class="qv-cf-bar" title="${rate}% asked for more"><i style="width:${Math.max(rate, 3) * 3}%"></i></span>`;
    return `<button class="qv-card${l.inUse ? " qv-inuse" : ""}${l.draft ? " qv-draft" : ""}" data-open="${l.id}">
      <span class="qv-paper">${l.inUse ? '<span class="qv-flag">In use for new queries</span>' : l.draft ? '<span class="qv-flag qv-flag--d">Draft</span>' : ""}<span class="qv-lines">${sheetLines(l)}</span></span>
      <span class="qv-cbody"><span class="qv-cname">${esc(l.name)}</span><span class="qv-cnote">${esc(l.note)} · saved ${l.saved}</span><span class="qv-cfoot">${foot}</span></span>
    </button>`;
  }
  function table() {
    const rows = LETTERS.filter(l => !l.draft).map(l => {
      const r = pct(l.more, l.sent), rr = pct(l.replies, l.sent);
      return `<tr data-open="${l.id}"><th scope="row"><span class="qv-tn">${esc(l.name)}</span>${l.inUse ? '<span class="qv-tuse">In use</span>' : ""}<small>${esc(l.note)}</small></th>
        <td>${l.sent}</td><td>${l.replies} <small>(${rr}%)</small></td><td class="qv-tmore"><b>${l.more}</b><span class="qv-tbar"><i style="width:${r * 3}%"></i></span><span class="qv-tpc">${r}%</span></td>
        <td>${l.sent < 15 ? '<span class="qv-early">Early days: only ' + l.sent + " sent</span>" : '<span class="qv-ok">Enough to go on</span>'}</td></tr>`;
    }).join("");
    return `<table class="qv-table"><thead><tr><th>Letter</th><th>Sent with</th><th>Replies</th><th>Asked for more</th><th>How sure</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function lettersPage() {
    const use = LETTERS.find(l => l.inUse), r = pct(use.more, use.sent);
    const sent = LETTERS.filter(l => !l.draft);
    return `<div class="qv-wrap">
      <header class="qv-head">
        <img class="qv-hawk" src="./images/dash/courier.png" alt="">
        <div class="qv-hm">
          <h1 class="qv-title">${LETTERS.length} query letters</h1>
          <p class="qv-by"><i></i><span><em>for</em> <b>Murphy's Day Out</b></span><i></i></p>
          <p class="qv-sub">Write and keep every version of your letter, then see which one gets agents asking for more.</p>
          <div class="qv-acts"><button class="qv-b1" data-new>${svg("plus", 2.2)}New letter</button><button class="qv-b2" data-jump>Which letter is landing?</button></div>
        </div>
        <div class="qv-use">
          <div class="qv-use-l"><span class="qv-use-k">Going out with new queries</span><b class="qv-use-n">${esc(use.name)}</b><span class="qv-use-d">${esc(use.note)}</span><button class="qv-use-ch" data-change>Change</button></div>
          <div class="qv-use-r"><span class="qv-ring" style="--p:${r}"><b>${use.more}<small>/${use.sent}</small></b></span><span class="qv-use-rl">asked for more</span></div>
        </div>
      </header>

      <section class="qv-sec">
        <div class="qv-sech"><h2>Your letters</h2><span class="qv-sech-r">Click a letter to read, edit or see how it\'s doing</span></div>
        <div class="qv-grid">
          ${LETTERS.map(card).join("")}
          <button class="qv-card qv-new" data-new><span class="qv-new-in"><img src="./images/dash/quill.png" alt=""><b>Write a new letter</b><span>Start from scratch, or from a copy of one you've sent.</span></span></button>
        </div>
      </section>

      <section class="qv-band" id="qv-landing">
        <div class="qv-band-in">
          <div class="qv-band-h"><img src="./images/qc/qc-inkwell.png" alt=""><div><h2>Which letter is landing?</h2><p>Every query remembers the letter it went with. Here's how each one is doing with agents.</p></div></div>
          <div class="qv-tcard">${table()}
            <p class="qv-tnote">"Asked for more" counts partial and full requests. A letter needs about 15 queries before its rate means much, so v3's figure will settle as it goes out.</p></div>
        </div>
      </section>
    </div>
    <div class="qv-lock" hidden>
      <div class="qv-lockc">
        <span class="qv-lock-ic">${svg("lock", 1.8)}</span>
        <h2>Query letters is part of Pro</h2>
        <p>Keep every version of your letter in one place, pick which one goes with each query, and see which gets agents asking for more.</p>
        <p class="qv-lock-free">On Free, your queries still record that a query letter went.</p>
        <div class="qv-acts"><button class="qv-b1">See Pro plans</button><button class="qv-b2" data-unfree>Not now</button></div>
      </div>
    </div>`;
  }
  function versionsPage() {
    return `<div class="qv-wrap qv-vs"><div class="qv-stub">
      <img src="./images/dash/archivist-looking.png" alt="">
      <h1 class="qv-title">Versions</h1>
      <p>The Versions page is already built on dev. It stands in here so you can see where it sits: under <b>Your book</b>, beside Manuscripts.</p>
      <p class="qv-stub-s">The synopsis would also live with the book, on the Manuscripts page.</p>
    </div></div>`;
  }

  /* ── drawer ── */
  let drawer;
  function openDrawer(id, mode) {
    closeDrawer(true);
    const l = id ? L(id) : null, isNew = !l;
    const tab = mode || "letter";
    const r = l ? pct(l.more, l.sent) : 0;
    const prev = l && l.from ? L(l.from) : null;
    const letterTab = isNew ? `
      <label class="qv-f"><span>Name</span><input value="" placeholder="e.g. Query letter v4, or Open on the harbour"></label>
      <div class="qv-f"><span>Start from</span><div class="qv-seg"><button class="on">A copy of v3 (in use)</button><button>A blank page</button><button>${svg("clip", 1.8)}Upload a file</button></div></div>
      <label class="qv-f"><span>What's different from v3?</span><input placeholder="e.g. Opens on the harbour, not the ferry"></label>
      <div class="qv-f"><span>The letter</span><div class="qv-sheet" contenteditable="true">${esc(BODY.v3).replace(/\n/g, "<br>")}</div></div>`
      : `
      ${prev ? `<div class="qv-chg"><span class="qv-chg-a">${esc(prev.name)}</span><span class="qv-chg-ar">${svg("arrow", 1.8)}</span><ul>${l.changes.map(c => `<li>${esc(c)}</li>`).join("")}</ul><span class="qv-chg-ar">${svg("arrow", 1.8)}</span><span class="qv-chg-b">${esc(l.name)}</span></div>` : `<div class="qv-chg qv-chg--root">Your first letter. Later letters show what changed from the one before.</div>`}
      <div class="qv-sheet" data-sheet>${esc(BODY[l.id]).replace(/\n/g, "<br>")}</div>
      <div class="qv-meta">
        <div><h4>Comps it names</h4>${l.comps.length ? l.comps.map(([t, k]) => `<span class="qv-chip">${svg(k === "film" ? "film" : "book", 1.8)}${esc(t)}</span>`).join("") : '<span class="qv-none">None named</span>'}<button class="qv-lnk">+ Log a comp from your library</button></div>
        <div><h4>In packages</h4>${l.pkgs.length ? l.pkgs.map(p => `<span class="qv-chip qv-chip--pk">${svg("folder", 1.8)}${esc(p)}</span>`).join("") : '<span class="qv-none">Not in a package yet</span>'}</div>
      </div>`;
    const statsTab = isNew || l.draft ? `<p class="qv-none qv-pad">Once this letter goes out with a query, you'll see how agents respond to it here.</p>` : `
      <div class="qv-cells"><div><b>${l.sent}</b><span>queries sent with it</span></div><div><b>${l.replies}</b><span>replies</span></div><div><b>${l.more}</b><span>asked for more (${r}%)</span></div></div>
      <h4 class="qv-h4">Queries it went out with</h4>
      <ul class="qv-q">${AGENTS.slice(0, Math.min(6, l.sent)).map(([n, a, st, d, k]) => `<li><span class="qv-qi">${n.split(" ").map(w => w[0]).join("")}</span><span class="qv-qn"><b>${n}</b><small>${a}</small></span><span class="qv-qs qv-qs--${k || "w"}">${st}</span><span class="qv-qd">${d}</span></li>`).join("")}</ul>
      ${l.sent > 6 ? `<button class="qv-lnk">See all ${l.sent} in the Query Centre</button>` : ""}`;
    drawer = document.createElement("div");
    drawer.className = "qv-drw-wrap";
    drawer.innerHTML = `<div class="qv-scrim"></div><aside class="qv-drw" role="dialog" aria-label="${isNew ? "New letter" : esc(l.name)}">
      <div class="qv-dh"><span class="qv-dic">${svg(isNew ? "plus" : "pen", 1.9)}</span><div class="qv-dht"><h3>${isNew ? "New query letter" : esc(l.name)}</h3><span>${isNew ? "for Murphy's Day Out" : l.draft ? `Draft · saved ${l.saved} · ${l.words} words` : `Sent with ${l.sent} queries · ${l.words} words${l.inUse ? " · in use for new queries" : ""}`}</span>
        ${isNew ? "" : `<div class="qv-tabs" role="tablist"><button role="tab" data-tab="letter" aria-selected="${tab === "letter"}">The letter</button><button role="tab" data-tab="stats" aria-selected="${tab === "stats"}">How it's doing</button></div>`}</div>
        <button class="qv-dx" aria-label="Close">${svg("x", 2)}</button></div>
      <div class="qv-db"><div class="qv-pane" data-pane="letter"${tab === "letter" ? "" : " hidden"}>${letterTab}</div><div class="qv-pane" data-pane="stats"${tab === "stats" ? "" : " hidden"}>${statsTab}</div></div>
      <div class="qv-df">${isNew ? `<span class="qv-dfn">Saved letters can be picked in any package.</span><button class="qv-b2" data-close>Cancel</button><button class="qv-b1" data-close>Save letter</button>`
        : `<span class="qv-dfn">${l.sent ? "Sent letters stay as they went." : "Not sent yet, so edit it freely."}</span>
           <button class="qv-b2" data-dup>${svg("copy", 1.8)}Copy to a new letter</button>${l.sent ? "" : `<button class="qv-b2" data-edit>${svg("pen", 1.8)}Edit</button>`}${l.inUse ? "" : `<button class="qv-b1" data-close>Use for new queries</button>`}`}</div>
    </aside>`;
    document.body.appendChild(drawer);
    requestAnimationFrame(() => drawer.classList.add("on"));
    drawer.addEventListener("click", e => {
      if (e.target.closest(".qv-dx, .qv-scrim, [data-close]")) return closeDrawer();
      const t = e.target.closest("[data-tab]"); if (t) { drawer.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b === t))); drawer.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== t.dataset.tab); return; }
      if (e.target.closest("[data-dup]")) return openDrawer(null);
      if (e.target.closest("[data-edit]")) { const s = drawer.querySelector("[data-sheet]"); s.contentEditable = "true"; s.classList.add("qv-editing"); s.focus(); }
      const sg = e.target.closest(".qv-seg button"); if (sg) sg.parentNode.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === sg));
    });
  }
  function closeDrawer(now) {
    if (!drawer) return; const d = drawer; drawer = null;
    if (now) return d.remove();
    d.classList.remove("on"); setTimeout(() => d.remove(), 260);
  }
  window.addEventListener("keydown", e => { if (e.key === "Escape" && drawer) { e.stopImmediatePropagation(); closeDrawer(); } }, true);

  /* ── showing a mock page inside the real sheet ── */
  let host;
  function show(p) {
    const win = $(".ws-window"); if (!win) return;
    QV.page = p;
    if (!host || !host.isConnected) { host = document.createElement("div"); host.className = "qv-page"; win.appendChild(host); }
    host.innerHTML = p === "ql" ? lettersPage() : versionsPage();
    host.scrollTop = 0;
    document.documentElement.classList.add("qv-on");
    applyFree();
    tabs(); window.__railSync && window.__railSync();
  }
  function hide() {
    if (!QV.page) return;
    QV.page = null; closeDrawer(true);
    document.documentElement.classList.remove("qv-on");
    host && host.remove(); host = null;
    tabs(); window.__railSync && window.__railSync();
  }
  QV.show = show; QV.hide = hide;
  document.addEventListener("click", e => {
    if (!host || !host.contains(e.target)) return;
    const o = e.target.closest("[data-open]"); if (o) return openDrawer(o.dataset.open);
    if (e.target.closest("[data-new]")) return openDrawer(null);
    if (e.target.closest("[data-jump]")) return host.querySelector("#qv-landing").scrollIntoView({ behavior: "smooth", block: "start" });
    if (e.target.closest("[data-change]")) return openDrawer("v2");
    if (e.target.closest("[data-unfree]")) return setFree(false);
  });
  // the app moving on by itself (search, a dashboard link, Back) leaves the mock page
  const onNav = () => { if (QV.page) setTimeout(() => { if (QV.page && QV.at !== location.pathname) hide(); }, 0); };
  for (const m of ["pushState", "replaceState"]) { const f = history[m]; history[m] = function () { const r = f.apply(this, arguments); onNav(); return r; }; }
  window.addEventListener("popstate", onNav);
  const _show = show; QV.show = (p) => { QV.at = location.pathname; _show(p); };

  /* ── folder tabs: the group's pages as sibling tabs ── */
  const GROUPS = { materials: ["ql", "co", "pk"], book: ["ms", "vs"] };
  const NAMES = { ql: "Query letters", co: "Comparable titles", pk: "Submission packages", ms: "Manuscripts", vs: "Versions" };
  const GTAG = { materials: "Materials", book: "Your book" };
  const BY_NAME = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [v, k]));
  const wantPage = () => {
    const bar = $(".ws-pagebar"); if (!bar) return null;
    if (QV.page) return QV.page;
    const realName = (bar.querySelector(":scope > .ws-ftab .ws-ftn")?.textContent || "").trim();
    return BY_NAME[realName] || null;
  };
  function tabs() {
    const bar = $(".ws-pagebar"); if (!bar) return;
    bar.querySelector(".qv-ftabs")?.remove();
    const page = wantPage();
    const grp = page && Object.keys(GROUPS).find(g => GROUPS[g].includes(page));
    document.documentElement.classList.toggle("qv-grp", !!grp);
    if (!grp) return;
    const ft = bar.querySelector(":scope > .ws-ftab"), sibTpl = bar.querySelector(":scope > .ws-ftsibs:not(.ws-ftmeasure) .ws-ftsib");
    if (!ft) return;
    const wrap = document.createElement("span"); wrap.className = "qv-ftabs"; wrap.dataset.page = page;
    const mine = ft.cloneNode(true);
    const tg = mine.querySelector(".ws-ftg"); if (tg) tg.textContent = GTAG[grp];
    mine.querySelector(".ws-ftn").textContent = NAMES[page];
    wrap.appendChild(mine);
    const sibs = document.createElement("span"); sibs.className = "ws-ftsibs";
    GROUPS[grp].filter(p => p !== page).forEach(p => {
      const b = sibTpl ? sibTpl.cloneNode(false) : document.createElement("button");
      b.className = "ws-ftsib"; b.textContent = NAMES[p]; b.dataset.qvgo = p; b.type = "button"; sibs.appendChild(b);
    });
    wrap.appendChild(sibs);
    bar.insertBefore(wrap, bar.firstChild);
    sibs.style.left = (mine.offsetWidth + 16) + "px";
  }
  QV.tabs = tabs;
  document.addEventListener("click", e => { const b = e.target.closest("[data-qvgo]"); if (b) { e.preventDefault(); e.stopPropagation(); window.__railGo(b.dataset.qvgo); } }, true);
  // keep the tabs right as the app re-renders its own bar
  new MutationObserver(() => { clearTimeout(tabs.t); tabs.t = setTimeout(() => {
    const bar = $(".ws-pagebar"); if (!bar) return;
    const want = wantPage(), cur = bar.querySelector(".qv-ftabs")?.dataset.page || null;
    const wantGrp = want && Object.keys(GROUPS).some(g => GROUPS[g].includes(want));
    if ((wantGrp ? want : null) !== cur) tabs();
    realLock();
  }, 30); }).observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ── Free or founding view ── */
  let free = false;
  function applyFree() {
    document.documentElement.classList.toggle("qv-free", free);
    const lock = host && host.querySelector(".qv-lock"); if (lock) lock.hidden = !free || QV.page !== "ql";
    document.querySelectorAll(".rv-who button").forEach(b => b.classList.toggle("on", (b.dataset.who === "free") === free));
  }
  function setFree(f) { free = f; applyFree(); realLock(); }
  function realLock() {
    const win = $(".ws-window"); if (!win) return;
    const page = wantPage(), on = free && !QV.page && (page === "co" || page === "pk");
    let lk = win.querySelector(":scope > .qv-reallock");
    if (!on) { lk && lk.remove(); return; }
    if (lk) return;
    lk = document.createElement("div"); lk.className = "qv-reallock qv-lock";
    lk.innerHTML = `<div class="qv-lockc"><span class="qv-lock-ic">${svg("lock", 1.8)}</span><h2>Materials is part of Pro</h2><p>Query letters, comparable titles and submission packages: keep them together, send the right ones with each query, and see what's working.</p><p class="qv-lock-free">On Free, your queries still record that a letter, synopsis and pages went.</p><div class="qv-acts"><button class="qv-b1">See Pro plans</button><button class="qv-b2" data-unfree>Not now</button></div></div>`;
    lk.addEventListener("click", e => { if (e.target.closest("[data-unfree]")) setFree(false); });
    win.appendChild(lk);
  }
  QV.realLock = realLock;

  /* ── notes panel ── */
  QV.panel = () => {
    const rv = document.createElement("div"); rv.className = "rv";
    rv.innerHTML = `<button class="rv-x" aria-label="Hide">×</button><h4>Your book · Materials</h4>
      <p>The rail now has <b>Your book</b> (Manuscripts, Versions) and <b>Materials</b> (Query letters, Comparable titles, Packages). Analytics has moved to the end of Queries, and Calendar has gone.</p>
      <p><b>Query letters</b> is the new page. Comps and Packages are today's pages. Versions is a stand-in, because it only exists on dev.</p>
      <p class="rv-k">View as</p>
      <div class="rv-who"><button data-who="founding" class="on">Founding writer</button><button data-who="free">Free writer</button></div>
      <p class="rv-s">A Free writer sees the Pro marks and the locked Query letters page. Founding writers see neither.</p>`;
    document.body.appendChild(rv);
    const reopen = document.createElement("button"); reopen.className = "rv-open"; reopen.textContent = "Notes"; document.body.appendChild(reopen);
    rv.querySelector(".rv-x").onclick = () => { rv.style.display = "none"; reopen.style.display = "block"; };
    reopen.onclick = () => { rv.style.display = ""; reopen.style.display = "none"; };
    rv.addEventListener("click", e => { const b = e.target.closest("[data-who]"); if (b) setFree(b.dataset.who === "free"); });
  };
})();
