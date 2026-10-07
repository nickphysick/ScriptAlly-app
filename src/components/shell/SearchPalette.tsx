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
  GROUP_LABEL, GROUP_ORDER, PaletteItem, PaletteKind, PaletteRun, emptyStateItems, highlightParts,
} from "../../lib/searchPalette";
import { PaletteBox, palettePosition, visibleAnchorRect } from "../../lib/palettePosition";
import searchMark from "../../assets/shell/search-icon.png";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import { shortcutLabel } from "../../lib/shortcuts";
import "./searchPalette.css";
import "./searchInk.css";

/** ≥768px — the ink presentation (follow-up 2, §3). The phone keeps the palette it had. */
function useDesk(): boolean {
  const q = "(min-width: 768px)";
  const [desk, setDesk] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return undefined;
    const on = () => setDesk(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return desk;
}

/** The query row's title as the ink palette prints it: the agent alone — the status is its own pill. */
const queryWho = (title: string): string => title.split(" — ")[0] ?? title;

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
  /** The MOBILE bar's opener. */
  openerRef?: React.RefObject<HTMLElement | null>;
  /** The DESKTOP pill. Only one of the two is ever on screen — the dropdown anchors to whichever
   *  has a real rect, because a `display:none` opener measures as zeros and would drag the
   *  dropdown to the top-left corner. */
  desktopOpenerRef?: React.RefObject<HTMLElement | null>;
  /** The live search term, owned by the host so ⌘K can clear it on open. */
  term: string;
  setTerm: (t: string) => void;
  /** The sidebar's icon for a page path; a Go-to row wears its sidebar row's mark (§3). */
  pageIcon?: (path: string) => React.ReactNode | null;
  /** The active manuscript, named in Log a query's description ("for Murphy's Day Out"). */
  activeManuscriptTitle?: string;
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({
  open, onClose, onNavigate, onNavigatePath, items, setSearchQuery, openerRef, desktopOpenerRef,
  term, setTerm, pageIcon, activeManuscriptTitle,
}) => {
  const desk = useDesk();
  const inputRef = useRef<HTMLInputElement>(null);
  const palRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [box, setBox] = useState<PaletteBox | null>(null);

  const rows = useMemo(
    () => (term.trim() ? items : emptyStateItems()),
    [term, items]
  );

  /* a SOON row is shown and never chosen: the selection starts on, and moves through, the others */
  const firstPickable = useCallback((list: PaletteItem[]) => Math.max(0, list.findIndex((it) => !it.soon)), []);
  // The selection can never point past the list — the term changes under it on every keystroke.
  useEffect(() => { setSel(firstPickable(rows)); }, [term, rows, firstPickable]);

  /* the bar's search field shows that it is the one open (§3): a class on the opener while open */
  useEffect(() => {
    const el = desktopOpenerRef?.current;
    if (!open || !el) return undefined;
    el.classList.add("is-active");
    return () => el.classList.remove("is-active");
  }, [open, desktopOpenerRef]);

  // OPENING focuses and selects the input; CLOSING returns focus to the opener. Without the
  // return, closing the palette leaves focus on <body> and the next Tab starts from the top of
  // the page, which is a small thing that feels broken every single time.
  /* ⚠️ FOCUS ONCE THE PALETTE IS PLACED, NOT ON THE FIRST COMMIT. The palette renders
     `visibility: hidden` until its box is measured, and `focus()` on a hidden element does nothing —
     so opening from the bar left focus on the bar's button and the first letters typed went to the
     page (M opened the manuscript switcher). Found by follow-up 2's screenshots; it predates them. */
  const placed = box !== null;
  useEffect(() => {
    if (!open || !placed) return;
    const el = inputRef.current;
    el?.focus();
    el?.select();
  }, [open, placed]);
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
    if (item.soon) return;
    closeAndReturn();
    perform(item.run);
  }, [closeAndReturn, perform]);

  // Keyboard. Bound to the OVERLAY, not the window: the palette is modal, so it should not be
  // reaching for keys while it is shut.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); closeAndReturn(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length || rows.every((it) => it.soon)) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      let next = sel;
      do { next = (next + step + rows.length) % rows.length; } while (rows[next].soon);
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
     computed rather than inherited, which is what `palettePosition` is for.

     ⚠️⚠️ A HIDDEN OPENER IS NOT AN ANCHOR, AND THIS IS THE BUG THAT SHIPPED. There are TWO search
     openers — the desktop pill in the workspace bar, and the mobile bar's button — and only one is
     ever on screen. The ref was wired to the MOBILE one, which is `display:none` at desktop; a
     hidden element's `getBoundingClientRect()` is all zeros, so the maths dutifully computed
     `top = 0 + gap` and clamped `left` to the edge, and the dropdown opened at the top-left corner
     of the window. Every number was right; the rect was a lie. So: measure the first anchor with a
     REAL rect, and never trust a zero one. */
  const anchorContains = useCallback(
    (n: Node) => !!openerRef?.current?.contains(n) || !!desktopOpenerRef?.current?.contains(n),
    [openerRef, desktopOpenerRef],
  );

  useLayoutEffect(() => {
    if (!open) { setBox(null); return; }
    const measure = () => {
      /* ⚠️ ON THE DESKTOP SEARCH DROPS FROM THE BAR, CENTRED ON THE SHEET (§3): 660 wide, its top 10px
         below the bar — centred on the SHEET (`.ws-window`), never the window, which the sidebar
         offsets. Every other width keeps the anchored dropdown. */
      if (desk) {
        const vis = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().width > 0);
        const bar = vis(".ws-pagebar")?.getBoundingClientRect();
        const sheet = vis(".ws-window")?.getBoundingClientRect();
        if (bar && sheet) {
          const width = Math.min(660, window.innerWidth - 24);
          const top = bar.bottom + 10;
          setBox({
            left: sheet.left + (sheet.width - width) / 2,
            top,
            width,
            maxListHeight: Math.max(0, Math.min(560, window.innerHeight - top - 62 - 40 - 16)),
          });
          return;
        }
      }
      const rect = visibleAnchorRect(
        [desktopOpenerRef, openerRef].map((ref) => ref?.current?.getBoundingClientRect()),
      );
      if (!rect) return;
      setBox(palettePosition(rect, window.innerWidth, window.innerHeight));
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
  }, [open, openerRef, desktopOpenerRef, desk]);

  /* Click-outside. ⚠️ THERE IS NO SCRIM ANY MORE, so the dropdown cannot rely on one swallowing
     the click — it listens for itself, and ignores clicks on the pill so the opener's own toggle
     is not immediately undone by this. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (palRef.current?.contains(t)) return;
      if (anchorContains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose, anchorContains]);

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
      {/* the whole window dims under the palette on the desktop (§3); a press on it closes, through
          the click-outside listener above — the dim is not inside the palette */}
      {desk && <div className="sp-dim" aria-hidden="true" />}
      <div
        ref={palRef}
        className={`sp-pal${desk ? " sp-pal--ink" : ""}`}
        role="dialog"
        aria-label="Search"
        onKeyDown={onKeyDown}
        style={box ? { left: box.left, top: box.top, width: box.width } : { visibility: "hidden" }}
      >
        <div className="sp-in">
          {/* ⚠️ ILLUSTRATED, NOT MONOLINE (polish §2). The search is an OBJECT here — the thing
              you pick up to look with — which is the boundary the icon families draw: illustrated
              for objects and surfaces, monoline for navigation, state and controls. */}
          {desk ? (
            <svg className="sp-in-ico" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
            </svg>
          ) : (
            <img className="sp-in-mark" src={searchMark} alt="" aria-hidden="true" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search agents, queries and pages, or start something"
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
                  {heading && <div className="sp-grp">{GROUP_LABEL[heading] ?? heading}</div>}
                  <div
                    id={`sp-row-${i}`}
                    data-idx={i}
                    data-kind={item.kind}
                    role="option"
                    aria-selected={i === sel}
                    aria-disabled={item.soon ? true : undefined}
                    className={`sp-res${i === sel ? " sel" : ""}${item.soon ? " sp-res--soon" : ""}`}
                    // Hover moves the SELECTION rather than painting a separate hover state, so
                    // the mouse and the keyboard can never disagree about what Enter would open.
                    onMouseEnter={() => { if (!item.soon) setSel(i); }}
                    onClick={() => activate(item)}
                  >
{desk ? (
                      <>
                        {/* the tile (§3): an action on terracotta, a page wearing its sidebar mark, an
                            agent's initials on the band blue, a query's own StatusDot in a ringed tile */}
                        <span className={`sp-ic ${item.kind}`} data-tile={item.status ? "query" : item.kind}>
                          {item.status
                            ? <StatusDot status={item.status as QueryStatus} overrideSize={14} decorative />
                            : item.kind === "agent"
                              ? <span className="sp-av">{initialsOf(item.title)}</span>
                              : item.kind === "page" && item.run.kind === "path"
                                ? (pageIcon?.(item.run.path) ?? ID_ICON[item.id] ?? KIND_ICON.page)
                                : item.run.kind === "logQueryTo"
                                  ? ID_ICON["act:query"]
                                  : ID_ICON[item.id] ?? KIND_ICON[item.kind]}
                        </span>
                        <span className="sp-tx sp-tx--line">
                          <span className="sp-t1">
                            {highlightParts(item.status ? queryWho(item.title) : item.title, term).map((p, j) =>
                              p.match ? <mark key={j}>{p.text}</mark> : <React.Fragment key={j}>{p.text}</React.Fragment>
                            )}
                          </span>
                          {(() => {
                            const d = item.id === "act:query" && activeManuscriptTitle ? `for ${activeManuscriptTitle}` : item.subtitle;
                            return d ? <span className="sp-t2">{d}</span> : null;
                          })()}
                        </span>
                        <span className="sp-k">
                          {item.status && <span className="sp-st">{item.status}</span>}
                          {item.meta && <span className="sp-meta">{item.meta}</span>}
                          {item.soon && <span className="sa-soon" aria-label="coming soon">SOON</span>}
                          {i === sel && !item.soon && <span className="sp-kc" aria-hidden="true">↵</span>}
                        </span>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {desk ? (
          <div className="sp-foot sp-foot--ink">
            <span><i>↑</i><i>↓</i> Move</span>
            <span><i>↵</i> Open</span>
            {!term.trim() && <span><i>{shortcutLabel("search")}</i> Anywhere</span>}
            <span className="sp-foot-end"><i>ESC</i> Close</span>
          </div>
        ) : (
        <div className="sp-foot">
          <span><i>↑</i><i>↓</i> Navigate</span>
          <span><i>↵</i> Open</span>
          {/* ⚠️ NO "⌘↵ Open in new" HINT. It was advertised and NEVER IMPLEMENTED — `Enter` has no
              metaKey branch, so the chord did nothing. A hint for a key that does nothing is worse
              than no hint: it teaches a gesture and then fails silently. Removed rather than
              faked; if opening in a new tab ever lands, the hint comes back WITH it. */}
          <span className="sp-foot-end"><i>ESC</i> Close</span>
        </div>
        )}
      </div>
    </>,
    document.body,
  );
};

/** The group order, re-exported so the host and the locks share one import path of record. */
export { GROUP_ORDER };
