/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SearchPalette — the command palette (ref design-refs/scriptally-search-palette.html).
 *
 * ⚠️ THIS IS THE APP'S ONE SEARCH. It replaced `NavSearch` rather than joining it: the bar's
 * field is now an OPENER, and the mobile slim bar's search toggle opens this too. If a second
 * search implementation ever appears, one of them is wrong.
 *
 * Everything it searches is already in memory (DbProvider subscribes on every route), so there
 * is no debounce, no loading state and no fetch. Ranking, grouping and highlighting are the pure
 * `lib/searchPalette` core; this file owns presentation, keyboard, focus and dispatch.
 */
import { createPortal } from "react-dom";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus, Reply, UserPlus, BookPlus, Send, LayoutGrid, Settings, HelpCircle, Book } from "lucide-react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { invokeCapture } from "./railNav";
import {
  GROUP_ORDER, PaletteItem, PaletteKind, PaletteRun, emptyStateItems, highlightParts,
} from "../../lib/searchPalette";
import { PaletteBox, palettePosition } from "../../lib/palettePosition";
import searchMark from "../../assets/shell/search-icon.png";
import "./searchPalette.css";

/** Row glyphs by kind — lucide, as everywhere else in the shell (TypeGlyph stays locked to
 *  material types and is not involved). */
const KIND_ICON: Record<PaletteKind, React.ReactNode> = {
  act: <Plus aria-hidden="true" />,
  agent: <UserPlus aria-hidden="true" />,
  query: <Send aria-hidden="true" />,
  ms: <Book aria-hidden="true" />,
  page: <LayoutGrid aria-hidden="true" />,
};

/** A few actions/pages read better with their own glyph than their kind's default. */
const ID_ICON: Record<string, React.ReactNode> = {
  "act:query": <Send aria-hidden="true" />,
  "act:record": <Reply aria-hidden="true" />,
  "act:agent": <UserPlus aria-hidden="true" />,
  "act:manuscript": <BookPlus aria-hidden="true" />,
  "page:account": <Settings aria-hidden="true" />,
  "page:task-settings": <Settings aria-hidden="true" />,
  "page:help": <HelpCircle aria-hidden="true" />,
};

export interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  /** The legacy navigate bridge — every capture and subpage action goes through it. */
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  /** Router-direct path navigation (pages) — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
  /** The full ranked corpus for the typed term, and the items shown when nothing is typed. */
  items: PaletteItem[];
  /** Seeds the Agents page's list filter when an agent row is opened (existing behaviour). */
  setSearchQuery: (q: string) => void;
  /** Focus returns here on close — the control that opened it. */
  openerRef?: React.RefObject<HTMLElement | null>;
  /** The live search term, owned by the host so ⌘K can clear it on open. */
  term: string;
  setTerm: (t: string) => void;
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({
  open, onClose, onNavigate, onNavigatePath, items, setSearchQuery, openerRef, term, setTerm,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const palRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);

  const rows = useMemo(
    () => (term.trim() ? items : emptyStateItems()),
    [term, items]
  );

  // The selection can never point past the list — the term changes under it on every keystroke.
  useEffect(() => { setSel(0); }, [term]);

  // OPENING focuses and selects the input; CLOSING returns focus to the opener. Without the
  // return, closing the palette leaves focus on <body> and the next Tab starts from the top of
  // the page, which is a small thing that feels broken every single time.
  useEffect(() => {
    if (!open) return;
    const el = inputRef.current;
    el?.focus();
    el?.select();
  }, [open]);
  const closeAndReturn = useCallback(() => {
    onClose();
    // after the overlay unmounts, or the focus call lands on a node that is going away
    window.setTimeout(() => openerRef?.current?.focus(), 0);
  }, [onClose, openerRef]);

  const perform = useCallback((run: PaletteRun) => {
    switch (run.kind) {
      case "capture":
        invokeCapture(run.capture, onNavigate);
        break;
      case "navigate":
        onNavigate(run.tab, run.sub);
        break;
      case "path":
        onNavigatePath(run.path);
        break;
      case "query":
        // the existing deep-selection contract: onNavigate("queries", <query id>)
        onNavigate("queries", run.queryId);
        break;
      case "agent":
        // the existing behaviour: the Agents page, seeded with the name as its list filter
        setSearchQuery(run.name);
        onNavigatePath("/agents");
        break;
      case "logQueryTo":
        // JUMP TO — the existing preselect seam (LogQueryFocusForm's initialAgentId), never a
        // new form and never a new handler.
        onNavigate("queries", "Log a query", { agentId: run.agentId });
        break;
    }
  }, [onNavigate, onNavigatePath, setSearchQuery]);

  const activate = useCallback((item: PaletteItem) => {
    closeAndReturn();
    perform(item.run);
  }, [closeAndReturn, perform]);

  // Keyboard. Bound to the OVERLAY, not the window: the palette is modal, so it should not be
  // reaching for keys while it is shut.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); closeAndReturn(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length) return;
      const next = e.key === "ArrowDown"
        ? (sel + 1) % rows.length
        : (sel - 1 + rows.length) % rows.length;
      setSel(next);
      // scrollIntoView on the row, not the container — the groups make the maths unreliable
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = rows[sel];
      if (item) activate(item);
    }
  };

  /* ⚠️ MEASURED AND PORTALLED, because the pill sits inside `.ws-cscroll` (overflow:auto) inside
     `.ws-card` (overflow:hidden). An absolutely-positioned dropdown — which is what a standalone
     mockup can get away with — would be CLIPPED by the card at exactly the moment it mattered.
     Portalling to the body takes it out of that stacking context; the position then has to be
     computed rather than inherited, which is what `palettePosition` is for. */
  const [box, setBox] = useState<PaletteBox | null>(null);
  useLayoutEffect(() => {
    if (!open) { setBox(null); return; }
    const measure = () => {
      const el = openerRef?.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setBox(palettePosition(r, window.innerWidth, window.innerHeight));
    };
    measure();
    // Re-measured on resize AND on scroll: the anchor is inside a scrolling card, so a scroll
    // moves the pill without a resize ever firing.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, openerRef]);

  /* Click-outside. ⚠️ THERE IS NO SCRIM ANY MORE, so the dropdown cannot rely on one swallowing
     the click — it listens for itself, and ignores clicks on the pill so the opener's own toggle
     is not immediately undone by this. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (palRef.current?.contains(t)) return;
      if (openerRef?.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose, openerRef]);

  if (!open || typeof document === "undefined") return null;

  // Group headings are rendered by CHANGE OF GROUP down the ranked list, so a group's heading
  // appears exactly once and only when it has rows.
  let lastGroup: string | null = null;
  const selectedId = rows[sel] ? `sp-row-${sel}` : undefined;

  /* ⚠️ NO `aria-modal` NOW. It is a dropdown, not a modal: nothing behind it is inert, the page
     is not dimmed, and claiming modality to a screen reader would describe a trap that no longer
     exists. */
  return createPortal(
    <>
      <div
        ref={palRef}
        className="sp-pal"
        role="dialog"
        aria-label="Search"
        onKeyDown={onKeyDown}
        style={box ? { left: box.left, top: box.top, width: box.width } : { visibility: "hidden" }}
      >
        <div className="sp-in">
          {/* ⚠️ ILLUSTRATED, NOT MONOLINE (polish §2). The search is an OBJECT here — the thing
              you pick up to look with — which is the boundary the icon families draw: illustrated
              for objects and surfaces, monoline for navigation, state and controls. */}
          <img className="sp-in-mark" src={searchMark} alt="" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search agents, queries, pages — or start something"
            autoComplete="off"
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="sp-list"
            aria-activedescendant={selectedId}
          />
          <span className="sp-esc" aria-hidden="true">ESC</span>
        </div>

        <div
          className="sp-list"
          id="sp-list"
          role="listbox"
          aria-label="Results"
          ref={listRef}
          style={box ? { maxHeight: box.maxListHeight } : undefined}
        >
          {rows.length === 0 ? (
            <div className="sp-empty">Nothing matches “{term.trim()}”.</div>
          ) : (
            rows.map((item, i) => {
              const heading = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <React.Fragment key={`${item.id}-${i}`}>
                  {heading && <div className="sp-grp">{heading}</div>}
                  <div
                    id={`sp-row-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={i === sel}
                    className={`sp-res${i === sel ? " sel" : ""}`}
                    // Hover moves the SELECTION rather than painting a separate hover state, so
                    // the mouse and the keyboard can never disagree about what Enter would open.
                    onMouseEnter={() => setSel(i)}
                    onClick={() => activate(item)}
                  >
                    <span className={`sp-ic ${item.kind}`}>
                      {item.status
                        // THE REAL StatusDot — never a locally drawn circle, so a query's state
                        // is the same glyph here as everywhere else in the app.
                        ? <StatusDot status={item.status as QueryStatus} overrideSize={14} decorative />
                        : ID_ICON[item.id] ?? KIND_ICON[item.kind]}
                    </span>
                    <span className="sp-tx">
                      <span className="sp-t1">
                        {highlightParts(item.title, term).map((p, j) =>
                          p.match ? <mark key={j}>{p.text}</mark> : <React.Fragment key={j}>{p.text}</React.Fragment>
                        )}
                      </span>
                      {item.subtitle && <span className="sp-t2">{item.subtitle}</span>}
                    </span>
                    {item.meta && <span className="sp-meta">{item.meta}</span>}
                    {item.shortcut && <span className="sp-kb">{item.shortcut}</span>}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="sp-foot">
          <span><i>↑</i><i>↓</i> Navigate</span>
          <span><i>↵</i> Open</span>
          <span><i>⌘↵</i> Open in new</span>
          <span className="sp-foot-end"><i>ESC</i> Close</span>
        </div>
      </div>
    </>,
    document.body,
  );
};

/** The group order, re-exported so the host and the locks share one import path of record. */
export { GROUP_ORDER };
