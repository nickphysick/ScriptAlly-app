/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v6 — the open version (the ref's `workHtml`): a framed card with a navy band (number, name, "Saved {date} ·
 * {words} words · started from {parent}"; In use / Use for new queries, Edit, Archive), the inline archive confirm, then
 * "What changed" beside "How it's doing". Beneath it, the stone-banded "This version's queries and where they stand".
 *
 * New version and Edit render v2's own `VersionForm` (same fields, validation and writes; `bare` drops only its drawer
 * header) inside this card under a navy band, instead of the drawer.
 *
 * ⚠️ EVERY FIGURE IS `versionFacts` (lib/versionsV2) — the cells, the funnel and its four counts read one `f`.
 * ⚠️ A QUERY'S STATUS IS DRAWN BY StatusDot, in ink, on its stage's band colour. Not StageGlyph: CLAUDE.md makes
 *    StatusDot the only thing that draws a query's status, and SM3-8 pins StageGlyph's importers.
 */
import React, { useState } from "react";
import type { Agent, Manuscript } from "../../../types";
import type { V2Version } from "../../../lib/bookVersions";
import type { VersionsModel } from "../../../lib/versionsV2";
import { factsCounts, ofSent, stageBandOf, toRank } from "../../../lib/versionsV6";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { agentLine, commas, Dot, longDay, statusWord } from "../v2Bits";
import { VersionForm, type FormSave } from "../V2Overlays";
import { BandsFunnel, Disc, V6Frame } from "./V6Parts";

/** How many query rows show before "See all". */
export const QUERY_ROWS = 6;

const wordsOf = (v: V2Version, ms: Manuscript): number | null => (v.original ? (ms.wordCount > 0 ? ms.wordCount : null) : v.wordCount);
const wordsLine = (n: number | null) => (n ? `${commas(n)} words` : null);

export type OpenMode = { kind: "view" } | { kind: "form"; edit: string | null };

export interface V6OpenProps {
  ms: Manuscript; m: VersionsModel; v: V2Version | null; mode: OpenMode; agents: Map<string, Agent>; locked: boolean;
  arch: boolean;
  onUse: (id: string) => void; onEdit: (id: string) => void; onArchAsk: (on: boolean) => void; onArchive: (id: string) => void;
  onMap: () => void; onCloseForm: () => void; onSave: (s: FormSave) => void; onDetails: () => void;
}

export const V6Open: React.FC<V6OpenProps> = (p) => {
  const { ms, m, v, mode } = p;
  if (mode.kind === "form") {
    const edit = mode.edit ? m.versions.find((x) => x.id === mode.edit) ?? null : null;
    const next = edit ? edit.num : m.versions.length ? Math.max(...m.versions.map((x) => x.num)) + 1 : 1;
    return (
      <div className="v6-work" data-vv6="work">
        <V6Frame tone="navy" probe="form" band={<>
          <Disc v={edit ?? { original: false, num: next }} big />
          <div className="v6-id"><h2>{edit ? `Edit ${edit.name}` : "New version"}</h2><p>Name it and note what changed.</p></div>
        </>}>
          <div className="v6-form" data-vv6="form-body">
            <VersionForm key={mode.edit ?? "new"} ms={ms} m={m} edit={edit} earlier={m.sentTotal} bare
              onClose={p.onCloseForm} onSave={p.onSave} onDetails={p.onDetails} />
          </div>
        </V6Frame>
      </div>
    );
  }
  if (!v) return null;
  return (
    <div className="v6-work" data-vv6="work">
      <OpenCard {...p} v={v} />
      <QueriesCard m={m} v={v} agents={p.agents} />
    </div>
  );
};

