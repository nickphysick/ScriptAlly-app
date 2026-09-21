/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcOverview — where `/queries` lands (v21 §3). Two blocks and nothing else: a stat card per status,
 * and the three portal tiles that are the only way into a view.
 *
 * ⚠️ IT HAS NO FILTER SENTENCE, NO VIEW, NO DOCKED CARD AND NO STRIP (§4). Every one of those was
 * on the page it replaced, and the temptation will be to put one back "just for convenience" — the
 * Overview is the stat row and the portal, and a filter here would be a second way of doing what
 * the fan and the views already do.
 *
 * ⚠️ A STAT CARD DOES NOT FILTER — IT DEALS. Clicking one fans that status's queries out as full
 * cards (§5, phase 5). It states a count and its fan is exactly that count, because both read
 * `rowsForCard`; see the note over the selectors in `lib/qcSummary.ts`.
 *
 * ⚠️ THE MINIATURES ARE DECORATION, AND THEY ARE `aria-hidden`. They are a picture of what each view
 * looks like, drawn in HTML and CSS from the state tokens so they follow the palette — NOT a render
 * of the reader's own queries. Anything here that started reading real data would be a fourth view
 * nobody asked for, kept in step with three others by hand.
 */
import React from "react";
import { FramedCard } from "../../containers/FramedCard";
import { StatusDot } from "../../StatusDot";
import { STATE_TOKEN } from "../../../lib/queryCardFacts";
import { stateFor } from "../../../lib/queryCardFacts";
import type { OverviewCard, OverviewKey } from "../../../lib/qcSummary";
import { QC_VIEWS, type QcPortalView, type QcView } from "./QcCentre";
import "../../shell/primitives.css";
import "./qcvPage.css";
import "./qcOverview.css";

/**
 * ⚠️ THE THREE ART SLOTS, IN ONE CONSTANT (§3.2). Each tile reserves a rectangle for a character and
 * renders NOTHING in it; the art is a separate job. Keeping the three rects here means the
 * illustrations can drop in later without anybody touching a layout — which is the whole reason the
 * brief asked for one constant rather than three `position: absolute` rules scattered through a
 * stylesheet.
 */
export const QC_PORTAL_ART: Record<QcPortalView, { w: number; h: number; where: string }> = {
  list: { w: 112, h: 124, where: "bottom-right" },
  grid: { w: 104, h: 112, where: "top-right, over a card's top edge" },
  calendar: { w: 112, h: 124, where: "right edge on today's line, bottom 0" },
};

/* ── the miniatures: static pictures of the three views ───────────────────────────────────────── */

const MINI_STATES = ["queried", "you", "agent", "offer", "closed"] as const;
const tint = (i: number) => STATE_TOKEN[MINI_STATES[i % MINI_STATES.length]];

const LedgerMini: React.FC = () => (
  <div className="qco-mini qco-mini--led" aria-hidden="true" data-qcv="mini-ledger">
    <span className="qco-lh" />
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className={`qco-lr${i === 0 ? " qco-lr--on" : ""}`}>
        <span className="qco-chip" style={{ background: tint(i) }} />
        <span className="qco-bars">
          <i className="qco-b qco-b--dark" /><i className="qco-b qco-b--light" />
        </span>
        <span className="qco-bars">
          <i className="qco-b qco-b--dark" /><i className="qco-b qco-b--light" />
        </span>
        <span className="qco-mats">
          <i className="qco-m qco-m--dark" /><i className="qco-m qco-m--dark" />
          <i className="qco-m" /><i className="qco-m" />
        </span>
        <span className="qco-date"><i style={{ background: tint(i) }} /></span>
      </div>
    ))}
  </div>
);

const ListMini: React.FC = () => (
  <div className="qco-mini qco-mini--list" aria-hidden="true" data-qcv="mini-list">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="qco-tile">
        <span className="qco-band" style={{ background: tint(i) }} />
        <span className="qco-tb qco-tb--dark" /><span className="qco-tb" /><span className="qco-tb qco-tb--short" />
      </div>
    ))}
  </div>
);

const CalendarMini: React.FC = () => (
  <div className="qco-mini qco-mini--cal" aria-hidden="true" data-qcv="mini-calendar">
    <span className="qco-axis">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} />)}</span>
    <span className="qco-today" />
    <span className="qco-lanes">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="qco-lane">
          <i className="qco-bar qco-bar--past" style={{ background: tint(i), left: `${4 + i * 5}%`, width: `${26 + i * 4}%` }} />
          <i className="qco-bar" style={{ background: tint(i + 1), left: `${34 + i * 6}%`, width: `${22 + (i % 3) * 7}%` }} />
        </span>
      ))}
    </span>
  </div>
);

const MINI: Record<QcPortalView, React.FC> = { list: LedgerMini, grid: ListMini, calendar: CalendarMini };

/* ── the page ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * How much room the portal actually has, published as `--qco-avail`.
 *
 * ⚠️ `100vh` OVER-CLAIMS BY EXACTLY WHERE THE PAGE STARTS, and this is the third time that has been
 * written down in this repo (the Tasks chassis's unreachable 21px; the builder's sticky panel). The
 * brief's `calc(100vh - 430px)` is right for the mockup, whose page begins at the top of the
 * window; here the beta strip, the top bar and the head put the portal ~150px down, so the tiles
 * ran 19px past the fold at 1440x860 — with `scrollHeight === clientHeight`, so nothing scrolled
 * and the last 19px were simply unreachable. Measured, not reasoned.
 *
 * ⚠️ IT MEASURES THE PORTAL'S OWN TOP rather than assuming a chrome height: the strip is
 * dismissible, the head's facts line can wrap, and the stat row is a card taller with a live R&R.
 * All three move the number, and none of them is 430.
 */
