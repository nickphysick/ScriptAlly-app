/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcExpanded — the Birds-eye view grown (v65 §7, §8.1, §8.2).
 *
 * ⚠️ IT IS THE SAME CARD, AND THE REVEAL IS WHAT SAYS SO. It keeps the rail's top, bottom and right
 * and grows leftwards; the opening is a `clip-path` uncovering it from the rail's own width, not a
 * fade or a slide. A card that faded in would be a NEW card appearing where the old one was, which
 * is a different thing to say about the same view.
 *
 * ⚠️ THE BOX IS MEASURED OFF THE WINDOW CAPSULE, never the viewport — `expandedBox` in `QcRail`.
 * The mockup writes `calc(100vw − 224px − 44px)` because in a drawn page the nav is a constant;
 * here the sidebar collapses, and a width taken from `100vw` runs the card off the screen the
 * moment it does.
 *
 * ⚠️ AND THE PAGE BEHIND KEEPS ITS SCROLL POSITION. The lock goes on the stage through
 * `stageScroll`, which is the app's one wedge-proof release — never `document.body.overflow`, which
 * this repo has had to unpick twice.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockStageScroll } from "../../../lib/stageScroll";
import { ATTENTION_HINT, ATTENTION_LABEL, ATTENTION_ORDER, type Attention } from "../../../lib/qcBirdsEye";
import { CAL_DEFAULT, attentionCounts, type CalView } from "../../../lib/qcCalView";
import { QcCalControls, type CalMenu } from "./QcCalControls";
import { NAMES_W, QcTimeline } from "./QcTimeline";
import type { QcRow } from "../../../lib/qcSummary";
import { COURIER_CUTOUT } from "./qcArt";
import { expandedBox, readWindow, type ExpandedBox } from "./QcRail";
import "./qcvExpanded.css";

type Box = ExpandedBox;

/**
 * §8.1 — the names column's width, which the Courier's column matches exactly.
 *
 * ⚠️ IT IS THE TIMELINE'S OWN NUMBER, IMPORTED — never a second 260. §10 lock 4 states the column's
 * width EQUALS the names column's right edge, so two constants that happen to agree would be the
 * claim restated rather than kept, and the first retune of one of them is where they part.
 */
export const LCOL = NAMES_W;

