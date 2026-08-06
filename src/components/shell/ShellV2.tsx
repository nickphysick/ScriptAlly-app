/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellV2 — the CAPSULE shell chrome (ref design-refs/scriptally-shell-canonical.html): the 70px
 * icon rail capsule (burgundy plane glyph, icon-only ribs with tooltips, Setup at the foot — the
 * avatar chip is RETIRED), the 288px panel capsule (a 58px head band carrying the wordmark, or
 * the "Navigate" label on the dashboard where the bar has the wordmark instead; contents
 * in ShellSidebar), and the content capsule's 58px top bar — wordmark-or-breadcrumb · divider ·
 * scope · the search OPENER (⌘K) · help · the user block. The bar no longer holds a search
 * field: it opens the command palette, which is the app's one search.
 *
 * The flat shell's tab tongue, captions, masthead rule/kicker and tuck control are RETIRED
 * (collapse behaviour is an open question — deliberately not built). Display of every sv2
 * element is class + media-query driven (shellV2.css) — never inline.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutGrid, Send, Users, Book, Settings, PanelLeft, List, Package, User, Compass, BookCopy,
  SlidersHorizontal, HelpCircle, ChevronDown, ChevronLeft, Search, ListChecks, CalendarDays, StickyNote, Sun,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { MobileDetailSpec } from "./mobileChrome";
import { useShellNavCounts } from "./ShellSidebar";
import {
  SHELL_DASHBOARD, SHELL_RAIL, SHELL_SECTIONS, SHELL_SETUP, SHELL_SETUP_PATHS, ShellV2Section, railClickPlan,
  shellCrumbForPath, shellPageForPath, shellSectionKeyForPath,
} from "./shellV2Nav";
import "./shellV2.css";

const RAIL_ICONS: Record<string, React.ComponentType<{ "aria-hidden"?: boolean | "true" }>> = {
  dashboard: LayoutGrid,
  querying: Send,
  // ⚠️ A PARALLEL SURFACE, not type-linked to SHELL_SECTIONS (the same trap the comps rail entry
  // hit): a section with no icon here renders nothing at all. Add both, always.
  todo: ListChecks,
  agents: Users,
  shelf: Book,
};

/** The paper-plane brand glyph (capsule mockup .mk) — small, burgundy, top of the rail. */
const Mark: React.FC = () => (
  <svg className="sv2-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.7 2.3 2.6 9.6c-.8.3-.8 1.4 0 1.7l6.1 2.3 2.3 6.1c.3.8 1.4.8 1.7 0l7.3-19.1c.3-.7-.4-1.4-1.1-1.1Z" />
  </svg>
);

/* ── rail flyouts (collapsed state only — supersedes the fixes pack's "rail only") ─────────
   Hovering a section rib opens a floating quick-nav capsule beside the rail: kicker, page rows
   (icon · label · count), and an Expand-sidebar footer. Dashboard is a straight link — no
   flyout (baked); Setup's flyout carries Task settings (the modal trigger — it navigates to
   /todo and dispatches sa:open-task-settings, since the sheet lives in that page) + Help
   centre. The ~140ms grace timer is interaction logic, not animation; appearance animates via
   the CSS .show class. Keyboard: ribs open on focus, rows are real buttons (Tab + Enter) — no
   fuller menu-key system, per the pack. ── */

/** The rail sections that carry a flyout while collapsed — Dashboard deliberately absent. */
export const FLYOUT_SECTIONS = ["querying", "todo", "agents", "shelf", "setup"] as const;
export type FlyoutKey = (typeof FLYOUT_SECTIONS)[number];

const PAGE_ICONS: Record<string, React.ReactNode> = {
  "queries-hub": <Send aria-hidden="true" />,
  todo: <List aria-hidden="true" />,
  "todo-today": <Sun aria-hidden="true" />,
  "todo-calendar": <CalendarDays aria-hidden="true" />,
  "todo-noteboard": <StickyNote aria-hidden="true" />,
  packages: <Package aria-hidden="true" />,
  "agents-list": <User aria-hidden="true" />,
  "agents-discover": <Compass aria-hidden="true" />,
  manuscripts: <Book aria-hidden="true" />,
  comps: <BookCopy aria-hidden="true" />,
};

export interface FlyoutRowSpec {
  key: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  onClick: () => void;
}

