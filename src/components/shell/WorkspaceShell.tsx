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
  Book, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { planLine, resolveScopedManuscript, stepManuscript } from "../../lib/shellSidebar";
import {
  ShellSection, openForHit, sectionClick, sectionRowState, shellCrumb, shellHitFor,
} from "../../lib/workspaceShell";
import { AvatarChip, CountChip, HelpButton, MenuCard, MenuCardDivider, MenuCardItem, SearchPill } from "./primitives";
import { useSaveState, saveWhisper } from "../../lib/useSaveState";
import { useSidebarCollapsed } from "./useSidebarCollapsed";
import { formatSidebarName, getInitials } from "../../lib/displayName";
import { DeskTooltip } from "../dashboard/DeskTooltip";
import { Rect as TipRect } from "../../lib/deskTooltip";
import { invokeCapture } from "./railNav";
import { TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import "./primitives.css";
import manuscriptMark from "../../assets/shell/manuscript-icon.png";
import "./workspaceShell.css";

/** The shared active-manuscript key. ⚠️ Packages, Comps and Manuscripts READ this — a selector
 *  that stops writing it breaks them silently, with no error and simply the wrong book. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/* ⚠️ `LOGOTYPE_PX` IS RETIRED WITH THE CRUMB'S ARTWORK. It was 33 because the PNG is only 51.7%
   ink and a ~17px cap therefore needed a 33px element — a measured compensation for a specific
   asset. The v2 brand is TYPE (a Playfair "S" in an ink square), so there is no ink ratio to
   compensate for and nothing to keep the number in step with. */

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
  /** Opens the account menu, and hands it the element to anchor against (it is portalled). */
  onOpenAccount?: (anchor: HTMLElement) => void;
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

/* ⚠️ THE LOCAL `initials` IS GONE — it now comes from lib/displayName, beside the formatter that
   shortens the name it stands for. Two copies of the splitting rules agree by coincidence; a
   mononym or a trailing space pulls them apart and nothing fails, the chip just stops matching
   the name beside it. One input, one module, two outputs. */

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  sections, icons, onNavigatePath, onOpenSearch, searchAnchorRef, onOpenHelp, onOpenAccount, onUpgrade,
  onNavigate, scrollId, scrollRef, onScroll, footFade, fit = false, accountMenu, children,
}) => {
  const { pathname, search } = useLocation();
  const { manuscripts, currentUser, updateUserProfile } = useScriptAllyDb();

  const hit = useMemo(() => shellHitFor(sections, pathname, search), [sections, pathname, search]);

  /* ⚠️ COLLAPSE RETURNS — AS A NARROWING, NOT A REMOVAL (sidebar-collapse pack; supersedes the
     app-shell-v2 note that retired it). What v2 retired was the RAIL-AND-PANEL model, where the
     rail was a second component and collapse swapped between them; keeping `collapsed` without
     that rail left a state with no UI, so the state went too. This is a different shape: ONE
     sidebar whose width narrows to an icon rail — every row keeps existing, labels collapse in
     place, the toggle lives in the pagebar at the seam. There is no second component to drift. */
  const sidebar = useSidebarCollapsed();

  /* ── rail tooltips (sidebar-collapse pack, Phase 3) ──
     ⚠️ PORTALLED THROUGH DeskTooltip, NEVER A ::after ON THE ROW — the nav list is an internal
     scroller inside a panel with `overflow: hidden`, so a child-element tooltip is clipped at the
     rail's 72px edge. The pack names this the single most likely thing to get wrong. One tip on
     screen at a time; the anchor rect is measured at open, exactly as the desk's own callers do. */
  const [railTip, setRailTip] = useState<{ anchor: TipRect; title: string; sub?: string; kbd?: string } | null>(null);
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
  const [msOpen, setMsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const newRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpenId(openForHit(hit)); }, [hit?.section, hit?.child]); // eslint-disable-line react-hooks/exhaustive-deps


  /* ⚠️ THE `[` SHORTCUT IS RETIRED with the sidebar state it toggled. A key bound to nothing is
     worse than no key: it eats the character in any field that is not caught by the guard. */
  useEffect(() => {
    if (!msOpen) return;
    const onDown = () => setMsOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMsOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [msOpen]);

  /**
   * ⚠️ THE MENU OWNS ITS KEYBOARD (polish P1). Outside-click and Escape were already here; arrow
   * cycling, Tab-to-close and focus handling were not, so the menu could be opened by keyboard and
   * then not operated by one.
   *
   * ⚠️ FOCUS RETURNS TO THE BUTTON ON CLOSE — but only when focus is still INSIDE the menu. A
   * selection that navigates away has already put focus where it belongs, and yanking it back to a
   * button on the previous page is worse than leaving it.
   */
  useEffect(() => {
    if (!newOpen) return;
    const items = (): HTMLElement[] =>
      Array.from(newRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

    items()[0]?.focus();

    const onDown = (e: PointerEvent) => {
      if (newRef.current?.contains(e.target as Node)) return;
      setNewOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setNewOpen(false); return; }
      // Tab closes rather than trapping — this is a menu, not a dialogue.
      if (e.key === "Tab") { setNewOpen(false); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const list = items();
      if (!list.length) return;
      e.preventDefault(); // else the page scrolls under an open menu
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "ArrowDown"
        ? (at + 1) % list.length
        : (at <= 0 ? list.length - 1 : at - 1);
      list[next]?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      if (newRef.current?.contains(document.activeElement)) {
        newRef.current.querySelector<HTMLElement>(".ws-nbtn")?.focus();
      }
    };
  }, [newOpen]);

  useEffect(() => { setNewOpen(false); }, [pathname]);

  const go = useCallback((path: string) => {
    setMsOpen(false);
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
  const manyMs = manuscripts.length > 1;
  const chooseMs = useCallback((id: string) => {
    try { localStorage.setItem(ACTIVE_MS_KEY, id); } catch { /* not worth an error */ }
  }, []);
  const pickMs = useCallback((id: string) => {
    chooseMs(id);
    setMsOpen(false);
    onNavigatePath(`${pathname}${search}`);
  }, [chooseMs, onNavigatePath, pathname, search]);
  /* ⚠️ STEPPING DOES NOT RE-ROUTE — the picker navigates for its own reasons; an arrow is a
     change of scope, not of page. */
  const stepMs = useCallback((dir: 1 | -1) => {
    const next = stepManuscript(manuscripts, activeMs?.id ?? null, dir);
    if (!next || next === activeMs?.id) return;
    chooseMs(next);
  }, [manuscripts, activeMs?.id, chooseMs]);

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

  return (
    /* ⚠️ THE COLLAPSED STATE IS ANNOUNCED ON THE APP, NOT ONLY ON THE PANEL. `sb-collapsed` lives on
       `.ws-panel`, which is a SIBLING of the workspace — so no page can see it from a descendant
       selector, and a page that wants to redistribute the width the panel gave back has nothing to
       key on. Same boolean, second mount, on the common ancestor. */
    <div className={`ws-app${sidebar.collapsed ? " sb-shut" : ""}`}>

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

              The MARK is `/scriptally-logo-new.png`, the plane-and-S, sitting bare on the ground:
              no plate, no border, no fill. It is transparent artwork, so a plate would be a box
              drawn around a shape that does not need one.

              The WORDMARK is set in Playfair at 22px. The previous pass used
              `/scriptally-title-v2.png` on the grounds that re-setting it is "a lookalike rather
              than the mark" — a fair argument that came with a real cost: that asset is only
              ~51.7% ink, so its element height was never its cap height and 33px bought a ~17px
              cap. Every future size change had to carry that compensation with it. Type has no
              dead space to compensate for, and 22px is 22px.

              ⚠️ SO THE ~51.7%-INK TRAP LEAVES THIS FILE WITH THE ASSET. It still applies wherever
              the title PNG is used (SmartImportReview, SidebarNav, ScriptAllyLogo) — this mount
              simply no longer has an ink ratio to keep in step. */}
          <button type="button" className="ws-brand" onClick={() => go("/dashboard")} aria-label="ScriptAlly — go to dashboard">
            <img className="ws-bmark" src="/scriptally-logo-new.png" alt="" aria-hidden="true" />
            <span className="ws-bwm">ScriptAlly</span>
          </button>

          <div className="ws-phead">
            {activeMs ? (
              <>
                {/**
                  * ⚠️ THE CARD IS A CONTAINER, NOT A BUTTON (fixes-2 A1). The arrows belong INSIDE
                  * the card — an arrow that steps between manuscripts must be attached to the
                  * manuscript it steps from, and below the card it belongs to nothing. But a
                  * button inside a button is invalid markup and the inner one never receives its
                  * own click, so the card is a positioned DIV holding two siblings: the opener,
                  * which fills it, and the arrow pair laid over its right edge.
                  */}
                <div className={`ws-mspill${manyMs ? "" : " static"}`}>
                  <button
                    type="button"
                    className="ws-msopen"
                    aria-haspopup={manyMs ? "menu" : undefined}
                    aria-expanded={manyMs ? msOpen : undefined}
                    onClick={() => {
                      /* ⚠️ COLLAPSED, THE TILE EXPANDS THE SIDEBAR RATHER THAN OPENING THE MENU
                         (sidebar-collapse pack, a decision the pack's ref does not draw). The
                         flyout is absolutely positioned against the panel and spans its width —
                         at 72px it would render as a 72px sliver of menu. Expanding first costs
                         one click and keeps the menu one component with one geometry. */
                      if (sidebar.collapsed) { sidebar.setCollapsed(false); return; }
                      if (manyMs) setMsOpen((o) => !o);
                    }}
                    {...railTipFor(activeMs.title, msMeta(activeMs) || undefined, undefined, 120, sidebar.collapsed)}
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
                  </button>
                  {/* ⚠️ SINGLE chevrons. The double `«`/`»` pair is the sidebar-COLLAPSE idiom and
                      read as a collapse control rather than a stepper. */}
                  <div className="ws-msnav">
                    <button
                      type="button" className="ws-msarrow" disabled={!manyMs}
                      aria-label="Previous manuscript"
                      onClick={() => stepMs(-1)}
                    ><ChevronLeft aria-hidden="true" /></button>
                    <button
                      type="button" className="ws-msarrow" disabled={!manyMs}
                      aria-label="Next manuscript"
                      onClick={() => stepMs(1)}
                    ><ChevronRight aria-hidden="true" /></button>
                  </div>
                </div>
                {/* ⚠️ DOTS ONLY WHEN THERE IS SOMETHING TO STEP THROUGH — one dot beneath one
                    manuscript is a control describing nothing. */}
                {manyMs && (
                  <div className="ws-msdots" aria-hidden="true">
                    {manuscripts.map((m) => (
                      <span key={m.id} className={`ws-msdot${m.id === activeMs?.id ? " on" : ""}`} />
                    ))}
                  </div>
                )}
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
          {/* ⚠️ ONE ACCESSIBLE NAME, BOTH STATES (sidebar-collapse pack, Phase 4). Collapsed, the
              labels are hidden by opacity/max-width and stay in the tree — never display:none —
              so a screen reader walks the same nav either way; the name must not change with the
              width. */}
          <nav className="ws-nav" aria-label="Main">
            {sections.map((sec, gi) => (
              <React.Fragment key={sec.id}>
                {/* ⚠️ THE FIRST GROUP GETS NO HEADING (app-shell-v2). "WORKSPACE" sat above a
                    group of one — Dashboard — and a section header over a single item labels
                    nothing; it just adds a rung to the ladder. Dashboard stands alone. */}
                {gi > 0 && <div className="ws-glabel">{sec.label}</div>}
                {(sec.children ?? []).map((ch) => {
                  const on = hit?.section === sec.id && hit?.child === ch.id;
                  return (
                    <button
                      type="button"
                      key={ch.id}
                      className={`ws-ni${on ? " on" : ""}`}
                      aria-current={on ? "page" : undefined}
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
          {/* ⚠️ THE COLLAPSE ROW IS GONE with the state it set. The nav is still the grower —
              `.ws-nav{flex:1;min-height:0}` and nothing between it and the foot — because a
              spacer BESIDE a flex:1 nav is two claimants on the same slack and the browser
              splits it, leaving the last groups below a fold with empty panel beneath. */}

          {/* ── foot: hairline → the user row, and NOTHING ELSE (audit pack P5) ──
              ⚠️ SETTINGS CAME UP OUT OF HERE and is an ordinary row in the ACCOUNT section now. As
              a lone row pinned below the divider it was a destination living in the furniture —
              the one page in the app you could not find by reading down the nav.

              ⚠️ AND THAT IS WHAT MAKES THE DIVIDER MEAN SOMETHING: above it, places to go; below
              it, who you are. A second navigating row down here would blur that again.

              ⚠️ THE AVATAR IS BACK. It said "NO avatar (the rail carries the face)" — and the rail
              no longer exists, so nothing carried it. */}
          <div className="ws-pfoot">
            <div className="ws-pdiv" />
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
            <div
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
                <span className="ws-acctline"><span className="ws-pl">{plan.label}</span></span>
              </span>
            </div>
            {/* ⚠️ ROW 2 — A SIBLING OF THE ACCOUNT ROW, NOT A CHILD, and that is the whole fix: a
                full-width pill beneath cannot compete with the name for a line's width. It is
                FILLED rather than ghost now because it finally has the width to carry a fill.

                ⚠️ AND IT IS OUTSIDE THE ROW'S CLICK TARGET, so it no longer needs to stop
                propagation — the old `stopPropagation` existed only because a pill nested inside a
                row whose handler opened Settings would send the upsell to the one page that is not
                the upgrade flow. Being a sibling retires the hazard rather than guarding it.

                ⚠️ REMOVED ENTIRELY WHEN COLLAPSED, never squeezed into a 52px stub — Step 0
                confirmed the upgrade path is reachable from the account menu and from Settings
                ("View plans & upgrade"), so nothing becomes unreachable at 72px. */}
            {plan.upgrade && !sidebar.collapsed && (
              <button
                type="button"
                className="ws-upgrow"
                onClick={() => onUpgrade?.()}
              >
                Upgrade
              </button>
            )}
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
          <header className="ws-pagebar">
              {/* ⚠️ THE COLLAPSE TOGGLE SITS AT THE SIDEBAR/CONTENT SEAM — first in the bar, before
                  the crumb — and it does not move between states (sidebar-collapse pack, baked:
                  not in the sidebar footer, not on the panel edge, not hover-revealed; a footer
                  control loses to the nav list's internal scroll). The glyph is the ref's panel
                  outline; its left-column fill fades when collapsed, keyed off aria-expanded so
                  the icon cannot disagree with the state it reports.
                  ⚠️ `[` rides `aria-keyshortcuts` alongside the chord — recon found it unbound;
                  ⌘\ was freed by the tuck sweep one commit back. */}
              <button
                type="button"
                className="sb-toggle"
                onClick={sidebar.toggle}
                aria-expanded={!sidebar.collapsed}
                aria-controls="ws-sidebar"
                aria-keyshortcuts="Meta+Backslash Control+Backslash BracketLeft"
                aria-label={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"}
                {...railTipFor(sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar", undefined, toggleKbd, 250, true)}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect x="1.5" y="2.5" width="15" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="6.6" y1="2.5" x2="6.6" y2="15.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect className="sb-fillcol" x="2.6" y="3.6" width="3" height="10.8" rx="1" fill="#7c3a2a" opacity="0.28" />
                </svg>
              </button>
              {/* ⚠️ EVERY CRUMB SEGMENT IS INTERACTIVE (§5), and the separator is `/` throughout —
                  the live mix of `/` and `·` made the brand look like a different KIND of step
                  from the section. Only the current page is ink; ancestors are muted links. */}
              <nav className="ws-crumb" aria-label="Breadcrumb">
                {/* ⚠️ THE CRUMB'S ROOT IS BACK — AS WORDS, NEVER AS THE MARK (audit pack P4).
                    Removing the logotype from here was right and stays right; removing the ROOT
                    with it was not, and it left the bar opening on a bare `/ Dashboard`, a
                    separator with nothing on its left. It reads `ScriptAlly / Dashboard` again.

                    ⚠️ THE ONE-BRAND RULE IS ABOUT THE MARK, and the mark still appears exactly
                    once, in the sidebar. A breadcrumb root is the name of the place you are in;
                    that it happens to be the product's name does not make it a second logo.

                    It navigates, because every other segment here does — the law this file already
                    holds — and because home is where a breadcrumb root goes. */}
                {crumb && (
                  <>
                    <button
                      type="button"
                      className="ws-seg ws-croot"
                      onClick={() => go("/dashboard")}
                    >
                      ScriptAlly
                    </button>
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
              {/* ⚠️ THE SAVE STATE BELONGS TO THE LEFT GROUP, after the page name and its hairline
                  — it is a statement ABOUT this page, not a tool. Right-aligned it sat among the
                  controls and read as one. Specced there and missed.
                  ⚠️ IT IS A PAGEBAR CHILD, NOT A CRUMB CHILD. Inside the crumb it inherits
                  `align-items: baseline`, and an 8.5px mono cap baselined against 17px Playfair
                  sits 3.7px low — measured. The pagebar centres it instead.
                  ⚠️ WIRED TO REAL WRITE STATE, never a constant — a bar that always says "saved"
                  is worse than one that says nothing. See lib/saveSignal. */}
              <span className="ws-vdiv" aria-hidden="true" />
              <span className="ws-sync">{saveWhisper(save)}</span>

              <div className="ws-bright">
                <SearchPill onOpen={onOpenSearch} anchorRef={searchAnchorRef} />
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
                          role="menuitem"
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
                        role="menuitem"
                        label="Log a query"
                        onSelect={() => { setNewOpen(false); if (onNavigate) invokeCapture("query", onNavigate); }}
                      />
                      <MenuCardItem
                        role="menuitem"
                        label="Record a response"
                        onSelect={() => { setNewOpen(false); if (onNavigate) invokeCapture("record", onNavigate); }}
                      />
                      <MenuCardItem
                        role="menuitem"
                        label="Add agent"
                        onSelect={() => { setNewOpen(false); if (onNavigate) invokeCapture("agent", onNavigate); }}
                      />
                      <MenuCardDivider />
                      {/* ⚠️ THE REF ASKS FOR SIX ITEMS AND FOUR EXIST. "Add a manuscript" is real —
                          App.tsx intercepts that exact sub-page name — so it is here. "New note"
                          is NOT: the composer is opened by an event the To-do PAGE listens for, so
                          from anywhere else it would reach no listener and the row would do
                          nothing. A dead row teaches the wrong shape of the app (the shell renders
                          what exists), so it waits for a real contract. */}
                      <MenuCardItem
                        role="menuitem"
                        label="Add a manuscript"
                        onSelect={() => { setNewOpen(false); onNavigate?.("manuscripts", "Add a manuscript"); }}
                      />
                    </MenuCard>
                  )}
                </div>
              </div>
          </header>

          <div className="ws-window">
            {/* ⚠️ `sv2-stagepad` RIDES WITH THE SCROLLER, and it is not decoration: below md it
                adds the floating tab bar's clearance. It followed the stage element here. */}
            <div
              className="ws-wbody sv2-stagepad"
              id={scrollId}
              ref={scrollRef}
              onScroll={onScroll}
            >
              <div className={`ws-work${fit ? " ws-work--fit" : ""}`}>{children}</div>
              {footFade}
            </div>
          </div>
      </div>

    </div>
  );
};
