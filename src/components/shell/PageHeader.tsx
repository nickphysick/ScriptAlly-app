/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PageHeader — the standard page header of the v2 shell (Phase 4 of the rollout; ref
 * design-refs/scriptally-shell-v2.html .pagehead): title → optional description → up to TWO
 * actions bottom-right on the description's baseline → a hairline rule closing the header.
 * Everything below the rule is page content.
 *
 * ONE variant (the flyouts pack retired compact AND greeting — the dashboard returned to its
 * original centred header): full — 40px Playfair title, optional Playfair description, up to
 * two actions, the closing rule. Every routed page except the dashboard renders it.
 *
 * Actions: maximum two, enforced in the type (a tuple union) AND with a runtime slice for
 * un-typed call sites. Secondary = parchment + hairline; primary = the Form 11 soft-pink
 * button. There is no dark-pill CTA anywhere in the app.
 */
import React from "react";
import "./pageHeader.css";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  /** The Form 11 soft-pink primary. At most one per header, rendered where given (rightmost by convention). */
  primary?: boolean;
}

/** Max two actions — the tuple union makes a third a type error. */
export type PageHeaderActions = [] | [PageHeaderAction] | [PageHeaderAction, PageHeaderAction];

export interface PageHeaderProps {
  /** One variant remains; the prop survives (optional) so existing `variant="full"` call
   *  sites stand unchanged. */
  variant?: "full";
  title: string;
  description?: string;
  actions?: PageHeaderActions;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  const acts = (actions ?? []).slice(0, 2); // runtime guard behind the tuple type
  return (
    <header className="svh svh--full">
      <div className="svh-top">
        <div className="svh-txt">
          <h1 className="svh-title">{title}</h1>
          {description && <div className="svh-sub">{description}</div>}
        </div>
        {acts.length > 0 && (
          <div className="svh-acts">
            {acts.map((action, i) => (
              <button
                key={i}
                type="button"
                className={action.primary ? "svh-btn svh-btn-primary" : "svh-btn svh-btn-ghost"}
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="svh-rule" />
    </header>
  );
};