/** The floating quick-nav capsule — presentational; exported for the structural locks. */
export const ShellFlyout: React.FC<{
  kicker: string;
  rows: FlyoutRowSpec[];
  onExpand: () => void;
  /** Fixed top from the rib's rect (top-aligned, −8px); clamped to the viewport on layout. */
  top: number;
  show: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ kicker, rows, onExpand, top, show, onMouseEnter, onMouseLeave }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    el.style.top = `${Math.min(top, window.innerHeight - el.offsetHeight - 20)}px`;
  }, [top, rows.length]);
  return (
    <div
      ref={ref}
      className={`sv2-fly${show ? " show" : ""}`}
      style={{ top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sv2-fk">{kicker}</div>
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          className={`sv2-frow${row.active ? " on" : ""}`}
          aria-current={row.active ? "page" : undefined}
          onClick={row.onClick}
        >
          {row.icon}
          <span className="sv2-flbl">{row.label}</span>
          {row.count !== undefined && <span className="sv2-fct">{row.count}</span>}
        </button>
      ))}
      <button type="button" className="sv2-ff" onClick={onExpand}>
        Expand sidebar
        <span className="sv2-fkb">⌘\</span>
      </button>
    </div>
  );
};

/* ── rail capsule ─────────────────────────────────────────────────────────── */

