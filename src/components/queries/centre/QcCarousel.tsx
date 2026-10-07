/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCarousel — "Recently moved" (v126 §3): the last eight queries to move, as the app's one query
 * card, on the page ground under the desk.
 *
 * ⚠️ IT REPLACES THE FAN AND IS THE DESK'S ONLY SUBJECT. Pressing a desk section deals every query
 * in that court here, and nothing else on the page moves: the list below keeps its rows, its order
 * and its band counts. One reader of the desk's choice, so a chosen section can never narrow two
 * things at once and leave a reader unsure which of them answered the question.
 *
 * ⚠️ THE CARD IS `QueryCard`, DRESSED BY THIS HOST. Its 282px, the missing tab row, the status pill
 * on its own line and the ink button are `.qcv-cz .qcard` rules — the treatment follows the host,
 * as it did for the fan and the To-do reference card. No second card component.
 *
 * ⚠️ TWO DOORS PER CARD, AND THEY NEVER OVERLAP: the card opens the centred card (reading); its
 * foot's button opens the action drawer (acting). The button is told apart by its probe, so a click
 * on it never also opens the card underneath.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { QueryCard, type QueryCardModel } from "../../dashboard/QueryCard";
import { CZ_SORT_LABEL, type CzSort } from "../../../lib/qcCarousel";
import type { QcRow } from "../../../lib/qcSummary";
import "./qcvPage.css";
import "./qcvCarousel.css";
import { QcSectionHead } from "./QcArtSlot";

/** How far an arrow moves the track: two cards and their gaps. */
const STEP = 600;
/** The dots stop at eight; past that they stop being a count anyone reads. */
const MAX_DOTS = 8;

/**
 * v131 (desktop) — THE CAROUSEL WHILE LOADING: the same section, head and track in the real classes,
 * with card-sized placeholders, so the list below does not drop 468px when the data lands.
 * ⚠️ 316 IS THE QUERY CARD'S MEASURED HEIGHT (282 wide, the item's own width). The card is sized by its
 * content, so this is a reading, not an owned value: QC16 measures the list's top across the load
 * and fails the day the card's height moves away from it.
 */
export const QcCarouselSkeleton: React.FC = () => (
  <section className="qcv-cz qc13-sec qc13-cz" data-qcv="cz" data-sk="true" aria-hidden="true">
    <QcSectionHead spot="recently-updated" probe="cz-head" title="Recently updated" />
    <div className="qcv-cz-trackw">
      <div className="qcv-cz-track qcv-skw" data-qcv="cz-track" style={{ overflow: "hidden" }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="qcv-cz-item" data-qcv="sk-card">
            <span className="qcv-sk" style={{ width: 282, height: 316, borderRadius: 12 }} />
          </div>
        ))}
      </div>
    </div>
    <div className="qcv-cz-dots" aria-hidden="true" />
  </section>
);

