/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellColumn — the ONE COLUMN (ref design-refs/scriptally-sage-desk.html), replacing the rail
 * and the side panel. They were two components with their own paddings, which is why alignment
 * kept drifting; this is one column that expands, 78px ↔ 246px.
 *
 * ⚠️ ON EXPAND, ONLY LABELS, CHEVRONS AND CHILDREN CHANGE. Icons do not move — their x is
 * `--gutter` in both states by construction (see lib/shellColumn). If you find yourself nudging
 * one state to match the other, the token is being bypassed and that is the bug.
 *
 * The floating selector is the ONLY active marker: no underline, no row fill, no left border, no
 * pill on the icon. Geometry is the pure `selectorBox`; this file owns the DOM and the muting.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Send, Users, Book, ChevronRight, Plus, Reply, UserPlus, BookPlus,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { invokeCapture } from "./railNav";
import { planLine } from "../../lib/shellSidebar";
import {
  COLUMN_SECTIONS, ColumnMetrics, ColumnSection, columnHitForPath, sectionClickPlan, selectorBox,
} from "../../lib/shellColumn";
import "./shellColumn.css";

const SECTION_ICON: Record<ColumnSection["key"], React.ReactNode> = {
  queries: <Send aria-hidden="true" />,
  agents: <Users aria-hidden="true" />,
  materials: <Book aria-hidden="true" />,
};

/** Read the geometry from CSS — ONE source. A JS copy of these numbers is how they drift. */
function readMetrics(el: HTMLElement | null): ColumnMetrics | null {
  if (!el || typeof window === "undefined") return null;
  const cs = getComputedStyle(el);
  const px = (n: string) => parseFloat(cs.getPropertyValue(n));
  const m = { gutter: px("--gutter"), icon: px("--icon"), kid: px("--kid"), padR: px("--pad-r"), colMax: px("--col-max") };
  return Object.values(m).some(Number.isNaN) ? null : m;
}

export interface ShellColumnProps {
  collapsed: boolean;
  onSetCollapsed: (v: boolean) => void;
  /** Router-direct navigation (clears the global search) — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
  /** The legacy navigate bridge — the capture contracts run through it. */
  onNavigate: (tab: string, subPageName?: string) => void;
  /** The account row opens the shared account menu (Phase 3). */
  onOpenAccount?: () => void;
}

