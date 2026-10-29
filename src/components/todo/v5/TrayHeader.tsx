/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v12 (design-refs/todo-list-v12/todo-list-v12.html; v7 before it) — the top of the page: the house header card,
 * then the section headings. The header is the shared `PageHeaderCard`, mounted as Responses (`Rsp5TitleCard`) and the Contact
 * list (`ContactHeader25`) mount it: the title on the blush highlighter, a body line naming the book, "+ Add a task" and
 * "Set aside · n", and the Mentor with his clipboard.
 *
 * ⚠️ RETIRED BY v7, rule and element: v5's eyebrow, the hawk shadow, the "{n} tasks in your tray" title, the three-count
 *    card and the "Cleared this week" ring. The urgent figures v5.2 put in the h1 moved to the "Your tray" line
 *    (`TrayHeadline`), with the same words.
 * ⚠️ RETIRED BY v12: the "Your tray" line (`TrayHeadline`) and its urgent figures — the Needs you now summary says them
 *    now (lib/todoUrgent). The h1 keeps `data-page-title` in all three states.
 */
import React from "react";
import { PageHeaderCard } from "../../shared/PageHeaderCard";
import { MENTOR_ART } from "./TrayEmpty";

/** the body line, word for word (v12 Phase 1 §1): one line in the populated and the all caught up states */
export const trayHeaderBody = (ms: React.ReactNode) => (
  <>Your tasks for {ms}, most urgent first: pages to send, agents to chase and details to fill in.</>
);
/** v12 Phase 4 §1 — the Nothing yet state's body line */
export const nothingYetBody = (ms: React.ReactNode) => (
  <>Once you log the queries you’ve sent for {ms}, your tasks will show up here: pages to send, agents to chase and queries to close.</>
);

/**
 * v12 — ONE HEADER IN ALL THREE STATES. Populated and all caught up: "+ Add a task" and "Set aside · n". Nothing yet:
 * "+ Log your first query" and "Import from a spreadsheet" (the `nothing` prop).
 */
export const TrayHeader: React.FC<{
  loading: boolean;
  msTitle: string | null;
  onAdd: () => void;
  asideN: number;
  asideRef: React.Ref<HTMLButtonElement>;
  onAside: () => void;
  /** the Nothing yet state: its own body and buttons */
  nothing?: { onLog: () => void; onImport: () => void } | null;
}> = ({ loading, msTitle, onAdd, asideN, asideRef, onAside, nothing = null }) => {
  const ms = <b data-td7="ms">{msTitle || "your book"}</b>;
  return (
    <header className="td7-hd" data-td7="header" data-td5="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <PageHeaderCard className="td7-card" titleId="td7T" art={MENTOR_ART}
        data={{ "data-td7": "hd-card" }} titleData={{ "data-page-title": "true", "data-td7": "title" }}
        title={<span className="hl" data-td7="hl">To-do list</span>}
        body={nothing ? nothingYetBody(ms) : trayHeaderBody(ms)}
        primary={nothing
          ? { label: "+ Log your first query", onClick: nothing.onLog, disabled: loading, data: { "data-td5": "empty-log" } }
          : { label: "+ Add a task", onClick: onAdd, disabled: loading, data: { "data-td5": "add" } }}
        secondary={nothing
          ? { label: "Import from a spreadsheet", onClick: nothing.onImport, disabled: loading, data: { "data-td12": "import" } }
          : { label: asideN ? `Set aside · ${asideN}` : "Set aside", onClick: onAside, disabled: loading, buttonRef: asideRef, data: { "data-td5": "aside" } }} />
    </header>
  );
};

/** a v7 section heading: typewriter, a hairline running to the right edge (Today) or a line beneath (Your tray) */
export const TraySection: React.FC<{ title: string; id: string; rule?: boolean; sub?: React.ReactNode; children?: React.ReactNode; data?: Record<`data-${string}`, string>; className?: string }> = ({ title, id, rule, sub, children, data, className }) => (
  <section className={["td7-sec", className].filter(Boolean).join(" ")} aria-labelledby={id} {...data}>
    <div className="td7-h2row">
      <div className="td7-ttl"><h2 className="td7-h2" id={id}>{title}</h2>{sub != null ? <div className="td7-subrow">{sub}</div> : null}</div>
      {rule ? <span className="td7-rule" aria-hidden="true" /> : null}
    </div>
    {children}
  </section>
);
