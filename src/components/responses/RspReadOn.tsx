/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase D (ref `summary`, `carousel`, `carWire`) — THE LINE OF FACTS and AGENTS WHO WANT TO READ ON.
 *
 * ⚠️ THE CARD IS THE QUERY CENTRE'S GRID CARD (`QcCard154`), IMPORTED UNCHANGED (decision 6): the same row, the same
 *    facts, the same track, paperclip, arrow chip and id. Its click opens the answer in the existing panel (`?answer=`);
 *    its arrow chip runs the row's own journey (`rowAct`), as on the Query Centre. It is wrapped in `.qc151.qc153`
 *    because its stylesheet is scoped there.
 * ⚠️ ARROWS AND DOTS ONLY ABOVE THREE CARDS (the ref's rule). The fading edge shows only where more cards lie.
 * ⚠️ EVERY FIGURE IS lib/responses (`factsLine`, `carouselOrder`): your move first, then the newest answer.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { factsLine, plural, type FactsLine, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { rowAct } from "../../lib/qc1512";
import type { DrawerMode } from "../../lib/queryActions/drawerStore";
import { QcCard154 } from "../queries/centre/QcCard154";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/** the ref's card width and gap (`.car .qc{flex:0 0 330px}`, `gap:14px`) */
export const CARD_W = 330;
export const CARD_GAP = 14;
export const SHOW_NAV_ABOVE = 3;
const GO = (flip?: boolean) => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={flip ? { transform: "scaleX(-1)" } : undefined}><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

/* ── the line of facts (ref `summary`); early days: the white note in its place ── */
export const RspFacts: React.FC<{
  items: readonly Item[];
  early: { out: number; queried: number; replies: number } | null;
  onAnalytics: () => void;
}> = ({ items, early, onAnalytics }) => {
  if (early) {
    return (
      <div className="rsp15-calm" data-rsp15="early">
        <p><b>It{"’"}s early days.</b> {early.out} of your {early.queried} queries are still with agents, and {plural(early.replies, "reply is", "replies is")} too few to read anything into.</p>
      </div>
    );
  }
  const f: FactsLine = factsLine(items);
  return (
    <div className="rsp15-sum" data-rsp15="facts">
      {f.avg != null ? <span data-rsp15="fact" data-k="avg">A first reply has taken <b>{plural(f.avg, "day", "days")}</b> on average</span> : null}
      <span data-rsp15="fact" data-k="notes"><b>{f.notes}</b> came with a note</span>
      <span data-rsp15="fact" data-k="past"><b>{f.past}</b> {f.past === 1 ? "agent" : "agents"} read past the query</span>
      <button type="button" className="rsp15-toan" data-rsp15="to-analytics" onClick={onAnalytics}>More in Analytics {"→"}</button>
    </div>
  );
};

/* ── Agents who want to read on (ref `carousel` + `carWire`) ── */
export const RspReadOn: React.FC<{
  items: Item[];
  nowMs: number;
  selectedId: string | null;
  packageNameOf: (r: QcRow) => string | null;
  onOpen: (i: Item) => void;
  onAct: (i: Item, mode: DrawerMode) => void;
}> = ({ items, nowMs, selectedId, packageNameOf, onOpen, onAct }) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ x: 0, max: 0, w: 0 });
  const nav = items.length > SHOW_NAV_ABOVE;
  const ym = items.filter((i) => i.yourMove).length;
  const step = CARD_W + CARD_GAP;
  const sync = useCallback(() => {
    const t = track.current;
    if (t) setView({ x: t.scrollLeft, max: Math.max(0, t.scrollWidth - t.clientWidth), w: t.clientWidth });
  }, []);
  useEffect(() => {
    const t = track.current;
    if (!t) return undefined;
    sync();
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
    t.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { t.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [sync, items.length]);
  if (!items.length) return null;
  const go = (left: number) => track.current?.scrollTo({ left, behavior: reduced() ? "auto" : "smooth" });
  const atStart = view.x <= 4, atEnd = view.x >= view.max - 4;
  /* the dots lit: the cards in view (the ref's rule) */
  const k = atEnd ? items.length - 1 : Math.round(view.x / step);
  const vis = Math.max(1, Math.floor((view.w || step) / step));
  const lit = (j: number) => (j >= k && j < k + vis) || (atEnd && j >= items.length - vis);
  const by = (id: string) => items.find((i) => i.id === id);
  return (
    <section className="rsp15-sec" data-rsp15="read-on" data-rsp5-sec="more" aria-labelledby="rsp15-more-h">
      <div className="rsp15-h2">
        <h2 id="rsp15-more-h" className="rsp15-h2t">Agents who want to read on</h2>
        <p data-rsp15="read-on-line">{items.length} asked to read more{ym ? `. ${ym} ${ym > 1 ? "are" : "is"} waiting on you.` : "."}</p>
        <span className="rsp15-sp" />
        {nav ? (
          <div className="rsp15-nav" data-rsp15="arrows">
            <button type="button" aria-label="Earlier cards" data-rsp15="prev" disabled={atStart} onClick={() => go(view.x - step)}>{GO(true)}</button>
            <button type="button" aria-label="More cards" data-rsp15="next" disabled={atEnd} onClick={() => go(view.x + step)}>{GO()}</button>
          </div>
        ) : null}
      </div>
      <div className="rsp15-band" data-rsp15="band">
        <div className="qc151 qc153 rsp15-car" ref={track} data-rsp15="track"
          style={{ ["--fl" as string]: !atStart ? "90px" : "0px", ["--fr" as string]: !atEnd ? "110px" : "0px" }}>
          {items.map((i) => (
            <QcCard154 key={i.id} row={i.row} nowMs={nowMs} selected={selectedId === i.id} packageName={packageNameOf(i.row)}
              act={rowAct(i.row, nowMs)}
              onOpen={(id) => { const x = by(id); if (x) onOpen(x); }}
              onAct={(id, mode) => { const x = by(id); if (x) onAct(x, mode ?? "resp"); }} />
          ))}
        </div>
        {nav ? (
          <div className="rsp15-dots" data-rsp15="dots">
            {items.map((x, j) => (
              <button key={x.id} type="button" aria-label={`Card ${j + 1}`} data-rsp15="dot" className={lit(j) ? "on" : undefined} onClick={() => go(j * step)} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
