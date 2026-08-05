/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkspaceShell — the DOUBLE-DECKER (shell-rebuild pack, Phase 2; ref
 * design-refs/shell-workspace-doubledecker.html). Ink icon rail + light panel, collapsible, on
 * the sage desk.
 *
 * ⚠️⚠️ THE RAIL IS PAINT, NOT A CONTAINER (Baked 3 / T3). There is ONE column here. Its ink band
 * is a background gradient stop, and every row spans the whole width with a fixed 52px icon cell
 * at its head. That is the ENTIRE mechanism by which icons do not drift when the shell collapses
 * — not matched paddings, not a measured offset. A refactor into `<Rail/>` beside `<Panel/>`
 * looks tidier and reintroduces the bug the same afternoon.
 *
 * ⚠️ THE IA IS A PROP. This component owns the grammar (what is lit, what is open, what rolls
 * up); it owns no section list. Phase 3 passes the real one, so a nav change never means editing
 * the shell.
 *
 * State grammar, collapse persistence and the crumb are the pure `lib/workspaceShell`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Book, ChevronDown, ChevronsUpDown, ChevronsLeft, Settings } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { planLine, resolveActiveManuscript } from "../../lib/shellSidebar";
import {
  ShellSection, openForHit, readCollapsed, sectionClick, sectionRowState, shellCrumb, shellHitFor,
  writeCollapsed,
} from "../../lib/workspaceShell";
import { AvatarChip, CountChip, HelpButton, MenuCard, MenuCardItem, SearchPill } from "./primitives";
import "./primitives.css";
import "./workspaceShell.css";

