/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 Part E — SHARE YOUR WALL, AS AN IMAGE: a white sheet under a navy row, with the preview on the left and
 * three switches on the right.
 *
 * ⚠️ `drawShare` IS THE REFERENCE'S, PORTED WHOLE: drawn client-side on a canvas once the fonts have loaded, with the
 *    brick tile as the wall. Only its inputs are this page's (the nos from `lib/responses`).
 * ⚠️ AGENT NAMES ARE OFF BY DEFAULT: initials only, so nobody is named in public by surprise.
 * ⚠️ NOTHING IS UPLOADED OR WRITTEN. "Save image" hands the browser a PNG made in the page (`queryhawk-wall-of-no.png`).
 */
import React, { useEffect, useRef, useState } from "react";
import { MONTHS_LONG, type RespItem } from "../../lib/responses";
import { MONTHS_SHORT } from "../../lib/dates";
import type { QcRow } from "../../lib/qcSummary";

type Item = RespItem<QcRow>;
export type Shape = "square" | "story";
export interface ShareOpts { shape: Shape; names: boolean; book: boolean; quiet: boolean }
export const SHARE_FILE = "queryhawk-wall-of-no.png";
export const TILE_SRC = "/images/responses/responses-wall-tile.webp";

const ROTS = [-1.6, 1.2, -0.7, 1.8, -1.2, 0.6, -1.9, 1.4, -0.9];
const fmt = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
/**
 * The canvas's three faces, read from the app's own custom properties rather than named here: the typewriter, the
 * serif and the mono are the shell's (`--sp-type`, `--sp-serif`, `--font-mono`), so the image draws in exactly the
 * faces the page does, and the family names stay owned by the stylesheets that declare them.
 */
