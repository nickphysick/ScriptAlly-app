/**
 * Comparable titles v32 — each CP32 lock's named mutation: the fault the lock exists to catch, applied to the rendered
 * page. `CP32_PROVE=1` runs every lock a second time with its mutation and requires it to go red
 * (tests/e2e/cp32.measure.ts). The unit locks' source mutations are in reports/comps-v32/REPORT.md §4.
 */
export const MUTATIONS = {
  /* the headline forced to 66px at every width */
  H1: { css: ".cp32 .qc151.qc153.wsnh.cp32-hdr > .qc1531-hd.wsnh-hd.wsnh-hd h1.qc1531-t { font-size: 66px !important; }" },
  /* a title in the right-hand block is clipped */
  H2: { css: ".cp32 .cp32-cbn span:first-child { display: block; max-width: 60px; overflow: hidden; white-space: nowrap; }" },
  /* the band shown with no unrecorded letter (run on the "nosent" variant): a band is drawn into the page */
  B1: { js: "(() => { const g = window.__q('[data-cp=\"grid\"]'); const b = document.createElement('div'); b.setAttribute('data-cp', 'notice'); b.textContent = 'x'; g.parentElement.insertBefore(b, g); })()" },
  /* the current-letter pill on every row */
  S1: { js: "(() => { for (const r of window.__qa('[data-cp=\"row\"] .cp32-rowx')) if (!r.querySelector('[data-cp=\"row-current\"]')) { const s = document.createElement('span'); s.setAttribute('data-cp', 'row-current'); s.textContent = 'In your current letter'; r.appendChild(s); } })()" },
  /* a row title set to nowrap + ellipsis, in a box too narrow for it */
  S2: { css: ".cp32 .cp32-row:first-child .cp32-rown { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }" },
  /* a figure off by one */
  O1: { js: "(() => { const b = window.__q('[data-cp=\"figs\"] [data-fig=\"agents\"] b'); b.textContent = String(Number(b.textContent) + 1); })()" },
  /* the glyph replaced by a plain dot */
  O2: { js: "(() => { for (const s of window.__qa('[data-cp=\"query\"] svg')) { const d = document.createElement('i'); d.className = 'plain-dot'; d.textContent = '•'; s.replaceWith(d); } })()" },
  /* the 2nd and 1st columns swapped */
  P1: { js: "(() => { const p = window.__q('[data-cp=\"podium\"]'); p.insertBefore(p.children[1], p.children[0]); })()" },
  /* a tie shown as 1, 2 */
  P2: { js: "(() => { const c = window.__qa('[data-cp=\"podium-col\"][data-place=\"1\"]'); const s = c[c.length - 1]; if (!s) return; s.setAttribute('data-place', '2'); const st = s.querySelector('[data-cp=\"podium-step\"]'); st.textContent = '2'; })()" },
  /* the spare step hidden */
  P3: { css: ".cp32 [data-cp=\"podium-spare\"] { display: none !important; }" },
  /* the Comp-pendium's list reversed */
  C1: { js: "(() => { const b = window.__q('[data-cp=\"pendium\"] tbody'); [...b.children].reverse().forEach((r) => b.appendChild(r)); })()" },
  /* the ribbon moved right, over the Percentage heading */
  C2: { css: ".cp32 .cp32-ribbon { right: 40px !important; height: calc(100% + 60px) !important; }" },
  /* the standalone Scout section returns */
  SC1: { js: "(() => { const s = document.createElement('section'); s.setAttribute('data-cp', 'scout'); s.className = 'cp30-scout'; window.__cp().insertBefore(s, window.__q('.af')); })()" },
  /* a pill turns mono and uppercase */
  G1: { css: ".cp32 .cp32-rowu { text-transform: uppercase; font-family: var(--font-mono) !important; font-size: 10px !important; }" },
  /* the grid given a fixed 1600 width */
  W1: { css: ".cp32 .cp32-grid { width: 1600px; }" },
};
