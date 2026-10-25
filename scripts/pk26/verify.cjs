// Validate the generated CSS against the ref, independent of React: the ref's own rendered DOM, renamed to the
// p6- scheme, styled ONLY by the app's built stylesheet + base.css, screenshotted and diffed against the ref.
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const REF = 'file://' + process.cwd() + '/design-refs/submission-packages-v26/submission-packages-v26.html';
const APPCSS = fs.readdirSync(process.cwd() + '/dist/assets').find((f) => /^index-.*\.css$/.test(f));
const W = +(process.argv[2] || 1512), H = W === 1512 ? 982 : 832;
const states = (process.argv[3] || 'use').split(',');
const gen = fs.readFileSync(process.argv[4] || 'base.css', 'utf8');
const STATES = { // same builders as extract.cjs
  use: `document.querySelector('[data-st="use"]').click();`,
  let: `document.querySelector('.ptab[data-pg="let"]').click();`,
  drawer: `document.querySelector('.mr-b[data-mat^="let"]').click();`,
  dlgNew: `document.querySelector('.pkb.new').click();`,
  new: `document.querySelector('[data-st="new"]').click();`,
  expop: `document.querySelector('.exa-b').click();`,
};
(async () => {
  const b = await chromium.launch();
  for (const st of states) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(REF); await p.evaluate(() => document.fonts.ready);
    await p.evaluate(STATES[st]);
    // stop every animation at its end so both sides compare settled frames
    await p.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}' });
    await p.waitForTimeout(300);
    const grab = await p.evaluate(() => {
      const ms = document.querySelector('.ms25');
      const r = ms.getBoundingClientRect();
      document.querySelectorAll('*').forEach((e) => { if (!(e instanceof SVGElement) && getComputedStyle(e).display === 'none') e.setAttribute('data-gone', ''); });
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
      const layers = ['#drw', '#dim', '#pdlg', '#toast', '#hwm'].map((s) => document.querySelector(s)).filter((e) => e && getComputedStyle(e).display !== 'none').map((e) => conv(e).outerHTML);
      return { html: msc.outerHTML, layers, rect: { x: r.x, y: r.y, w: r.width, h: ms.scrollHeight }, scrollW: document.querySelector('#scroll').clientWidth };
    });
    // reference shot: the whole content column, unclipped
    await p.evaluate(() => { const s = document.querySelector('#scroll'); s.style.overflow = 'visible'; s.style.height = 'auto'; document.querySelector('.main').style.height = 'auto'; document.querySelector('.app').style.height = 'auto'; document.body.style.height = 'auto'; });
    const ms = await p.$('.ms25');
    await ms.screenshot({ path: `v-${st}-${W}-ref.png` });
    const box = await ms.boundingBox();
    // harness: app CSS + generated CSS, nothing else
    const h = await b.newPage({ viewport: { width: W, height: H } });
    await h.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="file://${process.cwd()}/dist/assets/${APPCSS}">
      <style>${gen}</style>
      <style>*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important} body{margin:0;background:#f4eee5}</style>
      </head><body><div id="w" style="width:${box.width}px;container-type:inline-size;container-name:main">${grab.html}</div><div class="p6-layer">${grab.layers.join('')}</div></body></html>`, { waitUntil: 'networkidle' });
    await h.evaluate(() => document.fonts.ready); await h.waitForTimeout(300);
    const el = await h.$('#w');
    await el.screenshot({ path: `v-${st}-${W}-gen.png` });
    // diff, in a canvas
    const a64 = fs.readFileSync(`v-${st}-${W}-ref.png`).toString('base64'), b64 = fs.readFileSync(`v-${st}-${W}-gen.png`).toString('base64');
    const dp = await b.newPage();
    const res = await dp.evaluate(async ({ a64, b64 }) => {
      const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
      const [A, B] = await Promise.all([load(a64), load(b64)]);
      const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
      const ca = new OffscreenCanvas(w, h), cb = new OffscreenCanvas(w, h);
      ca.getContext('2d').drawImage(A, 0, 0); cb.getContext('2d').drawImage(B, 0, 0);
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
    }, { a64, b64 });
    fs.writeFileSync(`v-${st}-${W}-diff.png`, Buffer.from(res.png, 'base64'));
    console.log(st, W, 'ref', res.aw, res.ah, 'gen', res.bw, res.bh, 'differing', res.pct + '%');
    await dp.close();
    await p.close(); await h.close();
  }
  await b.close();
})();
