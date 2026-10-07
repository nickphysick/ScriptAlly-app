/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YOUR MENU, ON INK (ink shell v1, follow-up 2 §4 · ref shell-menus-settings-v1.html `.user` `.uh`
 * `.plan`). `AccountMenu` renders this when it opens from the workspace sidebar's foot on the desktop;
 * every other opener (the phone's bar, the marketing nav) keeps the menu it had. The surface, rows and
 * dividers are the house menu language (shellMenus.css); the head and the ink plan tile are here.
 *
 * ⚠️ THE PLAN SITS ON AN INK TILE — the lilac (`--slate-tint`) and pink blocks retire from this menu.
 * "Manage" goes where it always went (/account/plan). A Free plan has nothing to manage, so its link is
 * the plan line's own word, "Upgrade", to /plans — the page the old block's button opened.
 */
import React, { forwardRef } from "react";
import { Settings, SlidersHorizontal, BookOpen, LogOut } from "lucide-react";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import { moveInMenu } from "../../lib/menuKeys";
import "./shellMenus.css";
import "./accountMenuInk.css";

export interface InkAccountMenuProps {
  name: string;
  email?: string;
  upgrade: boolean;
  pos: { left: number; top: number; width?: number } | null;
  go: (path: string) => () => void;
  onSignOut: () => void;
}

export const InkAccountMenu = forwardRef<HTMLDivElement, InkAccountMenuProps>(
  ({ name, email, upgrade, pos, go, onSignOut }, ref) => (
    <div
      className="am-menu am-menu--ink sa-pop"
      role="menu"
      aria-label="Account"
      ref={ref}
      data-shell="account-menu"
      onKeyDown={(e) => { moveInMenu(e, e.currentTarget); }}
      style={pos ? { left: pos.left, top: pos.top, width: pos.width } : { visibility: "hidden", left: 0, top: 0 }}
    >
      <div className="am-ihead">
        <span className="am-iav" aria-hidden="true">{initialsOf(name || email || "")}</span>
        <span className="am-iid">
          <span className="am-iname">{name}</span>
          {email && <span className="am-iemail">{email}</span>}
        </span>
      </div>
      <div className="am-iplan" data-plan={upgrade ? "free" : "pro"}>
        <span className="am-iplan-t">
          <small>Your plan</small>
          <b>{upgrade ? "Free" : "Pro"}</b>
        </span>
        <button type="button" className="am-iplan-a" onClick={go(upgrade ? "/plans" : "/account/plan")}>
          {upgrade ? "Upgrade" : "Manage"}
        </button>
      </div>
      <div className="sa-hr" aria-hidden="true" />
      <button type="button" className="sa-mi am-row" role="menuitem" onClick={go("/account")}>
        <Settings aria-hidden="true" /><span>Settings</span>
      </button>
      <button type="button" className="sa-mi am-row" role="menuitem" onClick={go("/account/tasks")}>
        <SlidersHorizontal aria-hidden="true" /><span>Task settings</span>
      </button>
      <button type="button" className="sa-mi am-row" role="menuitem" onClick={go("/help")}>
        <BookOpen aria-hidden="true" /><span>Help centre</span>
      </button>
      <div className="sa-hr" aria-hidden="true" />
      <button type="button" className="sa-mi sa-mi--mute am-row am-out" role="menuitem" onClick={onSignOut}>
        <LogOut aria-hidden="true" /><span>Sign out</span>
      </button>
    </div>
  ),
);
InkAccountMenu.displayName = "InkAccountMenu";
