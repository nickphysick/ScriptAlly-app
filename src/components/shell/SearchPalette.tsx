/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SearchPalette — ⌘K search's host: placement, the dim, focus, and what opening a row does. At 768px and wider it
 * draws SearchDesk (search v1, ref design-refs/search-v1/search-v1.html); the phone keeps the palette it had.
 *
 * ⚠️ THIS IS THE APP'S ONE SEARCH. The bar's field is an OPENER, and the mobile slim bar's search toggle opens this
 * too. If a second search implementation ever appears, one of them is wrong.
 *
 * Everything it searches is already in memory (DbProvider subscribes on every route), so there is no debounce, no
 * loading state and no fetch. Matching, grouping and highlighting are the pure `lib/searchPalette` core.
 */
import { createPortal } from "react-dom";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus, Reply, UserPlus, Send, LayoutGrid, Settings, HelpCircle, Book } from "lucide-react";
import { FeedIcon } from "../shared/FeedIcon";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { invokeCapture } from "./railNav";
import {
  GROUP_ORDER, PALETTE_ACTIONS, PALETTE_PAGES, PaletteItem, PaletteKind, PaletteRow, PaletteRun, PaletteScope,
  highlightParts, searchPalette, tokens,
} from "../../lib/searchPalette";
import { PaletteBox, palettePosition, visibleAnchorRect } from "../../lib/palettePosition";
import searchMark from "../../assets/shell/search-icon.png";
import { SearchDesk } from "./SearchDesk";
import { useLocation } from "react-router-dom";
import { openAgentCard, openNewAgentCard } from "../../lib/agentCardStore";
import { openResponse } from "../../lib/queryPanelStore";
import { openFeedback } from "../../lib/feedbackStore";
import { articleHref } from "../../lib/helpArticles";
import { TODO_OPEN_TASK_KEY } from "../../lib/corkboard";
import { PACKAGES_PATH } from "../../lib/packagesRoute";
import "./searchPalette.css";
import "./searchInk.css";

/** ≥768px — the desktop presentation. The phone keeps the palette it had. */
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

/** The sheet width at which the peek is drawn; below it the box is list only. */
export const PEEK_MIN_SHEET = 1180;
export const BOX_W_PEEK = 920;
export const BOX_W_LIST = 660;

/** Row glyphs by kind on the PHONE — lucide, as before search v1. */
const KIND_ICON: Record<PaletteKind, React.ReactNode> = {
  action: <Plus aria-hidden="true" />,
  agent: <UserPlus aria-hidden="true" />,
  query: <Send aria-hidden="true" />,
  task: <Book aria-hidden="true" />,
  note: <Book aria-hidden="true" />,
  material: <Book aria-hidden="true" />,
  page: <LayoutGrid aria-hidden="true" />,
  help: <HelpCircle aria-hidden="true" />,
};
const ID_ICON: Record<string, React.ReactNode> = {
  "act:query": <Send aria-hidden="true" />,
  "act:record": <Reply aria-hidden="true" />,
  "act:agent": <UserPlus aria-hidden="true" />,
  /* feed wording v1.1: the feed's own "manuscript added" drawing, so search and the feed match */
  "act:manuscript": <FeedIcon kind="manuscript_added" bare />,
  "page:account": <Settings aria-hidden="true" />,
  "page:task-settings": <Settings aria-hidden="true" />,
  "page:help": <HelpCircle aria-hidden="true" />,
};

/* ⚠️ THE PHONE'S EMPTY STATE IS THE ONE IT HAD: three actions and the first four pages. Search v1's "Before you type"
   is the desktop's (Part C); the phone's palette is out of its scope. */
const PHONE_EMPTY: PaletteItem[] = [...PALETTE_ACTIONS.slice(0, 3), ...PALETTE_PAGES.slice(0, 4)];

export interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  /** The legacy navigate bridge — every capture and subpage action goes through it. */
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  /** Router-direct path navigation (pages) — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
  /** Everything there is to find, built from loaded state while the palette is open. */
  corpus: PaletteItem[];
  /** Recently opened ids, newest first — "Jump back in". */
  recents: string[];
  /** The MOBILE bar's opener. Focus returns here on close. */
  openerRef?: React.RefObject<HTMLElement | null>;
  /** The DESKTOP pill. Only one of the two is ever on screen — the dropdown anchors to whichever has a real rect. */
  desktopOpenerRef?: React.RefObject<HTMLElement | null>;
  /** The live search term, owned by the host so ⌘K can clear it on open. */
  term: string;
  setTerm: (t: string) => void;
  /** The sidebar's icon for a page path; a Go-to row wears its sidebar row's mark. */
  pageIcon?: (path: string) => React.ReactNode | null;
  /** The active manuscript, named in Log a query's second line ("for Murphy's Day Out"). */
  activeManuscriptTitle?: string;
  /** Opening a record or a page from search puts it at the front of Recently opened. */
  onOpened?: (id: string) => void;
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({
  open, onClose, onNavigate, onNavigatePath, corpus, recents, openerRef, desktopOpenerRef,
  term, setTerm, pageIcon, activeManuscriptTitle, onOpened,
}) => {
  const desk = useDesk();
  const { pathname } = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const palRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [box, setBox] = useState<PaletteBox | null>(null);
  const [peek, setPeek] = useState(true);
  const [scope, setScope] = useState<PaletteScope>("all");

  /* every opening starts on Everything */
  useEffect(() => { if (open) setScope("all"); }, [open]);

  const result = useMemo(() => searchPalette(corpus, term, desk ? scope : "all", { recents }), [corpus, term, scope, desk, recents]);

  /* the phone's flat list: the matched items under Everything, or its own empty state */
  const rows = useMemo(
    () => (term.trim() ? result.rows.flatMap((r) => (r.type === "item" ? [r.item] : [])) : PHONE_EMPTY),
    [term, result],
  );

  const firstPickable = useCallback((list: PaletteItem[]) => list.findIndex((it) => !it.soon), []);
  useEffect(() => { setSel(firstPickable(rows)); }, [term, rows, firstPickable]);

  /* the bar's search field shows that it is the one open: a class on the opener while open */
  useEffect(() => {
    const el = desktopOpenerRef?.current;
    if (!open || !el) return undefined;
    el.classList.add("is-active");
    return () => el.classList.remove("is-active");
  }, [open, desktopOpenerRef]);

  /* ⚠️ FOCUS ONCE THE PALETTE IS PLACED, NOT ON THE FIRST COMMIT: it renders `visibility: hidden` until its box is
     measured, and `focus()` on a hidden element does nothing. */
  const placed = box !== null;
  useEffect(() => {
    if (!open || !placed) return;
    const el = inputRef.current;
    el?.focus();
    el?.select();
  }, [open, placed, desk]);

  /** The opener on screen — the desktop's bar field or the phone's toggle. */
  const opener = useCallback(
    () => [desktopOpenerRef?.current, openerRef?.current].find((el) => el && el.getBoundingClientRect().height > 0) ?? null,
    [desktopOpenerRef, openerRef],
  );
  const closeAndReturn = useCallback(() => {
    onClose();
    // after the overlay unmounts, or the focus call lands on a node that is going away
    window.setTimeout(() => opener()?.focus(), 0);
  }, [onClose, opener]);

  /**
   * WHAT OPENING A ROW DOES — every run lands on an opener that already exists. Where the app has no way to open the
   * exact thing from the shell, the row opens the page it lives on (reports/search-v1.md lists each one).
   */
  const perform = useCallback((run: PaletteRun) => {
    switch (run.kind) {
      case "capture": invokeCapture(run.capture, onNavigate); break;
      case "navigate": onNavigate(run.tab, run.sub); break;
      case "path": onNavigatePath(run.path); break;
      /* the existing deep-selection contract: onNavigate("queries", <query id>) */
      case "query": onNavigate("queries", run.queryId); break;
      /* the agent's card over the page you're on — no navigation, no list filter left behind */
      case "agentCard": openAgentCard(run.agentId); break;
      /* the existing preselect seam (initialAgentId), never a new form */
      case "logQueryTo": onNavigate("queries", "Log a query", { agentId: run.agentId }); break;
      /* the opener the query card's own Record a response uses, set to this query */
      case "recordFor": openResponse({ queryId: run.queryId, from: "other" }); break;
      case "task":
        /* the To-do list's arrival contract (TodoWorkspace reads this one-shot key when it lands on /todo). Already on
           /todo there is no arrival, so the key would wait for a later visit: it is written only when arriving. */
        if (pathname !== "/todo") { try { sessionStorage.setItem(TODO_OPEN_TASK_KEY, run.taskId); } catch { /* private mode */ } }
        onNavigatePath("/todo");
        break;
      /* no way to bring a note forward from outside the Corkboard: its page */
      case "note": onNavigatePath("/todo/corkboard"); break;
      /* the Letters page holds its selection in local state: its page */
      case "letter": onNavigatePath("/materials/letters"); break;
      /* the Packages page's own deep link (?pkg=) */
      case "package": onNavigatePath(`${PACKAGES_PATH}?pkg=${encodeURIComponent(run.packageId)}`); break;
      case "help": onNavigatePath(articleHref(run.slug)); break;
      /* the Help centre's search cannot be seeded from outside (its term is local state): the Help centre */
      case "helpSearch": onNavigatePath("/help"); break;
      case "feedback": openFeedback(); break;
      case "newAgent": openNewAgentCard({ from: "button", host: "panel", prefill: { name: run.name } }); break;
      default: {
        const unhandled: never = run;
        return unhandled;
      }
    }
  }, [onNavigate, onNavigatePath, pathname]);

  /** Open a row: ↵ (1) runs its own action, ⌘↵ (2) its second. "Show all" chooses a scope and stays open. */
  const activateRow = useCallback((row: PaletteRow, which: 1 | 2) => {
    if (row.type === "more") { setScope(row.scope); inputRef.current?.focus(); return; }
    if (row.type !== "item") return;
    const item = row.item;
    if (item.soon) return;
    const run = which === 2 ? item.second?.run : item.run;
    if (!run) return;
    /* Recently opened: records and pages, never a capture, a help article or a row made for this term */
    if (!item.made && item.kind !== "action" && item.kind !== "help") onOpened?.(item.id);
    closeAndReturn();
    /* a capture or a card opens over the page: it runs a tick later, AFTER focus is back on the opener, so the opener
       is what it hands focus back to when it closes */
    window.setTimeout(() => { opener()?.focus(); perform(run); }, 0);
  }, [closeAndReturn, perform, opener, onOpened]);

  const activatePhone = useCallback((item: PaletteItem) => activateRow({ type: "item", item }, 1), [activateRow]);

  /* the phone's keys, bound to its overlay */
  const onPhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); closeAndReturn(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length || rows.every((it) => it.soon)) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      let next = sel;
      do { next = (next + step + rows.length) % rows.length; } while (rows[next].soon);
      setSel(next);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = rows[sel];
      if (item) activatePhone(item);
    }
  };

  /* ⚠️ MEASURED AND PORTALLED: the bar's field sits inside scrolling, clipping containers, so the palette is portalled
     to the body and placed by measurement. ⚠️ A HIDDEN OPENER IS NOT AN ANCHOR — measure the first one with a real
     rect, never trust a zero one. */
  const anchorContains = useCallback(
    (n: Node) => !!openerRef?.current?.contains(n) || !!desktopOpenerRef?.current?.contains(n),
    [openerRef, desktopOpenerRef],
  );

  useLayoutEffect(() => {
    if (!open) { setBox(null); return; }
    const measure = () => {
      /* ⚠️ ON THE DESKTOP SEARCH DROPS FROM THE BAR, CENTRED ON THE SHEET (`.ws-window`, never the window, which the
         sidebar offsets), its top 10px below the bar: 920 wide with the peek on a sheet 1180px or wider, 660 below. */
      if (desk) {
        const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0);
        const bar = vis(".ws-pagebar")?.getBoundingClientRect();
        const sheet = vis(".ws-window")?.getBoundingClientRect();
        if (bar && sheet) {
          const wide = sheet.width >= PEEK_MIN_SHEET;
          const width = Math.min(wide ? BOX_W_PEEK : BOX_W_LIST, window.innerWidth - 24);
          setPeek(wide);
          setBox({ left: sheet.left + (sheet.width - width) / 2, top: bar.bottom + 10, width, maxListHeight: 440 });
          return;
        }
      }
      const rect = visibleAnchorRect([desktopOpenerRef, openerRef].map((ref) => ref?.current?.getBoundingClientRect()));
      if (!rect) return;
      setPeek(false);
      setBox(palettePosition(rect, window.innerWidth, window.innerHeight));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, openerRef, desktopOpenerRef, desk]);

  /* Click-outside: there is no scrim to swallow the click, so the palette listens for itself, ignoring the opener. */
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

  const style = box ? { left: box.left, top: box.top, width: box.width } : { visibility: "hidden" as const };

  if (desk) {
    /* ⚠️ NO `aria-modal`: nothing behind it is inert. The whole window dims under it; a press on the dim closes,
       through the click-outside listener above. */
    return createPortal(
      <>
        <div className="sp-dim" aria-hidden="true" />
        <div ref={palRef} className="sp-pal sp-pal--ink sp-pal--v1" role="dialog" aria-label="Search" style={style}>
          <SearchDesk
            term={term} setTerm={setTerm} scope={scope} setScope={setScope} result={result} peek={peek}
            inputRef={inputRef} onActivate={activateRow} onClose={closeAndReturn}
            activeManuscriptTitle={activeManuscriptTitle} pageIcon={pageIcon}
          />
        </div>
      </>,
      document.body,
    );
  }

  const toks = tokens(term);
  const selectedId = rows[sel] ? `sp-row-${sel}` : undefined;
  let lastGroup: string | null = null;
  return createPortal(
    <div ref={palRef} className="sp-pal" role="dialog" aria-label="Search" onKeyDown={onPhoneKeyDown} style={style}>
      <div className="sp-in">
        <img className="sp-in-mark" src={searchMark} alt="" aria-hidden="true" />
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
      <div className="sp-list" id="sp-list" role="listbox" aria-label="Results" ref={listRef} style={box ? { maxHeight: box.maxListHeight } : undefined}>
        {rows.length === 0 ? (
          <div className="sp-empty">Nothing matches “{term.trim()}”.</div>
        ) : rows.map((item, i) => {
          const heading = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <React.Fragment key={`${item.id}-${i}`}>
              {heading && <div className="sp-grp">{heading === "Actions" ? "Start something" : heading === "Pages" ? "Go to" : heading}</div>}
              <div
                id={`sp-row-${i}`} data-idx={i} data-kind={item.kind} role="option" aria-selected={i === sel}
                aria-disabled={item.soon ? true : undefined}
                className={`sp-res${i === sel ? " sel" : ""}${item.soon ? " sp-res--soon" : ""}`}
                onMouseEnter={() => { if (!item.soon) setSel(i); }}
                onClick={() => activatePhone(item)}
              >
                <span className={`sp-ic ${item.kind}`}>
                  {item.status && item.kind === "query"
                    ? <StatusDot status={item.status as QueryStatus} overrideSize={14} decorative />
                    : ID_ICON[item.id] ?? KIND_ICON[item.kind]}
                </span>
                <span className="sp-tx">
                  <span className="sp-t1">
                    {highlightParts(item.title, toks).map((p, j) => (p.match ? <mark key={j}>{p.text}</mark> : <React.Fragment key={j}>{p.text}</React.Fragment>))}
                  </span>
                  {item.subtitle && <span className="sp-t2">{item.subtitle}</span>}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="sp-foot">
        <span><i>↑</i><i>↓</i> Navigate</span>
        <span><i>↵</i> Open</span>
        <span className="sp-foot-end"><i>ESC</i> Close</span>
      </div>
    </div>,
    document.body,
  );
};

/** The group order, re-exported so the host and the locks share one import path of record. */
export { GROUP_ORDER };
