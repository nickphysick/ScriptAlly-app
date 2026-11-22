// Submission packages v40 — flatten the v40 ref in its FROZEN state (body[data-sb=t][data-wh=c][data-tl=t1], TG t4,
// LAY tabs; the mock sets these itself on load). Copied from scripts/pk26/extract.cjs: the v40 REF, the v40 STATES,
// the two new portal roots (.shd, .lk-dlg) and DEAD, the mock's dead options, which are never walked.
// Flatten the v26 ref: for every rendered element in each state, the authored winning value of every
// property (var() resolved), plus pseudo-elements and :hover differences. Output: obs-<w>.json
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const REF = 'file://' + process.cwd() + '/design-refs/submission-packages-v38/submission-packages-v38.html';
const W = +process.argv[2] || 1512, H = W === 1512 ? 982 : W === 1280 ? 832 : 900;

// state builders, run in the page. Each returns nothing; the page re-renders.
const USE = `document.querySelector('[data-st="use"]').click();`;
const NEW = `document.querySelector('[data-st="new"]').click();`;
/* v38: only the parts this pack adds are walked — the labels row, the Figures button, the package drawer, the
   results band and the showcase rows. Everything else on the page keeps v40's generated sheet (p6). */
const PAGE = '#pkl, .po-fig, #bnr, #agg';
const DRW = '#drw > *';
const STATES = {
  use: [USE, PAGE],
  other: [USE + `document.querySelector('[data-pksel2="k2"]').click();`, PAGE],
  other3: [USE + `document.querySelector('[data-pksel2="k3"]').click();`, PAGE],
  showret: [USE + `document.querySelector('[data-pkf]').click();`, PAGE],
  pkd: [USE + `document.querySelector('.po-fig').click();`, DRW],
  pkd2: [USE + `document.querySelector('[data-pksel2="k2"]').click(); document.querySelector('.po-fig').click();`, DRW],
  pkd3: [USE + `document.querySelector('[data-pksel2="k3"]').click(); document.querySelector('.po-fig').click();`, DRW],
  ret: [USE + `document.querySelector('[data-pkf]').click(); document.querySelector('.pkl-b.ret').click();`, DRW],
  nores: [NEW, PAGE],
};
const DEAD = '.stsw, [data-st]';
const UA_KEEP = /^(margin|padding|border|font|background|color$|line-height|letter-spacing|text-align|text-transform|text-indent|list-style|appearance|cursor|box-sizing|outline|vertical-align|text-decoration)/;
const LOGICAL = [[/-block-start/, '-top'], [/-block-end/, '-bottom'], [/-inline-start/, '-left'], [/-inline-end/, '-right']];
const physical = (n) => {
  if (n === 'inset-block-start') return 'top'; if (n === 'inset-block-end') return 'bottom';
  if (n === 'inset-inline-start') return 'left'; if (n === 'inset-inline-end') return 'right';
  for (const [a, b] of LOGICAL) if (a.test(n)) return n.replace(a, b);
  if (n === 'inline-size') return 'width'; if (n === 'block-size') return 'height';
  if (n === 'min-inline-size') return 'min-width'; if (n === 'min-block-size') return 'min-height';
  if (n === 'max-inline-size') return 'max-width'; if (n === 'max-block-size') return 'max-height';
  return n;
};
const HOVER_PROPS = ['background-color', 'background-image', 'color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'box-shadow', 'transform', 'opacity', 'text-decoration-line', 'text-decoration-color', 'filter', 'visibility', 'display', 'outline-color', 'outline-style', 'width', 'max-width'];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto(REF); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  // freeze animations at their end so geometry is the settled one; keep the names
  const c = await p.context().newCDPSession(p); await c.send('DOM.enable'); await c.send('CSS.enable');
  const out = { w: W, states: {}, keyframes: {} };
  for (const [name, [js, ROOTS]] of Object.entries(STATES)) {
    await p.goto(REF); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(900);
    try { await p.evaluate(js); } catch (e) { console.error('state', name, e.message); continue; }
    await p.waitForTimeout(700);
    // tag rendered elements
    const meta = await p.evaluate(({ ROOTS, DEAD }) => {
      const roots = [...document.querySelectorAll(ROOTS)];
      const els = []; let i = 0;
      const visible = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && !e.closest('[hidden]'); };
      for (const r of roots) {
        if (!visible(r)) continue;
        /* ⚠️ AN ELEMENT THE REF HIDES WITH CSS IS RECORDED (with its display:none) BUT NOT DESCENDED INTO: the app
           renders the ref's markup, so a rule must exist to hide it there too. One hidden by the [hidden] attribute
           is skipped — the app does not render it at all. */
        const walk = (e) => { if (e.closest('[hidden]')) return; if (e.matches(DEAD)) return; if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') return;
          e.setAttribute('data-x', i++); els.push(e); if (getComputedStyle(e).display === 'none') return; for (const ch of e.children) walk(ch); };
        walk(r);
      }
      const tok = (e) => {
        if (e.matches('.ms25')) return 'ROOT';
        const cls = [...e.classList].filter((c) => c);
        let t = cls.length ? cls.map((c) => '.' + c).join('') : e.tagName.toLowerCase();
        if (!cls.length && e.id) t = e.tagName.toLowerCase() + '#' + e.id;
        for (const a of ['aria-selected', 'aria-pressed', 'aria-checked', 'aria-expanded']) if (e.getAttribute(a) === 'true') t += `[${a}="true"]`;
        if (e.hasAttribute('disabled')) t += '[disabled]';
        return t;
      };
      return els.map((e) => {
        const chain = []; let a = e.matches(ROOTS) ? null : e.parentElement;
        while (a && !a.matches('body')) { chain.push(tok(a)); if (a.matches(ROOTS)) break; a = a.parentElement; }
        const idx = [...e.parentElement.children].indexOf(e) + 1;
        const cs = getComputedStyle(e);
        const comp = {}; for (const k of cs) comp[k] = cs.getPropertyValue(k);
        const pse = {};
        for (const ps of ['::before', '::after', '::placeholder']) {
          const q = getComputedStyle(e, ps); if (ps !== '::placeholder' && (q.content === 'none' || q.content === 'normal')) continue;
          const o = {}; for (const k of q) o[k] = q.getPropertyValue(k); pse[ps] = o;
        }
        return { x: +e.getAttribute('data-x'), tag: e.tagName.toLowerCase(), tok: tok(e), chain, nth: idx, first: e.parentElement.firstElementChild === e, last: e.parentElement.lastElementChild === e, text: (e.childNodes[0]?.nodeType === 3 ? e.childNodes[0].textContent : '').trim().slice(0, 30), comp, pse,
          interactive: e.matches('button, a, label, [draggable="true"], [role="tab"], input, .exc, .lr, .xtb-r, .rs-r, .srcp, [contenteditable]') };
      });
    }, { ROOTS, DEAD });
    const { root } = await c.send('DOM.getDocument', { depth: -1 });
    const { nodeIds } = await c.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-x]' });
    const byX = {};
    for (const nid of nodeIds) {
      const { attributes } = await c.send('DOM.getAttributes', { nodeId: nid });
      const xi = attributes.indexOf('data-x'); byX[attributes[xi + 1]] = nid;
    }
    const rows = [];
    for (const m of meta) {
      const nid = byX[m.x]; if (!nid) continue;
      const ms = await c.send('CSS.getMatchedStylesForNode', { nodeId: nid });
      const resolve = (rules, compMap) => {
        const win = {}; // prop -> {v, imp, ua}
        for (const r of rules) {
          const ua = r.rule.origin === 'user-agent';
          for (const q of r.rule.style.cssProperties) {
            if (q.disabled || q.parsedOk === false || q.longhandProperties) continue;
            if (q.name === 'all') { for (const k of Object.keys(win)) delete win[k]; win.__all = { v: q.value, imp: !!q.important, ua }; continue; }
            const n = physical(q.name); if (ua && !UA_KEEP.test(n)) continue;
            const cur = win[n]; const imp = !!q.important;
            if (!cur || imp || !cur.imp) win[n] = { v: q.value, imp, ua };
            // pending longhand of a var() shorthand: value empty -> computed
          }
        }
        const outp = {};
        if (win.__all) { delete win.__all; outp.__all = '1'; }
        for (const [n, o] of Object.entries(win)) {
          let v = o.v;
          if (v === '' || /var\(|color-mix\(/.test(v)) v = compMap[n] !== undefined && compMap[n] !== '' ? compMap[n] : v;
          outp[n] = v;
        }
        return outp;
      };
      const auth = resolve(ms.matchedCSSRules, m.comp);
      const pseudo = {};
      for (const pe of ms.pseudoElements || []) {
        const key = '::' + pe.pseudoType.replace('_', '-'); if (!m.pse[key]) continue;
        pseudo[key] = { auth: resolve(pe.matches, m.pse[key]), comp: m.pse[key] };
      }
      for (const kr of ms.cssKeyframesRules || []) out.keyframes[kr.animationName.text] = kr.keyframes.map((k) => ({ key: k.keyText.text, props: k.style.cssProperties.filter((q) => !q.longhandProperties || true).map((q) => [q.name, q.value]) }));
      let hover = null;
      if (m.interactive) {
        const read = ({ x, HP }) => {
          const e = document.querySelector(`[data-x="${x}"]`); const res = [];
          for (const d of [e, ...e.querySelectorAll('[data-x]')]) {
            const cs = getComputedStyle(d); const o = {}; for (const k of HP) o[k] = cs.getPropertyValue(k);
            res.push([+d.getAttribute('data-x'), o]);
          }
          return res;
        };
        await p.evaluate(() => { const s = document.createElement('style'); s.id = 'notr'; s.textContent = '*,*::before,*::after{transition:none!important}'; document.head.appendChild(s); });
        const hb = await p.evaluate(read, { x: m.x, HP: HOVER_PROPS });
        await c.send('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: ['hover'] });
        const hv = await p.evaluate(read, { x: m.x, HP: HOVER_PROPS });
        await p.evaluate(() => document.getElementById('notr').remove());
        hover = { base: hb, hover: hv };
        if (false) hover = await p.evaluate(({ x, HP }) => {
          const e = document.querySelector(`[data-x="${x}"]`); const res = [];
          for (const d of [e, ...e.querySelectorAll('[data-x]')]) {
            const cs = getComputedStyle(d); const o = {}; for (const k of HP) o[k] = cs.getPropertyValue(k);
            res.push([+d.getAttribute('data-x'), o]);
          }
          return res;
        }, { x: m.x, HP: HOVER_PROPS });
        await c.send('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: [] });
      }
      rows.push({ ...m, auth, pseudo, hover });
    }
    out.states[name] = rows;
    console.error(name, rows.length);
  }
  fs.writeFileSync(`${process.env.PK26_OUT || "."}/obs38-${W}.json`, JSON.stringify(out));
  await b.close();
})();
