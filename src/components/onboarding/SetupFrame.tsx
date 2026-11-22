/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SetupFrame — the one frame for everything before the app (onboarding v5, part 1).
 *
 * The ink shell, in two forms:
 *   account  sign-up, sign-in, reset. No sidebar: the bar holds the brand row, the folder tabs and
 *            the exit, and the sheet is inset on all four sides.
 *   setup    the set-up steps. A sidebar where the app's nav will be, holding the steps.
 *
 * ⚠️ THE GEOMETRY IS THE APP SHELL'S, BY REUSE AND NOT BY COPY. From 768px up this renders the
 * shell's own class names in the shell's own nesting (`.ws-app` › `.ws-panel` › `.ws-pin` ›
 * `.ws-logo`, and `.ws-main` › `.ws-pagebar` + `.ws-winwrap` › `.ws-window`) and mounts the bar's
 * own `TabStrip` (shell tabs v2; `FolderTab` on a phone, where onboarding.css styles it alone),
 * so the sidebar's width, the brand row's box, the tab, and the sheet's inset and
 * radius are the declarations in `inkShell.css` — there is no second number to keep in step, and
 * lock F1 measures them against `/dashboard` in the same run. `onboarding.css` adds only what the
 * shell has no word for (the steps, the two-form layout, the phone arrangement).
 *
 * ⚠️ IT REPLACES `OnboardingHeader`, `OnboardingSpine` AND THE FULL-SCREEN OVERLAY, all deleted in
 * the commit that added this. No ScriptAlly artwork is drawn anywhere in the journey.
 *
 * The frame, the sidebar and the tab do not animate between steps; the tab's name changes in place.
 * Only the sheet's contents fade.
 *
 * ⚠️ ON THE DESKTOP THE GROUP LABEL IS NOT DRAWN (shell tabs v2: one tab shape, words only). `group`
 * still reaches the phone's `FolderTab`, which prints it.
 */

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useIsMobile } from "../shell/mobileChrome";
import "../shell/primitives.css";
import "../shell/workspaceShell.css";
import "../shell/inkShell.css";
import "./onboarding.css";
import { FolderTab, TabSibling, TabStrip, type StripTab } from "../shell/FolderTab";
import { APP_MARK, artUrl } from "../../lib/appArt";
import { BETA_MODE, BETA_PILL } from "../../lib/beta";
import { planLine } from "../../lib/shellSidebar";
import { getInitials, formatSidebarName } from "../../lib/displayName";
import { SpineStep } from "../../lib/onboardingSpine";
import { UserPlan } from "../../types";
import { BetaStrip } from "../shell/BetaStrip";

/** The group label over the steps, and the tab's group on every set-up step. */
export const SETUP_GROUP = "Getting set up";
/** The tab group on the account screens. */
export const ACCOUNT_GROUP = "Your account";
/** Shell tabs v2.1 — the account screens' two tabs, in the one order the desktop draws them whichever is current
 *  ("Create account", then "Sign in"); the current one is marked by the tab's surface alone, so switching moves no tab.
 *  The ids are the ones Auth's `onTab` takes. Phones keep `FolderTab`'s current-first order. */
export const ACCOUNT_TABS: readonly { id: string; label: string }[] = [
  { id: "signup", label: "Create account" },
  { id: "signin", label: "Sign in" },
];

