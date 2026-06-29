/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Breadcrumb — page-name trail for the shell top strip, e.g. "Queries › Query Database".
 * Page names ONLY: never a manuscript, agent, or query title (selecting a query must not change it).
 * Prior steps are muted, clickable links; the final step is the current page in Playfair 500.
 */
import React from "react";
import { ChevronRight } from "lucide-react";
import { FONT_SERIF, FONT_SANS } from "../../lib/designTokens";
import { linkRest, inkShell, crumbSep } from "./shellTokens";

interface BreadcrumbProps {
  /** Page names, root → current. The last entry renders as the active page. */
  steps: string[];
  /** Optional click handler for a prior (non-final) step, by index. */
  onStepClick?: (index: number) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ steps, onStepClick }) => (
  <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 9 }}>
    {steps.map((step, i) => {
      const isLast = i === steps.length - 1;
      return (
        <React.Fragment key={`${step}-${i}`}>
          {i > 0 && (
            <span aria-hidden="true" style={{ display: "inline-flex" }}>
              <ChevronRight style={{ width: 13, height: 13, color: crumbSep }} />
            </span>
          )}
          {isLast ? (
            <span aria-current="page" style={{ fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 15, color: inkShell }}>
              {step}
            </span>
          ) : (
            <button
              type="button"
              onClick={onStepClick ? () => onStepClick(i) : undefined}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 13,
                color: linkRest,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: onStepClick ? "pointer" : "default",
              }}
              onMouseEnter={(e) => { if (onStepClick) e.currentTarget.style.color = inkShell; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = linkRest; }}
            >
              {step}
            </button>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);
