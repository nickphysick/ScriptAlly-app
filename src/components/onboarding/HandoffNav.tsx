/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The app's nav, for show, as the set-up frame becomes the app (onboarding v5, part 2).
 *
 * As the importing loader's card lifts, the sidebar's three steps fade out and these rows fade in
 * where the app's nav will be, so that when the app shell mounts a moment later the sidebar is
 * already what it is about to be. The rows are the shell's own model (`workspaceSections`) in the
 * shell's own classes, so their positions are `workspaceShell.css`'s and not a second set.
 *
 * ⚠️ THEY DO NOTHING. Not focusable, hidden from assistive technology, no handlers: the app's real
 * nav replaces them within the second.
 */
import React, { useEffect, useState } from "react";
import { workspaceSections } from "../../lib/workspaceNav";

type Icons = Record<string, React.ReactNode>;

/** What the folder tab reads once the frame has become the app's: the dashboard's own group and name. */
export const HANDOFF_TAB = { group: "Workspace", name: "Dashboard" } as const;

export const HandoffNav: React.FC = () => {
  /* The icons are the app shell's own table. It is loaded here rather than imported at the top so
     that the set-up screens do not pull the whole shell into every test that renders one. */
  const [icons, setIcons] = useState<Icons>({});
  useEffect(() => {
    let live = true;
    void import("../shell/AppShell").then((m) => { if (live) setIcons(m.WORKSPACE_ICONS); }).catch(() => {});
    return () => { live = false; };
  }, []);
  const sections = workspaceSections({ todo: 0 });
  return (
    <div className="ws-nav sf-appnav" aria-hidden="true" data-sf="appnav" {...{ inert: true }}>
      {sections.map((sec) => (
        <React.Fragment key={sec.id}>
          <div className="ws-glabel">{sec.label}</div>
          {(sec.children ?? []).map((ch) => (
            <div key={ch.id} className={`ws-ni${ch.path === "/dashboard" ? " on" : ""}`}>
              <span className="ws-ic">{icons[ch.icon ?? ch.id] ?? icons[sec.id] ?? null}</span>
              <span className="ws-lbl">{ch.label}</span>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};
