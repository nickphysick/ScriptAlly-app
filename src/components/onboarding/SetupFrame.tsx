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
 * `.ws-logo`, and `.ws-main` › `.ws-pagebar` + `.ws-winwrap` › `.ws-window`) and mounts the real
 * `FolderTab`, so the sidebar's width, the brand row's box, the tab, and the sheet's inset and
 * radius are the declarations in `inkShell.css` — there is no second number to keep in step, and
 * lock F1 measures them against `/dashboard` in the same run. `onboarding.css` adds only what the
 * shell has no word for (the steps, the two-form layout, the phone arrangement).
 *
 * ⚠️ IT REPLACES `OnboardingHeader`, `OnboardingSpine` AND THE FULL-SCREEN OVERLAY, all deleted in
 * the commit that added this. No ScriptAlly artwork is drawn anywhere in the journey.
 *
 * The frame, the sidebar and the tab do not animate between steps; the tab's name changes in place
 * (`FolderTab`'s own 90ms swap). Only the sheet's contents fade.
 */

import React, { useRef } from "react";
import "../shell/primitives.css";
import "../shell/workspaceShell.css";
import "../shell/inkShell.css";
import "./onboarding.css";
import { FolderTab, TabSibling } from "../shell/FolderTab";
import { APP_MARK, artUrl } from "../../lib/appArt";
import { BETA_MODE, BETA_PILL } from "../../lib/beta";
import { planLine } from "../../lib/shellSidebar";
import { getInitials, formatSidebarName } from "../../lib/displayName";
import { SpineStep } from "../../lib/onboardingSpine";
import { UserPlan } from "../../types";

/** The group label over the steps, and the tab's group on every set-up step. */
export const SETUP_GROUP = "Getting set up";
/** The tab group on the account screens. */
export const ACCOUNT_GROUP = "Your account";

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
  children: React.ReactNode;
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
  exitLabel, onExit, children,
}) => {
  const exitRef = useRef<HTMLButtonElement>(null);
  const noLimit = useRef<HTMLElement>(null);
  const siblings: TabSibling[] = otherTab
    ? [{ id: otherTab.id, label: otherTab.label, path: otherTab.id, icon: null }]
    : [];
  const title = (manuscriptTitle ?? "").trim();
  const plan = planLine(user?.plan);
  const userName = (user?.name ?? "").trim();

  return (
    <div className={`ws-app sf sf--${form}`} data-setup-frame={form}>
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
            {/* The tab's left-hand fillet. The app's tab is flush to the sheet's left edge and needs
                none; here it can stand off that edge, so the join gets the mirror of the shell's own
                drawn path (an SVG, as there — never a pseudo-element or a gradient). */}
            <svg className="sf-ftfl-l" viewBox="0 0 12 12" preserveAspectRatio="none" width="13" height="12" aria-hidden="true" focusable="false">
              <path d="M12 0V12H0A12 12 0 0 0 12 0Z" />
            </svg>
            {/* `FolderTab` fits its siblings between its own left edge and `limitRef`, collapsing the
                ones that do not fit. On the account screens the second tab must STAY — it is the only
                way to the other mode — so there the limit is this box's own width, and on a phone
                the box is wider than the row and scrolls sideways. */}
            <div className="sf-tabsin">
              <FolderTab group={group} name={name} siblings={siblings} onGo={(id) => onTab?.(id)}
                         limitRef={form === "account" ? noLimit : exitRef} />
            </div>
          </div>
          <button type="button" className="sf-exit" ref={exitRef} onClick={onExit} data-sf="exit">
            {exitLabel}
          </button>
        </header>
        <div className="ws-winwrap">
          <div className="ws-window sf-sheet" data-sf="sheet">
            <div className="sf-scroll" data-sf="scroll">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
