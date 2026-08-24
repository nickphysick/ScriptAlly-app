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
 *
 * ⚠️ VARIANT B — THE PLAN BLOCK LEADS (ref design-refs/scriptally-account-menu-b.html). The order
 * is identity, plan, rule, rows, rule, sign out: the plan sits directly under the name because it
 * is a fact ABOUT that account, and putting it there is what lets it stop being a row pretending
 * to be a control. It is the only element here carrying a fill; everything below it is quiet.
 *
 * ⚠️ ONE FILL PER STATE, AND THE TWO STATES ARE DIFFERENT TREATMENTS — not the same block with a
 * button hidden. Pro is slate (the app's Pro colour) with a Manage link and nothing else; Free is
 * soft pink with a sentence and a button. A Pro user reading a greyed-out upsell learns their
 * money bought them a disabled control.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeMenu } from "../../lib/todoMenu";
import { Settings, SlidersHorizontal, HelpCircle, LogOut } from "lucide-react";
import { UserPlan } from "../../types";
import { AvatarChip } from "./primitives";
import { planLine } from "../../lib/shellSidebar";
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
  /**
   * The control that opened it. The menu is PORTALLED to `document.body`, so this is the only
   * thing that says where it belongs — and it is what makes one menu serve two shells whose
   * triggers sit at opposite ends of the screen.
   */
  anchor?: HTMLElement | null;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  open, onClose, name, email, plan, onNavigatePath, onSignOut, anchor,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /**
   * ⚠️ PLACED FROM THE TRIGGER'S RECT, AFTER FIRST PAINT — the menu's height depends on whether the
   * plan card carries an Upgrade button, so it cannot be known before it renders.
   *
   * `placeMenu` is the To-do board's own placement function, reused rather than reimplemented, and
   * the reason it is the right one is the RAIL FOOT: the trigger sits at the bottom of the screen,
   * and `placeMenu` flips the menu upward when `trigger.bottom + gap + height` would pass the
   * viewport's edge. That flip is the entire fix. `align: "left"` keeps it hugging the rail
   * instead of being right-aligned to a control on the left edge of the window.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const p = placeMenu(r, { w: el.offsetWidth, h: el.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight }, 8, "left");
    setPos({ left: p.left, top: p.top });
  }, [open, anchor]);

  /* Placement is per-opening: a stale position from the last time would place the menu against a
     trigger that may since have moved (the rail collapses, the window resizes). */
  useEffect(() => { if (!open) setPos(null); }, [open]);

  /** Focus arrives inside the menu; closing hands it back to the control that opened it. */
  useEffect(() => {
    if (!open || !pos) return;
    ref.current?.querySelector<HTMLButtonElement>("button.am-row")?.focus();
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      /* ⚠️ THE TRIGGER COUNTS AS INSIDE, DELIBERATELY. Its own click handler toggles, so a
         pointerdown-close followed by a click-reopen would leave the control unable to shut its
         own menu. The same reasoning PortalMenu records, for the same reason. */
      if (t && (ref.current?.contains(t) || anchor?.contains(t))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      anchor?.focus();
    };
    /* Scroll and resize close it: a fixed menu placed from a rect goes stale the moment either
       moves, and a menu hanging beside nothing is worse than one that shut. */
    const onMove = () => onClose();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;
  const line = planLine(plan);
  const go = (path: string) => () => { onClose(); onNavigatePath(path); };

  /**
   * ⚠️ PORTALLED TO `document.body`, AND THAT IS THE FIX. Mounted inline in `WorkspaceShell` this
   * sat as a child of `.ws-app`, which has NO positioned ancestor anywhere up to the root — so
   * `position: absolute; top: calc(100% + 8px)` resolved against the initial containing block and
   * opened the menu eight pixels below the BOTTOM OF THE VIEWPORT. It rendered, it was in the DOM,
   * it passed a click test, and nobody could see it; the only visible symptom was the scrollbar
   * flickering as the document grew to hold it.
   *
   * ⚠️ AND `overflow: hidden` ON THE SHELL WAS NEVER THE PROBLEM — `.sv2-app` and `.sa-shellframe`
   * both carry it, and neither clipped this, because an absolutely-positioned box is only clipped
   * by ancestors in its own containing-block chain. That is why the fault presented as a scrollbar
   * rather than as something disappearing, and it is why nothing here loosens a shell overflow.
   */
  const menu = (
    <div
      className="am-menu"
      role="menu"
      aria-label="Account"
      ref={ref}
      /* Hidden until placed — one frame at the wrong coordinates is a visible jump. */
      style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden", left: 0, top: 0 }}
    >
      {/* ⚠️ THE HOUSE AVATAR, NOT A SECOND ONE. `AvatarChip` is documented as the one avatar
          everywhere (Baked 11) and already draws exactly what the ref draws — pink fill, burgundy
          initials. Writing a `.am-av` here would be a second implementation that drifts the first
          time either is retoned. */}
      <div className="am-who">
        <AvatarChip name={name} size={32} />
        {/* The truncation lives on this column, not on the row: the avatar is `flex: none`, so
            without `min-width: 0` here a long address widens the menu instead of clipping. */}
        <span className="am-idt">
          <span className="am-name">{name}</span>
          {email && <span className="am-email">{email}</span>}
        </span>
      </div>

      {/**
        * THE PLAN BLOCK (variant B) — the one element in this menu carrying visual weight, and the
        * only place the upgrade is sold.
        *
        * ⚠️ IT REPLACES A LABEL DRESSED AS A CONTROL. The old row was the words "Pro plan" in a
        * transparent box between two hairlines: it looked like something you could press and was
        * not, and a Free user's only prompt was a 5px-tall "Upgrade" pill beside it.
        *
        * ⚠️ A PRO USER IS NEVER SOLD TO — they get the plan as fact and a quiet way to manage it.
        * `Manage` goes to `/account/plan` ("Plan & billing"), which is where the subscription and
        * the invoices are; `/plans` is the comparison, which is not what a subscriber wants.
        */}
      <div className={`am-plan ${line.upgrade ? "am-plan--free" : "am-plan--pro"}`}>
        <div className="am-plantop">
          <span className="am-planlab">{line.label}</span>
          {!line.upgrade && (
            <button type="button" className="am-planmanage" onClick={go("/account/plan")}>
              Manage <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        {line.upgrade && (
          <>
            {/* ⚠️ WHAT PRO DOES, NOT WHAT YOU HAVE LEFT. No meter, no "1 of 1" — a count in
                permanent chrome is a nag, and this menu is opened to sign out far more often than
                it is opened to buy something. */}
            <p className="am-planbody">
              One manuscript, one Smart Import. Pro lifts both, and adds Smart Email Drop.
            </p>
            <button type="button" className="am-planbtn" onClick={go("/plans")}>
              See what Pro includes
            </button>
          </>
        )}
      </div>

      <div className="am-div" aria-hidden="true" />

      {/* ⚠️ NO SHORTCUT HINT ON SETTINGS. The ref prints `⌘,` beside it; nothing in this app binds
          that key — Step 0 swept `src/` and the only comma handlers are tag-entry commits in the
          manuscript form. A printed shortcut that does nothing is worse than no shortcut, so the
          hint arrives with the binding or not at all. */}
      <div className="am-group">
        <button type="button" className="am-row" role="menuitem" onClick={go("/account")}>
          <Settings aria-hidden="true" /><span>Settings</span>
        </button>
        {/* ⚠️ TASK SETTINGS IS A ROUTE NOW, NOT A SHEET. It was navigate-then-dispatch: land on /todo,
            then fire `sa:open-task-settings` for the page to catch. The sheet is retired and
            `/account/tasks` is the one form for those fields, so this is a plain navigation — and
            the dispatch went in the SAME commit as the listener, because an event with no listener
            is a menu row that silently does nothing. */}
        <button type="button" className="am-row" role="menuitem" onClick={go("/account/tasks")}>
          <SlidersHorizontal aria-hidden="true" /><span>Task settings</span>
        </button>
        <button type="button" className="am-row" role="menuitem" onClick={go("/help")}>
          <HelpCircle aria-hidden="true" /><span>Help centre</span>
        </button>
      </div>

      <div className="am-div" aria-hidden="true" />

      {/* ⚠️ ONE STEP LIGHTER, NEVER RED. Leaving is not destructive and signing back in costs a
          password; a red row would rank it beside deleting an account. */}
      <div className="am-group">
        <button type="button" className="am-row am-out" role="menuitem" onClick={() => { onClose(); onSignOut(); }}>
          <LogOut aria-hidden="true" /><span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
};
