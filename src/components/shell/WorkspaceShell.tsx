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
import { isLivingRoute } from "../../lib/livingRoutes";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MastheadSectionContext } from "./mastheadSection";
import {
  Book, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { planLine, resolveScopedManuscript } from "../../lib/shellSidebar";
import {
  ShellSection, barPageName, openForHit, sectionClick, sectionRowState, shellHitFor,
} from "../../lib/workspaceShell";
import { searchShortcut } from "./primitives";
import { FolderTab, TabSibling } from "./FolderTab";
import { inkTabAid } from "./inkTabAid";
import { markPinnedToolbars } from "./pinnedToolbar";
import { BarSwitcher } from "./BarSwitcher";
import { BETA_MODE, BETA_PILL, FEEDBACK_FAB } from "../../lib/beta";
import { useSidebarCollapsed } from "./useSidebarCollapsed";
import { formatSidebarName, getInitials } from "../../lib/displayName";
import { DeskTooltip } from "../dashboard/DeskTooltip";
import { Rect as TipRect } from "../../lib/deskTooltip";
import { manuscriptViewHref, manuscriptViewPath } from "./manuscriptScope";
import { ShortcutsSheet, OPEN_SHORTCUTS_EVENT } from "./ShortcutsSheet";
import { moveInMenu } from "../../lib/menuKeys";
import "./shellMenus.css";
import { SidebarCapture } from "./SidebarCapture";
import {
  ACCOUNT_ROUTES, accountSectionForPath, isAccountPath, AccountSectionId,
} from "../../lib/accountRoutes";
import { SettingsRail, SETTINGS_RAIL_HEADING_ID } from "../settings/SettingsRail";
import { UserPlan } from "../../types";
import { APP_MARK, artUrl } from "../../lib/appArt";
import "./primitives.css";
import "./workspaceShell.css";
/* ⚠️ AFTER workspaceShell.css — the ink shell overrides it by order at equal specificity. */
import "./inkShell.css";
import { INK_THEME_COLOR } from "./inkTokens";
import { registeredPageGuide, requestPageGuide, subscribePageGuide } from "../../lib/pageGuide";

/** The shared active-manuscript key. ⚠️ Packages, Comps and Manuscripts READ this — a selector
 *  that stops writing it breaks them silently, with no error and simply the wrong book. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/* ⚠️ `LOGOTYPE_PX` IS RETIRED WITH THE CRUMB'S ARTWORK. It was 33 because the PNG is only 51.7%
   ink and a ~17px cap therefore needed a 33px element — a measured compensation for a specific
   asset. The v2 brand is TYPE (a Playfair "S" in an ink square), so there is no ink ratio to
   compensate for and nothing to keep the number in step with. */

/** The Help menu's three marks — the reference's own paths (book · map · keyboard), 16px, 1.6 stroke. */
const helpIcon = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const HELP_ICONS = {
  book: helpIcon(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>),
  map: helpIcon(<><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>),
  kb: helpIcon(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>),
};

export interface WorkspaceShellProps {
  /** The IA — owned by the caller, never by this component. */
  sections: ShellSection[];
  /** Icon per section id, rendered at 20px on the rail and 17px in the panel. */
  icons: Record<string, React.ReactNode>;
  onNavigatePath: (path: string) => void;
  onOpenSearch: () => void;
  /** Attached to the desktop SearchPill so the palette can anchor to it. */
  searchAnchorRef?: React.Ref<HTMLButtonElement>;
  onOpenHelp: () => void;
  /**
   * Toggles the beta feedback panel — the SAME state the dock's own button used to toggle, and
   * the same state `BetaStrip`'s "tell us when you find one" sets. The control moved into the bar
   * (feedback pack); what it does is untouched.
   *
   * ⚠️ OPTIONAL, so the pill is ABSENT rather than inert when nothing is wired to it. A feedback
   * button that opens nothing is the beta's worst possible control: it collects the report the
   * writer thinks they have sent.
   */
  onOpenFeedback?: () => void;
  /** True while that panel is open — the pill reports it, as the dock's button did. */
  feedbackOpen?: boolean;
  /** Opens the account menu, and hands it the element to anchor against (it is portalled). */
  onOpenAccount?: (anchor: HTMLElement) => void;
  onUpgrade?: () => void;
  /** The legacy navigate bridge — the sidebar's capture button (Log a query and its menu) runs its
   *  existing contracts through it. */
  onNavigate?: (tab: string, subPageName?: string) => void;
  /* ⚠️ THE CARD OWNS THE APP'S SCROLL CONTAINER NOW (§4). The sticky bar only works if the page
     scrolls beneath it, which means the scroller must be INSIDE the card and ABOVE the content —
     so the host hands its stage identity (id, ref, handler) here rather than keeping a second
     scroller of its own. Two nested scrollers is the double-scroll this replaces. */
  scrollId?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  /** Rendered inside the scroller, after the content — the foot fade. ⚠️ Phone only since ink shell v1:
   *  at ≥768px the page clips cleanly at the sheet's edge (inkShell.css hides it). */
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

/** The to-do pill's figure — "99+" above 99 (ink shell v1). */
export function inkCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

/** The feedback mark — the speech bubble the ref draws, shared by the card, the button and the icon. */
const FEEDBACK_ICON = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5.5h16v10H9l-5 4z" />
  </svg>
);

/* ⚠️ THE LOCAL `initials` IS GONE — it now comes from lib/displayName, beside the formatter that
   shortens the name it stands for. Two copies of the splitting rules agree by coincidence; a
   mononym or a trailing space pulls them apart and nothing fails, the chip just stops matching
   the name beside it. One input, one module, two outputs. */

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  sections, icons, onNavigatePath, onOpenSearch, searchAnchorRef, onOpenHelp, onOpenFeedback,
  feedbackOpen = false, onOpenAccount, onUpgrade,
  onNavigate, scrollId, scrollRef, onScroll, footFade, fit = false, accountMenu, children,
}) => {
  const { pathname, search } = useLocation();
  const { manuscripts, queries, agents, currentUser, updateUserProfile } = useScriptAllyDb();

  const hit = useMemo(() => shellHitFor(sections, pathname, search), [sections, pathname, search]);

  /* ⚠️ COLLAPSE RETURNS — AS A NARROWING, NOT A REMOVAL (sidebar-collapse pack; supersedes the
     app-shell-v2 note that retired it). What v2 retired was the RAIL-AND-PANEL model, where the
     rail was a second component and collapse swapped between them; keeping `collapsed` without
     that rail left a state with no UI, so the state went too. This is a different shape: ONE
     sidebar whose width narrows to an icon rail — every row keeps existing, labels collapse in
     place, the toggle lives in the pagebar at the seam. There is no second component to drift. */
  const sidebar = useSidebarCollapsed();

  /* ══ SETTINGS MODE ════════════════════════════════════════════════════════════════════════
     ⚠️ THE MODE IS DERIVED FROM THE ROUTE, NEVER HELD AS STATE. A boolean would have to be set on
     entry and cleared on every exit — a browser Back, a deep link, an in-app navigation from the
     account menu, the Esc key — and the one that gets forgotten leaves the app nav swapped out on
     a page that is not settings. The pathname already knows, and `isAccountPath` is the same
     predicate the route table itself reads.

     ⚠️ AND IT IS THE ONE CONDITION FOR ALL THREE CHANGES — the nav layer, the window's surface and
     the top bar's controls. Three booleans would be three things to get out of step; the class on
     `.ws-app` is what the stylesheet keys every one of them off. */
  const settingsMode = isAccountPath(pathname);
  /**
   * ⚠️ THE DASHBOARD IS A MODE TOO, AND IT IS THE SETTINGS MODE'S PATTERN RATHER THAN A SECOND ONE.
   * One condition, DERIVED from the route and never held as state — a boolean would have to be
   * cleared on every exit (a browser Back, a deep link, a redirect) and the day it is not, the
   * window dissolves under a page that still expects it.
   *
   * ⚠️ IT DISSOLVES THE WINDOW AND THE CRUMB, AND NOTHING ELSE. Settings also swaps the panel's
   * contents; this does not — the left rail is unchanged, because the dashboard is still a place in
   * the app rather than a mode of it. What goes is the white panel, the breadcrumb and the save
   * whisper: the ref draws its cards on the ground, and a card on a panel on a ground is two
   * surfaces where the design has one.
   */
  const dashMode = pathname === "/dashboard";
  /* ⚠️ THE QUERY CENTRE SITS ON THE OPEN GROUND TOO (v11, 19 Sep) — cards on the page's cream, no
     window sheet behind them — but it is NOT `dash-mode`: that class also moves the bar out of the
     flow, swaps the search for the big field and hides controls. `ground-mode` is the one thing
     the two pages share, stated once. Analytics is a sub-route and keeps the window. */
  const groundMode = pathname === "/queries";
  /* ⚠️ THE DASHBOARD'S TRANSPARENT-AT-REST BAR IS RETIRED (app shell v3). The bar is in the flow and
     opaque on every route, so there is no scroll reading to take and nothing to fade. */
  /**
   * ⚠️ THE SHELL COMPUTES NO LOADING STATE, AND THAT IS THE FIX (v34). The nav row's loading
   * treatment is keyed in `workspaceShell.css` to the dashboard's COVER — its `.os-skelpage`
   * element — through `:has()`, so the row and the body leave the loading state on one clock.
   *
   * This used to read the data flag directly, on the argument that the shell should compute the
   * loading state "from what it can see". It could see the wrong thing. The flag drops the moment
   * data lands; the cover (lib/skeletonTiming) holds at least 500ms, adds a 200ms settle beat, and
   * dissolves over 250ms. Measured on warm reloads: 13 frames of a live nav row above a fully
   * covered body, then 17 frames of dissolve with the row already live — the top of the screen
   * outside the loading state for about half a second, on every load, through every gate, because
   * every gate sampled the cover's FIRST frame, where the two clocks agree. What the shell can see,
   * with `:has()`, is the cover itself: no signal travels upward, and there is nothing to forget to
   * send.
   */
  const settingsSection: AccountSectionId | null = accountSectionForPath(pathname);

  /* ⚠️ THE EXIT GOES TO THE DASHBOARD, NOT `history.back()`. Back is where you CAME from, which on
     a deep link into `/account/security` from an email is outside the app entirely — and on a
     second visit is the previous settings section, so "Back to app" would walk the mode rather
     than leave it. The desk is where the app starts. */
  /* ⚠️ FOCUS RETURNS TO THE ACCOUNT ROW. When this was written there was no Settings item in the
     sidebar at all — Settings was the FIRST ROW of `AccountMenu`, a flyout closed by the time anyone
     leaves the mode — so the row that OPENS that menu was the nearest honest target. The foot's
     gear (sidebar metrics pass) is a Settings door now too, but it is removed while the sidebar is
     collapsed; the account row is present in both states, so it stays the target. */
  const acctRowRef = useRef<HTMLDivElement>(null);

  const leaveSettings = useCallback(() => {
    onNavigatePath("/dashboard");
    /* One frame, for the same reason the entry focus takes one: the app nav layer is behind a
       cross-fade that starts hidden, and a hidden element cannot take focus. */
    requestAnimationFrame(() => acctRowRef.current?.focus({ preventScroll: true }));
  }, [onNavigatePath]);

  /* ⚠️ FOCUS LANDS ON THE RAIL HEADING, and only when the mode TURNS ON. Keyed on the boolean
     rather than the pathname, so moving between sections does not yank focus out of the panel the
     reader is working in — which is the same effect as the page reloading under them.

     The rAF is not decoration: the heading is behind a cross-fade that begins with the layer
     `visibility: hidden`, and a hidden element cannot take focus. One frame is enough for the
     class to land; `preventScroll` stops the panel jumping if it is scrolled. */
  useEffect(() => {
    if (!settingsMode) return;
    const id = requestAnimationFrame(() => {
      document.getElementById(SETTINGS_RAIL_HEADING_ID)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [settingsMode]);

  /* ⚠️ ESC LEAVES THE MODE, AND IT IS DELIBERATELY NOT CAPTURED OR STOPPED. Settings is permanent
     chrome sitting over pages that own their own Escape — an open menu, a flyout, a field being
     edited — and swallowing the key at shell level would reach past this handler's business. It
     listens on the BUBBLE phase, so anything nearer the reader answers first and this only fires
     when nothing else did.

     ⚠️ AND IT IGNORES THE KEY WHILE AN EDITABLE HAS FOCUS. Escape in a text field is "abandon what
     I am typing" to every reader; leaving the whole mode on it would discard a draft by way of a
     shortcut nobody pressed on purpose. */
  useEffect(() => {
    if (!settingsMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      leaveSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsMode, leaveSettings]);

  /* ── rail tooltips (sidebar-collapse pack, Phase 3) ──
     ⚠️ PORTALLED THROUGH DeskTooltip, NEVER A ::after ON THE ROW — the nav list is an internal
     scroller inside a panel with `overflow: hidden`, so a child-element tooltip is clipped at the
     rail's 72px edge. The pack names this the single most likely thing to get wrong. One tip on
     screen at a time; the anchor rect is measured at open, exactly as the desk's own callers do. */
  const [railTip, setRailTip] = useState<{ anchor: TipRect; title: string; sub?: string; kbd?: string } | null>(null);
  /**
   * §4b — the `?`'s menu, and which page (if any) has a guide to offer. The store is READ on
   * subscribe as well as on notification: React runs a child's effects before its parent's, so the
   * page registers its guide before this shell subscribes and the notification reaches nobody.
   */
  const [helpOpen, setHelpOpen] = useState(false);
  const [guidePage, setGuidePage] = useState<string | null>(registeredPageGuide());
  const helpWrapRef = useRef<HTMLSpanElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setGuidePage(registeredPageGuide());
    return subscribePageGuide(() => setGuidePage(registeredPageGuide()));
  }, []);
  /* the house dismissal idiom: pointerdown outside, Escape, and the trigger counts as inside */
  useEffect(() => {
    if (!helpOpen) return;
    const away = (e: PointerEvent) => { if (!helpWrapRef.current?.contains(e.target as Node)) setHelpOpen(false); };
    /* Escape closes and hands focus back to the "?" (follow-up 2, §2) */
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setHelpOpen(false); helpBtnRef.current?.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [helpOpen]);
  const tipTimer = useRef<number | null>(null);
  const hideTip = useCallback(() => {
    if (tipTimer.current !== null) { window.clearTimeout(tipTimer.current); tipTimer.current = null; }
    setRailTip(null);
  }, []);
  /* Expanding while a tip is open (the `[` key) would strand it beside a full-width sidebar. */
  useEffect(() => { hideTip(); }, [sidebar.collapsed, hideTip]);
  /**
   * Handlers for one rail anchor. `when` gates rows to the collapsed state — the pack suppresses
   * rail tips entirely when expanded; the toggle passes `true` and its own 250ms. Copy is the
   * route label VERBATIM (no appraisal, no invented descriptions). Focus opens like hover, so the
   * keyboard pass reads the rail too; mousedown hides, so a tip never rides through a navigation.
   */
  const railTipFor = (title: string, sub: string | undefined, kbd: string | undefined, delayMs: number, when: boolean) => {
    const open = (e: { currentTarget: Element }) => {
      if (!when) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (tipTimer.current !== null) window.clearTimeout(tipTimer.current);
      tipTimer.current = window.setTimeout(() => {
        setRailTip({ anchor: { left: r.left, top: r.top, width: r.width, height: r.height }, title, sub, kbd });
      }, delayMs);
    };
    return { onMouseEnter: open, onFocus: open, onMouseLeave: hideTip, onBlur: hideTip, onMouseDown: hideTip };
  };
  const macLike = typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform ?? "");
  const toggleKbd = macLike ? "⌘\\" : "Ctrl+\\";

  const [openId, setOpenId] = useState<string | null>(() => openForHit(hit));


  useEffect(() => { setOpenId(openForHit(hit)); }, [hit?.section, hit?.child]); // eslint-disable-line react-hooks/exhaustive-deps



  const go = useCallback((path: string) => {
    onNavigatePath(path);
  }, [onNavigatePath]);

  /** ⚠️ THE ACCORDION SURVIVES, THE COLLAPSE DOES NOT. A section row is still a destination AND a
      disclosure, so `sectionClick`'s open/go limbs are read; its `expand`/`collapse` limbs named
      the retired sidebar state and are now inert. */
  const runPlan = useCallback((plan: { open: string | null; go: string | null }) => {
    setOpenId(plan.open);
    if (plan.go) go(plan.go);
  }, [go]);

  const onPanelClick = useCallback((sec: ShellSection) => {
    runPlan(sectionClick(sec, hit, openId, false));
  }, [hit, openId, runPlan]);

  /* ── the manuscript selector ── */
  /**
   * ⚠️ THE SELECTION LIVES IN `localStorage`, AND THAT IS A DELIBERATE STEP BACK FROM THE USER DOC.
   * This block previously wrote `selectedManuscriptId` onto the user document, treating the
   * localStorage key as a mirror. That field no longer exists on `User` — it went with the
   * shell generation that introduced it — so writing it now would not typecheck, and even if it
   * did, `isValidUser`'s hasOnly() allowlist would deny it SILENTLY: the selection would appear
   * to work and never persist. Restoring it is a data-model change with a rules deploy attached,
   * which is not what a sidebar-geometry pack is for.
   *
   * ⚠️ SO THE KEY IS THE SOURCE OF TRUTH, NOT A MIRROR — and it is the SAME key Packages, Comps,
   * Manuscripts and the page-smoke harness already read (`scriptally_active_manuscript_id`).
   * Those pages and the chrome therefore cannot disagree about which book is in scope, which was
   * the property the user-doc version was protecting. What is lost is only cross-DEVICE carry.
   */
  const storedMs = typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MS_KEY);
  const activeMs = resolveScopedManuscript(manuscripts, storedMs);
  const chooseMs = useCallback((id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* not worth an error */ }
  }, []);
  /**
   * ⚠️ ONE NAVIGATION EITHER WAY — this picker ALREADY re-navigated to the same path, so the naive
   * addition ("navigate to ?m=" plus the existing same-path call) would have navigated twice on the
   * one page the param matters. The helper returns null off `/manuscripts`, and null falls through
   * to the re-navigation this call site was already doing for its own reasons.
   *
   * ⚠️ AND THE CONDITION IS NOT WRITTEN HERE. `ShellScope` is the same control at a narrower
   * breakpoint, in another file; the rule lives in `manuscriptScope` so the two cannot drift.
   */
  const pickMs = useCallback((id: string) => {
    chooseMs(id);
    onNavigatePath(manuscriptViewPath(pathname, id) ?? `${pathname}${search}`);
  }, [chooseMs, onNavigatePath, pathname, search]);
  /* ⚠️ THE STEPPER ARROWS ARE RETIRED WITH THE SIDEBAR CARD (page header v2 §1). They wrote the key
     without re-routing, so a page that reads the key on render did not follow them until something
     else re-rendered it; the switcher's menu is the one way to change book, and it re-routes. */

  /**
   * ⚠️ THE CRUMB NO LONGER FOLLOWS THE OPEN QUERY (Query Centre v11, 19 Sep). It used to read
   * `QueryHawk / Queries / Greg Panetta` on `/queries?q=<id>`, on the reasoning that the page was
   * then showing ONE query. It is not: the open query is a card docked beside the list (a drawer
   * under 900px of column), the list is still on screen, and you have not gone anywhere — so the
   * trail says where you are, `Query Centre`. Measured at a 1280 window it also wrapped the crumb
   * to two lines and moved the bar every time a row was selected.
   */
  /**
   * ⚠️ THE MASTHEAD'S KICKER IS THE CRUMB'S OWN SECTION, TAKEN FROM THE SAME CALL. Reading a second
   * derivation put the two three inches apart and disagreeing: `shellV2Nav`'s `SHELL_SECTIONS` calls
   * the manuscripts group "Shelf" while the LIVE nav model (`lib/workspaceNav.ts`, which this crumb
   * reads) calls it "Materials" — so the bar said `Materials` and the pill said `SHELF` on the same
   * page, measured on the built bundle. The brief's four names — Queries · Agents · Materials ·
   * Tasks — are the live model's, which is the tell that it is the live one.
   *
   * ⚠️ `crumb.section` IS THE PAGE NAME ON A ONE-CHILD SECTION, by `shellCrumb`'s own rule: a group
   * of one contributes no segment. That is right for a breadcrumb and wrong for a kicker, which must
   * name a SECTION or nothing — so the section is looked up directly and the crumb's collapsing is
   * deliberately not inherited.
   */
  const sectionLabel = React.useMemo(
    () => (hit ? sections.find((sx) => sx.id === hit.section)?.label ?? null : null),
    [sections, hit],
  );
  /**
   * LIVING HEADERS v3 §2 — ON THE SIX LIVING ROUTES THE BAR CARRIES THE PAGE'S NAME, so the header's
   * eyebrow is withheld here, at its one source: the name is said once. Every other route keeps its
   * eyebrow. The decision is the route alone (`isLivingRoute`), the same call the bar makes below.
   */
  const crumbRoute = isLivingRoute(pathname);
  const mastheadSection = useMemo(() => ({ section: crumbRoute ? null : sectionLabel }), [sectionLabel, crumbRoute]);
  /**
   * §1 (page header v1) — THE BAR GAINS A SHADOW ONCE THE PAGE HAS SCROLLED, and nothing else.
   *
   * ⚠️ THE LISTENER IS ON THE WRAP, IN THE CAPTURE PHASE, because `scroll` does not bubble. Each
   * page owns its own scroller and the shell does not know which element that is — it changes with
   * the route, and on the pages that fill it is not the row but a pane inside one. Capturing at the
   * wrap catches a scroll from any descendant without the shell having to hunt for the element or
   * re-find it every time a page swaps.
   *
   * ⚠️ AND THE STATE IS DERIVED FROM THE VALUE, NEVER FROM AN EVENT WE MIGHT MISS. An
   * `IntersectionObserver` on a sentinel fires only on a CHANGE of intersection, so a callback that
   * never arrives is wrong for the life of the page; `scrollTop > 2`, read on every scroll, cannot
   * go stale. It is written only when it differs, so a scrolling page is not re-rendering the shell
   * on every frame.
   */
  const winWrapRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);
  /**
   * ⚠️ THE QUIET BAR'S PAGE-NAME FADE IS RETIRED (ink shell v1, Phase 2) — the folder tab names the page
   * from first paint on every route, so there is no title to wait for and no state to derive. What
   * survives is the scroll reading itself, as `data-scrolled` on the bar, because the pinned-toolbar
   * hairline (Phase 5) is the same question asked of the same scroller.
   *
   * ⚠️ THE LISTENER IS ON THE WRAP, IN THE CAPTURE PHASE, because `scroll` does not bubble; and the page's
   * scroller is the OUTERMOST overflowing scroller between the event's target and the wrap — inner rails
   * scroll too, and must not wake anything. The state is derived from the value on every read, never
   * from an observer whose missed event is permanent.
   */
  const [barScrolled, setBarScrolled] = useState(false);
  useEffect(() => {
    const wrap = winWrapRef.current;
    if (!wrap) return undefined;
    let frame = 0;
    let last: HTMLElement | null = null;
    const pageScroller = (t: HTMLElement): HTMLElement => {
      let sc = t;
      for (let p = t.parentElement; p && p !== wrap; p = p.parentElement) {
        if (p.scrollHeight > p.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowY)) sc = p;
      }
      return sc;
    };
    const measure = () => {
      frame = 0;
      const sc = last;
      if (!sc) return;
      const top = sc.scrollTop;
      setBarScrolled((was) => (was === top > 2 ? was : top > 2));
      markPinnedToolbars(wrap, sc);
    };
    const read = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || typeof t.scrollTop !== "number" || !(t instanceof HTMLElement)) return;
      last = pageScroller(t);
      if (!frame) frame = requestAnimationFrame(measure);
    };
    wrap.addEventListener("scroll", read, true);
    return () => { wrap.removeEventListener("scroll", read, true); if (frame) cancelAnimationFrame(frame); };
  }, []);
  /* ⚠️ A ROUTE CHANGE STARTS A NEW PAGE AT REST, and its scroller is a new element that will never
     announce the position the old one was left in. */
  useEffect(() => { setBarScrolled(false); }, [pathname]);

  /**
   * ⚠️ THE SHEET'S GEOMETRY, PUBLISHED FOR WHAT FLOATS OVER IT (ink shell v1, Phase 5). Toasts, chips
   * and floating tabs are portalled to `<body>`, so they cannot measure `.ws-window` from a selector —
   * and a viewport-anchored float sits on the INK, not the sheet. The shell measures the window (on a
   * ResizeObserver, so a collapse moves everything with it frame by frame) and writes four lengths onto
   * `<html>`: the sheet's left and right insets from the viewport, its bottom inset, and its centre.
   * Every float reads them with a fallback, so the phone (where the shell does not render this) and the
   * first frame are the old viewport positions.
   */
  useEffect(() => {
    const win = winWrapRef.current?.querySelector<HTMLElement>(".ws-window");
    if (!win || typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const keys = ["--ink-sheet-l", "--ink-sheet-r", "--ink-sheet-b", "--ink-sheet-cx"];
    const mq = window.matchMedia?.("(min-width: 768px)");
    const write = () => {
      /* ⚠️ DESKTOP ONLY: the shell renders on the phone too, and publishing there would move the phone's
         toasts and chips off their viewport positions (INK19). Below 768 the properties are absent and
         every reader falls back to its old value. */
      if (mq && !mq.matches) { for (const k of keys) root.style.removeProperty(k); return; }
      const r = win.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const vw = root.clientWidth || window.innerWidth;
      const vh = root.clientHeight || window.innerHeight;
      const px = (n: number) => `${Math.round(n * 10) / 10}px`;
      root.style.setProperty("--ink-sheet-l", px(r.left));
      root.style.setProperty("--ink-sheet-r", px(vw - r.right));
      root.style.setProperty("--ink-sheet-b", px(vh - r.bottom));
      root.style.setProperty("--ink-sheet-cx", px(r.left + r.width / 2));
    };
    write();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(write) : null;
    ro?.observe(win);
    window.addEventListener("resize", write);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", write);
      for (const k of keys) root.style.removeProperty(k);
    };
  }, []);

  /**
   * v135 — IS THE PAGE SHEET WIDER THAN 1440? Three open headers and the Query Centre's desk have a "compact" set of
   * values that belongs to the SHEET's width, not the viewport's (at a 1512 window the sheet is 1256). The class is
   * measured rather than a container query, because `container-type` on the sheet is layout containment, and that
   * would re-anchor every `position: fixed` child of a page to the sheet. A layout effect, so the first paint is right.
   */
  const [sheetWide, setSheetWide] = useState(false);
  useLayoutEffect(() => {
    const win = winWrapRef.current?.querySelector<HTMLElement>(".ws-window");
    if (!win) return undefined;
    const read = () => { const w = win.getBoundingClientRect().width; if (w > 0) setSheetWide(w > 1440); };
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(win);
    return () => ro?.disconnect();
  }, []);

  /* the search field is both the palette's anchor (the host's ref) and the folder tab's fit limit */
  const searchFieldRef = useRef<HTMLButtonElement | null>(null);
  const setSearchRefs = useCallback((el: HTMLButtonElement | null) => {
    searchFieldRef.current = el;
    if (typeof searchAnchorRef === "function") searchAnchorRef(el);
    else if (searchAnchorRef) (searchAnchorRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
  }, [searchAnchorRef]);

  /* the folder tab: the page's group label and its OTHER pages, in the sidebar's order */
  const tabSection = hit ? sections.find((sx) => sx.id === hit.section) ?? null : null;
  const tabSiblingsBase: TabSibling[] = useMemo(
    () => (tabSection?.children ?? [])
      .filter((ch) => ch.id !== hit?.child)
      .map((ch) => ({ id: ch.id, label: ch.label, path: ch.path, icon: icons[ch.icon ?? ch.id] ?? icons[tabSection!.id] })),
    [tabSection, hit?.child, icons],
  );
  /* ⚠️ THE REVIEW AID IS GATED HERE, AT THE CALL SITE, so a production build drops the module entirely
     (`import.meta.env.MODE` is replaced statically and the branch is dead). It injects hypothetical
     pages into the current group for INK6's "lots of pages" overflow; it fabricates INPUT, never output. */
  const tabSiblings = useMemo(
    () => (import.meta.env.MODE !== "production" ? inkTabAid(tabSiblingsBase) : tabSiblingsBase),
    [tabSiblingsBase],
  );
  const tabGroup = tabSection ? tabSection.label : null;

  /**
   * INK1 — THE BROWSER'S OWN CHROME TAKES THE SHELL'S INK, WHILE THE SHELL IS ON SCREEN AND ONLY AT
   * ≥768px. `index.html` states `#e7e0d5` for every tier, marketing included; changing the file would
   * retone the marketing pages and the phone's browser bar, both out of bounds. So the shell sets the
   * meta while mounted, follows the breakpoint, and puts the original back when it unmounts.
   */
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    const original = meta.content;
    const mq = window.matchMedia?.("(min-width: 768px)");
    const apply = () => { meta!.content = !mq || mq.matches ? INK_THEME_COLOR : original; };
    apply();
    mq?.addEventListener?.("change", apply);
    return () => {
      mq?.removeEventListener?.("change", apply);
      if (created) meta!.remove(); else meta!.content = original;
    };
  }, []);

  const plan = planLine(currentUser?.plan);
  const name = currentUser?.name ?? "";
  const pageName = barPageName(sections, hit, pathname);

  return (
    /* ⚠️ THE COLLAPSED STATE IS ANNOUNCED ON THE APP, NOT ONLY ON THE PANEL. `sb-collapsed` lives on
       `.ws-panel`, which is a SIBLING of the workspace — so no page can see it from a descendant
       selector, and a page that wants to redistribute the width the panel gave back has nothing to
       key on. Same boolean, second mount, on the common ancestor. */
    <div className={`ws-app${sidebar.collapsed ? " sb-shut" : ""}${settingsMode ? " set-mode" : ""}${dashMode ? " dash-mode" : ""}${groundMode ? " ground-mode" : ""}${sheetWide ? " sheet-wide" : ""}`}>

      {/* ⚠️ `sb-ready` GATES THE WIDTH TRANSITION (sidebar-collapse pack, Phase 1). The collapsed
          state is read synchronously, so the first render is already narrow — but a transition
          declared unconditionally still animates from the stylesheet's width on load. The class
          arrives two rAFs after mount; until then, state changes are instant. */}
      <div
        id="ws-sidebar"
        className={`ws-panel${sidebar.collapsed ? " sb-collapsed" : ""}${sidebar.ready ? " sb-ready" : ""}`}
      >
        <div className="ws-pin">

          {/* ⚠️ THE BRAND SITS ABOVE THE MANUSCRIPT SELECTOR (app-shell-v2). It used to be the
              rail's ink tile; with the rail gone the sidebar is the leftmost chrome, so this is
              where the mark belongs — and it is the ONLY place it appears, per the one-brand
              rule. The mark doubles as the route home, as the rail's tile did. */}
          {/* ⚠️ THE MARK IS ARTWORK; THE WORDMARK IS TYPE (audit pack P4). This is the third swing
              of that pendulum — type, then the asset, now type again — so it is worth stating what
              actually decided it rather than leaving the next pass to swing it back.

              The MARK is the hawk-head roundel — `lib/appArt`'s 120px copy of the landing nav's own
              mark — 40px across, sitting bare on the ground: no plate, no border, no fill. (It was
              `/scriptally-logo-new.png`, the plane-and-S, until the v34 mockup of 19 Sep.) It is
              transparent artwork, so a plate would be a box drawn around a shape that does not
              need one. Collapsed, the roundel alone is the brand.

              The WORDMARK is set in Playfair at 22px. The previous pass used
              `/scriptally-title-v2.png` on the grounds that re-setting it is "a lookalike rather
              than the mark" — a fair argument that came with a real cost: that asset is only
              ~51.7% ink, so its element height was never its cap height and 33px bought a ~17px
              cap. Every future size change had to carry that compensation with it. Type has no
              dead space to compensate for, and 22px is 22px.

              ⚠️ SO THE ~51.7%-INK TRAP LEAVES THIS FILE WITH THE ASSET. It still applies wherever
              the title PNG is used (SmartImportReview, SidebarNav, ScriptAllyLogo) — this mount
              simply no longer has an ink ratio to keep in step. */}
          {/* ══ THE LOGO ROW (ink shell v1): the hawk mark, the wordmark, the BETA chip, and the collapse
              toggle at the row's end. Collapsed, the toggle takes the mark's place while the mark is
              hovered (inkShell.css) — so the row is the same element in both states and nothing reflows. */}
          <div className="ws-logo" data-shell="logo">
            {/* ⚠️ THE MARK IS ARTWORK; THE WORDMARK IS TYPE (audit pack P4) — the hawk-head roundel,
                bare on the ground, and "QueryHawk" set in type. The mark doubles as the route home. */}
            <button type="button" className="ws-brand" onClick={() => go("/dashboard")} aria-label="QueryHawk — go to dashboard">
              <img className="ws-bmark" src={artUrl(APP_MARK)} width={APP_MARK.width} height={APP_MARK.height} alt="" aria-hidden="true" />
              <span className="ws-bwm">QueryHawk</span>
            </button>
            {/* ⚠️ THE BETA STRIP RETIRES AT ≥768px (ink shell v1, Phase 1) and this chip says what it said.
                Its other job — "tell us when you find one" — is the sidebar's feedback card now. */}
            {BETA_MODE && <span className="ws-beta" data-shell="beta">{BETA_PILL.toUpperCase()}</span>}
            {/* the collapse toggle — `[` and ⌘\ ride `aria-keyshortcuts` and the shortcuts registry */}
            <button
              type="button"
              className="sb-toggle ws-tbcol"
              onClick={sidebar.toggle}
              aria-expanded={!sidebar.collapsed}
              aria-controls="ws-sidebar"
              aria-keyshortcuts="Meta+Backslash Control+Backslash BracketLeft"
              aria-label={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"}
              {...railTipFor(sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar", undefined, toggleKbd, 250, true)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15" />
              </svg>
            </button>
          </div>

          {/* ══ THE MANUSCRIPT SELECTOR, moved here from the bar (ink shell v1). It switches exactly as it
              did: `pickMs` writes the shared key and re-opens the route; the menu, the M key, the shelved
              group and "Now showing…" are the switcher's own. Its menu portals past the panel's clip. */}
          <BarSwitcher
            placement="side"
            collapsed={sidebar.collapsed}
            manuscripts={manuscripts}
            queries={queries}
            activeId={activeMs?.id ?? null}
            onPick={pickMs}
            onAdd={() => onNavigate?.("manuscripts", "Add a manuscript")}
            /* the active book's own page — the existing route and its `?m=` view param */
            onOpenActive={() => { if (activeMs) onNavigatePath(manuscriptViewHref(activeMs.id)); }}
          />

          {/* ⚠️ "LOG A QUERY" HAS LEFT THE SIDEBAR FOR THE BAR (ink shell v1, Phase 2) — see the bar below.
              One home: a copy here would be two capture buttons for one job (INK8). */}

          {/* v3: NO DIVIDER UNDER THE SWITCHER — the ref draws none, and the sidebar's own 12px gap is
              the only separation between the head and the nav. */}

          {/* ⚠️ FLAT GROUPS, EVERY DESTINATION VISIBLE (final ref). The accordion is retired:
              a parent row that both navigated AND disclosed was one control doing two jobs, and
              it put half the app behind a state you had to know to open. The group label is pure
              typography — not a button, no state, nothing to click. */}
          {/* ⚠️ ONE ACCESSIBLE NAME, BOTH STATES (sidebar-collapse pack, Phase 4). Collapsed, the
              labels are hidden by opacity/max-width and stay in the tree — never display:none —
              so a screen reader walks the same nav either way; the name must not change with the
              width. */}
          <nav className="ws-nav" aria-label="Main">
            {sections.map((sec) => (
              <React.Fragment key={sec.id}>
                {/* ⚠️ EVERY GROUP GETS ITS HEADING NOW, DASHBOARD'S INCLUDED (sidebar metrics pass) —
                    reversing app-shell-v2's "the first group gets no heading", knowingly. That rule
                    was right while Dashboard sat at the top of the sidebar: a heading over a group of
                    one labelled nothing. With the capture button in the top slot the rhythm is
                    capture, then ruled groups all the way down, and the first rule is what separates
                    the button from the nav — so WORKSPACE is no longer a heading doing nothing.
                    The rule is the label's own `::after`, so the markup stays one text node. */}
                <div className="ws-glabel">{sec.label}</div>
                {(sec.children ?? []).map((ch) => {
                  const on = hit?.section === sec.id && hit?.child === ch.id;
                  /* ⚠️ A ROW WITH A LIVE COUNT ("needs you") GOES BOLD AND FULL-STRENGTH, and its count is a
                     terracotta pill (ink shell v1). Today that is the To-do list; the rule is the count,
                     not the row's name, so a second counted row would read the same way. */
                  const att = typeof ch.count === "number" && ch.count > 0;
                  return (
                    <button
                      type="button"
                      key={ch.id}
                      className={`ws-ni${on ? " on" : ""}${att ? " att" : ""}`}
                      aria-current={on ? "page" : undefined}
                      /* v3 (L9): AN EXPLICIT NAME, identical to the label, so the link is named the
                         same way in both states rather than by a label span that collapses to 0px.
                         The tooltip is the portalled rail tip below, not a native `title` — two
                         tooltips on one hover would be one too many. */
                      aria-label={ch.label}
                      onClick={() => go(ch.path)}
                      {...railTipFor(ch.label, undefined, undefined, 120, sidebar.collapsed)}
                    >
                      <span className="ws-ic">{icons[ch.icon ?? ch.id] ?? icons[sec.id]}</span>
                      {/* ⚠️ A SPAN, SO THE LABEL CAN COLLAPSE (sidebar-collapse pack, Phase 2). A
                          bare text node cannot carry max-width/opacity. The 10px that separated
                          icon from label moved from the row's `gap` onto this span's margin —
                          pixel-identical expanded, and collapsing to zero WITH the label, where a
                          flex gap beside a zero-width child would hold itself open and park the
                          icon 5px off the rail's centre. */}
                      <span className="ws-lbl">{ch.label}</span>
                      {att && <span className="ws-ct" data-shell="count" aria-label={`${ch.count} to do`}>{inkCount(ch.count!)}</span>}
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
          {/* ⚠️ THE COLLAPSE ROW IS GONE with the state it set. The nav is still the grower —
              `.ws-nav{flex:1;min-height:0}` and nothing between it and the foot — because a
              spacer BESIDE a flex:1 nav is two claimants on the same slack and the browser
              splits it, leaving the last groups below a fold with empty panel beneath. */}

          {/* ── foot: hairline → the user row and the gear ──
              ⚠️ THE GEAR RETURNS, REVERSING AUDIT PACK P5 (Nick's call, sidebar metrics pass). P5
              lifted Settings out of the foot into an ACCOUNT section of the nav, on the reasoning
              that a lone row below the divider was "a destination living in the furniture" and that
              the divider should mean "above, places to go; below, who you are". That held while
              the nav was the only way to reach Settings. With the capture button in the top slot,
              a one-row ACCOUNT section at the bottom of the nav was a heading over a group of one,
              and Settings is the account's own furniture: a 30px gear at the user row's right, the
              ref's foot. The divider now reads "below, you and your settings".

              ⚠️ THE GEAR IS A SECOND DOOR, ACCEPTED: the user row still opens the account menu,
              whose first row is Settings. Collapsed, the gear is removed — the avatar's menu keeps
              Settings reachable at 68px, as it does the upgrade.

              ⚠️ THE AVATAR IS BACK. It said "NO avatar (the rail carries the face)" — and the rail
              no longer exists, so nothing carried it. */}
          {/* ══ THE FOUNDING-MEMBER FEEDBACK CARD (ink shell v1), pinned above the foot. It opens the same
              `FeedbackDock` the bar's "Give feedback" did; the control moved, the panel did not. Three
              forms, one handler: the card; the outlined terracotta button below 920px of window height (CSS); and
              the icon with its dot when the sidebar is collapsed (CSS). All three are always rendered so
              the switch between them is a style, never a remount. */}
          {/* ══ SETTINGS MODE'S RAIL — in the sidebar's own column (ink shell v1, follow-up 2 §5) ══
              ⚠️ IT MOVED INSIDE `.ws-pin`, BETWEEN THE NAV AND THE FEEDBACK CARD. It used to be a sibling
              laid over the WHOLE panel (`inset: 0`), which hid the logo row and the foot with the nav;
              the reference keeps both, so in settings mode the column is: the logo row, the SETTINGS
              eyebrow and its sections, the plan tile, the foot row. The nav, the selector and the
              feedback card step out (`.set-mode` in inkShell.css); below 768px the rail is not drawn. */}
          <SettingsRail
            live={settingsMode}
            active={settingsSection}
            onSelect={(id) => onNavigatePath(ACCOUNT_ROUTES.find((r) => r.id === id)!.path)}
            onExit={leaveSettings}
            plan={currentUser?.plan === UserPlan.PRO ? "pro" : "free"}
          />
          {onOpenFeedback && (
            <div className="ws-fbk" data-shell="feedback">
              <div className="ws-fbc">
                <span className="ws-fbm">FOUNDING MEMBER</span>
                <b className="ws-fbh">Shape QueryHawk</b>
                <span className="ws-fbl">A snag, or a wish? Tell us.</span>
                <button type="button" className="ws-fbtn" data-probe="feedback" onClick={onOpenFeedback} aria-expanded={feedbackOpen}>
                  {FEEDBACK_ICON}<span>Give feedback</span>
                </button>
              </div>
              <button type="button" className="ws-fbb" onClick={onOpenFeedback} aria-expanded={feedbackOpen}>
                {FEEDBACK_ICON}<span className="ws-fbb-l">Give feedback</span><em>BETA</em>
              </button>
              <button
                type="button" className="ws-fbi" onClick={onOpenFeedback} aria-expanded={feedbackOpen}
                aria-label={FEEDBACK_FAB}
                {...railTipFor(FEEDBACK_FAB, undefined, undefined, 120, sidebar.collapsed)}
              >
                {FEEDBACK_ICON}<i aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="ws-pfoot">
            {/* v3: the hairline is the user row's own `border-top` now — one element drawing its own
                edge, as the ref's `.me` does — so the separate divider element is retired. */}
            {/* ⚠️ POLISH §6 — ONE INTERACTIVE ROW, not two text lines. The name gets the full row
                width on line 1 so a realistic name never truncates at 186px; the plan and the
                Upgrade pill share line 2.

                ⚠️ IT OPENS THE ACCOUNT MENU. The TODO that stood here said this row was "the
                opener for an account menu when one exists" — and the menu had existed since
                `AccountMenu` was built, mounted a few lines below at `{accountMenu}`, carrying
                Settings, Task settings, Help centre and Sign out. Nothing opened it: this row
                navigated straight to /account, and `onOpenAccount` arrived as a prop and was never
                called. The one live opener was `.sv2-tbuser` inside `.ws-mobilebar`, which is
                `display:none` at ≥768px — so a DESKTOP user had no way to sign out at all.

                ⚠️ SETTINGS IS NOT LOST BY THIS. It is the FIRST row of the menu, so the journey
                gains a step rather than a dead end; nothing else in the app relied on this row
                being a direct link (checked — the other `ws-uacct` references are its stylesheet
                rules and three tests about position, tooltip gating and initials). */}
            {/* ⚠️ A HORIZONTAL ROW HOLDING TWO SIBLINGS — the user row and the gear — and never the
                gear INSIDE the user row. Nested, the gear's click would bubble into the row's
                account-menu handler and need a `stopPropagation` to guard it; side by side there is
                no hazard to guard. The Upgrade pill's own precedent. The row carries the hairline. */}
            <div className="ws-pfrow">
            <div
              ref={acctRowRef}
              className="ws-uacct"
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              onClick={(e) => onOpenAccount?.(e.currentTarget)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenAccount?.(e.currentTarget); } }}
              /* ⚠️ THE TOOLTIP CARRIES THE FULL NAME, NEVER THE FORMATTED ONE — it is the only
                 place the whole name is guaranteed to appear, and it now shows in BOTH states:
                 expanded (where the name may be shortened to "Bethany C." or ellipsised) and
                 collapsed (where only the avatar shows). Hence `true` rather than
                 `sidebar.collapsed`, which is the one rail tip whose gate is not the rail. */
              {...railTipFor(name, plan.label, undefined, 120, true)}
            >
              <span className="ws-av" aria-hidden="true">{getInitials(name)}</span>
              {/* ⚠️ NAME OVER PLAN AS BLOCKS, AND THE PILL IS NO LONGER IN THIS ROW AT ALL
                  (audit P2, then Option D). The pill first moved out of the plan LINE — it read as
                  a word in a sentence rather than a control — and has now moved out of the ROW,
                  because sharing a line with it is what starved the name: ~88px of pill left about
                  81px for a name, nine characters, and no amount of ellipsis styling buys width. */}
              <span className="ws-utext">
                <span className="ws-n">{formatSidebarName(name)}</span>
                <span className="ws-acctline">
                  <span className="ws-pl">{plan.label}</span>
                  {/* ⚠️ INK SHELL v1 FOLDS "UPGRADE" BACK INTO THE PLAN LINE. The full-width row cost 44px
                      the ink sidebar does not have: with the reference's feedback card above the foot,
                      the nav needs ~896px of a 900px window and the row pushed the whole TASKS group
                      under the card. The plan is the SECOND line, so the name keeps the first line's
                      full width (the starvation that split the row out was the pill sharing the name's
                      line). It stops propagation because it sits inside the row that opens the account
                      menu; that menu and Settings remain the other ways to the upgrade. */}
                  {plan.upgrade && !sidebar.collapsed && (
                    <>
                      <span className="ws-pldot" aria-hidden="true"> · </span>
                      <button
                        type="button"
                        className="ws-uplink"
                        onClick={(e) => { e.stopPropagation(); onUpgrade?.(); }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        Upgrade
                      </button>
                    </>
                  )}
                </span>
              </span>
            </div>
            {!sidebar.collapsed && (
              <button
                type="button"
                className="ws-gear"
                aria-label="Settings"
                onClick={() => go("/account")}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
                </svg>
              </button>
            )}
            </div>
            {/* ⚠️ THE FULL-WIDTH UPGRADE ROW (`.ws-upgrow`) IS RETIRED by ink shell v1 — see the plan line
                above, where "Upgrade" now sits. */}
          </div>
        </div>

      </div>
      {accountMenu}
      {/* the one rail tooltip — portalled to the fixed layer, so the panel's overflow cannot
          clip it at the 72px edge */}
      {railTip && (
        <DeskTooltip anchor={railTip.anchor} mode="plain" side="right" variant="rail" onClose={hideTip}>
          {railTip.title}
          {railTip.kbd && <span className="dk-railkbd">{railTip.kbd}</span>}
          {railTip.sub && <div className="dk-railsub">{railTip.sub}</div>}
        </DeskTooltip>
      )}

      {/* ══ MAIN — one ground, and a single white window resting on it (app-shell-v2). ══
          ⚠️ THE GREIGE BAR IS GONE. The breadcrumb row now sits DIRECTLY ON THE GROUND above the
          window, so it is chrome rather than page content — it does not scroll, and no page may
          render its own (see CLAUDE.md).
          ⚠️ AND THE SCROLLER MOVED. It was `.ws-cscroll`, the whole card; it is `.ws-wbody` now,
          inside the window. That is the window's defining behaviour: the frame — its radius,
          border and inset — stays put while only the contents move. Keep `#app-stage-scroll` ON
          the scroller: stageScroll's overlay locks, per-route scroll memory, the To-do board's
          saved position and MobileSheet all address it by id. */}
      <div className="ws-main">
          {/* ⚠️ `navrow` IS THE NAV'S OWN ROW, AND THE SEARCH LIVES IN IT (v28, Phase 2). v27 put
              the field in a row of its own inside the page, which cost ~90px of height before the
              greeting and left this row with a wide hole in the middle where the search belongs.
              The v27 gate asked whether exactly one search control existed; it never asked WHERE,
              so a correct answer to the wrong question let the fault through. */}
          {/* ⚠️ THE ROW LOADS WITH THE PAGE, ON THE PAGE'S CLOCK (v34). While the dashboard's cover is up,
              `workspaceShell.css` keys this row to the cover's own element through `:has()`: its controls
              keep their boxes (that is how the row's geometry stays the live one), their ink is hidden, and
              a shimmer layer sits over each; when the cover dissolves, the layers dissolve with it. Hidden
              ink is `visibility: hidden`, which also takes the controls out of the accessibility tree and
              the tab order — so there is no `aria-hidden` here, and none set from a flag, because a flag is
              what ran on the wrong clock. */}
          {/* ══ THE TOP BAR — app shell v3 "Quiet" (D4; ref design-refs/shell/app-shell-v3.html `.top`) ══
              collapse · breadcrumb · (space) · search · Give feedback · help. 64px on the page ground,
              one hairline beneath it, 0 24px padding, 10px between controls.

              ⚠️ ONE BAR ON EVERY ROUTE, THE DASHBOARD INCLUDED. The dashboard used to lay this bar
              OVER its scroller, transparent at rest, with a 700px search field and no breadcrumb (the
              v34 mockup). v3 is the app shell, and the ref's bar is the one bar: in the flow, opaque,
              the icon search, the crumb. The dashboard's page starts the frame's 28px below it
              (`--ws-frame-top`), as the bar no longer lies over it.

              ⚠️ NO SAVE WHISPER (D5). "All changes saved" is gone from the shell and every route. It
              could never report a failure (Step 0: `SaveState` is idle | saving | dirty), so removing
              it hides nothing; the paths that DO report failures keep their own toasts and inline
              errors, and `useSaveState`/`saveSignal` stay for whatever replaces it. */}
          <header ref={barRef} className="ws-pagebar" data-probe="navrow" data-scrolled={barScrolled ? "true" : "false"}>
              {/* ══ THE FOLDER TAB (ink shell v1) — the current page as paper growing out of the sheet, its
                  group's other pages as recessed tabs. It names the page; the breadcrumb, the page-name
                  fade and the bar's hairline are retired with it. */}
              {pageName && (
                <FolderTab
                  /* off-nav routes name their group from barPageName — Settings reads ACCOUNT · Settings */
                  group={tabGroup ?? pageName.section}
                  name={pageName.name}
                  siblings={tabSiblings}
                  onGo={go}
                  limitRef={searchFieldRef}
                />
              )}
              <div className="ws-grow" data-shell="spacer" aria-hidden="true" />
              {/* the right: the workspace group (search · Log a query), then Help, set apart. Spacing is
                  per-child `margin-left`, so a control that leaves in settings mode takes its space. */}
              <div className="ws-bright">
                {/* ⚠️ A FIXED 168px FIELD THAT NEVER MOVES (fit rule 5). It opens the existing palette, the
                    same as ⌘K (bound in `usePalette`); the ref is still the palette's anchor. */}
                <span className="ws-appctl">
                  <button
                    ref={setSearchRefs}
                    type="button"
                    className="ws-search ws-sfield"
                    data-probe="search"
                    onClick={onOpenSearch}
                    aria-label="Search (⌘K)"
                    aria-keyshortcuts="Meta+K Control+K"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
                    </svg>
                    <span className="ws-sfield-l">Search</span>
                    <kbd className="ws-sfield-k">{searchShortcut()}</kbd>
                  </button>
                </span>

                {/* ⚠️ "BACK TO APP" TAKES THE WORKSPACE GROUP'S SLOT IN SETTINGS MODE, AND IS MOUNTED ALWAYS so
                    it can fade in and out. It is inert and out of the tab order until the mode is on. */}
                <button
                  type="button"
                  className="ws-setctl ws-backapp"
                  onClick={leaveSettings}
                  tabIndex={settingsMode ? 0 : -1}
                  aria-hidden={settingsMode ? undefined : true}
                >
                  <svg className="ws-backapp-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
                  Back to app
                  <span className="ws-esc" aria-hidden="true">esc</span>
                </button>

                {/* ══ "LOG A QUERY" — moved here from the sidebar (ink shell v1). Its two segments keep their
                    contracts (`invokeCapture` and the add-manuscript route); only its place and skin moved. */}
                <span className="ws-appctl ws-appctl--cap">
                  <SidebarCapture placement="bar" collapsed={false} onNavigate={onNavigate} />
                </span>

                {/**
                  * §4b (Query Centre v96) — THE `?` IS THE WAY BACK TO A PAGE GUIDE, and only on a page
                  * that has one. Everywhere else it is one click to the Help centre. Ink shell v1 sets it
                  * apart from the workspace group: an 18px gap and a hairline rule (CSS).
                  */}
                <span className="ws-helpwrap" ref={helpWrapRef}>
                  {/* ⚠️ "?" ALWAYS OPENS THE HELP MENU NOW (follow-up 2, 1c) — Help centre, the page guide
                      where the page has one, and Keyboard shortcuts (the existing ShortcutsSheet, through
                      its own event). It was a direct link to /help on every page without a guide. */}
                  <button
                    ref={helpBtnRef}
                    type="button" className="ws-ibtn ws-help" data-shell="help"
                    onClick={(e) => {
                      const viaKeys = e.detail === 0;
                      setHelpOpen((o) => !o);
                      if (viaKeys) requestAnimationFrame(() => helpMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" && !helpOpen) {
                        e.preventDefault();
                        setHelpOpen(true);
                        requestAnimationFrame(() => helpMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                      }
                    }}
                    aria-label="Help" title="Help and shortcuts"
                    aria-haspopup="menu"
                    aria-expanded={helpOpen}
                  >
                    <span aria-hidden="true">?</span>
                  </button>
                  {helpOpen && (
                    <div
                      ref={helpMenuRef}
                      className="ws-helpmenu sa-pop" role="menu" aria-label="Help" data-shell="help-menu"
                      onKeyDown={(e) => { moveInMenu(e, helpMenuRef.current); }}
                    >
                      <p className="sa-peb" aria-hidden="true">Help</p>
                      <button type="button" role="menuitem" className="sa-mi" data-shell="help-centre"
                        onClick={() => { setHelpOpen(false); onOpenHelp(); }}>
                        {HELP_ICONS.book}<span>Help centre</span>
                      </button>
                      {guidePage && (
                        <button type="button" role="menuitem" className="sa-mi" data-shell="guide-again"
                          onClick={() => { setHelpOpen(false); requestPageGuide(); }}>
                          {HELP_ICONS.map}<span>Show the page guide</span>
                        </button>
                      )}
                      <button type="button" role="menuitem" className="sa-mi" data-shell="help-shortcuts"
                        onClick={() => { setHelpOpen(false); window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT)); }}>
                        {HELP_ICONS.kb}<span>Keyboard shortcuts</span><kbd className="sa-kc">?</kbd>
                      </button>
                    </div>
                  )}
                </span>
              </div>
          </header>

          {/**
            * ⚠️ A WRAPPER SO THE CHEVRON CAN STRADDLE THE WINDOW'S TOP BORDER (pinned chrome, §3;
            * ref 175). The window clips — `overflow: hidden` and a 16px radius — so a badge INSIDE
            * it cannot sit half outside, and one that interrupted the border's run would cut the
            * line it is supposed to rest on. The badge is therefore a SIBLING, absolutely positioned
            * over the edge, and this box is what it positions against.
            *
            * ⚠️ IT TAKES THE WINDOW'S PLACE IN THE COLUMN, not an extra layer of height: `flex: 1;
            * min-height: 0` moves up here and the window fills it. A wrapper that sized itself would
            * put a second height chain between the shell and every page.
            */}
          {/* ⚠️ THE ID IS GONE WITH THE FOLD. `WINWRAP_ID` existed so the grid could portal the
              chevron badge onto the window's top border, which is the only chrome that ever had to
              leave its own subtree; `shellSlots.ts` is deleted with it. The wrapper itself stays —
              it takes the window's slot and is what the window sizes against. */}
          <div className="ws-winwrap" ref={winWrapRef}>
          <div className="ws-window">
            {/* ⚠️ `sv2-stagepad` RIDES WITH THE SCROLLER, and it is not decoration: below md it
                adds the floating tab bar's clearance. It followed the stage element here. */}
            <div
              className="ws-wbody sv2-stagepad"
              id={scrollId}
              ref={scrollRef}
              onScroll={onScroll}
            >
              <div className={`ws-work${fit ? " ws-work--fit" : ""}`}>
                {/* ⚠️ THE MASTHEAD'S KICKER, SUPPLIED ONCE. Every page's masthead names its section;
                    the shell is the one component that already knows the route AND wraps all ten, so
                    it computes the label from `shellCrumbForPath` — the same pure function this
                    shell's own breadcrumb reads — and hands it down. A page cannot pass its own,
                    which is the point: a second table keyed by route is how the pill and the crumb
                    would come to disagree. See `mastheadSection.ts`. */}
                <MastheadSectionContext.Provider value={mastheadSection}>
                  {children}
                </MastheadSectionContext.Provider>
              </div>
              {footFade}
            </div>
          </div>
          </div>
      </div>
      {/* the keyboard shortcuts sheet: `?` or the Help centre opens it; it portals to the body */}
      <ShortcutsSheet />

    </div>
  );
};
