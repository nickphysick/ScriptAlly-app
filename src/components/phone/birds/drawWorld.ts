/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v1 — THE FRAME: the ref's `draw()` (design-refs/phone-birds-eye-world-v1, world.js), ported.
 * One string of absolutely positioned marks for one layer, rebuilt per frame in screen space, so text stays crisp at
 * every zoom (never a CSS scale on the content). Pure: the view calls it from requestAnimationFrame; the smoke calls it
 * in node. The classes are the ref's, prefixed `bw-`.
 * ⚠️ USER TEXT IS ESCAPED (`esc`): this string goes into innerHTML.
 * ⚠️ NO STAGE CHIP OR PILL AT ANY LEVEL; the only words in a bar are the Timeline level's.
 */
import { QueryStatus } from "../../../types";
import { STAGE_INK, stageOf } from "../../../lib/stageColours";
import {
  GAP, RH, RULE, WX, aheadTx, barBox, bandOf, dm, edgeOf, hatchOf, headingTop, num, rowOffset, rowSegs, rulerMarks, shortName, spaced,
  stageTx, type BwAxis, type BwRow, type BwSeg, type BwView, type World,
} from "../../../lib/birdsWorld";

export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/* ── the glyph track (ref `gtrack`): queried, partial, full, offer; the stage it stands at full strength ── */
const SEAL = "M12 3.2A2.55 2.55 0 0 1 16.4 4.38A2.55 2.55 0 0 1 19.62 7.6A2.55 2.55 0 0 1 20.8 12A2.55 2.55 0 0 1 19.62 16.4A2.55 2.55 0 0 1 16.4 19.62A2.55 2.55 0 0 1 12 20.8A2.55 2.55 0 0 1 7.6 19.62A2.55 2.55 0 0 1 4.38 16.4A2.55 2.55 0 0 1 3.2 12A2.55 2.55 0 0 1 4.38 7.6A2.55 2.55 0 0 1 7.6 4.38A2.55 2.55 0 0 1 12 3.2Z";
const STAR = "M12 7.8L13.12 10.66L16.18 10.84L13.81 12.79L14.59 15.76L12 14.1L9.41 15.76L10.19 12.79L7.82 10.84L10.88 10.66Z";
const INK = STAGE_INK;
const TGL = [
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${INK}" stroke-width="2.4"/></svg>`,
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="M12 5.5A6.5 6.5 0 0 0 12 18.5Z" fill="${INK}"/></svg>`,
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${INK}" stroke-width="2.4"/><circle cx="12" cy="12" r="6" fill="${INK}"/></svg>`,
  `<svg viewBox="0 0 24 24"><path d="${SEAL}${STAR}" fill="${INK}" fill-rule="evenodd"/></svg>`,
];
const STAGE_AT: Record<string, number> = { queried: 0, partial: 1, full: 2, offer: 3, closed: 0 };
const REQUESTED = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);
export function gtrack(status: string, size: number): string {
  const cur = STAGE_AT[stageOf(status)] ?? 0, req = REQUESTED.has(status), band = bandOf(status), edge = edgeOf(status);
  return `<span class="bw-gt" style="--g:${size}px">${TGL.map((g, i) => `${i ? `<u class="${i <= cur ? "on" : ""}"></u>` : ""}<i class="${i < cur ? "done" : i === cur ? "now" : ""}" style="${i === cur ? `background:${band};box-shadow:0 0 0 ${size > 14 ? 3 : 2}px ${band}${req ? `,0 0 0 ${size > 14 ? 4 : 3}px ${edge}` : ""}` : ""}">${g}</i>`).join("")}</span>`;
}

/** past its date, hatched in the stage's colour — the offer stays flat duck egg (Plumage: no gradient on an offer) */
const pastBg = (st: string) => (stageOf(st) === "offer" ? bandOf(st) : hatchOf(st));

export interface FrameOpts {
  axis: BwAxis;
  nowMs: number;
  /** the replay's front, in calendar days (null: everything) */
  clip: number | null;
  /** the row whose sheet is open */
  sel: string | null;
}
/** a row's segments, cut at the replay's front */
export function clipSegs(segs: BwSeg[], clip: number | null): BwSeg[] {
  if (clip == null) return segs;
  return segs.filter((s) => s.ca < clip).map((s) => (s.cb <= clip ? s : { ...s, b: s.a + (clip - s.ca), cb: clip, last: false }));
}
const vis = (a: number, b: number, vpW: number) => { const l = Math.max(a, 0), r = Math.min(b, vpW - 8); return { w: r - l, pad: l - a }; };
function inBar(s: BwSeg, v: { w: number; pad: number }, r: BwRow, nowMs: number): string {
  const date = dm(s.d, nowMs);
  if (s.k === "ahead") { const t = aheadTx(r.sendBy ? "Send by" : "Reply by", date, v.w); return t ? `<small>${t}</small>` : ""; }
  const name = shortName(s.st), w = stageTx(name, date, v.w);
  const pl = v.pad ? `<span style="flex:none;width:${px(v.pad)}"></span>` : "";
  const body = w === "both" ? `<b>${name}</b><small>${date}</small>` : w === "name" ? `<b>${name}</b>` : w === "date" ? `<small>${date}</small>` : "";
  return body ? pl + body : "";
}

