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
  Book, ChevronDown, ChevronsUpDown, ChevronsLeft, ChevronsRight, Plus, Settings,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { planLine, resolveActiveManuscript } from "../../lib/shellSidebar";
import {
  PEEK_GRACE_MS, PEEK_INTENT_MS, ShellSection, collapseKeyAllowed, openForHit, peeksOnHover,
  railBadge, railClick, readCollapsed, sectionClick, sectionRowState, shellCrumb, shellHitFor,
  writeCollapsed,
} from "../../lib/workspaceShell";
import { AvatarChip, CountChip, HelpButton, MenuCard, MenuCardItem, SearchPill } from "./primitives";
import { useSaveState, saveWhisper } from "../../lib/useSaveState";
import { invokeCapture } from "./railNav";
import { TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import "./primitives.css";
import manuscriptMark from "../../assets/shell/manuscript-icon.png";
import "./workspaceShell.css";

/** The shared active-manuscript key. ⚠️ Packages, Comps and Manuscripts READ this — a selector
 *  that stops writing it breaks them silently, with no error and simply the wrong book. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/**
 * ⚠️ 33px, AND THAT NUMBER IS MEASURED, NOT CHOSEN. `/scriptally-title-v2.png` is 2400×750 with
 * the cap-"S" spanning y 190→577 — **51.7% of the asset height**, the rest being ascender and
 * descender clearance baked into the artwork.
 *
 * So `heightPx` is NOT cap-height. The refinement pass asks for a ~17px cap beside 13px crumb
 * text: 17 ÷ 0.517 = 32.9 → 33. (Amendment 1 asked for ~16px and this was 31px; the target moved,
 * so the measurement was retaken rather than the number nudged.) Setting 17 here would render a
 * 9px cap and look like the logo had simply been made too small, with nothing to point at.
 */
const LOGOTYPE_PX = 33;

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
  /** The legacy navigate bridge — the + New menu's capture contracts run through it. */
  onNavigate?: (tab: string, subPageName?: string) => void;
  /* ⚠️ THE CARD OWNS THE APP'S SCROLL CONTAINER NOW (§4). The sticky bar only works if the page
     scrolls beneath it, which means the scroller must be INSIDE the card and ABOVE the content —
     so the host hands its stage identity (id, ref, handler) here rather than keeping a second
     scroller of its own. Two nested scrollers is the double-scroll this replaces. */
  scrollId?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  /** Rendered inside the scroller, after the content — the foot fade. */
  footFade?: React.ReactNode;
  /**
   * FIXED-VIEWPORT pages (Query Centre): the work wrapper takes a definite height so the page
   * fills it exactly and scrolls internally, instead of growing the sheet. Default false — every
   * other page keeps the growing wrapper the sticky frosted bar depends on. See .ws-work--fit.
   */
  fit?: boolean;
  /** The shared AccountMenu, rendered by the host so one component serves both shells. */
  accountMenu?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The pill's second line — `Thriller · 50,000 words`.
 *
 * ⚠️ EACH HALF IS OPTIONAL AND THE LINE IS ABSENT WHEN BOTH ARE. A manuscript with no genre and
 * no count would otherwise render a bare interpunct, or an empty row holding the pill open at a
 * height its content does not fill. Derived on read — nothing about this is stored.
 */
export function msMeta(ms: { genre?: string; wordCount?: number }): string {
  const bits: string[] = [];
  if (ms.genre) bits.push(ms.genre);
  if (ms.wordCount) bits.push(`${ms.wordCount.toLocaleString("en-GB")} words`);
  return bits.join(" · ");
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  sections, icons, onNavigatePath, onOpenSearch, onOpenHelp, onOpenAccount, onUpgrade,
  onNavigate, scrollId, scrollRef, onScroll, footFade, fit = false, accountMenu, children,
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
  const [newOpen, setNewOpen] = useState(false);

  const railRef = useRef<HTMLElement>(null);
  const newRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!newOpen) return;
    const onDown = (e: PointerEvent) => {
      if (newRef.current?.contains(e.target as Node)) return;
      setNewOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNewOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [newOpen]);

  useEffect(() => { setNewOpen(false); }, [pathname]);

  const go = useCallback((path: string) => {
    setFlyoutFor(null);
    setMsOpen(false);
    onNavigatePath(path);
  }, [onNavigatePath]);

  const runPlan = useCallback((plan: {
    open: string | null; go: string | null; expand: boolean; collapse?: boolean;
  }) => {
    setFlyoutFor(null);
    // §4: the active section's rail icon collapses. Nothing else in the plan applies — there is
    // no navigation to perform and no accordion to change, because you are already there.
    if (plan.collapse) { setShut(true); return; }
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

  const save = useSaveState();
  const crumb = shellCrumb(sections, hit);
  /* The section segment navigates to the section's DEFAULT child — the same destination its rail
     icon and panel row reach, so all three agree about what "Queries" means. */
  const activeSection = sections.find((sx) => sx.id === hit?.section);
  const sectionDefaultPath = activeSection?.children?.length
    ? (activeSection.children.find((c) => c.id === activeSection.def) ?? activeSection.children[0]).path
    : activeSection?.path ?? null;
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

        {/* ⚠️ AVATAR ABOVE SETTINGS — the foot order was flipped to match the PANEL's foot, which
            reads name-then-Settings. The rail and the panel are two views of one foot, and having
            them in opposite orders made the pair read as unrelated columns. */}
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

        <button
          type="button"
          className="ws-ri"
          data-tip="Settings"
          aria-label="Settings"
          onClick={() => { if (collapsed) { setShut(false); return; } go("/account"); }}
        >
          <Settings aria-hidden="true" />
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
                  {/* ⚠️ TWO STATES, AND THE FRAME IS THE DIFFERENCE (polish §5). A real cover is
                      FRAMED — parchment, hairline, soft shadow — because it is an object with an
                      edge. The illustrated mark is UNFRAMED, an illustration sitting on the panel;
                      framing it would make the artwork claim to be the book.
                      TODO(cover-upload): `coverUrl` does not exist on Manuscript yet — when it
                      does, this ternary is the only thing that changes. */}
                  {activeMs.coverUrl ? (
                    <span className="ws-mcov framed"><img src={activeMs.coverUrl} alt="" /></span>
                  ) : (
                    <span className="ws-mcov illus"><img src={manuscriptMark} alt="" aria-hidden="true" /></span>
                  )}
                  <span className="ws-mstt">
                    <span className="ws-mst">{activeMs.title}</span>
                    {msMeta(activeMs) && <span className="ws-msg">{msMeta(activeMs)}</span>}
                  </span>
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
          </div>

          <div className="ws-pdiv" />

          {/* ⚠️ FLAT GROUPS, EVERY DESTINATION VISIBLE (final ref). The accordion is retired:
              a parent row that both navigated AND disclosed was one control doing two jobs, and
              it put half the app behind a state you had to know to open. The group label is pure
              typography — not a button, no state, nothing to click. */}
          <nav className="ws-nav">
            {sections.map((sec, gi) => (
              <React.Fragment key={sec.id}>
                <div className={`ws-glabel${gi === 0 ? " first" : ""}`}>{sec.label}</div>
                {(sec.children ?? []).map((ch) => {
                  const on = hit?.section === sec.id && hit?.child === ch.id;
                  return (
                    <button
                      type="button"
                      key={ch.id}
                      className={`ws-ni${on ? " on" : ""}`}
                      aria-current={on ? "page" : undefined}
                      onClick={() => go(ch.path)}
                    >
                      <span className="ws-ic">{icons[ch.icon ?? ch.id] ?? icons[sec.id]}</span>
                      {ch.label}
                      {typeof ch.count === "number" && <CountChip count={ch.count} urgent={ch.urgent} />}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>

          {/* ⚠️ POLISH §3 — THE COLLAPSE CONTROL IS A NAV-FOOT ROW NOW. It sat as a « ghost beside
              the manuscript pill, where it competed with the pill for the head's attention and
              read as an action ON the manuscript. At the foot of the nav it reads as what it is:
              a thing you do to the sidebar. Same handler, same persistence key. */}
          {/* ⚠️ NO SPACER HERE — THE NAV IS THE GROWER (final ref: `.nav{flex:1;min-height:0;
              overflow:auto}` and nothing between it and the collapse row). The row still has to
              sit at the panel foot rather than under the last item, but a `ws-grow` BESIDE a
              flex:1 nav is two claimants on the same slack: the browser splits it, so the nav
              gets half the column, scrolls internally, and the app's last two groups sit below a
              fold with empty panel underneath them. Let the nav take all of it and the foot is
              pushed down for free. */}
          <button
            type="button"
            className="ws-crow2"
            onClick={() => setShut(true)}
            aria-label="Collapse the navigation"
          >
            <ChevronsLeft aria-hidden="true" />
            Collapse sidebar
          </button>

          {/* ── foot: hairline → account block → Settings. NO avatar (the rail carries the face). ── */}
          <div className="ws-pfoot">
            <div className="ws-pdiv" />
            {/* ⚠️ POLISH §6 — ONE INTERACTIVE ROW, not two text lines. The name gets the full row
                width on line 1 so a realistic name never truncates at 186px; the plan and the
                Upgrade pill share line 2. Clicking the row opens Settings for now.
                TODO(account-menu): this is the opener for an account menu when one exists. */}
            <div
              className="ws-uacct"
              role="button"
              tabIndex={0}
              onClick={() => go("/account")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go("/account"); } }}
            >
              <span className="ws-n">{name}</span>
              <span className="ws-acctline">
                <span className="ws-pl">{plan.label}</span>
                {plan.upgrade && (
                  /* ⚠️ THE PILL STOPS PROPAGATION. Without it the row's own handler would fire
                     too and the click would land on Settings — the upsell would open the one
                     page that is not the upgrade flow. */
                  <button
                    type="button"
                    className="ws-upg"
                    onClick={(e) => { e.stopPropagation(); onUpgrade?.(); }}
                  >
                    Upgrade
                  </button>
                )}
              </span>
            </div>
            <button type="button" className="ws-ni ws-setrow" onClick={() => go("/account")}>
              <span className="ws-ic"><Settings aria-hidden="true" /></span>
              Settings
            </button>
          </div>
        </div>
      </div>
      {accountMenu}

      {/* ══ MAIN — the chrome ground frames a white content card. ══
          ⚠️ ONE SCROLL CONTAINER, AND THE BAR IS STICKY INSIDE IT (§4). The frosted effect only
          exists because content passes BENEATH the bar; a fixed header above a scrolling body
          would have nothing to frost. `.ws-work` is therefore `flex:none` and does not scroll —
          do not "simplify" this back. */}
      <div className="ws-main">
        <div className="ws-card">
          {/* ⚠️ `sv2-stagepad` RIDES ALONG, and it is not decoration: below md it adds the floating
              tab bar's clearance. It belonged to the stage element, and the stage element is this
              one now — dropping the class silently put the tab bar over the last 100px of every
              mobile page. */}
          <div
            className="ws-cscroll sv2-stagepad"
            id={scrollId}
            ref={scrollRef}
            onScroll={onScroll}
          >
            <header className="ws-bar">
              {/* ⚠️ EVERY CRUMB SEGMENT IS INTERACTIVE (§5), and the separator is `/` throughout —
                  the live mix of `/` and `·` made the brand look like a different KIND of step
                  from the section. Only the current page is ink; ancestors are muted links. */}
              <nav className="ws-crumb" aria-label="Breadcrumb">
                <button
                  type="button"
                  className="ws-logobtn"
                  aria-label="Dashboard"
                  onClick={() => go("/dashboard")}
                >
                  <img
                    className="ws-logotype"
                    src="/scriptally-title-v2.png"
                    alt="ScriptAlly"
                    style={{ height: LOGOTYPE_PX }}
                  />
                </button>
                {crumb && (
                  <>
                    <span className="ws-sep" aria-hidden="true">/</span>
                    {crumb.child ? (
                      <>
                        <button
                          type="button"
                          className="ws-seg"
                          onClick={() => { const d = sectionDefaultPath; if (d) go(d); }}
                        >
                          {crumb.section}
                        </button>
                        <span className="ws-sep" aria-hidden="true">/</span>
                        <span className="ws-cur" aria-current="page">{crumb.child}</span>
                      </>
                    ) : (
                      <span className="ws-cur" aria-current="page">{crumb.section}</span>
                    )}
                  </>
                )}
              </nav>

              <div className="ws-bright">
                {/* ⚠️ WIRED TO REAL WRITE STATE, never a constant — a bar that always says
                    "saved" is worse than one that says nothing. See lib/saveSignal. */}
                <span className="ws-sync">{saveWhisper(save)}</span>
                <span className="ws-vdiv" aria-hidden="true" />
                <SearchPill onOpen={onOpenSearch} />
                <HelpButton onOpen={onOpenHelp} />
                <div className="ws-newwrap" ref={newRef}>
                  <button
                    type="button"
                    className="ws-nbtn"
                    aria-haspopup="menu"
                    aria-expanded={newOpen}
                    onClick={() => setNewOpen((o) => !o)}
                  >
                    <Plus aria-hidden="true" />
                    New
                  </button>
                  {newOpen && (
                    <MenuCard className="ws-newmenu" role="menu">
                      {/* ⚠️ CONTEXT-AWARE, and only here. On a To-do page the global create offers
                          the thing that page makes — a task — above the app-wide three. It opens
                          the SAME composer the page's own pink action does, in task mode (audit
                          item 7: one verb per control), by announcing an event the page listens
                          for. The shell must not learn what a composer is. */}
                      {pathname.startsWith("/todo") && (
                        <MenuCardItem
                          label="Add a task"
                          onSelect={() => {
                            setNewOpen(false);
                            window.dispatchEvent(new CustomEvent(TODO_OPEN_COMPOSER));
                          }}
                        />
                      )}
                      {/* The SAME capture contracts the dashboard hero actions use — the bar adds
                          a doorway, never a second door. */}
                      <MenuCardItem
                        label="Log a query"
                        onSelect={() => { setNewOpen(false); if (onNavigate) invokeCapture("query", onNavigate); }}
                      />
                      <MenuCardItem
                        label="Record a response"
                        onSelect={() => { setNewOpen(false); if (onNavigate) invokeCapture("record", onNavigate); }}
                      />
                      <MenuCardItem
                        label="Add agent"
                        onSelect={() => { setNewOpen(false); if (onNavigate) invokeCapture("agent", onNavigate); }}
                      />
                    </MenuCard>
                  )}
                </div>
              </div>
            </header>
            <div className={`ws-work${fit ? " ws-work--fit" : ""}`}>{children}</div>
            {footFade}
          </div>
        </div>
      </div>

    </div>
  );
};
