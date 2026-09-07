/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SettingsRail — the settings mode's navigation, living in the SHELL's panel slot
 * (ref design-refs/settings-mode-stacked-cards-v2.html, `.rail`).
 *
 * ⚠️ IT IS THE SAME RAIL, MOVED — NOT A SECOND ONE. It used to be a `MountPanel` inside
 * `AccountSettings`, which meant the app nav and the settings nav were on screen together and the
 * reader had two lists of places to go, one nested inside the other. Settings is a MODE: the panel
 * shows the app's nav or this, never both. The item ids (`acct-tab-<section>`) and the blush active
 * state are carried over unchanged, because the page's `aria-labelledby` points at them and the
 * active state is the app's, not the ref's.
 *
 * ⚠️ IT IS MOUNTED ON EVERY ROUTE, and that is what makes the cross-fade work in BOTH directions.
 * A layer that unmounts on exit cannot fade out — the panel would simply go empty for the 100ms
 * before the app nav arrives. The cost is seven buttons in the DOM on nine other pages, and it is
 * paid for with `aria-hidden` plus the stylesheet's `visibility: hidden`: the first keeps the
 * tablist out of the accessibility tree while it has no panel to control, the second takes its
 * buttons out of the tab order. Either alone is the known foot-gun — `aria-hidden` over focusable
 * children, or a hidden control still announced — so both are load-bearing.
 *
 * ⚠️ `aria-controls` IS CONDITIONAL FOR THE SAME REASON. `acct-panel` only exists while
 * `AccountSettings` is mounted; pointing at it from nine other routes would be a reference to
 * nothing. It is set when the mode is on and omitted otherwise.
 *
 * ⚠️ THE ITEMS NAVIGATE, WHICH MAKES `role="tab"` A SLIGHT STRETCH — recorded rather than changed.
 * The tab semantics were exactly right while the section was `useState`; they became approximate
 * when sections became real paths, and moving the rail into the shell does not make them worse. It
 * is a live claim about ARIA, not a layout question, so it belongs to its own pass and not to this
 * one. See the run report.
 */
import React from "react";
import { ACCOUNT_ROUTES, AccountSectionId } from "../../lib/accountRoutes";
import { SECTION_BANDS } from "./sectionBands";
import { planAllowanceLine } from "../../lib/planComparison";
import { ChevronLeft, BookMarked } from "lucide-react";
import "./settingsRail.css";

/** The one id the mode's focus contract addresses — entering settings lands here. */
export const SETTINGS_RAIL_HEADING_ID = "set-railhead";

export interface SettingsRailProps {
  /** The section the panel is showing, or null when the mode is off. */
  active: AccountSectionId | null;
  /** True while settings mode is on — gates `aria-controls` and the accessibility tree. */
  live: boolean;
  onSelect: (id: AccountSectionId) => void;
  onExit: () => void;
  plan: "free" | "pro";
}

export const SettingsRail: React.FC<SettingsRailProps> = ({ active, live, onSelect, onExit, plan }) => {
  const idx = ACCOUNT_ROUTES.findIndex((r) => r.id === active);

  /* ⚠️ THE ROVING TAB INDEX NEEDS A LANDING PLACE WHEN NOTHING IS ACTIVE. `idx` is -1 on every
     non-settings route, and a list where every item is `tabIndex={-1}` is a list keyboard users
     cannot enter. The first item takes the stop in that case — it is unreachable anyway while the
     layer is hidden, and correct the instant the mode turns on. */
  const stop = idx < 0 ? 0 : idx;

  const focusItem = (i: number) =>
    requestAnimationFrame(() => document.getElementById(`acct-tab-${ACCOUNT_ROUTES[i].id}`)?.focus());

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = ACCOUNT_ROUTES.length;
    let next = stop;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight": next = (stop + 1) % n; break;
      case "ArrowUp":
      case "ArrowLeft": next = (stop - 1 + n) % n; break;
      case "Home": next = 0; break;
      case "End": next = n - 1; break;
      default: return;
    }
    e.preventDefault();
    onSelect(ACCOUNT_ROUTES[next].id);
    focusItem(next);
  };

  return (
    <div className="set-rail" aria-hidden={live ? undefined : true}>
      {/* ⚠️ THE EXIT IS A ROW, NOT A CRUMB. It is the first thing in the column because leaving is
          the one action this mode has that the page cannot offer — every other row goes deeper. */}
      <button type="button" className="set-backrail" onClick={onExit}>
        <ChevronLeft aria-hidden="true" /> Back to app
      </button>

      <hr className="set-railrule" />

      {/* ⚠️ `tabIndex={-1}` SO IT CAN BE FOCUSED WITHOUT BEING TABBED TO. Entering the mode moves
          focus here so a screen reader announces where it has arrived; it must not then sit in the
          tab order as a stop that does nothing. */}
      <h2 className="set-railhead" id={SETTINGS_RAIL_HEADING_ID} tabIndex={-1}>Settings</h2>

      <div
        role="tablist"
        aria-label="Account settings sections"
        aria-orientation="vertical"
        className="set-raillist"
      >
        {ACCOUNT_ROUTES.map((r, i) => {
          const Icon = SECTION_BANDS[r.id].Icon;
          const on = r.id === active;
          return (
            <button
              key={r.id}
              type="button"
              id={`acct-tab-${r.id}`}
              role="tab"
              aria-selected={on}
              aria-controls={live ? "acct-panel" : undefined}
              tabIndex={i === stop ? 0 : -1}
              onClick={() => onSelect(r.id)}
              onKeyDown={onKeyDown}
              className="set-railitem"
            >
              <Icon aria-hidden="true" strokeWidth={1.9} />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* ⚠️ THE PLAN STRIP IS `RailAside`'s CONTENT WITHOUT `RailAside`'s JOB. That card existed to
          stop the left column ending a third of the way down beside a taller work column — a depth
          problem that belonged to a grid this mode no longer has. What survives is the only part
          that ever said anything: the plan, and the line derived from `PLAN_ROWS` so the rail and
          the comparison two clicks away cannot come to disagree. */}
      <div className="set-railfoot">
        <div className="set-planstrip">
          <BookMarked aria-hidden="true" strokeWidth={1.3} />
          <div>
            <span className="set-plank">Your plan</span>
            <span className="set-planv">{plan === "pro" ? "Pro" : "Free"}</span>
            <span className="set-plannote">{planAllowanceLine(plan)}.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