export interface SetupFrameProps {
  form: "account" | "setup";
  /** The folder tab: its mono group label and the name raised on the sheet. */
  group: string;
  name: string;
  /** Account form: the other tab, recessed. Pressing it calls `onTab` with its id. */
  otherTab?: { id: string; label: string };
  onTab?: (id: string) => void;
  /** Set-up form: the steps, from `spineFor(flow)`, and the current one's index. */
  steps?: SpineStep[];
  activeIndex?: number;
  /** Set-up form: shown as the app's manuscript card once a title is held. */
  manuscriptTitle?: string | null;
  /** Set-up form: the foot. Name and plan line only — no menu, no gear, no Upgrade. */
  user?: { name?: string | null; plan?: UserPlan } | null;
  exitLabel: string;
  onExit: () => void;
  /** No way out is drawn. The two import loaders set it: a file being read, or rows being written,
   *  is not a moment to leave from (onboarding v5 part 2). */
  hideExit?: boolean;
  /**
   * The hand-off to the app, at the end of the import (part 2). `appMode` gives the frame the
   * dashboard route's page tokens, so the dashboard's loading page behind the importing loader is
   * measured as it will be in the app. `handoff.nav` is the app's nav, for show; when `handoff.on`
   * turns true the steps fade out and it fades in where the app's nav will be.
   */
  appMode?: boolean;
  handoff?: { on: boolean; nav: React.ReactNode } | null;
  children: React.ReactNode;
}

/* ═══ Set-up on phones v1 (30 Oct; ref design-refs/setup-import-phone-v1/, Nick's 1B and 6B) ═══
   Below 768px a set-up frame swaps its folder tabs for a navy progress band, and pins each step's
   foot to the bottom of the screen. Both live here, behind `useIsMobile`, so at 768px and up the
   frame's DOM is byte-identical to before (SIP1 S11).
   ⚠️ THE FOOT IS PORTALLED TO A HOST AT THE FRAME'S ROOT, NOT `position: fixed` WHERE IT STANDS. The
   steps animate `transform` with `fill: both`, which makes each one the containing block for a fixed
   descendant, so a fixed foot inside them would pin to the step and not the screen. The host sits
   on `.sf` itself, which never animates, so the steps' `.sf .x` rules still reach the buttons. */

/** A band override, for a step that runs its own sub-steps (the review: duplicates, agents, queries,
 *  import). The review supplies its name and its own step list; nothing is counted twice. */
export interface SetupBandOverride { name: string; steps: { id: string; label: string }[]; index: number }

interface SetupPhoneCtx { footHost: HTMLElement | null; setBand: (b: SetupBandOverride | null) => void }
const PhoneCtx = createContext<SetupPhoneCtx | null>(null);