/** The shared active-manuscript key. ⚠️ Packages, Comps and Manuscripts READ this — a selector
 *  that stops writing it breaks them silently, with no error and simply the wrong book. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export interface WorkspaceShellProps {
  /** The IA — owned by the caller (Phase 3), never by this component. */
  sections: ShellSection[];
  /** Icon per section id. A section with no icon renders its cell empty rather than crashing. */
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
  // The route decides which section is expanded on arrival; a click may then override it.
  const [openId, setOpenId] = useState<string | null>(() => openForHit(hit));
  const [flyoutFor, setFlyoutFor] = useState<string | null>(null);
  const [msOpen, setMsOpen] = useState(false);

  const shellRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Following the route means a link from anywhere lands with the right section already open.
  useEffect(() => { setOpenId(openForHit(hit)); }, [hit?.section, hit?.child]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsed(typeof window === "undefined" ? null : window.localStorage, next);
      return next;
    });
    setFlyoutFor(null);
  }, []);

  /* Dismissal: outside pointer, Escape, and any navigation. The same three the scope chip uses,
     so every transient surface in the shell behaves identically. */
  useEffect(() => {
    if (!flyoutFor && !msOpen) return;
    const onDown = (e: PointerEvent) => {
      if (shellRef.current?.contains(e.target as Node)) return;
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

  const onSectionClick = useCallback((sec: ShellSection) => {
    const plan = sectionClick(sec, hit, openId, collapsed);
    if (plan.flyout) {
      setFlyoutFor((f) => (f === sec.id ? null : sec.id));
      return;
    }
    setFlyoutFor(null);
    setOpenId(plan.open);
    if (plan.go) go(plan.go);
  }, [hit, openId, collapsed, go]);

  /* ── the manuscript selector (Baked 9) ── */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const activeMs = resolveActiveManuscript(manuscripts, storedMs);
  const manyMs = manuscripts.length > 1;
  const pickMs = useCallback((id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* not worth an error */ }
    setMsOpen(false);
    // Re-render the pages that read the key. They listen to their own state, so a nudge through
    // the router is the cheapest honest way to make the change visible everywhere at once.
    onNavigatePath(`${pathname}${search}`);
  }, [onNavigatePath, pathname, search]);

  const crumb = shellCrumb(sections, hit);
  const plan = planLine(currentUser?.plan);
  const name = currentUser?.name ?? "";

  const flySection = sections.find((s) => s.id === flyoutFor);
  const flyTop = flyoutFor ? rowRefs.current[flyoutFor]?.offsetTop ?? 0 : 0;

  return (
    <div className="ws-desk">
      <div className="ws-cap">

        <aside
          ref={shellRef}
          className={`ws-shell${collapsed ? " shut" : ""}${flyoutFor ? " flyopen" : ""}`}
          aria-label="Main navigation"
        >
          {/* ── head A: brand ── */}
          <div className="ws-row ws-hrowA" data-tip="ScriptAlly">
            <span className="ws-ci"><span className="ws-glyph">S</span></span>
            <span className="ws-cl ws-fade">ScriptAlly</span>
          </div>

          {/* ── head B: the manuscript selector. Single manuscript = the same row, static. ── */}
          {activeMs && (
            <div className="ws-msrow">
              <button
                type="button"
                className={`ws-row ws-hrowB${manyMs ? "" : " static"}`}
                data-tip={activeMs.title}
                aria-haspopup={manyMs ? "menu" : undefined}
                aria-expanded={manyMs ? msOpen : undefined}
                /* ⚠️ NOT `disabled` when there is one manuscript. A disabled button stops firing
                   hover in several browsers, and the collapsed rail's only way to name this book
                   is its tooltip — disabling it would silently cost the single-manuscript user
                   the one label they have. It is inert by handler and by class instead. */
                onClick={() => { if (manyMs) { setFlyoutFor(null); setMsOpen((o) => !o); } }}
              >
                <span className="ws-ci"><span className="ws-ib"><Book aria-hidden="true" /></span></span>
                <span className="ws-cl ws-fade">
                  <span className="ws-mstitle">{activeMs.title}</span>
                  {manyMs && <span className="ws-chev"><ChevronsUpDown aria-hidden="true" /></span>}
                </span>
              </button>
              {msOpen && manyMs && (
                <MenuCard heading="Manuscript" className="ws-fly" style={{ top: 46 }} role="menu">
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
            </div>
          )}

          <div className="ws-hdiv ws-fade" />

          {/* ── nav ── */}
          <nav className="ws-navwrap">
            {sections.map((sec) => {
              const st = sectionRowState(sec, hit, openId, collapsed);
              const kids = sec.children ?? [];
              return (
                <React.Fragment key={sec.id}>
                  <button
                    type="button"
                    ref={(el) => { rowRefs.current[sec.id] = el; }}
                    className={`ws-row fill-${st.fill}${st.railOn ? " rail-on" : ""}${st.open ? " open" : ""}`}
                    data-tip={st.tip}
                    aria-current={st.railOn ? "true" : undefined}
                    aria-expanded={kids.length ? st.open : undefined}
                    onClick={() => onSectionClick(sec)}
                  >
                    <span className="ws-ci"><span className="ws-ib">{icons[sec.id]}</span></span>
                    <span className="ws-cl ws-fade">
                      {sec.label}
                      {st.count && <CountChip count={st.count.n} urgent={st.count.urgent} />}
                      {kids.length > 0 && (
                        <span className="ws-pch"><ChevronDown aria-hidden="true" /></span>
                      )}
                    </span>
                  </button>

                  {kids.length > 0 && (
                    <div className={`ws-sub${st.open ? " open" : ""}`}>
                      <div className="ws-subin ws-fade">
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

          <div className="ws-spacer" />

          {/* ── foot (Baked 10): hairline → user → Settings → collapse ── */}
          <div className="ws-fdiv ws-fade" />

          <button
            type="button"
            className="ws-row ws-urow"
            data-tip={`${name} · ${plan.label}`}
            onClick={onOpenAccount}
            aria-haspopup="menu"
          >
            <span className="ws-ci"><AvatarChip name={name} size={28} /></span>
            <span className="ws-cl ws-fade">
              <span className="ws-n">{name}</span>
              <span className="ws-p">
                {plan.label}
                {plan.upgrade && (
                  <>
                    {" · "}
                    <span
                      role="link"
                      tabIndex={-1}
                      className="ws-up"
                      onClick={(e) => { e.stopPropagation(); onUpgrade?.(); }}
                    >
                      Upgrade
                    </span>
                  </>
                )}
              </span>
            </span>
          </button>
          {accountMenu}

          <button
            type="button"
            className="ws-row ws-setrow"
            data-tip="Settings"
            onClick={() => go("/account")}
          >
            <span className="ws-ci"><span className="ws-ib"><Settings aria-hidden="true" /></span></span>
            <span className="ws-cl ws-fade">Settings</span>
          </button>

          <button
            type="button"
            className="ws-row ws-crow"
            data-tip={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand the navigation" : "Collapse the navigation"}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
          >
            <span className="ws-ci"><span className="ws-ib"><ChevronsLeft aria-hidden="true" /></span></span>
            <span className="ws-cl ws-fade">Collapse</span>
          </button>

          {/* THE FLYOUT — the same MenuCard the top-nav user menu draws, with identical children,
              counts and states. Two components here would be two things to keep in agreement. */}
          {flySection && (
            <MenuCard
              heading={flySection.label}
              className="ws-fly"
              style={{ top: flyTop }}
              role="menu"
            >
              {(flySection.children ?? []).map((ch) => (
                <MenuCardItem
                  key={ch.id}
                  label={ch.label}
                  on={hit?.section === flySection.id && hit?.child === ch.id}
                  count={ch.count}
                  urgent={ch.urgent}
                  onSelect={() => go(ch.path)}
                />
              ))}
            </MenuCard>
          )}
        </aside>

        <div className="ws-main">
          <header className="ws-bar">
            {crumb && (
              <span className="ws-crumb">
                <b>{crumb.section}</b>
                {crumb.child && <> · {crumb.child}</>}
              </span>
            )}
            {/* Baked 12 — the app's search lives here, beside help. Never in the panel. */}
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
