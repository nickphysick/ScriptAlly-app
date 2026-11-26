/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v2 — THE FRAME: the v2 ref's `draw()`, `inRow()`, `tailSeg()`, `segBg()`, `inBar()` and the ruler
 * (design-refs/phone-birds-eye-world-v2, the page script), ported. One string of absolutely positioned marks for one
 * layer, rebuilt per frame in screen space, so text stays crisp at every zoom. Pure: the view calls it from
 * requestAnimationFrame; the tests call it in node. The classes are the ref's, prefixed `bw-`.
 *   - DETAILS INSIDE THE BAR (the only layout): zoomed in, the bar fills its row (row − 8, at most 40); from 18px it
 *     carries the agent's name, from 34px the agency beside it and each stage's short name and date along the bottom.
 *     The name never runs under a figure or the "!": the agency drops first, then the name ends with "…"; with no room
 *     before the "!", the name sits just after it; a bar too short for its name puts the name just before the bar.
 *   - Earlier stages are faded; the current stage runs straight on (`cont`, no gap, no inner edge): solid to the reply
 *     date (a navy tick, "Reply by 14 Jan"), or hatched past it from an "!" marker, fading to today once gone quiet.
 *   - Fitted (zoomed out) is bars only: no names, figures or gridlines.
 * ⚠️ USER TEXT IS ESCAPED (`esc`): this string goes into innerHTML.
 */
import {
  GAP, RH, RULE, WX, aheadTx, bandOf, barBox, clipR, dm, edgeOf, fadedBand, fadedEdge, hasFig, hatchOf, headingTop, monthOf, noDateHere, num,
  rowSegs, rulerMarks, shortName, spaced, stageTx, type BwRow, type BwSeg, type BwView, type World,
} from "../../../lib/birdsWorld";

export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const px = (n: number) => `${Math.round(n * 100) / 100}px`;

export interface FrameOpts {
  nowMs: number;
  /** the writer's "goes quiet after", in days */
  quietDays: number;
  /** the replay's "now", in days from today (null: not replaying) */
  rt: number | null;
  /** every row of the campaign (for the footer's no-date count) */
  rows: readonly BwRow[];
  /** extra space above the rows (the "only closed" card sits there) */
  pady?: number;
  sel?: string | null;
}
export interface Frame { html: string; lx: number; off: -1 | 0 | 1; zoomed: boolean; top: number; label: string }

const vis = (a: number, b: number, vpW: number) => { const l = Math.max(a, 0), r = Math.min(b, vpW - 8); return { w: r - l, pad: l - a }; };
function inBar(s: BwSeg, v: { w: number; pad: number }, r: BwRow, nowMs: number): string {
  const date = dm(s.d, nowMs);
  if (s.k === "ahead") { const t = aheadTx(r.sendBy ? "Send by" : "Reply by", date, v.w); return t ? `<small>${t}</small>` : ""; }
  const name = shortName(s.st), w = stageTx(name, date, v.w);
  const pl = v.pad ? `<span style="flex:none;width:${px(v.pad)}"></span>` : "";
  const body = w === "both" ? `<b>${name}</b><small>${date}</small>` : w === "name" ? `<b>${name}</b>` : w === "date" ? `<small>${date}</small>` : "";
  return body ? pl + body : "";
}
/** a stage's fill and edge (ref `segBg`): the current one in full colour (no inner edge where it runs on), earlier ones faded */
export function segBg(s: BwSeg): string {
  const e = edgeOf(s.st);
  if (s.last) return `background:${bandOf(s.st)};box-shadow:${s.cont ? `inset 0 1px 0 ${e},inset 0 -1px 0 ${e},inset 1px 0 0 ${e}` : `inset 0 0 0 1px ${e}`}`;
  return `background:${fadedBand(s.st)};box-shadow:inset 0 0 0 1px ${fadedEdge(s.st)}`;
}
/** the time after the current stage, joined on with no gap (ref `tailSeg`) */
function tailSeg(s: BwSeg, a: number, b: number, by: number, th: number, inner: string, cl: string, badge: boolean, data: string): string {
  const w = Math.max(2, b - a), r = th / 2, e = edgeOf(s.st), bd = bandOf(s.st);
  if (s.k === "ahead") return `<i class="bw-bar${cl}" ${data} style="left:${px(a)};width:${px(w)};top:${px(by)};height:${px(th)};background:${bd};box-shadow:inset 0 1px 0 ${e},inset 0 -1px 0 ${e},inset -1px 0 0 ${e};border-radius:0 ${px(r)} ${px(r)} 0">${inner}</i>`;
  if (s.k === "quiet") return `<i class="bw-bar" ${data} style="left:${px(a)};width:${px(w)};top:${px(by)};height:${px(th)};background:linear-gradient(90deg,color-mix(in srgb,${bd} 80%,#fff),rgba(255,255,255,0));border-radius:0 ${px(r)} ${px(r)} 0"></i>`;
  const sz = badge ? Math.max(12, Math.min(16, th + 4)) : Math.max(5, Math.min(14, th + 3)), cy = by + th / 2;
  return `<i class="bw-bar" ${data} style="left:${px(a)};width:${px(w)};top:${px(by)};height:${px(th)};background:${hatchOf(s.st)};box-shadow:inset 0 1px 0 ${e},inset 0 -1px 0 ${e}${s.cont ? "" : `,inset -1px 0 0 ${e}`};border-radius:${s.cont ? "0" : `0 ${px(r)} ${px(r)} 0`}"></i>`
    + `<i class="bw-ovd${sz < 11 ? " dot" : ""}" data-bw="mark" title="Past its reply date" style="left:${px(a)};top:${px(cy)};--s:${px(sz)}">${sz < 11 ? "" : "!"}</i>`;
}

