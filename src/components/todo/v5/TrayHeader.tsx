/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v7 (design-refs/todo-list-v7/todo-list-v7.html) — the top of the page: the house header card, then the
 * section headings. The header is the shared `PageHeaderCard`, mounted as Responses (`Rsp5TitleCard`) and the Contact
 * list (`ContactHeader25`) mount it: the title on the blush highlighter, a body line naming the book, "+ Add a task" and
 * "Set aside · n", and the Mentor with his clipboard.
 *
 * ⚠️ RETIRED BY v7, rule and element: v5's eyebrow, the hawk shadow, the "{n} tasks in your tray" title, the three-count
 *    card and the "Cleared this week" ring. The urgent figures v5.2 put in the h1 moved to the "Your tray" line
 *    (`TrayHeadline`), with the same words.
 * ⚠️ THE h1 KEEPS `data-page-title`. The "Nothing yet" page is a different component (TrayEmpty) and is unchanged.
 */
import React from "react";
import { PageHeaderCard } from "../../shared/PageHeaderCard";
import { MENTOR_ART } from "./TrayEmpty";

/** the body line, word for word (v7 §1) */
export const trayHeaderBody = (caught: boolean, ms: React.ReactNode) => (caught
  ? <>Nothing needs you right now on {ms}. When an agent’s window passes or a request comes in, it lands here.</>
  : <>Everything waiting on you for {ms}: what to send, who to chase and what to tidy, most pressing first.</>);

export const TrayHeader: React.FC<{
  loading: boolean;
  /** the all caught up page's body line */
  caught?: boolean;
  msTitle: string | null;
  onAdd: () => void;
  asideN: number;
  asideRef: React.Ref<HTMLButtonElement>;
  onAside: () => void;
}> = ({ loading, caught, msTitle, onAdd, asideN, asideRef, onAside }) => {
  const ms = <b data-td7="ms">{msTitle || "your book"}</b>;
  return (
    <header className="td7-hd" data-td7="header" data-td5="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
      <PageHeaderCard className="td7-card" titleId="td7T" art={MENTOR_ART}
        data={{ "data-td7": "hd-card" }} titleData={{ "data-page-title": "true", "data-td7": "title" }}
        title={<span className="hl" data-td7="hl">To-do list</span>}
        body={trayHeaderBody(!!caught, ms)}
        primary={{ label: "+ Add a task", onClick: onAdd, disabled: loading, data: { "data-td5": "add" } }}
        secondary={{ label: asideN ? `Set aside · ${asideN}` : "Set aside", onClick: onAside, disabled: loading, buttonRef: asideRef, data: { "data-td5": "aside" } }} />
    </header>
  );
};

/** v5.2 §F.1's urgent figures, as v7's "Your tray" line says them: "{o} overdue · {t} due today", a 0 part dropped */
export const urgentWords = (u: { overdue: number; today: number }) =>
  (u.overdue || u.today ? [u.overdue ? `${u.overdue} overdue` : "", u.today ? `${u.today} due today` : ""].filter(Boolean).join(" · ") : "Nothing due today");

/** the overdue line under "Your tray": the overdue part rust and upright; "All caught up" on the empty tray */
export const TrayHeadline: React.FC<{ urgent: { overdue: number; today: number } | null; caught?: boolean; loading?: boolean }> = ({ urgent, caught, loading }) => {
  if (caught) return <span className="td7-sub" data-td7="headline">All caught up</span>;
  if (loading || !urgent) return <span className="td7-sub" data-td7="headline" aria-hidden="true">&nbsp;</span>;
  return (
    <span className="td7-sub" data-td7="headline" aria-label={urgentWords(urgent)}>
      {urgent.overdue ? <span className="td7-od" data-td52="title-od">{urgent.overdue} overdue</span> : null}
      {urgent.overdue && urgent.today ? " · " : null}
      {urgent.today ? <span data-td52="title-today">{urgent.today} due today</span> : null}
      {!urgent.overdue && !urgent.today ? "Nothing due today" : null}
    </span>
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