const OpenCard: React.FC<V6OpenProps & { v: V2Version }> = ({ ms, m, v, locked, arch, onUse, onEdit, onArchAsk, onArchive, onMap }) => {
  const f = m.facts.get(v.id)!;
  const use = v.id === m.inUse;
  const p = v.parentId ? m.versions.find((x) => x.id === v.parentId) ?? null : null;
  const words = wordsOf(v, ms);
  const sub = [`Saved ${longDay(v.createdDate)}`, wordsLine(words), p ? `started from ${p.name}` : null].filter(Boolean).join(" · ");
  const canArchive = !v.original && !use && !v.archived;
  const c = factsCounts(f);
  return (
    <V6Frame tone="navy" probe="open" className="v6-open" label={v.name} band={<>
      <Disc v={v} big />
      <div className="v6-id"><h2 data-vv6="open-name">{v.name}</h2><p data-vv6="open-sub">{sub}</p></div>
      <div className="v6-acts">
        {use
          ? <span className="v6-inuse" data-vv6="open-inuse"><i aria-hidden="true" />In use</span>
          : v.archived ? null
            : <button type="button" className="v6-pb w" data-vv6="use" disabled={locked} onClick={() => onUse(v.id)}>Use for new queries</button>}
        <button type="button" className="v6-pb g" data-vv6="edit" disabled={locked} onClick={() => onEdit(v.id)}>Edit</button>
        {canArchive ? <button type="button" className="v6-pb g" data-vv6="archive" disabled={locked} onClick={() => onArchAsk(true)}>Archive</button> : null}
      </div>
    </>}>
      {arch && canArchive ? (
        <div className="v6-guard" role="group" aria-label={`Archive ${v.name}?`} data-vv6="arch-guard">
          <span><b>Archive {v.name}?</b> You won’t be able to pick it for new queries. Queries already sent with it don’t change. You can restore it later.</span>
          <button type="button" className="v6-pill v6-pill--white" data-vv6="arch-keep" onClick={() => onArchAsk(false)}>Keep it</button>
          <button type="button" className="v6-pill v6-pill--navy" data-vv6="arch-go" onClick={() => onArchive(v.id)}>Archive</button>
        </div>
      ) : null}
      <div className="v6-split">
        <section aria-label="What changed">
          <h3 className="v6-h3">What changed{p ? <em>since {p.name}</em> : null}</h3>
          {p ? (
            <div className="v6-flow" data-vv6="flow">
              <div className="v6-fl"><Disc v={p} /><span><b>{p.name}</b><em>Started from this version</em></span></div>
              <ul className="v6-fl-c">{v.changes.length ? v.changes.map((x, i) => <li key={i}>{x}</li>) : <li className="none">No changes noted</li>}</ul>
              <div className="v6-fl now"><Disc v={v} /><span><b>{v.name}</b>{wordsLine(words) ? <em>{wordsLine(words)}</em> : null}</span></div>
            </div>
          ) : (
            <>
              <div className="v6-flow" data-vv6="flow"><div className="v6-fl now"><Disc v={v} /><span><b>{v.name}</b>{wordsLine(words) ? <em>{wordsLine(words)}</em> : null}</span></div></div>
              <p className="v6-rootnote">Queries sent before you saved your first version are counted here.</p>
            </>
          )}
          <p className="v6-maplink"><button type="button" className="v6-lk" data-vv6="map-link" onClick={onMap}>Open the version map →</button></p>
        </section>
        <section aria-label="How it’s doing" data-vv6="doing">
          <h3 className="v6-h3">How it’s doing{f.avgReply != null ? <em>Average reply: {f.avgReply} {f.avgReply === 1 ? "day" : "days"}</em> : null}</h3>
          {!f.n ? <p className="v6-none" data-vv6="not-sent">No queries sent with this version yet.</p> : (
            <>
              <div className="v6-cells" data-vv6="cells">
                <div><b data-vv6="cell-sent">{f.n}</b><span>sent</span></div>
                <div><b data-vv6="cell-replied">{f.replied.length}</b><span>replied</span></div>
                <div><b data-vv6="cell-more">{f.early ? f.more.length : `${f.ratePct}%`}</b><span>asked for more</span></div>
              </div>
              <h4 className="v6-h4">How far this version gets</h4>
              <div className="v6-fun-big"><BandsFunnel c={c} W={400} H={120} gap="#fff" probe="open-funnel" /></div>
              <div className="v6-fun-l" data-vv6="fun-counts">
                {([["sent", c.sent], ["replied", c.replied], ["asked for more", c.more], ["asked for the full", c.full]] as const).map(([l, n], i) => (
                  <div key={l} data-k={i}><b>{n}</b>{l}<em>{i ? `${ofSent(n, c.sent)}% of sent` : " "}</em></div>
                ))}
              </div>
              {f.early ? <div className="v6-wait" data-vv6="wait">Included in the comparison after {toRank(f)} more {toRank(f) === 1 ? "query" : "queries"}.</div> : null}
            </>
          )}
        </section>
      </div>
    </V6Frame>
  );
};

const QueriesCard: React.FC<{ m: VersionsModel; v: V2Version; agents: Map<string, Agent> }> = ({ m, v, agents }) => {
  const [all, setAll] = useState(false);
  const f = m.facts.get(v.id)!;
  const list = all ? f.all : f.all.slice(0, QUERY_ROWS);
  return (
    <V6Frame tone="stone" probe="queries" key={v.id} band={<>
      <h2 className="v6-bt">This version’s queries and where they stand</h2>
      {!all && f.all.length > QUERY_ROWS ? <button type="button" className="v6-lk" data-vv6="see-all" onClick={() => setAll(true)}>See all {f.all.length} →</button> : null}
    </>}>
      {list.length ? (
        <ul className="v6-ql" data-vv6="qlist">
          {list.map((q) => {
            const a = agentLine(q, agents);
            const band = stageBandOf(q.status);
            return (
              <li key={q.id}>
                <button type="button" data-vv6="qrow" data-id={q.id} data-status={q.status} data-band={band} onClick={() => openQueryPanel(q.id, "other")}>
                  <span className={`v6-qi v6-qi--${band}`} data-vv6="qi"><Dot status={q.status} size={20} /></span>
                  <span className="v6-qn"><b>{a.name}</b>{a.agency ? <span>{a.agency}</span> : null}</span>
                  <span className="v6-qst">{statusWord(q)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="v6-none v6-pad">No queries to show.</p>}
    </V6Frame>
  );
};