/** one row (ref `inRow`) */
function inRow(W: World, r: BwRow, ry: number, rp: number, X: (x: number) => number, zoomed: boolean, o: FrameOpts, out: string[]) {
  const { th, by, named, one, two } = barBox(rp, ry, zoomed), vpW = W.vpW, rt = o.rt;
  out.push(`<i class="bw-hit${o.sel === r.id ? " sel" : ""}" data-bw="row" data-id="${esc(r.id)}" data-from="${r.fromMs ?? ""}" data-to="${r.toMs ?? ""}" data-pasts="${r.pasts}" data-due="${r.dueMs ?? ""}" data-past="${r.due != null && r.due < 0 ? 1 : 0}" data-status="${esc(r.status)}" data-closed="${r.closed ? 1 : 0}" data-start="${r.ev.length ? r.ev[r.ev.length - 1].d : ""}" data-dueday="${r.due ?? ""}" style="top:${px(ry)};height:${px(rp)}"></i>`);
  const segs = clipR(rowSegs(r, o.quietDays), rt);
  let x0: number | null = null, x1: number | null = null, ovX: number | null = null;
  for (const s of segs) {
    const a = X(W.wxd(s.a)), b = X(W.wxd(s.b));
    if (b - a < 1) continue;
    if (x0 == null) x0 = a;
    x1 = b;
    const cl = two ? " tx tx2" : "";
    const data = `data-bw="bar" data-k="${s.k}" data-st="${esc(s.st)}" data-day="${s.a}" data-row="${esc(r.id)}" data-cur="${s.last ? 1 : 0}" data-cont="${s.cont ? 1 : 0}"`;
    if (s.k !== "stage") { if (s.k === "past") ovX = a; out.push(tailSeg(s, a, b, by, th, two && s.k === "ahead" ? inBar(s, vis(a, b, vpW), r, o.nowMs) : "", cl, named, data)); continue; }
    const gap = s.last ? 0 : 2, rr = s.last && !s.cont;
    const rad = `border-radius:${s.first ? `${px(th / 2)} 0 0 ${px(th / 2)}` : "0"}${rr ? `;border-top-right-radius:${px(th / 2)};border-bottom-right-radius:${px(th / 2)}` : ""}`;
    out.push(`<i class="bw-bar${s.first ? "" : " mid"}${rr ? "" : " open"}${cl}" ${data} style="left:${px(a)};width:${px(Math.max(3, b - a - gap))};top:${px(by)};height:${px(th)};${segBg(s)};${rad}">${two ? inBar(s, vis(a, b - gap, vpW), r, o.nowMs) : ""}</i>`);
  }
  if (named && rt == null && r.due != null && r.due >= 0) out.push(`<i class="bw-tick" data-bw="tick" style="left:${px(X(W.wxd(r.due)))};top:${px(by - 3)};height:${px(th + 6)}"></i>`);
  if (!one || x0 == null || x1 == null) return;
  const fig = hasFig(r, rt != null);
  let nx = Math.max(x0, 0) + 12;
  const ny = two ? by + 4 : by + (th - 18) / 2, [n, u] = num(r), fr = Math.max(12, vpW - X(WX) + 4);
  /* the name never runs under the figure or the "!": the agency drops first, then the name ends with "…" */
  const figL = fig ? vpW - fr - (n.length * 9 + u.length * 6.4 + 22) : vpW - 12, nameW = r.name.length * 8.1;
  const before = ovX != null && ovX > nx - 12 ? ovX - 12 - nx : 1e9;
  if (before < Math.min(nameW, 80) && ovX != null) nx = ovX + 12;
  const avail = (before >= Math.min(nameW, 80) && ovX != null && ovX > nx ? Math.min(figL, ovX - 12) : figL) - 8 - nx;
  const agW = r.agency.length * 6.4 + 8, withAg = two && !!r.agency && nameW + agW <= avail;
  /* a bar too short for its name (a query sent days ago): the name sits just before the bar, on the white.
     ⚠️ A FIX ON THE REF: its rule never looked at the row's figure, and on a bar that starts near the right edge the
     name ran under it (measured on the harness, BW-5). Here the name stops 8px short of the figure, with "…" if it must. */
  const barW = Math.min(x1, figL) - Math.max(x0, 0), outR = Math.min(x0 - 10, figL - 8);
  const outTop = by + (th - 18) / 2;
  if (barW < Math.min(nameW, 90) + 24 && outR - nameW - 4 > 8) out.push(`<span class="bw-inm out${two ? "" : " one"}" data-bw="name" style="right:${px(vpW - outR)};top:${px(outTop)}"><span class="in1">${esc(r.name)}</span></span>`);
  else if (barW < Math.min(nameW, 90) + 24 && outR - 64 > 8 && x0 - 10 > figL - 8) out.push(`<span class="bw-inm out${two ? "" : " one"}" data-bw="name" style="right:${px(vpW - outR)};top:${px(outTop)};max-width:${px(outR - 16)}"><span class="in1">${esc(r.name)}</span></span>`);
  else if (avail >= 48) out.push(`<span class="bw-inm${two ? "" : " one"}" data-bw="name" style="left:${px(nx)};top:${px(ny)};max-width:${px(avail)}"><span class="in1">${esc(r.name)}</span>${withAg ? `<small>${esc(r.agency)}</small>` : ""}</span>`);
  if (fig) out.push(`<span class="bw-fig sm" data-bw="fig" style="right:${px(fr)};top:${px(by + (th - 24) / 2)}">${n ? `<b>${n}</b> ` : ""}${u}</span>`);
}

