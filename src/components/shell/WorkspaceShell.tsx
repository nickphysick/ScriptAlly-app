/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkspaceShell — the DECOUPLED rail + panel (shell-rebuild pack + Amendment 1; ref
 * design-refs/shell-workspace-doubledecker.html).
 *
 * ⚠️⚠️ T3b — THE RAIL IS A STATIC COMPONENT THAT NEVER REFLOWS. This SUPERSEDES T3 and the
 * split-row/painted-rail architecture it protected. Rows that spanned both surfaces kept the
 * icons aligned by construction, but they also made the rail a function of the panel: an open
 * accordion punched a void through the icon column, and the anti-echo dimming turned the rest
 * into a broken strip.
 *
 * The rail is now its own component with its own even rhythm — a tile, one 38px button per
 * section, a foot group — and its contents are IDENTICAL expanded and collapsed. Only two things
 * change: the » control appears, and the active square moves. That retires the drift problem
 * outright rather than defending against it, which is why T3's gradient-and-spanning-rows lock
 * is gone rather than weakened.
 *
 * ⚠️ THE PANEL COLLAPSES TO ZERO WIDTH; THE RAIL DOES NOT MOVE. If you find yourself writing a
 * rule that changes the rail between states, that is the bug.
 *
 * ⚠️ THE IA IS A PROP. This component owns the grammar and no section list.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Book, ChevronDown, ChevronsUpDown, ChevronsLeft, ChevronsRight, Settings,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { planLine, resolveActiveManuscript } from "../../lib/shellSidebar";
import {
  PEEK_GRACE_MS, PEEK_INTENT_MS, ShellSection, collapseKeyAllowed, openForHit, peeksOnHover,
  railBadge, railClick, readCollapsed, sectionClick, sectionRowState, shellCrumb, shellHitFor,
  writeCollapsed,
} from "../../lib/workspaceShell";
import { AvatarChip, CountChip, HelpButton, MenuCard, MenuCardItem, SearchPill } from "./primitives";
import "./primitives.css";
import "./workspaceShell.css";

/** The shared active-manuscript key. ⚠️ Packages, Comps and Manuscripts READ this — a selector
 *  that stops writing it breaks them silently, with no error and simply the wrong book. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/**
 * ⚠️ 31px, AND THAT NUMBER IS MEASURED (Amendment 1, C). `/scriptally-title-v2.png` is 2400×750
 * with the cap-"S" spanning y 190→577 — **51.7% of the asset height**, the rest being ascender
 * and descender clearance baked into the artwork. So `heightPx` is NOT cap-height: asking for a
 * 16px cap means asking for a 31px element. Setting 16 here would render an 8px cap and look
 * like the logo had simply been made too small, with nothing to point at.
 */
const LOGOTYPE_PX = 31;

