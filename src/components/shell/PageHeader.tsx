/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PageHeader — the standard page header of the v2 shell (Phase 4 of the rollout; ref
 * design-refs/scriptally-shell-v2.html .pagehead): title → optional description → up to TWO
 * actions bottom-right on the description's baseline → a hairline rule closing the header.
 * Everything below the rule is page content.
 *
 * ONE component, three variants by prop:
 *   full     — content pages: 40px Playfair title, description shown.
 *   compact  — list/detail pages: 24px title inline with the actions, description omitted,
 *              tighter rule.
 *   greeting — dashboard only: mono date kicker ABOVE the title, description omitted. Same
 *              skeleton, same actions, same rule.
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
  variant: "full" | "compact" | "greeting";
  title: string;
  /** Rendered on the full variant only (compact and greeting omit it by design). */
  description?: string;
  /** The mono line above the title — the greeting variant's date line. */
  kicker?: string;
  actions?: PageHeaderActions;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ variant, title, description, kicker, actions }) => {
  const acts = (actions ?? []).slice(0, 2); // runtime guard behind the tuple type
  const showDescription = variant === "full" && !!description;
  return (
    <header className={`svh svh--${variant}`}>
      <div className="svh-top">
        <div className="svh-txt">
          {kicker && <div className="svh-kicker">{kicker}</div>}
          <h1 className="svh-title">{title}</h1>
          {showDescription && <div className="svh-sub">{description}</div>}
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