/** the frame's string, and what the controls need to know */
export function drawWorld(W: World, S: BwView, o: FrameOpts): { html: string; lx: number; off: -1 | 0 | 1; zoomed: boolean; top: number } {
  const TOP = W.topFor(S.z), { z, ox, oy } = S, sx = W.SX(z), X = (x: number) => ox + x * sx, Y = (y: number) => oy + W.yOff(y, z);
  const rp = W.rowPx(z), out: string[] = [], { vpW, vpH } = W;
  const top = Y(0), bot = Y(W.H), lx = X(W.LINE), endX = X(WX);
  out.push(`<i class="bw-pz" style="left:${px(lx)};width:${px(Math.max(0, endX - lx))};top:${px(top)};height:${px(bot - top)}"></i>`);
  const heads: string[] = [];
  for (const g of W.G) {
    const gy = Y(g.y), gp = W.gapPx(z), gEnd = Y(g.y + GAP + g.rows.length * RH), small = gp < 34;
    out.push(`<i class="bw-gband" style="top:${px(gy)};height:${px(gEnd - gy)}"></i>`);
    const h = headingTop(gy, gp, gEnd, TOP, small);
    if (h.hy < vpH && h.hy + h.hh > 0) heads.push(`<span class="bw-gh0${small ? " sm" : ""}${h.pinned ? " pinned" : ""}" data-bw="group" data-t="${g.t}" data-n="${g.rows.length}" style="top:${px(h.hy)};padding-left:${px(Math.max(16, X(0)))}">${g.t}<em>${g.rows.length}</em></span>`);
    for (const { r, y } of g.rows) {
      const ry = Y(y);
      if (ry > vpH + 10 || ry + rp < -10) continue;
      const { th, by, tall } = barBox(rp, ry);
      const x0 = X(0), lab = Math.max(12, x0), mx = Math.min(lab, X(WX) - 160), off = rowOffset(r, o.axis);
      out.push(`<i class="bw-hit${o.sel === r.id ? " sel" : ""}" data-bw="row" data-id="${esc(r.id)}" data-from="${r.fromMs ?? ""}" data-to="${r.toMs ?? ""}" data-pasts="${r.pasts}" data-due="${r.dueMs ?? ""}" data-past="${r.due != null && r.due < 0 ? 1 : 0}" data-status="${esc(r.status)}" data-off="${off}" style="top:${px(ry)};height:${px(rp)}"></i>`);
      for (const s of clipSegs(rowSegs(r, o.axis), o.clip)) {
        const a = X(W.wxd(s.a)), b = X(W.wxd(s.b));
        if (b - a < 1) continue;
        const data = `data-bw="bar" data-k="${s.k}" data-st="${esc(s.st)}" data-day="${s.ca}" data-row="${esc(r.id)}"`;
        if (s.k === "ahead") out.push(`<i class="bw-bar ahead${tall ? " tx" : ""}" ${data} style="left:${px(a + 2)};width:${px(Math.max(2, b - a - 2))};top:${px(by)};height:${px(th)};border-color:${edgeOf(s.st)}">${tall ? inBar(s, vis(a + 2, b, vpW), r, o.nowMs) : ""}</i>`);
        else if (s.k === "past") out.push(`<i class="bw-bar past" ${data} style="left:${px(a + 2)};width:${px(Math.max(3, b - a - 2))};top:${px(by)};height:${px(th)};background:${pastBg(s.st)};box-shadow:inset 0 0 0 1px ${edgeOf(s.st)}"></i>`);
        else out.push(`<i class="bw-bar${s.first ? "" : " mid"}${s.last ? "" : " open"}${tall ? " tx" : ""}" ${data} style="left:${px(a)};width:${px(Math.max(3, b - a - (s.last ? 0 : 2)))};top:${px(by)};height:${px(th)};background:${bandOf(s.st)};box-shadow:inset 0 0 0 1px ${edgeOf(s.st)}">${tall ? inBar(s, vis(a, b - (s.last ? 0 : 2), vpW), r, o.nowMs) : ""}</i>`);
      }
      if (rp >= 22 && r.due != null && o.clip == null) { const dueX = X(W.wxd(o.axis === "calendar" ? r.due : 0)); out.push(`<i class="bw-tick" style="left:${px(dueX)};top:${px(by - 4)};height:${px(th + 8)}"></i>`); }
      const ny = rp >= 72 ? ry + 10 : rp >= 44 ? ry + 8 : ry + 2;
      if (rp >= 22) {
        const gs = rp >= 72 ? 16 : rp >= 44 ? 14 : 12, gw = gs * 4 + 18 + 8;
        out.push(`<span class="bw-nmrow" data-bw="name" style="left:${px(mx)};top:${px(ny)}">${gtrack(r.status, gs)}<span class="bw-nm${rp < 44 ? " sm" : ""}">${esc(r.name)}</span></span>`);
        if (rp >= 72) {
          const lead = `${r.sendBy ? "Send by" : "Reply by"}`, ag = esc(r.agency);
          const sub = r.due == null ? ag : tall && r.due >= 0 ? ag : `${lead} ${dm(r.due, o.nowMs)}${ag ? ` · ${ag}` : ""}`;
          if (sub) out.push(`<span class="bw-sub" data-bw="sub" style="left:${px(mx + gw)};top:${px(ry + 34)}">${sub}</span>`);
        }
      }
      if (rp >= 44) { const [n, u] = num(r); out.push(`<span class="bw-fig" data-bw="fig" style="right:${px(Math.max(12, vpW - X(WX) + 4))};top:${px(rp >= 72 ? ry + 8 : ry + 5)}">${n ? `<b>${n}</b> ` : ""}${u}</span>`); }
    }
  }
  const lt = TOP + 4 + 20;
  if (lx >= 44 && lx <= vpW - 44) out.push(`<i class="bw-fline" data-bw="line" style="left:${px(lx)};top:${px(lt)};height:${px(Math.max(0, bot - lt))}"></i>`);
  out.push(heads.join(""));
  const off: -1 | 0 | 1 = lx < 44 ? -1 : lx > vpW - 44 ? 1 : 0;
  const marks = spaced(rulerMarks(o.axis, W.ext, (d) => X(W.wxd(d)), o.nowMs).filter(([x]) => x > 20 && x < vpW - 20 && Math.abs(x - lx) > 56));
  out.push(`<div class="bw-ruler" data-bw="ruler" style="top:${px(TOP)};height:${px(RULE)}"><i class="bw-rzone" style="left:${px(Math.max(0, lx))}"></i>${marks.map(([x, t]) => `<em class="bw-rm" style="left:${px(x)}">${t}</em>`).join("")}${off ? "" : `<i class="bw-rtick" style="left:${px(lx)}"></i>`}</div>`);
  const pos = off < 0 ? "left:12px;transform:none" : off > 0 ? "right:12px;left:auto;transform:none" : `left:${px(lx)}`;
  out.push(`<button type="button" class="bw-flab${off ? " off" : ""}" data-bw="pill" data-a="toline" data-off="${off}" style="top:${px(TOP + 4)};${pos}">${off < 0 ? "← " : ""}${W.ext.lab}${off > 0 ? " →" : ""}</button>`);
  return { html: out.join(""), lx, off, zoomed: S.z > 1.05, top: TOP };
}

