/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 §3 (design-refs/query-centre-v156.html) — THE COLLAPSED HEADER. Once the navy panel has scrolled
 * out from under the top of the scroll area, a slim 60px bar takes its place: "26 queries sent" and "for Murphy's Day
 * Out" on the left; on the right (v156.1 §1) the flame (none without a streak), "6 week streak", its plain line, and a
 * navy "+ Log a query". "Record a response" is not in it.
 *
 * ⚠️ THE CONTACT LIST'S SLIM ROW'S READER AND OFFSET (shell/slimReveal, extracted from ContactSlimRow): the same moment
 *    (the panel's foot passing under the bar's line) and the same `--pin-cover` written on the list's columns
 *    (`.qc153-cl`), so the toolbar pins directly under the bar and the Views panel 14px under the toolbar. `extra` is
 *    the toolbar strip's 12px (its top is `--pin-cover` − 12, qcv154.css §6).
 * ⚠️ THE BAR IS THE SHARED `shell/SlimBar` (Contact list — QC layout v1.1 extracted it from here, markup unchanged); this
 *    file says only what the Query Centre puts in it. The Contact list mounts the same bar.
 * ⚠️ IT TAKES NO SPACE: sticky at the root's top with its own height given back in a negative margin, so the page at
 *    rest is exactly as it was. Its ground reaches the sheet's full width (`--qc156-bl` / `--qc156-br`, measured);
 *    its content stays inset to the page content's edges.
 * ⚠️ HIDDEN IS INERT: `inert` and `aria-hidden` while it is not shown, so its button is not in the Tab order.
 */
import React from "react";
import type { WeekGoal154 } from "../../../lib/qc154goal";
import { streakLead } from "../../../lib/qc1561";
import { FIRST_TITLE_155 } from "../../../lib/qc155";
import { SlimBar } from "../../shell/SlimBar";
import { sentTitle } from "./QcHeader1531";
import { FLAME_1561 } from "./QcLine156";
import "./qcv156.css";

const header = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > [data-qc1531='header']");
const cover = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > .qc153-cl");

export const QcSlim156: React.FC<{
  sent: number;
  /** the manuscript in scope, or none */
  ms: string | null;
  goal: WeekGoal154 | null;
  onLog: () => void;
  logDisabled?: boolean;
}> = ({ sent, ms, goal, onLog, logDisabled = false }) => {
  const lead = goal ? streakLead(goal) : null;
  return (
    <SlimBar hook="data-qc156" header={header} cover={cover} extra={12}
      title={sent === 0 ? FIRST_TITLE_155 : sentTitle(sent)}
      sub={ms ? { node: <>for {ms}</>, probe: "slim-for" } : null}
      /* v156.1 §1 — the streak leads here too: the flame (none without a streak), the streak, its plain line */
      right={lead ? (
        <span className="qc1561-sw" data-qc156="slim-week">
          {lead.flame ? <FLAME_1561 className="qc1561-sfl" width={17} height={22} /> : null}
          <b data-qc156="slim-streak">{lead.title}</b><em data-qc156="slim-line">{lead.line}</em>
        </span>
      ) : null}
      button={{ label: "+ Log a query", onClick: onLog, disabled: logDisabled, probe: "slim-log" }} />
  );
};