export const ShellRail: React.FC<{
  /** Navigate to a path, clearing the global search (AppShell's goPath). */
  onNavigatePath: (path: string) => void;
  /** Panel collapse (fixes pack): while collapsed, the rail carries the flyouts. */
  collapsed?: boolean;
  onExpand?: () => void;
  /** The rail selects a SECTION (rail-section-select pack): expand the panel and open this
   *  accordion section (null = open none — the on-Dashboard expand). Never navigates. */
  onBrowse?: (section: ShellV2Section["key"] | null) => void;
  /** The accordion's open section (rail-icon-toggle pack) — AppShell owns it; the click
   *  policy keys COLLAPSE off this, never off the route's section. */
  openSection?: ShellV2Section["key"] | null;
  /** The OPEN section's icon toggles the panel shut (rail-icon-toggle pack). */
  onCollapse?: () => void;
}> = ({ onNavigatePath, collapsed = false, onExpand, onBrowse, openSection = null, onCollapse }) => {
  const { pathname } = useLocation();
  const counts = useShellNavCounts();
  const activeKey = shellSectionKeyForPath(pathname);
  // The indicator's position IS the route's rib — one derivation, so back/forward move it too.
  const railIndex = SHELL_RAIL.findIndex((r) => r.key === activeKey);
  // Silent on mount: paint it in place, THEN allow the transition.
  const [indicatorReady, setIndicatorReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIndicatorReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  const activePage = shellPageForPath(pathname)?.page.key ?? null;

  // ── flyout state: which section, anchored where; the ~140ms grace timer lets the pointer
  // travel rib → flyout (interaction logic — the appearance itself is the CSS .show class).
  const [fly, setFly] = useState<{ key: FlyoutKey; top: number } | null>(null);
  const hideTimer = useRef<number | null>(null);
  const cancelHide = () => {
    if (hideTimer.current !== null) { window.clearTimeout(hideTimer.current); hideTimer.current = null; }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setFly(null), 140);
  };
  const openFly = (key: FlyoutKey) => (e: React.SyntheticEvent) => {
    if (!collapsed) return;
    cancelHide();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFly({ key, top: rect.top - 8 });
  };
  useEffect(() => { if (!collapsed) setFly(null); }, [collapsed]);
  useEffect(() => () => cancelHide(), []);

  // The open flyout's rows — nav sections from the model; Setup's pair is bespoke (Task
  // settings triggers the modal: it lives in the To-do page, so the row navigates there and
  // dispatches the existing sa:open-task-settings event).
  const closeAnd = (fn: () => void) => () => { setFly(null); fn(); };
  const flyoutRows = (key: FlyoutKey): FlyoutRowSpec[] => {
    if (key === "setup") {
      return [
        {
          key: "task-settings", label: "Task settings",
          icon: <SlidersHorizontal aria-hidden="true" />, active: false,
          onClick: closeAnd(() => {
            window.dispatchEvent(new CustomEvent("sa:open-task-settings"));
            onNavigatePath("/todo");
          }),
        },
        {
          key: "help", label: "Help centre",
          icon: <HelpCircle aria-hidden="true" />, active: pathname === "/help",
          onClick: closeAnd(() => onNavigatePath("/help")),
        },
      ];
    }
    const section = SHELL_SECTIONS.find((s) => s.key === key)!;
    return section.pages.map((page) => ({
      key: page.key,
      label: page.label,
      icon: PAGE_ICONS[page.key],
      count: counts[page.key],
      active: activePage === page.key,
      onClick: closeAnd(() => onNavigatePath(page.path)),
    }));
  };
  const flyKicker = (key: FlyoutKey): string =>
    key === "setup" ? "Setup" : SHELL_SECTIONS.find((s) => s.key === key)!.label;

  const ribFlyProps = (key: FlyoutKey) =>
    collapsed
      ? {
          "data-fly": key,
          onMouseEnter: openFly(key),
          onMouseLeave: scheduleHide,
          onFocus: openFly(key),
          onBlur: scheduleHide,
        }
      : {};

  return (
    <nav className="sv2-rail sv2-cap" aria-label="Sections">
      <div className="sv2-railhead"><Mark /></div>
      {/* (The dedicated expand control is RETIRED — rail-section-select pack P2. Expansion
          comes from any section icon, the Dashboard icon when already on Dashboard, and ⌘\;
          the flyout footer advertises it, and the panel's tuck control keeps collapse
          discoverable.) */}
      <div className="sv2-railnav">
        {/* THE SLIDING INDICATOR (chrome refinements). Driven by the ACTIVE ROUTE, not by a
            click handler — a click-driven pill desyncs the moment you use back/forward. It
            moves by transform only (never `top`), and it is SILENT ON MOUNT: the transition
            class is added one frame after the first paint, so it cannot slide down from the
            top of the rail on every page load. Hidden when no rib is lit. */}
        {railIndex >= 0 && (
          <span
            className={`sv2-railpill${indicatorReady ? " ready" : ""}`}
            style={{ transform: `translateY(calc(${railIndex} * var(--shell-row-h)))` }}
            aria-hidden="true"
          />
        )}
        {SHELL_RAIL.map((rib) => {
          const Icon = RAIL_ICONS[rib.key];
          const on = activeKey === rib.key;
          const hasFly = rib.key !== "dashboard";
          return (
            <button
              key={rib.key}
              type="button"
              className={`sv2-rib${on ? " on" : ""}${fly?.key === rib.key ? " hovering" : ""}`}
              aria-current={on ? "page" : undefined}
              title={rib.caption}
              aria-label={rib.caption}
              onClick={() => {
                setFly(null);
                const plan = railClickPlan(rib.key, pathname, collapsed, openSection);
                if (plan.kind === "navigate") onNavigatePath(plan.path);
                else if (plan.kind === "browse") onBrowse?.(plan.section);
                else onCollapse?.();
              }}
              {...(hasFly ? ribFlyProps(rib.key as FlyoutKey) : {})}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="sv2-railspacer" />
      <button
        type="button"
        className={`sv2-rib${SHELL_SETUP_PATHS.has(pathname) ? " on" : ""}${fly?.key === "setup" ? " hovering" : ""}`}
        aria-current={SHELL_SETUP_PATHS.has(pathname) ? "page" : undefined}
        title={SHELL_SETUP.caption}
        aria-label={SHELL_SETUP.caption}
        onClick={() => {
          setFly(null);
          const plan = railClickPlan("setup", pathname, collapsed, openSection);
          if (plan.kind === "navigate") onNavigatePath(plan.path);
          else if (plan.kind === "browse") onBrowse?.(plan.section);
          else onCollapse?.();
        }}
        {...ribFlyProps("setup")}
      >
        <Settings aria-hidden="true" />
      </button>
      {/* (The rail's avatar chip is RETIRED — canonical shell pack: the account lives in the bar
          on every page, and in the panel foot. Three homes was one too many, and the bar's is the
          one that survives every panel state.) */}
      {collapsed && fly && (
        <ShellFlyout
          kicker={flyKicker(fly.key)}
          rows={flyoutRows(fly.key)}
          onExpand={() => { setFly(null); onExpand?.(); }}
          top={fly.top}
          show
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </nav>
  );
};

/* ── panel capsule frame ──────────────────────────────────────────────────── */

export const ShellSide: React.FC<{
  /** Panel collapse (fixes pack): hidden via the container's state class (CSS transition). */
  collapsed?: boolean;
  onCollapse?: () => void;
  /** The panel contents below the band (ShellSidebarBody). */
  children?: React.ReactNode;
}> = ({ collapsed = false, onCollapse, children }) => {
  const { pathname } = useLocation();
  // THE BRAND APPEARS ONCE — in the LEFTMOST CHROME NOT ALREADY CARRYING IT (palette pack,
  // amending the consolidated pack's "Navigate label on every page"). On the dashboard the bar
  // holds the wordmark, so the panel shows the label; everywhere else the bar holds the
  // breadcrumb, so the wordmark comes here. Two logos never sit side by side.
  // The two mounts are MUTUALLY EXCLUSIVE, which is why both may carry the inspection id.
  const brandHere = pathname !== SHELL_DASHBOARD.path;
  return (
    <aside className="sv2-side sv2-cap" aria-hidden={collapsed || undefined}>
      <div className="sv2-side-inner">
        {/* THE PANEL'S HEAD BLOCK — the same --shell-head-h as the rail head and the top bar, and
            flush to the capsule top like both, so all three close on ONE unbroken line. */}
        <div className="sv2-ptop">
          {brandHere ? (
            <span className="sv2-pwm">
              <ScriptAllyLogo heightPx={38} id="scriptally-brand-logo-root" />
            </span>
          ) : (
            <span className="sv2-plab">Navigate</span>
          )}
          <button
            type="button"
            className="sv2-tuck"
            title="Hide the panel (⌘\)"
            aria-label="Hide the panel"
            onClick={onCollapse}
          >
            <PanelLeft aria-hidden="true" />
          </button>
        </div>
        <div className="sv2-pbody">{children}</div>
      </div>
    </aside>
  );
};

/* ── top bar (inside the content capsule) ─────────────────────────────────── */

export const ShellTopBar: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  /** The manuscript SCOPE control, rendered by the shell and seated in the bar (top-bar
   *  rebuild): it left the sidebar entirely, so which manuscript you are working on is visible
   *  on every page and in every state — it used to vanish the moment the panel collapsed. */
  scope?: React.ReactNode;
  /** Help's existing behaviour, lifted out of the retired floating FAB. */
  onHelp?: () => void;
  /** THE SEARCH IS AN OPENER now — the palette takes the typing (palette pack). */
  onOpenSearch?: () => void;
  /** Focus returns to this control when the palette closes. */
  searchOpenerRef?: React.RefObject<HTMLButtonElement | null>;
  /** Mobile Pass 1 — the ACTIVE route's pushed detail (back/title or Cancel·title·Done). All
   *  detail elements are <md-only by CSS, so a registered spec changes nothing at md+. */
  mobileDetail?: MobileDetailSpec | null;
  /** Mobile Pass 1 — the avatar opens the you-menu sheet (<md only; desktop keeps the user
   *  block navigating to /account). */
  onOpenYou?: () => void;
}> = ({ onNavigate, scope, onHelp, onOpenSearch, searchOpenerRef, mobileDetail = null, onOpenYou }) => {
  const { pathname } = useLocation();
  const { currentUser } = useScriptAllyDb();
  // THE BAR HAS TWO STATES, ONE COMPONENT (ref design-refs/scriptally-bar-per-page.html).
  // Exactly two things differ — wordmark vs crumb, and where the search sits — so the bar never
  // reads as a different component between pages. Everything else is constant.
  const isDashboard = pathname === SHELL_DASHBOARD.path;
  const crumb = shellCrumbForPath(pathname);

  // (⌘K is registered ONCE, globally, by the palette host in AppShell — it must work from
  // anywhere including inside a text field, which a bar-local listener could not promise.)

  // THE OPENER — it still looks like the field it replaced, because it is still the thing you
  // click to search; it simply hands the typing to the palette.
  const search = (
    <button type="button" className="sv2-searchopen" onClick={onOpenSearch} ref={searchOpenerRef}>
      <Search aria-hidden="true" />
      <span className="sv2-sotext">Search agents, queries, notes…</span>
      <span className="sv2-sokb" aria-hidden="true">⌘K</span>
    </button>
  );
  // Help stops being a thing stuck to the viewport and becomes chrome. (The TIMELINE is out of
  // scope entirely — it stays exactly as it is.)
  const help = (
    <button type="button" className="sv2-tbicon" onClick={onHelp} title="Help" aria-label="Help">
      <HelpCircle aria-hidden="true" />
    </button>
  );

  // THE USER BLOCK — avatar · name · chevron, at the right end, on EVERY page.
  // It ALSO sits at the panel's foot. ⚠️ That duplication is INTENTIONAL AND APPROVED (canonical
  // shell pack): the bar's copy is the one that survives the panel collapsing, and the panel's
  // carries the plan line. Do not "tidy" either away. The rail's third copy is what went.
  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const user = currentUser && (
    <button type="button" className="sv2-tbuser" onClick={() => onNavigate("account")} title="Account">
      <span className="sv2-tbav" aria-hidden="true">{initials}</span>
      <span className="sv2-tbname">{currentUser.name}</span>
      <ChevronDown className="sv2-tbuchev" aria-hidden="true" />
    </button>
  );

  return (
    <header className={`sv2-topbar${isDashboard ? " sv2-tb-dash" : ""}${mobileDetail ? " sv2-tb-mdetail" : ""}`}>
      {/* MOBILE DETAIL (Mobile Pass 1, baked decision 5) — a pushed screen swaps the bar to
          ‹ back (query detail) or Cancel · title · Done (agent editor). Every element here is
          display:none at md+ (mobileShell.css), so desktop never sees them. */}
      {mobileDetail &&
        (mobileDetail.kind === "back" ? (
          <button type="button" className="sv2m-back" onClick={mobileDetail.onBack}>
            <ChevronLeft aria-hidden="true" />
            {mobileDetail.title}
          </button>
        ) : (
          <>
            <button type="button" className="sv2m-cancel" onClick={mobileDetail.onCancel}>
              Cancel
            </button>
            <span className="sv2m-dtitle">{mobileDetail.title}</span>
            <button type="button" className="sv2m-done" onClick={mobileDetail.onDone}>
              {mobileDetail.doneLabel ?? "Done"}
            </button>
          </>
        ))}
      {/* LEFT (ref design-refs/scriptally-bar-per-page.html) — the front door names the product;
          a working page names your location. THE BREADCRUMB IS BACK on every non-dashboard page:
          with the wordmark gone from those pages the slot stood empty, and orientation is what
          belongs in it. The DASHBOARD crumb rule stays deleted — the dashboard reads the
          wordmark, never a crumb, so that rule has nothing to come back to. */}
      {isDashboard ? (
        <span className="sv2-tbbrand">
          {/* The id is set HERE and nowhere else, so inspecting the brand measures THIS
              instance — the panel's and the mobile bar's copies no longer collide with it. */}
          <ScriptAllyLogo heightPx={38} id="scriptally-brand-logo-root" />
        </span>
      ) : (
        crumb && (
          <div className="sv2-crumb">
            {crumb.section !== crumb.page && (
              <>
                <span>{crumb.section}</span>
                <span className="sv2-sl">/</span>
              </>
            )}
            <b>{crumb.page}</b>
          </div>
        )
      )}
      <span className="sv2-vr" aria-hidden="true" />
      {scope}
      <div className="sv2-grow" />
      {/* SEARCH — on the dashboard it sits on the TRUE MIDLINE, absolutely centred so the flank
          widths can never pull it off the line; on working pages it returns to the right, and
          narrower, inside the tools cluster. */}
      {isDashboard ? (
        <>
          <div className="sv2-gsearch sv2-gsearch-c">{search}</div>
          <div className="sv2-tbright">{help}{user}</div>
        </>
      ) : (
        <div className="sv2-tbright">
          <div className="sv2-gsearch sv2-gsearch-r">{search}</div>
          {help}
          {user}
        </div>
      )}
      {/* MOBILE CLUSTER (Mobile Pass 1, concept frames 01/02/05) — the search opener as an icon
          and the avatar as the you-menu trigger. <md only by CSS; desktop keeps the pill + the
          user block above. */}
      <button type="button" className="sv2m-iconbtn" onClick={onOpenSearch} aria-label="Search">
        <Search aria-hidden="true" />
      </button>
      {currentUser && (
        <button
          type="button"
          className="sv2m-av"
          onClick={onOpenYou}
          aria-label="Your account and shortcuts"
          aria-haspopup="dialog"
        >
          {initials}
        </button>
      )}
    </header>
  );
};