/** the mini map (ref): bar segments, and a frame on what is on screen */
export function drawMini(W: World, S: BwView, axis: BwAxis): string {
  const ms = Math.min(84 / WX, 56 / Math.max(1, W.H)), mox = (92 - WX * ms) / 2, moy = (64 - W.H * ms) / 2;
  const rows = W.G.flatMap((g) => g.rows.flatMap(({ r, y }) => rowSegs(r, axis).filter((x) => x.k !== "ahead").map((x) =>
    `<i style="left:${px(mox + W.wxd(x.a) * ms)};width:${px(Math.max(1, (W.wxd(x.b) - W.wxd(x.a)) * ms))};top:${px(moy + y * ms)};background:${x.k === "past" ? edgeOf(x.st) : bandOf(x.st)}"></i>`))).join("");
  const TOP = W.topFor(S.z), sx = W.SX(S.z);
  const vx = -S.ox / sx, vy = W.yWorld(TOP + RULE - S.oy, S.z), vw = W.vpW / sx, vh = W.yWorld(W.vpH - 80 - S.oy, S.z) - vy;
  return rows + `<b style="left:${px(mox + Math.max(0, vx) * ms)};top:${px(moy + Math.max(0, vy) * ms)};width:${px(Math.min(WX, vw) * ms)};height:${px(Math.min(W.H, vh) * ms)}"></b>`;
}