export const QcExpanded: React.FC<{
  rows: readonly QcRow[];
  nowMs: number;
  onClose: () => void;
  /** The query a rail row arrived from: ringed, and scrolled to the middle (§8.11). */
  focusId?: string | null;
  /** §8.11 — a row or a bar opens the query, centred and in focus. */
  onOpen: (id: string) => void;
  /** §8.7 — the dotted chip opens the app's nudge flow for that query. */
  onNudge: (id: string) => void;
  /** §8.3 — a package's name, for the package grouping. */
  packageName?: (id: string) => string | null;
}> = ({ rows, nowMs, onClose, focusId = null, onOpen, onNudge, packageName }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  /* §8.3 — one value for whose court, which groups, how grouped and how sorted. */
  const [view, setView] = useState<CalView>(CAL_DEFAULT);
  const [menu, setMenu] = useState<CalMenu>(null);
  const menuRef = useRef<CalMenu>(null);
  menuRef.current = menu;
  const [open, setOpen] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  /**
   * The box: its top and bottom from the WINDOW, its left and right from the GROUP (v65.2 §2).
   *
   * ⚠️ TWO BOXES, BECAUSE THE CARD ANSWERS TO TWO THINGS. It grows out of the rail, which is the
   * group's second column, so its horizontal extent is the group's — on a wide screen the window's
   * edges are hundreds of pixels of desk further out, and the card would leave the page it belongs
   * to behind. Vertically the group has no extent of its own, so those stay the window's.
   */
  useLayoutEffect(() => {
    const read = () => {
      /* the card is portalled to `body`, so both reads reach the shell through the document */
      const win = readWindow(ref.current);
      const g = document.querySelector(".qcv-group") as HTMLElement | null;
      const gb = g ? g.getBoundingClientRect() : null;
      setBox(win && gb && gb.width > 0 ? expandedBox(win, { left: gb.left, right: gb.right }) : null);
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    const win = document.querySelector(".ws-window");
    if (win) ro.observe(win);
    const grp = document.querySelector(".qcv-group");
    if (grp) ro.observe(grp);
    ro.observe(document.documentElement);
    window.addEventListener("resize", read);
    return () => { ro.disconnect(); window.removeEventListener("resize", read); };
  }, []);

  /* the reveal runs on the frame after the box lands, so it has somewhere to reveal FROM */
  useEffect(() => {
    if (!box) return undefined;
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [box]);

  /**
   * ⚠️ ESCAPE IS CAPTURED AND STOPPED HERE, and that is the difference from the page's own handler.
   * This is a modal over the page: the page's Escape closes an open QUERY, and if both ran, one key
   * would do two things at once. The card's own ✕ and the backdrop do the same act.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      /* ⚠️ THE CASCADE, AND IT IS ONE HANDLER ON PURPOSE (§8.3). An open popover consumes the key
         and closes itself; only a closed one lets it reach the card. Giving the popover its own
         `document` listener would make the cascade depend on which of the two registered last,
         which is a property of mount order rather than of what is on screen. */
      if (menuRef.current) { setMenu(null); return; }
      closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  /**
   * ⚠️ TWO SCROLLERS, AND `lockStageScroll` ONLY REACHES ONE OF THEM. It locks the shell's stage,
   * which is what every full-screen overlay in this app has needed since the AppShell migration —
   * but the Query Centre does not scroll there. Its page scrolls inside `.wpg-scroll`, the
   * workspace grid's own scroller, and a wheel over the backdrop moved the ledger behind the card.
   * Found by measuring, not by reading: the shared lock was applied and correct, and the page
   * scrolled anyway.
   *
   * ⚠️ THE PAGE'S OWN SCROLLER IS LOCKED HERE RATHER THAN IN `stageScroll`, deliberately. That lib
   * is the app's shared one; teaching it about a workspace grid so one page can borrow it is the
   * coupling this repo already refused once (the marketing nav and `MobileSheet`). This component
   * knows which scroller its page uses; the shared lib does not have to.
   *
   * ⚠️ AND THE RELEASE RESTORES THE EMPTY STRING, never a captured value — the same rule
   * `lockStageScroll` states for itself. A lock that puts back what it found is a lock that can be
   * wedged by a second one, or by a route change between the two halves.
   */
  useEffect(() => {
    const releaseStage = lockStageScroll();
    const port = document.querySelector(".qcv-page")?.closest(".wpg-scroll") as HTMLElement | null;
    if (port) port.style.overflow = "hidden";
    return () => {
      releaseStage();
      const el = document.querySelector(".qcv-page")?.closest(".wpg-scroll") as HTMLElement | null;
      if (el) el.style.overflow = "";
    };
  }, []);

  /**
   * ⚠️ THE CLOCK IS FROZEN WHEN THE CARD OPENS, and that is not an optimisation. `nowMs` arrives as
   * `Date.now()` written inline at the mount, so it is a NEW value on every render of the page —
   * which made every memo in the body a new object every time, and the frame that places the scroll
   * was cancelled by its own effect re-running before it could fire. The view opened two and a half
   * years in the past with `scrollLeft` at 0, and every case passed.
   *
   * ⚠️ AND IT IS RIGHT ON ITS OWN TERMS. This view draws today as a LINE; a today that moved
   * because a parent re-rendered would slide the line, the pill and every bar's end under the
   * reader mid-session. A few minutes' staleness is the correct trade, and the card is re-opened
   * often enough that it never shows.
   */
  const [clock] = useState(() => nowMs);
  /* §8.2 — the whole live pipeline's counts, whatever the filter says */
  const counts = attentionCounts(rows, clock);
  const close = useCallback(() => closeRef.current(), []);

  return createPortal(
    <div className="qcv-xp" data-qcv="expanded" role="dialog" aria-modal="true" aria-label="Birds-eye view">
      <div className="qcv-xp-back" data-qcv="xp-back" onClick={close} aria-hidden="true" />
      <div
        ref={ref}
        className={`qcv-xp-card${open ? " qcv-xp-card--in" : ""}`}
        data-qcv="xp-card"
        /* ⚠️ `--qcv-xp-lcol` IS PUBLISHED HERE. The tray read it with a 260px fallback and nothing
           set it — a rule that looks parameterised and is not, which is how the next reader goes
           looking for a knob that does not exist. The fallback WAS the value; now the value is. */
        style={{ ...(box ? { top: box.top, left: box.left, width: box.width, height: box.height } : {}), ["--qcv-xp-lcol" as string]: `${LCOL}px` }}
      >
        {/* §8 — the header ground is ONE BLOCK: the tray's colour runs the full width and carries on
            down through the date row, so the two read as a single coloured band over white rows. */}
        <header className="qcv-xp-tray" data-qcv="xp-tray">
          <div className="qcv-xp-col" data-qcv="xp-col" style={{ width: LCOL }}>
            {/* ⚠️ THE ✕ IS THE TOPMOST THING AT ITS OWN CENTRE — it sits over the Courier, and a
                drawing painted above it would make the one way out unclickable. */}
            <button type="button" className="qcv-xp-x" data-qcv="xp-close" aria-label="Close the Birds-eye view" onClick={close}>✕</button>
            <img
              className="qcv-xp-art"
              data-qcv="xp-art"
              src={`${COURIER_CUTOUT.src}?v=${COURIER_CUTOUT.version}`}
              width={COURIER_CUTOUT.width}
              height={COURIER_CUTOUT.height}
              alt=""
              aria-hidden="true"
            />
            {/* §8.1 — Filter, Sort and ↺ over the Courier's feet, centred on the column */}
            <QcCalControls view={view} onView={setView} menu={menu} onMenu={setMenu} counts={counts} />
          </div>
          <h2 className="qcv-xp-ttl" data-qcv="xp-title">Birds-eye view</h2>
          {/* §8.2 — the three stat cards ARE the attention filter: click to select, click again to
              release, multi-select. A group with none is drawn and disabled, because its absence is
              the fact the card is stating. */}
          <div className={`qcv-xp-stats${view.attention.length ? " qcv-xp-stats--filtered" : ""}`} data-qcv="xp-stats">
            {ATTENTION_ORDER.map((k: Attention) => {
              const count = counts[k];
              const on = view.attention.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  className={`qcv-xp-stat qcv-xp-stat--${k}${count === 0 ? " qcv-xp-stat--none" : ""}${on ? " qcv-xp-stat--on" : ""}`}
                  data-qcv="xp-stat"
                  data-group={k}
                  data-on={on ? "true" : "false"}
                  aria-pressed={on}
                  disabled={count === 0}
                  onClick={() => setView((v) => ({ ...v, attention: v.attention.includes(k) ? v.attention.filter((a) => a !== k) : [...v.attention, k] }))}
                >
                  <b className="qcv-xp-n">{count}</b>
                  <span className="qcv-xp-nm">{ATTENTION_LABEL[k]}</span>
                  <small className="qcv-xp-hint">{ATTENTION_HINT[k]}</small>
                </button>
              );
            })}
          </div>
        </header>
        <div className="qcv-xp-body" data-qcv="xp-body" data-focus={focusId ?? undefined}>
          <QcTimeline rows={rows} view={view} packageName={packageName} nowMs={clock} focusId={focusId} onOpen={onOpen} onNudge={onNudge} />
        </div>
      </div>
    </div>,
    document.body,
  );
};