export interface WorkspaceShellProps {
  /** The IA — owned by the caller, never by this component. */
  sections: ShellSection[];
  /** Icon per section id, rendered at 20px on the rail and 17px in the panel. */
  icons: Record<string, React.ReactNode>;
  onNavigatePath: (path: string) => void;
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onOpenAccount?: () => void;
  onUpgrade?: () => void;
  /** The shared AccountMenu, rendered by the host so one component serves both shells. */
  accountMenu?: React.ReactNode;
  children: React.ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  sections, icons, onNavigatePath, onOpenSearch, onOpenHelp, onOpenAccount, onUpgrade,
  accountMenu, children,
}) => {
  const { pathname, search } = useLocation();
  const { manuscripts, currentUser } = useScriptAllyDb();

  const hit = useMemo(() => shellHitFor(sections, pathname, search), [sections, pathname, search]);

  const [collapsed, setCollapsed] = useState(
    () => readCollapsed(typeof window === "undefined" ? null : window.localStorage)
  );
  const [openId, setOpenId] = useState<string | null>(() => openForHit(hit));
  const [flyoutFor, setFlyoutFor] = useState<string | null>(null);
  const [msOpen, setMsOpen] = useState(false);

  const railRef = useRef<HTMLElement>(null);
  const riRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const peekIn = useRef<number | null>(null);
  const peekOut = useRef<number | null>(null);

  useEffect(() => { setOpenId(openForHit(hit)); }, [hit?.section, hit?.child]); // eslint-disable-line react-hooks/exhaustive-deps

  const setShut = useCallback((next: boolean) => {
    setCollapsed(next);
    writeCollapsed(typeof window === "undefined" ? null : window.localStorage, next);
    setFlyoutFor(null);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsed(typeof window === "undefined" ? null : window.localStorage, next);
      return next;
    });
    setFlyoutFor(null);
  }, []);

  /* ⚠️ `[` TOGGLES BOTH WAYS, suppressed while typing, because `[` is a character: a bare key
     firing inside a field eats the keystroke and reads as the app dropping input. The palette
     counts as typing — it is a text field wearing a dialog. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const paletteOpen = !!document.querySelector(".sp-pal");
      if (!collapseKeyAllowed(el?.tagName, !!el?.isContentEditable, paletteOpen)) return;
      e.preventDefault();
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  useEffect(() => {
    if (!flyoutFor && !msOpen) return;
    const onDown = (e: PointerEvent) => {
      if (railRef.current?.contains(e.target as Node)) return;
      setFlyoutFor(null);
      setMsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setFlyoutFor(null);
      setMsOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [flyoutFor, msOpen]);

  const go = useCallback((path: string) => {
    setFlyoutFor(null);
    setMsOpen(false);
    onNavigatePath(path);
  }, [onNavigatePath]);

  const runPlan = useCallback((plan: { open: string | null; go: string | null; expand: boolean }) => {
    setFlyoutFor(null);
    if (plan.expand) setShut(false);
    setOpenId(plan.open);
    if (plan.go) go(plan.go);
  }, [go, setShut]);

  /** The PANEL row — a destination AND a disclosure control, so it can toggle shut. */
  const onPanelClick = useCallback((sec: ShellSection) => {
    runPlan(sectionClick(sec, hit, openId, collapsed));
  }, [hit, openId, collapsed, runPlan]);

  /** The RAIL icon — a destination only; it never toggles a section shut. */
  const onRailClick = useCallback((sec: ShellSection) => {
    runPlan(railClick(sec, hit, collapsed));
  }, [hit, collapsed, runPlan]);

  /* Hover peeks, pointer only. Sliding along the rail while one is open switches instantly;
     opening cold waits out the intent delay so a cursor merely crossing does not fire one. */
  const clearPeek = useCallback(() => {
    if (peekIn.current) { window.clearTimeout(peekIn.current); peekIn.current = null; }
    if (peekOut.current) { window.clearTimeout(peekOut.current); peekOut.current = null; }
  }, []);

  const onRailEnter = useCallback((sec: ShellSection) => {
    if (!peeksOnHover(sec, collapsed)) return;
    clearPeek();
    if (flyoutFor) { setFlyoutFor(sec.id); return; }
    peekIn.current = window.setTimeout(() => setFlyoutFor(sec.id), PEEK_INTENT_MS);
  }, [collapsed, flyoutFor, clearPeek]);

  const schedulePeekClose = useCallback(() => {
    clearPeek();
    peekOut.current = window.setTimeout(() => setFlyoutFor(null), PEEK_GRACE_MS);
  }, [clearPeek]);

  useEffect(() => () => clearPeek(), [clearPeek]);

  /* ── the manuscript selector ── */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const activeMs = resolveActiveManuscript(manuscripts, storedMs);
  const manyMs = manuscripts.length > 1;
  const pickMs = useCallback((id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* not worth an error */ }
    setMsOpen(false);
    onNavigatePath(`${pathname}${search}`);
  }, [onNavigatePath, pathname, search]);

  const crumb = shellCrumb(sections, hit);
  const plan = planLine(currentUser?.plan);
  const name = currentUser?.name ?? "";

  const flySection = sections.find((s) => s.id === flyoutFor);
  const flyTop = flyoutFor ? riRefs.current[flyoutFor]?.offsetTop ?? 0 : 0;

  return (
    <div className="ws-app">

      {/* ══ THE RAIL — static. Identical in both states bar the » control and the active square. ══ */}
      <aside ref={railRef} className={`ws-rail${flyoutFor ? " flyopen" : ""}`} aria-label="Sections">
        <button
          type="button"
          className="ws-tile"
          data-tip="Dashboard"
          aria-label="Dashboard"
          onClick={() => { if (collapsed) setShut(false); go("/dashboard"); }}
        >
          S
        </button>

        <div className="ws-railnav">
          {sections.map((sec) => {
            const st = sectionRowState(sec, hit, openId, collapsed);
            return (
              <button
                type="button"
                key={sec.id}
                ref={(el) => { riRefs.current[sec.id] = el; }}
                className={`ws-ri${st.railOn ? " on" : ""}`}
                data-tip={st.tip}
                aria-label={sec.label}
                aria-current={st.railOn ? "true" : undefined}
                onClick={() => onRailClick(sec)}
                onMouseEnter={() => onRailEnter(sec)}
                onMouseLeave={schedulePeekClose}
              >
                {icons[sec.id]}
                {/* A DOT, NOT A NUMBER — 52px has no room for a legible figure. */}
                {railBadge(sec) && <span className="ws-bdg" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="ws-grow" />

        {/* The expand-without-navigating path. Collapsed only. */}
        {collapsed && (
          <button
            type="button"
            className="ws-ri ws-xtog"
            data-tip="Expand"
            aria-label="Expand the navigation"
            onClick={() => setShut(false)}
          >
            <ChevronsRight aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          className="ws-ri"
          data-tip="Settings"
          aria-label="Settings"
          onClick={() => { if (collapsed) { setShut(false); return; } go("/account"); }}
        >
          <Settings aria-hidden="true" />
        </button>

        {/* The face lives on the RAIL — it survives collapse, so the panel needs no copy. */}
        <button
          type="button"
          className="ws-avabtn"
          data-tip={`${name} · ${plan.label}`}
          aria-label="Account"
          aria-haspopup="menu"
          onClick={onOpenAccount}
        >
          <AvatarChip name={name} size={30} />
        </button>

        {/* ⚠️ ANCHORED TO THE RAIL, and selecting COMMITS FULLY (E3) — navigate, close, expand,
            open that accordion, so it appears where the flyout was. A peek resolving into a
            still-collapsed rail would leave you where you started.
            ⚠️ NO FOOT ACTION (E4): "Expand sidebar" was superseded the moment every click did it. */}
        {flySection && (
          <MenuCard
            heading={flySection.label}
            className="ws-fly"
            style={{ top: flyTop }}
            role="menu"
          >
            <div onMouseEnter={clearPeek} onMouseLeave={schedulePeekClose}>
              {(flySection.children ?? []).map((ch) => (
                <MenuCardItem
                  key={ch.id}
                  label={ch.label}
                  on={hit?.section === flySection.id && hit?.child === ch.id}
                  count={ch.count}
                  urgent={ch.urgent}
                  onSelect={() => { setOpenId(flySection.id); setShut(false); go(ch.path); }}
                />
              ))}
            </div>
          </MenuCard>
        )}
      </aside>

      {/* ══ THE PANEL — its own tighter rhythm; collapses to zero width. ══ */}
      <div className={`ws-panel${collapsed ? " shut" : ""}`}>
        <div className="ws-pin">

          <div className="ws-phead">
            {activeMs ? (
              <>
                <button
                  type="button"
                  className={`ws-mspill${manyMs ? "" : " static"}`}
                  aria-haspopup={manyMs ? "menu" : undefined}
                  aria-expanded={manyMs ? msOpen : undefined}
                  onClick={() => { if (manyMs) { setFlyoutFor(null); setMsOpen((o) => !o); } }}
                >
                  <Book aria-hidden="true" />
                  <span className="ws-mst">{activeMs.title}</span>
                  {manyMs && <span className="ws-chev"><ChevronsUpDown aria-hidden="true" /></span>}
                </button>
                {msOpen && manyMs && (
                  <MenuCard heading="Manuscript" className="ws-msmenu" role="menu">
                    {manuscripts.map((m) => (
                      <MenuCardItem
                        key={m.id}
                        label={m.title}
                        on={m.id === activeMs.id}
                        onSelect={() => pickMs(m.id)}
                      />
                    ))}
                  </MenuCard>
                )}
              </>
            ) : <span className="ws-mspill static" aria-hidden="true" />}
            <button
              type="button"
              className="ws-ctog"
              title="Collapse"
              aria-label="Collapse the navigation"
              onClick={() => setShut(true)}
            >
              <ChevronsLeft aria-hidden="true" />
            </button>
          </div>

          <div className="ws-pdiv" />

          <nav className="ws-nav">
            {sections.map((sec) => {
              const st = sectionRowState(sec, hit, openId, collapsed);
              const kids = sec.children ?? [];
              return (
                <React.Fragment key={sec.id}>
                  <button
                    type="button"
                    className={`ws-ni${st.fill === "pill" ? " on" : ""}${st.fill === "quiet" ? " quiet" : ""}${st.open ? " open" : ""}`}
                    aria-current={st.railOn ? "true" : undefined}
                    aria-expanded={kids.length ? st.open : undefined}
                    onClick={() => onPanelClick(sec)}
                  >
                    <span className="ws-ic">{icons[sec.id]}</span>
                    {sec.label}
                    {st.count && <CountChip count={st.count.n} urgent={st.count.urgent} />}
                    {kids.length > 0 && (
                      <span className="ws-pch"><ChevronDown aria-hidden="true" /></span>
                    )}
                  </button>

                  {kids.length > 0 && (
                    <div className={`ws-sub${st.open ? " open" : ""}`}>
                      <div className="ws-subin">
                        {kids.map((ch) => (
                          <button
                            type="button"
                            key={ch.id}
                            className={`ws-srow${st.railOn && hit?.child === ch.id ? " on" : ""}`}
                            aria-current={st.railOn && hit?.child === ch.id ? "page" : undefined}
                            tabIndex={st.open ? 0 : -1}
                            onClick={(e) => { e.stopPropagation(); go(ch.path); }}
                          >
                            {ch.label}
                            {typeof ch.count === "number" && (
                              <CountChip count={ch.count} urgent={ch.urgent} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="ws-grow" />

          {/* ── foot: hairline → name + plan → Settings. NO avatar (the rail carries the face). ── */}
          <div className="ws-pfoot">
            <div className="ws-pdiv" />
            <div className="ws-urow">
              <div className="ws-n">{name}</div>
              <div className="ws-p">
                {plan.label}
                {plan.upgrade && (
                  <>
                    {" · "}
                    <button type="button" className="ws-up" onClick={onUpgrade}>Upgrade</button>
                  </>
                )}
              </div>
            </div>
            <button type="button" className="ws-ni ws-setrow" onClick={() => go("/account")}>
              <span className="ws-ic"><Settings aria-hidden="true" /></span>
              Settings
            </button>
          </div>
        </div>
      </div>
      {accountMenu}

      {/* ══ MAIN — the chrome ground frames a white content card; the bar is its header. ══ */}
      <div className="ws-main">
        <div className="ws-card">
          <header className="ws-bar">
            {/* ⚠️ THE BRAND LEADS THE CRUMB (Amendment 1, C) — it left the sidebar entirely, where
                the rail's "S" tile is now the only mark. The asset, not styled text. */}
            <span className="ws-crumb">
              <img
                className="ws-logotype"
                src="/scriptally-title-v2.png"
                alt="ScriptAlly"
                style={{ height: LOGOTYPE_PX }}
              />
              <span className="ws-sep" aria-hidden="true">/</span>
              {crumb && (
                <>
                  <b>{crumb.section}</b>
                  {crumb.child && (
                    <>
                      <span className="ws-sep" aria-hidden="true">·</span>
                      {crumb.child}
                    </>
                  )}
                </>
              )}
            </span>
            <div className="ws-bright">
              <SearchPill onOpen={onOpenSearch} />
              <HelpButton onOpen={onOpenHelp} />
            </div>
          </header>
          <div className="ws-work">{children}</div>
        </div>
      </div>

    </div>
  );
};