/** the frame's string, and what the controls need */
export function drawWorld(W: World, S: BwView, o: FrameOpts): Frame {
  const zoomed = S.z > W.FZ + 0.05, TOP = W.topFor(S.z), { z, ox, oy } = S, sx = W.SX(z), pady = o.pady ?? 0;
  const X = (x: number) => ox + x * sx, Y = (y: number) => oy + pady + W.yOff(y, z);
  const rp = W.rowPx(z), out: string[] = [], { vpW, vpH } = W, rt = o.rt;
  const top = Y(0), bot = Y(W.H - W.FOOT), lx = X(rt != null ? W.wxd(rt) : W.LINE), endX = X(WX);
  const label = rt != null ? dm(Math.round(rt), o.nowMs) : "Today";
  out.push(`<i class="bw-pz" style="left:${px(lx)};width:${px(Math.max(0, endX - lx))};top:${px(top)};height:${px(Math.max(0, bot - top))}"></i>`);
  const ruler = rulerMarks(W.ext, (d) => X(W.wxd(d)), o.nowMs);
  /* zoomed in only: very fine gridlines down from each ruler mark, behind the bars */
  if (zoomed) { const gt = Math.max(top, TOP + RULE); for (const [x] of ruler.marks) if (x > 0 && x < vpW) out.push(`<i class="bw-grid" data-bw="grid" style="left:${px(x)};top:${px(gt)};height:${px(Math.max(0, bot - gt))}"></i>`); }
  const heads: string[] = [];
  for (const g of W.G) {
    const gy = Y(g.y), gp = W.gapPx(z), gEnd = Y(g.y + GAP + g.rows.length * RH), small = gp < 34;
    out.push(`<i class="bw-gband" style="top:${px(gy)};height:${px(gEnd - gy)}"></i>`);
    const h = headingTop(gy, gp, gEnd, TOP, small);
    if (h.hy < vpH && h.hy + h.hh > 0) heads.push(`<span class="bw-gh0${small ? " sm" : ""}${h.pinned ? " pinned" : ""}" data-bw="group" data-t="${g.t}" data-n="${g.rows.length}" style="top:${px(h.hy)};padding-left:${px(Math.max(16, X(0)))}">${g.t}<em>${g.rows.length}</em></span>`);
    for (const { r, y } of g.rows) {
      const ry = Y(y);
      if (ry > vpH + 10 || ry + rp < -10) continue;
      inRow(W, r, ry, rp, X, S.z > 1.05, o, out);
    }
  }
  const lt = TOP + 4 + 20;
  if (rt != null ? lx >= 0 && lx <= vpW : lx >= 44 && lx <= vpW - 44) out.push(`<i class="bw-fline" data-bw="line" style="left:${px(lx)};top:${px(lt)};height:${px(Math.max(0, bot - lt))}"></i>`);
  /* the footer: queries with no reply date (under All and Waiting only) */
  const nd = noDateHere(o.rows, W.filter).length;
  if (nd) out.push(`<button type="button" class="bw-ndl" data-bw="nodate" data-a="nodate" style="top:${px(Y(W.H - W.FOOT) + 14)}">${nd} ${nd === 1 ? "query has" : "queries have"} no reply date<b>Add dates</b></button>`);
  out.push(heads.join(""));
  /* the ruler: its marks, the month pill at the daily level, the line's own pill */
  const off: -1 | 0 | 1 = rt != null ? 0 : lx < 44 ? -1 : lx > vpW - 44 ? 1 : 0;
  const pill = (label.length * 7.2 + 16) / 2 + 6, pw = label.length * 7.2 + 30, ml = lx < 44 ? 12 + pw + 8 : 12;
  /* ⚠️ A FIX ON THE REF: its marks kept clear of the line, not of the pill once it is pinned at the right edge ("Today →"),
     and a date sat under it (measured, BW-6). The right-hand limit is the pinned pill's left edge when it is there. */
  const rightLim = off > 0 ? vpW - 12 - (pw + 12) - 4 : vpW - 8;
  const marks = spaced(ruler.marks.filter(([x, t, day]) => { const half = (day ? t.length * 7 : t.length * 6.6) / 2; return x - half > (ruler.mon ? ml + 44 : lx < 44 ? ml : 8) && x + half < rightLim && Math.abs(x - lx) > half + pill; }));
  const ppos = off < 0 ? "left:12px;transform:none" : off > 0 ? "right:12px;left:auto;transform:none" : `left:${px(rt != null ? Math.max(40, Math.min(vpW - 40, lx)) : lx)}`;
  out.push(`<div class="bw-ruler" data-bw="ruler" data-tier="${ruler.tier}" style="top:${px(TOP)};height:${px(RULE)}"><i class="bw-rzone" style="left:${px(Math.max(0, lx))}"></i>${marks.map(([x, t, day]) => `<em class="bw-rm" data-bw="rm" data-day="${day ? 1 : 0}" style="left:${px(x)}">${t}</em>`).join("")}${ruler.mon ? `<b class="bw-rmon" data-bw="mon" style="left:${px(lx < 44 ? 12 + label.length * 7.2 + 38 : 12)}">${monthOf(ruler.mon)}</b>` : ""}${off ? "" : `<i class="bw-rtick" style="left:${px(lx)}"></i>`}</div>`);
  out.push(`<button type="button" class="bw-flab${off ? " off" : ""}" data-bw="pill" data-a="toline" data-off="${off}" style="top:${px(TOP + 4)};${ppos}">${off < 0 ? "← " : ""}${label}${off > 0 ? " →" : ""}</button>`);
  return { html: out.join(""), lx, off, zoomed, top: TOP, label };
}

