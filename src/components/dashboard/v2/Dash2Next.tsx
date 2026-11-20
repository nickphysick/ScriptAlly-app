/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · Next up — rebuilt by Next up v1 (ref design-refs/next-up-v1.html).
 *
 * The lead task has five rows, in the same places on every card: the agent row (the navy seal, name, agency in italic,
 * a number and its caption on the right), the sentence in the typewriter face, the fixed four-stop track, one label
 * line, the buttons. Then the next two tasks as rows.
 *
 * ⚠️ THE PLAN IS THE APP'S: the items and their order are `dashList`'s (via Dashboard v3's `withoutContradictions`);
 *    the words and numbers are `lib/nextUp`'s, read from the Query Centre's own rows. ⚠️ THE DASHBOARD NEVER COMPLETES
 *    A TASK: every control here calls `onView`, which opens where the task is done.
 * ⚠️ STATUS IS DRAWN BY THE REAL StatusDot, the seal is the real AgentDisc; nothing here redraws a mark.
 */
import React, { useMemo } from "react";
import type { ListAction, ListItem, ListPlan } from "../../../lib/dashList";
import type { TaskCtx } from "../../../lib/dashTaskCard";
import { CAUGHT_UP } from "../v71/Dash71Task";
import { StatusDot } from "../../StatusDot";
import { AgentDisc } from "../../shared/AgentDisc";
import { Frame } from "./Frame";
import { STAGE_COLOURS, bandBackground, quietBackground } from "../../../lib/stageColours";
import { nextLead, type NextLead, type Track } from "../../../lib/nextUp";
import "./nextUp.css";

export const OPEN_TASK = "Open task";
export const SEE_ALL = "See all";
/** how many tasks the card shows: the top one and the next two */
export const NEXT_SHOWN = 3;
/** the seal's diameter on the lead card; the track's first stop is centred under it */
export const LEAD_SEAL = 40;

const Mark: React.FC<{ item: ListItem; size: number }> = ({ item, size }) => (item.status
  ? <StatusDot status={item.status} overrideSize={size} decorative />
  : <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>);

/** The fixed four stops, edge to edge: the line fills to the ringed stop. Unreached stops are faint; Offer is the outline seal. */
export const NextTrack: React.FC<{ track: Track }> = ({ track }) => (
  <div className={`nu-track${track.quiet ? " is-quiet" : ""}`} data-nu="track" data-cur={track.cur}>
    <span className="nu-line" aria-hidden="true"><u className="nu-fill" style={{ width: `${(track.cur / 3) * 100}%` }} /></span>
    {track.stops.map((s, i) => (
      <span key={i} className={`nu-stp${i === track.cur ? " is-cur" : ""}${s.reached ? "" : " is-faint"}`} data-nu="stop" data-reached={s.reached ? "1" : "0"}>
        <StatusDot status={s.status} overrideSize={22} reached={s.reached} tone={s.reached ? undefined : "inherit"} decorative />
      </span>
    ))}
  </div>
);

const Lead: React.FC<{ lead: NextLead; children: React.ReactNode }> = ({ lead, children }) => (
  <>
    <div className="nu-who" data-nu="who">
      {lead.seals ? (
        <span className="nu-seals" data-nu="seals">
          {/* each seal sits in a ring of the card's own tint (`background: inherit`), so the overlap reads */}
          {lead.seals.initials.map((x, i) => <span key={i} className="nu-ring"><AgentDisc initials={x} standing="querying" size={34} className="nu-seal" /></span>)}
          {lead.seals.more > 0 && <span className="nu-ring"><AgentDisc initials={`+${lead.seals.more}`} standing="none" size={34} className="nu-seal nu-more" /></span>}
        </span>
      ) : lead.agent ? (
        <>
          <AgentDisc initials={lead.agent.initials} standing="querying" size={LEAD_SEAL} className="nu-seal" attrs={{ "data-nu": "seal" }} />
          <span className="nu-id">
            <b className="nu-name" data-nu="name">{lead.agent.name}</b>
            {lead.agent.agency && <i className="nu-agency" data-nu="agency">{lead.agent.agency}</i>}
          </span>
        </>
      ) : null}
      {lead.figure && (
        <span className="nu-fig" data-nu="fig">
          <span className="nu-n" data-nu="n">{lead.figure.value}</span>
          {lead.figure.caption && <small className="nu-cap" data-nu="cap">{lead.figure.caption}</small>}
        </span>
      )}
    </div>
    <p className="nu-ask" data-nu="ask">{lead.sentence}</p>
    {lead.track ? (
      <>
        <NextTrack track={lead.track} />
        <p className="nu-lab" data-nu="label">{lead.label && <><b>{lead.label.lead}</b>{lead.label.rest}</>}</p>
      </>
    ) : lead.sub ? <p className="nu-sub" data-nu="sub">{lead.sub}</p> : null}
    <div className="nu-acts" data-nu="acts">{children}</div>
  </>
);

export const Dash2Next: React.FC<{
  loading: boolean;
  plan: ListPlan;
  ctx: TaskCtx;
  onView: (a: ListAction) => void;
  onSeeAll: () => void;
}> = ({ loading, plan, ctx, onView, onSeeAll }) => {
  const items = plan.items;
  const n = items.length;
  const top = items[0] ?? null;
  const lead = useMemo(() => (top ? nextLead(top, ctx) : null), [top, ctx]);
  const rest = items.slice(1, NEXT_SHOWN);
  const shown = Math.min(NEXT_SHOWN, n);
  /* Dashboard v3, Phase 3: the head takes the stage of the lead task's query; a task not about a query has a paper head.
     Gone quiet fades the head, as the Queries cards do. */
  const stage = !loading && lead?.stage ? lead.stage : null;
  const head = stage ? (lead?.kind === "quiet" && stage !== "offer" ? quietBackground(stage) : bandBackground(stage)) : null;
  return (
    <Frame tone="paper" title="Next up" label="Next up" probe="next" loading={loading}
      bandStyle={head ? { background: head } : undefined} data={{ stage: stage ?? "none" }}
      meta={n > 0 && !loading ? <>{shown} of {n} · <button type="button" className="d2-link" data-d2="see-all" onClick={onSeeAll}>{SEE_ALL}</button></> : null}>
      <div className="d2-body d2-next" data-d2="next" data-n={n}>
        {loading ? (
          <div className="d2-nup d2-sk" aria-hidden="true"><span className="d2-skl" /></div>
        ) : !top || !lead ? (
          <p className="d2-empty" data-d2="next-empty">{CAUGHT_UP}</p>
        ) : (
          <>
            <div className="d2-nup nu-lead" data-d2="next-top" data-key={top.key} data-kind={lead.kind}
              style={stage ? { background: STAGE_COLOURS[stage].tint } : undefined}>
              <Lead lead={lead}>
                <button type="button" className="d2-open" data-d2="open-task" onClick={() => onView(top.action)}>{OPEN_TASK}</button>
              </Lead>
            </div>
            {rest.length > 0 && (
              <ul className="d2-later" data-d2="next-rest">
                {rest.map((it) => (
                  <li key={it.key}>
                    <button type="button" className="d2-lrow" data-d2="next-row" onClick={() => onView(it.action)}>
                      <span className="d2-lmark"><Mark item={it} size={18} /></span>
                      <span className="d2-ltx">{it.pre}{it.who}{it.post}</span>
                      {it.when && <time>{it.when}</time>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Frame>
  );
};