/** A step sets the band for as long as it is mounted. A no-op on the desktop and outside a frame. */
export function useSetupBand(band: SetupBandOverride | null): void {
  const ctx = useContext(PhoneCtx);
  const key = band ? `${band.name}|${band.index}|${band.steps.map((s) => s.id).join(",")}` : "";
  useEffect(() => {
    if (!ctx) return;
    ctx.setBand(band);
    return () => ctx.setBand(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key]);
}

/** On a phone, the frame's foot host; null on the desktop, outside a set-up frame, or before mount. */
export function useSetupFootHost(): HTMLElement | null {
  return useContext(PhoneCtx)?.footHost ?? null;
}

const Brand: React.FC = () => (
  <div className="ws-logo sf-logo" data-shell="logo">
    <span className="ws-brand sf-brand">
      <img className="ws-bmark" src={artUrl(APP_MARK)} width={APP_MARK.width} height={APP_MARK.height} alt="" aria-hidden="true" />
      <span className="ws-bwm">QueryHawk</span>
    </span>
    {BETA_MODE && <span className="ws-beta" data-shell="beta">{BETA_PILL.toUpperCase()}</span>}
  </div>
);

const TICK = (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const SetupFrame: React.FC<SetupFrameProps> = ({
  form, group, name, otherTab, onTab, steps, activeIndex = 0, manuscriptTitle, user,
  exitLabel, onExit, hideExit, appMode, handoff, children,
}) => {
  const exitRef = useRef<HTMLButtonElement>(null);
  /* ⚠️ THE APP HAS A STRIP ABOVE ITS SHELL THAT THE FRAME DOES NOT (the beta notice, until it is
     dismissed), so the app's sidebar, tab and sheet start that much lower than the frame's. On the
     hand-off the frame makes room for it — the same strip, drawn for show, its height measured
     rather than assumed — so that when the app mounts nothing moves. */
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripH, setStripH] = useState(0);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) { setStripH(0); return; }
    const fit = () => setStripH(el.offsetHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!handoff]);
  const noLimit = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const phoneSetup = isMobile && form === "setup";
  const [footHost, setFootHost] = useState<HTMLElement | null>(null);
  const [bandOverride, setBand] = useState<SetupBandOverride | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /* The foot's height, published on the frame so a step's spacer reserves exactly that much. */
  useLayoutEffect(() => {
    if (!footHost || !rootRef.current) return;
    const root = rootRef.current;
    const fit = () => root.style.setProperty("--sf-foot-h", `${footHost.offsetHeight}px`);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(footHost);
    return () => { ro.disconnect(); root.style.removeProperty("--sf-foot-h"); };
  }, [footHost]);
  const ctxValue = React.useMemo<SetupPhoneCtx | null>(
    () => (phoneSetup ? { footHost, setBand } : null), [phoneSetup, footHost]);
  const bandSteps = bandOverride ? bandOverride.steps : (steps ?? []);
  const bandIndex = bandOverride ? bandOverride.index : activeIndex;
  const bandName = bandOverride ? bandOverride.name : (steps?.[activeIndex]?.label ?? name);
  const siblings: TabSibling[] = otherTab
    ? [{ id: otherTab.id, label: otherTab.label, path: otherTab.id, icon: null }]
    : [];
  /* the desktop's tabs. ⚠️ ON THE ACCOUNT SCREENS THE ORDER IS FIXED (shell tabs v2.1, `ACCOUNT_TABS`): "Create
     account", then "Sign in", whichever is current — the current tab is the one that is not `otherTab`. Anywhere else
     (and for an `otherTab` the fixed pair does not name), the current page, then the other mode's. */
  const fixedPair = form === "account" && !!otherTab && ACCOUNT_TABS.some((t) => t.id === otherTab.id);
  const stripCurrent = fixedPair ? ACCOUNT_TABS.find((t) => t.id !== otherTab!.id)!.id : "__cur";
  const stripTabs: StripTab[] = fixedPair
    ? ACCOUNT_TABS.map((t) => ({ id: t.id, label: t.label, short: t.label, path: t.id, icon: null }))
    : [
        { id: "__cur", label: name, short: name, path: "__cur", icon: null },
        ...siblings.map((sb) => ({ id: sb.id, label: sb.label, short: sb.label, path: sb.path, icon: null })),
      ];
  const title = (manuscriptTitle ?? "").trim();
  /* plan rules v1: the dev lab is the one caller that passes `user`; it states paid Pro or Free as a fixture */
  const plan = planLine({ basis: user?.plan === UserPlan.PRO ? "pro" : "free", pro: user?.plan === UserPlan.PRO, prompts: user?.plan !== UserPlan.PRO, trialEndsMs: null });
  const userName = (user?.name ?? "").trim();

  return (
    <PhoneCtx.Provider value={ctxValue}>
    <div ref={rootRef} className={`ws-app sf sf--${form}${appMode ? " dash-mode" : ""}${handoff?.on ? " is-handoff" : ""}`} data-setup-frame={form}
         style={handoff ? ({ ["--sf-strip-h" as string]: `${stripH}px` } as React.CSSProperties) : undefined}>
      {form === "setup" && (
        <div className="ws-panel sf-panel" data-sf="panel">
          <div className="ws-pin">
            <Brand />
            {title && (
              <div className="sf-ms" data-sf="manuscript">
                <span className="sf-mscover" aria-hidden="true"><i /><i /><i /></span>
                <span className="sf-mstx">
                  <b className="sf-mst">{title}</b>
                  <small className="sf-mss">QUERYING</small>
                </span>
              </div>
            )}
            <div className="sf-navzone">
              <div className="sf-stepsbox" aria-hidden={handoff?.on || undefined}>
              <div className="sf-grp"><span>{SETUP_GROUP}</span><i aria-hidden="true" /></div>
              <ol className="sf-steps" aria-label="Set-up steps">
                {(steps ?? []).map((s, i) => {
                  const state = i < activeIndex ? "done" : i === activeIndex ? "now" : "todo";
                  return (
                    <li key={s.id} className={`sf-step sf-step--${state}`} data-step={s.id} data-state={state}
                        aria-current={state === "now" ? "step" : undefined}>
                      <span className="sf-stepdot" aria-hidden="true">{state === "done" ? TICK : i + 1}</span>
                      <span className="sf-steplab">{s.label}</span>
                    </li>
                  );
                })}
              </ol>
              </div>
              {handoff?.nav}
            </div>
            {user && (
              <div className="ws-pfoot sf-foot" data-sf="foot">
                <div className="ws-pfrow">
                  <span className="sf-user">
                    <span className="ws-av sf-av" aria-hidden="true">{getInitials(userName || "Writer")}</span>
                    <span className="ws-utext">
                      <span className="sf-un">{formatSidebarName(userName || "Writer")}</span>
                      <span className="sf-up" data-sf="plan">{plan.label}</span>
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="ws-main sf-main">
        <header className="ws-pagebar sf-bar" data-sf="bar">
          {/* The brand row rides in the bar on the account screens, and on a phone in both forms
              (where there is no sidebar to hold it). */}
          <div className="sf-barbrand"><Brand /></div>
          <div className="sf-tabs" data-sf="tabs">
            {/* The tabs fit between their own left edge and `limitRef`, giving way as the bar's do. On the
                account screens the second tab must STAY — it is the only way to the other mode — so there
                the limit is this box's own width, and on a phone the box is wider than the row and scrolls
                sideways. From 768px up this is the bar's own `TabStrip` (both curves are its own, so the
                frame draws none); on a phone, `FolderTab`, which onboarding.css styles alone. */}
            <div className="sf-tabsin">
              {isMobile ? (
                <FolderTab group={group} name={name} siblings={siblings} onGo={(id) => onTab?.(id)}
                           limitRef={form === "account" ? noLimit : exitRef} />
              ) : (
                <TabStrip tabs={stripTabs} current={stripCurrent} onGo={(id) => { if (id !== stripCurrent) onTab?.(id); }}
                          limitRef={form === "account" ? noLimit : exitRef} />
              )}
            </div>
          </div>
          {/* Hidden, not removed: the tabs measure their room against this box, and the bar's row
              keeps its height from it on a phone. */}
          <button type="button" className="sf-exit" ref={exitRef} onClick={onExit} data-sf="exit"
                  disabled={hideExit || undefined} style={hideExit ? { visibility: "hidden" } : undefined}
                  aria-hidden={hideExit || undefined} data-exit-hidden={hideExit ? "1" : undefined}>
            {exitLabel}
          </button>
        </header>
        {phoneSetup && bandSteps.length > 0 && (
          <div className="sf-pband" data-sf="pband">
            <small className="sf-pbstep" data-sf="pband-step">Step {bandIndex + 1} of {bandSteps.length}</small>
            <b className="sf-pbname" data-sf="pband-name">{bandName}</b>
            <div className="sf-pbsegs" aria-hidden="true">
              {bandSteps.map((st, i) => <i key={st.id} className={i <= bandIndex ? "on" : undefined} />)}
            </div>
          </div>
        )}
        <div className="ws-winwrap">
          <div className="ws-window sf-sheet" data-sf="sheet">
            <div className="sf-scroll" data-sf="scroll">{children}</div>
          </div>
        </div>
      </div>
      {/* Last, so that adding it re-keys nothing above it. For show: the app's own strip arrives
          with the app. */}
      {phoneSetup && <div className="sf-foothost" ref={setFootHost} data-sf="foothost" />}
      {handoff && (
        <div className="sf-strip" ref={stripRef} aria-hidden="true" data-sf="strip" {...{ inert: true }}>
          <BetaStrip onReport={() => {}} />
        </div>
      )}
    </div>
    </PhoneCtx.Provider>
  );
};