/** the mini map (ref): bar segments, and a frame on what is on screen */
export function drawMini(W: World, S: BwView, quietDays: number): string {
  const ms = Math.min(84 / WX, 56 / Math.max(1, W.H)), mox = (92 - WX * ms) / 2, moy = (64 - W.H * ms) / 2;
  const rows = W.G.flatMap((g) => g.rows.flatMap(({ r, y }) => rowSegs(r, quietDays).filter((x) => x.k !== "ahead").map((x) =>
    `<i style="left:${px(mox + W.wxd(x.a) * ms)};width:${px(Math.max(1, (W.wxd(x.b) - W.wxd(x.a)) * ms))};top:${px(moy + y * ms)};background:${x.k === "past" || x.k === "quiet" ? edgeOf(x.st) : bandOf(x.st)}"></i>`))).join("");
  const TOP = W.topFor(S.z), sx = W.SX(S.z);
  const vx = -S.ox / sx, vy = W.yWorld(TOP + RULE - S.oy, S.z), vw = W.vpW / sx, vh = W.yWorld(W.vpH - 80 - S.oy, S.z) - vy;
  return rows + `<b style="left:${px(mox + Math.max(0, vx) * ms)};top:${px(moy + Math.max(0, vy) * ms)};width:${px(Math.min(WX, vw) * ms)};height:${px(Math.min(W.H, vh) * ms)}"></b>`;
}