export const ShellColumn: React.FC<ShellColumnProps> = ({
  collapsed, onSetCollapsed, onNavigatePath, onNavigate, onOpenAccount,
}) => {
  const { pathname } = useLocation();
  const { currentUser } = useScriptAllyDb();
  const colRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLSpanElement>(null);

  const hit = columnHitForPath(pathname);
  const [openSection, setOpenSection] = useState<ColumnSection["key"] | null>(hit?.section.key ?? null);
  // The open section follows the route — so back/forward move it too, not just clicks.
  useEffect(() => { if (hit) setOpenSection(hit.section.key); }, [hit?.section.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ⚠️ FIRST PAINT MUST BE SILENT. The selector is positioned by JS, so without this it animates
  // from (0,0) to its real place on every mount — a marker sliding in from the top-left corner
  // on every page load. `mute` kills the transition; it is lifted ONE FRAME after the first
  // placement, so the first move is instant and every move after it springs.
  const [muted, setMuted] = useState(true);

  const place = useCallback(() => {
    const m = readMetrics(colRef.current);
    const sel = selRef.current;
    const nav = navRef.current;
    if (!m || !sel || !nav) return;
    // The CHILD row wins when its section is open; otherwise the parent it belongs to.
    const childEl = nav.querySelector<HTMLElement>("[data-kid].on");
    const parentEl = nav.querySelector<HTMLElement>("[data-parent].on")
      ?? nav.querySelector<HTMLElement>("[data-parent]");
    const target = childEl && !collapsed
      ? ({ kind: "child", offsetTop: childEl.offsetTop } as const)
      : ({ kind: "parent", offsetTop: parentEl?.offsetTop ?? 0 } as const);
    const box = selectorBox(target, collapsed, m);
    sel.style.transform = `translate(${box.x}px, ${box.y}px)`;
    sel.style.width = `${box.width}px`;
    sel.style.height = `${box.height}px`;
    sel.style.borderRadius = `${box.radius}px`;
  }, [collapsed]);

  // Place BEFORE paint, then unmute a frame later — the order is what makes the first move silent.
  useLayoutEffect(() => {
    place();
    const id = window.requestAnimationFrame(() => setMuted(false));
    return () => window.cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { place(); }, [place, pathname, openSection, collapsed]);
  useEffect(() => {
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  // ── scroll fades: 24px, each shown only when there IS content past that edge ──
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  const syncFades = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 4);
    setFadeBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useEffect(() => { syncFades(); }, [syncFades, openSection, collapsed]);

  const onSectionClick = (key: ColumnSection["key"]) => {
    const plan = sectionClickPlan(key, collapsed, openSection);
    if (plan.kind === "expand-and-open") { onSetCollapsed(false); setOpenSection(plan.section); }
    else if (plan.kind === "open") setOpenSection(plan.section);
    else setOpenSection(null);
  };

  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const plan = planLine(currentUser?.plan);

  return (
    <nav ref={colRef} className={`sc-col${collapsed ? " shut" : ""}`} aria-label="Sections">
      {/* THE MASTHEAD — the wordmark is the route home to the dashboard, so there is no
          Dashboard nav item anywhere in the column. */}
      <button type="button" className="sc-mast" onClick={() => onNavigatePath("/dashboard")} title="Dashboard">
        <span className="sc-mk" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.7 2.3 2.6 9.6c-.8.3-.8 1.4 0 1.7l6.1 2.3 2.3 6.1c.3.8 1.4.8 1.7 0l7.3-19.1c.3-.7-.4-1.4-1.1-1.1Z" /></svg>
        </span>
        <span className="sc-wm"><ScriptAllyLogo heightPx={26} /></span>
      </button>

      <div className="sc-navwrap">
        <span className={`sc-sfade t${fadeTop ? " on" : ""}`} aria-hidden="true" />
        <div className="sc-nav" ref={navRef} onScroll={syncFades}>
          {/* THE SELECTOR — the only active marker, and the only thing that says where you are. */}
          <span ref={selRef} className={`sc-sel${muted ? " mute" : ""}`} aria-hidden="true" />

          {COLUMN_SECTIONS.map((section, si) => {
            const open = openSection === section.key && !collapsed;
            const onParent = hit?.section.key === section.key && !open;
            return (
              <React.Fragment key={section.key}>
                <button
                  type="button"
                  data-parent={section.key}
                  className={`sc-row${onParent ? " on" : ""}${open ? " exp" : ""}`}
                  aria-expanded={open}
                  onClick={() => onSectionClick(section.key)}
                >
                  <span className="sc-ic">{SECTION_ICON[section.key]}</span>
                  <span className="sc-lb" style={{ ["--i" as string]: si }}>{section.label}</span>
                  <ChevronRight className="sc-cv" aria-hidden="true" />
                </button>
                <div className={`sc-kids${open ? " on" : ""}`}>
                  {section.pages.map((page) => (
                    <button
                      key={page.key}
                      type="button"
                      data-kid={page.key}
                      className={`sc-kid${hit?.page.key === page.key ? " on" : ""}`}
                      aria-current={hit?.page.key === page.key ? "page" : undefined}
                      onClick={() => onNavigatePath(page.path)}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <span className={`sc-sfade b${fadeBottom ? " on" : ""}`} aria-hidden="true" />
      </div>

      {/* ── THE FOOT: exactly two quick actions, then the account row ────────────────────────
          `Record a response` is deliberately NOT also in the New popover — it is what you reach
          for holding a reply, not while thinking about making something. All four of the old
          tile grid's dispatches survive. ── */}
      <div className="sc-qa">
        <ColumnNew onNavigate={onNavigate} collapsed={collapsed} />
        <button type="button" className="sc-qb g" onClick={() => invokeCapture("record", onNavigate)} title="Record a response">
          <span className="sc-qi"><Reply aria-hidden="true" /></span>
          <span className="sc-ql">Record a response</span>
        </button>
      </div>

      {currentUser && (
        <div className="sc-foot">
          <button type="button" className="sc-fu" onClick={onOpenAccount} title="Account">
            <span className="sc-av" aria-hidden="true">{initials}</span>
            <span className="sc-ft">
              <span className="sc-n1">{currentUser.name}</span>
              <span className="sc-n2">
                {plan.label}
                {plan.upgrade && <>{" · "}<span className="sc-up">Upgrade</span></>}
              </span>
            </span>
          </button>
        </div>
      )}
    </nav>
  );
};

/** `+ New` and its create popover. Three creates here; Record is its own button, beside it. */
const ColumnNew: React.FC<{ onNavigate: (tab: string, sub?: string) => void; collapsed: boolean }> = ({ onNavigate, collapsed }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && wrapRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [collapsed]);

  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div className={`sc-newwrap${open ? " open" : ""}`} ref={wrapRef}>
      {open && (
        <div className="sc-pop" role="menu" aria-label="Create">
          <button type="button" className="sc-prow" role="menuitem" onClick={run(() => invokeCapture("query", onNavigate))}>
            <Send aria-hidden="true" /><span>Log a query</span>
          </button>
          <button type="button" className="sc-prow" role="menuitem" onClick={run(() => invokeCapture("agent", onNavigate))}>
            <UserPlus aria-hidden="true" /><span>Add an agent</span>
          </button>
          <button type="button" className="sc-prow" role="menuitem" onClick={run(() => onNavigate("manuscripts", "Add a manuscript"))}>
            <BookPlus aria-hidden="true" /><span>Add a manuscript</span>
          </button>
        </div>
      )}
      <button type="button" className="sc-qb p" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)} title="New">
        <span className="sc-qi"><Plus aria-hidden="true" /></span>
        <span className="sc-ql">New</span>
      </button>
    </div>
  );
};
