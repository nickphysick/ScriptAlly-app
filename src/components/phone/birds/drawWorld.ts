/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v3 — THE FRAME: the v3 ref's `draw()`, `inRow()`, `ndRow()`, `tailSeg()`, `segBg()`, `inBar()` and
 * the ruler (design-refs/phone-birds-eye-world-v3, the page script; v2's for what v3 leaves alone), ported. One string of
 * absolutely positioned marks for one layer, rebuilt per frame in screen space, so text stays crisp at every zoom. Pure:
 * the view calls it from requestAnimationFrame; the tests call it in node. The classes are the ref's, prefixed `bw-`.
 *   - DETAILS INSIDE THE BAR (v2's): zoomed in, the bar fills its row (row − 8, at most 40); from 18px it carries the
 *     agent's name, from 34px the agency beside it and each stage's short name and date along the bottom. The name never
 *     runs under the "!": with no room before it, the name sits just after it; a bar too short for its name puts the name
 *     just before the bar.
 *   - v3, CALMER: no figure pills anywhere (the "!" says "past its date"); no per-row edge chips — a 28px white fade at
 *     each side below the ruler when zoomed in; gridlines only at rows of 44px or more (Weeks).
 *   - v3, HEADINGS: Strava-style titles (a chevron, the bold navy name, the grey count, a 1px rule under them), each a
 *     tap target that folds its group. Headings never touch: each sits at least its own height + 12px below the one
 *     above, on screen, at every zoom (ref `PUSH`/`LASTH`).
 *   - v3, NO REPLY DATE YET: their own group; each bar runs in the Queried colours to today, then a dashed outline fades
 *     out over 28 days; zoomed in, the name and a "+ Add reply date" chip just after today.
 *   - v3, THE SCRUBBER: a line under the finger, its day in a pill on the ruler ("· 20 out" on thin rows), and on each
 *     named row a label saying what it was doing that day. The change glow (the hawk's news, search) is a soft band.
 * ⚠️ USER TEXT IS ESCAPED (`esc`): this string goes into innerHTML.
 */
import {
  GAP, RULE, WX, aheadTx, bandOf, barBox, clipR, dm, edgeOf, fadedBand, fadedEdge, hatchOf, isNoDate, monthOf, outOn,
  rowSegs, rulerMarks, scrubLabel, shortName, spaced, stageTx, type BwRow, type BwSeg, type BwView, type World, type MarkKind, markOf, markSize,
} from "../../../lib/birdsWorld";
import { MATERIAL_ICON_INNER } from "../../shared/MaterialIcon";

/** the marks' drawings: the app's sample-pages icon for a partial (MATERIAL_ICON_INNER.pages); the app has no
 *  full-manuscript icon (materialIcon.ts leaves it out on purpose), so the full is the ref's pages mark (EVMAT); the pass
 *  is the app's icon set's thumbs-down (lucide-react ThumbsDown) */
const svg = (inner: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
export const MARK_SVG: Record<MarkKind, string> = {
  partial: svg(MATERIAL_ICON_INNER.pages),
  full: svg('<path d="M8 3h7l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M9.5 13h6M9.5 16.5h4"/>'),
  pass: svg('<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>'),
};
const MARK_TITLE: Record<MarkKind, string> = { partial: "Asked for a partial", full: "Asked for the full", pass: "Passed" };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export interface FrameOpts {
  nowMs: number;
  /** the writer's "goes quiet after", in days */
  quietDays: number;
  /** the replay's "now", in days from today (null: not replaying) */
  rt: number | null;
  /** every row of the campaign (the scrubber's count) */
  rows: readonly BwRow[];
  /** extra space above the rows (the "only closed" card sits there) */
  pady?: number;
  sel?: string | null;
  /** the scrubber's x on screen (null: not scrubbing) */
  scrub?: number | null;
  /** the row that glows (a step of the hawk's news, or where search flew), and the day of its change */
  glow?: { id: string; d: number | null } | null;
}
export interface Frame { html: string; lx: number; off: -1 | 0 | 1; zoomed: boolean; top: number; label: string; scrubDay: number | null }

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
/** the hatching with its stripes' phase anchored to the screen's x (v3.3), so a row's hatched stretch and its quiet
 *  stretch, two elements, continue one pattern with no seam. At 135deg a stripe's phase at (x, y) in an element is
 *  (x + y) / √2 from its top-left corner; shifting the stops by its left (a) / √2, mod the 7px period, aligns them. */
export function hatchAt(status: string, a: number): string {
  const d = (((a / Math.SQRT2) % 7) + 7) % 7, f = (n: number) => `${+n.toFixed(3)}px`;
  return `repeating-linear-gradient(135deg,${bandOf(status)} ${f(-d)} ${f(4 - d)},#fff ${f(4 - d)} ${f(7 - d)})`;
}
/** gone quiet's fade (v3.3): the hatching seen in full where it goes quiet, 8% at today */
export const QUIET_FADE = "linear-gradient(90deg,#000,rgba(0,0,0,0.08))";
/** the time after the current stage, joined on with no gap (ref `tailSeg`) */
function tailSeg(s: BwSeg, a: number, b: number, by: number, th: number, inner: string, cl: string, badge: boolean, data: string): string {
  const w = Math.max(2, b - a), r = th / 2, e = edgeOf(s.st), bd = bandOf(s.st);
  if (s.k === "ahead") return `<i class="bw-bar${cl}" ${data} style="left:${px(a)};width:${px(w)};top:${px(by)};height:${px(th)};background:${bd};box-shadow:inset 0 1px 0 ${e},inset 0 -1px 0 ${e},inset -1px 0 0 ${e};border-radius:0 ${px(r)} ${px(r)} 0">${inner}</i>`;
  const sz = badge ? Math.max(12, Math.min(16, th + 4)) : Math.max(5, Math.min(14, th + 3)), cy = by + th / 2;
  /* first look v1: the mark names its row, so the grow-in pops it as that row's wipe reaches it */
  const rowAttr = /data-row="[^"]*"/.exec(data)?.[0] ?? "";
  const mark = s.mark ? `<i class="bw-ovd${sz < 11 ? " dot" : ""}" data-bw="mark" ${rowAttr} title="Past its reply date" style="left:${px(a)};top:${px(cy)};--s:${px(sz)}">${sz < 11 ? "" : "!"}</i>` : "";
  /* v3.3 (Nick): gone quiet stays hatched. The same hatching and its top and bottom edge lines run on to today, fading
     out under a mask from full to 8% there (QUIET_FADE); no solid colour after the "!" */
  if (s.k === "quiet") return `<i class="bw-bar" ${data} style="left:${px(a)};width:${px(w)};top:${px(by)};height:${px(th)};background:${hatchAt(s.st, a)};box-shadow:inset 0 1px 0 ${e},inset 0 -1px 0 ${e};-webkit-mask-image:${QUIET_FADE};mask-image:${QUIET_FADE};border-radius:0 ${px(r)} ${px(r)} 0"></i>` + mark;
  return `<i class="bw-bar" ${data} style="left:${px(a)};width:${px(w)};top:${px(by)};height:${px(th)};background:${hatchAt(s.st, a)};box-shadow:inset 0 1px 0 ${e},inset 0 -1px 0 ${e}${s.cont ? "" : `,inset -1px 0 0 ${e}`};border-radius:${s.cont ? "0" : `0 ${px(r)} ${px(r)} 0`}"></i>`
    + mark;
}
const hitTag = (r: BwRow, ry: number, rp: number, sel: string | null | undefined) =>
  `<i class="bw-hit${sel === r.id ? " sel" : ""}" data-bw="row" data-id="${esc(r.id)}" data-from="${r.fromMs ?? ""}" data-to="${r.toMs ?? ""}" data-pasts="${r.pasts}" data-due="${r.dueMs ?? ""}" data-past="${r.due != null && r.due < 0 ? 1 : 0}" data-status="${esc(r.status)}" data-closed="${r.closed ? 1 : 0}" data-nodate="${isNoDate(r) ? 1 : 0}" data-you="${r.you ? 1 : 0}" data-start="${r.ev.length ? r.ev[r.ev.length - 1].d : ""}" data-dueday="${r.due ?? ""}" style="top:${px(ry)};height:${px(rp)}"></i>`;

/** the scrubber's label on a named row */
function scrubTag(r: BwRow, sx: number, by: number, th: number, day: number, q: number): string {
  const t = scrubLabel(r, day, q);
  return t ? `<span class="bw-scrb" data-bw="scrub-label" style="left:${px(sx + 8)};top:${px(by + th / 2)}">${t}</span>` : "";
}

/** one row (ref `inRow`) */
function inRow(W: World, r: BwRow, ry: number, rp: number, X: (x: number) => number, zoomed: boolean, o: FrameOpts, out: string[], scrubDay: number | null) {
  const { th, by, named, one, two } = barBox(rp, ry, zoomed), vpW = W.vpW, rt = o.rt;
  out.push(hitTag(r, ry, rp, o.sel));
  const glow = o.glow && o.glow.id === r.id;
  if (glow) out.push(`<i class="bw-glw" data-bw="glow" style="top:${px(ry)};height:${px(rp)}"></i>`);
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
  /* Birds-eye polish v1 §C: a mark at each partial or full request and each pass — a white disc on the bar at the
     event's date, above the bar and below the "!"; never during the replay */
  const markXs: number[] = [];
  if (rt == null) {
    const sz = markSize(named, th), cy = by + th / 2;
    for (const e of r.ev) {
      const k = markOf(e.status);
      if (!k) continue;
      const ex = X(W.wxd(e.d));
      if (ex < -20 || ex > vpW + 20) continue;
      markXs.push(ex);
      out.push(`<i class="bw-evmk ${k === "pass" ? "pass" : "mat"}${named ? "" : " sm"}" data-bw="evmark" data-k="${k}" data-row="${esc(r.id)}" data-day="${e.d}" title="${MARK_TITLE[k]}" style="left:${px(ex)};top:${px(cy)};--s:${px(sz)}">${MARK_SVG[k]}</i>`);
    }
  }
  if (named && rt == null && r.due != null && r.due >= 0) out.push(`<i class="bw-tick" data-bw="tick" style="left:${px(X(W.wxd(r.due)))};top:${px(by - 3)};height:${px(th + 6)}"></i>`);
  if (glow && o.glow!.d != null) out.push(`<i class="bw-chpt" data-bw="change" style="left:${px(X(W.wxd(o.glow!.d!)))};top:${px(by + th / 2)}"></i>`);
  if (o.scrub != null && named && scrubDay != null) out.push(scrubTag(r, o.scrub, by, th, scrubDay, o.quietDays));
  if (!one || x0 == null || x1 == null) return;
  let nx = Math.max(x0, 0) + 12;
  const ny = two ? by + 4 : by + (th - 18) / 2, edgeR = vpW - 12;
  /* the name never runs under the "!" or (polish v1) a mark: it stops before the first one, or with no room before it,
     sits just after it and stops before the next */
  const nameW = r.name.length * 8.1;
  const obst = [...(ovX != null ? [ovX] : []), ...markXs].sort((p, q) => p - q);
  const first = obst.find((x) => x > nx - 12);
  const before = first != null ? first - 12 - nx : 1e9;
  let limit = edgeR;
  if (first != null && before >= Math.min(nameW, 80)) limit = Math.min(edgeR, first - 12);
  else if (first != null) { nx = first + 12; const next = obst.find((x) => x > first + 0.5); if (next != null) limit = Math.min(edgeR, next - 12); }
  const avail = limit - 8 - nx;
  const agW = r.agency.length * 6.4 + 8, withAg = two && !!r.agency && nameW + agW <= avail;
  /* a bar too short for its name (a query sent days ago): the name sits just before the bar, on the white */
  const barW = Math.min(x1, edgeR) - Math.max(x0, 0), outR = Math.min(x0 - 10, edgeR - 8);
  const outTop = by + (th - 18) / 2;
  if (barW < Math.min(nameW, 90) + 24 && outR - nameW - 4 > 8) out.push(`<span class="bw-inm out${two ? "" : " one"}" data-bw="name" data-row="${esc(r.id)}" style="right:${px(vpW - outR)};top:${px(outTop)}"><span class="in1">${esc(r.name)}</span></span>`);
  else if (avail >= 48) out.push(`<span class="bw-inm${two ? "" : " one"}" data-bw="name" data-row="${esc(r.id)}" style="left:${px(nx)};top:${px(ny)};max-width:${px(avail)}"><span class="in1">${esc(r.name)}</span>${withAg ? `<small>${esc(r.agency)}</small>` : ""}</span>`);
}

/** a query with no reply date (ref `ndRow`): its bar to today in the Queried colours, then a dashed outline fading out
 *  over 28 days; zoomed in, the name and the "+ Add reply date" chip just after today (kept 150px from the right) */
function ndRow(W: World, r: BwRow, ry: number, rp: number, X: (x: number) => number, zoomed: boolean, o: FrameOpts, out: string[], scrubDay: number | null) {
  const { th, by, named } = barBox(rp, ry, zoomed), vpW = W.vpW, Q = "Queried";
  out.push(hitTag(r, ry, rp, o.sel));
  if (o.glow && o.glow.id === r.id) out.push(`<i class="bw-glw" data-bw="glow" style="top:${px(ry)};height:${px(rp)}"></i>`);
  const d0 = r.ev[0].d;
  if (o.rt != null && d0 > o.rt) return;
  const a = X(W.wxd(d0)), b = X(W.wxd(o.rt != null ? Math.min(0, o.rt) : 0)), c = X(W.wxd(28));
  out.push(`<i class="bw-bar" data-bw="bar" data-k="nodate" data-st="${Q}" data-day="${d0}" data-row="${esc(r.id)}" data-cur="1" data-cont="0" style="left:${px(a)};width:${px(Math.max(3, b - a))};top:${px(by)};height:${px(th)};background:${bandOf(Q)};box-shadow:inset 0 0 0 1px ${edgeOf(Q)};border-radius:${px(th / 2)} 0 0 ${px(th / 2)}"></i>`);
  if (o.rt != null) return;
  out.push(`<i class="bw-ndt" data-bw="ndt" data-row="${esc(r.id)}" style="left:${px(b)};width:${px(Math.max(0, c - b))};top:${px(by)};height:${px(th)};--c:${edgeOf(Q)}"></i>`);
  if (o.scrub != null && named && scrubDay != null) out.push(scrubTag(r, o.scrub, by, th, scrubDay, o.quietDays));
  if (!named) return;
  const nx = Math.max(a, 0) + 12, cx = Math.min(Math.max(b + 10, nx + r.name.length * 8.1 + 16), vpW - 150);
  if (b - nx > 40) out.push(`<span class="bw-inm one" data-bw="name" data-row="${esc(r.id)}" style="left:${px(nx)};top:${px(by + (th - 18) / 2)};max-width:${px(Math.max(40, cx - nx - 8))}"><span class="in1">${esc(r.name)}</span></span>`);
  out.push(`<button type="button" class="bw-ndset" data-bw="ndset" data-a="ndset" data-id="${esc(r.id)}" style="left:${px(cx)};top:${px(by + th / 2)}">+ Add reply date</button>`);
}

/** the frame's string, and what the controls need */
export function drawWorld(W: World, S: BwView, o: FrameOpts): Frame {
  const zoomed = S.z > 1.05, TOP = W.topFor(S.z), { z, ox, oy } = S, sx = W.SX(z), pady = o.pady ?? 0;
  let PUSH = 0, LASTH = -1e9;
  const X = (x: number) => ox + x * sx, Y = (y: number) => oy + pady + W.yOff(y, z) + PUSH;
  const rp = W.rowPx(z), out: string[] = [], { vpW, vpH } = W, rt = o.rt;
  const top = Y(0), lx = X(rt != null ? W.wxd(rt) : W.LINE), endX = X(WX);
  const label = rt != null ? dm(Math.round(rt), o.nowMs) : "Today";
  const scrubDay = o.scrub != null ? Math.round(W.ext.D0 + (o.scrub - ox) / sx / W.PPD) : null;
  const pzAt = out.length; out.push("");
  const ruler = rulerMarks(W.ext, (d) => X(W.wxd(d)), o.nowMs);
  const gridAt = out.length; out.push("");
  const heads: string[] = [];
  for (const g of W.G) {
    const gp = W.gapPx(z), small = gp < 34, hh0 = small ? 26 : 30; /* the v3 headings' own heights (.bw-gh0.u / .u.sm) */
    /* headings never touch: when groups above are folded, the next heading keeps its distance (ref `PUSH`/`LASTH`) */
    { const nat = Y(g.y) + Math.max(0, gp - hh0 - 6); if (nat < LASTH) PUSH += LASTH - nat; }
    const gy = Y(g.y), gEnd = Y(g.y + GAP + g.h);
    LASTH = gy + Math.max(0, gp - hh0 - 6) + hh0 + 12;
    out.push(`<i class="bw-gband" style="top:${px(gy)};height:${px(gEnd - gy)}"></i>`);
    const natural = gy + Math.max(0, gp - hh0 - 6), hy = Math.min(Math.max(natural, TOP + RULE), gEnd - hh0 - 2), pinned = hy > natural + 1;
    if (hy < vpH && hy + hh0 > 0) heads.push(`<span class="bw-gh0 u${small ? " sm" : ""}${pinned ? " pinned" : ""}" data-bw="group" data-t="${g.label}" data-g="${g.t}" data-n="${g.n}" data-folded="${g.folded ? 1 : 0}" style="top:${px(hy)};padding-left:${px(Math.max(16, X(0)))}"><span class="ghu tapf" data-a="fold" data-g="${g.t}" data-bw="fold" role="button" aria-expanded="${!g.folded}">${CHEV.replace('class="chev"', `class="chev${g.folded ? " shut" : ""}"`)}${g.label}<em>${g.n}</em></span></span>`);
    for (const { r, y } of g.rows) {
      const ry = Y(y);
      if (ry > vpH + 10 || ry + rp < -10) continue;
      if (isNoDate(r)) ndRow(W, r, ry, rp, X, zoomed, o, out, scrubDay);
      else inRow(W, r, ry, rp, X, zoomed, o, out, scrubDay);
    }
  }
  const bot = Y(W.H - W.FOOT);
  out[pzAt] = `<i class="bw-pz" style="left:${px(lx)};width:${px(Math.max(0, endX - lx))};top:${px(top)};height:${px(Math.max(0, bot - top))}"></i>`;
  /* zoomed in to Weeks only (rows 44px or more): very fine gridlines down from each ruler mark, behind the bars */
  if (zoomed && rp >= 44) { const gt = Math.max(top, TOP + RULE); out[gridAt] = ruler.marks.filter(([x]) => x > 0 && x < vpW).map(([x]) => `<i class="bw-grid" data-bw="grid" style="left:${px(x)};top:${px(gt)};height:${px(Math.max(0, bot - gt))}"></i>`).join(""); }
  const lt = TOP + 4 + 20;
  if (rt != null ? lx >= 0 && lx <= vpW : lx >= 44 && lx <= vpW - 44) out.push(`<i class="bw-fline" data-bw="line" style="left:${px(lx)};top:${px(lt)};height:${px(Math.max(0, bot - lt))}"></i>`);
  /* zoomed in: a soft white fade at each side below the ruler, in place of v2's per-row arrows */
  if (zoomed && rt == null) { const ft = TOP + RULE; out.push(`<i class="bw-efd l" data-bw="fade" style="top:${px(ft)}"></i><i class="bw-efd r" data-bw="fade" style="top:${px(ft)}"></i>`); }
  out.push(heads.join(""));
  /* the scrubber's line */
  if (o.scrub != null) out.push(`<i class="bw-scl" data-bw="scrub" style="left:${px(o.scrub)};top:${px(TOP + RULE)};height:${px(Math.max(0, bot - TOP - RULE))}"></i>`);
  /* the ruler: its marks, the month pill at the daily level, the line's own pill */
  const off: -1 | 0 | 1 = rt != null ? 0 : lx < 44 ? -1 : lx > vpW - 44 ? 1 : 0;
  const pill = (label.length * 7.2 + 16) / 2 + 6, pw = label.length * 7.2 + 30, ml = lx < 44 ? 12 + pw + 8 : 12;
  /* ⚠️ v2's fix on the ref, kept: marks keep clear of the pill when it is pinned at the right edge ("Today →") */
  const rightLim = off > 0 ? vpW - 12 - (pw + 12) - 4 : vpW - 8;
  const marks = spaced(ruler.marks.filter(([x, t, day]) => { const half = (day ? t.length * 7 : t.length * 6.6) / 2; return x - half > (ruler.mon ? ml + 44 : lx < 44 ? ml : 8) && x + half < rightLim && Math.abs(x - lx) > half + pill; }));
  const ppos = off < 0 ? "left:12px;transform:none" : off > 0 ? "right:12px;left:auto;transform:none" : `left:${px(rt != null ? Math.max(40, Math.min(vpW - 40, lx)) : lx)}`;
  out.push(`<div class="bw-ruler" data-bw="ruler" data-tier="${ruler.tier}" style="top:${px(TOP)};height:${px(RULE)}"><i class="bw-rzone" style="left:${px(Math.max(0, lx))}"></i>${marks.map(([x, t, day]) => `<em class="bw-rm" data-bw="rm" data-day="${day ? 1 : 0}" style="left:${px(x)}">${t}</em>`).join("")}${ruler.mon ? `<b class="bw-rmon" data-bw="mon" style="left:${px(lx < 44 ? 12 + label.length * 7.2 + 38 : 12)}">${monthOf(ruler.mon)}</b>` : ""}${off ? "" : `<i class="bw-rtick" style="left:${px(lx)}"></i>`}</div>`);
  out.push(`<button type="button" class="bw-flab${off ? " off" : ""}" data-bw="pill" data-a="toline" data-off="${off}" style="top:${px(TOP + 4)};${ppos}">${off < 0 ? "← " : ""}${label}${off > 0 ? " →" : ""}</button>`);
  /* the scrubber's pill on the ruler: its day, and how many were out then on thin rows */
  if (o.scrub != null && scrubDay != null) out.push(`<div class="bw-scp" data-bw="scrub-pill" style="left:${px(Math.max(70, Math.min(vpW - 70, o.scrub)))};top:${px(TOP + 3)}"><b>${scrubDay === 0 ? "Today" : dm(scrubDay, o.nowMs)}</b>${rp < 24 ? ` · ${outOn(o.rows, scrubDay)} out` : ""}</div>`);
  return { html: out.join(""), lx, off, zoomed, top: TOP, label, scrubDay };
}
