/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §E — A GROUP'S MARK, drawn the same on its band and on its jump-row button
 * (design-refs/contact-list-v19/, the mock's `markFor`):
 *   - status: the StatusDot glyph in ink (the only status glyph); Not queried, which is not a query status, a
 *     dotted ring;
 *   - country: its flag (flag-icons, never an emoji); Not recorded, a dashed frame;
 *   - action required and priority: their marks (drawn, never typed characters);
 *   - letter (and no grouping): none.
 * Every mark is decorative: the band and the button name the group in words beside it.
 */
import React from "react";
import "flag-icons/css/flag-icons.min.css";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { flagFor } from "../../../lib/territory";
import { NOT_RECORDED, type GroupKey, type StatusKey } from "../../../lib/contactList";

const STATUS_DOT: Partial<Record<StatusKey, QueryStatus>> = {
  queried: QueryStatus.QUERIED, pr: QueryStatus.PARTIAL_REQUESTED, ps: QueryStatus.PARTIAL_SENT, fr: QueryStatus.FULL_REQUESTED,
  fs: QueryStatus.FULL_SENT, rr: QueryStatus.REVISE_RESUBMIT, resub: QueryStatus.RESUBMITTED, offer: QueryStatus.OFFER,
  signed: QueryStatus.SIGNED, closed: QueryStatus.REJECTED,
};

/* the mock's marks, on a 24 viewBox, 2px ink strokes */
const P = (d: string, extra: React.SVGProps<SVGPathElement> = {}) => <path d={d} {...extra} />;
const RING = <circle cx="12" cy="12" r="10" />;
const ACTION_MARK: Record<string, React.ReactNode> = {
  nudge: <>{P("M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z", { strokeLinejoin: "round" })}{P("M10 21a2.1 2.1 0 0 0 4 0", { strokeLinecap: "round" })}</>,
  ready: <>{P("M3.5 11.2 20.5 4l-6.6 16.5-2.9-6.6z", { strokeLinejoin: "round" })}{P("M11 13.9 20.5 4", { strokeLinecap: "round" })}</>,
  waiting: <>{P("M7 3.5h10M7 20.5h10", { strokeLinecap: "round" })}{P("M8.2 3.5c0 4.4 7.6 4.6 7.6 8.5s-7.6 4.1-7.6 8.5M15.8 3.5c0 4.4-7.6 4.6-7.6 8.5s7.6 4.1 7.6 8.5", { strokeLinejoin: "round" })}</>,
  shut: <><rect x="5" y="10.5" width="14" height="10" rx="2.2" />{P("M8.3 10.5V8a3.7 3.7 0 0 1 7.4 0v2.5", { strokeLinecap: "round" })}</>,
  nothing: <>{RING}{P("M7.8 12.4l2.8 2.8 5.6-5.8", { strokeLinecap: "round", strokeLinejoin: "round" })}</>,
};
/* the action groups that are a query's next step take that step's StatusDot */
const ACTION_DOT: Record<string, QueryStatus> = {
  offer: QueryStatus.OFFER, partial: QueryStatus.PARTIAL_REQUESTED, full: QueryStatus.FULL_REQUESTED, revision: QueryStatus.REVISE_RESUBMIT,
};
const STAR = "M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z";

const Svg: React.FC<{ size: number; children: React.ReactNode; ghost?: boolean }> = ({ size, children, ghost }) => (
  <svg className="cl19-gm-svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"
    data-ghost={ghost ? "" : undefined} aria-hidden="true">{children}</svg>
);

/** the mark for one group, or null (letter, no grouping) */
export const ContactGroupMark: React.FC<{ groupKey: GroupKey; gkey: string; label: string; size: number }> = ({ groupKey, gkey, label, size }) => {
  let mark: React.ReactNode = null;
  let kind = "glyph";
  if (groupKey === "status") {
    const qs = STATUS_DOT[gkey as StatusKey];
    if (qs) mark = <StatusDot status={qs} overrideSize={size} decorative />;
    else { kind = "ghost"; mark = <Svg size={size} ghost><circle cx="12" cy="12" r="10" strokeDasharray="1.6 3.1" strokeLinecap="round" /></Svg>; }
  } else if (groupKey === "action") {
    const qs = ACTION_DOT[gkey];
    mark = qs ? <StatusDot status={qs} overrideSize={size} decorative /> : ACTION_MARK[gkey] ? <Svg size={size}>{ACTION_MARK[gkey]}</Svg> : null;
  } else if (groupKey === "priority") {
    if (gkey === "unrated") { kind = "ghost"; mark = <Svg size={size} ghost><path d={STAR} strokeLinejoin="round" strokeDasharray="2.2 2.4" /></Svg>; }
    else mark = <Svg size={size}><path d={STAR} strokeLinejoin="round" fill="currentColor" /></Svg>;
  } else if (groupKey === "country") {
    kind = "flag";
    const f = label === NOT_RECORDED ? undefined : flagFor(label);
    mark = f ? <span className={`cl19-flag ${f}`} /> : <span className="cl19-flag cl19-flag--none" />;
  }
  if (!mark) return null;
  return <span className="cl19-gm" data-kind={kind} aria-hidden="true">{mark}</span>;
};