/** The air the portal leaves under itself — the page's own bottom gutter. */
const GUTTER_PX = 22;
function useAvailable(ref: React.RefObject<HTMLDivElement | null>): void {
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const top = el.getBoundingClientRect().top;
      /* a zero rect is the page not laid out yet — refuse it rather than publishing a wrong floor */
      if (top <= 0) return;
      /**
       * ⚠️ THE BOTTOM IS THE SCROLLER'S, NOT THE WINDOW'S — the same over-claim as sizing to `100vh`
       * from an element that does not start at y 0, arriving from the other end. `.wpg-scroll` begins
       * below the shell's bar and ends above the window's foot, so `window.innerHeight` is generous
       * by the whole of that inset: measured, the Overview fitted the window and overflowed its own
       * scroller by 88px, with the portal's foot dutifully above the fold the whole time.
       */
      const port = el.closest(".wpg-scroll");
      const bottom = port ? port.getBoundingClientRect().top + port.clientHeight : window.innerHeight;
      /**
       * ⚠️ AND THE PAGE'S OWN BOTTOM PADDING IS BELOW THE PORTAL, so it has to come off too. With
       * only the scroller's bottom the tiles ended 22px above the fold and the page still scrolled
       * by 68 — which is that padding, sitting under a portal already sized to fit. Measured rather
       * than typed: it is a live value on the page's rule, not a constant this file can hold.
       */
      const page = el.closest(".qcv-page");
      const padBottom = page ? parseFloat(getComputedStyle(page).paddingBottom) || 0 : 0;
      el.style.setProperty("--qco-avail", `${Math.max(0, Math.round(bottom - top - padBottom - GUTTER_PX))}px`);
    };
    read();
    window.addEventListener("resize", read);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
    if (ro && el.parentElement) ro.observe(el.parentElement);
    return () => { window.removeEventListener("resize", read); ro?.disconnect(); };
  });
}

export const QcOverview: React.FC<{
  cards: OverviewCard[];
  /**
   * Deal this card's queries.
   *
   * ⚠️ IT HANDS BACK THE ELEMENT IT WAS PRESSED FROM. The fan deals out of that element's centre
   * and returns focus into it on close, so the caller needs the node rather than a point — a
   * captured `{x, y}` serves the animation and silently drops the focus return.
   */
  onCard: (key: OverviewKey, el: HTMLElement) => void;
  /** Open a view. */
  onView: (v: QcView) => void;
  loading: boolean;
}> = ({ cards, onCard, onView, loading }) => {
  const portalRef = React.useRef<HTMLDivElement>(null);
  useAvailable(portalRef);
  return (
  <div className="qco" data-qcv="overview">
    {/* ⚠️ SEVEN CARDS, OR EIGHT WITH A LIVE R&R — the count comes from `overviewCards`, and the
        column template is set from the data rather than reserving a fixed seven. */}
    <div className="qco-stats" data-qcv="ov-stats" style={{ ["--qco-n" as string]: cards.length }}>
      {cards.map((c) => (
        <FramedCard
          key={String(c.key)}
          as="div"
          className={`qco-stat${c.count === 0 ? " qco-stat--none" : ""}`}
          probe="ov-card"
          rest={{
            role: "button",
            tabIndex: loading ? -1 : 0,
            "aria-disabled": loading || undefined,
            "data-key": String(c.key),
            onClick: (e: React.MouseEvent) => { if (!loading) onCard(c.key, e.currentTarget as HTMLElement); },
            onKeyDown: (e: React.KeyboardEvent) => {
              if (loading || (e.key !== "Enter" && e.key !== " ")) return;
              e.preventDefault();
              onCard(c.key, e.currentTarget as HTMLElement);
            },
          }}
        >
          <span className="qco-spine" style={{ background: STATE_TOKEN[stateFor(c.status)] }} aria-hidden="true" />
          <span className="qco-top">
            <StatusDot status={c.status} overrideSize={15} decorative />
            {c.rust && <i className="qco-rust" aria-hidden="true" />}
          </span>
          {loading ? (
            <>
              <span className="qco-fig qco-sk" aria-hidden="true" />
              <span className="qco-name qco-sk" aria-hidden="true" />
            </>
          ) : (
            <>
              <b className="qco-fig">{c.count}</b>
              <span className="qco-name">{c.name}</span>
            </>
          )}
          <span className={`qco-note${c.urgent ? " qco-note--urgent" : ""}`}>{loading ? "" : c.note}</span>
        </FramedCard>
      ))}
    </div>

    {/* the portal: the only way into a view */}
    <div className="qco-portal" data-qcv="ov-portal" ref={portalRef}>
      {QC_VIEWS.map((v) => {
        const Mini = MINI[v.key];
        return (
          <FramedCard
            key={v.key}
            as="div"
            className="qco-tilecard"
            probe="ov-tile"
            rest={{
              role: "button",
              tabIndex: 0,
              "data-view": v.key,
              onClick: () => onView(v.key),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onView(v.key);
              },
            }}
          >
            <span className="qco-th">
              <span className="qco-tname">{v.label}</span>
              <span className="qco-open">Open →</span>
            </span>
            <Mini />
            {/* ⚠️ RESERVED AND EMPTY. The rect is held so the art lands without moving anything. */}
            <span className="qco-art" data-qcv="ov-art" data-slot={v.key} aria-hidden="true" />
          </FramedCard>
        );
      })}
    </div>
  </div>
  );
};
