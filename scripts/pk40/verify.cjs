// Validate the generated CSS against the ref, independent of React: the ref's own rendered DOM, renamed to the
// p6- scheme, styled ONLY by the app's built stylesheet + base.css, screenshotted and diffed against the ref.
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const REF = 'file://' + process.cwd() + '/design-refs/submission-packages-v40/submission-packages-v40.html';
const APPCSS = fs.readdirSync(process.cwd() + '/dist/assets').find((f) => /^index-.*\.css$/.test(f));
const W = +(process.argv[2] || 1512), H = W === 1512 ? 982 : 832;
const states = (process.argv[3] || 'use').split(',');
// the app bundle carries the page's own hand rules for .p6 markup; rename the harness's prefix so only the
// generated sheet styles it, with the bundle supplying tokens and fonts
const gen = fs.readFileSync(process.argv[4] || 'base.css', 'utf8').replace(/\bp6(?=[-\s.,:>{)\[])/g, 'q6');
const USE = `document.querySelector('[data-st="use"]').click();`;
const STATES = { // the v40 builders, as extract.cjs
  use: USE,
  shelfDrawer: USE + `document.querySelector('.sh-tile[data-shelf]').click();`,
  guidelines: USE + `document.querySelector('.pkgl').open=true;`,
  tpB: USE + `document.querySelector('[data-tpv="b"]').click();`,
  tpC: USE + `document.querySelector('[data-tpv="c"]').click();`,
  let: USE + `document.querySelector('.ptab[data-pg="let"]').click();`,
  syn: USE + `document.querySelector('.ptab[data-pg="syn"]').click();`,
  drawer: USE + `document.querySelector('.mr-b[data-mat^="let"]').click();`,
  dlgNew: USE + `document.querySelector('.wbh-b').click();`,
  start: USE + `(async () => { for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 500)); const d = document.querySelector('#pkOpen [data-delpk]'); if (!d) break; d.click(); } await new Promise((r) => setTimeout(r, 600)); })()`,
  new: `document.querySelector('[data-st="new"]').click();`,
  newLet: `document.querySelector('[data-st="new"]').click(); document.querySelector('.ptab[data-pg="let"]').click();`,
};
const DEAD = '.sh-list, .sh-strip, .tg-seg, .tg-pick, .dd2, .lay-sw, .pcar, .hdsw, .lk-sw, .stsw';
(async () => {
  const b = await chromium.launch();
  for (const st of states) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(REF); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200);
    await p.evaluate(STATES[st]); await p.waitForTimeout(800);
    // stop every animation at its end so both sides compare settled frames
    await p.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}' });
    await p.waitForTimeout(300);
    const grab = await p.evaluate((DEAD) => {
      const ms = document.querySelector('.ms25');
      const r = ms.getBoundingClientRect();
      document.querySelectorAll('*').forEach((e) => { if (!(e instanceof SVGElement) && (getComputedStyle(e).display === 'none' || e.matches(DEAD))) e.setAttribute('data-gone', ''); });
      const conv = (root) => {
        const c = root.cloneNode(true);
        c.querySelectorAll('[data-gone]').forEach((e) => e.remove());
        const all = [c, ...c.querySelectorAll('*')];
        for (const e of all) {
          if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') continue;
          const cls = [...e.classList];
          if (cls.length) e.setAttribute('class', cls.map((x) => 'p6-' + x).join(' '));
          if (e.id && !cls.length) { e.classList.add('p6-id-' + e.id); }
          if (e.id) e.removeAttribute('id');
        }
        return c;
      };
      const msc = conv(ms); msc.setAttribute('class', document.body.classList.contains('st-new') ? 'p6 p6-new' : 'p6');
      const layers = ['#drw', '#dim', '#pdlg', '#toast', '#hwm', '.shd'].map((s) => document.querySelector(s)).filter((e) => e && getComputedStyle(e).display !== 'none').map((e) => conv(e).outerHTML);
      return { html: msc.outerHTML, layers, rect: { x: r.x, y: r.y, w: r.width, h: ms.scrollHeight }, scrollW: document.querySelector('#scroll').clientWidth };
    }, DEAD);
    // reference shot: the whole content column, unclipped
    await p.evaluate(() => { const s = document.querySelector('#scroll'); s.style.overflow = 'visible'; s.style.height = 'auto'; document.querySelector('.main').style.height = 'auto'; document.querySelector('.app').style.height = 'auto'; document.body.style.height = 'auto'; });
    const ms = await p.$('.ms25');
    await ms.screenshot({ path: `${process.env.PK26_OUT || '.'}/v-${st}-${W}-ref.png` });
    const box = await ms.boundingBox();
    // harness: app CSS + generated CSS, nothing else
    const h = await b.newPage({ viewport: { width: W, height: H } });
    await h.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
      <style>${fs.readFileSync(process.cwd() + "/dist/assets/" + APPCSS, "utf8")}</style>
      <style>${gen}</style>
      <style>*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important} body{margin:0;background:#f4eee5}</style>
      </head><body><div id="w" style="width:${box.width}px;container-type:inline-size;container-name:main">${grab.html.replace(/\bp6(?=[-\s"])/g, 'q6')}</div><div class="q6-layer">${grab.layers.join('').replace(/\bp6(?=[-\s"])/g, 'q6')}</div></body></html>`, { waitUntil: 'networkidle' });
    await h.evaluate(() => document.fonts.ready); await h.waitForTimeout(300);
    if (process.env.PK40_DBG) console.log(await h.evaluate((q) => { const e = document.querySelector(q); if (!e) return 'none ' + q; const c = getComputedStyle(e); return [e.className, c.fontFamily, c.fontSize, document.fonts.check('16px "Special Elite"'), [...document.styleSheets].length]; }, process.env.PK40_DBG));
    const el = await h.$('#w');
    await el.screenshot({ path: `${process.env.PK26_OUT || '.'}/v-${st}-${W}-gen.png` });
    // diff, in a canvas
    const a64 = fs.readFileSync(`${process.env.PK26_OUT || '.'}/v-${st}-${W}-ref.png`).toString('base64'), b64 = fs.readFileSync(`${process.env.PK26_OUT || '.'}/v-${st}-${W}-gen.png`).toString('base64');
    const dp = await b.newPage();
    const res = await dp.evaluate(async ({ a64, b64, dy }) => {
      const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
      const [A, B] = await Promise.all([load(a64), load(b64)]);
      const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
      const ca = new OffscreenCanvas(w, h), cb = new OffscreenCanvas(w, h);
      ca.getContext('2d').drawImage(A, 0, 0); cb.getContext('2d').drawImage(B, 0, -dy);
      const da = ca.getContext('2d').getImageData(0, 0, w, h).data, db = cb.getContext('2d').getImageData(0, 0, w, h).data;
      const out = new OffscreenCanvas(w, h); const ox = out.getContext('2d'); const od = ox.createImageData(w, h);
      let bad = 0;
      for (let k = 0; k < da.length; k += 4) {
        const d = Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]);
        const off = d > 60; if (off) bad++;
        od.data[k] = off ? 255 : da[k] * 0.35; od.data[k + 1] = off ? 0 : da[k + 1] * 0.35; od.data[k + 2] = off ? 0 : da[k + 2] * 0.35; od.data[k + 3] = 255;
      }
      ox.putImageData(od, 0, 0);
      const blob = await out.convertToBlob(); const buf = await blob.arrayBuffer();
      let bin = ''; const u = new Uint8Array(buf); for (let q = 0; q < u.length; q++) bin += String.fromCharCode(u[q]);
      return { aw: A.width, ah: A.height, bw: B.width, bh: B.height, pct: (100 * bad / (w * h)).toFixed(2), png: btoa(bin) };
    }, { a64, b64, dy: +(process.env.PK40_DY || 0) });
    fs.writeFileSync(`${process.env.PK26_OUT || '.'}/v-${st}-${W}-diff.png`, Buffer.from(res.png, 'base64'));
    console.log(st, W, 'ref', res.aw, res.ah, 'gen', res.bw, res.bh, 'differing', res.pct + '%');
    await dp.close();
    await p.close(); await h.close();
  }
  await b.close();
})();