export interface Faces { type: string; serif: string; mono: string }
export function readFaces(): Faces {
  const cs = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => (cs?.getPropertyValue(n).trim() || f);
  return { type: v("--sp-type", "monospace"), serif: v("--sp-serif", "serif"), mono: v("--font-mono", "monospace") };
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** the reference's `drawShare`, over this page's nos */
export function drawShare(canvas: HTMLCanvasElement, nos: readonly Item[], o: ShareOpts, title: string | null, tile: HTMLImageElement | null, F: Faces = readFaces()): void {
  const W = 1080, H = o.shape === "story" ? 1920 : 1080;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) return;
  const list = nos.filter((x) => o.quiet || x.group !== "noReply").slice().sort((a, b) => (b.answerMs ?? 0) - (a.answerMs ?? 0));
  g.fillStyle = "#131924"; g.fillRect(0, 0, W, H);
  if (tile && tile.complete && tile.naturalWidth) {
    const p = g.createPattern(tile, "repeat");
    if (p) { g.save(); g.scale(0.66, 0.66); g.fillStyle = p; g.fillRect(0, 0, W / 0.66, H / 0.66); g.restore(); }
  }
  const vg = g.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, "rgba(10,13,19,.8)"); vg.addColorStop(0.32, "rgba(10,13,19,.12)"); vg.addColorStop(0.72, "rgba(10,13,19,.25)"); vg.addColorStop(1, "rgba(10,13,19,.9)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.fillStyle = "#f4eee5"; g.font = `600 34px ${F.serif}`; g.textBaseline = "top"; g.fillText("QueryHawk", 64, 56);
  g.font = `400 ${H > W ? 150 : 124}px ${F.type}`; g.fillText("Wall of no", 58, H > W ? 150 : 118);
  const cols = H > W ? 4 : 5, cw = (W - 128 - (cols - 1) * 18) / cols, ch = cw * 1.25, top = H > W ? 390 : 300;
  const rowsFit = Math.max(1, Math.floor((H - (H > W ? 440 : 250) - top) / (ch + 20)));
  const show = list.slice(0, cols * rowsFit);
  show.forEach((x, i) => {
    const cx = 64 + (i % cols) * (cw + 18), cy = top + Math.floor(i / cols) * (ch + 20);
    const ini = x.row.initials;
    const quiet = x.group === "noReply";
    g.save(); g.translate(cx + cw / 2, cy + ch / 2); g.rotate((ROTS[i % ROTS.length] * Math.PI) / 180); g.translate(-cw / 2, -ch / 2);
    g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 18; g.shadowOffsetY = 8; g.fillStyle = "#fff"; rr(g, 0, 0, cw, ch, 12); g.fill(); g.shadowColor = "transparent";
    g.save(); rr(g, 0, 0, cw, ch, 12); g.clip(); g.fillStyle = "#ece8e3"; g.fillRect(0, 0, cw, 26); g.restore();
    g.fillStyle = "#b9b0a8"; g.beginPath(); g.arc(30, 56, 16, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = `600 12px ${F.mono}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ini, 30, 57);
    g.textAlign = "left"; g.fillStyle = "#1c130f"; g.font = `600 17px ${F.serif}`;
    g.fillText(o.names ? x.row.agentName : `${ini.split("").join(".")}.`, 54, 52, cw - 62);
    g.fillStyle = "rgba(28,19,15,.55)"; g.font = `500 11px ${F.mono}`;
    if (x.answerMs != null) g.fillText(fmt(x.answerMs).toUpperCase(), 54, 72);
    g.fillStyle = "#1c130f"; g.font = `400 30px ${F.type}`; g.textBaseline = "alphabetic";
    if (x.waitDays != null) {
      g.fillText(String(x.waitDays), 14, ch - 40);
      g.font = `400 13px ${F.serif}`; g.fillStyle = "rgba(28,19,15,.6)"; g.fillText(quiet ? "quiet days" : "days", 16, ch - 22);
    }
    g.save(); g.translate(cw - 48, ch - 44); g.rotate(-0.2); g.strokeStyle = "rgba(28,19,15,.75)"; g.lineWidth = 3;
    g.strokeRect(quiet ? -34 : -26, -18, quiet ? 68 : 52, 36); g.fillStyle = "rgba(28,19,15,.8)";
    g.font = quiet ? `400 14px ${F.type}` : `400 26px ${F.type}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(quiet ? "NO REPLY" : "NO", 0, 2);
    g.restore();
    g.restore();
  });
  if (list.length > show.length) {
    g.fillStyle = "rgba(244,238,229,.75)"; g.font = `500 22px ${F.mono}`; g.textBaseline = "top";
    g.fillText(`+ ${list.length - show.length} MORE ON THE WALL`, 64, top + rowsFit * (ch + 20));
  }
  const firstQ = nos.reduce<number | null>((m, x) => (x.queriedMs != null && (m == null || x.queriedMs < m) ? x.queriedMs : m), null);
  const r = list.filter((x) => x.group !== "noReply").length, n = list.length - r;
  g.fillStyle = "#f4eee5"; g.textBaseline = "alphabetic"; g.font = `400 ${H > W ? 84 : 70}px ${F.type}`;
  g.fillText(`${r} ${r === 1 ? "rejection" : "rejections"}${o.quiet && n ? `, ${n} no reply` : ""}`, 60, H - (H > W ? 170 : 96), W - 120);
  g.font = `400 34px ${F.serif}`; g.fillStyle = "rgba(244,238,229,.8)";
  const since = firstQ != null ? `querying since ${MONTHS_LONG[new Date(firstQ).getMonth()]} ${new Date(firstQ).getFullYear()}` : "";
  const bookPart = o.book && title ? `${title}${since ? " · " : ""}` : "";
  if (bookPart || since) g.fillText(`${bookPart}${since}`, 64, H - (H > W ? 112 : 44), W - 128);
}

const fontsReady = (): Promise<unknown> => {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.race([
    (() => { const F = readFaces(); return Promise.all([`400 40px ${F.type}`, `600 40px ${F.serif}`, `500 20px ${F.mono}`].map((f) => document.fonts.load(f))); })(),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
};

export const RspShare = React.forwardRef<HTMLElement, { nos: Item[]; title: string | null }>(({ nos, title }, ref) => {
  const [o, setO] = useState<ShareOpts>({ shape: "square", names: false, book: true, quiet: true });
  const [src, setSrc] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const tile = useRef<HTMLImageElement | null>(null);
  const [tileOk, setTileOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setTileOk(true);
    img.src = TILE_SRC;
    tile.current = img;
  }, []);
  const key = `${o.shape}|${o.names}|${o.book}|${o.quiet}|${tileOk}|${title}|${nos.map((n) => `${n.id}:${n.group}:${n.answerMs}`).join(",")}`;
  useEffect(() => {
    let live = true;
    fontsReady().then(() => {
      if (!live) return;
      const c = canvas.current ?? (canvas.current = document.createElement("canvas"));
      drawShare(c, nos, o, title, tile.current);
      setSrc(c.toDataURL("image/png"));
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = () => {
    const c = canvas.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = SHARE_FILE;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };
  const set = (p: Partial<ShareOpts>) => setO((x) => ({ ...x, ...p }));
  return (
    <section className="rsp-ws rsp-share" ref={ref} data-rsp="share" aria-label="Share your wall">
      <div className="rsp-wsh">
        <p className="rsp-say">Share your wall<span className="rsp-dim">, as an image</span></p>
        <div className="rsp-seg" role="group" aria-label="Shape">
          <button type="button" data-rsp="shape" data-shape="square" aria-pressed={o.shape === "square"} onClick={() => set({ shape: "square" })}>Square</button>
          <button type="button" data-rsp="shape" data-shape="story" aria-pressed={o.shape === "story"} onClick={() => set({ shape: "story" })}>Story</button>
        </div>
      </div>
      <div className="rsp-shb">
        <div className={`rsp-prev${o.shape === "story" ? " is-story" : ""}`} data-rsp="preview">
          {src ? <img src={src} alt="Preview of the image you'll share" data-rsp="preview-img" /> : <span className="rsp-prev-wait" aria-hidden="true" />}
        </div>
        <div>
          <p className="rsp-lede">Most published writers heard no many times before they found their agent. Sharing your wall shows writers who are just starting out that it{"’"}s a normal part of the process.</p>
          <div className="rsp-opt">
            <label htmlFor="rsp-o-names"><b>Agent names</b><small>Off by default, so nobody is named in public by surprise</small></label>
            <input type="checkbox" className="rsp-tg" id="rsp-o-names" data-rsp="opt-names" checked={o.names} onChange={(e) => set({ names: e.target.checked })} />
          </div>
          <div className="rsp-opt">
            <label htmlFor="rsp-o-book"><b>Book title</b><small>Shows {title ? <i>{title}</i> : "your book's title"} on the card</small></label>
            <input type="checkbox" className="rsp-tg" id="rsp-o-book" data-rsp="opt-book" checked={o.book} onChange={(e) => set({ book: e.target.checked })} />
          </div>
          <div className="rsp-opt">
            <label htmlFor="rsp-o-quiet"><b>No reply</b><small>Include queries closed after no reply</small></label>
            <input type="checkbox" className="rsp-tg" id="rsp-o-quiet" data-rsp="opt-quiet" checked={o.quiet} onChange={(e) => set({ quiet: e.target.checked })} />
          </div>
          <div className="rsp-sfoot">
            <span data-rsp="share-size">{o.shape === "story" ? "1080 × 1920 PNG" : "1080 × 1080 PNG"}</span>
            <button type="button" className="rsp-btn rsp-btn--navy rsp-btn--sm" data-rsp="save" disabled={!src} onClick={save}>Save image</button>
          </div>
        </div>
      </div>
    </section>
  );
});
RspShare.displayName = "RspShare";
