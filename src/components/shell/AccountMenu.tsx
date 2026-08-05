/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AccountMenu — ONE component, used by BOTH shells (app-shell pack, Baked 11).
 *
 * ⚠️ BUILD IT ONCE AND USE IT TWICE. Two copies would drift: the workspace shell and the top-nav
 * shell would slowly disagree about where Settings lives, or which of them offers the plan, and
 * the disagreement would only show up to a user who used both.
 *
 * ⚠️ THIS IS THE ONLY PLACE SETTINGS AND THE UPGRADE CARD LIVE. Pro appears exactly twice in the
 * whole app: as a plain text link in the column's foot, and as the card here. Nowhere else.
 */
import React, { useEffect, useRef } from "react";
import { Settings, SlidersHorizontal, HelpCircle, LogOut } from "lucide-react";
import { UserPlan } from "../../types";
import { planLine } from "../../lib/shellSidebar";
import { TODO_OPEN_TASK_SETTINGS } from "../../lib/todoRoutes";
import "./accountMenu.css";

export interface AccountMenuProps {
  open: boolean;
  onClose: () => void;
  name: string;
  email?: string;
  plan?: UserPlan;
  /** Router-direct navigation — AppShell's goPath. */
  onNavigatePath: (path: string) => void;
  onSignOut: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  open, onClose, name, email, plan, onNavigatePath, onSignOut,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ref.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const line = planLine(plan);
  const go = (path: string) => () => { onClose(); onNavigatePath(path); };

  return (
    <div className="am-menu" role="menu" aria-label="Account" ref={ref}>
      <div className="am-who">
        <span className="am-name">{name}</span>
        {email && <span className="am-email">{email}</span>}
      </div>

      <button type="button" className="am-row" role="menuitem" onClick={go("/account")}>
        <Settings aria-hidden="true" /><span>Settings</span>
      </button>
      {/* Task settings is a SHEET inside /todo, not a route — the existing contract is navigate
          there, then dispatch the event the page already listens for. */}
      <button
        type="button"
        className="am-row"
        role="menuitem"
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent(TODO_OPEN_TASK_SETTINGS));
          onNavigatePath("/todo");
        }}
      >
        <SlidersHorizontal aria-hidden="true" /><span>Task settings</span>
      </button>
      <button type="button" className="am-row" role="menuitem" onClick={go("/help")}>
        <HelpCircle aria-hidden="true" /><span>Help centre</span>
      </button>

      <div className="am-div" aria-hidden="true" />

      {/* THE PLAN CARD — the one place the upgrade is sold, and only to someone who is not
          already paying. A Pro user reads their plan as fact and is offered nothing. */}
      <div className={`am-plan${line.upgrade ? "" : " pro"}`}>
        <span className="am-planlab">{line.label}</span>
        {line.upgrade && (
          <button type="button" className="am-planbtn" onClick={go("/plans")}>
            Upgrade
          </button>
        )}
      </div>

      <div className="am-div" aria-hidden="true" />

      <button type="button" className="am-row" role="menuitem" onClick={() => { onClose(); onSignOut(); }}>
        <LogOut aria-hidden="true" /><span>Sign out</span>
      </button>
    </div>
  );
};