export const QcCarousel: React.FC<{
  /** what the carousel deals, already chosen and ordered (`carouselRows`) */
  rows: readonly QcRow[];
  /** "Recently moved", or the chosen court's name */
  title: string;
  /** "LAST 8 OF 27" */
  countLine: string;
  /** the chosen court's name and count — set, the head shows the chip and hides the sort */
  chosen: { name: string; count: number } | null;
  onClear: () => void;
  sort: CzSort;
  onSort: (s: CzSort) => void;
  /** the model for one row's card; its `onOpenQuery` is the foot button's act */
  model: (row: QcRow) => QueryCardModel;
  /** whether a row's foot button has an act; without one the button opens the card */
  onOpen: (id: string) => void;
  total: number;
  onSeeAll: () => void;
  onBirdsEye: () => void;
  /**
   * v131 §3 (desktop): the section head — the art slot, "Recently updated" or the chosen section's
   * name, the "N queries · show recently updated" line while a section is chosen, and the sort and
   * arrows on the right. No counter and no live sentence. Below 768px the v126 head is kept.
   */
  v131?: boolean;
}> = ({ rows, title, countLine, chosen, onClear, sort, onSort, model, onOpen, total, onSeeAll, onBirdsEye, v131 = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [dots, setDots] = useState({ n: 1, on: 0 });

  /* ⚠️ DERIVED FROM THE TRACK ON EVERY SCROLL AND RESIZE, never counted from the rows: a page of
     cards is a fact about the track's width, which the rows know nothing about. */
  const readDots = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const n = Math.max(1, Math.min(MAX_DOTS, Math.ceil(el.scrollWidth / el.clientWidth)));
    const span = Math.max(1, el.scrollWidth - el.clientWidth);
    const on = Math.round((el.scrollLeft / span) * (n - 1));
    setDots((d) => (d.n === n && d.on === on ? d : { n, on }));
  }, []);
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    el.scrollLeft = 0;
    readDots();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(readDots);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows, readDots]);

  /* the sort menu closes on a press outside it and on Escape — and Escape stops there */
  useEffect(() => {
    if (!sortOpen) return undefined;
    const away = (e: PointerEvent) => { if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [sortOpen]);

  const by = (dx: number) => trackRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <section className={`qcv-cz${v131 ? " qc13-sec qc13-cz" : ""}`} data-qcv="cz" aria-label={chosen && v131 ? chosen.name : title}>
      {v131 ? (
        <QcSectionHead
          spot="recently-updated"
          probe="cz-head"
          title={chosen ? chosen.name : "Recently updated"}
          line={chosen ? (
            <>{chosen.count} {chosen.count === 1 ? "query" : "queries"} · <button type="button" className="qc13-link" data-qcv="cz-clear" onClick={onClear}>show recently updated</button></>
          ) : null}
          controls={(
            <>
            <div className="qcv-cz-sortw" ref={sortRef}>
            <button type="button" className="qcv-cz-sort" data-qcv="cz-sort" aria-haspopup="menu" aria-expanded={sortOpen}
              onClick={() => setSortOpen((o) => !o)}
              onKeyDown={(e) => { if (e.key === "Escape" && sortOpen) { e.preventDefault(); e.stopPropagation(); setSortOpen(false); } }}>
              {CZ_SORT_LABEL[sort]} <span aria-hidden="true">⌄</span>
            </button>
            {sortOpen && (
              <div className="qcv-cz-menu" role="menu" data-qcv="cz-menu"
                onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setSortOpen(false); } }}>
                {(Object.keys(CZ_SORT_LABEL) as CzSort[]).map((k) => (
                  <button type="button" role="menuitemradio" aria-checked={sort === k} key={k}
                    className={sort === k ? "on" : undefined} onClick={() => { onSort(k); setSortOpen(false); }}>
                    {CZ_SORT_LABEL[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
              <button type="button" className="qcv-cz-ar" data-qcv="cz-prev" aria-label="Earlier cards" onClick={() => by(-STEP)}>‹</button>
              <button type="button" className="qcv-cz-ar" data-qcv="cz-next" aria-label="Later cards" onClick={() => by(STEP)}>›</button>
            </>
          )}
        />
      ) : (
      <div className="qcv-cz-head" data-qcv="cz-head">
        <b className="qcv-cz-title">{chosen ? `${chosen.name} · ${chosen.count}` : title}</b>
        {chosen
          ? <button type="button" className="qcv-cz-x" data-qcv="cz-clear" aria-label={`Clear ${chosen.name}`} onClick={onClear}>×</button>
          : <span className="qcv-cz-n" data-qcv="cz-n">{countLine}</span>}
        <span className="qcv-cz-sp" />
        {!chosen && (
          <div className="qcv-cz-sortw" ref={sortRef}>
            <button type="button" className="qcv-cz-sort" data-qcv="cz-sort" aria-haspopup="menu" aria-expanded={sortOpen}
              onClick={() => setSortOpen((o) => !o)}
              onKeyDown={(e) => { if (e.key === "Escape" && sortOpen) { e.preventDefault(); e.stopPropagation(); setSortOpen(false); } }}>
              {CZ_SORT_LABEL[sort]} <span aria-hidden="true">⌄</span>
            </button>
            {sortOpen && (
              <div className="qcv-cz-menu" role="menu" data-qcv="cz-menu"
                onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setSortOpen(false); } }}>
                {(Object.keys(CZ_SORT_LABEL) as CzSort[]).map((k) => (
                  <button type="button" role="menuitemradio" aria-checked={sort === k} key={k}
                    className={sort === k ? "on" : undefined} onClick={() => { onSort(k); setSortOpen(false); }}>
                    {CZ_SORT_LABEL[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button type="button" className="qcv-cz-ar" data-qcv="cz-prev" aria-label="Earlier cards" onClick={() => by(-STEP)}>‹</button>
        <button type="button" className="qcv-cz-ar" data-qcv="cz-next" aria-label="Later cards" onClick={() => by(STEP)}>›</button>
      </div>
      )}
      <div className="qcv-cz-trackw">
        <div className="qcv-cz-track" data-qcv="cz-track" ref={trackRef} tabIndex={0} role="list"
          aria-label={chosen ? `${chosen.name}: ${chosen.count} queries` : `${title}: ${countLine.toLowerCase()}`}
          onScroll={readDots}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "ArrowRight") { e.preventDefault(); by(300); }
            if (e.key === "ArrowLeft") { e.preventDefault(); by(-300); }
          }}>
          {rows.map((r) => (
            <div key={r.id} className="qcv-cz-item" role="listitem" data-qcv="cz-item" data-qid={r.id} data-last={r.lastMs}
              tabIndex={0} aria-label={`${r.agentName}${r.agency ? `, ${r.agency}` : ""} — open`}
              onClick={(e) => { if ((e.target as HTMLElement).closest('[data-qcv="cz-act"]')) return; onOpen(r.id); }}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(r.id); } }}>
              <QueryCard model={model(r)} actionProps={{ "data-qcv": "cz-act" }} />
            </div>
          ))}
          {!chosen && (
            <div className="qcv-cz-end" data-qcv="cz-end">
              <button type="button" onClick={onSeeAll}>See all {total} in the list below ↓</button>
              <button type="button" className="qcv-cz-endsm" onClick={onBirdsEye}>Or open the Birds-eye view</button>
            </div>
          )}
        </div>
      </div>

      <div className="qcv-cz-dots" data-qcv="cz-dots" aria-hidden="true">
        {Array.from({ length: dots.n }, (_, i) => <i key={i} className={i === dots.on ? "on" : undefined} />)}
      </div>
    </section>
  );
};
